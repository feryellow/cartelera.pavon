// ===================== PRESUPUESTO DE PUBLICIDAD (acceso restringido) =====================
// Solo Fer y Celia, siempre con su usuario de Netlify. Los datos viven en el servidor (/api/budget),
// nunca en archivos públicos de la web. Se carga aparte (este archivo) solo al entrar en la sección.
(function(){
// Utilidades de la app principal (app.js va dentro de su propio ámbito y las pasa al abrir la sección)
let api,esc,pageHead,say,app,state,VENUES,$,$$,CTX=null;
const MES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],MK=MES.map((_,i)=>String(i+1).padStart(2,"0"));
const BLOCKS=[["acuerdos_mensuales","Acuerdos mensuales"],["acuerdos_puntuales","Acuerdos puntuales"],["fees","Fees y servicios mensuales"],["extras","Extras fuera de marketing"],["otros","Otros"]];
const TYPES=[["medios","Inversión en medios","#FFD400"],["produccion","Producción, fees y herramientas","#7fb8ff"],["fuera","Fuera de marketing","#ff8a65"]];
const STATUS=[["propuesta","Propuesta"],["opcional","Opcional"],["previsto","Previsto"],["aprobado","Aprobado"],["contratado","Contratado"],["facturado","Facturado"],["pagado","Pagado"]];
const CHANNELS=["Digital · Meta","Digital · Google","Radio","Revistas","Exterior","TV","Taxis","Hoteles","Imprenta","Agencia","Herramientas","Diseño","Otros medios","Fuera de marketing"];
const eur=n=>(Math.round(Number(n)||0)).toLocaleString("es-ES")+" €";
const num=v=>{if(v==null||v==="")return 0;if(typeof v==="number")return v;const s=String(v).replace(/[€\s]/g,"");const x=Number(s.includes(",")?s.replace(/\./g,"").replace(",","."):s);return Number.isFinite(x)?x:0};
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
const P={year:String(new Date().getFullYear()),doc:null,base:null,me:null,dirty:false,view:"resumen",edit:null};
const lineTotal=(l,k="plan")=>MK.reduce((a,m)=>a+num((l[k]||{})[m]),0);
const monthTotal=(lines,m,k="plan",f=()=>true)=>lines.filter(f).reduce((a,l)=>a+num((l[k]||{})[m]),0);

// Clasificación automática al importar (luego se puede cambiar a mano en cada línea)
function guess(concept,block){const t=norm(concept);
 const type=block==="extras"||/bonus|cesta|aja\b/.test(t)?"fuera":/fee|yellowmedia|brevo|trackpro|vivio|sinverg|diseno|imprenta|produccion/.test(t)?"produccion":"medios";
 const channel=/meta|redes|paid social|instagram|facebook/.test(t)?"Digital · Meta":/google/.test(t)?"Digital · Google":/radio|onda cero|melodia|kiss|europa fm|cadena/.test(t)?"Radio":/revista/.test(t)?"Revistas":/clear channel|exterior|mupi|marquesina|autobus/.test(t)?"Exterior":/mediaset|a3 ?media|atresmedia|tv\b|television/.test(t)?"TV":/taxi/.test(t)?"Taxis":/hotel|walk around/.test(t)?"Hoteles":/imprenta/.test(t)?"Imprenta":/yellowmedia|fee|sinverg/.test(t)?"Agencia":/brevo|trackpro|vivio/.test(t)?"Herramientas":/diseno/.test(t)?"Diseño":type==="fuera"?"Fuera de marketing":"Otros medios";
 const status=/propuesta/.test(t)?"propuesta":/opcional/.test(t)?"opcional":"previsto";
 const venue=/gtpp|principe pio|estacion/.test(t)?"Gran Teatro CaixaBank Príncipe Pío":/pavon/.test(t)?"Gran Teatro Pavón":/serrano/.test(t)?"Teatro Serrano":/arlequin/.test(t)?"Teatro Arlequín":"";
 return {type,channel,status,venue}}

// Lee el Excel de control (formato «SUPUESTOS EDITABLES»: meses en columnas, bloques con título)
function parseWorkbook(wb){
 const ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
 let hr=-1,mc=[];for(let r=0;r<rows.length&&hr<0;r++){const row=rows[r]||[];const idx=MES.map(m=>row.findIndex(c=>norm(c)===norm(m)));if(idx.filter(i=>i>=0).length>=10){hr=r;mc=idx}}
 if(hr<0)throw new Error("No encuentro la fila de meses (Ene … Dic) en la primera hoja.");
 const first=Math.min(...mc.filter(i=>i>=0)),last=Math.max(...mc),labelCol=Math.max(0,first-1);
 const lines=[],loose=[];let block="otros",notes="",annual=0;
 const blockOf=t=>{const n=norm(t);return /acuerdos mensuales/.test(n)?"acuerdos_mensuales":/acuerdos puntuales/.test(n)?"acuerdos_puntuales":/fees?/.test(n)&&/mensual/.test(n)?"fees":/fuera de marketing|extras/.test(n)?"extras":null};
 for(let r=hr+1;r<rows.length;r++){const row=rows[r]||[];const label=String(row[labelCol]??"").trim();
  const vals=mc.map(i=>i>=0?row[i]:null),hasNum=vals.some(v=>v!==null&&v!==""&&Number.isFinite(num(v)));
  // Valores sueltos a la derecha de la tabla (no entran en el total del Excel)
  for(let c=last+2;c<row.length;c++){const v=row[c];if(typeof v==="number"&&v)loose.push({row:r+1,label:label||"(sin concepto)",value:v})}
  if(!label&&!hasNum)continue;
  if(/^notas?$/i.test(label)){notes=row.slice(labelCol+1).filter(Boolean).join(" ");const m=/presupuesto anual[^0-9]*([\d.]+)/i.exec(notes);if(m)annual=num(m[1].replace(/\./g,""));continue}
  if(/^total/i.test(norm(label)))continue;
  if(!hasNum){const b=blockOf(label);if(b)block=b;continue}
  if(!label)continue;
  const plan={};MK.forEach((m,i)=>{plan[m]=num(vals[i])});
  const g=guess(label,block);
  lines.push({id:crypto.randomUUID(),block,concept:label.replace(/\s+$/,""),...g,supplier:"",plan,real:{},notes:""})}
 const monthsLoaded=MK.filter(m=>lines.some(l=>num(l.plan[m])));
 return {lines,loose,notes,annual,monthsLoaded}}

function loadXLSX(){return window.XLSX?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement("script");s.src="/vendor/xlsx.mini.min.js";s.onload=res;s.onerror=()=>rej(new Error("No se ha podido cargar el lector de Excel"));document.head.appendChild(s)})}

