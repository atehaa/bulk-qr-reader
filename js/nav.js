// Modal ↔ browser history, so Android back / iOS edge swipe close the top modal
// instead of leaving the page.
//
// Closing a modal and opening the next one in the same task (chooser → camera,
// camera → result viewer, viewer → retake) reuses the history entry instead of
// racing history.back() against pushState.

const stack = []; // back handlers, top last
let pendingPops = 0;
let scheduled = false;
let ignorePops = 0;

function flush() {
  scheduled = false;
  if (!pendingPops) return;
  const n = pendingPops;
  pendingPops = 0;
  ignorePops++;
  history.go(-n);
}

/** Register an opened modal. `onBack` runs when the user navigates back. */
export function pushModal(onBack) {
  stack.push(onBack);
  if (pendingPops > 0) {
    pendingPops--; // take over the entry of the modal that just closed
    return;
  }
  history.pushState({ bqrModal: true }, '');
}

/** Call when a modal closes from the UI (button, Esc): drops its history entry. */
export function popModal(onBack) {
  const i = stack.lastIndexOf(onBack);
  if (i < 0) return;
  stack.splice(i, 1);
  pendingPops++;
  if (!scheduled) {
    scheduled = true;
    setTimeout(flush, 0);
  }
}

window.addEventListener('popstate', () => {
  if (ignorePops) {
    ignorePops--;
    return;
  }
  const fn = stack.pop();
  fn?.();
});
