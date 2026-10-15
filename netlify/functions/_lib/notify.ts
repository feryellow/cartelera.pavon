import { sendPavonMail } from "./mailer.ts";
import { sendPush, type PushType } from "./push.ts";
import { notificationStore } from "./store.ts";

// Capa única de notificaciones. El Status Engine decide QUÉ pasa; esta capa decide CÓMO se comunica
// (correo o móvil), deja constancia del resultado para la vista «Salud» y avisa a administración si falla.
type Health = { at: string; ok: boolean; detail: string };
const ADMIN = "fernando@yellowmedia.es";

export async function recordHealth(check: string, ok: boolean, detail = "") {
  const v: Health = { at: new Date().toISOString(), ok, detail: String(detail).slice(0, 300) };
  await notificationStore().setJSON(`health_${check}`, v).catch(() => null);
  if (ok) await notificationStore().setJSON(`health_${check}_lastok`, v).catch(() => null);
}
export async function readHealth(check: string) {
  const [last, lastOk] = await Promise.all([notificationStore().get(`health_${check}`, { type: "json" }), notificationStore().get(`health_${check}_lastok`, { type: "json" })]);
  return { last: last as Health | null, lastOk: lastOk as Health | null };
}

/** Aviso al móvil de administración cuando algo técnico falla (correo, copia, sincronización). Una vez al día por motivo. */
export async function adminAlert(reason: string, text: string) {
  const day = new Date().toISOString().slice(0, 10), key = `admin-alert-${reason}-${day}`, ns = notificationStore();
  if (await ns.get(key, { type: "json" })) return;
  await ns.setJSON(key, { at: new Date().toISOString(), text });
  await sendPush({ only: [ADMIN] }, { title: "Yellow Control · revisar", body: text.slice(0, 160), url: "/#salud", tag: "salud-" + reason }, "manual").catch(() => null);
}

export async function notifyEmail(input: { kind: string; subject: string; html: string; attachments?: any[]; to?: string[]; cc?: string[]; extra?: string[]; replyTo?: string }) {
  try {
    const { kind, ...mail } = input;
    const r: any = await sendPavonMail(mail);
    await recordHealth("email", !!r.sent, r.sent ? `${input.kind}: enviado` : `${input.kind}: ${r.reason || "no enviado"}`);
    if (!r.sent) await adminAlert("email", `No se ha podido enviar «${input.subject}». Motivo: ${String(r.reason || "desconocido").slice(0, 80)}`);
    return r;
  } catch (err) {
    await recordHealth("email", false, `${input.kind}: ${String(err)}`);
    await adminAlert("email", `Error al enviar «${input.subject}»`);
    return { sent: false, reason: String(err) };
  }
}

export async function notifyPush(target: Parameters<typeof sendPush>[0], payload: Parameters<typeof sendPush>[1], type: PushType) {
  try {
    const r: any = await sendPush(target, payload, type);
    await recordHealth("push", true, `${type}: ${JSON.stringify(r).slice(0, 120)}`);
    return r;
  } catch (err) {
    await recordHealth("push", false, `${type}: ${String(err)}`);
    return { sent: 0, error: String(err) };
  }
}
