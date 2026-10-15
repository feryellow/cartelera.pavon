import { controlStore, getManyJSON } from "./store.ts";
import type { Actor } from "./auth.ts";

export async function appendAudit(input: {
  actor: Actor | { id: string; email: string; roles?: string[]; mode?: string };
  module: string;
  elementId?: string;
  action: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}) {
  const store = controlStore();
  const at = new Date().toISOString();
  const id = crypto.randomUUID();
  const changes = diff(input.before, input.after);
  const entry = {
    id, at,
    actor: { id: input.actor.id, email: input.actor.email, roles: input.actor.roles || [], mode: input.actor.mode || "system" },
    module: input.module,
    elementId: input.elementId || null,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
    note: input.note || "",
    changes,
    summary: summarize(input.action, changes, input.after ?? input.before, input.note || ""),
  };
  await store.setJSON(`audit_${at}_${id}`, entry);
  // Historial funcional: índice por registro y lista corta de lo último (sin el registro completo)
  const compact = { id, at, who: entry.actor.email, actor: { email: entry.actor.email }, module: entry.module, elementId: entry.elementId, action: entry.action, note: entry.note, changes, summary: entry.summary, title: titleOf(input.after ?? input.before) };
  if (entry.elementId) await store.setJSON(`audith_${String(entry.elementId).replace(/[^\w-]/g, "_").slice(0, 120)}_${at}`, compact).catch(() => null);
  try {
    const list = (await store.get("audit_latest", { type: "json" }) as any[] | null) || [];
    await store.setJSON("audit_latest", [compact, ...list].slice(0, 60));
  } catch {}
}

// Campos que no cuentan como cambio (los pone el sistema)
const SKIP = new Set(["updatedAt", "updatedBy", "createdAt", "createdBy", "history", "statusChangedAt", "id", "imported", "lastNotifiedAt"]);
export const FIELD_LABEL: Record<string, string> = {
  startDate: "fecha de inicio", endDate: "fecha fin", deliveryDate: "fecha de entrega", date: "fecha", time: "hora", deadline: "fecha límite", requestDate: "fecha de solicitud",
  spectacle: "espectáculo", campaignName: "campaña", venue: "espacio", station: "emisora", status: "estado", materialStatus: "material", progress: "avance",
  plannedSpots: "cuñas", notes: "notas", title: "título", support: "soporte", location: "ubicación", position: "posición", magazine: "revista", month: "mes",
  assetKey: "archivo", assetName: "archivo", posterKey: "cartel", requester: "quién pide", company: "empresa", designerNotes: "comentario de diseño", deletedAt: "borrado",
  installDate: "fecha de montaje", removeDate: "fecha de retirada", next: "siguiente", type: "tipo", responsable: "responsable", link: "enlace", urgent: "urgente", pieceType: "tipo de pieza",
};
function diff(before: any, after: any) {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: { f: string; from: unknown; to: unknown }[] = [];
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    const a = before[k] ?? "", b = after[k] ?? "";
    if (typeof a === "object" || typeof b === "object") { if (JSON.stringify(a) !== JSON.stringify(b) && k !== "slots" && k !== "schedule") out.push({ f: k, from: "…", to: "…" }); continue; }
    if (String(a) !== String(b)) out.push({ f: k, from: a, to: b });
  }
  return out.slice(0, 20);
}
const short = (v: unknown) => { const s = String(v ?? ""); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const d = new Date(s + "T12:00:00Z"); return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", ""); } return s.length > 40 ? s.slice(0, 38) + "…" : s || "vacío"; };
function titleOf(r: any) { return r && typeof r === "object" ? String(r.spectacle || r.title || r.campaignName || r.name || r.email || "").slice(0, 120) : ""; }
function summarize(action: string, changes: { f: string; from: unknown; to: unknown }[], row: any, note: string) {
  const t = titleOf(row);
  if (action === "create") return `creó ${t ? "«" + t + "»" : "un registro"}`;
  if (action === "archive" || action === "delete") return `quitó ${t ? "«" + t + "»" : "un registro"}`;
  if (changes.length) return `cambió ${changes.slice(0, 3).map((c) => `${FIELD_LABEL[c.f] || c.f}: ${short(c.from)} → ${short(c.to)}`).join("; ")}${changes.length > 3 ? ` y ${changes.length - 3} más` : ""}${t ? " en «" + t + "»" : ""}`;
  return note || action;
}

/** Últimas entradas de la actividad (rápido: un solo blob). Si aún no existe, lee el historial completo. */
export async function latestAudit(limit = 8) {
  const list = await controlStore().get("audit_latest", { type: "json" }) as any[] | null;
  if (list && list.length) return list.slice(0, limit);
  return (await listAudit(limit)).map((a: any) => ({ ...a, who: a.actor?.email || "" }));
}
/** Historial de un registro concreto, del más nuevo al más antiguo. */
export async function recordHistory(elementId: string) {
  const store = controlStore(), res = await store.list({ prefix: `audith_${String(elementId).replace(/[^\w-]/g, "_").slice(0, 120)}_` });
  return (await getManyJSON(store, res.blobs.map((b) => b.key).sort().reverse().slice(0, 100)));
}

export async function listAudit(limit = 100) {
  const store = controlStore();
  const result = await store.list({ prefix: "audit_" });
  const keys = result.blobs.map((b) => b.key).sort().reverse().slice(0, Math.max(1, Math.min(limit, 500)));
  return getManyJSON(store, keys);
}
