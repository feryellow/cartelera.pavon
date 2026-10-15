// ===================== DISEÑO (módulo aparte; antes dentro de app.js) =====================
(function(){
window.YCModules=window.YCModules||{};
let api,esc,say,sayUndo,fdate,pageHead,$,$$,roles,state,VENUE_STYLE,loadXLSX,app;
// ===================== DISEÑO (peticiones a la diseñadora) =====================
// Sustituye a la hoja «ABONOTEATRO Y LA ESTACION». Reglas: sin fecha límite no entra; cupo de urgentes;
// límite de piezas en proceso; avisos al móvil el día laborable antes de cada fecha (a quien la pidió).
// Los indicadores son del proceso, no de personas.
const DS_STATUS=[["pendiente","Pendiente"],["en_proceso","En proceso"],["en_revision","En revisión"],["parado","Parado"],["entregado","Entregado"],["cancelado","Cancelado"]];
const DS_OPEN=["pendiente","en_proceso","en_revision","parado"];
const dsView={tab:"panel",who:"",company:"",state:"abiertas",q:"",alert:"",mine:false};
let DS=null;
const dsDays=YCDate.daysBetween;
const dsLabel=s=>(DS_STATUS.find(x=>x[0]===s)||[s,s])[1];
// Las empresas que son espacios del calendario llevan su mismo color; el resto (personas, otras empresas), el de Ajustes
const DS_VENUE={"ABONOTEATRO":"Abono Teatro","ABONO TEATRO":"Abono Teatro","LA ESTACION":"Gran Teatro CaixaBank Príncipe Pío","LA ESTACIÓN":"Gran Teatro CaixaBank Príncipe Pío","PRINCIPE PIO":"Gran Teatro CaixaBank Príncipe Pío","PAVON":"Gran Teatro Pavón","PAVÓN":"Gran Teatro Pavón","CASTILLO":"Gran Castillo de Pedraza","PEDRAZA":"Gran Castillo de Pedraza","SERRANO":"Teatro Serrano","SOHO CITY":"Soho City Madrid","SOHO":"Soho City Madrid","ARLEQUIN":"Teatro Arlequín","ARLEQUÍN":"Teatro Arlequín"};
const dsColor=(list,name)=>{const v=DS_VENUE[String(name||"").toUpperCase()],vs=v&&VENUE_STYLE[v];if(vs)return document.documentElement.dataset.theme==="light"?vs.bg:vs.dark;return (list.find(x=>x.name===name)||{}).color||"#888"};
const dsWeek=iso=>YCDate.week(iso).first;
function dsAlerts(d){const t=d.today,st=d.settings,open=d.rows.filter(r=>DS_OPEN.includes(r.status)),per={},glob=[];
 const add=(r,k)=>{(per[r.id]=per[r.id]||[]).push(k)};
 for(const r of open){
  if(!r.deadline)add(r,"sinfecha");else if(r.deadline<t)add(r,"vencida");else if(dsDays(t,r.deadline)<=st.soonDays)add(r,"pronto");
  const since=(r.statusChangedAt||r.updatedAt||r.createdAt||"").slice(0,10);if(since&&dsDays(since,t)>st.stallDays&&!r.imported)add(r,"estancada");
  if(r.status==="parado")add(r,"parada");
  if(r.requestDate&&dsDays(r.requestDate,t)>60)add(r,"antigua");
  if(!r.pieceType)add(r,"sintipo")}
 const weeks={};for(const r of open)if(r.deadline&&r.deadline>=t&&dsDays(t,r.deadline)<=42){const w=dsWeek(r.deadline);weeks[w]=(weeks[w]||0)+1}
 for(const [w,n] of Object.entries(weeks))if(n>=st.peakPerWeek)glob.push({k:"pico",txt:"Pico de carga: "+n+" piezas vencen la semana del "+fdate(w)+". Conviene adelantar o repartir."});
 const wip=open.filter(r=>r.status==="en_proceso").length;if(wip>st.wipLimit)glob.push({k:"sobrecarga",txt:wip+" piezas en proceso a la vez (el límite es "+st.wipLimit+"). Mejor cerrar antes de empezar otras."});
 const urg=open.filter(r=>r.urgent).length;if(urg>st.urgentQuota)glob.push({k:"urgentes",txt:urg+" urgentes abiertas (el cupo es "+st.urgentQuota+"). Si todo es urgente, nada lo es."});
 return {per,glob}}
const DS_ALERT={vencida:["Vencida","late"],pronto:["Vence pronto","warn"],sinfecha:["Sin fecha",""],estancada:["Sin cambios",""],parada:["Parada",""],antigua:["Más de 60 días",""],sintipo:["Sin tipo de pieza",""]};
async function diseno(){DS=await api("/api/diseno",{cache:"no-store"});
 // Desde el calendario principal: #diseno?edit=<id> abre la petición; #diseno?tab=campanas abre las campañas del año
 const q=new URLSearchParams(location.hash.split("?")[1]||""),edit=q.get("edit"),tab=q.get("tab");if(edit||tab){history.replaceState(null,"",location.hash.split("?")[0]);dsView.picked=1}
 if(tab)dsView.tab=tab;else if(edit)dsView.tab="peticiones";dsRender();
 const row=edit&&DS.rows.find(r=>r.id===edit);if(row)dsForm(row);else if(edit)say("No se ha encontrado la petición (puede estar quitada)")}
function dsRender(){const d=DS,st=d.settings,isDesigner=roles().includes("diseno")&&!roles().some(r=>r==="admin"||r==="gestion");
 if(isDesigner&&!dsView.picked){dsView.picked=1;dsView.tab="avance"}
 const tabs=[["panel","Panel"],["peticiones","Peticiones"],["avance","Actualizar avance"],["campanas","Campañas del año"],["indicadores","Indicadores"]].concat(d.canSettings?[["ajustes","Ajustes e importación"]]:[]);
 app.innerHTML=pageHead("Diseño","Peticiones de diseño: qué se pide, para cuándo y en qué punto está",(dsView.tab==="peticiones"||dsView.tab==="panel"?'<button type="button" class="primary" id="dsNew">+ Nueva petición</button>':''),"/assets/tiles/diseno-banner.webp")+
  '<div class="tv-tabs ds-tabs">'+tabs.map(([k,l])=>'<button type="button" class="tv-tab'+(dsView.tab===k?' on':'')+'" data-dstab="'+k+'">'+l+'</button>').join("")+'</div><div id="dsBody"></div>';
 $$("[data-dstab]").forEach(b=>b.onclick=()=>{dsView.tab=b.dataset.dstab;dsView.picked=1;dsRender()});
 if($("#dsNew"))$("#dsNew").onclick=()=>{if(dsView.tab!=="peticiones"){dsView.tab="peticiones";dsRender()}dsForm(null)};
 if(dsView.tab==="panel")dsPanel();else if(dsView.tab==="indicadores")dsIndicators();else if(dsView.tab==="avance")dsUpdate();else if(dsView.tab==="campanas")dsCampaigns();else if(dsView.tab==="ajustes")dsSettings();else dsList(isDesigner)}
function dsList(isDesigner){const d=DS,st=d.settings,t=d.today,{per,glob}=dsAlerts(d);
 const counts={};Object.values(per).forEach(ks=>ks.forEach(k=>counts[k]=(counts[k]||0)+1));
 let rows=d.rows.slice();
 if(dsView.state==="abiertas")rows=rows.filter(r=>DS_OPEN.includes(r.status));else if(dsView.state!=="todas")rows=rows.filter(r=>r.status===dsView.state);
 if(dsView.mine&&d.me)rows=rows.filter(r=>r.requester===d.me);
 if(dsView.who)rows=rows.filter(r=>r.requester===dsView.who);
 if(dsView.company)rows=rows.filter(r=>r.company===dsView.company);
 if(dsView.alert)rows=rows.filter(r=>(per[r.id]||[]).includes(dsView.alert));
 if(dsView.q){const q=dsView.q.toLowerCase();rows=rows.filter(r=>(r.title+" "+(r.designerNotes||"")+" "+(r.notes||"")).toLowerCase().includes(q))}
 rows.sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999")||String(b.requestDate||"").localeCompare(String(a.requestDate||"")));
 const people=[...new Set([...st.people.map(p=>p.name),...d.rows.map(r=>r.requester).filter(Boolean)])],companies=[...new Set([...st.companies.map(c=>c.name),...d.rows.map(r=>r.company).filter(Boolean)])];
 const sel=(id,val,opts,first)=>'<select id="'+id+'"><option value="">'+first+'</option>'+opts.map(o=>'<option'+(o===val?' selected':'')+'>'+esc(o)+'</option>').join("")+'</select>';
 const tm=+t.slice(5,7),ty=+t.slice(0,4),campDue=(st.campaigns||[]).filter(c=>c.month===tm||c.month===tm%12+1).filter(c=>!dsCampMatch(c,c.month>=tm?ty:ty+1).length);
 $("#dsBody").innerHTML=(campDue.length?'<button type="button" class="ds-campnote" id="dsCampGo"><b>Campañas por pedir</b> '+campDue.map(c=>esc(DS_MONTHS[c.month-1]+': '+(c.creative||c.dates))).join(' · ')+'<span>Ver campañas del año</span></button>':'')+(glob.length?'<section class="card ds-glob">'+glob.map(g=>'<p><b>'+esc(g.txt.split(":")[0])+'</b>'+esc(g.txt.slice(g.txt.indexOf(":")))+'</p>').join("")+'</section>':'')+
  '<div class="ds-alertbar">'+Object.entries(DS_ALERT).filter(([k])=>counts[k]).map(([k,[l,c]])=>'<button type="button" class="ds-chip '+c+(dsView.alert===k?' on':'')+'" data-dsalert="'+k+'">'+l+' <b>'+counts[k]+'</b></button>').join("")+(dsView.alert?'<button type="button" class="ds-chip" data-dsalert="">Quitar filtro</button>':'')+'</div>'+
  '<section class="card ds-filters"><div class="actions-row">'+
   '<select id="dsState">'+[["abiertas","Abiertas"],["entregado","Entregadas"],["cancelado","Canceladas"],["todas","Todas"]].map(([v,l])=>'<option value="'+v+'"'+(dsView.state===v?' selected':'')+'>'+l+'</option>').join("")+'</select>'+
   sel("dsWho",dsView.who,people,"Todas las personas")+sel("dsCo",dsView.company,companies,"Todas las empresas")+
   '<input id="dsQ" placeholder="Buscar" value="'+esc(dsView.q)+'" style="flex:1;min-width:140px">'+(d.me?'<label class="ds-mine"><input type="checkbox" id="dsMine"'+(dsView.mine?' checked':'')+'> Solo las mías</label>':'')+
  '</div></section>'+
  '<p class="muted" style="margin:4px 2px 10px">'+rows.length+' peticiones</p>'+
  (rows.length?'<div class="ds-list">'+rows.map(r=>{const al=per[r.id]||[],left=r.deadline?dsDays(t,r.deadline):null;
   return '<article class="card ds-item'+(al.includes("vencida")?' late':'')+'" data-dsid="'+r.id+'"><div class="ds-top"><span class="ds-who" style="--c:'+dsColor(st.people,r.requester)+'">'+esc(r.requester||"—")+'</span><span class="ds-co" style="--c:'+dsColor(st.companies,r.company)+'">'+esc(r.company||"—")+'</span>'+(r.pieceType?'<span class="badge">'+esc(r.pieceType)+'</span>':'')+(r.urgent?'<span class="badge late">Urgente</span>':'')+al.filter(k=>k!=="sintipo").map(k=>'<span class="badge '+DS_ALERT[k][1]+'">'+DS_ALERT[k][0]+'</span>').join("")+'</div>'+
    '<h3>'+esc(r.title)+'</h3>'+
    '<div class="ds-meta"><button type="button" class="ds-date sm" data-dsdate="requestDate" title="Corregir fecha de solicitud">Pedida '+(r.requestDate?fdate(r.requestDate):"—")+'</button><button type="button" class="ds-date" data-dsdate="deadline" title="Cambiar fecha límite">'+(r.deadline?'Para el '+fdate(r.deadline):'Poner fecha límite')+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></button>'+(r.deadline&&DS_OPEN.includes(r.status)?'<span>'+(left<0?'vencida hace '+(-left)+' d':left===0?'vence hoy':'faltan '+left+' d')+'</span>':'')+(r.deliveredAt?'<span>Entregada '+fdate(r.deliveredAt)+'</span>':'')+(r.reopenCount?'<span>Reabierta '+r.reopenCount+'</span>':'')+'</div>'+
    (r.status==="cancelado"&&r.cancelReason?'<p class="ds-notes"><b>Cancelada:</b> '+esc(r.cancelReason)+'</p>':'')+(r.designerNotes?'<p class="ds-notes"><b>Comentarios de diseño:</b> '+esc(r.designerNotes)+'</p>':'')+
    '<div class="ds-actions"><select data-dsst="'+r.id+'">'+DS_STATUS.map(([v,l])=>'<option value="'+v+'"'+(r.status===v?' selected':'')+'>'+l+'</option>').join("")+'</select>'+
    '<select data-dspr="'+r.id+'">'+[0,25,50,75,100].map(p=>'<option value="'+p+'"'+(Number(r.progress||0)===p?' selected':'')+'>'+p+' %</option>').join("")+'</select>'+
    '<div class="ds-bar"><i style="width:'+(r.progress||0)+'%"></i></div>'+(r.link?'<a class="btn" href="'+esc(r.link)+'" target="_blank" rel="noopener">Abrir</a>':'')+'<button type="button" class="ghost" data-dsnot>Avisar</button><button type="button" class="ghost" data-dscan>'+(DS_OPEN.includes(r.status)?'Cancelar o borrar':'Borrar')+'</button><button type="button" class="ghost" data-dshist>Historial'+((r.history||[]).length?' ('+r.history.length+')':'')+'</button><button type="button" data-dsed="'+r.id+'">Editar</button></div><div class="ds-edit"></div></article>'}).join("")+'</div>':'<p class="muted">No hay peticiones con estos filtros.</p>');
 if($("#dsCampGo"))$("#dsCampGo").onclick=()=>{dsView.tab="campanas";dsRender()};
 $$("[data-dsalert]").forEach(b=>b.onclick=()=>{dsView.alert=b.dataset.dsalert;if(dsView.alert)dsView.state="abiertas";dsList(isDesigner)});
 $("#dsState").onchange=e=>{dsView.state=e.target.value;dsList(isDesigner)};$("#dsWho").onchange=e=>{dsView.who=e.target.value;dsList(isDesigner)};$("#dsCo").onchange=e=>{dsView.company=e.target.value;dsList(isDesigner)};
 $("#dsQ").oninput=e=>{dsView.q=e.target.value;clearTimeout(dsList.t);dsList.t=setTimeout(()=>{dsList(isDesigner);const q=$("#dsQ");q.focus();q.setSelectionRange(q.value.length,q.value.length)},350)};
 if($("#dsMine"))$("#dsMine").onchange=e=>{dsView.mine=e.target.checked;dsList(isDesigner)};
 const save=async(id,patch)=>{try{const r=await api("/api/diseno?id="+id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({row:patch})});const i=DS.rows.findIndex(x=>x.id===id);DS.rows[i]=r.row;say("Guardado");dsList(isDesigner)}catch(e){say(e.message)}};
 $$("[data-dsst]").forEach(s=>s.onchange=()=>save(s.dataset.dsst,{status:s.value}));
 $$("[data-dspr]").forEach(s=>s.onchange=()=>save(s.dataset.dspr,{progress:+s.value}));
 $$("[data-dsed]").forEach(b=>b.onclick=()=>dsForm(DS.rows.find(r=>r.id===b.dataset.dsed)));
 $$("[data-dsdate]").forEach(b=>b.onclick=()=>{const c=b.closest("[data-dsid]");dsDateEditor(c,DS.rows.find(r=>r.id===c.dataset.dsid),b.dataset.dsdate,isDesigner)});
 $$("[data-dshist]").forEach(b=>b.onclick=()=>{const c=b.closest("[data-dsid]");dsHistory(c,DS.rows.find(r=>r.id===c.dataset.dsid),isDesigner)});
 $$("[data-dscan]").forEach(b=>b.onclick=()=>{const c=b.closest("[data-dsid]");dsCancel(c,DS.rows.find(r=>r.id===c.dataset.dsid),isDesigner)});
 $$("[data-dsnot]").forEach(b=>b.onclick=()=>dsNotify([b.closest("[data-dsid]").dataset.dsid]))}
function dsForm(r,preset){const d=DS,st=d.settings,isNew=!r;r=r||{requester:d.me||"",status:"pendiente",progress:0,...(preset||{})};
 const people=[...new Set([...st.people.map(p=>p.name),r.requester].filter(Boolean))],companies=[...new Set([...st.companies.map(c=>c.name),r.company].filter(Boolean))];
 const opt=(list,val)=>list.map(o=>'<option'+(o===val?' selected':'')+'>'+esc(o)+'</option>').join("");
 $("#dsBody").innerHTML='<section class="card"><div class="section-title"><div><small class="section-kicker">'+(isNew?"Nueva":"Editar")+'</small><h2>Petición de diseño</h2></div></div><form id="dsF" class="form-grid">'+
  '<label class="wide">Qué hay que diseñar<textarea name="title" rows="2" required>'+esc(r.title||"")+'</textarea></label>'+
  '<label>Quién lo pide<select name="requester" required><option value="">Elige…</option>'+opt(people,r.requester)+'</select></label>'+
  '<label>Empresa o espacio<select name="company" required><option value="">Elige…</option>'+opt(companies,r.company)+'</select></label>'+
  '<label>Tipo de pieza<select name="pieceType"><option value="">Elige…</option>'+opt(d.pieceTypes,r.pieceType)+'</select></label>'+
  '<label>Fecha límite<input type="date" name="deadline" value="'+esc(r.deadline||"")+'" required></label>'+
  '<label>Situación<select name="status">'+DS_STATUS.map(([v,l])=>'<option value="'+v+'"'+(r.status===v?' selected':'')+'>'+l+'</option>').join("")+'</select></label>'+
  '<label>Avance<select name="progress">'+[0,25,50,75,100].map(p=>'<option value="'+p+'"'+(Number(r.progress||0)===p?' selected':'')+'>'+p+' %</option>').join("")+'</select></label>'+
  '<label class="ds-urg"><input type="checkbox" name="urgent"'+(r.urgent?' checked':'')+'> Urgente</label>'+
  '<label class="wide">Enlace al material (Dropbox, Drive…)<input name="link" type="url" value="'+esc(r.link||"")+'" placeholder="https://"></label>'+
  '<label class="wide">Comentarios de diseño<textarea name="designerNotes" rows="2">'+esc(r.designerNotes||"")+'</textarea></label>'+
  '<label class="wide">Notas de quien pide (medidas, textos, referencias)<textarea name="notes" rows="3">'+esc(r.notes||"")+'</textarea></label>'+
  '<div class="wide actions-row"><button type="submit" class="primary">'+(isNew?"Enviar petición":"Guardar")+'</button><button type="button" id="dsBack">Volver</button>'+(isNew?'':'<button type="button" class="danger" id="dsDel">Quitar</button>')+'</div></form>'+
  '<p class="muted" style="margin-top:10px">Sin fecha límite no entra: así se puede avisar y priorizar. El aviso al móvil llega a quien la pide el día laborable antes.</p></section>';
 $("#dsBack").onclick=()=>dsRender();
 if($("#dsDel"))$("#dsDel").onclick=async()=>{if(!confirm("¿Quitar esta petición?"))return;try{await api("/api/diseno?id="+r.id,{method:"DELETE"});DS.rows=DS.rows.filter(x=>x.id!==r.id);say("Petición quitada");dsRender()}catch(e){say(e.message)}};
 $("#dsF").onsubmit=async e=>{e.preventDefault();const f=e.target,row={title:f.title.value,requester:f.requester.value,company:f.company.value,pieceType:f.pieceType.value,deadline:f.deadline.value,status:f.status.value,progress:+f.progress.value,urgent:f.urgent.checked,link:f.link.value,designerNotes:f.designerNotes.value,notes:f.notes.value};
  const send=async(force)=>api(isNew?"/api/diseno":"/api/diseno?id="+r.id,{method:isNew?"POST":"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({row,forceUrgent:force})});
  try{let res;try{res=await send(false)}catch(err){if(/cupo/.test(err.message)&&confirm(err.message+"\n\n¿La marcas urgente igualmente?"))res=await send(true);else throw err}
   if(isNew)DS.rows.push(res.row);else DS.rows[DS.rows.findIndex(x=>x.id===r.id)]=res.row;say(isNew?"Petición enviada":"Guardado");dsRender()}catch(err){say(err.message)}}}
function dsIndicators(){const d=DS,t=d.today,rows=d.rows,open=rows.filter(r=>DS_OPEN.includes(r.status)),since=n=>{const x=new Date(t+"T12:00:00Z");x.setUTCDate(x.getUTCDate()-n);return x.toISOString().slice(0,10)};
 const done=rows.filter(r=>r.status==="entregado"&&r.deliveredAt&&r.requestDate),lead=done.map(r=>dsDays(r.requestDate,r.deliveredAt)).filter(n=>n>=0).sort((a,b)=>a-b);
 const med=lead.length?lead[Math.floor(lead.length/2)]:null,avg=lead.length?Math.round(lead.reduce((a,b)=>a+b,0)/lead.length):null;
 const onTime=done.filter(r=>r.deadline),pct=onTime.length?Math.round(100*onTime.filter(r=>r.deliveredAt<=r.deadline).length/onTime.length):null;
 const ages=open.filter(r=>r.requestDate).map(r=>dsDays(r.requestDate,t)),ageAvg=ages.length?Math.round(ages.reduce((a,b)=>a+b,0)/ages.length):null;
 const in30=rows.filter(r=>!r.imported&&(r.requestDate||"")>=since(30)).length,out30=rows.filter(r=>r.deliveredAt&&r.deliveredAt>=since(30)).length;
 const pctOf=(n,tot)=>tot?Math.round(100*n/tot):0,noDate=open.filter(r=>!r.deadline).length,noType=open.filter(r=>!r.pieceType).length;
 const kpi=(v,l)=>'<div class="tv-kpi"><b>'+(v==null?"—":v)+'</b><span>'+esc(l)+'</span></div>';
 const group=(key)=>{const m={};rows.forEach(r=>{const k=r[key]||"—";m[k]=m[k]||{t:0,o:0};m[k].t++;if(DS_OPEN.includes(r.status))m[k].o++});return Object.entries(m).sort((a,b)=>b[1].t-a[1].t)};
 const table=(title,list)=>'<section class="card"><div class="section-title"><div><h2>'+title+'</h2></div></div><div class="table-wrap"><table class="tv-table"><thead><tr><th></th><th class="num">Total</th><th class="num">% del total</th><th class="num">Abiertas</th></tr></thead><tbody>'+list.map(([k,v])=>'<tr><td>'+esc(k)+'</td><td class="num">'+v.t+'</td><td class="num">'+pctOf(v.t,rows.length)+' %</td><td class="num">'+v.o+'</td></tr>').join("")+'</tbody></table></div></section>';
 const weeks=[];for(let i=7;i>=0;i--){const w=dsWeek(since(i*7));weeks.push(w)}
 const flow=weeks.map(w=>{const e=new Date(w+"T12:00:00Z");e.setUTCDate(e.getUTCDate()+6);const we=e.toISOString().slice(0,10);return [w,rows.filter(r=>!r.imported&&r.requestDate>=w&&r.requestDate<=we).length,rows.filter(r=>r.deliveredAt&&r.deliveredAt>=w&&r.deliveredAt<=we).length]});
 $("#dsBody").innerHTML='<section class="card"><div class="tv-kpis">'+kpi(open.length,"abiertas")+kpi(in30,"entradas (30 días)")+kpi(out30,"entregadas (30 días)")+kpi(avg==null?null:avg+" d","plazo medio")+kpi(med==null?null:med+" d","plazo mediano")+kpi(pct==null?null:pct+" %","entregadas a tiempo")+kpi(ageAvg==null?null:ageAvg+" d","edad media de las abiertas")+kpi(rows.reduce((a,r)=>a+(r.reopenCount||0),0),"reaperturas")+'</div>'+
  '<p class="muted" style="margin:12px 0 0">Calidad del dato: '+noDate+' de '+open.length+' abiertas sin fecha límite ('+pctOf(noDate,open.length)+' %) y '+noType+' sin tipo de pieza ('+pctOf(noType,open.length)+' %). El plazo y las entregas a tiempo se miden desde que se usa esta sección: el histórico de la hoja no tenía fecha de entrega. Son indicadores del proceso, no de personas.</p></section>'+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Últimas 8 semanas</small><h2>Entradas y entregas</h2></div></div><div class="table-wrap"><table class="tv-table"><thead><tr><th>Semana del</th><th class="num">Entran</th><th class="num">Se entregan</th></tr></thead><tbody>'+flow.map(([w,i,o])=>'<tr><td>'+fdate(w)+'</td><td class="num">'+i+'</td><td class="num">'+o+'</td></tr>').join("")+'</tbody></table></div></section>'+
  '<div class="tv-grid">'+table("Peticiones por persona",group("requester"))+table("Creatividades por empresa",group("company"))+table("Por tipo de pieza",group("pieceType"))+'</div>'}
function dsSettings(){const d=DS,st=JSON.parse(JSON.stringify(d.settings));
 const rowP=(p,i)=>'<div class="ds-set"><input value="'+esc(p.name)+'" data-pn="'+i+'" placeholder="NOMBRE"><input value="'+esc(p.email)+'" data-pe="'+i+'" type="email" placeholder="correo para el aviso"><input type="color" value="'+esc(p.color)+'" data-pc="'+i+'"><button type="button" class="ghost" data-prm="'+i+'">Quitar</button></div>';
 const rowC=(c,i)=>'<div class="ds-set"><input value="'+esc(c.name)+'" data-cn="'+i+'">'+(DS_VENUE[c.name]?'<span class="ds-vcol" style="--c:'+dsColor([],c.name)+'">Color del calendario</span>':'<input type="color" value="'+esc(c.color)+'" data-cc="'+i+'">')+'<button type="button" class="ghost" data-crm="'+i+'">Quitar</button></div>';
 const num=(k,l)=>'<label>'+l+'<input type="number" min="1" data-num="'+k+'" value="'+st[k]+'"></label>';
 const draw=()=>{$("#dsBody").innerHTML='<div class="tv-grid"><section class="card"><div class="section-title"><div><small class="section-kicker">Quién pide</small><h2>Personas</h2></div></div>'+st.people.map(rowP).join("")+'<button type="button" id="dsAddP">Añadir persona</button><p class="muted">El correo tiene que ser el de su usuario de Yellow Control para que le llegue el aviso del día antes.</p></section>'+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Para quién</small><h2>Empresas y espacios</h2></div></div>'+st.companies.map(rowC).join("")+'<button type="button" id="dsAddC">Añadir empresa</button></section>'+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Valores de partida, a revisar con el uso</small><h2>Umbrales</h2></div></div><div class="form-grid">'+num("soonDays","Avisar de «vence pronto» con (días)")+num("stallDays","«Sin cambios» tras (días)")+num("wipLimit","Máximo en proceso a la vez")+num("urgentQuota","Cupo de urgentes abiertas")+num("peakPerWeek","Pico: vencimientos en una semana")+'</div></section></div>'+
  '<section class="card" style="margin-bottom:14px"><div class="section-title"><div><small class="section-kicker">Desde avisos@yellowmedia.es</small><h2>Avisos por correo de diseño</h2></div></div><label class="ds-mine"><input type="checkbox" id="dsMailLive"'+(st.mailLive?' checked':'')+'> Activados: llegan a quien pidió la pieza (y en copia a quien avisa, si lo marca)</label><p class="muted">Apagado, todos los avisos llegan solo a fernando@yellowmedia.es con el destinatario real en el asunto, para probar.</p></section>'+'<div class="actions-row" style="margin:0 0 14px"><button type="button" class="primary" id="dsSaveSet">Guardar ajustes</button></div>'+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Una vez</small><h2>Importar la hoja de Google</h2></div></div><p>En la hoja «ABONOTEATRO Y LA ESTACION», Archivo › Descargar › Microsoft Excel (.xlsx), y súbelo aquí. Se leen las pestañas de tareas pendientes (también colectivos) y de tareas hechas. Lo que ya esté no se duplica.</p><div class="actions-row"><button type="button" class="primary" id="dsPick">Subir el Excel de la hoja</button><input type="file" id="dsFile" accept=".xlsx" hidden></div><div id="dsImp"></div></section>';
  $$("[data-pn]").forEach(x=>x.oninput=()=>st.people[x.dataset.pn].name=x.value.toUpperCase());$$("[data-pe]").forEach(x=>x.oninput=()=>st.people[x.dataset.pe].email=x.value);$$("[data-pc]").forEach(x=>x.oninput=()=>st.people[x.dataset.pc].color=x.value);
  $$("[data-cn]").forEach(x=>x.oninput=()=>st.companies[x.dataset.cn].name=x.value.toUpperCase());$$("[data-cc]").forEach(x=>x.oninput=()=>st.companies[x.dataset.cc].color=x.value);
  $$("[data-prm]").forEach(b=>b.onclick=()=>{st.people.splice(+b.dataset.prm,1);draw()});$$("[data-crm]").forEach(b=>b.onclick=()=>{st.companies.splice(+b.dataset.crm,1);draw()});
  $("#dsAddP").onclick=()=>{st.people.push({name:"",email:"",color:"#cccccc"});draw()};$("#dsAddC").onclick=()=>{st.companies.push({name:"",color:"#cccccc"});draw()};
  $$("[data-num]").forEach(x=>x.oninput=()=>st[x.dataset.num]=+x.value);$("#dsMailLive").onchange=e=>st.mailLive=e.target.checked;
  $("#dsSaveSet").onclick=async()=>{try{const r=await api("/api/diseno?settings=1",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({settings:st})});DS.settings=r.settings;say("Ajustes guardados")}catch(e){say(e.message)}};
  $("#dsPick").onclick=()=>$("#dsFile").click();$("#dsFile").onchange=e=>dsImportFile(e.target.files[0])};
 draw()}
async function dsImportFile(file){if(!file)return;const box=$("#dsImp");box.innerHTML='<p class="muted">Leyendo…</p>';
 try{await loadXLSX();const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
  const N=s=>String(s??"").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z0-9]+/g," ").trim();
  const iso=YCDate.isoOf;
  const MES={ENERO:1,FEBRERO:2,MARZO:3,ABRIL:4,MAYO:5,JUNIO:6,JULIO:7,AGOSTO:8,SEPTIEMBRE:9,OCTUBRE:10,NOVIEMBRE:11,DICIEMBRE:12};
  const date=(v,ref)=>{if(v instanceof Date&&!isNaN(v))return iso(new Date(v.getTime()+12*36e5));const s=String(v??"").trim();let m=/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(s);if(m){const y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0")}
   m=/^(\d{1,2})\s+(?:DE\s+)?([A-Z]+)/.exec(N(s));if(m&&MES[m[2]]){const y=(ref||"").slice(0,4)||String(new Date().getFullYear());return y+"-"+String(MES[m[2]]).padStart(2,"0")+"-"+m[1].padStart(2,"0")}return ""};
  const status=(s,sent)=>{const x=N(s);if(sent||/ENTREGAD|HECHO|ENVIAD/.test(x))return "entregado";if(/CANCEL/.test(x))return "cancelado";if(/PROCESO/.test(x))return "en_proceso";if(/REVISION/.test(x))return "en_revision";if(/PARAD/.test(x))return "parado";return "pendiente"};
  const out=[],by={};
  for(const name of wb.SheetNames){const n=N(name);const kind=n.startsWith("TAREAS HECHAS")?"hechas":n.startsWith("TAREAS PENDIENTES")?"pendientes":null;if(!kind)continue;
   const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:""});const h=(rows[0]||[]).map(N),col=k=>h.indexOf(k);
   const c={who:col("QUIEN PIDE"),co:col("EMPRESA"),req:col("FECHA SOLICITUD"),title:col("DISENO"),dl:col("FECHA LIMITE"),sit:col("SITUACION"),sent:col("ENVIADO"),com:col("COMENTARIOS CRIS"),pri:col("PRIORIDAD"),av:col("AVANCE"),del:col("FECHA ENTREGA")};
   if(c.title<0)continue;by[name]=0;
   for(const r of rows.slice(1)){const title=String(r[c.title]??"").trim();if(!title||N(title)==="PRUEBA")continue;
    const requestDate=c.req>=0?date(r[c.req]):"",dlRaw=c.dl>=0?r[c.dl]:"",urgent=/URGENT/.test(N(dlRaw))||(c.pri>=0&&/URGENT|ALTA/.test(N(r[c.pri])));
    const sent=c.sent>=0&&r[c.sent]!==""&&r[c.sent]!==false,st=kind==="hechas"?"entregado":status(c.sit>=0?r[c.sit]:"",sent);
    let av=c.av>=0?r[c.av]:"";av=typeof av==="number"?(av<=1?av*100:av):parseInt(String(av))||0;
    out.push({title,requester:N(c.who>=0?r[c.who]:"").replace(/ /g," "),company:String(c.co>=0?r[c.co]:"").trim().toUpperCase(),requestDate,deadline:date(dlRaw,requestDate),status:st,progress:st==="entregado"?100:av,urgent,designerNotes:c.com>=0?String(r[c.com]??"").trim():"",deliveredAt:c.del>=0?date(r[c.del]):""});by[name]++}}
  if(!out.length){box.innerHTML='<div class="notice">No encuentro las pestañas de tareas en ese Excel.</div>';return}
  const open=out.filter(r=>DS_OPEN.includes(r.status)).length;
  box.innerHTML='<div class="notice" style="text-align:left;margin-top:12px">'+Object.entries(by).map(([k,v])=>esc(k)+': '+v).join(" · ")+'<br><b>'+out.length+' peticiones</b>: '+open+' abiertas y '+(out.length-open)+' entregadas o canceladas.</div><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="dsImpGo">Importar '+out.length+' peticiones</button></div>';
  $("#dsImpGo").onclick=async()=>{const b=$("#dsImpGo");b.disabled=true;b.textContent="Importando…";try{let added=0,skipped=0;for(let i=0;i<out.length;i+=400){const r=await api("/api/diseno",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bulk:out.slice(i,i+400)})});added+=r.added;skipped+=r.skipped}
   DS=await api("/api/diseno",{cache:"no-store"});box.innerHTML='<div class="notice" style="margin-top:12px">'+added+' peticiones importadas'+(skipped?' · '+skipped+' ya estaban (repetidas en la hoja o importadas antes)':'')+'.</div>'}catch(e){b.disabled=false;b.textContent="Reintentar";say(e.message)}}}
 catch(e){box.innerHTML='<div class="notice">No se ha podido leer: '+esc(e.message)+'</div>'}}
