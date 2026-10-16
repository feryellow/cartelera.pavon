import { controlStore, getManyJSON } from "./store.ts";

// Peticiones de diseño (sustituye a la hoja «ABONOTEATRO Y LA ESTACION»). Cada petición es un blob diseno_<id>.
export const STATUSES = ["pendiente", "en_proceso", "en_revision", "parado", "entregado", "cancelado"] as const;
export const OPEN = ["pendiente", "en_proceso", "en_revision", "parado"];
export const PIECE_TYPES = ["Cartel", "Lona / gran formato", "Flyer / folleto / díptico", "Redes sociales", "Adaptaciones de formatos", "Newsletter / email", "Banner web", "Pantallas", "Señalética / vinilo", "Logo / identidad", "Photocall", "Otro"];
const FIELDS = ["requester", "company", "title", "pieceType", "requestDate", "deadline", "status", "progress", "urgent", "designerNotes", "link", "notes", "deliveredAt", "cancelReason", "channel", "deliveryLink", "previewKey", "previewName"];

export type DisenoSettings = { people: { name: string; email: string; color: string }[]; companies: { name: string; color: string }[]; mailLive: boolean; campaigns: { id: string; month: number; dates: string; creative: string; company: string }[]; wipLimit: number; urgentQuota: number; stallDays: number; peakPerWeek: number; soonDays: number; colorsV?: number };
const DEFAULTS: DisenoSettings = {
  // Personas y colores de la hoja (pestaña CONFIG). Los correos sirven para el aviso del día antes en el móvil.
  people: [
    { name: "FERNANDO", email: "fernando@yellowmedia.es", color: "#FFD400" },
    { name: "CELIA", email: "celia@yellowmedia.es", color: "#FFD400" },
    { name: "ANA", email: "", color: "#9FC5E8" },
    { name: "NOELIA", email: "", color: "#B4A7D6" },
    { name: "ESTRELLA", email: "", color: "#C27BA0" },
  ],
  companies: [
    { name: "ABONOTEATRO", color: "#B7CF2E" }, { name: "LA ESTACION", color: "#0095DA" }, { name: "PAVON", color: "#C9A227" },
    { name: "CASTILLO", color: "#7B1E2B" }, { name: "SERRANO", color: "#1B5E3F" }, { name: "EL GURÚ", color: "#6A4C93" }, { name: "SOHO CITY", color: "#E8590C" },
  ],
  // Campañas del año (pestaña «CALENDARIO CAMPAÑAS» de la hoja), tal cual están escritas allí
  campaigns: [
    { id: "c01", month: 1, dates: "Reyes", creative: "Cambio a creatividad general a final de la Navidad", company: "ABONOTEATRO" },
    { id: "c02", month: 2, dates: "14 San Valentín", creative: "", company: "ABONOTEATRO" },
    { id: "c03", month: 3, dates: "19 Día del Padre / 27 Día del Teatro", creative: "", company: "ABONOTEATRO" },
    { id: "c05", month: 5, dates: "Día de la Madre", creative: "", company: "ABONOTEATRO" },
    { id: "c06", month: 6, dates: "", creative: "Creatividad de verano", company: "ABONOTEATRO" },
    { id: "c09", month: 9, dates: "Vuelta al cole", creative: "Creatividad nueva temporada", company: "ABONOTEATRO" },
    { id: "c11", month: 11, dates: "Black Friday", creative: "", company: "ABONOTEATRO" },
    { id: "c12", month: 12, dates: "Navidad", creative: "Creatividad de Navidad", company: "ABONOTEATRO" },
  ],
  // Avisos por correo de la diseñadora: hasta que Fer o Celia los activen, van solo a fernando@yellowmedia.es
  mailLive: false,
  // Umbrales de partida (no medidos): se revisan tras unas semanas de uso
  wipLimit: 8, urgentQuota: 3, stallDays: 10, peakPerWeek: 4, soonDays: 3,
};
export async function getSettings(): Promise<DisenoSettings> {
  const s = await controlStore().get("diseno_settings", { type: "json" }) as Partial<DisenoSettings> | null;
  const out = { ...DEFAULTS, ...(s || {}) } as DisenoSettings;
  // Colores fijados por Fer (oct 2026): Fernando y Celia en amarillo Yellow, Noelia en lila (el verde es de Abonoteatro),
  // Abonoteatro en el verde de su logo y Serrano en verde oscuro. Se aplica una vez; después mandan los Ajustes.
  if (s && (s.colorsV || 0) < 2) {
    const P: Record<string, string> = { FERNANDO: "#FFD400", CELIA: "#FFD400", NOELIA: "#B4A7D6" }, C: Record<string, string> = { ABONOTEATRO: "#B7CF2E", SERRANO: "#1B5E3F" };
    out.people = out.people.map((p) => P[p.name] ? { ...p, color: P[p.name] } : p);
    out.companies = out.companies.map((c) => C[c.name] ? { ...c, color: C[c.name] } : c);
    out.colorsV = 2;
    await controlStore().setJSON("diseno_settings", out).catch(() => null);
  }
  return out;
}
export async function saveSettings(s: any) {
  const n = (v: any, d: number, lo: number, hi: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const color = (c: any) => /^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c) : "#999999";
  const clean: DisenoSettings = {
    people: (Array.isArray(s.people) ? s.people : []).map((p: any) => ({ name: String(p.name || "").trim().toUpperCase().slice(0, 40), email: String(p.email || "").trim().toLowerCase().slice(0, 120), color: color(p.color) })).filter((p: any) => p.name).slice(0, 40),
    companies: (Array.isArray(s.companies) ? s.companies : []).map((c: any) => ({ name: String(c.name || "").trim().toUpperCase().slice(0, 40), color: color(c.color) })).filter((c: any) => c.name).slice(0, 40),
    mailLive: s.mailLive === true,
    campaigns: (Array.isArray(s.campaigns) ? s.campaigns : DEFAULTS.campaigns).map((c: any, i: number) => ({ id: String(c.id || "c" + Date.now().toString(36) + i).slice(0, 40), month: n(c.month, 1, 1, 12), dates: String(c.dates || "").trim().slice(0, 200), creative: String(c.creative || "").trim().slice(0, 300), company: String(c.company || "ABONOTEATRO").trim().toUpperCase().slice(0, 40) })).filter((c: any) => c.dates || c.creative).slice(0, 80),
    colorsV: 2, wipLimit: n(s.wipLimit, 8, 1, 50), urgentQuota: n(s.urgentQuota, 3, 0, 50), stallDays: n(s.stallDays, 10, 2, 90), peakPerWeek: n(s.peakPerWeek, 4, 1, 50), soonDays: n(s.soonDays, 3, 1, 14),
  };
  await controlStore().setJSON("diseno_settings", clean);
  return clean;
}

