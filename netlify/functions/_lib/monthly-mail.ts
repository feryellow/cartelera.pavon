import type { MonthSummary, Line } from "./monthly.ts";
import { thumbBase64 } from "./thumbs.ts";
// Correo de resumen mensual con la base de la plantilla Somos Yellow.
const e = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
const Y = "#f4c300";

function quickRead(s: MonthSummary) {
  const t = Object.fromEntries(s.totals.map((x) => [x.label, x]));
  const f = t["soportes fachada Gran Teatro Pavón"], h = t["Home Ticket"], c = t["cuñas asignadas"] || t["cuñas certificadas"], r = t["Revistas Teatros"], tx = t["campañas taxis"], ic = t["campañas intercambiadores"];
  const parts: string[] = [];
  if (c && Number(c.value)) parts.push(`${Number(c.value).toLocaleString("es-ES")} ${c.label}`);
  if (f) parts.push(`${f.value} soportes de la fachada del Gran Teatro Pavón`);
  const ar = t["soportes cartelera Teatro Arlequín"];
  if (ar) parts.push(`${ar.value} soportes de la cartelera del Teatro Arlequín`);
  if (r) parts.push(`${r.value} Revistas Teatros`);
  const xr = t["intercambios en revistas"];
  if (xr) parts.push(`${xr.value} ${Number(xr.value) === 1 ? "intercambio" : "intercambios"} en otras revistas`);
  if (h && Number(h.value)) parts.push(`${parseInt(String(h.note || "0"), 10) || 0} Home Tickets completos de ${h.value}`);
  if (tx) parts.push(`${tx.value} ${Number(tx.value) === 1 ? "campaña" : "campañas"} en taxis`);
  if (ic) parts.push(`${ic.value} ${Number(ic.value) === 1 ? "campaña" : "campañas"} en intercambiadores`);
  return (parts.length ? `En ${s.label.toLowerCase()}: ${parts.join(", ")}.` : `No hay publicidad registrada en ${s.label.toLowerCase()}.`) + (t["cuñas asignadas"] ? " Las cuñas son las asignadas; falta el certificado de emisión." : "");
}

// Prepara miniaturas (máx. 36) como adjuntos incrustados y devuelve el HTML con sus cid.
export async function buildMonthlyMail(s: MonthSummary, o: { appUrl: string; test?: boolean; devRecipient?: string }) {
  const attachments: { filename: string; content: string; content_id: string; content_type: string }[] = [];
  let n = 0;
  for (const sec of s.sections) for (const l of sec.lines) {
    if (!l.img || n >= 36) continue;
    const b64 = l.img.kind === "facade" ? await thumbBase64(l.img) : l.collage ? await thumbBase64(l.img, 912, 0) : await thumbBase64(l.img, l.wide ? 432 : l.small ? 240 : 300, l.wide ? 324 : l.small ? 240 : 400);
    if (!b64) continue;
    const cid = `img${n++}@yc`; (l as any).cid = cid;
    attachments.push({ filename: `imagen-${n}.jpg`, content: b64, content_id: cid, content_type: "image/jpeg" });
  }
  return { html: renderMonthly(s, o), attachments };
}

