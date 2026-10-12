// App state, event wiring and the processing queue.
import { HEIC_EXTENSIONS } from './config.js';
import { fromDrop, fromFileList, filterCandidates, syntheticName } from './intake.js';
import { loadBitmap, withDecodeLock, releaseItemUrls, viewerCacheSize } from './imageLoader.js';
import { scanBitmap } from './scanner.js';
import { decoderReady } from './decoderClient.js';
import { initThumbnailer, requestThumb, thumbFromBitmap } from './thumbnailer.js';
import { renderGallery, renderCard, renderResults, buildLines } from './render.js';
import * as viewer from './viewer.js';
import * as camera from './camera.js';
import { copyText } from './clipboard.js';
import { toast } from './toast.js';
import { t, applyI18n, setLang, onLangChange } from './i18n.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);

const state = {
  items: [],
  runGen: 0, // bumped by Stop / Clear / Re-process: results of older runs are dropped
  current: null, // { item, abort }
  pumping: false,
  decoderOk: false,
  settings: { thorough: false },
  camSession: null, // { mode, ids: [] } while the camera is open
};
let nextId = 1;
let tokenSeq = 0;

const handlers = {
  onRemove: removeItem,
  onOpen: (item, focusQr) => viewer.open(state.items.indexOf(item), { focusQr }),
  onCopyOne: (text) => copyText(text).then(ok => ok && toast(t('copied'))),
};

/* ---------- adding / removing ---------- */

function makeItem(file, relPath, key, source) {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  return {
    id: nextId++,
    key,
    file,
    name: file.name,
    relPath,
    source,
    isHeicLike: HEIC_EXTENSIONS.has(ext) || /image\/hei[cf]/.test(file.type),
    nativeDecodable: null,
    width: null,
    height: null,
    thumbUrl: null,
    thumbState: 'none',
    fileUrl: null,
    status: 'pending',
    priority: 0,
    scanToken: 0,
    qrs: [],
    error: null,
    ms: 0,
    prefetched: null, // decoded bitmap handed over by the camera (single shot)
  };
}

/** Add picked / dropped files. Returns the new items. */
function addCandidates(candidates, { source = 'pick', quiet = false, status = 'pending' } = {}) {
  const { accepted, unsupported, duplicates } = filterCandidates(candidates, state.items.map(i => i.key));
  const added = accepted.map(c => makeItem(c.file, c.relPath, c.key, source));
  for (const item of added) {
    item.status = status;
    state.items.push(item);
    requestThumb(item);
  }
  if (!quiet && candidates.length) {
    const parts = [t('added', { n: added.length })];
    if (duplicates) parts.push(t('skippedDup', { n: duplicates }));
    if (unsupported) parts.push(t('unsupported', { n: unsupported }));
    toast(parts.join(' · '));
  }
  if (added.length) setView('photos');
  refresh();
  if (status === 'queued') pump();
  return added;
}

function removeItem(item) {
  const idx = state.items.indexOf(item);
  if (idx < 0) return;
  if (state.current?.item === item) state.current.abort.abort();
  item.removed = true;
  item.scanToken = ++tokenSeq;
  item.prefetched?.close();
  state.items.splice(idx, 1);
  releaseItemUrls(item);
  if (idx < state.items.length && state.items.some(i => i.status === 'done')) {
    toast(t('removed'));
  }
  refresh();
}

function clearAll() {
  stop(false);
  state.items.forEach((item) => {
    item.removed = true;
    item.prefetched?.close();
    releaseItemUrls(item);
  });
  state.items = [];
  refresh();
}

/* ---------- processing queue ---------- */

function nextQueued() {
  let best = null;
  for (const item of state.items) {
    if (item.status === 'queued' && (!best || item.priority > best.priority)) best = item;
  }
  return best;
}

async function pump() {
  if (state.pumping || !state.decoderOk) return;
  state.pumping = true;
  refresh();
  try {
    for (let item = nextQueued(); item; item = nextQueued()) {
      await processItem(item);
    }
  } finally {
    state.pumping = false;
    refresh();
  }
}

/**
 * Scan one item. Whoever interrupts a scan (Stop, Clear, Re-process, a priority capture)
 * sets the item's status and bumps its scanToken; the late result is then simply dropped.
 */
