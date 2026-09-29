import { carteleriaStore, controlStore } from "./store.ts";
import { listRecords } from "./records.ts";
import { SLOT_NAMES } from "./calendar.ts";
import { loadContracts } from "./radio.ts";
import { FACADE_VIEWS, FACADE_SLOTS } from "./facade.ts";

// Resumen de toda la publicidad de un mes (YYYY-MM): Cartelería, Home Ticket, Radio, Taxis,
// Intercambiadores, Revistas y comunicación (hitos). Lo usan la sección Archivo y el correo mensual.
import type { ImgRef } from "./thumbs.ts";
export type Line = { title: string; detail: string; date?: string; time?: string; kicker?: string; img?: ImgRef; wide?: boolean; small?: boolean; empty?: boolean; collage?: boolean; stat?: { used: number; cap: number; cert: number; unit: string; parts: [string, number][] } };
export type Section = { key: string; name: string; lines: Line[]; note?: string; count?: string };
export type MonthSummary = { month: string; label: string; first: string; last: string; totals: { label: string; value: number }[]; sections: Section[] };

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const fmt = (iso: string) => iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "") : "";
const range = (a?: string, b?: string) => a && b ? `${fmt(a)} – ${fmt(b)}` : a ? `desde ${fmt(a)}` : b ? `hasta ${fmt(b)}` : "";
const HT_NAMES: Record<string, string> = { "HT Superior · 520 × 420": "Superior", "HT Inferior · 520 × 420": "Inferior", "Home Ticket XL · 520 × 856": "XL" };
const short = (v: string) => String(v || "").replace("Gran Teatro CaixaBank ", "").replace("Gran Teatro ", "");

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
  return { first: `${month}-01`, last: `${month}-${String(last).padStart(2, "0")}`, label };
}
export function previousMonth(isoDay: string) { const [y, m] = isoDay.split("-").map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); }

