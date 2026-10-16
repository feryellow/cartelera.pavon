// ===================== PATROCINIOS =====================
// Operaciones con marcas: en negociación (primer contacto → propuesta → negociación) y cerradas (contrato,
// importe firmado, vigencia y contraprestaciones). Vista de dirección solo para Fer y Celia: lo que hay en
// negociación y lo contratado, siempre por separado.
(function(){
window.YCModules=window.YCModules||{};
let C,D=null,tab="negociacion",venue="",showLost=false;
const OPEN=["prospecto","propuesta","negociacion"];
const eur=n=>n==null||n===""?"—":Number(n).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const fd=s=>s?new Date(s+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"}).replace(".",""):"";
const days=s=>s?Math.round((new Date(s+"T12:00:00")-new Date(D.today+"T12:00:00"))/864e5):null;
const stageName=k=>(D.stages.find(s=>s.key===k)||{}).name||k;
const VCOLOR={"Gran Teatro Pavón":"#FFD400","Gran Teatro CaixaBank Príncipe Pío":"#1F5FBF","Teatro Serrano":"#FBB03B","Teatro Arlequín":"#FF3B3F","Gran Castillo de Pedraza":"#9A6A3A","Abonoteatro":"#BC2C4F","Soho City Madrid":"#C9A24B"};
const vdot=v=>'<i class="pt-vdot" style="background:'+(VCOLOR[v]||"#6b665d")+'"></i>';

async function load(){D=await C.api("/api/patrocinios")}
async function render(ctx){
  C=ctx;await load();
  const q=new URLSearchParams(location.hash.split("?")[1]||"");
  draw();
  const id=q.get("edit");if(id){const r=D.rows.find(x=>x.id===id);if(r){tab=OPEN.includes(r.stage)?"negociacion":r.stage==="cerrado"?"cerrados":tab;draw();openSheet(r)}}
}

function nextChip(r){
  if(!OPEN.includes(r.stage))return"";
  if(!r.nextDate)return '<span class="pt-chip warn">Sin próximo paso</span>';
  const d=days(r.nextDate),cls=d<0?"err":d<=1?"warn":"";
  return '<span class="pt-chip '+cls+'">'+(d<0?"Vencido · ":d===0?"Hoy · ":d===1?"Mañana · ":"")+C.esc(fd(r.nextDate))+'</span>';
}
function card(r){
  const E=C.esc;
  if(r.stage==="cerrado"){
    const dl=r.deliverables||[],done=dl.filter(x=>x.done).length,pend=dl.filter(x=>!x.done).sort((a,b)=>String(a.date||"9").localeCompare(String(b.date||"9")))[0];
    const end=days(r.endDate),badge=end!=null&&end<0?'<span class="pt-chip">Terminado</span>':end!=null&&end<=60?'<span class="pt-chip warn">Vence en '+end+' d</span>':"";
    const late=dl.filter(x=>!x.done&&x.date&&days(x.date)<0).length;
    return '<button type="button" class="pt-card" data-open="'+E(r.id)+'"><span class="pt-top">'+vdot(r.venue)+'<small>'+E([r.kind,r.venue].filter(Boolean).join(" · "))+'</small>'+badge+'</span>'+
      '<b class="pt-brand">'+E(r.brand)+'</b><span class="pt-amount">'+eur(r.amountFinal)+'</span>'+
      '<span class="pt-line">'+E(fd(r.startDate))+' – '+E(fd(r.endDate))+(r.owner?' · '+E(r.owner):'')+'</span>'+
      (dl.length?'<span class="pt-prog"><i style="width:'+Math.round(done/dl.length*100)+'%"></i></span><span class="pt-line">'+done+' de '+dl.length+' contraprestaciones cumplidas'+(late?' · <em class="pt-err">'+late+' sin cumplir a tiempo</em>':'')+'</span>'+(pend?'<span class="pt-line pt-next">Siguiente: '+E(pend.text)+(pend.date?' · '+E(fd(pend.date)):'')+'</span>':''):'<span class="pt-line pt-warnt">Sin contraprestaciones apuntadas</span>')+'</button>';
  }
  return '<button type="button" class="pt-card'+(r.stage==="perdido"?" lost":"")+'" data-open="'+E(r.id)+'"><span class="pt-top">'+vdot(r.venue)+'<small>'+E([r.kind,r.venue].filter(Boolean).join(" · "))+'</small>'+(r.docs&&r.docs.length?'<span class="pt-doc">'+r.docs.length+' doc.</span>':'')+'</span>'+
    '<b class="pt-brand">'+E(r.brand)+'</b><span class="pt-amount">'+(r.stage==="perdido"?'<s>'+eur(r.amountProposed)+'</s>':eur(r.amountProposed))+'</span>'+
    (r.stage==="perdido"?'<span class="pt-line">No sale'+(r.lostReason?' · '+E(r.lostReason):'')+'</span>':'<span class="pt-line pt-next">'+(r.nextStep?E(r.nextStep):'Falta decidir el próximo paso')+'</span>'+nextChip(r))+
    (r.owner?'<span class="pt-line">'+E(r.owner)+'</span>':'')+'</button>';
}

function draw(){
  const E=C.esc,rows=D.rows.filter(r=>!venue||r.venue===venue);
  const neg=rows.filter(r=>OPEN.includes(r.stage)),cer=rows.filter(r=>r.stage==="cerrado"),lost=rows.filter(r=>r.stage==="perdido");
  const venues=[...new Set(D.rows.map(r=>r.venue).filter(Boolean))];
  const tabs=[["negociacion","En negociación",neg.length],["cerrados","Cerrados",cer.length]].concat(D.canDireccion?[["direccion","Dirección",""]]:[]);
  let body="";
  if(tab==="negociacion"){
    const sorted=l=>l.sort((a,b)=>String(a.nextDate||"9999").localeCompare(String(b.nextDate||"9999")));
    body='<div class="pt-board">'+OPEN.map(s=>{const l=sorted(neg.filter(r=>r.stage===s));return '<section class="pt-col"><h3>'+E(stageName(s))+' <span>'+l.length+'</span></h3>'+(l.length?l.map(card).join(""):'<p class="pt-empty">Nada aquí</p>')+'</section>'}).join("")+'</div>'+
      (lost.length?'<button type="button" class="ghost pt-lostbtn" id="ptLost">'+(showLost?'Ocultar':'Ver')+' las que no salen ('+lost.length+')</button>'+(showLost?'<div class="pt-grid">'+lost.map(card).join("")+'</div>':''):'');
    if(!D.rows.length)body='<div class="pt-start"><b>Aún no hay operaciones.</b><span>Apunta la primera marca con la que estéis hablando: con la marca y el próximo paso basta para empezar.</span><button type="button" class="primary" data-new>Nueva operación</button></div>';
  }else if(tab==="cerrados"){
    const sorted=cer.sort((a,b)=>String(a.endDate||"").localeCompare(String(b.endDate||"")));
    body=sorted.length?'<div class="pt-grid">'+sorted.map(card).join("")+'</div>':'<div class="pt-start"><b>Todavía no hay patrocinios cerrados.</b><span>Cuando una negociación se firme, ábrela y pon la etapa «Cerrado» con el importe y las fechas del contrato.</span></div>';
  }else{
    const t=D.direccion;
    body='<div class="pt-dir"><div class="pt-fig"><small>En negociación</small><b>'+eur(t.negotiating)+'</b><span>'+t.negotiatingCount+' '+(t.negotiatingCount===1?'operación abierta':'operaciones abiertas')+' · importe propuesto, no es ingreso</span></div>'+
      '<div class="pt-fig ok"><small>Contratado</small><b>'+eur(t.contracted)+'</b><span>'+t.contractedCount+' '+(t.contractedCount===1?'contrato vigente':'contratos vigentes')+' · importe firmado</span></div></div>'+
      (t.byVenue.length?'<table class="pt-table"><thead><tr><th>Espacio</th><th>En negociación</th><th>Contratado</th></tr></thead><tbody>'+t.byVenue.map(v=>'<tr><td>'+vdot(v.venue)+E(v.venue)+'</td><td>'+eur(v.negotiating)+' <small>('+v.negotiatingCount+')</small></td><td><b>'+eur(v.contracted)+'</b> <small>('+v.contractedCount+')</small></td></tr>').join("")+'</tbody></table>':'')+
      '<p class="muted pt-note">Solo lo ves tú y Celia. Las operaciones que no salen no cuentan.</p>';
  }
  C.app.innerHTML=C.pageHead("Patrocinios","Negociaciones y contratos con marcas",'<button type="button" class="primary" data-new>Nueva operación</button>')+
    '<div class="pt-bar"><div class="m-seg pt-tabs">'+tabs.map(([k,l,n])=>'<button type="button" data-tab="'+k+'" class="'+(tab===k?"on":"")+'">'+l+(n!==""?' <b>'+n+'</b>':'')+'</button>').join("")+'</div>'+
    (venues.length>1&&tab!=="direccion"?'<select id="ptVenue" class="pt-vsel"><option value="">Todos los espacios</option>'+venues.map(v=>'<option'+(v===venue?" selected":"")+'>'+E(v)+'</option>').join("")+'</select>':'')+'</div>'+body;
  C.$$("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;draw()});
  C.$$("[data-new]").forEach(b=>b.onclick=()=>openSheet(null));
  C.$$("[data-open]").forEach(b=>b.onclick=()=>openSheet(D.rows.find(r=>r.id===b.dataset.open)));
  const vs=C.$("#ptVenue");if(vs)vs.onchange=()=>{venue=vs.value;draw()};
  const lb=C.$("#ptLost");if(lb)lb.onclick=()=>{showLost=!showLost;draw()};
}

// ---------- Ficha de la operación ----------
function openSheet(rec){
  const E=C.esc,r=rec?JSON.parse(JSON.stringify(rec)):{stage:"prospecto",kind:"Otro",venue:"",docs:[],deliverables:[]};
  r.docs=r.docs||[];r.deliverables=r.deliverables||[];
  const el=document.createElement("div");el.className="ds-sheet";document.body.appendChild(el);document.body.classList.add("sheet-open");
  const close=()=>{el.remove();document.body.classList.remove("sheet-open");if(/[?&]edit=/.test(location.hash))history.replaceState(null,"","#patrocinios")};
  el.onclick=e=>{if(e.target===el)close()};
  const opt=(list,v)=>list.map(x=>'<option'+(x===v?" selected":"")+'>'+E(x)+'</option>').join("");
  const dlRow=(d,i)=>'<div class="pt-dl'+(d.done?" done":"")+'"><label class="pt-check"><input type="checkbox" data-dl-done="'+i+'"'+(d.done?" checked":"")+'><span></span></label><input data-dl-text="'+i+'" value="'+E(d.text)+'" placeholder="Qué hay que dar a la marca"><input type="date" data-dl-date="'+i+'" value="'+E(d.date||"")+'"><button type="button" class="ghost pt-x" data-dl-del="'+i+'" aria-label="Quitar">×</button></div>';
  const paint=()=>{
    const closed=r.stage==="cerrado",lost=r.stage==="perdido";
    el.innerHTML='<form class="ds-sheet-box pt-sheet" id="ptForm" role="dialog" aria-label="Operación"><button type="button" class="ghost ds-sheet-x" aria-label="Cerrar">×</button>'+
      '<small class="section-kicker">'+(rec?E(stageName(r.stage)):'Nueva operación')+'</small><h2>'+(rec?E(r.brand):'Nueva operación')+'</h2>'+
      '<div class="pt-form">'+
      '<label class="wide">Marca<input name="brand" required value="'+E(r.brand||"")+'" placeholder="Por ejemplo: Scalpers"></label>'+
      '<label>Etapa<select name="stage">'+D.stages.map(s=>'<option value="'+s.key+'"'+(s.key===r.stage?" selected":"")+'>'+E(s.name)+'</option>').join("")+'</select></label>'+
      '<label>Tipo<select name="kind">'+opt(D.kinds,r.kind)+'</select></label>'+
      '<label>Espacio<select name="venue"><option value="">—</option>'+opt(D.venues,r.venue)+'</select></label>'+
      '<label>Responsable<input name="owner" value="'+E(r.owner||"")+'" placeholder="Quién lleva la operación"></label>'+
      '<label class="wide">Contacto en la marca<input name="contact" value="'+E(r.contact||"")+'" placeholder="Nombre, cargo, correo o teléfono"></label>'+
      (closed?'<label>Importe firmado (€)<input name="amountFinal" inputmode="decimal" value="'+E(r.amountFinal??"")+'"></label><label>Importe propuesto (€)<input name="amountProposed" inputmode="decimal" value="'+E(r.amountProposed??"")+'"></label>'+
        '<label>Inicio del contrato<input type="date" name="startDate" value="'+E(r.startDate||"")+'"></label><label>Fin del contrato<input type="date" name="endDate" value="'+E(r.endDate||"")+'"></label>'
       :'<label>Importe propuesto (€)<input name="amountProposed" inputmode="decimal" value="'+E(r.amountProposed??"")+'" placeholder="0"></label><span></span>'+
        (lost?'<label class="wide">Por qué no sale<input name="lostReason" value="'+E(r.lostReason||"")+'"></label>':'<label class="wide">Próximo paso<input name="nextStep" value="'+E(r.nextStep||"")+'" placeholder="Por ejemplo: enviar dossier con la propuesta de naming"></label><label>Fecha del próximo paso<input type="date" name="nextDate" value="'+E(r.nextDate||"")+'"></label><span></span>'))+
      '</div>'+
      (closed?'<div class="pt-sub"><h3>Contraprestaciones</h3><p class="muted">Lo que Yellow se compromete a dar a la marca (logo en cartelería, menciones, entradas…). Márcalas al cumplirlas.</p><div id="ptDl">'+r.deliverables.map(dlRow).join("")+'</div><button type="button" class="ghost" id="ptDlAdd">+ Añadir contraprestación</button></div>':'')+
      '<div class="pt-sub"><h3>Documentos</h3><div class="pt-docs">'+r.docs.map((d,i)=>'<span class="pt-docitem"><a href="#" data-doc="'+i+'">'+E(d.name||"documento")+'</a><button type="button" class="ghost pt-x" data-doc-del="'+i+'" aria-label="Quitar">×</button></span>').join("")+'</div><label class="pt-upload">Subir dossier, propuesta o contrato (PDF o imagen, hasta 6 MB)<input type="file" id="ptFile" accept="application/pdf,image/*"></label></div>'+
      '<label class="wide pt-notes">Notas<textarea name="notes" rows="3">'+E(r.notes||"")+'</textarea></label>'+
      '<div class="actions-row"><button class="primary" type="submit">Guardar</button>'+(rec&&OPEN.includes(r.stage)?'<button type="button" id="ptWin">Se ha cerrado</button><button type="button" class="ghost" id="ptLose">No sale</button>':'')+(rec?'<button type="button" class="ghost danger" id="ptDel">Quitar</button>':'')+'</div><div id="ptErr"></div></form>';
    const f=el.querySelector("#ptForm");
    el.querySelector(".ds-sheet-x").onclick=close;
    const grab=()=>{const fd=new FormData(f);for(const [k,v] of fd.entries())r[k]=v;
      el.querySelectorAll("[data-dl-text]").forEach(i=>r.deliverables[+i.dataset.dlText].text=i.value);
      el.querySelectorAll("[data-dl-date]").forEach(i=>r.deliverables[+i.dataset.dlDate].date=i.value);
      el.querySelectorAll("[data-dl-done]").forEach(i=>{const d=r.deliverables[+i.dataset.dlDone];if(d.done!==i.checked){d.done=i.checked;d.doneAt=i.checked?D.today:""}})};
    f.stage.onchange=()=>{grab();r.stage=f.stage.value;paint()};
    const add=el.querySelector("#ptDlAdd");if(add)add.onclick=()=>{grab();r.deliverables.push({text:"",date:"",done:false});paint();const l=el.querySelectorAll("[data-dl-text]");l[l.length-1].focus()};
    el.querySelectorAll("[data-dl-del]").forEach(b=>b.onclick=()=>{grab();r.deliverables.splice(+b.dataset.dlDel,1);paint()});
    el.querySelectorAll("[data-doc-del]").forEach(b=>b.onclick=()=>{grab();r.docs.splice(+b.dataset.docDel,1);paint()});
    el.querySelectorAll("[data-doc]").forEach(a=>a.onclick=async e=>{e.preventDefault();const d=r.docs[+a.dataset.doc];const u=await C.blobUrl(d.key,"patrocinios");if(u)window.open(u,"_blank");else C.say("No se ha podido abrir")});
    el.querySelector("#ptFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;grab();try{C.say("Subiendo…");const key=await C.uploadAsset(file,"patrocinios");r.docs.push({key,name:file.name,type:file.type,size:file.size});paint();C.say("Documento añadido: guarda para que quede")}catch(err){C.say(err.message)}};
    const err=m=>{el.querySelector("#ptErr").innerHTML='<div class="notice pt-errbox">'+E(m)+'</div>'};
    const save=async(extra)=>{grab();Object.assign(r,extra||{});try{
      const body=JSON.stringify({row:r});
      const d=rec?await C.api("/api/patrocinios?id="+encodeURIComponent(rec.id),{method:"PUT",headers:{"content-type":"application/json"},body}):await C.api("/api/patrocinios",{method:"POST",headers:{"content-type":"application/json"},body});
      C.say(rec?"Guardado":"Operación creada");close();await load();if(d.row){tab=OPEN.includes(d.row.stage)?"negociacion":d.row.stage==="cerrado"?"cerrados":tab}draw()}catch(x){err(x.message)}};
    f.onsubmit=e=>{e.preventDefault();save()};
    const win=el.querySelector("#ptWin");if(win)win.onclick=()=>{grab();r.stage="cerrado";if(r.amountFinal==null||r.amountFinal==="")r.amountFinal=r.amountProposed;paint();C.say("Completa el importe firmado y las fechas del contrato, y guarda")};
    const lose=el.querySelector("#ptLose");if(lose)lose.onclick=()=>{grab();r.stage="perdido";paint();const i=el.querySelector('[name="lostReason"]');if(i)i.focus()};
    const del=el.querySelector("#ptDel");if(del)del.onclick=async()=>{if(!confirm("¿Quitar «"+r.brand+"»? Se puede recuperar desde las copias de seguridad."))return;try{await C.api("/api/patrocinios?id="+encodeURIComponent(rec.id),{method:"DELETE"});C.say("Quitada");close();await load();draw()}catch(x){err(x.message)}};
    if(rec&&C.attachHistory)C.attachHistory("#ptForm",rec);
  };
  paint();
}
window.YCModules.patrocinios={render};
})();
