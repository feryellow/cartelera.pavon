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
function canRoute(route){if(roles().includes("admin"))return true;if(route==="dashboard"||route==="calendario"||route==="carteleria"||route==="archivo")return true;if((route==="radio"||route==="publicidad"||route==="intercambiadores")&&roles().includes("gestion"))return true;return false}
function applyNav(){$$("[data-route]").forEach(a=>{const r=a.dataset.route;a.classList.toggle("active",r===state.route);a.classList.toggle("locked",!canRoute(r))});$("#accountName").textContent=state.actor?.email||""}
async function authenticate(){
 try{const d=await api("/api/me",{cache:"no-store"});state.actor=d.actor;gate.classList.add("hidden");applyNav();return true}
 catch{gate.classList.remove("hidden");return false}
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:$("#loginEmail").value,password:$("#loginPassword").value})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).error||"No se ha podido iniciar sesión")});if(await authenticate())route()}catch(err){$("#loginError").textContent=err.message}});
$("#keyForm").addEventListener("submit",async e=>{e.preventDefault();try{sessionStorage.setItem("pavon_edit_key",$("#legacyKey").value.trim())}catch{};if(await authenticate())route();else $("#loginError").textContent="Clave no válida"});
$("#logoutBtn").addEventListener("click",async()=>{try{await fetch("/api/logout",{method:"POST"})}catch{};try{sessionStorage.removeItem("pavon_edit_key")}catch{};state.actor=null;gate.classList.remove("hidden")});
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fdate(v){if(!v)return"—";try{return new Date(v+"T00:00:00").toLocaleDateString("es-ES")}catch{return v}}
function statusBadge(v){const s=(v||"activo").toLowerCase();return '<span class="badge '+(s==="activo"||s==="correcto"?"ok":s.includes("pend")?"warn":"")+'">'+esc(v||"activo")+"</span>"}
function pageHead(title,sub,actions=""){return '<div class="page-head"><div><h1>'+esc(title)+'</h1><p>'+esc(sub||"")+'</p></div><div class="actions-row">'+actions+"</div></div>"}
async function blobUrl(assetKey,moduleName){if(!assetKey)return null;if(state.assetUrls.has(assetKey))return state.assetUrls.get(assetKey);const r=await fetch("/api/asset?key="+encodeURIComponent(assetKey)+"&module="+moduleName,{headers:headers()});if(!r.ok)return null;const b=await r.blob(),u=URL.createObjectURL(b);state.assetUrls.set(assetKey,u);return u}
function routeName(){return (location.hash||"#dashboard").slice(1).split("?")[0]||"dashboard"}
async function route(){const q=new URLSearchParams(location.search);if(q.get("vista")){location.replace("/carteleria.html?vista="+encodeURIComponent(q.get("vista")));return}state.route=routeName();if(!canRoute(state.route))state.route="dashboard";applyNav();app.innerHTML='<div class="loading">Cargando…</div>';try{if(state.route==="dashboard")await dashboard();else if(state.route==="radio")await radio();else if(state.route==="publicidad")await publicidad(false);else if(state.route==="intercambiadores")await publicidad(true);else if(state.route==="calendario")await calendario();else if(state.route==="archivo")await archivo();else if(state.route==="admin")await admin();else await dashboard()}catch(e){app.innerHTML=pageHead("Error","")+ '<div class="card error">'+esc(e.message)+"</div>"}}
window.addEventListener("hashchange",route);

