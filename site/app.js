(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={actor:null,route:"dashboard",editing:null,assetUrls:new Map()};
const gate=$("#loginGate"), app=$("#app"), toast=$("#toast");
const key=()=>{try{return sessionStorage.getItem("pavon_edit_key")||""}catch{return""}};
const headers=(extra={})=>({...extra,...(key()?{"x-edit-key":key()}:{})});
let toastTimer=0;
function say(msg){clearTimeout(toastTimer);toast.classList.remove("undo");toast.textContent=msg;toast.classList.add("show");toastTimer=setTimeout(()=>toast.classList.remove("show"),2200)}
// Aviso con «Deshacer» tras quitar un registro: lo recupera durante unos segundos.
function sayUndo(msg,url,after){clearTimeout(toastTimer);toast.innerHTML='<span>'+esc(msg)+'</span><button type="button">Deshacer</button>';toast.classList.add("show","undo");
 toast.querySelector("button").onclick=async()=>{clearTimeout(toastTimer);try{await api(url,{method:"PATCH"});say("Recuperado");after&&after()}catch(e){say(e.message)}};
 toastTimer=setTimeout(()=>toast.classList.remove("show","undo"),8000)}
async function api(url,opts={}){opts.headers=headers(opts.headers||{});const r=await fetch(url,opts);let data=null;const ct=r.headers.get("content-type")||"";if(ct.includes("json")){try{data=await r.json()}catch{}}else{try{data=await r.text()}catch{}}if(!r.ok)throw Object.assign(new Error(data?.error||data||("HTTP "+r.status)),{status:r.status,data});return data}
function roles(){return state.actor?.roles||[]}
function has(role){return roles().includes("admin")||roles().includes(role)}
function isCarteleriaRole(){return roles().includes("carteleria")&&!roles().includes("admin")}
function canRoute(route){if(roles().includes("admin"))return true;if(isCarteleriaRole())return route==="dashboard"||route==="carteleria";if(route==="dashboard"||route==="calendario"||route==="carteleria"||route==="archivo")return true;if((route==="radio"||route==="taxis"||route==="intercambiadores"||route==="hometicket"||route==="revistas"||route==="importar")&&roles().includes("gestion"))return true;return false}
const ICON_PATHS={dashboard:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',carteleria:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/>',hometicket:'<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',radio:'<rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="15.5" cy="14" r="3"/><path d="M7 12h3M7 16h3M6 8l11-4"/>',taxis:'<path d="M5 17V12l2-5h10l2 5v5M3 17h18v3H3zM9 4h6"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',intercambiadores:'<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21l1-3M16 21l-1-3"/>',revistas:'<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M18 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4"/>',archivo:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',admin:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'};
// Fotos de las tarjetas de Inicio y cabeceras. Para cambiar una foto, sustituye el archivo en /assets/tiles/ (formato 4:3, JPG).
const ROUTE_PHOTOS={carteleria:"/assets/tiles/carteleria.jpg",revistas:"/assets/tiles/revistas.jpg",calendario:"/assets/tiles/calendario.jpg",hometicket:"/assets/tiles/hometicket.jpg?v=2",radio:"/assets/tiles/radio.jpg",taxis:"/assets/tiles/taxis.jpg",intercambiadores:"/assets/tiles/intercambiadores.jpg",archivo:"/assets/tiles/archivo.jpg",admin:"/assets/tiles/usuarios.jpg"};
function icon(route,cls="nav-ico"){return '<svg class="'+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON_PATHS[route]||"")+'</svg>'}
function navMeta(route){const a=$('#mainNav [data-route="'+route+'"]');return a?{href:a.dataset.href||a.getAttribute("href")||("#"+route),small:a.querySelector("small")?.textContent||"",name:a.querySelector("b")?.textContent||""}:null}
$$("#mainNav a").forEach(a=>{if(!a.dataset.href)a.dataset.href=a.getAttribute("href")||"";if(!a.querySelector("svg"))a.insertAdjacentHTML("afterbegin",icon(a.dataset.route))});
const MODULE_LABELS={avisos:"Avisos",hitos:"Comunicación",carteleria:"Cartelería",radio:"Radio",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas de Teatros",publicidad:"Publicidad",usuarios:"Usuarios",admin:"Usuarios"};
const ACTION_LABELS={create:"creado",update:"editado",archive:"quitado",restore:"recuperado",save:"guardado",image_replace:"imagen cambiada",image_delete:"imagen quitada",role_change:"rol cambiado",user_create:"usuario creado",user_disable:"usuario desactivado",user_enable:"usuario activado",email_sent:"correo enviado",email_pending:"correo pendiente",digest_sent:"resumen enviado",digest_pending:"resumen pendiente"};
function modLabel(m){return MODULE_LABELS[m]||m||""}
function actLabel(a){return ACTION_LABELS[a]||a||""}
function prettyKey(k=""){const cs=CART_SLOTS.find(x=>x.key===k);if(cs)return cs.name;const t=String(k).replaceAll("__"," · ").replaceAll("_"," ").trim();return t.charAt(0).toUpperCase()+t.slice(1)}
function openFormCard(){setTimeout(()=>{const c=$('[id$="FormCard"]');if(!c)return;c.classList.add("open");if(matchMedia("(max-width:700px)").matches)c.scrollIntoView({behavior:"smooth",block:"start"})},0)}
document.addEventListener("click",e=>{const t=e.target.closest("#newCampaign,#newRadio,#newHT,#newRevista,[data-edit-campaign],[data-edit-radio],[data-edit-ht],[data-edit-revista],[data-add-revista]");if(t)openFormCard();const c=e.target.closest("#cancelCampaign,#cancelRadio,#cancelHT,#cancelRevista");if(c)setTimeout(()=>{const f=$('[id$="FormCard"]');f&&f.classList.remove("open")},0)});
function applyNav(){document.body.dataset.route=state.route;document.body.dataset.roleMode=isCarteleriaRole()?"carteleria":"";$$("#mainNav [data-route]").forEach(a=>{const r=a.dataset.route,locked=!canRoute(r);a.classList.toggle("active",r===state.route);a.classList.toggle("locked",locked);a.setAttribute("aria-disabled",locked?"true":"false");if(locked){a.removeAttribute("href");a.tabIndex=-1}else{a.setAttribute("href",a.dataset.href||("#"+r));a.removeAttribute("tabindex")}});$("#accountName").textContent=state.actor?.email||"";const na=$("#navAccountName");if(na){na.textContent=state.actor?.email||"—";const av=$(".account-avatar");if(av)av.textContent=(state.actor?.email||"Y").charAt(0).toUpperCase()}const act=$("#mainNav a.active");if(act&&matchMedia("(max-width:980px)").matches)act.scrollIntoView({inline:"center",block:"nearest"})}
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
async function route(){const q=new URLSearchParams(location.search);if(q.get("vista")){location.replace("/#carteleria?vista="+encodeURIComponent(q.get("vista")));return}const nextRoute=routeName();if(state.route==="carteleria"&&nextRoute!=="carteleria"&&cart.dirty.size&&!confirm("Hay cambios sin guardar en Cartelería. ¿Salir sin guardar?")){history.replaceState(null,"","#carteleria");return}if(nextRoute==="hometicket"&&state.route!=="hometicket")htView="";state.route=nextRoute;if(!canRoute(state.route))state.route="dashboard";applyNav();app.innerHTML='<div class="loading">Cargando…</div>';try{if(state.route==="dashboard")await dashboard();else if(state.route==="radio")await radio();else if(state.route==="taxis")await campaigns("taxis");else if(state.route==="intercambiadores")await campaigns("intercambiadores");else if(state.route==="hometicket")await homeTicket();else if(state.route==="revistas")await revistas();else if(state.route==="carteleria")await carteleria();else if(state.route==="calendario")await calendario();else if(state.route==="archivo")await archivo();else if(state.route==="importar")await importar();else if(state.route==="admin")await admin();else await dashboard();openEditFromHash()}catch(e){app.innerHTML=pageHead("Error","")+ '<div class="card error">'+esc(e.message)+"</div>"}}
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
 const allRoutes=["calendario","carteleria","hometicket","radio","taxis","intercambiadores","revistas","admin"];
 const routes=isCarteleriaRole()?allRoutes:allRoutes.filter(canRoute);
 return '<div class="home-section-label"><span>Secciones</span><span>'+routes.length+' módulos</span></div><nav class="home-tiles" aria-label="Secciones">'+routes.map(r=>{const m=navMeta(r);if(!m)return"";const photo=ROUTE_PHOTOS[r],b=badges[r],locked=!canRoute(r),tag=locked?"div":"a",href=locked?"":' href="'+esc(m.href)+'"';return '<'+tag+' class="home-tile'+(photo?' has-photo':'')+(locked?' locked':'')+'"'+href+(photo?' style="--photo:url('+photo+')"':'')+(locked?' aria-disabled="true"':'')+'>'+icon(r,"tile-ico")+(locked?'<span class="tile-lock" aria-hidden="true">🔒</span>':'')+(b?'<span class="tile-badge'+(r==="carteleria"&&alerts.length?' hot':'')+'">'+esc(b)+'</span>':'')+'<span class="tile-txt"><small>'+esc(m.small)+'</small><b>'+(r==="intercambiadores"?"Intercam&shy;biadores":esc(m.name))+'</b></span></'+tag+'>'}).join("")+'</nav>'}

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
function radioDefaultMonth(months,current){if(!months?.length)return"";if(months.includes(current))return current;return months.find(m=>m>=current)||months[months.length-1]}
function radioValidity(endDate){if(!endDate)return"";const txt=new Date(endDate+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});return "Válido hasta el "+txt}
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
 return rows.slice().sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||""))).map(r=>{const l=radioLine(contract,r.lineId),unit=r.unit||l?.unit||"cuñas";return '<div class="item radio-assignment" data-id="'+r.id+'"><div><div class="item-meta"><span class="badge">'+esc(l?.station||r.station||"Radio")+'</span><span>'+esc(l?.program||"")+'</span></div><h3>'+esc(r.spectacle||r.campaignName||"Sin espectáculo")+'</h3><div class="item-meta"><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span><span><b>'+radioFmt(r.plannedSpots)+'</b> '+esc(unit)+' planificadas</span>'+(radioNum(r.actualSpots)?'<span><b>'+radioFmt(r.actualSpots)+'</b> reales</span>':'')+'<span>'+esc(r.spotName||"Sin nombre de cuña")+'</span>'+statusBadge(r.materialStatus||r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="radio" data-kind="audio" data-name="'+esc(r.assetName||"")+'"></div></div><div class="item-actions"><button data-edit-radio="'+r.id+'">Editar</button><button class="danger" data-del-radio="'+r.id+'">Quitar</button></div></div>'}).join("")
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
function radioMailText(contract,month,rows){
 const ordered=rows.slice().sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||""))||String(a.station||"").localeCompare(String(b.station||"")));
 const lines=ordered.map(r=>{const l=radioLine(contract,r.lineId),unit=r.unit||l?.unit||"cuñas",dates=(r.startDate||r.endDate)?fdate(r.startDate)+(r.endDate&&r.endDate!==r.startDate?" – "+fdate(r.endDate):""):"Fechas por confirmar";return "• "+(l?.station||r.station||"Radio")+" · "+(l?.program||"")+" · "+(r.spectacle||r.campaignName||"Sin espectáculo")+" · "+dates+" · "+radioFmt(r.plannedSpots)+" "+unit+(r.spotName?" · "+r.spotName:"")});
 const totals=[...new Set(ordered.map(r=>r.unit||radioLine(contract,r.lineId)?.unit||"cuñas"))].map(unit=>{const n=ordered.filter(r=>(r.unit||radioLine(contract,r.lineId)?.unit||"cuñas")===unit).reduce((a,r)=>a+radioNum(r.plannedSpots),0);return radioFmt(n)+" "+unit}).join(" · ");
 return "Hola,\n\nOs paso la planificación de "+contract.venue+" para "+radioMonthLabel(month)+":\n\n"+(lines.length?lines.join("\n"):"Todavía no hay cuñas asignadas para este mes.")+(totals?"\n\nTotal solicitado: "+totals:"")+"\n\nPor favor, confirmad la programación y avisadme si hubiera cualquier incidencia.\n\nGracias.";
}
function radioMailSubject(contract,month){return "Planificación radio · "+contract.venue+" · "+radioMonthLabel(month)}
function radioMailOpen(contract,month,rows){
 const panel=$("#radioMailPanel");if(!panel)return;
 const subject=radioMailSubject(contract,month),body=radioMailText(contract,month,rows);
 panel.classList.remove("hidden");
 panel.innerHTML='<div class="section-title"><div><small class="section-kicker">Enviar planificación</small><h2>Correo al responsable del acuerdo</h2></div><button type="button" class="ghost" id="radioMailClose">Cerrar</button></div>'+
 '<div class="form-grid radio-mail-form"><label class="wide">Para<input id="radioMailTo" type="email" placeholder="correo@emisora.es"></label><label class="wide">Asunto<input id="radioMailSubject" value="'+esc(subject)+'"></label><label class="wide">Mensaje<textarea id="radioMailBody" rows="12">'+esc(body)+'</textarea></label></div>'+
 '<div class="actions-row"><button type="button" id="radioMailCopy">Copiar texto</button><button type="button" class="primary" id="radioMailOpenClient">Abrir correo</button></div>'+
 '<p class="muted radio-mail-hint">El correo no se envía automáticamente: puedes copiarlo o abrirlo en tu aplicación de correo para revisarlo antes de enviarlo.</p>';
 $("#radioMailClose").onclick=()=>{panel.classList.add("hidden");panel.innerHTML=""};
 $("#radioMailCopy").onclick=async()=>{const txt=$("#radioMailBody").value;try{await navigator.clipboard.writeText(txt);say("Texto del correo copiado")}catch{prompt("Copia el texto:",txt)}};
 $("#radioMailOpenClient").onclick=()=>{const to=$("#radioMailTo").value.trim(),sub=$("#radioMailSubject").value,txt=$("#radioMailBody").value;location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(sub)+"&body="+encodeURIComponent(txt)};
 panel.scrollIntoView({behavior:"smooth",block:"start"})
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
 if(!radioView.month||!months.includes(radioView.month))radioView.month=radioDefaultMonth(months,current);
 const month=radioView.month,monthRows=radioRows(rows,contract.id,month),legacy=rows.filter(r=>!r.contractId);
 app.innerHTML=pageHead("Radio","Control contractual, reparto por espectáculo, materiales y consumo",'<button id="radioMail" class="btn">Preparar correo</button><button id="radioPrint" class="btn">Informe mensual</button><button id="newRadio" class="primary">+ Nueva asignación</button>')+
 radioContractTabs(contracts,contract.id)+
 '<section class="card radio-contract-head radio-contract-head-compact"><div><small class="section-kicker">Contrato activo</small><h2>'+esc(contract.venue)+' · '+esc(contract.brand)+'</h2><p>'+esc(radioValidity(contract.endDate))+'</p></div></section>'+
 radioMonthTabs(contract,month)+radioInventoryKpis(contract,month,monthRows)+
 '<section id="radioMailPanel" class="card radio-mail-panel hidden"></section>'+
 '<div class="grid radio-main-grid"><section class="card"><div class="section-title"><div><small class="section-kicker">Inventario contractual</small><h2>'+esc(radioMonthLabel(month))+'</h2></div><span class="badge">'+monthRows.length+' asignaciones</span></div>'+radioLineTable(contract,month,monthRows)+'</section>'+
 '<section class="card" id="radioFormCard">'+radioForm({},contract,month)+'</section></div>'+
 '<div class="grid two-col radio-bottom-grid"><section class="card"><div class="section-title"><div><small class="section-kicker">Planificación</small><h2>Asignaciones del mes</h2></div></div><div class="list">'+radioAssignments(monthRows,contract)+'</div></section>'+
 '<section class="card"><div class="section-title"><div><small class="section-kicker">Control semanal</small><h2>Semanas del mes</h2></div></div>'+radioWeekPanel(monthRows,month,contract)+'<div class="section-title radio-report-title"><div><small class="section-kicker">Informe</small><h2>Consumo por espectáculo</h2></div></div>'+radioSpectacleReport(monthRows,contract)+'</section></div>'+
 (legacy.length?'<section class="card radio-legacy"><div class="section-title"><h2>Registros anteriores sin contrato</h2><span class="badge">'+legacy.length+'</span></div><p class="muted">Se conservan para no perder información. Puedes editarlos y asignarlos a uno de los tres contratos cuando corresponda.</p><div class="list">'+radioAssignments(legacy,{lines:[]})+'</div></section>':"");
 $$("[data-radio-contract]").forEach(b=>b.onclick=()=>{radioView.contractId=b.dataset.radioContract;radioView.month="";radio()});
 $$("[data-radio-month]").forEach(b=>b.onclick=()=>{radioView.month=b.dataset.radioMonth;radio()});
 requestAnimationFrame(()=>{const strip=$(".radio-months"),active=$(".radio-months .chip.on");if(strip&&active)active.scrollIntoView({block:"nearest",inline:"center"})});
 $("#radioMail").onclick=()=>radioMailOpen(contract,month,monthRows);
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
 $$("[data-del-radio]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Quitar esta asignación?"))return;const _u="/api/control?module=radio&id="+b.dataset.delRadio;await api(_u,{method:"DELETE"});sayUndo("Asignación quitada",_u,()=>radio());radio()});
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
   if(c&&!l)throw new Error("Elige una emisora / programa del acuerdo.");
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
 taxis:{title:"Taxis",subtitle:"Campañas de publicidad en taxis",hide:["support","location","provider","format"]},
 intercambiadores:{title:"Intercambiadores",subtitle:"CLECE · campañas y soportes en intercambiadores",hide:["location","provider","format"]}
};
async function campaigns(moduleName){
 const cfg=CAMPAIGN_CONFIG[moduleName],d=await api("/api/control?module="+moduleName),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const filters='<div class="form-grid" style="margin-bottom:12px"><label class="wide">Buscar<input id="campaignFilterQ" placeholder="Espectáculo o nombre interno…"></label><label>Estado<select id="campaignFilterStatus"><option value="">Todas</option><option value="active">Activas ahora</option><option value="finalizado">Finalizadas</option></select></label><label class="wide">Espacio<select id="campaignFilterVenue"><option value="">Todos los espacios</option>'+VENUES.map(v=>'<option>'+esc(v)+'</option>').join("")+'</select></label></div>';
 app.innerHTML=pageHead(cfg.title,cfg.subtitle,'<button id="newCampaign" class="primary">+ Nueva campaña</button>')+moduleKpis(rows,"Activas ahora")+'<div class="grid two-col"><section class="card"><div class="section-title"><h2>Registros</h2><span id="campaignCount" class="badge ok">'+rows.filter(activeNow).length+' activas</span></div>'+filters+'<div id="campaignList" class="list">'+campaignItems(rows,moduleName)+'</div></section><section class="card" id="campaignFormCard">'+campaignForm(moduleName)+'</section></div>';
 const refresh=()=>{const q=($("#campaignFilterQ").value||"").toLowerCase().trim(),status=$("#campaignFilterStatus").value,venue=$("#campaignFilterVenue").value;const filtered=rows.filter(r=>{if(venue&&r.venue!==venue)return false;if(q&&!JSON.stringify(r).toLowerCase().includes(q))return false;if(status==="active"&&!activeNow(r))return false;if(status==="finalizado"&&(r.status||"").toLowerCase()!=="finalizado"&&!r.deletedAt)return false;return true});$("#campaignList").innerHTML=campaignItems(filtered,moduleName);$("#campaignCount").textContent=filtered.length+" visibles";bindCampaignRows(filtered,moduleName);hydrateMedia(moduleName)};
 $("#campaignFilterQ").addEventListener("input",refresh);$("#campaignFilterStatus").addEventListener("input",refresh);$("#campaignFilterVenue").addEventListener("input",refresh);chipify($("#campaignFilterStatus"),"Estado");chipify($("#campaignFilterVenue"),"Espacio",venueShort);
 $("#newCampaign").onclick=()=>{$("#campaignFormCard").innerHTML=campaignForm(moduleName);bindCampaignForm(null,moduleName)};
 bindCampaignRows(rows,moduleName);bindCampaignForm(null,moduleName);await hydrateMedia(moduleName);
}
function campaignItems(rows,moduleName){return rows.length?rows.map(r=>'<div class="item"><div><h3>'+esc(r.spectacle||r.campaignName||"Campaña")+'</h3><div class="item-meta">'+(r.venue?'<span class="badge">'+esc(r.venue)+'</span>':'')+'<span>'+esc(r.location||r.support||"")+'</span><span>'+esc(r.provider||"")+'</span><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span>'+statusBadge(r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="'+moduleName+'" data-kind="image"></div></div><div class="item-actions"><button data-edit-campaign="'+r.id+'">Editar</button><button class="danger" data-del-campaign="'+r.id+'">Quitar</button></div></div>').join(""):'<div class="notice">No hay campañas registradas.</div>'}
function campaignForm(moduleName,r={}){const cfg=CAMPAIGN_CONFIG[moduleName];return '<div class="section-title"><h2>'+(r.id?"Editar campaña":"Nueva campaña")+'</h2></div><form id="campaignForm" class="form-grid">'+venueSelect(r.venue)+input("spectacle","Espectáculo / campaña",r.spectacle)+input("campaignName","Nombre interno",r.campaignName)+[["support","Soporte / formato"],["location",cfg.location],["provider",cfg.provider],["format","Pieza / formato"]].filter(([n])=>!(cfg.hide||[]).includes(n)).map(([n,l])=>input(n,l,r[n])).join("")+input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+input("contact","Contacto",r.contact)+selectStatus(r.status)+'<label class="wide">Creatividad<input id="campaignAsset" type="file" accept="image/*,application/pdf"></label><label class="wide">Condiciones / acuerdo<textarea name="agreement">'+esc(r.agreement||"")+'</textarea></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label><div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelCampaign">Limpiar</button></div></form>'}
function bindCampaignRows(rows,moduleName){$$("[data-edit-campaign]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editCampaign);if(!r)return;$("#campaignFormCard").innerHTML=campaignForm(moduleName,r);bindCampaignForm(r,moduleName)});$$("[data-del-campaign]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Quitar esta campaña?"))return;const _u="/api/control?module="+moduleName+"&id="+b.dataset.delCampaign;await api(_u,{method:"DELETE"});sayUndo("Campaña quitada",_u,()=>campaigns(moduleName));campaigns(moduleName)})}
function bindCampaignForm(existing,moduleName){const f=$("#campaignForm");if(!f)return;$("#cancelCampaign").onclick=()=>{$("#campaignFormCard").innerHTML=campaignForm(moduleName);bindCampaignForm(null,moduleName)};f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#campaignAsset")?.files?.[0];try{const assetKey=await uploadAsset(file,moduleName,existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}if(existing?.id)await api("/api/control?module="+moduleName+"&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module="+moduleName,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});say("Campaña guardada");campaigns(moduleName)}catch(err){say(err.message)}}}

const HOME_TICKET_SPACES=["Gran Teatro Pavón","Gran Teatro CaixaBank Príncipe Pío","Teatro Serrano","Gran Castillo de Pedraza","Abono Teatro"];
// Cada Home Ticket (uno por espacio) tiene tres huecos fijos: Superior, Inferior y XL.
const HT_POS=[{key:"HT Superior · 520 × 420",name:"Superior",size:"520 × 420"},{key:"HT Inferior · 520 × 420",name:"Inferior",size:"520 × 420"},{key:"Home Ticket XL · 520 × 856",name:"XL",size:"520 × 856"}];
function htCurrent(list){const t=localToday(),live=list.filter(r=>(r.status||"").toLowerCase()!=="finalizado");
 const act=live.filter(r=>(!r.startDate||r.startDate<=t)&&(!r.endDate||r.endDate>=t)).sort((a,b)=>String(b.startDate||"").localeCompare(String(a.startDate||"")))[0];
 const next=live.filter(r=>r.startDate&&r.startDate>t).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0];
 const last=[...list].sort((a,b)=>String(b.endDate||b.startDate||"").localeCompare(String(a.endDate||a.startDate||"")))[0];
 return {cur:act||next||last||null,next:act&&next?next:null}}
let htView="";
async function homeTicket(){
 const d=await api("/api/control?module=hometicket"),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const htSpaces=[...HOME_TICKET_SPACES,...new Set(rows.map(r=>r.venue).filter(v=>v&&!HOME_TICKET_SPACES.includes(v)))];
 const slot=(v,p)=>{const list=rows.filter(r=>r.venue===v&&r.position===p.key),{cur,next}=htCurrent(list);
  return '<div class="ht-slot'+(cur?"":" empty")+'"><div class="ht-slot-head"><b>'+p.name+'</b><span>'+p.size+'</span></div>'+
   (cur?'<div class="ht-body">'+(cur.assetKey?'<div class="media-preview ht-thumb" data-asset="'+esc(cur.assetKey)+'" data-module="hometicket" data-kind="image"></div>':'')+'<div class="ht-info"><h3>'+esc(cur.spectacle||"Sin espectáculo")+'</h3><div class="item-meta"><span>'+fdate(cur.startDate)+' → '+fdate(cur.endDate)+'</span>'+statusBadge(cur.materialStatus||"pendiente")+'</div>'+(next?'<p class="ht-next">Después: <b>'+esc(next.spectacle||"")+'</b> desde '+fdate(next.startDate)+'</p>':'')+'</div></div>'+
    '<div class="item-actions"><button type="button" data-edit-ht="'+cur.id+'">Editar</button><button type="button" data-new-ht="'+esc(v)+'|'+esc(p.key)+'">Cambiar</button></div>'
   :'<p class="muted">Sin pieza.</p><div class="item-actions"><button type="button" class="primary" data-new-ht="'+esc(v)+'|'+esc(p.key)+'">+ Añadir</button></div>')+'</div>'};
 const editId=new URLSearchParams(location.hash.split("?")[1]||"").get("edit"),editRow=editId&&rows.find(r=>r.id===editId);
 if(editRow)htView=editRow.venue;if(htView&&!htSpaces.includes(htView))htView="";
 const tabs='<div class="chip-row ht-tabs">'+htSpaces.map(v=>{const n=rows.filter(r=>r.venue===v&&activeNow(r)).length;return '<button type="button" class="chip'+(v===htView?" on":"")+'" data-ht-tab="'+esc(v)+'">'+esc(venueShort(v))+(n?' <span class="ht-count">'+n+'</span>':'')+'</button>'}).join("")+'</div>';
 const v=htView,mine=rows.filter(r=>r.venue===v);
 const grouped=!v?'':'<div class="ht-space" data-venue="'+esc(v)+'"><div class="section-title"><div><small class="section-kicker">Home Ticket</small><h2>'+esc(v)+'</h2></div><button type="button" class="primary" data-ht-all="'+esc(v)+'">Actualizar los tres</button></div>'+
  '<div class="ht-panel" data-ht-panel="'+esc(v)+'"></div><div class="ht-slots">'+HT_POS.map(p=>slot(v,p)).join("")+'</div>'+
  (mine.length?'<details class="ht-history"><summary>Historial ('+mine.length+')</summary><div class="list">'+htItems(mine)+'</div></details>':'')+'</div>';
 app.innerHTML=pageHead("Home Ticket","Tres huecos por espacio: Superior, Inferior y XL")+moduleKpis(rows,"Piezas activas")+'<section class="card">'+tabs+grouped+'</section>';
 $$("[data-ht-tab]").forEach(b=>b.onclick=()=>{htView=htView===b.dataset.htTab?"":b.dataset.htTab;homeTicket()});
 const panelOf=v=>$('[data-ht-panel="'+CSS.escape(v)+'"]');
 const open=(v,html,bind)=>{$$(".ht-panel").forEach(x=>x.innerHTML="");const p=panelOf(v);p.innerHTML='<div class="ht-form card">'+html+'</div>';bind(p);p.scrollIntoView({behavior:"smooth",block:"start"})};
 $$("[data-edit-ht]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editHt);if(!r)return;open(r.venue,htForm(r),()=>bindHTForm(r))});
 $$("[data-new-ht]").forEach(b=>b.onclick=()=>{const [v,pos]=b.dataset.newHt.split("|");open(v,htForm({venue:v,position:pos}),()=>bindHTForm(null))});
 $$("[data-ht-all]").forEach(b=>b.onclick=()=>{const v=b.dataset.htAll;open(v,htAllForm(v),()=>bindHTAll(v))});
 $$("[data-del-ht]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Quitar esta pieza?"))return;const _u="/api/control?module=hometicket&id="+b.dataset.delHt;await api(_u,{method:"DELETE"});sayUndo("Pieza quitada",_u,()=>homeTicket());homeTicket()});
 await hydrateMedia("hometicket");
}
function htItems(rows){return rows.length?[...rows].sort((a,b)=>String(b.startDate||"").localeCompare(String(a.startDate||""))).map(r=>'<div class="item"><div><h3>'+esc((HT_POS.find(p=>p.key===r.position)||{name:r.position||"Home Ticket"}).name)+' · '+esc(r.spectacle||"")+'</h3><div class="item-meta"><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span><span>Material: '+esc(r.materialStatus||"sin indicar")+'</span>'+(r.deliveryDate?'<span>Entrega: '+fdate(r.deliveryDate)+'</span>':'')+statusBadge(r.status)+'</div></div><div class="item-actions"><button data-edit-ht="'+r.id+'">Editar</button><button class="danger" data-del-ht="'+r.id+'">Quitar</button></div></div>').join(""):'<div class="notice">Todavía no hay piezas cargadas para este Home Ticket.</div>'}
function htForm(r={}){const pos=HT_POS.find(p=>p.key===r.position)||HT_POS[0];
 return '<div class="section-title"><div><small class="section-kicker">'+esc(venueShort(r.venue||""))+' · '+pos.name+' · '+pos.size+'</small><h2>'+(r.id?"Editar pieza":"Nueva pieza")+'</h2></div><button type="button" class="ghost" id="cancelHT">Cerrar</button></div>'+
  '<form id="htForm" class="form-grid"><input type="hidden" name="venue" value="'+esc(r.venue||"")+'"><input type="hidden" name="position" value="'+esc(pos.key)+'">'+
  '<label class="wide">Espectáculo<input name="spectacle" data-ac="spectacle" autocomplete="off" placeholder="Empieza a escribir y elige de la lista" value="'+esc(r.spectacle||"")+'" required></label>'+
  input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+
  '<label class="wide">Creatividad'+(r.assetKey?' (deja vacío para mantener la actual)':'')+'<input id="htAsset" type="file" accept="image/*"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label>'+
  '<div class="wide actions-row"><button class="primary" type="submit">Guardar</button>'+(r.id?'<button type="button" class="danger" data-del-ht="'+r.id+'">Quitar</button>':'')+'</div></form>'}
function htSaving(f,on){const b=f.querySelector('button[type="submit"]');if(b){b.disabled=on;b.textContent=on?"Guardando…":"Guardar"}}
function bindHTForm(existing){const f=$("#htForm");if(!f)return;$("#cancelHT").onclick=()=>{f.closest(".ht-panel").innerHTML=""};
 const del=f.querySelector("[data-del-ht]");if(del)del.onclick=async()=>{if(!confirm("¿Quitar esta pieza?"))return;const _u="/api/control?module=hometicket&id="+del.dataset.delHt;await api(_u,{method:"DELETE"});sayUndo("Pieza quitada",_u,()=>homeTicket());homeTicket()};
 f.onsubmit=async e=>{e.preventDefault();if(f.dataset.busy)return;f.dataset.busy="1";htSaving(f,true);const data=formObject(f),file=$("#htAsset")?.files?.[0];
  if(data.startDate&&data.endDate&&data.endDate<data.startDate){say("La fecha de fin no puede ser anterior al inicio");delete f.dataset.busy;htSaving(f,false);return}
  try{if(!existing)data.status="activo";const assetKey=await uploadAsset(file,"hometicket",existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}
   if(existing?.id)await api("/api/control?module=hometicket&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module=hometicket",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   say("Home Ticket guardado");homeTicket()}catch(err){say(err.message);delete f.dataset.busy;htSaving(f,false)}}}
// Actualizar los tres huecos de un Home Ticket de una vez (mismas fechas para los tres)
function htAllForm(v){return '<div class="section-title"><div><small class="section-kicker">'+esc(venueShort(v))+' · Superior, Inferior y XL</small><h2>Actualizar los tres</h2></div><button type="button" class="ghost" id="cancelHTAll">Cerrar</button></div>'+
 '<form id="htAllForm" class="form-grid">'+input("startDate","Inicio","","date")+input("endDate","Fin","","date")+input("deliveryDate","Fecha límite material","","date")+materialStatusSelect("pendiente")+
 HT_POS.map((p,i)=>'<div class="wide ht-all-row"><b>'+p.name+' <span>'+p.size+'</span></b><input name="spectacle_'+i+'" data-ac="spectacle" autocomplete="off" placeholder="Espectáculo (vacío si no cambia)"><label class="btn">Creatividad<input type="file" accept="image/*" data-ht-file="'+i+'" hidden></label><em data-ht-fname="'+i+'"></em></div>').join("")+
 '<p class="wide cart-legacy" style="margin:0">Solo se guardan los huecos con espectáculo. Los demás se quedan como están.</p><div class="wide actions-row"><button class="primary" type="submit">Guardar</button></div></form>'}
function bindHTAll(v){const f=$("#htAllForm");if(!f)return;$("#cancelHTAll").onclick=()=>{f.closest(".ht-panel").innerHTML=""};
 $$("[data-ht-file]",f).forEach(i=>i.onchange=()=>{const n=$('[data-ht-fname="'+i.dataset.htFile+'"]',f);if(n)n.textContent=i.files[0]?i.files[0].name:""});
 f.onsubmit=async e=>{e.preventDefault();if(f.dataset.busy)return;const d=formObject(f);const todo=HT_POS.map((p,i)=>({p,i,spectacle:(d["spectacle_"+i]||"").trim(),file:$('[data-ht-file="'+i+'"]',f).files[0]})).filter(x=>x.spectacle);
  if(!todo.length){say("Escribe al menos un espectáculo");return}if(d.startDate&&d.endDate&&d.endDate<d.startDate){say("La fecha de fin no puede ser anterior al inicio");return}
  f.dataset.busy="1";htSaving(f,true);
  try{for(const x of todo){const data={venue:v,position:x.p.key,spectacle:x.spectacle,startDate:d.startDate,endDate:d.endDate,deliveryDate:d.deliveryDate,materialStatus:d.materialStatus,status:"activo"};const k=await uploadAsset(x.file,"hometicket","");if(k){data.assetKey=k;data.assetName=x.file.name}
    await api("/api/control?module=hometicket",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)})}
   say(todo.length+(todo.length===1?" pieza guardada":" piezas guardadas"));homeTicket()}catch(err){say(err.message);delete f.dataset.busy;htSaving(f,false)}}}

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
 const done=r=>["recibido","entregado","listo"].includes(String(r.materialStatus||"").toLowerCase());
 // Miniatura por revista y mes; al tocarla se abre la ficha con la página en grande
 const cell=(mag,m)=>{const r=find(mag,m);if(!r)return '<button type="button" class="mag-cover empty" data-add-revista="'+esc(mag)+'|'+m+'"><span class="mag-img"><i>+</i></span><span class="mag-name">'+esc(mag)+'</span><span class="mag-show">Sin página</span></button>';
  return '<button type="button" class="mag-cover" data-mag-open="'+r.id+'"><span class="mag-img media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="revistas" data-kind="image"></span><span class="mag-name"><i class="mag-dot '+(done(r)?"ok":"warn")+'"></i>'+esc(mag)+'</span><span class="mag-show">'+esc(r.spectacle||"Sin espectáculo")+'</span></button>'};
 const grid='<div class="mag-head"><span></span>'+MAGAZINES.map(m=>'<span>'+esc(m)+'</span>').join("")+'</div>'+months.map(m=>'<div class="mag-month'+(m===cur?' current':'')+'" data-month="'+m+'"><div class="mag-label">'+esc(monthLabel(m))+'</div>'+MAGAZINES.map(mag=>cell(mag,m)).join("")+'</div>').join("");
 app.innerHTML=pageHead("Revistas de Teatros","Página de publicidad mensual en "+MAGAZINES.join(", ").replace(/, ([^,]*)$/," y $1"),'<button id="newRevista" class="primary">+ Nueva página</button>')+moduleKpis(rows,"Páginas este mes")+'<div class="grid two-col"><section class="card mag-calendar">'+grid+'</section><section class="card" id="revistasFormCard">'+revistaForm()+'</section></div>';
 magChips(months,cur);const openForm=r=>{$("#revistasFormCard").innerHTML=revistaForm(r);bindRevistaForm(r&&r.id?r:null,rows)};
 $("#newRevista").onclick=()=>openForm({month:cur});
 $$("[data-add-revista]").forEach(b=>b.onclick=()=>{const [magazine,month]=b.dataset.addRevista.split("|");openForm({magazine,month})});
 $$("[data-edit-revista]").forEach(b=>b.onclick=()=>openForm(rows.find(x=>x.id===b.dataset.editRevista)));
 $$("[data-mag-open]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.magOpen);if(r)magSheet(r,openForm)});
 $$("[data-del-revista]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Quitar esta página?"))return;const _u="/api/control?module=revistas&id="+b.dataset.delRevista;await api(_u,{method:"DELETE"});sayUndo("Página quitada",_u,()=>revistas());revistas()});
 bindRevistaForm(null,rows);await hydrateMedia("revistas");
}
function magSheet(r,openForm){
 const old=$("#magSheet");if(old)old.remove();const done=["recibido","entregado","listo"].includes(String(r.materialStatus||"").toLowerCase());
 const el=document.createElement("div");el.id="magSheet";el.className="mag-sheet";
 el.innerHTML='<div class="mag-sheet-box" role="dialog" aria-label="Página de revista"><button type="button" class="ghost mag-sheet-x" aria-label="Cerrar">×</button>'+
  '<div class="mag-sheet-img">'+(r.assetKey?'<span class="muted">Cargando…</span>':'<span class="muted">Sin imagen</span>')+'</div>'+
  '<div class="mag-sheet-info"><small class="section-kicker">'+esc(r.magazine||"")+' · '+esc(monthLabel(r.month||""))+'</small><h2>'+esc(r.spectacle||"Sin espectáculo")+'</h2>'+(r.venue?'<p class="muted">'+esc(r.venue)+'</p>':'')+
  '<div class="item-meta"><span class="badge '+(done?"ok":"warn")+'">'+esc(r.materialStatus||"pendiente")+'</span>'+(r.deliveryDate?'<span>Entrega: '+fdate(r.deliveryDate)+'</span>':'')+(r.contact?'<span>'+esc(r.contact)+'</span>':'')+'</div>'+(r.notes?'<p class="mag-sheet-notes">'+esc(r.notes)+'</p>':'')+
  '<div class="actions-row"><button type="button" class="primary" data-edit-revista="'+r.id+'">Editar</button><button type="button" class="danger" data-sheet-del>Quitar</button></div></div></div>';
 document.body.appendChild(el);document.body.classList.add("sheet-open");
 const close=()=>{el.remove();document.body.classList.remove("sheet-open");document.removeEventListener("keydown",esc_)};const esc_=e=>{if(e.key==="Escape")close()};document.addEventListener("keydown",esc_);
 el.onclick=e=>{if(e.target===el)close()};el.querySelector(".mag-sheet-x").onclick=close;
 el.querySelector("[data-edit-revista]").onclick=()=>{close();openForm(r)};
 el.querySelector("[data-sheet-del]").onclick=async()=>{if(!confirm("¿Quitar esta página?"))return;const _u="/api/control?module=revistas&id="+r.id;await api(_u,{method:"DELETE"});close();sayUndo("Página quitada",_u,()=>revistas());revistas()};
 if(r.assetKey)blobUrl(r.assetKey,"revistas").then(u=>{const box=el.querySelector(".mag-sheet-img");if(box)box.innerHTML=u?'<img src="'+u+'" alt="'+esc(r.spectacle||"Página")+'">':'<span class="muted">Sin imagen</span>'});
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
function renderSpectacleList(){if(ac.input&&document.activeElement===ac.input&&!ac.input.disabled)acShow(ac.input)}
// Desplegable propio: coincidencias desde el principio del título, sin distinguir mayúsculas ni tildes.
function acNorm(t){return String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/^[¡¿"'“”‘’#\s]+/,"").trim()}
const ac={box:null,input:null,items:[],idx:-1};
function acEnsure(){if(ac.box)return ac.box;const b=document.createElement("div");b.className="ac-box";b.setAttribute("role","listbox");document.body.appendChild(b);
 b.addEventListener("mousedown",e=>{const o=e.target.closest(".ac-opt");if(!o)return;e.preventDefault();acPick(o.dataset.v)});ac.box=b;return b}
function acPlace(){if(!ac.box||!ac.input)return;const r=ac.input.getBoundingClientRect(),vh=window.visualViewport?window.visualViewport.height:innerHeight;const below=vh-r.bottom-8,above=r.top-8;const up=below<180&&above>below;const max=Math.max(120,Math.min(320,(up?above:below)-4));Object.assign(ac.box.style,{left:r.left+"px",width:r.width+"px",maxHeight:max+"px",top:up?"auto":(r.bottom+4)+"px",bottom:up?(innerHeight-r.top+4)+"px":"auto"})}
if(window.visualViewport)visualViewport.addEventListener("resize",()=>acPlace());
function acShow(inp){ac.input=inp;const raw=inp.value.trim(),q=acNorm(raw);const b=acEnsure();
 const list=[...SPECTACLES].sort((a,b)=>a.localeCompare(b,"es"));
 // Sin texto: lista completa. Con texto: solo los que empiezan así.
 const items=q?list.filter(n=>acNorm(n).startsWith(q)):list;
 ac.items=items.slice(0,q?60:400);ac.idx=-1;
 if(!ac.items.length&&!SPECTACLES.size&&!q){acHide();return}
 b.innerHTML=ac.items.length?ac.items.map((n,i)=>{const pre=q&&acNorm(n).startsWith(q);return '<div class="ac-opt" role="option" data-i="'+i+'" data-v="'+esc(n)+'">'+(pre?'<b>'+esc(n.slice(0,raw.length))+'</b>'+esc(n.slice(raw.length)):esc(n))+'</div>'}).join(""):'<div class="ac-empty">No hay espectáculos que empiecen así. Se guardará como lo escribas.</div>';
 b.classList.add("show");b.scrollTop=0;acPlace()}
function acHide(){if(ac.box)ac.box.classList.remove("show");ac.idx=-1}
function acPick(v){const inp=ac.input;if(!inp)return;inp.value=v;acHide();ac.picking=true;inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}));ac.picking=false}
document.addEventListener("input",e=>{const t=e.target;if(t.matches&&t.matches('input[data-ac="spectacle"]')&&!t.disabled){if(ac.picking)return;acShow(t)}});
document.addEventListener("focusin",e=>{const t=e.target;if(t.matches&&t.matches('input[data-ac="spectacle"]')){loadSpectacles();if(!t.disabled)acShow(t)}});
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
 {key:"taquilla__secundario-1",view:"taquilla",name:"Columna 2",r:[19.06,40.06,13.54,27.90]},
 {key:"taquilla__taquilla-izq",view:"taquilla",name:"Taquilla izquierda cerrada",r:[35.77,40.79,11.67,26.89]},
 {key:"taquilla__taquilla-der",view:"taquilla",name:"Taquilla derecha cerrada",r:[50.97,40.70,11.05,26.98]},
 {key:"taquilla__secundario-2",view:"taquilla",name:"Columna 3",r:[66.02,40.06,12.50,27.81]},
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
   '<button type="button" id="cartShare">Compartir</button><button type="button" id="cartExport">Exportar vista PNG</button><button type="button" id="cartExportAll">Exportar todas PNG</button>'+(edit?'<button type="button" id="cartMontaje">Confirmar montaje</button><button type="button" class="primary" id="cartSave">Guardar cambios</button>':''))+
  '<div id="montajePanel"></div>'+
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
 $("#cartExport").onclick=()=>cartExport(false);$("#cartExportAll").onclick=()=>cartExportAll();
 $("#cartShare").onclick=()=>cartExport(true);
 if(edit){$("#cartSave").onclick=cartSave;$("#cartSave2").onclick=cartSave;$("#cartMontaje").onclick=()=>montajePanel();
  $("#cartFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(f)await cartSetFile(cart.sel,f)}}
 cartRender();
}

// ===================== CONFIRMAR MONTAJE =====================
// Marca soportes como instalados, adjunta la foto real y avisa por correo a los compañeros.
const montaje={sel:new Set(),photos:{},contacts:null,dest:{}};
function montajeCompress(file){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1400,k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",0.8))};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("No se ha podido leer la foto «"+file.name+"»"))};img.src=url})}
async function montajePanel(){
 const p=$("#montajePanel");if(!p)return;
 if(!montaje.contacts){try{const d=await api("/api/contacts");montaje.contacts=d.contacts||[];montaje.live=!!d.live;montaje.devTo=d.devRecipient||""}catch(e){say(e.message);return}montaje.contacts.forEach(c=>{if(!(c.email in montaje.dest))montaje.dest[c.email]="to"})}
 if(!montaje.sel.size&&cart.sel)montaje.sel.add(cart.sel);
 const groups=CART_VIEWS.map(v=>({v,slots:CART_SLOTS.filter(s=>s.view===v.id)})).filter(g=>g.slots.length);
 p.innerHTML='<section class="card montaje-card"><div class="section-title"><div><small class="section-kicker">Confirmar montaje</small><h2>¿Qué se ha montado?</h2></div><button type="button" class="ghost" id="mjClose">Cerrar</button></div>'+
  '<p class="muted" style="margin:0 0 12px">Marca los soportes cambiados y añade la foto real de cada uno. Al enviar, quedan como instalados con fecha de hoy y se avisa por correo.</p>'+
  groups.map(g=>'<div class="mj-group"><small class="chip-label">'+esc(g.v.name)+'</small>'+g.slots.map(s=>{const on=montaje.sel.has(s.key),t=cartSched(s.key).title;return '<div class="mj-slot'+(on?" on":"")+'"><label class="mj-check"><input type="checkbox" data-mj="'+s.key+'"'+(on?" checked":"")+'><span><b>'+esc(s.name)+'</b>'+(t?'<em>'+esc(t)+'</em>':'')+'</span></label>'+
   (on?'<div class="mj-photo">'+(montaje.photos[s.key]?'<img src="'+montaje.photos[s.key]+'" alt=""><button type="button" class="ghost" data-mj-del="'+s.key+'">Quitar foto</button>':'<label class="btn">Añadir foto<input type="file" accept="image/*" data-mj-file="'+s.key+'" hidden></label>')+'</div>':'')+'</div>'}).join("")+'</div>').join("")+
  '<label class="mj-note">Nota (opcional)<textarea id="mjNote" rows="3" placeholder="Ej.: Montado por la mañana sin incidencias.">'+esc(montaje.note||"")+'</textarea></label>'+
  '<div class="mj-dest"><div class="section-title" style="margin:6px 0 8px"><h3 style="margin:0">Destinatarios</h3><span class="muted" style="font-size:12px">Para · Copia · No</span></div>'+
  montaje.contacts.map(c=>'<div class="mj-person"><span><b>'+esc(c.name)+'</b><em>'+esc(c.email)+'</em></span><div class="seg">'+[["to","Para"],["cc","Copia"],["no","No"]].map(([v,l])=>'<button type="button" data-mj-dest="'+esc(c.email)+'" data-v="'+v+'" class="'+(montaje.dest[c.email]===v?"on":"")+'">'+l+'</button>').join("")+'</div></div>').join("")+'</div>'+
  '<p class="cart-legacy" style="margin:10px 0 0">'+(montaje.live?'El correo se enviará a las personas marcadas en Para y Copia.':'<b>Modo prueba:</b> el correo solo llega a '+esc(montaje.devTo||"fernando@yellowmedia.es")+' e indica a quién se habría enviado.')+'</p>'+
  '<div class="actions-row" style="margin-top:12px"><button type="button" class="primary" id="mjSend">Enviar confirmación</button></div><div id="mjResult"></div></section>';
 const keepNote=()=>{const n=$("#mjNote");if(n)montaje.note=n.value};
 $("#mjClose").onclick=()=>{p.innerHTML=""};
 $$("[data-mj]",p).forEach(c=>c.onchange=()=>{keepNote();c.checked?montaje.sel.add(c.dataset.mj):montaje.sel.delete(c.dataset.mj);montajePanel()});
 $$("[data-mj-file]",p).forEach(i=>i.onchange=async()=>{const f=i.files[0];if(!f)return;keepNote();try{montaje.photos[i.dataset.mjFile]=await montajeCompress(f);montajePanel()}catch(e){say(e.message)}});
 $$("[data-mj-del]",p).forEach(b=>b.onclick=()=>{keepNote();delete montaje.photos[b.dataset.mjDel];montajePanel()});
 $$("[data-mj-dest]",p).forEach(b=>b.onclick=()=>{keepNote();montaje.dest[b.dataset.mjDest]=b.dataset.v;montajePanel()});
 $("#mjSend").onclick=async()=>{
  keepNote();const keys=CART_SLOTS.filter(s=>montaje.sel.has(s.key)).map(s=>s.key);
  if(!keys.length){say("Marca al menos un soporte");return}
  if(cart.dirty.size){say("Guarda antes los cambios pendientes de Cartelería");return}
  const to=montaje.contacts.filter(c=>montaje.dest[c.email]==="to"),cc=montaje.contacts.filter(c=>montaje.dest[c.email]==="cc");
  if(!to.length){say("Elige al menos un destinatario en «Para»");return}
  const sinFoto=keys.filter(k=>!montaje.photos[k]).map(k=>cartSlot(k).name);
  if(!confirm("Confirmar montaje de: "+keys.map(k=>cartSlot(k).name).join(", ")+(sinFoto.length?"\n\nSin foto: "+sinFoto.join(", "):"")+"\n\nPara: "+to.map(c=>c.name).join(", ")+(cc.length?"\nCopia: "+cc.map(c=>c.name).join(", "):"")+(montaje.live?"":"\n\nMODO PRUEBA: el correo solo llegará a "+(montaje.devTo||"ti")+". No se enviará a nadie más.")+"\n\nLos soportes marcados quedarán como instalados con fecha de hoy.\n\n¿Enviar?"))return;
  const b=$("#mjSend");b.disabled=true;b.textContent="Enviando…";
  try{const r=await api("/api/montaje",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slots:keys.map(k=>({key:k,photo:montaje.photos[k]||""})),note:montaje.note||"",to:to.map(c=>c.email),cc:cc.map(c=>c.email)})});
   const msg=r.sent?(r.live?"Correo enviado a "+r.intendedTo.join(", ")+(r.intendedCc.length?" (copia: "+r.intendedCc.join(", ")+")":""):"Correo de prueba enviado solo a "+(r.sentTo||[]).join(", ")+". En producción iría a "+r.intendedTo.join(", ")+(r.intendedCc.length?" con copia a "+r.intendedCc.join(", "):"")+"."):"Soportes marcados como instalados, pero el correo no se ha enviado: "+(r.reason||"revisa la configuración de correo");
   montaje.sel.clear();montaje.photos={};montaje.note="";await cartLoad();await carteleria();
   const box=$("#montajePanel");if(box)box.innerHTML='<section class="card montaje-card"><div class="notice" style="text-align:left">'+esc(msg)+'</div></section>';say(r.sent?"Montaje confirmado":"Montaje guardado sin correo")}
  catch(e){say(e.message);b.disabled=false;b.textContent="Enviar confirmación"}};
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
// Todas las vistas en una sola imagen apaisada (proporción A4): Taquilla cerrada y Lona a la izquierda, Taquilla abierta y Columna 1 a la derecha
async function cartExportAll(){
 try{say("Preparando la imagen…");if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  const ims={};for(const v of CART_VIEWS)ims[v.id]=await cartLoadImg(await cartComposite(v.id,cart.night));
  const W=2339,H=1654,pad=56,gap=24,top=196,foot=60,avW=W-pad*2,avH=H-top-foot;
  const ar=id=>{const v=cartView(id);return v.w/v.h};const rT=ar("taquilla"),rL=ar("lona"),rA=ar("abierta"),rC=ar("columna");
  // altura común de la columna derecha (hR) y ancho de la izquierda (wL) para ocupar todo el ancho sin pasarse de alto
  const k=1/(1/rT+1/rL);let hR=(avW-gap*2+gap*k)/(rA+rC+k);if(hR>avH)hR=avH;const wL=(hR-gap)*k;
  const total=wL+gap+hR*rA+gap+hR*rC,x0=pad+(avW-total)/2,y0=top+(avH-hR)/2;
  const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.textBaseline="top";
  g.fillStyle="#FFFFFF";g.fillRect(0,0,W,H);g.fillStyle="#131313";g.fillRect(0,0,W,150);g.fillStyle="#FFD400";g.fillRect(0,150,W,8);
  const logo=await ycLogo(),lx0=logo?pad+136:pad;if(logo)g.drawImage(logo,pad,20,112,112);
  g.font="400 82px Anton, Impact, sans-serif";g.fillStyle="#FFD400";g.fillText("YELLOW CONTROL",lx0,36);const tw=g.measureText("YELLOW CONTROL").width;
  g.fillStyle="#F2EFE6";g.fillText("CARTELERÍA · GRAN TEATRO PAVÓN",lx0+tw+36,36);
  g.font="600 24px 'Plus Jakarta Sans', Arial";g.fillStyle="#aaa296";const info=(cart.night?"Noche":"Día")+" · "+new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});g.fillText(info,W-pad-g.measureText(info).width,70);
  const hT=wL/rT,hL=wL/rL;
  const place=[["taquilla",x0,y0,wL,hT],["lona",x0,y0+hT+gap,wL,hL],["abierta",x0+wL+gap,y0,hR*rA,hR],["columna",x0+wL+gap+hR*rA+gap,y0,hR*rC,hR]];
  for(const [id,x,y,w,h] of place){g.drawImage(ims[id],x,y,w,h);g.strokeStyle="#131313";g.lineWidth=2;g.strokeRect(x,y,w,h)}
  g.font="600 18px 'Plus Jakarta Sans', Arial";g.fillStyle="#8a8478";g.fillText("Yellow Media · generado el "+new Date().toLocaleDateString("es-ES"),pad,H-foot+18);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));const name="Pavon_carteleria_completa_"+new Date().toLocaleDateString("sv")+".png";
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  say("PNG descargado")}catch(e){say(e.message||"No se ha podido exportar")}}
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
function mailTestCard(){return '<section class="card" style="margin-top:14px"><div class="section-title"><div><small class="section-kicker">Avisos por correo</small><h2>Comprobar el correo</h2></div></div><p class="muted" style="margin:0 0 12px">Envía ahora el resumen diario (material pendiente y activo) sin esperar a las 9:00. En modo desarrollo solo se envía a fernando@yellowmedia.es.</p><div class="actions-row"><button type="button" id="mailStatus">Ver configuración</button><button type="button" class="primary" id="mailTest">Enviar correo de prueba</button></div><div id="mailResult" style="margin-top:12px"></div></section>'}
function bindMailTest(){const out=$("#mailResult");if(!out)return;
 const show=d=>{out.innerHTML=d.configured?'<div class="notice" style="text-align:left">Remitente: <b>'+esc(d.from||"—")+'</b><br>Para: <b>'+esc((d.to||[]).join(", ")||"—")+'</b>'+(d.cc&&d.cc.length?'<br>Copia: <b>'+esc(d.cc.join(", "))+'</b>':'')+(d.live?'':'<br><small>Modo desarrollo: los avisos solo llegan a esta dirección.</small>')+'</div>':'<div class="notice" style="text-align:left">El correo <b>no está configurado</b>. Faltan en Netlify: '+esc((d.missing||[]).join(", "))+'.</div>'};
 $("#mailStatus").onclick=async()=>{try{show(await api("/api/test-email"))}catch(e){say(e.message)}};
 $("#mailTest").onclick=async()=>{const b=$("#mailTest");b.disabled=true;b.textContent="Enviando…";try{const d=await api("/api/test-email",{method:"POST"});show(d);say(d.sent?"Correo enviado":"No se ha enviado: "+(d.reason||"revisa la configuración"))}catch(e){say(e.message)}finally{b.disabled=false;b.textContent="Enviar correo de prueba"}}}

