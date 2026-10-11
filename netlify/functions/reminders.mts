import type { Config } from "@netlify/functions";
import { carteleriaStore, notificationStore } from "./_lib/store.ts";
import { listRecords, isActive } from "./_lib/records.ts";
import { normalizeDate, dayDiff, madridToday, madridHour } from "./_lib/dates.ts";
import { sendPavonMail, mailRecipients } from "./_lib/mailer.ts";
import { renderDigest } from "./_lib/digest.ts";
import { collectEvents, SLOT_NAMES } from "./_lib/calendar.ts";
import { appendAudit } from "./_lib/audit.ts";
import { sendPush, getSettings } from "./_lib/push.ts";

type Alert={key:string,date:string,days:number,module:string,title:string,location:string,action:string,materialStatus?:string,kind?:string};
type Current={module:string,title:string,location:string,materialStatus:string,endDate:string};
type End={module:string,title:string,date:string,days:number};

const MODULES=[
  ["radio","Radio"],
  ["taxis","Taxis"],
  ["intercambiadores","Intercambiadores"],
  ["hometicket","Home Ticket"],
  ["revistas","Revistas de Teatros"],
] as const;

function esc(v:string){return String(v||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m] as string));}

async function collect(now=new Date()){
  const alerts:Alert[]=[];
  const current:Current[]=[];
  const ends:End[]=[];
  const state=await carteleriaStore().get("state",{type:"json"}) as any;
  for(const [key,v] of Object.entries(state?.schedule||{}) as any){
    // Avisos por fecha de cambio ("Próximo") y por las fechas de instalación y retirada del editor.
    for(const [field,action] of [["next","Cambio previsto"],["installDate","Instalación"],["removeDate","Retirada"]] as const){
      const date=normalizeDate(v?.[field]); if(!date)continue;
      const d=dayDiff(now,date);
      if([7,3,1,0].includes(d))alerts.push({key:`cart-${key}-${field}-D${d}-${date}`,date,days:d,module:"Cartelería",title:v?.title||SLOT_NAMES[key]||key,location:SLOT_NAMES[key]||key,action,kind:field==="removeDate"?"retirada":"montaje"});
    }
  }

  for(const [moduleName,label] of MODULES){
    for(const r of await listRecords(moduleName)){
      const title=r.spectacle||r.campaignName||r.position||"Registro";
      const location=(r.magazine==="Revista Teatros"?"Teatros":r.magazine)||r.venue||r.station||r.location||r.support||"";
      const materialStatus=String(r.materialStatus||"sin indicar");
      if(isActive(r))current.push({module:label,title,location,materialStatus,endDate:r.endDate||""});

      if(r.deliveryDate && !["recibido","entregado","listo"].includes(materialStatus.toLowerCase())){
        const d=dayDiff(now,r.deliveryDate);
        if([7,3,1,0,-1].includes(d))alerts.push({
          key:`${moduleName}-material-${r.id}-D${d}-${r.deliveryDate}`,
          date:r.deliveryDate,days:d,module:label,title,location,
          action:d<0?"Material fuera de plazo":"Entrega de material",materialStatus,kind:"entrega"
        });
      }

      // El fin de campaña no requiere atención (casi todo termina a final de mes): se agrupa en la agenda
      if(r.endDate&&!r.deletedAt){
        const d=dayDiff(now,r.endDate);
        if(d>=0&&d<=6)ends.push({module:label,title,date:r.endDate,days:d});
      }
    }
  }
  return {alerts,current,ends};
}

