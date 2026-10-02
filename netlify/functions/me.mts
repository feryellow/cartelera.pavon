import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";
import { admin } from "@netlify/identity";
export default async (req:Request)=>{
  const actor=await resolveActor(req);
  if(!actor)return Response.json({authenticated:false},{status:401});
  const budget=(await budgetAccess(req).catch(()=>({status:"login"}))).status==="ok";
  // El nombre que se pone en Netlify (Identity) puede no estar aún en la sesión: se lee de la cuenta
  // Manda el nombre actual de la cuenta en Netlify; el de la sesión puede ser antiguo
  if(actor.mode==="identity"){try{const n=(await admin.getUser(actor.id))?.name;if(n)actor.name=n;}catch{}}
  return Response.json({authenticated:true,actor,budget});
};
export const config:Config={path:"/api/me"};
