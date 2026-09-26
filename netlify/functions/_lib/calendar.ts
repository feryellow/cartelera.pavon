import { can, type Actor } from "./auth.ts";
import { carteleriaStore } from "./store.ts";
import { listRecords } from "./records.ts";
import { normalizeDate } from "./dates.ts";

export type EventRow = { id: string; date: string; time?: string; module: string; moduleKey: string; title: string; location: string; action: string; status: string; recordId?: string; slotKey?: string; kind: string; notes?: string; auto: boolean; venue: string; responsable?: string; reminder?: string };

const SLOT_NAMES: Record<string, string> = {
  "taquilla__secundario-1": "Secundario 1", "taquilla__taquilla-izq": "Taquilla izquierda cerrada", "taquilla__taquilla-der": "Taquilla derecha cerrada",
  "taquilla__secundario-2": "Secundario 2", "lona__lona": "Lona", "lona__sec1": "Secundario 1 (lona)", "lona__sec2": "Secundario 2 (lona)", "lona__sec3": "Secundario 3 (lona)",
  "abierta__taquilla-izq-abierta": "Taquilla izquierda abierta", "abierta__taquilla-der-abierta": "Taquilla derecha abierta", "taquilla__columna_1": "Columna 1",
};
const LABEL: Record<string, string> = { radio: "Radio", taxis: "Taxis", intercambiadores: "Intercambiadores", hometicket: "Home Ticket", revistas: "Revistas de Teatros" };

// Todas las fechas de la app en una lista. kind: montaje | retirada | inicio | fin | entrega | hito
export async function collectEvents(actor: Actor | null): Promise<EventRow[]> {
  const events: EventRow[] = [];
  if (can(actor, "carteleria", false) || can(actor, "calendario", false)) {
    const state = await carteleriaStore().get("state", { type: "json" }) as any;
    for (const [key, v] of Object.entries(state?.schedule || {}) as any) {
      const install = normalizeDate(v?.installDate || v?.date), change = normalizeDate(v?.next), remove = normalizeDate(v?.removeDate);
      const location = SLOT_NAMES[key] || key.split("__")[1]?.replaceAll("_", " ") || key;
      const title = v?.title || location, status = v?.status || "programado";
      const base = { module: "Cartelería", moduleKey: "carteleria", title, location, status, slotKey: key, auto: true, venue: "Gran Teatro Pavón" };
      if (install) events.push({ ...base, id: `cart-i-${key}`, date: install, action: "Instalación", kind: "montaje" });
      if (change) events.push({ ...base, id: `cart-c-${key}`, date: change, action: "Cambio previsto", kind: "montaje" });
      if (remove) events.push({ ...base, id: `cart-r-${key}`, date: remove, action: "Retirada", kind: "retirada" });
    }
  }
  for (const m of ["radio", "taxis", "intercambiadores", "hometicket", "revistas"] as const) {
    if (!can(actor, m, false)) continue;
    for (const r of await listRecords(m)) {
      const location = m === "radio" ? [r.venue, r.station].filter(Boolean).join(" · ")
        : m === "hometicket" ? [r.venue, r.position].filter(Boolean).join(" · ")
        : m === "revistas" ? [r.magazine, r.venue].filter(Boolean).join(" · ")
        : [r.venue, r.location || r.support].filter(Boolean).join(" · ");
      const title = r.spectacle || r.campaignName || LABEL[m];
      const base = { module: LABEL[m], moduleKey: m, title, location, status: r.status || "activo", recordId: r.id, auto: true, venue: r.venue || "" };
      if (r.startDate) events.push({ ...base, id: `${m}-i-${r.id}`, date: r.startDate, action: m === "revistas" ? "Página del mes" : "Inicio de campaña", kind: "inicio" });
      if (r.endDate && m !== "revistas") events.push({ ...base, id: `${m}-f-${r.id}`, date: r.endDate, action: "Fin de campaña", kind: "fin" });
      if (r.deliveryDate) events.push({ ...base, id: `${m}-e-${r.id}`, date: r.deliveryDate, action: "Entrega de material", status: r.materialStatus || "pendiente", kind: "entrega" });
    }
  }
  if (can(actor, "hitos", false)) {
    for (const r of await listRecords("hitos")) {
      const date = normalizeDate(r.date); if (!date) continue;
      events.push({ id: `hitos-${r.id}`, date, time: r.time || "", module: "Hito", moduleKey: "hitos", title: r.title || r.spectacle || "Hito",
        location: [r.venue, r.place].filter(Boolean).join(" · "), action: r.type || "Hito", status: r.status || "", recordId: r.id, kind: "hito", notes: r.notes || "", auto: false, venue: r.venue || "",
        responsable: r.responsable || "", reminder: r.reminder || "" });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "") || a.module.localeCompare(b.module));
  return events;
}
