import type { Config } from "@netlify/functions";
import { requireAccess, can } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { controlStore } from "./_lib/store.ts";

// Google Ads · solo lectura. Los datos los envía cada mañana un script pegado en la cuenta de Google Ads
// (Herramientas › Scripts), con una clave propia de Yellow Control. No hace falta developer token ni aprobación de Google.
// GET  ?month=YYYY-MM          → filas del mes (campaña y día), palabras clave del mes, meses con datos, estado del envío
// GET  ?script=1               → (gestión con escritura) clave para montar el script
// POST (x-yc-key)              → el script envía {months:[{month, rows, keywords}]}; cada mes sustituye al anterior
// POST {rotate:true} (sesión)  → genera una clave nueva (la anterior deja de valer)
type Row = { date: string; campaign: string; campaignId?: string; channel?: string; status?: string; budget?: number; spend: number; impressions: number; clicks: number; conversions: number; value: number };
type Kw = { campaign: string; keyword: string; match?: string; spend: number; impressions: number; clicks: number; conversions: number };
const N = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };
const S = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);
const okMonth = (m: string | null) => !!m && /^\d{4}-\d{2}$/.test(m);
const STATUS: Record<string, string> = { ENABLED: "active", PAUSED: "paused", REMOVED: "removed" };

async function ingestKey(create = false): Promise<string> {
  const st = controlStore();
  const k = await st.get("gads_key", { type: "json" }) as { key?: string } | null;
  if (k?.key || !create) return k?.key || "";
  const key = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await st.setJSON("gads_key", { key, at: new Date().toISOString() });
  return key;
}
async function months(): Promise<string[]> {
  const res = await controlStore().list({ prefix: "gads_rows_" });
  return res.blobs.map((b) => b.key.slice(10)).filter(okMonth).sort();
}
function sameKey(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default async (req: Request) => {
  const url = new URL(req.url), st = controlStore();
  if (req.method === "GET") {
    const auth = await requireAccess(req, "meta", false); if (auth.response) return auth.response;
    if (url.searchParams.get("script")) {
      if (!can(auth.actor, "meta", true)) return Response.json({ error: "Forbidden" }, { status: 403 });
      return Response.json({ key: await ingestKey(true), endpoint: `${url.origin}/api/google-ads` }, { headers: { "cache-control": "no-store" } });
    }
    const all = await months(), cur = new Date().toISOString().slice(0, 7);
    const month = okMonth(url.searchParams.get("month")) ? url.searchParams.get("month")! : all.includes(cur) || !all.length ? cur : all[all.length - 1];
    const doc = await st.get(`gads_rows_${month}`, { type: "json" }) as { rows: Row[]; keywords: Kw[]; at?: string; account?: string } | null;
    const sync = await st.get("gads_sync", { type: "json" }) as any;
    return Response.json({ month, months: all, rows: doc?.rows || [], keywords: doc?.keywords || [], receivedAt: doc?.at || null, account: sync?.account || "", connected: !!sync?.at, lastAt: sync?.at || null }, { headers: { "cache-control": "no-store" } });
  }
  if (req.method === "POST") {
    const provided = req.headers.get("x-yc-key") || "";
    if (provided) {
      const key = await ingestKey(false);
      if (!sameKey(provided, key)) return Response.json({ error: "Clave no válida. Copia de nuevo el script desde Yellow Control." }, { status: 401 });
      let body: any = {}; try { body = await req.json(); } catch {}
      const list = (Array.isArray(body?.months) ? body.months : []).slice(0, 3);
      const out: { month: string; rows: number; keywords: number }[] = [];
      const now = new Date().toISOString();
      for (const m of list) {
        const month = S(m?.month, 7); if (!okMonth(month)) continue;
        const rows: Row[] = (Array.isArray(m.rows) ? m.rows : []).slice(0, 20000).map((r: any) => ({
          date: S(r.date, 10), campaign: S(r.campaign), campaignId: S(r.campaignId, 30) || undefined, channel: S(r.channel, 40) || undefined,
          status: STATUS[S(r.status, 20)] || S(r.status, 20).toLowerCase() || undefined, budget: N(r.budget),
          spend: N(r.spend), impressions: N(r.impressions), clicks: N(r.clicks), conversions: N(r.conversions), value: N(r.value),
        })).filter((r: Row) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date.startsWith(month) && r.campaign);
        const keywords: Kw[] = (Array.isArray(m.keywords) ? m.keywords : []).slice(0, 5000).map((k: any) => ({
          campaign: S(k.campaign), keyword: S(k.keyword, 200), match: S(k.match, 20) || undefined,
          spend: N(k.spend), impressions: N(k.impressions), clicks: N(k.clicks), conversions: N(k.conversions),
        })).filter((k: Kw) => k.keyword && (k.impressions > 0 || k.spend > 0));
        await st.setJSON(`gads_rows_${month}`, { rows: rows.sort((a, b) => a.date.localeCompare(b.date)), keywords, at: now });
        out.push({ month, rows: rows.length, keywords: keywords.length });
      }
      await st.setJSON("gads_sync", { at: now, account: S(body?.account, 120), result: out });
      return Response.json({ ok: true, saved: out });
    }
    const auth = await requireAccess(req, "meta", true); if (auth.response) return auth.response;
    let body: any = {}; try { body = await req.json(); } catch {}
    if (body?.rotate) {
      await st.delete("gads_key");
      const key = await ingestKey(true);
      await appendAudit({ actor: auth.actor!, module: "meta", elementId: "gads-key", action: "update", note: "Nueva clave para el script de Google Ads (la anterior deja de funcionar)" });
      return Response.json({ ok: true, key });
    }
    return Response.json({ error: "Acción no válida" }, { status: 400 });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/google-ads" };
