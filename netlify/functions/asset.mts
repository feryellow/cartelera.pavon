import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { assetStore } from "./_lib/store.ts";

function validKey(k:string|null):k is string { return Boolean(k && /^[a-zA-Z0-9_-]{1,160}$/.test(k)); }

export default async (req:Request)=>{
  const url=new URL(req.url), key=url.searchParams.get("key");
  if(!validKey(key)) return new Response("Invalid key",{status:400});
  const requested=url.searchParams.get("module")||"publicidad";
  const moduleName=["radio","publicidad","taxis","intercambiadores","hometicket","revistas","hitos"].includes(requested)?requested:"publicidad";
  const store=assetStore();

  if(req.method==="GET"){
    const auth=await requireAccess(req,moduleName,false); if(auth.response)return auth.response;
    const data=await store.get(`file_${key}`,{type:"arrayBuffer"});
    if(data===null)return new Response("Not found",{status:404});
    const meta=await store.get(`meta_${key}`,{type:"json"}) as any;
    const type=meta?.contentType||"application/octet-stream", total=data.byteLength;
    // Rangos de bytes: Safari (iPhone/iPad) solo reproduce vídeo si el servidor responde 206 a Range.
    const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range")||"");
    if(m&&total){
      let start=m[1]===""?Math.max(0,total-Number(m[2]||0)):Number(m[1]), end=m[1]===""||m[2]===""?total-1:Math.min(Number(m[2]),total-1);
      if(start>=total||start>end)return new Response(null,{status:416,headers:{"content-range":`bytes */${total}`}});
      return new Response(data.slice(start,end+1),{status:206,headers:{"content-type":type,"content-range":`bytes ${start}-${end}/${total}`,"accept-ranges":"bytes","content-length":String(end-start+1),"cache-control":"private, max-age=3600"}});
    }
    return new Response(data,{headers:{"content-type":type,"accept-ranges":"bytes","content-length":String(total),"cache-control":type.startsWith("video/")?"private, max-age=3600":"private, no-store"}});
  }

  const auth=await requireAccess(req,moduleName,true); if(auth.response)return auth.response;
  if(req.method==="PUT"){
    const contentType=req.headers.get("content-type")||"application/octet-stream";
    if(!/^(image\/|audio\/|video\/(mp4|quicktime|webm)|application\/pdf)/.test(contentType))return new Response("Unsupported file type",{status:415});
    const buf=await req.arrayBuffer();
    if(buf.byteLength>6*1024*1024)return new Response("El archivo supera 6 MB. Redúcelo antes de subirlo.",{status:413});
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
