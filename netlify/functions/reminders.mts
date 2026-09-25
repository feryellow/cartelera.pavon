import type { Config } from "@netlify/functions";
import { carteleriaStore, notificationStore } from "./_lib/store.ts";
import { listRecords, isActive } from "./_lib/records.ts";
import { normalizeDate, dayDiff } from "./_lib/dates.ts";
import { sendPavonMail } from "./_lib/mailer.ts";
import { appendAudit } from "./_lib/audit.ts";

type Alert={key:string,date:string,days:number,module:string,title:string,location:string,action:string,materialStatus?:string};
type Current={module:string,title:string,location:string,materialStatus:string,endDate:string};

const MODULES=[
  ["radio","Radio"],
  ["taxis","Taxis"],
  ["intercambiadores","Intercambiadores"],
  ["hometicket","Home Ticket"],
  ["revistas","Revistas"],
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
      if([7,3,1,0].includes(d))alerts.push({key:`cart-${key}-${field}-D${d}-${date}`,date,days:d,module:"Cartelería",title:v?.title||key.replaceAll("__"," · ").replaceAll("_"," "),location:key,action});
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
          action:d<0?"Material fuera de plazo":"Entrega de material",materialStatus
        });
      }

      if(r.endDate){
        const d=dayDiff(now,r.endDate);
        if([3,1,0].includes(d))alerts.push({
          key:`${moduleName}-fin-${r.id}-D${d}-${r.endDate}`,
          date:r.endDate,days:d,module:label,title,location,action:"Fin de campaña",materialStatus
        });
      }
    }
  }
  return {alerts,current};
}

export default async()=>{
  const now=new Date();
  const {alerts,current}=await collect(now);
  const ns=notificationStore();
  const pending:Alert[]=[];

  for(const a of alerts){
    const already=await ns.get(a.key,{type:"json"});
    // Si el aviso se registró pero el correo no llegó a enviarse, se vuelve a intentar.
    if(!already || !(already as any).sent)pending.push(a);
  }

  const day=now.toISOString().slice(0,10);
  const digestKey=`daily-material-digest-${day}`;
  const digestAlready=await ns.get(digestKey,{type:"json"});
  const shouldSend=!(digestAlready as any)?.sent && (pending.length>0 || current.length>0);

  if(shouldSend){
    const pendingHtml=pending.length?'<h3 style="margin-top:22px">Requiere atención</h3><table style="border-collapse:collapse;width:100%"><tr><th align="left">Módulo</th><th align="left">Material</th><th align="left">Estado</th><th align="left">Fecha</th></tr>'+
      pending.map(a=>`<tr><td style="padding:7px;border-top:1px solid #ddd">${esc(a.module)}</td><td style="padding:7px;border-top:1px solid #ddd"><strong>${esc(a.title)}</strong><br><small>${esc(a.location)}</small><br><small>${esc(a.action)}</small></td><td style="padding:7px;border-top:1px solid #ddd">${esc(a.materialStatus||"")}</td><td style="padding:7px;border-top:1px solid #ddd">${esc(a.date)}${a.days<0?" · FUERA DE PLAZO":a.days===0?" · HOY":` · D-${a.days}`}</td></tr>`).join("")+'</table>':
      '<p>No hay entregas nuevas que requieran aviso hoy.</p>';

    const currentHtml=current.length?'<h3 style="margin-top:22px">Material activo ahora</h3><table style="border-collapse:collapse;width:100%"><tr><th align="left">Módulo</th><th align="left">Material</th><th align="left">Estado</th><th align="left">Fin</th></tr>'+
      current.map(r=>`<tr><td style="padding:7px;border-top:1px solid #ddd">${esc(r.module)}</td><td style="padding:7px;border-top:1px solid #ddd"><strong>${esc(r.title)}</strong><br><small>${esc(r.location)}</small></td><td style="padding:7px;border-top:1px solid #ddd">${esc(r.materialStatus)}</td><td style="padding:7px;border-top:1px solid #ddd">${esc(r.endDate||"—")}</td></tr>`).join("")+'</table>':
      '<p>No hay campañas activas registradas.</p>';

    const subject=`Pavón Control · material y campañas · ${day}`;
    const html=`<div style="font-family:Arial,sans-serif;color:#222"><h2>Pavón Control</h2><p>Resumen diario de material activo y entregas pendientes.</p>${pendingHtml}${currentHtml}</div>`;
    const result=await sendPavonMail({subject,html});
    await ns.setJSON(digestKey,{createdAt:new Date().toISOString(),sent:result.sent,emailId:(result as any).id||null,alerts:pending.length,current:current.length});
    await appendAudit({actor:{id:"system",email:"Pavón Control"},module:"avisos",elementId:digestKey,action:result.sent?"digest_sent":"digest_pending",after:{pending:pending.length,current:current.length}});
    for(const a of pending)await ns.setJSON(a.key,{...a,createdAt:new Date().toISOString(),sent:result.sent,emailId:(result as any).id||null});
    console.log(JSON.stringify({alerts:alerts.length,pending:pending.length,current:current.length,sent:result.sent}));
    return;
  }

  console.log(JSON.stringify({alerts:alerts.length,pending:pending.length,current:current.length,sent:false,reason:"nothing_new"}));
};

export const config:Config={schedule:"0 7 * * *"};
