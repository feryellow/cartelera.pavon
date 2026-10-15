import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { controlStore } from "./_lib/store.ts";
import { listSnapshots } from "./_lib/backup.ts";
import { readHealth } from "./_lib/notify.ts";
import { envVar, mailRecipients } from "./_lib/mailer.ts";
import { devicesByUser } from "./_lib/push.ts";

// /api/health (administración) · SALUD DE YELLOW CONTROL: cada comprobación devuelve OK, AVISO o ERROR.
type Check = { id: string; name: string; state: "OK" | "AVISO" | "ERROR"; detail: string; at?: string };
const hours = (iso?: string) => iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : Infinity;
const ago = (iso?: string) => { if (!iso) return "nunca"; const h = hours(iso); return h < 1 ? `hace ${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`; };

export default async (req: Request) => {
  const auth = await requireAccess(req, "admin", false); if (auth.response) return auth.response;
  const checks: Check[] = [], st = controlStore();

  // Base de datos: escribir y leer una marca
  try { const t0 = Date.now(), v = String(t0); await st.setJSON("health_probe", { v }); const back: any = await st.get("health_probe", { type: "json" }); const ms = Date.now() - t0;
    checks.push({ id: "db", name: "Base de datos", state: back?.v === v ? (ms > 3000 ? "AVISO" : "OK") : "ERROR", detail: back?.v === v ? `Escritura y lectura en ${ms} ms` : "No devuelve lo escrito" });
  } catch (e) { checks.push({ id: "db", name: "Base de datos", state: "ERROR", detail: String(e) }); }

  // Copia de seguridad
  const snaps = await listSnapshots().catch(() => []), last = snaps[0], hb = await readHealth("backup");
  checks.push({ id: "backup", name: "Último backup", state: !last ? "ERROR" : hours(last.at) < 26 ? (last.note ? "AVISO" : "OK") : hours(last.at) < 50 ? "AVISO" : "ERROR", at: last?.at,
    detail: last ? `${ago(last.at)} · ${snaps.length} copias guardadas · ${Math.round(last.bytes / 1024)} KB${last.note ? " · " + last.note : ""}${hb.last && !hb.last.ok ? " · último intento falló: " + hb.last.detail : ""}` : "Todavía no hay ninguna copia" });

  // Correo
  const he = await readHealth("email"), rcp = mailRecipients(), conf = !!(envVar("RESEND_API_KEY") && envVar("PAVON_EMAIL_FROM"));
  checks.push({ id: "email", name: "Email", state: !conf ? "ERROR" : he.last && !he.last.ok ? "ERROR" : !rcp.live ? "AVISO" : "OK", at: he.last?.at,
    detail: !conf ? "Falta configurar Resend o el remitente" : `${he.last ? (he.last.ok ? "Último envío correcto " : "Último envío fallido ") + ago(he.last.at) + " · " + he.last.detail : "Sin envíos registrados todavía"}${rcp.live ? "" : " · modo pruebas: todo llega solo a " + rcp.to[0]}` });

  // Avisos al móvil
  const hp = await readHealth("push"), dev = await devicesByUser().catch(() => ({} as Record<string, number>)), nDev = Object.values(dev).reduce((a, b) => a + b, 0);
  checks.push({ id: "push", name: "Push", state: hp.last && !hp.last.ok ? "ERROR" : nDev ? "OK" : "AVISO", at: hp.last?.at,
    detail: `${nDev} ${nDev === 1 ? "dispositivo" : "dispositivos"} (${Object.keys(dev).length} personas)${hp.last ? " · último aviso " + ago(hp.last.at) + (hp.last.ok ? "" : ": " + hp.last.detail) : ""}` });

  // Meta (lectura automática diaria)
  const meta: any = await st.get("meta_sync", { type: "json" }).catch(() => null), metaTok = !!(envVar("META_ACCESS_TOKEN") || await st.get("meta_token", { type: "json" }).catch(() => null));
  checks.push({ id: "meta", name: "Meta", state: !metaTok ? "AVISO" : !meta ? "AVISO" : meta.ok === false ? "ERROR" : hours(meta.okAt || meta.at) < 30 ? "OK" : "AVISO", at: meta?.at,
    detail: !metaTok ? "Sin token de Meta: solo importación manual" : !meta ? "Sin lecturas todavía" : meta.ok === false ? `Falló ${ago(meta.at)}: ${String(meta.error || "").slice(0, 120)}` : `Última lectura ${ago(meta.okAt || meta.at)}` });

  // Google Ads (llega desde el script de la cuenta)
  const g: any = await st.get("gads_sync", { type: "json" }).catch(() => null);
  checks.push({ id: "gads", name: "Google Ads", state: !g ? "AVISO" : hours(g.at) < 50 ? "OK" : "AVISO", at: g?.at, detail: g ? `Último envío del script ${ago(g.at)}` : "El script de Google Ads no ha enviado datos todavía" });

  // Motor de incidencias y correo diario
  const hg = await readHealth("engine");
  checks.push({ id: "sync", name: "Última sincronización", state: !hg.last ? "AVISO" : hg.last.ok ? (hours(hg.last.at) < 26 ? "OK" : "AVISO") : "ERROR", at: hg.last?.at,
    detail: hg.last ? `Status Engine ${ago(hg.last.at)} · ${hg.last.detail}` : "El cálculo diario aún no se ha ejecutado" });

  // Despliegue
  const deploy = Netlify.context?.deploy;
  checks.push({ id: "deploy", name: "Último deploy", state: "OK", detail: [deploy?.context ? "entorno " + deploy.context : "", deploy?.id ? "despliegue " + String(deploy.id).slice(0, 10) : "", envVar("COMMIT_REF") ? "commit " + envVar("COMMIT_REF").slice(0, 7) : ""].filter(Boolean).join(" · ") || "Sin datos del despliegue" });

  const worst = checks.some((c) => c.state === "ERROR") ? "ERROR" : checks.some((c) => c.state === "AVISO") ? "AVISO" : "OK";
  return Response.json({ state: worst, checks, at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
};
export const config: Config = { path: "/api/health" };
