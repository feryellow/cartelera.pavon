(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={actor:null,route:"dashboard",editing:null,assetUrls:new Map()};
const gate=$("#loginGate"), app=$("#app"), toast=$("#toast");
new MutationObserver(()=>compactActions()).observe(app,{childList:true});
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
function isProveedor(){return roles().includes("proveedor")&&!roles().some(r=>r==="admin"||r==="gestion")}
function isCarteleriaRole(){return roles().includes("carteleria")&&!roles().includes("admin")}
function canRoute(route){if(isProveedor())return route==="proveedor";if(route==="proveedor")return roles().some(r=>r==="admin"||r==="gestion");if(route==="presupuesto")return true;if(roles().includes("admin"))return true;if(isCarteleriaRole())return route==="dashboard"||route==="carteleria";if(route==="dashboard"||route==="calendario"||route==="carteleria"||route==="archivo"||route==="status")return true;if((route==="radio"||route==="television"||route==="taxis"||route==="intercambiadores"||route==="hometicket"||route==="revistas"||route==="meta"||route==="importar")&&roles().includes("gestion"))return true;return false}
const ICON_PATHS={television:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 3l4 3 4-3M8 21h8"/>',importar:'<path d="M12 15V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4 14v5h16v-5"/>',meta:'<path d="M3 15.5c0-4 2-8.5 4.6-8.5 3.4 0 5.4 10 8.8 10 2 0 3.6-2 3.6-4.6 0-3.3-1.8-5.4-3.8-5.4-3.2 0-5.3 9-8.8 9C5 16 3 16.6 3 15.5z"/>',status:'<path d="M4 12l4 4 8-9"/><path d="M14 17h6M14 13h6"/>',presupuesto:'<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/><path d="M5 10h8M5 14h8"/>',dashboard:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',carteleria:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/>',hometicket:'<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',radio:'<rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="15.5" cy="14" r="3"/><path d="M7 12h3M7 16h3M6 8l11-4"/>',taxis:'<path d="M5 17V12l2-5h10l2 5v5M3 17h18v3H3zM9 4h6"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',intercambiadores:'<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21l1-3M16 21l-1-3"/>',revistas:'<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M18 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4"/>',archivo:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',admin:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'};
// Fotos de las tarjetas de Inicio y cabeceras. Para cambiar una foto, sustituye el archivo en /assets/tiles/ (formato 4:3, JPG).
const ROUTE_PHOTOS={television:"/assets/tiles/television.webp",meta:"/assets/tiles/digital.webp",status:"/assets/tiles/status.webp",carteleria:"/assets/tiles/carteleria.webp",revistas:"/assets/tiles/revistas.webp",calendario:"/assets/tiles/calendario.webp",hometicket:"/assets/tiles/hometicket.webp",radio:"/assets/tiles/radio.webp",taxis:"/assets/tiles/taxis.webp",intercambiadores:"/assets/tiles/intercambiadores.webp",archivo:"/assets/tiles/archivo.webp",admin:"/assets/tiles/usuarios.webp"};
function icon(route,cls="nav-ico"){return '<svg class="'+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON_PATHS[route]||"")+'</svg>'}
function navMeta(route){const a=$('#mainNav [data-route="'+route+'"]');return a?{href:a.dataset.href||a.getAttribute("href")||("#"+route),small:a.querySelector("small")?.textContent||"",name:a.querySelector("b")?.textContent||""}:null}
$$("#mainNav a").forEach(a=>{if(!a.dataset.href)a.dataset.href=a.getAttribute("href")||"";if(!a.querySelector("svg"))a.insertAdjacentHTML("afterbegin",icon(a.dataset.route))});
const MODULE_LABELS={avisos:"Avisos",hitos:"Comunicación",carteleria:"Cartelería",radio:"Radio",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas de Teatros",publicidad:"Publicidad",usuarios:"Usuarios",admin:"Usuarios"};
const ACTION_LABELS={create:"creado",update:"editado",archive:"quitado",restore:"recuperado",save:"guardado",image_replace:"imagen cambiada",image_delete:"imagen quitada",role_change:"rol cambiado",user_create:"usuario creado",user_disable:"usuario desactivado",user_enable:"usuario activado",email_sent:"correo enviado",email_pending:"correo pendiente",digest_sent:"resumen enviado",digest_pending:"resumen pendiente"};
function modLabel(m){return MODULE_LABELS[m]||m||""}
function actLabel(a){return ACTION_LABELS[a]||a||""}
function prettyKey(k=""){const cs=CART_SLOTS.find(x=>x.key===k);if(cs)return (k.startsWith("arlequin__")?"Arlequín · ":"")+cs.name;const t=String(k).replaceAll("__"," · ").replaceAll("_"," ").trim();return t.charAt(0).toUpperCase()+t.slice(1)}
function openFormCard(){setTimeout(()=>{const c=$('[id$="FormCard"]');if(!c)return;c.classList.add("open");if(matchMedia("(max-width:700px)").matches)c.scrollIntoView({behavior:"smooth",block:"start"})},0)}
document.addEventListener("click",e=>{const t=e.target.closest("#newCampaign,#newRadio,#newHT,#newRevista,[data-edit-campaign],[data-edit-radio],[data-edit-ht],[data-edit-revista],[data-add-revista]");if(t)openFormCard();const c=e.target.closest("#cancelCampaign,#cancelRadio,#cancelHT,#cancelRevista");if(c)setTimeout(()=>{const f=$('[id$="FormCard"]');f&&f.classList.remove("open")},0)});
function applyNav(){document.body.dataset.route=state.route;document.body.dataset.roleMode=isProveedor()?"proveedor":isCarteleriaRole()?"carteleria":"";$$("#mainNav [data-route]").forEach(a=>{const r=a.dataset.route,locked=!canRoute(r);a.classList.toggle("active",r===state.route);a.classList.toggle("locked",locked);a.setAttribute("aria-disabled",locked?"true":"false");if(locked){a.removeAttribute("href");a.tabIndex=-1}else{a.setAttribute("href",a.dataset.href||("#"+r));a.removeAttribute("tabindex")}});$("#accountName").textContent=state.actor?.email||"";const na=$("#navAccountName");if(na){na.textContent=state.actor?.email||"—";const av=$(".account-avatar");if(av)av.textContent=(state.actor?.email||"Y").charAt(0).toUpperCase()}const act=$("#mainNav a.active");if(act&&matchMedia("(max-width:980px)").matches)act.scrollIntoView({inline:"center",block:"nearest"})}
async function authenticate(){
 try{const d=await api("/api/me",{cache:"no-store"});state.actor=d.actor;state.budget=!!d.budget;const bn=$('#mainNav [data-route="presupuesto"]');if(bn)bn.hidden=!state.budget;gate.classList.add("hidden");applyNav();return true}
 catch{gate.classList.remove("hidden");return false}
}
// Entrada: correo sin espacios ni mayúsculas (el móvil pone la primera en mayúscula), botón bloqueado mientras entra,
// mensajes en español y, si la sesión tarda en confirmarse tras entrar, se reintenta en vez de quedarse sin hacer nada.
{const eye=$("#pwEye");if(eye)eye.onclick=()=>{const p=$("#loginPassword");const show=p.type==="password";p.type=show?"text":"password";eye.textContent=show?"Ocultar":"Ver";eye.setAttribute("aria-label",show?"Ocultar contraseña":"Mostrar contraseña")}}
const loginMsg=(status,msg)=>{const m=String(msg||"").toLowerCase();if(status===429||/too many|rate/.test(m))return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";if(/no user|invalid|password|credential|unauthorized|not found/.test(m)||status===400||status===401)return "Correo o contraseña incorrectos. Revisa que no haya espacios y prueba a pulsar «Ver» para comprobar la contraseña.";if(/confirm/.test(m))return "Tu usuario aún no está activado: busca el correo de invitación o pide que te la reenvíen.";if(/origin/.test(m))return "Entra desde yellow-control.netlify.app.";return "No se ha podido entrar ("+(msg||("error "+status))+"). Vuelve a intentarlo."};
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const btn=$("#loginBtn"),err=$("#loginError");err.textContent="";if(btn){if(btn.disabled)return;btn.disabled=true;btn.textContent="Entrando…"}
 const em=$("#loginEmail");em.value=em.value.trim().toLowerCase();
 try{let r;try{r=await fetch("/api/login",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({email:em.value,password:$("#loginPassword").value})})}catch{throw new Error("Sin conexión. Comprueba internet y vuelve a intentarlo.")}
  if(!r.ok){let d={};try{d=await r.json()}catch{}throw new Error(loginMsg(r.status,d.error))}
  let ok=false;for(let i=0;i<3&&!ok;i++){if(i)await new Promise(res=>setTimeout(res,400*i));ok=await authenticate()}
  if(ok){$("#loginPassword").value="";route()}else throw new Error("La contraseña es correcta, pero el navegador no ha guardado la sesión. Comprueba que no estás en modo privado y que las cookies están permitidas, y vuelve a pulsar Entrar.")}
 catch(e2){err.textContent=e2.message;$("#loginGate").classList.remove("hidden")}
 finally{if(btn){btn.disabled=false;btn.textContent="Entrar"}}});
{const rb=$("#recoverBtn");if(rb)rb.onclick=async()=>{const em=$("#loginEmail").value.trim();if(!em){$("#loginError").textContent="Escribe tu correo arriba y vuelve a pulsar";return}rb.disabled=true;try{const r=await fetch("/api/recover",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:em})});$("#loginError").textContent=r.ok?"Si ese correo tiene acceso, te llegará un enlace para crear una contraseña nueva.":"No se ha podido enviar. Inténtalo de nuevo."}catch{$("#loginError").textContent="No se ha podido enviar. Inténtalo de nuevo."}finally{rb.disabled=false}}}
$("#keyForm").addEventListener("submit",async e=>{e.preventDefault();try{sessionStorage.setItem("pavon_edit_key",$("#legacyKey").value.trim())}catch{};if(await authenticate())route();else $("#loginError").textContent="Clave no válida"});
document.addEventListener("click",e=>{if(e.target.closest(".nav-logout"))$("#logoutBtn").click()});
$("#logoutBtn").addEventListener("click",async()=>{try{await fetch("/api/logout",{method:"POST"})}catch{};try{sessionStorage.removeItem("pavon_edit_key")}catch{};state.actor=null;gate.classList.remove("hidden")});
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fdate(v){if(!v)return"—";try{return new Date(v+"T00:00:00").toLocaleDateString("es-ES")}catch{return v}}
function statusBadge(v){const s=(v||"activo").toLowerCase();return '<span class="badge '+(s==="activo"||s==="correcto"?"ok":s.includes("pend")?"warn":"")+'">'+esc(v||"activo")+"</span>"}
// Presupuesto: módulo aparte (solo Fer y Celia); su código se carga al entrar
async function loadMeta(){if(!window.metaModule)await new Promise((res,rej)=>{const s=document.createElement("script");s.src="/meta.js?v="+encodeURIComponent(YC_VERSION);s.onload=res;s.onerror=()=>rej(new Error("No se ha podido cargar el módulo Meta"));document.head.appendChild(s)});await window.metaModule({api,esc,pageHead,say,app,$,$$})}
async function loadPresupuesto(){if(!window.presupuesto)await new Promise((res,rej)=>{const s=document.createElement("script");s.src="/presupuesto.js?v="+encodeURIComponent(YC_VERSION);s.onload=res;s.onerror=()=>rej(new Error("No se ha podido cargar el presupuesto"));document.head.appendChild(s)});await window.presupuesto({api,esc,pageHead,say,app,state,VENUES,$,$$})}
function pageHead(title,sub,actions="",photoOverride){const home="";const m=navMeta(state.route),photo=photoOverride||ROUTE_PHOTOS[state.route];return '<div class="page-banner'+(photo?' has-photo':'')+'"'+(photo?' style="--photo:url('+photo+')"':'')+'><div class="page-banner-txt">'+(m?.small?'<small>'+esc(m.small)+'</small>':'')+'<h1>'+esc(title)+'</h1><p>'+esc(sub||"")+'</p></div></div><div class="page-actions actions-row">'+home+actions+"</div>"}
async function blobUrl(assetKey,moduleName){if(!assetKey)return null;if(state.assetUrls.has(assetKey))return state.assetUrls.get(assetKey);const r=await fetch("/api/asset?key="+encodeURIComponent(assetKey)+"&module="+moduleName,{headers:headers()});if(!r.ok)return null;const b=await r.blob(),u=URL.createObjectURL(b);state.assetUrls.set(assetKey,u);return u}
function routeName(){return (location.hash||"#dashboard").slice(1).split("?")[0]||"dashboard"}
async function route(){const q=new URLSearchParams(location.search);if(q.get("vista")){location.replace("/#carteleria?vista="+encodeURIComponent(q.get("vista")));return}const nextRoute=routeName();if(state.route==="carteleria"&&nextRoute!=="carteleria"&&cart.dirty.size&&!confirm("Hay cambios sin guardar en Cartelería. ¿Salir sin guardar?")){history.replaceState(null,"","#carteleria");return}if(nextRoute==="hometicket"&&state.route!=="hometicket")htView="";if((nextRoute==="taxis"||nextRoute==="intercambiadores")&&state.route!==nextRoute){campView="";campMonth=""}state.route=nextRoute;if(!canRoute(state.route))state.route=isProveedor()?"proveedor":"dashboard";applyNav();app.innerHTML='<div class="loading">Cargando…</div>';try{if(state.route==="dashboard"){await dashboard();pushCard()}else if(state.route==="radio")await radio();else if(state.route==="television")await television();else if(state.route==="taxis")await campaigns("taxis");else if(state.route==="intercambiadores")await campaigns("intercambiadores");else if(state.route==="hometicket")await homeTicket();else if(state.route==="revistas")await revistas();else if(state.route==="carteleria")await carteleria();else if(state.route==="calendario")await calendario();else if(state.route==="archivo")await archivo();else if(state.route==="proveedor")await proveedorPage();else if(state.route==="status")await statusPage();else if(state.route==="importar")await importar();else if(state.route==="meta")await loadMeta();else if(state.route==="presupuesto")await loadPresupuesto()
else if(state.route==="admin")await admin();else await dashboard();openEditFromHash()}catch(e){app.innerHTML=pageHead("Error","")+ '<div class="card error">'+esc(e.message)+"</div>"}}
window.addEventListener("hashchange",route);

// Botones de cabecera: uno principal a la vista y el resto en «Más» (cuando hay más de dos)
function compactActions(){$$("#app .page-actions:not([data-compact])").forEach(bar=>{bar.dataset.compact="1";
 const items=[...bar.children].filter(e=>!e.hidden&&!(e.tagName==="INPUT"&&(e.type==="file"||e.type==="hidden"))&&!e.classList.contains("more-menu"));if(items.length<=2)return;
 const keep=items.find(e=>e.classList.contains("primary"))||items[0],rest=items.filter(e=>e!==keep);
 const menu=document.createElement("div");menu.className="more-menu";menu.innerHTML='<button type="button" class="btn more-btn" aria-haspopup="true" aria-expanded="false">Más <span aria-hidden="true">▾</span></button><div class="more-pop" role="menu" hidden></div>';
 const pop=menu.querySelector(".more-pop"),btn=menu.querySelector(".more-btn");rest.forEach(e=>{e.setAttribute("role","menuitem");pop.appendChild(e)});bar.insertBefore(menu,keep);
 const close=()=>{pop.hidden=true;btn.setAttribute("aria-expanded","false")};
 btn.onclick=e=>{e.stopPropagation();const open=pop.hidden;pop.hidden=!open;btn.setAttribute("aria-expanded",String(open))};
 pop.addEventListener("click",()=>setTimeout(close,0));document.addEventListener("click",e=>{if(!menu.contains(e.target))close()});document.addEventListener("keydown",e=>{if(e.key==="Escape")close()})})}
// Listas largas: se ven las primeras 5 y un botón para el resto
function limitLists(sel,n=5){$$(sel).forEach(list=>{if(list.dataset.limited)return;const items=[...list.children].filter(e=>e.classList.contains("item"));if(items.length<=n+1)return;list.dataset.limited="1";
 items.slice(n).forEach(e=>e.hidden=true);const b=document.createElement("button");b.type="button";b.className="ghost list-more";b.textContent="Ver los "+items.length;b.onclick=()=>{items.forEach(e=>e.hidden=false);b.remove()};list.after(b)})}
// Inicio: los bloques bajo las secciones se pliegan y despliegan (en el móvil, plegados de entrada); se recuerda la elección
function foldDashboard(){const mob=matchMedia("(max-width:700px)").matches;let st={};try{st=JSON.parse(localStorage.getItem("yc-fold")||"{}")}catch{}
 $$("#app .home-tiles ~ section.card, #app .home-tiles ~ .grid section.card").forEach(sec=>{const t=sec.querySelector(".section-title");if(!t)return;const key=(t.querySelector("h2")||t).textContent.trim();
  sec.classList.add("dash-fold");const fold=key in st?st[key]:mob;sec.classList.toggle("folded",fold);t.setAttribute("role","button");t.tabIndex=0;t.setAttribute("aria-expanded",String(!fold));
  const tog=()=>{const f=!sec.classList.contains("folded");sec.classList.toggle("folded",f);t.setAttribute("aria-expanded",String(!f));st[key]=f;try{localStorage.setItem("yc-fold",JSON.stringify(st))}catch{}};
  t.onclick=e=>{if(e.target.closest("a,button"))return;tog()};t.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tog()}}})}
async function dashboard(){
 const d=await api("/api/control?module=dashboard");
 let provReq=[];if(roles().some(r=>r==="admin"||r==="gestion")){try{provReq=(await api("/api/proveedor?solicitudes=1")).requests||[]}catch{}}
 const all=(d.carteleria||[]).filter(x=>x.next);
 const today=new Date();today.setHours(0,0,0,0);
 const alerts=all.map(x=>{const dt=new Date(x.next+"T00:00:00");const days=Math.round((dt-today)/86400000);return {...x,days}}).filter(x=>x.days<=7).sort((a,b)=>a.days-b.days);
 const next=all.slice().sort((a,b)=>String(a.next).localeCompare(String(b.next))).slice(0,8);
 const alertHtml=alerts.length?alerts.slice(0,8).map(x=>{
   const label=x.days<0?"Vencido "+Math.abs(x.days)+" d":x.days===0?"HOY":"D-"+x.days;
   return '<div class="item"><div><h3>'+esc((x.title?x.title+' · ':'')+prettyKey(x.key))+'</h3><div class="item-meta"><span class="badge '+(x.days<0?"warn":"")+'">'+label+'</span><span>'+fdate(x.next)+'</span></div></div></div>';
 }).join(""):'<div class="notice">No hay avisos de cartelería en los próximos 7 días.</div>';
 app.innerHTML=homeHeader(alerts,d)+'<div id="pushCard"></div>'+homeTiles(d,alerts)+(provReq.length?'<section class="card prov-req" style="margin-bottom:14px"><div class="section-title"><div><small class="section-kicker">Proveedores</small><h2>Material que os piden</h2></div><span class="badge late">'+provReq.length+'</span></div><ul class="st-list">'+provReq.map(r=>'<li class="'+(r.days!==null&&r.days<=1?"falta":"")+'"><b>'+esc(r.providerName)+' · '+esc(r.itemTitle)+'</b><span>'+esc(r.itemDetail)+' · '+(r.deadline?(r.days<0?"vencido el "+fdate(r.deadline):r.days===0?"hoy es el último día":"quedan "+r.days+" días (hasta el "+fdate(r.deadline)+")"):"sin fecha límite")+'</span><span>«'+esc(String(r.message).slice(0,160))+'»</span></li>').join("")+'</ul></section>':'')+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Material que requiere atención</h2><span class="badge warn">'+(d.attention||[]).length+'</span></div><div class="list attention-list">'+((d.attention||[]).length?(d.attention||[]).map(x=>'<div class="item '+(x.overdue?"overdue":"")+'"><div><h3>'+esc(x.module)+' · '+esc(x.title)+'</h3><div class="item-meta"><span>'+esc(x.place||"")+'</span><span>'+esc(x.materialStatus||"pendiente")+'</span><span>Entrega: '+fdate(x.deliveryDate)+'</span></div></div></div>').join(""):'<div class="notice">No hay material pendiente con fecha límite registrada.</div>')+'</div></section><section class="card"><div class="section-title"><h2>Material activo ahora</h2><span class="badge ok">'+(d.currentMaterial||[]).length+'</span></div><div class="list">'+((d.currentMaterial||[]).length?(d.currentMaterial||[]).map(x=>'<div class="item"><div><h3>'+esc(x.module)+' · '+esc(x.title)+'</h3><div class="item-meta"><span>'+esc(x.place||"")+'</span><span>'+esc(x.materialStatus||"sin indicar")+'</span><span>Fin: '+fdate(x.endDate)+'</span></div></div></div>').join(""):'<div class="notice">No hay material activo registrado.</div>')+'</div></section></div>'+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Avisos y vencimientos</h2><a class="btn" href="#calendario">Ver calendario</a></div><div class="list">'+alertHtml+'</div>'+
 '<div class="section-title" style="margin-top:20px"><h2>Próximos cambios</h2></div><div class="list">'+
 (next.length?next.map(x=>'<div class="item"><div><h3>'+esc((x.title?x.title+' · ':'')+prettyKey(x.key))+'</h3><div class="item-meta"><span>'+fdate(x.next)+'</span></div></div></div>').join(""):'<div class="notice">No hay fechas de cambio registradas.</div>')+
 '</div></section><section class="card"><div class="section-title"><h2>Últimas modificaciones</h2></div><div class="list">'+
 ((d.latest||[]).length?d.latest.map(a=>'<div class="item"><div><h3>'+esc(modLabel(a.module))+" · "+esc(actLabel(a.action))+'</h3><div class="item-meta"><span>'+esc(a.actor?.email||"")+'</span><span>'+new Date(a.at).toLocaleString("es-ES")+'</span></div></div></div>').join(""):'<div class="notice">Todavía no hay histórico.</div>')+
 '</div></section></div>';
 foldDashboard();limitLists("#app .dash-fold .list")
}

function homeHeader(alerts,d={}){const h=new Date().getHours(),greet=h<14?"Buenos días":h<21?"Buenas tardes":"Buenas noches";const date=new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});const first=alerts[0];
 const aviso=first?'<a class="home-alert'+(first.days<0?' late':'')+'" href="#carteleria"><small>'+(first.days<0?'Fuera de plazo':'Urgente')+' · Cartelería<em>'+(first.days<0?'+'+Math.abs(first.days)+' d':first.days===0?'HOY':'D-'+first.days)+'</em></small><b>'+esc((first.title?first.title+' · ':'')+prettyKey(first.key))+'</b><span>'+(first.days<0?"Vencido hace "+Math.abs(first.days)+(Math.abs(first.days)===1?" día":" días"):first.days===0?"Cambio hoy":"Cambio en "+first.days+(first.days===1?" día":" días"))+' · '+fdate(first.next)+'</span></a>':"";
 return '<div class="home-hero"><div class="home-hello"><small class="home-kicker">Panel general · Yellow Media</small><h1>'+greet+(state.actor?.name?', '+esc(String(state.actor.name).trim().split(/\s+/)[0]):'')+'</h1><p>'+esc(date.charAt(0).toUpperCase()+date.slice(1))+'</p></div>'+homeKpis(d)+'</div>'+aviso}
