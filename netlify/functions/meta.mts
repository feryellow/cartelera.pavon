import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { controlStore } from "./_lib/store.ts";

// Meta (Facebook / Instagram Ads) · fase 1: solo lectura.
// Los datos llegan importando la exportación del Administrador de anuncios (desglose por día y anuncio).
// Más adelante, la lectura diaria por API escribirá en este mismo almacén (meta_rows_YYYY-MM).
// GET  ?month=YYYY-MM → filas del mes, meses con datos, presupuestos por espectáculo y cuenta
// POST {rows}         → importa filas; sustituye las de los mismos días y deja el resto
// PUT  {month,show,budget} → presupuesto Meta de un espectáculo en un mes
type Row = { date: string; campaign: string; adset: string; ad: string; spend: number; impressions: number; reach: number; clicks: number; lpv: number; checkouts: number; purchases: number; value: number; campaignId?: string; adId?: string };
const N = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0 };
const S = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);
const okMonth = (m: string | null) => !!m && /^\d{4}-\d{2}$/.test(m);

async function months(): Promise<string[]> {
  const res = await controlStore().list({ prefix: "meta_rows_" });
  return res.blobs.map((b) => b.key.slice(10)).filter(okMonth).sort();
}

export default async (req: Request) => {
  const url = new URL(req.url), st = controlStore();
  const account = (Netlify.env.get("META_AD_ACCOUNT") || "6036157816619").replace(/^act_/, "");
  if (req.method === "GET") {
    const auth = await requireAccess(req, "meta", false); if (auth.response) return auth.response;
    const all = await months(), cur = new Date().toISOString().slice(0, 7);
    const month = okMonth(url.searchParams.get("month")) ? url.searchParams.get("month")! : all.includes(cur) || !all.length ? cur : all[all.length - 1];
    const doc = await st.get(`meta_rows_${month}`, { type: "json" }) as { rows: Row[]; importedAt?: string; importedBy?: string } | null;
    const budgets = (await st.get("meta_budgets", { type: "json" }) as Record<string, Record<string, number>> | null) || {};
    return Response.json({ account, month, months: all, rows: doc?.rows || [], importedAt: doc?.importedAt || null, importedBy: doc?.importedBy || null, budgets: budgets[month] || {}, source: "export" }, { headers: { "cache-control": "no-store" } });
  }
  if (req.method === "POST") {
    const auth = await requireAccess(req, "meta", true); if (auth.response) return auth.response;
    let body: any = {}; try { body = await req.json(); } catch {}
    const rows: Row[] = (Array.isArray(body?.rows) ? body.rows : []).slice(0, 50000).map((r: any) => ({
      date: S(r.date, 10), campaign: S(r.campaign), adset: S(r.adset), ad: S(r.ad), spend: N(r.spend), impressions: N(r.impressions), reach: N(r.reach),
      clicks: N(r.clicks), lpv: N(r.lpv), checkouts: N(r.checkouts), purchases: N(r.purchases), value: N(r.value), campaignId: S(r.campaignId, 40) || undefined, adId: S(r.adId, 40) || undefined,
    })).filter((r: Row) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && (r.campaign || r.ad));
    if (!rows.length) return Response.json({ error: "No hay filas válidas. La exportación necesita la columna de día y el nombre de la campaña o del anuncio." }, { status: 400 });
    const byMonth = new Map<string, Row[]>();
    for (const r of rows) { const m = r.date.slice(0, 7); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m)!.push(r); }
    const now = new Date().toISOString(), out: { month: string; rows: number; days: number }[] = [];
    for (const [m, list] of byMonth) {
      const days = new Set(list.map((r) => r.date));
      const prev = (await st.get(`meta_rows_${m}`, { type: "json" }) as { rows: Row[] } | null)?.rows || [];
      const merged = [...prev.filter((r) => !days.has(r.date)), ...list].sort((a, b) => a.date.localeCompare(b.date));
      await st.setJSON(`meta_rows_${m}`, { rows: merged, importedAt: now, importedBy: auth.actor!.email });
      out.push({ month: m, rows: list.length, days: days.size });
    }
    await appendAudit({ actor: auth.actor!, module: "meta", elementId: "meta-import", action: "import", note: `Exportación de Meta: ${rows.length} filas (${out.map((o) => `${o.month}: ${o.days} días`).join(", ")})` });
    return Response.json({ ok: true, imported: out });
  }
  if (req.method === "PUT") {
    const auth = await requireAccess(req, "meta", true); if (auth.response) return auth.response;
    let body: any = {}; try { body = await req.json(); } catch {}
    const month = S(body?.month, 7), show = S(body?.show, 120);
    if (!okMonth(month) || !show) return Response.json({ error: "Falta el mes o el espectáculo" }, { status: 400 });
    const all = (await st.get("meta_budgets", { type: "json" }) as Record<string, Record<string, number>> | null) || {};
    all[month] = all[month] || {};
    if (N(body?.budget) > 0) all[month][show] = N(body.budget); else delete all[month][show];
    await st.setJSON("meta_budgets", all);
    await appendAudit({ actor: auth.actor!, module: "meta", elementId: `meta-budget-${month}`, action: "update", note: `Presupuesto Meta ${show} · ${month}: ${N(body?.budget)} €` });
    return Response.json({ ok: true, budgets: all[month] });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/meta" };
