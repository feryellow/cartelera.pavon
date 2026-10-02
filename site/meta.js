// ===================== META · INVERSIÓN Y RESULTADOS (fase 1: solo lectura) =====================
// Organizado por espectáculo, no por campaña. Los datos llegan importando la exportación del
// Administrador de anuncios; Yellow Control no edita nada en Meta («Abrir en Meta» para intervenir).
(function(){
let api,esc,pageHead,say,app,$,$$;
const M={month:"",view:"resumen",data:null,demo:false,open:null,pending:null};
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
const OBJ=/^(trafico|ventas|venta|reconocimiento|alcance|interaccion|interacciones|conversiones|conversion|clientes potenciales|leads|mensajes|visualizaciones|reproducciones|promocion|prueba|borrador no usar|borrador|copia|traffic|sales|awareness|engagement|reach)$/;
const BRANDS=[[/^abono ?teatro|^abt\b/,"ABONOTEATRO"],[/^soho city/,"SOHO CITY"],[/^(gran teatro )?pavon/,"GRAN TEATRO PAVÓN"],[/^(gran teatro )?(caixabank )?principe pio/,"PRÍNCIPE PÍO"],[/^(gran )?teatro serrano/,"TEATRO SERRANO"],[/^(gran )?castillo de pedraza/,"CASTILLO DE PEDRAZA"]];
function guessShow(name){let t=String(name||"").replace(/\[[^\]]*\]/g," ").replace(/\((copia|copy)\)/ig," ").replace(/\s+-\s+copia\b/ig," ").replace(/^\s*promoci[oó]n de\s+/i,"").replace(/\n.*/s,"");
 const parts=t.split(/\s*[|·:]\s*|\s+-\s+|\s*_\s*/).map(x=>x.trim()).filter(x=>x&&!OBJ.test(norm(x))&&!/^[\d.,]+ ?€$|^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b.*\d{4}$/i.test(x)&&!/^(prueba|borrador)\b/i.test(x));
 let show=(parts[0]||t).trim();const n=norm(show);const b=BRANDS.find(([rx])=>rx.test(n));if(b)show=b[1];
 return (show||"Sin espectáculo").toUpperCase()}
function parseName(r){const all=norm([r.campaign,r.adset,r.ad].join(" "));
 const show=(M.data&&M.data.map&&M.data.map[r.campaign])||guessShow(r.campaign);
 const venue=(VENUE_RX.find(([rx])=>rx.test(all))||[])[1]||"";
 const ph=norm(r.adset+" "+r.campaign);
 const phase=/prospec|frio|\btof\b|alcance|captac/.test(ph)?"Prospección":/templ|tibio|\bmof\b|interes/.test(ph)?"Templado":/retarg|remarket|caliente|\bbof\b|rmk/.test(ph)?"Retargeting":"Otros";
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
 const H=(rows[hr]||[]).map(norm),period=!H.some(x=>x==="dia"||x==="day");
 const out=[];let totals=null;for(const r of rows.slice(hr+1)){if(!r||!r.some(c=>c!=null&&c!==""))continue;const g=k=>idx[k]==null?null:r[idx[k]];
  const date=toDate(g("date"));if(!date)continue;const row={date,campaign:String(g("campaign")??"").replace(/\s+/g," ").trim(),adset:String(g("adset")??"").trim(),ad:String(g("ad")??"").trim(),campaignId:String(g("campaignId")??"").trim(),adId:String(g("adId")??"").trim()};
  for(const k of ["spend","impressions","reach","clicks","lpv","checkouts","purchases","value","results","budget"])row[k]=numv(g(k));
  const de=toDate(g("dateEnd"));if(period&&de&&de!==date){row.dateEnd=de;const mid=new Date((new Date(date+"T12:00:00").getTime()+new Date(de+"T12:00:00").getTime())/2);row.month=mid.toISOString().slice(0,7)}
  row.status=String(g("status")??"").trim();row.resultType=String(g("resultType")??"").trim();row.budgetType=String(g("budgetType")??"").trim();const en=toDate(g("end"));row.end=en&&en>"2000"?en:"";
  if(!row.purchases&&/purchase/.test(row.resultType))row.purchases=row.results;
  if(!row.campaign&&!row.ad){if(row.spend>0&&!totals)totals={reach:row.reach,impressions:row.impressions,spend:row.spend,date:row.date,dateEnd:row.dateEnd||"",month:row.month||""};continue}out.push(row)}
 const found=Object.keys(idx).filter(k=>!["campaignId","adId"].includes(k));
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
async function load(){M.demo=false;const d=await api("/api/meta"+(M.month?"?month="+M.month:""),{cache:"no-store"});M.data=d;M.month=d.month}
function prepared(){const rows=(M.demo?demoRows(M.month):M.data.rows).map(r=>{const p=parseName(r);return {...r,_show:p.show,_venue:p.venue,_phase:p.phase}});return rows}
const adsUrl=(extra="")=>"https://adsmanager.facebook.com/adsmanager/manage/campaigns?act="+encodeURIComponent(M.data.account)+extra;

function kpis(t,rows){const sales=t.purchases>0||t.value>0,camp=new Set(rows.filter(r=>r.spend>0).map(r=>r.campaign)).size;
 if(!sales)return '<div class="mt-kpis">'+[["Inversión",eur(t.spend,2)],["Visitas a destino",int(t.lpv)],["Clics en el enlace",int(t.clicks)],["Coste por visita",t.lpv?eur(t.cplpv,2):"—"]].map(([k,v])=>'<div class="mt-kpi"><em>'+k+'</em><b>'+v+'</b></div>').join("")+'</div>'+
  '<div class="mt-sec">'+[["Campañas con gasto",int(camp)],["Alcance*",int(t.reach)],["Impresiones",int(t.impressions)],["Frecuencia*",t.reach?dec(t.freq):"—"],["CTR",t.impressions?pct(t.ctr,2):"—"],["CPC",t.clicks?eur(t.cpc,2):"—"],["CPM",t.impressions?eur(t.cpm,2):"—"],["Compras",int(t.purchases)]].map(([k,v])=>'<span><em>'+k+'</em><b>'+v+'</b></span>').join("")+'</div>';
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
  const phases=PHASES.map(ph=>{const pl=l.filter(r=>r._phase===ph);if(!pl.length)return"";const pt=agg(pl);const ads=[...group(pl,r=>r.ad||r.adset)].map(([a,al])=>({a,t:agg(al)})).sort((x,y)=>y.t.spend-x.t.spend);
   return '<div class="mt-phase"><h4>'+ph+'<span>'+eur(pt.spend)+' · '+int(pt.purchases)+' compras · CPA '+(pt.purchases?eur(pt.cpa,2):"—")+' · ROAS '+(pt.spend?dec(pt.roas):"—")+'</span></h4>'+ads.map(x=>'<div class="mt-adrow"><b>'+esc(x.a)+'</b><span>'+eur(x.t.spend)+'</span><span>'+int(x.t.purchases)+' compras</span><span>CPA '+(x.t.purchases?eur(x.t.cpa,2):"—")+'</span><span>ROAS '+(x.t.spend?dec(x.t.roas):"—")+'</span></div>').join("")+'</div>'}).join("");
  const cid=(l.find(r=>r.campaignId)||{}).campaignId;
  return '<article class="mt-show'+(open?" open":"")+'"><button type="button" class="mt-show-h" data-show="'+esc(s)+'"><div><b>'+esc(s)+'</b><small>'+esc(venue||(brand?"Marca o espacio":"Teatro sin indicar en el nombre"))+'</small></div><span class="badge '+(active?"ok":"")+'">'+(active?"Activa":l.some(r=>r.status)?"Sin campaña activa":"Sin gasto el último día")+'</span></button>'+
   '<div class="mt-show-n"><span><em>Presupuesto</em><b>'+(b?eur(b):"—")+'</b></span><span><em>Gastado</em><b>'+eur(t.spend)+(b?' · '+pct(t.spend/b*100,0):'')+'</b></span>'+(sales?'<span><em>Compras</em><b>'+int(t.purchases)+'</b></span><span><em>Ingresos</em><b>'+eur(t.value)+'</b></span><span><em>CPA</em><b>'+(t.purchases?eur(t.cpa,2):"—")+'</b></span><span><em>ROAS</em><b>'+(t.spend?dec(t.roas):"—")+'</b></span>':'<span><em>Visitas a destino</em><b>'+int(t.lpv)+'</b></span><span><em>Clics en el enlace</em><b>'+int(t.clicks)+'</b></span><span><em>Coste por visita</em><b>'+(t.lpv?eur(t.cplpv,2):"—")+'</b></span><span><em>CTR</em><b>'+(t.impressions?pct(t.ctr,2):"—")+'</b></span>')+'</div>'+
   (b?'<div class="mt-bar"><i style="width:'+Math.min(100,t.spend/b*100)+'%"></i></div>':'')+
   (open?'<div class="mt-show-d">'+(byCampaign?campaignRows(l):phases)+'<div class="actions-row" style="margin-top:10px"><label class="mt-budget">Presupuesto Meta del mes <input type="number" min="0" step="50" value="'+(b||"")+'" data-budget="'+esc(s)+'"'+(M.demo?" disabled":"")+'> €</label><a class="btn" target="_blank" rel="noopener" href="'+esc(adsUrl(cid?"&selected_campaign_ids="+encodeURIComponent(cid):""))+'">Abrir en Meta ↗</a></div></div>':'')+'</article>'}).join("")+'</div><datalist id="mtShows">'+list.map(x=>'<option value="'+esc(x.s)+'">').join("")+'</datalist>'}

