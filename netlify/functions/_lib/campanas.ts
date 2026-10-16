import { carteleriaStore, controlStore } from "./store.ts";
import { listRecords } from "./records.ts";
import { loadContracts } from "./radio.ts";
import { SLOT_NAMES } from "./calendar.ts";
import { FACADE_SLOTS, ARLEQUIN_SLOTS } from "./facade.ts";
import { mediaUrl } from "./media.ts";

// «En campaña ahora»: qué publicidad está activa hoy o esta semana, agrupada por espectáculo.
// Solo lectura y sin importes: lo puede ver todo el equipo interno.
export type Soporte = { medium: string; label: string; detail: string; venue: string; start: string; end: string; today: boolean; thumb: { url: string; kind: "image" | "video" | "audio" | "cart" } | null; link: string };
export type Show = { name: string; venues: string[]; media: Soporte[]; mediums: string[] };

const D = (s: string) => new Date(s + "T12:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, k: number) => { const d = D(s); d.setUTCDate(d.getUTCDate() + k); return iso(d); };
const weekOf = (t: string) => { const d = D(t); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); const first = iso(d); return { first, last: addDays(first, 6) }; };
const lastDay = (m: string) => { const [y, mo] = m.split("-").map(Number); return iso(new Date(Date.UTC(y, mo, 0))); };
const short = (v: string) => String(v || "").replace("Gran Teatro CaixaBank ", "").replace("Gran Teatro ", "");
const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const cap = (s: string) => { const t = String(s || "").trim(); return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t; };
const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const HT_POS: Record<string, string> = { "HT Superior · 520 × 420": "Superior", "HT Inferior · 520 × 420": "Inferior", "Home Ticket XL · 520 × 856": "XL" };