async function load(){
 try{const d=await api("/api/budget?year="+P.year,{cache:"no-store"});P.me=d.me;P.doc=d.doc;P.base=d.doc.updatedAt||null;P.dirty=false;return "ok"}
 catch(e){if(e.status===401)return "login";if(e.status===403)return "forbidden";throw e}}

function loginCard(msg){return '<section class="card bud-lock"><h2>Acceso restringido</h2><p class="muted">'+esc(msg)+'</p><form id="budLogin" class="stack" style="max-width:360px"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">Entrar al presupuesto</button><button type="button" class="ghost" id="budForgot">He olvidado la contraseña / no tengo contraseña</button></form><div id="budErr" class="error"></div></section>'}

async function save(what){
 if(!P.dirty){say("No hay cambios que guardar");return}
 try{const r=await api("/api/budget?year="+P.year,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({doc:P.doc,baseUpdatedAt:P.base,what})});P.doc=r.doc;P.base=r.doc.updatedAt;P.dirty=false;say("Presupuesto guardado");render()}
 catch(e){say(e.message);if(e.data&&e.data.conflict){await load();render()}}}
function mark(){P.dirty=true;const b=$("#budSave");if(b)b.classList.add("primary");const s=$("#budDirty");if(s)s.hidden=false}

window.presupuesto=async function(ctx){
 if(ctx){CTX=ctx;({api,esc,pageHead,say,app,state,VENUES,$,$$}=ctx)}
 {const vq=new URLSearchParams(location.hash.split("?")[1]||"").get("vaciar");if(/^\d{4}$/.test(vq||""))P.year=vq}
 const st=await load();
 if(st!=="ok"){app.innerHTML=pageHead("Presupuesto","Control del presupuesto de publicidad")+loginCard(st==="login"?"Esta sección solo se abre con tu usuario y contraseña de Yellow Control, aunque el resto de la app esté abierta.":"Tu usuario no tiene acceso a esta sección. Solo pueden entrar las personas autorizadas.");
  const f=$("#budLogin"),err=m=>{const x=$("#budErr");if(x)x.textContent=m};
  if(f){const btn=f.querySelector('button[type="submit"]');
   f.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f).entries());err("");btn.disabled=true;btn.textContent="Entrando…";
    try{const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(v)});const d=await r.json().catch(()=>({}));
     if(!r.ok){const m=String(d.error||"");throw new Error(/invalid|grant|password|credential|401/i.test(m+r.status)?"Email o contraseña incorrectos. Si no la recuerdas, pulsa «He olvidado la contraseña».":/confirm/i.test(m)?"Tu cuenta aún no está confirmada: abre el correo de invitación de Netlify.":"No se ha podido iniciar sesión ("+(m||r.status)+").")}
     const st2=await load();if(st2==="ok"){render();return}
     err(st2==="forbidden"?"Has entrado, pero tu usuario no tiene acceso al presupuesto.":"La contraseña es correcta, pero el navegador no ha guardado la sesión. Prueba a recargar la página; si sigue igual, avísame.")}
    catch(x){err(x.message)}finally{btn.disabled=false;btn.textContent="Entrar al presupuesto"}};
   $("#budForgot").onclick=async()=>{const em=String(f.elements.email.value||"").trim();if(!em){err("Escribe tu email arriba y vuelve a pulsar.");return}
    try{const r=await fetch("/api/recover",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:em})});err(r.ok?"Te llegará un correo de Netlify (no-reply) con un enlace para crear la contraseña. Mira también en spam. Al abrirlo, crea la contraseña y vuelve aquí.":"No se ha podido enviar el correo. Inténtalo de nuevo.")}catch{err("No se ha podido enviar el correo. Inténtalo de nuevo.")}}}
  return}
 render()};

