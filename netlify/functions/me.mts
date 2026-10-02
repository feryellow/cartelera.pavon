import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";
export default async (req:Request)=>{
  const actor=await resolveActor(req);
  if(!actor)return Response.json({authenticated:false},{status:401});
  const budget=(await budgetAccess(req).catch(()=>({status:"login"}))).status==="ok";
  return Response.json({authenticated:true,actor,budget});
};
export const config:Config={path:"/api/me"};
