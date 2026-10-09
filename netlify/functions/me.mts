import type { Config, Context } from "@netlify/functions";
import { refreshSession } from "@netlify/identity";
import { resolveActor } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";

// Sesión recordada: el acceso de Netlify caduca a la hora y sus cookies se borran al cerrar el navegador
// o la app instalada, por eso pedía la contraseña cada vez. Al abrir la app se renueva el acceso con la
// cookie de renovación de Netlify (función oficial refreshSession) y las dos cookies pasan a durar 30 días.
// «Salir» las sigue borrando.
const KEEP_DAYS = 30;
function keepCookies(context: Context) {
  const expires = new Date(Date.now() + KEEP_DAYS * 864e5);
  for (const name of ["nf_jwt", "nf_refresh"]) {
    const value = context.cookies.get(name);
    if (value) context.cookies.set({ name, value, path: "/", secure: true, sameSite: "Lax", httpOnly: false, expires });
  }
}

export default async (req: Request, context: Context) => {
  await refreshSession().catch(() => null);
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ authenticated: false }, { status: 401 });
  keepCookies(context);
  const budget = (await budgetAccess(req).catch(() => ({ status: "login" }))).status === "ok";
  return Response.json({ authenticated: true, actor, budget });
};
export const config: Config = { path: "/api/me" };