// ---- Actualizar avance: la diseñadora pega una línea por trabajo, la app la cruza con las peticiones abiertas,
// enseña qué va a cambiar y no guarda nada hasta confirmar. Cada cambio queda en el historial de la petición.
const DSN=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const DS_STOP=new Set("de del la las el los y a al en para con por un una unos unas que esta este ya lo le se su ok vale tb tambien".split(" "));
const DS_KW=[[/\b(entregad[oa]s?|terminad[oa]s?|hech[oa]s?|acabad[oa]s?|enviad[oa]s?|finalizad[oa]s?)\b/,"entregado"],[/\b(en revision|revision|para revisar|a revisar)\b/,"en_revision"],[/\b(parad[oa]s?|bloquead[oa]s?|en espera)\b/,"parado"],[/\b(cancelad[oa]s?|anulad[oa]s?|no se hace|ya no hace falta|no hace falta|ya se ha conseguido|se ha conseguido|conseguid[oa]s?|pedid[oa] por otro lado|por otro lado)\b/,"cancelado"],[/\b(en proceso|empezad[oa]s?|haciendo(?:lo|la)?|empezando|en marcha)\b/,"en_proceso"],[/\b(pendientes?|sin empezar)\b/,"pendiente"]];
const DS_MES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
const DS_FIELD={cancelReason:"motivo",title:"título",requester:"quién pide",company:"empresa",pieceType:"tipo de pieza",requestDate:"fecha de solicitud",deadline:"fecha límite",status:"situación",progress:"avance",urgent:"urgente",designerNotes:"comentario de diseño",link:"enlace",notes:"notas"};
const dsVal=(f,v)=>v===""||v==null?"vacío":f==="status"?dsLabel(v):f==="progress"?v+" %":/Date|deadline/.test(f)?fdate(v):f==="urgent"?(v?"sí":"no"):String(v).length>60?String(v).slice(0,58)+"…":String(v);
function dsName(email){const p=(DS?.settings.people||[]).find(x=>x.email&&x.email===String(email||"").toLowerCase());if(p)return p.name.charAt(0)+p.name.slice(1).toLowerCase();const u=String(email||"").split("@")[0];return u?u.charAt(0).toUpperCase()+u.slice(1):"—"}
function dsWhen(iso){const d=new Date(iso),t=new Date(),y=new Date(Date.now()-864e5),hm=d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});return d.toDateString()===t.toDateString()?"Hoy "+hm:d.toDateString()===y.toDateString()?"Ayer "+hm:d.toLocaleDateString("es-ES",{day:"numeric",month:"short"})+" "+hm}
const dsIsoAdd=YCDate.addDays;
function dsParseLine(raw,today){let s=" "+DSN(raw).replace(/\s+/g," ").trim()+" ",comment="",o={};
 // comentario: lo que va tras « - », « — », «: » o desde «esperando / falta…»
 let m=/\s(?:-|—|–|:|\/\/)\s(.+)$/.exec(raw.replace(/\s+/g," "));if(m){comment=m[1].trim();s=" "+DSN(raw.slice(0,raw.indexOf(m[0]))).trim()+" "}
 else{m=/(?<!hace )\b(esperando|a la espera|falta|faltan|ojo|nota)\b.*$/.exec(s);if(m){const i=DSN(raw).indexOf(m[0].trim());comment=i>=0?raw.slice(i).trim():m[0].trim();s=s.slice(0,m.index)+" "}}
 // fecha: «fecha 30/10», «para el 2/11», «hasta 15 noviembre»
 m=/\b(?:nueva fecha|fecha limite|fecha|para el|para|hasta el|hasta|limite|entrega el|entrega)\s+(\d{1,2})(?:[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?|\s+(?:de\s+)?([a-z]+))/.exec(s);
 if(m){const mo=m[2]?+m[2]:DS_MES[m[4]];if(mo&&mo<=12&&+m[1]>=1&&+m[1]<=31){let y=m[3]?(m[3].length===2?"20"+m[3]:m[3]):today.slice(0,4);let iso=y+"-"+String(mo).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0");if(!m[3]&&dsDays(iso,today)>150)iso=(+y+1)+iso.slice(4);o.deadline=iso;s=s.replace(m[0]," ")}}
 m=/(\d{1,3})\s*%|\bal (\d{1,3})\b/.exec(s);if(m){o.progress=Math.min(100,Math.round(+(m[1]||m[2])/25)*25);s=s.replace(m[0]," ")}
 for(const [re,st] of DS_KW){const k=re.exec(s);if(k){o.status=st;if(st==="cancelado"&&!/^(cancelad|anulad)/.test(k[0]))o.cancelReason=k[0].charAt(0).toUpperCase()+k[0].slice(1);s=s.replace(k[0]," ");break}}
 if(comment)o.designerNotes=comment;
 const words=s.split(/[^a-z0-9ñ]+/).filter(w=>(w.length>1||/\d/.test(w))&&!DS_STOP.has(w));
 return {raw,o,words}}
function dsMatch(words,rows){const tok=r=>DSN(r.title+" "+r.company+" "+(r.pieceType||"")).split(/[^a-z0-9ñ]+/).filter(w=>(w.length>1||/\d/.test(w))&&!DS_STOP.has(w));
 const hit=(w,list)=>list.some(t=>t===w||(w.length>=4&&t.length>=4&&(t.startsWith(w)||w.startsWith(t)))||(w.length>=5&&t.length>=5&&t.slice(0,5)===w.slice(0,5)));
 if(!words.length)return [];
 return rows.map(r=>{const tk=tok(r),n=words.filter(w=>hit(w,tk)).length,cov=tk.length?tk.filter(t=>hit(t,words)).length/tk.length:0;return {r,score:n/words.length+cov*.15}}).filter(x=>x.score>=.5).sort((a,b)=>b.score-a.score)}
function dsPatch(row,o){const p={};
 if(o.deadline&&o.deadline!==row.deadline)p.deadline=o.deadline;
 const canc=(o.status==="cancelado");if(canc&&(o.designerNotes||o.cancelReason))p.cancelReason=o.designerNotes||o.cancelReason;
 if(!canc&&o.designerNotes&&o.designerNotes!==row.designerNotes)p.designerNotes=o.designerNotes;
 let st=o.status;if(!st&&o.progress===100)st="entregado";if(!st&&o.progress>0&&row.status==="pendiente")st="en_proceso";
 if(st&&st!==row.status)p.status=st;
 if(o.progress!=null&&o.progress!==Number(row.progress||0)&&p.status!=="entregado")p.progress=o.progress;
 return p}
const dsUView={text:"",lines:null,done:null};
function dsUpdate(){const d=DS,t=d.today,open=d.rows.filter(r=>DS_OPEN.includes(r.status)).sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999"));
 const wk=dsIsoAdd(t,7),since7=dsIsoAdd(t,-7);
 const stat=(n,l,c)=>'<div class="dsu-stat'+(c?' '+c:'')+'"><b>'+n+'</b><span>'+l+'</span></div>';
 const feed=d.rows.flatMap(r=>(r.history||[]).map(h=>({r,h}))).sort((a,b)=>b.h.at.localeCompare(a.h.at)).slice(0,12);
 // Ejemplos con sus propias peticiones: solo las que se reconocen sin dudar con tres o cuatro palabras
 const short=r=>{const w=r.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().split(" ").filter(x=>x.length>1&&!DS_STOP.has(DSN(x)));for(const n of [2,3,4]){const k=w.slice(0,n),m=dsMatch(k.map(DSN),open);if(m.length&&m[0].r.id===r.id&&!(m[1]&&m[1].score>=m[0].score-.1))return k.join(" ")}return ""};
 const tails=[" 50%"," entregado",x=>" en revisión fecha "+fdate(dsIsoAdd(x.deadline&&x.deadline>t?x.deadline:t,3)).slice(0,-5)," parado - esperando textos"],ex=[];
 for(const r of open){if(ex.length>=4)break;const k=short(r);if(k){const tl=tails[ex.length];ex.push(k+(typeof tl==="function"?tl(r):tl))}}
 $("#dsBody").innerHTML='<div class="dsu">'+
  '<div class="dsu-stats">'+stat(open.filter(r=>r.status==="en_proceso"||r.status==="en_revision").length,"en marcha")+stat(open.filter(r=>r.status==="pendiente").length,"sin empezar")+stat(open.filter(r=>r.deadline&&r.deadline<=wk).length,"vencen en 7 días",open.some(r=>r.deadline&&r.deadline<t)?"hot":"")+stat(d.rows.filter(r=>r.deliveredAt&&r.deliveredAt>=since7).length,"entregadas esta semana","ok")+'</div>'+
  '<div class="dsu-grid"><div class="dsu-main">'+
   '<section class="dsu-box"><div class="dsu-steps"><div><i>1</i><b>Pega</b><span>Una línea por trabajo, como en un WhatsApp.</span></div><div><i>2</i><b>Revisa</b><span>La app te enseña qué va a cambiar.</span></div><div><i>3</i><b>Confirma</b><span>Hasta entonces no se guarda nada.</span></div></div>'+
   '<textarea id="dsuText" rows="7" placeholder="cartel hombre de la mancha 50%\nlona pavón entregada\nflyer kulunka parado - esperando textos\nbanner civitatis en revisión fecha 30/10">'+esc(dsUView.text)+'</textarea>'+
   (ex.length?'<div class="dsu-try"><span>Prueba con tus peticiones:</span>'+ex.map(e=>'<button type="button" class="dsu-ex" data-ex="'+esc(e)+'">'+esc(e)+'</button>').join("")+'</div>':'')+
   '<div class="dsu-go"><button type="button" class="primary" id="dsuCheck">Revisar cambios</button>'+(dsUView.text?'<button type="button" class="ghost" id="dsuClear">Borrar</button>':'')+'</div></section>'+
   '<div id="dsuPrev"></div>'+
   '<details class="dsu-help"><summary>Qué entiende cada línea</summary><div class="dsu-legend">'+
    '<div><b>Avance</b><span>25 %, 50 %, 75 %, 100 % o «al 50». Con 100 % y sin más, se da por entregada.</span></div>'+
    '<div><b>Situación</b><span>en proceso, en revisión, parado, entregado, cancelado, pendiente.</span></div>'+
    '<div><b>Fecha límite</b><span>«fecha 30/10», «para el 2/11», «hasta 15 noviembre».</span></div>'+
    '<div><b>Comentario</b><span>Después de un guion: «- falta el logo». También «esperando…» o «falta…».</span></div><div><b>Ya no hace falta</b><span>«cancelado», «se ha pedido por otro lado», «ya se ha conseguido». Queda cancelada con ese motivo.</span></div>'+
    '<div><b>Qué trabajo es</b><span>Con dos o tres palabras del título basta. Si duda entre varias, te pregunta.</span></div></div></details>'+
  '</div><aside class="dsu-side">'+
   '<section class="dsu-box"><h3>Abiertas, por fecha</h3>'+(open.length?open.slice(0,10).map(r=>{const left=r.deadline?dsDays(t,r.deadline):null;return '<div class="dsu-prog"><div class="dsu-pt"><span class="dsu-dot" style="--c:'+dsColor(d.settings.companies,r.company)+'"></span><b>'+esc(r.title)+'</b><em class="'+(left!=null&&left<0?'late':left!=null&&left<=d.settings.soonDays?'soon':'')+'">'+(left==null?'sin fecha':left<0?'vencida':left===0?'hoy':fdate(r.deadline).slice(0,-5))+'</em></div><div class="dsu-bar"><i style="width:'+(r.progress||0)+'%"></i></div><small>'+dsLabel(r.status)+' · '+(r.progress||0)+' %</small></div>'}).join("")+(open.length>10?'<button type="button" class="ghost dsu-more" id="dsuAll">Ver las '+open.length+'</button>':''):'<p class="muted">Nada abierto.</p>')+'</section>'+
   '<section class="dsu-box"><h3>Últimos avances</h3>'+(feed.length?feed.map(({r,h})=>'<div class="dsu-feed"><small>'+dsWhen(h.at)+' · '+esc(dsName(h.by))+(h.undo?' · deshecho':'')+'</small><b>'+esc(r.title)+'</b><span>'+(h.changes.length?h.changes.map(c=>esc(DS_FIELD[c.f]||c.f)+': '+esc(dsVal(c.f,c.from))+' → <em>'+esc(dsVal(c.f,c.to))+'</em>').join(" · "):esc(h.reason||''))+'</span></div>').join(""):'<p class="muted">Aquí aparecerá cada cambio: quién, cuándo y qué.</p>')+'</section>'+
  '</aside></div></div>';
 const ta=$("#dsuText");ta.oninput=()=>{dsUView.text=ta.value};
 $$(".dsu-ex").forEach(b=>b.onclick=()=>{ta.value=(ta.value.trim()?ta.value.trim()+"\n":"")+b.dataset.ex;dsUView.text=ta.value;ta.focus()});
 if($("#dsuClear"))$("#dsuClear").onclick=()=>{dsUView.text="";dsUView.lines=null;dsUpdate()};
 if($("#dsuAll"))$("#dsuAll").onclick=()=>{dsView.tab="peticiones";dsRender()};
 $("#dsuCheck").onclick=()=>{const lines=ta.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(!lines.length){say("Pega al menos una línea");return}
  dsUView.lines=lines.map(l=>{const p=dsParseLine(l,t),c=dsMatch(p.words,open),amb=c.length>1&&c[1].score>=c[0].score-.1;return {...p,cands:c.slice(0,5).map(x=>x.r.id),id:c.length&&!amb?c[0].r.id:"",amb}});
  dsPreview()};
 if(dsUView.lines)dsPreview();if(dsUView.done)dsDone()}
function dsPreview(){const d=DS,open=d.rows.filter(r=>DS_OPEN.includes(r.status)).sort((a,b)=>a.title.localeCompare(b.title)),byId=id=>d.rows.find(r=>r.id===id);
 const L=dsUView.lines,seen={};
 const rowsHtml=L.map((l,i)=>{const r=l.id&&byId(l.id),p=r?dsPatch(r,l.o):{},n=Object.keys(p).length,dup=r&&seen[r.id];if(r)seen[r.id]=1;
  const pill=!r?(l.amb?'<span class="dsu-pill warn">Elige cuál</span>':'<span class="dsu-pill bad">No la encuentro</span>'):dup?'<span class="dsu-pill warn">Repetida</span>':!n?'<span class="dsu-pill">Sin cambios</span>':p.deadline?'<span class="dsu-pill warn">Cambia la fecha</span>':'<span class="dsu-pill ok">Lista</span>';
  const opts=(l.amb||!r?l.cands.map(byId).concat(open.filter(x=>!l.cands.includes(x.id))):[r].concat(open.filter(x=>x.id!==r.id)));
  return '<div class="dsu-row'+(r&&n&&!dup?' ready':'')+'"><div class="dsu-said">«'+esc(l.raw)+'»</div>'+
   '<div class="dsu-which"><select data-dsupick="'+i+'"><option value="">'+(l.amb?'¿Cuál de estas?':'Elige la petición…')+'</option>'+opts.map(x=>'<option value="'+x.id+'"'+(x.id===l.id?' selected':'')+'>'+esc(x.title.slice(0,70))+' · '+esc(x.company)+'</option>').join("")+'</select>'+(r?'<small>'+esc(r.company)+' · pedida por '+esc(r.requester)+'</small>':'')+'</div>'+
   '<div class="dsu-chg">'+(r&&n?Object.entries(p).map(([f,v])=>'<div><small>'+esc(DS_FIELD[f])+'</small><s>'+esc(dsVal(f,r[f]??""))+'</s> → <b>'+esc(dsVal(f,v))+'</b></div>').join(""):r?'<small class="muted">No he entendido ningún cambio en esta línea.</small>':'')+'</div>'+pill+'</div>'}).join("");
 const ready=L.filter((l,i)=>{const r=l.id&&byId(l.id);return r&&Object.keys(dsPatch(r,l.o)).length&&L.findIndex(x=>x.id===l.id)===i}).length;
 $("#dsuPrev").innerHTML='<section class="dsu-box dsu-prev"><h3>Esto es lo que voy a cambiar</h3>'+rowsHtml+
  '<div class="dsu-foot"><span>'+ready+' de '+L.length+' listas'+(ready<L.length?'. Las demás no se tocan si no eliges la petición.':'')+'</span><div><button type="button" class="ghost" id="dsuBack">Volver a editar</button><button type="button" class="primary" id="dsuSave"'+(ready?'':' disabled')+'>Confirmar '+ready+' cambio'+(ready===1?'':'s')+'</button></div></div></section>';
 $$("[data-dsupick]").forEach(s=>s.onchange=()=>{const l=L[+s.dataset.dsupick];l.id=s.value;l.amb=false;dsPreview()});
 $("#dsuBack").onclick=()=>{dsUView.lines=null;$("#dsuPrev").innerHTML="";$("#dsuText").focus()};
 $("#dsuSave").onclick=async()=>{const b=$("#dsuSave");b.disabled=true;b.textContent="Guardando…";const used={},updates=[];
  for(const l of L){const r=l.id&&byId(l.id);if(!r||used[r.id])continue;const p=dsPatch(r,l.o);if(!Object.keys(p).length)continue;used[r.id]=1;updates.push({id:r.id,row:p,reason:"Pegado: "+l.raw.slice(0,150)})}
  try{const res=await api("/api/diseno",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({updates})});DS=await api("/api/diseno",{cache:"no-store"});
   dsUView.done=res.rows.map(r=>r.id);dsUView.lines=null;dsUView.text="";dsUpdate()}catch(e){b.disabled=false;b.textContent="Reintentar";say(e.message)}}}
function dsDone(){const ids=dsUView.done;dsUView.done=null;const rows=ids.map(id=>DS.rows.find(r=>r.id===id)).filter(Boolean);
 $("#dsuPrev").innerHTML='<section class="dsu-box dsu-ok"><h3>Hecho: '+rows.length+' petici'+(rows.length===1?'ón actualizada':'ones actualizadas')+'</h3>'+rows.map(r=>'<div class="dsu-okrow"><b>'+esc(r.title)+'</b><span>'+dsLabel(r.status)+' · '+(r.progress||0)+' %'+(r.deadline?' · para el '+fdate(r.deadline):'')+'</span><button type="button" class="ghost" data-dsuundo="'+r.id+'">Deshacer</button></div>').join("")+'<div class="actions-row" style="margin-top:12px"><button type="button" class="primary" id="dsuMail">Avisar por correo a quien lo pidió</button></div><p class="muted">Cada cambio queda en el historial de su petición.</p></section>';
 $("#dsuMail").onclick=()=>dsNotify(ids);
 $$("[data-dsuundo]").forEach(b=>b.onclick=async()=>{try{const r=await api("/api/diseno?id="+b.dataset.dsuundo+"&undo=1",{method:"PUT",headers:{"content-type":"application/json"},body:"{}"});DS.rows[DS.rows.findIndex(x=>x.id===r.row.id)]=r.row;b.closest(".dsu-okrow").classList.add("undone");b.replaceWith(Object.assign(document.createElement("em"),{textContent:"Deshecho"}));say("Deshecho")}catch(e){say(e.message)}})}
// Cambiar una fecha desde la tarjeta, con atajos y motivo; y ver el historial con «Deshacer último cambio»
function dsDateEditor(card,r,f,isDesigner){const box=card.querySelector(".ds-edit");if(box.dataset.open===f){box.innerHTML="";box.dataset.open="";return}box.dataset.open=f;
 const cur=r[f]||DS.today,fri=(()=>{const d=new Date(cur+"T12:00:00Z"),k=(5-d.getUTCDay()+7)%7||7;return dsIsoAdd(cur,k)})(),mon=(()=>{const d=new Date(cur+"T12:00:00Z"),k=(1-d.getUTCDay()+7)%7||7;return dsIsoAdd(cur,k)})();
 box.innerHTML='<div class="ds-datebox"><b>'+(f==="deadline"?"Cambiar fecha límite":"Corregir fecha de solicitud")+'</b>'+(f==="deadline"?'<div class="ds-quick">'+[["+1 día",dsIsoAdd(cur,1)],["+1 semana",dsIsoAdd(cur,7)],["Viernes "+fdate(fri).slice(0,-5),fri],["Lunes "+fdate(mon).slice(0,-5),mon]].map(([l,v])=>'<button type="button" data-q="'+v+'">'+l+'</button>').join("")+'</div>':'')+
  '<div class="ds-daterow"><input type="date" value="'+esc(r[f]||"")+'"><input class="ds-why" placeholder="Motivo (opcional): se anotó mal, lo piden para antes…"></div><div class="actions-row"><button type="button" class="primary ds-dsave">Guardar</button><button type="button" class="ghost ds-dcancel">Cancelar</button></div></div>';
 const inp=box.querySelector("input[type=date]");box.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{inp.value=b.dataset.q;box.querySelectorAll("[data-q]").forEach(x=>x.classList.toggle("on",x===b))});
 box.querySelector(".ds-dcancel").onclick=()=>{box.innerHTML="";box.dataset.open=""};
 box.querySelector(".ds-dsave").onclick=async()=>{if(!inp.value){say("Elige una fecha");return}if(inp.value===r[f]){box.innerHTML="";box.dataset.open="";return}
  try{const res=await api("/api/diseno?id="+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({row:{[f]:inp.value},reason:box.querySelector(".ds-why").value})});DS.rows[DS.rows.findIndex(x=>x.id===r.id)]=res.row;say("Fecha cambiada a "+fdate(inp.value));dsList(isDesigner)}catch(e){say(e.message)}}}
