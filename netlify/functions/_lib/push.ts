import webpush from "web-push";
import { controlStore } from "./store.ts";

// Notificaciones push (Web Push). Las claves VAPID se crean solas la primera vez y se guardan en Blobs.
// Los ajustes (quién los recibe, qué tipos y a qué hora llega el resumen) se cambian en Yellow Control,
// en «Avisos», que solo ven Fer y Celia. Sin ajustes guardados: solo Fer, todos los tipos, a las 9.
const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) || (globalThis as any).process?.env?.[k] || "";

export type PushType = "diario" | "urgente" | "proveedores" | "meta" | "prueba" | "manual";
export const PUSH_TYPES: { id: Exclude<PushType, "prueba" | "manual">; label: string; detail: string }[] = [
  { id: "diario", label: "Fechas del día", detail: "Cada mañana, lo que hay hoy en el Calendario" },
  { id: "urgente", label: "Urgente de cartelería y material", detail: "En el mismo aviso de la mañana, lo que vence hoy o mañana" },
  { id: "proveedores", label: "Proveedores", detail: "Cuando un proveedor pide material o escribe desde su portal" },
  { id: "meta", label: "Digital", detail: "Si falla la lectura automática de Meta" },
];
export type PushSettings = { users: string[]; types: Record<string, boolean>; hour: number; holidays: string[]; updatedAt?: string; updatedBy?: string };

