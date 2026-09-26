type Attachment = { filename: string; content: string };

// MODO DESARROLLO: mientras Yellow Control esté en pruebas, todos los correos van solo a esta
// dirección, aunque en Netlify haya otros destinatarios o copias. Para abrir el envío a más
// personas hay que poner PAVON_EMAIL_LIVE=true en Netlify (decisión expresa de Fer).
export const DEV_RECIPIENT = "fernando@yellowmedia.es";
const env = (k: string) => (Netlify.env.get(k) || "").trim();
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
