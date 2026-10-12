// Synthesized camera shutter sound (Web Audio, no audio file). Can be muted; the choice is remembered.
// iOS plays Web Audio only after a user gesture and stays silent when the ring/silent switch is on.

const KEY = 'bqr.sound';
let ctx = null;

export function soundOn() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setSound(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked */ }
}

/** Create / resume the audio context. Call from a user gesture (e.g. opening the camera). */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

/** One filtered noise burst with a fast decay: a mechanical click. */
function click(at, dur, gain, freq) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(at);
}

/** "Click-clack" of a shutter (~110 ms). */
export function playShutter() {
  if (!soundOn()) return;
  unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime + 0.005;
  click(now, 0.045, 0.9, 2600);
  click(now + 0.065, 0.05, 0.6, 1700);
}
