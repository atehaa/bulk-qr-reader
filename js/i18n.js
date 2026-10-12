// UI strings (English / Turkish). Turkish when the browser language is Turkish, English otherwise;
// the header toggle overrides it and is remembered.
//
// Static markup uses data-i18n (text), data-i18n-html (trusted markup from this file only),
// data-i18n-title and data-i18n-aria. Code renders with t(key, vars).

const LANG_KEY = 'bqr.lang';

const en = {
  homeTitle: 'What are we<br>scanning today?',
  cameraSub: 'One shot, or a whole shelf in a row',
  photosSub: 'From your library',
  folder: 'Folder',
  folderSub: 'Every photo inside it',
  privacy: '<b>Private by design.</b> Photos never leave your device, and nothing is kept once you close this page.',
  addPhotos: 'Add photos',
  actions: 'Actions',
  view: 'View',
  tabPhotos: 'Photos',
  tabCodes: 'Codes',
  photoN: 'Photo {n}',
  codesFound: (v) => `${v.n} code${v.n === 1 ? '' : 's'} found`,
  wsSubDone: 'In {images} · open a photo to zoom in on its codes',
  wsSubPending: 'Press Process to read the codes',
  tagline: 'QR & Data Matrix from photos, folders or the camera — all in your browser, nothing is uploaded.',
  camera: 'Camera',
  chooseFolder: 'Choose folder',
  photos: 'Photos',
  loadingDecoder: 'Loading decoder…',
  decoderFailed: 'Decoder failed to load: {msg}. Check your internet connection and reload.',
  emptySubDesk: 'Drag &amp; drop photos or folders anywhere, or paste with <kbd>⌘/Ctrl</kbd>+<kbd>V</kbd>.',
  thorough: 'Thorough scan',
  thoroughHint: 'More scales and settings. Slower, occasionally finds a few more codes.',
  thoroughSmall: 'slower, occasionally finds more',
  clearAll: 'Clear all',
  reprocessAll: 'Re-process all',
  process: 'Process',
  processN: 'Process {n}',
  processNewN: 'Process {n} new',
  scanningProgress: 'Scanning {done}/{total}',
  moreActions: 'More actions',
  more: 'More',
  close: 'Close',
  stop: 'Stop',
  decodedCodes: 'Decoded codes',
  copyLabeled: 'Copy with labels',
  copyContent: 'Copy content only',
  showPlain: 'Show as plain text',
  hint: 'Tag <code>3-2</code> = photo 3, code 2 — the same colored tag is drawn on the photo. Tap a row to zoom to it. Reads QR, Data Matrix, Aztec and PDF417; line breaks inside a code are shown as ⏎.',
  dropHere: 'Drop photos or folders',
  singleShot: 'Single shot',
  singleShotDesc: 'Snap one photo and see its codes right away.',
  bulk: 'Bulk',
  bulkDesc: 'Snap many photos in a row; they are scanned in the background, review at the end.',
  useNativeCamera: "Use the phone's camera app instead",
  cancel: 'Cancel',
  modeSingle: 'Single',
  modeBulk: 'Bulk',
  mode: 'Mode',
  closeCamera: 'Close camera',
  flashlight: 'Flashlight',
  switchCamera: 'Switch camera',
  sound: 'Shutter sound',
  liveDetect: 'Live detection',
  inView: (v) => `${v.n} code${v.n === 1 ? '' : 's'} in view`,
  zoom: 'Zoom',
  takePhoto: 'Take photo',
  usePhoneCamera: 'Use phone camera app',
  hintSingle: 'Single shot: snap once to see the codes right away.',
  hintBulk: 'Bulk: keep shooting — every photo is scanned in the background.',
  startingCamera: 'Starting camera…',
  camBlocked: 'Camera access was blocked. Allow the camera for this site in your browser settings (on iPhone: Settings → Safari → Camera), or use the phone camera app.',
  camNotFound: 'No camera was found on this device.',
  camBusy: 'The camera is busy in another app. Close it and try again.',
  camFailed: 'Camera could not start ({msg}).',
  camNoApi: 'This browser has no camera access.',
  camInsecure: 'The camera needs a secure (https) page.',
  savingShots: 'Saving previous shots…',
  captureFailed: 'Capture failed: {msg}',
  saveFailed: 'Could not save photo: {msg}',
  hud: '{shots} · {scanned} scanned · {codes}',
  shots: (v) => `${v.n} shot${v.n === 1 ? '' : 's'}`,
  noShots: 'No shots yet — tap the shutter',
  done: 'Done',
  doneN: 'Done ({n})',
  shotScanning: 'Scanning…',
  shotEmpty: 'No code — retake?',
  viewer: 'Photo viewer',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit',
  prevImage: 'Previous photo',
  nextImage: 'Next photo',
  imageOf: 'Photo {i} / {n} · {name}',
  scanning: 'Scanning…',
  queued: 'Queued',
  notProcessed: 'Not processed',
  notProcessedYet: 'Not processed yet',
  notProcessedPress: 'Not processed yet — press Process',
  loadingPreview: 'Loading preview…',
  previewFailed: 'Preview failed: {msg}',
  heicPreviewFailed: 'HEIC preview failed',
  previewUnavailable: 'Preview unavailable',
  codes: (v) => `${v.n} code${v.n === 1 ? '' : 's'}`,
  noCode: 'No code decoded',
  error: 'Error',
  errorMsg: 'Error: {msg}',
  copy: 'Copy',
  copyAllN: 'Copy all {n}',
  copyN: (v) => `Copy ${v.n} code${v.n === 1 ? '' : 's'}`,
  copyCode: 'Copy code {tag}',
  retake: 'Retake',
  copied: 'Copied',
  copiedLines: (v) => `Copied ${v.n} line${v.n === 1 ? '' : 's'}`,
  removeImage: 'Remove photo',
  openImage: 'Open photo',
  images: (v) => `${v.n} photo${v.n === 1 ? '' : 's'}`,
  added: (v) => `Added ${v.n} photo${v.n === 1 ? '' : 's'}`,
  skippedDup: (v) => `skipped ${v.n} duplicate${v.n === 1 ? '' : 's'}`,
  unsupported: (v) => `${v.n} unsupported file${v.n === 1 ? '' : 's'} ignored`,
  removed: 'Photo removed · numbers after it shifted by one',
  stopped: 'Stopped',
  nativeAdded: 'Photo added — tap Camera again for the next one',
  progressScanning: 'Scanning photo {i} · {name}',
  progressLeft: '{n} left',
  progressQueued: '{n} queued',
  scannedOf: '{done} of {total} photos scanned',
  withNoCode: '{n} with no code (#{list})',
  failedN: '{n} failed',
  seconds: '{s}s',
  manualCopy: 'Copy is blocked here. Press and hold the text, then choose <b>Copy</b>.',
  errDecode: 'Could not decode image (unsupported or corrupt file)',
  errHeicUnavailable: 'HEIC converter unavailable',
  errHeicFailed: 'HEIC conversion failed',
  footer: 'Developed by <a href="https://www.linkedin.com/in/murat-s%C3%BCz%C3%BCk/" target="_blank" rel="noopener noreferrer">Murat Süzük</a> for <a href="https://maps.app.goo.gl/C4ZqAbtrM6eokpjM9" target="_blank" rel="noopener noreferrer">Mercan Eczanesi</a>.',
  language: 'Language',
};

