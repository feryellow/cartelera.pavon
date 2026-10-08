import { controlStore } from "./store.ts";

// Lectura diaria de Meta (Marketing API, solo lectura con ads_read).
// Escribe en el mismo almacén que la importación de Excel (meta_rows_YYYY-MM): un mes leído de la API
// sustituye a lo que hubiera de ese mes. Miniaturas en meta_thumbs y estado de la última lectura en meta_sync.
const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) || (globalThis as any).process?.env?.[k] || "";
// Token: el de Netlify (META_ACCESS_TOKEN) o, si no lo ve la función, el pegado en Yellow Control (Digital › Datos y conexión)
let TOKEN = "";
export async function metaToken(): Promise<{ token: string; source: "netlify" | "app" | "" }> {
  const e = env("META_ACCESS_TOKEN");
  if (e) return { token: e, source: "netlify" };
  const b = await controlStore().get("meta_token", { type: "json" }).catch(() => null) as { token?: string } | null;
  return b?.token ? { token: b.token, source: "app" } : { token: "", source: "" };
}
export async function metaApiReady() { return Boolean((await metaToken()).token); }
const account = () => "act_" + (env("META_AD_ACCOUNT") || "6036157816619").replace(/^act_/, "");
const GRAPH = () => `https://graph.facebook.com/${env("META_API_VERSION") || "v23.0"}`;

// Si Meta responde «Please reduce the amount of data you're asking for», se repite la misma página
// pidiendo la mitad de filas (hasta 10), en lugar de dar la lectura por fallida.
const tooMuch = (e: any) => /reduce the amount of data/i.test(String(e?.message || "")) || e?.error_subcode === 1504018;
async function graph(path: string, params: Record<string, string>) {
  const out: any[] = [];
  let url: string | null = `${GRAPH()}/${path}?` + new URLSearchParams({ ...params, access_token: TOKEN });
  for (let page = 0; url && page < 200; page++) {
    const r = await fetch(url);
    const j: any = await r.json().catch(() => ({}));
    if ((!r.ok || j.error) && tooMuch(j.error)) {
      const u = new URL(url), lim = Number(u.searchParams.get("limit") || 100);
      if (lim > 10) { u.searchParams.set("limit", String(Math.max(10, Math.floor(lim / 2)))); url = u.toString(); page--; continue; }
    }
    if (!r.ok || j.error) {
      const e = j.error || {};
      const msg = tooMuch(e) ? "Meta no deja leer tantos datos de una vez ni pidiendo páginas pequeñas; se reintentará mañana." : e.code === 190 ? "El token de Meta no es válido o se ha revocado." : e.code === 200 || e.code === 10 ? "El token no tiene permiso ads_read sobre la cuenta publicitaria." : e.code === 17 || e.code === 4 || e.code === 80004 ? "Meta ha limitado las consultas por exceso de uso; se reintentará mañana." : `Meta ${r.status}: ${String(e.message || "error").slice(0, 200)}`;
      throw new Error(msg);
    }
    out.push(...(j.data || []));
    url = j.paging?.next || null;
  }
  return out;
}

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };
const pick = (list: any[] | undefined, types: string[]) => { for (const t of types) { const a = (list || []).find((x) => x.action_type === t); if (a) return n(a.value); } return 0; };
const LPV = ["omni_landing_page_view", "landing_page_view"];
const CHECKOUT = ["omni_initiated_checkout", "initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"];
const PURCHASE = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
const STATUS: Record<string, string> = { ACTIVE: "active", PAUSED: "paused", CAMPAIGN_PAUSED: "paused", ADSET_PAUSED: "paused", ARCHIVED: "archived", DELETED: "permanently_deleted" };
const day = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : undefined);

function monthRange(m: string) {
  const [y, mo] = m.split("-").map(Number), last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const today = new Date().toISOString().slice(0, 10), until = `${m}-${String(last).padStart(2, "0")}`;
  return { since: `${m}-01`, until: until > today ? today : until };
}

/** Metadatos de los anuncios: estado, objetivo, presupuesto, fin y miniatura. */
async function adsInfo() {
  const ads = await graph(`${account()}/ads`, {
    limit: "100",
    fields: "id,name,effective_status,adset{optimization_goal,end_time,lifetime_budget,daily_budget},campaign{name,stop_time,lifetime_budget,daily_budget},creative.thumbnail_width(320).thumbnail_height(320){thumbnail_url,image_url}",
  });
  const info: Record<string, any> = {};
  for (const a of ads) info[a.id] = a;
  return info;
}

