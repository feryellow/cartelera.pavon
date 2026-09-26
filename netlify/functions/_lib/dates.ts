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
