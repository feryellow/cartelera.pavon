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
  if(can(auth.actor,"publicidad",false)){
    for(const r of await listRecords("publicidad")){
      const mod=String(r.category||"").toLowerCase()==="intercambiador"?"Intercambiadores":"Publicidad";
      if(r.startDate)events.push({id:`pub-i-${r.id}`,date:r.startDate,module:mod,title:r.spectacle||"Campaña",location:r.location||r.support||"",action:"Inicio de campaña",status:r.status||"activo",recordId:r.id});
      if(r.endDate)events.push({id:`pub-f-${r.id}`,date:r.endDate,module:mod,title:r.spectacle||"Campaña",location:r.location||r.support||"",action:"Fin de campaña",status:r.status||"activo",recordId:r.id});
    }
  }
  events.sort((a,b)=>a.date.localeCompare(b.date)||a.module.localeCompare(b.module));
  return Response.json({events});
};
export const config:Config={path:"/api/calendar-data"};