function totals(){const L=P.doc.lines||[],plan=L.reduce((a,l)=>a+lineTotal(l),0),real=L.reduce((a,l)=>a+lineTotal(l,"real"),0);
 const byType=Object.fromEntries(TYPES.map(([k])=>[k,L.filter(l=>l.type===k).reduce((a,l)=>a+lineTotal(l),0)]));
 const soft=L.filter(l=>l.status==="propuesta"||l.status==="opcional").reduce((a,l)=>a+lineTotal(l),0);
 const loaded=P.doc.monthsLoaded||MK.filter(m=>L.some(l=>num((l.plan||{})[m])));
 return {L,plan,real,byType,soft,loaded,annual:num(P.doc.annualBudget)}}

function alerts(t){const a=[];
 if(t.annual&&t.plan>t.annual)a.push(["warn","Lo previsto ("+eur(t.plan)+") supera el presupuesto anual ("+eur(t.annual)+")."]);
 const empty=MK.filter(m=>!t.loaded.includes(m));if(empty.length&&empty.length<12)a.push(["info","Sin datos cargados: "+empty.map(m=>MES[+m-1]).join(", ")+". Cuentan como «sin dato», no como 0 €: el disponible real puede ser menor."]);
 if(t.soft)a.push(["info",eur(t.soft)+" son propuestas u opcionales todavía no confirmadas."]);
 (P.doc.loose||[]).forEach(x=>a.push(["warn","Valor fuera de la tabla en el Excel, fila "+x.row+" ("+x.label+"): "+eur(x.value)+". No entra en ningún total: aclarar qué es."]));
 if(t.byType.fuera)a.push(["info",eur(t.byType.fuera)+" ("+Math.round(t.byType.fuera/Math.max(1,t.plan)*100)+" %) son gastos fuera de marketing dentro de esta partida."]);
 const noSup=t.L.filter(l=>l.type==="medios"&&!l.supplier).length;if(noSup)a.push(["info",noSup+(noSup===1?" línea de medios no tiene":" líneas de medios no tienen")+" proveedor asignado."]);
 const noVen=t.L.filter(l=>l.type==="medios"&&!l.venue).length;if(noVen)a.push(["info",noVen+(noVen===1?" línea de medios no tiene":" líneas de medios no tienen")+" teatro o proyecto: sin ese dato no se puede ver la inversión por espectáculo."]);
 return a}

