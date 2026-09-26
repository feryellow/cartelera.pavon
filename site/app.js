(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={actor:null,route:"dashboard",editing:null,assetUrls:new Map()};
const gate=$("#loginGate"), app=$("#app"), toast=$("#toast");
const key=()=>{try{return sessionStorage.getItem("pavon_edit_key")||""}catch{return""}};
const headers=(extra={})=>({...extra,...(key()?{"x-edit-key":key()}:{})});
function say(msg){toast.textContent=msg;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200)}
async function api(url,opts={}){opts.headers=headers(opts.headers||{});const r=await fetch(url,opts);let data=null;const ct=r.headers.get("content-type")||"";if(ct.includes("json")){try{data=await r.json()}catch{}}else{try{data=await r.text()}catch{}}if(!r.ok)throw Object.assign(new Error(data?.error||data||("HTTP "+r.status)),{status:r.status,data});return data}
function roles(){return state.actor?.roles||[]}
function has(role){return roles().includes("admin")||roles().includes(role)}
function canRoute(route){if(roles().includes("admin"))return true;if(route==="dashboard"||route==="calendario"||route==="carteleria"||route==="archivo")return true;if((route==="radio"||route==="taxis"||route==="intercambiadores"||route==="hometicket"||route==="revistas")&&roles().includes("gestion"))return true;return false}
const ICON_PATHS={dashboard:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',carteleria:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/>',hometicket:'<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',radio:'<rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="15.5" cy="14" r="3"/><path d="M7 12h3M7 16h3M6 8l11-4"/>',taxis:'<path d="M5 17V12l2-5h10l2 5v5M3 17h18v3H3zM9 4h6"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',intercambiadores:'<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21l1-3M16 21l-1-3"/>',revistas:'<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M18 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4"/>',archivo:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',admin:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'};
// Fotos de las tarjetas de Inicio y cabeceras. Para cambiar una foto, sustituye el archivo en /assets/tiles/ (formato 4:3, JPG).
const ROUTE_PHOTOS={carteleria:"/assets/tiles/carteleria.jpg",revistas:"/assets/tiles/revistas.jpg",calendario:"/assets/tiles/calendario.jpg",hometicket:"/assets/tiles/hometicket.jpg?v=2",radio:"/assets/tiles/radio.jpg",taxis:"/assets/tiles/taxis.jpg",intercambiadores:"/assets/tiles/intercambiadores.jpg",archivo:"/assets/tiles/archivo.jpg",admin:"/assets/tiles/usuarios.jpg"};
function icon(route,cls="nav-ico"){return '<svg class="'+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON_PATHS[route]||"")+'</svg>'}
function navMeta(route){const a=$('#mainNav [data-route="'+route+'"]');return a?{href:a.getAttribute("href"),small:a.querySelector("small")?.textContent||"",name:a.querySelector("b")?.textContent||""}:null}
$$("#mainNav a").forEach(a=>{if(!a.querySelector("svg"))a.insertAdjacentHTML("afterbegin",icon(a.dataset.route))});
const MODULE_LABELS={avisos:"Avisos",carteleria:"Cartelería",radio:"Radio",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas de Teatros",publicidad:"Publicidad",usuarios:"Usuarios",admin:"Usuarios"};
const ACTION_LABELS={create:"creado",update:"editado",archive:"archivado",save:"guardado",image_replace:"imagen cambiada",image_delete:"imagen quitada",role_change:"rol cambiado",user_create:"usuario creado",user_disable:"usuario desactivado",user_enable:"usuario activado",email_sent:"correo enviado",email_pending:"correo pendiente",digest_sent:"resumen enviado",digest_pending:"resumen pendiente"};
function modLabel(m){return MODULE_LABELS[m]||m||""}
function actLabel(a){return ACTION_LABELS[a]||a||""}
function prettyKey(k=""){const cs=CART_SLOTS.find(x=>x.key===k);if(cs)return cs.name;const t=String(k).replaceAll("__"," · ").replaceAll("_"," ").trim();return t.charAt(0).toUpperCase()+t.slice(1)}
function openFormCard(){setTimeout(()=>{const c=$('[id$="FormCard"]');if(!c)return;c.classList.add("open");if(matchMedia("(max-width:700px)").matches)c.scrollIntoView({behavior:"smooth",block:"start"})},0)}
document.addEventListener("click",e=>{const t=e.target.closest("#newCampaign,#newRadio,#newHT,#newRevista,[data-edit-campaign],[data-edit-radio],[data-edit-ht],[data-edit-revista],[data-add-revista]");if(t)openFormCard();const c=e.target.closest("#cancelCampaign,#cancelRadio,#cancelHT,#cancelRevista");if(c)setTimeout(()=>{const f=$('[id$="FormCard"]');f&&f.classList.remove("open")},0)});
function applyNav(){document.body.dataset.route=state.route;$$("[data-route]").forEach(a=>{const r=a.dataset.route;a.classList.toggle("active",r===state.route);a.classList.toggle("locked",!canRoute(r))});$("#accountName").textContent=state.actor?.email||"";const na=$("#navAccountName");if(na){na.textContent=state.actor?.email||"—";const av=$(".account-avatar");if(av)av.textContent=(state.actor?.email||"Y").charAt(0).toUpperCase()}const act=$("#mainNav a.active");if(act&&matchMedia("(max-width:980px)").matches)act.scrollIntoView({inline:"center",block:"nearest"})}
async function authenticate(){
 try{const d=await api("/api/me",{cache:"no-store"});state.actor=d.actor;gate.classList.add("hidden");applyNav();return true}
 catch{gate.classList.remove("hidden");return false}
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:$("#loginEmail").value,password:$("#loginPassword").value})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).error||"No se ha podido iniciar sesión")});if(await authenticate())route()}catch(err){$("#loginError").textContent=err.message}});
$("#keyForm").addEventListener("submit",async e=>{e.preventDefault();try{sessionStorage.setItem("pavon_edit_key",$("#legacyKey").value.trim())}catch{};if(await authenticate())route();else $("#loginError").textContent="Clave no válida"});
document.addEventListener("click",e=>{if(e.target.closest(".nav-logout"))$("#logoutBtn").click()});
$("#logoutBtn").addEventListener("click",async()=>{try{await fetch("/api/logout",{method:"POST"})}catch{};try{sessionStorage.removeItem("pavon_edit_key")}catch{};state.actor=null;gate.classList.remove("hidden")});
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fdate(v){if(!v)return"—";try{return new Date(v+"T00:00:00").toLocaleDateString("es-ES")}catch{return v}}
function statusBadge(v){const s=(v||"activo").toLowerCase();return '<span class="badge '+(s==="activo"||s==="correcto"?"ok":s.includes("pend")?"warn":"")+'">'+esc(v||"activo")+"</span>"}
function pageHead(title,sub,actions=""){const home=state.route==="dashboard"?"":'<a class="btn back-home" href="#dashboard">← Inicio</a>';const m=navMeta(state.route),photo=ROUTE_PHOTOS[state.route];return '<div class="page-banner'+(photo?' has-photo':'')+'"'+(photo?' style="--photo:url('+photo+')"':'')+'><div class="page-banner-txt">'+(m?.small?'<small>'+esc(m.small)+'</small>':'')+'<h1>'+esc(title)+'</h1><p>'+esc(sub||"")+'</p></div></div><div class="page-actions actions-row">'+home+actions+"</div>"}
async function blobUrl(assetKey,moduleName){if(!assetKey)return null;if(state.assetUrls.has(assetKey))return state.assetUrls.get(assetKey);const r=await fetch("/api/asset?key="+encodeURIComponent(assetKey)+"&module="+moduleName,{headers:headers()});if(!r.ok)return null;const b=await r.blob(),u=URL.createObjectURL(b);state.assetUrls.set(assetKey,u);return u}
function routeName(){return (location.hash||"#dashboard").slice(1).split("?")[0]||"dashboard"}
async function route(){const q=new URLSearchParams(location.search);if(q.get("vista")){location.replace("/#carteleria?vista="+encodeURIComponent(q.get("vista")));return}const nextRoute=routeName();if(state.route==="carteleria"&&nextRoute!=="carteleria"&&cart.dirty.size&&!confirm("Hay cambios sin guardar en Cartelería. ¿Salir sin guardar?")){history.replaceState(null,"","#carteleria");return}state.route=nextRoute;if(!canRoute(state.route))state.route="dashboard";applyNav();app.innerHTML='<div class="loading">Cargando…</div>';try{if(state.route==="dashboard")await dashboard();else if(state.route==="radio")await radio();else if(state.route==="taxis")await campaigns("taxis");else if(state.route==="intercambiadores")await campaigns("intercambiadores");else if(state.route==="hometicket")await homeTicket();else if(state.route==="revistas")await revistas();else if(state.route==="carteleria")await carteleria();else if(state.route==="calendario")await calendario();else if(state.route==="archivo")await archivo();else if(state.route==="admin")await admin();else await dashboard();openEditFromHash()}catch(e){app.innerHTML=pageHead("Error","")+ '<div class="card error">'+esc(e.message)+"</div>"}}
window.addEventListener("hashchange",route);

async function dashboard(){
 const d=await api("/api/control?module=dashboard");
 const all=(d.carteleria||[]).filter(x=>x.next);
 const today=new Date();today.setHours(0,0,0,0);
 const alerts=all.map(x=>{const dt=new Date(x.next+"T00:00:00");const days=Math.round((dt-today)/86400000);return {...x,days}}).filter(x=>x.days<=7).sort((a,b)=>a.days-b.days);
 const next=all.slice().sort((a,b)=>String(a.next).localeCompare(String(b.next))).slice(0,8);
 const alertHtml=alerts.length?alerts.slice(0,8).map(x=>{
   const label=x.days<0?"Vencido "+Math.abs(x.days)+" d":x.days===0?"HOY":"D-"+x.days;
   return '<div class="item"><div><h3>'+esc((x.title?x.title+' · ':'')+prettyKey(x.key))+'</h3><div class="item-meta"><span class="badge '+(x.days<0?"warn":"")+'">'+label+'</span><span>'+fdate(x.next)+'</span></div></div></div>';
 }).join(""):'<div class="notice">No hay avisos de cartelería en los próximos 7 días.</div>';
 app.innerHTML=homeHeader(alerts,d)+homeTiles(d,alerts)+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Material que requiere atención</h2><span class="badge warn">'+(d.attention||[]).length+'</span></div><div class="list attention-list">'+((d.attention||[]).length?(d.attention||[]).map(x=>'<div class="item '+(x.overdue?"overdue":"")+'"><div><h3>'+esc(x.module)+' · '+esc(x.title)+'</h3><div class="item-meta"><span>'+esc(x.place||"")+'</span><span>'+esc(x.materialStatus||"pendiente")+'</span><span>Entrega: '+fdate(x.deliveryDate)+'</span></div></div></div>').join(""):'<div class="notice">No hay material pendiente con fecha límite registrada.</div>')+'</div></section><section class="card"><div class="section-title"><h2>Material activo ahora</h2><span class="badge ok">'+(d.currentMaterial||[]).length+'</span></div><div class="list">'+((d.currentMaterial||[]).length?(d.currentMaterial||[]).map(x=>'<div class="item"><div><h3>'+esc(x.module)+' · '+esc(x.title)+'</h3><div class="item-meta"><span>'+esc(x.place||"")+'</span><span>'+esc(x.materialStatus||"sin indicar")+'</span><span>Fin: '+fdate(x.endDate)+'</span></div></div></div>').join(""):'<div class="notice">No hay material activo registrado.</div>')+'</div></section></div>'+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Avisos y vencimientos</h2><a class="btn" href="#calendario">Ver calendario</a></div><div class="list">'+alertHtml+'</div>'+
 '<div class="section-title" style="margin-top:20px"><h2>Próximos cambios</h2></div><div class="list">'+
 (next.length?next.map(x=>'<div class="item"><div><h3>'+esc((x.title?x.title+' · ':'')+prettyKey(x.key))+'</h3><div class="item-meta"><span>'+fdate(x.next)+'</span></div></div></div>').join(""):'<div class="notice">No hay fechas de cambio registradas.</div>')+
 '</div></section><section class="card"><div class="section-title"><h2>Últimas modificaciones</h2></div><div class="list">'+
 ((d.latest||[]).length?d.latest.map(a=>'<div class="item"><div><h3>'+esc(modLabel(a.module))+" · "+esc(actLabel(a.action))+'</h3><div class="item-meta"><span>'+esc(a.actor?.email||"")+'</span><span>'+new Date(a.at).toLocaleString("es-ES")+'</span></div></div></div>').join(""):'<div class="notice">Todavía no hay histórico.</div>')+
 '</div></section></div>';
}

function homeHeader(alerts,d={}){const h=new Date().getHours(),greet=h<14?"Buenos días":h<21?"Buenas tardes":"Buenas noches";const date=new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});const first=alerts[0];
 const aviso=first?'<a class="home-alert'+(first.days<0?' late':'')+'" href="#carteleria"><small>'+(first.days<0?'Fuera de plazo':'Urgente')+' · Cartelería<em>'+(first.days<0?'+'+Math.abs(first.days)+' d':first.days===0?'HOY':'D-'+first.days)+'</em></small><b>'+esc((first.title?first.title+' · ':'')+prettyKey(first.key))+'</b><span>'+(first.days<0?"Vencido hace "+Math.abs(first.days)+(Math.abs(first.days)===1?" día":" días"):first.days===0?"Cambio hoy":"Cambio en "+first.days+(first.days===1?" día":" días"))+' · '+fdate(first.next)+'</span></a>':"";
 return '<div class="home-hero"><div class="home-hello"><small class="home-kicker">Panel general · Yellow Media</small><h1>'+greet+'</h1><p>'+esc(date.charAt(0).toUpperCase()+date.slice(1))+'</p></div>'+homeKpis(d)+'</div>'+aviso}
function homeTiles(d,alerts){const count=(n,one,many)=>n==null?"":n+" "+(n===1?one:many);const badges={carteleria:alerts.length?count(alerts.length,"aviso","avisos")+" ≤ 7 días":"",radio:d.radio?count(d.radio.active,"cuña activa","cuñas activas"):"",taxis:d.taxis?count(d.taxis.active,"campaña activa","campañas activas"):"",intercambiadores:d.intercambiadores?count(d.intercambiadores.active,"campaña activa","campañas activas"):"",hometicket:d.hometicket?count(d.hometicket.active,"activo","activos"):"",revistas:d.revistas?d.revistas.active+" de "+MAGAZINES.length+" este mes":""};
 const routes=["calendario","carteleria","hometicket","radio","taxis","intercambiadores","revistas","archivo","admin"].filter(canRoute);
 return '<div class="home-section-label"><span>Secciones</span><span>'+routes.length+' módulos</span></div><nav class="home-tiles" aria-label="Secciones">'+routes.map(r=>{const m=navMeta(r);if(!m)return"";const photo=ROUTE_PHOTOS[r],b=badges[r];return '<a class="home-tile'+(photo?' has-photo':'')+'" href="'+esc(m.href)+'"'+(photo?' style="--photo:url('+photo+')"':'')+'>'+icon(r,"tile-ico")+(b?'<span class="tile-badge'+(r==="carteleria"&&alerts.length?' hot':'')+'">'+esc(b)+'</span>':'')+'<span class="tile-txt"><small>'+esc(m.small)+'</small><b>'+(r==="intercambiadores"?"Intercam&shy;biadores":esc(m.name))+'</b></span></a>'}).join("")+'</nav>'}

function stat(value,label){return '<div class="card stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>'}

let RADIO_CONTRACTS=[];
const radioView={contractId:"",month:""};