async function processItem(item) {
  const token = ++tokenSeq;
  const gen = state.runGen;
  const abort = new AbortController();
  item.scanToken = token;
  item.status = 'processing';
  item.error = null;
  state.current = { item, abort };
  itemChanged(item);
  const isCurrent = () => !item.removed && item.scanToken === token && state.runGen === gen;
  const t0 = performance.now();
  try {
    await withDecodeLock(async () => {
      if (abort.signal.aborted || !isCurrent()) return;
      let full = item.prefetched;
      let native = true;
      item.prefetched = null;
      if (!full) ({ bitmap: full, native } = await loadBitmap(item.file));
      try {
        if (!item.removed) {
          await thumbFromBitmap(item, full, native);
          itemChanged(item);
        }
        const { qrs } = await scanBitmap(full, { thorough: state.settings.thorough, signal: abort.signal });
        if (!isCurrent()) return;
        item.qrs = qrs;
        item.ms = performance.now() - t0;
        item.status = 'done';
      } finally {
        full.close();
      }
    });
  } catch (err) {
    if (err?.name !== 'AbortError' && isCurrent()) {
      item.status = 'error';
      item.error = String(err?.message || err);
      item.errorKey = err?.code || null;
      console.error(item.relPath, err);
    }
  } finally {
    if (state.current?.item === item) state.current = null;
    if (!item.removed) itemChanged(item);
  }
}

function queuePending() {
  for (const item of state.items) if (item.status === 'pending') item.status = 'queued';
  pump();
}

/** Stop the run: abort the current scan, queued items go back to pending. */
function stop(notify = true) {
  state.runGen++;
  const cur = state.current;
  if (cur) {
    cur.abort.abort();
    cur.item.scanToken = ++tokenSeq;
    cur.item.status = 'pending';
  }
  let n = 0;
  for (const item of state.items) if (item.status === 'queued') { item.status = 'pending'; n++; }
  refresh();
  if (notify && (cur || n)) toast(t('stopped'));
}

function reprocessAll() {
  state.runGen++;
  state.current?.abort.abort();
  for (const item of state.items) {
    item.scanToken = ++tokenSeq;
    item.status = 'queued';
    item.qrs = [];
    item.error = null;
  }
  refresh();
  pump();
}

/* ---------- camera ---------- */

function cameraHud() {
  const s = state.camSession;
  const items = s ? state.items.filter(i => s.ids.includes(i.id)) : [];
  return {
    shots: items.length,
    scanned: items.filter(i => i.status === 'done' || i.status === 'error').length,
    codes: items.reduce((n, i) => n + i.qrs.length, 0),
    dots: items.map(i => ({
      state: i.status === 'done' ? (i.qrs.length ? 'done' : 'empty') : i.status === 'error' ? 'error' : 'busy',
      n: i.qrs.length,
      thumbUrl: i.thumbUrl,
    })),
  };
}

function addCapture(file, bitmap, { mode, priority }) {
  const key = `${file.name}|${file.size}|${file.lastModified}`;
  const item = makeItem(file, file.name, key, 'camera');
  item.status = 'queued';
  item.priority = priority;
  item.width = bitmap.width;
  item.height = bitmap.height;
  item.nativeDecodable = true;
  state.items.push(item);
  if (state.camSession) state.camSession.ids.push(item.id);
  // Thumbnail straight from the captured frame; single shot also scans that bitmap directly.
  thumbFromBitmap(item, bitmap).then(() => itemChanged(item));
  if (mode === 'single') item.prefetched = bitmap;
  else setTimeout(() => bitmap.close(), 0);
  return item;
}

function onCapture({ file, bitmap, mode }) {
  if (mode === 'single') {
    // Jump the queue: interrupt a normal-priority scan and put it back.
    const cur = state.current;
    if (cur && cur.item.priority === 0) {
      cur.abort.abort();
      cur.item.scanToken = ++tokenSeq;
      cur.item.status = 'queued';
    }
    const item = addCapture(file, bitmap, { mode, priority: 1 });
    refresh();
    viewer.open(state.items.indexOf(item), { mode: 'single' });
    pump();
    return item;
  }
  const item = addCapture(file, bitmap, { mode, priority: 0 });
  refresh();
  pump();
  camera.updateHud();
  return item;
}

