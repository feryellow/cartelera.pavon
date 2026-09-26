type Attachment = { filename: string; content: string };

// MODO DESARROLLO: mientras Yellow Control esté en pruebas, todos los correos van solo a esta
// dirección, aunque en Netlify haya otros destinatarios o copias. Para abrir el envío a más
// personas hay que poner PAVON_EMAIL_LIVE=true en Netlify (decisión expresa de Fer).
export const DEV_RECIPIENT = "fernando@yellowmedia.es";
// Lee la variable desde Netlify.env y, si no aparece, desde process.env. También acepta el nombre
// con espacios accidentales alrededor (p. ej. "RESEND_API_KEY " copiado con un espacio).
function allEnv(): Record<string, string> {
  let a: Record<string, string> = {};
  try { a = { ...(Netlify.env.toObject?.() || {}) }; } catch {}
  try { for (const [k, v] of Object.entries(process.env)) if (!(k in a) && typeof v === "string") a[k] = v; } catch {}
  return a;
}
export function envVar(k: string) {
  const direct = (Netlify.env.get(k) || (typeof process !== "undefined" ? process.env?.[k] : "") || "").trim();
  if (direct) return direct;
  for (const [name, v] of Object.entries(allEnv())) if (name.trim() === k && String(v).trim()) return String(v).trim();
  return "";
}
// Diagnóstico sin exponer valores: qué nombres parecidos existen y si la clave tiene el formato esperado.
export function mailDiagnostic() {
  const names = Object.keys(allEnv()).filter((n) => /resend|pavon_email/i.test(n)).map((n) => JSON.stringify(n));
  const key = envVar("RESEND_API_KEY");
  return { envNames: names, resendKeyVisible: Boolean(key), resendKeyFormatOk: key.startsWith("re_") };
}
const env = envVar;
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

export function mailRecipients() {
  const live = env("PAVON_EMAIL_LIVE").toLowerCase() === "true";
  if (!live) return { live, to: [DEV_RECIPIENT], cc: [] as string[] };
  return { live, to: list(env("PAVON_EMAIL_TO")), cc: list(env("PAVON_EMAIL_CC")) };
}

export function mailConfigured() {
  const r = mailRecipients();
  return Boolean(env("RESEND_API_KEY") && env("PAVON_EMAIL_FROM") && r.to.length);
}

export async function sendPavonMail(input: { subject: string; html: string; attachments?: Attachment[] }) {
  const apiKey = env("RESEND_API_KEY"), from = env("PAVON_EMAIL_FROM");
  const { to, cc } = mailRecipients();
  if (!apiKey || !from || !to.length) return { sent: false, configured: false, reason: "email_not_configured" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, ...(cc.length ? { cc } : {}), subject: input.subject, html: input.html, attachments: input.attachments || [] }),
  });
  if (!r.ok) return { sent: false, configured: true, reason: await r.text(), status: r.status };
  const data = await r.json();
  return { sent: true, configured: true, id: data.id || null, to, cc };
}