function homeTiles(d,alerts){const count=(n,one,many)=>n==null?"":n+" "+(n===1?one:many);const badges={carteleria:alerts.length?count(alerts.length,"aviso","avisos")+" ≤ 7 días":"",radio:d.radio?count(d.radio.active,"cuña activa","cuñas activas"):"",taxis:d.taxis?count(d.taxis.active,"campaña activa","campañas activas"):"",intercambiadores:d.intercambiadores?count(d.intercambiadores.active,"campaña activa","campañas activas"):"",hometicket:d.hometicket?count(d.hometicket.active,"activo","activos"):"",revistas:d.revistas?Math.min(d.revistas.magazines??d.revistas.active,MAGAZINES.length)+" de "+MAGAZINES.length+" este mes":""};
 const allRoutes=["calendario","carteleria","hometicket","radio","television","taxis","intercambiadores","revistas","meta","status","admin"];
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
// Divide una asignación de radio en bloques de lunes a domingo, cortando también en el cambio de mes,
// y reparte las cuñas planificadas y emitidas en proporción a los días (redondeo por restos mayores).
function radioSplit(data){
 const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const parts=[];let d=new Date(data.startDate+"T12:00:00");const end=new Date(data.endDate+"T12:00:00");
 while(d<=end){const s=new Date(d);let e=new Date(d);while(true){const n=new Date(e);n.setDate(n.getDate()+1);if(n>end||n.getDay()===1||n.getMonth()!==e.getMonth())break;e=n}
  parts.push({s:iso(s),e:iso(e),days:Math.round((e-s)/864e5)+1});d=new Date(e);d.setDate(d.getDate()+1)}
 const share=total=>{const tot=parts.reduce((a,p)=>a+p.days,0),raw=parts.map(p=>total*p.days/tot),base=raw.map(Math.floor);let left=total-base.reduce((a,b)=>a+b,0);
  raw.map((r,i)=>[r-base[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{if(left>0){base[i]++;left--}});return base};
 const pl=share(radioNum(data.plannedSpots)),ac=share(radioNum(data.actualSpots));
 return parts.map((p,i)=>({...data,startDate:p.s,endDate:p.e,inventoryMonth:p.s.slice(0,7),plannedSpots:pl[i],actualSpots:ac[i]}))}
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
// Semanas del mes (lunes a domingo, recortadas al mes)
function radioWeeks(month){const [y,m]=month.split("-").map(Number),last=new Date(y,m,0).getDate(),weeks=[];let d=1;
 while(d<=last){const dt=new Date(y,m-1,d),mon=d-((dt.getDay()+6)%7),start=Math.max(1,mon),end=Math.min(last,mon+6);if(!weeks.some(w=>w.start===start))weeks.push({start,end});d=end+1}
 return weeks.map(w=>({...w,s:month+"-"+String(w.start).padStart(2,"0"),e:month+"-"+String(w.end).padStart(2,"0")}))}
const radioName=r=>r.spectacle||r.campaignName||r.spotName||"Sin espectáculo";
// Suma por espectáculo (planificadas; si hay certificadas, también), de mayor a menor
function radioTally(rows){const m=new Map();rows.forEach(r=>{const k=radioName(r),x=m.get(k)||{name:k,p:0,a:0};x.p+=radioNum(r.plannedSpots);x.a+=radioNum(r.actualSpots);m.set(k,x)});return [...m.values()].filter(x=>x.p||x.a).sort((a,b)=>b.p-a.p||a.name.localeCompare(b.name))}
function radioBar(v,max){const pc=max?Math.max(0,Math.min(100,v/max*100)):0;return '<span class="rsum-bar"><i style="width:'+pc.toFixed(1)+'%"></i></span>'}
function radioSummary(contract,month,rows){
 const units=[...new Set((contract.lines||[]).filter(l=>radioNum(l.monthly?.[month])>0).map(l=>l.unit))],main=units.includes("cuñas")?"cuñas":units[0]||"cuñas";
 const tot=radioContractTotal(contract,month,rows,main),weeks=radioWeeks(month),mon=radioMonthLabel(month).split(" ")[0].toLowerCase();
 const byUnit=rows.filter(r=>(r.unit||radioLine(contract,r.lineId)?.unit||"cuñas")===main);
 const weekHtml=weeks.map((w,i)=>{const rr=byUnit.filter(r=>{const a=r.startDate||month+"-01",b=r.endDate||a;return a<=w.e&&b>=w.s}),t=radioTally(rr),sum=t.reduce((a,x)=>a+x.p,0),max=Math.max(1,...t.map(x=>x.p));
  return '<div class="rsum-week"><div class="rsum-week-head"><b>Semana '+(i+1)+'</b><span>'+w.start+'–'+w.end+' '+esc(mon)+'</span><strong>'+radioFmt(sum)+' '+esc(main)+'</strong></div>'+
   (t.length?t.map(x=>'<div class="rsum-row"><span class="rsum-name">'+esc(x.name)+'</span>'+radioBar(x.p,max)+'<b>'+radioFmt(x.p)+'</b></div>').join(""):'<p class="muted" style="margin:4px 0 0">Sin cuñas esta semana</p>')+'</div>'}).join("");
 const all=radioTally(byUnit),cap=tot.capacity||1;
 const totalHtml='<div class="rsum-total"><div class="rsum-week-head"><b>Total del mes</b><span>de '+radioFmt(tot.capacity)+' '+esc(main)+' contratadas</span><strong>'+radioFmt(tot.planned)+'</strong></div>'+
  all.map(x=>'<div class="rsum-row"><span class="rsum-name">'+esc(x.name)+'</span>'+radioBar(x.p,cap)+'<b>'+radioFmt(x.p)+'</b><em>'+Math.round(x.p/cap*100)+' %</em></div>').join("")+
  '<div class="rsum-row rsum-foot"><span class="rsum-name">'+(tot.capacity-tot.planned>0?'Sin asignar':'Contrato completo')+'</span>'+radioBar(tot.planned,cap)+'<b>'+radioFmt(Math.max(0,tot.capacity-tot.planned))+'</b><em>'+Math.round(tot.planned/cap*100)+' % usado</em></div>'+
  (tot.actual?'<p class="muted" style="margin:8px 0 0">Certificadas por la emisora: <b>'+radioFmt(tot.actual)+'</b> de '+radioFmt(tot.planned)+' planificadas.</p>':'')+'</div>';
 return '<section class="card rsum"><div class="section-title"><div><small class="section-kicker">Resumen de '+esc(radioMonthLabel(month).toLowerCase())+'</small><h2>'+esc(contract.venue)+' · '+esc(contract.brand)+'</h2></div><div class="rsum-big"><strong>'+radioFmt(tot.planned)+'</strong><span>/ '+radioFmt(tot.capacity)+' '+esc(main)+'</span></div></div>'+
  '<div class="rsum-grid"><div class="rsum-weeks">'+weekHtml+'</div>'+totalHtml+'</div></section>'
}
// Cada cuña (audio) una sola vez, aunque esté repartida en varias semanas
function radioAudios(rows){const seen=new Map();rows.forEach(r=>{const k=r.assetKey||("n:"+(r.spotName||radioName(r)));const x=seen.get(k)||{r,total:0,weeks:0};x.total+=radioNum(r.plannedSpots);x.weeks++;seen.set(k,x)});
 const list=[...seen.values()].sort((a,b)=>b.total-a.total);
 if(!list.length)return "";
 return '<details class="card rsum-audios" id="radioAudios"><summary><b>Cuñas del mes · audios</b> <span class="badge">'+list.length+'</span></summary><div class="list" style="margin-top:10px">'+list.map(({r,total,weeks})=>'<div class="item"><div style="width:100%"><h3>'+esc(radioName(r))+'</h3><div class="item-meta"><span>'+esc(r.spotName||"")+'</span><span><b>'+radioFmt(total)+'</b> cuñas en '+weeks+' '+(weeks===1?"semana":"semanas")+'</span></div>'+(r.assetKey?'<div class="media-preview" data-lazy-asset="'+esc(r.assetKey)+'" data-module="radio" data-kind="audio" data-name="'+esc(r.assetName||r.spotName||"")+'"></div>':'<p class="muted" style="margin:6px 0 0">Sin audio subido</p>')+'</div></div>').join("")+'</div></details>'}
// Asignaciones para editar: compactas y sin reproductor
function radioEditList(rows,contract){if(!rows.length)return "";
 return '<details class="card rsum-edit"><summary><b>Asignaciones por semana · editar</b> <span class="badge">'+rows.length+'</span></summary><div class="rsum-edit-list">'+rows.slice().sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||""))||radioName(a).localeCompare(radioName(b))).map(r=>'<div class="rsum-edit-row"><span>'+(r.startDate?fdate(r.startDate)+' → '+fdate(r.endDate||r.startDate):'Sin fechas')+'</span><b>'+esc(radioName(r))+'</b><em>'+radioFmt(r.plannedSpots)+'</em><span class="rsum-edit-actions"><button type="button" data-edit-radio="'+r.id+'">Editar</button><button type="button" class="danger" data-del-radio="'+r.id+'">Quitar</button></span></div>').join("")+'</div></details>'}