function bar(parts,max){return '<div class="bud-bar">'+parts.map(([v,c])=>v>0?'<i style="width:'+(v/max*100).toFixed(2)+'%;background:'+c+'"></i>':'').join("")+'</div>'}

// Vaciar un año: botón «Vaciar año» (o enlace #presupuesto?vaciar=AAAA); siempre hay que escribir VACIAR.
function clearCard(y){const n=(P.doc.lines||[]).length;
 app.innerHTML=pageHead("Presupuesto","Vaciar el presupuesto de "+y)+'<section class="card bud-lock"><h2>Vaciar '+esc(y)+'</h2><p class="muted">Se quitan las '+n+' líneas y el presupuesto anual de '+esc(y)+'. La versión actual queda guardada como copia en el servidor.</p><form id="budClr" class="stack" style="max-width:360px"><label>Escribe VACIAR para confirmar<input name="ok" autocomplete="off" required></label><button class="danger" type="submit">Vaciar '+esc(y)+'</button><button type="button" id="budClrNo">Cancelar</button></form></section>';
 $("#budClrNo").onclick=()=>{history.replaceState(null,"","#presupuesto");render()};
 $("#budClr").onsubmit=async e=>{e.preventDefault();if(String(e.currentTarget.elements.ok.value).trim().toUpperCase()!=="VACIAR"){say("Escribe VACIAR para confirmar");return}
  P.doc={...P.doc,lines:[],annualBudget:0,monthsLoaded:[],loose:[],notes:"",source:""};P.dirty=true;await save("Vaciado "+y);history.replaceState(null,"","#presupuesto");render()}}
