import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { budgetAccess } from "./_lib/budget.ts";
import { appendAudit } from "./_lib/audit.ts";
import { madridToday } from "./_lib/dates.ts";
import { envVar } from "./_lib/mailer.ts";
import { mediaUrl } from "./_lib/media.ts";
import { yellowMail } from "./_lib/newsletter.ts";
import { controlStore } from "./_lib/store.ts";
import { SEED, SEED_VERSION } from "./_lib/diseno-seed.ts";
import { missingInfo, clean, listDiseno, getDiseno, putDiseno, getSettings, saveSettings, OPEN, PIECE_TYPES } from "./_lib/diseno.ts";

// /api/diseno · peticiones de diseño
//   GET                      → peticiones, ajustes y tipos de pieza
//   POST {row}               → nueva petición (sin fecha límite no entra)
//   POST {bulk:[…]}          → importación de la hoja (solo Fer y Celia); no duplica
//   PUT ?id=…  {row,reason}  → cambia una petición (fechas de entrega y reaperturas se apuntan solas; queda en su historial)
//   PUT ?id=…&undo=1         → deshace el último cambio de esa petición
//   POST {updates:[{id,row}]} → actualización en bloque (lo que pega la diseñadora, ya revisado)
//   DELETE ?id=…             → la quita (recuperable)
//   PATCH ?id=…              → recupera una petición quitada
//   POST {notify:{ids,ccMe,message,dryRun}} → aviso por correo a quien pidió cada pieza (desde avisos@)
//   PUT ?settings=1 {settings} → personas, empresas y umbrales (solo Fer y Celia)
const noStore = { "cache-control": "no-store, private" };
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: noStore });
// Campos que quedan en el historial de cada petición (quién, cuándo, de qué a qué). Se guardan los 40 últimos.
const TRACK = ["title", "requester", "company", "pieceType", "requestDate", "deadline", "status", "progress", "urgent", "designerNotes", "link", "notes", "cancelReason", "deliveryLink", "previewKey"];
function applyUpdate(before: any, r: any, actor: any, today: string, reason = "", undo = false) {
  const now = new Date().toISOString();
  const row: any = { ...before, ...r, id: before.id, updatedAt: now, updatedBy: actor.email };
  if (r.status && r.status !== before.status) {
    row.statusChangedAt = now;
    const wasClosed = !OPEN.includes(before.status), isClosed = !OPEN.includes(r.status);
    if (r.status === "entregado") { row.deliveredAt = r.deliveredAt || today; row.progress = 100; }
    if (wasClosed && !isClosed) { if (!undo) row.reopenCount = (before.reopenCount || 0) + 1; row.deliveredAt = ""; }
  }
  const changes = TRACK.filter((f) => String(row[f] ?? "") !== String(before[f] ?? "")).map((f) => ({ f, from: before[f] ?? "", to: row[f] ?? "" }));
  if (changes.length) row.history = [...(Array.isArray(before.history) ? before.history : []), { at: now, by: actor.email, changes, reason: reason.slice(0, 200), ...(undo ? { undo: true } : {}) }].slice(-40);
  return row;
}