function dsHistory(card,r,isDesigner){const box=card.querySelector(".ds-edit");if(box.dataset.open==="hist"){box.innerHTML="";box.dataset.open="";return}box.dataset.open="hist";
 const h=(r.history||[]).slice().reverse(),canUndo=h.some(x=>!x.undo&&!x.undone&&x.changes.length);
 box.innerHTML='<div class="ds-hist">'+(h.length?h.map(x=>'<div><small>'+dsWhen(x.at)+' · '+esc(dsName(x.by))+(x.undone?' · deshecho':'')+'</small><span>'+x.changes.map(c=>esc(DS_FIELD[c.f]||c.f)+': '+esc(dsVal(c.f,c.from))+' → <b>'+esc(dsVal(c.f,c.to))+'</b>').join(" · ")+(x.reason?(x.changes.length?' <em>('+esc(x.reason)+')</em>':esc(x.reason)):'')+'</span></div>').join(""):'<p class="muted">Sin cambios registrados todavía'+(r.imported?' (viene de la hoja)':'')+'.</p>')+
  '<p class="muted ds-hist-orig">Creada '+(r.createdAt?dsWhen(r.createdAt):"—")+(r.createdBy?' · '+esc(dsName(r.createdBy)):'')+(r.imported?' · importada de la hoja':'')+'</p>'+
  (canUndo?'<button type="button" class="ghost ds-undo">Deshacer último cambio</button>':'')+'</div>';
 if(box.querySelector(".ds-undo"))box.querySelector(".ds-undo").onclick=async()=>{try{const res=await api("/api/diseno?id="+r.id+"&undo=1",{method:"PUT",headers:{"content-type":"application/json"},body:"{}"});DS.rows[DS.rows.findIndex(x=>x.id===r.id)]=res.row;say("Deshecho");dsList(isDesigner)}catch(e){say(e.message)}}}
