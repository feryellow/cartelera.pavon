import { controlStore, getManyJSON } from "./store.ts";

// PATROCINIOS · operaciones comerciales con marcas (naming, patrocinio de espectáculo, eventos, intercambios).
// Un registro por operación (patro_<id>) con su historial en el registro de actividad, copia diaria incluida.
// En negociación: prospecto → propuesta → negociación. Después: cerrado (contrato) o perdido.
export const STAGES = ["prospecto", "propuesta", "negociacion", "cerrado", "perdido"] as const;
export const OPEN_STAGES = ["prospecto", "propuesta", "negociacion"];
export const STAGE_TXT: Record<string, string> = { prospecto: "Primer contacto", propuesta: "Propuesta enviada", negociacion: "En negociación", cerrado: "Cerrado", perdido: "No sale" };
export const KINDS = ["Naming", "Patrocinio de espectáculo", "Patrocinio de temporada", "Evento", "Intercambio", "Otro"];
export const VENUES = ["Gran Teatro Pavón", "Gran Teatro CaixaBank Príncipe Pío", "Teatro Serrano", "Teatro Arlequín", "Gran Castillo de Pedraza", "Abonoteatro", "Soho City Madrid", "Varios espacios"];

const PREFIX = "patro_";
const iso = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "";
const txt = (v: unknown, n = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const money = (v: unknown) => { if (v === "" || v == null) return null; const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };

/** Deja solo los campos permitidos y con el formato correcto. */
export function clean(input: any) {
  const r: any = {};
  if ("brand" in input) r.brand = txt(input.brand, 120);
  if ("venue" in input) r.venue = txt(input.venue, 80);
  if ("kind" in input) r.kind = KINDS.includes(input.kind) ? input.kind : "Otro";
  if ("stage" in input) r.stage = (STAGES as readonly string[]).includes(input.stage) ? input.stage : "prospecto";
  if ("owner" in input) r.owner = txt(input.owner, 80);
  if ("contact" in input) r.contact = txt(input.contact, 200);
  if ("amountProposed" in input) r.amountProposed = money(input.amountProposed);
  if ("amountFinal" in input) r.amountFinal = money(input.amountFinal);
  if ("nextStep" in input) r.nextStep = txt(input.nextStep, 240);
  if ("nextDate" in input) r.nextDate = iso(input.nextDate);
  if ("startDate" in input) r.startDate = iso(input.startDate);
  if ("endDate" in input) r.endDate = iso(input.endDate);
  if ("notes" in input) r.notes = String(input.notes ?? "").trim().slice(0, 3000);
  if ("lostReason" in input) r.lostReason = txt(input.lostReason, 240);
  if ("docs" in input) r.docs = (Array.isArray(input.docs) ? input.docs : []).slice(0, 20).map((d: any) => ({ key: txt(d?.key, 64).replace(/[^\w-]/g, ""), name: txt(d?.name, 120), type: txt(d?.type, 60), size: Number(d?.size) || 0 })).filter((d: any) => d.key);
  if ("deliverables" in input) r.deliverables = (Array.isArray(input.deliverables) ? input.deliverables : []).slice(0, 60).map((d: any) => ({
    id: txt(d?.id, 40).replace(/[^\w-]/g, "") || crypto.randomUUID().slice(0, 8), text: txt(d?.text, 200), date: iso(d?.date), done: !!d?.done, doneAt: d?.done ? (iso(d?.doneAt) || new Date().toISOString().slice(0, 10)) : "",
  })).filter((d: any) => d.text);
  return r;
}

export async function listPatrocinios(includeDeleted = false) {
  const st = controlStore(), res = await st.list({ prefix: PREFIX });
  const rows: any[] = (await getManyJSON(st, res.blobs.map((b) => b.key))).filter((r: any) => r && (includeDeleted || !r.deletedAt));
  return rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}
export async function getPatrocinio(id: string) { return controlStore().get(PREFIX + id, { type: "json" }) as Promise<any | null>; }
export async function putPatrocinio(id: string, row: any) { await controlStore().setJSON(PREFIX + id, row); }

/** Cifras para dirección: lo que está en negociación y lo contratado, siempre por separado. */
export function totals(rows: any[], today: string) {
  const open = rows.filter((r) => OPEN_STAGES.includes(r.stage)), closed = rows.filter((r) => r.stage === "cerrado");
  const active = closed.filter((r) => !r.endDate || r.endDate >= today);
  const sum = (list: any[], f: string) => list.reduce((a, r) => a + (Number(r[f]) || 0), 0);
  const byVenue = [...new Set(rows.filter((r) => r.stage !== "perdido").map((r) => r.venue || "Sin espacio"))].map((v) => {
    const o = open.filter((r) => (r.venue || "Sin espacio") === v), c = active.filter((r) => (r.venue || "Sin espacio") === v);
    return { venue: v, negotiating: sum(o, "amountProposed"), negotiatingCount: o.length, contracted: sum(c, "amountFinal"), contractedCount: c.length };
  }).sort((a, b) => (b.contracted + b.negotiating) - (a.contracted + a.negotiating));
  return { negotiating: sum(open, "amountProposed"), negotiatingCount: open.length, contracted: sum(active, "amountFinal"), contractedCount: active.length, byVenue };
}
