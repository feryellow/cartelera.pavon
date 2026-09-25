import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
import { requireAccess } from "./_lib/auth.ts";

function getPavonStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-carteleria", { consistency: "strong" })
    : getDeployStore("pavon-carteleria");
}
function validKey(key: string | null): key is string { return Boolean(key && /^[a-zA-Z0-9_-]{1,120}$/.test(key)); }

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url), key = url.searchParams.get("key");
  if (!validKey(key)) return new Response("Invalid key", { status: 400 });
  const store = getPavonStore(), blobKey = `image_${key}`;

  if (req.method === "GET") {
    const value = await store.get(blobKey, { type: "text" });
    if (value === null) return new Response("Not found", { status: 404 });
    return new Response(value, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }

  const auth = await requireAccess(req, "carteleria", true);
  if (auth.response) return auth.response;

  if (req.method === "PUT") {
    const value = await req.text();
    if (!value.startsWith("data:image/")) return new Response("Invalid image", { status: 400 });
    if (value.length > 5_500_000) return new Response("Image too large", { status: 413 });
    await store.set(blobKey, value);
    return new Response("OK");
  }
  if (req.method === "DELETE") {
    await store.delete(blobKey);
    return new Response("OK");
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/image" };
