import { controlStore } from "./store.ts";

export const MODULES = ["radio", "publicidad", "taxis", "intercambiadores", "hometicket"] as const;
export type RecordModule = typeof MODULES[number];

export function validModule(v: string | null): v is RecordModule {
  return MODULES.includes(v as RecordModule);
}

export async function listRecords(moduleName: RecordModule, includeDeleted = false) {
  const store = controlStore();
  const res = await store.list({ prefix: `record_${moduleName}_` });
  const rows: any[] = [];
  for (const b of res.blobs) {
    const row = await store.get(b.key, { type: "json" });
    if (row && (includeDeleted || !row.deletedAt)) rows.push(row);
  }
  return rows.sort((a,b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

export async function getRecord(moduleName: RecordModule, id: string) {
  return controlStore().get(`record_${moduleName}_${id}`, { type: "json" }) as Promise<any | null>;
}

export async function putRecord(moduleName: RecordModule, id: string, value: unknown) {
  await controlStore().setJSON(`record_${moduleName}_${id}`, value);
}

const allowed: Record<RecordModule,string[]> = {
  radio: ["venue","spectacle","station","campaignName","spotName","assetKey","assetName","duration","startDate","endDate","frequency","timeSlot","notes","contact","status","materialStatus","deliveryDate"],
  publicidad: ["spectacle","support","format","provider","startDate","endDate","assetKey","assetName","contact","agreement","notes","status","category","location"],
  taxis: ["spectacle","campaignName","support","format","provider","startDate","endDate","assetKey","assetName","contact","agreement","notes","status","location","materialStatus","deliveryDate"],
  intercambiadores: ["spectacle","campaignName","support","format","provider","startDate","endDate","assetKey","assetName","contact","agreement","notes","status","location","materialStatus","deliveryDate"],
  hometicket: ["venue","position","spectacle","startDate","endDate","assetKey","assetName","notes","status","materialStatus","deliveryDate"],
};

export function cleanInput(moduleName: RecordModule, input: any) {
  const out: Record<string, any> = {};
  for (const key of allowed[moduleName]) {
    const v = input?.[key];
    if (typeof v === "string") out[key] = v.trim().slice(0, key === "notes" || key === "agreement" ? 6000 : 500);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out;
}

export function isActive(row: any, now: Date = new Date()) {
  if (!(now instanceof Date)) now = new Date();
  if (row.deletedAt) return false;
  if (String(row.status || "").toLowerCase() === "finalizado") return false;
  const today = now.toISOString().slice(0,10);
  const start = row.startDate || "";
  const end = row.endDate || "";
  return (!start || start <= today) && (!end || end >= today);
}
