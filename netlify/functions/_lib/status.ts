import { carteleriaStore } from "./store.ts";
import { listRecords } from "./records.ts";
import { loadContracts } from "./radio.ts";
import { SLOT_NAMES } from "./calendar.ts";
import { FACADE_SLOTS, ARLEQUIN_SLOTS } from "./facade.ts";

// Status de una semana (lunes a domingo): qué está programado y qué falta todavía, módulo a módulo.
// Lo usa la sección Status y el correo «cómo va la semana».
export type StatusItem = { state: "ok" | "falta" | "info"; title: string; detail: string };
export type StatusSection = { key: string; name: string; state: "ok" | "falta" | "info"; summary: string; items: StatusItem[] };
export type WeekStatus = { week: string; first: string; last: string; label: string; pending: number; sections: StatusSection[] };

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const D = (iso: string) => new Date(iso + "T12:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, k: number) => { const d = D(s); d.setUTCDate(d.getUTCDate() + k); return iso(d); };
const fmt = (s: string) => s ? D(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "") : "";
const range = (a?: string, b?: string) => a && b ? `${fmt(a)} – ${fmt(b)}` : a ? `desde ${fmt(a)}` : b ? `hasta ${fmt(b)}` : "";
const short = (v: string) => String(v || "").replace("Gran Teatro CaixaBank ", "").replace("Gran Teatro ", "");
const daysIn = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const overlapDays = (a: string, b: string, s: string, e: string) => { const x = a > s ? a : s, y = b < e ? b : e; return x > y ? 0 : Math.round((D(y).getTime() - D(x).getTime()) / 864e5) + 1; };
const fmtN = (v: number) => Math.round(v).toLocaleString("es-ES");

export function weekBounds(input: string) {
  const d = D(/^\d{4}-\d{2}-\d{2}$/.test(input) ? input : iso(new Date()));
  const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow);
  const first = iso(d), last = addDays(first, 6);
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  const label = sameMonth
    ? `del ${D(first).getUTCDate()} al ${D(last).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })}`
    : `del ${D(first).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })} al ${D(last).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })}`;
  return { first, last, label: `Semana ${label}` };
}

