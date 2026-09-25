import { login, verifyRequestOrigin } from "@netlify/identity";
import type { Config } from "@netlify/functions";
export default async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  try{
    verifyRequestOrigin(req);
    const {email,password}=await req.json();
    if(typeof email!=="string"||typeof password!=="string")return Response.json({error:"Datos incompletos"},{status:400});
    const user=await login(email,password);
    return Response.json({ok:true,user:{id:user.id,email:user.email,roles:user.roles}});
  }catch(e:any){
    return Response.json({error:e?.message||"No se ha podido iniciar sesión"},{status:e?.status||401});
  }
};
export const config:Config={path:"/api/login"};
