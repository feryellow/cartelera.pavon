import type { Config } from "@netlify/functions";
import { notificationStore } from "./_lib/store.ts";
import { appendAudit } from "./_lib/audit.ts";
import { monthSummary, previousMonth } from "./_lib/monthly.ts";
import { renderMonthly } from "./_lib/monthly-mail.ts";
import { sendPavonMail, mailRecipients } from "./_lib/mailer.ts";
import { madridToday, madridHour } from "./_lib/dates.ts";

// Día 1 de cada mes a las 9:00 (hora de Madrid): correo con toda la publicidad del mes anterior.
export default async () => {
  const now = new Date(), today = madridToday(now);
  if (today.slice(8) !== "01" || madridHour(now) !== 9) { console.log(JSON.stringify({ skipped: true, today })); return; }
  const month = previousMonth(today), key = `monthly-report-${month}`, ns = notificationStore();
  const done: any = await ns.get(key, { type: "json" }); if (done?.sent) { console.log(JSON.stringify({ already: month })); return; }
  const appUrl = (Netlify.env.get("URL") || "https://yellow-control.netlify.app").replace(/\/$/, "");
  const s = await monthSummary(month, appUrl), rcp = mailRecipients();
  const r: any = await sendPavonMail({ subject: `Resumen de publicidad · ${s.label}`, html: renderMonthly(s, { appUrl, devRecipient: rcp.live ? "" : rcp.to[0] }) });
  await ns.setJSON(key, { sent: !!r.sent, at: new Date().toISOString(), id: r.id || null });
  await appendAudit({ actor: { id: "system", email: "Yellow Control" } as any, module: "avisos", elementId: key, action: r.sent ? "email_sent" : "email_pending", note: "Resumen mensual" });
  console.log(JSON.stringify({ month, sent: !!r.sent }));
};
export const config: Config = { schedule: "0 7,8 1 * *" };
