import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { controlStore } from "./_lib/store.ts";
import { getContacts, EMAIL, DEFAULT_EMAILS, type Contact } from "./_lib/contacts.ts";
import { mailRecipients, DEV_RECIPIENT } from "./_lib/mailer.ts";

export default async (req: Request) => {
  if (req.method === "GET") {
    const auth = await requireAccess(req, "carteleria", false); if (auth.response) return auth.response;
    const live = mailRecipients().live;
    return Response.json({ contacts: await getContacts(), live, devRecipient: live ? "" : DEV_RECIPIENT });
  }
  if (req.method === "PUT") {
    const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
    let body: any; try { body = await req.json(); } catch { return Response.json({ error: "JSON no válido" }, { status: 400 }); }
    const list = (Array.isArray(body?.contacts) ? body.contacts : [])
      .map((c: any) => ({ name: String(c?.name || "").trim().slice(0, 120), email: String(c?.email || "").trim().toLowerCase().slice(0, 200) }))
      .filter((c: Contact) => EMAIL.test(c.email));
    const seen = new Set<string>(); const clean = list.filter((c: Contact) => !seen.has(c.email) && seen.add(c.email));
    await controlStore().setJSON("mail_contacts", clean);
    // Los contactos fijos que se quiten desde Usuarios no vuelven a aparecer
    await controlStore().setJSON("mail_contacts_removed", DEFAULT_EMAILS().filter((x) => !seen.has(x)));
    return Response.json({ contacts: clean });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/contacts" };
