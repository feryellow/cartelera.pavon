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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async (req: Request, _context: Context) => {
  const store = getPavonStore();

  if (req.method === "GET") {
    const saved = await store.get("state", { type: "json" });
    return json({ state: saved ?? { slots: {}, schedule: {}, updatedAt: null } });
  }

  if (req.method === "PUT") {
    if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const clean = {
      slots: body.slots && typeof body.slots === "object" ? body.slots : {},
      schedule: body.schedule && typeof body.schedule === "object" ? body.schedule : {},
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
    };

    await store.setJSON("state", clean);
    return json({ ok: true, updatedAt: clean.updatedAt });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/state",
};
