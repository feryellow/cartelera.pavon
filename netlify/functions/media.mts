import type { Config } from "@netlify/functions";
import { assetStore } from "./_lib/store.ts";
import { mediaSig } from "./_lib/media.ts";

// GET /api/media?k=<clave>&m=<módulo>&s=<firma>: sirve un vídeo o audio sin iniciar sesión, solo con enlace firmado.
export default async (req: Request) => {
  const url = new URL(req.url), key = url.searchParams.get("k") || "", sig = url.searchParams.get("s") || "";
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(key) || sig !== mediaSig(key)) return new Response("Enlace no válido", { status: 403 });
  const meta: any = await assetStore().get(`meta_${key}`, { type: "json" });
  const type = meta?.contentType || "application/octet-stream";
  if (!/^(video|audio|image)\//.test(type)) return new Response("No disponible", { status: 404 });
  const data = await assetStore().get(`file_${key}`, { type: "arrayBuffer" }) as ArrayBuffer | null;
  if (!data) return new Response("No encontrado", { status: 404 });
  const total = data.byteLength, m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") || "");
  const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": "public, max-age=86400", "content-disposition": "inline" };
  if (m && total) {
    const start = m[1] === "" ? Math.max(0, total - Number(m[2] || 0)) : Number(m[1]), end = m[1] === "" || m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
    if (start >= total || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    return new Response(data.slice(start, end + 1), { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${total}`, "content-length": String(end - start + 1) } });
  }
  return new Response(data, { headers: { ...base, "content-length": String(total) } });
};
export const config: Config = { path: "/api/media" };