export async function activeCampaigns(origin: string, today: string, range: "semana" | "mes" = "semana") {
  const month = today.slice(0, 7), { first, last } = range === "mes" ? { first: `${month}-01`, last: lastDay(month) } : weekOf(today);
  const overlaps = (s?: string, e?: string) => { const a = s || e, b = e || s; return !!a && a <= last && b! >= first; };
  const isToday = (s?: string, e?: string) => { const a = s || e, b = e || s; return !!a && a <= today && b! >= today; };
  const groups = new Map<string, Show>(), display = new Map<string, string>();
  const add = (name: string, s: Soporte) => {
    const k = norm(name) || "SIN ESPECTACULO";
    if (!display.has(k) || /[a-z]/.test(name)) display.set(k, cap(name) || "Sin espectáculo");
    const g = groups.get(k) || { name: "", venues: [], media: [], mediums: [] };
    g.media.push(s); if (s.venue && !g.venues.includes(s.venue)) g.venues.push(s.venue); if (!g.mediums.includes(s.medium)) g.mediums.push(s.medium);
    groups.set(k, g);
  };
  const asset = (r: any, module: string) => {
    const key = r.compositeAssetKey || r.posterKey || r.assetKey; if (!key) return null;
    const video = VIDEO.test(r.assetName || "") && !r.posterKey;
    return { url: mediaUrl(origin, key, module), kind: (module === "radio" ? "audio" : video ? "video" : "image") as any };
  };

  // Radio: asignaciones que suenan esta semana
  const contracts = await loadContracts(origin).catch(() => [] as any[]);
  const lineOf = (r: any) => { for (const c of contracts) { const l = (c.lines || []).find((x: any) => x.id === r.lineId); if (l) return l; } return null; };
  for (const r of await listRecords("radio")) {
    if (!(Number(r.plannedSpots) > 0) || !overlaps(r.startDate, r.endDate)) continue;
    const l = lineOf(r), station = l?.station || r.station || "Radio", unit = r.unit || l?.unit || "cuñas";
    add(r.spectacle || r.campaignName, { medium: "Radio", label: station, detail: [`${r.plannedSpots} ${unit}`, r.duration || l?.duration].filter(Boolean).join(" · "), venue: short(r.venue), start: r.startDate || "", end: r.endDate || "", today: isToday(r.startDate, r.endDate), thumb: r.assetKey ? { url: mediaUrl(origin, r.assetKey, "radio"), kind: "audio" } : null, link: "#radio" });
  }
  // Taxis e intercambiadores
  for (const [m, name] of [["taxis", "Taxis"], ["intercambiadores", "Intercambiadores"]] as const) {
    for (const r of await listRecords(m)) {
      if (!overlaps(r.startDate, r.endDate)) continue;
      add(r.spectacle || r.campaignName, { medium: name, label: r.support || r.location || name, detail: "", venue: short(r.venue), start: r.startDate || "", end: r.endDate || "", today: isToday(r.startDate, r.endDate), thumb: asset(r, m), link: `#${m}` });
    }
  }
  // Home Ticket del mes
  for (const r of await listRecords("hometicket")) {
    if (r.month !== month || !r.spectacle) continue;
    add(r.spectacle, { medium: "Home Ticket", label: HT_POS[r.position] || r.position || "Home Ticket", detail: "", venue: short(r.venue), start: `${month}-01`, end: lastDay(month), today: true, thumb: r.assetKey ? { url: mediaUrl(origin, r.assetKey, "hometicket"), kind: "image" } : null, link: "#hometicket" });
  }
  // Revistas del mes
  for (const r of await listRecords("revistas")) {
    if (r.month !== month || !r.spectacle) continue;
    const pdf = /\.pdf$/i.test(r.assetName || "");
    add(r.spectacle, { medium: "Revistas", label: (r.magazine || "Revista").replace("Revista ", ""), detail: r.deal === "intercambio" ? "intercambio" : "una página", venue: short(r.venue), start: `${month}-01`, end: lastDay(month), today: true, thumb: r.assetKey && !pdf ? { url: mediaUrl(origin, r.assetKey, "revistas"), kind: "image" } : null, link: "#revistas" });
  }
  // Cartelería: soportes con cartel puesto
  const st: any = await carteleriaStore().get("state", { type: "json" }) || {};
  for (const [venue, slots] of [["Pavón", FACADE_SLOTS], ["Arlequín", ARLEQUIN_SLOTS]] as const) {
    for (const x of slots) {
      const v: any = st.schedule?.[x.key] || {}, has = st.slots?.[x.key]?.hasImage;
      if (!has || !v.title) continue;
      if (v.installDate && v.installDate > last) continue;
      if (v.removeDate && v.removeDate < first) continue;
      add(v.title, { medium: "Cartelería", label: SLOT_NAMES[x.key] || x.key, detail: v.status && v.status !== "instalado" ? v.status : "", venue, start: v.installDate || "", end: v.removeDate || "", today: (!v.installDate || v.installDate <= today) && (!v.removeDate || v.removeDate >= today), thumb: { url: `/api/image?key=${encodeURIComponent(x.key)}`, kind: "cart" }, link: `#carteleria?soporte=${x.key}` });
    }
  }
  // Digital (Meta): anuncios con inversión en los últimos 3 días; espectáculo por la asignación de Digital o por el nombre
  try {
    const cst = controlStore(), rows: any[] = ((await cst.get(`meta_rows_${month}`, { type: "json" }) as any)?.rows) || [];
    const map = (await cst.get("meta_map", { type: "json" }) as Record<string, string> | null) || {};
    const thumbs = ((await cst.get("meta_thumbs", { type: "json" }) as any)?.thumbs) || {};
    const since = addDays(today, -3), known = [...groups.keys()];
    const camps = new Map<string, { ad: string; adId: string; from: string; to: string }>();
    for (const r of rows) { if (!(Number(r.spend) > 0) || String(r.date) < since) continue; const c = camps.get(r.campaign) || { ad: r.ad, adId: r.adId, from: r.date, to: r.date }; if (r.date < c.from) c.from = r.date; if (r.date > c.to) c.to = r.date; camps.set(r.campaign, c); }
    for (const [campaign, c] of camps) {
      const show = map[campaign] || known.find((k) => k.length > 3 && norm(campaign).includes(k)) || "";
      add(show || campaign, { medium: "Digital", label: "Meta", detail: campaign.slice(0, 60), venue: "", start: c.from, end: c.to, today: c.to >= addDays(today, -1), thumb: thumbs[c.adId] ? { url: thumbs[c.adId], kind: "image" } : thumbs[`name:${c.ad}`] ? { url: thumbs[`name:${c.ad}`], kind: "image" } : null, link: "#meta" });
    }
  } catch { /* Digital es opcional: si no hay datos, no sale */ }

  const ORDER = ["Cartelería", "Radio", "Digital", "Taxis", "Intercambiadores", "Home Ticket", "Revistas"];
  const shows = [...groups.entries()].map(([k, g]) => ({ ...g, name: display.get(k) || k, media: g.media.sort((a, b) => ORDER.indexOf(a.medium) - ORDER.indexOf(b.medium) || a.label.localeCompare(b.label)), mediums: g.mediums.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)) }))
    .sort((a, b) => b.mediums.length - a.mediums.length || b.media.length - a.media.length || a.name.localeCompare(b.name));
  return { today, range, week: { first, last }, shows, total: shows.reduce((a, s) => a + s.media.length, 0), mediums: ORDER };
}