// ---- Avisos por correo: van a quien pidió cada pieza (correo de Ajustes), con copia opcional a quien avisa.
// Remite avisos@ (PAVON_EMAIL_FROM); responder llega a quien avisa (reply-to). Mientras «mailLive» esté
// apagado en Ajustes, todo va solo a DEV_TO y el asunto lo indica.
const DEV_TO = "fernando@yellowmedia.es";
// Vista previa: enlace firmado a la imagen reducida (se ve en la app y en el correo sin iniciar sesión)
let ORIGIN = "";
let TODAY = "";
const withPreview = (r: any) => {
  if (!r) return r;
  const o: any = r.previewKey ? { ...r, previewUrl: mediaUrl(ORIGIN, r.previewKey, "diseno") } : { ...r };
  if (OPEN.includes(r.status) && !r.imported) { const m = missingInfo(r, TODAY || r.requestDate || ""); if (m.length) o.missing = m; }
  return o;
};
// Correo a quien pide cuando a su petición le falta información (solo al crearla desde la app)
async function mailMissing(row: any, items: { txt: string }[], actor: any) {
  const settings = await getSettings(), email = settings.people.find((p: any) => p.name === row.requester)?.email || "";
  if (!email) return { sent: false, reason: "Falta su correo en Ajustes" };
  const apiKey = envVar("RESEND_API_KEY"), from = envVar("PAVON_EMAIL_FROM");
  if (!apiKey || !from) return { sent: false, reason: "El correo no está configurado" };
  const live = settings.mailLive, link = `${ORIGIN}/#diseno?edit=${row.id}`;
  const F = "'Poppins', Arial, Helvetica, sans-serif";
  const body = `<p style="margin:0 0 14px;">Hola, ${h(nice(row.requester))}. Tu petición ha entrado en Diseño, pero para que Cristina pueda empezar sin tener que preguntarte, falta esto:</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #FFD400;background:#f7f6f2;"><tr><td style="padding:14px 16px;font-family:${F};">
    <div style="font-size:11px;font-weight:800;letter-spacing:.06em;color:#6b665d;text-transform:uppercase;">${h(row.company)}${row.pieceType ? " · " + h(row.pieceType) : ""}</div>
    <div style="font-size:17px;font-weight:800;color:#111111;margin:4px 0 8px;">${h(row.title)}</div>
    <span style="display:inline-block;background:#FFD400;color:#111111;font-size:11px;font-weight:800;padding:3px 7px;">PARA EL ${h(esDate(row.deadline))}</span>
  </td></tr></table>
  <div style="font-size:12px;font-weight:800;letter-spacing:.06em;color:#111111;margin-top:22px;">FALTA · ${items.length}</div>
  <div style="height:2px;background:#FFD400;margin:6px 0 4px;"></div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map((i) => `<tr><td valign="top" style="padding:10px 10px 10px 0;width:14px;font-family:${F};font-size:14px;font-weight:800;color:#c0392b;">✗</td><td style="padding:10px 0;border-bottom:1px solid #ecebe6;font-family:${F};font-size:14px;line-height:20px;color:#111111;">${h(i.txt)}</td></tr>`).join("")}</table>
  <p style="margin:16px 0 0;font-size:12px;color:#6b665d;">Se completa en la misma petición, con el botón Editar. No hace falta abrir otra.</p>`;
  const html = yellowMail({ base: ORIGIN, kicker: "DISEÑO · FALTA INFORMACIÓN", title: "Completa tu petición", preheader: `${String(row.title).slice(0, 60)}: faltan ${items.length} datos para empezar`, body, cta: { label: "Completar la petición", url: link }, footer: "Aviso automático: no respondas a este correo.", test: !live });
  const subject = `Falta información en tu petición · ${String(row.title).slice(0, 70)}`;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: live ? [email] : [DEV_TO], reply_to: actor.email, subject: live ? subject : `[PRUEBA · iría a ${email}] ${subject}`, html }) }).catch(() => null);
  return { sent: !!r?.ok, live };
}
const STATUS_TXT: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En proceso", en_revision: "En revisión", parado: "Parado", entregado: "Entregado", cancelado: "Cancelada" };
const h = (v: any) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
const esDate = (iso: string) => iso ? iso.slice(8, 10).replace(/^0/, "") + "/" + iso.slice(5, 7).replace(/^0/, "") + "/" + iso.slice(0, 4) : "";
const nice = (s: string) => s ? s.charAt(0) + s.slice(1).toLowerCase() : "";
function senderName(email: string, people: any[]) { const p = people.find((x) => x.email === email); if (p) return nice(p.name); const u = email.split("@")[0]; return u.charAt(0).toUpperCase() + u.slice(1); }
function mailHtml(o: { to: string; from: string; fromEmail: string; rows: any[]; message: string }) {
  const card = (r: any) => {
    const st = STATUS_TXT[r.status] || r.status, done = r.status === "entregado", cancel = r.status === "cancelado";
    const line = [st, !done && !cancel ? `avance ${r.progress || 0} %` : "", done && r.deliveredAt ? `entregado el ${esDate(r.deliveredAt)}` : "", !done && !cancel && r.deadline ? `para el ${esDate(r.deadline)}` : ""].filter(Boolean).join(" · ");
    const color = done ? "#1d7a43" : cancel ? "#9b2c2c" : "#7a5f00";
    return `<tr><td style="padding:14px 16px;border:1px solid #e7e3d9;border-radius:10px;background:#ffffff">
      <div style="font-size:12px;color:#6b665d;text-transform:uppercase;letter-spacing:.04em">${h(r.company)}${r.pieceType ? " · " + h(r.pieceType) : ""}</div>
      <div style="font-size:16px;font-weight:700;color:#161616;margin:4px 0 6px">${h(r.title)}</div>
      <div style="font-size:14px;font-weight:700;color:${color}">${h(line)}</div>
      ${!done && !cancel ? `<div style="height:6px;background:#efece5;border-radius:6px;margin-top:8px;overflow:hidden"><div style="height:6px;width:${r.progress || 0}%;background:#FFD400"></div></div>` : ""}
      ${cancel && r.cancelReason ? `<div style="font-size:14px;color:#3a372f;margin-top:6px">Motivo: ${h(r.cancelReason)}</div>` : ""}
      ${r.designerNotes ? `<div style="font-size:14px;color:#3a372f;margin-top:6px">Comentario de diseño: ${h(r.designerNotes)}</div>` : ""}
      ${r.previewKey ? `<img src="${h(mediaUrl(ORIGIN, r.previewKey, "diseno"))}" alt="Vista previa" width="526" style="display:block;width:100%;max-width:526px;height:auto;border-radius:8px;margin-top:12px;border:1px solid #e7e3d9">` : ""}
      ${r.deliveryLink ? `<div style="margin-top:12px"><a href="${h(r.deliveryLink)}" style="display:inline-block;background:#FFD400;color:#161616;font-weight:700;font-size:15px;text-decoration:none;padding:11px 18px;border-radius:8px">Descargar los archivos</a></div><div style="font-size:12px;color:#8a857b;margin-top:6px">Los archivos finales no van adjuntos: se descargan desde este enlace.</div>` : ""}
      ${r.link ? `<div style="margin-top:8px"><a href="${h(r.link)}" style="color:#161616;font-weight:700">Abrir el material de partida</a></div>` : ""}
    </td></tr><tr><td style="height:10px"></td></tr>`;
  };
  return `<div style="background:#f5f3ee;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:separate">
  <tr><td style="padding:12px 14px;background:#161616;color:#f2efe6;border-radius:10px;font-size:13px;line-height:1.5">
    <b style="color:#FFD400">Esto es un aviso.</b> No respondas a este correo. Si quieres contactar, escribe a <a href="mailto:${h(o.fromEmail)}" style="color:#FFD400">${h(o.fromEmail)}</a>.
  </td></tr><tr><td style="height:18px"></td></tr>
  <tr><td style="font-size:15px;color:#161616;line-height:1.55">Hola, ${h(o.to)}:<br><br>${o.rows.length === 1 ? "Así está tu petición de diseño:" : `Así están tus ${o.rows.length} peticiones de diseño:`}</td></tr>
  <tr><td style="height:14px"></td></tr>
  ${o.rows.map(card).join("")}
  ${o.message ? `<tr><td style="font-size:15px;color:#161616;line-height:1.55;padding:4px 0 12px;white-space:pre-line">${h(o.message)}</td></tr>` : ""}
  <tr><td style="font-size:14px;color:#3a372f;padding-top:6px">${h(o.from)} · Diseño</td></tr>
  <tr><td style="font-size:12px;color:#8a857b;padding-top:18px">Aviso enviado desde Yellow Control · Yellow Media</td></tr>
  </table></div>`;
}
async function notify(body: any, actor: any) {
  const settings = await getSettings(), ids: string[] = (Array.isArray(body.ids) ? body.ids : []).slice(0, 40);
  const rows = (await Promise.all(ids.map((id) => getDiseno(String(id))))).filter((r: any) => r && !r.deletedAt);
  const groups = new Map<string, any[]>(); for (const r of rows) { const k = r.requester || "—"; groups.set(k, [...(groups.get(k) || []), r]); }
  const fromEmail = actor.email.toLowerCase(), fromName = senderName(fromEmail, settings.people), message = String(body.message || "").trim().slice(0, 1500);
  const out: any[] = [];
  for (const [name, list] of groups) {
    const email = settings.people.find((p) => p.name === name)?.email || "";
    const subject = `Aviso de diseño · ${list.length === 1 ? list[0].title.slice(0, 70) + " · " + (STATUS_TXT[list[0].status] || "") : list.length + " peticiones"}`;
    const html = mailHtml({ to: nice(name), from: fromName, fromEmail, rows: list, message });
    const item: any = { name, email, count: list.length, subject };
    if (!email) { item.error = "Falta su correo en Ajustes"; out.push(item); continue; }
    if (body.dryRun) { item.html = html; out.push(item); continue; }
    const live = settings.mailLive, to = live ? [email] : [DEV_TO], cc = live && body.ccMe && fromEmail !== email ? [fromEmail] : [];
    const apiKey = envVar("RESEND_API_KEY"), from = envVar("PAVON_EMAIL_FROM");
    if (!apiKey || !from) { item.error = "El correo no está configurado"; out.push(item); continue; }
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, ...(cc.length ? { cc } : {}), reply_to: fromEmail, subject: live ? subject : `[PRUEBA · iría a ${email}${body.ccMe ? " y copia a " + fromEmail : ""}] ${subject}`, html }) });
    if (!r.ok) { item.error = "No se ha podido enviar (" + r.status + ")"; out.push(item); continue; }
    item.sent = true; item.live = live; out.push(item);
    const now = new Date().toISOString();
    for (const row of list) { row.lastNotifiedAt = now; row.history = [...(row.history || []), { at: now, by: actor.email, changes: [], reason: `Aviso por correo a ${nice(name)}${live ? "" : " (en pruebas, llegó a Fernando)"}` }].slice(-40); await putDiseno(row.id, row); }
    await appendAudit({ actor, module: "diseno", elementId: "aviso", action: "update", note: `Aviso por correo a ${email} (${list.length})${live ? "" : " · pruebas"}` }).catch(() => null);
  }
  return { results: out, live: settings.mailLive };
}