const tr = {
  homeTitle: 'Bugün neyi<br>tarıyoruz?',
  cameraSub: 'Tek kare ya da bütün bir raf, art arda',
  photosSub: 'Galeriden seçin',
  folder: 'Klasör',
  folderSub: 'İçindeki tüm fotoğraflar',
  privacy: '<b>Gizlilik öncelikli.</b> Fotoğraflar cihazınızdan çıkmaz; sayfayı kapattığınızda hiçbir şey saklanmaz.',
  addPhotos: 'Fotoğraf ekle',
  actions: 'İşlemler',
  view: 'Görünüm',
  tabPhotos: 'Fotoğraflar',
  tabCodes: 'Kodlar',
  photoN: 'Fotoğraf {n}',
  codesFound: (v) => `${v.n} kod bulundu`,
  wsSubDone: '{images} içinde · kodlara yakınlaşmak için bir fotoğrafı açın',
  wsSubPending: "Kodları okumak için İşle'ye basın",
  tagline: 'Fotoğraf, klasör ya da kameradan QR ve Data Matrix okuyun — her şey tarayıcınızda, hiçbir şey yüklenmez.',
  camera: 'Kamera',
  chooseFolder: 'Klasör seç',
  photos: 'Fotoğraflar',
  loadingDecoder: 'Okuyucu yükleniyor…',
  decoderFailed: 'Okuyucu yüklenemedi: {msg}. İnternet bağlantınızı kontrol edip sayfayı yenileyin.',
  emptySubDesk: 'Fotoğrafları veya klasörleri herhangi bir yere sürükleyip bırakın ya da <kbd>⌘/Ctrl</kbd>+<kbd>V</kbd> ile yapıştırın.',
  thorough: 'Detaylı tarama',
  thoroughHint: 'Daha fazla ölçek ve ayar. Daha yavaş, ara sıra birkaç kod daha bulur.',
  thoroughSmall: 'daha yavaş, ara sıra daha fazla kod bulur',
  clearAll: 'Tümünü temizle',
  reprocessAll: 'Tümünü yeniden işle',
  process: 'İşle',
  processN: 'İşle ({n})',
  processNewN: 'Yenileri işle ({n})',
  scanningProgress: 'Taranıyor {done}/{total}',
  moreActions: 'Diğer işlemler',
  more: 'Diğer',
  close: 'Kapat',
  stop: 'Durdur',
  decodedCodes: 'Okunan kodlar',
  copyLabeled: 'Etiketli kopyala',
  copyContent: 'Sadece içeriği kopyala',
  showPlain: 'Düz metin olarak göster',
  hint: 'Etiket <code>3-2</code> = 3. fotoğraf, 2. kod — aynı renkli etiket fotoğrafın üzerinde de var. Satıra dokunursanız o koda yakınlaşır. QR, Data Matrix, Aztec ve PDF417 okunur; kod içindeki satır sonları ⏎ olarak gösterilir.',
  dropHere: 'Fotoğrafları veya klasörleri bırakın',
  singleShot: 'Tek çekim',
  singleShotDesc: 'Bir fotoğraf çekin, kodları hemen görün.',
  bulk: 'Toplu çekim',
  bulkDesc: 'Art arda çekin; fotoğraflar arka planda taranır, sonuçları sonunda görün.',
  useNativeCamera: 'Bunun yerine telefonun kamera uygulamasını kullan',
  cancel: 'Vazgeç',
  modeSingle: 'Tek',
  modeBulk: 'Toplu',
  mode: 'Mod',
  closeCamera: 'Kamerayı kapat',
  flashlight: 'Fener',
  switchCamera: 'Kamerayı değiştir',
  sound: 'Deklanşör sesi',
  liveDetect: 'Canlı algılama',
  inView: (v) => `Görüntüde ${v.n} kod`,
  zoom: 'Yakınlaştırma',
  takePhoto: 'Fotoğraf çek',
  usePhoneCamera: 'Telefonun kamera uygulamasını kullan',
  hintSingle: 'Tek çekim: kodları hemen görmek için bir kez çekin.',
  hintBulk: 'Toplu: çekmeye devam edin — her fotoğraf arka planda taranır.',
  startingCamera: 'Kamera açılıyor…',
  camBlocked: 'Kamera izni engellendi. Tarayıcı ayarlarından bu site için kameraya izin verin (iPhone: Ayarlar → Safari → Kamera) ya da telefonun kamera uygulamasını kullanın.',
  camNotFound: 'Bu cihazda kamera bulunamadı.',
  camBusy: 'Kamera başka bir uygulamada kullanılıyor. Onu kapatıp tekrar deneyin.',
  camFailed: 'Kamera açılamadı ({msg}).',
  camNoApi: 'Bu tarayıcı kameraya erişemiyor.',
  camInsecure: 'Kamera için güvenli (https) bir sayfa gerekir.',
  savingShots: 'Önceki çekimler kaydediliyor…',
  captureFailed: 'Çekim başarısız: {msg}',
  saveFailed: 'Fotoğraf kaydedilemedi: {msg}',
  hud: '{shots} · {scanned} tarandı · {codes}',
  shots: (v) => `${v.n} çekim`,
  noShots: 'Henüz çekim yok — deklanşöre dokunun',
  done: 'Bitti',
  doneN: 'Bitti ({n})',
  shotScanning: 'Taranıyor…',
  shotEmpty: 'Kod yok — tekrar çekin?',
  viewer: 'Fotoğraf görüntüleyici',
  zoomIn: 'Yakınlaştır',
  zoomOut: 'Uzaklaştır',
  fit: 'Sığdır',
  prevImage: 'Önceki fotoğraf',
  nextImage: 'Sonraki fotoğraf',
  imageOf: 'Fotoğraf {i} / {n} · {name}',
  scanning: 'Taranıyor…',
  queued: 'Sırada',
  notProcessed: 'İşlenmedi',
  notProcessedYet: 'Henüz işlenmedi',
  notProcessedPress: "Henüz işlenmedi — İşle'ye basın",
  loadingPreview: 'Önizleme yükleniyor…',
  previewFailed: 'Önizleme başarısız: {msg}',
  heicPreviewFailed: 'HEIC önizlemesi başarısız',
  previewUnavailable: 'Önizleme yok',
  codes: (v) => `${v.n} kod`,
  noCode: 'Kod okunamadı',
  error: 'Hata',
  errorMsg: 'Hata: {msg}',
  copy: 'Kopyala',
  copyAllN: 'Tümünü kopyala ({n})',
  copyN: '{n} kodu kopyala',
  copyCode: '{tag} kodunu kopyala',
  retake: 'Tekrar çek',
  copied: 'Kopyalandı',
  copiedLines: (v) => `${v.n} satır kopyalandı`,
  removeImage: 'Fotoğrafı kaldır',
  openImage: 'Fotoğrafı aç',
  images: (v) => `${v.n} fotoğraf`,
  added: (v) => `${v.n} fotoğraf eklendi`,
  skippedDup: (v) => `${v.n} tekrar eden atlandı`,
  unsupported: (v) => `${v.n} desteklenmeyen dosya yok sayıldı`,
  removed: 'Fotoğraf kaldırıldı · sonraki numaralar birer kaydı',
  stopped: 'Durduruldu',
  nativeAdded: "Fotoğraf eklendi — sonraki için tekrar Kamera'ya dokunun",
  progressScanning: '{i}. fotoğraf taranıyor · {name}',
  progressLeft: '{n} kaldı',
  progressQueued: '{n} sırada',
  scannedOf: '{done}/{total} fotoğraf tarandı',
  withNoCode: '{n} fotoğrafta kod yok (#{list})',
  failedN: '{n} başarısız',
  seconds: '{s} sn',
  manualCopy: "Burada kopyalama engellendi. Metne basılı tutup <b>Kopyala</b>'yı seçin.",
  errDecode: 'Resim açılamadı (desteklenmeyen veya bozuk dosya)',
  errHeicUnavailable: 'HEIC dönüştürücü yüklenemedi',
  errHeicFailed: 'HEIC dönüştürme başarısız',
  footer: '<a href="https://www.linkedin.com/in/murat-s%C3%BCz%C3%BCk/" target="_blank" rel="noopener noreferrer">Murat Süzük</a> tarafından <a href="https://maps.app.goo.gl/C4ZqAbtrM6eokpjM9" target="_blank" rel="noopener noreferrer">Mercan Eczanesi</a> için geliştirilmiştir.',
  language: 'Dil',
};

const DICT = { en, tr };
const listeners = new Set();

function detect() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && DICT[saved]) return saved;
  } catch { /* storage blocked */ }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  return /^tr\b/i.test(langs[0] || '') ? 'tr' : 'en';
}

let lang = detect();

export function getLang() {
  return lang;
}

/** Translate key with {var} substitution. Unknown keys fall back to English, then the key. */
export function t(key, vars = {}) {
  const s = DICT[lang][key] ?? en[key] ?? key;
  if (typeof s === 'function') return s(vars);
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

/** Locale-aware decimal, e.g. 1.2 / 1,2 */
export function num(x, digits = 1) {
  return x.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

export function setLang(l) {
  if (!DICT[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ }
  applyI18n();
  listeners.forEach(fn => fn(l));
}

export function onLangChange(fn) {
  listeners.add(fn);
}
