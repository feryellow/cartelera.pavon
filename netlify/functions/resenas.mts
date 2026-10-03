import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { controlStore, notificationStore } from "./_lib/store.ts";
import { RESENAS, datosEjemplo, htmlInforme, informeReal, enviarResenas, googleClient, googleConexion, configResenas, ubicaciones } from "./_lib/resenas.ts";

// Informe semanal de reseñas de Google (solo administración).
// GET                → estado: Google conectado, envío semanal activo, último envío
// GET ?vista=ejemplo → HTML del correo con datos ficticios (para verlo en la app)
// POST {accion}      → "prueba-diseno" | "prueba" | "perfiles" | "activar" | "desactivar"
export default async (req: Request) => {
  const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
  const url = new URL(req.url), origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  if (req.method === "GET") {
    if (url.searchParams.get("vista") === "ejemplo") { const e = datosEjemplo(); return new Response(htmlInforme(e.datos, origin), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }); }
    const g = await googleConexion(), c = googleClient(), cfg = await configResenas();
    const last = await notificationStore().get("resenas_ultimo", { type: "json" }).catch(() => null);
    return Response.json({ clienteGoogle: Boolean(c.id && c.secret), conectado: Boolean(g?.refresh_token), cuenta: g?.email || "", conectadoEl: g?.at || null, activo: !!cfg.activo, activadoPor: cfg.por || "", destinatarios: RESENAS.destinatarios, correoPrueba: RESENAS.correoPrueba, perfiles: RESENAS.perfiles.map((p) => p.nombre), ultimo: last }, { headers: { "cache-control": "no-store" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const accion = String(body?.accion || "");
  if (accion === "prueba-diseno") {
    const e = datosEjemplo(), r: any = await enviarResenas([RESENAS.correoPrueba], e.asunto, htmlInforme(e.datos, origin));
    await appendAudit({ actor: auth.actor!, module: "avisos", elementId: "resenas-prueba-diseno", action: r.sent ? "email_sent" : "email_pending", note: "Reseñas Google · prueba de diseño" });
    return Response.json({ sent: !!r.sent, to: r.to || [], bcc: r.bcc || [], reason: r.sent ? "" : r.reason || "" });
  }
  if (accion === "prueba") {
    try {
      const inf = await informeReal(), r: any = await enviarResenas([RESENAS.correoPrueba], "[PRUEBA] " + inf.asunto, htmlInforme(inf.datos, origin));
      await appendAudit({ actor: auth.actor!, module: "avisos", elementId: "resenas-prueba", action: r.sent ? "email_sent" : "email_pending", note: "Reseñas Google · prueba con datos reales" });
      return Response.json({ sent: !!r.sent, total: inf.datos.total, reason: r.sent ? "" : r.reason || "" });
    } catch (e: any) { return Response.json({ sent: false, reason: e.message }, { status: 200 }); }
  }
  if (accion === "perfiles") { try { return Response.json({ perfiles: await ubicaciones() }); } catch (e: any) { return Response.json({ error: e.message }, { status: 200 }); } }
  if (accion === "activar" || accion === "desactivar") {
    await controlStore().setJSON("resenas_config", { activo: accion === "activar", por: auth.actor!.email, at: new Date().toISOString() });
    await appendAudit({ actor: auth.actor!, module: "avisos", elementId: "resenas-semanal", action: "update", note: `Reseñas Google · envío semanal ${accion === "activar" ? "activado" : "desactivado"}` });
    return Response.json({ ok: true, activo: accion === "activar" });
  }
  return Response.json({ error: "Acción no válida" }, { status: 400 });
};
export const config: Config = { path: "/api/resenas" };