function defaults(): PushSettings {
  const v = env("PUSH_USERS");
  const users = (v ? v.split(",") : ["fernando@yellowmedia.es"]).map((x: string) => x.trim().toLowerCase()).filter(Boolean);
  // Festivos de partida (Madrid capital, lo que queda de 2026): se editan en «Avisos»
  return { users, types: { diario: true, urgente: true, proveedores: true, meta: true }, hour: 9, holidays: ["2026-10-12", "2026-11-09", "2026-12-08", "2026-12-25"] };
}
export async function getSettings(): Promise<PushSettings> {
  const s = await controlStore().get("push_settings", { type: "json" }) as PushSettings | null;
  const d = defaults();
  return s ? { users: s.users || d.users, types: { ...d.types, ...(s.types || {}) }, hour: Number.isInteger(s.hour) ? s.hour : 9, holidays: Array.isArray(s.holidays) ? s.holidays : d.holidays, updatedAt: s.updatedAt, updatedBy: s.updatedBy } : d;
}
export async function saveSettings(s: PushSettings, by: string) {
  const clean: PushSettings = {
    users: [...new Set((s.users || []).map((x) => String(x).trim().toLowerCase()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)))].slice(0, 20),
    types: Object.fromEntries(PUSH_TYPES.map((t) => [t.id, s.types?.[t.id] !== false])),
    hour: Math.min(22, Math.max(6, Math.round(Number(s.hour) || 9))),
    holidays: [...new Set((s.holidays || []).map(String).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort().slice(0, 200),
    updatedAt: new Date().toISOString(), updatedBy: by,
  };
  await controlStore().setJSON("push_settings", clean);
  return clean;
}
export async function pushAllowed(email?: string) { return !!email && (await getSettings()).users.includes(email.trim().toLowerCase()); }

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
type Entry = Sub & { email: string; ua?: string; at: string; roles?: string[] };

async function vapid() {
  const st = controlStore();
  let k = await st.get("push_vapid", { type: "json" }) as { publicKey: string; privateKey: string } | null;
  if (!k?.publicKey) { k = webpush.generateVAPIDKeys(); await st.setJSON("push_vapid", k); }
  return k;
}
export async function publicKey() { return (await vapid()).publicKey; }

async function load(): Promise<Entry[]> { return ((await controlStore().get("push_subs", { type: "json" })) as Entry[] | null) || []; }
async function save(list: Entry[]) { await controlStore().setJSON("push_subs", list); }
export async function devicesByUser() {
  const out: Record<string, number> = {};
  for (const s of await load()) out[s.email] = (out[s.email] || 0) + 1;
  return out;
}

export async function addSub(email: string, sub: Sub, ua = "", roles: string[] = []) {
  const list = (await load()).filter((s) => s.endpoint !== sub.endpoint);
  list.push({ endpoint: sub.endpoint, keys: sub.keys, email: email.toLowerCase(), ua: ua.slice(0, 160), at: new Date().toISOString(), roles });
  await save(list);
}
export async function removeSub(endpoint: string) { await save((await load()).filter((s) => s.endpoint !== endpoint)); }
export async function hasSub(email: string, endpoint?: string) {
  return (await load()).some((s) => s.email === email.toLowerCase() && (!endpoint || s.endpoint === endpoint));
}

// Historial: los últimos 60 envíos (se ve en «Avisos»)
export type LogRow = { at: string; type: string; title: string; body: string; to: string[]; sent: number; failed: number; skipped?: string };
export async function pushLog(): Promise<LogRow[]> { return ((await controlStore().get("push_log", { type: "json" })) as LogRow[] | null) || []; }
async function logPush(row: LogRow) { const list = await pushLog(); list.unshift(row); await controlStore().setJSON("push_log", list.slice(0, 60)); }

export type PushMsg = { title: string; body: string; url?: string; tag?: string };
/** Destinatarios: "all" = la lista de «Avisos» (avisos automáticos); string[] = esos correos si están en la lista;
 *  {everyone:true} = todo el equipo con avisos activados en el móvil; {only:[…]} = esos correos sin mirar la lista. */
export type PushTarget = "all" | string[] | { everyone: true } | { only: string[] };
export async function sendPush(emails: PushTarget, msg: PushMsg, type: PushType = "prueba") {
  const st = await getSettings(), at = new Date().toISOString();
  if (type !== "prueba" && type !== "manual" && st.types[type] === false) { await logPush({ at, type, title: msg.title, body: msg.body, to: [], sent: 0, failed: 0, skipped: "Tipo de aviso desactivado" }); return { sent: 0, failed: 0 }; }
  const list = await load();
  let targets: Entry[];
  if (emails === "all") targets = list.filter((s) => st.users.includes(s.email));
  else if (Array.isArray(emails)) { const w = emails.map((e) => e.toLowerCase()).filter((e) => st.users.includes(e)); targets = list.filter((s) => w.includes(s.email)); }
  else if ("everyone" in emails) targets = list.filter((s) => !(s.roles || []).includes("proveedor") || (s.roles || []).some((r) => r === "admin" || r === "gestion"));
  else { const w = emails.only.map((e) => e.toLowerCase()); targets = list.filter((s) => w.includes(s.email)); }
  const want = [...new Set(targets.map((t) => t.email))];
  if (!targets.length) { await logPush({ at, type, title: msg.title, body: msg.body, to: want, sent: 0, failed: 0, skipped: "Nadie tiene los avisos activados en un dispositivo" }); return { sent: 0, failed: 0 }; }
  const k = await vapid();
  webpush.setVapidDetails("mailto:fernando@yellowmedia.es", k.publicKey, k.privateKey);
  const payload = JSON.stringify({ title: msg.title.slice(0, 80), body: msg.body.slice(0, 240), url: msg.url || "/#dashboard", tag: msg.tag || type });
  let sent = 0, failed = 0; const gone: string[] = [];
  await Promise.all(targets.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 6 * 3600 }); sent++; }
    catch (e: any) { failed++; if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint); else console.error("push", e?.statusCode, String(e?.body || e?.message || e).slice(0, 200)); }
  }));
  if (gone.length) await save(list.filter((s) => !gone.includes(s.endpoint)));
  await logPush({ at, type, title: msg.title, body: msg.body, to: [...new Set(targets.map((t) => t.email))], sent, failed });
  return { sent, failed };
}
