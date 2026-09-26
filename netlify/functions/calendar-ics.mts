import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { controlStore } from "./_lib/store.ts";
import { collectEvents } from "./_lib/calendar.ts";

// Suscripción de calendario (iPhone, Google, Outlook). Los programas de calendario no inician sesión,
// así que el enlace lleva una clave secreta propia. GET ?link=1 (con sesión) devuelve el enlace;
// POST ?reset=1 (admin) genera una clave nueva e invalida la anterior.
async function getToken(create = false) {
  const store = controlStore();
  let t = await store.get("ics_token", { type: "text" });
  if (!t && create) { t = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""); await store.set("ics_token", t); }
  return t || "";
}
const esc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const fold = (line: string) => { const out: string[] = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = " " + s.slice(74); } out.push(s); return out.join("\r\n"); };
const d8 = (iso: string) => iso.replaceAll("-", "");
const nextDay = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

export default async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("link") === "1" || req.method === "POST") {
    const auth = await requireAccess(req, "calendario", false); if (auth.response) return auth.response;
    if (req.method === "POST") {
      const adm = await requireAccess(req, "admin", true); if (adm.response) return adm.response;
      await controlStore().delete("ics_token");
    }
    const t = await getToken(true);
    const https = `${url.origin}/api/calendar.ics?t=${t}`;
    return Response.json({ https, webcal: https.replace(/^https?:/, "webcal:") });
  }
  const t = url.searchParams.get("t") || ""; const expected = await getToken(false);
  if (!expected || t !== expected) return new Response("Enlace de calendario no válido", { status: 401 });
  const actor = { id: "ics", email: "calendario", roles: ["consulta", "gestion"], mode: "legacy" as const };
  // Filtros opcionales: m=carteleria,hitos (módulos) y v=<teatro>
  const mods = (url.searchParams.get("m") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const venue = url.searchParams.get("v") || "";
  const events = (await collectEvents(actor as any)).filter((e) => (!mods.length || mods.includes(e.moduleKey)) && (!venue || e.venue === venue));
  const NAMES: Record<string, string> = { carteleria: "Cartelería", hitos: "Hitos", radio: "Radio", taxis: "Taxis", intercambiadores: "Intercambiadores", hometicket: "Home Ticket", revistas: "Revistas" };
  const calName = ["Yellow Control", mods.length ? mods.map((m) => NAMES[m] || m).join(", ") : "", venue].filter(Boolean).join(" · ");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Yellow Media//Yellow Control//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`, "X-WR-TIMEZONE:Europe/Madrid", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE", "TZID:Europe/Madrid",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"];
  const summary = (e: any) => e.title.toLowerCase().startsWith(String(e.action).toLowerCase()) ? e.title : `${e.action} · ${e.title}`;
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@yellowcontrol`, `DTSTAMP:${now}`);
    if (e.time && /^\d{2}:\d{2}$/.test(e.time)) {
      const [h, m] = e.time.split(":");
      lines.push(`DTSTART;TZID=Europe/Madrid:${d8(e.date)}T${h}${m}00`, `DURATION:PT1H`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d8(e.date)}`, `DTEND;VALUE=DATE:${d8(nextDay(e.date))}`);
    }
    lines.push(`SUMMARY:${esc(summary(e))}`, `LOCATION:${esc(e.location)}`,
      `DESCRIPTION:${esc([e.module, e.responsable && `Responsable: ${e.responsable}`, e.status && `Estado: ${e.status}`, e.notes].filter(Boolean).join("\n"))}`, `CATEGORIES:${esc(e.module)}`,
      `URL:${url.origin}/#calendario?ev=${encodeURIComponent(e.id)}`);
    // Aviso: entregas y montajes el día antes a las 9:00; hitos con hora, 1 hora antes, salvo aviso propio del hito.
    const timed = !!e.time;
    const REM: Record<string, string> = timed ? { "15m": "-PT15M", "1h": "-PT1H", "1d": "-P1D", "2d": "-P2D" } : { "15m": "-PT15H", "1h": "-PT15H", "1d": "-PT15H", "2d": "-P1DT15H" };
    let trigger = "";
    if (e.kind === "hito" && e.reminder) trigger = e.reminder === "none" ? "" : REM[e.reminder] || "";
    else if (e.kind === "entrega" || e.kind === "montaje" || e.kind === "retirada" || e.kind === "hito") trigger = timed ? "-PT1H" : "-PT15H";
    if (trigger) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary(e))}`, `TRIGGER:${trigger}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-cache" } });
};
export const config: Config = { path: "/api/calendar.ics" };
