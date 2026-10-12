// SVG overlay drawn over an <img>: one colored polygon + "#img-code" tag per decoded code.
// Coordinates are natural image pixels (viewBox), so it stays aligned and crisp at any zoom.
import { PALETTE } from './config.js';
import { bbox } from './geometry.js';

const NS = 'http://www.w3.org/2000/svg';

export const colorFor = (i) => PALETTE[i % PALETTE.length];

export function textColorFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#000' : '#fff';
}

function el(name, attrs = {}) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/**
 * Build the overlay for an item. preserveAspectRatio defaults to "xMidYMid meet", which matches
 * an <img> with object-fit: contain in the same box, so both can share any container size.
 */
export function buildOverlay(item, imgNo) {
  const svg = el('svg', { class: 'ov', viewBox: `0 0 ${item.width} ${item.height}`, 'aria-hidden': 'true' });
  item.qrs.forEach((q, i) => {
    const color = colorFor(i);
    const pts = q.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const g = el('g', { class: 'code', 'data-i': i });
    g.append(
      el('polygon', { class: 'under', points: pts }),
      el('polygon', { class: 'line', points: pts, stroke: color }),
    );
    const lab = el('g', { class: 'lab' });
    const rect = el('rect', { fill: color, rx: 0 });
    const text = el('text', { fill: textColorFor(color) });
    text.textContent = `#${imgNo}-${i + 1}`;
    lab.append(rect, text);
    g.append(lab);
    svg.append(g);
  });
  svg.__item = item;
  return svg;
}

/**
 * Size and place the tags for the current on-screen scale k (CSS px per image px).
 * Tags are 10–16 px on screen and no larger than about half the code; codes smaller than
 * 12 px on screen keep only their outline (zoom in to read the tag).
 */
export function layoutLabels(svg, k) {
  const item = svg.__item;
  if (!item || !(k > 0)) return;
  [...svg.querySelectorAll('g.code')].forEach((g) => {
    const q = item.qrs[Number(g.dataset.i)];
    const lab = g.querySelector('.lab');
    const codePx = q.size * k;
    if (codePx < 12) {
      lab.style.display = 'none';
      return;
    }
    lab.style.display = '';
    const fontPx = Math.min(16, Math.max(10, codePx * 0.5));
    const f = fontPx / k; // in image units
    const text = lab.querySelector('text');
    const chars = text.textContent.length;
    const pad = f * 0.3;
    const w = chars * f * 0.62 + pad * 2;
    const h = f * 1.35;
    const box = bbox(q.points);
    const x = Math.min(Math.max(0, box.minX), item.width - w);
    let y = box.minY - h - 2 / k;
    if (y < 0) y = Math.min(box.minY + 2 / k, item.height - h); // no room above: inside the code
    const rect = lab.querySelector('rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', f * 0.2);
    text.setAttribute('x', x + pad);
    text.setAttribute('y', y + h * 0.72);
    text.setAttribute('font-size', f);
  });
}

/** Briefly highlight one code (after jumping to it from the results list). */
export function pulseCode(svg, i) {
  const g = svg.querySelector(`g.code[data-i="${i}"]`);
  if (!g) return;
  g.classList.remove('pulse');
  void g.getBoundingClientRect();
  g.classList.add('pulse');
}
