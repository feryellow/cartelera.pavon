import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { controlStore } from "./_lib/store.ts";
import seed from "./_lib/meta-seed.json";
import { syncMeta, metaApiReady } from "./_lib/meta-api.ts";

// Meta (Facebook / Instagram Ads) · fase 1: solo lectura.
// Los datos llegan importando la exportación del Administrador de anuncios (desglose por día y anuncio).
// Con META_ACCESS_TOKEN en Netlify, meta-sync.mts lo lee de la API cada mañana y escribe en este mismo almacén (meta_rows_YYYY-MM).
// GET  ?month=YYYY-MM → filas del mes, meses con datos, presupuestos por espectáculo y cuenta
// POST {rows}         → importa filas; sustituye las de los mismos días y deja el resto
// PUT  {month,show,budget} → presupuesto Meta de un espectáculo en un mes
type Row = { date: string; dateEnd?: string; month?: string; status?: string; results?: number; resultType?: string; budget?: number; budgetType?: string; end?: string; campaign: string; adset: string; ad: string; spend: number; impressions: number; reach: number; clicks: number; lpv: number; checkouts: number; purchases: number; value: number; campaignId?: string; adId?: string };
const N = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0 };
const S = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);
const okMonth = (m: string | null) => !!m && /^\d{4}-\d{2}$/.test(m);

async function months(): Promise<string[]> {
  const res = await controlStore().list({ prefix: "meta_rows_" });
  return res.blobs.map((b) => b.key.slice(10)).filter(okMonth).sort();
}

// Primera carga: la exportación por anuncios del 3 sept. al 2 oct. 2026 que pasó Fer.
// Se aplica una sola vez y solo en meses sin datos (nunca pisa una importación hecha desde la app).
async function ensureSeed() {
  const st = controlStore(), flag = `meta_seed_${(seed as any).id}`;
  if (await st.get(flag)) return;
  const now = new Date().toISOString();
  for (const [m, rows] of Object.entries((seed as any).months as Record<string, Row[]>)) {
    if (await st.get(`meta_rows_${m}`)) continue;
    await st.setJSON(`meta_rows_${m}`, { rows, totals: null, importedAt: now, importedBy: "Exportación de Meta (carga inicial)" });
  }
  const map = (await st.get("meta_map", { type: "json" }) as Record<string, string> | null) || {};
  for (const [k, v] of Object.entries((seed as any).map as Record<string, string>)) if (!map[k]) map[k] = v;
  await st.setJSON("meta_map", map);
  await st.setJSON(flag, { at: now, source: (seed as any).source });
}

