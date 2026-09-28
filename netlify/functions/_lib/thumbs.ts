import { Jimp } from "jimp";
import { assetStore, carteleriaStore, controlStore } from "./store.ts";

// Miniaturas JPEG pequeñas para incrustar en los correos (cid:). Se guardan en caché para no
// recalcularlas cada mes. Devuelve base64 o "" si la imagen no existe o no se puede leer.
export type ImgRef = { kind: "asset" | "cart"; key: string };

async function rawBytes(ref: ImgRef): Promise<Uint8Array | null> {
  if (ref.kind === "asset") {
    const meta: any = await assetStore().get(`meta_${ref.key}`, { type: "json" });
    if (meta?.contentType && !/^image\//.test(meta.contentType)) return null;
    const b = await assetStore().get(`file_${ref.key}`, { type: "arrayBuffer" }) as ArrayBuffer | null;
    return b ? new Uint8Array(b) : null;
  }
  const b = await carteleriaStore().get(`image_${ref.key}`, { type: "arrayBuffer" }) as ArrayBuffer | null;
  if (!b) return null;
  const bytes = new Uint8Array(b), head = new TextDecoder().decode(bytes.slice(0, 32));
  if (head.startsWith("data:image/")) { const m = new TextDecoder().decode(bytes).match(/base64,(.+)$/); return m ? Uint8Array.from(Buffer.from(m[1], "base64")) : null; }
  return bytes;
}

// Encaja la imagen entera (sin recortar) en un marco de proporción fija con fondo claro,
// para que se vea la pieza completa y la cuadrícula del correo quede regular.
export async function thumbBase64(ref: ImgRef, w = 300, h = 400): Promise<string> {
  const cacheKey = `thumbf_${ref.kind}_${ref.key}_${w}x${h}`;
  try { const c = await controlStore().get(cacheKey, { type: "text" }); if (c) return c; } catch {}
  try {
    const bytes = await rawBytes(ref); if (!bytes) return "";
    const img = await Jimp.read(Buffer.from(bytes));
    img.scaleToFit({ w, h });
    const frame = new Jimp({ width: w, height: h, color: 0xf3f3f1ff });
    frame.composite(img, Math.round((w - img.bitmap.width) / 2), Math.round((h - img.bitmap.height) / 2));
    const out = await frame.getBuffer("image/jpeg", { quality: 78 });
    const b64 = Buffer.from(out).toString("base64");
    try { await controlStore().set(cacheKey, b64); } catch {}
    return b64;
  } catch { return ""; }
}
