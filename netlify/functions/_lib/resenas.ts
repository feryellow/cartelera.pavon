import { controlStore } from "./store.ts";
import { envVar, sendPavonMail } from "./mailer.ts";

// INFORME SEMANAL DE RESEÑAS GOOGLE · GRAN TEATRO PAVÓN (portado del Apps Script «resenas-google-pavon»)
// Lunes 10:30 (Madrid): reseñas de lunes a domingo de la semana anterior en las fichas configuradas.
// Se envía desde la app (Resend, avisos@yellowmedia.es). Para leer Google hace falta:
//  1) que Google apruebe el acceso a la API de Google Business Profile, y
//  2) conectar la cuenta que gestiona las fichas desde Usuarios › Reseñas Google (OAuth).
export const RESENAS = {
  perfiles: [
    { nombre: "Gran Teatro Pavón", coincide: "gran teatro pavon", excluye: "ambigu", location: "" },
    { nombre: "Ambigú del Gran Teatro Pavón", coincide: "ambigu", excluye: "", location: "" },
  ],
  destinatarios: ["jefedesalagranteatropavon@gmail.com", "gerencia@granteatropavon.com", "taquilla@granteatropavon.com", "fernando@granteatropavon.com"],
  correoPrueba: "fernando@granteatropavon.com",
  correoErrores: "fernando@granteatropavon.com",
  responderA: "fernando@granteatropavon.com",
  zona: "Europe/Madrid",
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ESTRELLAS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const YW = { amarillo: "#f4c300", grisRibbon: "#2b2b2b", fondo: "#e8e8e8", avisoFondo: "#fff7d6", avisoTexto: "#8a6d00" };

export type Resena = { perfil: string; usuario: string; fecha: string; ts: number; estrellas: number; texto: string; respuesta: string; fechaRespuesta: string };
type Perfil = { nombre: string; resenas: Resena[]; media?: number | null; pendientes?: number };

/* ---------- Fechas en Madrid ---------- */
function partes(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: RESENAS.zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) + 1;
  return { y: +p.year, m: +p.month - 1, d: +p.day, H: +p.hour % 24, M: +p.minute, wd };
}
function desfaseMin(d: Date) { const p = partes(d); return Math.round((Date.UTC(p.y, p.m, p.d, p.H, p.M) - Math.floor(d.getTime() / 60000) * 60000) / 60000); }
function medianocheMadrid(y: number, m: number, d: number) { let b = new Date(Date.UTC(y, m, d)); for (let i = 0; i < 2; i++) b = new Date(Date.UTC(y, m, d) - desfaseMin(b) * 60000); return b; }
const two = (n: number) => String(n).padStart(2, "0");
function fmt(d: Date, conHora = false) { const p = partes(d); return `${two(p.d)}/${two(p.m + 1)}/${p.y}` + (conHora ? ` · ${two(p.H)}:${two(p.M)}` : ""); }
function corto(d: Date) { const p = partes(d); return `${two(p.d)}/${two(p.m + 1)}`; }

export function semanaAnterior(ahora = new Date()) {
  const p = partes(ahora), desde = medianocheMadrid(p.y, p.m, p.d - (p.wd - 1) - 7), hasta = medianocheMadrid(p.y, p.m, p.d - (p.wd - 1));
  const domingo = new Date(hasta.getTime() - 1000);
  return {
    desde, hasta, cortoDesde: corto(desde), cortoHasta: corto(domingo), clave: fmt(desde).split("/").reverse().join("-"),
    texto: `Del lunes ${fmt(desde)} a las 00:00 al domingo ${fmt(domingo)} a las 23:59 (hora de Madrid). Cuenta las reseñas publicadas en ese intervalo; el estado de respuesta es el que tienen en el momento del envío.`,
  };
}

