import { logout, verifyRequestOrigin } from "@netlify/identity";
import type { Config } from "@netlify/functions";
export default async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  try{verifyRequestOrigin(req);await logout();return Response.json({ok:true});}
  catch(e:any){return Response.json({error:e?.message||"No se ha podido cerrar sesión"},{status:e?.status||400});}
};
export const config:Config={path:"/api/logout"};
