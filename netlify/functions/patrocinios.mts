import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";
import { appendAudit } from "./_lib/audit.ts";
import { madridToday } from "./_lib/dates.ts";
import { clean, listPatrocinios, getPatrocinio, putPatrocinio, totals, STAGES, STAGE_TXT, KINDS, VENUES, OPEN_STAGES } from "./_lib/patrocinios.ts";

// /api/patrocinios
//   GET                → operaciones, listas (tipos, espacios, etapas) y, solo para Fer y Celia, las cifras de dirección
//   POST {row}         → nueva operación
//   PUT ?id= {row}     → cambia una operación (etapa, importes, próximo paso, contraprestaciones…)
//   DELETE ?id=        → la quita (recuperable con PATCH ?id=)
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: { "cache-control": "no-store" } });
const okId = (v: string | null): v is string => !!v && /^[\w-]{8,60}$/.test(v);

function check(r: any) {
  if (!r.brand) return "Indica la marca.";
  if (r.stage === "cerrado") {
    if (r.amountFinal == null) return "Para cerrar la operación pon el importe final firmado.";
    if (!r.startDate || !r.endDate) return "Para cerrar la operación pon las fechas del contrato (inicio y fin).";
    if (r.endDate < r.startDate) return "La fecha de fin del contrato es anterior a la de inicio.";
  }
  if (OPEN_STAGES.includes(r.stage) && r.nextStep && !r.nextDate) return "Pon la fecha del próximo paso: sin fecha nadie se acuerda de hacerlo.";
  return "";
}

export default async (req: Request) => {
  const url = new URL(req.url), write = req.method !== "GET";
  const auth = await requireAccess(req, "patrocinios", write); if (auth.response) return auth.response;
  const actor = auth.actor!, today = madridToday();
  const isBoss = (await budgetAccess(req).catch(() => ({ status: "forbidden" as const }))).status === "ok";

  if (req.method === "GET") {
    const rows = await listPatrocinios();
    return json({ rows, today, stages: STAGES.map((k) => ({ key: k, name: STAGE_TXT[k] })), kinds: KINDS, venues: VENUES, direccion: isBoss ? totals(rows, today) : null, canDireccion: isBoss });
  }

  let body: any = {}; try { body = await req.json(); } catch {}
  const now = new Date().toISOString();

  if (req.method === "POST") {
    const r = clean({ stage: "prospecto", kind: "Otro", ...body.row });
    const err = check(r); if (err) return json({ error: err }, 400);
    const id = crypto.randomUUID();
    const row = { id, docs: [], deliverables: [], ...r, stageChangedAt: now, createdAt: now, updatedAt: now, createdBy: actor.email, updatedBy: actor.email, deletedAt: null };
    await putPatrocinio(id, row);
    await appendAudit({ actor, module: "patrocinios", elementId: id, action: "create", after: row }).catch(() => null);
    return json({ row }, 201);
  }

  const id = url.searchParams.get("id");
  if (!okId(id)) return json({ error: "Falta la operación" }, 400);
  const before = await getPatrocinio(id);
  if (!before) return json({ error: "No existe esa operación" }, 404);

  if (req.method === "PUT") {
    const r = clean(body.row || {});
    const row = { ...before, ...r, updatedAt: now, updatedBy: actor.email };
    if (r.stage && r.stage !== before.stage) row.stageChangedAt = now;
    const err = check(row); if (err) return json({ error: err }, 400);
    await putPatrocinio(id, row);
    await appendAudit({ actor, module: "patrocinios", elementId: id, action: "update", before, after: row, note: r.stage && r.stage !== before.stage ? `Etapa: ${STAGE_TXT[before.stage]} → ${STAGE_TXT[r.stage]}` : "" }).catch(() => null);
    return json({ row });
  }
  if (req.method === "DELETE") {
    const row = { ...before, deletedAt: now, updatedAt: now, updatedBy: actor.email };
    await putPatrocinio(id, row);
    await appendAudit({ actor, module: "patrocinios", elementId: id, action: "delete", before, after: row }).catch(() => null);
    return json({ ok: true });
  }
  if (req.method === "PATCH") {
    const row = { ...before, deletedAt: null, updatedAt: now, updatedBy: actor.email };
    await putPatrocinio(id, row);
    await appendAudit({ actor, module: "patrocinios", elementId: id, action: "restore", before, after: row }).catch(() => null);
    return json({ row });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/patrocinios" };