// Cancelar (se pidió por otro lado, ya se consiguió…) o borrar del todo, desde la tarjeta
function dsCancel(card,r,isDesigner){const box=card.querySelector(".ds-edit");if(box.dataset.open==="cancel"){box.innerHTML="";box.dataset.open="";return}box.dataset.open="cancel";
 const mail=(DS.settings.people.find(p=>p.name===r.requester)||{}).email;
 box.innerHTML='<div class="ds-datebox"><b>¿Ya no hace falta?</b><div class="ds-quick">'+["Se ha pedido por otro lado","Ya se ha conseguido","Ya no hace falta"].map(m=>'<button type="button" data-cr="'+esc(m)+'">'+m+'</button>').join("")+'</div>'+
  '<input class="ds-why" placeholder="Otro motivo (opcional)">'+
  (mail?'<label class="ds-mine"><input type="checkbox" class="ds-cmail"> Avisar por correo a '+esc(r.requester.charAt(0)+r.requester.slice(1).toLowerCase())+'</label>':'')+
  '<div class="actions-row"><button type="button" class="primary ds-cgo">Cancelar la petición</button><button type="button" class="danger ds-cdel">Borrar del todo</button><button type="button" class="ghost ds-cback">Volver</button></div>'+
  '<p class="muted" style="margin:0;font-size:12px">Cancelar la deja en el archivo con su motivo y cuenta en los indicadores. Borrar la quita de la lista (se puede recuperar justo después).</p></div>';
 const why=box.querySelector(".ds-why");box.querySelectorAll("[data-cr]").forEach(b=>b.onclick=()=>{why.value=b.dataset.cr;box.querySelectorAll("[data-cr]").forEach(x=>x.classList.toggle("on",x===b))});
 box.querySelector(".ds-cback").onclick=()=>{box.innerHTML="";box.dataset.open=""};
 box.querySelector(".ds-cgo").onclick=async()=>{const reason=why.value.trim();try{const res=await api("/api/diseno?id="+r.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({row:{status:"cancelado",cancelReason:reason},reason:reason||"Cancelada"})});DS.rows[DS.rows.findIndex(x=>x.id===r.id)]=res.row;say("Petición cancelada");const m=box.querySelector(".ds-cmail");dsList(isDesigner);if(m&&m.checked)dsNotify([r.id])}catch(e){say(e.message)}};
 box.querySelector(".ds-cdel").onclick=async()=>{if(!confirm("¿Borrar «"+r.title.slice(0,60)+"»?"))return;const u="/api/diseno?id="+r.id;try{await api(u,{method:"DELETE"});DS.rows=DS.rows.filter(x=>x.id!==r.id);dsList(isDesigner);sayUndo("Petición borrada",u,async()=>{DS=await api("/api/diseno",{cache:"no-store"});dsList(isDesigner)})}catch(e){say(e.message)}}}
