import { Jimp } from "jimp";
import { assetStore, carteleriaStore, controlStore } from "./store.ts";
import { facadeComposite, facadeVersion } from "./facade.ts";

// Miniaturas JPEG pequeñas para incrustar en los correos (cid:). Se guardan en caché para no
// recalcularlas cada mes. Devuelve base64 o "" si la imagen no existe o no se puede leer.
export type ImgRef = { kind: "asset" | "cart" | "facade" | "collage" | "blank"; key: string; refs?: ImgRef[] };

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
// Versión de la imagen: si el cartel de un soporte cambia, cambia la versión y no se reutiliza
// la miniatura antigua (la clave del soporte es siempre la misma).
async function version(ref: ImgRef): Promise<string> {
  if (ref.kind === "blank") return "1";
  if (ref.kind === "collage") return (await Promise.all((ref.refs || []).map((r) => version(r).catch(() => "0")))).join("-").slice(0, 120);
  if (ref.kind === "facade") return facadeVersion(ref.key);
  const meta: any = ref.kind === "asset" ? await assetStore().get(`meta_${ref.key}`, { type: "json" }) : await carteleriaStore().get(`imagemeta_${ref.key}`, { type: "json" });
  return String(meta?.updatedAt || meta?.size || "0").replace(/[^0-9A-Za-z]/g, "");
}
export async function thumbBase64(ref: ImgRef, w = 300, h = 400): Promise<string> {
  const cacheKey = `thumbv_${ref.kind}_${ref.key}_${await version(ref).catch(() => "0")}_${w}x${h}`;
  try { const c = await controlStore().get(cacheKey, { type: "text" }); if (c) return c; } catch {}
  try {
    if (ref.kind === "blank") {
      const f = new Jimp({ width: w, height: h, color: 0xefede8ff });
      const b64 = Buffer.from(await f.getBuffer("image/jpeg", { quality: 80 })).toString("base64"); try { await controlStore().set(cacheKey, b64); } catch {} return b64;
    }
    if (ref.kind === "collage") {
      const out = await polaroidCollage(ref.refs || [], w);
      if (!out) return "";
      const b64 = out.toString("base64"); try { await controlStore().set(cacheKey, b64); } catch {} return b64;
    }
    if (ref.kind === "facade") {
      const buf = await facadeComposite(ref.key, (Netlify.env.get("URL") || "https://yellow-control.netlify.app").replace(/\/$/, ""), 912);
      if (!buf) return "";
      const b64 = buf.toString("base64"); try { await controlStore().set(cacheKey, b64); } catch {} return b64;
    }
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

async function readImage(ref: ImgRef) {
  if (ref.kind === "facade") { const buf = await facadeComposite(ref.key, (Netlify.env.get("URL") || "https://yellow-control.netlify.app").replace(/\/$/, ""), 912); return buf ? Jimp.read(buf) : null; }
  const bytes = await rawBytes(ref); return bytes ? Jimp.read(Buffer.from(bytes)) : null;
}
// Collage tipo polaroid: hasta 4 fotos en 2 × 2 sobre fondo oscuro, con marco blanco, sombra,
// cinta amarilla y un giro leve distinto en cada una.
async function polaroidCollage(refs: ImgRef[], W = 912): Promise<Buffer | null> {
  const imgs = (await Promise.all(refs.slice(0, 4).map((r) => readImage(r).catch(() => null)))).filter(Boolean) as any[];
  if (!imgs.length) return null;
  const cols = imgs.length === 1 ? 1 : 2, rows = Math.ceil(imgs.length / cols), cw = Math.floor(W / cols), ch = Math.round(cw * 1.02);
  const H = rows * ch + 24, bg = new Jimp({ width: W, height: H, color: 0x1b1b1bff });
  const tilts = [-3.2, 2.6, 2.2, -2.4];
  imgs.forEach((im, i) => {
    // foto cuadrada, como una polaroid clásica: se recorta al centro sin deformar
    const side = Math.round(Math.min(cw * 0.74, ch * 0.72)); im.cover({ w: side, h: side });
    const pad = Math.round(cw * 0.035), bottom = pad * 3, fw = im.bitmap.width + pad * 2, fh = im.bitmap.height + pad + bottom, m = 30;
    const card = new Jimp({ width: fw + m * 2, height: fh + m * 2, color: 0x00000000 });
    const shadow = new Jimp({ width: fw, height: fh, color: 0x00000088 }); card.composite(shadow, m + 7, m + 10); card.blur(7);
    const frame = new Jimp({ width: fw, height: fh, color: 0xfbfaf6ff }); frame.composite(im, pad, pad); card.composite(frame, m, m);
    const tape = new Jimp({ width: Math.round(fw * 0.32), height: Math.round(pad * 1.6), color: 0xf4c300cc }); card.composite(tape, m + Math.round(fw * 0.34), m - Math.round(pad * 0.7));
    card.rotate({ deg: tilts[i % 4], mode: true } as any);
    const lastAlone = imgs.length % cols === 1 && i === imgs.length - 1 && cols > 1;
    const x = (lastAlone ? Math.round((W - cw) / 2) : (i % cols) * cw) + Math.round((cw - card.bitmap.width) / 2), y = 12 + Math.floor(i / cols) * ch + Math.round((ch - card.bitmap.height) / 2);
    bg.composite(card, x, y);
  });
  return Buffer.from(await bg.getBuffer("image/jpeg", { quality: 82 }));
}
