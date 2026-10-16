import { getDeployStore, getStore } from "@netlify/blobs";

// COPIAS DE SEGURIDAD. Una copia diaria (y otra antes de cada restauración), 30 días de retención.
// Datos: todo lo que se guarda como JSON en los almacenes de la app (registros, Diseño, cartelería, ajustes,
// avisos, presupuesto). Imágenes de cartelería y archivos subidos: se copian solo cuando cambian (por contenido)
// y la copia del día apunta a ellos. Restaurar nunca borra lo que hay ahora: solo añade o sobrescribe, y antes
// hace una copia «antes de restaurar» para poder deshacerlo.
const prod = () => Netlify.context?.deploy?.context === "production";
const S = (name: string) => prod() ? getStore(name, { consistency: "strong" }) : getDeployStore(name);
export const backupStore = () => S("pavon-backups");

type StoreDef = { id: string; name: string; skip: RegExp; binary?: RegExp };
export const STORES: StoreDef[] = [
  { id: "control", name: "pavon-control", skip: /^(audit_|audith_|thumbv_)/ },        // el historial se conserva aparte y no se borra
  { id: "carteleria", name: "pavon-carteleria", skip: /^$/, binary: /^image_/ },
  { id: "budget", name: "pavon-budget", skip: /^$/ },
  { id: "assets", name: "pavon-assets", skip: /^(?!meta_|file_)/, binary: /^file_/ },
];
// Módulos que se pueden restaurar por separado (almacén + prefijos de clave)
export const MODULES: { id: string; label: string; store: string; prefixes: string[] }[] = [
  { id: "carteleria", label: "Cartelería", store: "carteleria", prefixes: ["state", "image_", "imagemeta_"] },
  { id: "radio", label: "Radio", store: "control", prefixes: ["record_radio_", "parte_"] },
  { id: "taxis", label: "Taxis", store: "control", prefixes: ["record_taxis_"] },
  { id: "intercambiadores", label: "Intercambiadores", store: "control", prefixes: ["record_intercambiadores_"] },
  { id: "hometicket", label: "Home Ticket", store: "control", prefixes: ["record_hometicket_"] },
  { id: "revistas", label: "Revistas", store: "control", prefixes: ["record_revistas_"] },
  { id: "hitos", label: "Calendario (hitos)", store: "control", prefixes: ["record_hitos_"] },
  { id: "diseno", label: "Diseño", store: "control", prefixes: ["diseno_"] },
  { id: "digital", label: "Digital", store: "control", prefixes: ["meta", "gads"] },
  { id: "avisos", label: "Avisos y contactos", store: "control", prefixes: ["push_", "mail_", "montaje"] },
  { id: "patrocinios", label: "Patrocinios", store: "control", prefixes: ["patro_"] },
  { id: "presupuesto", label: "Presupuesto", store: "budget", prefixes: [""] },
];

export type SnapMeta = { id: string; at: string; reason: string; version: string; stores: Record<string, { keys: number; bytes: number; binaries: number }>; bytes: number; ok: boolean; note?: string };

async function sha(bytes: ArrayBuffer) { const h = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join(""); }
const safe = (k: string) => k.replace(/[^\w.-]/g, "_");

export async function listSnapshots(): Promise<SnapMeta[]> { return ((await backupStore().get("snap_index", { type: "json" })) as SnapMeta[] | null) || []; }

/** Hace una copia completa. budgetMs limita el tiempo dedicado a copiar binarios nuevos (el resto sigue al día siguiente). */
export async function takeSnapshot(reason: string, version: string, budgetMs = 18000): Promise<SnapMeta> {
  const t0 = Date.now(), bs = backupStore();
  const prev = await listSnapshots();
  let id = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"; // 20261015T030012Z
  for (let n = 2; prev.some((m) => m.id === id); n++) id = id.replace(/(-\d+)?$/, "-" + n);
  const meta: SnapMeta = { id, at: new Date().toISOString(), reason, version, stores: {}, bytes: 0, ok: true };
  const pendingBinaries: string[] = [];
  for (const def of STORES) {
    const st = S(def.name), keys = (await st.list()).blobs.map((b) => b.key).filter((k) => !def.skip.test(k));
    const jsonKeys = keys.filter((k) => !def.binary?.test(k)), binKeys = keys.filter((k) => def.binary?.test(k));
    const values = await Promise.all(jsonKeys.map((k) => st.get(k, { type: "json" }).catch(() => undefined)));
    const data: Record<string, unknown> = {};
    jsonKeys.forEach((k, i) => { if (values[i] !== undefined && values[i] !== null) data[k] = values[i]; });
    // Binarios: copia por contenido (solo si no existe ya)
    const bins: Record<string, string> = {};
    for (const k of binKeys) {
      if (Date.now() - t0 > budgetMs) { pendingBinaries.push(`${def.id}:${k}`); continue; }
      try {
        const buf = await st.get(k, { type: "arrayBuffer" }) as ArrayBuffer | null; if (!buf) continue;
        const ref = `bin_${def.id}_${safe(k)}_${await sha(buf)}`;
        if (!(await bs.getMetadata(ref).catch(() => null))) await bs.set(ref, buf);
        bins[k] = ref;
      } catch { pendingBinaries.push(`${def.id}:${k}`); }
    }
    const body = JSON.stringify({ data, bins });
    await bs.set(`snap_${id}_${def.id}`, body);
    meta.stores[def.id] = { keys: Object.keys(data).length, bytes: body.length, binaries: Object.keys(bins).length };
    meta.bytes += body.length;
  }
  if (pendingBinaries.length) meta.note = `${pendingBinaries.length} archivos sin copiar en esta pasada (se copian en la siguiente)`;
  const list = [meta, ...prev];
  // Retención: 30 días (las copias más antiguas y sus datos se borran; los binarios se conservan si otra copia los usa)
  const limit = new Date(Date.now() - 30 * 864e5).toISOString();
  const keep = list.filter((m) => m.at >= limit), drop = list.filter((m) => m.at < limit);
  for (const m of drop) for (const def of STORES) await bs.delete(`snap_${m.id}_${def.id}`).catch(() => null);
  await bs.setJSON("snap_index", keep);
  if (drop.length) await pruneBinaries(keep).catch(() => null);
  return meta;
}

