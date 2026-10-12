// Collect image files from pickers and drag & drop (including nested folders).
import { ACCEPTED_EXTENSIONS, ACCEPTED_MIME } from './config.js';

/** { file, relPath } pairs from a FileList (file or folder picker). */
export function fromFileList(list) {
  return Array.from(list, f => ({ file: f, relPath: f.webkitRelativePath || f.name }));
}

/**
 * { file, relPath } pairs from a drop event. Entries must be grabbed synchronously:
 * the DataTransferItemList is emptied as soon as the handler yields.
 */
export function fromDrop(event) {
  const dt = event.dataTransfer;
  const roots = [];
  const loose = [];
  for (const item of dt.items ?? []) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) roots.push(entry);
    else {
      const f = item.getAsFile();
      if (f) loose.push({ file: f, relPath: f.name });
    }
  }
  if (!roots.length && !loose.length && dt.files?.length) return Promise.resolve(fromFileList(dt.files));
  return Promise.all(roots.map(e => walkEntry(e, ''))).then(lists => [...loose, ...lists.flat()]);
}

async function walkEntry(entry, prefix) {
  const path = prefix + entry.name;
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej)).catch(() => null);
    return file ? [{ file, relPath: path }] : [];
  }
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const children = [];
  // readEntries returns batches (100 in Chrome); keep reading until empty.
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej)).catch(() => []);
    if (!batch.length) break;
    children.push(...batch);
  }
  const lists = await Promise.all(children.map(c => walkEntry(c, path + '/')));
  return lists.flat();
}

export function isAcceptedImage(file) {
  if (file.name.startsWith('.')) return false; // .DS_Store, macOS ._AppleDouble files
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  return ACCEPTED_MIME.has(file.type) || ACCEPTED_EXTENSIONS.has(ext);
}

export function dedupeKey({ file, relPath }) {
  return `${relPath}|${file.size}|${file.lastModified}`;
}

/** Split candidates into accepted (natural-sorted by path) and counts of rejected ones. */
export function filterCandidates(candidates, existingKeys) {
  const accepted = [];
  const seen = new Set(existingKeys);
  let unsupported = 0;
  let duplicates = 0;
  for (const c of candidates) {
    if (c.file.name.startsWith('.')) continue; // silently ignore hidden/system files
    if (!isAcceptedImage(c.file)) { unsupported++; continue; }
    const key = dedupeKey(c);
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    accepted.push({ ...c, key });
  }
  accepted.sort((a, b) => a.relPath.localeCompare(b.relPath, undefined, { numeric: true, sensitivity: 'base' }));
  return { accepted, unsupported, duplicates };
}

let synthCounter = 0;
/** Unique file name for camera captures / pastes, e.g. camera-20261012-221530-007.jpg */
export function syntheticName(prefix, ext) {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${prefix}-${stamp}-${p(++synthCounter, 3)}.${ext}`;
}