// La primera vez que se abre Diseño se vuelca la hoja entera (diseno-seed.ts). Solo una vez: queda apuntado en
// diseno_seed. No duplica lo que ya esté (mismo título, quién pide, fecha de solicitud y fecha límite).
async function loadSeed(actor: any) {
  const st = controlStore();
  if ((await st.get("diseno_seed", { type: "json" }) as any)?.version === SEED_VERSION) return;
  await st.setJSON("diseno_seed", { version: SEED_VERSION, at: new Date().toISOString(), by: actor.email });
  const k = (r: any) => [r.title, r.requester, r.requestDate, r.deadline].map((x) => String(x || "").toLowerCase().replace(/\s+/g, " ").trim()).join("|");
  const existing = new Set((await listDiseno(true)).map(k)), now = new Date().toISOString();
  const todo = SEED.map((b) => clean(b)).filter((r: any) => r.title && !existing.has(k(r)));
  let i = 0, added = 0;
  await Promise.all(Array.from({ length: 12 }, async () => { while (i < todo.length) { const r = todo[i++], id = crypto.randomUUID();
    await putDiseno(id, { id, status: "pendiente", progress: 0, ...r, imported: true, statusChangedAt: now, createdAt: now, updatedAt: now, createdBy: "hoja", updatedBy: "hoja", deletedAt: null }); added++; } }));
  await appendAudit({ actor, module: "diseno", elementId: "importacion", action: "create", note: `Volcado de la hoja: ${added} peticiones` }).catch(() => null);
}
const key = (r: any) => [r.title, r.requester, r.requestDate].map((x) => String(x || "").toLowerCase().replace(/\s+/g, " ").trim()).join("|");

