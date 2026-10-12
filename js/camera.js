// In-app camera: mode chooser (single / bulk), live preview, shutter, torch / zoom / switch,
// fallbacks to the phone's camera app. Captures are handed to the app as JPEG Files.
import { CAMERA_VIDEO, CAPTURE_JPEG_Q, CAPTURE_QUEUE_MAX } from './config.js';
import { bitmapToJpeg } from './imageLoader.js';
import { syntheticName } from './intake.js';
import { pushModal, popModal } from './nav.js';
import { toast } from './toast.js';

const $ = (sel, root = document) => root.querySelector(sel);
const MODE_KEY = 'bqr.cameraMode';

let hooks = {};
let chooser;
let dlg;
let video;
let stream = null;
let mode = 'single';
let deviceIds = [];
let deviceIndex = -1;
let wakeLock = null;
let torchOn = false;
let busy = false; // single-shot capture in progress
const encodeQueue = [];
let encoding = false;
let startSeq = 0;

function savedMode() {
  try { return localStorage.getItem(MODE_KEY) || 'single'; } catch { return 'single'; }
}
function saveMode(m) {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* private mode */ }
}

/**
 * hooks: onCapture({file, bitmap, mode}) → item, onClosed(mode), getHud() → {shots, scanned,
 * codes, dots:[{state, n}]}, onNativeFiles(files, mode)
 */
export function initCamera(h) {
  hooks = h;
  chooser = $('#camChooser');
  dlg = $('#camera');
  video = $('video', dlg);

  chooser.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => {
      closeChooser();
      openCamera(b.dataset.mode);
    });
  });
  $('[data-native]', chooser).addEventListener('click', () => {
    closeChooser();
    openNative(savedMode());
  });
  $('[data-cancel]', chooser).addEventListener('click', () => closeChooser());
  chooser.addEventListener('cancel', (e) => { e.preventDefault(); closeChooser(); });
  chooser.addEventListener('click', (e) => { if (e.target === chooser) closeChooser(); });

  const nativeInput = $('#nativeCamInput');
  nativeInput.addEventListener('change', () => {
    const files = [...nativeInput.files];
    nativeInput.value = '';
    if (files.length) hooks.onNativeFiles(files, nativeInput.dataset.mode || 'single');
  });

  $('.shutter', dlg).addEventListener('click', shoot);
  $('.cam-close', dlg).addEventListener('click', () => closeCamera());
  $('.cam-done', dlg).addEventListener('click', () => closeCamera());
  $('.cam-torch', dlg).addEventListener('click', toggleTorch);
  $('.cam-switch', dlg).addEventListener('click', switchCamera);
  $('.cam-zoom', dlg).addEventListener('input', (e) => applyZoom(Number(e.target.value)));
  $('.cam-native', dlg).addEventListener('click', () => { const m = mode; closeCamera(); openNative(m); });
  dlg.querySelectorAll('.cam-mode button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeCamera(); });
  // Volume keys can't be read on the web; Space / Enter work with a keyboard or BT shutter remote.
  dlg.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button, input')) { e.preventDefault(); shoot(); }
  });

  document.addEventListener('visibilitychange', () => {
    if (!dlg.open) return;
    if (document.hidden) stopTracks();
    else start(deviceIds[deviceIndex]);
  });
}

/* ---------- chooser ---------- */

const chooserBack = () => closeChooser(true);

export function openChooser() {
  const last = savedMode();
  chooser.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('last', b.dataset.mode === last));
  chooser.showModal();
  pushModal(chooserBack);
}

function closeChooser(fromBack = false) {
  if (!chooser.open) return;
  chooser.close();
  if (!fromBack) popModal(chooserBack);
}

function openNative(m) {
  const input = $('#nativeCamInput');
  input.dataset.mode = m;
  input.click();
}

/* ---------- camera ---------- */

const cameraBack = () => closeCamera(true);

export function isCameraOpen() {
  return dlg?.open;
}

export function openCamera(m = savedMode()) {
  setMode(m);
  showError(null);
  dlg.showModal();
  document.documentElement.classList.add('modal-open');
  pushModal(cameraBack);
  hooks.onOpened?.(mode);
  updateHud();
  start(deviceIds[deviceIndex]);
  requestWakeLock();
}

