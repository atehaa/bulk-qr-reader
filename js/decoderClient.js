// Promise wrapper around the decoder worker. The default instance does all real scanning;
// the camera's live preview creates its own so it never waits behind background scans.

/** Start a decoder worker. Returns { ready, decodeBitmap }. */
export function createDecoder() {
  const worker = new Worker(new URL('./decoder.worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let nextId = 1;

  let resolveReady;
  let rejectReady;
  // Resolves when the WASM decoder is loaded; rejects with a user-facing message otherwise.
  const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });

  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'ready') return resolveReady();
    if (msg.type === 'fatal') return rejectReady(new Error(msg.error));
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    msg.ok ? p.resolve(msg.results) : p.reject(new Error(msg.error));
  };

  worker.onerror = (e) => {
    rejectReady(new Error(e.message || 'Decoder worker failed to start.'));
  };

  /**
   * Decode codes in a bitmap, once per reader-option variant. The bitmap is transferred
   * (unusable afterwards). Points are mapped back to natural coordinates via invScale + offset.
   */
  function decodeBitmap(bitmap, { offsetX = 0, offsetY = 0, invScale = 1, variants = [{}] } = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, bitmap, offsetX, offsetY, invScale, variants }, [bitmap]);
    });
  }

  return { ready, decodeBitmap };
}

const main = createDecoder();
export const decoderReady = main.ready;
export const decodeBitmap = main.decodeBitmap;
