// File → ImageBitmap (native first, heic-to fallback), thumbnails, viewer sources, decode lock.
import { HEIC_TO_URL, HEIC_EXTENSIONS, THUMB_MAX, VIEWER_CACHE } from './config.js';

let heicModule = null;

/** Error with a translation key (shown via t(code)) and an English message for logs. */
const coded = (code, msg) => Object.assign(new Error(msg), { code });

async function loadHeicTo() {
  if (!heicModule) {
    heicModule = import(HEIC_TO_URL).catch((err) => {
      heicModule = null; // allow a retry later
      throw coded('errHeicUnavailable', `HEIC converter unavailable (${err?.message || err})`);
    });
  }
  return heicModule;
}

/**
 * Serialises full-resolution decodes (thumbnails, scanning, viewer conversion): two 48MP
 * bitmaps at once (~400MB) can kill a mobile tab. FIFO, so thumbnails interleave with scans.
 */
let lockChain = Promise.resolve();
export function withDecodeLock(fn) {
  const run = lockChain.then(() => fn());
  lockChain = run.catch(() => {});
  return run;
}

/** True if the file is (probably) HEIC/HEIF, by extension, MIME or the ISO-BMFF 'ftyp' brand. */
export async function looksLikeHeic(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (HEIC_EXTENSIONS.has(ext) || /image\/hei[cf]/.test(file.type)) return true;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ftyp = String.fromCharCode(...head.slice(4, 8));
  const brand = String.fromCharCode(...head.slice(8, 12));
  return ftyp === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand);
}

/**
 * Decode a file into a full-resolution ImageBitmap with orientation applied.
 * `native` tells whether the browser decodes it itself (then <img> can show the original too).
 * createImageBitmap honours EXIF orientation by default; libheif applies HEIC transforms itself.
 */
export async function loadBitmap(file) {
  try {
    return { bitmap: await createImageBitmap(file), native: true };
  } catch {
    if (!(await looksLikeHeic(file))) {
      throw coded('errDecode', 'Could not decode image (unsupported or corrupt file)');
    }
    const { heicTo } = await loadHeicTo();
    try {
      return { bitmap: await heicTo({ blob: file, type: 'bitmap' }), native: false };
    } catch (err) {
      throw coded('errHeicFailed', `HEIC conversion failed (${err?.message || err})`);
    }
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function releaseCanvas(c) {
  c.width = c.height = 0; // free backing store early (helps Safari)
}

/** Return a resized copy of a bitmap (source is left untouched). */
export async function resizeBitmap(src, w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  const out = await createImageBitmap(c);
  releaseCanvas(c);
  return out;
}

/** Encode a bitmap (optionally scaled to maxSide) as JPEG. */
export async function bitmapToJpeg(bitmap, quality, maxSide = Infinity) {
  const s = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const c = makeCanvas(Math.round(bitmap.width * s), Math.round(bitmap.height * s));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  const blob = await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('JPEG encode failed'))), 'image/jpeg', quality));
  releaseCanvas(c);
  return blob;
}

/** Small JPEG object URL for cards. */
export async function makeThumbUrl(bitmap) {
  return URL.createObjectURL(await bitmapToJpeg(bitmap, 0.82, THUMB_MAX));
}

/* ---------- viewer sources ---------- */

const viewerCache = new Map(); // item.id → objectURL of a full-resolution JPEG (LRU, Map order)

/**
 * URL of the full-resolution image for the viewer. Natively decodable files are shown as-is
 * (no copy, browser-managed memory); HEIC elsewhere is converted once and kept in a small LRU.
 */
export async function getViewerSource(item) {
  if (item.nativeDecodable !== false && !item.isHeicLike) {
    item.fileUrl ??= URL.createObjectURL(item.file);
    return item.fileUrl;
  }
  if (item.nativeDecodable == null) {
    // Not probed yet (e.g. HEIC in Safari): try the cheap path first.
    const ok = await createImageBitmap(item.file).then(b => { b.close(); return true; }, () => false);
    item.nativeDecodable = ok;
    if (ok) return getViewerSource(item);
  }
  if (item.nativeDecodable) {
    item.fileUrl ??= URL.createObjectURL(item.file);
    return item.fileUrl;
  }
  const hit = viewerCache.get(item.id);
  if (hit) {
    viewerCache.delete(item.id);
    viewerCache.set(item.id, hit);
    return hit;
  }
  const url = await withDecodeLock(async () => {
    const { bitmap } = await loadBitmap(item.file);
    try {
      return URL.createObjectURL(await bitmapToJpeg(bitmap, 0.9));
    } finally {
      bitmap.close();
    }
  });
  viewerCache.set(item.id, url);
  while (viewerCache.size > VIEWER_CACHE) {
    const [oldId, oldUrl] = viewerCache.entries().next().value;
    viewerCache.delete(oldId);
    URL.revokeObjectURL(oldUrl);
  }
  return url;
}

/** Release every URL held for an item. */
export function releaseItemUrls(item) {
  for (const key of ['thumbUrl', 'fileUrl']) {
    if (item[key]) URL.revokeObjectURL(item[key]);
    item[key] = null;
  }
  const v = viewerCache.get(item.id);
  if (v) {
    URL.revokeObjectURL(v);
    viewerCache.delete(item.id);
  }
}

export function viewerCacheSize() {
  return viewerCache.size;
}
