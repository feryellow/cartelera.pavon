import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
import { pushAllowed, publicKey, addSub, removeSub, hasSub, sendPush } from "./_lib/push.ts";

// /api/push
//   GET  ?endpoint=…        → { allowed, publicKey, subscribed }
//   POST {subscription}     → guarda este dispositivo
//   POST {test:true}        → manda una notificación de prueba a tus dispositivos
//   DELETE {endpoint}       → quita este dispositivo
export default async (req: Request) => {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = pushAllowed(actor.email);
  if (req.method === "GET") {
    if (!allowed) return Response.json({ allowed: false });
    const ep = new URL(req.url).searchParams.get("endpoint") || "";
    return Response.json({ allowed: true, publicKey: await publicKey(), subscribed: ep ? await hasSub(actor.email, ep) : false }, { headers: { "cache-control": "no-store" } });
  }
  if (!allowed) return Response.json({ error: "Los avisos están en prueba y tu usuario todavía no los tiene." }, { status: 403 });
  let body: any = {}; try { body = await req.json(); } catch {}
  if (req.method === "POST" && body?.test) {
    const r = await sendPush([actor.email], { title: "Yellow Control", body: "Avisos activados. Así te llegarán las fechas del día y lo urgente.", url: "/#calendario", tag: "prueba" });
    return Response.json({ ok: r.sent > 0, ...r });
  }
  if (req.method === "POST") {
    const s = body?.subscription;
    if (!s?.endpoint || !/^https:\/\//.test(s.endpoint) || !s?.keys?.p256dh || !s?.keys?.auth) return Response.json({ error: "Suscripción no válida" }, { status: 400 });
    await addSub(actor.email, { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, req.headers.get("user-agent") || "");
    return Response.json({ ok: true });
  }
  if (req.method === "DELETE") { if (body?.endpoint) await removeSub(String(body.endpoint)); return Response.json({ ok: true }); }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/push" };
