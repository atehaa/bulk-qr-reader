// Dev only: loaded by app.js when the URL has ?fakecam=1. Replaces the camera with a canvas
// stream showing a new code every 400 ms, so capture flows can be tested without hardware.
// Options: &portrait=1 (1080×1920), &deny=1 (simulate permission denied).
import { code } from './scenarios.js';

const params = new URLSearchParams(location.search);
const portrait = params.has('portrait');
const W = portrait ? 1080 : 1920;
const H = portrait ? 1920 : 1080;

const cvs = document.createElement('canvas');
cvs.width = W;
cvs.height = H;
const ctx = cvs.getContext('2d');
const codes = [];
for (let i = 1; i <= 12; i++) codes.push(await code(`FAKECAM-${i}`, { format: i % 3 ? 'QRCode' : 'DataMatrix', scale: 8 }));
const start = performance.now();
let n = 0;

function frame() {
  n++;
  const t = performance.now() - start;
  const k = Math.floor(t / 400) % codes.length;
  ctx.fillStyle = '#e9e4d8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  const s = Math.min(W, H) * 0.42;
  ctx.fillRect(W / 2 - s / 2 - 30, H / 2 - s / 2 - 30, s + 60, s + 60);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(codes[k], W / 2 - s / 2, H / 2 - s / 2, s, s);
  ctx.fillStyle = '#333';
  ctx.font = '32px system-ui';
  ctx.fillText(`fake camera · frame ${n} · code ${k + 1}`, 40, 60);
}
// setInterval (not rAF) so frames keep coming when the test browser pane is hidden.
setInterval(frame, 33);
frame();

// Canvas tracks don't support ImageCapture.takePhoto; behave like a browser without it.
window.ImageCapture = undefined;

let torch = false;
let zoom = 1;
navigator.mediaDevices ??= {};
navigator.mediaDevices.getUserMedia = async (c) => {
  if (params.has('deny')) throw new DOMException('Permission denied', 'NotAllowedError');
  const stream = cvs.captureStream(30);
  const track = stream.getVideoTracks()[0];
  track.getCapabilities = () => ({ torch: true, zoom: { min: 1, max: 8, step: 0.1 } });
  track.getSettings = () => ({ width: W, height: H, deviceId: c?.video?.deviceId?.exact || 'fake-back', torch, zoom });
  track.applyConstraints = async (cons) => {
    const a = cons?.advanced?.[0] || {};
    if ('torch' in a) torch = a.torch;
    if ('zoom' in a) zoom = a.zoom;
  };
  return stream;
};
navigator.mediaDevices.enumerateDevices = async () => [
  { kind: 'videoinput', deviceId: 'fake-back', label: 'Fake back camera' },
  { kind: 'videoinput', deviceId: 'fake-front', label: 'Fake front camera' },
];
window.__fakecam = { get torch() { return torch; }, get zoom() { return zoom; } };