function radioWeekPanel(rows,month,contract){
 const [y,m]=month.split("-").map(Number),last=new Date(y,m,0).getDate(),weeks=[];let d=1;
 while(d<=last){const dt=new Date(y,m-1,d),mon=d-((dt.getDay()+6)%7),start=Math.max(1,mon),end=Math.min(last,mon+6);if(!weeks.some(w=>w.start===start))weeks.push({start,end});d=end+1}
 const inRange=(r,w)=>{const a=r.startDate||month+"-01",b=r.endDate||a,s=month+"-"+String(w.start).padStart(2,"0"),e=month+"-"+String(w.end).padStart(2,"0");return a<=e&&b>=s};
 return '<div class="radio-weeks">'+weeks.map((w,i)=>{const rr=rows.filter(r=>inRange(r,w));return '<div class="radio-week"><div><small>SEMANA '+(i+1)+'</small><b>'+w.start+'–'+w.end+' '+radioMonthLabel(month).split(" ")[0]+'</b></div><span>'+rr.length+' asignación'+(rr.length===1?'':'es')+'</span>'+(rr.length?'<p>'+rr.map(r=>esc(r.spectacle||r.campaignName||r.spotName||"Sin espectáculo")+' · '+radioFmt(r.plannedSpots)+' '+esc(r.unit||radioLine(contract,r.lineId)?.unit||"cuñas")).join(" · ")+'</p>':'')+'</div>'}).join("")+'</div>'
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
 const bySpectacle=new Map();rows.forEach(r=>{const l=radioLine(contract,r.lineId),unit=r.unit||l?.unit||"cuñas",k=(r.spectacle||r.campaignName||"Sin espectáculo")+"|"+unit,x=bySpectacle.get(k)||{name:r.spectacle||r.campaignName||"Sin espectáculo",unit,planned:0,actual:0};x.planned+=radioNum(r.plannedSpots);x.actual+=radioNum(r.actualSpots);bySpectacle.set(k,x)});
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
 app.innerHTML=pageHead("Radio","Resumen de cuñas por mes y semana, reparto por espectáculo y audios",(canRoute("importar")?'<a class="btn" href="#importar">Subir Excel</a>':'')+'<button id="radioMail" class="btn">Preparar correo</button><button id="radioPrint" class="btn">Informe mensual</button><button id="newRadio" class="primary">+ Nueva asignación</button>')+
  radioContractTabs(contracts,contract.id)+radioMonthTabs(contract,month)+
  '<section id="radioMailPanel" class="card radio-mail-panel hidden"></section>'+
  radioSummary(contract,month,monthRows)+
  radioAudios(monthRows)+
  radioEditList(monthRows,contract)+
  '<details class="card rsum-edit" id="radioFormBox"><summary><b>Nueva asignación / editar</b> <span class="muted">· '+esc(contract.venue)+' · '+esc(contract.brand)+'</span></summary><div id="radioFormCard" style="margin-top:12px">'+radioForm({},contract,month)+'</div></details>'+
  '<details class="card rsum-edit"><summary><b>Inventario del contrato</b> <span class="muted">· emisoras y programas</span></summary>'+radioInventoryKpis(contract,month,monthRows)+radioLineTable(contract,month,monthRows)+'</details>'+
  (legacy.length?'<details class="card radio-legacy"><summary><b>Registros anteriores sin contrato</b> <span class="badge">'+legacy.length+'</span></summary><p class="muted">Se conservan para no perder información. Puedes editarlos y asignarlos a un contrato.</p><div class="list">'+radioAssignments(legacy,{lines:[]})+'</div></details>':"");
 $$("[data-radio-contract]").forEach(b=>b.onclick=()=>{radioView.contractId=b.dataset.radioContract;radioView.month="";radio()});
 $$("[data-radio-month]").forEach(b=>b.onclick=()=>{radioView.month=b.dataset.radioMonth;radio()});
 requestAnimationFrame(()=>{const strip=$(".radio-months"),active=$(".radio-months .chip.on");if(strip&&active)active.scrollIntoView({block:"nearest",inline:"center"})});
 $("#radioMail").onclick=()=>radioMailOpen(contract,month,monthRows);
 $("#radioPrint").onclick=()=>radioPrint(contract,month,monthRows);
 bindRadio(rows,contract,month);
 const au=$("#radioAudios");if(au)au.addEventListener("toggle",async()=>{if(!au.open)return;for(const el of $$("[data-lazy-asset]",au)){el.dataset.asset=el.dataset.lazyAsset;el.removeAttribute("data-lazy-asset")}await hydrateMedia("radio")});
 if(legacy.length)await hydrateMedia("radio")
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
 '<input type="hidden" name="actualSpots" value="'+esc(r.actualSpots||"")+'">'+
 input("spotName","Nombre de la cuña / pieza",r.spotName)+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+
 materialStatusSelect(r.materialStatus)+selectStatus(r.status)+'<input type="hidden" name="certificateRef" value="'+esc(r.certificateRef||"")+'">'+
 '<div id="radioLegacyFields" class="wide '+(legacy?'':'hidden')+'"><div class="form-grid">'+venueSelect(r.venue)+input("station","Emisora manual",r.station)+input("duration","Duración",r.duration)+input("timeSlot","Franja",r.timeSlot)+'</div></div>'+
 (contract?'<input type="hidden" name="venue" value="'+esc(contract.venue||"")+'"><input type="hidden" name="station" value="'+esc(line?.station||"")+'"><input type="hidden" name="duration" value="'+esc(line?.duration||"")+'"><input type="hidden" name="timeSlot" value="'+esc(line?.timeSlot||"")+'"><input type="hidden" name="unit" value="'+esc(line?.unit||"cuñas")+'">':'<input type="hidden" name="unit" value="'+esc(r.unit||"cuñas")+'">')+
 '<label class="wide">Audio<input id="radioAsset" type="file" accept="audio/*"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label>'+
 '<div class="wide radio-form-help">Las cantidades se descuentan del inventario del contrato y mes seleccionados. Cada asignación contractual debe quedar dentro de una misma semana (lunes a domingo) para que el control semanal y mensual sea exacto.</div>'+
 '<div class="wide actions-row"><button class="primary" type="submit">Guardar asignación</button><button type="button" id="cancelRadio">Limpiar</button></div></form>'
}
function input(name,label,value="",type="text"){return '<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value||"")+'"'+(name==="spectacle"?' data-ac="spectacle" autocomplete="off"':"")+'></label>'}
const VENUES=["Gran Teatro Pavón","Gran Teatro CaixaBank Príncipe Pío","Teatro Serrano","Teatro Arlequín","Gran Castillo de Pedraza","Abono Teatro","Soho City Madrid"];
function venueSelect(v=""){const values=VENUES;return '<label>Espacio<select name="venue"><option value="">Seleccionar…</option>'+values.map(x=>'<option '+(x===v?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>'}
function materialStatusSelect(v="pendiente"){const values=["pendiente","solicitado","en producción","recibido","entregado","listo"];return '<label>Estado del material<select name="materialStatus">'+values.map(x=>'<option '+(x===v?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'}
function selectStatus(v="activo"){return '<label>Estado<select name="status">'+["activo","pendiente","finalizado"].map(x=>'<option '+(x===v?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'}
function formObject(form){return Object.fromEntries(new FormData(form).entries())}
const MAX_UPLOAD_MB=5.5;
function checkFileSize(file){if(file&&file.size>MAX_UPLOAD_MB*1024*1024)throw new Error("«"+file.name+"» pesa "+(file.size/1048576).toFixed(1)+" MB. El máximo es "+MAX_UPLOAD_MB+" MB: comprímelo (audio en MP3, PDF optimizado) y vuelve a intentarlo.")}
async function uploadAsset(file,moduleName,existing){if(!file)return existing||"";checkFileSize(file);const k=crypto.randomUUID().replaceAll("-","");const r=await fetch("/api/asset?key="+k+"&module="+moduleName,{method:"PUT",headers:headers({"content-type":file.type||"application/octet-stream"}),body:file});if(!r.ok)throw new Error(await r.text());return k}
function bindRadio(rows,selectedContract,selectedMonth){
 const openBox=()=>{const bx=$("#radioFormBox");if(bx){bx.open=true;bx.scrollIntoView({behavior:"smooth",block:"start"})}};
 $("#newRadio").onclick=()=>{$("#radioFormCard").innerHTML=radioForm({},selectedContract,selectedMonth);bindRadioForm(null,rows,selectedContract,selectedMonth);openBox()};
 $$("[data-edit-radio]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editRadio);if(!r)return;$("#radioFormCard").innerHTML=radioForm(r,selectedContract,selectedMonth);bindRadioForm(r,rows,selectedContract,selectedMonth);openBox()});
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
   // Reparto automático: si las fechas cruzan de semana o de mes, la app divide la asignación en
   // bloques semanales (lunes a domingo, sin pasar de mes) y reparte las cuñas según los días de cada uno.
   let chunks=[{...data}];
   if(c&&l){
     if(data.startDate&&data.endDate&&data.startDate>data.endDate)throw new Error("La fecha de fin no puede ser anterior al inicio.");
     if(data.startDate&&data.endDate)chunks=radioSplit(data);
     else if(data.startDate)data.inventoryMonth=data.startDate.slice(0,7),chunks=[{...data}];
     const byMonth={};chunks.forEach(x=>{byMonth[x.inventoryMonth]=(byMonth[x.inventoryMonth]||0)+x.plannedSpots});
     for(const [m,tot] of Object.entries(byMonth)){
      if(!l.monthly?.[m])throw new Error("El programa "+l.station+" · "+l.program+" no tiene inventario contratado en "+radioMonthLabel(m)+".");
      const others=rows.filter(x=>x.id!==existing?.id&&x.contractId===c.id&&x.inventoryMonth===m),st=radioLineStats(c,l,m,others);
      if(tot>st.remaining)throw new Error("Supera el inventario disponible en "+radioMonthLabel(m)+": quedan "+radioFmt(st.remaining)+" "+l.unit+" en "+l.station+" · "+l.program+" y el reparto pide "+radioFmt(tot)+".")}
     chunks.forEach(x=>{x.venue=c.venue;x.station=l.station;x.duration=l.duration;x.timeSlot=l.timeSlot;x.unit=l.unit;x.frequency=x.plannedSpots+" "+l.unit});
     if(chunks.length>1&&!confirm("Las fechas cruzan "+(Object.keys(byMonth).length>1?"de mes y ":"")+"de semana. Se guardará repartido en "+chunks.length+" bloques:\n\n"+chunks.map(x=>fdate(x.startDate)+" – "+fdate(x.endDate)+": "+x.plannedSpots+" "+l.unit).join("\n")+"\n\n¿Guardar así?"))return;
   }
   const assetKey=await uploadAsset(file,"radio",existing?.assetKey);if(assetKey)chunks.forEach(x=>{x.assetKey=assetKey;x.assetName=file?.name||existing?.assetName||""});
   for(let i=0;i<chunks.length;i++){
    if(i===0&&existing?.id)await api("/api/control?module=radio&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(chunks[0])});
    else await api("/api/control?module=radio",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(chunks[i])})}
   if(chunks.length>1){say("Asignación repartida en "+chunks.length+" bloques semanales");radio();return}
   say("Asignación de radio guardada");radio()
 }catch(err){say(err.message)}}
}

const CAMPAIGN_CONFIG={
 taxis:{title:"Taxis",subtitle:"Campañas de publicidad en taxis",hide:["support","location","provider","format"]},
 intercambiadores:{title:"Intercambiadores",subtitle:"CLECE · campañas y soportes en intercambiadores",hide:["location","provider","format"]}
};
// Taxis e intercambiadores: por mes y por teatro. Al entrar solo se ven el mes y los nombres de los
// espacios; las campañas de un espacio se abren al tocarlo (como Home Ticket)
let campView="",campMonth="";
function campMonthOf(r){return String(r.startDate||r.endDate||"").slice(0,7)}
function campInMonth(r,m){const s=r.startDate||r.endDate,e=r.endDate||r.startDate;if(!s)return false;const {startDate,endDate}=monthRange(m);return s<=endDate&&e>=startDate}
async function campaigns(moduleName){
 const cfg=CAMPAIGN_CONFIG[moduleName],d=await api("/api/control?module="+moduleName),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const now=new Date(),cur=monthKey(now),months=[];for(let i=-3;i<=6;i++)months.push(monthKey(new Date(now.getFullYear(),now.getMonth()+i,1)));
 rows.forEach(r=>{const m=campMonthOf(r);if(m&&!months.includes(m))months.push(m)});months.sort();
 if(!campMonth)campMonth=cur;
 const editId=new URLSearchParams(location.hash.split("?")[1]||"").get("edit"),editRow=editId&&rows.find(r=>r.id===editId);
 if(editRow){campView=editRow.venue||"";campMonth=campMonthOf(editRow)||campMonth}
 const inM=rows.filter(r=>campInMonth(r,campMonth)),spaces=[...VENUES,...new Set(rows.map(r=>r.venue).filter(v=>v&&!VENUES.includes(v)))];
 const cnt=v=>inM.filter(r=>r.venue===v).length;
 const monthTabs='<div class="chip-row ht-month-tabs"><span class="chip-label">Mes</span>'+months.map(m=>'<button type="button" class="chip'+(m===campMonth?" on":"")+'" data-camp-month="'+m+'">'+esc(htMonthShort(m))+(inM.length&&m===campMonth?'':'')+'</button>').join("")+'</div>';
 const venueTabs='<div class="chip-row ht-tabs"><span class="chip-label">Espacio</span>'+spaces.map(v=>'<button type="button" class="chip'+(v===campView?" on":"")+'" data-camp-tab="'+esc(v)+'">'+esc(venueShort(v))+(cnt(v)?' <small style="opacity:.6">'+cnt(v)+'</small>':'')+'</button>').join("")+'</div>';
 const mine=campView?inM.filter(r=>r.venue===campView):[];
 const work=campView?'<div class="camp-space"><div class="section-title"><div><small class="section-kicker">'+esc(cfg.title)+' · '+esc(monthLabel(campMonth))+'</small><h2>'+esc(campView)+'</h2></div><div class="actions-row"><button type="button" class="primary" data-camp-new>+ Nueva campaña</button><button type="button" class="ghost" data-camp-close>Cerrar</button></div></div>'+
   '<div id="campaignFormCard"></div><div id="campaignList" class="list">'+(mine.length?campaignItems(mine,moduleName):'<div class="notice">No hay campañas en '+esc(monthLabel(campMonth).toLowerCase())+' para este espacio.</div>')+'</div></div>'
  :'<p class="muted" style="margin:6px 0 10px">'+(inM.length?'Todas las campañas de '+esc(monthLabel(campMonth).toLowerCase())+'. Elige un espacio para filtrar o añadir.':'No hay campañas en '+esc(monthLabel(campMonth).toLowerCase())+'.')+'</p><div id="campaignFormCard"></div><div id="campaignList" class="list">'+(inM.length?campaignItems(inM,moduleName):'')+'</div>';
 app.innerHTML=pageHead(cfg.title,cfg.subtitle,campView?'':'<button id="newCampaign" class="btn">+ Nueva campaña</button>')+'<section class="card">'+monthTabs+venueTabs+work+'</section>';
 $$("[data-camp-month]").forEach(b=>b.onclick=()=>{campMonth=b.dataset.campMonth;campaigns(moduleName)});
 $$("[data-camp-tab]").forEach(b=>b.onclick=()=>{campView=campView===b.dataset.campTab?"":b.dataset.campTab;campaigns(moduleName)});
 $$("[data-camp-close]").forEach(b=>b.onclick=()=>{campView="";campaigns(moduleName)});
 const openNew=()=>{const {startDate,endDate}=monthRange(campMonth);const box=$("#campaignFormCard");box.className="card camp-form";box.innerHTML=campaignForm(moduleName,{venue:campView,startDate,endDate});bindCampaignForm(null,moduleName);box.scrollIntoView({behavior:"smooth",block:"start"})};
 const nb=$("#newCampaign");if(nb)nb.onclick=openNew;$$("[data-camp-new]").forEach(b=>b.onclick=openNew);
 bindCampaignRows(campView?mine:inM,moduleName);
 if(editRow){const box=$("#campaignFormCard");box.className="card camp-form";box.innerHTML=campaignForm(moduleName,editRow);bindCampaignForm(editRow,moduleName);history.replaceState(null,"","#"+moduleName)}
 await hydrateMedia(moduleName);
}
const isVideo=r=>/\.(mp4|mov|m4v|webm)$/i.test(r.assetName||"")||/^video\//.test(r.assetType||"");
function campaignItems(rows,moduleName){return rows.length?rows.map(r=>'<div class="item"><div><h3>'+esc(r.spectacle||r.campaignName||"Campaña")+'</h3><div class="item-meta">'+(r.venue?'<span class="badge">'+esc(r.venue)+'</span>':'')+'<span>'+esc(r.location||r.support||"")+'</span><span>'+esc(r.provider||"")+'</span><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span>'+statusBadge(r.status)+'</div><div class="media-preview'+(isVideo(r)?' media-video':'')+'" data-asset="'+esc(r.assetKey||"")+'" data-module="'+moduleName+'" data-kind="'+(isVideo(r)?'video':'image')+'"'+(r.posterKey?' data-poster="'+esc(r.posterKey)+'"':'')+'></div></div><div class="item-actions"><button data-edit-campaign="'+r.id+'">Editar</button><button class="danger" data-del-campaign="'+r.id+'">Quitar</button></div></div>').join(""):'<div class="notice">No hay campañas registradas.</div>'}
function campaignForm(moduleName,r={}){const cfg=CAMPAIGN_CONFIG[moduleName];return '<div class="section-title"><h2>'+(r.id?"Editar campaña":"Nueva campaña")+'</h2></div><form id="campaignForm" class="form-grid">'+venueSelect(r.venue)+input("spectacle","Espectáculo / campaña",r.spectacle)+input("campaignName","Nombre interno",r.campaignName)+[["support","Soporte / formato"],["location",cfg.location],["provider",cfg.provider],["format","Pieza / formato"]].filter(([n])=>!(cfg.hide||[]).includes(n)).map(([n,l])=>input(n,l,r[n])).join("")+input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+input("deliveryDate","Fecha límite material",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+input("contact","Contacto",r.contact)+selectStatus(r.status)+'<label class="wide">Creatividad (imagen, vídeo o PDF)'+(r.assetName?' · actual: '+esc(r.assetName):'')+'<input id="campaignAsset" type="file" accept="image/*,video/*,application/pdf"></label><label class="wide">Portada del vídeo (imagen; la usa el resumen mensual)'+(r.posterKey?' · ya tiene':'')+'<input id="campaignPoster" type="file" accept="image/*"></label><label class="wide">Condiciones / acuerdo<textarea name="agreement">'+esc(r.agreement||"")+'</textarea></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label><div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelCampaign">Limpiar</button></div></form>'}
function bindCampaignRows(rows,moduleName){$$("[data-edit-campaign]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editCampaign);if(!r)return;const box=$("#campaignFormCard");box.className="card camp-form";box.innerHTML=campaignForm(moduleName,r);bindCampaignForm(r,moduleName);box.scrollIntoView({behavior:"smooth",block:"start"})});$$("[data-del-campaign]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Quitar esta campaña?"))return;const _u="/api/control?module="+moduleName+"&id="+b.dataset.delCampaign;await api(_u,{method:"DELETE"});sayUndo("Campaña quitada",_u,()=>campaigns(moduleName));campaigns(moduleName)})}
function bindCampaignForm(existing,moduleName){const f=$("#campaignForm");if(!f)return;$("#cancelCampaign").onclick=()=>{const box=$("#campaignFormCard");box.className="";box.innerHTML=""};f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#campaignAsset")?.files?.[0],poster=$("#campaignPoster")?.files?.[0];try{const assetKey=await uploadAsset(file,moduleName,existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}if(poster){data.posterKey=await uploadAsset(poster,moduleName);data.posterName=poster.name}if(existing?.id)await api("/api/control?module="+moduleName+"&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module="+moduleName,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});say("Campaña guardada");campaigns(moduleName)}catch(err){say(err.message)}}}

/* ===== HOME TICKET · por teatro + mes + composición PNG ===== */
const HOME_TICKET_SPACES=["Gran Teatro Pavón","Gran Teatro CaixaBank Príncipe Pío","Teatro Serrano","Teatro Arlequín","Gran Castillo de Pedraza","Abono Teatro"];
const HT_POS=[
 {key:"Home Ticket XL · 520 × 856",name:"XL",size:"520 × 856",css:"xl"},
 {key:"HT Superior · 520 × 420",name:"Superior",size:"520 × 420",css:"superior"},
 {key:"HT Inferior · 520 × 420",name:"Inferior",size:"520 × 420",css:"inferior"}
];
const HT_BASES={
 "Gran Teatro Pavón":"/assets/hometicket/gtp.png",
 "Gran Teatro CaixaBank Príncipe Pío":"/assets/hometicket/gtcpp.png",
 "Teatro Serrano":"/assets/hometicket/serrano.png",
 "Teatro Arlequín":"/assets/hometicket/arlequin.png",
 "Gran Castillo de Pedraza":"/assets/hometicket/castillo.png",
 "Abono Teatro":"/assets/hometicket/abonoteatro.png"
};
// Coordenadas relativas de los tres huecos sobre la base suministrada.
const HT_COORDS={
 xl:{x:.033,y:.335,w:.456,h:.499},
 superior:{x:.501,y:.335,w:.438,h:.245},
 inferior:{x:.501,y:.587,w:.438,h:.247}
};
// Huecos medidos sobre la base de cada teatro (proporción del ancho y alto de la imagen)
const HT_COORDS_BY={
 "Gran Teatro Pavón":{"xl": {"x": 0.0451, "y": 0.3415, "w": 0.4583, "h": 0.5086}, "superior": {"x": 0.5312, "y": 0.3508, "w": 0.4295, "h": 0.2341}, "inferior": {"x": 0.5312, "y": 0.6088, "w": 0.4295, "h": 0.2321}},
 "Gran Teatro CaixaBank Príncipe Pío":{"xl": {"x": 0.0341, "y": 0.3441, "w": 0.4664, "h": 0.5151}, "superior": {"x": 0.5166, "y": 0.3434, "w": 0.4493, "h": 0.2522}, "inferior": {"x": 0.5166, "y": 0.6056, "w": 0.4502, "h": 0.2535}},
 "Teatro Serrano":{"xl": {"x": 0.037, "y": 0.3458, "w": 0.462, "h": 0.5134}, "superior": {"x": 0.5256, "y": 0.3546, "w": 0.4336, "h": 0.2406}, "inferior": {"x": 0.5256, "y": 0.616, "w": 0.4336, "h": 0.2359}},
 "Teatro Arlequín":{"xl": {"x": 0.037, "y": 0.3458, "w": 0.462, "h": 0.5134}, "superior": {"x": 0.5256, "y": 0.3546, "w": 0.4336, "h": 0.2406}, "inferior": {"x": 0.5256, "y": 0.616, "w": 0.4336, "h": 0.2359}},
 "Gran Castillo de Pedraza":{"xl": {"x": 0.0445, "y": 0.3414, "w": 0.4654, "h": 0.507}, "superior": {"x": 0.5384, "y": 0.3508, "w": 0.4227, "h": 0.2334}, "inferior": {"x": 0.5384, "y": 0.6063, "w": 0.4227, "h": 0.2327}},
 "Abono Teatro":{"xl": {"x": 0.0398, "y": 0.3461, "w": 0.4626, "h": 0.5023}, "superior": {"x": 0.5242, "y": 0.3461, "w": 0.4436, "h": 0.2455}, "inferior": {"x": 0.5242, "y": 0.605, "w": 0.4436, "h": 0.2435}}
};
const htCoords=v=>HT_COORDS_BY[v]||HT_COORDS;
let htView="",htMonth="";

function htRowMonth(r){return r.month||String(r.startDate||"").slice(0,7)||String(r.endDate||"").slice(0,7)}
function htMonthList(rows){
 const now=new Date(),cur=monthKey(now),months=[];
 for(let i=-2;i<=10;i++)months.push(monthKey(new Date(now.getFullYear(),now.getMonth()+i,1)));
 rows.forEach(r=>{const m=htRowMonth(r);if(m&&!months.includes(m))months.push(m)});
 return [...new Set(months)].sort()
}
function htMonthShort(m){
 const [y,mo]=m.split("-").map(Number);
 const t=new Date(y,mo-1,1).toLocaleDateString("es-ES",{month:"short"}).replace(".","");
 return t.charAt(0).toUpperCase()+t.slice(1)+" "+String(y).slice(2)
}
function htRecord(rows,v,m,p){
 return rows.filter(r=>r.venue===v&&htRowMonth(r)===m&&r.position===p.key)
   .sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")))[0]||null
}
function htCompositeKey(v,m){
 const slug=v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80);
 return "htcomp_"+slug+"_"+m.replace("-","")
}
function htBase(v){return HT_BASES[v]||""}
// Base de repuesto (mismo tamaño que la del Pavón) para los teatros cuya imagen base falta o está vacía:
// así la vista final, el PNG y la miniatura del resumen funcionan igual mientras se sube la buena.
const htFallbackCache={};
function htFallbackBase(v){
 if(htFallbackCache[v])return htFallbackCache[v];
 const W=1043,H=1508,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
 g.fillStyle="#ffffff";g.fillRect(0,0,W,H);g.strokeStyle="#111111";g.lineWidth=4;g.strokeRect(24,120,W-48,H-190);
 g.fillStyle="#111111";g.font="700 40px 'Plus Jakarta Sans', Arial";g.textAlign="center";g.fillText("HOME TICKET",W/2,78);
 g.font="400 64px Anton, Impact, sans-serif";g.fillText(venueShort(v).toUpperCase(),W/2,300);
 g.font="600 26px 'Plus Jakarta Sans', Arial";g.fillStyle="#8a8478";g.fillText(v,W/2,350);
 for(const k of Object.keys(HT_COORDS)){const q=HT_COORDS[k];g.fillStyle="#111111";g.fillRect(q.x*W,q.y*H,q.w*W,q.h*H)}
 return htFallbackCache[v]=c.toDataURL("image/png")
}
window.htFallbackBase=htFallbackBase;

function htMockup(rows,v,m){
 const base=htBase(v);
 if(!base)return '<div class="notice">No hay base de Home Ticket para este espacio.</div>';
 const overlays=HT_POS.map(p=>{
   const r=htRecord(rows,v,m,p);
   const q=htCoords(v)[p.css];
   return '<div class="ht-compose-slot '+p.css+(r&&r.fit==="contain"?" fit-contain":"")+'" style="left:'+(q.x*100)+'%;top:'+(q.y*100)+'%;width:'+(q.w*100)+'%;height:'+(q.h*100)+'%">'+
     (r?.assetKey?'<div class="media-preview" data-asset="'+esc(r.assetKey)+'" data-module="hometicket" data-kind="image"></div>':'<span>'+p.name+'</span>')+
   '</div>'
 }).join("");
 return '<div class="ht-compose-card"><div class="ht-compose-top"><div><small class="section-kicker">'+esc(monthLabel(m))+'</small><h3>Vista final</h3></div><button type="button" data-ht-export="'+esc(v)+'">Exportar PNG</button></div>'+
   '<div class="ht-compose-stage"><img src="'+base+'" alt="Base Home Ticket · '+esc(v)+'" onerror="this.onerror=null;this.src=htFallbackBase('+esc(JSON.stringify(v))+')">'+overlays+'</div></div>'
}
function htSlot(rows,v,m,p){
 const r=htRecord(rows,v,m,p);
 return '<div class="ht-slot '+p.css+(r?"":" empty")+'">'+
   '<div class="ht-slot-head"><b>'+p.name+'</b><span>'+p.size+'</span></div>'+
   '<div class="ht-slot-preview'+(r&&r.fit==="contain"?" fit-contain":"")+'">'+(r?.assetKey?'<div class="media-preview" data-asset="'+esc(r.assetKey)+'" data-module="hometicket" data-kind="image"></div>':'<span>Sin pieza</span>')+'</div>'+
   (r?'<div class="ht-info"><h3>'+esc(r.spectacle||"Sin espectáculo")+'</h3><div class="item-meta">'+statusBadge(r.materialStatus||"pendiente")+'</div></div>':'')+
   '<div class="item-actions">'+
     (r?(r.assetKey?'<button type="button" data-ht-fit="'+r.id+'" title="Cómo entra la pieza en el hueco negro">'+(r.fit==="contain"?"Ajuste: entera":"Ajuste: rellenar")+'</button>':'')+'<button type="button" data-edit-ht="'+r.id+'">Editar</button><button type="button" data-new-ht="'+esc(v)+'|'+esc(p.key)+'">Cambiar</button>':'<button type="button" class="primary" data-new-ht="'+esc(v)+'|'+esc(p.key)+'">+ Añadir</button>')+
   '</div></div>'
}
async function htLoadImage(url){
 return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url})
}
async function htCompositeBlob(v,m,rows){
 const baseUrl=htBase(v);if(!baseUrl)throw new Error("Este espacio no tiene una base Home Ticket.");
 const base=await htLoadImage(baseUrl).catch(()=>htLoadImage(htFallbackBase(v))),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
 canvas.width=base.naturalWidth||base.width;canvas.height=base.naturalHeight||base.height;ctx.drawImage(base,0,0,canvas.width,canvas.height);
 for(const p of HT_POS){
   const r=htRecord(rows,v,m,p);if(!r?.assetKey)continue;
   const u=await blobUrl(r.assetKey,"hometicket");if(!u)continue;
   const im=await htLoadImage(u).catch(()=>null),c=htCoords(v)[p.css];if(!im)continue;
   // la pieza entra entera en su hueco, sin deformarse (centrada sobre negro)
   // «rellenar» (por defecto) tapa todo el negro recortando lo que sobre; «entera» la encaja sin recortar
   const bx=c.x*canvas.width,by=c.y*canvas.height,bw=c.w*canvas.width,bh=c.h*canvas.height,fit=r.fit==="contain"?Math.min:Math.max,k=fit(bw/im.naturalWidth,bh/im.naturalHeight),dw=im.naturalWidth*k,dh=im.naturalHeight*k;
   ctx.save();ctx.beginPath();ctx.rect(bx,by,bw,bh);ctx.clip();ctx.fillStyle="#000";ctx.fillRect(bx,by,bw,bh);ctx.drawImage(im,bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh);ctx.restore()
 }
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("No se ha podido generar el PNG.")),"image/png"))
}
async function htPutComposite(v,m,rows){
 const mine=rows.filter(r=>r.venue===v&&htRowMonth(r)===m);
 if(!mine.length)return "";
 const blob=await htCompositeBlob(v,m,rows),k=htCompositeKey(v,m);
 const r=await fetch("/api/asset?key="+encodeURIComponent(k)+"&module=hometicket",{method:"PUT",headers:headers({"content-type":"image/png"}),body:blob});
 if(!r.ok)throw new Error(await r.text());
 // Guardamos la referencia del montaje final en el registro más reciente del mes.
 const target=[...mine].sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")))[0];
 if(target){
   await api("/api/control?module=hometicket&id="+target.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...target,month:m,compositeAssetKey:k})})
 }
 return k
}
async function htRefreshComposite(v,m){
 // La pieza ya está guardada: si la composición falla, se avisa pero no se bloquea el guardado
 let rows=[];try{const d=await api("/api/control?module=hometicket");rows=d.rows||[];await htPutComposite(v,m,rows)}catch(e){console.warn(e);say("Pieza guardada. La vista final no se ha podido actualizar ahora.")}
 return rows
}
async function htDownload(v,m,rows){
 const blob=await htCompositeBlob(v,m,rows),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=("home-ticket-"+venueShort(v)+"-"+m+".png").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]+/g,"-");
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)
}

async function homeTicket(){
 const d=await api("/api/control?module=hometicket"),rows=d.rows||[];loadSpectacles();learnSpectacles(rows);
 const months=htMonthList(rows),cur=monthKey(new Date());if(!htMonth)htMonth=months.includes(cur)?cur:months[0];
 const htSpaces=[...HOME_TICKET_SPACES,...new Set(rows.map(r=>r.venue).filter(v=>v&&!HOME_TICKET_SPACES.includes(v)))];
 const editId=new URLSearchParams(location.hash.split("?")[1]||"").get("edit"),editRow=editId&&rows.find(r=>r.id===editId);
 if(editRow){htView=editRow.venue;htMonth=htRowMonth(editRow)||htMonth}
 if(htView&&!htSpaces.includes(htView))htView="";
 // Al entrar solo se ven los nombres de los espacios; el Home Ticket se abre al tocar uno
 const monthTabs='<div class="chip-row ht-month-tabs"><span class="chip-label">Mes</span>'+months.map(m=>'<button type="button" class="chip'+(m===htMonth?" on":"")+'" data-ht-month="'+m+'">'+esc(htMonthShort(m))+'</button>').join("")+'</div>';
 const cnt=v=>rows.filter(r=>r.venue===v&&htRowMonth(r)===htMonth).length;
 const venueTabs='<div class="chip-row ht-tabs"><span class="chip-label">Espacio</span>'+htSpaces.map(v=>'<button type="button" class="chip'+(v===htView?" on":"")+'" data-ht-tab="'+esc(v)+'">'+esc(venueShort(v))+(cnt(v)?' <small style="opacity:.6">'+cnt(v)+'</small>':'')+'</button>').join("")+'</div>'+(htView?'':'<div class="ht-over">'+htSpaces.map(v=>'<button type="button" class="ht-over-row" data-ht-tab="'+esc(v)+'"><b>'+esc(venueShort(v))+'</b><span>'+HT_POS.map(p=>{const r=htRecord(rows,v,htMonth,p);return esc(p.name)+': '+(r?esc(r.spectacle||"pieza sin título"):'<em>sin pieza</em>')}).join(' · ')+'</span></button>').join("")+'</div><p class="muted" style="margin:8px 0 0">Toca un espacio para editar su Home Ticket de '+esc(monthLabel(htMonth).toLowerCase())+'.</p>');
 const v=htView,m=htMonth,mine=rows.filter(r=>r.venue===v&&htRowMonth(r)===m);
 const work=v?'<div class="ht-space" data-venue="'+esc(v)+'"><div class="section-title"><div><small class="section-kicker">Home Ticket · '+esc(monthLabel(m))+'</small><h2>'+esc(v)+'</h2></div><div class="actions-row"><button type="button" class="primary" data-ht-all="'+esc(v)+'">Actualizar los tres</button><button type="button" class="ghost" data-ht-close>Cerrar</button></div></div>'+
  '<div class="ht-panel" data-ht-panel="'+esc(v)+'"></div>'+
  '<div class="ht-workbench">'+htMockup(rows,v,m)+'<div class="ht-slots">'+HT_POS.map(p=>htSlot(rows,v,m,p)).join("")+'</div></div>'+
  (mine.length?'<details class="ht-history"><summary>Registros de '+esc(monthLabel(m))+' ('+mine.length+')</summary><div class="list">'+htItems(mine)+'</div></details>':'')+
  '</div>':'';
 app.innerHTML=pageHead("Home Ticket","Base por teatro, piezas por mes y exportación PNG")+
  '<section class="card">'+monthTabs+venueTabs+work+'</section>';

 $$("[data-ht-month]").forEach(b=>b.onclick=()=>{htMonth=b.dataset.htMonth;homeTicket()});
 $$("[data-ht-tab]").forEach(b=>b.onclick=()=>{htView=htView===b.dataset.htTab?"":b.dataset.htTab;homeTicket()});
 $$("[data-ht-close]").forEach(b=>b.onclick=()=>{htView="";homeTicket()});
 $$("[data-ht-fit]").forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.htFit);if(!r)return;b.disabled=true;try{await api("/api/control?module=hometicket&id="+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({fit:r.fit==="contain"?"cover":"contain"})});await htRefreshComposite(r.venue,htRowMonth(r)||htMonth);homeTicket()}catch(e){say(e.message);b.disabled=false}});
 const panelOf=v=>$('[data-ht-panel="'+CSS.escape(v)+'"]');
 const open=(v,html,bind)=>{$$(".ht-panel").forEach(x=>x.innerHTML="");const p=panelOf(v);p.innerHTML='<div class="ht-form card">'+html+'</div>';bind(p);p.scrollIntoView({behavior:"smooth",block:"start"})};
 $$("[data-edit-ht]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editHt);if(!r)return;open(r.venue,htForm(r,htMonth),()=>bindHTForm(r,htMonth))});
 $$("[data-new-ht]").forEach(b=>b.onclick=()=>{const [vv,pos]=b.dataset.newHt.split("|");open(vv,htForm({venue:vv,position:pos,month:htMonth},htMonth),()=>bindHTForm(null,htMonth))});
 $$("[data-ht-all]").forEach(b=>b.onclick=()=>{const vv=b.dataset.htAll;open(vv,htAllForm(vv,htMonth),()=>bindHTAll(vv,htMonth))});
 $$("[data-ht-export]").forEach(b=>b.onclick=async()=>{try{b.disabled=true;b.textContent="Generando…";await htDownload(b.dataset.htExport,htMonth,rows)}catch(e){say(e.message)}finally{b.disabled=false;b.textContent="Exportar PNG"}});
 $$("[data-del-ht]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Quitar esta pieza?"))return;const r=rows.find(x=>x.id===b.dataset.delHt);const _u="/api/control?module=hometicket&id="+b.dataset.delHt;await api(_u,{method:"DELETE"});if(r)await htRefreshComposite(r.venue,htRowMonth(r)||htMonth).catch(()=>{});sayUndo("Pieza quitada",_u,()=>homeTicket());homeTicket()});
 await hydrateMedia("hometicket")
}

function htItems(rows){return rows.length?[...rows].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).map(r=>'<div class="item"><div><h3>'+esc((HT_POS.find(p=>p.key===r.position)||{name:r.position||"Home Ticket"}).name)+' · '+esc(r.spectacle||"")+'</h3><div class="item-meta"><span>'+esc(monthLabel(htRowMonth(r)))+'</span><span>Material: '+esc(r.materialStatus||"sin indicar")+'</span>'+statusBadge(r.status)+'</div></div><div class="item-actions"><button data-edit-ht="'+r.id+'">Editar</button><button class="danger" data-del-ht="'+r.id+'">Quitar</button></div></div>').join(""):'<div class="notice">Todavía no hay piezas cargadas para este Home Ticket.</div>'}

function htForm(r={},selectedMonth=htMonth){
 const pos=HT_POS.find(p=>p.key===r.position)||HT_POS[0],m=r.month||htRowMonth(r)||selectedMonth,{startDate,endDate}=monthRange(m);
 return '<div class="section-title"><div><small class="section-kicker">'+esc(venueShort(r.venue||""))+' · '+pos.name+' · '+pos.size+'</small><h2>'+(r.id?"Editar pieza":"Nueva pieza")+'</h2></div><button type="button" class="ghost" id="cancelHT">Cerrar</button></div>'+
  '<form id="htForm" class="form-grid"><input type="hidden" name="venue" value="'+esc(r.venue||"")+'"><input type="hidden" name="position" value="'+esc(pos.key)+'"><input type="hidden" name="month" value="'+esc(m)+'"><input type="hidden" name="startDate" value="'+startDate+'"><input type="hidden" name="endDate" value="'+endDate+'">'+
  '<label>Mes<input value="'+esc(monthLabel(m))+'" disabled></label>'+materialStatusSelect(r.materialStatus)+
  '<label class="wide">Ajuste en el hueco<select name="fit"><option value="cover"'+(r.fit!=="contain"?" selected":"")+'>Rellenar el hueco negro (recorta lo que sobre)</option><option value="contain"'+(r.fit==="contain"?" selected":"")+'>Pieza entera (puede quedar borde negro)</option></select></label>'+
  '<label class="wide">Espectáculo<input name="spectacle" data-ac="spectacle" autocomplete="off" placeholder="Empieza a escribir y elige de la lista" value="'+esc(r.spectacle||"")+'" required></label>'+
  '<label class="wide">Creatividad'+(r.assetKey?' (deja vacío para mantener la actual)':'')+'<input id="htAsset" type="file" accept="image/*"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label>'+
  '<div class="wide actions-row"><button class="primary" type="submit">Guardar</button>'+(r.id?'<button type="button" class="danger" data-del-ht="'+r.id+'">Quitar</button>':'')+'</div></form>'
}
function htSaving(f,on){const b=f.querySelector('button[type="submit"]');if(b){b.disabled=on;b.textContent=on?"Guardando…":"Guardar"}}
function bindHTForm(existing,selectedMonth){
 const f=$("#htForm");if(!f)return;$("#cancelHT").onclick=()=>{f.closest(".ht-panel").innerHTML=""};
 const del=f.querySelector("[data-del-ht]");if(del)del.onclick=async()=>{if(!confirm("¿Quitar esta pieza?"))return;const _u="/api/control?module=hometicket&id="+del.dataset.delHt;await api(_u,{method:"DELETE"});await htRefreshComposite(existing.venue,existing.month||htRowMonth(existing)||selectedMonth).catch(()=>{});sayUndo("Pieza quitada",_u,()=>homeTicket());homeTicket()};
 f.onsubmit=async e=>{e.preventDefault();if(f.dataset.busy)return;f.dataset.busy="1";htSaving(f,true);const data=formObject(f),file=$("#htAsset")?.files?.[0];
  try{if(!existing)data.status="activo";const assetKey=await uploadAsset(file,"hometicket",existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}
   if(existing?.id)await api("/api/control?module=hometicket&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   else await api("/api/control?module=hometicket",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   await htRefreshComposite(data.venue,data.month);say("Home Ticket guardado");homeTicket()
  }catch(err){say(err.message);delete f.dataset.busy;htSaving(f,false)}
 }
}

function htAllForm(v,m){
 const {startDate,endDate}=monthRange(m);
 return '<div class="section-title"><div><small class="section-kicker">'+esc(venueShort(v))+' · '+esc(monthLabel(m))+'</small><h2>Actualizar los tres</h2></div><button type="button" class="ghost" id="cancelHTAll">Cerrar</button></div>'+
 '<form id="htAllForm" class="form-grid"><input type="hidden" name="month" value="'+m+'"><input type="hidden" name="startDate" value="'+startDate+'"><input type="hidden" name="endDate" value="'+endDate+'">'+materialStatusSelect("pendiente")+
 HT_POS.map((p,i)=>'<div class="wide ht-all-row"><b>'+p.name+' <span>'+p.size+'</span></b><input name="spectacle_'+i+'" data-ac="spectacle" autocomplete="off" placeholder="Espectáculo (vacío si no cambia)"><label class="btn">Creatividad<input type="file" accept="image/*" data-ht-file="'+i+'" hidden></label><em data-ht-fname="'+i+'"></em></div>').join("")+
 '<p class="wide cart-legacy" style="margin:0">Solo se guardan los huecos con espectáculo. Los demás se quedan como están.</p><div class="wide actions-row"><button class="primary" type="submit">Guardar</button></div></form>'
}
function bindHTAll(v,m){
 const f=$("#htAllForm");if(!f)return;$("#cancelHTAll").onclick=()=>{f.closest(".ht-panel").innerHTML=""};
 $$("[data-ht-file]",f).forEach(i=>i.onchange=()=>{const n=$('[data-ht-fname="'+i.dataset.htFile+'"]',f);if(n)n.textContent=i.files[0]?i.files[0].name:""});
 f.onsubmit=async e=>{e.preventDefault();if(f.dataset.busy)return;const d=formObject(f);
  const todo=HT_POS.map((p,i)=>({p,i,spectacle:(d["spectacle_"+i]||"").trim(),file:$('[data-ht-file="'+i+'"]',f).files[0]})).filter(x=>x.spectacle);
  if(!todo.length){say("Escribe al menos un espectáculo");return}f.dataset.busy="1";htSaving(f,true);
  try{const current=(await api("/api/control?module=hometicket")).rows||[];
   for(const x of todo){const old=htRecord(current,v,m,x.p),data={venue:v,position:x.p.key,month:m,spectacle:x.spectacle,startDate:d.startDate,endDate:d.endDate,materialStatus:d.materialStatus,status:"activo"};
    const k=await uploadAsset(x.file,"hometicket",old?.assetKey||"");if(k){data.assetKey=k;data.assetName=x.file?.name||old?.assetName||""}
    if(old?.id)await api("/api/control?module=hometicket&id="+old.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
    else await api("/api/control?module=hometicket",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)})
   }
   await htRefreshComposite(v,m);say(todo.length+(todo.length===1?" pieza guardada":" piezas guardadas"));homeTicket()
  }catch(err){say(err.message);delete f.dataset.busy;htSaving(f,false)}
 }
}
/* ===== /HOME TICKET ===== */

