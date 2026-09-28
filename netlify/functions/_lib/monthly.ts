import { carteleriaStore, controlStore } from "./store.ts";
import { listRecords } from "./records.ts";
import { SLOT_NAMES } from "./calendar.ts";
import { loadContracts } from "./radio.ts";

// Resumen de toda la publicidad de un mes (YYYY-MM): Cartelería, Home Ticket, Radio, Taxis,
// Intercambiadores, Revistas y comunicación (hitos). Lo usan la sección Archivo y el correo mensual.
export type Line = { title: string; detail: string; date?: string };
export type Section = { key: string; name: string; lines: Line[]; note?: string };
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
  for (const [key, v] of Object.entries(state.schedule || {}) as any) {
    const inst = v?.installDate || "", rem = v?.removeDate || "";
    if (!v?.title || !inst || inst > last || (rem && rem < first)) continue;
    cart.push({ title: v.title, detail: `${SLOT_NAMES[key] || key} · ${inst >= first ? "instalado el " + fmt(inst) : "desde " + fmt(inst)}${rem && rem <= last ? " · retirado el " + fmt(rem) : ""}`, date: inst });
  }
  const mont: Line[] = [];
  const list = await controlStore().list({ prefix: "montaje_" });
  for (const b of list.blobs) {
    const r: any = await controlStore().get(b.key, { type: "json" });
    if (!r?.date || r.date < first || r.date > last) continue;
    const names = (r.slots || []).map((k: string) => SLOT_NAMES[k] || k).join(", ");
    mont.push({ title: `Montaje confirmado · ${fmt(r.date)}`, detail: `${names}${Object.keys(r.photos || {}).length ? " · " + Object.keys(r.photos).length + " foto(s)" : ""}`, date: r.date });
  }
  sections.push({ key: "carteleria", name: "Cartelería · Gran Teatro Pavón", lines: [...cart.sort((a, b) => a.detail.localeCompare(b.detail)), ...mont.sort((a, b) => String(a.date).localeCompare(String(b.date)))] });

  // Home Ticket
  const ht = (await listRecords("hometicket")).filter(overlaps);
  sections.push({ key: "hometicket", name: "Home Ticket", lines: ht.sort((a, b) => String(a.venue).localeCompare(String(b.venue)) || String(a.position).localeCompare(String(b.position)))
    .map((r) => ({ title: r.spectacle || "Sin espectáculo", detail: `${short(r.venue)} · ${HT_NAMES[r.position] || r.position || ""} · ${range(r.startDate, r.endDate)}` })) });

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
      const bySpec = new Map<string, number>(); rr.forEach((r) => bySpec.set(r.spectacle || "Sin espectáculo", (bySpec.get(r.spectacle || "Sin espectáculo") || 0) + n(r.plannedSpots)));
      rLines.push({ title: `${short(c.venue)} · ${c.brand}`, detail: !p ? `sin asignar · ${cap.toLocaleString("es-ES")} ${u} contratadas` : `${p.toLocaleString("es-ES")} de ${cap.toLocaleString("es-ES")} ${u} asignadas${q ? " · " + q.toLocaleString("es-ES") + " certificadas" : ""}${bySpec.size ? " · " + [...bySpec].map(([s, v]) => `${s} (${v})`).join(", ") : ""}` });
    }
  }
  radio.filter((r) => !r.contractId && overlaps(r)).forEach((r) => rLines.push({ title: r.spectacle || "Sin espectáculo", detail: [short(r.venue), r.station, r.frequency, range(r.startDate, r.endDate)].filter(Boolean).join(" · ") }));
  sections.push({ key: "radio", name: "Radio", lines: rLines });

  // Taxis e intercambiadores
  for (const [m, name] of [["taxis", "Taxis"], ["intercambiadores", "Intercambiadores"]] as const) {
    const rows = (await listRecords(m)).filter(overlaps);
    sections.push({ key: m, name, lines: rows.map((r) => ({ title: r.spectacle || r.campaignName || "Campaña", detail: [short(r.venue), r.support, range(r.startDate, r.endDate)].filter(Boolean).join(" · ") })) });
  }

  // Revistas: una página por revista y mes
  const rev = (await listRecords("revistas")).filter((r) => r.month === month);
  sections.push({ key: "revistas", name: "Revistas de Teatros", lines: rev.sort((a, b) => String(a.magazine).localeCompare(String(b.magazine))).map((r) => ({ title: r.spectacle || "Sin espectáculo", detail: [r.magazine, short(r.venue)].filter(Boolean).join(" · ") })) });

  // Comunicación: notas de prensa, ruedas de prensa, estrenos… (hitos del Calendario)
  const hitos = (await listRecords("hitos")).filter((r) => r.date >= first && r.date <= last).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  sections.push({ key: "hitos", name: "Comunicación", lines: hitos.map((r) => ({ title: String(r.title || "").toLowerCase().startsWith(String(r.type || "").toLowerCase()) ? r.title : `${r.type || "Hito"} · ${r.title || r.spectacle || ""}`, detail: [fmt(r.date) + (r.time ? " " + r.time : ""), short(r.venue), r.place].filter(Boolean).join(" · "), date: r.date })) });

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