function render(){
 const vq=new URLSearchParams(location.hash.split("?")[1]||"").get("vaciar");if(vq&&vq===P.year){clearCard(vq);return}
 const t=totals(),D=P.doc,avail=t.annual-t.plan;
 const years=[String(+P.year-1),P.year,String(+P.year+1)];
 app.innerHTML=pageHead("Presupuesto","Publicidad "+P.year+" · importes netos · todo el grupo · has entrado como "+esc(P.me?.email||""),'<button type="button" id="budImport">Importar Excel</button><button type="button" id="budExport">Exportar Excel</button><button type="button" id="budNew">+ Nueva línea</button><button type="button" id="budSave"'+(P.dirty?' class="primary"':'')+'>Guardar</button>'+((D.lines||[]).length?'<button type="button" id="budClear" class="danger">Vaciar '+esc(P.year)+'</button>':''))+
  '<div class="chip-row" id="budYears">'+years.map(y=>'<button type="button" class="chip'+(y===P.year?' on':'')+'" data-y="'+y+'">'+y+'</button>').join("")+'<span id="budDirty" class="badge warn" '+(P.dirty?'':'hidden')+'>Cambios sin guardar</span>'+(D.updatedAt?'<span class="muted" style="font-size:12px">Guardado '+new Date(D.updatedAt).toLocaleString("es-ES")+' · '+esc(D.updatedBy||"")+'</span>':'')+'</div>'+
  (!t.L.length?'<section class="card"><h2>Sin datos para '+P.year+'</h2><p class="muted">Importa el Excel de control o crea la primera línea.</p></section>':
  '<div class="bud-kpis">'+
   '<button type="button" class="bud-kpi" id="budAnnual"><em>Presupuesto anual</em><b>'+(t.annual?eur(t.annual):'Sin fijar')+'</b><small>Pulsa para cambiarlo</small></button>'+
   '<div class="bud-kpi"><em>Previsto y comprometido</em><b>'+eur(t.plan)+'</b><small>'+(t.annual?(Math.round(t.plan/t.annual*1000)/10).toLocaleString("es-ES")+' % del presupuesto':'')+'</small></div>'+
   '<div class="bud-kpi'+(avail<0?' neg':'')+'"><em>Disponible</em><b>'+(t.annual?eur(avail):'—')+'</b><small>'+(t.loaded.length<12?'Con '+(12-t.loaded.length)+' meses sin datos':'Todo el año con datos')+'</small></div>'+
   '<div class="bud-kpi"><em>Gasto real registrado</em><b>'+eur(t.real)+'</b><small>'+(t.real?'Facturado o pagado':'Aún sin importes reales')+'</small></div></div>'+
  (t.annual?'<section class="card"><div class="section-title"><h2>Consumo del presupuesto</h2></div>'+bar(TYPES.map(([k,,c])=>[t.byType[k],c]),Math.max(t.annual,t.plan))+'<div class="bud-legend">'+TYPES.map(([k,n,c])=>'<span><i style="background:'+c+'"></i>'+esc(n)+' · <b>'+eur(t.byType[k])+'</b> ('+(Math.round(t.byType[k]/Math.max(1,t.plan)*1000)/10).toLocaleString("es-ES")+' %)</span>').join("")+'<span><i class="free"></i>Disponible · <b>'+eur(Math.max(0,avail))+'</b></span></div></section>':'')+
  '<section class="card"><div class="section-title"><h2>Mes a mes</h2><span class="muted" style="font-size:12px">Previsto por tipo · barras rayadas = mes sin datos</span></div><div class="bud-months">'+(()=>{const mx=Math.max(1,...MK.map(m=>monthTotal(t.L,m)));return MK.map((m,i)=>{const on=t.loaded.includes(m),tot=monthTotal(t.L,m);return '<div class="bud-m'+(on?'':' none')+'"><div class="bud-col">'+(on?TYPES.map(([k,,c])=>{const v=monthTotal(t.L,m,"plan",l=>l.type===k);return v?'<i style="height:'+(v/mx*100).toFixed(1)+'%;background:'+c+'" title="'+esc(k)+': '+eur(v)+'"></i>':''}).join(""):'')+'</div><b>'+MES[i]+'</b><small>'+(on?eur(tot):'sin datos')+'</small></div>'}).join("")})()+'</div></section>'+
  '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Por canal</h2></div>'+(()=>{const m=new Map();t.L.forEach(l=>m.set(l.channel||"Sin canal",(m.get(l.channel||"Sin canal")||0)+lineTotal(l)));const arr=[...m].filter(x=>x[1]).sort((a,b)=>b[1]-a[1]),mx=Math.max(1,...arr.map(x=>x[1]));return arr.map(([k,v])=>'<div class="bud-row"><span>'+esc(k)+'</span>'+bar([[v,"#FFD400"]],mx)+'<b>'+eur(v)+'</b></div>').join("")})()+'</section>'+
  '<section class="card"><div class="section-title"><h2>Por teatro o proyecto</h2></div>'+(()=>{const m=new Map();t.L.filter(l=>l.type!=="fuera").forEach(l=>m.set(l.venue||"Sin asignar",(m.get(l.venue||"Sin asignar")||0)+lineTotal(l)));const arr=[...m].filter(x=>x[1]).sort((a,b)=>b[1]-a[1]),mx=Math.max(1,...arr.map(x=>x[1]));return arr.map(([k,v])=>'<div class="bud-row"><span>'+esc(k)+'</span>'+bar([[v,k==="Sin asignar"?"#6b665c":"#7fb8ff"]],mx)+'<b>'+eur(v)+'</b></div>').join("")+'<p class="muted" style="font-size:12px;margin:8px 0 0">Sin los gastos fuera de marketing. Asigna el teatro en cada línea para completar este reparto.</p>'})()+'</section></div>'+
  '<section class="card"><div class="section-title"><h2>Revisar</h2></div><div class="bud-alerts">'+alerts(t).map(([k,x])=>'<div class="bud-alert '+k+'">'+esc(x)+'</div>').join("")+(D.notes?'<div class="bud-alert info"><b>Notas del Excel:</b> '+esc(D.notes)+'</div>':'')+'</div></section>'+
  BLOCKS.map(([bk,bn])=>{const ls=t.L.filter(l=>l.block===bk);if(!ls.length)return "";const bt=ls.reduce((a,l)=>a+lineTotal(l),0);
   return '<section class="card bud-block"><div class="section-title"><h2>'+esc(bn)+'</h2><b>'+eur(bt)+'</b></div><div class="bud-table-wrap"><table class="bud-table"><thead><tr><th>Concepto</th><th>Estado</th>'+MES.map((m,i)=>'<th class="n'+(t.loaded.includes(MK[i])?'':' none')+'">'+m+'</th>').join("")+'<th class="n">Total</th></tr></thead><tbody>'+
    ls.map(l=>'<tr data-id="'+l.id+'"><td><b>'+esc(l.concept)+'</b><small>'+esc([l.channel,l.supplier,l.venue&&l.venue.replace("Gran Teatro CaixaBank ","").replace("Gran Teatro ","")].filter(Boolean).join(" · "))+'</small></td><td><span class="bud-st '+esc(l.status)+'">'+esc((STATUS.find(s=>s[0]===l.status)||[,"—"])[1])+'</span></td>'+MK.map(m=>{const v=num((l.plan||{})[m]),r=num((l.real||{})[m]);return '<td class="n'+(t.loaded.includes(m)?'':' none')+'">'+(v?Math.round(v).toLocaleString("es-ES"):'<span class="z">·</span>')+(r?'<em>'+Math.round(r).toLocaleString("es-ES")+'</em>':'')+'</td>'}).join("")+'<td class="n"><b>'+Math.round(lineTotal(l)).toLocaleString("es-ES")+'</b></td></tr>').join("")+
    '</tbody><tfoot><tr><td>Total bloque</td><td></td>'+MK.map(m=>'<td class="n">'+(monthTotal(ls,m)?Math.round(monthTotal(ls,m)).toLocaleString("es-ES"):'')+'</td>').join("")+'<td class="n"><b>'+Math.round(bt).toLocaleString("es-ES")+'</b></td></tr></tfoot></table></div></section>'}).join(""))+
  '<div id="budSheet"></div><input type="file" id="budFile" accept=".xlsx,.xls" hidden>';
 $("#budYears").onclick=async e=>{const b=e.target.closest("[data-y]");if(!b)return;if(P.dirty&&!confirm("Hay cambios sin guardar. ¿Cambiar de año y perderlos?"))return;P.year=b.dataset.y;await load();render()};
 $("#budSave").onclick=()=>save("Cambios en el presupuesto");
 $("#budNew").onclick=()=>editLine(null);
 $("#budImport").onclick=()=>$("#budFile").click();
 $("#budFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(f)await importFile(f)};
 $("#budExport").onclick=exportFile;
 const bc=$("#budClear");if(bc)bc.onclick=()=>{if(P.dirty&&!confirm("Hay cambios sin guardar. ¿Seguir y perderlos?"))return;clearCard(P.year)};
 const an=$("#budAnnual");if(an)an.onclick=()=>{const v=prompt("Presupuesto anual "+P.year+" (en euros):",P.doc.annualBudget||"");if(v==null)return;P.doc.annualBudget=num(v);mark();render()};
 $$(".bud-table tbody tr").forEach(tr=>tr.onclick=()=>editLine(tr.dataset.id));
}

function editLine(id){
 const l=id?P.doc.lines.find(x=>x.id===id):{id:crypto.randomUUID(),block:"acuerdos_puntuales",concept:"",type:"medios",channel:"",supplier:"",venue:"",status:"previsto",plan:{},real:{},notes:""};
 const opt=(arr,v)=>arr.map(([k,n])=>'<option value="'+esc(k)+'"'+(k===v?' selected':'')+'>'+esc(n)+'</option>').join("");
 const venues=[["",""],...VENUES.map(v=>[v,v]),["Corporativo / varios","Corporativo / varios"]];
 const box=$("#budSheet");box.innerHTML='<div class="mag-sheet" id="budModal"><div class="mag-sheet-box bud-edit" role="dialog"><button type="button" class="ghost mag-sheet-x" aria-label="Cerrar">×</button><h2>'+(id?"Editar línea":"Nueva línea")+'</h2><form id="budForm" class="form-grid">'+
  '<label class="wide">Concepto<input name="concept" value="'+esc(l.concept)+'" required></label>'+
  '<label>Bloque<select name="block">'+opt(BLOCKS,l.block)+'</select></label><label>Tipo de gasto<select name="type">'+opt(TYPES.map(x=>[x[0],x[1]]),l.type)+'</select></label>'+
  '<label>Canal<select name="channel">'+opt([["",""],...CHANNELS.map(c=>[c,c])],l.channel)+'</select></label><label>Estado<select name="status">'+opt(STATUS,l.status)+'</select></label>'+
  '<label>Proveedor<input name="supplier" value="'+esc(l.supplier||"")+'"></label><label>Teatro o proyecto<select name="venue">'+opt(venues,l.venue||"")+'</select></label>'+
  '<div class="wide bud-mgrid"><div class="bud-mhead"><span></span>'+MES.map(m=>'<span>'+m+'</span>').join("")+'</div><div><span>Previsto</span>'+MK.map(m=>'<input inputmode="decimal" name="p'+m+'" value="'+(num((l.plan||{})[m])||"")+'">').join("")+'</div><div><span>Real</span>'+MK.map(m=>'<input inputmode="decimal" name="r'+m+'" value="'+(num((l.real||{})[m])||"")+'">').join("")+'</div></div>'+
  '<label class="wide">Notas<textarea name="notes">'+esc(l.notes||"")+'</textarea></label>'+
  '<div class="wide actions-row"><button class="primary" type="submit">Aplicar</button>'+(id?'<button type="button" class="danger" id="budDel">Quitar línea</button>':'')+'<span class="muted" style="font-size:12px">Después pulsa «Guardar» arriba.</span></div></form></div></div>';
 const close=()=>{box.innerHTML="";document.body.classList.remove("sheet-open")};document.body.classList.add("sheet-open");
 $("#budModal").onclick=e=>{if(e.target.id==="budModal")close()};box.querySelector(".mag-sheet-x").onclick=close;
 const del=$("#budDel");if(del)del.onclick=()=>{if(!confirm("¿Quitar «"+l.concept+"»? Se podrá recuperar desde la versión anterior guardada."))return;P.doc.lines=P.doc.lines.filter(x=>x.id!==id);mark();close();render()};
 $("#budForm").onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget).entries());
  const n={...l,concept:v.concept.trim(),block:v.block,type:v.type,channel:v.channel,status:v.status,supplier:v.supplier.trim(),venue:v.venue,notes:v.notes,plan:{},real:{}};
  MK.forEach(m=>{const p=num(v["p"+m]),r=num(v["r"+m]);if(p)n.plan[m]=p;if(r)n.real[m]=r});
  if(id)P.doc.lines=P.doc.lines.map(x=>x.id===id?n:x);else P.doc.lines.push(n);
  const lm=new Set(P.doc.monthsLoaded||[]);MK.forEach(m=>{if(n.plan[m]||n.real[m])lm.add(m)});P.doc.monthsLoaded=[...lm].sort();
  mark();close();render()};
}