export async function weekStatus(weekInput: string, origin: string): Promise<WeekStatus> {
  const { first, last, label } = weekBounds(weekInput);
  const months = [...new Set([first.slice(0, 7), last.slice(0, 7)])];
  const overlaps = (r: any) => { const s = r.startDate || r.endDate, e = r.endDate || r.startDate; return !!s && s <= last && e >= first; };
  const sections: StatusSection[] = [];

  // Radio: cuñas que tocan esta semana según el contrato (en proporción a los días) frente a las asignadas
  const radio = await listRecords("radio");
  const contracts = await loadContracts(origin).catch(() => [] as any[]);
  const rItems: StatusItem[] = [];
  for (const c of contracts) {
    for (const u of [...new Set((c.lines || []).map((l: any) => l.unit))] as string[]) {
      const ls = (c.lines || []).filter((l: any) => l.unit === u);
      let cap = 0;
      for (const m of months) { const mf = `${m}-01`, ml = `${m}-${String(daysIn(m)).padStart(2, "0")}`; const k = overlapDays(first, last, mf, ml); cap += ls.reduce((a: number, l: any) => a + n(l.monthly?.[m]), 0) * k / daysIn(m); }
      if (cap < 0.5) continue;
      const rows = radio.filter((r) => r.contractId === c.id && ls.some((l: any) => l.id === r.lineId) && overlaps(r));
      let used = 0; const by = new Map<string, number>();
      for (const r of rows) {
        const s = r.startDate || r.endDate, e = r.endDate || r.startDate, tot = overlapDays(s, e, s, e) || 1, k = overlapDays(first, last, s, e);
        const v = n(r.plannedSpots) * k / tot; used += v; const nm = r.spectacle || r.campaignName || "Sin espectáculo"; by.set(nm, (by.get(nm) || 0) + v);
      }
      const left = Math.round(cap) - Math.round(used), who = [...by].filter(([, v]) => v >= 0.5).map(([k, v]) => `${k} (${fmtN(v)})`).join(", ");
      const unit = u === "impresiones" ? "impresiones" : "cuñas";
      // Las impresiones digitales no se programan por semana: solo se informa
      if (unit === "impresiones") { rItems.push({ state: "info", title: `${short(c.venue)} · ${c.brand} digital`, detail: `${fmtN(cap)} impresiones esta semana${used >= 0.5 ? ` · asignadas ${fmtN(used)}` : ""}` }); continue; }
      rItems.push({ state: left > 0 ? "falta" : "ok", title: `${short(c.venue)} · ${c.brand}`,
        detail: left > 0 ? `Faltan ${fmtN(left)} de ${fmtN(cap)} ${unit}${used >= 0.5 ? ` · asignadas ${fmtN(used)}: ${who}` : " · no hay nada asignado"}` : `${fmtN(used)} de ${fmtN(cap)} ${unit} asignadas · ${who}` });
    }
  }
  const rF = rItems.filter((x) => x.state === "falta").length;
  sections.push({ key: "radio", name: "Radio", state: rF ? "falta" : "ok", summary: rF ? `${rF} ${rF === 1 ? "emisora con cuñas" : "emisoras con cuñas"} por programar` : "Todas las cuñas de la semana asignadas", items: rItems });

  // Intercambiadores y taxis: campañas activas; si no hay ninguna, falta
  for (const [m, name] of [["intercambiadores", "Intercambiadores"], ["taxis", "Taxis"]] as const) {
    const rows = (await listRecords(m)).filter(overlaps).sort((a, b) => String(a.venue).localeCompare(String(b.venue)));
    const items: StatusItem[] = rows.map((r) => {
      const ends = r.endDate && r.endDate < last;
      return { state: ends ? "falta" : "ok", title: r.spectacle || r.campaignName || "Campaña", detail: [short(r.venue), r.support, range(r.startDate, r.endDate), ends ? `termina el ${fmt(r.endDate)}: falta lo que sigue` : ""].filter(Boolean).join(" · ") };
    });
    if (!rows.length) items.push({ state: "falta", title: `Sin campaña de ${name.toLowerCase()}`, detail: "No hay nada programado esta semana" });
    const f = items.filter((x) => x.state === "falta").length;
    sections.push({ key: m, name, state: f ? "falta" : "ok", summary: !rows.length ? "Falta programar" : f ? `${rows.length} activas · ${f} terminan antes del domingo` : `${rows.length} ${rows.length === 1 ? "campaña activa" : "campañas activas"}`, items });
  }

  // Home Ticket: cada teatro necesita un XL o un Superior y un Inferior
  const HT = ["Gran Teatro Pavón", "Gran Teatro CaixaBank Príncipe Pío", "Teatro Serrano", "Teatro Arlequín"];
  const NAME: Record<string, string> = { "HT Superior · 520 × 420": "Superior", "HT Inferior · 520 × 420": "Inferior", "Home Ticket XL · 520 × 856": "XL" };
  const ht = (await listRecords("hometicket")).filter((r: any) => r.startDate || r.endDate ? overlaps(r) : months.includes(r.month));
  const hItems: StatusItem[] = HT.map((v) => {
    const mine = ht.filter((r: any) => r.venue === v), pos = new Set(mine.map((r: any) => NAME[r.position] || r.position));
    const pieces = mine.map((r: any) => `${NAME[r.position] || r.position}: ${r.spectacle || "sin espectáculo"}`).join(" · ");
    const missing = pos.has("XL") ? [] : ["Superior", "Inferior"].filter((p) => !pos.has(p));
    return { state: missing.length ? "falta" : "ok", title: short(v), detail: missing.length ? `Falta ${missing.join(" e ")}${pieces ? " · hay " + pieces : ""}` : pieces };
  });
  const hF = hItems.filter((x) => x.state === "falta").length;
  sections.push({ key: "hometicket", name: "Home Ticket", state: hF ? "falta" : "ok", summary: hF ? `${hF} ${hF === 1 ? "teatro incompleto" : "teatros incompletos"}` : "Completo en todos los teatros", items: hItems });

  // Revistas del acuerdo: una página al mes en Teatros, AEscena y Godot
  const AGREED = [["Revista Teatros", "Teatros"], ["AEscena", "AEscena"], ["Godot", "Godot"]];
  const rev = (await listRecords("revistas")).filter((r) => months.includes(r.month));
  const vItems: StatusItem[] = [];
  for (const m of months) for (const [k, nm] of AGREED) {
    const r = rev.find((x) => x.month === m && x.magazine === k && x.deal !== "intercambio");
    const ml = D(`${m}-15`).toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
    vItems.push({ state: r ? "ok" : "falta", title: `${nm} · ${ml}`, detail: r ? `${r.spectacle || "sin espectáculo"} · ${short(r.venue)}${r.materialStatus === "pendiente" ? " · material pendiente" : ""}` : "Falta decidir la página" });
  }
  rev.filter((x) => x.deal === "intercambio" || !AGREED.some(([k]) => k === x.magazine)).forEach((r) => vItems.push({ state: "info", title: `${r.magazine} · intercambio`, detail: `${r.spectacle || ""} · ${short(r.venue)}` }));
  const vF = vItems.filter((x) => x.state === "falta").length;
  sections.push({ key: "revistas", name: "Revistas", state: vF ? "falta" : "ok", summary: vF ? `${vF} ${vF === 1 ? "página por decidir" : "páginas por decidir"}` : "Páginas del acuerdo decididas", items: vItems });

  // Cartelería: soportes con cartel, cambios previstos esta semana y huecos
  const st: any = await carteleriaStore().get("state", { type: "json" }) || {};
  const cItems: StatusItem[] = [];
  for (const [venue, slots] of [["Gran Teatro Pavón", FACADE_SLOTS], ["Teatro Arlequín", ARLEQUIN_SLOTS]] as const) {
    const withImg = slots.filter((x) => st.slots?.[x.key]?.hasImage).length;
    cItems.push({ state: "info", title: short(venue), detail: `${withImg} de ${slots.length} soportes con cartel` });
    for (const x of slots) {
      const v: any = st.schedule?.[x.key] || {}, nm = SLOT_NAMES[x.key] || x.key;
      if (v.installDate && v.installDate >= first && v.installDate <= last) cItems.push({ state: v.status === "instalado" ? "ok" : "falta", title: `${nm} · ${v.title || "sin título"}`, detail: `Montaje el ${fmt(v.installDate)}${v.status ? " · " + v.status : ""}` });
      if (v.removeDate && v.removeDate >= first && v.removeDate <= last) cItems.push({ state: v.next ? "ok" : "falta", title: `${nm} · ${v.title || "sin título"}`, detail: `Se retira el ${fmt(v.removeDate)}${v.next ? " · le sigue " + v.next : " · falta decidir qué va después"}` });
    }
  }
  const cF = cItems.filter((x) => x.state === "falta").length;
  sections.push({ key: "carteleria", name: "Cartelería", state: cF ? "falta" : "info", summary: cF ? `${cF} ${cF === 1 ? "cambio pendiente" : "cambios pendientes"}` : "Sin cambios pendientes esta semana", items: cItems });

  // Calendario: fechas de la semana (estrenos, notas de prensa, ruedas de prensa…)
  const hitos = (await listRecords("hitos")).filter((r) => r.date >= first && r.date <= last).sort((a, b) => String(a.date + (a.time || "")).localeCompare(String(b.date + (b.time || ""))));
  sections.push({ key: "hitos", name: "Calendario", state: "info", summary: hitos.length ? `${hitos.length} ${hitos.length === 1 ? "fecha" : "fechas"}` : "Sin fechas esta semana",
    items: hitos.map((r) => ({ state: "info" as const, title: String(r.title || "").toLowerCase().startsWith(String(r.type || "").toLowerCase()) ? r.title : `${r.type || "Hito"} · ${r.title || r.spectacle || ""}`, detail: [D(r.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }) + (r.time ? " " + r.time : ""), short(r.venue)].filter(Boolean).join(" · ") })) });

  const pending = sections.reduce((a, s) => a + s.items.filter((i) => i.state === "falta").length, 0);
  return { week: first, first, last, label, pending, sections };
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export function statusMail(s: WeekStatus, note: string, appUrl: string, test: boolean) {
  const dot = (k: string) => k === "falta" ? "#d64532" : k === "ok" ? "#2f9e5b" : "#9a948a";
  const mark = (k: string) => k === "falta" ? "Falta" : k === "ok" ? "Hecho" : "";
  const pend = s.sections.flatMap((x) => x.items.filter((i) => i.state === "falta").map((i) => ({ sec: x.name, ...i })));
  const html = `<!doctype html><html><body style="margin:0;background:#f2efe6;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:640px;margin:0 auto;background:#fff;padding:28px 26px">
${test ? '<p style="background:#fff3c4;padding:8px 12px;font-size:12px;margin:0 0 16px">Prueba: solo te llega a ti.</p>' : ""}
<p style="font-size:12px;letter-spacing:.08em;color:#6b665d;margin:0">STATUS DE PUBLICIDAD</p>
<h1 style="font-size:24px;margin:4px 0 6px">${esc(s.label)}</h1>
<p style="margin:0 0 18px;color:#444">${pend.length ? `<b>${pend.length} ${pend.length === 1 ? "cosa pendiente" : "cosas pendientes"}</b>` : "<b>Todo programado</b>"}</p>
${note ? `<div style="border-left:3px solid #FFD400;padding:4px 0 4px 12px;margin:0 0 20px;white-space:pre-line">${esc(note)}</div>` : ""}
${pend.length ? `<h2 style="font-size:15px;margin:0 0 8px;color:#d64532">QUÉ FALTA</h2><ul style="margin:0 0 22px;padding-left:18px">${pend.map((p) => `<li style="margin:0 0 6px"><b>${esc(p.sec)} · ${esc(p.title)}</b><br><span style="color:#555;font-size:13px">${esc(p.detail)}</span></li>`).join("")}</ul>` : ""}
${s.sections.map((x) => `<h2 style="font-size:14px;margin:18px 0 6px;border-bottom:2px solid #FFD400;padding-bottom:4px">${esc(x.name.toUpperCase())} <span style="font-weight:normal;color:#6b665d">· ${esc(x.summary)}</span></h2>
<table style="width:100%;border-collapse:collapse">${x.items.map((i) => `<tr><td style="width:10px;padding:6px 8px 6px 0;vertical-align:top"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot(i.state)};margin-top:5px"></span></td><td style="padding:6px 0;font-size:13px"><b>${esc(i.title)}</b>${mark(i.state) ? ` <span style="color:${dot(i.state)};font-size:11px">${mark(i.state)}</span>` : ""}<br><span style="color:#555">${esc(i.detail)}</span></td></tr>`).join("") || '<tr><td style="color:#777;font-size:13px">Nada esta semana.</td></tr>'}</table>`).join("")}
<p style="margin:26px 0 0;font-size:12px;color:#6b665d">Yellow Control · <a href="${esc(appUrl)}/#status?semana=${s.first}" style="color:#111">ver en la app</a></p>
</div></body></html>`;
  return html;
}

export function statusText(s: WeekStatus, note: string) {
  const pend = s.sections.flatMap((x) => x.items.filter((i) => i.state === "falta").map((i) => `• ${x.name} · ${i.title}: ${i.detail}`));
  return `Status de publicidad · ${s.label}\n\n${note ? note + "\n\n" : ""}${pend.length ? "Qué falta:\n" + pend.join("\n") : "Está todo programado."}\n\n` +
    s.sections.map((x) => `${x.name.toUpperCase()} · ${x.summary}\n${x.items.map((i) => `${i.state === "falta" ? "✗" : i.state === "ok" ? "✓" : "·"} ${i.title} — ${i.detail}`).join("\n")}`).join("\n\n");
}