function onNativeFiles(files, mode) {
  const candidates = files.map(f => ({ file: f, relPath: f.name.startsWith('image') ? syntheticName('camera', 'jpg') : f.name }));
  const added = addCandidates(candidates, { source: 'camera', quiet: true, status: 'queued' });
  if (mode === 'single' && added[0]) {
    added[0].priority = 1;
    viewer.open(state.items.indexOf(added[0]), { mode: 'single' });
  } else if (added.length) {
    toast(t('nativeAdded'));
  }
}

function startCamera() {
  camera.openChooser();
}

/* ---------- rendering ---------- */

function itemChanged(item) {
  if (item.removed) return;
  renderCard(item, state.items.indexOf(item) + 1);
  renderResults(state.items, handlers);
  viewer.update(item);
  camera.updateHud();
  refreshControls();
}

function refreshControls() {
  const items = state.items;
  const pending = items.filter(i => i.status === 'pending').length;
  const active = items.filter(i => i.status === 'queued' || i.status === 'processing').length;
  const finished = items.filter(i => i.status === 'done' || i.status === 'error').length;

  const nCodes = items.reduce((n, i) => n + (i.status === 'done' ? i.qrs.length : 0), 0);
  document.body.classList.toggle('has-items', items.length > 0);
  $('#wsTitle').textContent = finished ? t('codesFound', { n: nCodes }) : t('images', { n: items.length });
  const images = t('images', { n: items.length });
  $('#count').textContent = active ? t('scanning') : pending ? t('wsSubPending') : t('wsSubDone', { images });

  // Phones: Photos / Codes tabs. The Codes tab needs something to show.
  const hasResults = finished > 0;
  if (!hasResults) setView('photos');
  $('.view-tabs [data-view="codes"]').disabled = !hasResults;
  $('#tabCodesN').textContent = hasResults ? nCodes : '';

  // While scanning (and nothing new to queue) the Process buttons show live progress.
  const busy = active > 0;
  const total = active + finished;
  const showProgress = busy && pending === 0;
  const label = showProgress ? t('scanningProgress', { done: finished, total })
    : pending === 0 ? t('process') : t(finished || busy ? 'processNewN' : 'processN', { n: pending });
  for (const btn of document.querySelectorAll('[data-action="process"]')) {
    btn.disabled = pending === 0 || !state.decoderOk;
    btn.textContent = label;
    btn.classList.toggle('busy', showProgress);
  }
  // Bottom bar: Process while there is something to scan, then Copy all.
  const showCopy = pending === 0 && !busy && nCodes > 0;
  $('.bb-process').hidden = showCopy;
  $('.bb-copy').hidden = !showCopy;
  $('.bb-copy').textContent = t('copyN', { n: nCodes });
  for (const btn of document.querySelectorAll('[data-action="reprocess"]')) {
    btn.hidden = finished === 0;
    btn.disabled = items.length === 0;
  }
  for (const btn of document.querySelectorAll('[data-action="clear"]')) btn.disabled = items.length === 0;

  $('#progress').hidden = !busy;
  document.body.classList.toggle('scanning', busy);
  if (busy) {
    $('#progressBar').style.width = `${total ? Math.round((finished / total) * 100) : 0}%`;
    const cur = state.current?.item;
    $('#progressText').textContent = cur
      ? t('progressScanning', { i: state.items.indexOf(cur) + 1, name: cur.relPath })
      : t('progressQueued', { n: active });
    $('#progressCount').textContent = `${finished}/${total} · ${t('progressLeft', { n: active })}`;
  }
}

function refresh() {
  renderGallery(state.items, handlers);
  renderResults(state.items, handlers);
  refreshControls();
}

/* ---------- copy ---------- */

function copyLines(lines) {
  copyText(lines.join('\n')).then((ok) => {
    if (ok) toast(t('copiedLines', { n: lines.length }));
  });
}

/* ---------- view tabs (phones) ---------- */