async function importFile(file){
 try{await loadXLSX();const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});const r=parseWorkbook(wb);
  if(!r.lines.length)throw new Error("No he encontrado líneas con importes en el Excel.");
  const tot=r.lines.reduce((a,l)=>a+lineTotal(l),0);
  if(!confirm("Excel «"+file.name+"»: "+r.lines.length+" líneas, "+eur(tot)+" previstos"+(r.annual?", presupuesto anual "+eur(r.annual):"")+(r.loose.length?", "+r.loose.length+" valores fuera de la tabla":"")+".\n\nSustituye las líneas de "+P.year+" que hay ahora ("+(P.doc.lines||[]).length+"). La versión anterior queda guardada.\n\n¿Importar?"))return;
  P.doc={...P.doc,lines:r.lines,monthsLoaded:r.monthsLoaded,loose:r.loose,notes:r.notes||P.doc.notes||"",annualBudget:r.annual||P.doc.annualBudget||0,source:file.name};
  P.dirty=true;await save("Importado "+file.name)}
 catch(e){say(e.message||"No se ha podido leer el Excel")}}

async function exportFile(){
 try{await loadXLSX();const L=P.doc.lines||[],wb=XLSX.utils.book_new();
  const aoa=[["CONTROL PRESUPUESTO PUBLICIDAD "+P.year],[],["Concepto",...MES,"Total"]];
  BLOCKS.forEach(([bk,bn])=>{const ls=L.filter(l=>l.block===bk);if(!ls.length)return;aoa.push([bn]);ls.forEach(l=>aoa.push([l.concept,...MK.map(m=>num((l.plan||{})[m])),lineTotal(l)]));aoa.push(["Total "+bn.toLowerCase(),...MK.map(m=>monthTotal(ls,m)),ls.reduce((a,l)=>a+lineTotal(l),0)]);aoa.push([])});
  aoa.push(["TOTAL",...MK.map(m=>monthTotal(L,m)),L.reduce((a,l)=>a+lineTotal(l),0)]);aoa.push(["Presupuesto anual",P.doc.annualBudget||0]);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),"Control");
  const flat=[["Bloque","Concepto","Tipo","Canal","Proveedor","Teatro / proyecto","Estado",...MES.map(m=>"Previsto "+m),...MES.map(m=>"Real "+m),"Total previsto","Total real","Notas"]];
  L.forEach(l=>flat.push([(BLOCKS.find(b=>b[0]===l.block)||[,""])[1],l.concept,(TYPES.find(x=>x[0]===l.type)||[,""])[1],l.channel,l.supplier,l.venue,(STATUS.find(s=>s[0]===l.status)||[,""])[1],...MK.map(m=>num((l.plan||{})[m])),...MK.map(m=>num((l.real||{})[m])),lineTotal(l),lineTotal(l,"real"),l.notes||""]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(flat),"Líneas");
  XLSX.writeFile(wb,"Presupuesto_publicidad_"+P.year+"_"+new Date().toLocaleDateString("sv")+".xlsx");say("Excel descargado")}
 catch(e){say(e.message||"No se ha podido exportar")}}
window.addEventListener("beforeunload",e=>{if(P.dirty&&state&&state.route==="presupuesto"){e.preventDefault();e.returnValue=""}});
})();
