import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { putRecord, getRecord, type RecordModule } from "./_lib/records.ts";
import { sendPavonMail } from "./_lib/mailer.ts";
import { madridToday } from "./_lib/dates.ts";
import { PROVIDERS, providerById, providerUsers, providerItems, saveRequest, listRequests, type Provider } from "./_lib/providers.ts";

// Portal de proveedores.
// GET            → el proveedor ve sus piezas (o un admin/gestión con ?p=<id> ve lo mismo que vería el proveedor)
// GET ?solicitudes=1 → (admin/gestión) solicitudes de material abiertas, con los días que quedan
// POST {module,itemId,message} → el proveedor pide material: correo a Fer y Celia + aviso en el Calendario
const TEAM = ["fernando@yellowmedia.es", "celia@yellowmedia.es"];
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fmt = (s?: string) => s ? new Date(s + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "sin fecha";
const daysTo = (s: string | undefined, today: string) => s ? Math.round((new Date(s + "T12:00:00Z").getTime() - new Date(today + "T12:00:00Z").getTime()) / 864e5) : null;

export default async (req: Request) => {
  const url = new URL(req.url), origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const team = actor.roles.some((r) => r === "admin" || r === "gestion");
  const isProv = actor.roles.includes("proveedor") && !team;
  let p: Provider | null = null;
  if (isProv) p = providerById((await providerUsers())[actor.email.toLowerCase()] || "");
  else if (team) p = providerById(url.searchParams.get("p") || "");
  const today = madridToday();

  if (req.method === "GET") {
    if (team && url.searchParams.get("solicitudes") === "1") {
      const out = [];
      for (const r of await listRequests()) {
        if (r.module === "general") { if (daysTo(r.createdAt.slice(0, 10), today)! < -7) continue; out.push({ ...r, days: null }); continue; }
        const rec: any = await getRecord(r.module as RecordModule, r.itemId).catch(() => null);
        if (!rec || rec.deletedAt || rec.assetKey) continue; // resuelta: ya hay material, o la pieza se quitó
        out.push({ ...r, days: daysTo(r.deadline, today) });
      }
      return Response.json({ requests: out }, { headers: { "cache-control": "no-store" } });
    }
    if (team && !p) return Response.json({ providers: PROVIDERS.map(({ id, name, kind }) => ({ id, name, kind })) });
    if (!p) return Response.json({ error: "Tu cuenta todavía no tiene un proveedor asignado. Escribe a fernando@yellowmedia.es." }, { status: 403 });
    const { months, items } = await providerItems(p, origin, today);
    const mine = (await listRequests()).filter((r) => r.provider === p!.id).map(({ itemId, createdAt }) => ({ itemId, createdAt }));
    return Response.json({ provider: { id: p.id, name: p.name, kind: p.kind }, today, months, items, requests: mine, preview: !isProv }, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "POST") {
    if (!p) return Response.json({ error: "Sin proveedor asignado" }, { status: 403 });
    let body: any = {}; try { body = await req.json(); } catch {}
    const message = String(body?.message || "").trim().slice(0, 3000);
    if (!message) return Response.json({ error: "Escribe el mensaje" }, { status: 400 });
    const { items } = await providerItems(p, origin, today);
    // Mensaje general (sin pieza) o petición de una pieza concreta
    const general = !body?.itemId;
    const it = general ? { id: "", module: "general", month: today.slice(0, 7), title: "Mensaje general", detail: "Sin pieza concreta", ready: false } as any
      : items.find((x) => x.id === String(body?.itemId || "") && x.module === String(body?.module || ""));
    if (!it) return Response.json({ error: "Esa pieza no es de tu cuenta" }, { status: 404 });
    const from = isProv ? actor.email : `${actor.email} (prueba como ${p.name})`;
    const left = daysTo(it.deadline, today);
    const plazo = it.deadline ? `${fmt(it.deadline)}${left !== null ? ` · ${left < 0 ? `vencido hace ${-left} días` : left === 0 ? "es hoy" : `quedan ${left} días`}` : ""}` : "sin fecha límite apuntada";
    const html = `<!doctype html><html><body style="margin:0;background:#f2efe6;font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:600px;margin:0 auto;background:#fff;padding:26px">
<p style="font-size:12px;letter-spacing:.08em;color:#6b665d;margin:0">MENSAJE DE PROVEEDOR</p>
<h1 style="font-size:22px;margin:4px 0 14px">${esc(p.name)} ${general ? "os escribe" : "pide material"}</h1>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
<tr><td style="padding:6px 0;color:#6b665d;width:120px">Pieza</td><td style="padding:6px 0"><b>${esc(it.title)}</b><br>${esc(it.detail)}</td></tr>
<tr><td style="padding:6px 0;color:#6b665d">Fechas</td><td style="padding:6px 0">${esc(it.startDate ? `${fmt(it.startDate)} – ${fmt(it.endDate)}` : it.month)}</td></tr>
<tr><td style="padding:6px 0;color:#6b665d">Plazo</td><td style="padding:6px 0;${left !== null && left <= 1 ? "color:#c0392b;font-weight:bold" : ""}">${esc(plazo)}</td></tr>
<tr><td style="padding:6px 0;color:#6b665d">Escribe</td><td style="padding:6px 0">${esc(from)}</td></tr></table>
<div style="border-left:3px solid #FFD400;padding:6px 0 6px 12px;white-space:pre-line;font-size:15px">${esc(message)}</div>
<p style="font-size:12px;color:#6b665d;margin:20px 0 0">Responde a este correo para contestar a ${esc(p.name)} · <a href="${origin}/#calendario" style="color:#111">ver en Yellow Control</a></p></div></body></html>`;
    const r: any = await sendPavonMail({ subject: `Mensaje de proveedor · ${p.name}${general ? "" : " · " + it.title}`, html, to: TEAM, extra: TEAM.slice(1), replyTo: isProv ? actor.email : undefined });
    if (!r.sent) console.error("proveedor mail", r.reason);
    // Aviso en el Calendario el día límite (o hoy, si no hay fecha)
    const id = crypto.randomUUID(), now = new Date().toISOString(), hitoId = crypto.randomUUID();
    await putRecord("hitos", hitoId, { id: hitoId, type: "Solicitud de proveedor", title: general ? `Mensaje de ${p.name}` : `${p.name} pide material · ${it.title}`, spectacle: general ? "" : it.title, date: it.deadline || today,
      notes: `${message}\n\n— ${from}`, status: "pendiente", createdAt: now, updatedAt: now, createdBy: actor.email, updatedBy: actor.email, deletedAt: null });
    await saveRequest({ id, provider: p.id, providerName: p.name, email: actor.email, module: it.module, itemId: it.id, itemTitle: it.title, itemDetail: it.detail, deadline: it.deadline, message, createdAt: now, hitoId });
    await appendAudit({ actor, module: "avisos", elementId: `provreq-${id}`, action: r.sent ? "email_sent" : "email_pending", note: `Solicitud de ${p.name}: ${it.title}` });
    return Response.json({ ok: true, sent: !!r.sent, reason: r.sent ? "" : r.reason || "" });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/proveedor" };
