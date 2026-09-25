type Attachment = { filename: string; content: string };

export function mailConfigured() {
  return Boolean(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("PAVON_EMAIL_FROM") && Netlify.env.get("PAVON_EMAIL_TO"));
}

export async function sendPavonMail(input: { subject: string; html: string; attachments?: Attachment[] }) {
  const apiKey = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("PAVON_EMAIL_FROM");
  const rawTo = Netlify.env.get("PAVON_EMAIL_TO");
  const rawCc = Netlify.env.get("PAVON_EMAIL_CC");
  if (!apiKey || !from || !rawTo) return { sent: false, configured: false, reason: "email_not_configured" };
  const to = rawTo.split(",").map((v) => v.trim()).filter(Boolean);
  const cc = rawCc ? rawCc.split(",").map((v) => v.trim()).filter(Boolean) : undefined;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, ...(cc?.length ? { cc } : {}), subject: input.subject, html: input.html, attachments: input.attachments || [] }),
  });
  if (!r.ok) return { sent: false, configured: true, reason: await r.text(), status: r.status };
  const data = await r.json();
  return { sent: true, configured: true, id: data.id || null };
}