// ===== Revistas: una página de publicidad al mes en cada revista =====
// Presentación opcional del resumen mensual (se puede editar antes de enviar)
const AR_INTRO="Este correo es el resumen mensual de la publicidad y la comunicación de los espacios del grupo. Lo prepara Yellow Media desde Yellow Control, la herramienta donde registramos cada soporte, cuña, página y campaña.\n\nArriba están los comprobantes del mes: lo instalado, emitido y publicado, con su cifra. Debajo va el detalle por apartado, con la imagen de cada pieza: fachada del Gran Teatro Pavón y cartelera del Teatro Arlequín, Home Ticket, radio, taxis e intercambiadores, revistas y comunicación.\n\nLos vídeos y las cuñas de radio se abren desde los botones del propio correo, sin necesidad de entrar en ninguna aplicación.";
const MAGAZINES=["Revista Teatros","AEscena","Godot"];
// Nombre que se muestra (el valor guardado sigue siendo el mismo para no perder las páginas ya subidas)
const magName=m=>m==="Revista Teatros"?"Teatros":(m||"");
// Intercambios puntuales con revistas sin acuerdo: cualquier nombre fuera de MAGAZINES
const isXchg=r=>r&&(r.deal==="intercambio"||!MAGAZINES.includes(r.magazine));
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
 const xchg=m=>rows.filter(r=>r.month===m&&isXchg(r)).sort((a,b)=>String(a.magazine).localeCompare(String(b.magazine)));
 const xcell=r=>'<button type="button" class="mag-cover xchg" data-mag-open="'+r.id+'"><span class="mag-img media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="revistas" data-kind="image"></span><span class="mag-name"><i class="mag-dot '+(done(r)?"ok":"warn")+'"></i>'+esc(r.magazine||"Revista")+'</span><span class="mag-show">'+esc(r.spectacle||"Sin espectáculo")+'</span></button>';
 const done=r=>["recibido","entregado","listo"].includes(String(r.materialStatus||"").toLowerCase());
 // Miniatura por revista y mes; al tocarla se abre la ficha con la página en grande
 const cell=(mag,m)=>{const r=find(mag,m);if(!r)return '<button type="button" class="mag-cover empty" data-add-revista="'+esc(mag)+'|'+m+'"><span class="mag-img"><i>+</i></span><span class="mag-name">'+esc(magName(mag))+'</span><span class="mag-show">Sin página</span></button>';
  return '<button type="button" class="mag-cover" data-mag-open="'+r.id+'"><span class="mag-img media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="revistas" data-kind="image"></span><span class="mag-name"><i class="mag-dot '+(done(r)?"ok":"warn")+'"></i>'+esc(magName(mag))+'</span><span class="mag-show">'+esc(r.spectacle||r.campaignName||"Sin espectáculo")+'</span></button>'};
 const grid='<div class="mag-head"><span></span>'+MAGAZINES.map(m=>'<span>'+esc(magName(m))+'</span>').join("")+'</div>'+months.map(m=>'<div class="mag-month'+(m===cur?' current':'')+'" data-month="'+m+'"><div class="mag-label">'+esc(monthLabel(m))+'</div>'+MAGAZINES.map(mag=>cell(mag,m)).join("")+(xchg(m).length?'<div class="mag-extra"><small>Intercambios · '+xchg(m).length+'</small><div>'+xchg(m).map(xcell).join("")+'</div></div>':'')+'</div>').join("");
 app.innerHTML=pageHead("Revistas de Teatros","Página de publicidad mensual en "+MAGAZINES.map(magName).join(", ").replace(/, ([^,]*)$/," y $1"),'<button id="newXchg">+ Intercambio</button><button id="newRevista" class="primary">+ Nueva página</button>')+moduleKpis(rows,"Páginas este mes")+'<div class="grid two-col"><section class="card mag-calendar">'+grid+'</section><section class="card" id="revistasFormCard">'+revistaForm()+'</section></div>';
 magChips(months,cur);const openForm=r=>{$("#revistasFormCard").innerHTML=revistaForm(r);bindRevistaForm(r&&r.id?r:null,rows)};
 $("#newRevista").onclick=()=>openForm({month:cur});
 $("#newXchg").onclick=()=>{openForm({month:cur,deal:"intercambio"});$("#revistasFormCard").scrollIntoView({behavior:"smooth",block:"start"})};
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
  '<div class="mag-sheet-info"><small class="section-kicker">'+esc(magName(r.magazine))+(isXchg(r)?' · intercambio':'')+' · '+esc(monthLabel(r.month||""))+'</small><h2>'+esc(r.spectacle||r.campaignName||"Sin espectáculo")+'</h2>'+(r.venue?'<p class="muted">'+esc(r.venue)+'</p>':'')+
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
 const xg=isXchg(r)&&(r.id||r.deal==="intercambio");
 return '<div class="section-title"><h2>'+(r.id?(xg?"Editar intercambio":"Editar página"):(xg?"Nuevo intercambio":"Nueva página"))+'</h2></div><form id="revistaForm" class="form-grid">'+venueSelect(r.venue)+'<label>Revista<select name="magazine" id="revMag">'+MAGAZINES.map(x=>'<option value="'+esc(x)+'" '+(!xg&&x===r.magazine?"selected":"")+'>'+esc(magName(x))+'</option>').join("")+'<option value="__otra" '+(xg?"selected":"")+'>Otra revista (intercambio)</option></select></label><label id="revOtherBox" style="'+(xg?'':'display:none')+'">Nombre de la revista<input name="otherMagazine" value="'+esc(xg?(r.magazine||""):"")+'" placeholder="Ej.: Madrid Teatro"></label><label>Mes<select name="month">'+monthOpts.map(m=>'<option value="'+m+'" '+(m===(r.month||monthKey(now))?"selected":"")+'>'+esc(monthLabel(m))+'</option>').join("")+'</select></label>'+input("spectacle","Espectáculo anunciado",r.spectacle)+input("deliveryDate","Cierre de edición (fecha límite del material)",r.deliveryDate,"date")+materialStatusSelect(r.materialStatus)+input("contact","Contacto de la revista",r.contact)+'<label class="wide">Cartel / página<input id="revistaAsset" type="file" accept="image/*,application/pdf"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label><div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelRevista">Limpiar</button></div></form>'}
function bindRevistaForm(existing,rows=[]){const f=$("#revistaForm");if(!f)return;
 const ms=$("#revMag"),ob=$("#revOtherBox");if(ms&&ob)ms.onchange=()=>{const on=ms.value==="__otra";ob.style.display=on?"":"none";if(on)ob.querySelector("input").focus()};$("#cancelRevista").onclick=()=>{$("#revistasFormCard").innerHTML=revistaForm();bindRevistaForm(null,rows)};
 f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#revistaAsset")?.files?.[0];Object.assign(data,monthRange(data.month));data.status="activo";
  if(data.magazine==="__otra"){const n=String(data.otherMagazine||"").trim();if(!n){say("Escribe el nombre de la revista");return}data.magazine=n;data.deal="intercambio"}else data.deal="acuerdo";delete data.otherMagazine;
  // Revistas del acuerdo: una sola página por revista y mes (si ya existe, se actualiza esa).
  // Intercambios: sin límite; cada guardado crea uno nuevo salvo que se esté editando uno.
  const target=existing||(data.deal==="intercambio"?null:rows.find(r=>r.magazine===data.magazine&&r.month===data.month&&!isXchg(r)))||null;
  try{const assetKey=await uploadAsset(file,"revistas",target?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||target?.assetName||""}
   if(target?.id)await api("/api/control?module=revistas&id="+target.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   else await api("/api/control?module=revistas",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
   say(data.deal==="intercambio"?"Intercambio guardado":"Página guardada");revistas()}catch(err){say(err.message)}}}

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
const VENUE_SHORT={"Gran Teatro Pavón":"Pavón","Gran Teatro CaixaBank Príncipe Pío":"Príncipe Pío","Teatro Serrano":"Serrano","Teatro Arlequín":"Arlequín","Gran Castillo de Pedraza":"Castillo","Abono Teatro":"Abono Teatro","Soho City Madrid":"Soho City","Todos los espacios":"Todos"};
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
// Teatros con cartelería. Cada vista pertenece a uno; los soportes del Arlequín llevan el prefijo arlequin__
const CART_VENUES=[{id:"pavon",name:"Gran Teatro Pavón",short:"Pavón",file:"Pavon"},{id:"arlequin",name:"Teatro Arlequín",short:"Arlequín",file:"Arlequin"}];
const CART_VIEWS=[
 {id:"taquilla",venue:"pavon",name:"Taquilla cerrada",img:"/assets/facade/taquilla.webp",w:1448,h:1086},
 {id:"lona",venue:"pavon",name:"Lona + secundarios",img:"/assets/facade/lona.webp",w:856,h:718},
 {id:"abierta",venue:"pavon",name:"Taquilla abierta",img:"/assets/facade/abierta.webp",w:946,h:1381},
 {id:"columna",venue:"pavon",name:"Columna 1",img:"/assets/columna1.webp",w:1086,h:1448},
 {id:"arlequin",venue:"arlequin",name:"Cartelera",img:"/assets/facade/arlequin.webp",w:1400,h:1254}
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
 {key:"taquilla__columna_1",view:"columna",name:"Columna 1",r:[67.0,39.2,18.1,25.3]},
 {key:"arlequin__cartel-1",view:"arlequin",name:"Cartel 1 · 90×186",r:[4.66,13.04,38.74,79.17]},
 {key:"arlequin__cartel-2",view:"arlequin",name:"Cartel 2 · 76×114",r:[46.99,13.38,42.78,46.37]},
 {key:"arlequin__cartel-3",view:"arlequin",name:"Cartel 3 · 76×53,5",r:[46.9,64.26,44.36,25.2]}
];
const CART_STATUS=["pendiente","aprobado","en producción","instalado"];
function cartFingerprint(st,k){const m=(st.slots||{})[k]||{},s=(st.schedule||{})[k]||{};return JSON.stringify([m.rev||"",!!m.hasImage,m.mode||"contain",s.title||"",s.installDate||"",s.removeDate||"",s.status||"",s.notes||""])}
const cart={base:{},loaded:false,venue:"pavon",view:"taquilla",sel:null,night:false,slots:{},schedule:{},img:{},dirty:new Set(),imgDirty:new Set(),updatedAt:null,saving:false};
const cartSlot=k=>CART_SLOTS.find(s=>s.key===k);
const cartView=id=>CART_VIEWS.find(v=>v.id===id);
const cartVenue=(id=cart.venue)=>CART_VENUES.find(v=>v.id===id)||CART_VENUES[0];
const cartVViews=()=>CART_VIEWS.filter(v=>v.venue===cart.venue);
const cartVSlots=()=>CART_SLOTS.filter(s=>cartView(s.view).venue===cart.venue);
function canEditCart(){return roles().some(r=>["admin","gestion","carteleria"].includes(r))}
function cartSched(k){return cart.schedule[k]||(cart.schedule[k]={date:"",next:"",title:"",installDate:"",removeDate:"",status:"",notes:""})}
function cartMode(k){return (cart.slots[k]&&cart.slots[k].mode)||"contain"}
function cartDaysTo(iso){if(!iso)return null;const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(iso+"T00:00:00")-t)/864e5)}
function cartNextDate(k){const s=cartSched(k);const t=localToday();const ds=[["Instalación",s.installDate],["Retirada",s.removeDate]].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x[1]||""));const fut=ds.filter(x=>x[1]>=t).sort((a,b)=>a[1].localeCompare(b[1]));return fut[0]||null}

// Carteles: se guardan en el navegador por versión (rev) y solo se descargan cuando cambian
async function cartImgFetch(k){const rev=String(cart.slots[k]?.rev||"0"),u="/api/image?key="+encodeURIComponent(k)+"&rev="+encodeURIComponent(rev);let c=null;try{if(rev&&window.caches)c=await caches.open("yc-cart-img")}catch{}
 if(c){const hit=await c.match(u).catch(()=>null);if(hit)return hit.text()}
 const r=await fetch("/api/image?key="+encodeURIComponent(k),{cache:"no-store",headers:headers()});if(!r.ok)return null;const t=await r.text();
 if(c&&t.startsWith("data:image/")){try{for(const q of await c.keys())if(q.url.includes("key="+encodeURIComponent(k)+"&"))await c.delete(q);await c.put(u,new Response(t))}catch{}}
 return t}
async function cartLoad(){
 const d=await api("/api/state",{cache:"no-store"});const st=d.state||{};
 cart.slots=st.slots||{};cart.schedule=st.schedule||{};cart.updatedAt=st.updatedAt||null;cart.base={};CART_SLOTS.forEach(s=>{cart.base[s.key]=cartFingerprint(st,s.key)});cart.img={};cart.dirty.clear();cart.imgDirty.clear();
 await Promise.all(CART_SLOTS.filter(s=>cart.slots[s.key]&&cart.slots[s.key].hasImage).map(async s=>{try{const t=await cartImgFetch(s.key);if(t)cart.img[s.key]=t}catch{}}));
 cart.loaded=true;
}

async function carteleria(keep){
 if(!keep&&(!cart.loaded||!cart.dirty.size))await cartLoad();
 const q=new URLSearchParams((location.hash.split("?")[1])||"");const tq=q.get("teatro");if(tq&&CART_VENUES.some(x=>x.id===tq)){cart.venue=tq;cart.view=CART_VIEWS.find(x=>x.venue===tq).id}const v=q.get("vista");if(v&&cartView(v)){cart.view=v;cart.venue=cartView(v).venue}const sop=q.get("soporte");if(sop&&cartSlot(sop)){cart.view=cartSlot(sop).view;cart.venue=cartView(cart.view).venue;cart.sel=sop;history.replaceState(null,"","#carteleria")}
 if(cartView(cart.view).venue!==cart.venue)cart.view=cartVViews()[0].id;
 if(!cart.sel||cartSlot(cart.sel).view!==cart.view)cart.sel=CART_SLOTS.find(s=>s.view===cart.view).key;
 const edit=canEditCart(),VS=cartVSlots(),ven=cartVenue();
 const withImg=VS.filter(s=>cart.img[s.key]).length;
 const upcoming=VS.map(s=>({s,n:cartNextDate(s.key)})).filter(x=>x.n).sort((a,b)=>a.n[1].localeCompare(b.n[1]));
 const next=upcoming[0];const nd=next?cartDaysTo(next.n[1]):null;
 const pend=VS.filter(s=>{const st=cartSched(s.key).status;return st&&st!=="instalado"}).length;
 app.innerHTML=pageHead("Cartelería",ven.id==="pavon"?"Fachada y soportes del Gran Teatro Pavón":"Cartelera del Teatro Arlequín (Gran Vía)",
   '<button type="button" id="cartShare">Compartir</button><button type="button" id="cartExport">Exportar vista PNG</button>'+(cartVViews().length>1?'<button type="button" id="cartExportAll">Exportar todas PNG</button>':'')+''+(edit?'<button type="button" id="cartMontaje">Confirmar montaje</button><button type="button" class="primary" id="cartSave">Guardar cambios</button>':''))+
  '<div class="chip-row cart-venues" id="cartVenues">'+CART_VENUES.map(x=>{const n=CART_SLOTS.filter(s=>cartView(s.view).venue===x.id).length;return '<button type="button" class="chip'+(x.id===cart.venue?" on":"")+'" data-venue="'+x.id+'">'+esc(x.name)+' <i class="cnt">'+n+'</i></button>'}).join("")+'</div>'+
  '<div id="montajePanel"></div>'+
  '<div class="kpi-row">'+kpi(withImg+"/"+VS.length,"Soportes con cartel")+kpi(upcoming.length,"Cambios programados")+(next?'<span class="kpi '+(nd<=3?"warn":"")+'"><b>'+(nd===0?"HOY":"D-"+nd)+'</b><em>'+esc(next.n[0]+" · "+next.s.name)+'</em></span>':kpi(0,"Sin cambios próximos"))+kpi(pend,"Por instalar",pend?"warn":"")+'</div>'+
  '<div class="cart-sync" id="cartSync"></div>'+
  '<div class="grid cart-grid">'+
   '<section class="card cart-preview"><div class="section-title"><div><small class="section-kicker">Previsualización</small><h2 id="cartViewName"></h2></div><div class="seg" id="cartNight"><button type="button" data-n="0">Día</button><button type="button" data-n="1">Noche</button></div></div>'+
   '<div class="chip-row cart-views" id="cartViews"'+(cartVViews().length<2?' hidden':'')+'>'+cartVViews().map(v=>'<button type="button" class="chip" data-v="'+v.id+'">'+esc(v.name)+'</button>').join("")+'</div>'+
   '<div class="cart-stage-wrap"><div class="cart-stage" id="cartStage"></div></div>'+
   '<p class="cart-hint">'+(edit?"Toca un soporte para editarlo. Los cambios se ven aquí antes de guardar.":"Vista de consulta.")+'</p>'+
   '<div class="chip-row" id="cartSlotChips"></div></section>'+
   '<section class="card cart-panel" id="cartPanel"></section>'+
  '</div>'+
  '<section class="card" style="margin-top:14px"><div class="section-title"><div><small class="section-kicker">Agenda</small><h2>Próximos cambios</h2></div></div><div class="list" id="cartUpcoming"></div></section>'+
  '<section style="margin-top:18px"><div class="home-section-label"><span>Todos los soportes · '+esc(ven.short)+'</span><span>'+VS.length+' soportes</span></div><div class="cart-cards" id="cartCards"></div></section>'+
  (edit?'<div class="cart-savebar" id="cartSavebar"><span>Cambios sin guardar</span><button type="button" class="primary" id="cartSave2">Guardar</button></div>':'')+
  '<input type="file" id="cartFile" accept="image/*" hidden>';
 $("#cartViews").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;cart.view=c.dataset.v;cart.sel=CART_SLOTS.find(s=>s.view===cart.view).key;cartRender()};
 $("#cartVenues").onclick=e=>{const c=e.target.closest("[data-venue]");if(!c||c.dataset.venue===cart.venue)return;cart.venue=c.dataset.venue;cart.view=cartVViews()[0].id;cart.sel=null;montaje.sel.clear();carteleria(true)};
 $("#cartNight").onclick=e=>{const b=e.target.closest("button");if(!b)return;cart.night=b.dataset.n==="1";cartRender()};
 $("#cartExport").onclick=()=>cartExport(false);if($("#cartExportAll"))$("#cartExportAll").onclick=()=>cartExportAll();
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
 [...montaje.sel].forEach(k=>{if(!cartSlot(k)||cartView(cartSlot(k).view).venue!==cart.venue)montaje.sel.delete(k)});
 const groups=cartVViews().map(v=>({v,slots:CART_SLOTS.filter(s=>s.view===v.id)})).filter(g=>g.slots.length);
 p.innerHTML='<section class="card montaje-card"><div class="section-title"><div><small class="section-kicker">Confirmar montaje</small><h2>¿Qué se ha montado en el '+esc(cartVenue().short)+'?</h2></div><button type="button" class="ghost" id="mjClose">Cerrar</button></div>'+
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
 stage.innerHTML='<img class="cart-bg" src="'+v.img+'" alt="'+esc(v.name)+'">'+CART_SLOTS.filter(s=>s.view===cart.view).map(s=>{const im=cart.img[s.key];return '<button type="button" class="cart-slot'+(s.key===cart.sel?" sel":"")+(im?"":" empty")+'" data-k="'+s.key+'" aria-label="'+esc(s.name||s.label||s.key)+'" style="left:'+s.r[0]+'%;top:'+s.r[1]+'%;width:'+s.r[2]+'%;height:'+s.r[3]+'%">'+(im?'<img src="'+im+'" style="object-fit:'+cartMode(s.key)+'" alt="">':'<span>'+esc(s.name)+'</span>')+'</button>'}).join("");
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
 const ev=[];cartVSlots().forEach(s=>{const sc=cartSched(s.key);[["Instalación",sc.installDate],["Retirada",sc.removeDate]].forEach(([a,d])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d||"")&&d>=t)ev.push({s,a,d,title:sc.title})})});
 ev.sort((a,b)=>a.d.localeCompare(b.d));
 $("#cartUpcoming").innerHTML=ev.length?ev.slice(0,8).map(x=>{const n=cartDaysTo(x.d);return '<button type="button" class="item cart-up" data-k="'+x.s.key+'"><div><h3>'+esc(x.a)+' · '+esc(x.s.name)+'</h3><div class="item-meta"><span class="badge '+(n<=3?"warn":"")+'">'+(n===0?"HOY":"D-"+n)+'</span><span>'+fdate(x.d)+'</span>'+(x.title?'<span>'+esc(x.title)+'</span>':'')+'</div></div></button>'}).join(""):'<div class="notice">No hay instalaciones ni retiradas programadas. Añade fechas en la ficha de cada soporte.</div>';
 $("#cartUpcoming").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;cart.sel=b.dataset.k;cart.view=cartSlot(cart.sel).view;cartRender();$("#cartStage").scrollIntoView({behavior:"smooth",block:"center"})};
}

