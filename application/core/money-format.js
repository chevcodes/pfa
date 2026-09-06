/*
 * money-format.js  -  THE money formatter. Every monetary string the app puts
 * on screen comes from here.
 *
 * Before this file there were two independent families: formatMoney()
 * (shared-helpers) behind money0/bankMoney on the render side, and eight
 * separately hand-rolled Intl.NumberFormat blocks inside the analysis modules
 * that build each card's amountText and its "why" sentences. They agreed on
 * output by coincidence, and only one of the two was reachable by the old
 * privacy CSS - which is exactly why the Available-now headline and every
 * figure baked into a sentence stayed legible with the figures "hidden".
 *
 * One formatter, one privacy gate (privacy.js), one place to change how money
 * reads. The analysis modules keep their own makeMoney() names as thin
 * delegates so their call sites and proofs are untouched.
 */
import { figuresHidden, maskedMoney, prefixFromSample } from './privacy.js';

const DEFAULTS = { symbol: '$', locale: 'en-JM', decimals: 2, code: 'JMD' };

// Intl construction is not free and these formatters are called thousands of
// times per render (every ledger row, every tooltip). Cached on the exact
// locale/code/decimals triple.
const intlCache = new Map();

function intlFor(locale, code, decimals) {
  const key = locale + '|' + code + '|' + decimals;
  let f = intlCache.get(key);
  if (f !== undefined) return f;
  try {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch (_) {
    f = null;
  }
  intlCache.set(key, f);
  return f;
}

function settings(cfg) {
  const c = (cfg && cfg.currency) || cfg || {};
  return {
    symbol: c.symbol || DEFAULTS.symbol,
    locale: c.locale || DEFAULTS.locale,
    decimals: c.decimals == null ? DEFAULTS.decimals : c.decimals,
    code: c.code || DEFAULTS.code,
  };
}

/* The low-level form the render side already spoke (symbol/locale/decimals
 * passed explicitly, used by money0 and by bankMoney's per-currency prefix).
 * Kept byte-identical in output to the previous implementation when figures
 * are visible; masked, sign preserved, when they are not. */
function formatMoneyExact(n, symbol, locale, decimals) {
  const neg = n < 0;
  return (
    (neg ? '-' : '') +
    symbol +
    Math.abs(Number(n) || 0).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function formatMoney(n, symbol, locale, decimals) {
  if (figuresHidden()) return maskedMoney(symbol, n < 0);
  return formatMoneyExact(n, symbol, locale, decimals);
}

/* THE per-currency prefix. A figure held in another currency wears its own
 * mark so it can never be read as a base-currency one; the base currency keeps
 * the plain symbol. Four render sites had each written this rule out by hand. */
export function currencyPrefix(code, cfg = {}) {
  const s = settings(cfg);
  const ccy = String(code == null ? '' : code) || s.code;
  if (ccy === s.code) return s.symbol;
  return ccy === 'USD' ? 'US$' : `${ccy} `;
}

/* The model-side form the analysis modules spoke (Intl currency, built from a
 * config object). Returns a function so each module can keep its own local
 * `money` name. */
export function makeMoney(cfg = {}) {
  const s = settings(cfg);
  const f = intlFor(s.locale, s.code, s.decimals);
  const exact = f
    ? (n) => f.format(Number(n || 0))
    : (n) => formatMoneyExact(Number(n || 0), s.symbol, s.locale, s.decimals);
  // Sampled once, not per call: whatever prefix this locale/currency pair
  // actually produces is what the mask wears, so a masked figure sits in the
  // same visual slot as the real one.
  const prefix = prefixFromSample(exact(0)) || s.symbol;
  return (n) => (figuresHidden() ? maskedMoney(prefix, Number(n || 0) < 0) : exact(n));
}

/* Compact money. ONE piece of shortening arithmetic behind two presets, so a
 * change to how large figures read happens once.
 *
 *   makeMoneyShort   - axis ticks and dense chart labels ($2.9M / $312k).
 *                      Tuned for a 40px gap under a bar: as few glyphs as
 *                      possible, lowercase k.
 *   makeMoneyCompact - figures inside a SENTENCE ($1.09M / $447K). Keeps a
 *                      second decimal at millions, because prose is read once
 *                      and "$1.1M of a $1.5M target" loses the difference
 *                      between two figures a person is being asked to compare.
 *                      Capital K to sit level with the M in the same line.
 *
 * NEITHER is used by the printed report, the CSV, or the JSON export. Those
 * carry full, exact figures: a pasted document has no interface to tap into and
 * no way to recover a rounded number, and the CSV is arithmetic input for a
 * spreadsheet. See exactMoneyOnly() below - that separation is enforced, not
 * just intended.
 */
function compactMoney(cfg, opts) {
  const s = settings(cfg);
  const decimalsM = opts.millionDecimals == null ? null : opts.millionDecimals;
  const mSuffix = opts.millionSuffix || 'M';
  const kSuffix = opts.thousandSuffix || 'k';
  const kDecimals = opts.thousandDecimals == null ? 0 : opts.thousandDecimals;
  const floor = opts.shortenAbove == null ? 1e3 : opts.shortenAbove;
  return (n) => {
    const v = Number(n) || 0;
    if (figuresHidden()) return maskedMoney(s.symbol, v < 0);
    const sign = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= 1e6) {
      const d = decimalsM != null ? decimalsM : a >= 1e7 ? 0 : 1;
      return `${sign}${s.symbol}${(a / 1e6).toFixed(d)}${mSuffix}`;
    }
    if (a >= floor) return `${sign}${s.symbol}${(a / 1e3).toFixed(kDecimals)}${kSuffix}`;
    // Below the shortening floor the figure prints whole - but still grouped.
    // Without this "$9936" appeared in prose beside "$9,935.82" elsewhere on
    // the same tab: the same number, one grouped and one not.
    return `${sign}${s.symbol}${Math.round(a).toLocaleString('en-US')}`;
  };
}

export function makeMoneyShort(cfg = {}, opts = {}) {
  return compactMoney(cfg, opts);
}

/* THE prose preset - the formatter for a figure inside a sentence.
 *
 * The standing rule, and the line between the two cases:
 *
 *   A HEADLINE figure is full precision, everywhere. It is the answer, a
 *   person may act on it, and "$218k" is not something you can reconcile
 *   against a statement. (An earlier round found a goal card shortening its
 *   headline and reverted it for exactly this reason.)
 *
 *   A figure INSIDE a supporting sentence is shortened, everywhere. There it is
 *   context, not an answer - "$872,309.04 of the $1,090,386.30 left after
 *   commitments" makes a reader parse eighteen digits to take in a proportion
 *   that "$872k of the $1.09M" gives them at a glance.
 *
 * Figures below shortenAbove print in full, so "$847" never becomes "$1k" -
 * shortening only earns its place once a number is long enough to be hard to
 * take in.
 *
 * The suffix is lowercase 'k', matching makeMoneyShort and every chart axis in
 * the app. It was 'K' here alone, so the same magnitude read as "$872K" in a
 * sentence and "$872k" on the axis beside it.
 */
export function makeMoneyCompact(cfg = {}, opts = {}) {
  return compactMoney(cfg, {
    millionDecimals: 2,
    thousandSuffix: 'k',
    thousandDecimals: 0,
    shortenAbove: 10000,
    ...opts,
  });
}

/* The same formatter under the name that says WHEN to reach for it. Prose uses
 * this; headlines use makeMoney. */
export const makeProseMoney = makeMoneyCompact;

export function makeForeignMoney() {
  return (value) => {
    const text = String(value == null ? '' : value).trim();
    if (!text || !figuresHidden()) return text;
    const match = /^(-?)[\d,]+(?:\.\d+)?\s*([A-Za-z]{3})?$/.exec(text);
    const negative = !!(match && match[1]);
    const code = match && match[2] ? ` ${match[2].toUpperCase()}` : '';
    return maskedMoney('', negative) + code;
  };
}