function setView(view) {
  if (document.body.dataset.tab === view) return;
  document.body.dataset.tab = view;
  document.querySelectorAll('.view-tabs [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
}

/* ---------- menu sheet ---------- */

function openMenu() {
  const m = $('#menu');
  m.showModal();
}

/* ---------- wiring ---------- */

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function wire() {
  const filesInput = $('#filesInput');
  const folderInput = $('#folderInput');
  for (const input of [filesInput, folderInput]) {
    input.addEventListener('change', () => {
      addCandidates(fromFileList(input.files), { source: input === folderInput ? 'folder' : 'pick' });
      input.value = '';
    });
  }
  const on = (action, fn) => document.querySelectorAll(`[data-action="${action}"]`).forEach(b => b.addEventListener('click', (e) => {
    b.closest('dialog#menu')?.close();
    fn(e);
  }));
  on('pick-files', () => filesInput.click());
  on('pick-folder', () => folderInput.click());
  on('camera', startCamera);
  on('process', queuePending);
  on('reprocess', reprocessAll);
  on('clear', clearAll);
  on('stop', () => stop());
  on('menu', openMenu);
  on('copy-labeled', () => copyLines(buildLines(state.items).labeled));
  on('copy-content', () => copyLines(buildLines(state.items).content));
  if (isIOS) document.querySelectorAll('[data-action="pick-folder"]').forEach(b => { b.hidden = true; });

  const menu = $('#menu');
  menu.addEventListener('click', (e) => { if (e.target === menu) menu.close(); });
  for (const box of document.querySelectorAll('[data-setting="thorough"]')) {
    box.addEventListener('change', (e) => {
      state.settings.thorough = e.target.checked;
      document.querySelectorAll('[data-setting="thorough"]').forEach(b => { b.checked = e.target.checked; });
    });
  }

  // Whole window is a drop target.
  let dragDepth = 0;
  const overlay = $('#dropOverlay');
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    dragDepth++;
    overlay.hidden = false;
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) overlay.hidden = true;
  });
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    overlay.hidden = true;
    addCandidates(await fromDrop(e), { source: 'drop' });
  });

  // Paste images from the clipboard (e.g. screenshots).
  window.addEventListener('paste', (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (!files.length) return;
    addCandidates(files.map(f => ({ file: f, relPath: syntheticName('pasted', f.type.split('/')[1] || 'png') })), { source: 'paste' });
  });

  document.querySelectorAll('.view-tabs [data-view]').forEach(b => b.addEventListener('click', () => {
    setView(b.dataset.view);
    $('#workspace').scrollIntoView({ block: 'start' });
  }));

  window.addEventListener('beforeunload', (e) => {
    if (state.items.some(i => i.status === 'done')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  initThumbnailer({ root: null, update: itemChanged });
  viewer.initViewer({
    getItems: () => state.items,
    onRetake: () => camera.openCamera('single'),
  });
  camera.initCamera({
    onCapture,
    onNativeFiles,
    getHud: cameraHud,
    onOpened: () => { state.camSession = { ids: [] }; },
    onClosed: (mode) => {
      const shots = state.camSession?.ids.length || 0;
      state.camSession = null;
      if (mode === 'bulk' && shots) {
        setView('photos');
        refresh();
        $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  });
}

async function boot() {
  applyI18n();
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  onLangChange(() => {
    refresh();
    viewer.refresh();
    camera.refreshTexts();
    camera.updateHud();
  });
  if (params.has('fakecam')) await import('../tools/fakecam.js');
  wire();
  refresh();
  decoderReady
    .then(() => {
      state.decoderOk = true;
      $('#decoderStatus').hidden = true;
      refreshControls();
      pump();
    })
    .catch((err) => {
      const el = $('#decoderStatus');
      el.hidden = false;
      el.classList.add('fatal');
      el.textContent = t('decoderFailed', { msg: err.message });
    });

  if (params.has('debug')) {
    window.__app = {
      state,
      addFiles: (files, opts) => addCandidates(files.map(f => ({ file: f, relPath: f.name })), opts),
      process: queuePending,
      stop,
      clear: clearAll,
      reprocess: reprocessAll,
      viewer,
      camera,
      stats: () => ({
        items: state.items.length,
        thumbs: state.items.filter(i => i.thumbUrl).length,
        prefetched: state.items.filter(i => i.prefetched).length,
        viewerCache: viewerCacheSize(),
        pumping: state.pumping,
      }),
    };
  }
}

boot();
