import type { Config } from "@netlify/functions";
import { carteleriaStore, notificationStore } from "./_lib/store.ts";
import { listRecords, isActive } from "./_lib/records.ts";
import { normalizeDate, dayDiff, madridToday, madridHour } from "./_lib/dates.ts";
import { sendPavonMail, mailRecipients } from "./_lib/mailer.ts";
import { renderDigest } from "./_lib/digest.ts";
import { collectEvents } from "./_lib/calendar.ts";
import { appendAudit } from "./_lib/audit.ts";

type Alert={key:string,date:string,days:number,module:string,title:string,location:string,action:string,materialStatus?:string,kind?:string};
type Current={module:string,title:string,location:string,materialStatus:string,endDate:string};

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
  const state=await carteleriaStore().get("state",{type:"json"}) as any;
  for(const [key,v] of Object.entries(state?.schedule||{}) as any){
    // Avisos por fecha de cambio ("Próximo") y por las fechas de instalación y retirada del editor.
    for(const [field,action] of [["next","Cambio previsto"],["installDate","Instalación"],["removeDate","Retirada"]] as const){
      const date=normalizeDate(v?.[field]); if(!date)continue;
      const d=dayDiff(now,date);
      if([7,3,1,0].includes(d))alerts.push({key:`cart-${key}-${field}-D${d}-${date}`,date,days:d,module:"Cartelería",title:v?.title||key.replaceAll("__"," · ").replaceAll("_"," "),location:key,action,kind:field==="removeDate"?"retirada":"montaje"});
    }
  }

  for(const [moduleName,label] of MODULES){
    for(const r of await listRecords(moduleName)){
      const title=r.spectacle||r.campaignName||r.position||"Registro";
      const location=r.magazine||r.venue||r.station||r.location||r.support||"";
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

      if(r.endDate){
        const d=dayDiff(now,r.endDate);
        if([3,1,0].includes(d))alerts.push({
          key:`${moduleName}-fin-${r.id}-D${d}-${r.endDate}`,
          date:r.endDate,days:d,module:label,title,location,action:"Fin de campaña",materialStatus,kind:"fin"
        });
      }
    }
  }
  return {alerts,current};
}

export default async(req?:Request)=>{
  const now=new Date();
  // Se programa a las 07:00 y 08:00 UTC; solo actúa cuando en Madrid son las 9 (verano e invierno).
  const forced=req?new URL(req.url).searchParams.get("force")==="1":false;
  if(!forced&&madridHour(now)!==9){console.log(JSON.stringify({skipped:true,madridHour:madridHour(now)}));return;}
  const {alerts,current}=await collect(now);
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
    const appUrl=(Netlify.env.get("URL")||"https://cartelera-pavon.netlify.app").replace(/\/$/,"");
    // Próximos 7 días desde el calendario (campañas, montajes, entregas e hitos).
    const until=new Date(day+"T12:00:00Z");until.setUTCDate(until.getUTCDate()+6);const last=until.toISOString().slice(0,10);
    let upcoming:any[]=[];
    try{upcoming=(await collectEvents({id:"system",email:"Yellow Control",roles:["admin"],mode:"legacy"} as any)).filter(ev=>ev.date>=day&&ev.date<=last)
      .map(ev=>({module:ev.module,title:ev.title,location:ev.location,action:ev.action,date:ev.date,time:ev.time||"",kind:ev.kind,link:`${appUrl}/#calendario?ev=${encodeURIComponent(ev.id)}`}));}catch{}
    // Lo que ya sale en "Requiere atención" no se repite en la semana.
    const seen=new Set(pending.map(a=>a.module+"|"+a.title+"|"+a.date));
    upcoming=upcoming.filter(u=>!seen.has(u.module+"|"+u.title+"|"+u.date));
    const rcp=mailRecipients();
    const subject=(forced?"[Prueba] ":"")+`Yellow Control · ${pending.length?pending.length+(pending.length===1?" aviso":" avisos"):"sin avisos urgentes"} · ${day.split("-").reverse().join("/")}`;
    const html=renderDigest({day,test:forced,appUrl,devRecipient:rcp.live?"":rcp.to[0],
      pending:pending.sort((x,y)=>x.days-y.days).map(a=>({...a,location:a.module==="Cartelería"?a.location.replaceAll("__"," · ").replaceAll("_"," "):a.location})),
      upcoming,
      current:current.map(r=>({module:r.module,title:r.title,location:r.location,action:"En curso",date:r.endDate,materialStatus:r.materialStatus}))});
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

export const config:Config={schedule:"0 7,8 * * *"};
