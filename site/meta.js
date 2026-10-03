// ===================== DIGITAL · META Y GOOGLE ADS (solo lectura) =====================
// Meta se lee cada mañana por API (o importando la exportación); Google Ads llega con un script de la cuenta.
// Yellow Control no edita nada en las plataformas («Abrir en Meta / Google Ads» para intervenir).
(function(){
let api,esc,pageHead,say,app,$,$$;
const M={month:"",view:"panel",data:null,demo:false,open:null,openShow:null,pending:null,platform:"",g:null,prev:null,filter:"activas"};
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

// ===================== PANTALLA · DIGITAL (Meta + Google Ads) =====================
// Estructura de panel de marketing de pago: periodo y fuente arriba; indicadores con comparación con el mes
// anterior; gasto diario por plataforma; campañas con estado, fechas, presupuesto y resultado; espectáculos.
const PLAT={meta:{label:"Meta",cls:"meta"},google:{label:"Google Ads",cls:"google"}};
const prevMonth=m=>{const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-2,1));return d.toISOString().slice(0,7)};
const nextMonth=m=>{const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),1));return d.toISOString().slice(0,7)};
const thisMonth=()=>new Date().toISOString().slice(0,7);
const fdate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"}).replace(".",""):"";
const fwhen=iso=>{if(!iso)return"";const d=new Date(iso),t=new Date(),y=new Date(Date.now()-864e5),h=d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});return d.toDateString()===t.toDateString()?"hoy a las "+h:d.toDateString()===y.toDateString()?"ayer a las "+h:d.toLocaleDateString("es-ES",{day:"numeric",month:"short"})+" a las "+h};

async function load(){M.demo=false;
 const m=M.month||"",q=m?"?month="+m:"";
 const d=await api("/api/meta"+q,{cache:"no-store"});M.data=d;M.month=d.month;
 const pm=prevMonth(M.month);
 const [g,pmeta,pg]=await Promise.all([api("/api/google-ads?month="+M.month,{cache:"no-store"}).catch(()=>null),api("/api/meta?month="+pm,{cache:"no-store"}).catch(()=>null),api("/api/google-ads?month="+pm,{cache:"no-store"}).catch(()=>null)]);
 M.g=g;M.prev={meta:pmeta&&pmeta.month===pm?pmeta.rows||[]:[],google:pg&&pg.month===pm?pg.rows||[]:[]};
 if(!M.platform||!["todo","meta","google"].includes(M.platform))M.platform="todo";
 if(!M.view||!["panel","campanas","creatividades","palabras","conexiones"].includes(M.view))M.view="panel"}
function prepared(){return (M.demo?demoRows(M.month):M.data.rows).map(r=>{const p=parseName(r);return {...r,_show:p.show,_venue:p.venue,_phase:p.phase}})}
const adsUrl=(extra="")=>"https://adsmanager.facebook.com/adsmanager/manage/campaigns?act="+encodeURIComponent(M.data.account)+extra;
const gUrl="https://ads.google.com/aw/campaigns";

// --- Campañas unificadas
function metaCampaigns(){const rows=prepared().filter(r=>r.spend>0||r.impressions>0);const th=(M.data&&M.data.thumbs)||{};
 return [...group(rows,r=>r.campaign||r.ad)].map(([name,l])=>{const t=agg(l),last=l[l.length-1],x=l.find(r=>r.status)||last,rt=(l.find(r=>r.resultType)||{}).resultType||"";
  const dates=l.filter(r=>r.spend>0).map(r=>r.date).sort();
  const res=t.purchases>0?{n:t.purchases,label:"compras",cost:t.cpa}:t.results>0?{n:t.results,label:resLabel(rt),cost:t.spend/t.results}:t.lpv>0?{n:t.lpv,label:"visitas a la web",cost:t.cplpv}:{n:t.clicks,label:"clics",cost:t.cpc};
  const ads=[...group(l,r=>r.ad||r.adset||name)].map(([a,al])=>{const at=agg(al),id=(al.find(r=>r.adId)||{}).adId;return {name:a,t:at,img:th[id]||th["name:"+a]||""}}).sort((a,b)=>b.t.spend-a.t.spend);
  const active=x.status?x.status==="active":dates[dates.length-1]===lastOf(rows);
  return {plat:"meta",name,show:l[0]._show,venue:l[0]._venue,phase:l[0]._phase,status:x.status||(active?"active":""),active,start:dates[0]||l[0].date,last:dates[dates.length-1]||"",end:x.end||"",budget:Number(x.budget)||0,budgetType:x.budgetType||"",id:(l.find(r=>r.campaignId)||{}).campaignId||"",
   spend:t.spend,impressions:t.impressions,clicks:t.clicks,ctr:t.ctr,cpc:t.cpc,reach:t.reach,purchases:t.purchases,value:t.value,lpv:t.lpv,res,ads,rows:l}})}
