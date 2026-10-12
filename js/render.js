// Gallery cards (thumbnail + SVG tags) and the grouped, colored results list.
// Decoded content is untrusted: it is only ever written with textContent.
import { buildOverlay, layoutLabels, colorFor, textColorFor } from './overlay.js';
import { flattenText } from './geometry.js';
import { observeCard, unobserveCard } from './thumbnailer.js';

const $ = (sel) => document.querySelector(sel);
const cards = new Map(); // item.id → card refs
const groups = new Map(); // item.id → { root, key }
const codes = (n) => `${n} code${n === 1 ? '' : 's'}`;

/* ---------- label layout on resize ---------- */

const mediaObserver = new ResizeObserver((entries) => {
  for (const e of entries) relayoutCard(e.target.__card);
});

function relayoutCard(card) {
  const svg = card?.svg;
  const item = card?.item;
  if (!svg || !item?.width) return;
  const r = card.media.getBoundingClientRect();
  const k = Math.min(r.width / item.width, r.height / item.height);
  layoutLabels(svg, k);
}

/* ---------- gallery ---------- */

function createCard(item, handlers) {
  const root = document.createElement('figure');
  root.className = 'card';
  root.dataset.id = item.id;
  root.innerHTML = `
    <div class="head">
      <span class="num"></span>
      <span class="badge" hidden></span>
      <span class="spacer"></span>
      <button class="remove" type="button" title="Remove image" aria-label="Remove image">×</button>
    </div>
    <div class="media" role="button" tabindex="0" aria-label="Open image">
      <img class="thumb" alt="" decoding="async" hidden>
      <div class="placeholder"></div>
    </div>
    <figcaption><span class="name"></span><span class="info"></span></figcaption>`;
  const card = {
    item,
    root,
    media: root.querySelector('.media'),
    img: root.querySelector('.thumb'),
    ph: root.querySelector('.placeholder'),
    num: root.querySelector('.num'),
    badge: root.querySelector('.badge'),
    name: root.querySelector('.name'),
    info: root.querySelector('.info'),
    svg: null,
    key: '',
  };
  root.querySelector('.remove').addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onRemove(item);
  });
  const open = () => handlers.onOpen(item);
  card.media.addEventListener('click', open);
  card.media.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  card.name.textContent = item.relPath;
  card.name.title = item.relPath;
  card.media.__card = card;
  mediaObserver.observe(card.media);
  observeCard(root);
  cards.set(item.id, card);
  return card;
}

function statusText(item) {
  switch (item.status) {
    case 'pending': return 'Not processed';
    case 'queued': return 'Queued';
    case 'processing': return 'Scanning…';
    case 'error': return item.error;
    default: return item.ms ? `${codes(item.qrs.length)} · ${(item.ms / 1000).toFixed(1)}s` : codes(item.qrs.length);
  }
}

function updateCard(card, item, imgNo) {
  card.num.textContent = imgNo;
  card.root.classList.toggle('processing', item.status === 'processing');
  card.root.classList.toggle('noqr', item.status === 'done' && item.qrs.length === 0);
  card.root.classList.toggle('error', item.status === 'error');

  let badge = '';
  if (item.status === 'error') badge = 'Error';
  else if (item.status === 'done') badge = item.qrs.length ? codes(item.qrs.length) : 'No code decoded';
  card.badge.hidden = !badge;
  card.badge.textContent = badge;
  card.info.textContent = statusText(item);
  card.root.title = item.status === 'error' ? `${item.relPath}\n${item.error}` : item.relPath;

  if (item.width) card.media.style.aspectRatio = `${item.width} / ${item.height}`;

  const key = `${imgNo}:${item.status}:${item.qrs.length}:${item.thumbUrl}:${item.width}`;
  if (card.key === key) return;
  card.key = key;

  if (item.thumbUrl) {
    if (card.img.getAttribute('src') !== item.thumbUrl) card.img.src = item.thumbUrl;
    card.img.hidden = false;
    card.ph.hidden = true;
  } else {
    card.img.hidden = true;
    card.ph.hidden = false;
    card.ph.textContent = item.thumbState === 'error'
      ? (item.isHeicLike ? 'HEIC preview failed' : 'Preview unavailable')
      : 'Loading preview…';
  }

  card.svg?.remove();
  card.svg = null;
  if (item.status === 'done' && item.qrs.length && item.width) {
    card.svg = buildOverlay(item, imgNo);
    card.media.append(card.svg);
    relayoutCard(card);
  }
}

