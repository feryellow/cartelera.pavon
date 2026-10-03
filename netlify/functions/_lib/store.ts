import { getDeployStore, getStore } from "@netlify/blobs";

export function controlStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-control", { consistency: "strong" })
    : getDeployStore("pavon-control");
}

export function carteleriaStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-carteleria", { consistency: "strong" })
    : getDeployStore("pavon-carteleria");
}

export function assetStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-assets", { consistency: "strong" })
    : getDeployStore("pavon-assets");
}

export function notificationStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-notifications", { consistency: "strong" })
    : getDeployStore("pavon-notifications");
}

/** Lee varias claves en paralelo (de 16 en 16) en lugar de una tras otra. Mantiene el orden y omite las vacías. */
export async function getManyJSON<T = any>(store: { get: (k: string, o: { type: "json" }) => Promise<any> }, keys: string[], concurrency = 16): Promise<T[]> {
  const out: (T | null)[] = new Array(keys.length).fill(null);
  let i = 0;
  const worker = async () => { while (i < keys.length) { const n = i++; try { out[n] = await store.get(keys[n], { type: "json" }); } catch { out[n] = null; } } };
  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, worker));
  return out.filter((x): x is T => x != null);
}