async function pruneBinaries(keep: SnapMeta[]) {
  const bs = backupStore(), used = new Set<string>();
  for (const m of keep) for (const def of STORES) { const s = await readSnap(m.id, def.id); Object.values(s.bins).forEach((r) => used.add(r)); }
  for (const b of (await bs.list({ prefix: "bin_" })).blobs) if (!used.has(b.key)) await bs.delete(b.key);
}

export async function readSnap(id: string, store: string): Promise<{ data: Record<string, unknown>; bins: Record<string, string> }> {
  const raw = await backupStore().get(`snap_${id}_${store}`, { type: "text" });
  return raw ? JSON.parse(raw) : { data: {}, bins: {} };
}

export type Scope = { type: "all" } | { type: "module"; module: string } | { type: "record"; store: string; key: string };
const inScope = (scope: Scope, store: string, key: string) => {
  if (scope.type === "all") return true;
  if (scope.type === "record") return scope.store === store && scope.key === key;
  const m = MODULES.find((x) => x.id === scope.module); if (!m || m.store !== store) return false;
  return m.prefixes.some((p) => p === "" || key === p || key.startsWith(p));
};

/** Plan (dryRun) o restauración. Nunca borra claves actuales que no estén en la copia. */
export async function restore(id: string, scope: Scope, opts: { dryRun: boolean; version: string }) {
  const plan = { add: 0, overwrite: 0, same: 0, keys: [] as string[] };
  const writes: (() => Promise<unknown>)[] = [];
  for (const def of STORES) {
    if (scope.type === "record" && scope.store !== def.id) continue;
    if (scope.type === "module" && MODULES.find((m) => m.id === scope.module)?.store !== def.id) continue;
    const snap = await readSnap(id, def.id), st = S(def.name);
    const keys = [...Object.keys(snap.data), ...Object.keys(snap.bins)].filter((k) => inScope(scope, def.id, k));
    if (keys.length > 5000) throw new Error("Demasiadas claves para una sola restauración");
    for (const k of keys) {
      if (k in snap.data) {
        const cur = await st.get(k, { type: "json" }).catch(() => null);
        const same = cur !== null && JSON.stringify(cur) === JSON.stringify(snap.data[k]);
        if (same) { plan.same++; continue; }
        cur === null ? plan.add++ : plan.overwrite++; plan.keys.push(`${def.id}:${k}`);
        writes.push(() => st.setJSON(k, snap.data[k]));
      } else {
        const ref = snap.bins[k], cur = await st.get(k, { type: "arrayBuffer" }).catch(() => null) as ArrayBuffer | null;
        if (cur && ref.endsWith("_" + await sha(cur))) { plan.same++; continue; }
        writes.push(async () => { const buf = await backupStore().get(ref, { type: "arrayBuffer" }) as ArrayBuffer | null; if (buf) await st.set(k, buf); });
        cur ? plan.overwrite++ : plan.add++; plan.keys.push(`${def.id}:${k}`);
      }
    }
  }
  if (opts.dryRun) return { ...plan, keys: plan.keys.slice(0, 60), applied: false };
  const before = await takeSnapshot("Antes de restaurar " + id, opts.version, 8000);
  for (const w of writes) await w();
  return { ...plan, keys: plan.keys.slice(0, 60), applied: true, undoSnapshot: before.id };
}

/** Lista de registros de un módulo dentro de una copia, con un título legible, para restaurar uno solo. */
export async function snapshotRecords(id: string, module: string) {
  const m = MODULES.find((x) => x.id === module); if (!m) return [];
  const snap = await readSnap(id, m.store);
  return Object.entries(snap.data).filter(([k]) => m.prefixes.some((p) => p === "" || k === p || k.startsWith(p))).map(([k, v]: [string, any]) => ({
    store: m.store, key: k, title: String(v?.spectacle || v?.title || v?.campaignName || v?.name || k).slice(0, 120), date: v?.startDate || v?.date || v?.deadline || v?.month || "", deleted: !!v?.deletedAt,
  })).slice(0, 1000);
}
