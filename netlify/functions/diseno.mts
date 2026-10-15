import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";
import { appendAudit } from "./_lib/audit.ts";
import { madridToday } from "./_lib/dates.ts";
import { clean, listDiseno, getDiseno, putDiseno, getSettings, saveSettings, OPEN, PIECE_TYPES } from "./_lib/diseno.ts";

// /api/diseno · peticiones de diseño
//   GET                      → peticiones, ajustes y tipos de pieza
//   POST {row}               → nueva petición (sin fecha límite no entra)
//   POST {bulk:[…]}          → importación de la hoja (solo Fer y Celia); no duplica
//   PUT ?id=…  {row}         → cambia una petición (fechas de entrega y reaperturas se apuntan solas)
//   DELETE ?id=…             → la quita (recuperable)
//   PUT ?settings=1 {settings} → personas, empresas y umbrales (solo Fer y Celia)
const noStore = { "cache-control": "no-store, private" };
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: noStore });
const key = (r: any) => [r.title, r.requester, r.requestDate].map((x) => String(x || "").toLowerCase().replace(/\s+/g, " ").trim()).join("|");

export default async (req: Request) => {
  const url = new URL(req.url), write = req.method !== "GET";
  const auth = await requireAccess(req, "diseno", write); if (auth.response) return auth.response;
  const actor = auth.actor!, today = madridToday();
  const isBoss = (await budgetAccess(req).catch(() => ({ status: "forbidden" }))).status === "ok";

  if (req.method === "GET") {
    const [rows, settings] = await Promise.all([listDiseno(), getSettings()]);
    const me = settings.people.find((p) => p.email && p.email === actor.email.toLowerCase())?.name || "";
    return json({ rows, settings, pieceTypes: PIECE_TYPES, me, canSettings: isBoss, today });
  }
  let body: any = {}; try { body = await req.json(); } catch { return json({ error: "Datos no válidos" }, 400); }

  if (req.method === "PUT" && url.searchParams.get("settings")) {
    if (!isBoss) return json({ error: "Solo Fer y Celia pueden cambiar los ajustes de Diseño." }, 403);
    const settings = await saveSettings(body.settings || {});
    await appendAudit({ actor, module: "diseno", elementId: "ajustes", action: "update", note: "Ajustes de Diseño" }).catch(() => null);
    return json({ ok: true, settings });
  }

  if (req.method === "POST" && Array.isArray(body.bulk)) {
    if (!isBoss) return json({ error: "Solo Fer y Celia pueden importar la hoja." }, 403);
    const existing = new Set((await listDiseno(true)).map(key));
    let added = 0, skipped = 0; const now = new Date().toISOString();
    const work = body.bulk.slice(0, 2000).map((b: any) => clean(b)).filter((r: any) => r.title);
    const todo = work.filter((r: any) => { const k = key(r); if (existing.has(k)) { skipped++; return false; } existing.add(k); return true; });
    let i = 0;
    await Promise.all(Array.from({ length: 12 }, async () => { while (i < todo.length) { const r = todo[i++]; const id = crypto.randomUUID();
      await putDiseno(id, { id, status: "pendiente", progress: 0, ...r, imported: true, statusChangedAt: now, createdAt: now, updatedAt: now, createdBy: actor.email, updatedBy: actor.email, deletedAt: null }); added++; } }));
    await appendAudit({ actor, module: "diseno", elementId: "importacion", action: "create", note: `Importación de la hoja: ${added} peticiones nuevas, ${skipped} ya estaban` }).catch(() => null);
    return json({ ok: true, added, skipped });
  }

  if (req.method === "POST") {
    const r = clean(body.row || {});
    if (!r.title) return json({ error: "Describe qué hay que diseñar." }, 400);
    if (!r.requester) return json({ error: "Indica quién lo pide." }, 400);
    if (!r.company) return json({ error: "Indica para qué empresa o espacio es." }, 400);
    if (!r.deadline) return json({ error: "Sin fecha límite no entra: pon para cuándo hace falta." }, 400);
    if (r.urgent) {
      const st = await getSettings(), open = (await listDiseno()).filter((x) => x.urgent && OPEN.includes(x.status));
      if (open.length >= st.urgentQuota && !body.forceUrgent) return json({ error: `Ya hay ${open.length} urgentes abiertas (el cupo es ${st.urgentQuota}). Quita alguna urgencia o confirma que esta lo es más.`, quota: true }, 409);
    }
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const row = { id, status: "pendiente", progress: 0, requestDate: today, ...r, statusChangedAt: now, reopenCount: 0, createdAt: now, updatedAt: now, createdBy: actor.email, updatedBy: actor.email, deletedAt: null };
    if (row.status === "entregado" && !row.deliveredAt) row.deliveredAt = today;
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "create", after: row }).catch(() => null);
    return json({ row }, 201);
  }

  const id = url.searchParams.get("id") || ""; if (!/^[\w-]{8,60}$/.test(id)) return json({ error: "Falta la petición" }, 400);
  const before = await getDiseno(id); if (!before) return json({ error: "No encontrada" }, 404);

  if (req.method === "PUT") {
    const r = clean(body.row || {}), now = new Date().toISOString();
    if (r.deadline === "" && before.deadline) return json({ error: "La fecha límite no se puede dejar vacía." }, 400);
    const row: any = { ...before, ...r, id, updatedAt: now, updatedBy: actor.email };
    if (r.status && r.status !== before.status) {
      row.statusChangedAt = now;
      const wasClosed = !OPEN.includes(before.status), isClosed = !OPEN.includes(r.status);
      if (r.status === "entregado") { row.deliveredAt = r.deliveredAt || today; row.progress = 100; }
      if (wasClosed && !isClosed) { row.reopenCount = (before.reopenCount || 0) + 1; row.deliveredAt = ""; }
    }
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "update", before, after: row }).catch(() => null);
    return json({ row });
  }
  if (req.method === "DELETE") {
    const row = { ...before, deletedAt: new Date().toISOString(), updatedBy: actor.email };
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "archive", before, after: row }).catch(() => null);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config: Config = { path: "/api/diseno" };
