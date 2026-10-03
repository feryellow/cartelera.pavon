import type { Config } from "@netlify/functions";
import { notificationStore } from "./_lib/store.ts";
import { appendAudit } from "./_lib/audit.ts";
import { madridHour } from "./_lib/dates.ts";
import { RESENAS, informeReal, htmlInforme, enviarResenas, configResenas, googleConexion, semanaAnterior } from "./_lib/resenas.ts";

// Lunes a las 10:30 (Madrid): informe de reseñas de la semana anterior. Netlify programa en UTC,
// así que se lanza a las 8:30 y a las 9:30 UTC y solo trabaja la pasada que cae a las 10 en Madrid.
// No hace nada si el envío semanal no está activado en la app o si Google no está conectado.
export default async () => {
  const now = new Date();
  if (madridHour(now) !== 10) { console.log(JSON.stringify({ skipped: "hora" })); return; }
  const cfg = await configResenas(); if (!cfg.activo) { console.log(JSON.stringify({ skipped: "inactivo" })); return; }
  if (!(await googleConexion())?.refresh_token) { console.log(JSON.stringify({ skipped: "sin-google" })); return; }
  const periodo = semanaAnterior(now), key = `resenas-${periodo.clave}`, ns = notificationStore();
  const done: any = await ns.get(key, { type: "json" }); if (done?.sent) { console.log(JSON.stringify({ already: key })); return; }
  const origin = (Netlify.env.get("URL") || "https://yellow-control.netlify.app").replace(/\/$/, "");
  try {
    const inf = await informeReal(), r: any = await enviarResenas(RESENAS.destinatarios, inf.asunto, htmlInforme(inf.datos, origin));
    const estado = { sent: !!r.sent, at: new Date().toISOString(), semana: `${periodo.cortoDesde}–${periodo.cortoHasta}`, total: inf.datos.total, reason: r.sent ? "" : r.reason || "" };
    await ns.setJSON(key, estado); await ns.setJSON("resenas_ultimo", estado);
    await appendAudit({ actor: { id: "system", email: "Yellow Control" } as any, module: "avisos", elementId: key, action: r.sent ? "email_sent" : "email_pending", note: `Reseñas Google · ${estado.semana}` });
    console.log(JSON.stringify(estado));
  } catch (e: any) {
    // Nunca se manda un «0 reseñas» falso al equipo: el error va solo a Fer
    const msg = `No se ha podido generar el informe de reseñas de la semana del ${periodo.cortoDesde} al ${periodo.cortoHasta}.\n\nError: ${e.message}\n\nEl informe NO se ha enviado al equipo.`;
    await enviarResenas([RESENAS.correoErrores], "ERROR · Informe de reseñas Google no enviado", `<pre style="font-family:Arial;white-space:pre-wrap">${msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>`).catch(() => null);
    await ns.setJSON("resenas_ultimo", { sent: false, at: new Date().toISOString(), semana: `${periodo.cortoDesde}–${periodo.cortoHasta}`, reason: e.message });
    console.error("resenas", e.message);
  }
};
export const config: Config = { schedule: "30 8,9 * * 1" };