/** Sync gallery DOM with items (adds, removes, reorders, re-tags when numbering changed). */
export function renderGallery(items, handlers) {
  const gallery = $('#gallery');
  const live = new Set(items.map(i => i.id));
  for (const [id, card] of cards) {
    if (!live.has(id)) {
      mediaObserver.unobserve(card.media);
      unobserveCard(card.root);
      card.root.remove();
      cards.delete(id);
    }
  }
  items.forEach((item, idx) => {
    const card = cards.get(item.id) || createCard(item, handlers);
    updateCard(card, item, idx + 1);
    if (gallery.children[idx] !== card.root) gallery.insertBefore(card.root, gallery.children[idx] || null);
  });
}

export function renderCard(item, imgNo) {
  const card = cards.get(item.id);
  if (card) updateCard(card, item, imgNo);
}

export function scrollToCard(item) {
  const el = cards.get(item.id)?.root;
  const g = $('#gallery');
  if (!el || !g) return;
  g.scrollTo({ left: el.offsetLeft - (g.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
}

/* ---------- results ---------- */

export function buildLines(items) {
  const labeled = [];
  const content = [];
  items.forEach((item, idx) => {
    if (item.status !== 'done') return;
    item.qrs.forEach((q, i) => {
      const text = flattenText(q.text);
      labeled.push(`[${idx + 1}-${i + 1}] ${text}`);
      content.push(text);
    });
  });
  return { labeled, content };
}

function buildGroup(item, imgNo, handlers) {
  const root = document.createElement('div');
  root.className = 'group';
  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'ghead';
  head.onclick = () => handlers.onOpen(item);
  const no = document.createElement('span');
  no.className = 'gnum';
  no.textContent = imgNo;
  const name = document.createElement('span');
  name.className = 'gname';
  name.textContent = item.relPath;
  const count = document.createElement('span');
  count.className = 'gcount';
  head.append(no, name, count);
  root.append(head);

  if (item.status === 'error') {
    count.textContent = 'Error';
    root.classList.add('error');
    const row = document.createElement('div');
    row.className = 'row note';
    row.textContent = item.error;
    root.append(row);
  } else if (!item.qrs.length) {
    count.textContent = 'No code decoded';
    root.classList.add('noqr');
  } else {
    count.textContent = codes(item.qrs.length);
    item.qrs.forEach((q, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.tabIndex = 0;
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.style.background = colorFor(i);
      chip.style.color = textColorFor(colorFor(i));
      chip.textContent = `${imgNo}-${i + 1}`;
      const txt = document.createElement('span');
      txt.className = 'txt';
      txt.textContent = flattenText(q.text);
      txt.title = q.text;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn small copy1';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', `Copy code ${imgNo}-${i + 1}`);
      btn.onclick = (e) => {
        e.stopPropagation();
        handlers.onCopyOne(q.text);
      };
      row.append(chip, txt, btn);
      const focus = () => handlers.onOpen(item, i);
      row.addEventListener('click', focus);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter') focus(); });
      root.append(row);
    });
  }
  return root;
}

/** Grouped list of decoded codes; groups are rebuilt only when their item changed. */
export function renderResults(items, handlers) {
  const list = $('#list');
  const shown = items.filter(i => i.status === 'done' || i.status === 'error');
  const live = new Set(shown.map(i => i.id));
  for (const [id, g] of groups) {
    if (!live.has(id)) { g.root.remove(); groups.delete(id); }
  }
  let pos = 0;
  items.forEach((item, idx) => {
    if (!live.has(item.id)) return;
    const key = `${idx + 1}:${item.status}:${item.qrs.length}:${item.scanToken}`;
    let g = groups.get(item.id);
    if (!g || g.key !== key) {
      const root = buildGroup(item, idx + 1, handlers);
      if (g) g.root.replaceWith(root);
      g = { root, key };
      groups.set(item.id, g);
    }
    if (list.children[pos] !== g.root) list.insertBefore(g.root, list.children[pos] || null);
    pos++;
  });

  const { labeled } = buildLines(items);
  const plain = $('#plainOutput');
  if (plain) plain.value = labeled.join('\n');

  const done = items.filter(i => i.status === 'done');
  const failed = items.filter(i => i.status === 'error');
  const noQr = [];
  items.forEach((it, idx) => { if (it.status === 'done' && it.qrs.length === 0) noQr.push(idx + 1); });
  const summary = $('#summary');
  summary.replaceChildren();
  const part = (text, cls) => {
    if (summary.childNodes.length) summary.append(' · ');
    const s = document.createElement('span');
    if (cls) s.className = cls;
    s.textContent = text;
    summary.append(s);
  };
  part(`${done.length} of ${items.length} image${items.length === 1 ? '' : 's'} scanned`);
  part(codes(labeled.length));
  if (noQr.length) part(`${noQr.length} with no code (#${noQr.join(', #')})`, 'warn');
  if (failed.length) part(`${failed.length} failed`, 'err');

  $('#results').hidden = shown.length === 0;
  for (const id of ['copyLabeled', 'copyContent']) $(`#${id}`).disabled = labeled.length === 0;
}
