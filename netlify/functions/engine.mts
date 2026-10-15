import type { Config } from "@netlify/functions";
import { requireAccess, can } from "./_lib/auth.ts";
import { collectIssues } from "./_lib/engine.ts";
import { collectEvents } from "./_lib/calendar.ts";
import { latestAudit } from "./_lib/audit.ts";
import { madridToday, addDays } from "./_lib/dates.ts";

// GET /api/engine → lo que necesita la Home: incidencias del Status Engine (solo de las secciones que el
// usuario puede ver), fechas de hoy y de los próximos 7 días, y la actividad reciente.
// ?only=issues → solo las incidencias (para Status y pruebas).
export default async (req: Request) => {
  const auth = await requireAccess(req, "dashboard", false); if (auth.response) return auth.response;
  const actor = auth.actor!, url = new URL(req.url);
  const origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  const sections = (s: string) => can(actor, s === "material" ? "radio" : s, false);
  const today = madridToday(), until = addDays(today, 7);
  const engine = await collectIssues({ origin: url.origin || origin, sections });
  if (url.searchParams.get("only") === "issues") return Response.json(engine, { headers: { "cache-control": "no-store" } });
  const [events, activity] = await Promise.all([
    collectEvents(actor).catch(() => [] as any[]),
    can(actor, "archivo", false) ? latestAudit(8).catch(() => [] as any[]) : Promise.resolve([] as any[]),
  ]);
  const near = events.filter((e: any) => e.date >= today && e.date <= until && e.kind !== "fin" && e.kind !== "campana")
    .map((e: any) => ({ id: e.id, date: e.date, time: e.time || "", title: e.title, module: e.module, moduleKey: e.moduleKey, action: e.action, location: e.location, venue: e.venue || "", recordId: e.recordId || "", slotKey: e.slotKey || "" }));
  return Response.json({
    ...engine,
    todayEvents: near.filter((e: any) => e.date === today),
    weekEvents: near.filter((e: any) => e.date > today),
    activity: activity.map((a: any) => ({ at: a.at, who: a.actor?.email || "", module: a.module, action: a.action, note: a.note || "", summary: a.summary || "" })),
  }, { headers: { "cache-control": "no-store" } });
};
export const config: Config = { path: "/api/engine" };
