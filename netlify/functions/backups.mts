import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { listSnapshots, takeSnapshot, restore, snapshotRecords, MODULES, type Scope } from "./_lib/backup.ts";
import { recordHealth } from "./_lib/notify.ts";

// /api/backups (solo administración)
//   GET                         → copias disponibles y módulos restaurables
//   GET ?id=…&module=…          → registros de ese módulo dentro de la copia (para restaurar uno)
//   POST {action:"snapshot"}    → copia ahora
//   POST {action:"restore", id, scope, confirm} → sin confirm: qué cambiaría; con confirm: restaura (antes hace copia)
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: { "cache-control": "no-store" } });
export default async (req: Request) => {
  const auth = await requireAccess(req, "admin", req.method !== "GET"); if (auth.response) return auth.response;
  const url = new URL(req.url), version = Netlify.env.get("COMMIT_REF") || Netlify.context?.deploy?.id || "";
  if (req.method === "GET") {
    const id = url.searchParams.get("id"), mod = url.searchParams.get("module");
    if (id && mod) return json({ rows: await snapshotRecords(id, mod) });
    return json({ snapshots: await listSnapshots(), modules: MODULES.map((m) => ({ id: m.id, label: m.label })) });
  }
  let body: any = {}; try { body = await req.json(); } catch { return json({ error: "Datos no válidos" }, 400); }
  if (body.action === "snapshot") {
    const m = await takeSnapshot("Copia manual de " + auth.actor!.email, version);
    await recordHealth("backup", true, `${m.id} · manual`);
    await appendAudit({ actor: auth.actor!, module: "backup", elementId: m.id, action: "create", note: "Copia de seguridad manual" });
    return json({ snapshot: m });
  }
  if (body.action === "restore") {
    const id = String(body.id || ""); if (!(await listSnapshots()).some((s) => s.id === id)) return json({ error: "Esa copia no existe" }, 404);
    const sc = body.scope || {}; let scope: Scope;
    if (sc.type === "all") scope = { type: "all" };
    else if (sc.type === "module" && MODULES.some((m) => m.id === sc.module)) scope = { type: "module", module: sc.module };
    else if (sc.type === "record" && typeof sc.key === "string" && typeof sc.store === "string") scope = { type: "record", store: sc.store, key: sc.key };
    else return json({ error: "Indica qué restaurar" }, 400);
    const r = await restore(id, scope, { dryRun: body.confirm !== true, version });
    if (r.applied) await appendAudit({ actor: auth.actor!, module: "backup", elementId: id, action: "update", note: `Restauración (${scope.type}${scope.type === "module" ? " " + scope.module : scope.type === "record" ? " " + scope.key : ""}): ${r.add} añadidos, ${r.overwrite} sobrescritos. Copia previa ${r.undoSnapshot}` });
    return json(r);
  }
  return json({ error: "Acción no válida" }, 400);
};
export const config: Config = { path: "/api/backups" };
