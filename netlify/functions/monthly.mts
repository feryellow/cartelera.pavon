import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { monthSummary } from "./_lib/monthly.ts";
import { buildMonthlyMail, warmMonthlyThumbs } from "./_lib/monthly-mail.ts";
import { sendPavonMail, mailRecipients } from "./_lib/mailer.ts";
import { madridToday } from "./_lib/dates.ts";
import { getContacts } from "./_lib/contacts.ts";

// GET ?mes=YYYY-MM → resumen del mes para la sección Archivo.
// POST ?mes=YYYY-MM → envía ahora el correo de ese mes (solo administración).
export default async (req: Request) => {
  const url = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes")! : madridToday().slice(0, 7);
  const origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  const show = (url.searchParams.get("show") || "").slice(0, 120);
  if (req.method === "GET") {
    const auth = await requireAccess(req, "archivo", false); if (auth.response) return auth.response;
    return Response.json(await monthSummary(month, url.origin, show));
  }
  if (req.method === "POST") {
    const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
    // Paso previo: preparar miniaturas por tandas (la app lo repite hasta que no queda ninguna)
    if (url.searchParams.get("warm") === "1") return Response.json(await warmMonthlyThumbs(await monthSummary(month, url.origin, show)));
    // Destinatarios extra elegidos en Archivo: solo se aceptan direcciones de la agenda de contactos.
    let body: any = {}; try { body = await req.json(); } catch {}
    const agenda = new Map((await getContacts()).map((c) => [c.email.toLowerCase(), c.email]));
    const extra = [...new Set((Array.isArray(body?.extra) ? body.extra : []).map((x: any) => agenda.get(String(x).trim().toLowerCase())).filter(Boolean))] as string[];
    const s = await monthSummary(month, url.origin, show), rcp = mailRecipients();
    const real = extra.length > 0;
    const intro = String(body?.intro || "").slice(0, 2000);
    const mail = await buildMonthlyMail(s, { appUrl: origin, test: !real, devRecipient: rcp.live || real ? "" : rcp.to[0], intro });
    const r: any = await sendPavonMail({ subject: `${real ? "" : "[Prueba] "}Resumen de publicidad · ${s.label}`, html: mail.html, attachments: mail.attachments, extra });
    await appendAudit({ actor: auth.actor!, module: "avisos", elementId: `monthly-${month}`, action: r.sent ? "email_sent" : "email_pending", note: real ? `Resumen mensual enviado también a ${extra.join(", ")}` : "Resumen mensual (prueba)" });
    return Response.json({ sent: !!r.sent, to: r.to || [], bcc: r.bcc || [], reason: r.sent ? "" : r.reason || "" });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/monthly" };