function cartCards(){
 $("#cartCards").innerHTML=cartVSlots().map(s=>{const im=cart.img[s.key],sc=cartSched(s.key);return '<button type="button" class="cart-card'+(s.key===cart.sel?" sel":"")+'" data-k="'+s.key+'"><div class="cart-thumb">'+(im?'<img src="'+im+'" alt="">':'<span>Sin cartel</span>')+'<em>'+esc(cartView(s.view).name)+'</em></div><b>'+esc(s.name)+'</b><small>'+esc(sc.title||"—")+'</small><div class="item-meta">'+(sc.status?'<span class="badge '+(sc.status==="instalado"?"ok":"warn")+'">'+esc(sc.status)+'</span>':'')+(sc.installDate?'<span>Inst. '+fdate(sc.installDate)+'</span>':'')+(sc.removeDate?'<span>Ret. '+fdate(sc.removeDate)+'</span>':'')+'</div></button>'}).join("");
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
  cart.dirty.clear();cart.imgDirty.clear();cart.updatedAt=updatedAt;cart.saving=false;
  await cartLoad();cartRender();say("Cartelería guardada · no se ha enviado ningún correo");
  // Guardar ya no envía correo: el aviso a los compañeros sale solo con «Confirmar montaje»
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
 g.fillText(cartVenue(v.venue).name+" · "+v.name+" · "+new Date().toLocaleDateString("es-ES"),Math.round(14*scale/1.2),H-Math.round(17*scale/1.2));
 return c.toDataURL("image/png");
}
// Todas las vistas en una sola imagen apaisada (proporción A4): Taquilla cerrada y Lona a la izquierda, Taquilla abierta y Columna 1 a la derecha
async function cartExportAll(){
 if(cart.venue!=="pavon")return cartExport(false);
 try{say("Preparando la imagen…");if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  const ims={};for(const v of cartVViews())ims[v.id]=await cartLoadImg(await cartComposite(v.id,cart.night));
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
 try{const png=await cartComposite(cart.view,cart.night);const name=cartVenue().file+"_"+cart.view+"_"+new Date().toLocaleDateString("sv")+".png";
  const blob=await (await fetch(png)).blob();const file=new File([blob],name,{type:"image/png"});
  if(share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Cartelería "+cartVenue().name,text:"Cartelería "+cartVenue().short+" · "+cartView(cart.view).name});return}
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
// Agenda de destinatarios (montaje, resumen mensual): se gestiona desde Usuarios
function contactsCard(){return '<section class="card" style="margin-top:14px" id="contactsCard"><div class="section-title"><div><small class="section-kicker">Correo</small><h2>Destinatarios</h2></div></div><p class="muted" style="margin:0 0 12px">Personas que aparecen para elegir al confirmar un montaje o al enviar el resumen mensual. Estar aquí no envía nada por sí solo.</p><div class="list" id="ctList"><div class="muted">Cargando…</div></div><form id="ctForm" class="form-grid" style="margin-top:12px"><label>Nombre<input name="name" required></label><label>Correo<input name="email" type="email" required></label><div class="actions-row wide"><button type="submit" class="primary">Añadir destinatario</button></div></form></section>'}
async function bindContacts(){const box=$("#ctList");if(!box)return;let list=[];
 const draw=()=>{box.innerHTML=list.length?list.map((c,i)=>'<div class="item"><div><h3>'+esc(c.name||c.email)+'</h3><div class="item-meta"><span>'+esc(c.email)+'</span></div></div><div class="item-actions"><button type="button" class="danger" data-ct-del="'+i+'">Quitar</button></div></div>').join(""):'<div class="muted">Sin destinatarios.</div>'};
 const save=async next=>{const r=await api("/api/contacts",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({contacts:next})});list=r.contacts||[];montaje.contacts=null;draw()};
 try{list=(await api("/api/contacts")).contacts||[]}catch(e){box.innerHTML='<div class="muted">'+esc(e.message)+'</div>';return}draw();
 box.onclick=async e=>{const b=e.target.closest("[data-ct-del]");if(!b)return;const c=list[+b.dataset.ctDel];if(!confirm("¿Quitar a "+(c.name||c.email)+" de los destinatarios?"))return;try{await save(list.filter((_,i)=>i!==+b.dataset.ctDel));say("Destinatario quitado")}catch(err){say(err.message)}};
 $("#ctForm").onsubmit=async e=>{e.preventDefault();const v=formObject(e.currentTarget),em=String(v.email||"").trim().toLowerCase();if(list.some(c=>c.email.toLowerCase()===em)){say("Ese correo ya está");return}try{await save([...list,{name:String(v.name||"").trim(),email:em}]);e.currentTarget.reset();say("Destinatario añadido")}catch(err){say(err.message)}};
}
function mailTestCard(){return '<section class="card" style="margin-top:14px"><div class="section-title"><div><small class="section-kicker">Avisos por correo</small><h2>Comprobar el correo</h2></div></div><p class="muted" style="margin:0 0 12px">Envía ahora el resumen diario (material pendiente y activo) sin esperar a las 9:00. En modo desarrollo solo se envía a fernando@yellowmedia.es.</p><div class="actions-row"><button type="button" id="mailStatus">Ver configuración</button><button type="button" class="primary" id="mailTest">Enviar correo de prueba</button></div><div id="mailResult" style="margin-top:12px"></div></section>'}
function bindMailTest(){const out=$("#mailResult");if(!out)return;
 const show=d=>{out.innerHTML=d.configured?'<div class="notice" style="text-align:left">Remitente: <b>'+esc(d.from||"—")+'</b><br>Para: <b>'+esc((d.to||[]).join(", ")||"—")+'</b>'+(d.cc&&d.cc.length?'<br>Copia: <b>'+esc(d.cc.join(", "))+'</b>':'')+(d.live?'':'<br><small>Modo desarrollo: los avisos solo llegan a esta dirección.</small>')+'</div>':'<div class="notice" style="text-align:left">El correo <b>no está configurado</b>. Faltan en Netlify: '+esc((d.missing||[]).join(", "))+'.</div>'};
 $("#mailStatus").onclick=async()=>{try{show(await api("/api/test-email"))}catch(e){say(e.message)}};
 $("#mailTest").onclick=async()=>{const b=$("#mailTest");b.disabled=true;b.textContent="Enviando…";try{const d=await api("/api/test-email",{method:"POST"});show(d);say(d.sent?"Correo enviado":"No se ha enviado: "+(d.reason||"revisa la configuración"))}catch(e){say(e.message)}finally{b.disabled=false;b.textContent="Enviar correo de prueba"}}}

async function hydrateMedia(moduleName){for(const el of $$('[data-module="'+moduleName+'"][data-asset]')){const k=el.dataset.asset;if(!k)continue;const vid=el.dataset.kind==="video";const u=vid?"":await blobUrl(k,moduleName);if(!vid&&!u)continue;if(el.dataset.kind==="audio"){el.innerHTML='';el.appendChild(yPlayer(u,el.dataset.name||""))}else if(el.dataset.kind==="video"){const pu=el.dataset.poster?await blobUrl(el.dataset.poster,moduleName):"";
   // El vídeo se pide directo al servidor (con rangos, como exige Safari en iPhone); si falla, se usa la copia descargada.
   const direct="/api/asset?key="+encodeURIComponent(k)+"&module="+moduleName;
   const mk=(play)=>{const v=document.createElement("video");v.controls=true;v.playsInline=true;v.setAttribute("playsinline","");v.preload=play?"auto":"metadata";if(pu)v.poster=pu;v.src=direct+(play?"":"#t=0.5");v.onerror=async()=>{if(v.dataset.fb)return;v.dataset.fb="1";const x=await blobUrl(k,moduleName);if(!x)return;v.src=x;if(play)v.play().catch(()=>{})};el.innerHTML="";el.appendChild(v);if(play)v.play().catch(()=>{});return v};
   if(pu){el.innerHTML='<button type="button" class="vid-poster" aria-label="Reproducir vídeo"><img src="'+pu+'" alt=""><span>▶</span></button>';el.querySelector("button").onclick=()=>mk(true)}
   else mk(false)}else el.innerHTML='<img src="'+u+'" alt="Creatividad">' }}

// Archivo: toda la publicidad de cada mes y los registros quitados, con opción de recuperarlos.
let arMonth="",arShow="";
async function archivo(){
 const q=new URLSearchParams(location.hash.split("?")[1]||"").get("mes");if(q&&/^\d{4}-\d{2}$/.test(q))arMonth=q;
 const now=new Date(),cur=monthKey(now);if(!arMonth)arMonth=cur;
 const months=[...Array(7)].map((_,i)=>monthKey(new Date(now.getFullYear(),now.getMonth()-i,1)));if(!months.includes(arMonth))months.push(arMonth);
 const admin=roles().includes("admin"),edit=admin||roles().includes("gestion");
 const mods=edit?["radio","taxis","intercambiadores","hometicket","revistas","hitos"]:[];
 const qs=new URLSearchParams(location.hash.split("?")[1]||"").get("espectaculo");if(qs!=null)arShow=qs;const SQ=arShow?"&show="+encodeURIComponent(arShow):"";
 const [sum,...lists]=await Promise.all([api("/api/monthly?mes="+arMonth+SQ),...mods.map(m=>api("/api/control?module="+m+"&includeDeleted=1").catch(()=>({rows:[]})))]);
 const lim=new Date(Date.now()-120*864e5).toISOString();
 const removed=[];mods.forEach((m,i)=>(lists[i].rows||[]).filter(r=>r.deletedAt&&r.deletedAt>lim).forEach(r=>removed.push({m,r})));removed.sort((a,b)=>b.r.deletedAt.localeCompare(a.r.deletedAt));
 const short=m=>{const [y,mo]=m.split("-").map(Number);const t=new Date(y,mo-1,1).toLocaleDateString("es-ES",{month:"short"}).replace(".","");return t.charAt(0).toUpperCase()+t.slice(1)+" "+String(y).slice(2)};
 const chips='<div class="chip-row ar-months">'+months.map(m=>'<button type="button" class="chip'+(m===arMonth?" on":"")+'" data-ar="'+m+'">'+short(m)+(m===cur?' · en curso':'')+'</button>').join("")+'</div>';
 const showBar='<form class="ar-show" id="arShowForm"><label>Informe de un espectáculo<input name="show" data-ac="spectacle" autocomplete="off" placeholder="Todos los espectáculos" value="'+esc(arShow)+'"></label><button type="submit">Ver</button>'+(arShow?'<button type="button" class="ghost" id="arShowClear">Quitar filtro</button>':'')+'</form>'+(arShow?'<p class="muted" style="margin:0 0 10px">Toda la publicidad de <b>'+esc(arShow)+'</b> en '+esc(monthLabel(arMonth))+'. El envío por correo manda este informe.</p>':'');
 const kpis='<div class="kpi-row">'+sum.totals.map(t=>typeof t.value==="number"?kpi(t.value,t.label+(t.note?" · "+t.note:"")):'<span class="kpi"><b>'+esc(t.value)+'</b><em>'+esc(t.label+(t.note?" · "+t.note:""))+'</em></span>').join("")+'</div>';
 const cards='<div class="ar-grid">'+sum.sections.map(sec=>'<section class="card ar-card'+(sec.lines.length?'':' empty')+'"><div class="section-title"><div><small class="section-kicker">'+esc(sec.name)+'</small></div><span class="badge">'+sec.lines.length+'</span></div>'+
  (sec.lines.length?'<ul class="ar-list">'+sec.lines.map(l=>'<li><b>'+esc((l.kicker?l.kicker+" · ":"")+l.title)+'</b><span>'+esc([sec.key==="hitos"&&l.date?fdate(l.date)+(l.time?" "+l.time:""):"",l.detail].filter(Boolean).join(" · "))+'</span></li>').join("")+'</ul>':'<p class="muted" style="margin:0">Sin registros este mes.</p>')+'</section>').join("")+'</div>';
 const rem=removed.length?'<details class="card ar-removed"><summary>Registros quitados ('+removed.length+')</summary><p class="muted" style="margin:6px 0 10px">Lo que se ha quitado en los últimos cuatro meses. Puedes recuperarlo.</p><div class="list">'+removed.map(({m,r})=>'<div class="item"><div><h3>'+esc(modLabel(m))+' · '+esc(r.spectacle||r.title||r.campaignName||"Registro")+'</h3><div class="item-meta">'+(r.magazine?'<span>'+esc(magName(r.magazine))+' · '+esc(monthLabel(r.month||""))+'</span>':'')+(r.venue?'<span>'+esc(r.venue)+'</span>':'')+'<span>Quitado el '+fdate(r.deletedAt.slice(0,10))+'</span></div></div><div class="item-actions"><button type="button" data-restore="'+m+'|'+r.id+'">Recuperar</button></div></div>').join("")+'</div></details>':'';
 app.innerHTML=pageHead("Archivo","Toda la publicidad de cada mes: fachada, Home Ticket, radio, taxis, intercambiadores, revistas y comunicación",admin?'<button type="button" id="arSend">Enviar resumen por correo</button>':'')+(admin?'<div id="arSendBox" class="card" hidden style="margin:0 0 14px;padding:14px"></div>':'')+
  chips+showBar+'<h2 class="ar-title">'+esc(sum.label)+(arMonth===cur?' <em>mes en curso</em>':'')+'</h2>'+kpis+cards+rem+
  '<p class="cart-legacy" style="margin-top:14px">El día 1 de cada mes a las 9:00 llega por correo el resumen del mes anterior.</p>';
 $$("[data-ar]").forEach(b=>b.onclick=()=>{arMonth=b.dataset.ar;history.replaceState(null,"","#archivo");archivo()});
 $$("[data-restore]").forEach(b=>b.onclick=async()=>{const [m,id]=b.dataset.restore.split("|");try{await api("/api/control?module="+m+"&id="+id,{method:"PATCH"});say("Recuperado");archivo()}catch(e){say(e.message)}});
 {const sf=$("#arShowForm");if(sf){sf.onsubmit=e=>{e.preventDefault();arShow=String(sf.elements.show.value||"").trim();history.replaceState(null,"","#archivo");archivo()};const sc=$("#arShowClear");if(sc)sc.onclick=()=>{arShow="";history.replaceState(null,"","#archivo");archivo()}}loadSpectacles()}
 const sb=$("#arSend");if(sb)sb.onclick=async()=>{let cs=[];try{cs=(await api("/api/contacts")).contacts||[]}catch{}const box=$("#arSendBox");if(box&&!box.hidden){box.hidden=true;return}if(!box)return;box.hidden=false;box.innerHTML='<p class="muted" style="margin:0 0 8px">Siempre va a fernando@yellowmedia.es. Enviar también a:</p>'+cs.map(c=>`<label class="ar-rcp"><input type="checkbox" value="${esc(c.email)}"><i><b>${esc(c.name)}</b><small>${esc(c.email)}</small></i></label>`).join("")+'<label class="ar-rcp" style="border-top:1px solid color-mix(in srgb,currentColor 12%,transparent)"><input type="checkbox" id="arIntroOn"><i><b>Añadir una presentación</b><small>Texto al principio del correo, para quien lo recibe por primera vez</small></i></label><textarea id="arIntro" rows="7" style="display:none;width:100%;margin-top:6px">'+esc(AR_INTRO)+'</textarea>'+'<div style="margin-top:10px;display:flex;gap:8px"><button type="button" id="arSendGo">Enviar ahora</button><button type="button" class="ghost" id="arSendNo">Cancelar</button></div>';$("#arSendNo").onclick=()=>{box.hidden=true};$("#arIntroOn").onchange=e=>{$("#arIntro").style.display=e.target.checked?"":"none"};const go=$("#arSendGo");go.onclick=async()=>{const extra=[...box.querySelectorAll("input:checked")].map(i=>i.value);const quien=["fernando@yellowmedia.es",...extra].join(", ");if(!confirm("Se enviará el resumen de "+arMonth+" a: "+quien+(extra.length?"\n\nIrá como correo real, sin la marca de prueba. Los compañeros van en copia oculta: nadie ve a los demás.":"")+"\n\n¿Enviar?"))return;go.disabled=true;go.textContent="Preparando imágenes…";try{for(let i=0;i<15;i++){const w=await api("/api/monthly?warm=1&mes="+arMonth+(arShow?"&show="+encodeURIComponent(arShow):""),{method:"POST"});if(!w.left)break;go.textContent="Preparando imágenes… "+w.done+"/"+w.total}go.textContent="Enviando…";const r=await api("/api/monthly?mes="+arMonth+(arShow?"&show="+encodeURIComponent(arShow):""),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({extra,intro:$("#arIntroOn").checked?$("#arIntro").value:""})});say(r.sent?"Resumen enviado a "+(r.to||[]).join(", ")+((r.bcc||[]).length?" y en copia oculta a "+r.bcc.length+(r.bcc.length===1?" persona":" personas"):""):"No se ha enviado: "+(r.reason||"revisa el correo"));if(r.sent)box.hidden=true}catch(e){say(e.message)}finally{go.disabled=false;go.textContent="Enviar ahora"}}};
}


// ===================== STATUS DE LA SEMANA =====================
// Qué está programado y qué falta todavía de una semana (lunes a domingo), para mandarlo por correo.
let stWeek="";
function stMonday(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const stIso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function stText(s,note){const pend=s.sections.flatMap(x=>x.items.filter(i=>i.state==="falta").map(i=>"• "+x.name+" · "+i.title+": "+i.detail));
 return "Status de publicidad · "+s.label+"\n\n"+(note?note+"\n\n":"")+(pend.length?"Qué falta:\n"+pend.join("\n"):"Está todo programado.")+"\n\n"+s.sections.map(x=>x.name.toUpperCase()+" · "+x.summary+"\n"+x.items.map(i=>(i.state==="falta"?"✗ ":i.state==="ok"?"✓ ":"· ")+i.title+" — "+i.detail).join("\n")).join("\n\n")}
async function statusPage(){
 const q=new URLSearchParams(location.hash.split("?")[1]||"").get("semana");if(q&&/^\d{4}-\d{2}-\d{2}$/.test(q))stWeek=q;
 const today=new Date(),thisMon=stMonday(today);if(!stWeek)stWeek=stIso(today.getDay()===5||today.getDay()===6||today.getDay()===0?new Date(thisMon.getFullYear(),thisMon.getMonth(),thisMon.getDate()+7):thisMon);
 const weeks=[-1,0,1,2,3].map(k=>stIso(new Date(thisMon.getFullYear(),thisMon.getMonth(),thisMon.getDate()+7*k)));if(!weeks.includes(stWeek))weeks.push(stWeek);
 const s=await api("/api/status?semana="+stWeek);
 const canSend=roles().includes("admin")||roles().includes("gestion");
 const wl=w=>{const a=new Date(w+"T12:00:00"),b=new Date(a);b.setDate(b.getDate()+6);const f=d=>d.getDate()+" "+d.toLocaleDateString("es-ES",{month:"short"}).replace(".","");return f(a)+" – "+f(b)};
 const chips='<div class="chip-row ar-months">'+weeks.map(w=>'<button type="button" class="chip'+(w===stWeek?" on":"")+'" data-st="'+w+'">'+wl(w)+(w===stIso(thisMon)?" · esta":w===stIso(new Date(thisMon.getFullYear(),thisMon.getMonth(),thisMon.getDate()+7))?" · próxima":"")+'</button>').join("")+'</div>';
 const pend=s.sections.flatMap(x=>x.items.filter(i=>i.state==="falta").map(i=>({sec:x.name,...i})));
 const top='<section class="card st-top '+(pend.length?"st-falta":"st-ok")+'"><b>'+(pend.length?pend.length+(pend.length===1?" cosa pendiente":" cosas pendientes"):"Todo programado")+'</b>'+(pend.length?'<ul class="st-list">'+pend.map(p=>'<li class="falta"><b>'+esc(p.sec)+' · '+esc(p.title)+'</b><span>'+esc(p.detail)+'</span></li>').join("")+'</ul>':'')+'</section>';
 const cards='<div class="ar-grid">'+s.sections.map(x=>'<section class="card ar-card st-card"><div class="section-title"><div><small class="section-kicker">'+esc(x.name)+'</small><p class="muted" style="margin:2px 0 0;font-size:13px">'+esc(x.summary)+'</p></div><span class="badge '+(x.state==="falta"?"warn":"")+'">'+(x.state==="falta"?"Falta":x.state==="ok"?"Hecho":"Info")+'</span></div>'+(x.items.length?'<ul class="st-list">'+x.items.map(i=>'<li class="'+i.state+'"><b>'+esc(i.title)+'</b><span>'+esc(i.detail)+'</span></li>').join("")+'</ul>':'<p class="muted" style="margin:0">Nada esta semana.</p>')+'</section>').join("")+'</div>';
 app.innerHTML=pageHead("Status","Cómo va la semana: qué está programado y qué falta todavía",(canSend?'<button type="button" id="stSend">Enviar status por correo</button>':'')+'<button type="button" id="stCopy">Copiar texto</button>')+(canSend?'<div id="stSendBox" class="card" hidden style="margin:0 0 14px;padding:14px"></div>':'')+chips+'<h2 class="ar-title">'+esc(s.label)+'</h2>'+top+cards;
 $$("[data-st]").forEach(b=>b.onclick=()=>{stWeek=b.dataset.st;history.replaceState(null,"","#status");statusPage()});
 $("#stCopy").onclick=async()=>{const t=stText(s,($("#stNote")||{}).value||"");try{await navigator.clipboard.writeText(t);say("Texto copiado")}catch{prompt("Copia el texto:",t)}};
 const sb=$("#stSend");if(sb)sb.onclick=async()=>{const box=$("#stSendBox");if(!box.hidden){box.hidden=true;return}let cs=[];try{cs=(await api("/api/contacts")).contacts||[]}catch{}box.hidden=false;
  box.innerHTML='<label style="display:block;margin:0 0 10px">Mensaje (opcional)<textarea id="stNote" rows="4" style="width:100%" placeholder="Celia, te paso cómo vamos. Nos falta…"></textarea></label><p class="muted" style="margin:0 0 8px">Siempre va a fernando@yellowmedia.es. Enviar también a:</p>'+cs.map(c=>'<label class="ar-rcp"><input type="checkbox" value="'+esc(c.email)+'"'+(/^celia@/i.test(c.email)?" checked":"")+'><i><b>'+esc(c.name)+'</b><small>'+esc(c.email)+'</small></i></label>').join("")+'<div style="margin-top:10px;display:flex;gap:8px"><button type="button" class="primary" id="stGo">Enviar ahora</button><button type="button" class="ghost" id="stNo">Cancelar</button></div><div id="stOut" style="margin-top:10px"></div>';
  $("#stNo").onclick=()=>{box.hidden=true};
  const go=$("#stGo");go.onclick=async()=>{const extra=[...box.querySelectorAll(".ar-rcp input:checked")].map(i=>i.value);if(!confirm("Se enviará el status ("+s.label.toLowerCase()+") a: "+["fernando@yellowmedia.es",...extra].join(", ")+(extra.length?"\n\nLos demás van en copia oculta.":"\n\nSin nadie más marcado, llega solo a ti como prueba.")+"\n\n¿Enviar?"))return;
   go.disabled=true;go.textContent="Enviando…";try{const r=await api("/api/status?semana="+stWeek,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({extra,note:$("#stNote").value})});const out=$("#stOut");if(r.sent){say("Status enviado");out.innerHTML='<div class="notice" style="text-align:left">Enviado a <b>'+esc((r.to||[]).join(", "))+'</b>'+((r.bcc||[]).length?' y en copia oculta a <b>'+esc(r.bcc.join(", "))+'</b>':'')+'. Si no llega en unos minutos, mira la carpeta de spam.</div>';go.textContent="Enviado"}else{out.innerHTML='<div class="notice" style="text-align:left;border-color:var(--danger)">No se ha enviado. Motivo: <b>'+esc(r.reason||"desconocido")+'</b></div>';go.disabled=false;go.textContent="Enviar ahora"}}catch(e){$("#stOut").innerHTML='<div class="notice" style="text-align:left;border-color:var(--danger)">No se ha enviado: <b>'+esc(e.message||"error")+'</b></div>';go.disabled=false;go.textContent="Enviar ahora"}}}
}


// ===================== PORTAL DE PROVEEDORES =====================
// El proveedor solo ve sus piezas (sin importes) y puede pedir el material que falta.
// Administración y gestión lo ven igual que el proveedor con #proveedor?p=<id>.
const PROV_KIND={radio:"Cuñas de radio",revista:"Páginas de revista",video:"Vídeos en intercambiadores"};
let provMonth="";
async function proveedorPage(){
 const pq=new URLSearchParams(location.hash.split("?")[1]||"").get("p")||"",PQ=pq?"?p="+encodeURIComponent(pq):"";
 const d=await api("/api/proveedor"+PQ);
 if(d.providers){app.innerHTML=pageHead("Proveedores","Lo que ve cada proveedor al entrar")+'<section class="card"><div class="list">'+d.providers.map(p=>'<div class="item"><div style="display:flex;gap:12px;align-items:center">'+provLogo(p,40)+'<div><h3>'+esc(p.name)+'</h3><div class="item-meta"><span>'+esc(PROV_KIND[p.kind]||"")+'</span></div></div></div><div class="item-actions"><a class="btn" href="#proveedor?p='+esc(p.id)+'">Ver como '+esc(p.name)+'</a></div></div>').join("")+'</div></section>';return}
 const P=d.provider,today=d.today,cur=today.slice(0,7),dd=s=>s?Math.round((new Date(s+"T12:00:00")-new Date(today+"T12:00:00"))/864e5):null;
 if(!d.months.includes(provMonth))provMonth=d.months.includes(cur)?cur:d.months[0];
 const asked=new Map((d.requests||[]).map(r=>[r.itemId,r.createdAt]));
 const ml=m=>{const t=monthLabel(m);return t.charAt(0).toUpperCase()+t.slice(1)};
 const pend=d.items.filter(i=>!i.ready);
 const thumb=it=>{const m=it.media;if(!it.ready)return P.kind==="radio"?'<div class="pv-thumb pv-audio pv-empty"><i>·</i></div>':'<div class="pv-thumb pv-empty"><span>'+(P.kind==="video"?"Vídeo":"Creatividad")+' pendiente</span></div>';
  if(!m)return '<div class="pv-thumb pv-empty ok"><span>Material recibido</span></div>';
  if(m.kind==="audio")return '<button type="button" class="pv-thumb pv-audio" data-open="'+esc(it.id)+'" aria-label="Escuchar '+esc(it.title)+'"><i>▶</i></button>';
  if(m.kind==="video")return '<button type="button" class="pv-thumb" data-open="'+esc(it.id)+'" aria-label="Ver '+esc(it.title)+'">'+(m.thumb?'<img src="'+esc(m.thumb)+'" alt="" onerror="this.remove()">':'<video muted playsinline preload="metadata" src="'+esc(m.url)+'#t=1"></video>')+'<i class="pv-play">▶</i></button>';
  return '<button type="button" class="pv-thumb pv-img" data-open="'+esc(it.id)+'" aria-label="Ver '+esc(it.title)+'"><img src="'+esc(m.url)+'" alt=""></button>'};
 const badge=it=>{if(it.ready)return '<span class="badge ok">Recibido</span>';if(!it.deadline)return '<span class="badge warn">Pendiente</span>';const n=dd(it.deadline);return '<span class="badge '+(n<=1?"late":"warn")+'">Antes del '+fdate(it.deadline)+(n<0?" · vencido":n===0?" · hoy":" · "+n+" d")+'</span>'};
 const vshort=v=>String(v||"").replace("Gran Teatro CaixaBank ","").replace("Gran Teatro ","");
 const card=it=>'<article class="pv-card'+(P.kind==="radio"?" pv-row":"")+'">'+thumb(it)+'<div class="pv-body"><b>'+esc(it.title)+'</b><span>'+esc(String(it.detail||"").split(" · ").filter(x=>x!==vshort(it.venue)).join(" · "))+'</span>'+(it.startDate?'<span>'+fdate(it.startDate)+(it.endDate&&it.endDate!==it.startDate?' – '+fdate(it.endDate):'')+'</span>':'')+'<div class="pv-foot">'+badge(it)+(asked.has(it.id)?'<span class="badge">Pedido el '+fdate(asked.get(it.id).slice(0,10))+'</span>':'')+(it.ready?'':'<button type="button" class="pv-ask" data-ask="'+esc(it.module)+'|'+esc(it.id)+'">Pedir material</button>')+'</div></div></article>';
 const tabs='<div class="chip-row pv-tabs">'+d.months.map(m=>{const its=d.items.filter(i=>i.month===m),pn=its.filter(i=>!i.ready).length;return '<button type="button" class="chip'+(m===provMonth?" on":"")+'" data-pm="'+m+'">'+esc(ml(m))+' · '+its.length+(pn?' <em class="pv-dot">'+pn+' pend.</em>':'')+'</button>'}).join("")+'</div>';
 const its=d.items.filter(i=>i.month===provMonth);
 const opts='<option value="">Mensaje general</option>'+pend.map(i=>'<option value="'+esc(i.module)+'|'+esc(i.id)+'">Falta: '+esc(i.title)+' · '+esc(ml(i.month))+'</option>').join("");
 app.innerHTML=(d.preview?'<div class="notice" style="margin-bottom:12px;text-align:left">Vista previa: así lo ve '+esc(P.name)+'. Si escribes desde aquí, el correo llega como prueba. <a href="#proveedor">← Todos los proveedores</a></div>':'')+
  '<header class="pv-hero'+(PROV_THEME[P.id]?' themed" style="background:'+PROV_THEME[P.id].bg+';--pv-accent:'+PROV_THEME[P.id].accent:'"')+'">'+provLogo(P,72)+'<div><small>Yellow Media · material de publicidad</small><h1>'+esc(P.name)+'</h1><p>'+esc(PROV_KIND[P.kind]||"")+' · '+(pend.length?pend.length+(pend.length===1?" pieza pendiente de material":" piezas pendientes de material"):"todo el material recibido")+'</p></div>'+pvHello()+'</header>'+
  '<section class="card pv-write" id="pvWrite"><div class="section-title"><div><small class="section-kicker">Escríbenos</small><h2>Mensaje a Fernando y Celia</h2></div></div><label class="field">Sobre<select id="pvAbout">'+opts+'</select></label><label class="field" style="margin-top:10px">Mensaje<textarea id="pvMsg" rows="4" placeholder="Por ejemplo: necesitamos la cuña de la semana del 2 de noviembre."></textarea></label><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="pvSend">Enviar mensaje</button></div><div id="pvOut"></div></section>'+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Planificación</small><h2>'+esc(ml(provMonth))+'</h2></div><span class="badge">'+its.length+'</span></div>'+tabs+(its.length?[...new Set(its.map(i=>i.venue||""))].map(v=>{const g=its.filter(i=>(i.venue||"")===v),c=pvVenue(v);return '<div class="pv-venue" style="--pv-v:'+c.bg+';--pv-vt:'+c.fg+'"><h3><span>'+esc(v||"Sin teatro")+'</span><em>'+g.length+'</em></h3><div class="pv-grid'+(P.kind==="radio"?" pv-grid-row":"")+'">'+g.map(card).join("")+'</div></div>'}).join(""):'<p class="muted" style="margin:10px 0 0">Todavía no hay nada planificado este mes.</p>')+'</section>'+
  '<div class="pv-light" id="pvLight" hidden><div class="pv-light-in"><button type="button" class="ghost pv-close" id="pvClose">Cerrar</button><div id="pvLightBody"></div></div></div>';
 $$("[data-pm]").forEach(b=>b.onclick=()=>{provMonth=b.dataset.pm;proveedorPage()});
 $$("[data-ask]").forEach(b=>b.onclick=()=>{$("#pvAbout").value=b.dataset.ask;const w=$("#pvWrite");w.scrollIntoView({behavior:"smooth",block:"start"});$("#pvMsg").focus()});
 const light=$("#pvLight"),close=()=>{light.hidden=true;$("#pvLightBody").innerHTML=""};$("#pvClose").onclick=close;light.onclick=e=>{if(e.target===light)close()};
 $$("[data-open]").forEach(b=>b.onclick=()=>{const it=d.items.find(i=>i.id===b.dataset.open);if(!it||!it.media)return;const m=it.media;
  $("#pvLightBody").innerHTML='<h3 style="margin:0 0 4px">'+esc(it.title)+'</h3><p class="muted" style="margin:0 0 12px">'+esc(it.detail)+'</p>'+(m.kind==="audio"?'<audio controls autoplay src="'+esc(m.url)+'" style="width:100%"></audio>':m.kind==="video"?'<video controls autoplay playsinline src="'+esc(m.url)+'" style="width:100%;max-height:70vh;border-radius:10px;background:#000"></video>':'<img src="'+esc(m.url)+'" alt="'+esc(it.title)+'" style="max-width:100%;max-height:75vh;border-radius:10px;display:block;margin:0 auto">');light.hidden=false});
 const go=$("#pvSend");go.onclick=async()=>{const msg=$("#pvMsg").value.trim();if(!msg){say("Escribe el mensaje");return}const [m,id]=($("#pvAbout").value||"|").split("|");go.disabled=true;go.textContent="Enviando…";
  try{const r=await api("/api/proveedor"+PQ,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(id?{module:m,itemId:id,message:msg}:{message:msg})});$("#pvOut").innerHTML='<div class="notice" style="text-align:left;margin-top:10px">'+(r.sent?'Mensaje enviado. Os contestaremos lo antes posible.':'Guardado, pero el correo no ha salido ('+esc(r.reason||"error")+'). Lo veremos igualmente en la app.')+'</div>';$("#pvMsg").value="";go.disabled=false;go.textContent="Enviar mensaje"}catch(e){go.disabled=false;go.textContent="Enviar mensaje";$("#pvOut").innerHTML='<div class="notice" style="text-align:left;margin-top:10px">No se ha podido enviar: '+esc(e.message)+'</div>'}}
}
// Equipo en Usuarios: 9 retratos; en móvil se apilan en 2 o 3 filas
function teamBand(){return '<section class="yc-team" aria-label="Equipo Yellow Media">'+[1,2,3,4,5,6,7,8,9].map(i=>'<img src="/assets/equipo/'+i+'.png?v=1" alt="" width="200" height="200">').join("")+'</section>'}
// Saludo del portal: según la hora y con el nombre que tiene la cuenta en Netlify
function pvHello(){const h=new Date().getHours(),g=h<14?"Buenos días":h<21?"Buenas tardes":"Buenas noches",n=String(state.actor?.name||"").trim().split(/\s+/)[0],date=new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});return '<div class="pv-hello"><small>'+esc(date.charAt(0).toUpperCase()+date.slice(1))+'</small><strong>'+g+(n?', <br>'+esc(n):'')+'</strong></div>'}
// Color de cada teatro en el portal de proveedores
function pvVenue(v){v=String(v||"").toLowerCase();if(v.includes("pavón")||v.includes("pavon"))return{bg:"#FFD400",fg:"#131313"};if(v.includes("príncipe")||v.includes("principe"))return{bg:"#1F5FBF",fg:"#fff"};if(v.includes("serrano"))return{bg:"#FBB03B",fg:"#003438"};if(v.includes("arlequ"))return{bg:"#FF3B3F",fg:"#fff"};if(v.includes("pedraza"))return{bg:"#9A6A3A",fg:"#fff"};if(v.includes("abono"))return{bg:"#BC2C4F",fg:"#fff"};if(v.includes("soho"))return{bg:"#C9A24B",fg:"#1B2A4A"};return{bg:"#6b665d",fg:"#fff"}}
// Logo del proveedor: /assets/proveedores/<id>.png; si no está, sus iniciales
const PROV_THEME={"clece":{bg:"linear-gradient(135deg,#d33ec3 0%,#652b96 100%)",accent:"#fff",wide:2.6},"kiss-fm":{bg:"radial-gradient(circle at 85% 20%,rgba(227,28,29,.45),transparent 55%),#1d070c",accent:"#e31c1d",wide:1.2},"revista-teatros":{bg:"linear-gradient(135deg,#e51629 0%,#8f0d19 100%)",accent:"#fff",wide:2.4,logoBg:"#fff"},"aescena":{bg:"radial-gradient(circle at 85% 20%,rgba(190,156,53,.35),transparent 55%),#241e20",accent:"#be9c35",wide:4},"godot":{bg:"linear-gradient(135deg,#1a1a1a 0%,#020202 100%)",accent:"#fff",wide:3,logoBg:"#fff"}};
function provLogo(p,size){const t=PROV_THEME[p.id],ini=String(p.name||"?").replace(/\(.*\)/,"").split(/[\s·]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();return '<span class="pv-logo'+(t?" themed":"")+'" style="width:'+Math.round(size*(t?.wide||1))+'px;height:'+size+'px;font-size:'+Math.round(size*.36)+'px'+(t?";background:"+(t.logoBg||t.bg):"")+'"'+(t&&t.logoBg?' data-solid="1"':'')+'><img src="/assets/proveedores/'+esc(p.id)+'.png?v=1" alt="'+esc(p.name)+'" onerror="this.remove()"><b>'+esc(ini)+'</b></span>'}

// ===================== TELEVISIÓN =====================
// Acuerdo con Mediaset (Taquilla Mediaset). Los datos los sirve /api/television; el importe y los pagos
// solo llegan a quien tiene acceso al presupuesto.
async function television(){
 const d=await api("/api/television"),eur=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,".")+" €";
 const perWave=d.plan.reduce((a,c)=>a+c.pases.length,0),waves=d.ratePerWave?Math.round(d.rateValue/d.ratePerWave):0;
 const kpi=(v,l)=>'<div class="tv-kpi"><b>'+v+'</b><span>'+esc(l)+'</span></div>';
 app.innerHTML=pageHead("Televisión",d.provider+" · "+d.format+" · temporada "+d.season)+
 '<section class="card tv-head"><div class="section-title"><div><small class="section-kicker">'+esc(d.venue)+'</small><h2>'+esc(d.campaign)+'</h2></div><span class="badge warn">'+esc(d.status)+'</span></div>'+
 '<div class="tv-kpis">'+kpi(d.passesProposal,"pases en la propuesta")+kpi(waves,"oleadas")+kpi(perWave,"pases por oleada")+kpi(esc(d.duration),"duración · "+d.target)+kpi(eur(d.rateValue),"valor tarifa")+(d.money?kpi(eur(d.money.cost),"coste · + IVA"):'')+'</div></section>'+
 '<div class="tv-grid"><section class="card"><div class="section-title"><div><small class="section-kicker">Qué incluye</small><h2>Propuesta</h2></div></div><ul class="tv-list"><li>Campaña de '+d.passesProposal+' pases en formato '+esc(d.format)+'.</li>'+d.extras.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></section>'+
 (d.money?'<section class="card"><div class="section-title"><div><small class="section-kicker">Solo Fer y Celia</small><h2>Condiciones</h2></div></div><p class="tv-money"><b>'+eur(d.money.cost)+'</b> '+esc(d.money.costNote)+'</p><p class="muted">'+esc(d.money.payment)+'</p><ul class="tv-list">'+d.money.split.map(x=>'<li><b>'+eur(x.amount)+'</b> · '+esc(x.when)+'</li>').join("")+'</ul></section>':'')+
 '<section class="card"><div class="section-title"><div><small class="section-kicker">Por cerrar</small><h2>Pendiente</h2></div></div><ul class="tv-list">'+d.pending.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></section>'+
 '<section class="card"><div class="section-title"><div><small class="section-kicker">'+esc(d.provider)+'</small><h2>Contacto</h2></div></div><p class="tv-contact"><b>'+esc(d.contact.name)+'</b><br>'+esc(d.contact.role)+'<br>'+esc(d.contact.address)+'<br>Tel. <a href="tel:+34913966513">'+esc(d.contact.phone)+'</a> · Móvil <a href="tel:+34'+d.contact.mobile.replace(/\D/g,"")+'">'+esc(d.contact.mobile)+'</a></p></section></div>'+
 '<section class="card"><div class="section-title"><div><small class="section-kicker">Se repite en cada oleada · '+esc(d.target)+' · '+esc(d.duration)+'</small><h2>Planificación por oleada</h2></div><b>'+eur(d.ratePerWave)+' <span class="muted">tarifa por oleada</span></b></div>'+
 d.plan.map(c=>{const tot=c.pases.reduce((a,p)=>a+p[4],0);return '<h3 class="tv-channel">'+esc(c.canal)+' <span class="muted">· '+c.pases.length+' pases · '+eur(tot)+'</span></h3><div class="table-wrap"><table class="tv-table"><thead><tr><th>Día</th><th>Hora</th><th>Franja</th><th class="num">Tarifa</th></tr></thead><tbody>'+c.pases.map(p=>'<tr><td>'+esc(p[2])+'</td><td>'+esc(p[3])+'</td><td>'+esc(p[1])+'</td><td class="num">'+eur(p[4])+'</td></tr>').join("")+'</tbody></table></div>'}).join("")+
 '<p class="muted" style="margin-top:12px">Valor tarifa de la campaña: '+eur(d.rateValue)+' ('+waves+' oleadas de '+eur(d.ratePerWave)+'). Es el precio de tarifa de los pases, no lo que se paga.</p></section>';
}
// ===================== IMPORTAR =====================
// Añade de una vez datos preparados fuera de la app (por ejemplo, por Claude a partir de una tabla
// pegada en el chat). Llega en el enlace #importar?d=<datos> o se pega en el cuadro. Siempre se
// muestra una vista previa y no se guarda nada hasta pulsar «Añadir».
const IMPORT_MODULES={hitos:"Calendario (hito)",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas",radio:"Radio"};
function importDecode(t){t=String(t||"").trim();if(!t)return null;try{if(t.startsWith("{")||t.startsWith("["))return JSON.parse(t);const b=t.replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(decodeURIComponent(escape(atob(b))))}catch{return null}}
function importItems(d){const list=Array.isArray(d)?d:(d&&d.items)||[];return list.filter(x=>x&&IMPORT_MODULES[x.module]&&((x.data&&typeof x.data==="object")||((x.op==="keepOnly"||x.op==="splitWeeks"||x.op==="dropAll")&&x.match)))}
function importLabel(x){if(x.op==="keepOnly")return x.label||"Dejar solo una";if(x.op==="dropAll")return x.label||"Quitar registros";if(x.op==="splitWeeks")return x.label||"Repartir por semanas";const r=x.data;if(x.module==="hitos"){const t=r.title||r.spectacle||"";return (t.toLowerCase().startsWith(String(r.type||"").toLowerCase())?t:(r.type||"Hito")+" · "+t)+" · "+fdate(r.date)+(r.time?" "+r.time:"")}return (r.spectacle||r.campaignName||r.magazine||"Registro")+" · "+[r.venue,r.position,r.magazine,r.month,r.startDate&&fdate(r.startDate)].filter(Boolean).join(" · ")}
// Excel de golpe: una hoja por tipo (Radio, Calendario) con cabeceras fijas en español. Cada fila pasa a la misma
// vista previa que el resto de importaciones (con detección de duplicados) y no se guarda nada hasta pulsar «Añadir».
const XL_SHEETS={
 radio:{sheet:"Radio",cols:[["Espectáculo","spectacle",1],["Teatro","venue",1,"venue"],["Emisora","station",1],["Campaña","campaignName"],["Cuña","spotName"],["Duración","duration"],["Inicio","startDate",1,"date"],["Fin","endDate",0,"date"],["Franja","timeSlot"],["Cuñas previstas","plannedSpots",0,"num"],["Estado","status",0,"status"],["Notas","notes"]],
  example:["LA ROSA 14","Gran Teatro Pavón","KISS FM Madrid","Kiss FM octubre","La Rosa 14 · genérica","22\"","01/10/2026","04/10/2026","06:00-23:59",20,"activo",""]},
 hitos:{sheet:"Calendario",cols:[["Tipo","type",1,"type"],["Título","title"],["Espectáculo","spectacle"],["Fecha","date",1,"date"],["Hora","time",0,"time"],["Teatro","venue",0,"venue"],["Lugar","place"],["Responsable","responsable"],["Enlace","link"],["Notas","notes"]],
  example:["Estreno","Estreno de Locuras paralelas","LOCURAS PARALELAS","01/10/2026","20:00","Gran Teatro Pavón","","","",""]}};
const xlNorm=v=>String(v??"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
function xlDate(v){if(v==null||v==="")return "";if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==="number"&&v>20000&&v<80000)return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
 const t=String(v).trim();let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);if(m)return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
 m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(t);if(m){const y=m[3].length===2?"20"+m[3]:m[3],iso=y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"),d=new Date(iso+"T12:00:00Z");return !isNaN(d)&&d.toISOString().slice(0,10)===iso?iso:null}return null}
function xlTime(v){if(v==null||v==="")return "";if(typeof v==="number"){const mins=Math.round((v%1)*1440);return String(Math.floor(mins/60)%24).padStart(2,"0")+":"+String(mins%60).padStart(2,"0")}
 const m=/^(\d{1,2})[:.h](\d{2})/.exec(String(v).trim());return m?m[1].padStart(2,"0")+":"+m[2]:String(v).trim()}
function xlVenue(v){const n=xlNorm(v);if(!n)return "";const hit=VENUES.find(x=>xlNorm(x)===n)||VENUES.find(x=>xlNorm(x).includes(n)||n.includes(xlNorm(x).replace(/^gran teatro |^teatro |^gran /,"")));return hit||String(v).trim()}
function xlType(v){const n=xlNorm(v);return HITO_TYPES.find(x=>xlNorm(x)===n)||HITO_TYPES.find(x=>n&&xlNorm(x).startsWith(n))||String(v??"").trim()}
// Devuelve {items, errors}: errores por fila (falta un dato obligatorio o una fecha que no se entiende)
function xlParse(wb){const items=[],errors=[];let found=0;
 for(const [module,cfg] of Object.entries(XL_SHEETS)){
  const name=wb.SheetNames.find(n=>xlNorm(n)===xlNorm(cfg.sheet))||(wb.SheetNames.length===1?wb.SheetNames[0]:null);if(!name)continue;
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:null});
  const hr=rows.findIndex(r=>(r||[]).filter(c=>cfg.cols.some(([h])=>xlNorm(h)===xlNorm(c))).length>=2);if(hr<0)continue;
  const idx={};(rows[hr]||[]).forEach((c,i)=>{const col=cfg.cols.find(([h])=>xlNorm(h)===xlNorm(c));if(col&&idx[col[1]]==null)idx[col[1]]=i});
  if(wb.SheetNames.length===1&&cfg.cols.filter(c=>c[2]).some(c=>idx[c[1]]==null))continue;
  found++;
  rows.slice(hr+1).forEach((r,k)=>{if(!(r||[]).some(c=>String(c??"").trim()))return;
   // La fila de ejemplo de la plantilla no se sube aunque no la hayan borrado
   if(cfg.cols.every(([,key],j)=>{const ex=cfg.example[j];return ex===""||ex==null||idx[key]==null||xlNorm(r[idx[key]])===xlNorm(ex)})&&cfg.cols.some(([,key],j)=>cfg.example[j]!==""&&idx[key]!=null)){errors.push(cfg.sheet+", fila "+(hr+k+2)+": es la fila de ejemplo de la plantilla, no se sube");return}const line=cfg.sheet+", fila "+(hr+k+2),data={},bad=[];
   for(const [h,key,req,kind] of cfg.cols){const raw=idx[key]==null?null:r[idx[key]];let v;
    if(kind==="date"){v=xlDate(raw);if(v===null){bad.push(h+" «"+raw+"» no es una fecha");continue}}
    else if(kind==="time")v=xlTime(raw);else if(kind==="venue")v=xlVenue(raw);else if(kind==="type")v=xlType(raw);
    else if(kind==="num"){v=raw==null||raw===""?"":Number(String(raw).replace(",","."));if(v!==""&&!Number.isFinite(v)){bad.push(h+" no es un número");continue}}
    else if(kind==="status"){v=xlNorm(raw);v=["activo","pendiente","finalizado"].find(x=>x===v)||""}
    else v=String(raw??"").trim();
    if(v!==""&&v!=null)data[key]=v;else if(req)bad.push("falta "+h)}
   if(module==="hitos"&&!data.title&&!data.spectacle)bad.push("falta Título o Espectáculo");
   if(module==="radio"){if(data.startDate&&!data.endDate)data.endDate=data.startDate;if(!data.status)data.status="activo";data.unit="cuñas";data.materialStatus="pendiente";if(data.plannedSpots!=null)data.frequency=data.plannedSpots+" cuñas"}
   if(bad.length)errors.push(line+": "+bad.join(", "));else items.push({module,data})})}
 if(!found)errors.unshift("No encuentro las hojas «Radio» o «Calendario» con sus cabeceras. Descarga la plantilla y rellénala sin cambiar los títulos de las columnas.");
 return {items,errors}}
