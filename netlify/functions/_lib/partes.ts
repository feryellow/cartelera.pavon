import { controlStore, getManyJSON } from "./store.ts";
import { mediaSig } from "./media.ts";
import { listRecords } from "./records.ts";
import type { Provider } from "./providers.ts";

// Partes de emisión que suben las emisoras (o administración en su nombre).
// Un parte es un archivo (PDF, Excel o imagen) de un mes concreto. Se guarda en controlStore como parte_<id>
// y el archivo en assetStore como file_parte-<id>.
export type Parte = {
  id: string; provider: string; providerName: string; month: string; note: string;
  fileName: string; contentType: string; size: number;
  createdAt: string; createdBy: string; deletedAt: string | null; deletedBy?: string;
};

export const PARTE_TYPES: Record<string, string> = {
  pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel",
  csv: "text/csv", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
};
// Tipo del archivo a partir de su extensión (los navegadores no siempre mandan bien el de los Excel)
export const parteType = (name: string) => PARTE_TYPES[(String(name).split(".").pop() || "").toLowerCase()] || "";
export const parteFileKey = (id: string) => `parte-${id}`;
export const parteUrl = (origin: string, id: string) => `${origin.replace(/\/$/, "")}/api/partes?file=${encodeURIComponent(id)}&s=${mediaSig("parte:" + id)}`;
export const parteSigOk = (id: string, s: string | null) => !!s && s === mediaSig("parte:" + id);

export async function getParte(id: string): Promise<Parte | null> {
  return (await controlStore().get(`parte_${id}`, { type: "json" })) as Parte | null;
}
export async function putParte(p: Parte) { await controlStore().setJSON(`parte_${p.id}`, p); }
export async function listPartes(provider?: string): Promise<Parte[]> {
  const st = controlStore(), res = await st.list({ prefix: "parte_" });
  const all = await getManyJSON<Parte>(st, res.blobs.map((b) => b.key));
  return all.filter((p) => p && !p.deletedAt && (!provider || p.provider === provider))
    .sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
}

const monthAdd = (m: string, k: number) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + k, 1)).toISOString().slice(0, 7); };
// Meses ya cerrados (hasta 6 atrás) en los que la emisora tenía cuñas planificadas: de esos se espera parte
export async function expectedMonths(p: Provider, today: string) {
  const cur = today.slice(0, 7), from = monthAdd(cur, -6), out = new Set<string>();
  for (const r of await listRecords("radio")) {
    if (!p.contracts?.includes(r.contractId) || !(Number(r.plannedSpots) > 0)) continue;
    const m = String(r.inventoryMonth || ""); if (m && m < cur && m >= from) out.add(m);
  }
  return [...out].sort().reverse();
}
