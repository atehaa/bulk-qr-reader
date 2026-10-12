// Full-screen image viewer: zoom to original resolution, tags overlay, codes of this image.
// Also the result screen of single-shot camera mode.
import { buildOverlay, layoutLabels, pulseCode, colorFor, textColorFor } from './overlay.js';
import { createZoomPan } from './zoomPan.js';
import { getViewerSource } from './imageLoader.js';
import { pauseThumbnails, bumpThumb } from './thumbnailer.js';
import { bbox, flattenText } from './geometry.js';
import { copyText } from './clipboard.js';
import { pushModal, popModal } from './nav.js';
import { toast } from './toast.js';
import { t, getLang } from './i18n.js';
import { errText } from './render.js';

const $ = (sel, root = document) => root.querySelector(sel);

let dlg;
let stage;
let content;
let img;
let zp;
let items = () => [];
let hooks = {};
let idx = 0;
let mode = 'browse';
let shownKey = '';
let svg = null;
let srcToken = 0;

const codes = (n) => t('codes', { n });

export function initViewer({ getItems, onRetake, onClosed }) {
  items = getItems;
  hooks = { onRetake, onClosed };
  dlg = $('#viewer');
  stage = $('.v-stage', dlg);
  content = $('.v-content', dlg);
  img = $('.v-img', dlg);

  zp = createZoomPan(stage, content, {
    onCommit: (s) => svg && layoutLabels(svg, s),
    onSwipe: (dir) => step(dir),
    onGesture: (active) => pauseThumbnails(active),
  });

  $('.v-close', dlg).onclick = () => close();
  $('.v-prev', dlg).onclick = () => step(-1);
  $('.v-next', dlg).onclick = () => step(1);
  $('.v-zoom-in', dlg).onclick = () => zp.zoomBy(1.6);
  $('.v-zoom-out', dlg).onclick = () => zp.zoomBy(1 / 1.6);
  $('.v-fit', dlg).onclick = () => zp.fit();
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest('button, textarea, input')) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === '+' || e.key === '=') zp.zoomBy(1.6);
    else if (e.key === '-') zp.zoomBy(1 / 1.6);
    else if (e.key === '0') zp.fit();
    else return;
    e.preventDefault();
  });
}

const onBack = () => close(true);

export function isOpen() {
  return dlg?.open;
}

/** Open item at index. opts: { focusQr: number, mode: 'browse' | 'single' } */
export function open(index, opts = {}) {
  mode = opts.mode || 'browse';
  dlg.classList.toggle('single', mode === 'single');
  if (!dlg.open) {
    dlg.showModal();
    document.documentElement.classList.add('modal-open');
    pushModal(onBack);
  }
  show(index, opts.focusQr);
}

export function close(fromBack = false) {
  if (!dlg?.open) return;
  dlg.close();
  document.documentElement.classList.remove('modal-open');
  if (!fromBack) popModal(onBack);
  pauseThumbnails(false);
  shownKey = '';
  hooks.onClosed?.();
}

function step(dir) {
  const list = items();
  const n = idx + dir;
  if (n < 0 || n >= list.length) {
    zp.fit();
    return;
  }
  show(n);
}

/** Re-render if the given item is the one on screen (status / results changed). */
export function update(item) {
  if (!dlg?.open) return;
  const list = items();
  if (list[idx] !== item) {
    const i = list.indexOf(item);
    if (i < 0) return;
    if (mode !== 'single') return;
    idx = i;
  }
  show(idx);
}

function show(index, focusQr) {
  const list = items();
  if (!list.length) return close();
  idx = Math.max(0, Math.min(index, list.length - 1));
  const item = list[idx];
  const imgNo = idx + 1;

  $('.v-title', dlg).textContent = t('imageOf', { i: imgNo, n: list.length, name: item.relPath });
  $('.v-prev', dlg).disabled = idx === 0;
  $('.v-next', dlg).disabled = idx === list.length - 1;

  const key = `${item.id}:${imgNo}:${item.status}:${item.qrs.length}:${item.width}:${item.thumbUrl ? 1 : 0}:${getLang()}`;
  const sameImage = shownKey.split(':')[0] === String(item.id) && shownKey.split(':')[4] === String(item.width);
  if (key !== shownKey) {
    shownKey = key;
    renderImage(item, imgNo, sameImage);
    renderPanel(item, imgNo);
  }
  if (focusQr != null && item.qrs[focusQr]) {
    // wait for layout of a freshly opened dialog
    requestAnimationFrame(() => {
      zp.focusBox(bbox(item.qrs[focusQr].points));
      if (svg) pulseCode(svg, focusQr);
    });
  }
}

