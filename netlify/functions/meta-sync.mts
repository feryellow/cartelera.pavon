import type { Config } from "@netlify/functions";
import { syncMeta, metaApiReady } from "./_lib/meta-api.ts";
import { notifyPush, recordHealth, adminAlert } from "./_lib/notify.ts";

// Cada mañana trae de Meta el mes en curso (por anuncio y día). 05:15 UTC = 07:15 en verano, 06:15 en invierno.
export default async () => {
  if (!(await metaApiReady())) { console.log("meta-sync: sin META_ACCESS_TOKEN, no se hace nada"); return; }
  const r = await syncMeta("programada");
  console.log("meta-sync", JSON.stringify(r));
  await recordHealth("meta", !!r.ok, r.ok ? "lectura correcta" : String((r as any).error || "Error sin detalle"));
  if (!r.ok) { await notifyPush("all", { title: "Digital: no se ha podido leer Meta", body: String((r as any).error || "Error sin detalle"), url: "/#meta", tag: "meta" }, "meta"); await adminAlert("meta", "No se ha podido leer Meta"); }
};
export const config: Config = { schedule: "15 5 * * *" };
