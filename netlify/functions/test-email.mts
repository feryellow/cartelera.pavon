import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { mailRecipients, envVar, mailDiagnostic } from "./_lib/mailer.ts";

// Solo administración. GET: estado de la configuración. POST: envía ya el resumen diario.
export default async (req: Request) => {
  const auth = await requireAccess(req, "admin", true);
  if (auth.response) return auth.response;
  const env = envVar;
  const rcp = mailRecipients();
  const required = ["RESEND_API_KEY", "PAVON_EMAIL_FROM", ...(rcp.live ? ["PAVON_EMAIL_TO"] : [])];
  const missing = required.filter((k) => !env(k));
  const info = { configured: missing.length === 0, missing, from: env("PAVON_EMAIL_FROM"), to: rcp.to, cc: rcp.cc, live: rcp.live };
  if (req.method === "GET") return Response.json({ ...info, diagnostic: mailDiagnostic() });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!info.configured) return Response.json({ ...info, sent: false, reason: "Correo sin configurar" });
  // Reutiliza la tarea diaria forzando el envío, sin esperar a las 9:00.
  const mod = await import("./reminders.mts");
  const logs: string[] = []; const orig = console.log;
  console.log = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); orig(...a); };
  try { await mod.default(new Request(new URL("/?force=1", req.url).toString())); } finally { console.log = orig; }
  let result: any = {}; try { result = JSON.parse(logs.filter((l) => l.startsWith("{")).pop() || "{}"); } catch {}
  await appendAudit({ actor: auth.actor!, module: "avisos", elementId: "test-email", action: result.sent ? "email_sent" : "email_pending", note: "Correo de prueba" });
  return Response.json({ ...info, sent: !!result.sent, reason: result.sent ? "" : (result.reason === "nothing_new" ? "Ya se envió el resumen de hoy" : "Revisa la clave de Resend y el remitente"), detail: result });
};
export const config: Config = { path: "/api/test-email" };
