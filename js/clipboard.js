// Copy text reliably on desktop and mobile (incl. iOS and inside modal dialogs).

function topLayerHost() {
  const open = [...document.querySelectorAll('dialog[open]')];
  return open[open.length - 1] || document.body;
}

function execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  // 16px avoids iOS zoom-on-focus; the element must be inside the open dialog to be selectable.
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
  topLayerHost().append(ta);
  ta.focus({ preventScroll: true });
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** Last resort: show the text selected so the user can long-press → Copy. */
function showManualCopy(text) {
  const host = topLayerHost();
  const box = document.createElement('div');
  box.className = 'manual-copy';
  box.innerHTML = '<p>Copy is blocked here. Press and hold the text, then choose <b>Copy</b>.</p><textarea readonly></textarea><button type="button" class="btn">Close</button>';
  const ta = box.querySelector('textarea');
  ta.value = text;
  box.querySelector('button').onclick = () => box.remove();
  host.append(box);
  ta.focus();
  ta.select();
}

/**
 * Copy text. Must be called synchronously from the click handler (no await before it) so
 * Safari still sees the user gesture. Resolves true when the text reached the clipboard.
 */
export function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    // No async API (insecure context / old browser): copy synchronously while the gesture is live.
    if (execCopy(text)) return Promise.resolve(true);
    showManualCopy(text);
    return Promise.resolve(false);
  }
  return navigator.clipboard.writeText(text).then(() => true, () => false).then((ok) => {
    if (ok) return true;
    if (execCopy(text)) return true;
    showManualCopy(text);
    return false;
  });
}
