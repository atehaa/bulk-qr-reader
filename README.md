# Bulk QR Reader

Read every QR / Data Matrix code in many images at once, entirely in the browser. Nothing is uploaded.
Reads QR (incl. Micro/rMQR), Data Matrix (e.g. GS1/ITS codes on medicine boxes), Aztec and PDF417.
GS1 content is shown human-readable, e.g. `(01)08699522095711(21)…(17)280331(10)…`.

1. Drag & drop images or whole folders (or use **Choose images** / **Choose folder**, or paste with ⌘/Ctrl+V).
2. Review the numbered previews, then press **Process**.
3. Each image gets colored boxes tagged `#image-code`. The text box lists one line per code: `[3-2] content`
   (image 3, code 2). Images with no code found get an orange dashed border, and codes that were missed have no tag.
4. **Copy with labels** or **Copy content only**.

Supported: JPEG, PNG, HEIC/HEIF, WebP, AVIF, GIF (first frame), BMP. HEIC is decoded natively in Safari.
Other browsers lazy-load a converter. Line breaks inside a code are shown as `⏎`, so every code stays on one line.

Every image is decoded at several scales and with several binarizer settings, and the results are merged.
Phone photos are noisy at full resolution, so a downscaled copy often reads more codes.
**Thorough scan** adds more scales, full-resolution tiles and upscaling. It takes about 2× longer and occasionally finds a few more codes.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Deploy to GitHub Pages

Push to GitHub, then go to **Settings → Pages → Deploy from a branch → `main` / root**.
There is no build step, and all paths are relative, so it works under `https://<user>.github.io/<repo>/`.

## Libraries (from jsDelivr, pinned)

- [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) 3.1.5 decodes multiple 2D codes with corner positions. It runs in a Web Worker.
- [heic-to](https://github.com/hoppergee/heic-to) 1.6.6 converts HEIC. It is only loaded when a HEIC file can't be decoded natively.

## Test images

`tools/make-test-images.html` generates images with known QR layouts. These include rows with jitter, rotated codes,
multi-line/Unicode content, inverted codes, an image with no QR, an 8000×6000 image with tiny codes, and duplicate content.
