import type { Config } from "@netlify/functions";
import { notificationStore } from "./_lib/store.ts";
import { madridToday, madridHour } from "./_lib/dates.ts";
import { mailRecipients } from "./_lib/mailer.ts";
import { collectIssues, type EngineResult } from "./_lib/engine.ts";
import { renderNewsletter, newsletterImages, headlineFor } from "./_lib/newsletter.ts";
import { notifyEmail, notifyPush, recordHealth } from "./_lib/notify.ts";
import { collectEvents } from "./_lib/calendar.ts";
import { appendAudit } from "./_lib/audit.ts";
import { getSettings } from "./_lib/push.ts";
import { listDiseno, getSettings as disenoSettings, OPEN as DISENO_OPEN } from "./_lib/diseno.ts";

async function dailyPush(now:Date,engine:EngineResult,forced:boolean){
  const day=madridToday(now),ns=notificationStore(),key=`push-daily-${day}`,st=await getSettings();
  if(!forced&&(await ns.get(key,{type:"json"})))return;
  const useToday=st.types.diario!==false,useUrgent=st.types.urgente!==false;
  if(!useToday&&!useUrgent)return;
  // Solo de lunes a viernes y nunca en festivo (lista de «Avisos» o un hito del Calendario que empiece por «Festivo»)
  const dow=new Date(day+"T12:00:00Z").getUTCDay();
  if(!forced&&(dow===0||dow===6||(st.holidays||[]).includes(day)))return;
  let events:any[]=[];
  try{events=await collectEvents({id:"system",email:"Yellow Control",roles:["admin"],mode:"legacy"} as any)}catch{}
  if(!forced&&events.some(ev=>ev.date===day&&/^festivo/i.test(String(ev.title||"").trim())))return;
  let today:any[]=[];
  if(useToday)today=events.filter(ev=>ev.date===day&&ev.kind!=="fin").sort((a,b)=>String(a.time||"").localeCompare(String(b.time||"")));
  const urgent=useUrgent?engine.issues:[];
  if(!today.length&&!urgent.length)return;
  const lines=today.slice(0,3).map(ev=>(ev.time?ev.time+" ":"")+ev.title);
  if(today.length>3)lines.push(`y ${today.length-3} más`);
  const body=[today.length?lines.join(" · "):"",urgent.length?`${urgent.length} ${urgent.length===1?"cosa por resolver":"cosas por resolver"}: ${engine.sections.map(x=>x.name+" "+x.count).join(", ")}`:""].filter(Boolean).join(" — ");
  const title=today.length?`Hoy: ${today.length} ${today.length===1?"fecha":"fechas"} en el Calendario`:`Yellow Control · ${urgent.length} por resolver`;
  const r=await notifyPush("all",{title,body,url:"/",tag:"diario"},today.length?"diario":"urgente");
  if(!forced)await ns.setJSON(key,{at:new Date().toISOString(),...r});
}

// Diseño: aviso al móvil de quien pidió la pieza, una sola vez, el día laborable antes de la fecha límite
// (un viernes avisa también de lo que vence el fin de semana y el lunes)
async function disenoPush(now:Date,forced:boolean){
  const day=madridToday(now),st=await getSettings(),hol=new Set(st.holidays||[]);
  const work=(iso:string)=>{const d=new Date(iso+"T12:00:00Z").getUTCDay();return d!==0&&d!==6&&!hol.has(iso)};
  if(!forced&&!work(day))return;
  const next=new Date(day+"T12:00:00Z");do{next.setUTCDate(next.getUTCDate()+1)}while(!work(next.toISOString().slice(0,10)));
  const until=next.toISOString().slice(0,10),ns=notificationStore(),people=(await disenoSettings()).people;
  const due=(await listDiseno()).filter(r=>DISENO_OPEN.includes(r.status)&&r.deadline&&r.deadline>day&&r.deadline<=until);
  const byPerson=new Map<string,any[]>();for(const r of due){const k=`diseno-${r.id}-${r.deadline}`;if(!forced&&(await ns.get(k,{type:"json"})))continue;byPerson.set(r.requester,[...(byPerson.get(r.requester)||[]),r])}
  for(const [name,list] of byPerson){const email=people.find(p=>p.name===name)?.email;if(!email)continue;
    const title=list.length===1?`Mañana vence: ${list[0].title}`.slice(0,80):`Mañana vencen ${list.length} piezas de diseño`;
    const body=list.length===1?`${list[0].company} · avance ${list[0].progress||0} %`:list.slice(0,3).map(r=>r.title).join(" · ")+(list.length>3?` y ${list.length-3} más`:"");
    await notifyPush({only:[email]},{title,body,url:"/#diseno",tag:"diseno"},"diseno");
    if(!forced)for(const r of list)await ns.setJSON(`diseno-${r.id}-${r.deadline}`,{at:new Date().toISOString()});}
}