// Aviso por correo a quien pidió cada pieza: siempre a esa persona, con copia opcional a quien avisa.
// Sale de avisos@ y empieza por «Esto es un aviso. No respondas…». Se ve antes de enviar.
async function dsNotify(ids){if(!ids.length)return;const el=document.createElement("div");el.className="ds-sheet";
 el.innerHTML='<div class="ds-sheet-box" role="dialog" aria-label="Avisar por correo"><button type="button" class="ghost ds-sheet-x" aria-label="Cerrar">×</button><h2>Avisar por correo</h2><p class="muted">Preparando…</p></div>';
 document.body.appendChild(el);document.body.classList.add("sheet-open");
 const close=()=>{el.remove();document.body.classList.remove("sheet-open")};el.onclick=e=>{if(e.target===el)close()};el.querySelector(".ds-sheet-x").onclick=close;
 const call=(extra)=>api("/api/diseno",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({notify:{ids,...extra}})});
 let pre;try{pre=await call({dryRun:true})}catch(e){el.querySelector("p").textContent=e.message;return}
 const me=state.actor?.email||"",ok=pre.results.filter(x=>!x.error),box=el.querySelector(".ds-sheet-box");
 box.innerHTML='<button type="button" class="ghost ds-sheet-x" aria-label="Cerrar">×</button><small class="section-kicker">Desde avisos@yellowmedia.es</small><h2>Avisar por correo</h2>'+
  (pre.live?'':'<div class="ds-test">En pruebas: el correo llegará solo a fernando@yellowmedia.es hasta que se activen los avisos en Ajustes.</div>')+
  '<div class="ds-rcpt">'+pre.results.map(x=>'<div class="'+(x.error?'off':'')+'"><b>'+esc(x.name.charAt(0)+x.name.slice(1).toLowerCase())+'</b><span>'+(x.error?esc(x.error):esc(x.email))+'</span><em>'+x.count+' petici'+(x.count===1?'ón':'ones')+'</em></div>').join("")+'</div>'+
  '<label class="ds-mine"><input type="checkbox" id="dsnCc" checked> Ponerme en copia'+(me?' ('+esc(me)+')':'')+'</label>'+
  '<label class="ds-msg">Mensaje (opcional)<textarea id="dsnMsg" rows="3" placeholder="Por ejemplo: te dejo el enlace con las dos versiones."></textarea></label>'+
  '<details class="ds-prev"><summary>Ver cómo queda</summary><div id="dsnPrev"></div></details>'+
  '<div class="actions-row"><button type="button" class="primary" id="dsnGo"'+(ok.length?'':' disabled')+'>Enviar '+(ok.length===1?'el aviso':ok.length+' avisos')+'</button><button type="button" class="ghost" id="dsnNo">Ahora no</button></div>';
 box.querySelector(".ds-sheet-x").onclick=close;$("#dsnNo").onclick=close;
 const prev=async()=>{const r=await call({dryRun:true,message:$("#dsnMsg").value});const f=r.results.find(x=>x.html);$("#dsnPrev").innerHTML=f?'<p class="muted" style="margin:8px 0">Asunto: <b>'+esc(f.subject)+'</b></p><div class="ds-mailprev"><iframe title="Vista previa del correo"></iframe></div>':'<p class="muted">No hay a quién enviarlo.</p>';const fr=$("#dsnPrev iframe");if(fr)fr.srcdoc='<!doctype html><meta charset="utf-8"><body style="margin:0">'+f.html};
 box.querySelector(".ds-prev").ontoggle=e=>{if(e.target.open)prev()};
 $("#dsnGo").onclick=async()=>{const b=$("#dsnGo");b.disabled=true;b.textContent="Enviando…";
  try{const r=await call({ccMe:$("#dsnCc").checked,message:$("#dsnMsg").value});const sent=r.results.filter(x=>x.sent);
   box.innerHTML='<button type="button" class="ghost ds-sheet-x" aria-label="Cerrar">×</button><h2>'+(sent.length?'Aviso enviado':'No se ha enviado')+'</h2><div class="ds-rcpt">'+r.results.map(x=>'<div class="'+(x.sent?'':'off')+'"><b>'+esc(x.name.charAt(0)+x.name.slice(1).toLowerCase())+'</b><span>'+(x.sent?(r.live?'Enviado a '+esc(x.email):'En pruebas: enviado a fernando@yellowmedia.es'):esc(x.error||"No enviado"))+'</span></div>').join("")+'</div><div class="actions-row"><button type="button" class="primary" id="dsnOk">Hecho</button></div>';
   box.querySelector(".ds-sheet-x").onclick=close;$("#dsnOk").onclick=close;
   DS=await api("/api/diseno",{cache:"no-store"})}catch(e){b.disabled=false;b.textContent="Reintentar";say(e.message)}}}