async function hydrateMedia(moduleName){for(const el of $$('[data-module="'+moduleName+'"][data-asset]')){const k=el.dataset.asset;if(!k)continue;const u=await blobUrl(k,moduleName);if(!u)continue;if(el.dataset.kind==="audio"){el.innerHTML='';el.appendChild(yPlayer(u,el.dataset.name||""))}else el.innerHTML='<img src="'+u+'" alt="Creatividad">' }}

// Archivo: toda la publicidad de cada mes y los registros quitados, con opción de recuperarlos.
let arMonth="";
async function archivo(){
 const q=new URLSearchParams(location.hash.split("?")[1]||"").get("mes");if(q&&/^\d{4}-\d{2}$/.test(q))arMonth=q;
 const now=new Date(),cur=monthKey(now);if(!arMonth)arMonth=cur;
 const months=[...Array(7)].map((_,i)=>monthKey(new Date(now.getFullYear(),now.getMonth()-i,1)));if(!months.includes(arMonth))months.push(arMonth);
 const admin=roles().includes("admin"),edit=admin||roles().includes("gestion");
 const mods=edit?["radio","taxis","intercambiadores","hometicket","revistas","hitos"]:[];
 const [sum,...lists]=await Promise.all([api("/api/monthly?mes="+arMonth),...mods.map(m=>api("/api/control?module="+m+"&includeDeleted=1").catch(()=>({rows:[]})))]);
 const lim=new Date(Date.now()-120*864e5).toISOString();
 const removed=[];mods.forEach((m,i)=>(lists[i].rows||[]).filter(r=>r.deletedAt&&r.deletedAt>lim).forEach(r=>removed.push({m,r})));removed.sort((a,b)=>b.r.deletedAt.localeCompare(a.r.deletedAt));
 const short=m=>{const [y,mo]=m.split("-").map(Number);const t=new Date(y,mo-1,1).toLocaleDateString("es-ES",{month:"short"}).replace(".","");return t.charAt(0).toUpperCase()+t.slice(1)+" "+String(y).slice(2)};
 const chips='<div class="chip-row ar-months">'+months.map(m=>'<button type="button" class="chip'+(m===arMonth?" on":"")+'" data-ar="'+m+'">'+short(m)+(m===cur?' · en curso':'')+'</button>').join("")+'</div>';
 const kpis='<div class="kpi-row">'+sum.totals.map(t=>kpi(t.value,t.label)).join("")+'</div>';
 const cards='<div class="ar-grid">'+sum.sections.map(sec=>'<section class="card ar-card'+(sec.lines.length?'':' empty')+'"><div class="section-title"><div><small class="section-kicker">'+esc(sec.name)+'</small></div><span class="badge">'+sec.lines.length+'</span></div>'+
  (sec.lines.length?'<ul class="ar-list">'+sec.lines.map(l=>'<li><b>'+esc(l.title)+'</b><span>'+esc(l.detail||"")+'</span></li>').join("")+'</ul>':'<p class="muted" style="margin:0">Sin registros este mes.</p>')+'</section>').join("")+'</div>';
 const rem=removed.length?'<details class="card ar-removed"><summary>Registros quitados ('+removed.length+')</summary><p class="muted" style="margin:6px 0 10px">Lo que se ha quitado en los últimos cuatro meses. Puedes recuperarlo.</p><div class="list">'+removed.map(({m,r})=>'<div class="item"><div><h3>'+esc(modLabel(m))+' · '+esc(r.spectacle||r.title||r.campaignName||"Registro")+'</h3><div class="item-meta">'+(r.magazine?'<span>'+esc(r.magazine)+' · '+esc(monthLabel(r.month||""))+'</span>':'')+(r.venue?'<span>'+esc(r.venue)+'</span>':'')+'<span>Quitado el '+fdate(r.deletedAt.slice(0,10))+'</span></div></div><div class="item-actions"><button type="button" data-restore="'+m+'|'+r.id+'">Recuperar</button></div></div>').join("")+'</div></details>':'';
 app.innerHTML=pageHead("Archivo","Toda la publicidad de cada mes: fachada, Home Ticket, radio, taxis, intercambiadores, revistas y comunicación",admin?'<button type="button" id="arSend">Enviar resumen por correo</button>':'')+
  chips+'<h2 class="ar-title">'+esc(sum.label)+(arMonth===cur?' <em>mes en curso</em>':'')+'</h2>'+kpis+cards+rem+
  '<p class="cart-legacy" style="margin-top:14px">El día 1 de cada mes a las 9:00 llega por correo el resumen del mes anterior.</p>';
 $$("[data-ar]").forEach(b=>b.onclick=()=>{arMonth=b.dataset.ar;history.replaceState(null,"","#archivo");archivo()});
 $$("[data-restore]").forEach(b=>b.onclick=async()=>{const [m,id]=b.dataset.restore.split("|");try{await api("/api/control?module="+m+"&id="+id,{method:"PATCH"});say("Recuperado");archivo()}catch(e){say(e.message)}});
 const sb=$("#arSend");if(sb)sb.onclick=async()=>{sb.disabled=true;sb.textContent="Enviando…";try{const r=await api("/api/monthly?mes="+arMonth,{method:"POST"});say(r.sent?"Resumen enviado a "+(r.to||[]).join(", "):"No se ha enviado: "+(r.reason||"revisa el correo"))}catch(e){say(e.message)}finally{sb.disabled=false;sb.textContent="Enviar resumen por correo"}};
}

