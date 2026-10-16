import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
import { madridToday } from "./_lib/dates.ts";
import { activeCampaigns } from "./_lib/campanas.ts";

// /api/campanas · «En campaña ahora»: publicidad activa hoy y esta semana, por espectáculo. Sin importes.
// Lo ve todo el equipo interno; los proveedores no.
export default async (req: Request) => {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const internal = actor.roles.some((r) => r !== "proveedor");
  if (!internal) return Response.json({ error: "Tu usuario no tiene acceso a esta sección." }, { status: 403 });
  const url = new URL(req.url), origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  const data = await activeCampaigns(origin, madridToday(), url.searchParams.get("rango") === "mes" ? "mes" : "semana");
  return Response.json(data, { headers: { "cache-control": "no-store" } });
};
export const config: Config = { path: "/api/campanas" };
