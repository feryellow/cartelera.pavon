import type { Config } from "@netlify/functions";
import { requireAccess, can } from "./_lib/auth.ts";
import { appendAudit, listAudit } from "./_lib/audit.ts";
import { carteleriaStore } from "./_lib/store.ts";
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
      const carteleria = Object.entries(schedule).map(([key,v]: any)=>({ key, date:v?.date||"", next:v?.next||"" }));
      const payload:any = { carteleria, carteleriaUpdatedAt:state.updatedAt||null, latest:await listAudit(8) };
      if (can(auth.actor,"radio",false)) {
        const rows=await listRecords("radio"); payload.radio={ total:rows.length, active:rows.filter(isActive).length, endingSoon:rows.filter(r=>r.endDate && r.endDate>=today).slice(0,8) };
      }
      if (can(auth.actor,"publicidad",false)) {
        const rows=await listRecords("publicidad"); payload.publicidad={ total:rows.length, active:rows.filter(isActive).length, intercambiadores:rows.filter(r=>String(r.category).toLowerCase()==="intercambiador" && isActive(r)).length };
      }
      return json(payload);
    }
    if (!validModule(moduleName)) return json({error:"Unknown module"},400);
    const auth = await requireAccess(req,moduleName==="publicidad"?"publicidad":"radio",false); if(auth.response) return auth.response;
    let rows=await listRecords(moduleName, url.searchParams.get("includeDeleted")==="1");
    const q=(url.searchParams.get("q")||"").toLowerCase();
    if(q) rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
    if(url.searchParams.get("active")==="1") rows=rows.filter(isActive);
    return json({ rows });
  }

  if (!validModule(moduleName)) return json({error:"Unknown module"},400);
  const accessName = moduleName==="publicidad"?"publicidad":"radio";
  const auth = await requireAccess(req,accessName,true); if(auth.response) return auth.response;

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
