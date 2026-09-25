import type { Config } from "@netlify/functions";
import { requireAccess, can } from "./_lib/auth.ts";
import { carteleriaStore } from "./_lib/store.ts";
import { listRecords } from "./_lib/records.ts";
import { normalizeDate } from "./_lib/dates.ts";

type EventRow={id:string,date:string,module:string,title:string,location:string,action:string,status:string,recordId?:string};

export default async(req:Request)=>{
  const auth=await requireAccess(req,"calendario",false); if(auth.response)return auth.response;
  const events:EventRow[]=[];
  const state=await carteleriaStore().get("state",{type:"json"}) as any;
  const schedule=state?.schedule||{};
  for(const [key,v] of Object.entries(schedule) as any){
    const install=normalizeDate(v?.installDate||v?.date);
    const change=normalizeDate(v?.next);
    const remove=normalizeDate(v?.removeDate);
    const title=v?.title||key.replaceAll("__"," · ").replaceAll("_"," ");
    const location=key.split("__")[1]?.replaceAll("_"," ")||key;
    const status=v?.status||"programado";
    if(install) events.push({id:`cart-i-${key}`,date:install,module:"Cartelería",title,location,action:"Instalación",status});
    if(change) events.push({id:`cart-c-${key}`,date:change,module:"Cartelería",title,location,action:"Cambio previsto",status:"cambio próximo"});
    if(remove) events.push({id:`cart-r-${key}`,date:remove,module:"Cartelería",title,location,action:"Retirada",status});
  }
  if(can(auth.actor,"radio",false)){
    for(const r of await listRecords("radio")){
      if(r.startDate)events.push({id:`radio-i-${r.id}`,date:r.startDate,module:"Radio",title:r.spectacle||r.campaignName||"Campaña radio",location:r.station||"",action:"Inicio de campaña",status:r.status||"activo",recordId:r.id});
      if(r.endDate)events.push({id:`radio-f-${r.id}`,date:r.endDate,module:"Radio",title:r.spectacle||r.campaignName||"Campaña radio",location:r.station||"",action:"Fin de campaña",status:r.status||"activo",recordId:r.id});
    }
  }
  for(const moduleName of ["taxis","intercambiadores","hometicket","revistas"] as const){
    if(!can(auth.actor,moduleName,false)) continue;
    for(const r of await listRecords(moduleName)){
      const mod=moduleName==="taxis"?"Taxis":moduleName==="intercambiadores"?"Intercambiadores":moduleName==="revistas"?"Revistas":"Home Ticket";
      const location=moduleName==="hometicket"?[r.venue,r.position].filter(Boolean).join(" · "):moduleName==="revistas"?[r.magazine,r.venue].filter(Boolean).join(" · "):[r.venue,r.location||r.support].filter(Boolean).join(" · ");
      const title=r.spectacle||r.campaignName||(moduleName==="hometicket"?"Home Ticket":"Campaña");
      if(r.startDate)events.push({id:`${moduleName}-i-${r.id}`,date:r.startDate,module:mod,title,location,action:moduleName==="revistas"?"Página del mes":"Inicio",status:r.status||"activo",recordId:r.id});
      if(r.endDate&&moduleName!=="revistas")events.push({id:`${moduleName}-f-${r.id}`,date:r.endDate,module:mod,title,location,action:"Fin",status:r.status||"activo",recordId:r.id});
      if(moduleName==="revistas"&&r.deliveryDate)events.push({id:`revistas-e-${r.id}`,date:r.deliveryDate,module:mod,title,location,action:"Entrega de material",status:r.materialStatus||"pendiente",recordId:r.id});
    }
  }
  events.sort((a,b)=>a.date.localeCompare(b.date)||a.module.localeCompare(b.module));
  return Response.json({events});
};
export const config:Config={path:"/api/calendar-data"};
