// ===================== INICIO · CENTRO DE CONTROL =====================
// Hoy · Necesita atención (Status Engine) · Esta semana · Actividad reciente · Herramientas.
// No calcula incidencias: las pinta tal como llegan de /api/engine. Si algo está bien, no aparece.
(function(){
window.YCModules=window.YCModules||{};
let C;
const D=()=>window.YCDate;
const SECTION_ICON={radio:"Radio",taxis:"Taxis",intercambiadores:"Intercambiadores",hometicket:"Home Ticket",revistas:"Revistas",carteleria:"Cartelería",material:"Material",diseno:"Diseño"};
const greet=()=>{const h=Number(new Intl.DateTimeFormat("es-ES",{hour:"numeric",hour12:false,timeZone:"Europe/Madrid"}).format(new Date()));return h<14?"Buenos días":h<21?"Buenas tardes":"Buenas noches"};
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):"";

async function thumb(el){
  const k=el.dataset.thumb,kind=el.dataset.kind,mod=el.dataset.module,fb=el.dataset.fallback;
  let url="";
  try{
    if(kind==="asset"&&k)url=await C.blobUrl(k,mod||"publicidad")||"";
    else if(kind==="cart"&&k){const r=await fetch("/api/image?key="+encodeURIComponent(k),{headers:C.headers()});if(r.ok){const ct=r.headers.get("content-type")||"";url=ct.startsWith("text/")?(await r.text()):URL.createObjectURL(await r.blob())}}
  }catch{}
  if(!url&&fb)url=fb;
  if(url){el.style.backgroundImage="url('"+url.replace(/'/g,"%27")+"')";el.classList.add("has-img")}
}

function issueCard(i){
  const E=C.esc,when=i.date?cap(D().full(i.date,i.time)):i.period||"";
  return '<a class="hc-issue '+(i.severity==="error"?"err":"warn")+'" href="'+E(i.link||"#status")+'">'+
    '<span class="hc-thumb" data-thumb="'+E(i.thumbnail?.key||"")+'" data-kind="'+E(i.thumbnail?.kind||"")+'" data-module="'+E(i.thumbnail?.module||"")+'" data-fallback="'+E(i.fallback||"")+'"><i>'+E((SECTION_ICON[i.section]||i.sectionName).slice(0,2).toUpperCase())+'</i></span>'+
    '<span class="hc-body">'+(i.spectacle?'<b class="hc-show">'+E(i.spectacle)+'</b>':'')+
    '<small class="hc-where">'+E(i.sectionName)+' · '+E(i.title)+'</small>'+
    '<strong class="hc-what"><em class="yc-state '+(i.severity==="error"?"falta":"atencion")+'">'+E(i.state)+'</em>'+E(i.issue)+'</strong>'+
    (when?'<span class="hc-when">'+E(when)+'</span>':'')+'</span></a>';
}

function eventRow(e,showDay){
  const E=C.esc;
  return '<li><span class="hc-time">'+(showDay?E(cap(D().format(e.date,{weekday:true}))):"")+(e.time?(showDay?" · ":"")+E(e.time):showDay?"":"Todo el día")+'</span><b>'+E(e.title)+'</b><small>'+E([e.module==="Hito"?e.action:e.module,e.location].filter(Boolean).join(" · "))+'</small></li>';
}

async function render(ctx){
  C=ctx;const {api,esc:E,app,state}=C;
  const d=await api("/api/engine");
  let provReq=[];if(C.roles().some(r=>r==="admin"||r==="gestion")){try{provReq=(await api("/api/proveedor?solicitudes=1")).requests||[]}catch{}}
  const name=state.actor?.name?", "+E(String(state.actor.name).trim().split(/\s+/)[0]):"";
  const today=cap(D().full(d.today));
  const byDay=new Map();for(const e of d.weekEvents||[]){if(!byDay.has(e.date))byDay.set(e.date,[]);byDay.get(e.date).push(e)}
  const att=d.issues||[];
  app.innerHTML=
    '<section class="hc-hero"><div><small class="hc-kicker">Hoy · '+E(today)+'</small><h1>'+greet()+name+'</h1></div>'+
      '<div class="hc-counts">'+(att.length?'<a href="#status" class="hc-count err"><b>'+d.errors+'</b><span>'+(d.errors===1?"falta":"faltan")+'</span></a>'+(d.warnings?'<a href="#status" class="hc-count warn"><b>'+d.warnings+'</b><span>atención</span></a>':''):'<span class="hc-count ok"><b>0</b><span>incidencias</span></span>')+'</div></section>'+
    '<div id="pushCard"></div>'+
    '<section class="hc-block hc-today"><h2>Hoy</h2>'+((d.todayEvents||[]).length?'<ul class="hc-events">'+d.todayEvents.map(e=>eventRow(e,false)).join("")+'</ul>':'<p class="muted">Sin fechas en el Calendario hoy.</p>')+'</section>'+
    '<section class="hc-block hc-attention"><div class="hc-head"><h2>Necesita atención</h2>'+(att.length?'<span class="hc-badge">'+att.length+'</span>':'')+'<a class="hc-more" href="#status">Ver Status</a></div>'+
      (att.length?'<div class="hc-sections">'+d.sections.map(s=>'<span>'+E(s.name)+' <b>'+s.count+'</b></span>').join("")+'</div><div class="hc-issues">'+att.map(issueCard).join("")+'</div>'
        :'<div class="hc-allgood"><b>Nada que resolver.</b> Todo lo que debería existir esta semana está programado.</div>')+
      (provReq.length?'<div class="hc-prov"><h3>Material que piden los proveedores · '+provReq.length+'</h3><ul class="hc-events">'+provReq.map(r=>'<li><span class="hc-time">'+(r.deadline?E(D().relative(r.deadline)):"Sin fecha")+'</span><b>'+E(r.providerName)+' · '+E(r.itemTitle)+'</b><small>«'+E(String(r.message||"").slice(0,140))+'»</small></li>').join("")+'</ul></div>':'')+
    '</section>'+
    '<div class="hc-two"><section class="hc-block"><h2>Esta semana</h2>'+(byDay.size?[...byDay].map(([day,list])=>'<h3 class="hc-day">'+E(cap(D().format(day,{weekday:true})))+'</h3><ul class="hc-events">'+list.map(e=>eventRow(e,false)).join("")+'</ul>').join(""):'<p class="muted">Sin fechas en los próximos 7 días.</p>')+'<a class="hc-more" href="#calendario">Abrir el Calendario</a></section>'+
    '<section class="hc-block"><h2>Actividad reciente</h2>'+((d.activity||[]).length?'<ul class="hc-activity">'+d.activity.map(a=>'<li><b>'+E(C.who(a.who))+'</b> '+E(a.summary||a.note||a.action)+'<small>'+E(C.modLabel(a.module))+' · '+E(new Date(a.at).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"}))+'</small></li>').join("")+'</ul>':'<p class="muted">Sin actividad reciente.</p>')+'</section></div>'+
    '<section class="hc-block hc-tools"><h2>Herramientas</h2>'+C.homeTiles({},[])+'</section>';
  C.$$(".hc-thumb").forEach(thumb);
}
window.YCModules.home={render};
})();
