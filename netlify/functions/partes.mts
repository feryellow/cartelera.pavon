import type { Config } from "@netlify/functions";
import { resolveActor } from "./_lib/auth.ts";
import { assetStore } from "./_lib/store.ts";
import { appendAudit } from "./_lib/audit.ts";
import { notifyEmail } from "./_lib/notify.ts";
import { sendPush } from "./_lib/push.ts";
import { madridToday } from "./_lib/dates.ts";
import { PROVIDERS, providerById, providerUsers, type Provider } from "./_lib/providers.ts";
import { getParte, putParte, listPartes, parteType, parteFileKey, parteUrl, parteSigOk, expectedMonths, type Parte } from "./_lib/partes.ts";

// /api/partes — partes de emisión de las emisoras de radio
//   GET                      → el proveedor ve sus partes y los meses que le faltan (admin/gestión: ?p=<id> para verlo como él, o sin p: todos)
//   GET ?file=<id>&s=<firma> → descarga el archivo (enlace firmado, como los audios)
//   POST ?month=&name=&note= (cuerpo = archivo) → sube un parte: correo a Fer y Celia + aviso al móvil
//   DELETE ?id=              → lo quita (el proveedor, solo los suyos)
const TEAM = ["fernando@yellowmedia.es", "celia@yellowmedia.es"];
const MAX = 6 * 1024 * 1024;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mlabel = (m: string) => { const [y, mo] = m.split("-").map(Number); return `${MESES[mo - 1]} de ${y}`; };
const monthAdd = (m: string, k: number) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + k, 1)).toISOString().slice(0, 7); };
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const json = (d: unknown, status = 200) => Response.json(d, { status, headers: { "cache-control": "no-store" } });

const view = (x: Parte, origin: string) => ({ id: x.id, provider: x.provider, providerName: x.providerName, month: x.month, monthLabel: mlabel(x.month), note: x.note, fileName: x.fileName, contentType: x.contentType, size: x.size, createdAt: x.createdAt, createdBy: x.createdBy, url: parteUrl(origin, x.id) });