function creatives(rows){if(!rows.some(r=>r.ad))return '<p class="muted">Esta exportación es por campaña y no trae los anuncios. Para ver las creatividades, exporta desde la pestaña <b>Anuncios</b> del Administrador.</p>';const list=[...group(rows,r=>(r.ad||r.adset)+"\u0001"+r._show)].map(([k,l])=>{const [a,s]=k.split("\u0001");return {a,s,t:agg(l)}}).sort((x,y)=>y.t.spend-x.t.spend);
 const cand=list.filter(x=>x.t.purchases>=3).sort((x,y)=>x.t.cpa-y.t.cpa),best=cand[0];
 return (best?'<div class="mt-best"><em>Mejor creatividad del mes</em><b>'+esc(best.a)+'</b><span>'+esc(best.s)+' · CPA '+eur(best.t.cpa,2)+' · ROAS '+dec(best.t.roas)+'</span></div>':'')+
 '<div class="bud-table-wrap"><table class="bud-table mt-table"><thead><tr><th>Pieza</th><th>Espectáculo</th><th class="n">Gasto</th><th class="n">Impr.</th><th class="n">CTR</th><th class="n">Compras</th><th class="n">CPA</th><th class="n">ROAS</th></tr></thead><tbody>'+
 list.map(x=>'<tr class="'+(best&&x===best?"mt-top":"")+'"><td><b>'+esc(x.a)+'</b></td><td>'+esc(x.s)+'</td><td class="n">'+eur(x.t.spend)+'</td><td class="n">'+int(x.t.impressions)+'</td><td class="n">'+(x.t.impressions?pct(x.t.ctr,2):"—")+'</td><td class="n">'+int(x.t.purchases)+'</td><td class="n">'+(x.t.purchases?eur(x.t.cpa,2):"—")+'</td><td class="n">'+(x.t.spend?dec(x.t.roas):"—")+'</td></tr>').join("")+'</tbody></table></div><p class="muted mt-note">Las miniaturas llegarán con la conexión directa a Meta; la exportación no las incluye.</p>'}

