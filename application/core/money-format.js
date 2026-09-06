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
export function formatMoneyExact(n, symbol, locale, decimals) {
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

/* Compact money for axis ticks and dense chart labels ($2.87M / $312k). One
 * definition, previously re-derived in app-controller (moneyShort) and again
 * inside the forecast chart (axisMoney) with different rounding. */
export function makeMoneyShort(cfg = {}, opts = {}) {
  const s = settings(cfg);
  const decimalsM = opts.millionDecimals == null ? null : opts.millionDecimals;
  return (n) => {
    const v = Number(n) || 0;
    if (figuresHidden()) return maskedMoney(s.symbol, v < 0);
    const sign = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= 1e6) {
      const d = decimalsM != null ? decimalsM : a >= 1e7 ? 0 : 1;
      return `${sign}${s.symbol}${(a / 1e6).toFixed(d)}M`;
    }
    if (a >= 1e3) return `${sign}${s.symbol}${Math.round(a / 1e3)}k`;
    return `${sign}${s.symbol}${Math.round(a)}`;
  };
}
