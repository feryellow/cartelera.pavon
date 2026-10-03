// ===================== META · INVERSIÓN Y RESULTADOS (fase 1: solo lectura) =====================
// Organizado por espectáculo, no por campaña. Los datos llegan importando la exportación del
// Administrador de anuncios; Yellow Control no edita nada en Meta («Abrir en Meta» para intervenir).
(function(){
let api,esc,pageHead,say,app,$,$$;
const M={month:"",view:"resumen",data:null,demo:false,open:null,pending:null,platform:"",gview:"resumen",g:null};
const eur=(n,d=0)=>(Number(n)||0).toLocaleString("es-ES",{minimumFractionDigits:d,maximumFractionDigits:d})+" €";
const int=n=>Math.round(Number(n)||0).toLocaleString("es-ES");
const dec=(n,d=2)=>(Number(n)||0).toLocaleString("es-ES",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(n,d=1)=>(Number(n)||0).toLocaleString("es-ES",{minimumFractionDigits:d,maximumFractionDigits:d})+" %";
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
const numv=v=>{if(v==null||v==="")return 0;if(typeof v==="number")return v;let s=String(v).replace(/[€\s%]/g,"");if(s.includes(",")&&s.includes("."))s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else if(s.includes(","))s=s.replace(",",".");const x=Number(s);return Number.isFinite(x)?x:0};
const monthLabel=m=>{const t=new Date(m+"-01T12:00:00").toLocaleDateString("es-ES",{month:"long",year:"numeric"});return t.charAt(0).toUpperCase()+t.slice(1)};
const fday=s=>new Date(s+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"});
const VENUE_RX=[[/principe|gtpp|estacion/,"Príncipe Pío"],[/pavon/,"Pavón"],[/serrano/,"Serrano"],[/arlequin/,"Arlequín"],[/pedraza/,"Pedraza"],[/abono|abt/,"Abonoteatro"],[/soho/,"Soho City"]];
const PHASES=["Prospección","Templado","Retargeting","Otros"];

// --- Nombres de campaña → espectáculo, teatro y fase. Norma: ESPECTÁCULO | TEATRO | FASE | FORMATO
// Palabras de objetivo o de servicio que no son el espectáculo
const OBJ=/^(video|videos|carrusel|carru|imagen|imagenes|cartel|story|storie|stories|reel|reels|post|rtgt|retargeting|prospe|prospeccion|templado|\d+:\d+|trafico|ventas|venta|reconocimiento|alcance|interaccion|interacciones|conversiones|conversion|clientes potenciales|leads|mensajes|visualizaciones|reproducciones|promocion|prueba|borrador no usar|borrador|copia|traffic|sales|awareness|engagement|reach)$/;
const BRANDS=[[/^abono ?teatro|^abt\b/,"ABONOTEATRO"],[/^soho city/,"SOHO CITY"],[/^(gran teatro )?pavon/,"GRAN TEATRO PAVÓN"],[/^(gran teatro )?(caixabank )?principe pio/,"PRÍNCIPE PÍO"],[/^(gran )?teatro serrano/,"TEATRO SERRANO"],[/^(gran )?castillo de pedraza/,"CASTILLO DE PEDRAZA"]];
function guessShow(name){let t=String(name||"").replace(/\b\d{1,2}:\d{1,2}\b/g," ").replace(/\[[^\]]*\]/g," ").replace(/\((copia|copy)\)/ig," ").replace(/\s+-\s+copia\b/ig," ").replace(/^\s*promoci[oó]n de\s+/i,"").replace(/\n.*/s,"");
 const parts=t.split(/\s*[|·:]\s*|\s+-\s+|\s*_\s*/).map(x=>x.trim()).filter(x=>x&&!OBJ.test(norm(x))&&!/^[\d.,]+ ?€$|^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b.*\d{4}$/i.test(x)&&!/^(prueba|borrador)\b/i.test(x)).map(x=>x.replace(/\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)[a-z]*\.?\s+\d{4}$/i,"").trim());
 let show=(parts[0]||t).trim();const n=norm(show);const b=BRANDS.find(([rx])=>rx.test(n));if(b)show=b[1];
 return (parts.length?show:"Sin asignar").toUpperCase()}
function parseName(r){const all=norm([r.campaign,r.adset,r.ad].join(" "));
 const key=r.campaign||r.ad,show=(M.data&&M.data.map&&M.data.map[key])||guessShow(key);
 const venue=(VENUE_RX.find(([rx])=>rx.test(all))||[])[1]||"";
 const ph=norm(r.adset+" "+r.campaign+" "+r.ad);
 const phase=/prospe|frio|\btof\b|alcance|captac/.test(ph)?"Prospección":/templ|tibio|\bmof\b|interes/.test(ph)?"Templado":/retarg|remarket|caliente|\bbof\b|rmk|rtgt/.test(ph)?"Retargeting":"Otros";
 return {show,venue,phase}}

const RESULT={"actions:omni_landing_page_view":"visitas a la página de destino","actions:landing_page_view":"visitas a la página de destino","actions:like":"me gusta de la página","total_profile_visits":"visitas al perfil","reach":"personas alcanzadas","actions:link_click":"clics en el enlace","link_click":"clics en el enlace","actions:offsite_conversion.fb_pixel_purchase":"compras","actions:omni_purchase":"compras","video_thruplay_watched_actions":"reproducciones de vídeo","actions:video_view":"reproducciones de vídeo","actions:onsite_conversion.messaging_conversation_started_7d":"conversaciones iniciadas","actions:lead":"clientes potenciales"};
const resLabel=t=>RESULT[t]||(t?t.replace(/^actions:/,"").replace(/_/g," "):"resultados");
const isPeriod=rows=>rows.some(r=>r.dateEnd);
const lastOf=rows=>rows.reduce((a,r)=>(r.dateEnd||r.date)>a?(r.dateEnd||r.date):a,"");
function agg(rows){const t={spend:0,impressions:0,reach:0,clicks:0,lpv:0,checkouts:0,purchases:0,value:0,results:0};for(const r of rows)for(const k in t)t[k]+=Number(r[k])||0;
 t.cpa=t.purchases?t.spend/t.purchases:0;t.roas=t.spend?t.value/t.spend:0;t.ctr=t.impressions?t.clicks/t.impressions*100:0;t.cpc=t.clicks?t.spend/t.clicks:0;t.freq=t.reach?t.impressions/t.reach:0;t.cpm=t.impressions?t.spend/t.impressions*1000:0;t.cplpv=t.lpv?t.spend/t.lpv:0;return t}
const group=(rows,key)=>{const m=new Map();for(const r of rows){const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}return m};

// --- Lectura de la exportación (CSV o Excel, en español o inglés)
const COLS={
 date:["dia","day","fecha","inicio del informe","reporting starts"],
 dateEnd:["fin del informe","reporting ends"],
 status:["entrega de la campana","campaign delivery","entrega del conjunto de anuncios","entrega"],
 results:["resultados","results"],
 resultType:["indicador de resultado","result indicator"],
 budget:["presupuesto del conjunto de anuncios","presupuesto de la campana","ad set budget","campaign budget"],
 budgetType:["tipo de presupuesto del conjunto de anuncios","tipo de presupuesto de la campana","ad set budget type","campaign budget type"],
 end:["fin","ends"],
 campaign:["nombre de la campana","campaign name","campana"],
 adset:["nombre del conjunto de anuncios","ad set name","conjunto de anuncios"],
 ad:["nombre del anuncio","ad name","anuncio"],
 campaignId:["identificador de la campana","campaign id"],
 adId:["identificador del anuncio","ad id"],
 spend:["importe gastado","amount spent","gasto"],
 impressions:["impresiones","impressions"],
 reach:["alcance","reach"],
 clicks:["clics en el enlace","link clicks"],
 lpv:["visitas a la pagina de destino","landing page views"],
 checkouts:["pagos iniciados","checkouts initiated"],
 purchases:["compras","purchases","resultados de compras"],
 value:["valor de conversion de compras","purchases conversion value","valor de conversion de las compras"]};
const BAD=/coste|costo|cost per|por compra|roas|tasa|rate|unico|unique|% /;
function mapHeader(h){const idx={};const H=h.map(norm);
 for(const [k,names] of Object.entries(COLS)){let best=-1;
  for(const n of names){const i=H.findIndex((x,j)=>!Object.values(idx).includes(j)&&(x===n||(!["results","end"].includes(k)&&(x.startsWith(n+" (")||x.startsWith(n+" ["))))&&!(k!=="value"&&BAD.test(x)));if(i>=0){best=i;break}}
  if(best<0&&!["end","results","resultType","date","dateEnd"].includes(k))for(const n of names){const i=H.findIndex((x,j)=>!Object.values(idx).includes(j)&&x.startsWith(n)&&!BAD.test(x)&&!(k==="purchases"&&/valor|value/.test(x)));if(i>=0){best=i;break}}
  if(best>=0)idx[k]=best}
 return idx}
function toDate(v){if(v==null||v==="")return "";if(typeof v==="number"){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10)}
 const s=String(v).trim();let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(m)return m[1]+"-"+m[2]+"-"+m[3];m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");return ""}
function loadXLSX(){return window.XLSX?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement("script");s.src="/vendor/xlsx.mini.min.js";s.onload=res;s.onerror=()=>rej(new Error("No se ha podido cargar el lector de Excel"));document.head.appendChild(s)})}
async function readExport(file){await loadXLSX();const buf=await file.arrayBuffer(),isText=/\.csv$|\.txt$/i.test(file.name);
 // CSV: se lee como texto UTF-8 y sin interpretar números (Meta usa coma decimal: «9,85»)
 let wb;if(isText){let txt=new TextDecoder("utf-8").decode(buf);if(txt.includes("\ufffd"))txt=new TextDecoder("windows-1252").decode(buf);wb=XLSX.read(txt.replace(/^\ufeff/,""),{type:"string",raw:true})}else wb=XLSX.read(buf,{type:"array",cellDates:false});
 const ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
 let hr=rows.findIndex(r=>(r||[]).some(c=>/nombre de la campa|campaign name|nombre del anuncio|ad name/i.test(norm(c))));if(hr<0)throw new Error("No encuentro la fila de cabeceras (nombre de la campaña o del anuncio).");
 const idx=mapHeader(rows[hr]||[]),missing=["date","spend"].filter(k=>idx[k]==null);
 if(missing.length)throw new Error("Faltan columnas: "+missing.map(k=>({date:"Día o Inicio del informe",spend:"Importe gastado"})[k]).join(", ")+".");
 // Sin columna «Día»: es un total del periodo (inicio → fin del informe), no datos diarios
 const H=(rows[hr]||[]).map(norm),hasDay=H.some(x=>x==="dia"||x==="day");
 const out=[];let totals=null;for(const r of rows.slice(hr+1)){if(!r||!r.some(c=>c!=null&&c!==""))continue;const g=k=>idx[k]==null?null:r[idx[k]];
  const date=toDate(g("date"));if(!date)continue;const row={date,campaign:String(g("campaign")??"").replace(/\s+/g," ").trim(),adset:String(g("adset")??"").trim(),ad:String(g("ad")??"").replace(/\s+/g," ").trim(),campaignId:String(g("campaignId")??"").trim(),adId:String(g("adId")??"").trim()};
  for(const k of ["spend","impressions","reach","clicks","lpv","checkouts","purchases","value","results","budget"])row[k]=numv(g(k));
  const de=toDate(g("dateEnd"));if(!hasDay&&de&&de!==date){row.dateEnd=de;const mid=new Date((new Date(date+"T12:00:00").getTime()+new Date(de+"T12:00:00").getTime())/2);row.month=mid.toISOString().slice(0,7)}
  row.status=String(g("status")??"").trim();row.resultType=String(g("resultType")??"").trim();row.budgetType=String(g("budgetType")??"").trim();const en=toDate(g("end"));row.end=en&&en>"2000"?en:"";
  if(!row.purchases&&/purchase/.test(row.resultType))row.purchases=row.results;
  if(!row.campaign&&!row.ad){if(row.spend>0&&!totals)totals={reach:row.reach,impressions:row.impressions,spend:row.spend,date:row.date,dateEnd:row.dateEnd||"",month:row.month||""};continue}out.push(row)}
 const found=Object.keys(idx).filter(k=>!["campaignId","adId"].includes(k));
 const period=out.some(x=>x.dateEnd);if(!period&&totals){delete totals.dateEnd}
 const OPT=["campaignId","adId","adset","ad","dateEnd","status","results","resultType","budget","budgetType","end"];
 const LBL={campaign:"Nombre de la campaña",impressions:"Impresiones",reach:"Alcance",clicks:"Clics en el enlace",lpv:"Visitas a la página de destino",checkouts:"Pagos iniciados",purchases:"Compras",value:"Valor de conversión de compras"};
 return {rows:out,totals,found,period,labels:LBL,missing:Object.keys(COLS).filter(k=>idx[k]==null&&!OPT.includes(k))}}

