import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { monthSummary } from "./_lib/monthly.ts";
import { buildMonthlyMail } from "./_lib/monthly-mail.ts";
import { sendPavonMail, mailRecipients } from "./_lib/mailer.ts";
import { madridToday } from "./_lib/dates.ts";

// GET ?mes=YYYY-MM → resumen del mes para la sección Archivo.
// POST ?mes=YYYY-MM → envía ahora el correo de ese mes (solo administración).
export default async (req: Request) => {
  const url = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes")! : madridToday().slice(0, 7);
  const origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  if (req.method === "GET") {
    const auth = await requireAccess(req, "archivo", false); if (auth.response) return auth.response;
    return Response.json(await monthSummary(month, url.origin));
  }
  if (req.method === "POST") {
    const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
    const s = await monthSummary(month, url.origin), rcp = mailRecipients();
    const mail = await buildMonthlyMail(s, { appUrl: origin, test: true, devRecipient: rcp.live ? "" : rcp.to[0] });
    const r: any = await sendPavonMail({ subject: `[Prueba] Resumen de publicidad · ${s.label}`, html: mail.html, attachments: mail.attachments });
    await appendAudit({ actor: auth.actor!, module: "avisos", elementId: `monthly-${month}`, action: r.sent ? "email_sent" : "email_pending", note: "Resumen mensual (prueba)" });
    return Response.json({ sent: !!r.sent, to: r.to || [], reason: r.sent ? "" : r.reason || "" });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/monthly" };