export function closeCamera(fromBack = false) {
  if (!dlg?.open) return;
  stopTracks();
  dlg.close();
  document.documentElement.classList.remove('modal-open');
  if (!fromBack) popModal(cameraBack);
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  hooks.onClosed?.(mode);
}

function setMode(m) {
  mode = m === 'bulk' ? 'bulk' : 'single';
  saveMode(mode);
  dlg.classList.toggle('bulk', mode === 'bulk');
  dlg.querySelectorAll('.cam-mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  $('.cam-hint', dlg).textContent = mode === 'bulk'
    ? 'Bulk: keep shooting — every photo is scanned in the background.'
    : 'Single shot: snap once to see the codes right away.';
  updateHud();
}

function stopTracks() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  if (video) video.srcObject = null;
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch { /* not allowed / unsupported */ }
}

/** Start (or restart) the stream. getUserMedia is called before any await (user gesture). */
function start(deviceId) {
  stopTracks();
  const seq = ++startSeq;
  if (!navigator.mediaDevices?.getUserMedia) {
    showError(window.isSecureContext
      ? 'This browser has no camera access.'
      : 'The camera needs a secure (https) page.', true);
    return;
  }
  const constraints = { audio: false, video: deviceId ? { ...CAMERA_VIDEO, facingMode: undefined, deviceId: { exact: deviceId } } : CAMERA_VIDEO };
  const req = navigator.mediaDevices.getUserMedia(constraints);
  $('.cam-status', dlg).textContent = 'Starting camera…';
  req.then(async (s) => {
    if (seq !== startSeq || !dlg.open) { s.getTracks().forEach(t => t.stop()); return; }
    stream = s;
    const track = s.getVideoTracks()[0];
    track.addEventListener('ended', () => { if (dlg.open && stream === s && !document.hidden) start(deviceIds[deviceIndex]); });
    video.srcObject = s;
    await video.play().catch(() => {});
    $('.cam-status', dlg).textContent = '';
    showError(null);
    await setupControls(track);
  }).catch((err) => {
    if (seq !== startSeq) return;
    const name = err?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      showError('Camera access was blocked. Allow the camera for this site in your browser settings (on iPhone: Settings → Safari → Camera), or use the phone camera app.', true);
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      showError('No camera was found on this device.', true);
    } else if (name === 'NotReadableError') {
      showError('The camera is busy in another app. Close it and try again.', true);
    } else {
      showError(`Camera could not start (${err?.message || name}).`, true);
    }
  });
}

async function setupControls(track) {
  const caps = track.getCapabilities?.() || {};
  const settings = track.getSettings?.() || {};
  $('.cam-res', dlg).textContent = settings.width ? `${settings.width}×${settings.height}` : '';

  const torchBtn = $('.cam-torch', dlg);
  torchBtn.hidden = !caps.torch;
  torchOn = false;
  torchBtn.setAttribute('aria-pressed', 'false');

  const zoom = $('.cam-zoom', dlg);
  if (caps.zoom && caps.zoom.max > caps.zoom.min) {
    zoom.hidden = false;
    zoom.min = caps.zoom.min;
    zoom.max = Math.min(caps.zoom.max, caps.zoom.min * 10);
    zoom.step = caps.zoom.step || 0.1;
    zoom.value = settings.zoom || caps.zoom.min;
  } else {
    zoom.hidden = true;
  }

  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    deviceIds = devices.map(d => d.deviceId).filter(Boolean);
    deviceIndex = Math.max(0, deviceIds.indexOf(settings.deviceId));
  } catch {
    deviceIds = [];
  }
  $('.cam-switch', dlg).hidden = deviceIds.length < 2;
}

function toggleTorch() {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  torchOn = !torchOn;
  track.applyConstraints({ advanced: [{ torch: torchOn }] }).catch(() => { torchOn = false; });
  $('.cam-torch', dlg).setAttribute('aria-pressed', String(torchOn));
}

function applyZoom(z) {
  stream?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ zoom: z }] }).catch(() => {});
}

function switchCamera() {
  if (deviceIds.length < 2) return;
  deviceIndex = (deviceIndex + 1) % deviceIds.length;
  start(deviceIds[deviceIndex]);
}

