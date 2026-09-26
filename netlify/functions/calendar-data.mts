import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { collectEvents } from "./_lib/calendar.ts";

export default async (req: Request) => {
  const auth = await requireAccess(req, "calendario", false); if (auth.response) return auth.response;
  return Response.json({ events: await collectEvents(auth.actor) });
};
export const config: Config = { path: "/api/calendar-data" };