if(typeof loadXLSX!=="function")window.loadXLSX=()=>window.XLSX?Promise.resolve():new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="/vendor/xlsx.mini.min.js";sc.onload=res;sc.onerror=()=>rej(new Error("No se ha podido cargar el lector de Excel"));document.head.appendChild(sc)});
async function xlTemplate(){await loadXLSX();const wb=XLSX.utils.book_new();
 for(const cfg of Object.values(XL_SHEETS)){const ws=XLSX.utils.aoa_to_sheet([cfg.cols.map(c=>c[0]),cfg.example]);ws["!cols"]=cfg.cols.map(c=>({wch:Math.max(12,c[0].length+4)}));XLSX.utils.book_append_sheet(wb,ws,cfg.sheet)}
 const ay=XLSX.utils.aoa_to_sheet([["Cómo rellenarla"],["Una fila por cuña (hoja Radio) o por fecha del calendario (hoja Calendario). Borra la fila de ejemplo."],["No cambies los títulos de las columnas. Fechas como 01/10/2026; horas como 20:00."],["Radio, obligatorio: Espectáculo, Teatro, Emisora e Inicio. Si no pones Fin, se toma el mismo día."],["Calendario, obligatorio: Tipo y Fecha, y Título o Espectáculo. Tipos: "+HITO_TYPES.join(", ")+"."],["Teatros: "+VENUES.join(", ")+"."],["Al subirla, la app enseña la lista y avisa de lo que ya existe. No se guarda nada hasta pulsar «Añadir seleccionados»."]]);ay["!cols"]=[{wch:110}];XLSX.utils.book_append_sheet(wb,ay,"Instrucciones");
 XLSX.writeFile(wb,"Plantilla Yellow Control.xlsx")}