// ===================== IMPORTAR =====================
// Añade de una vez datos preparados fuera de la app (por ejemplo, por Claude a partir de una tabla
// pegada en el chat). Llega en el enlace #importar?d=<datos> o se pega en el cuadro. Siempre se
// muestra una vista previa y no se guarda nada hasta pulsar «Añadir».
const IMPORT_MODULES={hitos:"Calendario (hito)",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas",radio:"Radio"};
function importDecode(t){t=String(t||"").trim();if(!t)return null;try{if(t.startsWith("{")||t.startsWith("["))return JSON.parse(t);const b=t.replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(decodeURIComponent(escape(atob(b))))}catch{return null}}
function importItems(d){const list=Array.isArray(d)?d:(d&&d.items)||[];return list.filter(x=>x&&IMPORT_MODULES[x.module]&&((x.data&&typeof x.data==="object")||(x.op==="keepOnly"&&x.match)))}
function importLabel(x){if(x.op==="keepOnly")return x.label||"Dejar solo una";const r=x.data;if(x.module==="hitos"){const t=r.title||r.spectacle||"";return (t.toLowerCase().startsWith(String(r.type||"").toLowerCase())?t:(r.type||"Hito")+" · "+t)+" · "+fdate(r.date)+(r.time?" "+r.time:"")}return (r.spectacle||r.campaignName||r.magazine||"Registro")+" · "+[r.venue,r.position,r.magazine,r.month,r.startDate&&fdate(r.startDate)].filter(Boolean).join(" · ")}
async function importar(){
 const q=new URLSearchParams(location.hash.split("?")[1]||"").get("d");
 app.innerHTML=pageHead("Importar","Añade de una vez datos preparados: revisa la lista y pulsa Añadir")+'<section class="card"><div id="impBody"></div></section>';
 const body=$("#impBody");
 const show=async d=>{const items=importItems(d);if(!items.length){body.innerHTML='<p class="muted">No hay datos que importar. Pega aquí el bloque que te he preparado:</p><textarea id="impText" rows="6" style="width:100%"></textarea><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="impRead">Ver datos</button></div>';$("#impRead").onclick=()=>{const x=importDecode($("#impText").value);if(!x)say("No se entienden los datos pegados");else show(x)};return}
  // Duplicados: mismo módulo y mismos datos clave que un registro existente
  const mods=[...new Set(items.map(x=>x.module))],existing={};for(const m of mods){try{existing[m]=(await api("/api/control?module="+m)).rows||[]}catch{existing[m]=[]}}
  const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
  const dup=x=>!x.data?false:(existing[x.module]||[]).some(r=>x.module==="hitos"?norm(r.type)===norm(x.data.type)&&r.date===x.data.date&&(norm(r.title).includes(norm(x.data.spectacle))||norm(r.spectacle)===norm(x.data.spectacle)||norm(r.title)===norm(x.data.title)):norm(r.spectacle)===norm(x.data.spectacle)&&(r.startDate||"")===(x.data.startDate||"")&&(r.venue||"")===(x.data.venue||"")&&(r.month||"")===(x.data.month||"")&&(r.magazine||"")===(x.data.magazine||"")&&(r.position||"")===(x.data.position||"")&&(x.module!=="radio"||((r.contractId||"")===(x.data.contractId||"")&&(r.inventoryMonth||"")===(x.data.inventoryMonth||"")&&norm(r.spotName)===norm(x.data.spotName))));
  // Fusión: un registro preparado con «merge» sustituye a los que se solapan (mismo tipo, fechas cercanas, misma palabra clave)
  // y se queda con los datos de la versión más completa; los demás se quitan (recuperables en Archivo)
  const HF=["type","title","spectacle","date","time","venue","place","contact","responsable","reminder","link","notes","status"],filled=o=>HF.filter(k=>String(o[k]??"").trim()).length;
  const dayDiff=(a,b)=>Math.abs((new Date(a+"T12:00:00Z")-new Date(b+"T12:00:00Z"))/864e5);
  items.forEach(x=>{if(!x.merge||x.module!=="hitos")return;const key=norm(x.merge.key),days=Number(x.merge.days??2);
   x.matches=(existing.hitos||[]).filter(r=>norm(r.type)===norm(x.data.type)&&r.date&&x.data.date&&dayDiff(r.date,x.data.date)<=days&&norm((r.title||"")+" "+(r.spectacle||"")).includes(key));
   if(!x.matches.length)return;
   const cands=[{src:"import",d:x.data},...x.matches.map(r=>({src:r.id,d:r}))].sort((a,b)=>filled(b.d)-filled(a.d));
   const win=cands[0].d,out={};HF.forEach(k=>{const v=String(win[k]??"").trim()?win[k]:(cands.find(c=>String(c.d[k]??"").trim())||{d:{}}).d[k];if(v!=null&&String(v).trim())out[k]=v});
   x.merged=out;x.keepId=x.matches[0].id;x.dropIds=x.matches.slice(1).map(r=>r.id);
   x.same=x.matches.length===1&&HF.every(k=>String(x.matches[0][k]??"")===String(out[k]??""))});
  // «Dejar solo una»: de los registros activos que cumplen match se queda el que contiene «prefer» (o el más completo);
  // los demás se quitan (siguen recuperables en Archivo)
  for(const x of items.filter(x=>x.op==="keepOnly")){
   const fit=r=>Object.entries(x.match).every(([k,v])=>norm(r[k])===norm(v));
   const act=(existing[x.module]||[]).filter(r=>fit(r)&&!r.deletedAt);
   const score=r=>Object.values(r).filter(v=>String(v??"").trim()).length+(x.prefer&&norm(JSON.stringify(r)).includes(norm(x.prefer))?100:0);
   const keep=act.slice().sort((a,b)=>score(b)-score(a))[0];
   x.keep=keep;x.drop=act.filter(r=>r!==keep);
   x.fillData=keep?Object.fromEntries(Object.entries(x.fill||{}).filter(([k])=>!String(keep[k]??"").trim())):{};
   x.same=!x.drop.length&&!Object.keys(x.fillData).length;
   x.detail=keep?"Se queda: "+(keep.spectacle||x.fill?.spectacle||"sin espectáculo")+" · "+(keep.venue||x.fill?.venue||"")+(x.drop.length?" · quita "+x.drop.length:" · ya hay solo una"):"No hay ninguna página que cumpla"}
  body.innerHTML=(d.note?'<p class="muted" style="margin:0 0 10px">'+esc(d.note)+'</p>':'')+'<div class="list">'+items.map((x,i)=>{const dp=x.op==="keepOnly"||(x.matches&&x.matches.length)?!!x.same:dup(x);return '<label class="item imp-row'+(dp?" dup":"")+'"><input type="checkbox" data-imp="'+i+'"'+(dp?"":" checked")+'><div><h3>'+esc(importLabel(x))+'</h3><div class="item-meta"><span class="badge">'+esc(IMPORT_MODULES[x.module])+'</span>'+(x.detail?'<span>'+esc(x.detail)+'</span>':'')+(x.data&&x.data.venue?'<span>'+esc(x.data.venue)+'</span>':'')+(x.data&&x.data.spotName?'<span>'+esc(x.data.spotName)+'</span>':'')+(x.asset?'<span class="badge">Con audio</span>':'')+(dp?'<span class="badge warn">Ya existe</span>':'')+(x.matches&&x.matches.length&&!dp?'<span class="badge">'+(x.matches.length===1&&x.matches[0].date===x.data.date&&(x.matches[0].time||"")===(x.data.time||"")?"Completa":"Sustituye a")+': '+x.matches.map(r=>esc((r.title||r.type)+" · "+fdate(r.date)+(r.time?" "+r.time:""))).join(" / ")+'</span>':'')+'</div></div></label>'}).join("")+'</div>'+
   '<div class="actions-row" style="margin-top:12px"><button type="button" class="primary" id="impGo">Añadir seleccionados</button></div><div id="impRes"></div>';
  $("#impGo").onclick=async()=>{const sel=$$("[data-imp]").filter(c=>c.checked).map(c=>items[+c.dataset.imp]);if(!sel.length){say("No hay nada seleccionado");return}
   const b=$("#impGo");b.disabled=true;b.textContent="Añadiendo…";let ok=0;const errs=[];
   for(const x of sel){try{
     if(x.op==="keepOnly"){if(x.keep&&Object.keys(x.fillData).length)await api("/api/control?module="+x.module+"&id="+x.keep.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(x.fillData)});
      for(const r of x.drop)await api("/api/control?module="+x.module+"&id="+r.id,{method:"DELETE"});ok++;continue}
     const data={...x.data};
     // Archivo adjunto preparado (p. ej. el audio de una cuña): se descarga de la propia web y se sube a la biblioteca
     if(x.asset&&x.asset.url){const fr=await fetch(x.asset.url,{cache:"no-cache"});if(!fr.ok)throw new Error("no se ha podido leer el archivo "+(x.asset.name||""));const bl=await fr.blob();const file=new File([bl],x.asset.name||"archivo",{type:x.asset.type||bl.type||"application/octet-stream"});data.assetKey=await uploadAsset(file,x.module);data.assetName=file.name}
     if(x.keepId){await api("/api/control?module="+x.module+"&id="+x.keepId,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(x.merged)});for(const id of x.dropIds)await api("/api/control?module="+x.module+"&id="+id,{method:"DELETE"});ok++;continue}
     await api("/api/control?module="+x.module,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});ok++}catch(e){errs.push(importLabel(x)+": "+e.message)}}
   history.replaceState(null,"","#importar");
   $("#impRes").innerHTML='<div class="notice" style="margin-top:12px;text-align:left">'+ok+(ok===1?" registro añadido o actualizado.":" registros añadidos o actualizados.")+(sel.some(x=>(x.dropIds&&x.dropIds.length)||(x.drop&&x.drop.length))?" Lo que se ha quitado queda en Archivo, en «Registros quitados».":"")+(errs.length?'<br>No se han podido añadir: '+errs.map(esc).join("<br>"):'')+'</div><div class="actions-row" style="margin-top:10px"><a class="btn primary" href="#'+(sel.some(x=>x.module==="hitos")?"calendario":sel[0].module)+'">'+(sel.some(x=>x.module==="hitos")?"Ver el Calendario":"Ver "+esc(IMPORT_MODULES[sel[0].module]))+'</a></div>';
   b.textContent="Hecho";say(ok+" añadidos")}};
 show(importDecode(q));
}