export default async (req: Request) => {
  const url = new URL(req.url), st = controlStore();
  const account = (Netlify.env.get("META_AD_ACCOUNT") || "6036157816619").replace(/^act_/, "");
  if (req.method === "GET") {
    const auth = await requireAccess(req, "meta", false); if (auth.response) return auth.response;
    await ensureSeed().catch((e) => console.error("meta seed", e));
    const all = await months(), cur = new Date().toISOString().slice(0, 7);
    const month = okMonth(url.searchParams.get("month")) ? url.searchParams.get("month")! : all.includes(cur) || !all.length ? cur : all[all.length - 1];
    const doc = await st.get(`meta_rows_${month}`, { type: "json" }) as { rows: Row[]; importedAt?: string; importedBy?: string; totals?: unknown; source?: string } | null;
    const sync = await st.get("meta_sync", { type: "json" }) as any, thumbs = ((await st.get("meta_thumbs", { type: "json" }) as any) || {}).thumbs || {};
    const budgets = (await st.get("meta_budgets", { type: "json" }) as Record<string, Record<string, number>> | null) || {};
    const map = (await st.get("meta_map", { type: "json" }) as Record<string, string> | null) || {};
    return Response.json({ map, account, month, months: all, rows: doc?.rows || [], totals: doc?.totals || null, importedAt: doc?.importedAt || null, importedBy: doc?.importedBy || null, budgets: budgets[month] || {}, source: doc?.source || "export", api: { ready: metaApiReady(), at: sync?.at || null, okAt: sync?.okAt || null, ok: sync ? !!sync.ok : null, error: sync?.ok === false ? sync.error : null }, thumbs }, { headers: { "cache-control": "no-store" } });
  }
  if (req.method === "POST") {
    const auth = await requireAccess(req, "meta", true); if (auth.response) return auth.response;
    let body: any = {}; try { body = await req.json(); } catch {}
    // Botón «Actualizar ahora»: lee Meta en el momento
    if (body?.sync) {
      if (!metaApiReady()) return Response.json({ error: "Falta META_ACCESS_TOKEN en Netlify." }, { status: 400 });
      const r = await syncMeta(auth.actor!.email);
      if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
      await appendAudit({ actor: auth.actor!, module: "meta", elementId: "meta-sync", action: "import", note: `Lectura de Meta: ${r.result!.map((o: any) => `${o.month}: ${o.days} días`).join(", ")}` });
      return Response.json({ ok: true, imported: r.result });
    }
    const rows: Row[] = (Array.isArray(body?.rows) ? body.rows : []).slice(0, 50000).map((r: any) => ({
      date: S(r.date, 10), campaign: S(r.campaign), adset: S(r.adset), ad: S(r.ad), spend: N(r.spend), impressions: N(r.impressions), reach: N(r.reach),
      clicks: N(r.clicks), lpv: N(r.lpv), checkouts: N(r.checkouts), purchases: N(r.purchases), value: N(r.value), campaignId: S(r.campaignId, 40) || undefined, adId: S(r.adId, 40) || undefined,
      dateEnd: /^\d{4}-\d{2}-\d{2}$/.test(S(r.dateEnd, 10)) ? S(r.dateEnd, 10) : undefined, month: okMonth(S(r.month, 7)) ? S(r.month, 7) : undefined,
      status: S(r.status, 40) || undefined, results: N(r.results), resultType: S(r.resultType, 80) || undefined, budget: N(r.budget), budgetType: S(r.budgetType, 60) || undefined,
      end: /^\d{4}-\d{2}-\d{2}$/.test(S(r.end, 10)) ? S(r.end, 10) : undefined,
    })).filter((r: Row) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && (r.campaign || r.ad));
    if (!rows.length) return Response.json({ error: "No hay filas válidas. La exportación necesita la columna de día y el nombre de la campaña o del anuncio." }, { status: 400 });
    const byMonth = new Map<string, Row[]>();
    for (const r of rows) { const m = r.month || r.date.slice(0, 7); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m)!.push(r); }
    const now = new Date().toISOString(), out: { month: string; rows: number; days: number }[] = [];
    for (const [m, list] of byMonth) {
      const days = new Set(list.map((r) => r.date)), period = list.some((r) => r.dateEnd);
      const prev = (await st.get(`meta_rows_${m}`, { type: "json" }) as { rows: Row[] } | null)?.rows || [];
      // Totales de un periodo sustituyen todo el mes; datos diarios sustituyen esos días (y los totales previos, para no contar dos veces)
      const keep = period ? [] : prev.filter((r) => !r.dateEnd && !days.has(r.date));
      const merged = [...keep, ...list].sort((a, b) => a.date.localeCompare(b.date));
      // Totales de Meta (alcance deduplicado) solo valen para una exportación de periodo de ese mes
      const t = body?.totals, tm = t && (S(t.month, 7) || S(t.date, 7));
      const totals = period && t && tm === m ? { reach: N(t.reach), impressions: N(t.impressions), spend: N(t.spend), date: S(t.date, 10), dateEnd: S(t.dateEnd, 10) } : null;
      await st.setJSON(`meta_rows_${m}`, { rows: merged, totals, importedAt: now, importedBy: auth.actor!.email });
      out.push({ month: m, rows: list.length, days: days.size });
    }
    await appendAudit({ actor: auth.actor!, module: "meta", elementId: "meta-import", action: "import", note: `Exportación de Meta: ${rows.length} filas (${out.map((o) => `${o.month}: ${o.days} días`).join(", ")})` });
    return Response.json({ ok: true, imported: out });
  }
  if (req.method === "PUT") {
    const auth = await requireAccess(req, "meta", true); if (auth.response) return auth.response;
    let body: any = {}; try { body = await req.json(); } catch {}
    // Asignar una campaña a un espectáculo (cuando el nombre de la campaña no lo deja claro)
    if (body?.map) {
      const campaign = S(body.map.campaign), show = S(body.map.show, 120).toUpperCase();
      if (!campaign) return Response.json({ error: "Falta la campaña" }, { status: 400 });
      const map = (await st.get("meta_map", { type: "json" }) as Record<string, string> | null) || {};
      if (show) map[campaign] = show; else delete map[campaign];
      await st.setJSON("meta_map", map);
      await appendAudit({ actor: auth.actor!, module: "meta", elementId: "meta-map", action: "update", note: `Campaña «${campaign}» → ${show || "(automático)"}` });
      return Response.json({ ok: true, map });
    }
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
