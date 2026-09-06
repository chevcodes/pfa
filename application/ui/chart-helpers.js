import { figuresHidden, hiddenChartLabel } from '../core/privacy.js';

/* chart-helpers.js - the small, genuinely-shared building blocks the income
 * and flow charts both use. Deliberately NOT a "bar chart primitive": the two
 * charts differ for honest reasons (income is single-series on a zoomed band
 * to reveal a raise; flow is two-series on a zero baseline to compare in vs
 * out), so only the low-level scaffolding is shared, never the scale or
 * geometry. Each chart owns its own model. */

// 'YYYY-MM' -> short month name, using the injected MONTHS_SHORT array.
export function shortMonthOf(MONTHS_SHORT) {
  return (ym) => MONTHS_SHORT[+String(ym).slice(5, 7) - 1] || ym;
}

/* THE month-tick rule for every month-by-month chart.
 *
 * A bare "Jan" is unreadable once statements cross a year boundary: with two
 * Januaries on one axis, the only way to tell them apart was to hover each
 * point, and a chart you have to interrogate one point at a time is not a
 * chart. The overall range printed elsewhere ("January 2025 - August 2026")
 * confirms coverage but says nothing about which year any given column is.
 *
 * The year is added only when the series actually spans more than one calendar
 * year - a single-year chart would just repeat the same four digits under every
 * column, which is its own kind of noise. Pass the months being plotted; the
 * returned formatter decides once for the whole axis, so ticks never disagree
 * with each other about their own format.
 *
 * Used by every month chart. Nothing strips the year back off afterwards.
 */
export function monthTickOf(MONTHS_SHORT, months) {
  const list = (months || []).map((m) => String(m && m.month ? m.month : m));
  const years = new Set(list.map((m) => m.slice(0, 4)).filter(Boolean));
  const multiYear = years.size > 1;
  const first = list[0];
  const tick = (ym) => {
    const key = String(ym);
    const name = MONTHS_SHORT[+key.slice(5, 7) - 1];
    if (!name) return key;
    return multiYear ? `${name} ${key.slice(2, 4)}` : name;
  };
  tick.month = (ym) => MONTHS_SHORT[+String(ym).slice(5, 7) - 1] || String(ym);
  tick.year = (ym) => {
    const key = String(ym);
    if (!multiYear || !MONTHS_SHORT[+key.slice(5, 7) - 1]) return '';
    return key === first || key.slice(5, 7) === '01' ? key.slice(0, 4) : '';
  };
  return tick;
}

// Ordinal suffix for a day-of-month (1st, 2nd, 3rd...). Shared by both charts'
// hover text.
export function ordinalDay(n) {
  const s = ['th', 'st', 'nd', 'rd'],
    v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Layout util (shared by the render factories): append two compact cards as a
// side-by-side PAIR when both exist - marking each .half so the 2-column grid
// (>=1000px) places them together. When only one exists it is appended
// full-width with NO .half, so a missing card never leaves an empty half-
// column. Below 1000px .half is inert and both simply stack. One robust rule
// for "pair where it makes sense", degrading cleanly to the mobile single stack.
export function pairCards(wrap, a, b) {
  if (a && b) {
    a.classList.add('half');
    b.classList.add('half');
    // A paired tile that contains a scrolling list must let that list fill
    // the shared height the grid gives the pair - otherwise a short list
    // beside a tall neighbour leaves the tile stretched but half-empty, with
    // a scrollbar appearing while room sits unused. Marking the tile lets the
    // stylesheet make its own body a column whose .pair-scroll child grows
    // into the leftover space. Only tiles that actually hold a .pair-scroll
    // list are marked, so a headline or small card paired with a taller list
    // keeps its natural size and is never forced tall with nothing to fill it.
    for (const card of [a, b]) {
      if (card.querySelector && card.querySelector('.pair-scroll')) {
        card.classList.add('half-fill');
      }
    }
    wrap.append(a, b);
  } else if (a) wrap.append(a);
  else if (b) wrap.append(b);
}

/* ---------------------------------------------------------------------
 * THE private-view state for charts.
 *
 * A chart encodes a figure TWICE: once as printed text and once as shape.
 * Masking only the text leaves the shape saying "this category dwarfs the
 * rest" or "this month was the big one" - relative wealth, still perfectly
 * legible with every number hidden. The old approach flattened a couple of
 * known bar classes to one equal height, which fixed those two charts and
 * left the treemap, the forecast area and every list bar untouched.
 *
 * So every chart in the app asks chartIsHidden() first and, when it is,
 * returns this ONE placeholder instead of drawing. It is uniform across the
 * treemap, the flow bars, the income bars and the forecast area, so the
 * private view reads as a deliberate product state rather than as several
 * charts failing in different ways. The card, its heading and its meaning
 * line all stay - only the comparison goes.
 * ------------------------------------------------------------------- */
export function chartIsHidden() {
  return figuresHidden();
}

export function renderHiddenChart(el, what, opts = {}) {
  const box = el('div', {
    class: 'chart-hidden' + (opts.class ? ' ' + opts.class : ''),
    role: 'img',
    'aria-label': hiddenChartLabel(what || 'Chart'),
    ...(opts.height ? { style: `min-height:${opts.height}` } : {}),
  });
  box.append(
    el(
      'span',
      { class: 'chart-hidden-mark', 'aria-hidden': 'true' },
      el('span', { class: 'chart-hidden-dot' }),
      el('span', { class: 'chart-hidden-dot' }),
      el('span', { class: 'chart-hidden-dot' })
    )
  );
  box.append(el('span', { class: 'chart-hidden-copy' }, 'Chart hidden while figures are hidden'));
  return box;
}

// The calendar year (or year range) a run of 'YYYY-MM' keys covers, for the
// quiet indicator beside a chart title. Empty when there is nothing to say.
export function yearSpanLabel(months) {
  const years = [
    ...new Set((months || []).map((m) => String(m || '').slice(0, 4)).filter((y) => /^\d{4}$/.test(y))),
  ].sort();
  if (!years.length) return '';
  return years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;
}

export function proportionShares(bands) {
  const kept = (bands || []).filter((b) => Number(b.amount) >= 0);
  const total = kept.reduce((sum, b) => sum + Number(b.amount), 0);
  return {
    bands: kept,
    total,
    shareOf: (b) => (total > 0 ? Math.round((Number(b.amount) / total) * 100) : 0),
  };
}
