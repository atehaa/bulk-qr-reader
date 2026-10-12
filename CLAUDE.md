# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bulk QR Reader is a static, browser-only page for GitHub Pages. There is no backend and no build step; do not add one, and do not add a PWA (the user declined).

- **Input:** photos, folders or camera shots.
- **Decoding:** every QR / Data Matrix / Aztec / PDF417 code is decoded.
- **Image tags:** each code gets a colored `#image-code` tag on the image.
- **Results:** a grouped, colored list of all codes, with plain-text copy (`[3-2] content` or content only).

**Context:**
- The UI is in English. The user writes in Turkish.
- The app is **mobile-first**, and desktop must keep working.
- A key real-world case is GS1/ITS Data Matrix codes on medicine boxes, photographed as 24–48MP iPhone HEIC files.

## Commands

```bash
python3 -m http.server 8000      # serve the repo, then open http://localhost:8000/
```

**Dev server:** `.claude/launch.json` serves the **parent** folder on port 8765, so the app runs at `/bulk-qr-reader/`. This checks that it works under a GitHub Pages subpath.

**Tests:** open `tools/selftest.html` and wait for `window.selftestResult.done`. Every case must pass.
- To add a case, add an entry to `tools/scenarios.js` (`expect` = texts in reading order, or `contains`).
- There is no linter.

**URL flags:**
- `?debug=1` exposes `window.__app` (`addFiles`, `process`, `stop`, `clear`, `reprocess`, `viewer`, `camera`, `stats`).
- `?fakecam=1` (optionally `&portrait=1`, `&deny=1`) replaces `getUserMedia` with a canvas stream (`tools/fakecam.js`).

**Gotchas when driving the Browser pane:**
- In a hidden pane, `requestAnimationFrame` doesn't run and timers and heic-to are heavily throttled (a 48MP HEIC took ~30s instead of ~5s). `zoomPan.animateTo` jumps to the end state when `document.hidden`.
- Synthetic touch `PointerEvent`s need distinct `pointerId`s.
- `beforeunload` blocks reloads once results exist. Navigate with `force`.

## Constraints

- Plain ES modules, loaded with `<script type="module">`.
- Every path must be relative: `./…`, and workers are created with `new URL(..., import.meta.url)`. A leading `/` breaks GitHub Pages subpaths.
- Third-party code comes only from jsDelivr with **pinned versions**. The URLs are in `js/config.js`; `tools/scenarios.js` also pins the zxing writer.
- Decoded content is untrusted: render it with `textContent` only, and never auto-link it.

## Architecture

**Data flow:** `intake.js` / `camera.js` → `app.js` (state + queue) → `imageLoader.js` + `scanner.js` → `decoderClient.js` ⇄ `decoder.worker.js` → `render.js` (cards + list) / `viewer.js` (zoomable viewer). Tags are drawn by `overlay.js` as SVG over an `<img>`.

### Processing queue and cancellation (`app.js`)
- **Statuses:** `pending → queued → processing → done | error`. There is a single `pump()` loop, and items with higher `priority` go first (single-shot captures use 1).
- **Interrupting a scan.** Stop, Clear, Re-process and priority pre-emption all follow the same rule. Whoever interrupts a scan:
  1. aborts its `AbortController`;
  2. **sets the item's new status itself**;
  3. bumps `item.scanToken`; Stop, Clear and Re-process also bump `state.runGen`.
- **Late results.** `processItem` commits only if `isCurrent()` holds. A late worker result is dropped. The AbortError handler never touches the status.
- **Decode lock.** `scanner.js` checks the signal before every pass and tile. All full-resolution decodes (thumbnails, scans, viewer conversion) go through `withDecodeLock` (FIFO), so two 48MP bitmaps never coexist.

### Images and memory
- **No large bitmaps are kept.** Each item has:
  - a ≤1024px JPEG `thumbUrl`, produced by `thumbnailer.js` (a serial queue where visible cards go first; this also gives HEIC previews before processing), or by the scan via `thumbFromBitmap`;
  - natural `width`/`height`;
  - `nativeDecodable`.