// ---- Campañas del año (pestaña «CALENDARIO CAMPAÑAS» de la hoja): qué fechas y creatividades tocan cada mes,
// si ya hay petición hecha y un botón para pedirla con los datos puestos. Fer y Celia pueden editarlo.
const DS_MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DS_CGEN=new Set("creatividad creatividades cambio general final nueva dia campana campanas para teatro teatros web redes".split(" "));
function dsCampMatch(c,year){const keys=DSN(c.dates||c.creative).split(/[^a-z0-9ñ]+/).filter(w=>w.length>=4&&!DS_STOP.has(w)&&!DS_CGEN.has(w));if(!keys.length)return [];const has=(title,k)=>DSN(title).split(/[^a-z0-9ñ]+/).some(w=>w===k||w===k+"s"||w===k+"es");
 const from=new Date(year,c.month-1,1);from.setMonth(from.getMonth()-3);const fromIso=YCDate.isoOf(from),toIso=year+"-"+String(c.month).padStart(2,"0")+"-31";
 return DS.rows.filter(r=>{const ref=r.deadline||r.deliveredAt||r.requestDate||"";return r.status!=="cancelado"&&ref>=fromIso&&ref<=toIso}).filter(r=>(!c.company||r.company===c.company)&&keys.some(k=>has(r.title,k)))}