function renderImage(item, imgNo, keepZoom) {
  const status = $('.v-status', dlg);
  const busy = item.status === 'processing' || item.status === 'queued' || item.status === 'pending';
  status.hidden = !(busy && (mode === 'single' || item.status === 'processing'));
  status.textContent = item.status === 'pending' ? t('notProcessedYet') : t('scanning');

  svg?.remove();
  svg = null;
  if (!item.width) {
    // dimensions come with the thumbnail; ask for it first
    content.hidden = true;
    $('.v-loading', dlg).hidden = false;
    $('.v-loading', dlg).textContent = item.thumbState === 'error' ? t('previewFailed', { msg: item.thumbError || '' }) : t('loadingPreview');
    bumpThumb(item);
    return;
  }
  content.hidden = false;
  $('.v-loading', dlg).hidden = true;

  if (!keepZoom) {
    img.removeAttribute('src');
    if (item.thumbUrl) img.src = item.thumbUrl;
    zp.setImage(item.width, item.height);
    // Swap in the full-resolution source when ready.
    const token = ++srcToken;
    getViewerSource(item).then((url) => {
      if (token !== srcToken) return;
      const full = new Image();
      full.src = url;
      return full.decode().then(() => {
        if (token === srcToken) img.src = url;
      });
    }).catch((err) => console.warn('viewer source', err));
  }

  if (item.status === 'done' && item.qrs.length) {
    svg = buildOverlay(item, imgNo);
    content.append(svg);
    layoutLabels(svg, zp.state().s);
  }
}

function renderPanel(item, imgNo) {
  const panel = $('.v-panel', dlg);
  const head = $('.v-panel-head', panel);
  const list = $('.v-codes', panel);
  const actions = $('.v-actions', panel);
  list.replaceChildren();

  let headText;
  if (item.status === 'done') headText = item.qrs.length ? codes(item.qrs.length) : t('noCode');
  else if (item.status === 'error') headText = t('errorMsg', { msg: errText(item) });
  else if (item.status === 'pending') headText = t('notProcessedPress');
  else headText = t('scanning');
  head.textContent = headText;
  head.className = 'v-panel-head' + (item.status === 'done' && !item.qrs.length ? ' warn' : '') + (item.status === 'error' ? ' err' : '');

  item.qrs.forEach((q, i) => {
    const row = document.createElement('div');
    row.className = 'code-row';
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = colorFor(i);
    chip.style.color = textColorFor(colorFor(i));
    chip.textContent = `${imgNo}-${i + 1}`;
    const txt = document.createElement('span');
    txt.className = 'txt';
    txt.textContent = q.text || '(empty)';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn small copy1';
    btn.textContent = t('copy');
    btn.onclick = (e) => {
      e.stopPropagation();
      copyText(q.text).then(ok => ok && toast(t('copied')));
    };
    row.append(chip, txt, btn);
    row.onclick = () => {
      zp.focusBox(bbox(q.points));
      if (svg) pulseCode(svg, i);
    };
    list.append(row);
  });

  actions.replaceChildren();
  const add = (label, cls, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.onclick = fn;
    actions.append(b);
    return b;
  };
  if (item.qrs.length > 1 || (mode === 'single' && item.qrs.length)) {
    add(item.qrs.length > 1 ? t('copyAllN', { n: item.qrs.length }) : t('copy'), 'primary', () => {
      const lines = item.qrs.map(q => flattenText(q.text));
      copyText(lines.join('\n')).then(ok => ok && toast(t('copiedLines', { n: lines.length })));
    });
  }
  if (mode === 'single') {
    add(t('retake'), '', () => { close(); hooks.onRetake?.(); });
    add(t('done'), 'ghost', () => close());
  }
}

/** Re-render the current image (e.g. after a language change). */
export function refresh() {
  if (dlg?.open) show(idx);
}

export function debugState() {
  return { open: !!dlg?.open, idx, mode, ...zp?.state(), src: img?.currentSrc, naturalWidth: img?.naturalWidth };
}