// ===================== CALENDARIO =====================
const HITO_TYPES=["Estreno","Nota de prensa","Newsletter","Rueda de prensa","Pase gráfico","Entrevista / medios","Reunión","Cierre de edición","Evento","Otro"];
const HITO_REMINDERS=[["","Por defecto"],["none","Sin aviso"],["15m","15 minutos antes"],["1h","1 hora antes"],["1d","1 día antes"],["2d","2 días antes"]];
const KIND_LABEL={montaje:"Montaje",retirada:"Retirada",inicio:"Inicio",fin:"Fin",entrega:"Entrega",hito:"Hito"};
// Identidad por recinto: color de franja (claro / oscuro) y etiqueta con siglas en sus colores de marca
const VENUE_STYLE={
 "Gran Teatro Pavón":{tag:"PAVÓN",bg:"#1E1E1E",fg:"#FFD968",line:"#1E1E1E",dark:"#FFD968"},
 "Gran Teatro CaixaBank Príncipe Pío":{tag:"P. PÍO",bg:"#1F5FBF",fg:"#FFFFFF",line:"#1F5FBF",dark:"#5B93EA"},
 "Teatro Serrano":{tag:"SERRANO",bg:"#1E8C5A",fg:"#FFFFFF",line:"#1E8C5A",dark:"#4CC08A"},
 "Gran Castillo de Pedraza":{tag:"CASTILLO",bg:"#7A4E2D",fg:"#FFFFFF",line:"#7A4E2D",dark:"#C08A5C"},
 "Abono Teatro":{tag:"ABT",bg:"#B32745",fg:"#FFCD35",line:"#B32745",dark:"#E0506E"},
 "Soho City Madrid":{tag:"SOHO",bg:"#1B2A4A",fg:"#C9A24B",line:"#1B2A4A",dark:"#C9A24B"}};
