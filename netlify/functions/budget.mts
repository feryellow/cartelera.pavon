import type { Config } from "@netlify/functions";
import { budgetAccess, budgetStore } from "./_lib/budget.ts";

// /api/budget?year=2026
//   GET  → presupuesto del año (líneas, importe anual, meses con datos)
//   PUT  → guarda el año completo. Exige baseUpdatedAt igual al guardado para no pisar a otra persona.
// Cada guardado deja una copia anterior (hist_) y una línea en su propio registro de cambios, que
// no se mezcla con el registro general de la app (ese lo ven más usuarios).
const noStore = { "cache-control": "no-store, private" };
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: noStore });

export default async (req: Request) => {
  const acc = await budgetAccess(req);
  if (acc.status === "login") return json({ error: "Inicia sesión con tu usuario para ver el presupuesto.", need: "login" }, 401);
  if (acc.status === "forbidden") return json({ error: "Tu usuario no tiene acceso al presupuesto.", need: "forbidden" }, 403);
  const url = new URL(req.url), year = /^\d{4}$/.test(url.searchParams.get("year") || "") ? url.searchParams.get("year")! : String(new Date().getFullYear());
  const store = budgetStore(), key = `year_${year}`;
  if (req.method === "GET") {
    if (url.searchParams.get("history") === "1") {
      const list = await store.list({ prefix: `audit_${year}_` });
      const rows = await Promise.all(list.blobs.slice(-40).map((b) => store.get(b.key, { type: "json" })));
      return json({ history: rows.filter(Boolean).reverse() });
    }
    const doc = await store.get(key, { type: "json" }) as any;
    return json({ year, me: acc.actor, doc: doc || { year, annualBudget: 0, lines: [], updatedAt: null } });
  }
  if (req.method === "PUT") {
    let body: any; try { body = await req.json(); } catch { return json({ error: "Datos no válidos" }, 400); }
    const cur = await store.get(key, { type: "json" }) as any;
    if ((cur?.updatedAt || null) !== (body?.baseUpdatedAt ?? null)) return json({ error: "Otra persona ha guardado cambios mientras editabas. Recarga para ver la versión actual.", conflict: true }, 409);
    const lines = Array.isArray(body?.doc?.lines) ? body.doc.lines.slice(0, 500) : [];
    const now = new Date().toISOString();
    const doc = { year, annualBudget: Number(body?.doc?.annualBudget) || 0, lines, monthsLoaded: Array.isArray(body?.doc?.monthsLoaded) ? body.doc.monthsLoaded : undefined, source: String(body?.doc?.source || "").slice(0, 300), loose: Array.isArray(body?.doc?.loose) ? body.doc.loose.slice(0, 50) : [], notes: String(body?.doc?.notes || "").slice(0, 4000), updatedAt: now, updatedBy: acc.actor!.email };
    if (cur) await store.setJSON(`hist_${year}_${now}`, cur);
    await store.setJSON(key, doc);
    await store.setJSON(`audit_${year}_${now}`, { at: now, by: acc.actor!.email, what: String(body?.what || "Cambios en el presupuesto").slice(0, 300) });
    return json({ ok: true, doc });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config: Config = { path: "/api/budget" };
