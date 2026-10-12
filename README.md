# Bulk QR Reader

Read every QR / Data Matrix code in many photos, folders or camera shots, entirely in the browser.
Nothing is uploaded. Works on phones (mobile-first UI) and desktop.

It reads QR (including Micro and rMQR), Data Matrix (such as the GS1/ITS codes on medicine boxes), Aztec and PDF417.
GS1 content is shown in human-readable form, for example `(01)08699522095711(21)…(17)280331(10)…`.

## Use

- **Photos or folders:** drag & drop, use **Choose images** / **Choose folder**, or paste with ⌘/Ctrl+V. Then press **Process**.
  Previews appear right away, including HEIC.
- **Camera:** tap **Camera** and pick a mode.
  - **Single shot:** snap once. The photo opens with its codes tagged and copy buttons below it.
  - **Bulk:** keep snapping. Every shot is scanned in the background. Green dots show the code count for each shot; an orange dot means no code was found, so you can retake it. **Done** shows everything.
  - **Use the phone's camera app:** a fallback for full native-camera quality, or when camera access is blocked.
- **Results.**
  - Each image gets colored tags `#image-code`.
  - The list below shows the same colored tag `3-2` next to each code. Tap a row to zoom to that code; **Copy** copies one code.
  - **Copy with labels** / **Copy content only** copy everything as plain text, one line per code. Line breaks inside a code become `⏎`.
  - Images where nothing was decoded get an orange dashed frame and "No code decoded". A code that was missed has no tag on the image.
- **Viewer.** Pinch or scroll to zoom up to the original resolution. Double-tap zooms. Swipe or use ←/→ to move between images.

Supported formats: JPEG, PNG, HEIC/HEIF, WebP, AVIF, GIF (first frame), BMP. Safari decodes HEIC itself; other browsers load a converter only when needed.

**How images are scanned:** several scales and binarizer settings are combined. Photos larger than 4096px are also scanned as full-resolution tiles, so small codes in big photos aren't lost. **Thorough scan** (in the ⋯ menu on phones) adds more scales; it is slower.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.

The camera needs a secure context. `localhost` works, but `http://192.168.x.x` from another device does not. To test on a phone, use the GitHub Pages URL or an https tunnel.

## Deploy to GitHub Pages

Push to GitHub, then go to **Settings → Pages → Deploy from a branch → `main` / root**.
There is no build step, and all paths are relative, so it works under `https://<user>.github.io/<repo>/`.

## Libraries (from jsDelivr, pinned)

- [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) 3.1.5 decodes multiple 2D codes with corner positions. It runs in a Web Worker.
- [heic-to](https://github.com/hoppergee/heic-to) 1.6.6 converts HEIC. It is loaded only when the browser can't decode HEIC natively.

## Development tools

- `tools/selftest.html` runs the real scanner on generated images and shows pass/fail.
  - Cases: reading order, rotation, multi-line, inverted codes, no code, an 8000×6000 image with tiny codes, a big + tiny code, identical codes, a code on a tile seam, cancel, and EXIF orientation.
  - Results are also exposed as `window.selftestResult`.
- `tools/make-test-images.html` lets you download the same test images.
- `?debug=1` exposes `window.__app`.
- `?fakecam=1` replaces the camera with a generated stream of codes. Add `&portrait=1` or `&deny=1` to test portrait mode or a denied permission.
