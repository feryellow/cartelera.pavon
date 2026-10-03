import type { Config } from "@netlify/functions";
import { requireAccess } from "./_lib/auth.ts";
import { appendAudit } from "./_lib/audit.ts";
import { controlStore } from "./_lib/store.ts";
import { googleClient, GOOGLE_SCOPE } from "./_lib/resenas.ts";

// Conexión con la cuenta de Google que gestiona las fichas (para leer las reseñas).
// POST /api/google-oauth            → (admin) devuelve la URL de Google para dar permiso
// GET  /api/google-oauth?code=…     → vuelta desde Google: guarda el permiso (refresh token) en el servidor
// DELETE /api/google-oauth          → (admin) desconecta
export default async (req: Request) => {
  const url = new URL(req.url), origin = (Netlify.env.get("URL") || url.origin).replace(/\/$/, ""), redirect = `${origin}/api/google-oauth`;
  const c = googleClient(), st = controlStore();
  if (req.method === "POST") {
    const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
    if (!c.id || !c.secret) return Response.json({ error: "Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Netlify." }, { status: 400 });
    const state = crypto.randomUUID();
    await st.setJSON(`google_oauth_state_${state}`, { by: auth.actor!.email, at: Date.now() });
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.search = new URLSearchParams({ client_id: c.id, redirect_uri: redirect, response_type: "code", scope: `${GOOGLE_SCOPE} openid email`, access_type: "offline", prompt: "consent", state }).toString();
    return Response.json({ url: u.toString(), redirect });
  }
  if (req.method === "DELETE") {
    const auth = await requireAccess(req, "admin", true); if (auth.response) return auth.response;
    await st.delete("google_oauth");
    await appendAudit({ actor: auth.actor!, module: "avisos", elementId: "google-oauth", action: "delete", note: "Google desconectado" });
    return Response.json({ ok: true });
  }
  if (req.method === "GET") {
    const back = (msg: string) => Response.redirect(`${origin}/#admin?google=${encodeURIComponent(msg)}`, 302);
    const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "";
    if (url.searchParams.get("error")) return back("cancelado");
    const s: any = state && await st.get(`google_oauth_state_${state}`, { type: "json" });
    if (!s || Date.now() - s.at > 15 * 60000 || !code) return back("caducado");
    await st.delete(`google_oauth_state_${state}`);
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirect, grant_type: "authorization_code" }) });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || !j.refresh_token) return back("sin-permiso");
    let email = ""; try { email = JSON.parse(Buffer.from(String(j.id_token || "").split(".")[1] || "", "base64url").toString()).email || ""; } catch {}
    await st.setJSON("google_oauth", { refresh_token: j.refresh_token, email, at: new Date().toISOString(), by: s.by });
    await appendAudit({ actor: { id: "system", email: s.by } as any, module: "avisos", elementId: "google-oauth", action: "update", note: `Google conectado${email ? " con " + email : ""}` });
    return back("ok");
  }
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: "/api/google-oauth" };
