// Resumen diario por correo con la base de la plantilla Somos Yellow (520 px, Arial, negro y
// amarillo #f4c300). HTML con tablas y estilos en línea para Gmail, Outlook y el correo del iPhone.
// El logo y el rayo van como PNG alojados en la web: Gmail no muestra SVG dentro del correo.
export type DigestItem = { module: string; title: string; location: string; action: string; date: string; days?: number; materialStatus?: string; time?: string; link?: string; kind?: string };
export type DigestInput = { day: string; test?: boolean; appUrl: string; assetBase?: string; pending: DigestItem[]; upcoming: DigestItem[]; current: DigestItem[]; currentTotal?: number; devRecipient?: string };

const e = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
const Y = "#f4c300";
const d0 = (iso: string) => new Date(iso + "T12:00:00Z");
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => d0(iso).toLocaleDateString("es-ES", { ...o, timeZone: "UTC" }).replace(/\./g, "");
const addDays = (iso: string, n: number) => { const d = d0(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function range(day: string) {
  const end = addDays(day, 6), a = d0(day), b = d0(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return (sameMonth ? fmt(day, { day: "numeric" }) : fmt(day, { day: "numeric", month: "short" })) + " – " + fmt(end, { day: "numeric", month: "short" });
}
function pill(a: DigestItem) {
  if (a.days === undefined) return "";
  const t = a.days < 0 ? "FUERA DE PLAZO" : a.days === 0 ? "HOY" : a.days === 1 ? "MAÑANA" : "D-" + a.days;
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${Y}; padding:4px 10px; border-radius:999px;"><span style="font-size:11px; font-weight:bold; color:#412402; white-space:nowrap;">${t}</span></td></tr></table>`;
}
function sectionHead(title: string) {
  return `<tr><td class="yw-pad" style="padding:26px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#111111;">${e(title)}</div>
    <div style="height:2px; background:${Y}; margin-top:6px;"></div>
  </td></tr>`;
}
// Aviso: fecha · módulo / título en negrita / una línea de detalle, con la píldora de plazo a la derecha
function alertRow(a: DigestItem, first: boolean) {
  const detail = [a.action, a.location, a.materialStatus ? "material " + a.materialStatus : ""].filter(Boolean).join(" · ");
  const title = a.link ? `<a href="${e(a.link)}" style="color:#111111; text-decoration:none;">${e(a.title)}</a>` : e(a.title);
  return `<tr><td class="yw-pad" style="padding:${first ? "16px" : "14px"} 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"${first ? "" : ' style="border-top:1px solid #eeeeee;"'}><tr>
      <td valign="top" style="padding-top:${first ? "0" : "14px"};">
        <div style="font-size:10px; font-weight:bold; letter-spacing:0.03em; color:#777777;">${e(fmt(a.date, { weekday: "short", day: "numeric", month: "short" }).toUpperCase())} · ${e(a.module.toUpperCase())}</div>
        <div style="font-size:15px; font-weight:800; color:#111111; margin-top:4px;">${title}</div>
        <div style="font-size:13px; color:#444444; margin-top:4px;">${e(detail)}</div>
      </td>
      <td valign="top" align="right" style="padding-left:12px; width:1%; padding-top:${first ? "0" : "14px"};">${pill(a)}</td>
    </tr></table>
  </td></tr>`;
}
// Agenda: <b>día · hora</b> · acción · título · lugar
function agendaRow(a: DigestItem, first: boolean, lead: string) {
  const action = a.title.toLowerCase().startsWith(String(a.action).toLowerCase()) ? "" : a.action;
  const rest = [action, a.title, a.location, a.materialStatus ? "material " + a.materialStatus : ""].filter(Boolean).map(e).join(" · ");
  const body = `<b>${e(lead)}</b> · ${rest}`;
  return `<tr><td class="yw-pad" style="padding:${first ? "14px" : "10px"} 32px 0;">
    <div style="font-size:13px; color:#111111; line-height:1.5;${first ? "" : " border-top:1px solid #eeeeee; padding-top:10px;"}">${a.link ? `<a href="${e(a.link)}" style="color:#111111; text-decoration:none;">${body}</a>` : body}</div>
  </td></tr>`;
}
const emptyRow = (t: string) => `<tr><td class="yw-pad" style="padding:14px 32px 0;"><div style="font-size:13px; color:#777777;">${e(t)}</div></td></tr>`;

function quickRead(d: DigestInput) {
  const parts: string[] = [];
  const over = d.pending.filter((a) => (a.days ?? 9) < 0), today = d.pending.filter((a) => a.days === 0), soon = d.pending.filter((a) => (a.days ?? 9) > 0);
  const who = (a: DigestItem) => `${a.title} (${a.module})`;
  if (over.length) parts.push(`Fuera de plazo: ${over.map(who).join(", ")}.`);
  if (today.length) parts.push(`Vence hoy: ${today.map(who).join(", ")}.`);
  if (soon.length) parts.push(`Próximos días: ${soon.map((a) => `${who(a)} ${a.days === 1 ? "mañana" : "en " + a.days + " días"}`).join(", ")}.`);
  if (!d.pending.length) parts.push("No hay entregas vencidas ni cambios urgentes.");
  const hitos = d.upcoming.filter((u) => u.kind === "hito");
  if (hitos.length) parts.push(`En agenda: ${hitos.slice(0, 3).map((h) => `${h.title}, ${fmt(h.date, { weekday: "long", day: "numeric" })}${h.time ? " a las " + h.time : ""}`).join("; ")}.`);
  return parts.join(" ");
}

export function renderDigest(d: DigestInput) {
  const base = (d.assetBase || d.appUrl).replace(/\/$/, "");
  const n = { p: d.pending.length, u: d.upcoming.length, c: d.currentTotal ?? d.current.length };
  const title = n.p ? `${n.p} ${n.p === 1 ? "aviso requiere" : "avisos requieren"} atención` : "Semana sin avisos urgentes";
  const kpi = (v: number, label: string) => `<td width="33%" valign="top" class="yw-num-col" style="padding-right:10px;">
      <div style="font-size:26px; font-weight:800; color:#111111; line-height:1;">${v}</div>
      <div style="font-size:11px; color:#555555; margin-top:4px;">${e(label)}</div></td>`;
  const pendingRows = n.p ? d.pending.map((a, i) => alertRow(a, i === 0)).join("") : emptyRow("Nada pendiente: no hay entregas ni cambios en los próximos días.");
  const upcomingRows = n.u ? d.upcoming.map((a, i) => agendaRow(a, i === 0, cap(fmt(a.date, { weekday: "short", day: "numeric" })) + (a.time ? " · " + a.time : ""))).join("") : emptyRow("No hay fechas en los próximos siete días.");
  const currentRows = d.current.length ? d.current.map((a, i) => agendaRow({ ...a, action: a.module }, i === 0, a.date ? "Hasta el " + fmt(a.date, { day: "numeric", month: "short" }) : "Sin fecha de fin")).join("") : emptyRow("No hay campañas activas registradas.");
  const pre = `${title} · ${n.u} ${n.u === 1 ? "fecha" : "fechas"} esta semana · ${n.c} ${n.c === 1 ? "campaña activa" : "campañas activas"}`;

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Yellow Control · ${e(range(d.day))}</title>
<style>
  .yw-container { width: 520px; max-width: 520px; }
  @media only screen and (max-width: 560px) {
    .yw-container { width: 100% !important; max-width: 100% !important; }
    .yw-stack { display: block !important; width: 100% !important; text-align: left !important; }
    .yw-stack-right { display: block !important; width: 100% !important; text-align: left !important; padding-top: 12px !important; }
    .yw-stack-right table { margin-left: 0 !important; }
    .yw-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .yw-title { font-size: 19px !important; }
  }
  @media (prefers-color-scheme: dark) { .yw-card { background: #ffffff !important; } .yw-dark-block { background: #111111 !important; } }
  [data-ogsc] .yw-card { background: #ffffff !important; }
  [data-ogsc] .yw-dark-block { background: #111111 !important; }
</style></head>
<body style="margin:0; padding:0; background:#e8e8e8; font-family: Arial, Helvetica, sans-serif;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${e(pre)}</div>
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
            <div style="font-size:10px; font-weight:bold; letter-spacing:0.06em; color:#ffffff; white-space:nowrap; text-align:center;">YELLOW CONTROL${d.test ? " · PRUEBA" : ""}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:4px auto 0;"><tr>
              <td style="background:${Y}; padding:2px 10px; text-align:center;"><span style="font-size:10px; font-weight:bold; color:#2b2b2b; white-space:nowrap;">SEMANA ${e(range(d.day).toUpperCase())}</span></td>
            </tr></table>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td class="yw-pad" style="padding:0 32px;"><div style="height:3px; background:${Y};"></div></td></tr>

  <tr><td class="yw-pad" style="padding:20px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#555555;">AVISOS DE MATERIAL Y CAMPAÑAS · ${e(fmt(d.day, { weekday: "long", day: "numeric", month: "long" }).toUpperCase())}</div>
    <div class="yw-title" style="font-size:22px; font-weight:800; color:#111111; margin-top:6px; line-height:1.25;">${e(title)}</div>
  </td></tr>

  <tr><td class="yw-pad" style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;"><tr><td style="padding:14px 16px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${kpi(n.p, n.p === 1 ? "requiere atención" : "requieren atención")}${kpi(n.u, n.u === 1 ? "fecha esta semana" : "fechas esta semana")}${kpi(n.c, n.c === 1 ? "campaña activa" : "campañas activas")}
      </tr></table>
    </td></tr></table>
  </td></tr>

  <tr><td class="yw-pad" style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yw-dark-block" style="background:#111111;"><tr><td style="padding:20px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" style="padding-right:12px;"><span style="color:${Y}; font-size:20px;">&#10022;</span></td>
        <td><div style="font-size:16px; font-weight:800; color:#ffffff;">Lectura rápida.</div>
          <div style="font-size:13px; color:#cccccc; margin-top:6px; line-height:1.6;">${e(quickRead(d))}</div></td>
      </tr></table>
    </td></tr></table>
  </td></tr>

  ${sectionHead(`REQUIERE ATENCIÓN · ${n.p} ${n.p === 1 ? "AVISO" : "AVISOS"}`)}
  ${pendingRows}
  ${sectionHead(`PRÓXIMOS 7 DÍAS · ${n.u} ${n.u === 1 ? "FECHA" : "FECHAS"}`)}
  ${upcomingRows}
  ${sectionHead(`MATERIAL ACTIVO · ${n.c} ${n.c === 1 ? "CAMPAÑA" : "CAMPAÑAS"}`)}
  ${currentRows}

  <tr><td class="yw-pad" align="center" style="padding:28px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${Y}; border-radius:999px;">
      <a href="${e(d.appUrl)}" style="display:inline-block; padding:11px 24px; font-size:13px; font-weight:bold; color:#111111; text-decoration:none;">Abrir Yellow Control</a>
    </td></tr></table>
  </td></tr>

  <tr><td class="yw-pad" style="padding:32px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yw-dark-block" style="background:#111111;"><tr><td class="yw-pad" style="padding:24px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle">
        <div style="font-size:14px; font-weight:800; color:${Y}; margin-top:12px;">Lo hacemos y ya vemos.</div>
        <div style="font-size:11px; color:#999999; margin-top:2px;">Avisos de Yellow Control · cada día a las 9:00 si hay novedades.</div>
        ${d.devRecipient ? `<div style="font-size:11px; color:#777777; margin-top:8px;">Modo desarrollo: solo se envía a ${e(d.devRecipient)}.</div>` : ""}
      </td></tr></table>
    </td></tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