// Por dónde llegó la petición: desde la app o por otra vía que la diseñadora apunta después
export const CHANNELS = ["app", "correo", "whatsapp", "telefono", "persona"];
export function clean(input: any) {
  const out: Record<string, any> = {};
  for (const k of FIELDS) {
    const v = input?.[k];
    if (v === undefined) continue;
    if (k === "progress") { const p = Math.round(Number(v) / 25) * 25; if (Number.isFinite(p)) out.progress = Math.min(100, Math.max(0, p)); continue; }
    if (k === "urgent") { out.urgent = v === true || v === "true" || v === 1; continue; }
    if (k === "status") { if ((STATUSES as readonly string[]).includes(v)) out.status = v; continue; }
    if (k === "requestDate" || k === "deadline" || k === "deliveredAt") { out[k] = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : ""; continue; }
    if (k === "previewKey") { out.previewKey = /^[\w-]{1,160}$/.test(String(v)) ? String(v) : ""; continue; }
    if (k === "deliveryLink") { const u = String(v).trim(); out.deliveryLink = /^https?:\/\//i.test(u) ? u.slice(0, 1500) : ""; continue; }
    if (k === "channel") { if (CHANNELS.includes(String(v))) out.channel = String(v); continue; }
    if (typeof v === "string") out[k] = v.trim().slice(0, k === "notes" || k === "designerNotes" || k === "title" ? 3000 : 300);
  }
  if (out.requester) out.requester = String(out.requester).toUpperCase();
  if (out.company) out.company = String(out.company).toUpperCase();
  return out;
}

export async function listDiseno(includeDeleted = false) {
  const st = controlStore(), res = await st.list({ prefix: "diseno_r_" });
  const rows: any[] = await getManyJSON(st, res.blobs.map((b) => b.key));
  return rows.filter((r) => r && (includeDeleted || !r.deletedAt));
}
export async function getDiseno(id: string) { return controlStore().get(`diseno_r_${id}`, { type: "json" }) as Promise<any | null>; }
export async function putDiseno(id: string, row: any) { await controlStore().setJSON(`diseno_r_${id}`, row); }

// Lo que le falta a una petición para que diseño pueda empezar sin preguntar.
// Se calcula siempre a partir de lo que hay escrito; desaparece en cuanto se completa.
export function missingInfo(r: any, today: string): { k: string; txt: string }[] {
  const out: { k: string; txt: string }[] = [], text = `${r.title || ""} ${r.notes || ""}`, notes = String(r.notes || "");
  if (!r.pieceType) out.push({ k: "tipo", txt: "Tipo de pieza: cartel, redes, newsletter, lona…" });
  if (!r.link) out.push({ k: "material", txt: "Enlace al material (Dropbox o Drive) con el cartel aprobado, logos y fotos, que abra sin pedir permiso" });
  if (!/\d+\s*[x×]\s*\d+|\d+\s*(px|cm|mm)\b|\b(1:1|9:16|4:5|16:9|a[3-6]|din\s?a[3-6])\b/i.test(text)) out.push({ k: "medidas", txt: "Medidas y formato (por ejemplo, 1080 × 1920 px o A4)" });
  if (notes.trim().length < 25) out.push({ k: "textos", txt: "Textos definitivos y referencias, en «Notas»" });
  if (!/aprueb|aprobar|revis|valid|visto bueno|\bok\b/i.test(notes)) out.push({ k: "aprueba", txt: "Quién aprueba el resultado" });
  if (r.deadline && r.deadline >= today) {
    const d0 = new Date(today + "T12:00:00Z"), d1 = new Date(r.deadline + "T12:00:00Z"); let n = 0;
    for (const d = new Date(d0); d < d1; d.setUTCDate(d.getUTCDate() + 1)) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
    if (n < 2) out.push({ k: "plazo", txt: "El plazo es de menos de dos días laborables: confirma con Cristina que llega" });
  }
  return out;
}