function showError(msg, withNative = false) {
  const box = $('.cam-error', dlg);
  box.hidden = !msg;
  $('.cam-error-text', dlg).textContent = msg || '';
  $('.cam-native', dlg).hidden = !withNative;
}

/* ---------- capture ---------- */

async function grabFrame() {
  try {
    return await createImageBitmap(video);
  } catch {
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const b = await createImageBitmap(c);
    c.width = c.height = 0;
    return b;
  }
}

/**
 * Full-sensor still where supported (Android Chrome) and worth it (video below ~12MP);
 * otherwise, or if it is slow, the current video frame.
 */
async function takeStill() {
  const track = stream?.getVideoTracks()[0];
  if (track && window.ImageCapture && Math.max(video.videoWidth, video.videoHeight) < 3000) {
    try {
      const blob = await Promise.race([
        new window.ImageCapture(track).takePhoto(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
      ]);
      const bitmap = await createImageBitmap(blob);
      return { bitmap, blob };
    } catch { /* fall back to a frame */ }
  }
  return { bitmap: await grabFrame(), blob: null };
}

function flash() {
  const f = $('.cam-flash', dlg);
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
  navigator.vibrate?.(25);
}

function setShutterBusy(b) {
  $('.shutter', dlg).classList.toggle('busy', b);
}

async function shoot() {
  if (!stream || !video.videoWidth || busy) return;
  if (encodeQueue.length >= CAPTURE_QUEUE_MAX) {
    toast('Saving previous shots…');
    return;
  }
  flash();
  if (mode === 'single') {
    busy = true;
    setShutterBusy(true);
    try {
      const { bitmap, blob } = await takeStill();
      const jpeg = blob || await bitmapToJpeg(bitmap, CAPTURE_JPEG_Q);
      const file = new File([jpeg], syntheticName('camera', 'jpg'), { type: 'image/jpeg', lastModified: Date.now() });
      closeCamera();
      hooks.onCapture({ file, bitmap, mode: 'single' });
    } catch (err) {
      toast(`Capture failed: ${err?.message || err}`);
    } finally {
      busy = false;
      setShutterBusy(false);
    }
    return;
  }
  try {
    encodeQueue.push(await grabFrame());
    setShutterBusy(encodeQueue.length >= CAPTURE_QUEUE_MAX);
    pumpEncode();
  } catch (err) {
    toast(`Capture failed: ${err?.message || err}`);
  }
}

async function pumpEncode() {
  if (encoding) return;
  encoding = true;
  try {
    while (encodeQueue.length) {
      const bitmap = encodeQueue[0];
      try {
        const jpeg = await bitmapToJpeg(bitmap, CAPTURE_JPEG_Q);
        const file = new File([jpeg], syntheticName('camera', 'jpg'), { type: 'image/jpeg', lastModified: Date.now() });
        hooks.onCapture({ file, bitmap, mode: 'bulk' });
      } catch (err) {
        bitmap.close();
        toast(`Could not save photo: ${err?.message || err}`);
      }
      encodeQueue.shift();
      setShutterBusy(encodeQueue.length >= CAPTURE_QUEUE_MAX);
    }
  } finally {
    encoding = false;
  }
}

/** Refresh the bulk counters / per-shot dots. Called by the app when items change. */
export function updateHud() {
  if (!dlg?.open) return;
  const hud = hooks.getHud?.() || { shots: 0, scanned: 0, codes: 0, dots: [] };
  $('.cam-count', dlg).textContent = hud.shots
    ? `${hud.shots} shot${hud.shots === 1 ? '' : 's'} · ${hud.scanned} scanned · ${hud.codes} code${hud.codes === 1 ? '' : 's'}`
    : 'No shots yet';
  $('.cam-done', dlg).textContent = hud.shots ? `Done (${hud.shots})` : 'Done';
  const dots = $('.cam-dots', dlg);
  dots.replaceChildren(...hud.dots.slice(-24).map((d) => {
    const s = document.createElement('span');
    s.className = `dot ${d.state}`;
    if (d.state === 'done') s.textContent = d.n;
    s.title = { done: `${d.n} codes`, empty: 'No code decoded — retake?', error: 'Error' }[d.state] || 'Scanning…';
    return s;
  }));
}

export function cameraMode() {
  return mode;
}