export function renderMonthly(s: MonthSummary, o: { appUrl: string; test?: boolean; devRecipient?: string }) {
  const base = o.appUrl.replace(/\/$/, "");
  const kpis = s.totals.filter((x) => typeof x.value === "string" || x.value > 0).slice(0, 6);
  // Comprobantes en tarjetas, dos por fila (una por fila en el móvil), como el modelo de Fer:
  // cuñas, fachada del Pavón, páginas en revistas de teatro y Home Tickets completos
  const T = Object.fromEntries(s.totals.map((x) => [x.label, x]));
  const cards: { big: string; label: string; note?: string; text?: boolean }[] = [];
  const cu = T["cuñas certificadas"] || T["cuñas asignadas"];
  if (cu && Number(cu.value)) cards.push({ big: Number(cu.value).toLocaleString("es-ES"), label: cu.label });
  const fa = T["soportes fachada Gran Teatro Pavón"];
  if (fa) cards.push({ big: String(fa.value), label: fa.label });
  const arc = T["soportes cartelera Teatro Arlequín"];
  if (arc) cards.push({ big: String(arc.value), label: arc.label });
  const rv = T["Revistas Teatros"];
  if (rv) cards.push({ big: String(rv.value), label: "Revistas Teatros" });
  const xv = T["intercambios en revistas"];
  if (xv) cards.push({ big: String(xv.value), label: Number(xv.value) === 1 ? "intercambio en revistas" : "intercambios en revistas" });
  const htc = T["Home Ticket"];
  if (htc && Number(htc.value)) { const done = parseInt(String(htc.note || "0"), 10) || 0; cards.push({ big: String(done), label: done === 1 ? "Home Ticket completo" : "Home Tickets completos", note: `de ${htc.value} ${Number(htc.value) === 1 ? "teatro" : "teatros"} con Home Ticket` }); }
  for (const k of ["campañas taxis", "campañas intercambiadores"]) { const x = T[k]; if (x) cards.push({ big: String(x.value), label: Number(x.value) === 1 ? k.replace("campañas", "campaña") : k }); }
  const card = (c: typeof cards[number]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0efeb; border-radius:10px;"><tr><td style="padding:16px 16px 18px;">
      ${c.text ? `<div style="font-size:18px; font-weight:800; color:#111111; line-height:1.2;">${e(c.big)}</div>` : `<div style="font-size:44px; font-weight:800; color:#111111; line-height:1; letter-spacing:-0.02em;">${e(c.big)}</div>`}
      ${c.label ? `<div style="font-size:15px; font-weight:800; color:#111111; margin-top:6px; line-height:1.25;">${e(c.label)}</div>` : ""}
      ${c.note ? `<div style="font-size:12px; color:#555555; margin-top:4px; line-height:1.35;">${e(c.note)}</div>` : ""}</td></tr></table>`;
  const kpiRows: string[] = [];
  for (let i = 0; i < cards.length; i += 2) kpiRows.push(`<tr>${cards.slice(i, i + 2).map((c, j) => `<td width="50%" valign="top" class="yw-stack yw-kpi" style="width:50%; padding:0 ${j ? 0 : 6}px 12px ${j ? 6 : 0}px;">${card(c)}</td>`).join("")}${cards.slice(i, i + 2).length < 2 ? `<td width="50%" class="yw-stack" style="width:50%;"></td>` : ""}</tr>`);
  const linkBtn = (l: Line) => l.link ? `<div style="margin-top:6px;"><a href="${e(l.link)}" target="_blank" style="display:inline-block; background:#111111; color:${Y}; font-size:12px; font-weight:800; text-decoration:none; padding:5px 10px; border-radius:4px;">${e(l.linkLabel || "Abrir")}</a></div>` : "";
  const textRow = (l: Line, i: number) => `<tr><td class="yw-pad" style="padding:${i ? "10px" : "14px"} 32px 0;"><div style="font-size:13px; color:#111111; line-height:1.5;${i ? " border-top:1px solid #eeeeee; padding-top:10px;" : ""}"><b>${e(l.title)}</b>${l.detail ? ` · <span style="color:#444444;">${e(l.detail)}</span>` : ""}${l.link ? ` · <a href="${e(l.link)}" target="_blank" style="color:#111111; font-weight:800;">${e(l.linkLabel || "Abrir")}</a>` : ""}</div></td></tr>`;
  // Cuadrículas: carteles de fachada 4 por fila (cuadradas y pequeñas), resto 3 por fila (3:4),
  // fotos de montaje 2 por fila (4:3)
  const grid = (items: Line[]) => {
    const block = (list: Line[], per: number, ratio: number, cap: number) => {
      const pct = Math.floor(100 / per), iw = Math.floor(456 / per) - 10, rows: string[] = [];
      for (let i = 0; i < list.length; i += per) {
        const chunk = list.slice(i, i + per);
        rows.push(`<tr>${chunk.map((l) => `<td width="${pct}%" valign="top" style="width:${pct}%; padding:0 10px 14px 0;">
          ${l.kicker ? `<div style="font-size:15px; font-weight:800; color:#111111; margin:0 0 6px; line-height:1.2;">${e(l.kicker)}</div>` : ""}
          ${l.link ? `<a href="${e(l.link)}" target="_blank" style="text-decoration:none;">` : ""}<img src="cid:${e((l as any).cid)}" width="${iw}" height="${Math.round(iw * ratio)}" alt="${e(l.title)}" style="display:block; width:100%; max-width:${iw}px; height:auto; border:1px solid #e3e3e3;">${l.link ? "</a>" : ""}
          <div style="font-size:${cap}px; font-weight:800; color:#111111; margin-top:6px; line-height:1.3;">${e(l.title)}</div>
          ${l.detail ? `<div style="font-size:${cap - 1}px; color:#666666; margin-top:2px; line-height:1.35;">${e(l.detail)}</div>` : ""}${linkBtn(l)}</td>`).join("")}${chunk.length < per ? `<td width="${pct * (per - chunk.length)}%" style="width:${pct * (per - chunk.length)}%;"></td>` : ""}</tr>`);
      }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed; width:100%;">${rows.join("")}</table>`;
    };
    const collage = items.filter((l) => l.collage), small = items.filter((l) => l.small), posters = items.filter((l) => !l.wide && !l.small && !l.collage), photos = items.filter((l) => l.wide);
    const col = collage.map((l) => `<img src="cid:${e((l as any).cid)}" width="456" alt="${e(l.title)}" style="display:block; width:100%; max-width:456px; height:auto; border:0;">
      <div style="font-size:12px; font-weight:800; color:#111111; margin-top:8px; line-height:1.35;">${e(l.title)}</div>${l.detail ? `<div style="font-size:11px; color:#666666; margin:2px 0 14px;">${e(l.detail)}</div>` : ""}`).join("");
    return `<tr><td class="yw-pad" style="padding:16px 32px 0;">${col}${small.length ? block(small, 4, 1, 11) : ""}${posters.length ? block(posters, 3, 4 / 3, 12) : ""}${photos.length ? block(photos, 2, 0.75, 12) : ""}</td></tr>`;
  };
  // Comunicación por semanas (lunes a domingo), con la fecha resaltada en amarillo
  const weeksBlock = (lines: Line[]) => {
    const wk = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const f = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00Z").toLocaleDateString("es-ES", { ...o, timeZone: "UTC" }).replace(".", "");
    const groups = new Map<string, Line[]>(); for (const l of lines) { const k = wk(l.date || s.first); groups.set(k, [...(groups.get(k) || []), l]); }
    // número de semana dentro del mes (la que contiene el día 1 es la semana 1)
    const w1 = wk(s.first), num = (monday: string) => Math.round((new Date(monday + "T12:00:00Z").getTime() - new Date(w1 + "T12:00:00Z").getTime()) / 6048e5) + 1;
    let i = 0;
    return [...groups].sort((a, b) => a[0].localeCompare(b[0])).map(([monday, ls]) => {
      const sun = new Date(monday + "T12:00:00Z"); sun.setUTCDate(sun.getUTCDate() + 6);
      const a = monday < s.first ? s.first : monday, b = sun.toISOString().slice(0, 10) > s.last ? s.last : sun.toISOString().slice(0, 10);
      const head = `<tr><td class="yw-pad" style="padding:${i++ ? 18 : 14}px 32px 4px;"><span style="display:inline-block; background:#111111; color:${Y}; font-size:11px; font-weight:800; letter-spacing:0.05em; padding:3px 8px;">SEMANA ${num(monday)} · ${e(f(a, { day: "numeric" }))}–${e(f(b, { day: "numeric", month: "long" }).toUpperCase())}</span></td></tr>`;
      return head + ls.map((l) => `<tr><td class="yw-pad" style="padding:6px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" width="92" style="width:92px; padding:1px 10px 0 0;"><span style="display:inline-block; background:${Y}; color:#111111; font-size:12px; font-weight:800; padding:2px 6px; white-space:nowrap;">${e(f(l.date || s.first, { weekday: "short", day: "numeric" }))}${l.time ? " · " + e(l.time) : ""}</span></td>
        <td valign="top" style="font-size:13px; color:#111111; line-height:1.45;"><b>${e(l.title)}</b>${l.detail ? `<br><span style="font-size:12px; color:#666666;">${e(l.detail)}</span>` : ""}</td>
      </tr></table></td></tr>`).join("");
    }).join("");
  };
  // Radio: una ficha por contrato con barra de uso y reparto por espectáculo
  const bar = (v: number, max: number, h = 8, color = Y) => { const pc = max ? Math.max(0, Math.min(100, Math.round(v / max * 100))) : 0;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${pc ? `<td width="${pc}%" style="width:${pc}%; background:${color}; height:${h}px; line-height:${h}px; font-size:1px;">&nbsp;</td>` : ""}${pc < 100 ? `<td style="background:#e6e3dc; height:${h}px; line-height:${h}px; font-size:1px;">&nbsp;</td>` : ""}</tr></table>`; };
  const radioBlock = (lines: Line[]) => lines.map((l) => {
    const st = l.stat; if (!st) return textRow(l, 1);
    const fm = (x: number) => x.toLocaleString("es-ES"), max = Math.max(1, ...st.parts.map((x) => x[1]));
    return `<tr><td class="yw-pad" style="padding:14px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f1; border-left:4px solid ${Y};"><tr><td style="padding:14px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="bottom" style="font-size:14px; font-weight:800; color:#111111;">${e(l.title)}</td>
        <td valign="bottom" align="right" style="white-space:nowrap;"><span style="font-size:22px; font-weight:800; color:#111111;">${fm(st.used)}</span><span style="font-size:12px; color:#666666;"> / ${fm(st.cap)} ${e(st.unit)}</span></td>
      </tr></table>
      <div style="height:8px; line-height:8px; font-size:1px;">&nbsp;</div>${bar(st.used, st.cap, 10)}
      <div style="font-size:11px; color:#666666; margin-top:6px;">${!st.used ? "Sin asignar este mes" : `${Math.round(st.used / st.cap * 100)} % asignado${st.cert ? ` · ${fm(st.cert)} certificadas` : " · pendiente de certificado"}`}</div>
      ${st.parts.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; table-layout:fixed;">${st.parts.map(([nme, v]) => `<tr>
        <td width="44%" style="width:44%; font-size:12px; color:#111111; padding:3px 8px 3px 0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${e(nme)}</td>
        <td style="padding:3px 0;">${bar(v, max, 7, "#111111")}</td>
        <td width="36" align="right" style="width:36px; font-size:12px; font-weight:800; color:#111111; padding:3px 0 3px 8px;">${fm(v)}</td></tr>`).join("")}</table>` : ""}
      ${l.links?.length ? `<div style="margin-top:10px; font-size:11px; font-weight:800; letter-spacing:0.04em; color:#555555;">CUÑAS QUE SUENAN</div>${l.links.map((x) => `<div style="margin-top:5px;"><a href="${e(x.url)}" target="_blank" style="display:inline-block; background:#111111; color:${Y}; font-size:12px; font-weight:800; text-decoration:none; padding:5px 10px; border-radius:4px;">▶ ${e(x.label)}</a></div>`).join("")}` : ""}
    </td></tr></table></td></tr>`;
  }).join("");
  const sections = s.sections.map((sec) => {
    const withImg = sec.lines.filter((l) => (l as any).cid), noImg = sec.lines.filter((l) => !(l as any).cid);
    return `
  <tr><td class="yw-pad" style="padding:26px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#111111;">${e(sec.name.toUpperCase())} · ${e((sec.count || String(sec.lines.filter((l) => !l.empty).length)).toUpperCase())}</div>
    <div style="height:2px; background:${Y}; margin-top:6px;"></div>
  </td></tr>
  ${!sec.lines.length ? `<tr><td class="yw-pad" style="padding:14px 32px 0;"><div style="font-size:13px; color:#777777;">Sin registros este mes.</div></td></tr>` : sec.key === "hitos" ? weeksBlock(sec.lines) : sec.key === "radio" ? radioBlock(sec.lines) : (withImg.length ? grid(withImg) : "") + noImg.map(textRow).join("")}`}).join("");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Resumen de publicidad · ${e(s.label)}</title>
<style>
  .yw-container { width: 520px; max-width: 520px; }
  @media only screen and (max-width: 560px) {
    .yw-container { width: 100% !important; max-width: 100% !important; }
    .yw-stack { display: block !important; width: 100% !important; text-align: left !important; }
    .yw-kpi { padding-left: 0 !important; padding-right: 0 !important; }
    .yw-stack-right { display: block !important; width: 100% !important; text-align: left !important; padding-top: 12px !important; }
    .yw-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .yw-title { font-size: 19px !important; }
  }
  @media (prefers-color-scheme: dark) { .yw-card { background: #ffffff !important; } .yw-dark-block { background: #111111 !important; } }
  [data-ogsc] .yw-card { background: #ffffff !important; }
  [data-ogsc] .yw-dark-block { background: #111111 !important; }
</style></head>
<body style="margin:0; padding:0; background:#e8e8e8; font-family: Arial, Helvetica, sans-serif;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${e(quickRead(s))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8; padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="520" class="yw-container yw-card" cellpadding="0" cellspacing="0" style="background:#ffffff;">
  <tr><td class="yw-pad" style="padding:24px 32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" align="left" class="yw-stack"><img src="${e(base)}/assets/mail/somos-yellow.png" width="140" height="35" alt="Somos Yellow" style="display:block; border:0;"></td>
      <td valign="middle" align="right" class="yw-stack-right">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#2b2b2b;"><tr>
          <td style="padding:8px 6px 8px 10px;" valign="middle"><img src="${e(base)}/assets/mail/rayo.png" width="16" height="22" alt="" style="display:block; border:0;"></td>
          <td style="padding:8px 12px 8px 4px; text-align:center;" valign="middle">
            <div style="font-size:10px; font-weight:bold; letter-spacing:0.06em; color:#ffffff; white-space:nowrap; text-align:center;">RESUMEN MENSUAL${o.test ? " · PRUEBA" : ""}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:4px auto 0;"><tr>
              <td style="background:${Y}; padding:2px 10px; text-align:center;"><span style="font-size:10px; font-weight:bold; color:#2b2b2b; white-space:nowrap;">${e(s.label.toUpperCase())}</span></td>
            </tr></table>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>
  <tr><td class="yw-pad" style="padding:0 32px;"><div style="height:3px; background:${Y};"></div></td></tr>
  <tr><td class="yw-pad" style="padding:20px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#555555;">PUBLICIDAD Y COMUNICACIÓN · TODOS LOS SOPORTES</div>
    <div class="yw-title" style="font-size:22px; font-weight:800; color:#111111; margin-top:6px; line-height:1.25;">Resumen de ${e(s.label.toLowerCase())}</div>
  </td></tr>
  ${kpiRows.length ? `<tr><td class="yw-pad" style="padding:16px 32px 0;"><div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#555555; margin-bottom:8px;">COMPROBANTES DEL MES</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">${kpiRows.join("")}</table></td></tr>` : ""}
  <tr><td class="yw-pad" style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yw-dark-block" style="background:#111111;"><tr><td style="padding:20px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" style="padding-right:12px;"><span style="color:${Y}; font-size:20px;">&#10022;</span></td>
        <td><div style="font-size:16px; font-weight:800; color:#ffffff;">Lectura rápida.</div>
          <div style="font-size:13px; color:#cccccc; margin-top:6px; line-height:1.6;">${e(quickRead(s))}</div></td>
      </tr></table>
    </td></tr></table>
  </td></tr>
  ${sections}
  <tr><td class="yw-pad" align="center" style="padding:28px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${Y}; border-radius:999px;">
      <a href="${e(base)}/#archivo?mes=${e(s.month)}" style="display:inline-block; padding:11px 24px; font-size:13px; font-weight:bold; color:#111111; text-decoration:none;">Ver el archivo en Yellow Control</a>
    </td></tr></table>
  </td></tr>
  <tr><td class="yw-pad" style="padding:32px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yw-dark-block" style="background:#111111;"><tr><td class="yw-pad" style="padding:24px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle">
        <div style="font-size:14px; font-weight:800; color:${Y}; margin-top:12px;">Lo hacemos y ya vemos.</div>
        <div style="font-size:11px; color:#999999; margin-top:2px;">Resumen mensual de Yellow Control · se envía el día 1 a las 9:00.</div>
        ${o.devRecipient ? `<div style="font-size:11px; color:#777777; margin-top:8px;">Modo desarrollo: solo se envía a ${e(o.devRecipient)}.</div>` : ""}
      </td></tr></table>
    </td></tr></table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
