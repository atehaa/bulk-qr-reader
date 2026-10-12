// Small status message. Mounted inside the top-most open dialog so it isn't hidden behind it.

let timer;

export function toast(msg) {
  const el = document.getElementById('toast');
  const open = [...document.querySelectorAll('dialog[open]')];
  const host = open[open.length - 1] || document.body;
  if (el.parentElement !== host) host.append(el);
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), 2600);
}
