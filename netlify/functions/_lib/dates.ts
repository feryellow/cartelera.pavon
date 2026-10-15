export function normalizeDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  const d = new Date(v);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString().slice(0,10);
}

// Fecha del día en Madrid (YYYY-MM-DD), con cambio de hora incluido.
export function madridToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function madridHour(now: Date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(now)) % 24;
}

export function dayDiff(from: Date, isoDate: string) {
  const a = new Date(madridToday(from) + "T00:00:00Z");
  const b = new Date(isoDate + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ---- Sistema único de fechas (servidor). Referencia operativa: Madrid.
// Fechas sin hora = "YYYY-MM-DD" (día civil, sin zona). Con hora = "YYYY-MM-DD" + "HH:MM" en campos separados,
// siempre hora de Madrid. Los cálculos de días se hacen a mediodía UTC para que el cambio de hora no reste un día.
const noon = (iso: string) => new Date(iso + "T12:00:00Z");
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
export const todayMadrid = madridToday;
/** Días de a hasta b (b − a), ambos YYYY-MM-DD. */
export function daysBetween(a: string, b: string) { return Math.round((noon(b).getTime() - noon(a).getTime()) / 864e5); }
/** Días desde hoy (Madrid) hasta la fecha: 0 hoy, 1 mañana, negativo si ya pasó. */
export function daysUntil(iso: string, now: Date = new Date()) { return daysBetween(madridToday(now), iso); }
export function addDays(iso: string, n: number) { const d = noon(iso); d.setUTCDate(d.getUTCDate() + n); return isoOf(d); }
/** Semana de lunes a domingo que contiene la fecha. */
export function week(iso: string = madridToday()) { const d = noon(iso); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); const first = isoOf(d); return { first, last: addDays(first, 6) }; }
/** ¿Se solapan [a1,a2] y [b1,b2]? Extremos vacíos = abiertos. */
export function overlaps(a1: string | undefined, a2: string | undefined, b1: string, b2: string) { const s = a1 || a2 || "", e = a2 || a1 || ""; return !!s && s <= b2 && e >= b1; }
/** Activo hoy: empezado (o sin inicio) y sin terminar (o sin fin). */
export function isActiveOn(start: string | undefined, end: string | undefined, day: string = madridToday()) { return (!start || start <= day) && (!end || end >= day); }
/** Lista de días entre dos fechas, ambas incluidas. */
export function range(a: string, b: string) { const out: string[] = []; for (let d = a; d <= b && out.length < 400; d = addDays(d, 1)) out.push(d); return out; }
/** «jueves 16 oct», «16 oct · 10:30». */
export function format(iso: string, opts: { weekday?: boolean; year?: boolean; time?: string } = {}) {
  if (!iso) return "";
  const t = noon(iso).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", ...(opts.weekday ? { weekday: "long" } : {}), ...(opts.year ? { year: "numeric" } : {}) }).replace(/\./g, "");
  return opts.time ? `${t} · ${opts.time}` : t;
}