// --- Datos de ejemplo (solo para ver la pantalla; no se guardan)
function demoRows(month){const out=[],y=+month.slice(0,4),mo=+month.slice(5,7),days=new Date(y,mo,0).getDate(),lim=Math.min(days,18);
 const C=[["PEGADOS | PAVON | PROSPECCION | VIDEO","Prospección vídeo","Vídeo PEGADOS",11,0.9,1.9],["PEGADOS | PAVON | PROSPECCION | CARTEL","Prospección cartel","Cartel A",7,0.6,1.6],["PEGADOS | PAVON | RETARGETING","Retargeting","Cartel B",5,0.25,1.1],
  ["WWRY | PRINCIPE PIO | TEMPLADO","Templado vídeo+imagen","Vídeo WWRY",14,1.2,2.3],["WWRY | PRINCIPE PIO | RETARGETING","Retargeting","Cartel WWRY",6,0.7,3.1],["101 DALMATAS | PRINCIPE PIO | PROSPECCION","Prospección","Vídeo 101 Dálmatas",12,0.8,1.5],["LOCURAS PARALELAS | PAVON | PROSPECCION","Prospección","Vídeo Locuras",28,0.15,0.6]];
 let seed=7;const rnd=()=>(seed=(seed*9301+49297)%233280)/233280;
 for(let d=1;d<=lim;d++){const date=month+"-"+String(d).padStart(2,"0");for(const [c,as,ad,sp,pr,vr] of C){const spend=sp*(0.8+rnd()*0.4),imp=spend*(180+rnd()*60),reach=imp/(1.4+d*0.12*(c.startsWith("WWRY")?1.6:1)),clicks=imp*(0.012+rnd()*0.006),purchases=Math.round(spend*pr/8*(0.6+rnd()*0.9)*(c.startsWith("LOCURAS")&&d>lim-3?0:1));
  out.push({date,campaign:c,adset:as,ad,spend:+spend.toFixed(2),impressions:Math.round(imp),reach:Math.round(reach),clicks:Math.round(clicks),lpv:Math.round(clicks*0.7),checkouts:Math.round(purchases*2.2),purchases,value:+(purchases*42*vr/1.9).toFixed(2)})}}
 return out}

