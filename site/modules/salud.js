// ===================== SALUD DE YELLOW CONTROL (administración) =====================
// Estado técnico (OK · AVISO · ERROR) y copias de seguridad con restauración no destructiva.
(function(){
window.YCModules=window.YCModules||{};
let C,H,B;
const STATE={OK:"programado",AVISO:"atencion",ERROR:"falta"};
const when=iso=>iso?new Date(iso).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"}):"";
const snapLabel=s=>when(s.at)+" · "+s.reason;

async function render(ctx){
  C=ctx;const {api,app,pageHead}=C;
  app.innerHTML=pageHead("Salud","Estado técnico de Yellow Control y copias de seguridad",'<button type="button" class="primary" id="slSnap">Hacer copia ahora</button>')+'<div id="slBody"><p class="muted">Comprobando…</p></div>';
  [H,B]=await Promise.all([api("/api/health"),api("/api/backups")]);
  draw();
  C.$("#slSnap").onclick=async e=>{const b=e.target;b.disabled=true;b.textContent="Copiando…";try{await api("/api/backups",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"snapshot"})});C.say("Copia hecha");[H,B]=await Promise.all([api("/api/health"),api("/api/backups")]);draw()}catch(err){C.say(err.message)}b.disabled=false;b.textContent="Hacer copia ahora"};
}

function draw(){
  const E=C.esc,snaps=B.snapshots||[];
  C.$("#slBody").innerHTML=
   '<section class="hc-block"><div class="hc-head"><h2>Salud de Yellow Control</h2><em class="yc-state '+STATE[H.state]+'">'+H.state+'</em></div><ul class="sl-checks">'+
    H.checks.map(c=>'<li><em class="yc-state '+STATE[c.state]+'">'+c.state+'</em><b>'+E(c.name)+'</b><span>'+E(c.detail)+'</span></li>').join("")+'</ul></section>'+
   '<section class="hc-block"><h2>Copias de seguridad</h2><p class="muted">Una copia cada madrugada y otra antes de cada restauración. Se guardan 30 días. Restaurar nunca borra lo que hay ahora: añade lo que falte y devuelve lo cambiado al valor de la copia.</p>'+
    (snaps.length?'<div class="sl-restore">'+
      '<label>Copia<select id="slId">'+snaps.map(s=>'<option value="'+E(s.id)+'">'+E(snapLabel(s))+' · '+Math.round(s.bytes/1024)+' KB</option>').join("")+'</select></label>'+
      '<label>Qué restaurar<select id="slScope"><option value="record">Un registro</option><option value="module">Un módulo entero</option><option value="all">Todo el sistema</option></select></label>'+
      '<label id="slModBox">Módulo<select id="slMod">'+B.modules.map(m=>'<option value="'+E(m.id)+'">'+E(m.label)+'</option>').join("")+'</select></label>'+
      '<label id="slRecBox" class="wide">Registro<input id="slQ" placeholder="Busca por título"><select id="slRec" size="6"></select></label>'+
      '<div class="actions-row wide"><button type="button" id="slPlan">Ver qué cambiaría</button></div><div id="slOut" class="wide"></div></div>'
     :'<div class="notice">Todavía no hay copias. La primera se hace esta madrugada, o ahora con «Hacer copia ahora».</div>')+
    (snaps.length?'<ul class="hc-activity">'+snaps.slice(0,30).map(s=>'<li><b>'+E(snapLabel(s))+'</b><small>'+Object.entries(s.stores).map(([k,v])=>k+": "+v.keys+" datos"+(v.binaries?", "+v.binaries+" archivos":"")).join(" · ")+(s.note?" · "+E(s.note):"")+(s.version?" · versión "+E(String(s.version).slice(0,8)):"")+'</small></li>').join("")+'</ul>':'')+
   '</section>';
  if(!snaps.length)return;
  const scope=()=>C.$("#slScope").value;
  const sync=async()=>{const sc=scope();C.$("#slModBox").hidden=sc==="all";C.$("#slRecBox").hidden=sc!=="record";C.$("#slOut").innerHTML="";if(sc==="record")await loadRecs()};
  let recs=[];
  const loadRecs=async()=>{const r=await C.api("/api/backups?id="+encodeURIComponent(C.$("#slId").value)+"&module="+encodeURIComponent(C.$("#slMod").value));recs=r.rows||[];fill()};
  const fill=()=>{const q=C.$("#slQ").value.toLowerCase();C.$("#slRec").innerHTML=recs.filter(r=>!q||r.title.toLowerCase().includes(q)).slice(0,200).map(r=>'<option value="'+E(r.store+"|"+r.key)+'">'+E(r.title)+(r.date?" · "+E(r.date):"")+(r.deleted?" (quitado)":"")+'</option>').join("")};
  C.$("#slScope").onchange=sync;C.$("#slMod").onchange=sync;C.$("#slId").onchange=sync;C.$("#slQ").oninput=fill;
  const body=confirm=>{const sc=scope(),o={action:"restore",id:C.$("#slId").value,confirm};if(sc==="all")o.scope={type:"all"};else if(sc==="module")o.scope={type:"module",module:C.$("#slMod").value};else{const v=C.$("#slRec").value;if(!v)throw new Error("Elige un registro");const [store,...k]=v.split("|");o.scope={type:"record",store,key:k.join("|")}}return o};
  C.$("#slPlan").onclick=async()=>{const out=C.$("#slOut");try{const r=await C.api("/api/backups",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body(false))});
    const n=r.add+r.overwrite;out.innerHTML='<div class="notice" style="text-align:left">'+(n?'<b>'+r.add+'</b> se añadirían y <b>'+r.overwrite+'</b> volverían al valor de la copia. '+r.same+' ya están igual. Nada se borra.':'Todo está igual que en la copia: no hay nada que restaurar.')+'</div>'+(n?'<div class="actions-row" style="margin-top:10px"><button type="button" class="danger" id="slGo">Restaurar '+n+'</button></div>':'');
    if(n)C.$("#slGo").onclick=async()=>{const sc=scope();if(sc==="all"&&prompt("Vas a devolver todo el sistema a la copia. Escribe RESTAURAR para confirmar.")!=="RESTAURAR")return;if(sc!=="all"&&!confirm("¿Restaurar "+n+" "+(n===1?"dato":"datos")+"? Antes se hace una copia para poder deshacerlo."))return;
      try{const r2=await C.api("/api/backups",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body(true))});C.say("Restaurado");out.innerHTML='<div class="notice">Restaurado: '+r2.add+' añadidos y '+r2.overwrite+' devueltos. Para deshacerlo, restaura la copia «Antes de restaurar».</div>';B=await C.api("/api/backups")}catch(err){C.say(err.message)}}}catch(err){C.say(err.message)}};
  sync();
}
window.YCModules.salud={render};
})();
