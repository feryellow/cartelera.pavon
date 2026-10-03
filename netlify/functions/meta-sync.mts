import type { Config } from "@netlify/functions";
import { syncMeta, metaApiReady } from "./_lib/meta-api.ts";

// Cada mañana trae de Meta el mes en curso (por anuncio y día). 05:15 UTC = 07:15 en verano, 06:15 en invierno.
export default async () => {
  if (!metaApiReady()) { console.log("meta-sync: sin META_ACCESS_TOKEN, no se hace nada"); return; }
  const r = await syncMeta("programada");
  console.log("meta-sync", JSON.stringify(r));
};
export const config: Config = { schedule: "15 5 * * *" };