const VENUE_NONE={tag:"YM",bg:"#6b665d",fg:"#FFFFFF",line:"#8a8478",dark:"#aaa296"};
// El título manda cuando la campaña es de otro recinto (p. ej. la cuña de Abonoteatro va en el contrato de Príncipe Pío)
const venueOf=e=>{const t=String(e&&e.title||"").toLowerCase();if(/abono ?teatro/.test(t))return "Abono Teatro";if(/\bpav[oó]n\b/.test(t)&&!(e.venue in VENUE_STYLE&&e.venue==="Gran Teatro Pavón"))return "Gran Teatro Pavón";return e&&e.venue||""};
const venueStyle=e=>VENUE_STYLE[venueOf(e)]||VENUE_NONE;
// Plataforma de la newsletter (se deduce del lugar, las notas o el enlace)
const nlPlatform=e=>{if(!e||!/newsletter/i.test(e.action||""))return null;const t=((e.location||"")+" "+(e.notes||"")+" "+(e.link||"")).toLowerCase();
 if(/brevo|sendinblue|sendibt/.test(t))return{tag:"BREVO",bg:"#0B996E",fg:"#FFFFFF"};if(/mailchimp|mailchi\.mp|list-manage/.test(t))return{tag:"MAILCHIMP",bg:"#FFE01B",fg:"#241C15"};return null};
