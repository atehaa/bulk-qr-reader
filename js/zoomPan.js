// Pinch / pan / double-tap / wheel zoom for one image in a stage element.
//
// During a gesture the content is moved with a CSS transform (cheap). When the gesture settles,
// the scale is committed to layout (content width = W*s, transform scale 1) so the browser
// re-rasterises the original image and SVG tags crisply at the new size.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createZoomPan(stage, content, { onCommit, onSwipe, onTap, onGesture } = {}) {
  let W = 1;
  let H = 1;
  let S = 1; // live scale (CSS px per image px)
  let TX = 0;
  let TY = 0;
  let base = 1; // scale committed to layout
  let commitTimer = 0;
  let anim = 0;
  const pointers = new Map();
  let gesture = null; // {type:'pan'|'swipe'|'pinch', ...}
  let lastTap = null;

  const view = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  const fitScale = () => {
    const { w, h } = view();
    return Math.min(w / W, h / H);
  };
  const maxScale = () => Math.max(fitScale() * 4, 1.5);
  const isZoomed = () => S > fitScale() * 1.02;

  function clampTranslate() {
    const { w, h } = view();
    const cw = W * S;
    const ch = H * S;
    TX = cw <= w ? (w - cw) / 2 : clamp(TX, w - cw, 0);
    TY = ch <= h ? (h - ch) / 2 : clamp(TY, h - ch, 0);
  }

  function apply() {
    content.style.transform = `translate(${TX}px, ${TY}px) scale(${S / base})`;
  }

  function commit() {
    clearTimeout(commitTimer);
    base = S;
    content.style.width = `${W * S}px`;
    content.style.height = `${H * S}px`;
    apply();
    onCommit?.(S);
  }

  function scheduleCommit() {
    clearTimeout(commitTimer);
    commitTimer = setTimeout(commit, 140);
  }

  /** Zoom to scale s keeping the stage point (px, py) fixed. */
  function zoomAbout(s, px, py) {
    const ns = clamp(s, fitScale(), maxScale());
    TX = px - (px - TX) * (ns / S);
    TY = py - (py - TY) * (ns / S);
    S = ns;
    clampTranslate();
    apply();
  }

  function animateTo(ns, ntx, nty, ms = 220) {
    cancelAnimationFrame(anim);
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      [S, TX, TY] = [ns, ntx, nty];
      commit();
      return;
    }
    const [s0, x0, y0] = [S, TX, TY];
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - (1 - p) ** 3;
      S = s0 + (ns - s0) * e;
      TX = x0 + (ntx - x0) * e;
      TY = y0 + (nty - y0) * e;
      apply();
      if (p < 1) anim = requestAnimationFrame(step);
      else commit();
    };
    anim = requestAnimationFrame(step);
  }

  /** Target translate for scale ns keeping stage point (px,py) fixed, clamped. */
  function targetAbout(ns, px, py) {
    const save = [S, TX, TY];
    TX = px - (px - TX) * (ns / S);
    TY = py - (py - TY) * (ns / S);
    S = ns;
    clampTranslate();
    const out = [S, TX, TY];
    [S, TX, TY] = save;
    return out;
  }

  function local(e) {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startGesture() {
    const pts = [...pointers.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture = {
        type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, S0: S, TX0: TX, TY0: TY,
      };
    } else if (pts.length === 1) {
      const p = pts[0];
      gesture = { type: isZoomed() ? 'pan' : 'swipe', x0: p.x, y0: p.y, TX0: TX, TY0: TY, t0: performance.now(), moved: 0 };
    } else {
      gesture = null;
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    cancelAnimationFrame(anim);
    try { stage.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    pointers.set(e.pointerId, local(e));
    onGesture?.(true);
    startGesture();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (!gesture) return;
    const pts = [...pointers.values()];
    if (gesture.type === 'pinch' && pts.length >= 2) {
      const [a, b] = pts;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ns = clamp(gesture.S0 * (d / gesture.d0), fitScale() * 0.8, maxScale() * 1.2);
      // image point under the starting midpoint follows the current midpoint
      const ix = (gesture.m0.x - gesture.TX0) / gesture.S0;
      const iy = (gesture.m0.y - gesture.TY0) / gesture.S0;
      S = ns;
      TX = m.x - ix * ns;
      TY = m.y - iy * ns;
      apply();
    } else if (pts.length === 1) {
      const p = pts[0];
      const dx = p.x - gesture.x0;
      const dy = p.y - gesture.y0;
      gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
      if (gesture.type === 'pan') {
        TX = gesture.TX0 + dx;
        TY = gesture.TY0 + dy;
        clampTranslate();
      } else {
        TX = gesture.TX0 + dx; // swipe preview: horizontal only
      }
      apply();
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    const g = gesture;
    if (g?.type === 'pinch') {
      if (pointers.size === 0) settle();
      else {
        startGesture(); // continue as pan with the remaining finger
        gesture.moved = Infinity; // ...but never as a tap
      }
      return;
    }
    if (g && pointers.size === 0) {
      const dt = performance.now() - g.t0;
      const dx = p.x - g.x0;
      if (g.moved < 10 && dt < 300) {
        handleTap(p);
        if (g.type === 'swipe') { TX = g.TX0; apply(); }
      } else if (g.type === 'swipe') {
        const { w } = view();
        const v = Math.abs(dx) / Math.max(dt, 1);
        if ((Math.abs(dx) > w * 0.25 || (v > 0.5 && Math.abs(dx) > 50)) && onSwipe) {
          onSwipe(dx < 0 ? 1 : -1);
        } else {
          animateTo(S, g.TX0, TY);
        }
      } else {
        commit();
      }
    }
    gesture = null;
    onGesture?.(false);
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  function settle() {
    const fs = fitScale();
    const ns = clamp(S, fs, maxScale());
    const { w, h } = view();
    const [s, tx, ty] = targetAbout(ns, w / 2, h / 2);
    if (Math.abs(s - S) > 1e-3 || Math.abs(tx - TX) > 0.5 || Math.abs(ty - TY) > 0.5) animateTo(s, tx, ty);
    else commit();
  }

  function handleTap(p) {
    const now = performance.now();
    if (lastTap && now - lastTap.t < 300 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
      lastTap = null;
      clearTimeout(handleTap.timer);
      const fs = fitScale();
      if (isZoomed()) {
        fitView(true);
      } else {
        const [s, tx, ty] = targetAbout(Math.min(maxScale(), Math.max(fs * 2.5, 0.5)), p.x, p.y);
        animateTo(s, tx, ty);
      }
      return;
    }
    lastTap = { t: now, x: p.x, y: p.y };
    clearTimeout(handleTap.timer);
    handleTap.timer = setTimeout(() => onTap?.(p), 300);
  }

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    cancelAnimationFrame(anim);
    const p = local(e);
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
    zoomAbout(S * factor, p.x, p.y);
    scheduleCommit();
  }, { passive: false });

  // Safari (macOS trackpad pinch, iOS): gesture events. Only used when pointers aren't pinching.
  let gs0 = 1;
  stage.addEventListener('gesturestart', (e) => { e.preventDefault(); gs0 = S; });
  stage.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (pointers.size >= 2) return;
    const p = local(e);
    zoomAbout(gs0 * e.scale, p.x, p.y);
    scheduleCommit();
  });
  stage.addEventListener('gestureend', (e) => e.preventDefault());

  function fitView(animated = false) {
    const fs = fitScale();
    const { w, h } = view();
    const tx = (w - W * fs) / 2;
    const ty = (h - H * fs) / 2;
    if (animated) animateTo(fs, tx, ty);
    else {
      S = fs;
      TX = tx;
      TY = ty;
      commit();
    }
  }

  new ResizeObserver(() => {
    if (!isZoomed()) fitView();
    else { clampTranslate(); commit(); }
  }).observe(stage);

  return {
    /** New image of natural size w×h; resets to fit. */
    setImage(w, h) {
      W = w || 1;
      H = h || 1;
      S = 0.0001; // force fit on next call
      fitView();
    },
    fit: () => fitView(true),
    zoomBy(f) {
      const { w, h } = view();
      const [s, tx, ty] = targetAbout(clamp(S * f, fitScale(), maxScale()), w / 2, h / 2);
      animateTo(s, tx, ty);
    },
    /** Zoom so a box (image px) fills ~45% of the short viewport side, centered. */
    focusBox(b) {
      const { w, h } = view();
      const size = Math.max(b.maxX - b.minX, b.maxY - b.minY, 1);
      const ns = clamp((Math.min(w, h) * 0.45) / size, fitScale(), maxScale());
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      const save = [S, TX, TY];
      S = ns;
      TX = w / 2 - cx * ns;
      TY = h / 2 - cy * ns;
      clampTranslate();
      const target = [S, TX, TY];
      [S, TX, TY] = save;
      animateTo(...target, 320);
    },
    isZoomed,
    state: () => ({ s: S, tx: TX, ty: TY, fit: fitScale(), max: maxScale(), W, H }),
  };
}