// --- Avisos (fase 1: con lo que hay en el mes; las comparativas 7/30 días llegan con el histórico)
const DEMO_BUDGETS={"PEGADOS":2000,"WWRY":1500,"101 DALMATAS":260};
const budgetsNow=()=>M.demo?DEMO_BUDGETS:(M.data.budgets||{});
function alerts(rows,budgets){const out=[],shows=group(rows,r=>r._show),last=lastOf(rows),per=isPeriod(rows);if(!last)return out;
 // Presupuesto total de campaña (Meta) consumido
 for(const [c,cl] of group(rows,r=>r.campaign)){const x=cl[0],sp=agg(cl).spend;if(x.budget>0&&/toda la campa|lifetime/i.test(x.budgetType)&&sp/x.budget>=0.8)out.push({lvl:"warn",show:x._show,text:esc(c)+" · ha gastado el "+pct(sp/x.budget*100,0)+" de su presupuesto total ("+eur(x.budget)+")"+(x.end?"; termina el "+fday(x.end):"")+"."})}
 const y=+M.month.slice(0,4),mo=+M.month.slice(5,7),dim=new Date(y,mo,0).getDate(),left=Math.max(0,dim-+last.slice(8,10));
 const prev2=new Date(last+"T12:00:00");prev2.setDate(prev2.getDate()-1);const d2=prev2.toISOString().slice(0,10);
 const totAll=agg(rows);
 for(const [s,list] of shows){const t=agg(list),b=Number(budgets[s])||0;
  if(b&&t.spend/b>=0.8&&left>3)out.push({lvl:"warn",show:s,text:"Presupuesto consumido al "+pct(t.spend/b*100,0)+" y quedan "+left+" días del mes."});
  const r2=agg(list.filter(r=>r.date>=d2));if(!per&&totAll.purchases&&r2.spend>=50&&r2.purchases===0)out.push({lvl:"warn",show:s,text:"0 compras en los dos últimos días con "+eur(r2.spend)+" invertidos."});
  for(const [ad,al] of group(list,r=>r.ad||r.adset||r.campaign)){const a=agg(al);if(a.freq>=4&&a.impressions>2000)out.push({lvl:"info",show:s,text:esc(ad)+" · frecuencia "+dec(a.freq,1)+" → posible fatiga creativa."});
   const sa=agg(list);if(a.purchases>=2&&sa.cpa&&a.cpa>=sa.cpa*2)out.push({lvl:"warn",show:s,text:esc(ad)+" · CPA "+dec(a.cpa/sa.cpa,1).replace(/,0$/,"")+"× superior a la media del espectáculo."})}}
 if(totAll.spend&&!totAll.purchases)out.push({lvl:"info",show:"",text:"Sin compras en estos datos: las campañas con gasto son de tráfico o interacción, o la exportación no incluye la columna «Compras». Ingresos y ROAS aparecerán con campañas de ventas y el píxel de compra."});
 return out}

// --- Pantalla
async function load(){M.demo=false;const d=await api("/api/meta"+(M.month?"?month="+M.month:""),{cache:"no-store"});M.data=d;M.month=d.month;
 try{M.g=await api("/api/google-ads?month="+M.month,{cache:"no-store"})}catch{M.g=null}
 if(!M.platform)M.platform=M.g&&M.g.connected?"total":"meta"}
function prepared(){const rows=(M.demo?demoRows(M.month):M.data.rows).map(r=>{const p=parseName(r);return {...r,_show:p.show,_venue:p.venue,_phase:p.phase}});return rows}
const adsUrl=(extra="")=>"https://adsmanager.facebook.com/adsmanager/manage/campaigns?act="+encodeURIComponent(M.data.account)+extra;

function kpis(t,rows){const sales=t.purchases>0||t.value>0,byAd=!rows.some(r=>r.campaign),camp=new Set(rows.filter(r=>r.spend>0).map(r=>byAd?r.ad:r.campaign)).size;
 if(!sales)return '<div class="mt-kpis">'+[["Inversión",eur(t.spend,2)],["Visitas a destino",int(t.lpv)],["Clics en el enlace",int(t.clicks)],["Coste por visita",t.lpv?eur(t.cplpv,2):"—"]].map(([k,v])=>'<div class="mt-kpi"><em>'+k+'</em><b>'+v+'</b></div>').join("")+'</div>'+
  '<div class="mt-sec">'+[[byAd?"Anuncios con gasto":"Campañas con gasto",int(camp)],["Alcance*",int(t.reach)],["Impresiones",int(t.impressions)],["Frecuencia*",t.reach?dec(t.freq):"—"],["CTR",t.impressions?pct(t.ctr,2):"—"],["CPC",t.clicks?eur(t.cpc,2):"—"],["CPM",t.impressions?eur(t.cpm,2):"—"],["Compras",int(t.purchases)]].map(([k,v])=>'<span><em>'+k+'</em><b>'+v+'</b></span>').join("")+'</div>';
 return '<div class="mt-kpis">'+[["Inversión mes",eur(t.spend)],["Compras",int(t.purchases)],["Ingresos atribuidos",eur(t.value)],["ROAS",t.spend?dec(t.roas):"—"]].map(([k,v])=>'<div class="mt-kpi"><em>'+k+'</em><b>'+v+'</b></div>').join("")+'</div>'+
 '<div class="mt-sec">'+[["CPA",t.purchases?eur(t.cpa,2):"—"],["Alcance*",int(t.reach)],["Impresiones",int(t.impressions)],["Frecuencia*",t.reach?dec(t.freq):"—"],["CTR",t.impressions?pct(t.ctr,2):"—"],["CPC",t.clicks?eur(t.cpc,2):"—"],["Visitas a destino",int(t.lpv)],["Inicios de compra",int(t.checkouts)]].map(([k,v])=>'<span><em>'+k+'</em><b>'+v+'</b></span>').join("")+'</div>'}

function campaignRows(l,shows){const cs=[...group(l,r=>r.campaign)].map(([c,cl])=>({c,cl,t:agg(cl),x:cl[0]})).sort((a,b)=>b.t.spend-a.t.spend);
 return '<div class="mt-camps">'+cs.map(({c,t,x})=>{const on=x.status==="active",life=/toda la campa|lifetime/i.test(x.budgetType),daily=/diario|daily/i.test(x.budgetType);
  return '<div class="mt-camp"><div class="mt-camp-h"><b>'+esc(c)+'</b><span class="badge '+(on?"ok":"")+'">'+(on?"Activa":x.status?({inactive:"Inactiva",archived:"Archivada",not_delivering:"Sin entrega",permanently_deleted:"Eliminada",paused:"Pausada"}[x.status]||esc(x.status)):"—")+'</span></div>'+
   '<div class="mt-camp-n"><span>'+eur(t.spend,2)+'</span>'+(t.results?'<span>'+int(t.results)+' '+esc(resLabel(x.resultType))+' · '+eur(t.spend/t.results,2)+' c/u</span>':'')+(t.lpv&&!/landing_page_view/.test(x.resultType)?'<span>'+int(t.lpv)+' visitas a destino</span>':'')+'<span>CTR '+(t.impressions?pct(t.ctr,2):"—")+'</span>'+(x.budget>0?'<span>Presupuesto '+eur(x.budget)+(life?' total'+(t.spend?' · '+pct(t.spend/x.budget*100,0):''):daily?' al día':'')+'</span>':'')+(x.end?'<span>Termina el '+fday(x.end)+'</span>':'')+'</div>'+
   (M.demo?'':'<label class="mt-assign">Espectáculo <input list="mtShows" value="'+esc(x._show)+'" data-assign="'+esc(c)+'"></label>')+'</div>'}).join("")+'</div>'}