/* ---------- Datos y plantilla ---------- */
export function componer(perfiles: Perfil[], periodo: ReturnType<typeof semanaAnterior>) {
  const todas = perfiles.flatMap((p) => p.resenas), dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let suma = 0, pendientes = 0;
  for (const r of todas) { dist[r.estrellas] = (dist[r.estrellas] || 0) + 1; suma += r.estrellas; if (!r.respuesta) pendientes++; }
  for (const p of perfiles) { let s = 0, pend = 0; for (const r of p.resenas) { s += r.estrellas; if (!r.respuesta) pend++; } p.media = p.resenas.length ? s / p.resenas.length : null; p.pendientes = pend; }
  const total = todas.length;
  const titulo = !total ? "Sin reseñas nuevas esta semana" : `${total}${total === 1 ? " reseña nueva" : " reseñas nuevas"}${pendientes ? `, ${pendientes} sin responder` : ", todas respondidas"}`;
  return { rangoCorto: `${periodo.cortoDesde} – ${periodo.cortoHasta}`, rangoLargoMayus: `SEMANA DEL ${periodo.cortoDesde} AL ${periodo.cortoHasta}`, titulo, periodoTexto: periodo.texto, total, media: total ? suma / total : null, dist, pendientes, perfiles, fechaGeneracion: fmt(new Date(), true).replace(" · ", " ") };
}
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");
const estrellas = (n: number) => [1, 2, 3, 4, 5].map((i) => `<span style="color:${i <= n ? YW.amarillo : "#d6d6d6"};">&#9733;</span>`).join("");
const pildora = (t: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;"><tr><td style="background:${YW.amarillo}; padding:3px 10px; border-radius:999px;"><span style="font-size:10px; font-weight:bold; letter-spacing:0.03em; color:#412402; white-space:nowrap;">${esc(t)}</span></td></tr></table>`;
const seccion = (t: string) => `<tr><td class="yw-pad" style="padding:28px 32px 0;"><div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#111111;">${esc(t)}</div><div style="height:2px; background:${YW.amarillo}; margin-top:6px;"></div></td></tr>`;
function bloque(r: Resena, primera: boolean) {
  const atencion = r.estrellas <= 3, pendiente = !r.respuesta, fondo = atencion ? YW.avisoFondo : "#ffffff", borde = atencion ? `border-left:4px solid ${YW.amarillo};` : "", pad = atencion ? "14px 16px" : "0";
  let etiquetas = ""; if (atencion) etiquetas += pildora(`${r.estrellas}${r.estrellas === 1 ? " ESTRELLA" : " ESTRELLAS"} · ATENCIÓN`) + "&nbsp;"; if (pendiente) etiquetas += pildora("PENDIENTE DE RESPUESTA");
  const texto = r.texto ? `<div style="font-size:13px; color:#333333; margin-top:8px; line-height:1.55;">${esc(r.texto)}</div>` : `<div style="font-size:12px; color:#888888; margin-top:8px; font-style:italic;">Valoración sin texto.</div>`;
  const resp = r.respuesta ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; background:#f3f3f1;"><tr><td style="padding:10px 14px;"><div style="font-size:10px; font-weight:bold; letter-spacing:0.04em; color:#555555;">RESPUESTA DEL NEGOCIO${r.fechaRespuesta ? " · " + esc(r.fechaRespuesta) : ""}</div><div style="font-size:12px; color:#444444; margin-top:4px; line-height:1.5;">${esc(r.respuesta)}</div></td></tr></table>` : "";
  return `<tr><td class="yw-pad" style="padding:${primera ? "16px" : "14px"} 32px 0;">${primera ? "" : '<div style="height:1px; background:#eeeeee; margin-bottom:14px;"></div>'}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${fondo};${borde}"><tr><td style="padding:${pad};"><div style="font-size:10px; font-weight:bold; letter-spacing:0.03em; color:#777777;">${esc(r.fecha)} · ${esc(r.perfil)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;"><tr><td valign="middle" style="font-size:15px; font-weight:800; color:#111111;">${esc(r.usuario)}</td><td valign="middle" align="right" style="font-size:16px; white-space:nowrap;">${estrellas(r.estrellas)}</td></tr></table>${etiquetas ? `<div style="margin-top:8px;">${etiquetas}</div>` : ""}${texto}${resp}</td></tr></table></td></tr>`;
}
export function htmlInforme(d: ReturnType<typeof componer>, origin: string) {
  const L = { header: `${origin}/assets/email/somos-yellow-logo.png`, footer: `${origin}/assets/email/somos-yellow-logo-footer.png`, rayo: `${origin}/assets/email/rayo.png` };
  const media = d.media == null ? "—" : d.media.toFixed(1).replace(".", ",") + "/5", w = '<b style="color:#ffffff;">';
  const lineas = [`Nuevas reseñas: ${w}${d.total}</b>`, `Valoración media: ${w}${media}</b>`, `5 estrellas: ${w}${d.dist[5]}</b>`, `4 estrellas: ${w}${d.dist[4]}</b>`, `3 estrellas: ${w}${d.dist[3]}</b>`, `2 estrellas: ${w}${d.dist[2]}</b>`, `1 estrella: ${w}${d.dist[1]}</b>`, `Pendientes de respuesta: <b style="color:${d.pendientes > 0 ? YW.amarillo : "#ffffff"};">${d.pendientes}</b>`];
  let h = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Reseñas Google</title><style>.yw-container{width:520px;max-width:520px;}@media only screen and (max-width:560px){.yw-container{width:100%!important;max-width:100%!important;}.yw-stack{display:block!important;width:100%!important;text-align:left!important;}.yw-stack-right{display:block!important;width:100%!important;text-align:left!important;padding-top:12px!important;}.yw-pad{padding-left:20px!important;padding-right:20px!important;}}</style></head><body style="margin:0; padding:0; background:${YW.fondo}; font-family: Arial, Helvetica, sans-serif;">`;
  h += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${YW.fondo}; padding:32px 0;"><tr><td align="center"><table role="presentation" width="520" class="yw-container" cellpadding="0" cellspacing="0" style="background:#ffffff;">`;
  h += `<tr><td class="yw-pad" style="padding:24px 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td valign="middle" align="left" class="yw-stack"><img src="${L.header}" width="140" height="35" alt="Somos Yellow" style="display:block; border:0; width:140px; height:35px;"></td><td valign="middle" align="right" class="yw-stack-right"><table role="presentation" cellpadding="0" cellspacing="0" style="background:${YW.grisRibbon};"><tr><td style="padding:8px 6px 8px 10px;" valign="middle"><img src="${L.rayo}" width="16" height="22" alt="" style="display:block; border:0;"></td><td style="padding:8px 12px 8px 4px; text-align:center;" valign="middle"><div style="font-size:10px; font-weight:bold; letter-spacing:0.06em; color:#ffffff; white-space:nowrap; text-align:center;">SEGUIMIENTO</div><table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:4px auto 0;"><tr><td style="background:${YW.amarillo}; padding:2px 10px; text-align:center;"><span style="font-size:10px; font-weight:bold; color:#2b2b2b; white-space:nowrap;">${esc(d.rangoCorto)}</span></td></tr></table></td></tr></table></td></tr></table></td></tr>`;
  h += `<tr><td class="yw-pad" style="padding:0 32px;"><div style="height:3px; background:${YW.amarillo};"></div></td></tr>`;
  h += `<tr><td class="yw-pad" style="padding:20px 32px 0;"><div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#555555;">RESEÑAS GOOGLE · ${esc(d.rangoLargoMayus)}</div><div style="font-size:22px; font-weight:800; color:#111111; margin-top:6px; line-height:1.25;">${esc(d.titulo)}</div></td></tr>`;
  h += `<tr><td class="yw-pad" style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;"><tr><td style="padding:20px 20px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="top" style="padding-right:12px;"><span style="color:${YW.amarillo}; font-size:20px;">&#10022;</span></td><td><div style="font-size:16px; font-weight:800; color:#ffffff;">Lectura rápida.</div><div style="font-size:13px; color:#cccccc; margin-top:6px; line-height:1.75;">${lineas.join("<br>")}</div></td></tr></table></td></tr></table></td></tr>`;
  h += `<tr><td class="yw-pad" style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;"><tr><td style="padding:12px 16px;"><div style="font-size:10px; font-weight:bold; letter-spacing:0.04em; color:#555555;">PERIODO ANALIZADO · ${esc(d.rangoCorto)}</div><div style="font-size:13px; color:#333333; margin-top:4px; line-height:1.5;">${esc(d.periodoTexto)}</div></td></tr></table></td></tr>`;
  if (d.total === 0) {
    h += seccion("DETALLE") + `<tr><td class="yw-pad" style="padding:16px 32px 0;"><div style="font-size:15px; font-weight:800; color:#111111;">No se han recibido nuevas reseñas durante el periodo.</div><div style="font-size:13px; color:#444444; margin-top:4px;">Perfiles revisados: ${esc(d.perfiles.map((p) => p.nombre).join(", "))}.</div></td></tr>`;
  } else {
    h += seccion("POR PERFIL");
    d.perfiles.forEach((p, i) => {
      const pm = p.media == null ? "—" : p.media.toFixed(1).replace(".", ",") + "/5";
      h += `<tr><td class="yw-pad" style="padding:${i === 0 ? "14px" : "0"} 32px 0;">${i === 0 ? "" : '<div style="height:1px; background:#eeeeee;"></div>'}<div style="font-size:13px; color:#111111; padding:${i === 0 ? "0 0 12px" : "12px 0"};"><b>${esc(p.nombre)}</b> · ${p.resenas.length}${p.resenas.length === 1 ? " reseña" : " reseñas"} · media ${pm}${p.pendientes ? ` · <b style="color:${YW.avisoTexto};">${p.pendientes} sin responder</b>` : ""}</div></td></tr>`;
    });
    for (const p of d.perfiles) {
      h += seccion(`${p.nombre.toUpperCase()} · ${p.resenas.length}${p.resenas.length === 1 ? " RESEÑA" : " RESEÑAS"}`);
      if (!p.resenas.length) h += `<tr><td class="yw-pad" style="padding:14px 32px 0;"><div style="font-size:13px; color:#666666;">Sin reseñas nuevas en este perfil.</div></td></tr>`;
      p.resenas.forEach((r, i) => { h += bloque(r, i === 0); });
    }
  }
  h += `<tr><td class="yw-pad" style="padding:32px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;"><tr><td class="yw-pad" style="padding:24px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle"><img src="${L.footer}" width="120" height="30" alt="Somos Yellow" style="display:block; border:0; width:120px; height:30px; margin:0 auto;"><div style="font-size:14px; font-weight:800; color:${YW.amarillo}; margin-top:12px;">Lo hacemos y ya vemos.</div><div style="font-size:11px; color:#999999; margin-top:2px;">Informe automático de reseñas de Google · generado el ${esc(d.fechaGeneracion)}</div></td></tr></table></td></tr></table></td></tr>`;
  return h + `</table></td></tr></table></body></html>`;
}

/* ---------- Datos de ejemplo (prueba de diseño, sin Google) ---------- */
export function datosEjemplo() {
  const periodo = semanaAnterior(), base = periodo.desde.getTime(), H = 3600000;
  const ej = (perfil: string, usuario: string, horas: number, n: number, texto: string, respuesta = ""): Resena => { const t = new Date(base + horas * H); return { perfil, usuario, ts: t.getTime(), estrellas: n, texto, fecha: fmt(t, true), respuesta, fechaRespuesta: respuesta ? fmt(new Date(t.getTime() + 20 * H)) : "" }; };
  const gtp = "Gran Teatro Pavón", amb = "Ambigú del Gran Teatro Pavón";
  const perfiles: Perfil[] = [
    { nombre: gtp, resenas: [ej(gtp, "Usuario de ejemplo 1", 154, 2, "EJEMPLO. Reseña ficticia de valoración baja sin respuesta, para comprobar el resaltado."), ej(gtp, "Usuario anónimo", 9, 4, ""), ej(gtp, "Usuario de ejemplo 2", 108, 5, "EJEMPLO. Reseña ficticia positiva con respuesta del negocio.", "EJEMPLO. Respuesta ficticia del negocio.")] },
    { nombre: amb, resenas: [ej(amb, "Usuario de ejemplo 3", 92, 3, "EJEMPLO. Reseña ficticia intermedia, pendiente de respuesta.")] },
  ];
  const datos = componer(perfiles, periodo); datos.titulo = "PRUEBA DE DISEÑO · " + datos.titulo;
  return { datos, asunto: `[PRUEBA DE DISEÑO · DATOS FICTICIOS] Reseñas Google · Semana del ${periodo.cortoDesde} al ${periodo.cortoHasta}` };
}

/* ---------- Google (OAuth + Business Profile API) ---------- */
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const googleClient = () => ({ id: envVar("GOOGLE_CLIENT_ID"), secret: envVar("GOOGLE_CLIENT_SECRET") });
export async function googleConexion() { return (await controlStore().get("google_oauth", { type: "json" }) as { refresh_token?: string; email?: string; at?: string } | null) || null; }
async function accessToken() {
  const c = googleClient(), g = await googleConexion();
  if (!c.id || !c.secret) throw new Error("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Netlify.");
  if (!g?.refresh_token) throw new Error("La cuenta de Google que gestiona las fichas no está conectada (Usuarios › Reseñas Google › Conectar Google).");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: g.refresh_token, grant_type: "refresh_token" }) });
  const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error(`Google no ha dado acceso (${r.status}): ${String(j.error_description || j.error || "").slice(0, 200)}`);
  return j.access_token as string;
}
async function api(url: string, token: string) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const t = await r.text(); if (r.status !== 200) throw new Error(`API ${r.status} en ${url.split("?")[0]}: ${t.slice(0, 300)}`);
  return JSON.parse(t || "{}");
}
export async function ubicaciones(token?: string) {
  token = token || await accessToken();
  const cuentas: any[] = []; let pt = "";
  do { const r = await api(`https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20${pt ? "&pageToken=" + pt : ""}`, token); cuentas.push(...(r.accounts || [])); pt = r.nextPageToken || ""; } while (pt);
  const out: { title: string; location: string }[] = [];
  for (const c of cuentas) { let t = ""; do { const r = await api(`https://mybusinessbusinessinformation.googleapis.com/v1/${c.name}/locations?readMask=name,title&pageSize=100${t ? "&pageToken=" + t : ""}`, token); for (const l of r.locations || []) out.push({ title: l.title, location: `${c.name}/${l.name}` }); t = r.nextPageToken || ""; } while (t); }
  return out;
}
const sinAcentos = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function resolver(p: (typeof RESENAS.perfiles)[number], ubs: { title: string; location: string }[]) {
  if (p.location) return p.location;
  const cand = ubs.filter((u) => { const t = sinAcentos(u.title); return t.includes(sinAcentos(p.coincide)) && (!p.excluye || !t.includes(sinAcentos(p.excluye))); });
  if (cand.length !== 1) throw new Error(`El perfil «${p.nombre}» coincide con ${cand.length} fichas (${cand.map((c) => c.title).join(" | ")}).`);
  return cand[0].location;
}
async function resenasDelPeriodo(location: string, periodo: ReturnType<typeof semanaAnterior>, token: string) {
  const out: any[] = []; let pt = "", seguir = true;
  while (seguir) {
    const r = await api(`https://mybusiness.googleapis.com/v4/${location}/reviews?pageSize=50&orderBy=updateTime%20desc${pt ? "&pageToken=" + pt : ""}`, token);
    for (const rv of r.reviews || []) { const c = new Date(rv.createTime).getTime(); if (c >= periodo.desde.getTime() && c < periodo.hasta.getTime()) out.push(rv); if (new Date(rv.updateTime).getTime() < periodo.desde.getTime()) seguir = false; }
    pt = r.nextPageToken || ""; if (!pt) seguir = false;
  }
  return out;
}
export async function informeReal() {
  const periodo = semanaAnterior(), token = await accessToken(), ubs = await ubicaciones(token);
  const perfiles: Perfil[] = [];
  for (const p of RESENAS.perfiles) {
    const loc = resolver(p, ubs);
    const rs: Resena[] = (await resenasDelPeriodo(loc, periodo, token)).map((r: any) => { const c = new Date(r.createTime), rep = r.reviewReply || null; return { perfil: p.nombre, usuario: r.reviewer && !r.reviewer.isAnonymous && r.reviewer.displayName ? r.reviewer.displayName : "Usuario anónimo", fecha: fmt(c, true), ts: c.getTime(), estrellas: ESTRELLAS[r.starRating] || 0, texto: r.comment || "", respuesta: rep?.comment || "", fechaRespuesta: rep?.updateTime ? fmt(new Date(rep.updateTime)) : "" }; });
    const prio = (r: Resena) => (r.estrellas <= 3 ? 0 : !r.respuesta ? 1 : 2);
    rs.sort((a, b) => prio(a) - prio(b) || a.ts - b.ts);
    perfiles.push({ nombre: p.nombre, resenas: rs });
  }
  const datos = componer(perfiles, periodo);
  const asunto = `Reseñas Google · Semana del ${periodo.cortoDesde} al ${periodo.cortoHasta}${datos.total ? ` · ${datos.total}${datos.total === 1 ? " nueva" : " nuevas"}` : " · Sin reseñas nuevas"}${datos.pendientes ? ` · ${datos.pendientes} sin responder` : ""}`;
  return { datos, asunto, periodo };
}

/* ---------- Envío ---------- */
// sendPavonMail: en modo desarrollo el «para» es fernando@yellowmedia.es y los destinatarios pedidos van en copia oculta.
export async function enviarResenas(destinatarios: string[], asunto: string, html: string) {
  return sendPavonMail({ subject: asunto, html, to: destinatarios, extra: destinatarios, replyTo: RESENAS.responderA });
}
export async function configResenas() { return (await controlStore().get("resenas_config", { type: "json" }) as { activo?: boolean; por?: string; at?: string } | null) || {}; }