async function dailyPush(now:Date,alerts:Alert[],forced:boolean){
  const day=madridToday(now),ns=notificationStore(),key=`push-daily-${day}`,st=await getSettings();
  if(!forced&&(await ns.get(key,{type:"json"})))return;
  const useToday=st.types.diario!==false,useUrgent=st.types.urgente!==false;
  if(!useToday&&!useUrgent)return;
  let today:any[]=[];
  if(useToday)try{today=(await collectEvents({id:"system",email:"Yellow Control",roles:["admin"],mode:"legacy"} as any)).filter(ev=>ev.date===day&&ev.kind!=="fin")
    .sort((a,b)=>String(a.time||"").localeCompare(String(b.time||"")));}catch{}
  const urgent=useUrgent?alerts.filter(a=>a.days<=1):[];
  if(!today.length&&!urgent.length)return;
  const lines=today.slice(0,3).map(ev=>(ev.time?ev.time+" ":"")+ev.title);
  if(today.length>3)lines.push(`y ${today.length-3} más`);
  const body=[today.length?lines.join(" · "):"",urgent.length?`${urgent.length} ${urgent.length===1?"aviso urgente":"avisos urgentes"} (cartelería o material)`:""].filter(Boolean).join(" — ");
  const title=today.length?`Hoy: ${today.length} ${today.length===1?"fecha":"fechas"} en el Calendario`:"Yellow Control · urgente";
  const r=await sendPush("all",{title,body,url:today.length?"/#calendario":"/#carteleria",tag:"diario"},today.length?"diario":"urgente");
  if(!forced)await ns.setJSON(key,{at:new Date().toISOString(),...r});
}