function showCards(rows){const budgets=budgetsNow(),last=lastOf(rows),byCampaign=!rows.some(r=>r.ad||r.adset);
 const list=[...group(rows,r=>r._show)].map(([s,l])=>({s,l,t:agg(l)})).sort((a,b)=>b.t.spend-a.t.spend);
 return '<div class="mt-shows">'+list.map(({s,l,t})=>{const b=Number(budgets[s])||0,venue=[...new Set(l.map(r=>r._venue).filter(v=>v&&!norm(s).includes(norm(v))))].join(" · "),brand=/^(ABONOTEATRO|SOHO CITY|GRAN TEATRO PAVÓN|PRÍNCIPE PÍO|TEATRO SERRANO|CASTILLO DE PEDRAZA)$/.test(s),active=l.some(r=>r.status)?l.some(r=>r.status==="active"):l.some(r=>r.date===last&&r.spend>0),open=M.open===s,sales=t.purchases>0||t.value>0;
  const phases=PHASES.map(ph=>{const pl=l.filter(r=>r._phase===ph);if(!pl.length)return"";const pt=agg(pl);const ads=[...group(pl,r=>r.ad||r.adset)].map(([a,al])=>({a,t:agg(al),c:al[0].campaign})).sort((x,y)=>y.t.spend-x.t.spend);
   const m=x=>sales?'<span>'+eur(x.spend)+'</span><span>'+int(x.purchases)+' compras</span><span>CPA '+(x.purchases?eur(x.cpa,2):"—")+'</span><span>ROAS '+(x.spend?dec(x.roas):"—")+'</span>':'<span>'+eur(x.spend,2)+'</span><span>'+int(x.lpv)+' visitas</span><span>'+(x.lpv?eur(x.cplpv,2)+' por visita':"—")+'</span><span>CTR '+(x.impressions?pct(x.ctr,2):"—")+'</span>';
   return '<div class="mt-phase"><h4>'+ph+'<span>'+(sales?eur(pt.spend)+' · '+int(pt.purchases)+' compras · CPA '+(pt.purchases?eur(pt.cpa,2):"—")+' · ROAS '+(pt.spend?dec(pt.roas):"—"):eur(pt.spend,2)+' · '+int(pt.lpv)+' visitas a destino · '+(pt.lpv?eur(pt.cplpv,2)+' por visita':"—"))+'</span></h4>'+ads.map(x=>'<div class="mt-adrow"><b>'+esc(x.a)+(M.demo||x.c?'':'<label class="mt-assign">Espectáculo <input list="mtShows" value="'+esc(s)+'" data-assign="'+esc(x.a)+'"></label>')+'</b>'+m(x.t)+'</div>').join("")+'</div>'}).join("");
  const cid=(l.find(r=>r.campaignId)||{}).campaignId;
  return '<article class="mt-show'+(open?" open":"")+'"><button type="button" class="mt-show-h" data-show="'+esc(s)+'"><div><b>'+esc(s)+'</b><small>'+esc(s==="SIN ASIGNAR"?"El nombre no indica el espectáculo: ábrelo y asigna cada pieza":venue||(brand?"Marca o espacio":"Teatro sin indicar en el nombre"))+'</small></div><span class="badge '+(active?"ok":"")+'">'+(active?"Activa":l.some(r=>r.status)?"Sin campaña activa":"Sin gasto el último día")+'</span></button>'+
   '<div class="mt-show-n"><span><em>Presupuesto</em><b>'+(b?eur(b):"—")+'</b></span><span><em>Gastado</em><b>'+eur(t.spend)+(b?' · '+pct(t.spend/b*100,0):'')+'</b></span>'+(sales?'<span><em>Compras</em><b>'+int(t.purchases)+'</b></span><span><em>Ingresos</em><b>'+eur(t.value)+'</b></span><span><em>CPA</em><b>'+(t.purchases?eur(t.cpa,2):"—")+'</b></span><span><em>ROAS</em><b>'+(t.spend?dec(t.roas):"—")+'</b></span>':'<span><em>Visitas a destino</em><b>'+int(t.lpv)+'</b></span><span><em>Clics en el enlace</em><b>'+int(t.clicks)+'</b></span><span><em>Coste por visita</em><b>'+(t.lpv?eur(t.cplpv,2):"—")+'</b></span><span><em>CTR</em><b>'+(t.impressions?pct(t.ctr,2):"—")+'</b></span>')+'</div>'+
   (b?'<div class="mt-bar"><i style="width:'+Math.min(100,t.spend/b*100)+'%"></i></div>':'')+
   (open?'<div class="mt-show-d">'+(byCampaign?campaignRows(l):phases)+'<div class="actions-row" style="margin-top:10px"><label class="mt-budget">Presupuesto Meta del mes <input type="number" min="0" step="50" value="'+(b||"")+'" data-budget="'+esc(s)+'"'+(M.demo?" disabled":"")+'> €</label><a class="btn" target="_blank" rel="noopener" href="'+esc(adsUrl(cid?"&selected_campaign_ids="+encodeURIComponent(cid):""))+'">Abrir en Meta ↗</a></div></div>':'')+'</article>'}).join("")+'</div><datalist id="mtShows">'+list.map(x=>'<option value="'+esc(x.s)+'">').join("")+'</datalist>'}