function dsCampTitle(c){return c.creative?c.creative+(c.dates?" ("+c.dates+")":""):"Creatividad "+c.dates}
// La tabla de la hoja («CALENDARIO CAMPAÑAS»), tal cual, arriba del todo en Diseño: se ve nada más entrar
function dsCampTable(){const st=DS.settings,list=st.campaigns||[],tm=+DS.today.slice(5,7),onlyAbt=list.every(c=>c.company==="ABONOTEATRO");
 const cell=(m,f)=>list.filter(c=>c.month===m&&c[f]).map(c=>esc(c[f])+(onlyAbt||f!=="dates"?'':' <i class="dst-co">'+esc(c.company)+'</i>')).join(" / ");
 return '<section class="dst"><div class="dst-head"><h2>'+(onlyAbt?'Campañas para Abonoteatro anuales':'Calendario de campañas')+'</h2>'+(DS.canSettings?'<button type="button" class="ghost" id="dstEdit">Editar</button>':'')+'</div><table><thead><tr><th>Mes</th><th>Campaña</th><th>Creatividad</th></tr></thead><tbody>'+
  DS_MONTHS.map((n,i)=>'<tr'+(i+1===tm?' class="now"':'')+'><th>'+n+(i+1===tm?' <em>este mes</em>':'')+'</th><td>'+cell(i+1,"dates")+'</td><td>'+cell(i+1,"creative")+'</td></tr>').join("")+'</tbody></table></section>'}
function dsCampaigns(){const d=DS,st=d.settings,list=st.campaigns||[],t=d.today,ty=+t.slice(0,4),tm=+t.slice(5,7);
 const order=Array.from({length:12},(_,i)=>((tm-1+i)%12)+1);
 const when=m=>{const diff=(m-tm+12)%12;return diff===0?"Este mes":diff===1?"El mes que viene":"Dentro de "+diff+" meses"};
 const yearOf=m=>m>=tm?ty:ty+1;
 $("#dsBody").innerHTML='<div class="dsc-head"><p class="muted">Campañas fijas de cada año. Empieza por el mes en curso. Si ya hay una petición que encaja, aparece; si no, se puede pedir desde aquí.</p>'+(d.canSettings?'<button type="button" class="ghost" id="dscEdit">Editar calendario</button>':'')+'</div>'+
  '<div class="dsc-grid">'+order.map((m,i)=>{const items=list.filter(c=>c.month===m),soon=i<2;
   return '<section class="dsc-month'+(soon?' soon':'')+(items.length?'':' empty')+'"><header><h3>'+DS_MONTHS[m-1]+'</h3><small>'+when(m)+(m<tm?' · '+(ty+1):'')+'</small></header>'+
    (items.length?items.map(c=>{const hits=dsCampMatch(c,yearOf(m));return '<div class="dsc-item">'+(c.dates?'<b>'+esc(c.dates)+'</b>':'')+(c.creative?'<span>'+esc(c.creative)+'</span>':'')+'<div class="dsc-foot"><i class="ds-co" style="--c:'+dsColor(st.companies,c.company)+'">'+esc(c.company)+'</i>'+
      (hits.length?hits.slice(0,2).map(r=>'<em class="dsc-hit '+(r.status==="entregado"?'ok':'')+'" title="'+esc(r.title)+'">'+(r.status==="entregado"?'Entregada':'Pedida')+' · '+esc(r.title.slice(0,40))+(r.title.length>40?'…':'')+'</em>').join(""):'<button type="button" class="'+(soon?'primary':'ghost')+' dsc-ask" data-camp="'+c.id+'" data-y="'+yearOf(m)+'">Pedir creatividad</button>')+'</div></div>'}).join(""):'<p class="muted">Sin campaña fija.</p>')+'</section>'}).join("")+'</div>';
 $$(".dsc-ask").forEach(b=>b.onclick=()=>{const c=list.find(x=>x.id===b.dataset.camp);dsView.tab="peticiones";dsRender();dsForm(null,{title:dsCampTitle(c),company:c.company,notes:"Campaña del año · "+DS_MONTHS[c.month-1]+" "+b.dataset.y+(c.dates?" · "+c.dates:"")})});
 if($("#dscEdit"))$("#dscEdit").onclick=dsCampEdit}