function googleCampaigns(){const rows=((M.g&&M.g.rows)||[]).filter(r=>r.spend>0||r.impressions>0);
 return [...group(rows,r=>r.campaign)].map(([name,l])=>{const t=gagg(l),x=l[l.length-1],p=parseName({campaign:name,adset:"",ad:""}),dates=l.filter(r=>r.spend>0).map(r=>r.date).sort();
  const res=t.conversions>0?{n:t.conversions,label:"conversiones",cost:t.cpconv}:{n:t.clicks,label:"clics",cost:t.cpc};
  return {plat:"google",name,show:p.show,venue:p.venue,phase:p.phase,status:x.status||"",active:x.status==="active",channel:x.channel||"",start:dates[0]||l[0].date,last:dates[dates.length-1]||"",end:"",budget:Number(x.budget)||0,budgetType:"Diario",id:x.campaignId||"",
   spend:t.spend,impressions:t.impressions,clicks:t.clicks,ctr:t.ctr,cpc:t.cpc,purchases:0,value:t.value,conversions:t.conversions,res,ads:[],rows:l}})}
function campaigns(){const p=M.platform;return [...(p!=="google"?metaCampaigns():[]),...(p!=="meta"?googleCampaigns():[])].sort((a,b)=>(b.active-a.active)||(b.spend-a.spend))}

// --- Totales y comparación con el mes anterior (mismos días si es el mes en curso)
function totals(list){const t={spend:0,impressions:0,clicks:0,purchases:0,value:0,conversions:0,lpv:0};for(const c of list)for(const k in t)t[k]+=Number(c[k])||0;t.ctr=t.impressions?t.clicks/t.impressions*100:0;t.cpc=t.clicks?t.spend/t.clicks:0;return t}
function prevTotals(){const cut=M.month===thisMonth()?new Date().getDate():31,ok=r=>+String(r.date).slice(8,10)<=cut&&!r.dateEnd,t={spend:0,impressions:0,clicks:0};
 const src=[...(M.platform!=="google"?(M.prev&&M.prev.meta)||[]:[]),...(M.platform!=="meta"?(M.prev&&M.prev.google)||[]:[])];
 for(const r of src)if(ok(r)){t.spend+=Number(r.spend)||0;t.impressions+=Number(r.impressions)||0;t.clicks+=Number(r.clicks)||0}
 t.ctr=t.impressions?t.clicks/t.impressions*100:0;t.cpc=t.clicks?t.spend/t.clicks:0;t.has=src.length>0;return t}
function delta(cur,prev,inverse){if(!prev)return'';const v=(cur-prev)/prev*100;if(!isFinite(v))return'';const good=inverse?v<0:v>0,cls=Math.abs(v)<1?"":good?"up":"down";return '<i class="dg-delta '+cls+'">'+(v>0?"▲ ":v<0?"▼ ":"")+dec(Math.abs(v),0)+' %</i>'}

// --- Piezas de la pantalla
function head(){const hasG=M.g&&M.g.connected,ap=(M.data&&M.data.api)||{},cur=M.month===thisMonth();
 const rows=[...(M.platform!=="google"?prepared():[]),...(M.platform!=="meta"?((M.g&&M.g.rows)||[]):[])].filter(r=>r.spend>0);
 const first=rows.reduce((a,r)=>!a||r.date<a?r.date:a,""),last=rows.reduce((a,r)=>r.date>a?r.date:a,"");
 const src=[M.platform!=="google"?'<span class="dg-src meta"><i></i>Meta · '+(M.demo?"datos de ejemplo":M.data.source==="api"&&M.data.importedAt?"actualizado "+fwhen(M.data.importedAt):M.data.importedAt?"importado "+fwhen(M.data.importedAt):"sin datos")+'</span>':'',
  M.platform!=="meta"?'<span class="dg-src google"><i></i>Google Ads · '+(hasG?(M.g.receivedAt?"actualizado "+fwhen(M.g.receivedAt):"conectado"):"sin conectar")+'</span>':''].join("");
 return '<section class="dg-bar">'+
  '<div class="dg-period"><button type="button" class="dg-arrow" data-mm="'+prevMonth(M.month)+'" aria-label="Mes anterior">‹</button><div><b>'+esc(monthLabel(M.month))+'</b><small>'+(first?'Datos del '+fdate(first)+' al '+fdate(last)+(cur?' · mes en curso':''):'Sin gasto registrado')+'</small></div><button type="button" class="dg-arrow" data-mm="'+nextMonth(M.month)+'" aria-label="Mes siguiente"'+(M.month>=thisMonth()?" disabled":"")+'>›</button></div>'+
  '<div class="dg-seg" role="tablist">'+[["todo","Todo"],["meta","Meta"],["google","Google Ads"]].map(([k,v])=>'<button type="button" role="tab" class="'+(M.platform===k?"on ":"")+(k!=="todo"?"p-"+k:"")+'" data-mp="'+k+'">'+(k!=="todo"?'<i></i>':'')+v+'</button>').join("")+'</div>'+
  '<div class="dg-srcs">'+src+'</div>'+(M.platform!=="google"&&!M.demo?'<button type="button" class="dg-refresh" '+(ap.ready?'data-sync="1"':'data-mv="conexiones"')+' title="Leer ahora los datos de Meta">↻ Actualizar Meta</button>':'')+'</section>'+
  (!M.demo&&ap.ready&&ap.ok===false&&M.platform!=="google"?'<div class="card notice dg-err">La lectura automática de Meta ha fallado ('+esc(fwhen(ap.at))+'): '+esc(ap.error||"error desconocido")+'</div>':'')}
