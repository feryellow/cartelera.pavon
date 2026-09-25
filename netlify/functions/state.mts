import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
import { requireAccess, resolveActor } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";

function getPavonStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-carteleria", { consistency: "strong" })
    : getDeployStore("pavon-carteleria");
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export default async (req: Request, _context: Context) => {
  const store = getPavonStore();

  if (req.method === "GET") {
    const saved = await store.get("state", { type: "json" });
    const actor = await resolveActor(req);
    return json({
      state: saved ?? { slots: {}, schedule: {}, updatedAt: null },
      publicEdit: false,
      authenticated: Boolean(actor),
      actor: actor ? { email: actor.email, roles: actor.roles, mode: actor.mode } : null,
      requireKey: Boolean(Netlify.env.get("PAVON_EDIT_KEY")),
    });
  }

  if (req.method === "PUT") {
    const auth = await requireAccess(req, "carteleria", true);
    if (auth.response) return auth.response;

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body !== "object") return json({ error: "Invalid payload" }, 400);

    const before = await store.get("state", { type: "json" });
    const clean = {
      slots: body.slots && typeof body.slots === "object" ? body.slots : {},
      schedule: body.schedule && typeof body.schedule === "object" ? body.schedule : {},
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
      updatedBy: auth.actor!.email,
    };
    await store.setJSON("state", clean);
    await appendAudit({ actor: auth.actor!, module: "carteleria", elementId: "estado-general", action: "save", before, after: clean });
    return json({ ok: true, updatedAt: clean.updatedAt, updatedBy: clean.updatedBy });
  }

  return json({ error: "Method not allowed" }, 405);
};
export const config: Config = { path: "/api/state" };
