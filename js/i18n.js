// UI strings (English / Turkish). Turkish when the browser language is Turkish, English otherwise;
// the header toggle overrides it and is remembered.
//
// Static markup uses data-i18n (text), data-i18n-html (trusted markup from this file only),
// data-i18n-title and data-i18n-aria. Code renders with t(key, vars).

const LANG_KEY = 'bqr.lang';

const en = {
  tagline: 'QR & Data Matrix from photos, folders or the camera — all in your browser, nothing is uploaded.',
  camera: 'Camera',
  chooseImages: 'Choose images',
  chooseFolder: 'Choose folder',
  photos: 'Photos',
  loadingDecoder: 'Loading decoder…',
  decoderFailed: 'Decoder failed to load: {msg}. Check your internet connection and reload.',
  emptyTitle: 'Scan codes from photos',
  emptySubDesk: 'Drag &amp; drop images or folders anywhere, or paste with <kbd>⌘/Ctrl</kbd>+<kbd>V</kbd>.',
  emptySubTouch: 'Take photos with the camera or pick them from your library.',
  scanWithCamera: 'Scan with camera',
  choosePhotos: 'Choose photos',
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
  hint: 'Tag <code>3-2</code> = image 3, code 2 — the same colored tag is drawn on the image. Tap a row to zoom to it. Reads QR, Data Matrix, Aztec and PDF417; line breaks inside a code are shown as ⏎.',
  dropHere: 'Drop images or folders',
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
  viewer: 'Image viewer',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit',
  prevImage: 'Previous image',
  nextImage: 'Next image',
  imageOf: 'Image {i} / {n} · {name}',
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
  copyCode: 'Copy code {tag}',
  retake: 'Retake',
  copied: 'Copied',
  copiedLines: (v) => `Copied ${v.n} line${v.n === 1 ? '' : 's'}`,
  removeImage: 'Remove image',
  openImage: 'Open image',
  images: (v) => `${v.n} image${v.n === 1 ? '' : 's'}`,
  added: (v) => `Added ${v.n} image${v.n === 1 ? '' : 's'}`,
  skippedDup: (v) => `skipped ${v.n} duplicate${v.n === 1 ? '' : 's'}`,
  unsupported: (v) => `${v.n} unsupported file${v.n === 1 ? '' : 's'} ignored`,
  removed: 'Image removed · numbers after it shifted by one',
  stopped: 'Stopped',
  nativeAdded: 'Photo added — tap Camera again for the next one',
  progressScanning: 'Scanning image {i} · {name}',
  progressLeft: '{n} left',
  progressQueued: '{n} queued',
  scannedOf: '{done} of {total} images scanned',
  withNoCode: '{n} with no code (#{list})',
  failedN: '{n} failed',
  seconds: '{s}s',
  manualCopy: 'Copy is blocked here. Press and hold the text, then choose <b>Copy</b>.',
  errDecode: 'Could not decode image (unsupported or corrupt file)',
  errHeicUnavailable: 'HEIC converter unavailable',
  errHeicFailed: 'HEIC conversion failed',
  footer: 'Developed by <b>Murat Süzük</b> for <b>Mercan Eczanesi</b>.',
  language: 'Language',
};

const tr = {
  tagline: 'Fotoğraf, klasör ya da kameradan QR ve Data Matrix okuyun — her şey tarayıcınızda, hiçbir şey yüklenmez.',
  camera: 'Kamera',
  chooseImages: 'Resim seç',
  chooseFolder: 'Klasör seç',
  photos: 'Fotoğraf',
  loadingDecoder: 'Okuyucu yükleniyor…',
  decoderFailed: 'Okuyucu yüklenemedi: {msg}. İnternet bağlantınızı kontrol edip sayfayı yenileyin.',
  emptyTitle: 'Fotoğraflardan kod okuyun',
  emptySubDesk: 'Resimleri veya klasörleri herhangi bir yere sürükleyip bırakın ya da <kbd>⌘/Ctrl</kbd>+<kbd>V</kbd> ile yapıştırın.',
  emptySubTouch: 'Kamerayla çekin ya da galeriden seçin.',
  scanWithCamera: 'Kamerayla tara',
  choosePhotos: 'Fotoğraf seç',
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
  hint: 'Etiket <code>3-2</code> = 3. resim, 2. kod — aynı renkli etiket resmin üzerinde de var. Satıra dokunursanız o koda yakınlaşır. QR, Data Matrix, Aztec ve PDF417 okunur; kod içindeki satır sonları ⏎ olarak gösterilir.',
  dropHere: 'Resimleri veya klasörleri bırakın',
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
  viewer: 'Resim görüntüleyici',
  zoomIn: 'Yakınlaştır',
  zoomOut: 'Uzaklaştır',
  fit: 'Sığdır',
  prevImage: 'Önceki resim',
  nextImage: 'Sonraki resim',
  imageOf: 'Resim {i} / {n} · {name}',
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
  copyCode: '{tag} kodunu kopyala',
  retake: 'Tekrar çek',
  copied: 'Kopyalandı',
  copiedLines: (v) => `${v.n} satır kopyalandı`,
  removeImage: 'Resmi kaldır',
  openImage: 'Resmi aç',
  images: (v) => `${v.n} resim`,
  added: (v) => `${v.n} resim eklendi`,
  skippedDup: (v) => `${v.n} tekrar eden atlandı`,
  unsupported: (v) => `${v.n} desteklenmeyen dosya yok sayıldı`,
  removed: 'Resim kaldırıldı · sonraki numaralar birer kaydı',
  stopped: 'Durduruldu',
  nativeAdded: "Fotoğraf eklendi — sonraki için tekrar Kamera'ya dokunun",
  progressScanning: '{i}. resim taranıyor · {name}',
  progressLeft: '{n} kaldı',
  progressQueued: '{n} sırada',
  scannedOf: '{done}/{total} resim tarandı',
  withNoCode: '{n} resimde kod yok (#{list})',
  failedN: '{n} başarısız',
  seconds: '{s} sn',
  manualCopy: "Burada kopyalama engellendi. Metne basılı tutup <b>Kopyala</b>'yı seçin.",
  errDecode: 'Resim açılamadı (desteklenmeyen veya bozuk dosya)',
  errHeicUnavailable: 'HEIC dönüştürücü yüklenemedi',
  errHeicFailed: 'HEIC dönüştürme başarısız',
  footer: '<b>Murat Süzük</b> tarafından <b>Mercan Eczanesi</b> için geliştirilmiştir.',
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