async function dashboard(){
 const d=await api("/api/control?module=dashboard");
 const all=(d.carteleria||[]).filter(x=>x.next);
 const today=new Date();today.setHours(0,0,0,0);
 const alerts=all.map(x=>{const dt=new Date(x.next+"T00:00:00");const days=Math.round((dt-today)/86400000);return {...x,days}}).filter(x=>x.days<=7).sort((a,b)=>a.days-b.days);
 const next=all.slice().sort((a,b)=>String(a.next).localeCompare(String(b.next))).slice(0,8);
 const alertHtml=alerts.length?alerts.slice(0,8).map(x=>{
   const label=x.days<0?"Vencido "+Math.abs(x.days)+" d":x.days===0?"HOY":"D-"+x.days;
   return '<div class="item"><div><h3>'+esc(x.key.replaceAll("__"," · ").replaceAll("_"," "))+'</h3><div class="item-meta"><span class="badge '+(x.days<0?"warn":"")+'">'+label+'</span><span>'+esc(x.next)+'</span></div></div></div>';
 }).join(""):'<div class="notice">No hay avisos de cartelería en los próximos 7 días.</div>';
 app.innerHTML=pageHead("Inicio","Estado operativo del Gran Teatro Pavón")+
 '<div class="grid stats">'+stat(alerts.length,"Avisos ≤ 7 días")+stat(d.radio?.active??"—","Radio activa")+stat(d.publicidad?.active??"—","Publicidad activa")+stat(d.publicidad?.intercambiadores??"—","Intercambiadores activos")+'</div>'+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Avisos y vencimientos</h2><a class="btn" href="#calendario">Ver calendario</a></div><div class="list">'+alertHtml+'</div>'+
 '<div class="section-title" style="margin-top:20px"><h2>Próximos cambios</h2></div><div class="list">'+
 (next.length?next.map(x=>'<div class="item"><div><h3>'+esc(x.key.replaceAll("__"," · ").replaceAll("_"," "))+'</h3><div class="item-meta"><span>'+esc(x.next)+'</span></div></div></div>').join(""):'<div class="notice">No hay fechas de cambio registradas.</div>')+
 '</div></section><section class="card"><div class="section-title"><h2>Últimas modificaciones</h2></div><div class="list">'+
 ((d.latest||[]).length?d.latest.map(a=>'<div class="item"><div><h3>'+esc(a.module)+" · "+esc(a.action)+'</h3><div class="item-meta"><span>'+esc(a.actor?.email||"")+'</span><span>'+new Date(a.at).toLocaleString("es-ES")+'</span></div></div></div>').join(""):'<div class="notice">Todavía no hay histórico.</div>')+
 '</div></section></div>';
}

function stat(value,label){return '<div class="card stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>'}