export async function monthSummary(month: string, origin: string): Promise<MonthSummary> {
  const { first, last, label } = monthBounds(month);
  const overlaps = (r: any) => { const s = r.startDate || r.endDate, e = r.endDate || r.startDate; return !!s && s <= last && e >= first; };
  const sections: Section[] = [];

  // Cartelería: soportes con cartel durante el mes + montajes confirmados
  const state: any = await carteleriaStore().get("state", { type: "json" }) || {};
  const cart: Line[] = [];
  for (const key of new Set([...Object.keys(state.slots || {}), ...Object.keys(state.schedule || {})])) {
    const v: any = (state.schedule || {})[key] || {};
    const inst = v?.installDate || "", rem = v?.removeDate || "";
    // Cuenta todo soporte con cartel durante el mes, tenga o no fecha de instalación apuntada
    const hasImg = !!state.slots?.[key]?.hasImage;
    if ((!v?.title && !hasImg) || (inst && inst > last) || (rem && rem < first)) continue;
    const when = inst ? (inst >= first ? "instalado el " + fmt(inst) : "desde " + fmt(inst)) : "en fachada";
    const slot = SLOT_NAMES[key] || key;
    cart.push({ title: v?.title || slot, detail: `${v?.title ? slot + " · " : ""}${when}${rem && rem <= last ? " · retirado el " + fmt(rem) : ""}`, date: inst, img: hasImg ? { kind: "cart", key } : undefined, small: true });
  }
  // Último montaje del mes: si tiene fotos reales, esas son la imagen de la fachada
  let lastMont: any = null;
  const list = await controlStore().list({ prefix: "montaje_" });
  for (const b of list.blobs) {
    const r: any = await controlStore().get(b.key, { type: "json" });
    if (!r?.date || r.date < first || r.date > last) continue;
    if (!lastMont || String(r.createdAt || r.date) > String(lastMont.createdAt || lastMont.date)) lastMont = r;
  }
  const facade: Line[] = [];
  const photos = lastMont ? Object.entries(lastMont.photos || {}) as [string, string][] : [];
  if (photos.length) photos.forEach(([slot, k]) => facade.push({ title: SLOT_NAMES[slot] || slot, detail: `Foto del montaje · ${fmt(lastMont.date)}`, img: { kind: "asset", key: k }, wide: true }));
  else for (const v of FACADE_VIEWS) {
    const withPoster = FACADE_SLOTS.filter((x) => x.view === v.id && state.slots?.[x.key]?.hasImage).length;
    if (withPoster) facade.push({ title: v.name, detail: `${withPoster} ${withPoster === 1 ? "cartel" : "carteles"}${lastMont ? " · último montaje el " + fmt(lastMont.date) : ""}`, img: { kind: "facade", key: v.id }, wide: true });
  }
  // En el correo, las vistas (o fotos) de la fachada van juntas en un collage tipo polaroid
  const facadeLines: Line[] = facade.length > 1 ? [{ title: facade.map((l) => l.title).join(" · "), detail: facade[0].detail.includes("montaje") && photos.length ? `Fotos del montaje · ${fmt(lastMont.date)}` : (lastMont ? "Último montaje el " + fmt(lastMont.date) : "Fachada del mes"), img: { kind: "collage", key: "facade", refs: facade.map((l) => l.img!).filter(Boolean) }, collage: true }] : facade;
  sections.push({ key: "carteleria", name: "Cartelería · Gran Teatro Pavón", lines: facadeLines, count: `${cart.length} ${cart.length === 1 ? "soporte" : "soportes"}` });

// Home Ticket: una miniatura compuesta por teatro y mes.
  const HT_VENUES = ["Gran Teatro Pavón", "Gran Teatro CaixaBank Príncipe Pío", "Teatro Serrano", "Gran Castillo de Pedraza", "Abono Teatro"];
  const POS_ORDER = ["Home Ticket XL · 520 × 856", "HT Superior · 520 × 420", "HT Inferior · 520 × 420"];
  const rowMonth = (r:any) => r.month || String(r.startDate || "").slice(0,7) || String(r.endDate || "").slice(0,7);
  const ht = (await listRecords("hometicket")).filter((r:any) => rowMonth(r) === month || (!r.month && overlaps(r)));
  const htVenues = [...HT_VENUES, ...new Set(ht.map((r:any) => r.venue).filter((v:any) => v && !HT_VENUES.includes(v)))];
  const htLines: Line[] = [];
  for (const v of htVenues) {
    const mine = ht.filter((r:any) => r.venue === v).sort((a:any,b:any) => POS_ORDER.indexOf(a.position)-POS_ORDER.indexOf(b.position));
    if (!mine.length) { htLines.push({ title: short(v), detail: "Sin piezas este mes", empty: true }); continue; }
    const composite = [...mine].sort((a:any,b:any)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).find((r:any)=>r.compositeAssetKey)?.compositeAssetKey;
    const pieces = mine.map((r:any)=>`${HT_NAMES[r.position] || r.position}: ${r.spectacle || "Sin espectáculo"}`).join(" · ");
    htLines.push({
      title: short(v),
      detail: pieces,
      img: composite ? { kind: "asset" as const, key: composite } : (mine[0]?.assetKey ? { kind:"asset" as const, key: mine[0].assetKey } : undefined),
      wide: true
    });
  }
  sections.push({ key: "hometicket", name: "Home Ticket", lines: htLines });

  // Radio: por contrato (contratado / asignado / certificado) y registros sin contrato
  const radio = await listRecords("radio");
  const contracts = await loadContracts(origin).catch(() => [] as any[]);
  const rLines: Line[] = []; let planned = 0, actual = 0;
  for (const c of contracts) {
    const rows = radio.filter((r) => r.contractId === c.id && r.inventoryMonth === month);
    const units = [...new Set((c.lines || []).map((l: any) => l.unit))] as string[];
    for (const u of units) {
      const ls = (c.lines || []).filter((l: any) => l.unit === u && n(l.monthly?.[month]) > 0); if (!ls.length) continue;
      const cap = ls.reduce((a: number, l: any) => a + n(l.monthly?.[month]), 0);
      const rr = rows.filter((r) => ls.some((l: any) => l.id === r.lineId));
      const p = rr.reduce((a, r) => a + n(r.plannedSpots), 0), q = rr.reduce((a, r) => a + n(r.actualSpots), 0);
      if (u === "cuñas") { planned += p; actual += q; }
      const nm = (r: any) => r.spectacle || r.campaignName || "Sin espectáculo";
      const bySpec = new Map<string, number>(); rr.forEach((r) => bySpec.set(nm(r), (bySpec.get(nm(r)) || 0) + n(r.plannedSpots)));
      rLines.push({ stat: { used: p, cap, cert: q, unit: u, parts: [...bySpec].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]) }, title: `${short(c.venue)} · ${c.brand}`, detail: !p ? `sin asignar · ${cap.toLocaleString("es-ES")} ${u} contratadas` : `${p.toLocaleString("es-ES")} de ${cap.toLocaleString("es-ES")} ${u} asignadas${q ? " · " + q.toLocaleString("es-ES") + " certificadas" : ""}${bySpec.size ? " · " + [...bySpec].map(([s, v]) => `${s} (${v})`).join(", ") : ""}` });
    }
  }
  radio.filter((r) => !r.contractId && overlaps(r)).forEach((r) => rLines.push({ title: r.spectacle || "Sin espectáculo", detail: [short(r.venue), r.station, r.frequency, range(r.startDate, r.endDate)].filter(Boolean).join(" · ") }));
  sections.push({ key: "radio", name: "Radio", lines: rLines });

  // Taxis e intercambiadores
  for (const [m, name] of [["taxis", "Taxis"], ["intercambiadores", "Intercambiadores"]] as const) {
    const rows = (await listRecords(m)).filter(overlaps);
    sections.push({ key: m, name, lines: rows.map((r) => ({ title: r.spectacle || r.campaignName || "Campaña", detail: [short(r.venue), r.support, range(r.startDate, r.endDate)].filter(Boolean).join(" · "), img: r.assetKey ? { kind: "asset" as const, key: r.assetKey } : undefined })) });
  }

  // Revistas: una página por revista y mes
  const rev = (await listRecords("revistas")).filter((r) => r.month === month);
  sections.push({ key: "revistas", name: "Revistas de Teatros", lines: rev.sort((a, b) => String(a.magazine).localeCompare(String(b.magazine))).map((r) => ({ kicker: r.magazine === "Revista Teatros" ? "Teatros" : (r.magazine || "Revista"), title: r.spectacle || "Sin espectáculo", detail: short(r.venue), img: r.assetKey ? { kind: "asset" as const, key: r.assetKey } : undefined })) });

  // Comunicación: notas de prensa, ruedas de prensa, estrenos… (hitos del Calendario)
  const hitos = (await listRecords("hitos")).filter((r) => r.date >= first && r.date <= last).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  sections.push({ key: "hitos", name: "Comunicación", lines: hitos.map((r) => ({ title: String(r.title || "").toLowerCase().startsWith(String(r.type || "").toLowerCase()) ? r.title : `${r.type || "Hito"} · ${r.title || r.spectacle || ""}`, detail: [short(r.venue), r.place].filter(Boolean).join(" · "), date: r.date, time: r.time || "" })) });

  const totals = [
    { label: "soportes de fachada", value: cart.length },
    { label: "piezas Home Ticket", value: ht.length },
    { label: actual ? "cuñas certificadas" : "cuñas asignadas", value: actual || planned },
    { label: "campañas taxis e intercambiadores", value: sections.filter((s) => s.key === "taxis" || s.key === "intercambiadores").reduce((a, s) => a + s.lines.length, 0) },
    { label: "páginas en revistas", value: rev.length },
    { label: "acciones de comunicación", value: hitos.length },
  ];
  return { month, label: label.charAt(0).toUpperCase() + label.slice(1), first, last, totals, sections };
}
