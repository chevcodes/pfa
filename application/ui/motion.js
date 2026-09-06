import { privateViewOn } from '../core/privacy.js';
import '../core/money-format.js';

const ALLOWED_PROPS = new Set(['opacity', 'transform', 'strokeDashoffset', 'height', 'width']);
const reduceMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const active = new Set();

function assertAllowed(keyframes) {
  for (const frame of keyframes) {
    for (const prop of Object.keys(frame)) {
      if (!ALLOWED_PROPS.has(prop)) throw new Error(`motion.js: "${prop}" is not an allowed animation property`);
    }
  }
}

function animate(node, frames, opts) {
  assertAllowed(frames);
  if (!node || typeof node.animate !== 'function' || privateViewOn() || reduceMotion?.matches) return null;
  const animation = node.animate(frames, opts);
  active.add(animation);
  animation.onfinish = () => { active.delete(animation); animation.cancel(); };
  animation.oncancel = () => active.delete(animation);
  return animation;
}

if (reduceMotion && typeof reduceMotion.addEventListener === 'function') {
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) for (const animation of active) animation.cancel();
  });
}

export function growIn(node, from, to, opts = {}) {
  return animate(node, [from, to], {
    duration: opts.duration ?? 420,
    easing: opts.easing || 'cubic-bezier(0.16, 1, 0.3, 1)',
    delay: opts.delay || 0,
    fill: 'both',
  });
}

export function staggerIn(nodes, frameFor, opts = {}) {
  Array.from(nodes || []).forEach((node, index) => {
    const [from, to] = frameFor(node, index);
    growIn(node, from, to, { duration: opts.duration ?? 360, delay: index * (opts.step ?? 22) });
  });
}

export function crossfade(oldNode, newNode, opts = {}) {
  if (!oldNode?.parentNode) return;
  oldNode.parentNode.replaceChild(newNode, oldNode);
  growIn(newNode, { opacity: 0 }, { opacity: 1 }, { duration: opts.duration ?? 220 });
}

export function drawPath(node, length, opts = {}) {
  if (!node || !Number.isFinite(length) || length <= 0) return null;
  const settle = () => {
    node.removeAttribute('stroke-dasharray');
    node.removeAttribute('stroke-dashoffset');
  };
  node.setAttribute('stroke-dasharray', String(length * 100));
  node.setAttribute('stroke-dashoffset', String(length * 100));
  const start = () => {
    const ctm = node.isConnected && typeof node.getScreenCTM === 'function' ? node.getScreenCTM() : null;
    const nonScaling =
      typeof getComputedStyle === 'function'
        ? getComputedStyle(node).vectorEffect === 'non-scaling-stroke'
        : node.getAttribute?.('vector-effect') === 'non-scaling-stroke';
    const span = ctm ? length * (nonScaling ? Math.max(Math.abs(ctm.a), Math.abs(ctm.d)) : 1) : 0;
    if (!(span > 0)) return settle();
    node.setAttribute('stroke-dasharray', String(span));
    node.setAttribute('stroke-dashoffset', '0');
    const animation = growIn(node, { strokeDashoffset: span }, { strokeDashoffset: 0 }, { duration: opts.duration ?? 900, delay: opts.delay || 0 });
    if (!animation) return settle();
    animation.addEventListener('finish', settle);
    animation.addEventListener('cancel', settle);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(start);
  else start();
  return null;
}
