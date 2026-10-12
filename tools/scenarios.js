// Test images with known codes, shared by make-test-images.html, selftest.html and fakecam.js.
import { writeBarcode } from 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.5/dist/es/writer/index.js';

export async function code(text, { format = 'QRCode', scale = 6 } = {}) {
  const { image, error } = await writeBarcode(text, { format, scale });
  if (!image) throw new Error(error);
  return createImageBitmap(image);
}

export function canvas(w, h, bg = '#fff') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  return [c, ctx];
}

/** Draw bitmap centered in the (x, y, size) square, optionally rotated. */
export function draw(ctx, bmp, x, y, size, angle = 0) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.imageSmoothingEnabled = false;
  const k = size / Math.max(bmp.width, bmp.height);
  ctx.drawImage(bmp, (-bmp.width * k) / 2, (-bmp.height * k) / 2, bmp.width * k, bmp.height * k);
  ctx.restore();
}

/**
 * name → { make(): canvas, expect: [texts in reading order] | null (order-free), count }
 * `centers` (optional) lists expected code centers for position checks.
 */
export const SCENARIOS = [
  {
    name: '01-single',
    expect: ['https://example.com/single'],
    async make() {
      const [c, ctx] = canvas(800, 600);
      draw(ctx, await code('https://example.com/single'), 250, 150, 300);
      return c;
    },
  },
  {
    name: '02-six-in-two-rows-jitter',
    expect: ['ROW-A1', 'ROW-A2', 'ROW-A3', 'ROW-B1', 'ROW-B2', 'ROW-B3'],
    async make() {
      const [c, ctx] = canvas(1500, 900);
      const ys = [[100, 130, 85], [520, 490, 540]];
      const labels = [['A1', 'A2', 'A3'], ['B1', 'B2', 'B3']];
      for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) draw(ctx, await code(`ROW-${labels[r][k]}`), 100 + k * 480, ys[r][k], 280);
      return c;
    },
  },
  {
    name: '03-rotated-and-small',
    expect: ['rotated 30deg', 'rotated -15deg', 'small one'],
    async make() {
      const [c, ctx] = canvas(1200, 800, '#f2efe6');
      draw(ctx, await code('rotated 30deg'), 120, 150, 340, 30);
      draw(ctx, await code('rotated -15deg'), 620, 120, 300, -15);
      draw(ctx, await code('small one', { scale: 3 }), 700, 560, 110);
      return c;
    },
  },
  {
    name: '04-multiline-unicode',
    expect: ['BEGIN:VCARD\nVERSION:3.0\nFN:Ayşe Öztürk\nTEL:+90 555 000 00 00\nEND:VCARD', 'Merhaba dünya 👋 çğıöşü'],
    async make() {
      const [c, ctx] = canvas(1000, 500);
      draw(ctx, await code('BEGIN:VCARD\nVERSION:3.0\nFN:Ayşe Öztürk\nTEL:+90 555 000 00 00\nEND:VCARD'), 60, 60, 380);
      draw(ctx, await code('Merhaba dünya 👋 çğıöşü'), 560, 60, 380);
      return c;
    },
  },
  {
    name: '05-inverted',
    expect: ['inverted colors'],
    async make() {
      const [c, ctx] = canvas(700, 700);
      draw(ctx, await code('inverted colors'), 150, 150, 400);
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 700, 700);
      return c;
    },
  },
  {
    name: '06-no-code',
    expect: [],
    async make() {
      const [c, ctx] = canvas(800, 600, '#dfe7f2');
      ctx.fillStyle = '#4363d8';
      ctx.font = 'bold 48px system-ui';
      ctx.fillText('No code here', 250, 310);
      return c;
    },
  },
  {
    name: '07-huge-8000x6000-four-small',
    expect: ['huge-1', 'huge-2', 'huge-3', 'huge-4'],
    async make() {
      const [c, ctx] = canvas(8000, 6000, '#fafafa');
      const pos = [[700, 600], [6900, 800], [1200, 5000], [6500, 4900]];
      for (let i = 0; i < pos.length; i++) draw(ctx, await code(`huge-${i + 1}`, { scale: 4 }), pos[i][0], pos[i][1], 120);
      return c;
    },
  },
  {
    name: '08-same-content-twice',
    expect: ['duplicate content', 'duplicate content'],
    async make() {
      const [c, ctx] = canvas(1000, 450);
      const b = await code('duplicate content');
      draw(ctx, b, 60, 60, 320);
      draw(ctx, b, 600, 60, 320);
      return c;
    },
  },
  {
    name: '09-big-qr-and-tiny-datamatrix',
    // The tiny code only survives at full resolution: the default tile pass must find it.
    expect: null,
    contains: ['BIG-QR', 'tiny-dm'],
    async make() {
      const [c, ctx] = canvas(9000, 6000, '#fbfbf8');
      draw(ctx, await code('BIG-QR', { scale: 20 }), 600, 900, 1500);
      draw(ctx, await code('tiny-dm', { format: 'DataMatrix', scale: 3 }), 6800, 4300, 44);
      return c;
    },
  },
  {
    name: '10-three-identical',
    expect: ['same', 'same', 'same'],
    async make() {
      const [c, ctx] = canvas(1400, 500);
      const b = await code('same');
      for (let i = 0; i < 3; i++) draw(ctx, b, 80 + i * 1.2 * 340, 80, 340);
      return c;
    },
  },
  {
    name: '11-on-tile-seam',
    // 9000×3000 → 2 tiles; the code sits exactly in the overlap of both.
    expect: ['seam-code'],
    seamCenter: true,
    async make(planTiles) {
      const [c, ctx] = canvas(9000, 3000, '#fafafa');
      const [a, b] = planTiles(9000, 3000);
      const seamX = Math.round((b.x + (a.x + a.w)) / 2);
      draw(ctx, await code('seam-code', { scale: 4 }), seamX - 150, 1350, 300);
      return c;
    },
  },
];