// ===== Texto libre → registros =====
// Se escribe o se pega tal cual (una lista de fechas, un correo con cuñas) y la app lo interpreta:
// fechas sueltas, listas («12, 13 y 14 de octubre»), rangos («del 7 al 30 de septiembre»), horas, tipo de hito,
// teatro y espectáculo (de la lista de espectáculos de la app). Si hay cuñas, las reparte por semanas y las mete
// en el acuerdo de radio de esa emisora sin pasar del inventario contratado. Siempre pasa por la vista previa.
const TX_MONTHS={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12,ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,sept:9,oct:10,nov:11,dic:12};
const TX_MON='(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|sept|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)';
const TX_TYPES=[["rueda de prensa","Rueda de prensa"],["nota de prensa","Nota de prensa"],["newsletter","Newsletter"],["boletin","Newsletter"],["pase grafico","Pase gráfico"],["pase de prensa","Pase gráfico"],["entrevista","Entrevista / medios"],["reunion","Reunión"],["cierre","Cierre de edición"],["estreno","Estreno"],["premiere","Estreno"],["nota","Nota de prensa"],["evento","Evento"],["photocall","Evento"],["solicitud","Solicitud de proveedor"]];
const TX_VENUES=[["principe pio","Gran Teatro CaixaBank Príncipe Pío"],["la estacion","Gran Teatro CaixaBank Príncipe Pío"],["pavon","Gran Teatro Pavón"],["serrano","Teatro Serrano"],["arlequin","Teatro Arlequín"],["pedraza","Gran Castillo de Pedraza"],["abonoteatro","Abono Teatro"],["abono teatro","Abono Teatro"],["soho","Soho City Madrid"]];
const TX_STATIONS=[["europa fm","Europa FM"],["europa","Europa FM"],["melodia","Melodía FM"],["onda cero","Onda Cero"],["kiss","KISS FM"],["cadena ser","Cadena SER"],["los 40","LOS40"],["cadena dial","Cadena Dial"],["cope","COPE"],["cadena 100","Cadena 100"],["rock fm","Rock FM"],["radio nacional","Radio Nacional"],["rne","Radio Nacional"],["hit fm","Hit FM"],["radio marca","Radio Marca"],["esradio","esRadio"]];
const txLow=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const txHas=(low,k)=>new RegExp("(^|[^a-z0-9])"+k.replace(/ /g,"\\s+")+"($|[^a-z0-9])").test(low);
const txIso=(y,m,d)=>{const iso=y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"),t=new Date(iso+"T12:00:00Z");return !isNaN(t)&&t.toISOString().slice(0,10)===iso?iso:""};
// Sin año: el de este año salvo que la fecha quede más de 4 meses atrás (entonces, el siguiente)
function txYear(m,d,y){if(y)return Number(String(y).length===2?"20"+y:y);const now=new Date(),cy=now.getFullYear(),t=new Date(cy,m-1,d);return (now-t)/864e5>120?cy+1:cy}
// Devuelve {dates:[iso], range:[a,b]|null, rest} quitando del texto lo que ya se ha leído
function txDates(low){let rest=low;const dates=[];let range=null;const cut=m=>{rest=rest.replace(m," ")};
 let m=new RegExp("(?:del?\\s+)?(\\d{1,2})(?:\\s+de\\s+"+TX_MON+")?\\s+(?:al|hasta el|a|-)\\s+(\\d{1,2})\\s+de\\s+"+TX_MON+"(?:\\s+(?:de\\s+)?(\\d{4}))?").exec(rest);
 if(m){const m2=TX_MONTHS[m[4]],m1=m[2]?TX_MONTHS[m[2]]:m2,y2=txYear(m2,+m[3],m[5]),y1=m1>m2?y2-1:y2,a=txIso(y1,m1,+m[1]),b=txIso(y2,m2,+m[3]);if(a&&b&&a<=b){range=[a,b];cut(m[0])}}
 if(!range){m=/(?:del?\s+)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\s+(?:al|hasta el|a|-)\s+(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/.exec(rest);
  if(m){const a=txIso(txYear(+m[2],+m[1],m[3]||m[6]),+m[2],+m[1]),b=txIso(txYear(+m[5],+m[4],m[6]),+m[5],+m[4]);if(a&&b&&a<=b){range=[a,b];cut(m[0])}}}
 const reList=new RegExp("(\\d{1,2})((?:\\s*,\\s*\\d{1,2})*)\\s+y\\s+(\\d{1,2})\\s+de\\s+"+TX_MON+"(?:\\s+(?:de\\s+)?(\\d{4}))?","g");
 for(const x of [...rest.matchAll(reList)]){const mo=TX_MONTHS[x[4]],ds=[x[1],...(x[2].match(/\d{1,2}/g)||[]),x[3]];ds.forEach(d=>{const i=txIso(txYear(mo,+d,x[5]),mo,+d);if(i)dates.push(i)});cut(x[0])}
 const reOne=new RegExp("(\\d{1,2})\\s+(?:de\\s+)?"+TX_MON+"(?![a-z])(?:\\s+(?:de\\s+)?(\\d{4}))?","g");
 for(const x of [...rest.matchAll(reOne)]){const mo=TX_MONTHS[x[2]],i=txIso(txYear(mo,+x[1],x[3]),mo,+x[1]);if(i){dates.push(i);cut(x[0])}}
 for(const x of [...rest.matchAll(/(?<![\d:.])(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(?![\d:])/g)]){const i=txIso(txYear(+x[2],+x[1],x[3]),+x[2],+x[1]);if(i){dates.push(i);cut(x[0])}}
 return {dates:[...new Set(dates)].sort(),range,rest}}
function txTime(low){const m=/(?:a\s+las\s+)?(?<![\d\/])(\d{1,2})[:.](\d{2})\s*(?:h\b|horas)?/.exec(low)||/(?:a\s+las\s+)(\d{1,2})(?![\d\/:])(?:\s*h\b|\s*horas)?/.exec(low)||/(?<![\d\/])(\d{1,2})\s*(?:h|horas)\b/.exec(low);
 if(!m)return {time:"",rest:low};const h=+m[1],mi=m[2]?+m[2]:0;if(h>23||mi>59)return {time:"",rest:low};return {time:String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0"),rest:low.replace(m[0]," ")}}
function txVenue(low){const v=TX_VENUES.find(([k])=>txHas(low,k));return v?v[1]:""}
function txSpectacle(low){let best="";for(const s of SPECTACLES){const k=txLow(s).replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();if(k.length>=3&&txHas(low.replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," "),k)&&k.length>best.length)best=s}return best}
const txCap=s=>{s=s.replace(/\s+/g," ").replace(/^[\s,.;:·\-–—]+|[\s,.;:·\-–—]+$/g,"");return s?s[0].toUpperCase()+s.slice(1):""};
// Hitos: una línea con fecha = un hito por fecha (un rango da un hito en la fecha de inicio)
function txHitos(lines,skip){const items=[],warn=[];
 lines.forEach((line,i)=>{if(skip.has(i))return;const low=txLow(line);const {dates,range,rest}=txDates(low);const all=dates.length?dates:range?[range[0]]:[];if(!all.length)return;
  const {time}=txTime(rest),tp=TX_TYPES.find(([k])=>txHas(low,k+"(?:e?s)?")),venue=txVenue(low),spectacle=txSpectacle(low);
  // Título: la línea original sin fechas, horas ni la palabra «el/día»
  let title=line;const strip=[new RegExp("(?:del?\\s+)?\\d{1,2}(?:\\s*,\\s*\\d{1,2})*(?:\\s+y\\s+\\d{1,2})?(?:\\s+(?:de\\s+)?[a-záéíóú]+)?\\s+(?:al|hasta el|a|-)\\s+\\d{1,2}\\s+de\\s+[a-záéíóú]+(?:\\s+(?:de\\s+)?\\d{4})?","i"),new RegExp("(?:el\\s+|día\\s+|dia\\s+)?(?:(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\\s+)?\\d{1,2}(?:\\s*,\\s*\\d{1,2})*(?:\\s+y\\s+\\d{1,2})?\\s+(?:de\\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|sept?|ene|feb|mar|abr|may|jun|jul|ago|oct|nov|dic)\\.?(?:\\s+(?:de\\s+)?\\d{4})?","gi"),/(?:el\s+)?\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?/g,/(?:a\s+las\s+)?\d{1,2}[:.]\d{2}\s*(?:h\b|horas)?/gi,/a\s+las\s+\d{1,2}\s*(?:h\b|horas)?/gi,/\b\d{1,2}\s*h\b/gi];
  strip.push(/\s+en\s+(?:el\s+)?(?:gran\s+)?(?:teatro\s+)?(?:caixabank\s+)?(?:pr[ií]ncipe\s+p[ií]o|pav[oó]n|serrano|arlequ[ií]n|castillo\s+de\s+pedraza|pedraza|la\s+estaci[oó]n|soho(?:\s+city)?)\b/gi,/\s+(?:pr[ií]ncipe\s+p[ií]o|pav[oó]n|serrano|arlequ[ií]n)\s*$/i);strip.forEach(r=>title=title.replace(r," "));title=txCap(title.replace(/^\s*[-•*]\s*/,""));
  const type=tp?tp[1]:"Otro";
  all.forEach(date=>{const data={type,date,title:title||spectacle||type};if(time)data.time=time;if(venue)data.venue=venue;if(spectacle)data.spectacle=spectacle;if(range&&!dates.length)data.notes="Hasta el "+fdate(range[1]);items.push({module:"hitos",data})})});
 return {items,warn}}
// Cuñas: rango de fechas del texto + líneas «N cuñas (diarias|a la semana|en total) … en EMISORA, EMISORA»
function txRadio(text,lines,existing){const low=txLow(text),warn=[],items=[],used=new Set();
 if(!/cun/.test(low))return {items,warn,used};
 let range=null;lines.forEach((l,i)=>{if(range)return;const r=txDates(txLow(l)).range;if(r){range=r;if(!/cun/.test(txLow(l)))used.add(i)}});
 if(!range){warn.push("Hay cuñas pero no encuentro las fechas (por ejemplo, «del 7 al 30 de septiembre»).");return {items,warn,used}}
 const spectacle=txSpectacle(low),venueTxt=txVenue(low),allWeekdays=/lunes\s+a\s+viernes|l\s*-\s*v\b|laborables/.test(low);
 const reqs=[];
 lines.forEach((l,i)=>{const ll=txLow(l);const m=/(\d+)\s*cun[a-z]*\s*(diarias|al dia|por dia|cada dia|semanales|a la semana|por semana|en total|totales)?/.exec(ll);if(!m)return;
  const sts=[...new Set(TX_STATIONS.filter(([k])=>txHas(ll,k)).map(s=>s[1]))];if(!sts.length)return;used.add(i);
  const per=/semana/.test(m[2]||"")?"week":/total/.test(m[2]||"")?"total":"day",wd=/lunes\s+a\s+viernes|l\s*-\s*v\b|laborables/.test(ll)||(allWeekdays&&!/lunes\s+a\s+domingo|todos los dias|l\s*-\s*d\b/.test(ll));
  sts.forEach(st=>reqs.push({station:st,n:+m[1],per,wd}))});
 if(!reqs.length){warn.push("Hay cuñas pero no encuentro cuántas ni en qué emisora (por ejemplo, «4 cuñas diarias en Europa FM»).");return {items,warn,used}}
 // Semanas (lunes a domingo) dentro de cada mes
 const weeks=[];{let d=new Date(range[0]+"T12:00:00Z");const end=new Date(range[1]+"T12:00:00Z");while(d<=end){const s=new Date(d);let e=new Date(d);while(true){const n=new Date(e);n.setUTCDate(n.getUTCDate()+1);if(n>end||n.getUTCDay()===1||n.getUTCMonth()!==e.getUTCMonth())break;e=n}
  let all=0,wk=0;for(let x=new Date(s);x<=e;x.setUTCDate(x.getUTCDate()+1)){all++;if(x.getUTCDay()%6)wk++}
  weeks.push({s:s.toISOString().slice(0,10),e:e.toISOString().slice(0,10),all,wk});d=new Date(e);d.setUTCDate(d.getUTCDate()+1)}}
 const share=(total,w)=>{const tot=w.reduce((a,b)=>a+b,0);if(!tot||!total)return w.map(()=>0);const raw=w.map(x=>total*x/tot),base=raw.map(Math.floor);let left=total-base.reduce((a,b)=>a+b,0);raw.map((r,i)=>[r-base[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{if(left>0){base[i]++;left--}});return base};
 const today=new Date().toISOString().slice(0,10),status=range[1]<today?"finalizado":"activo";
 for(const q of reqs){const months=[...new Set(weeks.map(w=>w.s.slice(0,7)))];
  for(const mo of months){const ws=weeks.filter(w=>w.s.slice(0,7)===mo),wt=ws.map(w=>q.wd?w.wk:w.all);
   const asked=q.per==="day"?wt.reduce((a,b)=>a+b,0)*q.n:q.per==="week"?ws.length*q.n:Math.round(q.n*wt.reduce((a,b)=>a+b,0)/weeks.reduce((a,w)=>a+(q.wd?w.wk:w.all),0));
   if(!asked)continue;
   // Programas del acuerdo con inventario ese mes para esa emisora (mejor el del teatro que se nombra)
   const k=txLow(q.station).replace(/\s*fm$/,"");let cands=[];
   for(const c of RADIO_CONTRACTS)for(const l of c.lines||[]){if(!txLow(l.station).includes(k)||!(radioNum(l.monthly?.[mo])>0)||l.unit!=="cuñas")continue;cands.push({c,l})}
   if(venueTxt&&cands.some(x=>x.c.venue===venueTxt))cands=cands.filter(x=>x.c.venue===venueTxt);
   const cid=cands[0]?.c.id;cands=cands.filter(x=>x.c.id===cid);
   const base={venue:cands[0]?.c.venue||venueTxt,spectacle,campaignName:q.station+" · "+radioMonthLabel(mo),spotName:spectacle?"Cuña "+spectacle:"Cuña",unit:"cuñas",status,materialStatus:"pendiente"};
   if(!cands.length){const n=share(asked,wt);ws.forEach((w,i)=>{if(!n[i])return;items.push({module:"radio",detail:q.station+" · "+n[i]+" cuñas · sin acuerdo en la app",data:{...base,station:q.station,startDate:w.s,endDate:q.wd&&w.wk?txLastWeekday(w):w.e,plannedSpots:n[i],frequency:n[i]+" cuñas",timeSlot:q.wd?"Lunes a viernes":"Lunes a domingo"}})});
    warn.push(q.station+" ("+radioMonthLabel(mo)+"): no hay acuerdo en la app; se guardan "+asked+" cuñas sin contrato.");continue}
   const free=cands.map(x=>Math.max(0,radioNum(x.l.monthly[mo])-radioRows(existing,x.c.id,mo).filter(r=>r.lineId===x.l.id&&!r.deletedAt).reduce((a,r)=>a+radioNum(r.plannedSpots),0)));
   const cap=free.reduce((a,b)=>a+b,0),give=Math.min(asked,cap);
   if(asked>cap)warn.push(q.station+" ("+radioMonthLabel(mo)+"): pedidas "+asked+" cuñas, quedan "+cap+" en el acuerdo; se asignan "+give+".");
   const perLine=share(give,free).map((n,j)=>Math.min(n,free[j]));
   cands.forEach((x,j)=>{const lwt=ws.map((w,i)=>/L-V/.test(x.l.timeSlot||"")?w.wk:wt[i]),n=share(perLine[j],lwt);
    ws.forEach((w,i)=>{if(!n[i])return;items.push({module:"radio",detail:x.l.station+" · "+(x.l.program||"")+" · "+n[i]+" cuñas",data:{...base,station:x.l.station,duration:x.l.duration,timeSlot:x.l.timeSlot,contractId:x.c.id,lineId:x.l.id,inventoryMonth:mo,startDate:w.s,endDate:w.e,plannedSpots:n[i],frequency:n[i]+" cuñas",notes:x.l.program||""}})})})}}
 if(!spectacle)warn.push("No encuentro el espectáculo en el texto: las cuñas se guardan sin espectáculo. Si lo escribes (tal como está en la app), lo recojo.");
 return {items,warn,used}}
function txLastWeekday(w){const d=new Date(w.e+"T12:00:00Z");while(d.getUTCDay()%6===0&&d.toISOString().slice(0,10)>w.s)d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}
async function txInterpret(text){await loadSpectacles();let existing=[];
 if(/cun/.test(txLow(text))){try{await loadRadioContracts();const d=await api("/api/control?module=radio");existing=d.rows||[];learnSpectacles(existing)}catch{}}
 try{const h=await api("/api/control?module=hitos");learnSpectacles(h.rows||[])}catch{}
 const lines=String(text||"").split(/\n|;/).map(s=>s.trim()).filter(Boolean);
 const r=txRadio(text,lines,existing),h=txHitos(lines,r.used);
 return {items:[...r.items,...h.items],warn:[...r.warn,...h.warn]}}
async function importar(){
 const q=new URLSearchParams(location.hash.split("?")[1]||"").get("d");
 app.innerHTML=pageHead("Importar","Escribe o pega fechas y cuñas, o sube un Excel: revisa la lista y pulsa Añadir")+'<section class="card"><div id="impBody"></div></section>';
 const body=$("#impBody");
 const show=async d=>{const items=importItems(d);if(!items.length){body.innerHTML='<h2 style="margin:0 0 6px">Escribir o pegar</h2><p class="muted" style="margin:0 0 10px">Escribe las fechas como te salga, una por línea, o pega el correo con las cuñas. La app lo interpreta y te enseña la lista antes de guardar nada.</p><textarea id="txText" rows="8" style="width:100%" placeholder="Rueda de prensa 101 Dálmatas 15 de octubre a las 11:30 en Príncipe Pío&#10;Estreno Pegados 28/10 20:00 Pavón&#10;Entrevistas 12, 13 y 14 de noviembre&#10;&#10;Cuñas: del 7 al 30 de septiembre, 4 cuñas diarias de lunes a viernes en Europa FM y Melodía, 2 cuñas diarias en Onda Cero"></textarea><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="txGo">Interpretar</button></div><div id="txMsg"></div><hr style="border:0;border-top:1px solid var(--line);margin:22px 0 18px"><h2 style="margin:0 0 6px">Subir un Excel</h2><p class="muted" style="margin:0 0 10px">Cuñas de radio y fechas del calendario de golpe. Descarga la plantilla, rellénala (una fila por cuña o por fecha) y súbela: verás la lista antes de guardar nada.</p><div class="actions-row"><a class="btn" id="xlTpl" href="/plantillas/Plantilla-Yellow-Control.xlsx" download="Plantilla Yellow Control.xlsx">Descargar plantilla</a><button type="button" class="primary" id="xlPick">Subir Excel</button><input type="file" id="xlFile" accept=".xlsx,.xls,.csv" hidden></div><div id="xlMsg"></div><details style="margin-top:18px"><summary class="muted">Pegar un bloque preparado</summary><textarea id="impText" rows="6" style="width:100%;margin-top:8px"></textarea><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="impRead">Ver datos</button></div></details>';$("#impRead").onclick=()=>{const x=importDecode($("#impText").value);if(!x)say("No se entienden los datos pegados");else show(x)};
   $("#txGo").onclick=async()=>{const t=$("#txText").value.trim(),msg=$("#txMsg");if(!t){say("Escribe o pega algo primero");return}importar.lastText=t;msg.innerHTML='<p class="muted">Interpretando…</p>';
    try{const r=await txInterpret(t);if(!r.items.length){msg.innerHTML='<div class="notice" style="text-align:left;margin-top:12px">No encuentro fechas que guardar. Pon cada fecha con su día y mes (15 de octubre, 15/10) y, si son cuñas, cuántas y en qué emisora.'+(r.warn.length?'<br>'+r.warn.map(esc).join("<br>"):'')+'</div>';return}
     await show({items:r.items,note:r.items.length+" registros interpretados."+(r.warn.length?" "+r.warn.join(" "):""),back:true})}catch(err){msg.innerHTML='<div class="notice" style="margin-top:12px">'+esc(err.message)+'</div>'}};
   if(importar.lastText)$("#txText").value=importar.lastText;
   $("#xlPick").onclick=()=>$("#xlFile").click();
   $("#xlFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const msg=$("#xlMsg");msg.innerHTML='<p class="muted">Leyendo «'+esc(f.name)+'»…</p>';
    try{await loadXLSX();const buf=await f.arrayBuffer();let wb;if(/\.csv$/i.test(f.name)){let t=new TextDecoder("utf-8").decode(buf);if(t.includes("\ufffd"))t=new TextDecoder("windows-1252").decode(buf);wb=XLSX.read(t.replace(/^\ufeff/,""),{type:"string",raw:true})}else wb=XLSX.read(buf,{type:"array"});
     const r=xlParse(wb);if(!r.items.length){msg.innerHTML='<div class="notice" style="text-align:left;margin-top:12px">No hay filas que se puedan añadir.'+(r.errors.length?'<br>'+r.errors.slice(0,30).map(esc).join("<br>"):'')+'</div>';return}
     await show({items:r.items,note:r.items.length+" filas leídas de «"+f.name+"»."+(r.errors.length?" No se han leído "+r.errors.length+": "+r.errors.slice(0,30).join(" · "):"")})}
    catch(err){msg.innerHTML='<div class="notice" style="margin-top:12px">No se ha podido leer el archivo: '+esc(err.message)+'</div>'}};return}
  // Duplicados: mismo módulo y mismos datos clave que un registro existente
  const mods=[...new Set(items.map(x=>x.module))],existing={};for(const m of mods){try{existing[m]=(await api("/api/control?module="+m)).rows||[]}catch{existing[m]=[]}}
  const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
  const dup=x=>!x.data?false:(existing[x.module]||[]).some(r=>x.module==="hitos"?norm(r.type)===norm(x.data.type)&&r.date===x.data.date&&(norm(r.title).includes(norm(x.data.spectacle))||norm(r.spectacle)===norm(x.data.spectacle)||norm(r.title)===norm(x.data.title)):norm(r.spectacle)===norm(x.data.spectacle)&&(r.startDate||"")===(x.data.startDate||"")&&(r.venue||"")===(x.data.venue||"")&&(r.month||"")===(x.data.month||"")&&(r.magazine||"")===(x.data.magazine||"")&&(r.position||"")===(x.data.position||"")&&(x.module!=="radio"||((r.contractId||"")===(x.data.contractId||"")&&(r.inventoryMonth||"")===(x.data.inventoryMonth||"")&&(r.lineId||"")===(x.data.lineId||"")&&(r.station||"")===(x.data.station||"")&&norm(r.spotName)===norm(x.data.spotName))));
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
  // «Quitar todos»: se quitan los registros activos que cumplen match (recuperables en Archivo), p. ej. para sustituirlos
  for(const x of items.filter(x=>x.op==="dropAll")){const fit=r=>Object.entries(x.match).every(([k,v])=>norm(r[k])===norm(v));
   x.drop=(existing[x.module]||[]).filter(r=>fit(r)&&!r.deletedAt);x.same=!x.drop.length;x.detail=x.drop.length?"Quita "+x.drop.length+": "+x.drop.map(r=>r.spectacle||r.magazine||"registro").join(", "):"No hay nada que quitar"}
  // «Repartir por semanas»: la cuña que ya existe se reparte en una asignación por semana (misma pieza y mismo audio)
  const SKIP=["id","createdAt","createdBy","updatedAt","updatedBy","deletedAt"];
  for(const x of items.filter(x=>x.op==="splitWeeks")){
   const fit=r=>Object.entries(x.match).every(([k,v])=>norm(r[k])===norm(v));
   const rows=(existing[x.module]||[]).filter(r=>fit(r)&&!r.deletedAt).sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||"")));
   x.rows=rows;const tot=x.weeks.reduce((a,w)=>a+Number(w.plannedSpots||0),0);
   x.same=rows.length===x.weeks.length&&x.weeks.every((w,i)=>rows[i].startDate===w.startDate&&rows[i].endDate===w.endDate&&Number(rows[i].plannedSpots||0)===Number(w.plannedSpots));
   x.detail=rows.length?tot+" cuñas en "+x.weeks.length+" semana"+(x.weeks.length>1?"s":"")+" ("+x.weeks.map(w=>w.plannedSpots).join(" · ")+")":"No está esta cuña en la app: carga antes las cuñas";
   if(!rows.length)x.same=true}
  body.innerHTML=(d.note?'<p class="muted" style="margin:0 0 10px">'+esc(d.note)+'</p>':'')+'<div class="list">'+items.map((x,i)=>{const dp=x.op==="keepOnly"||x.op==="splitWeeks"||x.op==="dropAll"||(x.matches&&x.matches.length)?!!x.same:dup(x);return '<label class="item imp-row'+(dp?" dup":"")+'"><input type="checkbox" data-imp="'+i+'"'+(dp?"":" checked")+'><div><h3>'+esc(importLabel(x))+'</h3><div class="item-meta"><span class="badge">'+esc(IMPORT_MODULES[x.module])+'</span>'+(x.detail?'<span>'+esc(x.detail)+'</span>':'')+(x.data&&x.data.venue?'<span>'+esc(x.data.venue)+'</span>':'')+(x.data&&x.data.spotName?'<span>'+esc(x.data.spotName)+'</span>':'')+(x.asset?'<span class="badge">'+(/^video/.test(x.asset.type||"")?"Con vídeo":/^audio/.test(x.asset.type||"")?"Con audio":"Con archivo")+'</span>':'')+(dp?'<span class="badge warn">Ya existe</span>':'')+(x.matches&&x.matches.length&&!dp?'<span class="badge">'+(x.matches.length===1&&x.matches[0].date===x.data.date&&(x.matches[0].time||"")===(x.data.time||"")?"Completa":"Sustituye a")+': '+x.matches.map(r=>esc((r.title||r.type)+" · "+fdate(r.date)+(r.time?" "+r.time:""))).join(" / ")+'</span>':'')+'</div></div></label>'}).join("")+'</div>'+
   '<div class="actions-row" style="margin-top:12px">'+(d.back?'<button type="button" id="impBack">Corregir el texto</button>':'')+'<button type="button" class="primary" id="impGo">Añadir seleccionados</button></div><div id="impRes"></div>';
  if(d.back)$("#impBack").onclick=()=>show(null);
  $("#impGo").onclick=async()=>{const sel=$$("[data-imp]").filter(c=>c.checked).map(c=>items[+c.dataset.imp]);if(!sel.length){say("No hay nada seleccionado");return}
   const b=$("#impGo");b.disabled=true;b.textContent="Añadiendo…";let ok=0;const errs=[];
   for(const x of sel){try{
     if(x.op==="splitWeeks"){if(!x.rows.length)throw new Error("no está la cuña");
      for(let i=0;i<x.weeks.length;i++){const w=x.weeks[i],r=x.rows[i];
       if(r)await api("/api/control?module="+x.module+"&id="+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(w)});
       else{const base=Object.fromEntries(Object.entries(x.rows[0]).filter(([k])=>!SKIP.includes(k)));await api("/api/control?module="+x.module,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...base,...w})})}}
      ok++;continue}
     if(x.op==="dropAll"){for(const r of x.drop)await api("/api/control?module="+x.module+"&id="+r.id,{method:"DELETE"});ok++;continue}
     if(x.op==="keepOnly"){if(x.keep&&Object.keys(x.fillData).length)await api("/api/control?module="+x.module+"&id="+x.keep.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(x.fillData)});
      for(const r of x.drop)await api("/api/control?module="+x.module+"&id="+r.id,{method:"DELETE"});ok++;continue}
     const data={...x.data};
     // Archivo adjunto preparado (p. ej. el audio de una cuña): se descarga de la propia web y se sube a la biblioteca
     if(x.asset&&x.asset.url){const ck=x.module+"|"+x.asset.url;if(!importar.up)importar.up={};if(importar.up[ck]){data.assetKey=importar.up[ck];data.assetName=x.asset.name||""}else{const fr=await fetch(x.asset.url,{cache:"no-cache"});if(!fr.ok)throw new Error("no se ha podido leer el archivo "+(x.asset.name||""));const bl=await fr.blob();const file=new File([bl],x.asset.name||"archivo",{type:x.asset.type||bl.type||"application/octet-stream"});data.assetKey=importar.up[ck]=await uploadAsset(file,x.module);data.assetName=file.name}}
     if(x.poster&&x.poster.url){const pr=await fetch(x.poster.url,{cache:"no-cache"});if(pr.ok){const pb=await pr.blob();data.posterKey=await uploadAsset(new File([pb],x.poster.name||"portada.jpg",{type:pb.type||"image/jpeg"}),x.module);data.posterName=x.poster.name||""}}
     if(x.keepId){await api("/api/control?module="+x.module+"&id="+x.keepId,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(x.merged)});for(const id of x.dropIds)await api("/api/control?module="+x.module+"&id="+id,{method:"DELETE"});ok++;continue}
     await api("/api/control?module="+x.module,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});ok++}catch(e){errs.push(importLabel(x)+": "+e.message)}}
   // Home Ticket: se recompone la imagen de cada teatro y mes importados (la que va al resumen mensual)
   for(const pr of [...new Set(sel.filter(x=>x.module==="hometicket"&&x.data&&x.data.venue&&x.data.month).map(x=>x.data.venue+"|"+x.data.month))]){const [v,m]=pr.split("|");try{await htRefreshComposite(v,m)}catch{}}
   history.replaceState(null,"","#importar");
   $("#impRes").innerHTML='<div class="notice" style="margin-top:12px;text-align:left">'+ok+(ok===1?" registro añadido o actualizado.":" registros añadidos o actualizados.")+(sel.some(x=>(x.dropIds&&x.dropIds.length)||(x.drop&&x.drop.length))?" Lo que se ha quitado queda en Archivo, en «Registros quitados».":"")+(errs.length?'<br>No se han podido añadir: '+errs.map(esc).join("<br>"):'')+'</div><div class="actions-row" style="margin-top:10px"><a class="btn primary" href="#'+(sel.some(x=>x.module==="hitos")?"calendario":sel[0].module)+'">'+(sel.some(x=>x.module==="hitos")?"Ver el Calendario":"Ver "+esc(IMPORT_MODULES[sel[0].module]))+'</a></div>';
   b.textContent="Hecho";say(ok+" añadidos")}};
 // Enlace corto: #importar?f=<nombre> carga el paquete preparado en /data/import/<nombre>.json
 const fq=new URLSearchParams(location.hash.split("?")[1]||"").get("f");
 if(fq&&/^[\w.-]+$/.test(fq)){body.innerHTML='<p class="muted">Cargando datos…</p>';try{const r=await fetch("/data/import/"+fq+".json",{cache:"no-store"});if(!r.ok)throw new Error("No encuentro el paquete «"+fq+"» ("+r.status+")");show(await r.json())}catch(e){body.innerHTML='<p class="notice">'+esc(e.message)+'</p>'}return}
 show(importDecode(q));
}

