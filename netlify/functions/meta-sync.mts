import type { Config } from "@netlify/functions";
import { syncMeta, metaApiReady } from "./_lib/meta-api.ts";
import { sendPush } from "./_lib/push.ts";

// Cada mañana trae de Meta el mes en curso (por anuncio y día). 05:15 UTC = 07:15 en verano, 06:15 en invierno.
export default async () => {
  if (!(await metaApiReady())) { console.log("meta-sync: sin META_ACCESS_TOKEN, no se hace nada"); return; }
  const r = await syncMeta("programada");
  console.log("meta-sync", JSON.stringify(r));
  if (!r.ok) await sendPush("all", { title: "Digital: no se ha podido leer Meta", body: String((r as any).error || "Error sin detalle"), url: "/#meta", tag: "meta" }).catch(() => null);
};
export const config: Config = { schedule: "15 5 * * *" };
