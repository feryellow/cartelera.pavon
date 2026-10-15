import type { EngineResult, Issue } from "./engine.ts";
import { thumbBase64, type ImgRef } from "./thumbs.ts";

// Correo diario = una vista del Status Engine. No calcula nada: solo pinta las incidencias que recibe.
// Si no hay incidencias, quien llama no envía nada. Plantilla Somos Yellow: 600 px, Poppins (Arial de
// reserva en Gmail), negro y amarillo, tablas y estilos en línea; sin JavaScript.

const e = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
const Y = "#FFD400";
const FONT = "'Poppins', Arial, Helvetica, sans-serif";
const noon = (iso: string) => new Date(iso + "T12:00:00Z");
const fullDate = (iso: string, time?: string) => {
  if (!iso) return "";
  const t = noon(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (t + (time ? " · " + time : "")).toUpperCase();
};

// Titulares: se elige uno por fecha (determinista: el mismo día da el mismo titular, días seguidos cambian)
export const HEADLINES = [
  "Esta semana, de un vistazo", "Así viene la semana", "Semana en foco", "Lo esencial de esta semana", "La semana, en claro",
  "Esta semana: lo próximo", "Lo que hay que resolver", "Huecos por cubrir", "Esta semana, punto por punto", "Lo que falta, sin rodeos",
  "La semana, ordenada", "Pendientes de publicidad", "Qué necesita atención", "El mapa de esta semana", "Esta semana, sobre la mesa",
  "Lo inmediato", "Esta semana, en una mirada", "Lo que no puede esperar", "Semana a la vista", "Esta semana: dónde estamos",
  "Antes de que se escape", "Lo importante, primero", "Esta semana: foco y fechas", "Así está la semana",
];
export function headlineFor(day: string) {
  const n = Math.floor(noon(day).getTime() / 864e5);
  return HEADLINES[((n % HEADLINES.length) + HEADLINES.length) % HEADLINES.length];
}

/** Miniaturas incrustadas (cid) para las primeras incidencias; respeta un tiempo máximo. */
export async function newsletterImages(issues: Issue[], budgetMs = 9000) {
  const t0 = Date.now(), cids = new Map<string, string>(), attachments: { filename: string; content: string; content_id: string; content_type: string }[] = [];
  for (const i of issues.slice(0, 24)) {
    if (Date.now() - t0 > budgetMs) break;
    if (i.logo) continue; // el logo del proveedor va como imagen alojada, no incrustada
    const ref: ImgRef | null = i.thumbnail ? { kind: i.thumbnail.kind, key: i.thumbnail.key } : i.fallback ? { kind: "static", key: i.fallback } : null;
    if (!ref) continue;
    const k = ref.kind + ":" + ref.key;
    if (!cids.has(k)) {
      const b64 = await thumbBase64(ref, 144, 192).catch(() => "");
      if (!b64) continue;
      const cid = `inc${attachments.length + 1}@yellowcontrol`;
      attachments.push({ filename: `incidencia-${attachments.length + 1}.jpg`, content: b64, content_id: cid, content_type: "image/jpeg" });
      cids.set(k, cid);
    }
    (i as any).cid = cids.get(k);
  }
  return attachments;
}

function row(i: Issue, appUrl: string, first: boolean, base = appUrl) {
  const solid = (bg: string) => bg.startsWith("linear") ? (bg.match(/#[0-9a-f]{6}/i)?.[0] || "#652b96") : bg;
  if (!i.logo && !(i as any).cid) i = { ...i, logo: { src: "/yellow-app-icon-180.png", bg: "#FFD400" } };
  const img = i.logo ? `<td width="86" valign="top" style="padding:14px 14px 0 0;"><table role="presentation" width="72" cellpadding="0" cellspacing="0"><tr><td width="72" height="72" align="center" valign="middle" bgcolor="${e(solid(i.logo.bg))}" style="width:72px;height:72px;background:${e(i.logo.bg)};border:1px solid #e4e1d8;"><img src="${e(base + i.logo.src)}" width="56" alt="" style="display:block;width:56px;max-height:56px;height:auto;border:0;"></td></tr></table></td>` : (i as any).cid ? `<td width="86" valign="top" style="padding:0 14px 0 0;"><img src="cid:${e((i as any).cid)}" width="72" height="96" alt="" style="display:block;width:72px;height:96px;border:0;background:#efede8;"></td>` : "";
  const link = appUrl + "/" + (i.link || "");
  return `<tr><td class="ny-pad" style="padding:${first ? "16px" : "0"} 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:${first ? "0" : "1px solid #e4e1d8"};"><tr>
      ${img}
      <td valign="top" style="padding:14px 0;font-family:${FONT};">
        ${i.date || i.period ? `<span style="display:inline-block;background:${Y};color:#111111;font-size:11px;font-weight:800;letter-spacing:.02em;padding:3px 7px;">${e(i.date ? fullDate(i.date, i.time) : i.period.toUpperCase())}</span>` : ""}
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b665d;font-weight:600;margin-top:8px;">${e(i.title)}</div>
        <div style="font-size:19px;line-height:24px;font-weight:800;color:#111111;margin-top:2px;">${e(i.issue)}${i.severity === "warning" ? ` <span style="font-size:11px;font-weight:800;color:#8a6d00;">· ATENCIÓN</span>` : ""}</div>
        ${i.spectacle && !i.title.includes(i.spectacle) ? `<div style="font-size:13px;font-weight:600;color:#111111;margin-top:4px;">${e(i.spectacle)}</div>` : ""}
        ${i.detail ? `<div style="font-size:12px;line-height:18px;color:#555555;margin-top:4px;">${e(i.detail)}</div>` : ""}
        <div style="margin-top:8px;"><a href="${e(link)}" style="font-size:12px;font-weight:700;color:#111111;text-decoration:underline;">Resolver en Yellow Control</a></div>
      </td>
    </tr></table>
  </td></tr>`;
}

export function renderNewsletter(r: EngineResult, o: { appUrl: string; assetBase?: string; test?: boolean; devRecipient?: string }) {
  const base = (o.assetBase || o.appUrl).replace(/\/$/, ""), app = o.appUrl.replace(/\/$/, "");
  const title = headlineFor(r.today);
  const bySection = r.sections.map((s) => ({ ...s, items: r.issues.filter((i) => i.section === s.key) }));
  const pre = `${r.total} ${r.total === 1 ? "cosa por resolver" : "cosas por resolver"}: ${r.sections.map((s) => `${s.name} ${s.count}`).join(" · ")}`;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
<title>Yellow Control · ${e(title)}</title>
<style>
  .ny-container{width:600px;max-width:600px}
  @media only screen and (max-width:640px){.ny-container{width:100%!important;max-width:100%!important}.ny-pad{padding-left:18px!important;padding-right:18px!important}.ny-title{font-size:26px!important;line-height:30px!important}}
</style></head>
<body style="margin:0;padding:0;background:#ecebe6;font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecebe6;padding:28px 0;"><tr><td align="center">
<table role="presentation" width="600" class="ny-container" cellpadding="0" cellspacing="0" style="background:#ffffff;">
  <tr><td class="ny-pad" style="padding:22px 32px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle"><img src="${e(base)}/assets/mail/somos-yellow.png" width="140" height="35" alt="Somos Yellow" style="display:block;border:0;"></td>
      <td valign="middle" align="right" style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:.08em;color:#111111;">YELLOW CONTROL${o.test ? " · PRUEBA" : ""}</td>
    </tr></table>
  </td></tr>
  <tr><td class="ny-pad" style="padding:0 32px;"><div style="height:4px;background:${Y};"></div></td></tr>
  <tr><td class="ny-pad" style="padding:20px 32px 0;font-family:${FONT};">
    <div style="font-size:11px;font-weight:600;letter-spacing:.06em;color:#6b665d;">${e(fullDate(r.today))}</div>
    <div class="ny-title" style="font-size:32px;line-height:36px;font-weight:800;color:#111111;margin-top:6px;">${e(title)}</div>
  </td></tr>
  <tr><td class="ny-pad" style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;"><tr><td style="padding:18px 20px;font-family:${FONT};">
      <div style="font-size:30px;line-height:30px;font-weight:800;color:${Y};">${r.total}</div>
      <div style="font-size:13px;font-weight:600;color:#ffffff;margin-top:4px;">${r.total === 1 ? "cosa por resolver" : "cosas por resolver"}${r.warnings ? ` · ${r.warnings} ${r.warnings === 1 ? "vence hoy o mañana" : "vencen hoy o mañana"}` : ""}</div>
      <div style="font-size:12px;color:#bdbab2;margin-top:8px;">${e(r.sections.map((s) => `${s.name} ${s.count}`).join("  ·  "))}</div>
    </td></tr></table>
  </td></tr>
  ${bySection.map((s) => `<tr><td class="ny-pad" style="padding:26px 32px 0;font-family:${FONT};">
    <div style="font-size:12px;font-weight:800;letter-spacing:.06em;color:#111111;">${e(s.name.toUpperCase())} · ${s.count}</div>
    <div style="height:2px;background:${Y};margin-top:6px;"></div></td></tr>
    ${s.items.map((i, k) => row(i, app, k === 0, base)).join("")}`).join("")}
  <tr><td class="ny-pad" align="center" style="padding:30px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${Y};"><a href="${e(app)}/" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:13px;font-weight:800;color:#111111;text-decoration:none;">Abrir Yellow Control</a></td></tr></table>
  </td></tr>
  <tr><td style="padding:30px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;"><tr><td class="ny-pad" align="center" style="padding:22px 32px;font-family:${FONT};">
    <div style="font-size:14px;font-weight:800;color:${Y};">Lo hacemos y ya vemos.</div>
    <div style="font-size:11px;color:#999999;margin-top:4px;">Solo llega cuando hay algo por resolver.</div>
    ${o.devRecipient ? `<div style="font-size:11px;color:#777777;margin-top:8px;">Modo desarrollo: solo se envía a ${e(o.devRecipient)}.</div>` : ""}
  </td></tr></table></td></tr>
</table>
</td></tr></table>
</body></html>`;
}