function creatives(rows){if(!rows.some(r=>r.ad))return '<p class="muted">Esta exportación es por campaña y no trae los anuncios. Para ver las creatividades, exporta desde la pestaña <b>Anuncios</b> del Administrador.</p>';const list=[...group(rows,r=>(r.ad||r.adset)+"\u0001"+r._show)].map(([k,l])=>{const [a,s]=k.split("\u0001");const th=(M.data&&M.data.thumbs)||{},id=(l.find(r=>r.adId)||{}).adId;return {a,s,t:agg(l),img:th[id]||th["name:"+a]||""}}).sort((x,y)=>y.t.spend-x.t.spend);
 const sales=list.some(x=>x.t.purchases>0);
 const cand=sales?list.filter(x=>x.t.purchases>=3).sort((x,y)=>x.t.cpa-y.t.cpa):list.filter(x=>x.t.lpv>=100).sort((x,y)=>x.t.cplpv-y.t.cplpv),best=cand[0];
 return (best?'<div class="mt-best"><em>Mejor creatividad del mes</em><b>'+esc(best.a)+'</b><span>'+esc(best.s)+(sales?' · CPA '+eur(best.t.cpa,2)+' · ROAS '+dec(best.t.roas):' · '+eur(best.t.cplpv,2)+' por visita a destino · '+int(best.t.lpv)+' visitas')+'</span></div>':'')+
 '<div class="bud-table-wrap"><table class="bud-table mt-table"><thead><tr><th>Pieza</th><th>Espectáculo</th><th class="n">Gasto</th><th class="n">Impr.</th><th class="n">CTR</th>'+(sales?'<th class="n">Compras</th><th class="n">CPA</th><th class="n">ROAS</th>':'<th class="n">Visitas</th><th class="n">€/visita</th><th class="n">CPC</th>')+'</tr></thead><tbody>'+
 list.map(x=>'<tr class="'+(best&&x===best?"mt-top":"")+'"><td><div class="mt-piece">'+(x.img?'<img src="'+esc(x.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'<b>'+esc(x.a)+'</b></div></td><td>'+esc(x.s)+'</td><td class="n">'+eur(x.t.spend)+'</td><td class="n">'+int(x.t.impressions)+'</td><td class="n">'+(x.t.impressions?pct(x.t.ctr,2):"—")+'</td><td class="n">'+(sales?int(x.t.purchases)+'</td><td class="n">'+(x.t.purchases?eur(x.t.cpa,2):"—")+'</td><td class="n">'+(x.t.spend?dec(x.t.roas):"—"):int(x.t.lpv)+'</td><td class="n">'+(x.t.lpv?eur(x.t.cplpv,2):"—")+'</td><td class="n">'+(x.t.clicks?eur(x.t.cpc,2):"—"))+'</td></tr>').join("")+'</tbody></table></div><p class="muted mt-note">Mejor creatividad: '+(sales?'menor CPA con al menos 3 compras':'menor coste por visita a destino con al menos 100 visitas')+'.'+(list.some(x=>x.img)?'':' Las miniaturas salen con la lectura automática de Meta; la exportación no las incluye.')+'</p>'}

function importCard(){return '<section class="card"><div class="section-title"><div><small class="section-kicker">Importar</small><h2>Exportación del Administrador de anuncios</h2></div></div>'+(M.data&&M.data.api&&M.data.api.ready?'<p class="notice" style="text-align:left">Meta se lee automáticamente cada mañana. Importar solo hace falta para meses anteriores; si importas el mes en curso, la lectura de mañana lo sustituirá.</p>':'')+
 '<ol class="mt-steps"><li>En el Administrador de anuncios, elige el periodo (por ejemplo, octubre).</li><li>Pestaña <b>Anuncios</b> · <b>Desglose › Por tiempo › Día</b>.</li><li>Columnas: importe gastado, impresiones, alcance, clics en el enlace, visitas a la página de destino, pagos iniciados, compras y valor de conversión de compras.</li><li><b>Informes › Exportar datos de la tabla</b> (.csv o .xlsx) y súbelo aquí.</li></ol>'+
 '<p class="muted">Norma de nombres de campaña: <code>ESPECTÁCULO | TEATRO | FASE | FORMATO</code>, por ejemplo <code>PEGADOS | PAVON | PROSPECCION | VIDEO</code>. Fases que reconoce: prospección, templado y retargeting.</p>'+
 '<div class="actions-row"><button type="button" class="primary" id="mtPick">Elegir archivo</button><input type="file" id="mtFile" accept=".csv,.xlsx,.xls" hidden></div><div id="mtPrev"></div></section>'}

function render(){if(M.platform!=="meta"&&!M.demo)return renderOther();const d=M.data,all=prepared(),rows=all.filter(r=>r.spend>0||r.impressions>0),idle=new Set(all.filter(r=>!(r.spend>0||r.impressions>0)).map(r=>r.campaign||r.ad)).size,t=agg(rows),has=rows.length>0;
 const tot=!M.demo&&d.totals&&d.totals.reach>0?d.totals:null;if(tot){t.reach=tot.reach;t.freq=t.impressions/tot.reach}
 const chips=platformChips()+monthChips();
 const tabs='<div class="chip-row mt-tabs">'+[["resumen","Resumen"],["espectaculos","Espectáculos"],["creatividades","Creatividades"],["importar","Importar"]].map(([k,v])=>'<button type="button" class="chip'+(M.view===k?" on":"")+'" data-mv="'+k+'">'+v+'</button>').join("")+'</div>';
 const lastDay=lastOf(rows),firstDay=rows.reduce((a,r)=>!a||r.date<a?r.date:a,"");
 const meta=has?'<p class="muted mt-src">'+(M.demo?'<b>Datos de ejemplo</b>: no se guardan y no son reales. ':(d.source==="api"?'Datos leídos de Meta automáticamente':'Datos de la exportación')+(d.importedAt?(d.source==="api"?' el ':' subida el ')+new Date(d.importedAt).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):'')+'. ')+'Del '+fday(firstDay)+' al '+fday(lastDay)+(isPeriod(rows)?' (totales del periodo, sin desglose por día)':'')+'. '+(idle?idle+(all.some(r=>r.campaign)?' campañas':' anuncios')+' sin gasto en el periodo no se muestran. ':'')+'Cifras atribuidas por Meta, no ventas de taquilla.</p>':"";
 let body="";
 if(M.view==="importar")body=importCard();
 else if(!has)body='<section class="card mt-empty"><h2>Todavía no hay datos de '+esc(monthLabel(M.month))+'</h2><p class="muted">Sube la exportación del Administrador de anuncios y el módulo se rellena por espectáculo, fase y creatividad.</p><div class="actions-row"><button type="button" class="primary" data-mv="importar">Importar exportación</button><button type="button" id="mtDemo">Ver con datos de ejemplo</button></div></section>';
 else if(M.view==="resumen"){const al=alerts(rows,budgetsNow());
  body='<section class="card"><div class="section-title"><div><small class="section-kicker">Meta</small><h2>'+esc(isPeriod(rows)?fday(firstDay)+" – "+fday(lastDay):monthLabel(M.month))+'</h2></div></div>'+kpis(t,rows)+'<p class="muted mt-note">* '+(tot?'Alcance y frecuencia totales según Meta (personas únicas en el periodo).':isPeriod(rows)?'El alcance total suma el de cada campaña; si una persona vio dos campañas cuenta dos veces.':'Alcance y frecuencia suman el alcance de cada día; el informe de Meta deduplica personas y da cifras algo menores.')+'</p></section>'+
  (al.length?'<section class="card"><div class="section-title"><div><small class="section-kicker">Avisos</small><h2>Requiere atención</h2></div><span class="badge">'+al.length+'</span></div><div class="bud-alerts">'+al.map(a=>'<div class="bud-alert '+(a.lvl==="warn"?"warn":"")+'">'+(a.show?'<b>'+esc(a.show)+'</b> · ':'')+a.text+'</div>').join("")+'</div><p class="muted mt-note">Yellow Control avisa; los cambios se hacen en Meta.</p></section>':'')+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Por espectáculo</small><h2>Espectáculos</h2></div></div>'+showCards(rows)+'</section>'}
 else if(M.view==="espectaculos")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Por espectáculo</small><h2>Espectáculos · '+esc(monthLabel(M.month))+'</h2></div></div>'+showCards(rows)+'</section>';
 else if(M.view==="creatividades")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Piezas</small><h2>Creatividades · '+esc(monthLabel(M.month))+'</h2></div></div>'+creatives(rows)+'</section>';
 const ap=d.api||{},apiErr=!M.demo&&ap.ready&&ap.ok===false?'<div class="card notice" style="text-align:left">La lectura automática de Meta ha fallado'+(ap.at?' ('+new Date(ap.at).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+')':'')+': '+esc(ap.error||"error desconocido")+'</div>':'';
 app.innerHTML=pageHead("Campañas digitales","Meta · Facebook e Instagram",(ap.ready?'<button type="button" class="primary" id="mtSync">Actualizar ahora</button>':'')+'<a class="btn" target="_blank" rel="noopener" href="'+esc(adsUrl())+'">Abrir en Meta ↗</a>')+apiErr+chips+tabs+meta+body;
 const sy=$("#mtSync");if(sy)sy.onclick=async()=>{sy.disabled=true;sy.textContent="Leyendo Meta…";try{await api("/api/meta",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sync:true})});say("Datos de Meta actualizados");await load();render()}catch(e){say("No se ha podido leer Meta: "+e.message);sy.disabled=false;sy.textContent="Actualizar ahora"}};
 bindCommon();
 $$("[data-mv]").forEach(b=>b.onclick=()=>{M.view=b.dataset.mv;render()});
 $$("[data-show]").forEach(b=>b.onclick=()=>{M.open=M.open===b.dataset.show?null:b.dataset.show;render()});
 $$("[data-budget]").forEach(inp=>inp.onchange=async()=>{try{const r=await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({month:M.month,show:inp.dataset.budget,budget:Number(inp.value)||0})});M.data.budgets=r.budgets;say("Presupuesto guardado");render()}catch(e){say("No se ha podido guardar: "+e.message)}});
 $$("[data-assign]").forEach(inp=>inp.onchange=async()=>{const show=inp.value.trim().toUpperCase();try{const r=await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({map:{campaign:inp.dataset.assign,show}})});M.data.map=r.map;M.open=show||null;say("Campaña asignada a "+(show||"su nombre"));render()}catch(e){say("No se ha podido guardar: "+e.message)}});
 const demo=$("#mtDemo");if(demo)demo.onclick=()=>{M.demo=true;M.view="resumen";render()};
 const pick=$("#mtPick");if(pick){const f=$("#mtFile");pick.onclick=()=>f.click();f.onchange=async()=>{const file=f.files[0];if(!file)return;const box=$("#mtPrev");box.innerHTML='<p class="muted">Leyendo '+esc(file.name)+'…</p>';
  try{const r=await readExport(file);M.pending=r.rows;M.pendingTotals=r.totals;const ms=[...new Set(r.rows.map(x=>x.date.slice(0,7)))].sort(),days=new Set(r.rows.map(x=>x.date)).size,t=agg(r.rows);
   box.innerHTML='<div class="notice" style="text-align:left;margin-top:12px"><b>'+int(r.rows.length)+' filas</b>'+(r.period?' · totales del '+fday(r.rows[0].date)+' al '+fday(lastOf(r.rows))+' (sin desglose por día) · '+new Set(r.rows.filter(x=>x.spend>0).map(x=>x.campaign)).size+' campañas con gasto · se guarda en '+[...new Set(r.rows.map(x=>x.month||x.date.slice(0,7)))].map(monthLabel).join(", ")+' · ':' · '+days+' días ('+ms.map(monthLabel).join(", ")+') · ')+eur(t.spend,2)+' de gasto · '+int(t.purchases)+' compras.'+(r.missing.length?'<br>No encuentro estas columnas: '+esc(r.missing.map(k=>r.labels[k]||k).join(", "))+'. Se importará sin ellas.':'')+'<br>'+(r.period?'Al importar se sustituyen los datos de ese mes.':'Al importar se sustituyen los datos de esos mismos días; el resto se conserva.')+'</div><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="mtGo">Importar</button></div>';
   $("#mtGo").onclick=async()=>{try{const res=await api("/api/meta",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:M.pending,totals:M.pendingTotals})});M.pending=null;say("Exportación importada");M.month=res.imported[0].month;M.view="resumen";await load();render()}catch(e){box.innerHTML+='<div class="notice">No se ha podido importar: '+esc(e.message)+'</div>'}}}
  catch(e){box.innerHTML='<div class="notice" style="text-align:left;margin-top:12px">'+esc(e.message)+'</div>'}}}
}