async function loadRadioContracts(){
 if(RADIO_CONTRACTS.length)return RADIO_CONTRACTS;
 const r=await fetch("/data/radio-contracts.json",{cache:"no-cache"});
 if(!r.ok)throw new Error("No se ha podido cargar el inventario contractual de Radio");
 const d=await r.json();RADIO_CONTRACTS=d.contracts||[];return RADIO_CONTRACTS
}
function radioContract(id){return RADIO_CONTRACTS.find(c=>c.id===id)}
function radioLine(contract,id){return contract?.lines?.find(l=>l.id===id)}
function radioMonths(contract){return [...new Set((contract?.lines||[]).flatMap(l=>Object.keys(l.monthly||{})))].sort()}
function radioMonthLabel(m){if(!m)return"—";const [y,mo]=m.split("-").map(Number);return new Date(y,mo-1,1).toLocaleDateString("es-ES",{month:"long",year:"numeric"}).replace(/^./,x=>x.toUpperCase())}
function radioNum(v){const n=Number(v);return Number.isFinite(n)?n:0}
function radioWeekKey(v){if(!v)return"";const d=new Date(v+"T12:00:00"),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10)}
function radioFmt(n){return new Intl.NumberFormat("es-ES").format(radioNum(n))}
function radioRows(rows,contractId,month){return rows.filter(r=>r.contractId===contractId&&r.inventoryMonth===month)}
function radioLineStats(contract,line,month,rows){
 const capacity=radioNum(line?.monthly?.[month]),used=rows.filter(r=>r.lineId===line.id);
 const planned=used.reduce((a,r)=>a+radioNum(r.plannedSpots),0),actual=used.reduce((a,r)=>a+radioNum(r.actualSpots),0);
 return {capacity,planned,actual,remaining:capacity-planned,rows:used}
}
function radioContractTotal(contract,month,rows,unit){
 const lines=(contract.lines||[]).filter(l=>l.unit===unit);
 return lines.reduce((o,l)=>{const x=radioLineStats(contract,l,month,rows);o.capacity+=x.capacity;o.planned+=x.planned;o.actual+=x.actual;return o},{capacity:0,planned:0,actual:0})
}
function radioContractTabs(contracts,selected){
 return '<div class="radio-contract-tabs">'+contracts.map(c=>'<button type="button" class="radio-contract-tab '+(c.id===selected?'on':'')+'" data-radio-contract="'+esc(c.id)+'"><small>'+esc(c.venue.replace("Gran Teatro CaixaBank ","").replace("Gran Teatro ",""))+'</small><b>'+esc(c.brand)+'</b><span>'+esc(c.startDate.slice(0,4))+'–'+esc(c.endDate.slice(0,4))+'</span></button>').join("")+'</div>'
}
function radioMonthTabs(contract,selected){
 return '<div class="chip-row radio-months"><span class="chip-label">Mes</span>'+radioMonths(contract).map(m=>'<button type="button" class="chip '+(m===selected?'on':'')+'" data-radio-month="'+m+'">'+esc(radioMonthLabel(m).replace(" 20"," ’"))+'</button>').join("")+'</div>'
}
function radioInventoryKpis(contract,month,rows){
 const units=[...new Set((contract.lines||[]).map(l=>l.unit))];
 return '<div class="radio-inventory-kpis">'+units.map(unit=>{const x=radioContractTotal(contract,month,rows,unit),remaining=x.capacity-x.planned;return '<div class="radio-inv-kpi"><small>'+esc(unit)+'</small><strong>'+radioFmt(x.planned)+' <em>/ '+radioFmt(x.capacity)+'</em></strong><span>'+radioFmt(Math.max(0,remaining))+' disponibles'+(x.actual?' · '+radioFmt(x.actual)+' emitidas/realizadas':'')+'</span></div>'}).join("")+'</div>'
}
function radioLineTable(contract,month,rows){
 const lineRows=(contract.lines||[]).filter(l=>radioNum(l.monthly?.[month])>0);
 return '<div class="radio-line-table"><div class="radio-line-head"><span>Emisora / programa</span><span>Contratado</span><span>Asignado</span><span>Real</span><span>Disponible</span></div>'+
 lineRows.map(l=>{const x=radioLineStats(contract,l,month,rows),over=x.remaining<0;return '<div class="radio-line-row"><div><b>'+esc(l.station)+'</b><span>'+esc(l.program)+' · '+esc(l.duration)+' · '+esc(l.timeSlot)+'</span></div><strong>'+radioFmt(x.capacity)+'</strong><strong>'+radioFmt(x.planned)+'</strong><strong>'+radioFmt(x.actual)+'</strong><strong class="'+(over?'radio-over':'')+'">'+radioFmt(x.remaining)+'</strong></div>'}).join("")+'</div>'
}
function radioAssignments(rows,contract){
 if(!rows.length)return '<div class="notice">Todavía no hay asignaciones para este mes. El inventario está disponible para repartir entre espectáculos.</div>';
 return rows.slice().sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||""))).map(r=>{const l=radioLine(contract,r.lineId),unit=r.unit||l?.unit||"cuñas";return '<div class="item radio-assignment" data-id="'+r.id+'"><div><div class="item-meta"><span class="badge">'+esc(l?.station||r.station||"Radio")+'</span><span>'+esc(l?.program||"")+'</span></div><h3>'+esc(r.spectacle||r.campaignName||"Sin espectáculo")+'</h3><div class="item-meta"><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span><span><b>'+radioFmt(r.plannedSpots)+'</b> '+esc(unit)+' planificadas</span>'+(radioNum(r.actualSpots)?'<span><b>'+radioFmt(r.actualSpots)+'</b> reales</span>':'')+'<span>'+esc(r.spotName||"Sin nombre de cuña")+'</span>'+statusBadge(r.materialStatus||r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="radio" data-kind="audio" data-name="'+esc(r.assetName||"")+'"></div></div><div class="item-actions"><button data-edit-radio="'+r.id+'">Editar</button><button class="danger" data-del-radio="'+r.id+'">Archivar</button></div></div>'}).join("")
}
function radioWeekPanel(rows,month,contract){
 const [y,m]=month.split("-").map(Number),last=new Date(y,m,0).getDate(),weeks=[];let d=1;
 while(d<=last){const dt=new Date(y,m-1,d),mon=d-((dt.getDay()+6)%7),start=Math.max(1,mon),end=Math.min(last,mon+6);if(!weeks.some(w=>w.start===start))weeks.push({start,end});d=end+1}
 const inRange=(r,w)=>{const a=r.startDate||month+"-01",b=r.endDate||a,s=month+"-"+String(w.start).padStart(2,"0"),e=month+"-"+String(w.end).padStart(2,"0");return a<=e&&b>=s};
 return '<div class="radio-weeks">'+weeks.map((w,i)=>{const rr=rows.filter(r=>inRange(r,w));return '<div class="radio-week"><div><small>SEMANA '+(i+1)+'</small><b>'+w.start+'–'+w.end+' '+radioMonthLabel(month).split(" ")[0]+'</b></div><span>'+rr.length+' asignación'+(rr.length===1?'':'es')+'</span>'+(rr.length?'<p>'+rr.map(r=>esc(r.spectacle||"Sin espectáculo")+' · '+radioFmt(r.plannedSpots)+' '+esc(r.unit||radioLine(contract,r.lineId)?.unit||"cuñas")).join(" · ")+'</p>':'')+'</div>'}).join("")+'</div>'
}
function radioSpectacleReport(rows,contract){
 const map=new Map();rows.forEach(r=>{const k=r.spectacle||r.campaignName||"Sin espectáculo";const l=radioLine(contract,r.lineId),unit=r.unit||l?.unit||"cuñas",key=k+"|"+unit;const x=map.get(key)||{name:k,unit,planned:0,actual:0};x.planned+=radioNum(r.plannedSpots);x.actual+=radioNum(r.actualSpots);map.set(key,x)});
 const all=[...map.values()].sort((a,b)=>b.planned-a.planned);
 return all.length?'<div class="radio-spectacle-report">'+all.map(x=>'<div><b>'+esc(x.name)+'</b><span>'+radioFmt(x.planned)+' '+esc(x.unit)+(x.actual?' · '+radioFmt(x.actual)+' reales':'')+'</span></div>').join("")+'</div>':'<div class="notice">Sin consumo asignado a espectáculos este mes.</div>'
}
function radioPrint(contract,month,rows){
 const units=[...new Set(contract.lines.map(l=>l.unit))],summaries=units.map(u=>({u,...radioContractTotal(contract,month,rows,u)}));
 const bySpectacle=new Map();rows.forEach(r=>{const l=radioLine(contract,r.lineId),unit=r.unit||l?.unit||"cuñas",k=(r.spectacle||"Sin espectáculo")+"|"+unit,x=bySpectacle.get(k)||{name:r.spectacle||"Sin espectáculo",unit,planned:0,actual:0};x.planned+=radioNum(r.plannedSpots);x.actual+=radioNum(r.actualSpots);bySpectacle.set(k,x)});
 const w=window.open("","_blank","width=980,height=760");if(!w){say("El navegador ha bloqueado la ventana del informe");return}
 const lines=contract.lines.filter(l=>radioNum(l.monthly?.[month])>0).map(l=>{const x=radioLineStats(contract,l,month,rows);return '<tr><td><b>'+esc(l.station)+'</b><br><small>'+esc(l.program)+'</small></td><td>'+radioFmt(x.capacity)+'</td><td>'+radioFmt(x.planned)+'</td><td>'+radioFmt(x.actual)+'</td><td>'+radioFmt(x.remaining)+'</td></tr>'}).join("");
 const specs=[...bySpectacle.values()].sort((a,b)=>b.planned-a.planned).map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+radioFmt(x.planned)+' '+esc(x.unit)+'</td><td>'+radioFmt(x.actual)+'</td></tr>').join("");
 w.document.write('<!doctype html><meta charset="utf-8"><title>Informe Radio · '+esc(radioMonthLabel(month))+'</title><style>body{font-family:Arial,sans-serif;margin:34px;color:#111}h1{font-size:28px;margin-bottom:4px}h2{margin-top:28px}p{color:#555}.k{display:flex;gap:12px}.k div{border:1px solid #ddd;padding:14px;min-width:180px}.k b{font-size:22px;display:block}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd;font-size:13px}small{color:#666}@media print{button{display:none}}</style><h1>RADIO · '+esc(contract.venue)+'</h1><p>'+esc(contract.brand)+' · '+esc(radioMonthLabel(month))+' · '+esc(contract.contractNumber)+'</p><div class="k">'+summaries.map(x=>'<div><small>'+esc(x.u)+'</small><b>'+radioFmt(x.planned)+' / '+radioFmt(x.capacity)+'</b><span>'+radioFmt(x.capacity-x.planned)+' disponibles · '+radioFmt(x.actual)+' reales</span></div>').join("")+'</div><h2>Inventario por emisora / programa</h2><table><thead><tr><th>Emisora / programa</th><th>Contratado</th><th>Asignado</th><th>Real</th><th>Disponible</th></tr></thead><tbody>'+lines+'</tbody></table><h2>Consumo por espectáculo</h2><table><thead><tr><th>Espectáculo</th><th>Planificado</th><th>Real</th></tr></thead><tbody>'+specs+'</tbody></table><p><small>Generado desde Yellow Control. Las cifras reales dependen del certificado de emisión cuando se haya registrado.</small></p><button onclick="print()">Imprimir / Guardar PDF</button>');
 w.document.close()
}
async function radio(){
 const [d,contracts]=await Promise.all([api("/api/control?module=radio"),loadRadioContracts()]);
 const rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const current=monthKey(new Date()),eligible=contracts.filter(c=>radioMonths(c).includes(current));
 if(!radioView.contractId||!radioContract(radioView.contractId))radioView.contractId=(eligible[0]||contracts[0])?.id||"";
 const contract=radioContract(radioView.contractId),months=radioMonths(contract);
 if(!radioView.month||!months.includes(radioView.month))radioView.month=months.includes(current)?current:months[0]||"";
 const month=radioView.month,monthRows=radioRows(rows,contract.id,month),legacy=rows.filter(r=>!r.contractId);
 app.innerHTML=pageHead("Radio","Control contractual, reparto por espectáculo, materiales y consumo",'<button id="radioPrint" class="btn">Informe mensual</button><button id="newRadio" class="primary">+ Nueva asignación</button>')+
 radioContractTabs(contracts,contract.id)+
 '<section class="card radio-contract-head"><div><small class="section-kicker">Contrato activo</small><h2>'+esc(contract.venue)+' · '+esc(contract.brand)+'</h2><p>'+esc(contract.provider)+' · '+esc(contract.contractNumber)+' · '+fdate(contract.startDate)+' → '+fdate(contract.endDate)+'</p></div><div class="radio-contract-note">'+esc(contract.notes||"")+'</div></section>'+
 radioMonthTabs(contract,month)+radioInventoryKpis(contract,month,monthRows)+
 '<div class="grid radio-main-grid"><section class="card"><div class="section-title"><div><small class="section-kicker">Inventario contractual</small><h2>'+esc(radioMonthLabel(month))+'</h2></div><span class="badge">'+monthRows.length+' asignaciones</span></div>'+radioLineTable(contract,month,monthRows)+'</section>'+
 '<section class="card" id="radioFormCard">'+radioForm({},contract,month)+'</section></div>'+
 '<div class="grid two-col radio-bottom-grid"><section class="card"><div class="section-title"><div><small class="section-kicker">Planificación</small><h2>Asignaciones del mes</h2></div></div><div class="list">'+radioAssignments(monthRows,contract)+'</div></section>'+
 '<section class="card"><div class="section-title"><div><small class="section-kicker">Control semanal</small><h2>Semanas del mes</h2></div></div>'+radioWeekPanel(monthRows,month,contract)+'<div class="section-title radio-report-title"><div><small class="section-kicker">Informe</small><h2>Consumo por espectáculo</h2></div></div>'+radioSpectacleReport(monthRows,contract)+'</section></div>'+
 (legacy.length?'<section class="card radio-legacy"><div class="section-title"><h2>Registros anteriores sin contrato</h2><span class="badge">'+legacy.length+'</span></div><p class="muted">Se conservan para no perder información. Puedes editarlos y asignarlos a uno de los tres contratos cuando corresponda.</p><div class="list">'+radioAssignments(legacy,{lines:[]})+'</div></section>':"");
 $$("[data-radio-contract]").forEach(b=>b.onclick=()=>{radioView.contractId=b.dataset.radioContract;radioView.month="";radio()});
 $$("[data-radio-month]").forEach(b=>b.onclick=()=>{radioView.month=b.dataset.radioMonth;radio()});
 $("#radioPrint").onclick=()=>radioPrint(contract,month,monthRows);
 bindRadio(rows,contract,month);await hydrateMedia("radio")
}
function localToday(){return new Date().toLocaleDateString("sv")}
function activeNow(r){const t=localToday();return !r.deletedAt&&(r.status||"").toLowerCase()!=="finalizado"&&(!r.startDate||r.startDate<=t)&&(!r.endDate||r.endDate>=t)}
function radioItems(rows){return radioAssignments(rows,{lines:[]})}
function radioForm(r={},selectedContract=null,selectedMonth=""){
 const contract=(r.id&&!r.contractId)?null:(radioContract(r.contractId)||selectedContract||radioContract(radioView.contractId)),months=radioMonths(contract),month=r.inventoryMonth||selectedMonth||months[0]||"",line=radioLine(contract,r.lineId)||contract?.lines?.find(l=>radioNum(l.monthly?.[month])>0)||contract?.lines?.[0],legacy=!contract;
 const contractOpts='<option value="">Sin contrato / histórico</option>'+RADIO_CONTRACTS.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===contract?.id?'selected':'')+'>'+esc(c.venue)+' · '+esc(c.brand)+'</option>').join("");
 const monthOpts=months.map(m=>'<option value="'+m+'" '+(m===month?'selected':'')+'>'+esc(radioMonthLabel(m))+'</option>').join("");
 const lineOpts=(contract?.lines||[]).filter(l=>!month||radioNum(l.monthly?.[month])>0).map(l=>'<option value="'+esc(l.id)+'" '+(l.id===line?.id?'selected':'')+'>'+esc(l.station)+' · '+esc(l.program)+' · '+esc(l.unit)+'</option>').join("");
 return '<div class="section-title"><div><small class="section-kicker">'+(r.id?'Editar':'Nueva')+'</small><h2>Asignación de radio</h2></div></div><form id="radioForm" class="form-grid">'+
 '<label class="wide">Acuerdo<select name="contractId" id="radioContractSelect">'+contractOpts+'</select></label>'+
 '<label>Mes de inventario<select name="inventoryMonth" id="radioMonthSelect">'+monthOpts+'</select></label>'+
 '<label class="wide">Emisora / programa<select name="lineId" id="radioLineSelect">'+lineOpts+'</select></label>'+
 '<div class="wide radio-form-line" id="radioLineInfo"></div>'+
 input("spectacle","Espectáculo",r.spectacle)+input("campaignName","Nombre interno / campaña",r.campaignName)+
 input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+
 '<label>Planificado<input name="plannedSpots" type="number" min="0" step="1" value="'+esc(r.plannedSpots||"")+'" '+(contract?'required':'')+'></label>'+
 '<label>Real / certificado<input name="actualSpots" type="number" min="0" step="1" value="'+esc(r.actualSpots||"")+'"></label>'+
 input("spotName","Nombre de la cuña / pieza",r.spotName)+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+
 materialStatusSelect(r.materialStatus)+selectStatus(r.status)+input("certificateRef","Certificado / referencia",r.certificateRef)+
 '<div id="radioLegacyFields" class="wide '+(legacy?'':'hidden')+'"><div class="form-grid">'+venueSelect(r.venue)+input("station","Emisora manual",r.station)+input("duration","Duración",r.duration)+input("timeSlot","Franja",r.timeSlot)+'</div></div>'+
 (contract?'<input type="hidden" name="venue" value="'+esc(contract.venue||"")+'"><input type="hidden" name="station" value="'+esc(line?.station||"")+'"><input type="hidden" name="duration" value="'+esc(line?.duration||"")+'"><input type="hidden" name="timeSlot" value="'+esc(line?.timeSlot||"")+'"><input type="hidden" name="unit" value="'+esc(line?.unit||"cuñas")+'">':'<input type="hidden" name="unit" value="'+esc(r.unit||"cuñas")+'">')+
 '<label class="wide">Audio<input id="radioAsset" type="file" accept="audio/*"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label>'+
 '<div class="wide radio-form-help">Las cantidades se descuentan del inventario del contrato y mes seleccionados. Cada asignación contractual debe quedar dentro de una misma semana (lunes a domingo) para que el control semanal y mensual sea exacto.</div>'+
 '<div class="wide actions-row"><button class="primary" type="submit">Guardar asignación</button><button type="button" id="cancelRadio">Limpiar</button></div></form>'
}
function input(name,label,value="",type="text"){return '<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value||"")+'"'+(name==="spectacle"?' data-ac="spectacle" autocomplete="off"':"")+'></label>'}
const VENUES=["Gran Teatro Pavón","Gran Teatro CaixaBank Príncipe Pío","Teatro Serrano","Gran Castillo de Pedraza","Abono Teatro","Soho City Madrid"];
function venueSelect(v=""){const values=VENUES;return '<label>Espacio<select name="venue"><option value="">Seleccionar…</option>'+values.map(x=>'<option '+(x===v?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>'}
function materialStatusSelect(v="pendiente"){const values=["pendiente","solicitado","en producción","recibido","entregado","listo"];return '<label>Estado del material<select name="materialStatus">'+values.map(x=>'<option '+(x===v?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'}
function selectStatus(v="activo"){return '<label>Estado<select name="status">'+["activo","pendiente","finalizado"].map(x=>'<option '+(x===v?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'}
function formObject(form){return Object.fromEntries(new FormData(form).entries())}
const MAX_UPLOAD_MB=5.5;
function checkFileSize(file){if(file&&file.size>MAX_UPLOAD_MB*1024*1024)throw new Error("«"+file.name+"» pesa "+(file.size/1048576).toFixed(1)+" MB. El máximo es "+MAX_UPLOAD_MB+" MB: comprímelo (audio en MP3, PDF optimizado) y vuelve a intentarlo.")}
async function uploadAsset(file,moduleName,existing){if(!file)return existing||"";checkFileSize(file);const k=crypto.randomUUID().replaceAll("-","");const r=await fetch("/api/asset?key="+k+"&module="+moduleName,{method:"PUT",headers:headers({"content-type":file.type||"application/octet-stream"}),body:file});if(!r.ok)throw new Error(await r.text());return k}
function bindRadio(rows,selectedContract,selectedMonth){
 $("#newRadio").onclick=()=>{$("#radioFormCard").innerHTML=radioForm({},selectedContract,selectedMonth);bindRadioForm(null,rows,selectedContract,selectedMonth)};
 $$("[data-edit-radio]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editRadio);if(!r)return;$("#radioFormCard").innerHTML=radioForm(r,selectedContract,selectedMonth);bindRadioForm(r,rows,selectedContract,selectedMonth)});
 $$("[data-del-radio]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Archivar esta asignación?"))return;await api("/api/control?module=radio&id="+b.dataset.delRadio,{method:"DELETE"});say("Asignación archivada");radio()});
 bindRadioForm(null,rows,selectedContract,selectedMonth)
}
function bindRadioForm(existing,rows,selectedContract,selectedMonth){
 const f=$("#radioForm");if(!f)return;
 const rebuild=(seed={})=>{const c=seed.contractId?radioContract(seed.contractId):null;$("#radioFormCard").innerHTML=radioForm(seed,c,seed.inventoryMonth||selectedMonth);bindRadioForm(existing,rows,c,seed.inventoryMonth||selectedMonth)};
 const refreshLineInfo=()=>{
   const c=radioContract($("#radioContractSelect")?.value),m=$("#radioMonthSelect")?.value,l=radioLine(c,$("#radioLineSelect")?.value),info=$("#radioLineInfo"),legacy=$("#radioLegacyFields");
   if(legacy)legacy.classList.toggle("hidden",!!c);
   if(!c||!l){if(info)info.innerHTML='<span class="muted">Registro libre: no descuenta inventario contractual.</span>';return}
   const others=rows.filter(x=>x.id!==existing?.id&&x.contractId===c.id&&x.inventoryMonth===m),st=radioLineStats(c,l,m,others);
   if(info)info.innerHTML='<b>'+esc(l.station)+' · '+esc(l.program)+'</b><span>'+esc(l.duration)+' · '+esc(l.timeSlot)+' · '+radioFmt(st.remaining)+' '+esc(l.unit)+' disponibles antes de esta asignación</span>';
   for(const [n,v] of [["venue",c.venue],["station",l.station],["duration",l.duration],["timeSlot",l.timeSlot],["unit",l.unit]]){const el=f.elements[n];if(el)el.value=v}
 };
 const cs=$("#radioContractSelect"),ms=$("#radioMonthSelect");
 const snapshot=()=>({...existing,...formObject(f)});
 if(cs)cs.onchange=()=>{const c=radioContract(cs.value);rebuild({...snapshot(),contractId:c?.id||"",inventoryMonth:radioMonths(c)[0]||"",lineId:""})};
 if(ms)ms.onchange=()=>rebuild({...snapshot(),contractId:cs?.value||"",inventoryMonth:ms.value,lineId:""});
 const ls=$("#radioLineSelect");if(ls)ls.onchange=refreshLineInfo;refreshLineInfo();
 $("#cancelRadio").onclick=()=>{$("#radioFormCard").innerHTML=radioForm({},selectedContract,selectedMonth);bindRadioForm(null,rows,selectedContract,selectedMonth)};
 f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#radioAsset")?.files?.[0];try{
   const c=radioContract(data.contractId),l=radioLine(c,data.lineId);data.plannedSpots=radioNum(data.plannedSpots);data.actualSpots=radioNum(data.actualSpots);
   if(c&&l){
     if(!data.inventoryMonth||!l.monthly?.[data.inventoryMonth])throw new Error("Ese programa no tiene inventario contratado en el mes seleccionado.");
     if(data.startDate&&data.startDate.slice(0,7)!==data.inventoryMonth)throw new Error("La fecha de inicio debe estar dentro del mes de inventario.");
     if(data.endDate&&data.endDate.slice(0,7)!==data.inventoryMonth)throw new Error("La fecha de fin debe estar dentro del mismo mes. Divide la campaña en dos asignaciones si cruza de mes.");
     if(data.startDate&&data.endDate&&data.startDate>data.endDate)throw new Error("La fecha de fin no puede ser anterior al inicio.");
     if(data.startDate&&data.endDate&&radioWeekKey(data.startDate)!==radioWeekKey(data.endDate))throw new Error("Para mantener el control semanal exacto, una asignación no puede cruzar de semana. Divide el reparto en dos bloques.");
     const others=rows.filter(x=>x.id!==existing?.id&&x.contractId===c.id&&x.inventoryMonth===data.inventoryMonth),st=radioLineStats(c,l,data.inventoryMonth,others);
     if(data.plannedSpots>st.remaining)throw new Error("Supera el inventario disponible: quedan "+radioFmt(st.remaining)+" "+l.unit+" en "+l.station+" · "+l.program+".");
     data.venue=c.venue;data.station=l.station;data.duration=l.duration;data.timeSlot=l.timeSlot;data.unit=l.unit;data.frequency=data.plannedSpots+" "+l.unit;
   }
   const assetKey=await uploadAsset(file,"radio",existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}
   if(existing?.id)await api("/api/control?module=radio&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   else await api("/api/control?module=radio",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   say("Asignación de radio guardada");radio()
 }catch(err){say(err.message)}}
}

const CAMPAIGN_CONFIG={
 taxis:{title:"Taxis",subtitle:"Campañas de publicidad en taxis",provider:"Proveedor / flota",location:"Zona / ciudad"},
 intercambiadores:{title:"Intercambiadores",subtitle:"CLECE · campañas y soportes en intercambiadores",provider:"Proveedor",location:"Intercambiador / ubicación"}
};
async function campaigns(moduleName){
 const cfg=CAMPAIGN_CONFIG[moduleName],d=await api("/api/control?module="+moduleName),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const filters='<div class="form-grid" style="margin-bottom:12px"><label class="wide">Buscar<input id="campaignFilterQ" placeholder="Espectáculo, soporte, proveedor…"></label><label>Estado<select id="campaignFilterStatus"><option value="">Todas</option><option value="active">Activas ahora</option><option value="finalizado">Finalizadas</option></select></label><label class="wide">Espacio<select id="campaignFilterVenue"><option value="">Todos los espacios</option>'+VENUES.map(v=>'<option>'+esc(v)+'</option>').join("")+'</select></label></div>';
 app.innerHTML=pageHead(cfg.title,cfg.subtitle,'<button id="newCampaign" class="primary">+ Nueva campaña</button>')+moduleKpis(rows,"Activas ahora")+'<div class="grid two-col"><section class="card"><div class="section-title"><h2>Registros</h2><span id="campaignCount" class="badge ok">'+rows.filter(activeNow).length+' activas</span></div>'+filters+'<div id="campaignList" class="list">'+campaignItems(rows,moduleName)+'</div></section><section class="card" id="campaignFormCard">'+campaignForm(moduleName)+'</section></div>';
 const refresh=()=>{const q=($("#campaignFilterQ").value||"").toLowerCase().trim(),status=$("#campaignFilterStatus").value,venue=$("#campaignFilterVenue").value;const filtered=rows.filter(r=>{if(venue&&r.venue!==venue)return false;if(q&&!JSON.stringify(r).toLowerCase().includes(q))return false;if(status==="active"&&!activeNow(r))return false;if(status==="finalizado"&&(r.status||"").toLowerCase()!=="finalizado"&&!r.deletedAt)return false;return true});$("#campaignList").innerHTML=campaignItems(filtered,moduleName);$("#campaignCount").textContent=filtered.length+" visibles";bindCampaignRows(filtered,moduleName);hydrateMedia(moduleName)};
 $("#campaignFilterQ").addEventListener("input",refresh);$("#campaignFilterStatus").addEventListener("input",refresh);$("#campaignFilterVenue").addEventListener("input",refresh);chipify($("#campaignFilterStatus"),"Estado");chipify($("#campaignFilterVenue"),"Espacio",venueShort);
 $("#newCampaign").onclick=()=>{$("#campaignFormCard").innerHTML=campaignForm(moduleName);bindCampaignForm(null,moduleName)};
 bindCampaignRows(rows,moduleName);bindCampaignForm(null,moduleName);await hydrateMedia(moduleName);
}
function campaignItems(rows,moduleName){return rows.length?rows.map(r=>'<div class="item"><div><h3>'+esc(r.spectacle||r.campaignName||"Campaña")+'</h3><div class="item-meta">'+(r.venue?'<span class="badge">'+esc(r.venue)+'</span>':'')+'<span>'+esc(r.location||r.support||"")+'</span><span>'+esc(r.provider||"")+'</span><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span>'+statusBadge(r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="'+moduleName+'" data-kind="image"></div></div><div class="item-actions"><button data-edit-campaign="'+r.id+'">Editar</button><button class="danger" data-del-campaign="'+r.id+'">Archivar</button></div></div>').join(""):'<div class="notice">No hay campañas registradas.</div>'}
function campaignForm(moduleName,r={}){const cfg=CAMPAIGN_CONFIG[moduleName];return '<div class="section-title"><h2>'+(r.id?"Editar campaña":"Nueva campaña")+'</h2></div><form id="campaignForm" class="form-grid">'+venueSelect(r.venue)+input("spectacle","Espectáculo / campaña",r.spectacle)+input("campaignName","Nombre interno",r.campaignName)+input("support","Soporte / formato",r.support)+input("location",cfg.location,r.location)+input("provider",cfg.provider,r.provider)+input("format","Pieza / formato",r.format)+input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+input("contact","Contacto",r.contact)+selectStatus(r.status)+'<label class="wide">Creatividad<input id="campaignAsset" type="file" accept="image/*,application/pdf"></label><label class="wide">Condiciones / acuerdo<textarea name="agreement">'+esc(r.agreement||"")+'</textarea></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label><div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelCampaign">Limpiar</button></div></form>'}
function bindCampaignRows(rows,moduleName){$$("[data-edit-campaign]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editCampaign);if(!r)return;$("#campaignFormCard").innerHTML=campaignForm(moduleName,r);bindCampaignForm(r,moduleName)});$$("[data-del-campaign]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Archivar esta campaña?"))return;await api("/api/control?module="+moduleName+"&id="+b.dataset.delCampaign,{method:"DELETE"});say("Campaña archivada");campaigns(moduleName)})}
function bindCampaignForm(existing,moduleName){const f=$("#campaignForm");if(!f)return;$("#cancelCampaign").onclick=()=>{$("#campaignFormCard").innerHTML=campaignForm(moduleName);bindCampaignForm(null,moduleName)};f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#campaignAsset")?.files?.[0];try{const assetKey=await uploadAsset(file,moduleName,existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}if(existing?.id)await api("/api/control?module="+moduleName+"&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module="+moduleName,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});say("Campaña guardada");campaigns(moduleName)}catch(err){say(err.message)}}}

const HOME_TICKET_SPACES=["Gran Teatro Pavón","Gran Teatro CaixaBank Príncipe Pío","Teatro Serrano","Gran Castillo de Pedraza","Abono Teatro"];
async function homeTicket(){
 const d=await api("/api/control?module=hometicket"),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const htSpaces=[...HOME_TICKET_SPACES,...new Set(rows.map(r=>r.venue).filter(v=>v&&!HOME_TICKET_SPACES.includes(v)))];
 const grouped=htSpaces.map((v,i)=>'<div class="ht-space" data-venue="'+esc(v)+'"><div class="section-title"><div><small class="section-kicker">'+String(i+1).padStart(2,"0")+' · Home Ticket</small><h2>'+esc(v)+'</h2></div><span class="badge">'+rows.filter(r=>r.venue===v).length+'</span></div><div class="list">'+htItems(rows.filter(r=>r.venue===v))+'</div></div>').join("");
 app.innerHTML=pageHead("Home Ticket",HOME_TICKET_SPACES.length+" Home Ticket diferenciados por espacio",'<button id="newHT" class="primary">+ Nueva pieza</button>')+moduleKpis(rows,"Piezas activas")+'<div class="grid two-col"><section class="card">'+grouped+'</section><section class="card" id="htFormCard">'+htForm()+'</section></div>';
 htChips(rows);$("#newHT").onclick=()=>{$("#htFormCard").innerHTML=htForm();bindHTForm(null)};$$("[data-edit-ht]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editHt);$("#htFormCard").innerHTML=htForm(r);bindHTForm(r)});$$("[data-del-ht]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Archivar esta pieza?"))return;await api("/api/control?module=hometicket&id="+b.dataset.delHt,{method:"DELETE"});say("Pieza archivada");homeTicket()});bindHTForm(null);await hydrateMedia("hometicket");
}
function htItems(rows){return rows.length?rows.map(r=>'<div class="item"><div><h3>'+esc(r.position||"Home Ticket")+'</h3><div class="item-meta"><span>'+esc(r.spectacle||"")+'</span><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span><span>Material: '+esc(r.materialStatus||"sin indicar")+'</span><span>Entrega: '+fdate(r.deliveryDate)+'</span>'+statusBadge(r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="hometicket" data-kind="image"></div></div><div class="item-actions"><button data-edit-ht="'+r.id+'">Editar</button><button class="danger" data-del-ht="'+r.id+'">Archivar</button></div></div>').join(""):'<div class="notice">Todavía no hay piezas cargadas para este Home Ticket.</div>'}
function htVenueSelect(v=""){return '<label>Home Ticket<select name="venue">'+HOME_TICKET_SPACES.map(x=>'<option '+(x===v?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>'}
function htForm(r={}){return '<div class="section-title"><h2>'+(r.id?"Editar pieza":"Nueva pieza")+'</h2></div><form id="htForm" class="form-grid">'+htVenueSelect(r.venue)+'<label>Formato<select name="position">'+["HT Superior · 520 × 420","HT Inferior · 520 × 420","Home Ticket XL · 520 × 856"].map(x=>'<option '+(x===r.position?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'+input("spectacle","Espectáculo / pieza",r.spectacle)+input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+selectStatus(r.status)+'<label class="wide">Creatividad<input id="htAsset" type="file" accept="image/*"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label><div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelHT">Limpiar</button></div></form>'}
function bindHTForm(existing){const f=$("#htForm");if(!f)return;$("#cancelHT").onclick=()=>{$("#htFormCard").innerHTML=htForm();bindHTForm(null)};f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#htAsset")?.files?.[0];try{const assetKey=await uploadAsset(file,"hometicket",existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}if(existing?.id)await api("/api/control?module=hometicket&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module=hometicket",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});say("Home Ticket guardado");homeTicket()}catch(err){say(err.message)}}}

// ===== Revistas: una página de publicidad al mes en cada revista =====
const MAGAZINES=["Revista Teatros","AEscena","Godot"];
function monthKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
function monthLabel(m){const [y,mo]=m.split("-").map(Number);const t=new Date(y,mo-1,1).toLocaleDateString("es-ES",{month:"long",year:"numeric"});return t.charAt(0).toUpperCase()+t.slice(1)}
function monthRange(m){const [y,mo]=m.split("-").map(Number);const last=new Date(y,mo,0).getDate();return {startDate:m+"-01",endDate:m+"-"+String(last).padStart(2,"0")}}
async function revistas(){
 const d=await api("/api/control?module=revistas"),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const now=new Date(),cur=monthKey(now),months=[];
 for(let i=-1;i<=10;i++)months.push(monthKey(new Date(now.getFullYear(),now.getMonth()+i,1)));
 // meses con registros fuera del rango visible también se muestran
 rows.forEach(r=>{if(r.month&&!months.includes(r.month))months.push(r.month)});months.sort();
 const find=(mag,m)=>rows.find(r=>r.magazine===mag&&r.month===m);
 const cell=(mag,m)=>{const r=find(mag,m);if(!r)return '<div class="mag-cell empty"><small>'+esc(mag)+'</small><button type="button" data-add-revista="'+esc(mag)+'|'+m+'">+ Añadir</button></div>';
  return '<div class="mag-cell"><small>'+esc(mag)+'</small><div class="mag-thumb media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="revistas" data-kind="image"></div><b>'+esc(r.spectacle||"Sin espectáculo")+'</b>'+(r.venue?'<span class="mag-venue">'+esc(r.venue)+'</span>':'')+'<div class="item-meta"><span class="badge '+(["recibido","entregado","listo"].includes(String(r.materialStatus||"").toLowerCase())?"ok":"warn")+'">'+esc(r.materialStatus||"pendiente")+'</span>'+(r.deliveryDate?'<span>Entrega: '+fdate(r.deliveryDate)+'</span>':'')+'</div><div class="item-actions"><button type="button" data-edit-revista="'+r.id+'">Editar</button><button type="button" class="danger" data-del-revista="'+r.id+'">Archivar</button></div></div>'};
 const grid='<div class="mag-head"><span></span>'+MAGAZINES.map(m=>'<span>'+esc(m)+'</span>').join("")+'</div>'+months.map(m=>'<div class="mag-month'+(m===cur?' current':'')+'" data-month="'+m+'"><div class="mag-label">'+esc(monthLabel(m))+'</div>'+MAGAZINES.map(mag=>cell(mag,m)).join("")+'</div>').join("");
 app.innerHTML=pageHead("Revistas de Teatros","Página de publicidad mensual en "+MAGAZINES.join(", ").replace(/, ([^,]*)$/," y $1"),'<button id="newRevista" class="primary">+ Nueva página</button>')+moduleKpis(rows,"Páginas este mes")+'<div class="grid two-col"><section class="card mag-calendar">'+grid+'</section><section class="card" id="revistasFormCard">'+revistaForm()+'</section></div>';
 magChips(months,cur);const openForm=r=>{$("#revistasFormCard").innerHTML=revistaForm(r);bindRevistaForm(r&&r.id?r:null,rows)};
 $("#newRevista").onclick=()=>openForm({month:cur});
 $$("[data-add-revista]").forEach(b=>b.onclick=()=>{const [magazine,month]=b.dataset.addRevista.split("|");openForm({magazine,month})});
 $$("[data-edit-revista]").forEach(b=>b.onclick=()=>openForm(rows.find(x=>x.id===b.dataset.editRevista)));
 $$("[data-del-revista]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Archivar esta página?"))return;await api("/api/control?module=revistas&id="+b.dataset.delRevista,{method:"DELETE"});say("Página archivada");revistas()});
 bindRevistaForm(null,rows);await hydrateMedia("revistas");
}
function revistaForm(r={}){const monthOpts=[];const now=new Date();for(let i=-1;i<=12;i++){const m=monthKey(new Date(now.getFullYear(),now.getMonth()+i,1));monthOpts.push(m)}if(r.month&&!monthOpts.includes(r.month))monthOpts.unshift(r.month);
 return '<div class="section-title"><h2>'+(r.id?"Editar página":"Nueva página")+'</h2></div><form id="revistaForm" class="form-grid">'+venueSelect(r.venue)+'<label>Revista<select name="magazine">'+MAGAZINES.map(x=>'<option '+(x===r.magazine?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label><label>Mes<select name="month">'+monthOpts.map(m=>'<option value="'+m+'" '+(m===(r.month||monthKey(now))?"selected":"")+'>'+esc(monthLabel(m))+'</option>').join("")+'</select></label>'+input("spectacle","Espectáculo anunciado",r.spectacle)+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+input("contact","Contacto de la revista",r.contact)+'<label class="wide">Cartel / página<input id="revistaAsset" type="file" accept="image/*,application/pdf"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label><div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelRevista">Limpiar</button></div></form>'}
function bindRevistaForm(existing,rows=[]){const f=$("#revistaForm");if(!f)return;$("#cancelRevista").onclick=()=>{$("#revistasFormCard").innerHTML=revistaForm();bindRevistaForm(null,rows)};
 f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#revistaAsset")?.files?.[0];Object.assign(data,monthRange(data.month));data.status="activo";
  // una sola página por revista y mes: si ya existe, se actualiza esa
  const target=existing||rows.find(r=>r.magazine===data.magazine&&r.month===data.month)||null;
  try{const assetKey=await uploadAsset(file,"revistas",target?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||target?.assetName||""}
   if(target?.id)await api("/api/control?module=revistas&id="+target.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   else await api("/api/control?module=revistas",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   say("Página guardada");revistas()}catch(err){say(err.message)}}}

// ===== Yellow Control: componentes =====
function yPlayer(src,name){const w=document.createElement("div");w.className="yplayer";const play='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',pause='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
 w.innerHTML='<button type="button" aria-label="Reproducir">'+play+'</button><div style="flex:1;min-width:0">'+(name?'<span class="yp-name">'+esc(name)+'</span>':'')+'<div class="yp-bar"><i></i></div></div><span class="yp-time">0:00</span>';
 const a=new Audio();a.preload="metadata";a.src=src;const b=w.querySelector("button"),bar=w.querySelector(".yp-bar"),fill=bar.querySelector("i"),t=w.querySelector(".yp-time");
 const fmt=x=>{x=Math.max(0,Math.floor(x||0));return Math.floor(x/60)+":"+String(x%60).padStart(2,"0")};
 a.addEventListener("loadedmetadata",()=>{t.textContent=fmt(a.duration)});
 a.addEventListener("timeupdate",()=>{fill.style.width=(a.duration?a.currentTime/a.duration*100:0)+"%";t.textContent=fmt(a.currentTime)+" / "+fmt(a.duration)});
 a.addEventListener("ended",()=>{b.innerHTML=play;b.setAttribute("aria-label","Reproducir")});
 b.onclick=()=>{if(a.paused){document.querySelectorAll("audio").forEach(x=>x!==a&&x.pause());a.play();b.innerHTML=pause;b.setAttribute("aria-label","Pausar")}else{a.pause();b.innerHTML=play;b.setAttribute("aria-label","Reproducir")}};
 bar.onclick=e=>{if(!a.duration)return;const r=bar.getBoundingClientRect();a.currentTime=(e.clientX-r.left)/r.width*a.duration};
 return w}
// Convierte un <select> de filtro en una fila de botones; el select sigue siendo la fuente del valor.
function chipify(sel,label,short){if(!sel||sel.dataset.chips)return;sel.dataset.chips="1";const lab=sel.closest("label");const row=document.createElement("div");row.className="chip-row";row.innerHTML='<span class="chip-label">'+esc(label)+'</span>'+[...sel.options].map(o=>'<button type="button" class="chip'+(o.selected?' on':'')+'" data-v="'+esc(o.value)+'">'+esc(short?.(o.textContent)||o.textContent)+'</button>').join("");
 row.addEventListener("click",e=>{const c=e.target.closest(".chip");if(!c)return;sel.value=c.dataset.v;row.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===c));sel.dispatchEvent(new Event("input",{bubbles:true}))});
 (lab||sel).style.display="none";(lab||sel).insertAdjacentElement("afterend",row);return row}
const VENUE_SHORT={"Gran Teatro Pavón":"Pavón","Gran Teatro CaixaBank Príncipe Pío":"Príncipe Pío","Teatro Serrano":"Serrano","Gran Castillo de Pedraza":"Castillo","Abono Teatro":"Abono Teatro","Soho City Madrid":"Soho City","Todos los espacios":"Todos"};
const venueShort=v=>VENUE_SHORT[v]||v;

function htChips(rows){const first=$(".ht-space");if(!first)return;const row=document.createElement("div");row.className="chip-row";row.style.marginBottom="6px";
 row.innerHTML='<button type="button" class="chip on" data-v="">Todos ('+rows.length+')</button>'+$$(".ht-space").map(b=>b.dataset.venue).map(v=>'<button type="button" class="chip" data-v="'+esc(v)+'">'+esc(venueShort(v))+' ('+rows.filter(r=>r.venue===v).length+')</button>').join("");
 row.addEventListener("click",e=>{const c=e.target.closest(".chip");if(!c)return;row.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===c));$$(".ht-space").forEach(b=>b.style.display=!c.dataset.v||b.dataset.venue===c.dataset.v?"":"none")});
 first.parentElement.insertBefore(row,first)}
function magChips(months,cur){const cal=$(".mag-calendar");if(!cal)return;const i=Math.max(0,months.indexOf(cur));const next3=months.slice(i,i+3);
 const short=m=>{const [y,mo]=m.split("-").map(Number);const t=new Date(y,mo-1,1).toLocaleDateString("es-ES",{month:"short"}).replace(".","");return t.charAt(0).toUpperCase()+t.slice(1)+" "+String(y).slice(2)};
 const row=document.createElement("div");row.className="chip-row";row.style.marginBottom="10px";
 row.innerHTML='<button type="button" class="chip on" data-v="next">Próximos 3 meses</button>'+months.map(m=>'<button type="button" class="chip" data-v="'+m+'">'+short(m)+'</button>').join("")+'<button type="button" class="chip" data-v="all">Todos</button>';
 const apply=v=>$$(".mag-month").forEach(b=>{const m=b.dataset.month;b.style.display=v==="all"||(v==="next"?next3.includes(m):m===v)?"":"none"});
 row.addEventListener("click",e=>{const c=e.target.closest(".chip");if(!c)return;row.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===c));apply(c.dataset.v)});
 cal.insertBefore(row,cal.firstChild);apply("next")}

const DONE_MATERIAL=["recibido","entregado","listo"];
function pendingMaterial(r){return !r.deletedAt&&!DONE_MATERIAL.includes(String(r.materialStatus||"").toLowerCase())&&(r.status||"").toLowerCase()!=="finalizado"}
function overdue(r){const t=localToday();return pendingMaterial(r)&&r.deliveryDate&&r.deliveryDate<t}
function kpi(n,label,cls=""){return '<span class="kpi '+cls+'"><b>'+String(n).padStart(2,"0")+'</b><em>'+esc(label)+'</em></span>'}
// Indicadores de Inicio con definición estricta:
//  - Activas ahora: registros de Radio, Taxis, Intercambiadores, Home Ticket y Revistas cuyo periodo incluye hoy.
//  - Espacios con material activo: teatros distintos (campo Espacio) entre esos registros.
//  - Entregas en 7 días: material no recibido con fecha límite entre hoy y dentro de 7 días.
//  - Fuera de plazo: material no recibido con fecha límite ya pasada.
function homeKpis(d){const cur=d.currentMaterial||[],att=d.attention||[];const t=new Date();t.setHours(0,0,0,0);const in7=att.filter(x=>{if(x.overdue||!x.deliveryDate)return false;const days=Math.round((new Date(x.deliveryDate+"T00:00:00")-t)/864e5);return days>=0&&days<=7}).length;const late=att.filter(x=>x.overdue).length;const venues=new Set(cur.map(x=>x.venue).filter(Boolean)).size;
 return '<div class="kpi-row home-kpis">'+kpi(cur.length,"Activas ahora")+kpi(venues,"Espacios con material activo")+kpi(in7,"Entregas en 7 días",in7?"warn":"")+kpi(late,"Fuera de plazo",late?"late":"")+'</div>'}
function moduleKpis(rows,activeLabel){const act=rows.filter(r=>activeNow(r)).length,pend=rows.filter(pendingMaterial).length,late=rows.filter(overdue).length;return '<div class="kpi-row">'+kpi(act,activeLabel)+kpi(rows.length,"Registradas")+kpi(pend,"Material pendiente",pend?"warn":"")+kpi(late,"Fuera de plazo",late?"late":"")+'</div>'}
function radioChips(rows){const first=$(".space-panel");if(!first)return;const panels=$$(".space-panel");if(panels.length<2)return;const row=document.createElement("div");row.className="chip-row";row.style.marginBottom="8px";
 row.innerHTML='<span class="chip-label">Espacio</span><button type="button" class="chip on" data-v="*">Todos ('+rows.length+')</button>'+panels.map(p=>{const v=p.dataset.venue;return '<button type="button" class="chip" data-v="'+esc(v)+'">'+esc(v?venueShort(v):"Sin espacio")+' ('+rows.filter(r=>(r.venue||"")===v).length+')</button>'}).join("");
 row.addEventListener("click",e=>{const c=e.target.closest(".chip");if(!c)return;row.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===c));panels.forEach(p=>p.style.display=c.dataset.v==="*"||p.dataset.venue===c.dataset.v?"":"none")});
 first.parentElement.insertBefore(row,first)}

// ===== Autocompletado de espectáculos =====
// Lista base en /data/espectaculos.json (se genera a partir del Excel) + nombres ya usados en registros.
const SPECTACLES=new Set();
let spectaclesLoaded=false;
async function loadSpectacles(){if(spectaclesLoaded)return;spectaclesLoaded=true;try{const r=await fetch("/data/espectaculos.json",{cache:"no-cache"});if(r.ok){const j=await r.json();(Array.isArray(j)?j:j.espectaculos||[]).forEach(x=>{const n=typeof x==="string"?x:x?.nombre;if(n&&n.trim())SPECTACLES.add(n.trim())})}}catch{}renderSpectacleList()}
function learnSpectacles(rows){(rows||[]).forEach(r=>{if(r.spectacle&&r.spectacle.trim())SPECTACLES.add(r.spectacle.trim())});renderSpectacleList()}
function renderSpectacleList(){if(ac.input&&document.activeElement===ac.input&&ac.input.value)acShow(ac.input)}
// Desplegable propio: coincidencias desde el principio del título, sin distinguir mayúsculas ni tildes.
function acNorm(t){return String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/^[¡¿"'“”‘’#\s]+/,"").trim()}
const ac={box:null,input:null,items:[],idx:-1};
function acEnsure(){if(ac.box)return ac.box;const b=document.createElement("div");b.className="ac-box";b.setAttribute("role","listbox");document.body.appendChild(b);
 b.addEventListener("mousedown",e=>{const o=e.target.closest(".ac-opt");if(!o)return;e.preventDefault();acPick(o.dataset.v)});ac.box=b;return b}
function acPlace(){if(!ac.box||!ac.input)return;const r=ac.input.getBoundingClientRect(),vh=window.visualViewport?window.visualViewport.height:innerHeight;const below=vh-r.bottom-8,above=r.top-8;const up=below<180&&above>below;const max=Math.max(120,Math.min(320,(up?above:below)-4));Object.assign(ac.box.style,{left:r.left+"px",width:r.width+"px",maxHeight:max+"px",top:up?"auto":(r.bottom+4)+"px",bottom:up?(innerHeight-r.top+4)+"px":"auto"})}
if(window.visualViewport)visualViewport.addEventListener("resize",()=>acPlace());
function acShow(inp){ac.input=inp;const q=acNorm(inp.value);const b=acEnsure();if(!q){acHide();return}
 const list=[...SPECTACLES].sort((a,b)=>a.localeCompare(b,"es"));ac.items=list.filter(n=>acNorm(n).startsWith(q)).slice(0,40);ac.idx=-1;
 b.innerHTML=ac.items.length?ac.items.map((n,i)=>'<div class="ac-opt" role="option" data-i="'+i+'" data-v="'+esc(n)+'"><b>'+esc(n.slice(0,inp.value.trim().length))+'</b>'+esc(n.slice(inp.value.trim().length))+'</div>').join(""):'<div class="ac-empty">No hay espectáculos que empiecen así. Se guardará como lo escribas.</div>';
 b.classList.add("show");acPlace()}
function acHide(){if(ac.box)ac.box.classList.remove("show");ac.idx=-1}
function acPick(v){const inp=ac.input;if(!inp)return;inp.value=v;acHide();ac.picking=true;inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}));ac.picking=false}
document.addEventListener("input",e=>{const t=e.target;if(t.matches&&t.matches('input[data-ac="spectacle"]')&&!t.disabled){if(ac.picking)return;acShow(t)}});
document.addEventListener("focusin",e=>{const t=e.target;if(t.matches&&t.matches('input[data-ac="spectacle"]')){loadSpectacles();if(t.value)acShow(t)}});
document.addEventListener("focusout",e=>{if(e.target===ac.input)setTimeout(acHide,120)});
document.addEventListener("keydown",e=>{if(!ac.box||!ac.box.classList.contains("show")||e.target!==ac.input)return;const opts=[...ac.box.querySelectorAll(".ac-opt")];
 if(e.key==="Escape"){acHide();return}if(!opts.length)return;
 if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();ac.idx=e.key==="ArrowDown"?(ac.idx+1)%opts.length:(ac.idx<=0?opts.length-1:ac.idx-1);opts.forEach((o,i)=>o.classList.toggle("on",i===ac.idx));opts[ac.idx].scrollIntoView({block:"nearest"})}
 else if(e.key==="Enter"&&ac.idx>=0){e.preventDefault();acPick(opts[ac.idx].dataset.v)}});
window.addEventListener("scroll",acPlace,true);window.addEventListener("resize",acPlace);

// ===================== CARTELERÍA (integrada en Yellow Control) =====================
// Datos compatibles con la versión anterior: /api/state (slots + schedule) y /api/image?key=<vista>__<soporte> (dataURL).
const CART_VIEWS=[
 {id:"taquilla",name:"Taquilla cerrada",img:"/assets/facade/taquilla.jpg",w:1448,h:1086},
 {id:"lona",name:"Lona + secundarios",img:"/assets/facade/lona.jpg",w:856,h:718},
 {id:"abierta",name:"Taquilla abierta",img:"/assets/facade/abierta.jpg",w:946,h:1381},
 {id:"columna",name:"Columna 1",img:"/assets/columna1.jpg?v=2",w:1086,h:1448}
];
const CART_SLOTS=[
 {key:"taquilla__secundario-1",view:"taquilla",name:"Secundario 1",r:[19.06,40.06,13.54,27.90]},
 {key:"taquilla__taquilla-izq",view:"taquilla",name:"Taquilla izquierda cerrada",r:[35.77,40.79,11.67,26.89]},
 {key:"taquilla__taquilla-der",view:"taquilla",name:"Taquilla derecha cerrada",r:[50.97,40.70,11.05,26.98]},
 {key:"taquilla__secundario-2",view:"taquilla",name:"Secundario 2",r:[66.02,40.06,12.50,27.81]},
 {key:"lona__lona",view:"lona",name:"Lona",r:[19.16,9.75,64.25,29.39]},
 {key:"lona__sec1",view:"lona",name:"Secundario 1 (lona)",r:[12.38,47.63,26.05,16.57]},
 {key:"lona__sec2",view:"lona",name:"Secundario 2 (lona)",r:[38.90,47.77,25.12,16.43]},
 {key:"lona__sec3",view:"lona",name:"Secundario 3 (lona)",r:[65.19,47.77,24.88,16.57]},
 {key:"abierta__taquilla-izq-abierta",view:"abierta",name:"Taquilla izquierda abierta",r:[3.59,15.86,21.04,40.70]},
 {key:"abierta__taquilla-der-abierta",view:"abierta",name:"Taquilla derecha abierta",r:[81.92,16.29,15.75,39.97]},
 {key:"taquilla__columna_1",view:"columna",name:"Columna 1",r:[67.0,39.2,18.1,25.3]}
];
const CART_STATUS=["pendiente","aprobado","en producción","instalado"];
function cartFingerprint(st,k){const m=(st.slots||{})[k]||{},s=(st.schedule||{})[k]||{};return JSON.stringify([m.rev||"",!!m.hasImage,m.mode||"contain",s.title||"",s.installDate||"",s.removeDate||"",s.status||"",s.notes||""])}
const cart={base:{},loaded:false,view:"taquilla",sel:null,night:false,slots:{},schedule:{},img:{},dirty:new Set(),imgDirty:new Set(),updatedAt:null,saving:false};
const cartSlot=k=>CART_SLOTS.find(s=>s.key===k);
const cartView=id=>CART_VIEWS.find(v=>v.id===id);
function canEditCart(){return roles().some(r=>["admin","gestion","carteleria"].includes(r))}
function cartSched(k){return cart.schedule[k]||(cart.schedule[k]={date:"",next:"",title:"",installDate:"",removeDate:"",status:"",notes:""})}
function cartMode(k){return (cart.slots[k]&&cart.slots[k].mode)||"contain"}
function cartDaysTo(iso){if(!iso)return null;const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(iso+"T00:00:00")-t)/864e5)}
function cartNextDate(k){const s=cartSched(k);const t=localToday();const ds=[["Instalación",s.installDate],["Retirada",s.removeDate]].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x[1]||""));const fut=ds.filter(x=>x[1]>=t).sort((a,b)=>a[1].localeCompare(b[1]));return fut[0]||null}

async function cartLoad(){
 const d=await api("/api/state",{cache:"no-store"});const st=d.state||{};
 cart.slots=st.slots||{};cart.schedule=st.schedule||{};cart.updatedAt=st.updatedAt||null;cart.base={};CART_SLOTS.forEach(s=>{cart.base[s.key]=cartFingerprint(st,s.key)});cart.img={};cart.dirty.clear();cart.imgDirty.clear();
 await Promise.all(CART_SLOTS.filter(s=>cart.slots[s.key]&&cart.slots[s.key].hasImage).map(async s=>{try{const r=await fetch("/api/image?key="+encodeURIComponent(s.key),{cache:"no-store",headers:headers()});if(r.ok)cart.img[s.key]=await r.text()}catch{}}));
 cart.loaded=true;
}

async function carteleria(){
 if(!cart.loaded||!cart.dirty.size)await cartLoad();
 const q=new URLSearchParams((location.hash.split("?")[1])||"");const v=q.get("vista");if(v&&cartView(v))cart.view=v;const sop=q.get("soporte");if(sop&&cartSlot(sop)){cart.view=cartSlot(sop).view;cart.sel=sop;history.replaceState(null,"","#carteleria")}
 if(!cart.sel||cartSlot(cart.sel).view!==cart.view)cart.sel=CART_SLOTS.find(s=>s.view===cart.view).key;
 const edit=canEditCart();
 const withImg=CART_SLOTS.filter(s=>cart.img[s.key]).length;
 const upcoming=CART_SLOTS.map(s=>({s,n:cartNextDate(s.key)})).filter(x=>x.n).sort((a,b)=>a.n[1].localeCompare(b.n[1]));
 const next=upcoming[0];const nd=next?cartDaysTo(next.n[1]):null;
 const pend=CART_SLOTS.filter(s=>{const st=cartSched(s.key).status;return st&&st!=="instalado"}).length;
 app.innerHTML=pageHead("Cartelería","Fachada y soportes del Gran Teatro Pavón",
   '<button type="button" id="cartShare">Compartir</button><button type="button" id="cartExport">Exportar PNG</button>'+(edit?'<button type="button" class="primary" id="cartSave">Guardar cambios</button>':''))+
  '<div class="kpi-row">'+kpi(withImg+"/"+CART_SLOTS.length,"Soportes con cartel")+kpi(upcoming.length,"Cambios programados")+(next?'<span class="kpi '+(nd<=3?"warn":"")+'"><b>'+(nd===0?"HOY":"D-"+nd)+'</b><em>'+esc(next.n[0]+" · "+next.s.name)+'</em></span>':kpi(0,"Sin cambios próximos"))+kpi(pend,"Por instalar",pend?"warn":"")+'</div>'+
  '<div class="cart-sync" id="cartSync"></div>'+
  '<div class="grid cart-grid">'+
   '<section class="card cart-preview"><div class="section-title"><div><small class="section-kicker">Previsualización</small><h2 id="cartViewName"></h2></div><div class="seg" id="cartNight"><button type="button" data-n="0">Día</button><button type="button" data-n="1">Noche</button></div></div>'+
   '<div class="chip-row cart-views" id="cartViews">'+CART_VIEWS.map(v=>'<button type="button" class="chip" data-v="'+v.id+'">'+esc(v.name)+'</button>').join("")+'</div>'+
   '<div class="cart-stage-wrap"><div class="cart-stage" id="cartStage"></div></div>'+
   '<p class="cart-hint">'+(edit?"Toca un soporte para editarlo. Los cambios se ven aquí antes de guardar.":"Vista de consulta.")+'</p>'+
   '<div class="chip-row" id="cartSlotChips"></div></section>'+
   '<section class="card cart-panel" id="cartPanel"></section>'+
  '</div>'+
  '<section class="card" style="margin-top:14px"><div class="section-title"><div><small class="section-kicker">Agenda</small><h2>Próximos cambios</h2></div></div><div class="list" id="cartUpcoming"></div></section>'+
  '<section style="margin-top:18px"><div class="home-section-label"><span>Todos los soportes</span><span>'+CART_SLOTS.length+' soportes</span></div><div class="cart-cards" id="cartCards"></div></section>'+
  (edit?'<div class="cart-savebar" id="cartSavebar"><span>Cambios sin guardar</span><button type="button" class="primary" id="cartSave2">Guardar</button></div>':'')+
  '<input type="file" id="cartFile" accept="image/*" hidden>';
 $("#cartViews").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;cart.view=c.dataset.v;cart.sel=CART_SLOTS.find(s=>s.view===cart.view).key;cartRender()};
 $("#cartNight").onclick=e=>{const b=e.target.closest("button");if(!b)return;cart.night=b.dataset.n==="1";cartRender()};
 $("#cartExport").onclick=()=>cartExport(false);
 $("#cartShare").onclick=()=>cartExport(true);
 if(edit){$("#cartSave").onclick=cartSave;$("#cartSave2").onclick=cartSave;
  $("#cartFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(f)await cartSetFile(cart.sel,f)}}
 cartRender();
}

function cartRender(){
 const v=cartView(cart.view),edit=canEditCart();
 $("#cartViewName").textContent=v.name;
 $$("#cartViews .chip").forEach(c=>c.classList.toggle("on",c.dataset.v===cart.view));
 $$("#cartNight button").forEach(b=>b.classList.toggle("on",(b.dataset.n==="1")===cart.night));
 const stage=$("#cartStage");stage.className="cart-stage"+(cart.night?" night":"");stage.style.aspectRatio=v.w+" / "+v.h;
 stage.innerHTML='<img class="cart-bg" src="'+v.img+'" alt="'+esc(v.name)+'">'+CART_SLOTS.filter(s=>s.view===cart.view).map(s=>{const im=cart.img[s.key];return '<button type="button" class="cart-slot'+(s.key===cart.sel?" sel":"")+(im?"":" empty")+'" data-k="'+s.key+'" style="left:'+s.r[0]+'%;top:'+s.r[1]+'%;width:'+s.r[2]+'%;height:'+s.r[3]+'%">'+(im?'<img src="'+im+'" style="object-fit:'+cartMode(s.key)+'" alt="">':'<span>'+esc(s.name)+'</span>')+'</button>'}).join("");
 stage.onclick=e=>{const b=e.target.closest(".cart-slot");if(!b)return;cart.sel=b.dataset.k;cartRender();if(matchMedia("(max-width:980px)").matches)$("#cartPanel").scrollIntoView({behavior:"smooth",block:"start"})};
 if(edit){stage.ondragover=e=>{e.preventDefault()};stage.ondrop=async e=>{e.preventDefault();const b=e.target.closest(".cart-slot");const f=e.dataTransfer.files[0];if(b&&f){cart.sel=b.dataset.k;await cartSetFile(b.dataset.k,f)}}}
 $("#cartSlotChips").innerHTML=CART_SLOTS.filter(s=>s.view===cart.view).map(s=>'<button type="button" class="chip'+(s.key===cart.sel?" on":"")+'" data-k="'+s.key+'"><i class="dot'+(cart.img[s.key]?" full":"")+'"></i>'+esc(s.name)+'</button>').join("");
 $("#cartSlotChips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;cart.sel=c.dataset.k;cartRender()};
 cartPanel();cartUpcoming();cartCards();cartSyncState();
}

function cartPanel(){
 const s=cartSlot(cart.sel),sc=cartSched(s.key),im=cart.img[s.key],edit=canEditCart();
 const n=cartNextDate(s.key),nd=n?cartDaysTo(n[1]):null;
 $("#cartPanel").innerHTML='<div class="section-title"><div><small class="section-kicker">Soporte · '+esc(cartView(s.view).name)+'</small><h2>'+esc(s.name)+'</h2></div>'+(sc.status?'<span class="badge '+(sc.status==="instalado"?"ok":"warn")+'">'+esc(sc.status)+'</span>':'')+'</div>'+
  '<div class="cart-drop'+(im?" has":"")+'" id="cartDrop">'+(im?'<img src="'+im+'" alt="Cartel" style="object-fit:'+cartMode(s.key)+'">':'<div><b>'+(edit?"Carga el cartel":"Sin cartel")+'</b>'+(edit?'<span>Toca aquí o arrastra una imagen</span>':'')+'</div>')+'</div>'+
  (n?'<div class="cart-next '+(nd<=3?"warn":"")+'"><b>'+(nd===0?"HOY":"D-"+nd)+'</b> '+esc(n[0])+' · '+fdate(n[1])+'</div>':'')+
  (edit?'<div class="actions-row cart-actions"><button type="button" id="cartPick">'+(im?"Cambiar cartel":"Cargar cartel")+'</button>'+(im?'<button type="button" id="cartFit">'+(cartMode(s.key)==="contain"?"Llenar hueco":"Encajar entero")+'</button><button type="button" class="danger" id="cartRemove">Quitar</button>':'')+'</div>':'')+
  '<form class="form-grid cart-form" id="cartForm">'+
   '<label class="wide">Espectáculo / pieza<input name="title" data-ac="spectacle" autocomplete="off" value="'+esc(sc.title||"")+'"'+(edit?'':' disabled')+'></label>'+
   '<label>Instalación<input type="date" name="installDate" value="'+esc(sc.installDate||"")+'"'+(edit?'':' disabled')+'></label>'+
   '<label>Retirada<input type="date" name="removeDate" value="'+esc(sc.removeDate||"")+'"'+(edit?'':' disabled')+'></label>'+
   '<label class="wide">Estado<select name="status"'+(edit?'':' disabled')+'><option value="">Sin estado</option>'+CART_STATUS.map(x=>'<option'+(x===sc.status?" selected":"")+'>'+x+'</option>').join("")+'</select></label>'+
   '<label class="wide">Observaciones<textarea name="notes"'+(edit?'':' disabled')+'>'+esc(sc.notes||"")+'</textarea></label>'+
   ((sc.next||sc.date)?'<p class="cart-legacy">Notas anteriores: '+esc([sc.date,sc.next].filter(Boolean).join(" · "))+'</p>':'')+
  '</form>';
 loadSpectacles();
 if(!edit)return;
 $("#cartPick").onclick=()=>$("#cartFile").click();
 $("#cartDrop").onclick=()=>$("#cartFile").click();
 const d=$("#cartDrop");d.ondragover=e=>{e.preventDefault();d.classList.add("over")};d.ondragleave=()=>d.classList.remove("over");d.ondrop=async e=>{e.preventDefault();d.classList.remove("over");const f=e.dataTransfer.files[0];if(f)await cartSetFile(s.key,f)};
 if(im){$("#cartFit").onclick=()=>{cart.slots[s.key]={...(cart.slots[s.key]||{}),mode:cartMode(s.key)==="contain"?"cover":"contain",hasImage:true};cartMark(s.key);cartRender()};
  $("#cartRemove").onclick=()=>{if(!confirm("¿Quitar el cartel de "+s.name+"?"))return;delete cart.img[s.key];cart.slots[s.key]={...(cart.slots[s.key]||{}),hasImage:false};cartMark(s.key,true);cartRender()}}
 $("#cartForm").oninput=e=>{const el=e.target;if(!el.name)return;cartSched(s.key)[el.name]=el.value;cartMark(s.key);cartSyncState();if(el.type==="date"||el.tagName==="SELECT"){cartUpcoming();cartCards()}};
}

function cartUpcoming(){
 const t=localToday();
 const ev=[];CART_SLOTS.forEach(s=>{const sc=cartSched(s.key);[["Instalación",sc.installDate],["Retirada",sc.removeDate]].forEach(([a,d])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d||"")&&d>=t)ev.push({s,a,d,title:sc.title})})});
 ev.sort((a,b)=>a.d.localeCompare(b.d));
 $("#cartUpcoming").innerHTML=ev.length?ev.slice(0,8).map(x=>{const n=cartDaysTo(x.d);return '<button type="button" class="item cart-up" data-k="'+x.s.key+'"><div><h3>'+esc(x.a)+' · '+esc(x.s.name)+'</h3><div class="item-meta"><span class="badge '+(n<=3?"warn":"")+'">'+(n===0?"HOY":"D-"+n)+'</span><span>'+fdate(x.d)+'</span>'+(x.title?'<span>'+esc(x.title)+'</span>':'')+'</div></div></button>'}).join(""):'<div class="notice">No hay instalaciones ni retiradas programadas. Añade fechas en la ficha de cada soporte.</div>';
 $("#cartUpcoming").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;cart.sel=b.dataset.k;cart.view=cartSlot(cart.sel).view;cartRender();$("#cartStage").scrollIntoView({behavior:"smooth",block:"center"})};
}

function cartCards(){
 $("#cartCards").innerHTML=CART_SLOTS.map(s=>{const im=cart.img[s.key],sc=cartSched(s.key);return '<button type="button" class="cart-card'+(s.key===cart.sel?" sel":"")+'" data-k="'+s.key+'"><div class="cart-thumb">'+(im?'<img src="'+im+'" alt="">':'<span>Sin cartel</span>')+'<em>'+esc(cartView(s.view).name)+'</em></div><b>'+esc(s.name)+'</b><small>'+esc(sc.title||"—")+'</small><div class="item-meta">'+(sc.status?'<span class="badge '+(sc.status==="instalado"?"ok":"warn")+'">'+esc(sc.status)+'</span>':'')+(sc.installDate?'<span>Inst. '+fdate(sc.installDate)+'</span>':'')+(sc.removeDate?'<span>Ret. '+fdate(sc.removeDate)+'</span>':'')+'</div></button>'}).join("");
 $("#cartCards").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;cart.sel=b.dataset.k;cart.view=cartSlot(cart.sel).view;cartRender();$("#cartStage").scrollIntoView({behavior:"smooth",block:"center"})};
}

function cartMark(k,img=false){cart.dirty.add(k);if(img)cart.imgDirty.add(k);cartSyncState()}
function cartSyncState(){
 const el=$("#cartSync");if(!el)return;const n=cart.dirty.size;
 el.innerHTML=cart.saving?'<span class="badge warn">Guardando…</span>':n?'<span class="badge warn">'+n+(n===1?" soporte con cambios sin guardar":" soportes con cambios sin guardar")+'</span>':'<span class="badge ok">Sincronizado</span>'+(cart.updatedAt?'<span class="muted"> Última actualización: '+new Date(cart.updatedAt).toLocaleString("es-ES")+'</span>':'');
 const bar=$("#cartSavebar");if(bar)bar.classList.toggle("show",n>0&&!cart.saving);
}

function cartReadImage(file){return new Promise((res,rej)=>{if(!/^image\//.test(file.type)){rej(new Error("El archivo debe ser una imagen (JPG o PNG)."));return}const fr=new FileReader();fr.onerror=()=>rej(new Error("No se ha podido leer la imagen."));fr.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error("La imagen no es válida."));img.onload=()=>{let q=.86,max=1800;const draw=()=>{const sc=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);return c.toDataURL("image/jpeg",q)};let out=draw();while(out.length>2_800_000&&q>.5){q-=.1;max=Math.round(max*.85);out=draw()}res(out)};img.src=fr.result};fr.readAsDataURL(file)})}
async function cartSetFile(k,file){try{const data=await cartReadImage(file);cart.img[k]=data;cart.slots[k]={...(cart.slots[k]||{}),mode:cartMode(k),hasImage:true};cartMark(k,true);cartRender();say("Cartel cargado · falta guardar")}catch(e){say(e.message)}}

async function cartSave(){
 if(!cart.dirty.size){say("No hay cambios que guardar");return}
 cart.saving=true;cartSyncState();
 try{
  // 1. Leer la última versión para no pisar cambios de otras personas en soportes no tocados
  const d=await api("/api/state",{cache:"no-store"});const remote=d.state||{};const slots={...(remote.slots||{})},schedule={...(remote.schedule||{})};
  // 1b. ¿Alguien ha cambiado estos mismos soportes desde que los abriste?
  const clash=[...cart.dirty].filter(k=>cartFingerprint(remote,k)!==cart.base[k]);
  if(clash.length){const who=[...new Set(clash.map(k=>(remote.slots||{})[k]?.by).filter(Boolean))];const names=clash.map(k=>cartSlot(k)?.name||k).join(", ");
   if(!confirm("Otra persona"+(who.length?" ("+who.join(", ")+")":"")+" ha modificado "+names+" mientras lo editabas.\n\nAceptar: guardar tu versión y sustituir la suya.\nCancelar: no guardar y cargar la versión actual.")){cart.saving=false;cart.dirty.clear();cart.imgDirty.clear();await cartLoad();cartRender();say("Se ha cargado la versión actual");return}}
  // 2. Subir o quitar solo las imágenes modificadas
  for(const k of cart.imgDirty){if(cart.img[k])await api("/api/image?key="+encodeURIComponent(k),{method:"PUT",headers:{"content-type":"text/plain;charset=utf-8"},body:cart.img[k]});else await fetch("/api/image?key="+encodeURIComponent(k),{method:"DELETE",headers:headers()}).then(r=>{if(!r.ok&&r.status!==404)throw new Error("No se pudo quitar el cartel")})}
  // 3. Fusionar solo los soportes modificados
  const updatedAt=new Date().toISOString();
  for(const k of cart.dirty){slots[k]={mode:cartMode(k),hasImage:!!cart.img[k],rev:updatedAt,by:state.actor?.email||""};schedule[k]={...cartSched(k)}}
  await api("/api/state",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({slots,schedule,updatedAt})});
  const changedViews=[...new Set([...cart.dirty].map(k=>cartSlot(k)?.view).filter(Boolean))];
  cart.dirty.clear();cart.imgDirty.clear();cart.updatedAt=updatedAt;cart.saving=false;
  await cartLoad();cartRender();say("Cartelería guardada");
  // 4. Aviso por correo con la vista modificada (no bloquea el guardado)
  try{for(const v of changedViews.slice(0,2)){const png=await cartComposite(v,false);await fetch("/api/email-update",{method:"POST",headers:headers({"content-type":"application/json"}),body:JSON.stringify({page:v,pngDataUrl:png,updatedAt})})}}catch{}
 }catch(e){cart.saving=false;cartSyncState();say(e.message||"No se han podido guardar los cambios")}
}

function cartLoadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("No se pudo cargar una imagen"));i.src=src})}
async function cartComposite(viewId,night){
 const v=cartView(viewId),bg=await cartLoadImg(v.img);const scale=Math.max(1,Math.round(1600/Math.max(v.w,v.h)*10)/10);
 const W=Math.round(v.w*scale),H=Math.round(v.h*scale),c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
 g.filter=night?"brightness(0.38) saturate(0.8)":"none";g.drawImage(bg,0,0,W,H);g.filter="none";
 for(const s of CART_SLOTS.filter(x=>x.view===viewId)){const x=s.r[0]/100*W,y=s.r[1]/100*H,w=s.r[2]/100*W,h=s.r[3]/100*H;const im=cart.img[s.key];
  if(!im){g.fillStyle="rgba(10,10,10,.82)";g.fillRect(x,y,w,h);continue}
  const p=await cartLoadImg(im);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle="#050505";g.fillRect(x,y,w,h);
  const mode=cartMode(s.key),ratio=mode==="cover"?Math.max(w/p.naturalWidth,h/p.naturalHeight):Math.min(w/p.naturalWidth,h/p.naturalHeight);const pw=p.naturalWidth*ratio,ph=p.naturalHeight*ratio;
  if(night){g.shadowColor="rgba(255,236,170,.55)";g.shadowBlur=24}g.drawImage(p,x+(w-pw)/2,y+(h-ph)/2,pw,ph);g.restore()}
 g.fillStyle="rgba(19,19,19,.78)";g.fillRect(0,H-Math.round(34*scale/1.2),W,Math.round(34*scale/1.2));g.fillStyle="#FFD400";g.font="600 "+Math.round(15*scale/1.2)+"px 'Plus Jakarta Sans',Arial";g.textBaseline="middle";
 g.fillText("Gran Teatro Pavón · "+v.name+" · "+new Date().toLocaleDateString("es-ES"),Math.round(14*scale/1.2),H-Math.round(17*scale/1.2));
 return c.toDataURL("image/png");
}
async function cartExport(share){
 try{const png=await cartComposite(cart.view,cart.night);const name="Pavon_"+cart.view+"_"+new Date().toLocaleDateString("sv")+".png";
  const blob=await (await fetch(png)).blob();const file=new File([blob],name,{type:"image/png"});
  if(share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Cartelería Gran Teatro Pavón",text:"Cartelería · "+cartView(cart.view).name});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  say(share?"Imagen descargada: adjúntala en WhatsApp o en el correo":"PNG descargado")}catch(e){if(e&&e.name==="AbortError")return;say(e.message||"No se ha podido exportar")}
}
window.addEventListener("beforeunload",e=>{if(cart.dirty.size){e.preventDefault();e.returnValue=""}});

// ===== Modo claro / oscuro (por persona, se recuerda en este navegador) =====
function currentTheme(){return document.documentElement.dataset.theme==="light"?"light":"dark"}
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem("yc-theme",t)}catch{}const b=$("#themeToggle");if(b)b.setAttribute("aria-label",t==="light"?"Cambiar a modo oscuro":"Cambiar a modo claro");const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="light"?"#f5f3ee":"#131313"}
setTheme(currentTheme());
document.addEventListener("click",e=>{if(e.target.closest("#themeToggle"))setTheme(currentTheme()==="light"?"dark":"light")});

document.addEventListener("change",e=>{const f=e.target;if(f.type==="file"&&f.id!=="cartFile"&&f.files&&f.files[0]){try{checkFileSize(f.files[0])}catch(err){say(err.message);f.value=""}}});

// ===== Correo de prueba (solo administración) =====
function mailTestCard(){return '<section class="card" style="margin-top:14px"><div class="section-title"><div><small class="section-kicker">Avisos por correo</small><h2>Comprobar el correo</h2></div></div><p class="muted" style="margin:0 0 12px">Envía ahora el resumen diario (material pendiente y activo) a los destinatarios configurados, sin esperar a las 9:00.</p><div class="actions-row"><button type="button" id="mailStatus">Ver configuración</button><button type="button" class="primary" id="mailTest">Enviar correo de prueba</button></div><div id="mailResult" style="margin-top:12px"></div></section>'}
function bindMailTest(){const out=$("#mailResult");if(!out)return;
 const show=d=>{out.innerHTML=d.configured?'<div class="notice" style="text-align:left">Remitente: <b>'+esc(d.from||"—")+'</b><br>Para: <b>'+esc((d.to||[]).join(", ")||"—")+'</b>'+(d.cc&&d.cc.length?'<br>Copia: <b>'+esc(d.cc.join(", "))+'</b>':'')+'</div>':'<div class="notice" style="text-align:left">El correo <b>no está configurado</b>. Faltan en Netlify: '+esc((d.missing||[]).join(", "))+'.</div>'};
 $("#mailStatus").onclick=async()=>{try{show(await api("/api/test-email"))}catch(e){say(e.message)}};
 $("#mailTest").onclick=async()=>{const b=$("#mailTest");b.disabled=true;b.textContent="Enviando…";try{const d=await api("/api/test-email",{method:"POST"});show(d);say(d.sent?"Correo enviado":"No se ha enviado: "+(d.reason||"revisa la configuración"))}catch(e){say(e.message)}finally{b.disabled=false;b.textContent="Enviar correo de prueba"}}}

async function hydrateMedia(moduleName){for(const el of $$('[data-module="'+moduleName+'"][data-asset]')){const k=el.dataset.asset;if(!k)continue;const u=await blobUrl(k,moduleName);if(!u)continue;if(el.dataset.kind==="audio"){el.innerHTML='';el.appendChild(yPlayer(u,el.dataset.name||""))}else el.innerHTML='<img src="'+u+'" alt="Creatividad">' }}

async function archivo(){
 const auditP=api("/api/control?module=audit&limit=250");
 const modules=(roles().includes("admin")||roles().includes("gestion"))?["radio","taxis","intercambiadores","hometicket","revistas"]:[];
 const results=await Promise.all([auditP,...modules.map(m=>api("/api/control?module="+m+"&includeDeleted=1"))]);
 const d=results[0],finished=[];
 modules.forEach((m,i)=>{(results[i+1].rows||[]).filter(r=>r.deletedAt||(r.status||"").toLowerCase()==="finalizado").forEach(r=>finished.push({module:modLabel(m),title:r.spectacle||r.campaignName||r.position||"Registro",place:r.magazine||r.station||r.location||r.venue||"",from:r.startDate,to:r.endDate}))});
 app.innerHTML=pageHead("Archivo / Histórico","Cambios y campañas finalizadas")+(finished.length?'<section class="card" style="margin-bottom:14px"><div class="section-title"><h2>Campañas finalizadas / archivadas</h2><span class="badge">'+finished.length+'</span></div><div class="list">'+finished.map(r=>'<div class="item"><div><h3>'+esc(r.module)+' · '+esc(r.title)+'</h3><div class="item-meta"><span>'+esc(r.place)+'</span><span>'+fdate(r.from)+' → '+fdate(r.to)+'</span></div></div></div>').join("")+'</div></section>':'')+'<div class="card"><div class="section-title"><h2>Auditoría</h2></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Módulo</th><th>Acción</th><th>Elemento</th><th>Usuario</th></tr></thead><tbody>'+(d.rows||[]).map(r=>'<tr><td>'+new Date(r.at).toLocaleString("es-ES")+'</td><td>'+esc(modLabel(r.module))+'</td><td>'+esc(actLabel(r.action))+'</td><td>'+esc(r.elementId||"")+'</td><td>'+esc(r.actor?.email||"")+'</td></tr>').join("")+'</tbody></table></div></div>';
}

// ===================== CALENDARIO =====================
const HITO_TYPES=["Estreno","Rueda de prensa","Pase gráfico","Entrevista / medios","Reunión","Cierre de edición","Evento","Otro"];
const HITO_REMINDERS=[["","Por defecto"],["none","Sin aviso"],["15m","15 minutos antes"],["1h","1 hora antes"],["1d","1 día antes"],["2d","2 días antes"]];
const KIND_LABEL={montaje:"Montaje",retirada:"Retirada",inicio:"Inicio",fin:"Fin",entrega:"Entrega",hito:"Hito"};
const KIND_COLOR={montaje:"#FFD400",retirada:"#ff8a65",inicio:"#8fd18f",fin:"#aaa296",entrega:"#ff6b5e",hito:"#7fb8ff"};
const CAL_MODS=[["carteleria","Cartelería"],["hitos","Hitos"],["radio","Radio"],["taxis","Taxis"],["intercambiadores","Intercambiadores"],["hometicket","Home Ticket"],["revistas","Revistas"]];
const calLS={get(k,d){try{return localStorage.getItem(k)??d}catch{return d}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
let calCursor=new Date(),calEvents=[],calWeekOffset=0,calView=calLS.get("yc-cal-view","semana"),calMods=new Set(),calVenue="";
const isoOf=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const evTag=e=>e.kind==="hito"?e.action:(KIND_LABEL[e.kind]||e.action);
const calCanHito=()=>roles().some(r=>r==="admin"||r==="gestion");
const calFiltered=(mods=calMods)=>calEvents.filter(e=>(!mods.size||mods.has(e.moduleKey))&&(!calVenue||e.venue===calVenue));
function weekRange(off){const t=new Date();t.setHours(0,0,0,0);const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7)+off*7);return [...Array(7)].map((_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d})}
const weekTitle=days=>days[0].toLocaleDateString("es-ES",{day:"numeric",month:"long"})+" – "+days[6].toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

async function calendario(){
 const d=await api("/api/calendar-data");calEvents=d.events||[];renderCalendar();
 const ev=new URLSearchParams(location.hash.split("?")[1]||"").get("ev");
 if(ev){history.replaceState(null,"","#calendario");const e=calEvents.find(x=>x.id===ev);if(e)calDetail(e);else say("Ese evento ya no está en el calendario")}
}
function calEvBtn(e,wide){
 return '<button type="button" class="event k-'+e.kind+(e.auto?" auto":" manual")+(wide?" wide":"")+'" data-ev="'+esc(e.id)+'">'+
  '<em>'+esc(evTag(e))+(e.moduleKey==="hitos"?"":" · "+esc(e.module))+'</em><strong>'+esc((e.time?e.time+" · ":"")+e.title)+'</strong>'+(e.location?'<span>'+esc(e.location)+'</span>':'')+'</button>'}
function renderCalendar(){
 const today=localToday(),ev=calFiltered();
 const mods=CAL_MODS.filter(([k])=>k==="hitos"||k==="carteleria"||canRoute(k));
 const filters='<div class="cal-filters"><div class="chip-row"><button type="button" class="chip'+(calMods.size?"":" on")+'" data-mod="">Todo</button>'+mods.map(([k,l])=>'<button type="button" class="chip'+(calMods.has(k)?" on":"")+'" data-mod="'+k+'">'+l+'</button>').join("")+'</div>'+
  '<select id="calVenue" aria-label="Filtrar por espacio"><option value="">Todos los espacios</option>'+VENUES.map(v=>'<option'+(v===calVenue?" selected":"")+'>'+esc(v)+'</option>').join("")+'</select></div>';
 const views='<div class="seg" role="tablist"><button type="button" data-view="semana" class="'+(calView==="semana"?"on":"")+'">Semana</button><button type="button" data-view="mes" class="'+(calView==="mes"?"on":"")+'">Mes</button></div>';
 let body="",label="";
 if(calView==="semana"){
  const days=weekRange(calWeekOffset);label=weekTitle(days);
  body='<div class="wk-list">'+days.map(d=>{const iso=isoOf(d),de=ev.filter(e=>e.date===iso);
   return '<div class="wk-day'+(iso===today?" today":"")+(de.length?"":" empty")+'"><div class="wk-head"><b>'+esc(cap(d.toLocaleDateString("es-ES",{weekday:"long"})))+'</b><span>'+d.getDate()+' '+esc(d.toLocaleDateString("es-ES",{month:"short"}))+'</span>'+(iso===today?'<i>Hoy</i>':'')+'</div>'+
    (de.length?de.map(e=>calEvBtn(e,true)).join(""):'<div class="wk-none">Sin fechas</div>')+'</div>'}).join("")+'</div>';
 }else{
  const y=calCursor.getFullYear(),m=calCursor.getMonth(),first=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7;
  label=cap(calCursor.toLocaleDateString("es-ES",{month:"long",year:"numeric"}));
  let cells=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map(x=>'<div class="weekday">'+x+'</div>').join("");
  for(let i=0;i<offset;i++)cells+='<div class="day empty"></div>';
  for(let d=1;d<=n;d++){const iso=isoOf(new Date(y,m,d)),de=ev.filter(e=>e.date===iso),wd=new Date(y,m,d).toLocaleDateString("es-ES",{weekday:"long"});
   cells+='<div class="day'+(de.length?" has-events":"")+(iso===today?" today":"")+'"><div class="day-number"><span class="day-wd">'+esc(wd)+' </span>'+d+'</div>'+de.map(e=>calEvBtn(e)).join("")+'</div>'}
  body='<div class="calendar-grid">'+cells+'</div>'+(ev.some(e=>e.date.startsWith(y+"-"+String(m+1).padStart(2,"0")))?'':'<div class="notice" style="margin-top:10px">No hay fechas este mes con estos filtros.</div>');
 }
 app.innerHTML=pageHead("Calendario","Campañas, montajes, entregas e hitos de comunicación de todos los espacios",
  '<button type="button" id="calSub">Suscribirme</button><button type="button" id="calWeek">Compartir semana</button>'+(calCanHito()?'<button type="button" class="primary" id="calNewHito">+ Nuevo hito</button>':''))+
  '<div id="calPanel"></div>'+
  '<div class="card cal-card">'+filters+
  '<div class="calendar-toolbar"><button id="calPrev" aria-label="Anterior">‹</button><div class="cal-now"><strong>'+esc(label)+'</strong><button type="button" class="ghost" id="calToday">Hoy</button></div><button id="calNext" aria-label="Siguiente">›</button>'+views+'</div>'+
  '<div class="cal-legend">'+Object.entries(KIND_LABEL).map(([k,v])=>'<span class="k-'+k+'"><i></i>'+v+'</span>').join("")+'<span class="lg-auto"><i></i>Automático · se edita en su sección</span><span class="lg-manual"><i></i>Hito · se edita aquí</span></div>'+
  body+'</div>';
 const move=dir=>{if(calView==="semana")calWeekOffset+=dir;else calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+dir,1);renderCalendar()};
 $("#calPrev").onclick=()=>move(-1);$("#calNext").onclick=()=>move(1);
 $("#calToday").onclick=()=>{calWeekOffset=0;calCursor=new Date();renderCalendar()};
 $$(".seg [data-view]").forEach(b=>b.onclick=()=>{calView=b.dataset.view;calLS.set("yc-cal-view",calView);renderCalendar()});
 $$(".cal-filters [data-mod]").forEach(b=>b.onclick=()=>{const k=b.dataset.mod;if(!k)calMods.clear();else if(calMods.has(k))calMods.delete(k);else calMods.add(k);renderCalendar()});
 $("#calVenue").onchange=e=>{calVenue=e.target.value;renderCalendar()};
 $(".cal-card").addEventListener("click",e=>{const b=e.target.closest("[data-ev]");if(!b)return;const x=calEvents.find(y=>y.id===b.dataset.ev);if(x)calDetail(x)});
 $("#calSub").onclick=()=>calSubscribe();$("#calWeek").onclick=()=>calWeekPanel();
 if(calCanHito())$("#calNewHito").onclick=()=>calHitoForm({date:localToday()});
}
function calPanel(html){const p=$("#calPanel");if(!p)return;p.innerHTML=html?'<section class="card cal-panel">'+html+'</section>':"";if(html)p.scrollIntoView({behavior:"smooth",block:"start"})}
// Detalle corto de un evento con acceso a su ficha
function calDetail(e){
 const when=cap(new Date(e.date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}))+(e.time?" · "+e.time:"");
 const rows=[["Cuándo",when],["Dónde",e.location],["Espacio",e.venue&&e.location.indexOf(e.venue)<0?e.venue:""],["Responsable",e.responsable],["Estado",e.status],["Notas",e.notes]].filter(r=>r[1]);
 const canOpen=e.kind==="hito"||canRoute(e.moduleKey);
 calPanel('<div class="section-title"><div><small class="section-kicker">'+esc(evTag(e))+' · '+esc(e.module)+'</small><h2>'+esc(e.title)+'</h2></div><button type="button" class="ghost" id="dtClose">Cerrar</button></div>'+
  '<span class="badge '+(e.auto?"":"ok")+' cal-origin">'+(e.auto?"Automático · se edita en "+esc(e.module):"Hito manual · editable aquí")+'</span>'+
  '<dl class="cal-dl">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd>').join("")+'</dl>'+
  (canOpen?'<div class="actions-row"><button type="button" class="primary" id="dtOpen">'+(e.kind==="hito"&&calCanHito()?"Editar hito":"Abrir ficha")+'</button></div>':''));
 $("#dtClose").onclick=()=>calPanel("");
 if(canOpen)$("#dtOpen").onclick=()=>calOpen(e);
}
function calOpen(e){
 if(e.kind==="hito"){api("/api/control?module=hitos").then(d=>{const r=(d.rows||[]).find(x=>x.id===e.recordId);calHitoForm(r||{})}).catch(x=>say(x.message));return}
 if(e.moduleKey==="carteleria"){location.hash="#carteleria?soporte="+encodeURIComponent(e.slotKey||"");return}
 location.hash="#"+e.moduleKey+"?edit="+encodeURIComponent(e.recordId||"");
}
function openEditFromHash(){const p=new URLSearchParams(location.hash.split("?")[1]||"");const id=p.get("edit");if(!id)return;
 const sel=["campaign","radio","ht","revista"].map(k=>'[data-edit-'+k+'="'+CSS.escape(id)+'"]').join(",");const b=document.querySelector(sel);
 if(b){const sp=b.closest(".space-panel,.ht-space,.mag-month");if(sp&&sp.style.display==="none")sp.style.display="";const item=b.closest(".item,.mag-cell,.space-panel,.ht-space");
  if(item){item.classList.add("flash");setTimeout(()=>item.classList.remove("flash"),2600)}b.click();(item||b).scrollIntoView({behavior:"smooth",block:"center"})}
 else say("No se ha encontrado el registro (puede estar archivado)");
 history.replaceState(null,"",location.hash.split("?")[0])}
function calHitoForm(r={}){
 const edit=calCanHito(),dis=edit?"":" disabled";
 calPanel('<div class="section-title"><div><small class="section-kicker">Hito de comunicación</small><h2>'+(r.id?esc(r.title||"Hito"):"Nuevo hito")+'</h2></div><button type="button" class="ghost" id="hitoClose">Cerrar</button></div>'+
  '<form id="hitoForm" class="form-grid"><label>Tipo<select name="type"'+dis+'>'+HITO_TYPES.map(t=>'<option'+(t===r.type?" selected":"")+'>'+t+'</option>').join("")+'</select></label>'+venueSelect(r.venue).replace("<select",'<select'+dis)+
  '<label class="wide">Título<input name="title" value="'+esc(r.title||"")+'" placeholder="Ej.: Estreno de We Will Rock You"'+dis+' required></label>'+
  '<label class="wide">Proyecto / espectáculo<input name="spectacle" data-ac="spectacle" autocomplete="off" placeholder="Empieza a escribir y elige de la lista" value="'+esc(r.spectacle||"")+'"'+dis+'></label>'+
  '<label>Fecha<input type="date" name="date" value="'+esc(r.date||"")+'"'+dis+' required></label><label>Hora<input type="time" name="time" value="'+esc(r.time||"")+'"'+dis+'></label>'+
  '<label>Lugar<input name="place" value="'+esc(r.place||"")+'" placeholder="Sala, medio, dirección…"'+dis+'></label><label>Responsable<input name="responsable" value="'+esc(r.responsable||"")+'"'+dis+'></label>'+
  '<label>Contacto<input name="contact" value="'+esc(r.contact||"")+'" placeholder="Periodista, medio, teléfono…"'+dis+'></label>'+
  '<label>Aviso<select name="reminder"'+dis+'>'+HITO_REMINDERS.map(([v,l])=>'<option value="'+v+'"'+(v===(r.reminder||"")?" selected":"")+'>'+l+'</option>').join("")+'</select></label>'+
  '<label class="wide">Notas<textarea name="notes"'+dis+'>'+esc(r.notes||"")+'</textarea></label>'+
  '<p class="cart-legacy wide" style="margin:0">El aviso llega a quien esté suscrito al calendario. Por defecto: una hora antes si tiene hora; si no, el día anterior a las 9:00.</p>'+
  (edit?'<div class="wide actions-row"><button class="primary" type="submit">Guardar hito</button>'+(r.id?'<button type="button" class="danger" id="hitoDel">Archivar</button>':'')+'</div>':'')+'</form>');
 $("#hitoClose").onclick=()=>calPanel("");loadSpectacles();
 if(!edit)return;
 $("#hitoForm").onsubmit=async ev=>{ev.preventDefault();const data=formObject(ev.target);try{
  if(r.id)await api("/api/control?module=hitos&id="+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  else await api("/api/control?module=hitos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  say("Hito guardado");if(data.date){const [yy,mm,dd]=data.date.split("-").map(Number);calCursor=new Date(yy,mm-1,1);const w0=weekRange(0)[0];calWeekOffset=Math.floor((new Date(yy,mm-1,dd)-w0)/(7*864e5))}calendario()}catch(e){say(e.message)}};
 if(r.id)$("#hitoDel").onclick=async()=>{if(!confirm("¿Archivar este hito?"))return;try{await api("/api/control?module=hitos&id="+r.id,{method:"DELETE"});say("Hito archivado");calendario()}catch(e){say(e.message)}};
}
// Suscripción: enlace privado, con filtro opcional por módulo o por espacio
let calSubScope="all";
async function calSubscribe(){
 try{const d=await api("/api/calendar.ics?link=1");
  const scopes=[["all","Todo"],["m:carteleria","Solo Cartelería"],["m:hitos","Solo hitos"],...VENUES.map(v=>["v:"+v,v])];
  const withScope=u=>{if(calSubScope==="all")return u;const [k,val]=[calSubScope.slice(0,1),calSubScope.slice(2)];return u+"&"+k+"="+encodeURIComponent(val)};
  const https=withScope(d.https),webcal=withScope(d.webcal);
  const g="https://calendar.google.com/calendar/r?cid="+encodeURIComponent(webcal),o="https://outlook.live.com/calendar/0/addfromweb?url="+encodeURIComponent(https)+"&name="+encodeURIComponent("Yellow Control");
  calPanel('<div class="section-title"><div><small class="section-kicker">Suscripción</small><h2>Añadir a tu calendario</h2></div><button type="button" class="ghost" id="subClose">Cerrar</button></div>'+
   '<p class="muted" style="margin:0 0 12px">Las fechas aparecerán en tu calendario y se actualizarán solas. Entregas y montajes avisan el día antes a las 9:00; los hitos, según el aviso que tengan.</p>'+
   '<label class="cal-scope">Qué incluir<select id="subScope">'+scopes.map(([v,l])=>'<option value="'+esc(v)+'"'+(v===calSubScope?" selected":"")+'>'+esc(l)+'</option>').join("")+'</select></label>'+
   '<div class="actions-row cal-sub"><a class="btn primary" href="'+esc(webcal)+'">iPhone / Mac</a><a class="btn" href="'+esc(g)+'" target="_blank" rel="noopener">Google Calendar</a><a class="btn" href="'+esc(o)+'" target="_blank" rel="noopener">Outlook</a><button type="button" id="subCopy">Copiar enlace</button>'+(roles().includes("admin")?'<button type="button" class="danger" id="subReset">Regenerar enlace</button>':'')+'</div>'+
   '<p class="cart-legacy" style="margin-top:10px">El enlace es privado: quien lo tenga puede ver el calendario. No lo publiques. Puedes suscribirte a varios (por ejemplo, uno por teatro).</p>');
  $("#subClose").onclick=()=>calPanel("");
  $("#subScope").onchange=e=>{calSubScope=e.target.value;calSubscribe()};
  $("#subCopy").onclick=async()=>{try{await navigator.clipboard.writeText(https);say("Enlace copiado")}catch{prompt("Copia el enlace:",https)}};
  const rs=$("#subReset");if(rs)rs.onclick=async()=>{if(!confirm("Se creará un enlace nuevo y los anteriores dejarán de funcionar en todos los calendarios suscritos. ¿Continuar?"))return;await api("/api/calendar.ics",{method:"POST"});say("Enlace regenerado");calSubscribe()};
 }catch(e){say(e.message)}
}
// Compartir semana: imagen vertical o PDF A4, de lunes a domingo, con módulos a elegir
let calShareMods=null;
function calWeekPanel(){
 const avail=CAL_MODS.filter(([k])=>calEvents.some(e=>e.moduleKey===k));
 if(!calShareMods)calShareMods=new Set(calMods.size?[...calMods]:avail.map(([k])=>k));
 const days=weekRange(calWeekOffset),from=isoOf(days[0]),to=isoOf(days[6]),title=weekTitle(days);
 const ev=calFiltered(calShareMods).filter(e=>e.date>=from&&e.date<=to);
 calPanel('<div class="section-title"><div><small class="section-kicker">Compartir semana</small><h2>'+esc(title)+'</h2></div><button type="button" class="ghost" id="wkClose">Cerrar</button></div>'+
  '<div class="chip-row" style="margin-bottom:8px"><span class="chip-label">Semana</span>'+[["-1","Anterior"],["0","Esta"],["1","Próxima"],["2","Dentro de dos"]].map(([o,l])=>'<button type="button" class="chip'+(calWeekOffset===+o?" on":"")+'" data-o="'+o+'">'+l+'</button>').join("")+'</div>'+
  '<div class="chip-row" style="margin-bottom:12px"><span class="chip-label">Incluir</span>'+(avail.length?avail.map(([k,l])=>'<button type="button" class="chip'+(calShareMods.has(k)?" on":"")+'" data-sm="'+k+'"><span class="dot"></span>'+l+'</button>').join(""):'<span class="muted">Aún no hay fechas</span>')+'</div>'+
  (calVenue?'<p class="cart-legacy" style="margin:0 0 10px">Solo '+esc(calVenue)+' (filtro activo en el calendario).</p>':'')+
  '<div class="wk-preview">'+(ev.length?days.map(d=>{const de=ev.filter(e=>e.date===isoOf(d));return de.length?'<div><b>'+esc(cap(d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric"})))+'</b>'+de.map(e=>'<span class="k-'+e.kind+'"><i></i>'+esc((e.time?e.time+" · ":"")+evTag(e)+" · "+e.title)+'</span>').join("")+'</div>':""}).join(""):'<div class="notice">No hay fechas esta semana con esta selección.</div>')+'</div>'+
  '<div class="actions-row" style="margin-top:12px"><button type="button" class="primary" id="wkShare">Imagen vertical</button><button type="button" id="wkPdf">PDF A4</button></div>'+
  '<p class="cart-legacy" style="margin-top:8px">En el móvil, «Imagen vertical» abre el menú de compartir (WhatsApp, correo…). En el ordenador se descarga.</p>');
 $("#wkClose").onclick=()=>calPanel("");
 $$("#calPanel [data-o]").forEach(c=>c.onclick=()=>{calWeekOffset=+c.dataset.o;if(calView==="semana")renderCalendar();calWeekPanel()});
 $$("#calPanel [data-sm]").forEach(c=>c.onclick=()=>{const k=c.dataset.sm;calShareMods.has(k)?calShareMods.delete(k):calShareMods.add(k);calWeekPanel()});
 $("#wkShare").onclick=()=>calWeekExport(days,ev,title);$("#wkPdf").onclick=()=>calWeekPdf(days,ev,title);
}
function calWeekCanvas(days,ev,title){
 const W=1080,pad=64,ROW=92,DAY=78;const rows=[];days.forEach(d=>{const de=ev.filter(e=>e.date===isoOf(d));if(de.length){rows.push({day:d});de.forEach(e=>rows.push({e}))}});
 const content=rows.reduce((a,r)=>a+(r.day?DAY:ROW+(r.e.location?22:0)),0);
 const H=Math.max(1350,300+content+140);
 const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
 g.fillStyle="#131313";g.fillRect(0,0,W,H);g.fillStyle="#FFD400";g.fillRect(0,0,W,12);
 g.textBaseline="top";g.font="400 76px Anton, Impact, sans-serif";g.fillStyle="#FFD400";g.fillText("YELLOW CONTROL",pad,64);
 g.font="700 34px 'Plus Jakarta Sans', Arial";g.fillStyle="#F2EFE6";g.fillText("Semana · "+title,pad,160);
 g.font="600 22px 'Plus Jakarta Sans', Arial";g.fillStyle="#aaa296";g.fillText(ev.length+(ev.length===1?" fecha":" fechas")+(calVenue?" · "+calVenue:""),pad,210);
 let y=280;if(!rows.length){g.fillStyle="#aaa296";g.font="600 30px 'Plus Jakarta Sans', Arial";g.fillText("Sin fechas esta semana",pad,y)}
 const clip=(t,max)=>{if(g.measureText(t).width<=max)return t;while(t.length&&g.measureText(t+"…").width>max)t=t.slice(0,-1);return t+"…"};
 for(const r of rows){if(r.day){y+=14;g.font="400 40px Anton, Impact, sans-serif";g.fillStyle="#F2EFE6";g.fillText(r.day.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}).toUpperCase(),pad,y);y+=DAY-14;continue}
  const e=r.e,h=ROW-20+(e.location?22:0);g.fillStyle=KIND_COLOR[e.kind]||"#FFD400";g.fillRect(pad,y,7,h);
  g.font="800 19px 'Plus Jakarta Sans', Arial";g.fillText((evTag(e)+(e.moduleKey==="hitos"?"":" · "+e.module)).toUpperCase(),pad+26,y+2);
  g.font="700 29px 'Plus Jakarta Sans', Arial";g.fillStyle="#F2EFE6";g.fillText(clip((e.time?e.time+"  ":"")+e.title,W-pad*2-30),pad+26,y+28);
  if(e.location){g.font="500 21px 'Plus Jakarta Sans', Arial";g.fillStyle="#aaa296";g.fillText(clip(e.location,W-pad*2-30),pad+26,y+66)}
  y+=ROW+(e.location?22:0)}
 g.font="600 18px 'Plus Jakarta Sans', Arial";g.fillStyle="#6b665d";g.fillText("Yellow Media · generado el "+new Date().toLocaleDateString("es-ES"),pad,H-60);
 return c}
async function calWeekExport(days,ev,title){
 try{if(document.fonts&&document.fonts.ready)await document.fonts.ready;const c=calWeekCanvas(days,ev,title);const blob=await new Promise(r=>c.toBlob(r,"image/png"));const name="Yellow_semana_"+isoOf(days[0])+".png";const file=new File([blob],name,{type:"image/png"});
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Semana · "+title});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  say("Imagen descargada")}catch(e){if(e&&e.name==="AbortError")return;say(e.message||"No se ha podido exportar")}}
// PDF A4: documento imprimible en claro, legible en papel y en pantalla
function calWeekPdf(days,ev,title){
 const w=window.open("","_blank");if(!w){say("Permite las ventanas emergentes para generar el PDF");return}
 const body=days.map(d=>{const de=ev.filter(e=>e.date===isoOf(d));return '<section><h2>'+esc(cap(d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})))+'</h2>'+
  (de.length?de.map(e=>'<div class="ev" style="border-color:'+(KIND_COLOR[e.kind]||"#FFD400")+'"><small>'+esc(evTag(e)+(e.moduleKey==="hitos"?"":" · "+e.module))+'</small><b>'+esc((e.time?e.time+" · ":"")+e.title)+'</b>'+(e.location?'<span>'+esc(e.location)+'</span>':'')+(e.responsable?'<span>Responsable: '+esc(e.responsable)+'</span>':'')+'</div>').join(""):'<p class="none">Sin fechas</p>')+'</section>'}).join("");
 w.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><title>Yellow Control · Semana '+esc(title)+'</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:13px/1.35 "Plus Jakarta Sans",Arial,sans-serif;color:#131313;margin:0}'+
  'header{border-top:6px solid #FFD400;padding-top:10px;margin-bottom:14px}header h1{font:400 30px Anton,Impact,sans-serif;letter-spacing:.02em;margin:0}header p{margin:4px 0 0;color:#555}'+
  'section{break-inside:avoid;margin:0 0 10px;padding-top:8px;border-top:1px solid #ddd}h2{font-size:14px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}'+
  '.ev{border-left:4px solid;padding:3px 0 3px 9px;margin:0 0 6px}.ev small{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#666}.ev b{display:block;font-size:14px}.ev span{display:block;color:#555;font-size:12px}.none{color:#999;margin:0}footer{margin-top:16px;color:#999;font-size:10px}</style>'+
  '<header><h1>YELLOW CONTROL</h1><p>Semana · '+esc(title)+' · '+ev.length+(ev.length===1?" fecha":" fechas")+(calVenue?" · "+esc(calVenue):"")+'</p></header>'+body+'<footer>Yellow Media · generado el '+new Date().toLocaleDateString("es-ES")+'</footer><script>window.onload=()=>setTimeout(()=>print(),250)<\/script></html>');
 w.document.close()}

async function admin(){
 if(!roles().includes("admin"))throw new Error("Acceso reservado a administración");
 let d;try{d=await api("/api/admin-users")}catch(e){app.innerHTML=pageHead("Usuarios","Administración de accesos")+'<div class="card notice">Netlify Identity todavía no está habilitado para este proyecto. El código de roles ya está preparado, pero la gestión de usuarios queda bloqueada hasta activar Identity en Netlify.</div>'+mailTestCard();bindMailTest();return}
 const users=d.users||[];
 app.innerHTML=pageHead("Usuarios","Roles y permisos reales")+'<div class="grid two-col"><section class="card"><div class="section-title"><h2>Usuarios</h2></div><div class="list">'+users.map(u=>'<div class="item"><div><h3>'+esc(u.email)+'</h3><div class="item-meta"><span>'+esc((u.roles||[]).join(", ")||"sin rol")+'</span>'+statusBadge(u.disabled?"desactivado":"activo")+'</div></div><div class="item-actions"><select data-role-id="'+u.id+'">'+["admin","gestion","carteleria","consulta"].map(r=>'<option '+((u.roles||[]).includes(r)?"selected":"")+'>'+r+'</option>').join("")+'</select><button data-save-role="'+u.id+'">Guardar rol</button><button data-toggle-user="'+u.id+'" data-disabled="'+(u.disabled?"1":"0")+'">'+(u.disabled?"Activar":"Desactivar")+'</button></div></div>').join("")+'</div></section><section class="card"><div class="section-title"><h2>Crear usuario</h2></div><form id="newUserForm" class="stack"><label>Email<input name="email" type="email" required></label><label>Rol<select name="role"><option>carteleria</option><option>gestion</option><option>consulta</option><option>admin</option></select></label><button class="primary">Crear y enviar recuperación de contraseña</button></form></section></div>'+mailTestCard();bindMailTest();
 $$("[data-save-role]").forEach(b=>b.onclick=async()=>{const id=b.dataset.saveRole,role=$('[data-role-id="'+id+'"]').value;await api("/api/admin-users",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id,role})});say("Rol actualizado");admin()});
 $$("[data-toggle-user]").forEach(b=>b.onclick=async()=>{await api("/api/admin-users",{method:b.dataset.disabled==="1"?"PATCH":"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id:b.dataset.toggleUser})});say("Acceso actualizado");admin()});
 $("#newUserForm").onsubmit=async e=>{e.preventDefault();const v=formObject(e.currentTarget);await api("/api/admin-users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(v)});say("Usuario creado");admin()};
}

(async()=>{if(await authenticate())route();if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})})();
})();