function resultOf(goal: string, r: any, base: { lpv: number; clicks: number; reach: number; purchases: number }) {
  switch (goal) {
    case "LANDING_PAGE_VIEWS": return { results: base.lpv, resultType: "actions:omni_landing_page_view" };
    case "LINK_CLICKS": return { results: base.clicks, resultType: "actions:link_click" };
    case "REACH": case "IMPRESSIONS": return { results: base.reach, resultType: "reach" };
    case "PAGE_LIKES": return { results: pick(r.actions, ["like"]), resultType: "actions:like" };
    case "OFFSITE_CONVERSIONS": case "VALUE": return { results: base.purchases, resultType: "actions:omni_purchase" };
    case "POST_ENGAGEMENT": return { results: pick(r.actions, ["post_engagement"]), resultType: "actions:post_engagement" };
    case "THRUPLAY": return { results: pick(r.actions, ["video_view"]), resultType: "actions:video_view" };
    default: return { results: 0, resultType: undefined };
  }
}

/** Lee un mes completo por anuncio y día y lo guarda. Devuelve cuántas filas y días. */
export async function syncMonth(m: string, info?: Record<string, any>) {
  info = info || (await adsInfo());
  const { since, until } = monthRange(m);
  const data = await graph(`${account()}/insights`, {
    level: "ad", time_increment: "1", limit: "200",
    time_range: JSON.stringify({ since, until }),
    fields: "date_start,campaign_id,campaign_name,adset_name,ad_id,ad_name,spend,impressions,reach,inline_link_clicks,actions,action_values",
  });
  const today = new Date().toISOString().slice(0, 10);
  const rows = data.map((r: any) => {
    const a = info![r.ad_id] || {}, set = a.adset || {}, camp = a.campaign || {};
    const lpv = pick(r.actions, LPV), clicks = n(r.inline_link_clicks), reach = n(r.reach), purchases = pick(r.actions, PURCHASE);
    const end = day(set.end_time) || day(camp.stop_time);
    const lifetime = n(camp.lifetime_budget) || n(set.lifetime_budget), daily = n(camp.daily_budget) || n(set.daily_budget);
    let status = STATUS[a.effective_status] || (a.effective_status ? "not_delivering" : undefined);
    if (status === "active" && end && end < today) status = "not_delivering";
    return {
      date: r.date_start, campaign: String(r.campaign_name || ""), adset: String(r.adset_name || ""), ad: String(r.ad_name || ""),
      campaignId: r.campaign_id, adId: r.ad_id,
      spend: n(r.spend), impressions: n(r.impressions), reach, clicks, lpv,
      checkouts: pick(r.actions, CHECKOUT), purchases, value: pick(r.action_values, PURCHASE),
      ...resultOf(set.optimization_goal || "", r, { lpv, clicks, reach, purchases }),
      status, end,
      budget: lifetime ? lifetime / 100 : daily ? daily / 100 : 0,
      budgetType: lifetime ? "Toda la campaña" : daily ? "Diario" : undefined,
    };
  }).sort((x: any, y: any) => x.date.localeCompare(y.date));
  const st = controlStore(), now = new Date().toISOString();
  await st.setJSON(`meta_rows_${m}`, { rows, totals: null, importedAt: now, importedBy: "Meta (lectura automática)", source: "api" });
  return { month: m, rows: rows.length, days: new Set(rows.map((r: any) => r.date)).size };
}

/** Mes en curso siempre; el anterior los 3 primeros días (Meta corrige cifras con retraso) y la primera vez. */
export async function syncMeta(trigger: string, onlyCurrent = false) {
  const st = controlStore(), now = new Date();
  const cur = now.toISOString().slice(0, 7);
  const prevD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), prev = prevD.toISOString().slice(0, 7);
  const last = (await st.get("meta_sync", { type: "json" }) as any) || {};
  const months = [cur];
  if (!onlyCurrent && (now.getUTCDate() <= 3 || !(last.months || []).includes(prev))) months.unshift(prev);
  try {
    TOKEN = (await metaToken()).token;
    if (!TOKEN) throw new Error("Falta el token de Meta: pégalo en Digital › Datos y conexión o en Netlify (META_ACCESS_TOKEN).");
    const info = await adsInfo();
    const out = [];
    for (const m of months) out.push(await syncMonth(m, info));
    const thumbs: Record<string, string> = {};
    for (const a of Object.values(info)) {
      const url = a.creative?.thumbnail_url || a.creative?.image_url;
      if (url) { thumbs[a.id] = url; if (a.name) thumbs[`name:${a.name}`] = url; }
    }
    await st.setJSON("meta_thumbs", { at: now.toISOString(), thumbs });
    const done = Array.from(new Set([...(last.months || []), ...months])).sort();
    await st.setJSON("meta_sync", { at: now.toISOString(), okAt: now.toISOString(), ok: true, trigger, result: out, months: done });
    return { ok: true, result: out };
  } catch (e: any) {
    await st.setJSON("meta_sync", { ...last, at: now.toISOString(), ok: false, trigger, error: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
}