async function radio(){
 const d=await api("/api/control?module=radio");
 const rows=d.rows||[], active=rows.filter(r=>activeNow(r));
 app.innerHTML=pageHead("Radio","Campañas y cuñas en emisión",'<button id="newRadio" class="primary">Nueva campaña</button>')+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>EN EMISIÓN AHORA</h2><span class="badge ok">'+active.length+'</span></div><div id="radioList" class="list">'+radioItems(active)+'</div><div class="section-title" style="margin-top:20px"><h2>Todas las campañas</h2></div><div class="list">'+radioItems(rows)+'</div></section><section class="card" id="radioFormCard">'+radioForm()+'</section></div>';
 bindRadio(rows);
 await hydrateMedia("radio");
}
function activeNow(r){const t=new Date().toISOString().slice(0,10);return !r.deletedAt&&(r.status||"").toLowerCase()!=="finalizado"&&(!r.startDate||r.startDate<=t)&&(!r.endDate||r.endDate>=t)}
function radioItems(rows){return rows.length?rows.map(r=>'<div class="item" data-id="'+r.id+'"><div><h3>'+esc(r.spectacle||r.campaignName||"Campaña radio")+'</h3><div class="item-meta"><span>'+esc(r.station||"")+'</span><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span><span>'+esc(r.spotName||"")+'</span>'+statusBadge(r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="radio" data-kind="audio"></div></div><div class="item-actions"><button data-edit-radio="'+r.id+'">Editar</button><button class="danger" data-del-radio="'+r.id+'">Archivar</button></div></div>').join(""):'<div class="notice">No hay campañas registradas.</div>'}
function radioForm(r={}){return '<div class="section-title"><h2>'+(r.id?"Editar campaña":"Nueva campaña")+'</h2></div><form id="radioForm" class="form-grid">'+
 input("spectacle","Espectáculo",r.spectacle)+input("station","Emisora",r.station)+input("campaignName","Campaña",r.campaignName)+input("spotName","Nombre de la cuña",r.spotName)+
 input("duration","Duración",r.duration)+input("frequency","Frecuencia / pases",r.frequency)+input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+
 input("timeSlot","Franja horaria",r.timeSlot)+input("contact","Contacto",r.contact)+selectStatus(r.status)+
 '<label class="wide">Audio<input id="radioAsset" type="file" accept="audio/*"></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label>'+
 '<div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelRadio">Limpiar</button></div></form>'}
function input(name,label,value="",type="text"){return '<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value||"")+'"></label>'}
function selectStatus(v="activo"){return '<label>Estado<select name="status">'+["activo","pendiente","finalizado"].map(x=>'<option '+(x===v?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'}
function formObject(form){return Object.fromEntries(new FormData(form).entries())}
async function uploadAsset(file,moduleName,existing){if(!file)return existing||"";const k=crypto.randomUUID().replaceAll("-","");const r=await fetch("/api/asset?key="+k+"&module="+moduleName,{method:"PUT",headers:headers({"content-type":file.type||"application/octet-stream"}),body:file});if(!r.ok)throw new Error(await r.text());return k}
function bindRadio(rows){
 $("#newRadio").onclick=()=>{$("#radioFormCard").innerHTML=radioForm();bindRadioForm(null)};
 $$("[data-edit-radio]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editRadio);$("#radioFormCard").innerHTML=radioForm(r);bindRadioForm(r)});
 $$("[data-del-radio]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Archivar esta campaña?"))return;await api("/api/control?module=radio&id="+b.dataset.delRadio,{method:"DELETE"});say("Campaña archivada");radio()});
 bindRadioForm(null);
}
function bindRadioForm(existing){
 const f=$("#radioForm"); if(!f)return; $("#cancelRadio").onclick=()=>{$("#radioFormCard").innerHTML=radioForm();bindRadioForm(null)};
 f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#radioAsset")?.files?.[0];try{const assetKey=await uploadAsset(file,"radio",existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}if(existing?.id)await api("/api/control?module=radio&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module=radio",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});say("Radio guardada");radio()}catch(err){say(err.message)}}
}

async function publicidad(inter=false){
 const d=await api("/api/control?module=publicidad");
 let rows=d.rows||[];if(inter)rows=rows.filter(r=>(r.category||"").toLowerCase()==="intercambiador");
 const title=inter?"Intercambiadores":"Publicidad / Acuerdos";
 const filters='<div class="form-grid" style="margin-bottom:12px"><label>Buscar<input id="pubFilterQ" placeholder="Espectáculo, soporte, proveedor…"></label><label>Estado<select id="pubFilterStatus"><option value="">Todos</option><option value="active">Activas ahora</option><option value="finalizado">Finalizadas</option></select></label><label>Desde<input id="pubFilterFrom" type="date"></label><label>Hasta<input id="pubFilterTo" type="date"></label></div>';
 app.innerHTML=pageHead(title,inter?"Campañas activas en intercambiadores y pantallas":"Campañas, acuerdos y soportes publicitarios",'<button id="newPub" class="primary">Nueva campaña</button>')+
 '<div class="grid two-col"><section class="card"><div class="section-title"><h2>Registros</h2><span id="pubCount" class="badge ok">'+rows.filter(activeNow).length+' activas</span></div>'+filters+'<div id="pubList" class="list">'+pubItems(rows)+'</div></section><section class="card" id="pubFormCard">'+pubForm(inter?{category:"intercambiador"}:{})+'</section></div>';
 bindPub(rows,inter);
 const apply=()=>{
   const q=($("#pubFilterQ").value||"").toLowerCase().trim(),status=$("#pubFilterStatus").value,from=$("#pubFilterFrom").value,to=$("#pubFilterTo").value;
   const filtered=rows.filter(r=>{
     if(q && !JSON.stringify(r).toLowerCase().includes(q))return false;
     if(status==="active"&&!activeNow(r))return false;
     if(status==="finalizado"&&(r.status||"").toLowerCase()!=="finalizado"&&!r.deletedAt)return false;
     if(from&&r.endDate&&r.endDate<from)return false;
     if(to&&r.startDate&&r.startDate>to)return false;
     return true;
   });
   $("#pubList").innerHTML=pubItems(filtered);$("#pubCount").textContent=filtered.length+" visibles";
   bindPubRows(filtered,inter);hydrateMedia("publicidad");
 };
 ["#pubFilterQ","#pubFilterStatus","#pubFilterFrom","#pubFilterTo"].forEach(s=>$(s).addEventListener("input",apply));
 await hydrateMedia("publicidad");
}

function pubItems(rows){return rows.length?rows.map(r=>'<div class="item"><div><h3>'+esc(r.spectacle||"Campaña")+'</h3><div class="item-meta"><span>'+esc(r.category||"publicidad")+'</span><span>'+esc(r.location||r.support||"")+'</span><span>'+esc(r.provider||"")+'</span><span>'+fdate(r.startDate)+' → '+fdate(r.endDate)+'</span>'+statusBadge(r.status)+'</div><div class="media-preview" data-asset="'+esc(r.assetKey||"")+'" data-module="publicidad" data-kind="image"></div></div><div class="item-actions"><button data-edit-pub="'+r.id+'">Editar</button><button class="danger" data-del-pub="'+r.id+'">Archivar</button></div></div>').join(""):'<div class="notice">No hay campañas registradas.</div>'}
function pubForm(r={}){return '<div class="section-title"><h2>'+(r.id?"Editar campaña":"Nueva campaña")+'</h2></div><form id="pubForm" class="form-grid">'+
 input("spectacle","Espectáculo / campaña",r.spectacle)+input("category","Tipo",r.category||"intercambiador")+input("support","Soporte / formato",r.support)+input("location","Ubicación / intercambiador",r.location)+input("provider","Proveedor / medio",r.provider)+input("format","Pieza / formato",r.format)+input("startDate","Inicio",r.startDate,"date")+input("endDate","Fin",r.endDate,"date")+input("contact","Contacto",r.contact)+selectStatus(r.status)+
 '<label class="wide">Creatividad<input id="pubAsset" type="file" accept="image/*,application/pdf"></label><label class="wide">Condiciones / acuerdo<textarea name="agreement">'+esc(r.agreement||"")+'</textarea></label><label class="wide">Observaciones<textarea name="notes">'+esc(r.notes||"")+'</textarea></label>'+
 '<div class="wide actions-row"><button class="primary" type="submit">Guardar</button><button type="button" id="cancelPub">Limpiar</button></div></form>'}
function bindPubRows(rows,inter){
 $("[data-edit-pub]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.editPub);if(!r)return;$("#pubFormCard").innerHTML=pubForm(r);bindPubForm(r,inter)});
 $("[data-del-pub]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Archivar esta campaña?"))return;await api("/api/control?module=publicidad&id="+b.dataset.delPub,{method:"DELETE"});say("Campaña archivada");publicidad(inter)});
}
function bindPub(rows,inter){
 $("#newPub").onclick=()=>{$("#pubFormCard").innerHTML=pubForm(inter?{category:"intercambiador"}:{});bindPubForm(null,inter)};
 bindPubRows(rows,inter);
 bindPubForm(null,inter);
}
function bindPubForm(existing,inter){
 const f=$("#pubForm");if(!f)return;$("#cancelPub").onclick=()=>{$("#pubFormCard").innerHTML=pubForm(inter?{category:"intercambiador"}:{});bindPubForm(null,inter)};
 f.onsubmit=async e=>{e.preventDefault();const data=formObject(f),file=$("#pubAsset")?.files?.[0];try{const assetKey=await uploadAsset(file,"publicidad",existing?.assetKey);if(assetKey){data.assetKey=assetKey;data.assetName=file?.name||existing?.assetName||""}if(existing?.id)await api("/api/control?module=publicidad&id="+existing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});else await api("/api/control?module=publicidad",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});say("Publicidad guardada");publicidad(inter)}catch(err){say(err.message)}}
}
async function hydrateMedia(moduleName){for(const el of $$('[data-module="'+moduleName+'"][data-asset]')){const k=el.dataset.asset;if(!k)continue;const u=await blobUrl(k,moduleName);if(!u)continue;if(el.dataset.kind==="audio")el.innerHTML='<audio controls preload="none" src="'+u+'"></audio>';else el.innerHTML='<img src="'+u+'" alt="Creatividad">' }}

async function archivo(){
 const auditP=api("/api/control?module=audit&limit=250");
 let radioP=Promise.resolve({rows:[]}),pubP=Promise.resolve({rows:[]});
 if(roles().includes("admin")||roles().includes("gestion")){
   radioP=api("/api/control?module=radio&includeDeleted=1");
   pubP=api("/api/control?module=publicidad&includeDeleted=1");
 }
 const [d,rd,pd]=await Promise.all([auditP,radioP,pubP]);
 const finishedRadio=(rd.rows||[]).filter(r=>r.deletedAt||(r.status||"").toLowerCase()==="finalizado");
 const finishedPub=(pd.rows||[]).filter(r=>r.deletedAt||(r.status||"").toLowerCase()==="finalizado");
 const finished=[...finishedRadio.map(r=>({module:"Radio",title:r.spectacle||r.campaignName||"Campaña",place:r.station||"",from:r.startDate,to:r.endDate})),...finishedPub.map(r=>({module:(r.category||"").toLowerCase()==="intercambiador"?"Intercambiadores":"Publicidad",title:r.spectacle||"Campaña",place:r.location||r.support||"",from:r.startDate,to:r.endDate}))];
 app.innerHTML=pageHead("Archivo / Histórico","Cambios y campañas finalizadas")+
 (finished.length?'<section class="card" style="margin-bottom:14px"><div class="section-title"><h2>Campañas finalizadas / archivadas</h2><span class="badge">'+finished.length+'</span></div><div class="list">'+finished.map(r=>'<div class="item"><div><h3>'+esc(r.module)+' · '+esc(r.title)+'</h3><div class="item-meta"><span>'+esc(r.place)+'</span><span>'+fdate(r.from)+' → '+fdate(r.to)+'</span></div></div></div>').join("")+'</div></section>':'')+
 '<div class="card"><div class="section-title"><h2>Auditoría</h2></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Módulo</th><th>Acción</th><th>Elemento</th><th>Usuario</th></tr></thead><tbody>'+
 (d.rows||[]).map(r=>'<tr><td>'+new Date(r.at).toLocaleString("es-ES")+'</td><td>'+esc(r.module)+'</td><td>'+esc(r.action)+'</td><td>'+esc(r.elementId||"")+'</td><td>'+esc(r.actor?.email||"")+'</td></tr>').join("")+
 '</tbody></table></div></div>';
}

let calCursor=new Date();
async function calendario(){
 const d=await api("/api/calendar-data");
 const events=d.events||[];renderCalendar(events);
}
function renderCalendar(events){
 const y=calCursor.getFullYear(),m=calCursor.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7;
 const month=calCursor.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
 let cells='<div class="weekday">Lunes</div><div class="weekday">Martes</div><div class="weekday">Miércoles</div><div class="weekday">Jueves</div><div class="weekday">Viernes</div><div class="weekday">Sábado</div><div class="weekday">Domingo</div>';
 for(let i=0;i<offset;i++)cells+='<div class="day empty"></div>';
 for(let d=1;d<=days;d++){const iso=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"),ev=events.filter(e=>e.date===iso);cells+='<div class="day '+(ev.length?"has-events":"")+'"><div class="day-number">'+d+'</div>'+ev.map(e=>'<div class="event"><strong>'+esc(e.module)+' · '+esc(e.title)+'</strong><span>'+esc(e.action)+' · '+esc(e.location||"")+'</span><span>'+esc(e.status||"")+'</span></div>').join("")+"</div>"}
 app.innerHTML=pageHead("Calendario","Se alimenta automáticamente de cartelería, radio y publicidad")+'<div class="card"><div class="calendar-toolbar"><button id="prevMonth">‹</button><strong>'+esc(month)+'</strong><button id="nextMonth">›</button></div><div class="calendar-grid">'+cells+"</div></div>";
 $("#prevMonth").onclick=()=>{calCursor=new Date(y,m-1,1);calendario()};$("#nextMonth").onclick=()=>{calCursor=new Date(y,m+1,1);calendario()};
}

async function admin(){
 if(!roles().includes("admin"))throw new Error("Acceso reservado a administración");
 let d;try{d=await api("/api/admin-users")}catch(e){app.innerHTML=pageHead("Usuarios","Administración de accesos")+'<div class="card notice">Netlify Identity todavía no está habilitado para este proyecto. El código de roles ya está preparado, pero la gestión de usuarios queda bloqueada hasta activar Identity en Netlify.</div>';return}
 const users=d.users||[];
 app.innerHTML=pageHead("Usuarios","Roles y permisos reales")+'<div class="grid two-col"><section class="card"><div class="section-title"><h2>Usuarios</h2></div><div class="list">'+users.map(u=>'<div class="item"><div><h3>'+esc(u.email)+'</h3><div class="item-meta"><span>'+esc((u.roles||[]).join(", ")||"sin rol")+'</span>'+statusBadge(u.disabled?"desactivado":"activo")+'</div></div><div class="item-actions"><select data-role-id="'+u.id+'">'+["admin","gestion","carteleria","consulta"].map(r=>'<option '+((u.roles||[]).includes(r)?"selected":"")+'>'+r+'</option>').join("")+'</select><button data-save-role="'+u.id+'">Guardar rol</button><button data-toggle-user="'+u.id+'" data-disabled="'+(u.disabled?"1":"0")+'">'+(u.disabled?"Activar":"Desactivar")+'</button></div></div>').join("")+'</div></section><section class="card"><div class="section-title"><h2>Crear usuario</h2></div><form id="newUserForm" class="stack"><label>Email<input name="email" type="email" required></label><label>Rol<select name="role"><option>carteleria</option><option>gestion</option><option>consulta</option><option>admin</option></select></label><button class="primary">Crear y enviar recuperación de contraseña</button></form></section></div>';
 $$("[data-save-role]").forEach(b=>b.onclick=async()=>{const id=b.dataset.saveRole,role=$('[data-role-id="'+id+'"]').value;await api("/api/admin-users",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id,role})});say("Rol actualizado");admin()});
 $$("[data-toggle-user]").forEach(b=>b.onclick=async()=>{await api("/api/admin-users",{method:b.dataset.disabled==="1"?"PATCH":"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id:b.dataset.toggleUser})});say("Acceso actualizado");admin()});
 $("#newUserForm").onsubmit=async e=>{e.preventDefault();const v=formObject(e.currentTarget);await api("/api/admin-users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(v)});say("Usuario creado");admin()};
}

(async()=>{if(await authenticate())route();if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})})();
})();