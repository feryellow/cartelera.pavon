import type { Config } from "@netlify/functions";
import { requestPasswordRecovery } from "@netlify/identity";

// POST {email}: envía el correo de Netlify para crear una contraseña nueva.
// Responde igual exista o no la cuenta, para no revelar qué correos tienen acceso.
export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let email = ""; try { email = String((await req.json())?.email || "").trim().toLowerCase(); } catch {}
  if (!/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(email)) return Response.json({ error: "Escribe tu correo" }, { status: 400 });
  try { await requestPasswordRecovery(email); } catch (e) { console.error("recover", email, e); }
  return Response.json({ ok: true });
};
export const config: Config = { path: "/api/recover" };