// ===================== CALENDARIO =====================
const HITO_TYPES=["Estreno","Nota de prensa","Newsletter","Rueda de prensa","Pase gráfico","Entrevista / medios","Reunión","Cierre de edición","Evento","Solicitud de proveedor","Otro"];
const HITO_REMINDERS=[["","Por defecto"],["none","Sin aviso"],["15m","15 minutos antes"],["1h","1 hora antes"],["1d","1 día antes"],["2d","2 días antes"]];
const KIND_LABEL={montaje:"Montaje",retirada:"Retirada",inicio:"Inicio",fin:"Fin",entrega:"Entrega",hito:"Hito"};
// Identidad por recinto: color de franja (claro / oscuro) y etiqueta con siglas en sus colores de marca
const VENUE_STYLE={
 "Gran Teatro Pavón":{tag:"PAVÓN",bg:"#4A2C1A",fg:"#FFD968",line:"#4A2C1A",dark:"#D9A066"},
 "Gran Teatro CaixaBank Príncipe Pío":{tag:"P. PÍO",bg:"#1F5FBF",fg:"#FFFFFF",line:"#1F5FBF",dark:"#5B93EA"},
 "Teatro Serrano":{tag:"SERRANO",bg:"#1E8C5A",fg:"#FFFFFF",line:"#1E8C5A",dark:"#4CC08A"},
 "Teatro Arlequín":{tag:"ARLEQUÍN",bg:"#131313",fg:"#FF3B3F",line:"#F4090D",dark:"#FF4D50"},
 "Gran Castillo de Pedraza":{tag:"CASTILLO",bg:"#9A6A3A",fg:"#FFFFFF",line:"#9A6A3A",dark:"#B8906A"},
 "Abono Teatro":{tag:"ABT",bg:"#BC2C4F",fg:"#FFD33C",line:"#BC2C4F",dark:"#E0506E"},
 "Soho City Madrid":{tag:"SOHO",bg:"#1B2A4A",fg:"#C9A24B",line:"#1B2A4A",dark:"#C9A24B"}};
const VENUE_NONE={tag:"YELLOW",bg:"#FFD400",fg:"#131313",line:"#E6BE00",dark:"#FFD400"};
// El título manda cuando la campaña es de otro recinto (p. ej. la cuña de Abonoteatro va en el contrato de Príncipe Pío)
const venueOf=e=>{const t=String(e&&e.title||"").toLowerCase();if(/abono ?teatro/.test(t))return "Abono Teatro";if(/\bpav[oó]n\b/.test(t)&&!(e.venue in VENUE_STYLE&&e.venue==="Gran Teatro Pavón"))return "Gran Teatro Pavón";return e&&e.venue||""};
const venueStyle=e=>VENUE_STYLE[venueOf(e)]||VENUE_NONE;
// Plataforma de la newsletter (se deduce del lugar, las notas o el enlace)
const nlPlatform=e=>{if(!e||!/newsletter/i.test(e.action||""))return null;const t=((e.location||"")+" "+(e.notes||"")+" "+(e.link||"")).toLowerCase();
 if(/brevo|sendinblue|sendibt/.test(t))return{tag:"BREVO",bg:"#0B996E",fg:"#FFFFFF"};if(/mailchimp|mailchi\.mp|list-manage/.test(t))return{tag:"MAILCHIMP",bg:"#FFE01B",fg:"#241C15"};return null};
const venueChip=(e,cls="vchip")=>{const v=venueStyle(e),nl=nlPlatform(e);return '<i class="'+cls+'" style="background:'+v.bg+';color:'+v.fg+'">'+esc(v.tag)+'</i>'+(nl?'<i class="'+cls+' nl" style="background:'+nl.bg+';color:'+nl.fg+'">'+nl.tag+'</i>':'')};
const venueLegend=list=>{const seen=[...new Set(list.map(e=>VENUE_STYLE[venueOf(e)]?venueOf(e):""))];return seen.map(v=>[v||"Yellow / otros",VENUE_STYLE[v]||VENUE_NONE])};
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
let calDaySel="",calDayOpen=new Set(),calOptsOpen=null;
// Un día con 3 o más fechas automáticas del mismo módulo (p. ej. cuñas de radio) las agrupa en una línea desplegable
function calDayHtml(de){const groups=new Map();de.forEach(e=>{if(e.auto&&e.moduleKey!=="hitos"){const k=e.moduleKey;groups.set(k,(groups.get(k)||0)+1)}});
 const done=new Set();return de.map(e=>{const k=e.moduleKey;if(e.auto&&k!=="hitos"&&groups.get(k)>=3){if(done.has(k))return"";done.add(k);const g=de.filter(x=>x.auto&&x.moduleKey===k);
  return '<details class="wk-group"><summary><b>'+esc(e.module)+'</b><span>'+g.length+' fechas · '+esc([...new Set(g.map(x=>evTag(x)))].join(", ").toLowerCase())+'</span></summary>'+g.map(x=>calEvBtn(x,true)).join("")+'</details>'}
  return calEvBtn(e,true)}).join("")}
function calEvMini(e){const v=venueStyle(e);return '<button type="button" class="event mini k-'+e.kind+(e.auto?" auto":" manual")+'" data-ev="'+esc(e.id)+'" title="'+esc(evTag(e)+" · "+e.title)+'" style="--v:'+v.line+';--vd:'+v.dark+'"><i class="mdot"></i><strong>'+esc((e.time?e.time+" ":"")+e.title)+'</strong></button>'}
function renderCalendar(){
 const today=localToday(),ev=calFiltered();
 const mods=CAL_MODS.filter(([k])=>k==="hitos"||k==="carteleria"||canRoute(k));
 const filters='<div class="cal-filters"><div class="chip-row"><button type="button" class="chip'+(calMods.size?"":" on")+'" data-mod="">Todo</button>'+mods.map(([k,l])=>'<button type="button" class="chip'+(calMods.has(k)?" on":"")+'" data-mod="'+k+'">'+l+'</button>').join("")+'</div>'+
  '<select id="calVenue" aria-label="Filtrar por espacio"><option value="">Todos los espacios</option>'+VENUES.map(v=>'<option'+(v===calVenue?" selected":"")+'>'+esc(v)+'</option>').join("")+'</select></div>';
 const views='<div class="seg" role="group" aria-label="Vista"><button type="button" data-view="semana" class="'+(calView==="semana"?"on":"")+'">Semana</button><button type="button" data-view="mes" class="'+(calView==="mes"?"on":"")+'">Mes</button></div>';
 let body="",label="";
 if(calView==="semana"){
  const days=weekRange(calWeekOffset);label=weekTitle(days);
  body='<div class="wk-list">'+days.map(d=>{const iso=isoOf(d),de=ev.filter(e=>e.date===iso);
   return '<div class="wk-day'+(iso===today?" today":"")+(de.length?"":" empty")+'"><div class="wk-head"><b>'+esc(cap(d.toLocaleDateString("es-ES",{weekday:"long"})))+'</b><span>'+d.getDate()+' '+esc(d.toLocaleDateString("es-ES",{month:"short"}))+'</span>'+(iso===today?'<i>Hoy</i>':'')+'</div>'+
    (de.length?calDayHtml(de):'<div class="wk-none">Sin fechas</div>')+'</div>'}).join("")+'</div>';
 }else{
  const y=calCursor.getFullYear(),m=calCursor.getMonth(),first=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7;
  label=cap(calCursor.toLocaleDateString("es-ES",{month:"long",year:"numeric"}));
  let cells=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map(x=>'<div class="weekday">'+x+'</div>').join("");
  for(let i=0;i<offset;i++)cells+='<div class="day empty"></div>';
  // Cada día enseña como mucho 3 fechas en una línea; el resto, en «+N más» (se despliega al pulsar).
  // En el móvil la cuadrícula se mantiene (puntos de color) y al tocar un día se ve su lista debajo.
  const ym=y+"-"+String(m+1).padStart(2,"0");if(!calDaySel||!calDaySel.startsWith(ym))calDaySel=today.startsWith(ym)?today:(ev.filter(e=>e.date.startsWith(ym)).map(e=>e.date).sort()[0]||ym+"-01");
  const MAX=3;
  for(let d=1;d<=n;d++){const iso=isoOf(new Date(y,m,d)),de=ev.filter(e=>e.date===iso);
   cells+='<div class="day'+(de.length?" has-events":"")+(iso===today?" today":"")+(iso===calDaySel?" sel":"")+(calDayOpen.has(iso)?" open":"")+'" data-day="'+iso+'"><div class="day-number">'+d+'</div>'+
    de.slice(0,MAX).map(e=>calEvMini(e)).join("")+(de.length>MAX?'<div class="day-rest">'+de.slice(MAX).map(e=>calEvMini(e)).join("")+'</div><button type="button" class="day-more" data-more="'+iso+'">'+(calDayOpen.has(iso)?"Ver menos":"+"+(de.length-MAX)+"<span> más</span>")+'</button>':'')+'</div>'}
  for(let i=(offset+n)%7;i&&i<7;i++)cells+='<div class="day empty"></div>';
  const sd=ev.filter(e=>e.date===calDaySel),sdd=new Date(calDaySel+"T12:00:00");
  body='<div class="calendar-grid month">'+cells+'</div>'+(ev.some(e=>e.date.startsWith(ym))?'':'<div class="notice" style="margin-top:10px">No hay fechas este mes con estos filtros.</div>')+
   '<div class="cal-daylist" id="calDayList"><div class="wk-head"><b>'+esc(cap(sdd.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})))+'</b><span>'+sd.length+(sd.length===1?" fecha":" fechas")+'</span></div>'+(sd.length?calDayHtml(sd):'<div class="wk-none">Sin fechas</div>')+'</div>';
 }
 app.innerHTML=pageHead("Calendario","Campañas, montajes, entregas e hitos de comunicación de todos los espacios",
  (canRoute("importar")?'<a class="btn" href="#importar">Subir Excel</a>':'')+'<button type="button" id="calSub">Suscribirme</button><button type="button" id="calWeek">Compartir semana</button><button type="button" id="calMonth">Imprimir mes</button>'+(calCanHito()?'<button type="button" class="primary" id="calNewHito">+ Nuevo hito</button>':''))+
  '<div id="calPanel"></div>'+
  '<div class="card cal-card">'+'<div class="calendar-toolbar"><button id="calPrev" aria-label="Anterior">‹</button><div class="cal-now"><strong>'+esc(label)+'</strong><button type="button" class="ghost" id="calToday">Hoy</button></div><button id="calNext" aria-label="Siguiente">›</button>'+views+'</div>'+'<details class="cal-opts" id="calOpts"'+((calOptsOpen??!matchMedia("(max-width:700px)").matches)?" open":"")+'><summary>Filtros y leyenda'+((calMods.size||calVenue)?' <span class="badge">'+(calMods.size+(calVenue?1:0))+' activos</span>':'')+'</summary>'+filters+
  '<div class="cal-legend cal-venues">'+[...Object.entries(VENUE_STYLE),["Yellow / otros",VENUE_NONE]].map(([k,v])=>'<span><b class="vchip" style="background:'+v.bg+';color:'+v.fg+'">'+esc(v.tag)+'</b>'+esc(k)+'</span>').join("")+'<span><b class="vchip nl" style="background:#FFE01B;color:#241C15">MAILCHIMP</b><b class="vchip nl" style="background:#0B996E;color:#fff">BREVO</b>Newsletter</span></div></details>'+
  body+'</div>';
 $$("[data-more]").forEach(b=>b.onclick=e=>{e.stopPropagation();const d=b.dataset.more;calDayOpen.has(d)?calDayOpen.delete(d):calDayOpen.add(d);renderCalendar()});
 $$(".calendar-grid.month .day[data-day]").forEach(c=>c.addEventListener("click",e=>{if(e.target.closest("[data-ev],[data-more]")&&!matchMedia("(max-width:700px)").matches)return;e.preventDefault();e.stopPropagation();calDaySel=c.dataset.day;renderCalendar();if(matchMedia("(max-width:700px)").matches){const l=$("#calDayList");if(l)l.scrollIntoView({behavior:"smooth",block:"start"})}},true));
 const move=dir=>{if(calView==="semana")calWeekOffset+=dir;else calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+dir,1);renderCalendar()};
 $("#calPrev").onclick=()=>move(-1);$("#calNext").onclick=()=>move(1);
 $("#calToday").onclick=()=>{calWeekOffset=0;calCursor=new Date();renderCalendar()};
 $$(".seg [data-view]").forEach(b=>b.onclick=()=>{calView=b.dataset.view;calLS.set("yc-cal-view",calView);renderCalendar()});
 $$(".cal-filters [data-mod]").forEach(b=>b.onclick=()=>{const k=b.dataset.mod;if(!k)calMods.clear();else if(calMods.has(k))calMods.delete(k);else calMods.add(k);renderCalendar()});
 $("#calVenue").onchange=e=>{calVenue=e.target.value;renderCalendar()};$("#calOpts").ontoggle=e=>{calOptsOpen=e.target.open};
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
  g.font="800 17px 'Plus Jakarta Sans', Arial";let cx=pad+26;for(const ch of [vs,nlPlatform(e)].filter(Boolean)){const sm=ch!==vs;g.font="800 "+(sm?12:17)+"px 'Plus Jakarta Sans', Arial";const tw=g.measureText(ch.tag).width+(sm?10:16);g.fillStyle=ch.bg;g.fillRect(cx,y+(sm?4:0),tw,sm?17:24);g.fillStyle=ch.fg;g.fillText(ch.tag,cx+(sm?5:8),y+(sm?6:4));cx+=tw+8}
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
  '.ev{border-left:4px solid;padding:3px 0 3px 9px;margin:0 0 6px}.vc.nl{font-size:7px!important;padding:0 3px!important}.vc{display:inline-block!important;font-style:normal;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;margin-right:5px;letter-spacing:.04em}.ev small{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#666}.ev b{display:block;font-size:14px}.ev span{display:block;color:#555;font-size:12px}.none{color:#999;margin:0}footer{margin-top:16px;color:#999;font-size:10px}</style>'+
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
  '.ev{border-left:3px solid;padding:0 0 0 4px;margin:0 0 3px;break-inside:avoid}.vc.nl{font-size:5px!important;padding:0 2px!important}.vc{display:inline-block!important;font-style:normal;font-size:6.3px;font-weight:800;padding:0 3px;border-radius:2px;margin-right:3px;letter-spacing:.04em}.lg span{display:inline-flex;align-items:center}.ev small{display:block;font-size:6.8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#666}.ev b{display:block;font-size:8.3px;font-weight:700}.ev span{display:block;color:#666;font-size:7.3px}footer{margin-top:4px;color:#999;font-size:7.5px}</style>'+
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
    g.font=font(800,layout.tag*.85);let cx=x+26;for(const ch of [vs,nlPlatform(e)].filter(Boolean)){const k=ch===vs?1:.72;g.font=font(800,layout.tag*.85*k);const tw=g.measureText(ch.tag).width+layout.tag*.6*k;g.fillStyle=ch.bg;g.fillRect(cx,ey-2*s+(1-k)*layout.tag*.5,tw,(layout.tag+3*s)*k);g.fillStyle=ch.fg;g.fillText(ch.tag,cx+layout.tag*.3*k,ey+(1-k)*layout.tag*.45);cx+=tw+6*s}
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
 let d;try{d=await api("/api/admin-users")}catch(e){app.innerHTML=pageHead("Usuarios","Administración de accesos")+teamBand()+'<div class="card notice">Netlify Identity todavía no está habilitado para este proyecto. El código de roles ya está preparado, pero la gestión de usuarios queda bloqueada hasta activar Identity en Netlify.</div>'+contactsCard()+mailTestCard();bindMailTest();bindContacts();return}
 const users=d.users||[];let provs=[];try{provs=(await api("/api/proveedor")).providers||[]}catch{}
 app.innerHTML=pageHead("Usuarios","Roles y permisos reales",'<a class="btn" href="#proveedor">Ver portal de proveedores</a>')+teamBand()+'<div class="grid two-col"><section class="card"><div class="section-title"><h2>Usuarios</h2></div><div class="list">'+users.map(u=>'<div class="item"><div><h3>'+esc(u.email)+'</h3><div class="item-meta"><span>'+esc((u.roles||[]).join(", ")||"sin rol")+'</span>'+statusBadge(u.disabled?"desactivado":"activo")+'</div></div><div class="item-actions"><select data-role-id="'+u.id+'">'+["admin","gestion","carteleria","consulta","proveedor"].map(r=>'<option '+((u.roles||[]).includes(r)?"selected":"")+'>'+r+'</option>').join("")+'</select><select data-prov-id="'+u.id+'"'+((u.roles||[]).includes("proveedor")?'':' hidden')+'><option value="">Proveedor…</option>'+provs.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===u.provider?" selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select><button data-save-role="'+u.id+'">Guardar rol</button><button data-toggle-user="'+u.id+'" data-disabled="'+(u.disabled?"1":"0")+'">'+(u.disabled?"Activar":"Desactivar")+'</button><button type="button" data-recover="'+esc(u.email)+'">Enviar enlace de contraseña</button></div></div>').join("")+'</div></section><section class="card"><div class="section-title"><h2>Crear usuario</h2></div><form id="newUserForm" class="stack"><label>Email<input name="email" type="email" required></label><label>Rol<select name="role" id="newRole"><option>carteleria</option><option>gestion</option><option>consulta</option><option>admin</option><option>proveedor</option></select></label><label id="newProvBox" hidden>Proveedor<select name="provider"><option value="">Elige…</option>'+provs.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("")+'</select></label><button class="primary">Crear y enviar recuperación de contraseña</button></form></section></div>'+contactsCard()+mailTestCard();bindMailTest();bindContacts();
 $$("[data-role-id]").forEach(sel=>sel.onchange=()=>{const pv=$('[data-prov-id="'+sel.dataset.roleId+'"]');if(pv)pv.hidden=sel.value!=="proveedor"});
 {const nr=$("#newRole"),nb=$("#newProvBox");if(nr&&nb)nr.onchange=()=>{nb.hidden=nr.value!=="proveedor"}}
 $$("[data-save-role]").forEach(b=>b.onclick=async()=>{const id=b.dataset.saveRole,role=$('[data-role-id="'+id+'"]').value,provider=($('[data-prov-id="'+id+'"]')||{}).value||"";if(role==="proveedor"&&!provider){say("Elige el proveedor");return}try{await api("/api/admin-users",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id,role,provider})});say("Rol actualizado");admin()}catch(e){say(e.message)}});
 $$("[data-toggle-user]").forEach(b=>b.onclick=async()=>{await api("/api/admin-users",{method:b.dataset.disabled==="1"?"PATCH":"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id:b.dataset.toggleUser})});say("Acceso actualizado");admin()});
 $$("[data-recover]").forEach(b=>b.onclick=async()=>{const email=b.dataset.recover;b.disabled=true;b.textContent="Enviando…";try{await api("/api/admin-users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"recover",email})});b.textContent="Enlace enviado";say("Netlify ha enviado el correo para crear contraseña a "+email+". Que mire también en spam.")}catch(e){b.disabled=false;b.textContent="Enviar enlace de contraseña";say("No se ha podido enviar: "+e.message)}});
 $("#newUserForm").onsubmit=async e=>{e.preventDefault();const v=formObject(e.currentTarget);await api("/api/admin-users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(v)});say("Usuario creado");admin()};
}

(async()=>{try{await window.ycIdentityReady}catch{}
 // Si el acceso había caducado, la primera llamada lo renueva y deja las cookies nuevas: se comprueba una vez más
 let ok=await authenticate();if(!ok&&/(?:^|;\s*)nf_refresh=/.test(document.cookie)){await new Promise(r=>setTimeout(r,300));ok=await authenticate()}if(ok)route();if("serviceWorker"in navigator)ycServiceWorker()})();
// Avisa cuando hay una versión nueva publicada, para no seguir trabajando con la antigua.
// Versión de esta copia de la app. Debe coincidir con CACHE en sw.js (se cambian juntas en cada publicación).
const YC_VERSION="yellow-control-v110";
function ycShowUpdate(){if($("#ycUpdate"))return;const b=document.createElement("div");b.id="ycUpdate";b.className="yc-update";b.setAttribute("role","status");
 b.innerHTML='<span>Hay una versión nueva de Yellow Control.</span><button type="button" class="primary">Actualizar</button>';
 b.querySelector("button").onclick=()=>{if(typeof cart!=="undefined"&&cart.dirty&&cart.dirty.size&&!confirm("Hay cambios sin guardar en Cartelería. ¿Actualizar igualmente?"))return;location.reload()};document.body.appendChild(b)}
// Comprueba en el servidor si se ha publicado otra versión: al abrir, al volver a la app, al cambiar de sección y cada minuto.
async function ycCheckVersion(){try{const r=await fetch("/sw.js?check="+Date.now(),{cache:"no-store"});if(!r.ok)return;const m=(await r.text()).match(/yellow-control-v\d+/);if(m&&m[0]!==YC_VERSION)ycShowUpdate()}catch{}}

// ===================== AVISOS EN EL MÓVIL (Web Push) =====================
// En prueba: solo aparece para los usuarios de la lista (de momento, Fer). En iPhone hace falta abrir la app
// desde el icono de la pantalla de inicio (Compartir › Añadir a pantalla de inicio).
function pushKey(b64){const p="=".repeat((4-b64.length%4)%4),raw=atob((b64+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function pushCard(){const box=$("#pushCard");if(!box)return;
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 const supported="serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window;
 let reg=null,sub=null;try{if(supported){reg=await navigator.serviceWorker.ready;sub=await reg.pushManager.getSubscription()}}catch{}
 let info;try{info=await api("/api/push"+(sub?"?endpoint="+encodeURIComponent(sub.endpoint):""),{cache:"no-store"})}catch{return}
 if(!info.allowed)return;
 const card=(txt,btns)=>{box.innerHTML='<section class="card push-card"><div><small class="section-kicker">Avisos en este dispositivo · en prueba</small><p>'+txt+'</p></div><div class="actions-row">'+btns+'</div></section>'};
 if(!supported){card(ios&&!standalone?"En iPhone los avisos solo funcionan con la app abierta desde el icono de la pantalla de inicio: en Safari, Compartir › Añadir a pantalla de inicio, y ábrela desde ahí.":"Este navegador no admite avisos.","");return}
 if(Notification.permission==="denied"){card("Los avisos están bloqueados para Yellow Control en este dispositivo. Actívalos en los ajustes de notificaciones del móvil o del navegador.","");return}
 if(sub&&info.subscribed){card("Avisos activados. Cada mañana te llega lo que hay hoy en el Calendario y lo urgente.",'<button type="button" id="pushTest">Probar</button><button type="button" class="ghost" id="pushOff">Desactivar</button>');
  $("#pushTest").onclick=async()=>{try{const r=await api("/api/push",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({test:true})});say(r.ok?"Aviso enviado: te llegará en unos segundos":"No se ha podido enviar")}catch(e){say(e.message)}};
  $("#pushOff").onclick=async()=>{try{await api("/api/push",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe()}catch{}say("Avisos desactivados en este dispositivo");pushCard()};return}
 card("Recibe en este dispositivo las fechas del día y lo urgente, como una notificación del móvil.",'<button type="button" class="primary" id="pushOn">Activar avisos</button>');
 $("#pushOn").onclick=async()=>{try{const perm=await Notification.requestPermission();if(perm!=="granted"){say("No se han permitido los avisos");pushCard();return}
  const s=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKey(info.publicKey)});
  await api("/api/push",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({subscription:s.toJSON()})});
  await api("/api/push",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({test:true})});say("Avisos activados");pushCard()}catch(e){say("No se han podido activar: "+e.message)}};
}
function ycServiceWorker(){
 navigator.serviceWorker.register("/sw.js").then(r=>{const up=()=>r.update().catch(()=>{});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")up()})}).catch(()=>{})}
ycCheckVersion();setInterval(ycCheckVersion,60*1000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")ycCheckVersion()});
window.addEventListener("focus",ycCheckVersion);window.addEventListener("hashchange",ycCheckVersion);
})();