export default async (req: Request) => {
  const url = new URL(req.url), write = req.method !== "GET";
  ORIGIN = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  TODAY = madridToday();
  const auth = await requireAccess(req, "diseno", write); if (auth.response) return auth.response;
  const actor = auth.actor!, today = madridToday();
  const isBoss = (await budgetAccess(req).catch(() => ({ status: "forbidden" }))).status === "ok";

  if (req.method === "GET") {
    await loadSeed(actor);
    const [rows, settings] = await Promise.all([listDiseno(), getSettings()]);
    const me = settings.people.find((p) => p.email && p.email === actor.email.toLowerCase())?.name || "";
    return json({ rows: rows.map(withPreview), settings, pieceTypes: PIECE_TYPES, me, canSettings: isBoss, today });
  }
  let body: any = {}; try { body = await req.json(); } catch { if (req.method === "POST" || req.method === "PUT") return json({ error: "Datos no válidos" }, 400); }

  if (req.method === "PUT" && url.searchParams.get("settings")) {
    if (!isBoss) return json({ error: "Solo Fer y Celia pueden cambiar los ajustes de Diseño." }, 403);
    const settings = await saveSettings(body.settings || {});
    await appendAudit({ actor, module: "diseno", elementId: "ajustes", action: "update", note: "Ajustes de Diseño" }).catch(() => null);
    return json({ ok: true, settings });
  }

  if (req.method === "POST" && Array.isArray(body.bulk)) {
    if (!isBoss) return json({ error: "Solo Fer y Celia pueden importar la hoja." }, 403);
    const existing = new Set((await listDiseno(true)).map(key));
    let added = 0, skipped = 0; const now = new Date().toISOString();
    const work = body.bulk.slice(0, 2000).map((b: any) => clean(b)).filter((r: any) => r.title);
    const todo = work.filter((r: any) => { const k = key(r); if (existing.has(k)) { skipped++; return false; } existing.add(k); return true; });
    let i = 0;
    await Promise.all(Array.from({ length: 12 }, async () => { while (i < todo.length) { const r = todo[i++]; const id = crypto.randomUUID();
      await putDiseno(id, { id, status: "pendiente", progress: 0, ...r, imported: true, statusChangedAt: now, createdAt: now, updatedAt: now, createdBy: actor.email, updatedBy: actor.email, deletedAt: null }); added++; } }));
    await appendAudit({ actor, module: "diseno", elementId: "importacion", action: "create", note: `Importación de la hoja: ${added} peticiones nuevas, ${skipped} ya estaban` }).catch(() => null);
    return json({ ok: true, added, skipped });
  }

  if (req.method === "POST" && body.notify) return json(await notify(body.notify, actor));
  if (req.method === "POST" && Array.isArray(body.updates)) {
    const out: any[] = [], errors: string[] = [];
    for (const u of body.updates.slice(0, 100)) {
      const id = String(u?.id || ""); if (!/^[\w-]{8,60}$/.test(id)) continue;
      const before = await getDiseno(id); if (!before || before.deletedAt) { errors.push(id); continue; }
      const r = clean(u.row || {}); if (r.deadline === "") delete r.deadline;
      const row = applyUpdate(before, r, actor, today, String(u.reason || "Actualización en bloque"));
      await putDiseno(id, row); out.push(row);
      await appendAudit({ actor, module: "diseno", elementId: id, action: "update", before, after: row, note: "Actualización en bloque" }).catch(() => null);
    }
    return json({ rows: out, errors });
  }
  if (req.method === "POST") {
    const r = clean(body.row || {});
    if (!r.title) return json({ error: "Describe qué hay que diseñar." }, 400);
    if (!r.requester) return json({ error: "Indica quién lo pide." }, 400);
    if (!r.company) return json({ error: "Indica para qué empresa o espacio es." }, 400);
    if (!r.deadline) return json({ error: "Sin fecha límite no entra: pon para cuándo hace falta." }, 400);
    if (r.urgent) {
      const st = await getSettings(), open = (await listDiseno()).filter((x) => x.urgent && OPEN.includes(x.status));
      if (open.length >= st.urgentQuota && !body.forceUrgent) return json({ error: `Ya hay ${open.length} urgentes abiertas (el cupo es ${st.urgentQuota}). Quita alguna urgencia o confirma que esta lo es más.`, quota: true }, 409);
    }
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const row = { id, status: "pendiente", progress: 0, requestDate: today, ...r, statusChangedAt: now, reopenCount: 0, createdAt: now, updatedAt: now, createdBy: actor.email, updatedBy: actor.email, deletedAt: null };
    if (row.status === "entregado" && !row.deliveredAt) row.deliveredAt = today;
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "create", after: row }).catch(() => null);
    // Si falta información, se avisa por correo a quien la pide (no cuando la apunta diseño en su nombre)
    const missing = missingInfo(row, today), byDesigner = actor.roles.includes("diseno") && !actor.roles.some((x: string) => x === "admin" || x === "gestion");
    let mail: any = null;
    if (missing.length && !byDesigner && (row.channel || "app") === "app") mail = await mailMissing(row, missing, actor).catch(() => null);
    return json({ row: withPreview(row), missing, missingMail: mail }, 201);
  }

  const id = url.searchParams.get("id") || ""; if (!/^[\w-]{8,60}$/.test(id)) return json({ error: "Falta la petición" }, 400);
  const before = await getDiseno(id); if (!before) return json({ error: "No encontrada" }, 404);

  if (req.method === "PUT" && url.searchParams.get("undo")) {
    const hist = Array.isArray(before.history) ? before.history : [];
    const last = [...hist].reverse().find((h: any) => !h.undo && !h.undone && h.changes?.length);
    if (!last) return json({ error: "No hay cambios que deshacer." }, 400);
    const back: Record<string, any> = {}; for (const c of last.changes) back[c.f] = c.from ?? "";
    const row = applyUpdate(before, back, actor, today, "Deshace el cambio de " + last.at.slice(0, 16).replace("T", " "), true);
    last.undone = true;
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "update", before, after: row, note: "Deshacer" }).catch(() => null);
    return json({ row: withPreview(row) });
  }
  if (req.method === "PUT") {
    const r = clean(body.row || {});
    if (r.deadline === "" && before.deadline) return json({ error: "La fecha límite no se puede dejar vacía." }, 400);
    const row = applyUpdate(before, r, actor, today, String(body.reason || ""));
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "update", before, after: row }).catch(() => null);
    return json({ row: withPreview(row) });
  }
  if (req.method === "PATCH") {
    const row = { ...before, deletedAt: null, updatedAt: new Date().toISOString(), updatedBy: actor.email };
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "update", before, after: row, note: "Recuperada" }).catch(() => null);
    return json({ row: withPreview(row) });
  }
  if (req.method === "DELETE") {
    const row = { ...before, deletedAt: new Date().toISOString(), updatedBy: actor.email };
    await putDiseno(id, row);
    await appendAudit({ actor, module: "diseno", elementId: id, action: "archive", before, after: row }).catch(() => null);
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config: Config = { path: "/api/diseno" };
