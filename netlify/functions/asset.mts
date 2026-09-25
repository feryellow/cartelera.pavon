import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { assetStore } from "./_lib/store.ts";

function validKey(k:string|null):k is string { return Boolean(k && /^[a-zA-Z0-9_-]{1,160}$/.test(k)); }

export default async (req:Request)=>{
  const url=new URL(req.url), key=url.searchParams.get("key");
  if(!validKey(key)) return new Response("Invalid key",{status:400});
  const moduleName=url.searchParams.get("module")==="radio"?"radio":"publicidad";
  const store=assetStore();

  if(req.method==="GET"){
    const auth=await requireAccess(req,moduleName,false); if(auth.response)return auth.response;
    const data=await store.get(`file_${key}`,{type:"arrayBuffer"});
    if(data===null)return new Response("Not found",{status:404});
    const meta=await store.get(`meta_${key}`,{type:"json"}) as any;
    return new Response(data,{headers:{"content-type":meta?.contentType||"application/octet-stream","cache-control":"private, no-store"}});
  }

  const auth=await requireAccess(req,moduleName,true); if(auth.response)return auth.response;
  if(req.method==="PUT"){
    const contentType=req.headers.get("content-type")||"application/octet-stream";
    if(!/^(image\/|audio\/|application\/pdf)/.test(contentType))return new Response("Unsupported file type",{status:415});
    const buf=await req.arrayBuffer();
    if(buf.byteLength>25*1024*1024)return new Response("File too large",{status:413});
    await store.set(`file_${key}`,buf);
    await store.setJSON(`meta_${key}`,{contentType,size:buf.byteLength,updatedAt:new Date().toISOString(),updatedBy:auth.actor!.email});
    return Response.json({ok:true,key,size:buf.byteLength,contentType});
  }
  if(req.method==="DELETE"){
    await store.delete(`file_${key}`); await store.delete(`meta_${key}`);
    return Response.json({ok:true});
  }
  return new Response("Method not allowed",{status:405});
};

export const config:Config={path:"/api/asset"};
