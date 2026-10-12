# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bulk QR Reader is a static, browser-only page for GitHub Pages. There is no backend and no build step. Do not add either one.

- The user drops images, files or folders.
- Every QR code is decoded.
- Each image gets numbered, colored tags drawn on it.
- A text box lists the codes as `[imageNo-qrNo] content`.

The UI is in English.

## Commands

```bash
python3 -m http.server 8000      # serve the repo, then open http://localhost:8000/
```

- `.claude/launch.json` serves the **parent** folder on port 8765, so the app runs at `/bulk-qr-reader/`. This checks that it works under a GitHub Pages subpath.
- There are no tests or linter.
- To verify a change, open `tools/make-test-images.html`. It generates known QR layouts and exposes them as `window.testImages`. Feed them into the app with a synthetic `drop` event that carries a `DataTransfer`.

## Constraints

- Plain ES modules, loaded with `<script type="module">`.
- Every path must be relative: `./…`, and the worker is created with `new URL(..., import.meta.url)`. A leading `/` breaks GitHub Pages subpaths.
- Third-party code comes only from jsDelivr with **pinned versions**. All URLs live in `js/config.js`.

## Architecture

Data flow: `intake.js` → `app.js` (state + processing loop) → `imageLoader.js` / `scanner.js` → `decoderClient.js` ⇄ `decoder.worker.js` → `render.js`.

- **Numbering is derived, never stored.**
  - The image number is its index in `state.items` + 1.
  - The QR number is its index in `item.qrs` + 1.
  - Removing an image renumbers everything after it. `render.js` redraws a canvas when its `drawnKey` (which includes the image number) changes.
- **Coordinates.**
  - `item.qrs[].points` are always in *natural* (full-resolution) image pixels.
  - The display bitmap is capped at `DISPLAY_MAX` (2048). The overlay multiplies points by `item.displayScale`.
  - The worker maps decoder points back with `x * invScale + offsetX`.
- **Formats.** `READER_OPTIONS.formats` in `config.js` covers QR, Micro QR, rMQR, Data Matrix, Aztec and PDF417. The main real-world case is pharma boxes (GS1/ITS), which use **Data Matrix**, not QR. `textMode` is left at the zxing default `HRI`, so GS1 content reads as `(01)…(21)…`. The UI says "code", not "QR".
- **Scan passes** (`scanner.js`). Every image runs:
  - a 2048px pass with default settings;
  - a `DECODE_MAX` (4096) pass with `tryDenoise` and with the `GlobalHistogram` binarizer.

  The worker runs every `variants` entry on the same ImageData. Measured on a 48MP shelf photo of Data Matrix codes:

  | Pass | Codes found |
  |---|---|
  | 4096 default only | 29 |
  | 2048 default | 38 |
  | Union of the passes | 39 |

  Downscaling helps because full-resolution phone photos are noisy. Thorough mode adds:
  - more scales (1536 and 3072);
  - full-resolution tiles with 20% overlap, for images larger than 4096;
  - a 2× upscale for images under 800px. This upscale also runs in normal mode when nothing was found.

  Results go through `geometry.mergeResults`, which treats the same text with nearby centers as one code, so the same code seen by several passes collapses to one. Identical codes at different spots are kept as separate codes. They are then sorted with `geometry.readingOrder`.
- **Worker.** `decoder.worker.js` loads zxing-wasm from the CDN and posts `ready` or `fatal`. Bitmaps are *transferred* to the worker, so send a copy (`createImageBitmap(full)`) if you still need the source.
- **HEIC.**
  - `createImageBitmap` is tried first; Safari decodes HEIC natively.
  - If that fails and the file looks like HEIC (by extension, MIME type or `ftyp` brand sniff), `heic-to` is lazy-imported on the main thread, because it needs `document`.
  - After processing, HEIC items get a JPEG `thumbUrl` generated from the display bitmap.
- **Drag & drop.** `fromDrop` must call `webkitGetAsEntry()` synchronously before any `await`. Directory readers must loop `readEntries()` until it returns an empty batch.
- **Output text.** `geometry.flattenText` replaces newlines with ` ⏎ ` so each QR is exactly one line.