function tabs(){const list=[["panel","Resumen"],["campanas","Campañas"]];if(M.platform!=="google")list.push(["creatividades","Creatividades"]);if(M.platform!=="meta")list.push(["palabras","Palabras clave"]);list.push(["conexiones","Datos y conexión"]);
 if(!list.some(([k])=>k===M.view))M.view="panel";
 return '<nav class="dg-tabs">'+list.map(([k,v])=>'<button type="button" class="'+(M.view===k?"on":"")+'" data-mv="'+k+'">'+v+'</button>').join("")+'</nav>'}

function kpiCards(cs){const t=totals(cs),p=prevTotals(),cmp=p.has?' <small>vs. mismo periodo de '+esc(monthLabel(prevMonth(M.month)).toLowerCase())+'</small>':'';
 const card=(k,v,d,sub)=>'<div class="dg-kpi"><em>'+k+'</em><b>'+v+'</b><span>'+(d||'')+(sub?'<small>'+sub+'</small>':'')+'</span></div>';
 const byP=pl=>cs.filter(c=>c.plat===pl);
 let res="";
 if(M.platform!=="google"){const m=totals(byP("meta"));if(m.spend)res+=m.purchases?card('<i class="dot meta"></i>Compras Meta',int(m.purchases),'',eur(m.spend/m.purchases,2)+' por compra · ingresos '+eur(m.value)):card('<i class="dot meta"></i>Visitas a la web · Meta',int(m.lpv),'',m.lpv?eur(m.spend/m.lpv,2)+' por visita':'')}
 if(M.platform!=="meta"){const g=totals(byP("google"));if(g.spend)res+=g.conversions?card('<i class="dot google"></i>Conversiones Google',dec(g.conversions,g.conversions%1?1:0),'',eur(g.spend/g.conversions,2)+' por conversión'):card('<i class="dot google"></i>Clics Google',int(g.clicks),'',g.clicks?eur(g.spend/g.clicks,2)+' por clic':'')}
 return '<div class="dg-kpis">'+card("Inversión",eur(t.spend),delta(t.spend,p.spend),p.has?'vs. '+eur(p.spend)+' en '+esc(monthLabel(prevMonth(M.month)).split(" ")[0].toLowerCase()):'')+
  card("Impresiones",int(t.impressions),delta(t.impressions,p.impressions))+card("Clics",int(t.clicks),delta(t.clicks,p.clicks),t.impressions?'CTR '+pct(t.ctr,2):'')+card("Coste por clic",t.clicks?eur(t.cpc,2):"—",delta(t.cpc,p.cpc,true))+'</div>'+
  (res?'<div class="dg-kpis dg-res">'+res+'</div>':'')+(p.has?'<p class="dg-note">Flechas: comparación con '+esc(monthLabel(prevMonth(M.month)).toLowerCase())+(M.month===thisMonth()?' hasta el mismo día':'')+'. Compras y conversiones no se suman entre plataformas: cada una se atribuye las ventas a su manera.</p>':'<p class="dg-note">Compras y conversiones no se suman entre plataformas: cada una se atribuye las ventas a su manera.</p>')}

function dailyChart(cs){const by={};for(const c of cs)for(const r of c.rows){if(r.dateEnd)return '';const d=r.date;(by[d]=by[d]||{meta:0,google:0})[c.plat]+=Number(r.spend)||0}
 const y=+M.month.slice(0,4),mo=+M.month.slice(5,7),dim=new Date(y,mo,0).getDate(),days=[...Array(dim)].map((_,i)=>M.month+"-"+String(i+1).padStart(2,"0"));
 const max=Math.max(1,...days.map(d=>(by[d]?by[d].meta+by[d].google:0)));if(!Object.keys(by).length)return '';
 const W=Math.max(320,dim*22),H=150,bw=W/dim,sc=v=>v/max*(H-24);
 const bars=days.map((d,i)=>{const v=by[d]||{meta:0,google:0},hm=sc(v.meta),hg=sc(v.google),x=i*bw+bw*0.18,w=bw*0.64;return '<g><title>'+fdate(d)+': '+eur(v.meta+v.google,2)+(v.meta&&v.google?' (Meta '+eur(v.meta,2)+' · Google '+eur(v.google,2)+')':'')+'</title>'+(hg?'<rect class="g" x="'+x+'" y="'+(H-hg)+'" width="'+w+'" height="'+hg+'" rx="2"/>':'')+(hm?'<rect class="m" x="'+x+'" y="'+(H-hg-hm)+'" width="'+w+'" height="'+hm+'" rx="2"/>':'')+((i+1)%5===0||i===0?'<text x="'+(i*bw+bw/2)+'" y="'+(H+14)+'">'+(i+1)+'</text>':'')+'</g>'}).join("");
 return '<div class="dg-chart"><div class="dg-chart-h"><b>Inversión diaria</b><span>'+(M.platform!=="google"?'<i class="dot meta"></i>Meta &nbsp; ':'')+(M.platform!=="meta"?'<i class="dot google"></i>Google Ads':'')+' · máx. '+eur(max)+'/día</span></div><div class="dg-chart-s"><svg viewBox="0 0 '+W+' '+(H+18)+'" preserveAspectRatio="none" style="min-width:'+Math.min(W,dim*14)+'px"><line x1="0" x2="'+W+'" y1="'+H+'" y2="'+H+'"/>'+bars+'</svg></div></div>'}