// ===================== GOOGLE ADS Y TOTAL =====================
const CHANNEL={SEARCH:"Búsqueda",PERFORMANCE_MAX:"Máximo rendimiento",DISPLAY:"Display",VIDEO:"Vídeo",SHOPPING:"Shopping",DEMAND_GEN:"Demand Gen",DISCOVERY:"Discovery",MULTI_CHANNEL:"App",LOCAL:"Local",SMART:"Inteligente"};
const gStatus=s=>s==="active"?'<span class="badge ok">Activa</span>':s==="paused"?'<span class="badge">Pausada</span>':s==="removed"?'<span class="badge">Eliminada</span>':'<span class="badge">—</span>';
function gagg(rows){const t={spend:0,impressions:0,clicks:0,conversions:0,value:0};for(const r of rows)for(const k in t)t[k]+=Number(r[k])||0;t.ctr=t.impressions?t.clicks/t.impressions*100:0;t.cpc=t.clicks?t.spend/t.clicks:0;t.cpconv=t.conversions?t.spend/t.conversions:0;t.roas=t.spend?t.value/t.spend:0;return t}
function gRows(){return ((M.g&&M.g.rows)||[]).map(r=>({...r,_show:parseName({campaign:r.campaign,adset:"",ad:""}).show}))}
function platformChips(){return '<div class="chip-row mt-platforms">'+[["total","Total"],["meta","Meta"],["google","Google Ads"]].map(([k,v])=>'<button type="button" class="chip'+(M.platform===k?" on":"")+'" data-mp="'+k+'">'+v+'</button>').join("")+'</div>'}
function monthChips(){const months=[...new Set([...((M.data&&M.data.months)||[]),...((M.g&&M.g.months)||[]),M.month,new Date().toISOString().slice(0,7)])].filter(Boolean).sort();
 return '<div class="chip-row mt-months">'+months.map(m=>'<button type="button" class="chip'+(m===M.month?" on":"")+'" data-mm="'+m+'">'+esc(monthLabel(m))+'</button>').join("")+'</div>'}
function bindCommon(){$$("[data-mm]").forEach(b=>b.onclick=async()=>{M.month=b.dataset.mm;M.open=null;await load();render()});
 $$("[data-mp]").forEach(b=>b.onclick=()=>{M.platform=b.dataset.mp;M.open=null;render()});
 $$("[data-gv]").forEach(b=>b.onclick=()=>{M.gview=b.dataset.gv;render()});
 if(M.platform!=="meta")$$("[data-assign]").forEach(inp=>inp.onchange=async()=>{const show=inp.value.trim().toUpperCase();try{const r=await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({map:{campaign:inp.dataset.assign,show}})});M.data.map=r.map;say("Campaña asignada a "+(show||"su nombre"));render()}catch(e){say("No se ha podido guardar: "+e.message)}})}

