import { getUser } from "@netlify/identity";
import { controlStore } from "./store.ts";

export type Actor = {
  id: string;
  email: string;
  roles: string[];
  mode: "identity" | "legacy";
};

const ROLE_ACCESS: Record<string, { read: string[]; write: string[] }> = {
  admin: { read: ["*"], write: ["*"] },
  gestion: { read: ["dashboard","carteleria","calendario","radio","publicidad","intercambiadores","archivo","avisos"], write: ["carteleria","radio","publicidad","intercambiadores","avisos"] },
  carteleria: { read: ["dashboard","carteleria","calendario","archivo"], write: ["carteleria"] },
  consulta: { read: ["dashboard","carteleria","calendario","archivo"], write: [] },
};

function keyActor(req: Request): Actor | null {
  const expected = Netlify.env.get("PAVON_EDIT_KEY");
  const provided = req.headers.get("x-edit-key");
  if (expected && provided && provided === expected) {
    return { id: "legacy-admin", email: "acceso-temporal", roles: ["admin"], mode: "legacy" };
  }
  return null;
}

export async function resolveActor(req: Request): Promise<Actor | null> {
  const fallback = keyActor(req);
  try {
    const user = await getUser();
    if (user) {
      const store = controlStore();
      const disabled = await store.get("disabled_users", { type: "json" }) as string[] | null;
      if (Array.isArray(disabled) && disabled.includes(user.id)) return null;
      return {
        id: user.id,
        email: user.email || "",
        roles: Array.isArray(user.roles) ? user.roles : [],
        mode: "identity",
      };
    }
  } catch {
    // Identity may not be enabled yet. Temporary edit-key access remains available.
  }
  return fallback;
}

export function can(actor: Actor | null, moduleName: string, write = false) {
  if (!actor) return false;
  return actor.roles.some((role) => {
    const access = ROLE_ACCESS[role];
    if (!access) return false;
    const list = write ? access.write : access.read;
    return list.includes("*") || list.includes(moduleName);
  });
}

export async function requireAccess(req: Request, moduleName: string, write = false) {
  const actor = await resolveActor(req);
  if (!actor) return { actor: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!can(actor, moduleName, write)) return { actor, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { actor, response: null };
}
