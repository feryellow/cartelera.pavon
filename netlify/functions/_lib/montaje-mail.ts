// Correo de confirmación de montaje, con la base de la plantilla Somos Yellow.
// Las fotos van incrustadas en el propio correo (cid:), así se ven sin depender de la web.
export type MontajeItem = { name: string; title: string; cid?: string };
export type MontajeInput = { date: string; by: string; note: string; items: MontajeItem[]; appUrl: string; assetBase?: string; test?: boolean; devRecipient?: string; intendedTo?: string[]; intendedCc?: string[] };

const e = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
const Y = "#f4c300";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00Z").toLocaleDateString("es-ES", { ...o, timeZone: "UTC" }).replace(/\./g, "");

export function montajeTitle(items: MontajeItem[]) {
  const names = items.map((i) => i.name);
  const list = names.length > 1 ? names.slice(0, -1).join(", ") + " y " + names[names.length - 1] : names[0] || "";
  return names.length > 1 ? `${list} ya están montados` : `${list} ya está montado`;
}

export function renderMontaje(d: MontajeInput) {
  const base = (d.assetBase || d.appUrl).replace(/\/$/, "");
  const title = montajeTitle(d.items);
  const quick = d.note.trim() || `Montaje confirmado el ${fmt(d.date, { weekday: "long", day: "numeric", month: "long" })} en la fachada del Gran Teatro Pavón.`;
  const items = d.items.map((it, i) => `
  <tr><td class="yw-pad" style="padding:${i ? "22px" : "16px"} 32px 0;">
    <div style="font-size:10px; font-weight:bold; letter-spacing:0.03em; color:#777777;">${e(it.name.toUpperCase())} · INSTALADO</div>
    <div style="font-size:15px; font-weight:800; color:#111111; margin-top:4px;">${e(it.title || "Sin espectáculo indicado")}</div>
    ${it.cid ? `<img src="cid:${e(it.cid)}" width="456" alt="Foto del montaje: ${e(it.name)}" style="display:block; width:100%; max-width:456px; height:auto; border:0; margin-top:10px;">` : `<div style="font-size:13px; color:#777777; margin-top:4px;">Sin foto adjunta.</div>`}
  </td></tr>`).join("");
  const devNote = d.devRecipient ? `<tr><td class="yw-pad" style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8d6; border:1px solid ${Y};"><tr><td style="padding:10px 14px; font-size:12px; color:#412402; line-height:1.5;">
      <b>Modo desarrollo:</b> este correo solo te llega a ti. En producción iría a: ${e((d.intendedTo || []).join(", ") || "—")}${d.intendedCc?.length ? `<br>Con copia a: ${e(d.intendedCc.join(", "))}` : ""}</td></tr></table></td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Montaje realizado · Gran Teatro Pavón</title>
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
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${e(title)} · Gran Teatro Pavón</div>
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
            <div style="font-size:10px; font-weight:bold; letter-spacing:0.06em; color:#ffffff; white-space:nowrap; text-align:center;">MONTAJE REALIZADO${d.test ? " · PRUEBA" : ""}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:4px auto 0;"><tr>
              <td style="background:${Y}; padding:2px 10px; text-align:center;"><span style="font-size:10px; font-weight:bold; color:#2b2b2b; white-space:nowrap;">${e(fmt(d.date, { day: "numeric", month: "short", year: "numeric" }).toUpperCase())}</span></td>
            </tr></table>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td class="yw-pad" style="padding:0 32px;"><div style="height:3px; background:${Y};"></div></td></tr>

  <tr><td class="yw-pad" style="padding:20px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#555555;">CARTELERÍA · GRAN TEATRO PAVÓN · ${e(fmt(d.date, { weekday: "long", day: "numeric", month: "long" }).toUpperCase())}</div>
    <div class="yw-title" style="font-size:22px; font-weight:800; color:#111111; margin-top:6px; line-height:1.25;">${e(title)}</div>
  </td></tr>
  ${devNote}
  <tr><td class="yw-pad" style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yw-dark-block" style="background:#111111;"><tr><td style="padding:20px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" style="padding-right:12px;"><span style="color:${Y}; font-size:20px;">&#10022;</span></td>
        <td><div style="font-size:16px; font-weight:800; color:#ffffff;">Lectura rápida.</div>
          <div style="font-size:13px; color:#cccccc; margin-top:6px; line-height:1.6;">${e(quick)}</div></td>
      </tr></table>
    </td></tr></table>
  </td></tr>

  <tr><td class="yw-pad" style="padding:26px 32px 0;">
    <div style="font-size:11px; font-weight:bold; letter-spacing:0.04em; color:#111111;">SOPORTES CAMBIADOS · ${d.items.length}</div>
    <div style="height:2px; background:${Y}; margin-top:6px;"></div>
  </td></tr>
  ${items}

  <tr><td class="yw-pad" style="padding:22px 32px 0;"><div style="font-size:12px; color:#666666;">Confirmado por ${e(d.by)}.</div></td></tr>
  <tr><td class="yw-pad" align="center" style="padding:24px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${Y}; border-radius:999px;">
      <a href="${e(d.appUrl)}/#carteleria" style="display:inline-block; padding:11px 24px; font-size:13px; font-weight:bold; color:#111111; text-decoration:none;">Ver la fachada en Yellow Control</a>
    </td></tr></table>
  </td></tr>

  <tr><td class="yw-pad" style="padding:32px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yw-dark-block" style="background:#111111;"><tr><td class="yw-pad" style="padding:24px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle">
        <div style="font-size:14px; font-weight:800; color:${Y}; margin-top:12px;">Lo hacemos y ya vemos.</div>
        <div style="font-size:11px; color:#999999; margin-top:2px;">Cartelería del Gran Teatro Pavón · Yellow Control.</div>
      </td></tr></table>
    </td></tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
