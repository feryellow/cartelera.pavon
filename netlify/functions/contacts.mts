import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { controlStore } from "./_lib/store.ts";
import { getContacts, EMAIL, type Contact } from "./_lib/contacts.ts";

export default async (req: Request) => {
  if (req.method === "GET") {
    const auth = await requireAccess(req, "carteleria", false); if (auth.response) return auth.response;
    return Response.json({ contacts: await getContacts() });
  }
  if (req.method === "PUT") {
    const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
    let body: any; try { body = await req.json(); } catch { return Response.json({ error: "JSON no válido" }, { status: 400 }); }
    const list = (Array.isArray(body?.contacts) ? body.contacts : [])
      .map((c: any) => ({ name: String(c?.name || "").trim().slice(0, 120), email: String(c?.email || "").trim().toLowerCase().slice(0, 200) }))
      .filter((c: Contact) => EMAIL.test(c.email));
    await controlStore().setJSON("mail_contacts", list);
    return Response.json({ contacts: list });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/contacts" };
