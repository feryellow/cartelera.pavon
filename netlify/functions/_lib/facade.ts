import { Jimp } from "jimp";
import { carteleriaStore } from "./store.ts";

// Composición de la fachada del Pavón en el servidor (misma geometría que Cartelería en la app):
// foto de la fachada + cada cartel colocado en su soporte. Se usa en el resumen mensual.
export const FACADE_VIEWS = [
  { id: "taquilla", name: "Taquilla cerrada", img: "/assets/facade/taquilla.jpg" },
  { id: "lona", name: "Lona y secundarios", img: "/assets/facade/lona.jpg" },
  { id: "abierta", name: "Taquilla abierta", img: "/assets/facade/abierta.jpg" },
  { id: "columna", name: "Columna 1", img: "/assets/columna1.jpg" },
];
export const FACADE_SLOTS: { key: string; view: string; r: number[] }[] = [
  { key: "taquilla__secundario-1", view: "taquilla", r: [19.06, 40.06, 13.54, 27.90] },
  { key: "taquilla__taquilla-izq", view: "taquilla", r: [35.77, 40.79, 11.67, 26.89] },
  { key: "taquilla__taquilla-der", view: "taquilla", r: [50.97, 40.70, 11.05, 26.98] },
  { key: "taquilla__secundario-2", view: "taquilla", r: [66.02, 40.06, 12.50, 27.81] },
  { key: "lona__lona", view: "lona", r: [19.16, 9.75, 64.25, 29.39] },
  { key: "lona__sec1", view: "lona", r: [12.38, 47.63, 26.05, 16.57] },
  { key: "lona__sec2", view: "lona", r: [38.90, 47.77, 25.12, 16.43] },
  { key: "lona__sec3", view: "lona", r: [65.19, 47.77, 24.88, 16.57] },
  { key: "abierta__taquilla-izq-abierta", view: "abierta", r: [3.59, 15.86, 21.04, 40.70] },
  { key: "abierta__taquilla-der-abierta", view: "abierta", r: [81.92, 16.29, 15.75, 39.97] },
  { key: "taquilla__columna_1", view: "columna", r: [67.0, 39.2, 18.1, 25.3] },
];

async function slotBytes(key: string): Promise<Buffer | null> {
  const b = await carteleriaStore().get(`image_${key}`, { type: "arrayBuffer" }) as ArrayBuffer | null;
  if (!b) return null;
  const bytes = Buffer.from(b), head = bytes.subarray(0, 32).toString();
  if (head.startsWith("data:image/")) { const m = bytes.toString().match(/base64,(.+)$/); return m ? Buffer.from(m[1], "base64") : null; }
  return bytes;
}

// Huella de la vista: cambia si cambia cualquier cartel o su encuadre, para no reutilizar una composición antigua
export async function facadeVersion(viewId: string) {
  const state: any = await carteleriaStore().get("state", { type: "json" }) || {};
  const parts: string[] = [];
  for (const s of FACADE_SLOTS.filter((x) => x.view === viewId)) {
    const meta: any = await carteleriaStore().get(`imagemeta_${s.key}`, { type: "json" });
    parts.push(`${s.key}:${meta?.updatedAt || meta?.size || 0}:${state.slots?.[s.key]?.mode || "contain"}:${state.slots?.[s.key]?.hasImage ? 1 : 0}`);
  }
  let h = 0; for (const c of parts.join("|")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

export async function facadeComposite(viewId: string, origin: string, width = 900): Promise<Buffer | null> {
  const v = FACADE_VIEWS.find((x) => x.id === viewId); if (!v) return null;
  const state: any = await carteleriaStore().get("state", { type: "json" }) || {};
  const r = await fetch(new URL(v.img, origin)); if (!r.ok) return null;
  const bg = await Jimp.read(Buffer.from(await r.arrayBuffer()));
  bg.resize({ w: width });
  const W = bg.bitmap.width, H = bg.bitmap.height;
  for (const s of FACADE_SLOTS.filter((x) => x.view === viewId)) {
    const x = Math.round(s.r[0] / 100 * W), y = Math.round(s.r[1] / 100 * H), w = Math.round(s.r[2] / 100 * W), h = Math.round(s.r[3] / 100 * H);
    const box = new Jimp({ width: w, height: h, color: 0x050505ff });
    const bytes = state.slots?.[s.key]?.hasImage ? await slotBytes(s.key) : null;
    if (bytes) {
      try {
        const p = await Jimp.read(bytes);
        if ((state.slots?.[s.key]?.mode || "contain") === "cover") p.cover({ w, h }); else p.scaleToFit({ w, h });
        box.composite(p, Math.round((w - p.bitmap.width) / 2), Math.round((h - p.bitmap.height) / 2));
      } catch {}
    }
    bg.composite(box, x, y);
  }
  return Buffer.from(await bg.getBuffer("image/jpeg", { quality: 80 }));
}
