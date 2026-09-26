// Plantilla del resumen diario por correo. HTML con tablas y estilos en línea para que se vea
// igual en Gmail, Outlook y el correo del iPhone.
export type DigestItem = { module: string; title: string; location: string; action: string; date: string; days?: number; materialStatus?: string; time?: string; link?: string; kind?: string };
export type DigestInput = { day: string; test?: boolean; appUrl: string; pending: DigestItem[]; upcoming: DigestItem[]; current: DigestItem[]; devRecipient?: string };

const e = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
const COLOR: Record<string, string> = { montaje: "#FFD400", retirada: "#FF8A65", inicio: "#6FBF73", fin: "#9E978A", entrega: "#FF6B5E", hito: "#5B9BE6" };
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const DISPLAY = "Impact,'Arial Narrow Bold','Arial Black',sans-serif";

function longDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  const s = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shortDate(iso: string) { return new Date(iso + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(".", ""); }
function when(a: DigestItem) {
  if (a.days === undefined) return shortDate(a.date);
  if (a.days < 0) return "Fuera de plazo";
  if (a.days === 0) return "Hoy";
  if (a.days === 1) return "Mañana";
  return "En " + a.days + " días";
}
function item(a: DigestItem, color: string, right: string, urgent = false) {
  const title = a.link ? `<a href="${e(a.link)}" style="color:#131313;text-decoration:none">${e(a.title)}</a>` : e(a.title);
  return `<tr><td style="padding:0 0 10px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #ECE8DE;border-radius:10px">
<tr><td width="5" style="background:${color};border-radius:10px 0 0 10px;font-size:0">&nbsp;</td>
<td style="padding:12px 14px;font-family:${FONT}">
<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B665D">${e(a.action)} · ${e(a.module)}</div>
<div style="font-size:16px;font-weight:700;color:#131313;margin-top:3px;line-height:1.3">${a.time ? e(a.time) + " · " : ""}${title}</div>
${a.location ? `<div style="font-size:13px;color:#6B665D;margin-top:2px">${e(a.location)}</div>` : ""}
</td>
<td align="right" valign="top" style="padding:12px 14px;font-family:${FONT};white-space:nowrap">
<div style="font-size:12px;font-weight:700;color:${urgent ? "#C0392B" : "#131313"}">${e(right)}</div>
${a.days !== undefined ? `<div style="font-size:12px;color:#6B665D;margin-top:3px">${e(shortDate(a.date))}</div>` : ""}${a.materialStatus ? `<div style="font-size:12px;color:#6B665D;margin-top:3px">${e(a.materialStatus)}</div>` : ""}
</td></tr></table></td></tr>`;
}
function section(title: string, note: string, rows: string) {
  return `<tr><td style="padding:26px 28px 6px 28px;font-family:${FONT}">
<div style="font-family:${DISPLAY};font-size:22px;letter-spacing:.02em;color:#131313;text-transform:uppercase">${e(title)}</div>
${note ? `<div style="font-size:13px;color:#6B665D;margin-top:2px">${e(note)}</div>` : ""}
</td></tr><tr><td style="padding:8px 28px 0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;
}
const empty = (t: string) => `<tr><td style="padding:12px 14px;font-family:${FONT};font-size:14px;color:#6B665D;background:#ffffff;border:1px dashed #DDD7CA;border-radius:10px">${e(t)}</td></tr>`;

export function renderDigest(d: DigestInput) {
  const k = (n: number, label: string, color: string) => `<td width="33%" valign="top" style="padding:0 5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F1E1C;border-radius:10px"><tr><td style="padding:12px 14px;font-family:${FONT}">
<div style="font-family:${DISPLAY};font-size:30px;color:${color};line-height:1">${n}</div><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C9C3B6;margin-top:6px">${e(label)}</div></td></tr></table></td>`;
  const pendingRows = d.pending.length ? d.pending.map((a) => item(a, a.days !== undefined && a.days < 0 ? "#C0392B" : COLOR[a.kind || "entrega"] || "#FF6B5E", when(a), (a.days ?? 9) <= 0)).join("") : empty("Nada urgente hoy: no hay entregas ni cambios en los próximos días.");
  const upcomingRows = d.upcoming.length ? d.upcoming.map((a) => item(a, COLOR[a.kind || ""] || "#FFD400", shortDate(a.date))).join("") : empty("No hay fechas en los próximos siete días.");
  const currentRows = d.current.length ? d.current.map((a) => item(a, "#E4DFD3", a.date ? "Hasta " + shortDate(a.date) : "Sin fecha de fin")).join("") : empty("No hay campañas activas registradas.");
  const pre = `${d.pending.length ? d.pending.length + (d.pending.length === 1 ? " aviso" : " avisos") + " que requieren atención" : "Sin avisos urgentes"} · ${d.upcoming.length} fechas esta semana`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Yellow Control · ${e(d.day)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EA">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FAF8F3;border-radius:14px;overflow:hidden">
<tr><td style="background:#131313;padding:0"><div style="height:6px;background:#FFD400;font-size:0">&nbsp;</div></td></tr>
<tr><td style="background:#131313;padding:22px 28px 24px 28px;font-family:${FONT}">
${d.test ? `<div style="display:inline-block;background:#FFD400;color:#131313;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 8px;border-radius:4px;margin-bottom:10px">Prueba</div>` : ""}
<div style="font-family:${DISPLAY};font-size:34px;letter-spacing:.02em;color:#FFD400;line-height:1">YELLOW CONTROL</div>
<div style="font-size:15px;color:#F2EFE6;margin-top:8px">Resumen del ${e(longDate(d.day).toLowerCase())}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px -5px 0 -5px"><tr>
${k(d.pending.length, "Requieren atención", d.pending.length ? "#FF6B5E" : "#FFD400")}${k(d.upcoming.length, "Fechas esta semana", "#FFD400")}${k(d.current.length, "Campañas activas", "#F2EFE6")}
</tr></table></td></tr>
${section("Requiere atención", "Entregas de material, cambios de cartelería y fines de campaña próximos.", pendingRows)}
${section("Próximos 7 días", "Montajes, campañas e hitos de comunicación.", upcomingRows)}
${section("Material activo", "Campañas en curso y estado de su material.", currentRows)}
<tr><td align="center" style="padding:26px 28px 8px 28px">
<a href="${e(d.appUrl)}" style="display:inline-block;background:#FFD400;color:#131313;font-family:${FONT};font-size:15px;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:9px">Abrir Yellow Control</a>
</td></tr>
<tr><td style="padding:18px 28px 26px 28px;font-family:${FONT};font-size:12px;color:#8A8478;line-height:1.5;border-top:1px solid #ECE8DE">
Aviso automático de Yellow Control · Yellow Media. Se envía cada día a las 9:00 si hay novedades.${d.devRecipient ? `<br>Modo desarrollo: este correo solo se envía a ${e(d.devRecipient)}.` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
}
