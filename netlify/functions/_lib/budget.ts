import { getUser } from "@netlify/identity";
import { getDeployStore, getStore } from "@netlify/blobs";
import { controlStore } from "./store.ts";
import { envVar } from "./mailer.ts";

// Presupuesto de publicidad: información sensible. Solo entran las personas de la lista
// (por defecto Fer y Celia) y SIEMPRE con su usuario de Netlify Identity, aunque el resto de la
// app esté abierta (PAVON_AUTH_DISABLED) o se use la clave temporal: ninguna de esas vías sirve aquí.
export const BUDGET_DEFAULT = ["fernando@yellowmedia.es", "celia@yellowmedia.es"];
export const budgetEmails = () => (envVar("PAVON_BUDGET_EMAILS") || BUDGET_DEFAULT.join(",")).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export function budgetStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-budget", { consistency: "strong" })
    : getDeployStore("pavon-budget");
}

export type BudgetActor = { email: string; name: string };
// status: "login" (no hay sesión de usuario) · "forbidden" (usuario sin permiso) · "ok"
export async function budgetAccess(req: Request): Promise<{ status: "login" | "forbidden" | "ok"; actor?: BudgetActor }> {
  // Solo para las pruebas locales: exige la variable BUDGET_DEV_EMAIL (que no existe en Netlify) y localhost
  const dev = typeof process !== "undefined" ? process.env?.BUDGET_DEV_EMAIL : "";
  if (dev && new URL(req.url).hostname === "localhost") return { status: "ok", actor: { email: dev, name: "Pruebas" } };
  let user: any = null;
  try { user = await getUser(); } catch {}
  if (!user?.email) return { status: "login" };
  const email = String(user.email).toLowerCase();
  const disabled = await controlStore().get("disabled_users", { type: "json" }) as string[] | null;
  if (Array.isArray(disabled) && disabled.includes(user.id)) return { status: "forbidden" };
  if (!budgetEmails().includes(email)) return { status: "forbidden" };
  return { status: "ok", actor: { email, name: user.name || user.userMetadata?.full_name || email } };
}