export default async (req: Request) => {
  const url = new URL(req.url), origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, "");

  // Descarga con enlace firmado: no necesita sesión (igual que los audios del resumen)
  if (req.method === "GET" && url.searchParams.get("file")) {
    const id = String(url.searchParams.get("file"));
    if (!/^[\w-]{8,60}$/.test(id) || !parteSigOk(id, url.searchParams.get("s"))) return new Response("Enlace no válido", { status: 403 });
    const x = await getParte(id); if (!x || x.deletedAt) return new Response("Ese parte ya no está", { status: 404 });
    const data = await assetStore().get(`file_${parteFileKey(id)}`, { type: "arrayBuffer" });
    if (data === null) return new Response("No se encuentra el archivo", { status: 404 });
    const inline = /^(application\/pdf|image\/)/.test(x.contentType);
    return new Response(data, { headers: { "content-type": x.contentType || "application/octet-stream", "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(x.fileName)}`, "cache-control": "private, no-store" } });
  }

  const actor = await resolveActor(req);
  if (!actor) return json({ error: "Inicia sesión" }, 401);
  const team = actor.roles.some((r) => r === "admin" || r === "gestion");
  const isProv = actor.roles.includes("proveedor") && !team;
  let p: Provider | null = null;
  if (isProv) p = providerById((await providerUsers())[actor.email.toLowerCase()] || "");
  else if (team) p = providerById(url.searchParams.get("p") || "");
  if (!team && !isProv) return json({ error: "Tu usuario no tiene acceso a los partes de emisión." }, 403);
  const today = madridToday();

  if (req.method === "GET") {
    if (team && !p) {
      // Todos los partes, con los contratos de cada emisora para que Radio los muestre en su acuerdo
      const radio = PROVIDERS.filter((x) => x.kind === "radio");
      const pending: Record<string, string[]> = {};
      const all = await listPartes();
      for (const r of radio) { const got = new Set(all.filter((x) => x.provider === r.id).map((x) => x.month)); pending[r.id] = (await expectedMonths(r, today)).filter((m) => !got.has(m)); }
      return json({ partes: all.map((x) => view(x, origin)), providers: radio.map(({ id, name, contracts }) => ({ id, name, contracts })), pending, today });
    }
    if (!p) return json({ error: "Tu cuenta todavía no tiene un proveedor asignado. Escribe a fernando@yellowmedia.es." }, 403);
    if (p.kind !== "radio") return json({ partes: [], pending: [], months: [] });
    const mine = await listPartes(p.id), got = new Set(mine.map((x) => x.month));
    const cur = today.slice(0, 7), months = [0, -1, -2, -3, -4, -5, -6].map((k) => monthAdd(cur, k));
    return json({ partes: mine.map((x) => view(x, origin)), pending: (await expectedMonths(p, today)).filter((m) => !got.has(m)), months: months.map((m) => ({ key: m, label: mlabel(m) })) });
  }

  if (req.method === "POST") {
    if (!p) return json({ error: "Sin proveedor asignado" }, 403);
    if (p.kind !== "radio") return json({ error: "Los partes de emisión son solo para las emisoras de radio." }, 400);
    const month = String(url.searchParams.get("month") || ""), cur = today.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month) || month > cur || month < monthAdd(cur, -12)) return json({ error: "Elige el mes del parte." }, 400);
    const name = String(url.searchParams.get("name") || "parte").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "parte";
    const type = parteType(name) || (/^(application\/pdf|image\/)/.test(req.headers.get("content-type") || "") ? String(req.headers.get("content-type")) : "");
    if (!type) return json({ error: "Sube el parte en PDF, Excel (xlsx, xls o csv) o como imagen." }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: "El archivo está vacío." }, 400);
    if (buf.byteLength > MAX) return json({ error: `El archivo pesa ${(buf.byteLength / 1048576).toFixed(1)} MB. El máximo es 6 MB.` }, 413);
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await assetStore().set(`file_${parteFileKey(id)}`, buf);
    await assetStore().setJSON(`meta_${parteFileKey(id)}`, { contentType: type, size: buf.byteLength, updatedAt: now, updatedBy: actor.email });
    const x: Parte = { id, provider: p.id, providerName: p.name, month, note: String(url.searchParams.get("note") || "").trim().slice(0, 500), fileName: name, contentType: type, size: buf.byteLength, createdAt: now, createdBy: actor.email, deletedAt: null };
    await putParte(x);
    await appendAudit({ actor, module: "radio", elementId: `parte-${id}`, action: "create", after: x, note: `Parte de emisión de ${mlabel(month)} · ${p.name}` }).catch(() => null);
    const from = isProv ? actor.email : `${actor.email} (en nombre de ${p.name})`, link = parteUrl(origin, id);
    const html = `<!doctype html><html><body style="margin:0;background:#f2efe6;font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:600px;margin:0 auto;background:#fff;padding:26px">
<p style="font-size:12px;letter-spacing:.08em;color:#6b665d;margin:0">PARTE DE EMISIÓN</p>
<h1 style="font-size:22px;margin:4px 0 14px">${esc(p.name)} · ${esc(mlabel(month))}</h1>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
<tr><td style="padding:6px 0;color:#6b665d;width:120px">Archivo</td><td style="padding:6px 0"><a href="${link}" style="color:#111;font-weight:bold">${esc(name)}</a> · ${(buf.byteLength / 1048576).toFixed(1)} MB</td></tr>
<tr><td style="padding:6px 0;color:#6b665d">Sube</td><td style="padding:6px 0">${esc(from)}</td></tr></table>
${x.note ? `<div style="border-left:3px solid #FFD400;padding:6px 0 6px 12px;white-space:pre-line;font-size:15px">${esc(x.note)}</div>` : ""}
<p style="font-size:12px;color:#6b665d;margin:20px 0 0"><a href="${origin}/#radio" style="color:#111">Ver en Yellow Control › Radio</a></p></div></body></html>`;
    const r: any = await notifyEmail({ kind: "proveedor", subject: `Parte de emisión · ${p.name} · ${mlabel(month)}`, html, to: TEAM, extra: TEAM.slice(1), replyTo: isProv ? actor.email : undefined });
    await sendPush("all", { title: `${p.name} ha subido el parte de ${MESES[Number(month.slice(5)) - 1]}`, body: name, url: "/#radio", tag: "parte" }, "proveedores").catch(() => null);
    return json({ parte: view(x, origin), sent: !!r.sent }, 201);
  }

  if (req.method === "DELETE") {
    const id = String(url.searchParams.get("id") || "");
    const x = /^[\w-]{8,60}$/.test(id) ? await getParte(id) : null;
    if (!x || x.deletedAt) return json({ error: "Ese parte ya no está" }, 404);
    if (!team && x.provider !== p?.id) return json({ error: "Ese parte no es de tu cuenta" }, 403);
    const after = { ...x, deletedAt: new Date().toISOString(), deletedBy: actor.email };
    await putParte(after);
    await appendAudit({ actor, module: "radio", elementId: `parte-${id}`, action: "archive", before: x, after, note: `Parte de emisión quitado · ${x.providerName} · ${mlabel(x.month)}` }).catch(() => null);
    return json({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/partes" };
