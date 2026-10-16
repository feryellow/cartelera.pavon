// ===================== INICIO · CENTRO DE CONTROL =====================
// Ordenador: Hoy · Necesita atención · Esta semana · Actividad reciente · Herramientas.
// Móvil (app): fecha · resumen · Hoy · Falta (agrupado por medio, filas compactas) · Esta semana.
// Además: «Pendiente» (todas las incidencias) y «Medios» (lista de medios con lo que falta), pensadas para el móvil.
// No calcula incidencias: las pinta tal como llegan de /api/engine. Si algo está bien, no aparece.
(function(){
window.YCModules=window.YCModules||{};
let C,DATA=null,DATA_AT=0;
const D=()=>window.YCDate;
const NAMES={radio:"Radio",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas",carteleria:"Cartelería",material:"Material",diseno:"Diseño",patrocinios:"Patrocinios"};
const ICON={radio:"radio",taxis:"taxis",intercambiadores:"intercambiadores",hometicket:"hometicket",revistas:"revistas",carteleria:"carteleria",material:"importar",diseno:"diseno",patrocinios:"patrocinios"};
const MEDIA=[["radio","Radio"],["television","Televisión"],["taxis","Taxis"],["intercambiadores","Intercambiadores"],["hometicket","Home Ticket"],["revistas","Revistas de Teatros"],["carteleria","Cartelería"],["meta","Digital"]];
const greet=()=>{const h=Number(new Intl.DateTimeFormat("es-ES",{hour:"numeric",hour12:false,timeZone:"Europe/Madrid"}).format(new Date()));return h<14?"Buenos días":h<21?"Buenas tardes":"Buenas noches"};
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):"";
const mobile=()=>matchMedia("(max-width:980px)").matches;
const svg=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const CHEV='<path d="M9 6l6 6-6 6"/>';

async function load(force){if(!force&&DATA&&Date.now()-DATA_AT<20000)return DATA;DATA=await C.api("/api/engine");DATA_AT=Date.now();return DATA}

async function thumb(el){
  const k=el.dataset.thumb,kind=el.dataset.kind,mod=el.dataset.module,fb=el.dataset.fallback;
  let url="";
  try{
    if(kind==="asset"&&k)url=await C.blobUrl(k,mod||"publicidad")||"";
    else if(kind==="cart"&&k){const r=await fetch("/api/image?key="+encodeURIComponent(k),{headers:C.headers()});if(r.ok){const ct=r.headers.get("content-type")||"";url=ct.startsWith("text/")?(await r.text()):URL.createObjectURL(await r.blob())}}
  }catch{}
  if(!url&&fb)url=fb;
  if(url){el.style.backgroundImage="url('"+url.replace(/'/g,"%27")+"')";el.classList.add("has-img")}
  else yellow(el);
}
// Cuando no hay logo ni imagen: el logo de Yellow
const YELLOW={src:"/yellow-app-icon-180.png",bg:"#FFD400"};
function yellow(el){el.classList.add("is-logo","is-yellow");el.style.background=YELLOW.bg;el.innerHTML='<img src="'+YELLOW.src+'?v=3" alt="">'}
// Imagen de la incidencia: logo del proveedor o medio si lo hay; si no, la pieza; si no, la portada de la campaña
function visual(i,cls){
  const E=C.esc;
  if(!i.logo&&!i.thumbnail&&!i.fallback)i={...i,logo:YELLOW};
  if(i.logo)return '<span class="'+cls+' is-logo" style="background:'+E(i.logo.bg)+'"><img src="'+E(i.logo.src)+'?v=1" alt="" loading="lazy"></span>';
  return '<span class="'+cls+'" data-thumb="'+E(i.thumbnail?.key||"")+'" data-kind="'+E(i.thumbnail?.kind||"")+'" data-module="'+E(i.thumbnail?.module||"")+'" data-fallback="'+E(i.fallback||"")+'">'+C.icon(ICON[i.section]||"status","hc-ico")+'</span>';
}

// ---------- Ordenador ----------
function issueCard(i){
  const E=C.esc,when=i.date?cap(D().full(i.date,i.time)):i.period||"";
  return '<a class="hc-issue '+(i.severity==="error"?"err":"warn")+'" href="'+E(i.link||"#status")+'">'+visual(i,"hc-thumb")+
    '<span class="hc-body">'+(i.spectacle?'<b class="hc-show">'+E(i.spectacle)+'</b>':'')+
    '<small class="hc-where">'+E(i.sectionName)+(i.title&&i.title!==i.sectionName?' · '+E(i.title):'')+'</small>'+
    '<strong class="hc-what"><em class="yc-state '+(i.severity==="error"?"falta":"atencion")+'">'+E(i.state)+'</em>'+E(i.issue)+'</strong>'+
    (when?'<span class="hc-when">'+E(when)+'</span>':'')+'</span></a>';
}
function eventRow(e){
  const E=C.esc;
  return '<li><span class="hc-time">'+(e.time?E(e.time):"Todo el día")+'</span><b>'+E(e.title)+'</b><small>'+E([e.module==="Hito"?e.action:e.module,e.location].filter(Boolean).join(" · "))+'</small></li>';
}
function desktop(d,provReq){
  const {esc:E,state}=C;
  const name=state.actor?.name?", "+E(String(state.actor.name).trim().split(/\s+/)[0]):"";
  const byDay=new Map();for(const e of d.weekEvents||[]){if(!byDay.has(e.date))byDay.set(e.date,[]);byDay.get(e.date).push(e)}
  const att=d.issues||[];
  return '<section class="hc-hero"><div><small class="hc-kicker">Hoy · '+E(cap(D().full(d.today)))+'</small><h1>'+greet()+name+'</h1></div>'+
      '<div class="hc-counts">'+(att.length?'<a href="#pendiente" class="hc-count err"><b>'+d.errors+'</b><span>'+(d.errors===1?"falta":"faltan")+'</span></a>'+(d.warnings?'<a href="#pendiente" class="hc-count warn"><b>'+d.warnings+'</b><span>atención</span></a>':''):'<span class="hc-count ok"><b>0</b><span>incidencias</span></span>')+'</div></section>'+
    '<div id="pushCard"></div>'+
    '<section class="hc-block hc-today"><h2>Hoy</h2>'+((d.todayEvents||[]).length?'<ul class="hc-events">'+d.todayEvents.map(eventRow).join("")+'</ul>':'<p class="muted">Sin fechas en el Calendario hoy.</p>')+'</section>'+
    '<section class="hc-block hc-attention"><div class="hc-head"><h2>Necesita atención</h2>'+(att.length?'<span class="hc-badge">'+att.length+'</span>':'')+'<a class="hc-more" href="#status">Ver Status</a></div>'+
      (att.length?'<div class="hc-sections">'+d.sections.map(s=>'<span>'+E(s.name)+' <b>'+s.count+'</b></span>').join("")+'</div><div class="hc-issues">'+att.map(issueCard).join("")+'</div>'
        :'<div class="hc-allgood"><b>Nada que resolver.</b> Todo lo que debería existir esta semana está programado.</div>')+
      (provReq.length?'<div class="hc-prov"><h3>Material que piden los proveedores · '+provReq.length+'</h3><ul class="hc-events">'+provReq.map(r=>'<li><span class="hc-time">'+(r.deadline?E(D().relative(r.deadline)):"Sin fecha")+'</span><b>'+E(r.providerName)+' · '+E(r.itemTitle)+'</b><small>«'+E(String(r.message||"").slice(0,140))+'»</small></li>').join("")+'</ul></div>':'')+
    '</section>'+
    '<div class="hc-two"><section class="hc-block"><h2>Esta semana</h2>'+(byDay.size?[...byDay].map(([day,list])=>'<h3 class="hc-day">'+E(cap(D().format(day,{weekday:true})))+'</h3><ul class="hc-events">'+list.map(eventRow).join("")+'</ul>').join(""):'<p class="muted">Sin fechas en los próximos 7 días.</p>')+'<a class="hc-more" href="#calendario">Abrir el Calendario</a></section>'+
    '<section class="hc-block"><h2>Actividad reciente</h2>'+((d.activity||[]).length?'<ul class="hc-activity">'+d.activity.map(a=>'<li><b>'+E(C.who(a.who))+'</b> '+E(a.summary||a.note||a.action)+'<small>'+E(C.modLabel(a.module))+' · '+E(new Date(a.at).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"}))+'</small></li>').join("")+'</ul>':'<p class="muted">Sin actividad reciente.</p>')+'</section></div>'+
    '<section class="hc-block hc-tools"><h2>Herramientas</h2>'+C.homeTiles({},[])+'</section>';
}

// ---------- Móvil (app) ----------
function mRow(i){
  const E=C.esc,sub=[i.title&&i.title!==i.sectionName?i.title:"",i.date?cap(D().format(i.date,{weekday:true,time:i.time})):i.period].filter(Boolean).join(" · ");
  return '<a class="m-row" href="'+E(i.link||"#status")+'">'+visual(i,"m-vis")+'<span class="m-txt"><b>'+E(i.issue)+(i.severity==="warning"?' <em class="m-warn">hoy o mañana</em>':'')+'</b><small>'+E(sub)+'</small>'+(i.spectacle?'<small class="m-show">'+E(i.spectacle)+'</small>':'')+'</span>'+svg(CHEV)+'</a>';
}
function mGroups(issues,openAll){
  const E=C.esc,secs=[...new Set(issues.map(i=>i.section))];
  return secs.map(s=>{const list=issues.filter(i=>i.section===s),open=openAll||issues.length<=15;
    return '<details class="m-group"'+(open?' open':'')+'><summary>'+C.icon(ICON[s]||"status","m-gico")+'<b>'+E(NAMES[s]||s)+'</b><span class="m-count">'+list.length+'</span>'+svg(CHEV)+'</summary><div class="m-list">'+list.map(mRow).join("")+'</div></details>'}).join("");
}
function mEvent(e){const E=C.esc;return '<a class="m-ev" href="#calendario"><span class="m-evt">'+(e.time?E(e.time):"Día")+'</span><span class="m-txt"><b>'+E(e.title)+'</b><small>'+E([e.module==="Hito"?e.action:e.module,e.location].filter(Boolean).join(" · "))+'</small></span></a>'}
function mobileHome(d,provReq){
  const E=C.esc,att=d.issues||[],today=d.todayEvents||[],week=d.weekEvents||[];
  return '<div class="m-home"><header class="m-title"><small>'+E(cap(D().format(d.today,{weekday:true})).split(" ")[0])+'</small><h1>'+E(D().format(d.today))+'</h1></header>'+
    '<div class="m-sum"><a href="#pendiente" class="'+(att.length?"err":"ok")+'"><b>'+att.length+'</b><span>'+(att.length===1?"falta":att.length?"faltan":"todo en orden")+'</span></a><a href="#calendario"><b>'+today.length+'</b><span>hoy</span></a><a href="#calendario"><b>'+week.length+'</b><span>esta semana</span></a></div>'+
    '<h2 class="m-h">Hoy</h2>'+(today.length?'<div class="m-card">'+today.slice(0,3).map(mEvent).join("")+(today.length>3?'<a class="m-more" href="#calendario">Ver '+(today.length-3)+' más</a>':'')+'</div>':'<div class="m-card m-empty">Sin fechas hoy</div>')+
    '<h2 class="m-h">Falta'+(att.length?' <span class="m-count">'+att.length+'</span>':'')+'</h2>'+(att.length?mGroups(att,false):'<div class="m-card m-empty m-ok">Nada que resolver esta semana</div>')+
    (provReq.length?'<h2 class="m-h">Piden los proveedores <span class="m-count">'+provReq.length+'</span></h2><div class="m-card">'+provReq.map(r=>'<a class="m-ev" href="#proveedor"><span class="m-evt">'+(r.deadline?E(D().relative(r.deadline)):"—")+'</span><span class="m-txt"><b>'+E(r.providerName)+'</b><small>'+E(r.itemTitle)+'</small></span></a>').join("")+'</div>':'')+
    (week.length?'<h2 class="m-h">Esta semana</h2><div class="m-card">'+week.slice(0,5).map(e=>mEvent({...e,time:cap(D().format(e.date,{weekday:true})).split(" ")[0].slice(0,3)+(e.time?" "+e.time:"")})).join("")+'<a class="m-more" href="#calendario">Abrir el Calendario</a></div>':'')+
    '<div id="pushCard" class="m-push"></div></div>';
}

async function render(ctx){
  C=ctx;
  const d=await load(true);
  let provReq=[];if(C.roles().some(r=>r==="admin"||r==="gestion")){try{provReq=(await C.api("/api/proveedor?solicitudes=1")).requests||[]}catch{}}
  C.app.innerHTML=mobile()?mobileHome(d,provReq):desktop(d,provReq);
  C.$$("[data-thumb]").forEach(thumb);
}
// Todas las incidencias, con filtro por medio
async function pendiente(ctx){
  C=ctx;const d=await load(false),E=C.esc;let f="";
  const draw=()=>{const list=(d.issues||[]).filter(i=>!f||i.section===f);
    C.app.innerHTML='<div class="m-home m-page"><header class="m-title"><small>'+E(d.week?.label||"")+'</small><h1>Pendiente</h1></header>'+
      '<div class="m-seg">'+[["","Todo",d.total]].concat(d.sections.map(s=>[s.key,s.name,s.count])).map(([k,l,n])=>'<button type="button" data-f="'+k+'" class="'+(k===f?"on":"")+'">'+E(l)+' <b>'+n+'</b></button>').join("")+'</div>'+
      (list.length?mGroups(list,true):'<div class="m-card m-empty m-ok">Nada que resolver</div>')+'</div>';
    C.$$("[data-f]").forEach(b=>b.onclick=()=>{f=b.dataset.f;draw()});C.$$("[data-thumb]").forEach(thumb)};
  draw();
}
// Lista de medios con lo que falta en cada uno
async function medios(ctx){
  C=ctx;const d=await load(false),E=C.esc,count=k=>(d.issues||[]).filter(i=>i.section===k).length;
  C.app.innerHTML='<div class="m-home m-page"><header class="m-title"><small>Publicidad</small><h1>Medios</h1></header><div class="m-card">'+
    MEDIA.filter(([r])=>C.canRoute(r)).map(([r,l])=>{const n=count(r);return '<a class="m-ev m-media" href="#'+r+'">'+C.icon(r,"m-gico")+'<span class="m-txt"><b>'+E(l)+'</b></span>'+(n?'<span class="m-count">'+n+'</span>':'<span class="m-okdot">Al día</span>')+svg(CHEV)+'</a>'}).join("")+'</div></div>';
}
window.YCModules.home={render,pendiente,medios};
})();
