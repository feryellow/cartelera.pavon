import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";

function getPavonStore() {
  const isProduction = Netlify.context?.deploy?.context === "production";
  return isProduction
    ? getStore("pavon-carteleria", { consistency: "strong" })
    : getDeployStore("pavon-carteleria");
}

function isAuthorized(req: Request) {
  const expected = Netlify.env.get("PAVON_EDIT_KEY");
  const provided = req.headers.get("x-edit-key");
  return Boolean(expected && provided && expected === provided);
}

function validKey(key: string | null): key is string {
  return Boolean(key && /^[a-zA-Z0-9_-]{1,120}$/.test(key));
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!validKey(key)) {
    return new Response("Invalid key", { status: 400 });
  }

  const store = getPavonStore();
  const blobKey = `image_${key}`;

  if (req.method === "GET") {
    const value = await store.get(blobKey, { type: "text" });
    if (value === null) return new Response("Not found", { status: 404 });
    return new Response(value, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (req.method === "PUT") {
    if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
    const value = await req.text();
    if (!value.startsWith("data:image/")) {
      return new Response("Invalid image", { status: 400 });
    }
    if (value.length > 5_500_000) {
      return new Response("Image too large", { status: 413 });
    }
    await store.set(blobKey, value);
    return new Response("OK", { status: 200 });
  }

  if (req.method === "DELETE") {
    if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
    await store.delete(blobKey);
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/image",
};
