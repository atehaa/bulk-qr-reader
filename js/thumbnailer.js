// Background thumbnail generation (also gives HEIC previews before processing).
// Serial, shares the decode lock with scanning, visible cards first.
import { loadBitmap, makeThumbUrl, withDecodeLock } from './imageLoader.js';

const queue = []; // items in insertion order
const visible = new Set(); // item ids currently near the viewport
let running = false;
let paused = false;
let onUpdate = () => {};
let observer = null;

const idle = () => new Promise(res => (window.requestIdleCallback
  ? requestIdleCallback(() => res(), { timeout: 300 })
  : setTimeout(res, 16)));

export function initThumbnailer({ root, update }) {
  onUpdate = update;
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const id = Number(e.target.dataset.id);
      if (e.isIntersecting) visible.add(id); else visible.delete(id);
    }
  }, { root, rootMargin: '100% 0px 100% 0px' });
}

/** Watch a card element (data-id) so its thumbnail is generated early. */
export function observeCard(el) {
  observer?.observe(el);
}
export function unobserveCard(el) {
  observer?.unobserve(el);
}

/** Thumbnails can jank gestures (heic-to runs on the main thread); pause while the viewer is busy. */
export function pauseThumbnails(p) {
  paused = p;
  if (!p) run();
}

/** Fill thumbUrl / width / height / nativeDecodable from an already decoded bitmap. */
export async function thumbFromBitmap(item, bitmap, native = true) {
  item.width = bitmap.width;
  item.height = bitmap.height;
  item.nativeDecodable ??= native;
  if (!item.thumbUrl) {
    item.thumbUrl = await makeThumbUrl(bitmap);
    item.thumbState = 'done';
  }
}

export function requestThumb(item) {
  if (item.thumbState !== 'none') return;
  item.thumbState = 'queued';
  queue.push(item);
  run();
}

/** Move an item to the front (e.g. the viewer is waiting for it). */
export function bumpThumb(item) {
  if (item.thumbState === 'none') requestThumb(item);
  const i = queue.indexOf(item);
  if (i > 0) queue.unshift(...queue.splice(i, 1));
  visible.add(item.id);
  run();
}

function next() {
  for (let i = 0; i < queue.length; i++) {
    if (visible.has(queue[i].id)) return queue.splice(i, 1)[0];
  }
  return queue.shift();
}

async function run() {
  if (running) return;
  running = true;
  try {
    while (queue.length && !paused) {
      const item = next();
      if (item.thumbState !== 'queued' || item.removed) continue;
      await idle();
      await withDecodeLock(async () => {
        if (item.thumbUrl || item.removed) return; // processing got there first
        try {
          const { bitmap, native } = await loadBitmap(item.file);
          try {
            await thumbFromBitmap(item, bitmap, native);
          } finally {
            bitmap.close();
          }
        } catch (err) {
          item.thumbState = 'error';
          item.thumbError = String(err?.message || err);
        }
      });
      if (!item.removed) onUpdate(item);
    }
  } finally {
    running = false;
  }
}