function gadsScript(endpoint,key){return `// Yellow Control · envío diario de Google Ads (solo lectura). Pegar en Herramientas › Scripts.
var YC_URL = '${endpoint}';
var YC_KEY = '${key}';

function main() {
  var tz = AdsApp.currentAccount().getTimeZone();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var cur = today.slice(0, 7);
  var p = new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(5, 7) - 2, 1));
  var prev = p.getUTCFullYear() + '-' + ('0' + (p.getUTCMonth() + 1)).slice(-2);
  var payload = { account: AdsApp.currentAccount().getName(), months: [prev, cur].map(function (m) { return mes(m, today); }) };
  var res = UrlFetchApp.fetch(YC_URL, { method: 'post', contentType: 'application/json', headers: { 'x-yc-key': YC_KEY }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  Logger.log(res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
  if (res.getResponseCode() >= 300) throw new Error('Yellow Control ha rechazado el envío: ' + res.getContentText().slice(0, 200));
}

function mes(m, today) {
  var last = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
  var hasta = m + '-' + ('0' + last).slice(-2);
  if (hasta > today) hasta = today;
  var entre = " segments.date BETWEEN '" + m + "-01' AND '" + hasta + "'";
  var rows = [], it = AdsApp.search('SELECT segments.date, campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE' + entre);
  while (it.hasNext()) {
    var x = it.next(), b = x.campaignBudget || {};
    rows.push({ date: x.segments.date, campaign: x.campaign.name, campaignId: String(x.campaign.id), channel: x.campaign.advertisingChannelType, status: x.campaign.status,
      budget: (+b.amountMicros || 0) / 1e6, spend: (+x.metrics.costMicros || 0) / 1e6, impressions: +x.metrics.impressions || 0, clicks: +x.metrics.clicks || 0,
      conversions: +x.metrics.conversions || 0, value: +x.metrics.conversionsValue || 0 });
  }
  var kws = [], k = AdsApp.search('SELECT campaign.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM keyword_view WHERE metrics.impressions > 0 AND' + entre);
  while (k.hasNext()) {
    var y = k.next(), kw = (y.adGroupCriterion || {}).keyword || {};
    kws.push({ campaign: y.campaign.name, keyword: kw.text, match: kw.matchType, spend: (+y.metrics.costMicros || 0) / 1e6, impressions: +y.metrics.impressions || 0, clicks: +y.metrics.clicks || 0, conversions: +y.metrics.conversions || 0 });
  }
  return { month: m, rows: rows, keywords: kws };
}
`}

function gKpis(t,rows){const camp=new Set(rows.filter(r=>r.spend>0).map(r=>r.campaign)).size;
 return '<div class="mt-kpis">'+[["Inversión",eur(t.spend,2)],["Clics",int(t.clicks)],["Conversiones",dec(t.conversions,t.conversions%1?1:0)],["Coste por conversión",t.conversions?eur(t.cpconv,2):"—"]].map(([k,v])=>'<div class="mt-kpi"><em>'+k+'</em><b>'+v+'</b></div>').join("")+'</div>'+
 '<div class="mt-sec">'+[["Campañas con gasto",int(camp)],["Impresiones",int(t.impressions)],["CTR",t.impressions?pct(t.ctr,2):"—"],["CPC medio",t.clicks?eur(t.cpc,2):"—"],["Valor de conversiones",eur(t.value)],["ROAS",t.spend&&t.value?dec(t.roas):"—"]].map(([k,v])=>'<span><em>'+k+'</em><b>'+v+'</b></span>').join("")+'</div>'}
function gCampaigns(rows){const cs=[...group(rows,r=>r.campaign)].map(([c,l])=>({c,l,t:gagg(l),x:l[l.length-1]})).sort((a,b)=>b.t.spend-a.t.spend);
 return '<div class="bud-table-wrap"><table class="bud-table mt-table"><thead><tr><th>Campaña</th><th>Espectáculo</th><th>Tipo</th><th>Estado</th><th class="n">Ppto./día</th><th class="n">Gasto</th><th class="n">Clics</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">Conv.</th><th class="n">€/conv.</th></tr></thead><tbody>'+
 cs.map(({c,t,x})=>'<tr><td><b>'+esc(c)+'</b></td><td><input class="mt-assign-in" list="mtShows" value="'+esc(x._show)+'" data-assign="'+esc(c)+'"></td><td>'+esc(CHANNEL[x.channel]||x.channel||"—")+'</td><td>'+gStatus(x.status)+'</td><td class="n">'+(x.budget?eur(x.budget):"—")+'</td><td class="n">'+eur(t.spend,2)+'</td><td class="n">'+int(t.clicks)+'</td><td class="n">'+(t.impressions?pct(t.ctr,2):"—")+'</td><td class="n">'+(t.clicks?eur(t.cpc,2):"—")+'</td><td class="n">'+dec(t.conversions,t.conversions%1?1:0)+'</td><td class="n">'+(t.conversions?eur(t.cpconv,2):"—")+'</td></tr>').join("")+
 '</tbody></table></div><datalist id="mtShows">'+[...new Set(cs.map(x=>x.x._show))].map(s=>'<option value="'+esc(s)+'">').join("")+'</datalist>'}
function gShows(rows){const list=[...group(rows,r=>r._show)].map(([s,l])=>({s,t:gagg(l)})).sort((a,b)=>b.t.spend-a.t.spend);
 return '<div class="bud-table-wrap"><table class="bud-table mt-table"><thead><tr><th>Espectáculo</th><th class="n">Gasto</th><th class="n">Impr.</th><th class="n">Clics</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">Conv.</th><th class="n">€/conv.</th></tr></thead><tbody>'+
 list.map(({s,t})=>'<tr><td><b>'+esc(s)+'</b></td><td class="n">'+eur(t.spend,2)+'</td><td class="n">'+int(t.impressions)+'</td><td class="n">'+int(t.clicks)+'</td><td class="n">'+(t.impressions?pct(t.ctr,2):"—")+'</td><td class="n">'+(t.clicks?eur(t.cpc,2):"—")+'</td><td class="n">'+dec(t.conversions,t.conversions%1?1:0)+'</td><td class="n">'+(t.conversions?eur(t.cpconv,2):"—")+'</td></tr>').join("")+'</tbody></table></div>'}
function gKeywords(){const kw=((M.g&&M.g.keywords)||[]).slice().sort((a,b)=>b.spend-a.spend||b.clicks-a.clicks).slice(0,100);
 if(!kw.length)return '<p class="muted">No hay palabras clave con impresiones este mes. Las campañas de Máximo rendimiento, Display o Vídeo no usan palabras clave.</p>';
 const M_={EXACT:"Exacta",PHRASE:"Frase",BROAD:"Amplia"};
 return '<div class="bud-table-wrap"><table class="bud-table mt-table"><thead><tr><th>Palabra clave</th><th>Concordancia</th><th>Campaña</th><th class="n">Gasto</th><th class="n">Clics</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">Conv.</th></tr></thead><tbody>'+
 kw.map(k=>'<tr><td><b>'+esc(k.keyword)+'</b></td><td>'+esc(M_[k.match]||k.match||"—")+'</td><td>'+esc(k.campaign)+'</td><td class="n">'+eur(k.spend,2)+'</td><td class="n">'+int(k.clicks)+'</td><td class="n">'+(k.impressions?pct(k.clicks/k.impressions*100,2):"—")+'</td><td class="n">'+(k.clicks?eur(k.spend/k.clicks,2):"—")+'</td><td class="n">'+dec(k.conversions,k.conversions%1?1:0)+'</td></tr>').join("")+'</tbody></table></div><p class="muted mt-note">Las 100 con más gasto del mes.</p>'}
