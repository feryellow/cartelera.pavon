// ===================== EN CAMPAÑA AHORA =====================
// Qué publicidad está activa hoy, esta semana o este mes, por espectáculo. Solo lectura y sin importes.
(function(){
window.YCModules=window.YCModules||{};
let C,D=null,range="semana",venue="",q="",onlyToday=false;
const FULL={"Pavón":"Gran Teatro Pavón","Príncipe Pío":"Gran Teatro CaixaBank Príncipe Pío","Teatro Serrano":"Teatro Serrano","Serrano":"Teatro Serrano","Arlequín":"Teatro Arlequín","Teatro Arlequín":"Teatro Arlequín","Castillo de Pedraza":"Gran Castillo de Pedraza","Abono Teatro":"Abono Teatro"};
const ICON={"Cartelería":'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h5"/>',"Radio":'<rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="15.5" cy="14" r="3"/><path d="M7 12h3M7 16h3M6 8l11-4"/>',"Digital":'<path d="M3 15.5c0-4 2-8.5 4.6-8.5 3.4 0 5.4 10 8.8 10 2 0 3.6-2 3.6-4.6 0-3.3-1.8-5.4-3.8-5.4-3.2 0-5.3 9-8.8 9C5 16 3 16.6 3 15.5z"/>',"Taxis":'<path d="M5 17V12l2-5h10l2 5v5M3 17h18v3H3zM9 4h6"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',"Intercambiadores":'<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21l1-3M16 21l-1-3"/>',"Home Ticket":'<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',"Revistas":'<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M18 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4"/>'};
const svg=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const vstyle=v=>{const s=C.VENUE_STYLE[FULL[v]||v];return s||{tag:String(v||"").toUpperCase(),bg:"#FFD400",fg:"#131313",dark:"#FFD400"}};
const fd=s=>s?new Date(s+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"}).replace(".",""):"";
const span=(a,b)=>a&&b?(a===b?fd(a):fd(a)+" – "+fd(b)):a?"desde "+fd(a):b?"hasta "+fd(b):"";
async function load(){D=await C.api("/api/campanas"+(range==="mes"?"?rango=mes":""))}
function render(){const {$,$$,esc,app,pageHead}=C;
 const venues=[...new Set(D.shows.flatMap(s=>s.venues))].filter(Boolean).sort();
 const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
 const shows=D.shows.map(s=>({...s,media:s.media.filter(m=>(!venue||m.venue===venue||(!m.venue&&s.venues.includes(venue)))&&(!onlyToday||m.today))})).filter(s=>s.media.length&&(!q||norm(s.name).includes(norm(q))));
 const totalMedia=shows.reduce((a,s)=>a+s.media.length,0),mediums=[...new Set(shows.flatMap(s=>s.media.map(m=>m.medium)))];
 const label=range==="mes"?new Date(D.today+"T12:00:00").toLocaleDateString("es-ES",{month:"long",year:"numeric"}):"semana del "+fd(D.week.first)+" al "+fd(D.week.last);
 const card=s=>{const vs=s.venues.map(v=>{const st=vstyle(v);return '<span class="ec-venue" style="background:'+st.bg+';color:'+st.fg+'">'+esc(st.tag)+'</span>'}).join("");
  return '<article class="card ec-show"><header><div><h3>'+esc(s.name)+'</h3><div class="ec-tags">'+vs+'<span class="ec-count">'+s.media.length+(s.media.length===1?' soporte':' soportes')+' · '+s.mediums.length+(s.mediums.length===1?' medio':' medios')+'</span></div></div><div class="ec-icons">'+s.mediums.map(m=>'<span title="'+esc(m)+'">'+svg(ICON[m]||"")+'</span>').join("")+'</div></header>'+
   '<div class="ec-strip">'+s.media.map(m=>{const t=m.thumb;
    const pic=t&&(t.kind==="image")?'<img src="'+esc(t.url)+'" alt="" loading="lazy" onerror="this.remove()">':t&&t.kind==="cart"?'<img data-cart="'+esc(t.url)+'" alt="" loading="lazy">':t&&t.kind==="video"?'<video src="'+esc(t.url)+'#t=1" muted playsinline preload="metadata"></video>':'';
    return '<a class="ec-item'+(m.today?'':' later')+'" href="'+esc(m.link)+'"><span class="ec-thumb'+(pic?'':' none')+'">'+pic+(t&&t.kind==="audio"?'<i class="ec-play">▶</i>':'')+(pic?'':'<b>'+svg(ICON[m.medium]||"")+'</b>')+'</span><span class="ec-med">'+svg(ICON[m.medium]||"")+esc(m.medium)+'</span><b>'+esc(m.label)+'</b>'+(m.detail?'<span>'+esc(m.detail)+'</span>':'')+'<span class="ec-date">'+(m.today?'<em>Activo hoy</em> · ':'')+esc(span(m.start,m.end))+'</span></a>'}).join("")+'</div></article>'};
 app.innerHTML=pageHead("En campaña ahora","Qué publicidad está activa y dónde, por espectáculo. Sin importes")+
  '<section class="card ec-bar"><div class="seg-tabs"><button type="button" data-ecr="semana" class="'+(range==="semana"?"on":"")+'">Esta semana</button><button type="button" data-ecr="mes" class="'+(range==="mes"?"on":"")+'">Este mes</button></div>'+
  '<select id="ecVenue"><option value="">Todos los espacios</option>'+venues.map(v=>'<option'+(v===venue?' selected':'')+'>'+esc(v)+'</option>').join("")+'</select>'+
  '<input id="ecQ" placeholder="Buscar espectáculo" value="'+esc(q)+'"><label class="ec-today"><input type="checkbox" id="ecToday"'+(onlyToday?' checked':'')+'> Solo lo activo hoy</label></section>'+
  '<div class="ec-kpis"><div><b>'+shows.length+'</b><span>espectáculos con publicidad</span></div><div><b>'+totalMedia+'</b><span>soportes activos</span></div><div><b>'+mediums.length+'</b><span>medios</span></div><p>'+esc(label.charAt(0).toUpperCase()+label.slice(1))+'</p></div>'+
  (shows.length?'<div class="ec-list">'+shows.map(card).join("")+'</div>':'<div class="notice">No hay publicidad activa con estos filtros.</div>');
 $$("[data-ecr]").forEach(b=>b.onclick=async()=>{range=b.dataset.ecr;app.innerHTML='<div class="loading">Cargando…</div>';await load();render()});
 $("#ecVenue").onchange=e=>{venue=e.target.value;render()};
 const qi=$("#ecQ");qi.oninput=()=>{q=qi.value;clearTimeout(qi._t);qi._t=setTimeout(()=>{render();const n=$("#ecQ");n.focus();n.setSelectionRange(n.value.length,n.value.length)},250)};
 $("#ecToday").onchange=e=>{onlyToday=e.target.checked;render()};
 // Carteles de la fachada: se cargan con la sesión
 $$("img[data-cart]").forEach(async img=>{try{const r=await fetch(img.dataset.cart,{headers:C.headers()});if(!r.ok)return;const ct=r.headers.get("content-type")||"";const src=ct.includes("text/plain")?await r.text():URL.createObjectURL(await r.blob());img.src=src}catch{}})}
window.YCModules.campanas={render:async ctx=>{C=ctx;await load();render()}};
})();
