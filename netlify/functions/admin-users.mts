import type { Config } from "@netlify/functions";
import { admin, requestPasswordRecovery } from "@netlify/identity";
import { requireAccess } from "./_lib/auth.ts";
import { controlStore } from "./_lib/store.ts";
import { appendAudit } from "./_lib/audit.ts";

const allowedRoles=["admin","gestion","carteleria","consulta"];

export default async(req:Request)=>{
  const auth=await requireAccess(req,"admin",true); if(auth.response)return auth.response;
  const store=controlStore();
  let disabled=await store.get("disabled_users",{type:"json"}) as string[]|null;
  if(!Array.isArray(disabled))disabled=[];

  if(req.method==="GET"){
    try{
      const users=await admin.listUsers();
      return Response.json({users:users.map((u:any)=>({id:u.id,email:u.email,name:u.name||u.userMetadata?.full_name||"",roles:u.roles||[],disabled:disabled!.includes(u.id)}))});
    }catch(e:any){return Response.json({error:e?.message||"Identity no está habilitado"},{status:503});}
  }

  let body:any={};try{body=await req.json();}catch{}
  if(req.method==="POST"){
    const email=String(body.email||"").trim().toLowerCase(), role=String(body.role||"consulta");
    if(!email.includes("@")||!allowedRoles.includes(role))return Response.json({error:"Datos no válidos"},{status:400});
    try{
      const password=crypto.randomUUID()+crypto.randomUUID();
      const user=await admin.createUser({email,password});
      await admin.updateUser(user.id,{role});
      try{await requestPasswordRecovery(email);}catch{}
      await appendAudit({actor:auth.actor!,module:"admin",elementId:user.id,action:"user_create",after:{email,role}});
      return Response.json({ok:true,user:{id:user.id,email,roles:[role]},recoveryRequested:true},{status:201});
    }catch(e:any){return Response.json({error:e?.message||"No se pudo crear el usuario"},{status:400});}
  }

  if(req.method==="PUT"){
    const id=String(body.id||""), role=String(body.role||"");
    if(!id||!allowedRoles.includes(role))return Response.json({error:"Datos no válidos"},{status:400});
    try{
      const user=await admin.updateUser(id,{role});
      await appendAudit({actor:auth.actor!,module:"admin",elementId:id,action:"role_change",after:{role}});
      return Response.json({ok:true,user:{id:user.id,email:user.email,roles:user.roles}});
    }catch(e:any){return Response.json({error:e?.message||"No se pudo cambiar el rol"},{status:400});}
  }

  if(req.method==="DELETE"){
    const id=String(body.id||""); if(!id)return Response.json({error:"Missing id"},{status:400});
    if(!disabled.includes(id))disabled.push(id);
    await store.setJSON("disabled_users",disabled);
    await appendAudit({actor:auth.actor!,module:"admin",elementId:id,action:"user_disable"});
    return Response.json({ok:true});
  }

  if(req.method==="PATCH"){
    const id=String(body.id||""); if(!id)return Response.json({error:"Missing id"},{status:400});
    disabled=disabled.filter(v=>v!==id); await store.setJSON("disabled_users",disabled);
    await appendAudit({actor:auth.actor!,module:"admin",elementId:id,action:"user_enable"});
    return Response.json({ok:true});
  }

  return new Response("Method not allowed",{status:405});
};
export const config:Config={path:"/api/admin-users"};
