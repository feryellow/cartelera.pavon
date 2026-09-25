import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";

function getPavonStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-carteleria", { consistency: "strong" })
    : getDeployStore("pavon-carteleria");
}
function validKey(key: string | null): key is string { return Boolean(key && /^[a-zA-Z0-9_-]{1,120}$/.test(key)); }

function parseDataUrl(value: string) {
  const m = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bytes = Uint8Array.from(Buffer.from(m[2], "base64"));
  return { contentType: m[1], bytes };
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url), key = url.searchParams.get("key");
  if (!validKey(key)) return new Response("Invalid key", { status: 400 });

  const store = getPavonStore();
  const blobKey = `image_${key}`;
  const metaKey = `imagemeta_${key}`;

  if (req.method === "GET") {
    const data = await store.get(blobKey, { type: "arrayBuffer" }) as ArrayBuffer | null;
    if (data === null) return new Response("Not found", { status: 404 });

    const bytes = new Uint8Array(data);
    const prefix = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 32)));
    if (prefix.startsWith("data:image/")) {
      // Compatibilidad no destructiva con imágenes antiguas: se conservan hasta su siguiente guardado.
      return new Response(new TextDecoder().decode(bytes), {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const meta = await store.get(metaKey, { type: "json" }) as any;
    const contentType = meta?.contentType || "image/jpeg";
    const encoded = Buffer.from(bytes).toString("base64");
    return new Response(`data:${contentType};base64,${encoded}`, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const auth = await requireAccess(req, "carteleria", true);
  if (auth.response) return auth.response;

  if (req.method === "PUT") {
    const value = await req.text();
    const parsed = parseDataUrl(value);
    if (!parsed) return new Response("Invalid image", { status: 400 });
    if (parsed.bytes.byteLength > 4_000_000) return new Response("Image too large", { status: 413 });

    await store.set(blobKey, parsed.bytes);
    await store.setJSON(metaKey, {
      contentType: parsed.contentType,
      size: parsed.bytes.byteLength,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.actor!.email,
    });
    await appendAudit({ actor: auth.actor!, module: "carteleria", elementId: key, action: "image_replace" });
    return new Response("OK");
  }

  if (req.method === "DELETE") {
    await store.delete(blobKey);
    await store.delete(metaKey);
    await appendAudit({ actor: auth.actor!, module: "carteleria", elementId: key, action: "image_delete" });
    return new Response("OK");
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = { path: "/api/image" };
