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

const HEADLINES = [
  "Esta semana, de un vistazo",
  "Así viene la semana",
  "Esta semana, en claro",
  "Agenda y pendientes de la semana",
  "La semana, sin rodeos",
  "Lo esencial de esta semana",
  "Esta semana: qué toca ahora",
  "En marcha esta semana",
  "La semana que tenemos por delante",
  "Esta semana: foco y fechas",
  "Así avanza la semana",
  "Esta semana, punto por punto",
  "Agenda abierta para esta semana",
  "Esta semana: lo próximo",
  "Semana en curso",
  "La semana, ordenada",
  "Esta semana: fechas y campañas",
  "El pulso de esta semana",
  "Esta semana, bien visible",
  "Lo que mueve esta semana",
  "Semana en pantalla",
  "Esta semana: próximos pasos",
  "La agenda de esta semana",
  "Así está la semana",
  "Semana activa",
  "Esta semana: lo que viene",
  "El mapa de esta semana",
  "Esta semana, en una mirada",
  "Semana en curso: agenda y campañas",
  "Esta semana: lo inmediato",
  "Lo próximo, esta semana",
  "Esta semana, sobre la mesa",
  "Semana a la vista",
  "Esta semana: agenda abierta",
  "El ritmo de esta semana",
  "Esta semana, en orden",
  "Semana en foco",
  "Esta semana: fechas clave",
  "Así se mueve la semana",
  "Esta semana, lo importante",
  "Semana de trabajo, en claro",
  "Esta semana: dónde estamos"
];

function dailyHeadline(day: string) {
  const d = d0(day);
  const ordinal = Math.floor(d.getTime() / 86400000);
  return HEADLINES[Math.abs(ordinal) % HEADLINES.length];
}

function normalizeTitle(v: string) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function thumbUrl(title: string, base: string) {
  const t = normalizeTitle(title);
  if (t.includes("PEGADOS")) return base + "/assets/campanas/pegados.jpg";
  if (t.includes("101 DALMATAS") || t.includes("CRUELLA")) return base + "/assets/campanas/cruella-teaser.jpg";
  if (t.includes("LOCURAS PARALELAS")) return base + "/assets/campanas/locuras-paralelas-octubre.jpg";
  if (t.includes("EL IMITADOR")) return base + "/assets/campanas/el-imitador.jpg";
  if (t.includes("BESTSELLER")) return base + "/assets/campanas/best-seller.jpg";
  if (t.includes("EVA SORIANO")) return base + "/assets/campanas/eva-soriano-septiembre.jpg";
  if (t.includes("PATRICIA DONN")) return base + "/assets/campanas/patricia-donn.jpg";
  return "";
}

function thumbCell(a: DigestItem, base: string, w=58, h=76) {
  const src = thumbUrl(a.title, base);
  if (!src) return "";
  return `<td width="${w+14}" valign="top" style="padding-right:14px;">
    <img src="${e(src)}" width="${w}" height="${h}" alt="${e(a.title)}" style="display:block;width:${w}px;height:${h}px;object-fit:cover;border:0;background:#efede8;">
  </td>`;
}


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
function alertRow(a: DigestItem, first: boolean, base: string) {
  const detail = [a.action, a.location, a.materialStatus ? "material " + a.materialStatus : ""].filter(Boolean).join(" · ");
  const title = a.link ? `<a href="${e(a.link)}" style="color:#111111;text-decoration:none;">${e(a.title)}</a>` : e(a.title);
  const when = e(fmt(a.date,{weekday:"short",day:"numeric",month:"short"}).toUpperCase());
  return `<tr><td class="yw-pad" style="padding:${first?"14px":"0"} 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111111;"><tr>
      ${thumbCell(a,base)}
      <td valign="top" style="padding:14px 12px 14px 0;">
        <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#555555;font-weight:700;">${when} · ${e(a.module.toUpperCase())}</div>
        <div style="font-size:18px;line-height:21px;font-weight:800;color:#111111;margin-top:3px;">${title}</div>
        <div style="font-size:12px;line-height:1.45;color:#444444;margin-top:5px;">${e(detail)}</div>
      </td>
      <td width="118" valign="top" style="padding:8px 0 8px 8px;">
        <div style="background:${Y};padding:12px;font-size:11px;line-height:1.35;color:#111111;font-weight:800;">${pill(a).replace(/<[^>]+>/g,"").trim()||"REVISAR"}</div>
      </td>
    </tr></table>
  </td></tr>`;
}

function agendaRow(a: DigestItem, first: boolean, lead: string, base: string) {
  const action = a.title.toLowerCase().startsWith(String(a.action).toLowerCase()) ? "" : a.action;
  const rest = [action,a.title,a.location,a.materialStatus ? "material "+a.materialStatus : ""].filter(Boolean).map(e).join(" · ");
  const dateBlock = `<span style="background:${Y};padding:2px 5px;display:inline-block;font-size:12px;font-weight:800;color:#111111;">${e(lead)}</span>`;
  const inner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${thumbCell(a,base,48,64)}
    <td valign="top" style="font-size:13px;line-height:1.5;color:#111111;">
      <div>${dateBlock}</div>
      <div style="font-weight:700;margin-top:5px;">${rest}</div>
    </td>
  </tr></table>`;
  return `<tr><td class="yw-pad" style="padding:${first?"14px":"10px"} 28px 0;">
    <div style="${first?"":"border-top:1px solid #dddddd;padding-top:10px;"}">${a.link?`<a href="${e(a.link)}" style="color:#111111;text-decoration:none;">${inner}</a>`:inner}</div>
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
  const title = dailyHeadline(d.day);
  const kpi = (v: number, label: string) => `<td width="33%" valign="top" class="yw-num-col" style="padding-right:10px;">
      <div style="font-size:26px; font-weight:800; color:#111111; line-height:1;">${v}</div>
      <div style="font-size:11px; color:#555555; margin-top:4px;">${e(label)}</div></td>`;
  const pendingRows = n.p ? d.pending.map((a, i) => alertRow(a, i === 0, base)).join("") : emptyRow("Nada pendiente: no hay entregas ni cambios en los próximos días.");
  const upcomingRows = n.u ? d.upcoming.map((a, i) => agendaRow(a, i === 0, cap(fmt(a.date, { weekday: "short", day: "numeric" })) + (a.time ? " · " + a.time : ""), base)).join("") : emptyRow("No hay fechas en los próximos siete días.");
  const currentRows = d.current.length ? d.current.filter(a => String(a.materialStatus||"").toLowerCase() !== "al día").map((a, i) => agendaRow({ ...a, action: a.module }, i === 0, a.date ? "Hasta el " + fmt(a.date, { day: "numeric", month: "short" }) : "Sin fecha de fin", base)).join("") : "";
  const pre = `${n.p} ${n.p === 1 ? "aviso" : "avisos"} · ${n.u} ${n.u === 1 ? "fecha" : "fechas"} esta semana · ${n.c} ${n.c === 1 ? "campaña activa" : "campañas activas"}`;

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
    <div class="yw-title" style="font-size:30px; font-weight:800; color:#111111; margin-top:6px; line-height:1.08;">${e(title)}</div>
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