function gConnect(){const g=M.g||{};
 return '<section class="card"><div class="section-title"><div><small class="section-kicker">Conexión</small><h2>Script de Google Ads</h2></div>'+(g.connected?'<span class="badge ok">Conectado</span>':'<span class="badge">Sin conectar</span>')+'</div>'+
 (g.lastAt?'<p class="muted">Último envío: '+esc(new Date(g.lastAt).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+(g.account?' · cuenta '+esc(g.account):'')+'.</p>':'')+
 '<ol class="mt-steps"><li>En Google Ads: <b>Herramientas › Acciones masivas › Scripts</b> y pulsa <b>+ Nuevo script</b>.</li><li>Borra lo que aparece, pega el script de abajo y ponle de nombre «Yellow Control».</li><li>Pulsa <b>Autorizar</b> y acepta con tu cuenta de Google.</li><li>Pulsa <b>Ejecutar</b> una vez: en unos segundos los datos salen aquí.</li><li>En la lista de scripts, en <b>Frecuencia</b>, elige <b>Diariamente</b> a las 7:00.</li></ol>'+
 '<p class="muted">El script solo lee datos de la cuenta y los envía a Yellow Control con una clave propia. No cambia nada en Google Ads.</p>'+
 '<div class="actions-row"><button type="button" class="primary" id="gaShow">'+(M.gscript?'Copiar script':'Mostrar script')+'</button>'+(M.gscript?'<button type="button" id="gaRotate">Generar clave nueva</button>':'')+'</div>'+
 (M.gscript?'<textarea class="mt-script" id="gaScript" readonly rows="14">'+esc(M.gscript)+'</textarea>':'')+'</section>'}

function renderOther(){const head=pageHead("Campañas digitales",M.platform==="google"?"Google Ads":"Meta y Google Ads por espectáculo",M.platform==="google"?'<a class="btn" target="_blank" rel="noopener" href="https://ads.google.com/aw/campaigns">Abrir en Google Ads ↗</a>':'');
 const g=gRows(),gr=g.filter(r=>r.spend>0||r.impressions>0),gt=gagg(gr);let body="",src="";
 if(M.platform==="google"){
  const tabs='<div class="chip-row mt-tabs">'+[["resumen","Resumen"],["palabras","Palabras clave"],["conectar","Conectar"]].map(([k,v])=>'<button type="button" class="chip'+(M.gview===k?" on":"")+'" data-gv="'+k+'">'+v+'</button>').join("")+'</div>';
  if(M.gview==="conectar"||(!gr.length&&!(M.g&&M.g.connected)))body=(M.gview!=="conectar"?'<section class="card mt-empty"><h2>Google Ads aún no está conectado</h2><p class="muted">Pega el script en tu cuenta de Google Ads y los datos llegarán solos cada mañana.</p></section>':'')+gConnect();
  else if(!gr.length)body='<section class="card mt-empty"><h2>Sin gasto en Google Ads en '+esc(monthLabel(M.month))+'</h2><p class="muted">El script está conectado; este mes no hay campañas con impresiones.</p></section>';
  else if(M.gview==="palabras")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Búsqueda</small><h2>Palabras clave · '+esc(monthLabel(M.month))+'</h2></div></div>'+gKeywords()+'</section>';
  else body='<section class="card"><div class="section-title"><div><small class="section-kicker">Google Ads</small><h2>'+esc(monthLabel(M.month))+'</h2></div></div>'+gKpis(gt,gr)+'</section><section class="card"><div class="section-title"><div><small class="section-kicker">Por espectáculo</small><h2>Espectáculos</h2></div></div>'+gShows(gr)+'</section><section class="card"><div class="section-title"><div><small class="section-kicker">Detalle</small><h2>Campañas</h2></div></div>'+gCampaigns(gr)+'</section>';
  if(M.g&&M.g.receivedAt&&gr.length)src='<p class="muted mt-src">Datos enviados por Google Ads el '+esc(new Date(M.g.receivedAt).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+'. Conversiones según Google Ads, no ventas de taquilla.</p>';
  app.innerHTML=head+platformChips()+monthChips()+tabs+src+body;
 }else{
  const mr=prepared().filter(r=>r.spend>0||r.impressions>0),mt=agg(mr);
  const shows=new Map();const add=(s,k,v)=>{if(!shows.has(s))shows.set(s,{ms:0,gs:0,mp:0,gc:0});shows.get(s)[k]+=v};
  for(const r of mr){add(r._show,"ms",Number(r.spend)||0);add(r._show,"mp",Number(r.purchases)||0)}
  for(const r of gr){add(r._show,"gs",Number(r.spend)||0);add(r._show,"gc",Number(r.conversions)||0)}
  const list=[...shows].map(([s,v])=>({s,...v,t:v.ms+v.gs})).sort((a,b)=>b.t-a.t);
  body='<section class="card"><div class="section-title"><div><small class="section-kicker">Digital</small><h2>'+esc(monthLabel(M.month))+'</h2></div></div><div class="mt-kpis">'+[["Inversión total",eur(mt.spend+gt.spend)],["Meta",eur(mt.spend)],["Google Ads",eur(gt.spend)],["Espectáculos con gasto",int(list.filter(x=>x.t>0).length)]].map(([k,v])=>'<div class="mt-kpi"><em>'+k+'</em><b>'+v+'</b></div>').join("")+'</div></section>'+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Por espectáculo</small><h2>Inversión digital</h2></div></div>'+(list.length?'<div class="bud-table-wrap"><table class="bud-table mt-table"><thead><tr><th>Espectáculo</th><th class="n">Meta</th><th class="n">Google Ads</th><th class="n">Total</th><th class="n">Compras Meta</th><th class="n">Conv. Google</th></tr></thead><tbody>'+
  list.map(x=>'<tr><td><b>'+esc(x.s)+'</b></td><td class="n">'+(x.ms?eur(x.ms):"—")+'</td><td class="n">'+(x.gs?eur(x.gs):"—")+'</td><td class="n"><b>'+eur(x.t)+'</b></td><td class="n">'+(x.mp?int(x.mp):"—")+'</td><td class="n">'+(x.gc?dec(x.gc,x.gc%1?1:0):"—")+'</td></tr>').join("")+'</tbody></table></div>':'<p class="muted">No hay gasto en '+esc(monthLabel(M.month))+'.</p>')+
  '<p class="muted mt-note">Las compras de Meta y las conversiones de Google no se suman: cada plataforma se atribuye las ventas a su manera y una misma entrada puede aparecer en las dos.'+(M.g&&M.g.connected?'':' Google Ads aún no está conectado (pestaña Google Ads › Conectar).')+'</p></section>';
  app.innerHTML=head+platformChips()+monthChips()+body;
 }
 bindCommon();
 const sh=$("#gaShow");if(sh)sh.onclick=async()=>{if(!M.gscript){try{const r=await api("/api/google-ads?script=1",{cache:"no-store"});M.gscript=gadsScript(r.endpoint,r.key);render()}catch(e){say("No se ha podido preparar el script: "+e.message)}return}
  try{await navigator.clipboard.writeText(M.gscript);say("Script copiado")}catch{const ta=$("#gaScript");ta.select();say("Selecciona y copia el texto")}};
 const ro=$("#gaRotate");if(ro)ro.onclick=async()=>{if(!confirm("La clave actual dejará de funcionar y tendrás que pegar el script nuevo en Google Ads. ¿Continuar?"))return;try{const r=await api("/api/google-ads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rotate:true})});const e=await api("/api/google-ads?script=1",{cache:"no-store"});M.gscript=gadsScript(e.endpoint,r.key||e.key);say("Clave nueva generada");render()}catch(e){say("No se ha podido: "+e.message)}};
}

window.metaModule=async function(ctx){({api,esc,pageHead,say,app,$,$$}=ctx);try{await load()}catch(e){app.innerHTML=pageHead("Meta","Inversión y resultados")+'<div class="card notice">'+esc(e.status===403?"No tienes acceso a este módulo.":e.message)+'</div>';return}render()};
})();
