import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
export default async (req:Request)=>{
  const actor=await resolveActor(req);
  if(!actor)return Response.json({authenticated:false},{status:401});
  return Response.json({authenticated:true,actor});
};
export const config:Config={path:"/api/me"};
