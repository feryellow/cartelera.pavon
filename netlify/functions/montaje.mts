import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { assetStore, carteleriaStore, controlStore } from "./_lib/store.ts";
import { madridToday } from "./_lib/dates.ts";
import { SLOT_NAMES, slotVenue } from "./_lib/calendar.ts";
import { sendPavonMail, mailRecipients } from "./_lib/mailer.ts";
import { renderMontaje, montajeTitle } from "./_lib/montaje-mail.ts";
import { getContacts } from "./_lib/contacts.ts";

// Confirmación de montaje: marca los soportes como instalados, guarda las fotos y envía el correo.
// POST { slots:[{key, photo?:base64 jpeg}], note, to:[emails], cc:[emails] }
const MAX_PHOTO = 1.6 * 1024 * 1024; // por foto, ya comprimida en el navegador

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const auth = await requireAccess(req, "carteleria", true); if (auth.response) return auth.response;
  let body: any; try { body = await req.json(); } catch { return Response.json({ error: "Datos no válidos" }, { status: 400 }); }

  const slots = (Array.isArray(body?.slots) ? body.slots : []).filter((s: any) => s && SLOT_NAMES[s.key]);
  if (!slots.length) return Response.json({ error: "Marca al menos un soporte." }, { status: 400 });
  const venues = [...new Set(slots.map((s: any) => slotVenue(s.key)))] as string[];
  if (venues.length > 1) return Response.json({ error: "Confirma el montaje de cada teatro por separado." }, { status: 400 });
  const venue = venues[0];
  const allowed = new Set((await getContacts()).map((c) => c.email.toLowerCase()));
  const pick = (v: any) => [...new Set((Array.isArray(v) ? v : []).map((x: any) => String(x).trim().toLowerCase()).filter((x: string) => allowed.has(x)))] as string[];
  const to = pick(body.to), cc = pick(body.cc).filter((x) => !to.includes(x));
  if (!to.length) return Response.json({ error: "Elige al menos un destinatario en «Para»." }, { status: 400 });
  const note = String(body.note || "").trim().slice(0, 1500);
  const date = madridToday();
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 16);

  // 1) Fotos
  const attachments: { filename: string; content: string; content_id: string; content_type: string }[] = [];
  const photos: Record<string, string> = {};
  for (const [i, s] of slots.entries()) {
    const b64 = String(s.photo || "").replace(/^data:image\/\w+;base64,/, "");
    if (!b64) continue;
    const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (buf.byteLength > MAX_PHOTO) return Response.json({ error: `La foto de ${SLOT_NAMES[s.key]} pesa demasiado.` }, { status: 413 });
    const key = `montaje_${id}_${i}`;
    await assetStore().set(`file_${key}`, buf);
    await assetStore().setJSON(`meta_${key}`, { contentType: "image/jpeg", size: buf.byteLength, updatedAt: new Date().toISOString(), updatedBy: auth.actor!.email });
    photos[s.key] = key;
    attachments.push({ filename: `${SLOT_NAMES[s.key].replace(/[^\wÁÉÍÓÚáéíóúÑñ ()-]/g, "")}.jpg`, content: b64, content_id: `foto${i}`, content_type: "image/jpeg" });
  }

  // 2) Marcar como instalados en Cartelería (solo estado y fecha de instalación)
  const store = carteleriaStore();
  const before: any = await store.get("state", { type: "json" }) || { slots: {}, schedule: {} };
  const after = { ...before, schedule: { ...(before.schedule || {}) }, updatedAt: new Date().toISOString(), updatedBy: auth.actor!.email };
  for (const s of slots) after.schedule[s.key] = { ...(after.schedule[s.key] || {}), status: "instalado", installDate: date, lastMontaje: id };
  await store.setJSON("state", after);

  // 3) Correo
  const items = slots.map((s: any, i: number) => ({ name: SLOT_NAMES[s.key], title: after.schedule[s.key]?.title || "", cid: photos[s.key] ? `foto${i}` : undefined }));
  const appUrl = (Netlify.env.get("URL") || "https://yellow-control.netlify.app").replace(/\/$/, "");
  const rcp = mailRecipients();
  const html = renderMontaje({ date, by: auth.actor!.email, note, items, appUrl, devRecipient: rcp.live ? "" : rcp.to[0], intendedTo: to, intendedCc: cc, venue });
  const result: any = await sendPavonMail({ subject: `Montaje realizado · ${montajeTitle(items)} · ${venue}`, html, attachments, to, cc });

  const record = { id, date, by: auth.actor!.email, note, slots: slots.map((s: any) => s.key), photos, to, cc, sent: !!result.sent, sentTo: result.to || [], createdAt: new Date().toISOString() };
  await controlStore().setJSON(`montaje_${id}`, record);
  await appendAudit({ actor: auth.actor!, module: "carteleria", elementId: `montaje-${id}`, action: result.sent ? "montaje_confirmado" : "montaje_sin_correo", before, after: record });
  return Response.json({ ok: true, sent: !!result.sent, reason: result.sent ? "" : result.reason || "", live: rcp.live, sentTo: result.to || [], intendedTo: to, intendedCc: cc });
};
export const config: Config = { path: "/api/montaje" };