function dsCampEdit(){const st=JSON.parse(JSON.stringify(DS.settings)),list=st.campaigns=st.campaigns||[];
 const draw=()=>{$("#dsBody").innerHTML='<section class="card"><div class="section-title"><div><small class="section-kicker">Fer y Celia</small><h2>Editar campañas del año</h2></div></div><div class="dsc-edit">'+
  list.map((c,i)=>'<div class="dsc-row"><select data-cm="'+i+'">'+DS_MONTHS.map((n,k)=>'<option value="'+(k+1)+'"'+(c.month===k+1?' selected':'')+'>'+n+'</option>').join("")+'</select><input data-cd="'+i+'" value="'+esc(c.dates)+'" placeholder="Fechas (14 San Valentín…)"><input data-cc="'+i+'" value="'+esc(c.creative)+'" placeholder="Creatividad"><select data-co="'+i+'">'+st.companies.map(x=>'<option'+(x.name===c.company?' selected':'')+'>'+esc(x.name)+'</option>').join("")+'</select><button type="button" class="ghost" data-crm="'+i+'">Quitar</button></div>').join("")+
  '</div><div class="actions-row" style="margin-top:12px"><button type="button" id="dscAdd">Añadir campaña</button><button type="button" class="primary" id="dscSave">Guardar</button><button type="button" class="ghost" id="dscBack">Volver</button></div></section>';
  $$("[data-cm]").forEach(x=>x.onchange=()=>list[x.dataset.cm].month=+x.value);$$("[data-cd]").forEach(x=>x.oninput=()=>list[x.dataset.cd].dates=x.value);$$("[data-cc]").forEach(x=>x.oninput=()=>list[x.dataset.cc].creative=x.value);$$("[data-co]").forEach(x=>x.onchange=()=>list[x.dataset.co].company=x.value);
  $$("[data-crm]").forEach(b=>b.onclick=()=>{list.splice(+b.dataset.crm,1);draw()});
  $("#dscAdd").onclick=()=>{list.push({id:"c"+Date.now().toString(36),month:+DS.today.slice(5,7),dates:"",creative:"",company:"ABONOTEATRO"});list.sort((a,b)=>a.month-b.month);draw()};
  $("#dscBack").onclick=()=>dsCampaigns();
  $("#dscSave").onclick=async()=>{try{const r=await api("/api/diseno?settings=1",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({settings:st})});DS.settings=r.settings;say("Campañas guardadas");dsCampaigns()}catch(e){say(e.message)}}};
 draw()}
// ---- Panel: lo mismo que la pestaña PANEL de la hoja, lo primero que se ve al entrar en Diseño
const dsInk=hex=>{const h=String(hex||"#888").replace("#",""),n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16),r=n>>16&255,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>150?"#161616":"#ffffff"};
function dsPanel(){const d=DS,st=d.settings,t=d.today,rows=d.rows,open=rows.filter(r=>DS_OPEN.includes(r.status)),late=r=>DS_OPEN.includes(r.status)&&r.deadline&&r.deadline<t,soon=r=>DS_OPEN.includes(r.status)&&r.deadline&&r.deadline>=t&&dsDays(t,r.deadline)<=st.soonDays;
 const avg=list=>list.length?Math.round(list.reduce((a,r)=>a+Number(r.progress||0),0)/list.length):null;
 if(!rows.length){$("#dsBody").innerHTML='<section class="dsp-empty"><h2>Aquí va la información de la hoja</h2><p>Todavía no se ha subido la hoja «ABONOTEATRO Y LA ESTACION». Cuando se suba, este panel muestra lo mismo que la pestaña PANEL: peticiones totales, abiertas, vencidas, por persona y por espacio, y todas las tareas pendientes y hechas.</p>'+(d.canSettings?'<div class="actions-row"><button type="button" class="primary" id="dspPick">Subir el Excel de la hoja</button><input type="file" id="dspFile" accept=".xlsx" hidden></div><p class="muted">En la hoja: Archivo › Descargar › Microsoft Excel (.xlsx). Lo que ya esté no se duplica.</p><div id="dsImp"></div>':'<p class="muted">Tienen que subirla Fernando o Celia.</p>')+'</section>'+dsCampTable();
  if($("#dspPick")){$("#dspPick").onclick=()=>$("#dspFile").click();$("#dspFile").onchange=async e=>{await dsImportFile(e.target.files[0]);const go=$("#dsImpGo");if(go){const prev=go.onclick;go.onclick=async()=>{await prev();dsRender()}}}}
  if($("#dstEdit"))$("#dstEdit").onclick=()=>{dsView.tab="campanas";dsRender();dsCampEdit()};return}
 const people=[...new Set([...st.people.map(p=>p.name),...rows.map(r=>r.requester).filter(Boolean)])].filter(n=>rows.some(r=>r.requester===n)||st.people.some(p=>p.name===n));
 const companies=[...new Set([...st.companies.map(c=>c.name),...rows.map(r=>r.company).filter(Boolean)])].filter(n=>rows.some(r=>r.company===n));
 const pct=(a,b)=>b?Math.round(100*a/b)+" %":"";
 if(rows.some(r=>!r.requester))people.push("");if(rows.some(r=>!r.company))companies.push("");
 const name=(color,n,key,val)=>n?'<th><button type="button" class="dsp-tag" data-dspgo="'+key+'" data-v="'+esc(val)+'" style="background:'+color+';color:'+dsInk(color)+'">'+esc(n)+'</button></th>':'<th><span class="dsp-tag" style="cursor:default;color:var(--muted)">Sin indicar</span></th>';
 const perRows=people.map(n=>{const l=rows.filter(r=>(r.requester||"")===n),e=l.filter(r=>r.status==="entregado").length;return [n,l.length,e,l.filter(r=>DS_OPEN.includes(r.status)).length,l.filter(late).length,l.filter(soon).length,pct(e,l.length)]}).sort((a,b)=>b[1]-a[1]);
 const coRows=companies.map(n=>{const l=rows.filter(r=>(r.company||"")===n),o=l.filter(r=>DS_OPEN.includes(r.status));return [n,l.length,l.filter(r=>r.status==="entregado").length,o.length,o.length?avg(o)+" %":""]}).sort((a,b)=>b[1]-a[1]);
 const sum=(list,i)=>list.reduce((a,r)=>a+r[i],0);
 const kpi=(v,l,c)=>'<div class="dsp-kpi'+(c?' '+c:'')+'"><span>'+l+'</span><b>'+v+'</b></div>';
 $("#dsBody").innerHTML='<section class="dsp"><div class="dsp-title"><h2>Panel de diseño · Abonoteatro y La Estación</h2><small>Actualizado: ahora</small></div>'+
  '<div class="dsp-kpis">'+kpi(rows.length,"Peticiones totales")+kpi(open.length,"Abiertas")+kpi(open.filter(late).length,"Vencidas",open.some(late)?"hot":"")+kpi((avg(open)??0)+" %","Avance medio")+'</div>'+
  '<div class="dsp-grid"><div><h3>Peticiones por persona</h3><div class="dsp-wrap"><table class="dsp-t"><thead><tr><th>Persona</th><th>Peticiones</th><th>Entregadas</th><th>Abiertas</th><th>Vencidas</th><th>Vencen en '+st.soonDays+' días</th><th>% entregado</th></tr></thead><tbody>'+
   perRows.map(r=>'<tr>'+name(dsColor(st.people,r[0]),r[0],"who",r[0])+r.slice(1).map((v,i)=>'<td'+(i===3&&v?' class="hot"':'')+'>'+v+'</td>').join("")+'</tr>').join("")+
   '<tr class="tot"><th>Total</th><td>'+sum(perRows,1)+'</td><td>'+sum(perRows,2)+'</td><td>'+sum(perRows,3)+'</td><td>'+sum(perRows,4)+'</td><td>'+sum(perRows,5)+'</td><td></td></tr></tbody></table></div></div>'+
  '<div><h3>Creatividades por espacio</h3><div class="dsp-wrap"><table class="dsp-t"><thead><tr><th>Espacio / empresa</th><th>Creatividades</th><th>Entregadas</th><th>Abiertas</th><th>Avance medio</th></tr></thead><tbody>'+
   coRows.map(r=>'<tr>'+name(dsColor(st.companies,r[0]),r[0],"company",r[0])+r.slice(1).map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")+
   '<tr class="tot"><th>Total</th><td>'+sum(coRows,1)+'</td><td>'+sum(coRows,2)+'</td><td>'+sum(coRows,3)+'</td><td></td></tr></tbody></table></div></div></div>'+
  '<div class="dsp-links"><button type="button" class="primary" data-dspgo="state" data-v="abiertas">Ver las '+open.length+' tareas pendientes</button><button type="button" data-dspgo="state" data-v="entregado">Ver las tareas hechas</button></div></section>'+dsCampTable();
 $$("[data-dspgo]").forEach(b=>b.onclick=()=>{const k=b.dataset.dspgo,v=b.dataset.v;Object.assign(dsView,{who:"",company:"",alert:"",q:"",state:"abiertas"});if(k==="who")dsView.who=v;else if(k==="company")dsView.company=v;else dsView.state=v;if(k!=="state")dsView.state="todas";dsView.tab="peticiones";dsRender();window.scrollTo({top:0,behavior:"smooth"})});
 if($("#dstEdit"))$("#dstEdit").onclick=()=>{dsView.tab="campanas";dsRender();dsCampEdit()}}
window.YCModules.diseno={render:async ctx=>{({api,esc,say,sayUndo,fdate,pageHead,$,$$,roles,state,VENUE_STYLE,loadXLSX,app}=ctx);await diseno()}};
})();
