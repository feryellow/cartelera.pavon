import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { controlStore } from "./_lib/store.ts";
import { sendPavonMail } from "./_lib/mailer.ts";

function parseDataUrl(v:string){
  const m=v.match(/^data:image\/png;base64,(.+)$/);
  return m?m[1]:null;
}

export default async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  const auth=await requireAccess(req,"carteleria",true); if(auth.response)return auth.response;
  let body:any;try{body=await req.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
  const page=String(body?.page||"carteleria").slice(0,80);
  const png=typeof body?.pngDataUrl==="string"?parseDataUrl(body.pngDataUrl):null;
  const subject=`Pavón · actualización de cartelería · ${page}`;
  const html=`<div style="font-family:Arial,sans-serif"><h2>Gran Teatro Pavón · Cartelería</h2><p>Se ha confirmado una actualización en <strong>${page}</strong>.</p><p>Fecha: ${new Date().toLocaleString("es-ES",{timeZone:"Europe/Madrid"})}</p><p>Actualizado por: ${auth.actor!.email}</p></div>`;
  const result=await sendPavonMail({subject,html,attachments:png?[{filename:`Pavon_${page.replace(/[^a-z0-9_-]+/gi,"_")}.png`,content:png}]:[]});
  if(!result.sent){
    const id=crypto.randomUUID();
    await controlStore().setJSON(`outbox_${id}`,{id,createdAt:new Date().toISOString(),page,subject,reason:result.reason||"send_failed",retryable:true});
  }
  await appendAudit({actor:auth.actor!,module:"carteleria",elementId:page,action:result.sent?"email_sent":"email_pending",note:result.sent?"Correo de actualización enviado":"Correo pendiente de configuración/reintento"});
  return Response.json({ok:true,...result},{status:result.sent?200:202});
};
export const config:Config={path:"/api/email-update"};
