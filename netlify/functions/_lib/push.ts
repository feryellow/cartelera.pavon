import webpush from "web-push";
import { controlStore } from "./store.ts";

// Notificaciones push (Web Push). Las claves VAPID se crean solas la primera vez y se guardan en Blobs.
// Fase de prueba: solo las reciben los correos de PUSH_USERS (variable de Netlify, separados por comas);
// sin esa variable, solo Fer.
const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) || (globalThis as any).process?.env?.[k] || "";
export function pushUsers(): string[] {
  const v = env("PUSH_USERS");
  return (v ? v.split(",") : ["fernando@yellowmedia.es"]).map((x: string) => x.trim().toLowerCase()).filter(Boolean);
}
export const pushAllowed = (email?: string) => !!email && pushUsers().includes(email.trim().toLowerCase());

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
type Entry = Sub & { email: string; ua?: string; at: string };

async function vapid() {
  const st = controlStore();
  let k = await st.get("push_vapid", { type: "json" }) as { publicKey: string; privateKey: string } | null;
  if (!k?.publicKey) { k = webpush.generateVAPIDKeys(); await st.setJSON("push_vapid", k); }
  return k;
}
export async function publicKey() { return (await vapid()).publicKey; }

async function load(): Promise<Entry[]> { return ((await controlStore().get("push_subs", { type: "json" })) as Entry[] | null) || []; }
async function save(list: Entry[]) { await controlStore().setJSON("push_subs", list); }

export async function addSub(email: string, sub: Sub, ua = "") {
  const list = (await load()).filter((s) => s.endpoint !== sub.endpoint);
  list.push({ endpoint: sub.endpoint, keys: sub.keys, email: email.toLowerCase(), ua: ua.slice(0, 160), at: new Date().toISOString() });
  await save(list);
}
export async function removeSub(endpoint: string) { await save((await load()).filter((s) => s.endpoint !== endpoint)); }
export async function hasSub(email: string, endpoint?: string) {
  return (await load()).some((s) => s.email === email.toLowerCase() && (!endpoint || s.endpoint === endpoint));
}

export type PushMsg = { title: string; body: string; url?: string; tag?: string };
/** Envía a los dispositivos de esos correos (solo si están en la lista de prueba). Quita las suscripciones caducadas. */
export async function sendPush(emails: string[] | "all", msg: PushMsg) {
  const allowed = pushUsers(), want = emails === "all" ? allowed : emails.map((e) => e.toLowerCase()).filter((e) => allowed.includes(e));
  const list = await load(), targets = list.filter((s) => want.includes(s.email));
  if (!targets.length) return { sent: 0, failed: 0 };
  const k = await vapid();
  webpush.setVapidDetails("mailto:fernando@yellowmedia.es", k.publicKey, k.privateKey);
  const payload = JSON.stringify({ title: msg.title.slice(0, 80), body: msg.body.slice(0, 240), url: msg.url || "/#dashboard", tag: msg.tag || "" });
  let sent = 0, failed = 0; const gone: string[] = [];
  await Promise.all(targets.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 6 * 3600 }); sent++; }
    catch (e: any) { failed++; if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint); else console.error("push", e?.statusCode, String(e?.body || e?.message || e).slice(0, 200)); }
  }));
  if (gone.length) await save(list.filter((s) => !gone.includes(s.endpoint)));
  return { sent, failed };
}
