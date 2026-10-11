import type { Config } from "@netlify/functions";
import { budgetAccess } from "./_lib/budget.ts";
import { getSettings, saveSettings, pushLog, devicesByUser, sendPush, PUSH_TYPES } from "./_lib/push.ts";
import { appendAudit } from "./_lib/audit.ts";

// /api/push-settings · solo quien tiene acceso al presupuesto (Fer y Celia)
//   GET            → ajustes, tipos, dispositivos activos por persona e historial de envíos
//   PUT {settings} → guarda quién recibe, qué tipos y a qué hora sale el aviso de la mañana
//   POST {test}    → aviso de prueba a todos los de la lista
const noStore = { "cache-control": "no-store, private" };
export default async (req: Request) => {
  const acc = await budgetAccess(req);
  if (acc.status !== "ok") return Response.json({ error: "Solo Fer y Celia pueden cambiar los avisos." }, { status: acc.status === "login" ? 401 : 403, headers: noStore });
  if (req.method === "GET") return Response.json({ settings: await getSettings(), types: PUSH_TYPES, devices: await devicesByUser(), log: await pushLog() }, { headers: noStore });
  let body: any = {}; try { body = await req.json(); } catch {}
  if (req.method === "POST" && body?.test) {
    const r = await sendPush("all", { title: "Yellow Control · prueba", body: "Aviso de prueba enviado desde «Avisos».", url: "/#avisos", tag: "prueba" }, "prueba");
    return Response.json({ ok: true, ...r }, { headers: noStore });
  }
  if (req.method === "PUT") {
    const saved = await saveSettings(body?.settings || {}, acc.actor!.email);
    await appendAudit({ actor: { id: acc.actor!.email, email: acc.actor!.email } as any, module: "avisos", elementId: "push-settings", action: "update", note: `Avisos: ${saved.users.join(", ")} · ${saved.hour}:00 · ${Object.entries(saved.types).filter(([, v]) => v).map(([k]) => k).join(", ")}` }).catch(() => null);
    return Response.json({ ok: true, settings: saved }, { headers: noStore });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/push-settings" };