function importCard(){return '<section class="card"><div class="section-title"><div><small class="section-kicker">Importar</small><h2>Exportación del Administrador de anuncios</h2></div></div>'+
 '<ol class="mt-steps"><li>En el Administrador de anuncios, elige el periodo (por ejemplo, octubre).</li><li>Pestaña <b>Anuncios</b> · <b>Desglose › Por tiempo › Día</b>.</li><li>Columnas: importe gastado, impresiones, alcance, clics en el enlace, visitas a la página de destino, pagos iniciados, compras y valor de conversión de compras.</li><li><b>Informes › Exportar datos de la tabla</b> (.csv o .xlsx) y súbelo aquí.</li></ol>'+
 '<p class="muted">Norma de nombres de campaña: <code>ESPECTÁCULO | TEATRO | FASE | FORMATO</code>, por ejemplo <code>PEGADOS | PAVON | PROSPECCION | VIDEO</code>. Fases que reconoce: prospección, templado y retargeting.</p>'+
 '<div class="actions-row"><button type="button" class="primary" id="mtPick">Elegir archivo</button><input type="file" id="mtFile" accept=".csv,.xlsx,.xls" hidden></div><div id="mtPrev"></div></section>'}

function render(){const d=M.data,all=prepared(),rows=all.filter(r=>r.spend>0||r.impressions>0),idle=new Set(all.filter(r=>!(r.spend>0||r.impressions>0)).map(r=>r.campaign)).size,t=agg(rows),has=rows.length>0;
 const tot=!M.demo&&d.totals&&d.totals.reach>0?d.totals:null;if(tot){t.reach=tot.reach;t.freq=t.impressions/tot.reach}
 const months=[...new Set([...(d.months||[]),M.month,new Date().toISOString().slice(0,7)])].sort();
 const chips='<div class="chip-row mt-months">'+months.map(m=>'<button type="button" class="chip'+(m===M.month?" on":"")+'" data-mm="'+m+'">'+esc(monthLabel(m))+'</button>').join("")+'</div>';
 const tabs='<div class="chip-row mt-tabs">'+[["resumen","Resumen"],["espectaculos","Espectáculos"],["creatividades","Creatividades"],["importar","Importar"]].map(([k,v])=>'<button type="button" class="chip'+(M.view===k?" on":"")+'" data-mv="'+k+'">'+v+'</button>').join("")+'</div>';
 const lastDay=lastOf(rows),firstDay=rows.reduce((a,r)=>!a||r.date<a?r.date:a,"");
 const meta=has?'<p class="muted mt-src">'+(M.demo?'<b>Datos de ejemplo</b>: no se guardan y no son reales. ':'Datos de la exportación'+(d.importedAt?' subida el '+new Date(d.importedAt).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):'')+'. ')+'Del '+fday(firstDay)+' al '+fday(lastDay)+(isPeriod(rows)?' (totales del periodo, sin desglose por día)':'')+'. '+(idle?idle+' campañas sin gasto en el periodo no se muestran. ':'')+'Cifras atribuidas por Meta, no ventas de taquilla.</p>':"";
 let body="";
 if(M.view==="importar")body=importCard();
 else if(!has)body='<section class="card mt-empty"><h2>Todavía no hay datos de '+esc(monthLabel(M.month))+'</h2><p class="muted">Sube la exportación del Administrador de anuncios y el módulo se rellena por espectáculo, fase y creatividad.</p><div class="actions-row"><button type="button" class="primary" data-mv="importar">Importar exportación</button><button type="button" id="mtDemo">Ver con datos de ejemplo</button></div></section>';
 else if(M.view==="resumen"){const al=alerts(rows,budgetsNow());
  body='<section class="card"><div class="section-title"><div><small class="section-kicker">Meta</small><h2>'+esc(isPeriod(rows)?fday(firstDay)+" – "+fday(lastDay):monthLabel(M.month))+'</h2></div></div>'+kpis(t,rows)+'<p class="muted mt-note">* '+(tot?'Alcance y frecuencia totales según Meta (personas únicas en el periodo).':isPeriod(rows)?'El alcance total suma el de cada campaña; si una persona vio dos campañas cuenta dos veces.':'Alcance y frecuencia suman el alcance de cada día; el informe de Meta deduplica personas y da cifras algo menores.')+'</p></section>'+
  (al.length?'<section class="card"><div class="section-title"><div><small class="section-kicker">Avisos</small><h2>Requiere atención</h2></div><span class="badge">'+al.length+'</span></div><div class="bud-alerts">'+al.map(a=>'<div class="bud-alert '+(a.lvl==="warn"?"warn":"")+'">'+(a.show?'<b>'+esc(a.show)+'</b> · ':'')+a.text+'</div>').join("")+'</div><p class="muted mt-note">Yellow Control avisa; los cambios se hacen en Meta.</p></section>':'')+
  '<section class="card"><div class="section-title"><div><small class="section-kicker">Por espectáculo</small><h2>Espectáculos</h2></div></div>'+showCards(rows)+'</section>'}
 else if(M.view==="espectaculos")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Por espectáculo</small><h2>Espectáculos · '+esc(monthLabel(M.month))+'</h2></div></div>'+showCards(rows)+'</section>';
 else if(M.view==="creatividades")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Piezas</small><h2>Creatividades · '+esc(monthLabel(M.month))+'</h2></div></div>'+creatives(rows)+'</section>';
 app.innerHTML=pageHead("Meta","Inversión y resultados de Facebook e Instagram",'<a class="btn" target="_blank" rel="noopener" href="'+esc(adsUrl())+'">Abrir en Meta ↗</a>')+chips+tabs+meta+body;
 $$("[data-mm]").forEach(b=>b.onclick=async()=>{M.month=b.dataset.mm;M.open=null;await load();render()});
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

window.metaModule=async function(ctx){({api,esc,pageHead,say,app,$,$$}=ctx);try{await load()}catch(e){app.innerHTML=pageHead("Meta","Inversión y resultados")+'<div class="card notice">'+esc(e.status===403?"No tienes acceso a este módulo.":e.message)+'</div>';return}render()};
})();