export default async(req?:Request)=>{
  const now=new Date();
  const forced=req?new URL(req.url).searchParams.get("force")==="1":false;
  // Se ejecuta cada hora en horario de trabajo. El aviso del móvil sale a la hora elegida en «Avisos»; el correo, a las 9 de Madrid.
  const hour=madridHour(now);let pushHour=9;try{pushHour=(await getSettings()).hour}catch{}
  if(!forced&&hour!==9&&hour!==pushHour){console.log(JSON.stringify({skipped:true,madridHour:hour}));return;}
  const appUrl=(Netlify.env.get("URL")||"https://yellow-control.netlify.app").replace(/\/$/,"");
  const origin=req?new URL(req.url).origin:appUrl;
  // Una sola fuente de verdad: el Status Engine decide qué está mal; el móvil y el correo solo lo comunican
  let engine:EngineResult;
  try{engine=await collectIssues({origin:/^https?:\/\/localhost/.test(origin)?origin:appUrl})}catch(err){console.error("engine",String(err));await recordHealth("engine",false,String(err));return;}
  await recordHealth("engine",true,`${engine.total} incidencias`);
  if(forced||hour===pushHour){try{await dailyPush(now,engine,forced)}catch(e){console.error("push diario",String(e))}}
  if(forced||hour===pushHour){try{await disenoPush(now,forced)}catch(e){console.error("push diseño",String(e))}}
  if(!forced&&hour!==9)return;
  const day=madridToday(now),ns=notificationStore(),digestKey=`daily-material-digest-${day}`;
  // Sin incidencias no hay correo
  if(engine.total===0){console.log(JSON.stringify({sent:false,reason:"no_issues",total:0}));await ns.setJSON(digestKey,{createdAt:new Date().toISOString(),sent:false,reason:"no_issues"});return;}
  if(!forced&&(await ns.get(digestKey,{type:"json"}) as any)?.sent){console.log(JSON.stringify({sent:false,reason:"nothing_new"}));return;}
  const rcp=mailRecipients();
  const attachments=await newsletterImages(engine.issues).catch(()=>[]);
  const html=renderNewsletter(engine,{appUrl,test:forced,devRecipient:rcp.live?"":rcp.to[0]});
  const subject=(forced?"[Prueba] ":"")+`Yellow Control · ${engine.total} ${engine.total===1?"cosa por resolver":"cosas por resolver"} · ${headlineFor(day)}`;
  const result:any=await notifyEmail({kind:"correo diario",subject,html,attachments});
  if(forced){console.log(JSON.stringify({test:true,total:engine.total,sent:result.sent}));return;}
  await ns.setJSON(digestKey,{createdAt:new Date().toISOString(),sent:!!result.sent,emailId:result.id||null,total:engine.total});
  await appendAudit({actor:{id:"system",email:"Yellow Control"},module:"avisos",elementId:digestKey,action:result.sent?"digest_sent":"digest_pending",note:`Correo diario: ${engine.total} incidencias`});
  console.log(JSON.stringify({total:engine.total,sent:!!result.sent}));
};

// Madrid 6:00–23:00 (invierno y verano) en vez de las 24 horas
export const config:Config={schedule:"0 4-21 * * *"};