const venueChip=(e,cls="vchip")=>{const v=venueStyle(e),nl=nlPlatform(e);return '<i class="'+cls+'" style="background:'+v.bg+';color:'+v.fg+'">'+esc(v.tag)+'</i>'+(nl?'<i class="'+cls+'" style="background:'+nl.bg+';color:'+nl.fg+'">'+nl.tag+'</i>':'')};
const venueLegend=list=>{const seen=[...new Set(list.map(e=>VENUE_STYLE[venueOf(e)]?venueOf(e):""))];return seen.map(v=>[v||"Interno / otros",VENUE_STYLE[v]||VENUE_NONE])};
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
function calEvBtn(e,wide){const v=venueStyle(e);
 return '<button type="button" class="event k-'+e.kind+(e.auto?" auto":" manual")+(wide?" wide":"")+'" data-ev="'+esc(e.id)+'" style="--v:'+v.line+';--vd:'+v.dark+'">'+
  '<em>'+venueChip(e)+esc(evTag(e))+(e.moduleKey==="hitos"?"":" · "+esc(e.module))+'</em><strong>'+esc((e.time?e.time+" · ":"")+e.title)+'</strong>'+(e.location?'<span>'+esc(e.location)+'</span>':'')+'</button>'}
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
  '<button type="button" id="calSub">Suscribirme</button><button type="button" id="calWeek">Compartir semana</button><button type="button" id="calMonth">Imprimir mes</button>'+(calCanHito()?'<button type="button" class="primary" id="calNewHito">+ Nuevo hito</button>':''))+
  '<div id="calPanel"></div>'+
  '<div class="card cal-card">'+filters+
  '<div class="calendar-toolbar"><button id="calPrev" aria-label="Anterior">‹</button><div class="cal-now"><strong>'+esc(label)+'</strong><button type="button" class="ghost" id="calToday">Hoy</button></div><button id="calNext" aria-label="Siguiente">›</button>'+views+'</div>'+
  '<div class="cal-legend cal-venues">'+[...Object.entries(VENUE_STYLE),["Interno / otros",VENUE_NONE]].map(([k,v])=>'<span><b class="vchip" style="background:'+v.bg+';color:'+v.fg+'">'+esc(v.tag)+'</b>'+esc(k)+'</span>').join("")+'<span><b class="vchip" style="background:#FFE01B;color:#241C15">MAILCHIMP</b><b class="vchip" style="background:#0B996E;color:#fff">BREVO</b>Newsletter</span></div>'+
  body+'</div>';
 const move=dir=>{if(calView==="semana")calWeekOffset+=dir;else calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+dir,1);renderCalendar()};
 $("#calPrev").onclick=()=>move(-1);$("#calNext").onclick=()=>move(1);
 $("#calToday").onclick=()=>{calWeekOffset=0;calCursor=new Date();renderCalendar()};
 $$(".seg [data-view]").forEach(b=>b.onclick=()=>{calView=b.dataset.view;calLS.set("yc-cal-view",calView);renderCalendar()});
 $$(".cal-filters [data-mod]").forEach(b=>b.onclick=()=>{const k=b.dataset.mod;if(!k)calMods.clear();else if(calMods.has(k))calMods.delete(k);else calMods.add(k);renderCalendar()});
 $("#calVenue").onchange=e=>{calVenue=e.target.value;renderCalendar()};
 $(".cal-card").addEventListener("click",e=>{const b=e.target.closest("[data-ev]");if(!b)return;const x=calEvents.find(y=>y.id===b.dataset.ev);if(x)calDetail(x)});
 $("#calSub").onclick=()=>calSubscribe();$("#calWeek").onclick=()=>calWeekPanel();$("#calMonth").onclick=()=>{if(calView==="semana"){const d=calWeekOffset?weekRange(calWeekOffset)[3]:new Date();calCursor=new Date(d.getFullYear(),d.getMonth(),1)}calMonthPanel()};
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
  (e.assetKey?'<div class="media-preview hito-thumb" data-asset="'+esc(e.assetKey)+'" data-module="hitos" data-kind="image"></div>':'')+
  '<dl class="cal-dl">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd>').join("")+'</dl>'+
  ((canOpen||(/^https?:\/\//i.test(String(e.link||""))))?'<div class="actions-row">'+(canOpen?'<button type="button" class="primary" id="dtOpen">'+(e.kind==="hito"&&calCanHito()?"Editar hito":"Abrir ficha")+'</button>':'')+((/^https?:\/\//i.test(String(e.link||"")))?'<a class="btn" href="'+esc(e.link)+'" target="_blank" rel="noopener">Ver newsletter / informe</a>':'')+'</div>':''));
 $("#dtClose").onclick=()=>calPanel("");
 if(canOpen)$("#dtOpen").onclick=()=>calOpen(e);
 if(e.assetKey)hydrateMedia("hitos");
}
function calOpen(e){
 if(e.kind==="hito"){api("/api/control?module=hitos").then(d=>{const r=(d.rows||[]).find(x=>x.id===e.recordId);calHitoForm(r||{})}).catch(x=>say(x.message));return}
 if(e.moduleKey==="carteleria"){location.hash="#carteleria?soporte="+encodeURIComponent(e.slotKey||"");return}
 location.hash="#"+e.moduleKey+"?edit="+encodeURIComponent(e.recordId||"");
}
function openEditFromHash(){const p=new URLSearchParams(location.hash.split("?")[1]||"");const id=p.get("edit");if(!id)return;
 const sel=["campaign","radio","ht","revista"].map(k=>'[data-edit-'+k+'="'+CSS.escape(id)+'"]').join(",")+',[data-mag-open="'+CSS.escape(id)+'"]';const b=document.querySelector(sel);
 if(b){const sp=b.closest(".space-panel,.ht-space,.mag-month");if(sp&&sp.style.display==="none")sp.style.display="";const dt=b.closest("details");if(dt)dt.open=true;const item=b.closest(".item,.mag-cell,.space-panel,.ht-space");
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
  '<label class="wide">Enlace<input type="url" name="link" value="'+esc(r.link||"")+'" placeholder="https://… (Brevo, noticia, dossier, etc.)"'+dis+'></label>'+
  '<label class="wide">Miniatura<input id="hitoAsset" type="file" accept="image/*"'+dis+'>'+(r.assetName?'<small class="muted">Actual: '+esc(r.assetName)+'</small>':'')+'</label>'+
  '<label class="wide">Notas<textarea name="notes"'+dis+'>'+esc(r.notes||"")+'</textarea></label>'+
  '<p class="cart-legacy wide" style="margin:0">El aviso llega a quien esté suscrito al calendario. Por defecto: una hora antes si tiene hora; si no, el día anterior a las 9:00.</p>'+
  (edit?'<div class="wide actions-row"><button class="primary" type="submit">Guardar hito</button>'+(r.id?'<button type="button" class="danger" id="hitoDel">Quitar</button>':'')+'</div>':'')+'</form>');
 $("#hitoClose").onclick=()=>calPanel("");loadSpectacles();
 if(!edit)return;
 $("#hitoForm").onsubmit=async ev=>{ev.preventDefault();const data=formObject(ev.target),file=$("#hitoAsset")?.files?.[0];try{
  const assetKey=await uploadAsset(file,"hitos",r.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||r.assetName||""}
  if(r.id)await api("/api/control?module=hitos&id="+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  else await api("/api/control?module=hitos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  say("Hito guardado");if(data.date){const [yy,mm,dd]=data.date.split("-").map(Number);calCursor=new Date(yy,mm-1,1);const w0=weekRange(0)[0];calWeekOffset=Math.floor((new Date(yy,mm-1,dd)-w0)/(7*864e5))}calendario()}catch(e){say(e.message)}};
 if(r.id)$("#hitoDel").onclick=async()=>{if(!confirm("¿Quitar este hito?"))return;try{const _u="/api/control?module=hitos&id="+r.id;await api(_u,{method:"DELETE"});sayUndo("Hito quitado",_u,()=>calendario());calendario()}catch(e){say(e.message)}};
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
function calWeekCanvas(days,ev,title,logo){
 const W=1080,pad=64,ROW=92,DAY=78;const rows=[];days.forEach(d=>{const de=ev.filter(e=>e.date===isoOf(d));if(de.length){rows.push({day:d});de.forEach(e=>rows.push({e}))}});
 const content=rows.reduce((a,r)=>a+(r.day?DAY:ROW+(r.e.location?22:0)),0);
 const H=Math.max(1350,300+content+140);
 const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
 g.fillStyle="#131313";g.fillRect(0,0,W,H);g.fillStyle="#FFD400";g.fillRect(0,0,W,12);
 g.textBaseline="top";if(logo)g.drawImage(logo,pad,52,100,100);g.font="400 76px Anton, Impact, sans-serif";g.fillStyle="#FFD400";g.fillText("YELLOW CONTROL",logo?pad+124:pad,64);
 g.font="700 34px 'Plus Jakarta Sans', Arial";g.fillStyle="#F2EFE6";g.fillText("Semana · "+title,pad,160);
 g.font="600 22px 'Plus Jakarta Sans', Arial";g.fillStyle="#aaa296";g.fillText(ev.length+(ev.length===1?" fecha":" fechas")+(calVenue?" · "+calVenue:""),pad,210);
 let y=280;if(!rows.length){g.fillStyle="#aaa296";g.font="600 30px 'Plus Jakarta Sans', Arial";g.fillText("Sin fechas esta semana",pad,y)}
 const clip=(t,max)=>{if(g.measureText(t).width<=max)return t;while(t.length&&g.measureText(t+"…").width>max)t=t.slice(0,-1);return t+"…"};
 for(const r of rows){if(r.day){y+=14;g.font="400 40px Anton, Impact, sans-serif";g.fillStyle="#F2EFE6";g.fillText(r.day.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}).toUpperCase(),pad,y);y+=DAY-14;continue}
  const e=r.e,h=ROW-20+(e.location?22:0),vs=venueStyle(e);g.fillStyle=vs.dark;g.fillRect(pad,y,7,h);
  g.font="800 17px 'Plus Jakarta Sans', Arial";let cx=pad+26;for(const ch of [vs,nlPlatform(e)].filter(Boolean)){const tw=g.measureText(ch.tag).width+16;g.fillStyle=ch.bg;g.fillRect(cx,y,tw,24);if(ch===vs&&vs.bg==="#1E1E1E"){g.strokeStyle=vs.fg;g.lineWidth=1.5;g.strokeRect(cx+.75,y+.75,tw-1.5,22.5)}g.fillStyle=ch.fg;g.fillText(ch.tag,cx+8,y+4);cx+=tw+8}
  g.font="800 19px 'Plus Jakarta Sans', Arial";g.fillStyle="#aaa296";g.fillText((evTag(e)+(e.moduleKey==="hitos"?"":" · "+e.module)).toUpperCase(),cx+4,y+2);
  g.font="700 29px 'Plus Jakarta Sans', Arial";g.fillStyle="#F2EFE6";g.fillText(clip((e.time?e.time+"  ":"")+e.title,W-pad*2-30),pad+26,y+28);
  if(e.location){g.font="500 21px 'Plus Jakarta Sans', Arial";g.fillStyle="#aaa296";g.fillText(clip(e.location,W-pad*2-30),pad+26,y+66)}
  y+=ROW+(e.location?22:0)}
 g.font="600 18px 'Plus Jakarta Sans', Arial";g.fillStyle="#6b665d";g.fillText("Yellow Media · generado el "+new Date().toLocaleDateString("es-ES"),pad,H-60);
 return c}
async function calWeekExport(days,ev,title){
 try{if(document.fonts&&document.fonts.ready)await document.fonts.ready;const c=calWeekCanvas(days,ev,title,await ycLogo());const blob=await new Promise(r=>c.toBlob(r,"image/png"));const name="Yellow_semana_"+isoOf(days[0])+".png";const file=new File([blob],name,{type:"image/png"});
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Semana · "+title});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  say("Imagen descargada")}catch(e){if(e&&e.name==="AbortError")return;say(e.message||"No se ha podido exportar")}}
// PDF A4: documento imprimible en claro, legible en papel y en pantalla
function calWeekPdf(days,ev,title){
 const w=window.open("","_blank");if(!w){say("Permite las ventanas emergentes para generar el PDF");return}
 const body=days.map(d=>{const de=ev.filter(e=>e.date===isoOf(d));return '<section><h2>'+esc(cap(d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})))+'</h2>'+
  (de.length?de.map(e=>'<div class="ev" style="border-color:'+venueStyle(e).line+'"><small>'+venueChip(e,"vc")+esc(evTag(e)+(e.moduleKey==="hitos"?"":" · "+e.module))+'</small><b>'+esc((e.time?e.time+" · ":"")+e.title)+'</b>'+(e.location?'<span>'+esc(e.location)+'</span>':'')+(e.responsable?'<span>Responsable: '+esc(e.responsable)+'</span>':'')+'</div>').join(""):'<p class="none">Sin fechas</p>')+'</section>'}).join("");
 w.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><title>Yellow Control · Semana '+esc(title)+'</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:13px/1.35 "Plus Jakarta Sans",Arial,sans-serif;color:#131313;margin:0}'+
  'header{border-top:6px solid #FFD400;padding-top:10px;margin-bottom:14px}header h1{font:400 30px Anton,Impact,sans-serif;letter-spacing:.02em;margin:0}header p{margin:4px 0 0;color:#555}'+
  'section{break-inside:avoid;margin:0 0 10px;padding-top:8px;border-top:1px solid #ddd}h2{font-size:14px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}'+
  '.ev{border-left:4px solid;padding:3px 0 3px 9px;margin:0 0 6px}.vc{display:inline-block!important;font-style:normal;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;margin-right:5px;letter-spacing:.04em}.ev small{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#666}.ev b{display:block;font-size:14px}.ev span{display:block;color:#555;font-size:12px}.none{color:#999;margin:0}footer{margin-top:16px;color:#999;font-size:10px}</style>'+
  '<header><h1><img src="'+location.origin+'/yellow-app-icon-180.png?v=3" alt="" style="height:34px;width:34px;vertical-align:-6px;margin-right:10px">YELLOW CONTROL</h1><p>Semana · '+esc(title)+' · '+ev.length+(ev.length===1?" fecha":" fechas")+(calVenue?" · "+esc(calVenue):"")+'</p></header>'+body+'<footer>Yellow Media · generado el '+new Date().toLocaleDateString("es-ES")+'</footer><script>window.onload=()=>setTimeout(()=>print(),250)<\/script></html>');
 w.document.close()}

// Logo de la app para las exportaciones (se carga una vez)
let ycLogoP=null;const ycLogo=()=>ycLogoP||(ycLogoP=cartLoadImg("/yellow-app-icon-512.png").catch(()=>null));
// Mes completo en A4 horizontal: PDF para imprimir o PNG apaisado, con los módulos a elegir
function calMonthData(y,m){const n=new Date(y,m+1,0).getDate(),offset=(new Date(y,m,1).getDay()+6)%7,cells=[];
 for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=n;d++)cells.push(new Date(y,m,d));while(cells.length%7)cells.push(null);
 const weeks=[];for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));return weeks}
const CAL_WD=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
function calMonthPanel(){
 const avail=CAL_MODS.filter(([k])=>calEvents.some(e=>e.moduleKey===k));
 if(!calShareMods)calShareMods=new Set(calMods.size?[...calMods]:avail.map(([k])=>k));
 const y=calCursor.getFullYear(),m=calCursor.getMonth(),key=y+"-"+String(m+1).padStart(2,"0"),title=cap(calCursor.toLocaleDateString("es-ES",{month:"long",year:"numeric"}));
 const ev=calFiltered(calShareMods).filter(e=>String(e.date).startsWith(key)).sort((a,b)=>(a.date+(a.time||"99")).localeCompare(b.date+(b.time||"99")));
 const t=new Date(),opts=[-1,0,1,2].map(o=>{const d=new Date(t.getFullYear(),t.getMonth()+o,1);return [d,cap(d.toLocaleDateString("es-ES",{month:"long"}))]});
 calPanel('<div class="section-title"><div><small class="section-kicker">Imprimir mes · A4 horizontal</small><h2>'+esc(title)+'</h2></div><button type="button" class="ghost" id="mnClose">Cerrar</button></div>'+
  '<div class="chip-row" style="margin-bottom:8px"><span class="chip-label">Mes</span><button type="button" class="chip" data-mo="-1">‹</button>'+opts.map(([d,l])=>'<button type="button" class="chip'+(d.getFullYear()===y&&d.getMonth()===m?" on":"")+'" data-md="'+d.getFullYear()+'-'+d.getMonth()+'">'+esc(l)+'</button>').join("")+'<button type="button" class="chip" data-mo="1">›</button></div>'+
  '<div class="chip-row" style="margin-bottom:12px"><span class="chip-label">Incluir</span>'+(avail.length?avail.map(([k,l])=>'<button type="button" class="chip'+(calShareMods.has(k)?" on":"")+'" data-sm="'+k+'"><span class="dot"></span>'+l+'</button>').join(""):'<span class="muted">Aún no hay fechas</span>')+'</div>'+
  (calVenue?'<p class="cart-legacy" style="margin:0 0 10px">Solo '+esc(calVenue)+' (filtro activo en el calendario).</p>':'')+
  '<p class="muted" style="margin:0 0 10px">'+ev.length+(ev.length===1?" fecha":" fechas")+' en '+esc(title.toLowerCase())+'.</p>'+
  '<div class="actions-row"><button type="button" class="primary" id="mnPdf">Imprimir / PDF A4 horizontal</button><button type="button" id="mnPng">Imagen PNG horizontal</button></div>'+
  '<p class="cart-legacy" style="margin-top:8px">«Imprimir» abre el cuadro de impresión ya en horizontal; para PDF elige «Guardar como PDF». Si hay muchas fechas, el texto se ajusta para que quepa en una sola hoja.</p>');
 $("#mnClose").onclick=()=>calPanel("");
 $$("#calPanel [data-mo]").forEach(c=>c.onclick=()=>{calCursor=new Date(y,m+(+c.dataset.mo),1);if(calView==="mes")renderCalendar();calMonthPanel()});
 $$("#calPanel [data-md]").forEach(c=>c.onclick=()=>{const [yy,mm]=c.dataset.md.split("-").map(Number);calCursor=new Date(yy,mm,1);if(calView==="mes")renderCalendar();calMonthPanel()});
 $$("#calPanel [data-sm]").forEach(c=>c.onclick=()=>{const k=c.dataset.sm;calShareMods.has(k)?calShareMods.delete(k):calShareMods.add(k);calMonthPanel()});
 $("#mnPdf").onclick=()=>calMonthPdf(y,m,ev,title);$("#mnPng").onclick=()=>calMonthPng(y,m,ev,title);
}
function calMonthPdf(y,m,ev,title){
 const w=window.open("","_blank");if(!w){say("Permite las ventanas emergentes para imprimir");return}
 const today=localToday(),weeks=calMonthData(y,m);
 const cell=d=>{if(!d)return '<td class="out"></td>';const iso=isoOf(d),de=ev.filter(e=>e.date===iso),we=d.getDay()===0||d.getDay()===6;
  return '<td class="'+(we?"we":"")+(iso===today?" today":"")+'"><div class="n">'+d.getDate()+'</div>'+de.map(e=>'<div class="ev" style="border-color:'+venueStyle(e).line+'"><small>'+venueChip(e,"vc")+esc(evTag(e)+(e.moduleKey==="hitos"?"":" · "+e.module))+'</small><b>'+esc((e.time?e.time+" · ":"")+e.title)+'</b>'+(e.location?'<span>'+esc(e.location)+'</span>':'')+'</div>').join("")+'</td>'};
 const legend=venueLegend(ev).map(([k,v])=>'<span><b class="vc" style="background:'+v.bg+';color:'+v.fg+'">'+esc(v.tag)+'</b>'+esc(k)+'</span>').join("");
 w.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><title>Yellow Control · '+esc(title)+'</title><style>'+[["Anton",400,"anton-400"],["Plus Jakarta Sans",500,"jakarta-500"],["Plus Jakarta Sans",700,"jakarta-700"],["Plus Jakarta Sans",800,"jakarta-800"]].map(([f,wt,n])=>'@font-face{font-family:"'+f+'";font-weight:'+wt+';src:url('+location.origin+'/assets/fonts/'+n+'.woff2) format("woff2")}').join("")+'@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0}body{font:9px/1.25 "Plus Jakarta Sans",Arial,sans-serif;color:#131313;width:281mm}'+
  'header{display:flex;align-items:flex-end;justify-content:space-between;border-top:5px solid #FFD400;padding-top:5px;margin-bottom:5px}header h1{font:400 24px Anton,Impact,sans-serif;letter-spacing:.02em;margin:0;line-height:1}header h1 em{font-style:normal;color:#131313;background:#FFD400;padding:0 6px;margin-left:8px}header p{margin:0;color:#555;font-size:10px;text-align:right}'+
  '.lg{display:flex;gap:10px;margin:0 0 5px;color:#555;font-size:8.5px}.lg i{display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:4px;vertical-align:-1px}'+
  'table{width:100%;border-collapse:collapse;table-layout:fixed}th{font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;text-align:left;padding:3px 4px;background:#131313;color:#FFD400}th.we{color:#d8d3c6}'+
  'td{border:1px solid #cfcac0;vertical-align:top;padding:3px 3px 2px;height:30mm}td.out{background:#f3f1ec}td.we{background:#fbfaf6}td.today .n{background:#FFD400;border-radius:3px;padding:0 3px}.n{font:400 13px Anton,Impact,sans-serif;display:inline-block;margin-bottom:2px}'+
  '.ev{border-left:3px solid;padding:0 0 0 4px;margin:0 0 3px;break-inside:avoid}.vc{display:inline-block!important;font-style:normal;font-size:6.3px;font-weight:800;padding:0 3px;border-radius:2px;margin-right:3px;letter-spacing:.04em}.lg span{display:inline-flex;align-items:center}.ev small{display:block;font-size:6.8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#666}.ev b{display:block;font-size:8.3px;font-weight:700}.ev span{display:block;color:#666;font-size:7.3px}footer{margin-top:4px;color:#999;font-size:7.5px}</style>'+
  '<header><h1><img src="'+location.origin+'/yellow-app-icon-180.png?v=3" alt="" style="height:30px;width:30px;vertical-align:-5px;margin-right:8px">YELLOW CONTROL<em>'+esc(title.toUpperCase())+'</em></h1><p>'+(calVenue==="Gran Teatro Pavón"?'<img src="'+location.origin+'/assets/venues/altos-pavon.png" alt="" style="height:38px;display:block;margin:0 0 3px auto;filter:brightness(0)">':'')+ev.length+(ev.length===1?" fecha":" fechas")+(calVenue?" · "+esc(calVenue):"")+'</p></header>'+(legend?'<div class="lg">'+legend+'</div>':'')+
  '<table><thead><tr>'+CAL_WD.map((d,i)=>'<th'+(i>4?' class="we"':'')+'>'+d+'</th>').join("")+'</tr></thead><tbody>'+weeks.map(wk=>'<tr>'+wk.map(cell).join("")+'</tr>').join("")+'</tbody></table>'+
  '<footer>Yellow Media · generado el '+new Date().toLocaleDateString("es-ES")+'</footer>'+
  // Si no cabe en una hoja, se reduce todo lo necesario para que salga en una sola página
  '<script>window.onload=async()=>{try{await document.fonts.ready}catch{}const max=194*96/25.4,h=document.body.scrollHeight;if(h>max)document.body.style.zoom=(max/h).toFixed(3);setTimeout(()=>print(),300)}<\/script></html>');
 w.document.close()}
