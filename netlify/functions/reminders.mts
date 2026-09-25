import type { Config } from "@netlify/functions";
import { carteleriaStore, notificationStore } from "./_lib/store.ts";
import { listRecords } from "./_lib/records.ts";
import { normalizeDate, dayDiff } from "./_lib/dates.ts";
import { sendPavonMail } from "./_lib/mailer.ts";
import { appendAudit } from "./_lib/audit.ts";

type Alert={key:string,date:string,days:number,module:string,title:string,location:string,action:string};

async function collect(now=new Date()){
  const alerts:Alert[]=[];
  const state=await carteleriaStore().get("state",{type:"json"}) as any;
  for(const [key,v] of Object.entries(state?.schedule||{}) as any){
    const date=normalizeDate(v?.next); if(!date)continue;
    const d=dayDiff(now,date); if([7,3,1].includes(d))alerts.push({key:`cart-${key}-D${d}-${date}`,date,days:d,module:"Cartelería",title:key.replaceAll("__"," · ").replaceAll("_"," "),location:key,action:"Cambio previsto"});
  }
  for(const moduleName of ["radio","publicidad"] as const){
    for(const r of await listRecords(moduleName)){
      if(!r.endDate)continue; const d=dayDiff(now,r.endDate);
      if([7,3,1].includes(d))alerts.push({key:`${moduleName}-${r.id}-D${d}-${r.endDate}`,date:r.endDate,days:d,module:moduleName==="radio"?"Radio":"Publicidad",title:r.spectacle||r.campaignName||"Campaña",location:r.station||r.location||r.support||"",action:"Fin de campaña"});
    }
  }
  return alerts;
}

export default async()=>{
  const alerts=await collect(new Date());
  const sent=[]; const pending=[];
  const ns=notificationStore();
  for(const a of alerts){
    const already=await ns.get(a.key,{type:"json"}); if(already)continue;
    const subject=`Pavón · aviso D-${a.days} · ${a.title}`;
    const html=`<div style="font-family:Arial,sans-serif"><h2>Pavón Control</h2><p><strong>${a.module}</strong> · ${a.action}</p><p>${a.title}</p><p>${a.location}</p><p>Fecha prevista: <strong>${a.date}</strong> · faltan ${a.days} días.</p></div>`;
    const result=await sendPavonMail({subject,html});
    await ns.setJSON(a.key,{...a,createdAt:new Date().toISOString(),sent:result.sent,emailId:(result as any).id||null});
    await appendAudit({actor:{id:"system",email:"Pavón Control"},module:"avisos",elementId:a.key,action:result.sent?"reminder_sent":"reminder_pending",after:a});
    (result.sent?sent:pending).push(a);
  }
  console.log(JSON.stringify({alerts:alerts.length,sent:sent.length,pending:pending.length}));
};

export const config:Config={schedule:"0 7 * * *"};
