import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { weekStatus, statusMail } from "./_lib/status.ts";
import { sendPavonMail } from "./_lib/mailer.ts";
import { madridToday } from "./_lib/dates.ts";
import { getContacts } from "./_lib/contacts.ts";

// GET ?semana=YYYY-MM-DD → status de esa semana (lunes a domingo): qué está programado y qué falta.
// POST ?semana=… → envía el status por correo a los contactos elegidos (en copia oculta).
export default async (req: Request) => {
  const url = new URL(req.url);
  const week = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("semana") || "") ? url.searchParams.get("semana")! : madridToday();
  const origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  if (req.method === "GET") {
    const auth = await requireAccess(req, "archivo", false); if (auth.response) return auth.response;
    return Response.json(await weekStatus(week, url.origin), { headers: { "cache-control": "no-store" } });
  }
  if (req.method === "POST") {
    const auth = await requireAccess(req, "avisos", true); if (auth.response) return auth.response;
    let body: any = {}; try { body = await req.json(); } catch {}
    const agenda = new Map((await getContacts()).map((c) => [c.email.toLowerCase(), c.email]));
    const extra = [...new Set((Array.isArray(body?.extra) ? body.extra : []).map((x: any) => agenda.get(String(x).trim().toLowerCase())).filter(Boolean))] as string[];
    const s = await weekStatus(week, url.origin), real = extra.length > 0, note = String(body?.note || "").slice(0, 3000);
    const html = statusMail(s, note, origin, !real);
    const subject = `${real ? "" : "[Prueba] "}Status de publicidad · ${s.label}${s.pending ? ` · ${s.pending} pendientes` : ""}`;
    const r: any = await sendPavonMail({ subject, html, extra });
    if (!r.sent) console.error("status mail", r.reason, r.status);
    await appendAudit({ actor: auth.actor!, module: "avisos", elementId: `status-${s.first}`, action: r.sent ? "email_sent" : "email_pending", note: real ? `Status semanal enviado a ${extra.join(", ")}` : "Status semanal (prueba)" });
    return Response.json({ sent: !!r.sent, to: r.to || [], bcc: r.bcc || [], reason: r.sent ? "" : r.reason || "" });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/status" };