- **Viewer source** (`imageLoader.getViewerSource`):
  - If the browser decodes the file itself, the original file is used through an objectURL.
  - Otherwise (HEIC outside Safari), heic-to produces a full-resolution JPEG. Only the last 3 are cached.
- **Coordinates.** `item.qrs[].points` are always in *natural* (orientation-applied) pixels. The SVG `viewBox` is `0 0 width height`, with the default `xMidYMid meet`. That matches an `<img>` with `object-fit: contain` in the same box, so cards can be any size.
- **Labels.** `overlay.layoutLabels(svg, k)` sizes tags for the current CSS-px-per-image-px `k`. It is called on card resize and after each viewer zoom commit. Tags are hidden when the code is under 12px on screen.

### Numbering is derived, never stored
- The image number is its index in `state.items` + 1; the code number is its index in `item.qrs` + 1.
- Removing an image renumbers the images after it. Cards and result groups rebuild when their key (which includes the number) changes.

### Scanning (`scanner.js`)
- **Normal mode:**
  - a 2048px pass with the default settings;
  - a 4096px pass with `tryDenoise` and with the `GlobalHistogram` binarizer. The worker runs every `variants` entry on the same ImageData;
  - when the long side is >4096: **full-resolution tiles** from `planTiles`, each ≤16M px (the iOS canvas limit) with ≥15% overlap.
- **Thorough mode:** adds 1536px and 3072px passes and denoise on tiles.
- **Small images:** images under 800px are upscaled 2× when nothing was found (and always in Thorough mode).
- **Merging.** `geometry.mergeResults` treats the same text with nearby centers as one code. Identical codes at different spots stay separate. `geometry.readingOrder` sorts rows with a tolerance of max(½ the median code size, 2% of the image height).
- **Why downscaled passes:** full-resolution phone photos are noisy. On the user's 48MP shelf photo of 40 Data Matrix codes, a 4096px default pass alone found 29, a 2048px pass found 38, and the union found 39.

### Formats and text
- `READER_OPTIONS.formats` covers QR, Micro QR, rMQR, Data Matrix, Aztec and PDF417. `textMode` stays at zxing's default `HRI`, so GS1 reads as `(01)…(21)…`. Do **not** switch it to `Plain`: the user chose HRI, and Plain's GS separators get lost when copied.
- `q.text` is the raw text. `geometry.flattenText` (newlines become ` ⏎ `) is applied only to list and copy-all output. A single-row Copy copies the raw text.

### Camera (`camera.js`)
- **Starting the stream:** `getUserMedia` is called with no `await` before it (it must stay in the user gesture). The constraint is 4:3 with an ideal size of 4032×3024; the delivered size is read back.
- **Bulk:** `createImageBitmap(video)` frames go to a serial JPEG encode queue, and the shutter shows busy above `CAPTURE_QUEUE_MAX`.
- **Single:** uses `ImageCapture.takePhoto` (1.5s timeout) only when the video is under 3000px. The captured bitmap is handed to the scan as `item.prefetched`.
- **Lifecycle:** tracks stop on close and when the page is hidden, and restart when it becomes visible again.
- **Fallback:** `<input capture="environment">`.

### Modals and history (`nav.js`)
- The camera chooser, camera and viewer push history entries, so Android back and the iOS swipe close them.
- Closing one modal and opening another in the same task (chooser → camera, camera → result viewer, Retake) **reuses** the history entry. Otherwise `history.back()` races `pushState` and navigates off the page.
- Toasts and the clipboard fallback mount inside the top-most open `<dialog>`; otherwise they would be hidden behind it.

### Other
- **Drag & drop:** `fromDrop` must call `webkitGetAsEntry()` synchronously before any `await`. Directory readers must loop `readEntries()` until it returns an empty batch.
- **Clipboard:** `copyText` must be called synchronously from the click handler. It tries the async API, then `execCommand` inside the open dialog, then a "press and hold to copy" sheet. It never reports success on failure.
