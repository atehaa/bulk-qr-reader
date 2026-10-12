// Live preview tracing: while the camera is open, small copies of the video frame are decoded
// on a dedicated worker and the codes found are outlined on a canvas over the video.
// Visual feedback only: nothing is stored, the shutter still triggers the real full scan.
import { LIVE_SIDE, LIVE_GAP_MS, LIVE_HOLD_MS } from './config.js';
import { createDecoder } from './decoderClient.js';

let decoder = null;
let video;
let canvas;
let onCount = () => {};
let gen = 0;
let tracks = [];
let frameCanvas = null;

/**
 * Merge this frame's detections into the tracks shown on screen.
 * tracks: [{text, points, seen}] from earlier frames; found: [{text, points}] in video pixels;
 * now: performance.now(). Returns the new track list.
 */
function mergeTracks(tracks, found, now) {
  // TODO(human)
  return found.map(f => ({ ...f, seen: now }));
}

/** Downscaled copy of the current video frame (long side ≤ LIVE_SIDE) as an ImageBitmap. */
async function grabSmall() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const s = Math.min(1, LIVE_SIDE / Math.max(vw, vh));
  frameCanvas ??= document.createElement('canvas');
  frameCanvas.width = Math.round(vw * s);
  frameCanvas.height = Math.round(vh * s);
  frameCanvas.getContext('2d').drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
  return { bitmap: await createImageBitmap(frameCanvas), invScale: vw / frameCanvas.width };
}

async function loop(myGen) {
  try {
    await decoder.ready;
  } catch {
    return; // no live tracing without the decoder; capture still works
  }
  while (myGen === gen) {
    const t0 = performance.now();
    if (!document.hidden && video.videoWidth && video.readyState >= 2) {
      try {
        const { bitmap, invScale } = await grabSmall();
        const found = await decoder.decodeBitmap(bitmap, { invScale });
        if (myGen !== gen) return; // stopped while decoding: drop the late result
        tracks = mergeTracks(tracks, found, performance.now());
      } catch { /* a dropped frame is harmless */ }
      draw();
    }
    // Let slow phones breathe: wait at least LIVE_GAP_MS, longer when decoding is slow.
    const spent = performance.now() - t0;
    await new Promise(r => setTimeout(r, Math.max(LIVE_GAP_MS, spent / 2)));
  }
}

/** Outline every track; older ones (missed in recent frames) fade towards LIVE_HOLD_MS. */
function draw() {
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !tracks.length) { onCount(0); return; }

  // Same mapping as object-fit: contain on the <video>.
  const k = Math.min(cw / vw, ch / vh);
  const ox = (cw - vw * k) / 2;
  const oy = (ch - vh * k) / 2;
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);

  const now = performance.now();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 / k;
  for (const tr of tracks) {
    const age = now - tr.seen;
    ctx.globalAlpha = Math.max(0.25, 1 - age / LIVE_HOLD_MS);
    ctx.beginPath();
    tr.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(60, 180, 75, .28)';
    ctx.fill();
    ctx.strokeStyle = '#3cb44b';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  onCount(tracks.length);
}

/** Begin tracing `videoEl` onto `canvasEl`. `count(n)` is told how many codes are in view. */
export function startTrace(videoEl, canvasEl, count) {
  video = videoEl;
  canvas = canvasEl;
  onCount = count || (() => {});
  decoder ??= createDecoder(); // created lazily: a second WASM instance only once the camera is used
  const myGen = ++gen;
  tracks = [];
  loop(myGen);
}

export function stopTrace() {
  gen++;
  tracks = [];
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  onCount(0);
}
