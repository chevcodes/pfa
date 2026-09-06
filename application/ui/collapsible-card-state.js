const CARD_OPEN_STATE = new Map();

export function rememberedCardKeys() {
  return [...CARD_OPEN_STATE.keys()];
}

export function forgetCollapsibleCards() {
  CARD_OPEN_STATE.clear();
}

export function rememberedOpen(key, fallback) {
  return key && CARD_OPEN_STATE.has(key) ? CARD_OPEN_STATE.get(key) : !!fallback;
}

export function rememberOpen(key, open) {
  if (key) CARD_OPEN_STATE.set(key, !!open);
}

export function rememberToggle(details, key) {
  if (!key || !details.addEventListener) return;
  details.addEventListener('toggle', () => rememberOpen(key, details.open));
}