function calMonthCanvas(y,m,ev,title,logo,venueLogo){
 const W=2339,H=1654,pad=56,weeks=calMonthData(y,m),cw=(W-pad*2)/7,top=196,foot=56,avail=H-top-foot-pad/2;
 const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.textBaseline="top";
 const font=(wt,px,fam)=>wt+" "+px+"px "+(fam||"'Plus Jakarta Sans', Arial");
 const wrap=(t,max,lines)=>{const words=String(t).split(/\s+/),out=[];let cur="";for(const w of words){const x=cur?cur+" "+w:w;if(g.measureText(x).width<=max)cur=x;else{if(cur)out.push(cur);cur=w}}if(cur)out.push(cur);
  if(out.length>lines){const keep=out.slice(0,lines);let l=keep[lines-1];while(l.length&&g.measureText(l+"…").width>max)l=l.slice(0,-1);keep[lines-1]=l+"…";return keep}
  return out.map(l=>{if(g.measureText(l).width<=max)return l;while(l.length&&g.measureText(l+"…").width>max)l=l.slice(0,-1);return l+"…"})};
 // Busca el tamaño de letra más grande con el que todo el mes cabe en la hoja
 let s=1,layout;for(const k of [1,.9,.8,.7,.62,.55,.48,.42]){s=k;const tag=15*s,tl=20*s,loc=15*s,num=30*s;g.font=font(700,tl);
  const evH=e=>{g.font=font(700,tl);const L=wrap((e.time?e.time+" · ":"")+e.title,cw-34,2).length;return tag+4+L*(tl*1.2)+(e.location?loc*1.25:0)+10*s};
  const rows=weeks.map(wk=>Math.max(150,...wk.map(d=>d?num+14+ev.filter(e=>e.date===isoOf(d)).reduce((a,e)=>a+evH(e),0)+8:0)));
  layout={rows,tag,tl,loc,num,evH};if(rows.reduce((a,b)=>a+b,0)<=avail)break}
 const tot=layout.rows.reduce((a,b)=>a+b,0);if(tot<avail){const k=avail/tot;layout.rows=layout.rows.map(r=>r*k)}
 g.fillStyle="#FFFFFF";g.fillRect(0,0,W,H);g.fillStyle="#131313";g.fillRect(0,0,W,150);g.fillStyle="#FFD400";g.fillRect(0,150,W,8);
 const lx0=logo?pad+136:pad;if(logo)g.drawImage(logo,pad,20,112,112);
 g.font=font(400,82,"Anton, Impact, sans-serif");g.fillStyle="#FFD400";g.fillText("YELLOW CONTROL",lx0,36);const tw=g.measureText("YELLOW CONTROL").width;
 g.fillStyle="#F2EFE6";g.fillText(title.toUpperCase(),lx0+tw+36,36);
 let ir=W-pad;if(venueLogo){const vh=110,vw=venueLogo.naturalWidth*vh/venueLogo.naturalHeight;g.drawImage(venueLogo,W-pad-vw,20,vw,vh);ir=W-pad-vw-30}
 g.font=font(600,24);g.fillStyle="#aaa296";const info=ev.length+(ev.length===1?" fecha":" fechas")+(calVenue?" · "+calVenue:"");g.fillText(info,ir-g.measureText(info).width,70);
 // cabecera de días
 const hy=top-34;CAL_WD.forEach((d,i)=>{g.font=font(800,18);g.fillStyle=i>4?"#8a8478":"#131313";g.fillText(d.toUpperCase(),pad+i*cw+10,hy)});
 let yy=top;const today=localToday();
 weeks.forEach((wk,wi)=>{const rh=layout.rows[wi];wk.forEach((d,i)=>{const x=pad+i*cw;
   g.fillStyle=!d?"#f3f1ec":(i>4?"#fbfaf6":"#FFFFFF");g.fillRect(x,yy,cw,rh);g.strokeStyle="#cfcac0";g.lineWidth=2;g.strokeRect(x,yy,cw,rh);if(!d)return;
   const iso=isoOf(d);g.font=font(400,layout.num,"Anton, Impact, sans-serif");const nw=g.measureText(String(d.getDate())).width;
   if(iso===today){g.fillStyle="#FFD400";g.fillRect(x+8,yy+8,nw+14,layout.num+8)}g.fillStyle="#131313";g.fillText(String(d.getDate()),x+15,yy+10);
   let ey=yy+layout.num+24;for(const e of ev.filter(e=>e.date===iso)){const h=layout.evH(e)-10*s,vs=venueStyle(e);g.fillStyle=vs.line;g.fillRect(x+12,ey,6,h);
    g.font=font(800,layout.tag*.85);let cx=x+26;for(const ch of [vs,nlPlatform(e)].filter(Boolean)){const tw=g.measureText(ch.tag).width+layout.tag*.7;g.fillStyle=ch.bg;g.fillRect(cx,ey-2*s,tw,layout.tag+3*s);g.fillStyle=ch.fg;g.fillText(ch.tag,cx+layout.tag*.35,ey);cx+=tw+6*s}
    g.font=font(800,layout.tag);g.fillStyle="#6b665d";g.fillText(wrap((evTag(e)+(e.moduleKey==="hitos"?"":" · "+e.module)).toUpperCase(),x+cw-cx-14,1)[0],cx+2,ey);
    let ly=ey+layout.tag+4;g.font=font(700,layout.tl);g.fillStyle="#131313";for(const l of wrap((e.time?e.time+" · ":"")+e.title,cw-34,2)){g.fillText(l,x+26,ly);ly+=layout.tl*1.2}
    if(e.location){g.font=font(500,layout.loc);g.fillStyle="#6b665d";g.fillText(wrap(e.location,cw-40,1)[0],x+26,ly)}
    ey+=layout.evH(e)}});yy+=rh});
 g.font=font(600,18);g.fillStyle="#8a8478";g.fillText("Yellow Media · generado el "+new Date().toLocaleDateString("es-ES"),pad,H-foot+14);
 let lx=W-pad;for(const [k,v] of venueLegend(ev).reverse()){g.font=font(700,18);const w=g.measureText(k).width;lx-=w;g.fillStyle="#6b665d";g.fillText(k,lx,H-foot+14);g.font=font(800,15);const tw=g.measureText(v.tag).width+14;lx-=tw+8;g.fillStyle=v.bg;g.fillRect(lx,H-foot+10,tw,26);g.fillStyle=v.fg;g.fillText(v.tag,lx+7,H-foot+15);lx-=28}
 return c}
