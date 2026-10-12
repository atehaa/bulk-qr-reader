// Central configuration: pinned CDN URLs, size limits, palette, accepted inputs.

export const ZXING_VERSION = '3.1.5';
export const ZXING_READER_URL = `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_VERSION}/dist/es/reader/index.js`;
export const ZXING_WASM_BASE = `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_VERSION}/dist/reader/`;
export const HEIC_TO_URL = 'https://cdn.jsdelivr.net/npm/heic-to@1.6.6/dist/heic-to.js';

export const ZXING_WRITER_URL = `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_VERSION}/dist/es/writer/index.js`;

// Long side of the JPEG thumbnail used in cards (a 78vw card at DPR 3 is ~900 device px).
export const THUMB_MAX = 1024;
// Full-resolution viewer sources kept for HEIC files the browser can't show natively.
export const VIEWER_CACHE = 3;
// Long side decoded in one piece. Larger images are also scanned as full-resolution tiles.
export const DECODE_MAX = 4096;
// Tiles stay under the iOS canvas area limit (16,777,216 px) and overlap by at least 15%.
export const TILE_MAX_AREA = 16_000_000;
export const TILE_MIN_OVERLAP = 0.15;
// Images smaller than this are retried upscaled 2× when nothing was found.
export const UPSCALE_BELOW = 800;

// In-app camera. 4:3 keeps the sensor's full field of view; the delivered size is read back.
export const CAMERA_VIDEO = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 4032 },
  height: { ideal: 3024 },
};
export const CAPTURE_JPEG_Q = 0.92;
// Pending capture encodes before the shutter shows "busy" (each 8MP frame is ~32MB).
export const CAPTURE_QUEUE_MAX = 3;

// All common 2D codes: pharma boxes (ITS/GS1) use Data Matrix, not QR.
// textMode defaults to "HRI", so GS1 content reads like "(01)0869...(21)..." .
export const READER_OPTIONS = {
  formats: ['QRCode', 'MicroQRCode', 'RMQRCode', 'DataMatrix', 'Aztec', 'PDF417'],
  tryHarder: true,
  maxNumberOfSymbols: 255,
};

// High-contrast categorical palette (Sasha Trubetskoy), cycled per QR within an image.
export const PALETTE = [
  '#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4',
  '#f032e6', '#bfef45', '#ffe119', '#469990', '#9A6324', '#000075',
];

export const ACCEPTED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif',
]);
export const ACCEPTED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif',
  'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
]);
export const HEIC_EXTENSIONS = new Set(['heic', 'heif']);