function chip(txt,cls){return '<span class="dg-chip '+(cls||"")+'">'+txt+'</span>'}
function statusChip(c){return c.active?chip("Activa","on"):chip(({paused:"Pausada",archived:"Archivada",not_delivering:"Terminada",removed:"Eliminada",inactive:"Inactiva",permanently_deleted:"Eliminada"})[c.status]||"Sin gasto reciente")}
function campaignCard(c){const open=M.open===c.plat+":"+c.name,life=/toda la campa|lifetime/i.test(c.budgetType),daily=/diario|daily/i.test(c.budgetType)||c.plat==="google";
 const pctB=life&&c.budget?Math.min(100,c.spend/c.budget*100):0;
 const when=c.start?(fdate(c.start)+(c.end?' → '+fdate(c.end):c.active?' → sin fecha de fin':c.last&&c.last!==c.start?' → '+fdate(c.last):'')):'';
 const meta=[c.show&&c.show!=="SIN ASIGNAR"?'<b>'+esc(c.show)+'</b>':'<b class="warn">Sin espectáculo asignado</b>',c.venue&&!norm(c.show).includes(norm(c.venue))?esc(c.venue):'',c.plat==="google"&&c.channel?esc(CHANNEL[c.channel]||c.channel):c.phase&&c.phase!=="Otros"?esc(c.phase):'',when].filter(Boolean).join(' · ');
 let detail="";
 if(open){
  if(c.plat==="meta"&&c.ads.length)detail+='<div class="dg-ads">'+c.ads.map(a=>'<div class="dg-ad">'+(a.img?'<img src="'+esc(a.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'<span class="dg-noimg">Sin miniatura</span>')+'<div><b>'+esc(a.name)+'</b><small>'+eur(a.t.spend,2)+' · '+int(a.t.impressions)+' impr. · CTR '+(a.t.impressions?pct(a.t.ctr,2):"—")+(a.t.purchases?' · '+int(a.t.purchases)+' compras':a.t.lpv?' · '+int(a.t.lpv)+' visitas':'')+'</small></div></div>').join("")+'</div>';
  if(c.plat==="google"){const kw=((M.g&&M.g.keywords)||[]).filter(k=>k.campaign===c.name).sort((a,b)=>b.spend-a.spend).slice(0,8);if(kw.length)detail+='<div class="dg-kw"><em>Palabras clave con más gasto</em>'+kw.map(k=>'<span>'+esc(k.keyword)+' <small>'+eur(k.spend,2)+' · '+int(k.clicks)+' clics</small></span>').join("")+'</div>'}
  detail+='<div class="dg-camp-act"><label>Espectáculo <input list="dgShows" value="'+esc(c.show)+'" data-assign="'+esc(c.name)+'"'+(M.demo?" disabled":"")+'></label><a class="btn" target="_blank" rel="noopener" href="'+esc(c.plat==="meta"?adsUrl(c.id?"&selected_campaign_ids="+encodeURIComponent(c.id):""):gUrl)+'">Abrir en '+PLAT[c.plat].label+' ↗</a></div>'}
 return '<article class="dg-camp p-'+c.plat+(open?" open":"")+'"><button type="button" class="dg-camp-h" data-open="'+esc(c.plat+":"+c.name)+'">'+
  '<div class="dg-camp-t"><span class="dg-plat p-'+c.plat+'">'+PLAT[c.plat].label+'</span>'+statusChip(c)+'</div>'+
  '<h3>'+esc(c.name)+'</h3><p class="dg-camp-m">'+meta+'</p>'+
  '<div class="dg-camp-n"><span><em>Invertido</em><b>'+eur(c.spend,2)+'</b></span><span><em>'+esc(c.res.label.charAt(0).toUpperCase()+c.res.label.slice(1))+'</em><b>'+(c.res.n%1?dec(c.res.n,1):int(c.res.n))+'</b></span><span><em>€ / '+esc(({compras:"compra",conversiones:"conversión","visitas a la web":"visita",clics:"clic","clics en el enlace":"clic"})[c.res.label]||"resultado")+'</em><b>'+(c.res.n?eur(c.res.cost,2):"—")+'</b></span><span><em>CTR</em><b>'+(c.impressions?pct(c.ctr,2):"—")+'</b></span></div>'+
  (c.budget?'<div class="dg-budget"><span>'+(life?'Presupuesto total '+eur(c.budget)+' · gastado el '+pct(pctB,0):daily?'Presupuesto '+eur(c.budget)+' al día':'Presupuesto '+eur(c.budget))+'</span>'+(life?'<div class="dg-pbar"><i style="width:'+pctB+'%"></i></div>':'')+'</div>':'')+
  '</button>'+(open?'<div class="dg-camp-d">'+detail+'</div>':'')+'</article>'}
function campaignList(cs,limit){const list=limit?cs.filter(c=>c.active).slice(0,limit):cs.filter(c=>M.filter==="todas"||c.active||!cs.some(x=>x.active));
 const shows=[...new Set(cs.map(c=>c.show))];
 return (list.length?'<div class="dg-camps">'+list.map(campaignCard).join("")+'</div>':'<p class="muted">No hay campañas activas en este periodo.</p>')+'<datalist id="dgShows">'+shows.map(s=>'<option value="'+esc(s)+'">').join("")+'</datalist>'}

function showTable(cs){const map=new Map();for(const c of cs){if(!map.has(c.show))map.set(c.show,{meta:0,google:0,res:[],venue:c.venue,active:false});const x=map.get(c.show);x[c.plat]+=c.spend;x.active=x.active||c.active;x.res.push(c)}
 const list=[...map].map(([s,x])=>({s,...x,t:x.meta+x.google})).sort((a,b)=>b.t-a.t),max=Math.max(1,...list.map(x=>x.t)),budgets=budgetsNow();
 return '<div class="dg-shows">'+list.map(x=>{const b=Number(budgets[x.s])||0,mp=x.res.filter(c=>c.plat==="meta"),gp=x.res.filter(c=>c.plat==="google"),mt=totals(mp),gt=totals(gp),open=M.openShow===x.s;
  const r=[mt.spend?(mt.purchases?int(mt.purchases)+' compras Meta':int(mt.lpv)+' visitas Meta'):'',gt.spend?(gt.conversions?dec(gt.conversions,gt.conversions%1?1:0)+' conv. Google':int(gt.clicks)+' clics Google'):''].filter(Boolean).join(' · ');
  return '<div class="dg-show'+(open?" open":"")+'"><button type="button" class="dg-show-h" data-oshow="'+esc(x.s)+'"><div class="dg-show-n"><b>'+esc(x.s)+'</b><small>'+(x.active?'<i class="dot on"></i>Con campañas activas':'Sin campañas activas')+(r?' · '+r:'')+'</small></div><div class="dg-show-v"><b>'+eur(x.t)+'</b>'+(b?'<small>de '+eur(b)+' · '+pct(x.t/b*100,0)+'</small>':'')+'</div></button>'+
   '<div class="dg-sbar" title="Meta '+eur(x.meta)+' · Google '+eur(x.google)+'"><i class="m" style="width:'+(x.meta/max*100)+'%"></i><i class="g" style="width:'+(x.google/max*100)+'%"></i></div>'+
   (open?'<div class="dg-show-d"><label>Presupuesto digital del mes <input type="number" min="0" step="50" value="'+(b||"")+'" data-budget="'+esc(x.s)+'"'+(M.demo?" disabled":"")+'> €</label><span class="muted">'+x.res.length+(x.res.length===1?' campaña':' campañas')+' · Meta '+eur(x.meta)+' · Google '+eur(x.google)+'</span></div>':'')+'</div>'}).join("")+'</div>'}

function creativeGrid(cs){const ads=[];for(const c of cs.filter(c=>c.plat==="meta"))for(const a of c.ads)ads.push({...a,show:c.show,camp:c.name,active:c.active});
 if(!ads.length)return '<p class="muted">No hay anuncios de Meta con gasto en este periodo.</p>';
 ads.sort((a,b)=>b.t.spend-a.t.spend);const sales=ads.some(a=>a.t.purchases>0),best=(sales?ads.filter(a=>a.t.purchases>=3).sort((a,b)=>a.t.cpa-b.t.cpa):ads.filter(a=>a.t.lpv>=100).sort((a,b)=>a.t.cplpv-b.t.cplpv))[0];
 return '<div class="dg-crea">'+ads.map(a=>'<article class="dg-cr'+(a===best?" best":"")+'">'+(a.img?'<img src="'+esc(a.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'dg-noimg\',textContent:\'Sin miniatura\'}))">':'<span class="dg-noimg">Sin miniatura</span>')+
  '<div class="dg-cr-b">'+(a===best?'<em class="dg-best">Mejor resultado del mes</em>':'')+'<b>'+esc(a.name)+'</b><small>'+esc(a.show)+' · '+esc(a.camp)+'</small><div class="dg-cr-n"><span>'+eur(a.t.spend,2)+'</span><span>CTR '+(a.t.impressions?pct(a.t.ctr,2):"—")+'</span><span>'+(sales?(a.t.purchases?int(a.t.purchases)+' compras · '+eur(a.t.cpa,2):'0 compras'):(a.t.lpv?int(a.t.lpv)+' visitas · '+eur(a.t.cplpv,2):int(a.t.clicks)+' clics'))+'</span></div></div></article>').join("")+'</div>'}

function keywordTable(){const kw=((M.g&&M.g.keywords)||[]).slice().sort((a,b)=>b.spend-a.spend||b.clicks-a.clicks).slice(0,100);
 if(!kw.length)return '<p class="muted">No hay palabras clave con impresiones este mes. Las campañas de Máximo rendimiento, Display o Vídeo no usan palabras clave.</p>';
 const MT={EXACT:"Exacta",PHRASE:"Frase",BROAD:"Amplia"};
 return '<div class="dg-kwlist">'+kw.map(k=>'<div class="dg-kwrow"><div><b>'+esc(k.keyword)+'</b><small>'+esc(MT[k.match]||k.match||"")+' · '+esc(k.campaign)+'</small></div><span><em>Gasto</em>'+eur(k.spend,2)+'</span><span><em>Clics</em>'+int(k.clicks)+'</span><span><em>CPC</em>'+(k.clicks?eur(k.spend/k.clicks,2):"—")+'</span><span><em>Conv.</em>'+dec(k.conversions,k.conversions%1?1:0)+'</span></div>').join("")+'</div><p class="dg-note">Las 100 palabras clave con más gasto del mes.</p>'}

function connections(){const ap=(M.data&&M.data.api)||{},g=M.g||{};
 return '<section class="card dg-conn"><div class="section-title"><div><small class="section-kicker"><i class="dot meta"></i>Meta</small><h2>Facebook e Instagram</h2></div>'+(ap.ready?(ap.ok===false?'<span class="badge late">Error</span>':'<span class="badge ok">Conectado</span>'):'<span class="badge">Sin conectar</span>')+'</div>'+
  '<p class="muted">'+(ap.ready?'Se lee automáticamente cada mañana'+(ap.okAt?' · última lectura correcta '+esc(fwhen(ap.okAt)):' · todavía no se ha leído ninguna vez')+'. Token '+(ap.tokenSource==="app"?'guardado en Yellow Control':'leído de Netlify')+'.':'<b>La app no encuentra el token de Meta.</b> Pégalo aquí debajo (el que generaste en el usuario del sistema de Meta, con permiso ads_read).')+'</p>'+
  (ap.ready&&ap.ok===false?'<div class="bud-alert warn">Última lectura fallida ('+esc(fwhen(ap.at))+'): '+esc(ap.error||"")+'</div>':'')+
  (!ap.ready||ap.tokenSource==="app"||M.showToken?'<div class="dg-token"><input type="password" id="dgToken" autocomplete="off" placeholder="'+(ap.tokenSource==="app"?'Pega un token nuevo para sustituirlo':'Pega aquí el token de Meta')+'"><button type="button" class="primary" id="dgTokenSave">Guardar token</button>'+(ap.tokenSource==="app"?'<button type="button" id="dgTokenDel">Quitar</button>':'')+'</div><p class="dg-note">Solo administración. El token se guarda en el servidor y no vuelve a mostrarse.</p>':'')+
  '<div class="actions-row">'+(ap.ready?'<button type="button" class="primary" data-sync="1">Actualizar ahora</button>':'')+'<a class="btn" target="_blank" rel="noopener" href="'+esc(adsUrl())+'">Abrir en Meta ↗</a><button type="button" id="dgImp">Importar exportación de Excel</button></div>'+(M.showImport?importCard():'')+'</section>'+gConnect()}
function importCard(){return '<div class="dg-import"><ol class="mt-steps"><li>En el Administrador de anuncios, elige el periodo.</li><li>Pestaña <b>Anuncios</b> · <b>Desglose › Por tiempo › Día</b>.</li><li><b>Informes › Exportar datos de la tabla</b> (.csv o .xlsx) y súbelo aquí.</li></ol>'+
 (M.data&&M.data.api&&M.data.api.ready?'<p class="muted">Solo hace falta para meses anteriores: el mes en curso lo sustituye la lectura automática de cada mañana.</p>':'')+
 '<div class="actions-row"><button type="button" class="primary" id="mtPick">Elegir archivo</button><input type="file" id="mtFile" accept=".csv,.xlsx,.xls" hidden></div><div id="mtPrev"></div></div>'}

function render(){
 const cs=campaigns(),photo=M.platform==="google"?"/assets/tiles/google.webp":M.platform==="meta"?"/assets/tiles/meta.webp":"/assets/tiles/digital.webp";
 const sub=M.platform==="google"?"Google Ads":M.platform==="meta"?"Meta · Facebook e Instagram":"Meta y Google Ads";
 let body="";const has=cs.length>0;
 if(M.view==="conexiones")body=connections();
 else if(!has)body='<section class="card dg-empty"><h2>Sin gasto en '+esc(monthLabel(M.month))+'</h2><p class="muted">'+(M.platform==="google"&&!(M.g&&M.g.connected)?'Google Ads aún no está conectado.':'No hay campañas con impresiones este mes'+(M.platform==="todo"?'':' en '+PLAT[M.platform].label)+'.')+'</p><div class="actions-row"><button type="button" class="primary" data-mv="conexiones">Datos y conexión</button>'+(M.platform!=="google"?'<button type="button" id="mtDemo">Ver con datos de ejemplo</button>':'')+'</div></section>';
 else if(M.view==="panel"){const al=M.platform!=="google"?alerts(prepared().filter(r=>r.spend>0||r.impressions>0),budgetsNow()).filter(a=>a.lvl==="warn"):[];
  const act=cs.filter(c=>c.active);
  body='<section class="card">'+kpiCards(cs)+dailyChart(cs)+'</section>'+
   (al.length?'<section class="card dg-alerts"><div class="section-title"><div><small class="section-kicker">Avisos</small><h2>Requiere atención</h2></div><span class="badge warn">'+al.length+'</span></div>'+al.map(a=>'<div class="bud-alert warn">'+(a.show?'<b>'+esc(a.show)+'</b> · ':'')+a.text+'</div>').join("")+'</section>':'')+
   '<section class="card"><div class="section-title"><div><small class="section-kicker">'+act.length+(act.length===1?' activa':' activas')+' de '+cs.length+'</small><h2>Campañas activas</h2></div><button type="button" class="btn" data-mv="campanas">Ver todas</button></div>'+campaignList(cs,6)+'</section>'+
   '<section class="card"><div class="section-title"><div><small class="section-kicker">Inversión por espectáculo</small><h2>Espectáculos</h2></div>'+(M.platform==="todo"?'<span class="dg-legend"><i class="dot meta"></i>Meta &nbsp; <i class="dot google"></i>Google</span>':'')+'</div>'+showTable(cs)+'</section>'}
 else if(M.view==="campanas")body='<section class="card"><div class="section-title"><div><small class="section-kicker">'+esc(monthLabel(M.month))+'</small><h2>Campañas</h2></div><div class="dg-seg sm">'+[["activas","Activas"],["todas","Todas"]].map(([k,v])=>'<button type="button" class="'+((M.filter||"activas")===k?"on":"")+'" data-filter="'+k+'">'+v+'</button>').join("")+'</div></div>'+campaignList(cs)+'<p class="dg-note">Pulsa una campaña para ver sus anuncios o palabras clave y asignarla a otro espectáculo.</p></section>';
 else if(M.view==="creatividades")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Meta · '+esc(monthLabel(M.month))+'</small><h2>Creatividades</h2></div></div>'+creativeGrid(cs)+'</section>';
 else if(M.view==="palabras")body='<section class="card"><div class="section-title"><div><small class="section-kicker">Google Ads · '+esc(monthLabel(M.month))+'</small><h2>Palabras clave</h2></div></div>'+keywordTable()+'</section>';
 app.innerHTML=pageHead("Digital",sub,'',photo)+(M.demo?'<div class="card notice">Datos de ejemplo: no son reales ni se guardan. <button type="button" class="btn" id="dgDemoOff">Volver a los datos reales</button></div>':'')+head()+tabs()+body;
 bind()}

function bind(){
 $$("[data-mm]").forEach(b=>b.onclick=async()=>{if(b.disabled)return;M.month=b.dataset.mm;M.open=null;M.openShow=null;M.demo=false;try{await load()}catch(e){say(e.message)}render()});
 $$("[data-mp]").forEach(b=>b.onclick=()=>{M.platform=b.dataset.mp;M.open=null;render()});
 $$("[data-mv]").forEach(b=>b.onclick=()=>{M.view=b.dataset.mv;M.open=null;render();window.scrollTo({top:0,behavior:"smooth"})});
 $$("[data-filter]").forEach(b=>b.onclick=()=>{M.filter=b.dataset.filter;render()});
 $$("[data-open]").forEach(b=>b.onclick=()=>{M.open=M.open===b.dataset.open?null:b.dataset.open;render()});
 $$("[data-oshow]").forEach(b=>b.onclick=()=>{M.openShow=M.openShow===b.dataset.oshow?null:b.dataset.oshow;render()});
 $$("[data-assign]").forEach(inp=>{inp.onclick=e=>e.stopPropagation();inp.onchange=async()=>{const show=inp.value.trim().toUpperCase();try{const r=await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({map:{campaign:inp.dataset.assign,show}})});M.data.map=r.map;say("Campaña asignada a "+(show||"su nombre"));render()}catch(e){say("No se ha podido guardar: "+e.message)}}});
 $$("[data-budget]").forEach(inp=>inp.onchange=async()=>{try{const r=await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({month:M.month,show:inp.dataset.budget,budget:Number(inp.value)||0})});M.data.budgets=r.budgets;say("Presupuesto guardado");render()}catch(e){say("No se ha podido guardar: "+e.message)}});
 const demo=$("#mtDemo");if(demo)demo.onclick=()=>{M.demo=true;M.platform="meta";M.view="panel";render()};
 const doff=$("#dgDemoOff");if(doff)doff.onclick=()=>{M.demo=false;render()};
 $$("[data-sync]").forEach(sy=>sy.onclick=async()=>{const txt=sy.textContent;sy.disabled=true;sy.textContent="Leyendo Meta…";try{await api("/api/meta",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sync:true})});say("Datos de Meta actualizados");await load();render()}catch(e){say("No se ha podido leer Meta: "+e.message);sy.disabled=false;sy.textContent=txt}});
 const ts=$("#dgTokenSave");if(ts)ts.onclick=async()=>{const v=$("#dgToken").value.trim();if(!v){say("Pega el token primero");return}ts.disabled=true;try{await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({token:v})});say("Token guardado. Leyendo Meta…");try{await api("/api/meta",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sync:true})});say("Datos de Meta actualizados")}catch(e){say("Token guardado, pero Meta ha respondido: "+e.message)}await load();render()}catch(e){say("No se ha podido guardar: "+e.message);ts.disabled=false}};
 const td=$("#dgTokenDel");if(td)td.onclick=async()=>{if(!confirm("¿Quitar el token guardado en Yellow Control?"))return;try{await api("/api/meta",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({token:""})});await load();render()}catch(e){say(e.message)}};
 const imp=$("#dgImp");if(imp)imp.onclick=()=>{M.showImport=!M.showImport;render()};
 const pick=$("#mtPick");if(pick){const f=$("#mtFile");pick.onclick=()=>f.click();f.onchange=async()=>{const file=f.files[0];if(!file)return;const box=$("#mtPrev");box.innerHTML='<p class="muted">Leyendo '+esc(file.name)+'…</p>';
  try{const r=await readExport(file);M.pending=r.rows;M.pendingTotals=r.totals;const ms=[...new Set(r.rows.map(x=>x.month||x.date.slice(0,7)))].sort(),t=agg(r.rows);
   box.innerHTML='<div class="notice" style="text-align:left;margin-top:12px"><b>'+int(r.rows.length)+' filas</b> · '+ms.map(monthLabel).join(", ")+' · '+eur(t.spend,2)+' de gasto.'+(r.missing.length?'<br>No encuentro estas columnas: '+esc(r.missing.map(k=>r.labels[k]||k).join(", "))+'. Se importará sin ellas.':'')+'<br>'+(r.period?'Se sustituyen los datos de ese mes.':'Se sustituyen los datos de esos mismos días; el resto se conserva.')+'</div><div class="actions-row" style="margin-top:10px"><button type="button" class="primary" id="mtGo">Importar</button></div>';
   $("#mtGo").onclick=async()=>{try{const res=await api("/api/meta",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:M.pending,totals:M.pendingTotals})});M.pending=null;M.showImport=false;say("Exportación importada");M.month=res.imported[0].month;M.view="panel";M.platform="meta";await load();render()}catch(e){box.innerHTML+='<div class="notice">No se ha podido importar: '+esc(e.message)+'</div>'}}}
  catch(e){box.innerHTML='<div class="notice" style="text-align:left;margin-top:12px">'+esc(e.message)+'</div>'}}}
 const sh=$("#gaShow");if(sh)sh.onclick=async()=>{if(!M.gscript){try{const r=await api("/api/google-ads?script=1",{cache:"no-store"});M.gscript=gadsScript(r.endpoint,r.key);render()}catch(e){say("No se ha podido preparar el script: "+e.message)}return}
  try{await navigator.clipboard.writeText(M.gscript);say("Script copiado")}catch{const ta=$("#gaScript");ta.select();say("Selecciona y copia el texto")}};
 const ro=$("#gaRotate");if(ro)ro.onclick=async()=>{if(!confirm("La clave actual dejará de funcionar y tendrás que pegar el script nuevo en Google Ads. ¿Continuar?"))return;try{const r=await api("/api/google-ads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rotate:true})});const e=await api("/api/google-ads?script=1",{cache:"no-store"});M.gscript=gadsScript(e.endpoint,r.key||e.key);say("Clave nueva generada");render()}catch(e){say("No se ha podido: "+e.message)}};
}

// --- Google Ads: script y conexión
const CHANNEL={SEARCH:"Búsqueda",PERFORMANCE_MAX:"Máximo rendimiento",DISPLAY:"Display",VIDEO:"Vídeo",SHOPPING:"Shopping",DEMAND_GEN:"Demand Gen",DISCOVERY:"Discovery",MULTI_CHANNEL:"App",LOCAL:"Local",SMART:"Inteligente"};
function gagg(rows){const t={spend:0,impressions:0,clicks:0,conversions:0,value:0};for(const r of rows)for(const k in t)t[k]+=Number(r[k])||0;t.ctr=t.impressions?t.clicks/t.impressions*100:0;t.cpc=t.clicks?t.spend/t.clicks:0;t.cpconv=t.conversions?t.spend/t.conversions:0;t.roas=t.spend?t.value/t.spend:0;return t}
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
function gConnect(){const g=M.g||{};
 return '<section class="card dg-conn"><div class="section-title"><div><small class="section-kicker"><i class="dot google"></i>Google Ads</small><h2>Script de Google Ads</h2></div>'+(g.connected?'<span class="badge ok">Conectado</span>':'<span class="badge">Sin conectar</span>')+'</div>'+
 (g.lastAt?'<p class="muted">Último envío '+esc(fwhen(g.lastAt))+(g.account?' · cuenta '+esc(g.account):'')+'.</p>':'')+
 '<ol class="mt-steps"><li>En Google Ads: <b>Herramientas › Acciones en bloque › Secuencias de comandos</b> y pulsa <b>+</b>.</li><li>Borra lo que aparece, pega el script y ponle de nombre «Yellow Control».</li><li>Pulsa <b>Autorizar</b> y acepta con tu cuenta de Google.</li><li>Pulsa <b>Ejecutar</b> una vez: en unos segundos los datos salen aquí.</li><li>En la lista, en <b>Frecuencia</b>, elige <b>Diaria</b> a las 7:00.</li></ol>'+
 '<p class="muted">El script solo lee datos de la cuenta y los envía a Yellow Control con una clave propia. No cambia nada en Google Ads.</p>'+
 '<div class="actions-row"><button type="button" class="primary" id="gaShow">'+(M.gscript?'Copiar script':'Mostrar script')+'</button>'+(M.gscript?'<button type="button" id="gaRotate">Generar clave nueva</button>':'')+'</div>'+
 (M.gscript?'<textarea class="mt-script" id="gaScript" readonly rows="14">'+esc(M.gscript)+'</textarea>':'')+'</section>'}

window.metaModule=async function(ctx){({api,esc,pageHead,say,app,$,$$}=ctx);try{await load()}catch(e){app.innerHTML=pageHead("Digital","Meta y Google Ads")+'<div class="card notice">'+esc(e.status===403?"No tienes acceso a este módulo.":e.message)+'</div>';return}render()};
})();
