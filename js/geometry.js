// Pure helpers for QR geometry and text output. No DOM access.

/** Build a normalized QR record from text + 4 corner points (natural image coords). */
export function makeQr(text, points) {
  const cx = points.reduce((s, p) => s + p.x, 0) / 4;
  const cy = points.reduce((s, p) => s + p.y, 0) / 4;
  const d1 = Math.hypot(points[2].x - points[0].x, points[2].y - points[0].y);
  const d2 = Math.hypot(points[3].x - points[1].x, points[3].y - points[1].y);
  return { text, points, cx, cy, size: (d1 + d2) / 2 / Math.SQRT2 };
}

/**
 * Merge results coming from several passes / overlapping tiles.
 * Same text and centroids closer than half the smaller QR size → same physical code.
 * Identical codes printed at different spots in one image are kept separately.
 */
export function mergeResults(qrs) {
  const out = [];
  for (const q of qrs) {
    const dup = out.some(o =>
      o.text === q.text &&
      Math.hypot(o.cx - q.cx, o.cy - q.cy) < 0.5 * Math.min(o.size, q.size));
    if (!dup) out.push(q);
  }
  return out;
}

/**
 * Sort QRs top-to-bottom, then left-to-right within rows. Two QRs share a row when their
 * centers differ vertically by less than half the median QR size or 2% of the image height.
 */
export function readingOrder(qrs, imageHeight = 0) {
  if (qrs.length < 2) return qrs.slice();
  const sizes = qrs.map(q => q.size).sort((a, b) => a - b);
  const tolerance = Math.max(0.5 * sizes[Math.floor(sizes.length / 2)], 0.02 * imageHeight);
  const byY = qrs.slice().sort((a, b) => a.cy - b.cy);
  const rows = [];
  let row = [byY[0]];
  for (const q of byY.slice(1)) {
    if (q.cy - row[0].cy > tolerance) {
      rows.push(row);
      row = [q];
    } else {
      row.push(q);
    }
  }
  rows.push(row);
  return rows.flatMap(r => r.sort((a, b) => a.cx - b.cx));
}

/** Flatten QR content to a single line: newlines → ⏎, other control chars removed. */
export function flattenText(text) {
  const flat = text
    .replace(/\r\n|\r|\n/g, ' ⏎ ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/\t/g, ' ');
  return flat.trim() === '' ? '(empty)' : flat;
}

/** Axis-aligned bounding box of a point list. */
export function bbox(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