export default async(req?:Request)=>{
  const now=new Date();
  // Se programa a las 07:00 y 08:00 UTC; solo actúa cuando en Madrid son las 9 (verano e invierno).
  const forced=req?new URL(req.url).searchParams.get("force")==="1":false;
  // Se ejecuta cada hora. El aviso del móvil sale a la hora elegida en «Avisos»; el correo, a las 9 de Madrid.
  const hour=madridHour(now);let pushHour=9;try{pushHour=(await getSettings()).hour}catch{}
  if(!forced&&hour!==9&&hour!==pushHour){console.log(JSON.stringify({skipped:true,madridHour:hour}));return;}
  const {alerts,current,ends}=await collect(now);
  if(forced||hour===pushHour){try{await dailyPush(now,alerts,forced)}catch(e){console.error("push diario",String(e))}}
  if(!forced&&hour!==9)return;
  const ns=notificationStore();
  const pending:Alert[]=[];

  for(const a of alerts){
    const already=await ns.get(a.key,{type:"json"});
    // Si el aviso se registró pero el correo no llegó a enviarse, se vuelve a intentar.
    if(!already || !(already as any).sent)pending.push(a);
  }

  const day=madridToday(now);
  const digestKey=`daily-material-digest-${day}`;
  const digestAlready=await ns.get(digestKey,{type:"json"});
  const shouldSend=forced || (!(digestAlready as any)?.sent && (pending.length>0 || current.length>0));

  if(shouldSend){
    const appUrl=(Netlify.env.get("URL")||"https://yellow-control.netlify.app").replace(/\/$/,"");
    // Próximos 7 días desde el calendario (campañas, montajes, entregas e hitos).
    const until=new Date(day+"T12:00:00Z");until.setUTCDate(until.getUTCDate()+6);const last=until.toISOString().slice(0,10);
    let upcoming:any[]=[];
    try{upcoming=(await collectEvents({id:"system",email:"Yellow Control",roles:["admin"],mode:"legacy"} as any)).filter(ev=>ev.date>=day&&ev.date<=last&&ev.kind!=="fin")
      .map(ev=>({module:ev.module,title:ev.title,location:ev.location,action:ev.action,date:ev.date,time:ev.time||"",kind:ev.kind,link:`${appUrl}/#calendario?ev=${encodeURIComponent(ev.id)}`}));}catch{}
    // Lo que ya sale en "Requiere atención" no se repite en la semana.
    const seen=new Set(pending.map(a=>a.module+"|"+a.title+"|"+a.date));
    upcoming=upcoming.filter(u=>!seen.has(u.module+"|"+u.title+"|"+u.date));
    // Fin de campaña: una sola línea por día con el recuento por módulo
    const byDate=new Map<string,End[]>();for(const x of ends)byDate.set(x.date,[...(byDate.get(x.date)||[]),x]);
    for(const [date,list] of byDate){
      const mods=new Map<string,Set<string>>();for(const x of list){const m=mods.get(x.module)||new Set();m.add(x.title);mods.set(x.module,m)}
      const n=[...mods.values()].reduce((a,m)=>a+m.size,0);
      upcoming.push({module:"Campañas",title:n===1?"Termina 1 campaña":`Terminan ${n} campañas`,location:[...mods].map(([m,t])=>`${m} ${t.size}`).join(" · "),action:"Fin de campaña",date,time:"",kind:"fin",link:`${appUrl}/#archivo`});
    }
    upcoming.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time||"").localeCompare(String(b.time||"")));
    // Material activo: una línea por módulo, sin repetir la misma campaña (radio va por semanas)
    const grouped=new Map<string,Map<string,Current>>();
    for(const r of current){const m=grouped.get(r.module)||new Map();const k=r.title+"|"+r.location;const prev=m.get(k);if(!prev||String(r.endDate)>String(prev.endDate))m.set(k,r);grouped.set(r.module,m)}
    const currentLines=[...grouped].map(([module,m])=>{const list=[...m.values()],pend=list.filter(x=>!["recibido","entregado","listo"].includes(String(x.materialStatus).toLowerCase())).length;
      const names=[...new Set(list.map(x=>x.title))];const last=list.map(x=>x.endDate).filter(Boolean).sort().slice(-1)[0]||"";
      return {module,title:names.slice(0,6).join(", ")+(names.length>6?` y ${names.length-6} más`:""),location:`${list.length} ${list.length===1?"campaña":"campañas"}`,action:"En curso",date:last,materialStatus:pend?`${pend} ${pend===1?"pendiente":"pendientes"}`:"al día"}});
    const currentTotal=[...grouped.values()].reduce((a,m)=>a+m.size,0);
    const rcp=mailRecipients();
    const subject=(forced?"[Prueba] ":"")+`Yellow Control · ${pending.length?pending.length+(pending.length===1?" aviso requiere":" avisos requieren")+" atención":"sin avisos urgentes"} · ${upcoming.length} ${upcoming.length===1?"fecha":"fechas"} esta semana`;
    const html=renderDigest({day,test:forced,appUrl,devRecipient:rcp.live?"":rcp.to[0],
      pending:pending.sort((x,y)=>x.days-y.days).map(a=>({...a,location:a.module==="Cartelería"?a.location.replaceAll("__"," · ").replaceAll("_"," "):a.location})),
      upcoming,
      current:currentLines,currentTotal});
    const result=await sendPavonMail({subject,html});
    // Una prueba no cuenta como envío del día: no marca avisos ni resumen.
    if(forced){console.log(JSON.stringify({test:true,alerts:alerts.length,pending:pending.length,current:current.length,sent:result.sent}));return;}
    await ns.setJSON(digestKey,{createdAt:new Date().toISOString(),sent:result.sent,emailId:(result as any).id||null,alerts:pending.length,current:current.length});
    await appendAudit({actor:{id:"system",email:"Yellow Control"},module:"avisos",elementId:digestKey,action:result.sent?"digest_sent":"digest_pending",after:{pending:pending.length,current:current.length}});
    for(const a of pending)await ns.setJSON(a.key,{...a,createdAt:new Date().toISOString(),sent:result.sent,emailId:(result as any).id||null});
    console.log(JSON.stringify({alerts:alerts.length,pending:pending.length,current:current.length,sent:result.sent}));
    return;
  }

  console.log(JSON.stringify({alerts:alerts.length,pending:pending.length,current:current.length,sent:false,reason:"nothing_new"}));
};

export const config:Config={schedule:"0 * * * *"};
