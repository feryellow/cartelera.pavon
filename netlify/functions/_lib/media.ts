import { createHmac } from "node:crypto";
import { envVar } from "./mailer.ts";

// Enlaces públicos firmados a vídeos y audios de la app (para el resumen mensual):
// cualquiera con el enlace puede ver o escuchar esa pieza, pero no se pueden adivinar otras.
const secret = () => envVar("PAVON_MEDIA_SECRET") || envVar("RESEND_API_KEY") || "yellow-control";
export const mediaSig = (key: string) => createHmac("sha256", secret()).update("media:" + key).digest("hex").slice(0, 20);
export const mediaUrl = (origin: string, key: string, module: string) =>
  `${origin.replace(/\/$/, "")}/api/media?k=${encodeURIComponent(key)}&m=${encodeURIComponent(module)}&s=${mediaSig(key)}`;
