/*
 * privacy.js  -  the product-level PRIVATE VIEW contract.
 *
 * Privacy used to be a presentation trick: a hand-maintained list of CSS
 * classes blurred by an attribute selector. That could only ever reach figures
 * that happened to have their own element and their own listed class, so a
 * figure interpolated into a sentence ("down $119,001.62 from today"), a
 * hover title, an aria-label, or a bar's WIDTH all escaped it silently. A
 * list of selectors can never be complete, and nothing failed loudly when it
 * was not.
 *
 * This replaces that with a state-driven contract with three rules:
 *
 *   1. EVERY monetary string in the app is produced by ONE formatter
 *      (money-format.js), and that formatter asks this module whether figures
 *      are currently hidden. A figure cannot reach the screen without passing
 *      the gate, so a sentence, a tooltip and a heading are all covered by
 *      construction rather than by remembering to list a class.
 *
 *   2. Anything that encodes a figure as SHAPE rather than text (a bar width,
 *      a tile area, a chart) declares itself with markProportional() /
 *      hiddenChartNotice(), so the private view can drop the comparison
 *      instead of leaving relative wealth legible with the numbers hidden.
 *
 *   3. Print, "Copy summary" and every export are deliberate acts of SHARING
 *      real figures. They run inside withExactFigures(), which suspends the
 *      gate for the duration of that build. Privacy is a screen state, never
 *      a data redaction - the same promise the old CSS made with @media print,
 *      kept here in one place that every formatter honours.
 *
 * Node-safe: every DOM read is guarded, so the analysis modules that import
 * the formatter stay importable in the proofs (where there is no document and
 * figures are therefore never hidden).
 */

// A fixed-width mask. Deliberately NOT proportional to the real figure - a
// mask that grew with the amount would leak magnitude, which is the one thing
// hiding a figure is meant to prevent. Six bullets read as "a number lives
// here", not as "six digits".
export const MASK_DIGITS = '••••••';

// What a screen reader and a tooltip say in place of a figure. One phrase,
// used everywhere, so the redacted state is described identically wherever it
// is announced.
export const HIDDEN_WORD = 'hidden';
export const HIDDEN_SENTENCE = 'Figures are hidden while private view is on.';

// Depth rather than a boolean so nested exact builds (a print model that calls
// a share-summary builder) cannot un-suspend the gate early on the inner one's
// return.
let exactDepth = 0;

// The raw switch: is the app currently in private view. Guarded down to the
// documentElement itself, so a stub document (a worker, a proof harness) never
// throws here.
export function privateViewOn() {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return !!(root && root.dataset && root.dataset.privacy === 'on');
}

// The question every formatter and every chart asks. Private view on AND not
// inside a deliberate exact-figure build.
export function figuresHidden() {
  return exactDepth === 0 && privateViewOn();
}

// Run fn with the privacy gate suspended - print, clipboard and export only.
// try/finally so a throw inside the build can never leave the gate stuck open.
export function withExactFigures(fn) {
  exactDepth++;
  try {
    return fn();
  } finally {
    exactDepth--;
  }
}

// The masked form of a money string, given whatever prefix the real formatter
// would have used ('$', 'US$'). The sign is KEPT: direction is meaning, not
// magnitude - a person still needs to see that a row is money leaving.
export function maskedMoney(prefix, negative) {
  return (negative ? '-' : '') + (prefix || '') + MASK_DIGITS;
}

// Recover the currency prefix from a formatter by formatting zero and
// stripping everything numeric. Works for a plain '$' symbol and for an Intl
// currency display ('US$', 'J$') without either caller having to declare it
// twice.
export function prefixFromSample(sample) {
  return String(sample == null ? '' : sample).replace(/[0-9.,\s  -]/g, '');
}

// Mark an element whose SIZE encodes a figure - a bar's width, a track's fill,
// a proportional segment. The private view drops these entirely rather than
// flattening them to one equal length: a row of identical stubs reads as a
// broken chart, while their absence reads as a deliberate state. Applied at
// the point the element is built, so nothing relies on a stylesheet knowing
// this component's class name.
export function markProportional(node) {
  if (node && node.setAttribute) node.setAttribute('data-proportional', '');
  return node;
}

// The one accessible description a chart carries while figures are hidden.
export function hiddenChartLabel(what) {
  return `${what}. ${HIDDEN_SENTENCE}`;
}

// A masked figure is a row of bullets: correct on screen, meaningless read
// aloud. Every figure rendered through the shared components pairs its visual
// text with this, so assistive technology hears the redacted STATE rather than
// six bullet characters. Returns null when nothing is hidden, so the ordinary
// path adds no markup at all.
export function screenReaderFigure(fallback) {
  return figuresHidden() ? fallback || 'Amount hidden' : null;
}
