// Module worker: ImageBitmap → ImageData → zxing-wasm readBarcodes.
import { ZXING_READER_URL, ZXING_WASM_BASE, READER_OPTIONS } from './config.js';

let zxing = null;

async function init() {
  try {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('This browser does not support OffscreenCanvas in workers. Please use a recent Chrome, Firefox or Safari.');
    }
    zxing = await import(ZXING_READER_URL);
    await zxing.prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => (path.endsWith('.wasm') ? ZXING_WASM_BASE + path : prefix + path),
      },
      fireImmediately: true,
    });
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'fatal', error: String(err?.message || err) });
  }
}

const ready = init();

self.onmessage = async (e) => {
  const { id, bitmap, offsetX = 0, offsetY = 0, invScale = 1, variants = [{}] } = e.data;
  await ready;
  const t0 = performance.now();
  try {
    const { width, height } = bitmap;
    const ctx = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, width, height);
    // Several reader settings on the same pixels; each catches codes the others miss.
    const raw = [];
    for (const v of variants) raw.push(...await zxing.readBarcodes(imageData, { ...READER_OPTIONS, ...v }));
    const results = raw
      .filter(r => r.isValid)
      .map(r => {
        const p = r.position;
        const map = pt => ({ x: pt.x * invScale + offsetX, y: pt.y * invScale + offsetY });
        return { text: r.text, format: r.format, points: [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft].map(map) };
      });
    self.postMessage({ id, ok: true, results, ms: performance.now() - t0 });
  } catch (err) {
    bitmap.close?.();
    self.postMessage({ id, ok: false, error: String(err?.message || err) });
  }
};
