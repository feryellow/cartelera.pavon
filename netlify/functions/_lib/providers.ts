import { controlStore } from "./store.ts";
import { listRecords } from "./records.ts";
import { mediaUrl } from "./media.ts";
import { loadContracts } from "./radio.ts";

// Portal de proveedores: cada proveedor ve solo sus piezas (sin importes) y puede pedir el material.
// Plazos: radio y vídeo, 3 días antes de que empiece; revistas, en su fecha de cierre de edición.
export type Provider = { id: string; name: string; kind: "radio" | "revista" | "video"; contracts?: string[]; magazine?: string; lead?: number };
export const PROVIDERS: Provider[] = [
  { id: "kiss-fm", name: "Kiss FM", kind: "radio", contracts: ["pavon-kiss-2026-27", "principe-kiss-2026"], lead: 3 },
  { id: "atresmedia", name: "Atresmedia (Onda Cero · Europa FM · Melodía FM)", kind: "radio", contracts: ["principe-atresmedia-2026"], lead: 3 },
  { id: "revista-teatros", name: "Revista Teatros", kind: "revista", magazine: "Revista Teatros" },
  { id: "aescena", name: "AEscena", kind: "revista", magazine: "AEscena" },
  { id: "godot", name: "Godot", kind: "revista", magazine: "Godot" },
  { id: "clece", name: "Clece · intercambiadores", kind: "video", lead: 3 },
];
export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id) || null;

// Qué proveedor tiene asignado cada cuenta (correo → id de proveedor)
export async function providerUsers(): Promise<Record<string, string>> {
  const v = await controlStore().get("provider_users", { type: "json" }) as Record<string, string> | null;
  return v && typeof v === "object" ? v : {};
}
export async function setProviderUser(email: string, id: string) {
  const m = await providerUsers(), e = email.trim().toLowerCase();
  if (id) m[e] = id; else delete m[e];
  await controlStore().setJSON("provider_users", m);
}

const D = (s: string) => new Date(s + "T12:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, k: number) => { const d = D(s); d.setUTCDate(d.getUTCDate() + k); return iso(d); };
const monthAdd = (m: string, k: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + k, 1)); return d.toISOString().slice(0, 7); };
const short = (v: string) => String(v || "").replace("Gran Teatro CaixaBank ", "").replace("Gran Teatro ", "");

export type ProviderItem = { id: string; module: string; month: string; title: string; detail: string; startDate?: string; endDate?: string; deadline?: string; ready: boolean; media?: { kind: "audio" | "video" | "image"; url: string; name?: string } };

// Piezas del proveedor desde el mes anterior hasta tres meses después. Nunca incluye importes ni notas internas.
export async function providerItems(p: Provider, origin: string, today: string): Promise<{ months: string[]; items: ProviderItem[] }> {
  const cur = today.slice(0, 7), months = [-1, 0, 1, 2, 3].map((k) => monthAdd(cur, k));
  const first = `${months[0]}-01`, last = `${monthAdd(months[months.length - 1], 1)}-01`;
  const items: ProviderItem[] = [];
  if (p.kind === "radio") {
    const contracts = (await loadContracts(origin).catch(() => [] as any[])).filter((c: any) => p.contracts!.includes(c.id));
    const lineOf = (r: any) => { for (const c of contracts) { const l = (c.lines || []).find((x: any) => x.id === r.lineId); if (l) return { c, l }; } return null; };
    for (const r of await listRecords("radio")) {
      if (!p.contracts!.includes(r.contractId) || !months.includes(r.inventoryMonth) || !(Number(r.plannedSpots) > 0)) continue;
      const cl = lineOf(r), station = cl?.l?.station || r.station || "", unit = r.unit || cl?.l?.unit || "cuñas";
      items.push({ id: r.id, module: "radio", month: r.inventoryMonth, title: r.spotName || r.spectacle || r.campaignName || "Cuña",
        detail: [r.spectacle || r.campaignName, short(r.venue || cl?.c?.venue), station, `${r.plannedSpots} ${unit}`, r.duration].filter(Boolean).join(" · "),
        startDate: r.startDate, endDate: r.endDate, deadline: r.startDate ? addDays(r.startDate, -(p.lead || 3)) : undefined,
        ready: !!r.assetKey, media: r.assetKey ? { kind: "audio", url: mediaUrl(origin, r.assetKey, "radio"), name: r.assetName } : undefined });
    }
  } else if (p.kind === "revista") {
    const hitos = (await listRecords("hitos")).filter((h) => h.type === "Cierre de edición");
    for (const r of await listRecords("revistas")) {
      if (r.magazine !== p.magazine || r.deal === "intercambio" || !months.includes(r.month)) continue;
      const mag = (p.magazine || "").replace("Revista ", "").toLowerCase();
      const h = hitos.find((x) => String((x.title || "") + " " + (x.place || "")).toLowerCase().includes(mag) && String(x.date || "").slice(0, 7) <= r.month && String(x.date || "") >= addDays(`${r.month}-01`, -45));
      const pdf = /\.pdf$/i.test(r.assetName || "");
      items.push({ id: r.id, module: "revistas", month: r.month, title: r.spectacle || "Página sin espectáculo",
        detail: ["Una página", short(r.venue)].filter(Boolean).join(" · "), deadline: r.deliveryDate || h?.date || undefined,
        ready: !!r.assetKey, media: r.assetKey && !pdf ? { kind: "image", url: mediaUrl(origin, r.assetKey, "revistas"), name: r.assetName } : undefined });
    }
  } else if (p.kind === "video") {
    for (const r of await listRecords("intercambiadores")) {
      const s = r.startDate || r.endDate, e = r.endDate || r.startDate; if (!s || s >= last || e < first) continue;
      const vid = /\.(mp4|mov|m4v|webm)$/i.test(r.assetName || "");
      items.push({ id: r.id, module: "intercambiadores", month: String(s).slice(0, 7) < months[0] ? months[0] : String(s).slice(0, 7), title: r.spectacle || r.campaignName || "Campaña",
        detail: [short(r.venue), r.support].filter(Boolean).join(" · "), startDate: r.startDate, endDate: r.endDate,
        deadline: r.startDate ? addDays(r.startDate, -(p.lead || 3)) : undefined, ready: !!r.assetKey,
        media: r.assetKey ? { kind: vid ? "video" : "image", url: mediaUrl(origin, r.assetKey, "intercambiadores"), name: r.assetName } : undefined });
    }
  }
  items.sort((a, b) => (a.month + (a.startDate || "")).localeCompare(b.month + (b.startDate || "")));
  return { months, items };
}

// Solicitudes de material hechas por proveedores
export type ProviderRequest = { id: string; provider: string; providerName: string; email: string; module: string; itemId: string; itemTitle: string; itemDetail: string; deadline?: string; message: string; createdAt: string; hitoId?: string };
export async function saveRequest(r: ProviderRequest) { await controlStore().setJSON(`provreq_${r.id}`, r); }
export async function listRequests(): Promise<ProviderRequest[]> {
  const st = controlStore(), res = await st.list({ prefix: "provreq_" }), out: ProviderRequest[] = [];
  for (const b of res.blobs) { const v = await st.get(b.key, { type: "json" }) as ProviderRequest | null; if (v) out.push(v); }
  return out.sort((a, b) => String(a.deadline || "9999").localeCompare(String(b.deadline || "9999")));
}
