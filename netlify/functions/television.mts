import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";
import { TELEVISION, TELEVISION_MONEY } from "./_lib/television.ts";

// GET /api/television → acuerdo de televisión. El importe y los pagos solo van a quien ve el presupuesto.
export default async (req: Request) => {
  const auth = await requireAccess(req, "radio", false); if (auth.response) return auth.response;
  const money = (await budgetAccess(req).catch(() => ({ status: "forbidden" }))).status === "ok";
  return Response.json({ ...TELEVISION, money: money ? TELEVISION_MONEY : null }, { headers: { "cache-control": "no-store, private" } });
};
export const config: Config = { path: "/api/television" };
