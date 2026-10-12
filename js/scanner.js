// Multi-scale, multi-setting scan of one full-resolution bitmap.
// Returns codes in natural coords, merged across passes and in reading order.
import { DECODE_MAX, TILE_MAX_AREA, TILE_MIN_OVERLAP, UPSCALE_BELOW } from './config.js';
import { decodeBitmap } from './decoderClient.js';
import { resizeBitmap } from './imageLoader.js';
import { makeQr, mergeResults, readingOrder } from './geometry.js';

// Phone photos are noisy at full resolution: a 2048px copy often reads more codes than 4096px,
// and the denoise / global-histogram binarizers each catch codes the default one misses.
// Measured on a 48MP shelf photo of 40 Data Matrix codes: single best pass 38-39, union 39.
const DENOISE = { tryDenoise: true };
const GLOBAL_HIST = { binarizer: 'GlobalHistogram' };
const BASE_PASSES = [
  { side: 2048, variants: [{}] },
  { side: DECODE_MAX, variants: [DENOISE, GLOBAL_HIST] },
];
const THOROUGH_PASSES = [
  { side: 1536, variants: [{}, GLOBAL_HIST] },
  { side: 2048, variants: [DENOISE, GLOBAL_HIST] },
  { side: 3072, variants: [{}, DENOISE, GLOBAL_HIST] },
  { side: DECODE_MAX, variants: [{}] },
];

/** AbortSignal.throwIfAborted with a fallback for older Safari. */
export function checkAbort(signal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
}

/** Evenly spaced starts of `n` windows of `size` covering `length` exactly. */
function starts(length, size, n) {
  if (n === 1) return [0];
  const step = (length - size) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(i * step));
}

/**
 * Smallest grid of full-resolution tiles where every tile is ≤ TILE_MAX_AREA and neighbours
 * overlap by ≥ TILE_MIN_OVERLAP of the tile size (so a code smaller than the overlap is always
 * whole in at least one tile). Ties prefer squarer tiles. Returns [{x, y, w, h}].
 */
export function planTiles(W, H) {
  const ov = TILE_MIN_OVERLAP;
  const span = (len, n) => (n === 1 ? len : Math.ceil(len / (n - (n - 1) * ov)));
  for (let count = 1; count <= 64; count++) {
    let best = null;
    for (let nx = 1; nx <= count; nx++) {
      if (count % nx) continue;
      const ny = count / nx;
      const w = Math.min(W, span(W, nx));
      const h = Math.min(H, span(H, ny));
      if (w * h > TILE_MAX_AREA) continue;
      const skew = Math.abs(Math.log(w / h));
      if (!best || skew < best.skew) best = { nx, ny, w, h, skew };
    }
    if (best) {
      const tiles = [];
      for (const y of starts(H, best.h, best.ny)) {
        for (const x of starts(W, best.w, best.nx)) tiles.push({ x, y, w: best.w, h: best.h });
      }
      return tiles;
    }
  }
  throw new Error(`Image too large to tile (${W}×${H})`);
}

/** Decode the whole image scaled so its long side is `side` (never upscaled here). */
async function decodeAtSide(full, side, variants) {
  const long = Math.max(full.width, full.height);
  if (side >= long) return decodeBitmap(await createImageBitmap(full), { variants });
  const s = side / long;
  const bmp = await resizeBitmap(full, Math.round(full.width * s), Math.round(full.height * s));
  return decodeBitmap(bmp, { invScale: full.width / bmp.width, variants });
}

/**
 * Normal: 2048px default + DECODE_MAX denoise/global-histogram, plus full-resolution tiles when
 * the image is larger than DECODE_MAX (small codes in big photos). Thorough adds more scales and
 * settings and upscales small images. `signal` is checked before every pass and tile; a decode
 * already running in the worker finishes, its result is dropped by the caller.
 */
export async function scanBitmap(full, { thorough = false, signal } = {}) {
  const W = full.width;
  const H = full.height;
  const long = Math.max(W, H);
  const found = [];

  // Group variants by effective decode size so the same pixels are only prepared once.
  const passes = thorough ? [...BASE_PASSES, ...THOROUGH_PASSES] : BASE_PASSES;
  const bySide = new Map();
  for (const p of passes) {
    const side = Math.min(p.side, long);
    bySide.set(side, [...(bySide.get(side) || []), ...p.variants]);
  }
  for (const [side, variants] of bySide) {
    checkAbort(signal);
    const unique = [...new Map(variants.map(v => [JSON.stringify(v), v])).values()];
    found.push(...await decodeAtSide(full, side, unique));
  }

  if (long > DECODE_MAX) {
    for (const t of planTiles(W, H)) {
      checkAbort(signal);
      const tile = await createImageBitmap(full, t.x, t.y, t.w, t.h);
      found.push(...await decodeBitmap(tile, { offsetX: t.x, offsetY: t.y, variants: thorough ? [{}, DENOISE] : [{}] }));
    }
  }

  if (long < UPSCALE_BELOW && (found.length === 0 || thorough)) {
    checkAbort(signal);
    const big = await resizeBitmap(full, W * 2, H * 2);
    found.push(...await decodeBitmap(big, { invScale: 0.5, variants: [{}, DENOISE] }));
  }

  checkAbort(signal);
  return { qrs: readingOrder(mergeResults(found.map(r => makeQr(r.text, r.points))), H) };
}