async function calMonthPng(y,m,ev,title){
 try{if(document.fonts&&document.fonts.ready)await document.fonts.ready;const c=calMonthCanvas(y,m,ev,title,await ycLogo(),calVenue==="Gran Teatro Pavón"?await cartLoadImg("/assets/venues/altos-pavon.png").catch(()=>null):null);const blob=await new Promise(r=>c.toBlob(r,"image/png"));
  const name="Yellow_calendario_"+y+"-"+String(m+1).padStart(2,"0")+".png",file=new File([blob],name,{type:"image/png"});
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Calendario · "+title});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  say("Imagen descargada")}catch(e){if(e&&e.name==="AbortError")return;say(e.message||"No se ha podido exportar")}}

async function admin(){
 if(!roles().includes("admin"))throw new Error("Acceso reservado a administración");
 let d;try{d=await api("/api/admin-users")}catch(e){app.innerHTML=pageHead("Usuarios","Administración de accesos")+'<div class="card notice">Netlify Identity todavía no está habilitado para este proyecto. El código de roles ya está preparado, pero la gestión de usuarios queda bloqueada hasta activar Identity en Netlify.</div>'+mailTestCard();bindMailTest();return}
 const users=d.users||[];
 app.innerHTML=pageHead("Usuarios","Roles y permisos reales")+'<div class="grid two-col"><section class="card"><div class="section-title"><h2>Usuarios</h2></div><div class="list">'+users.map(u=>'<div class="item"><div><h3>'+esc(u.email)+'</h3><div class="item-meta"><span>'+esc((u.roles||[]).join(", ")||"sin rol")+'</span>'+statusBadge(u.disabled?"desactivado":"activo")+'</div></div><div class="item-actions"><select data-role-id="'+u.id+'">'+["admin","gestion","carteleria","consulta"].map(r=>'<option '+((u.roles||[]).includes(r)?"selected":"")+'>'+r+'</option>').join("")+'</select><button data-save-role="'+u.id+'">Guardar rol</button><button data-toggle-user="'+u.id+'" data-disabled="'+(u.disabled?"1":"0")+'">'+(u.disabled?"Activar":"Desactivar")+'</button></div></div>').join("")+'</div></section><section class="card"><div class="section-title"><h2>Crear usuario</h2></div><form id="newUserForm" class="stack"><label>Email<input name="email" type="email" required></label><label>Rol<select name="role"><option>carteleria</option><option>gestion</option><option>consulta</option><option>admin</option></select></label><button class="primary">Crear y enviar recuperación de contraseña</button></form></section></div>'+mailTestCard();bindMailTest();
 $$("[data-save-role]").forEach(b=>b.onclick=async()=>{const id=b.dataset.saveRole,role=$('[data-role-id="'+id+'"]').value;await api("/api/admin-users",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id,role})});say("Rol actualizado");admin()});
 $$("[data-toggle-user]").forEach(b=>b.onclick=async()=>{await api("/api/admin-users",{method:b.dataset.disabled==="1"?"PATCH":"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id:b.dataset.toggleUser})});say("Acceso actualizado");admin()});
 $("#newUserForm").onsubmit=async e=>{e.preventDefault();const v=formObject(e.currentTarget);await api("/api/admin-users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(v)});say("Usuario creado");admin()};
}

(async()=>{try{await window.ycIdentityReady}catch{}if(await authenticate())route();if("serviceWorker"in navigator)ycServiceWorker()})();
// Avisa cuando hay una versión nueva publicada, para no seguir trabajando con la antigua.
// Versión de esta copia de la app. Debe coincidir con CACHE en sw.js (se cambian juntas en cada publicación).
const YC_VERSION="yellow-control-v40";
function ycShowUpdate(){if($("#ycUpdate"))return;const b=document.createElement("div");b.id="ycUpdate";b.className="yc-update";b.setAttribute("role","status");
 b.innerHTML='<span>Hay una versión nueva de Yellow Control.</span><button type="button" class="primary">Actualizar</button>';
 b.querySelector("button").onclick=()=>{if(typeof cart!=="undefined"&&cart.dirty&&cart.dirty.size&&!confirm("Hay cambios sin guardar en Cartelería. ¿Actualizar igualmente?"))return;location.reload()};document.body.appendChild(b)}
// Comprueba en el servidor si se ha publicado otra versión: al abrir, al volver a la app, al cambiar de sección y cada minuto.
async function ycCheckVersion(){try{const r=await fetch("/sw.js?check="+Date.now(),{cache:"no-store"});if(!r.ok)return;const m=(await r.text()).match(/yellow-control-v\d+/);if(m&&m[0]!==YC_VERSION)ycShowUpdate()}catch{}}
function ycServiceWorker(){
 navigator.serviceWorker.register("/sw.js").then(r=>{const up=()=>r.update().catch(()=>{});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")up()})}).catch(()=>{})}
ycCheckVersion();setInterval(ycCheckVersion,60*1000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")ycCheckVersion()});
window.addEventListener("focus",ycCheckVersion);window.addEventListener("hashchange",ycCheckVersion);
})();