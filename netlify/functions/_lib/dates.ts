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

export function dayDiff(from: Date, isoDate: string) {
  const a = new Date(from.toISOString().slice(0,10) + "T00:00:00Z");
  const b = new Date(isoDate + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
