import type { Config } from "@netlify/functions";
import { requireAccess, can } from "./_lib/auth.ts";
import { appendAudit, listAudit } from "./_lib/audit.ts";
import { carteleriaStore } from "./_lib/store.ts";
import { normalizeDate } from "./_lib/dates.ts";
import { cleanInput, getRecord, isActive, listRecords, putRecord, validModule } from "./_lib/records.ts";

function json(data: unknown, status=200){ return Response.json(data,{status}); }

export default async (req: Request) => {
  const url = new URL(req.url);
  const moduleName = url.searchParams.get("module") || "dashboard";

  if (req.method === "GET") {
    if (moduleName === "audit") {
      const auth = await requireAccess(req,"archivo",false); if(auth.response) return auth.response;
      return json({ rows: await listAudit(Number(url.searchParams.get("limit") || 100)) });
    }
    if (moduleName === "dashboard") {
      const auth = await requireAccess(req,"dashboard",false); if(auth.response) return auth.response;
      const state = await carteleriaStore().get("state",{type:"json"}) as any || {schedule:{},updatedAt:null};
      const schedule = state.schedule || {};
      const today = new Date().toISOString().slice(0,10);
      const carteleria = Object.entries(schedule).map(([key,v]: any)=>{
        // Fecha más próxima entre "Próximo", instalación y retirada; si todas han pasado, la más reciente.
        const dates=[v?.next,v?.installDate,v?.removeDate].map(normalizeDate).filter(Boolean) as string[];
        const future=dates.filter(x=>x>=today).sort(), past=dates.filter(x=>x<today).sort();
        return { key, title:v?.title||"", date:v?.date||"", next: future[0] || past[past.length-1] || "" };
      });
      const payload:any = { carteleria, carteleriaUpdatedAt:state.updatedAt||null, latest:await listAudit(8), attention:[], currentMaterial:[] };
      const addModule=async(moduleName:"radio"|"taxis"|"intercambiadores"|"hometicket"|"revistas",label:string)=>{
        if(!can(auth.actor,moduleName,false))return;
        const rows=await listRecords(moduleName);
        payload[moduleName]={total:rows.length,active:rows.filter(r=>isActive(r)).length};
        for(const r of rows){
          const title=r.spectacle||r.campaignName||r.position||"Registro";
          const place=r.magazine||r.venue||r.station||r.location||r.support||"";
          if(isActive(r)) payload.currentMaterial.push({module:label,venue:r.venue||"",title,place,materialStatus:r.materialStatus||"sin indicar",endDate:r.endDate||""});
          if(r.deliveryDate && !["recibido","entregado","listo"].includes(String(r.materialStatus||"").toLowerCase())){
            payload.attention.push({module:label,venue:r.venue||"",title,place,deliveryDate:r.deliveryDate,materialStatus:r.materialStatus||"pendiente",overdue:r.deliveryDate<today});
          }
        }
      };
      await addModule("radio","Radio");
      await addModule("taxis","Taxis");
      await addModule("intercambiadores","Intercambiadores");
      await addModule("hometicket","Home Ticket");
      await addModule("revistas","Revistas de Teatros");
      payload.attention.sort((a:any,b:any)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate)));
      payload.currentMaterial.sort((a:any,b:any)=>String(a.module).localeCompare(String(b.module))||String(a.title).localeCompare(String(b.title)));
      return json(payload);
    }
    if (!validModule(moduleName)) return json({error:"Unknown module"},400);
    const auth = await requireAccess(req,moduleName,false); if(auth.response) return auth.response;
    let rows=await listRecords(moduleName, url.searchParams.get("includeDeleted")==="1");
    const q=(url.searchParams.get("q")||"").toLowerCase();
    if(q) rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
    if(url.searchParams.get("active")==="1") rows=rows.filter(r=>isActive(r));
    return json({ rows });
  }

  if (!validModule(moduleName)) return json({error:"Unknown module"},400);
  const auth = await requireAccess(req,moduleName,true); if(auth.response) return auth.response;

  if (req.method === "POST") {
    let body:any; try{body=await req.json();}catch{return json({error:"Invalid JSON"},400);}
    const clean=cleanInput(moduleName,body);
    const id=crypto.randomUUID(), now=new Date().toISOString();
    const row={id,...clean,createdAt:now,updatedAt:now,createdBy:auth.actor!.email,updatedBy:auth.actor!.email,deletedAt:null};
    await putRecord(moduleName,id,row);
    await appendAudit({actor:auth.actor!,module:moduleName,elementId:id,action:"create",after:row});
    return json({row},201);
  }

  const id=url.searchParams.get("id"); if(!id) return json({error:"Missing id"},400);
  const before=await getRecord(moduleName,id); if(!before) return json({error:"Not found"},404);

  if (req.method === "PUT") {
    let body:any; try{body=await req.json();}catch{return json({error:"Invalid JSON"},400);}
    const clean=cleanInput(moduleName,body);
    const row={...before,...clean,id,updatedAt:new Date().toISOString(),updatedBy:auth.actor!.email};
    await putRecord(moduleName,id,row);
    await appendAudit({actor:auth.actor!,module:moduleName,elementId:id,action:"update",before,after:row});
    return json({row});
  }

  if (req.method === "DELETE") {
    const row={...before,deletedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:auth.actor!.email};
    await putRecord(moduleName,id,row);
    await appendAudit({actor:auth.actor!,module:moduleName,elementId:id,action:"archive",before,after:row});
    return json({ok:true,row});
  }

  return json({error:"Method not allowed"},405);
};

export const config: Config={path:"/api/control"};
