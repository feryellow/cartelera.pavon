import type { MonthSummary } from "./monthly.ts";
// Correo de resumen mensual con la base de la plantilla Somos Yellow.
const e = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
const Y = "#f4c300";

function quickRead(s: MonthSummary) {
  const t = Object.fromEntries(s.totals.map((x) => [x.label, x.value]));
  const parts = s.totals.filter((x) => x.value > 0).map((x) => `${x.value.toLocaleString("es-ES")} ${x.label}`);
  const specs = new Map<string, number>();
  for (const sec of s.sections) for (const l of sec.lines) if (sec.key !== "radio" && sec.key !== "hitos" && !l.title.startsWith("Montaje")) specs.set(l.title, (specs.get(l.title) || 0) + 1);
  const top = [...specs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v} ${v === 1 ? "soporte" : "soportes"})`);
  return (parts.length ? `En ${s.label.toLowerCase()}: ${parts.join(", ")}.` : `No hay publicidad registrada en ${s.label.toLowerCase()}.`) + (top.length ? ` Más presencia: ${top.join(", ")}.` : "") + (t["cuñas asignadas"] ? " Las cuñas son las asignadas; faltan los certificados de emisión." : "");
}

export function renderMonthly(s: MonthSummary, o: { appUrl: string; test?: boolean; devRecipient?: string }) {
  const base = o.appUrl.replace(/\/$/, "");
  const kpis = s.totals.filter((x) => x.value > 0).slice(0, 6);
  const kpiRows: string[] = [];
  for (let i = 0; i < kpis.length; i += 3) kpiRows.push(`<tr>${kpis.slice(i, i + 3).map((k) => `<td width="33%" valign="top" style="padding:0 10px 12px 0;"><div style="font-size:24px; font-weight:800; color:#111111; line-height:1;">${k.value.toLocaleString("es-ES")}</div><div style="font-size:11px; color:#555555; margin-top:4px;">${e(k.label)}</div></td>`).join("")}</tr>`);
  const sections = s.sections.map((sec) => `
  <tr><td class="yw-pad" style="padding:26px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#111111;">${e(sec.name.toUpperCase())} · ${sec.lines.length}</div>
    <div style="height:2px; background:${Y}; margin-top:6px;"></div>
  </td></tr>
  ${sec.lines.length ? sec.lines.map((l, i) => `<tr><td class="yw-pad" style="padding:${i ? "10px" : "14px"} 32px 0;"><div style="font-size:13px; color:#111111; line-height:1.5;${i ? " border-top:1px solid #eeeeee; padding-top:10px;" : ""}"><b>${e(l.title)}</b>${l.detail ? ` · <span style="color:#444444;">${e(l.detail)}</span>` : ""}</div></td></tr>`).join("") : `<tr><td class="yw-pad" style="padding:14px 32px 0;"><div style="font-size:13px; color:#777777;">Sin registros este mes.</div></td></tr>`}`).join("");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Resumen de publicidad · ${e(s.label)}</title>
<style>
  .yw-container { width: 520px; max-width: 520px; }
  @media only screen and (max-width: 560px) {
    .yw-container { width: 100% !important; max-width: 100% !important; }
    .yw-stack { display: block !important; width: 100% !important; text-align: left !important; }
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
  ${kpiRows.length ? `<tr><td class="yw-pad" style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;"><tr><td style="padding:14px 16px 2px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${kpiRows.join("")}</table></td></tr></table></td></tr>` : ""}
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
