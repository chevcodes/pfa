/* ===========================================================================
 *  category-intentions.js  -  category spending intentions + the ONE precedence
 *  resolver that Activity, Needs-attention and Goals all read, so they can
 *  never compute against different boundaries.
 *
 *  This is the honest, forward half of a budget: a person names a ceiling on a
 *  category, and it surfaces as PACE (spend-so-far vs time-elapsed), never as a
 *  retrospective score. No grade, no streak, no guilt language - by design.
 *
 *  PURE and Node-testable. No DOM, no fetch, no mutation. Records come from the
 *  v4 `categoryIntentions` store (keyPath 'id').
 *
 *  INTENTION RECORD SHAPE (stored):
 *    {
 *      id, category, amount,
 *      kind: 'repeating' | 'month',
 *      month:        'YYYY-MM'   // only for kind='month' (a dated override)
 *      effectiveFrom:'YYYY-MM'   // only for kind='repeating' (non-retroactive)
 *      active:       true|false,
 *      createdAt, updatedAt
 *    }
 *
 *  PRECEDENCE RULES (frozen contract, locked correction #4):
 *    1. A dated one-month intention OVERRIDES the repeating intention for its
 *       exact month.
 *    2. When that month ends, the repeating intention RESUMES automatically.
 *    3. Changing an intention NEVER rewrites previous months: an edit is a new
 *       repeating record with a later effectiveFrom; the old record still
 *       governs the months before that. The resolver picks the repeating record
 *       with the latest effectiveFrom <= the target month.
 *    4. Pace uses ONLY transactions inside the applicable period.
 *    5. Refunds, exclusions and split transactions follow the SAME shared
 *       category calculation used everywhere else - passed in as
 *       `categorySpendInMonth`, never re-derived here.
 * ======================================================================== */
import { resolveOpts } from './commitment-income.js';
import { makeMoney } from '../core/money-format.js';
import { MONTHS_SHORT, isoToday } from '../core/shared-helpers.js';

/* "2026-09" -> "September 2026". A card reporting on one month must say which
 * month; before this it named a day number with no month or year anywhere. */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
function monthName(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
  if (!m) return 'this month';
  return `${MONTH_NAMES[+m[2] - 1] || MONTHS_SHORT[+m[2] - 1] || ''} ${m[1]}`.trim();
}

function ymOf(iso) {
  return String(iso || '').slice(0, 7);
}
function domOf(iso) {
  return +String(iso || '').slice(8, 10) || 0;
}
function daysInMonth(ym) {
  const y = +ym.slice(0, 4),
    mo = +ym.slice(5, 7);
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}
export function asOfDayForMonth(targetMonth, now = new Date()) {
  const today = isoToday(now);
  return targetMonth === today.slice(0, 7) ? +today.slice(8, 10) : daysInMonth(targetMonth);
}
function r2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/* ===========================================================================
 *  resolveIntention - THE single precedence resolver. Given all intentions for
 *  a category and a target month, return the one that governs, or null.
 *  Read identically by Activity, Needs-attention and Goals.
 * ======================================================================== */
export function resolveIntention(intentions, category, targetMonth) {
  const mine = (intentions || []).filter(
    (it) => it && it.active !== false && it.category === category
  );

  // Rule 1: a dated one-month override for exactly this month wins.
  const override = mine.find((it) => it.kind === 'month' && it.month === targetMonth);
  if (override) return { ...override, source: 'month-override' };

  // Rules 2 & 3: otherwise the repeating record with the latest effectiveFrom
  // that is <= the target month. (Resume after an override happens for free,
  // because the override only matched its own month.) Non-retroactive: a record
  // whose effectiveFrom is AFTER the target month does not apply, so editing
  // never rewrites earlier months.
  const repeating = mine
    .filter((it) => it.kind === 'repeating' && String(it.effectiveFrom || '') <= targetMonth)
    .sort((a, b) => {
      const byEffectiveFrom = String(b.effectiveFrom).localeCompare(String(a.effectiveFrom));
      if (byEffectiveFrom !== 0) return byEffectiveFrom;
      // Tiebreak: two repeating records can share the SAME effectiveFrom when
      // an edit is authored inside the period it already governs (editing
      // July's ceiling while July is still current, rather than the change
      // only taking effect next month). Without this, sort's stability
      // preserves INSERTION order on the tie, so the resolver would keep
      // returning the STALE ceiling after a save - the edit would silently
      // never take effect. The most recently CREATED record wins the tie;
      // effectiveFrom alone still protects every month BEFORE it from being
      // rewritten (Rule 3's real, unaffected guarantee).
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  if (repeating.length) return { ...repeating[0], source: 'repeating' };

  return null;
}

/* ===========================================================================
 *  paceForMonth - the forward pace signal for a resolved intention.
 *  spendSoFar and monthTotalSpend MUST come from the shared category calc
 *  (refunds/exclusions/splits already applied) - this function never re-derives
 *  category spend, it only turns it into a pace reading.
 *
 *  asOfDay: the day-of-month "today" within the target month (1..daysInMonth).
 *  For a COMPLETED past month, pass the full month (asOfDay = daysInMonth) and
 *  spendSoFar = monthTotalSpend.
 * ======================================================================== */
export function paceForMonth({ intention, targetMonth, spendSoFar, asOfDay, cfg = {} }) {
  const opts = resolveOpts(cfg);
  if (!intention) return null;
  const ceiling = Number(intention.amount) || 0;
  const dim = daysInMonth(targetMonth);
  const day = Math.max(1, Math.min(asOfDay || dim, dim));
  const fracElapsed = day / dim;

  // Linear projection of the full month from spend-so-far. Deliberately simple
  // and explainable; pace is a signal, not a forecast.
  const projected = fracElapsed > 0 ? r2(spendSoFar / fracElapsed) : 0;
  const expectedByNow = r2(ceiling * fracElapsed); // pro-rata ceiling to date
  const overBy = r2(projected - ceiling);

  // How much room is left before the ceiling is reached. Negative once it has
  // been passed. This is the figure a person actually wants while standing in a
  // shop - "what can I still spend" - and it was previously not computed at all.
  const remaining = r2(ceiling - spendSoFar);

  let signal;
  if (ceiling <= 0) signal = 'no-ceiling';
  else if (spendSoFar > ceiling) signal = 'over';
  else if (projected > ceiling) signal = 'ahead-of-pace'; // on course to pass it
  else if (projected < ceiling * (1 - opts.tolerance)) signal = 'under-pace';
  else signal = 'on-pace';

  return {
    category: intention.category,
    ceiling: r2(ceiling),
    source: intention.source,
    day,
    daysInMonth: dim,
    month: targetMonth,
    spendSoFar: r2(spendSoFar),
    projected,
    expectedByNow,
    remaining,
    overBy,
    signal, // 'over' | 'ahead-of-pace' | 'on-pace' | 'under-pace' | 'no-ceiling'
  };
}

/* ===========================================================================
 *  view-model - number/tag/detail, frozen shape. Forward, pace-based language
 *  ONLY. No "over budget", no grade, no streak - the frozen no-guilt rule.
 * ======================================================================== */
export function buildPaceModel(pace, cfg = {}) {
  if (!pace) return null;
  // One formatter for the whole app (core/money-format.js): the same output
  // this block produced, plus the privacy gate every figure must pass.
  const money = makeMoney(cfg);

  const materialVariance = pace.ceiling > 0
    ? Math.max(0, pace.projected - pace.ceiling, pace.spendSoFar - pace.ceiling) / pace.ceiling
    : 0;
  const needsAttention = materialVariance >= 0.05;
  const tagBy = {
    over: 'over your limit',
    'ahead-of-pace': 'projected over your limit',
    'on-pace': 'within your limit',
    'under-pace': 'under your limit',
    'no-ceiling': '',
  };
  const toneBy = {
    over: needsAttention ? 'watch' : 'neutral',
    'ahead-of-pace': needsAttention ? 'watch' : 'neutral',
    'on-pace': 'neutral',
    'under-pace': 'neutral',
    'no-ceiling': 'neutral',
  };

  const when = monthName(pace.month);
  const left = money(Math.abs(pace.remaining));

  // Every sentence leads with the thing a person came here for: how much room
  // is left. The projection is context, not the headline - it was the headline
  // before, which is part of why the card's purpose had to be inferred.
  let detail;
  if (pace.signal === 'over') {
    detail = `${pace.category} has passed your ${money(pace.ceiling)} limit for ${when} by ${left}. Spent so far: ${money(pace.spendSoFar)}.`;
  } else if (pace.signal === 'ahead-of-pace') {
    detail = `${left} left of your ${money(pace.ceiling)} limit for ${when}, but at this rate ${pace.category} reaches about ${money(pace.projected)} by month end - over the limit. Day ${pace.day} of ${pace.daysInMonth}.`;
  } else if (pace.signal === 'under-pace') {
    detail = `${left} left of your ${money(pace.ceiling)} limit for ${when}. At this rate ${pace.category} finishes around ${money(pace.projected)}, under the limit.`;
  } else if (pace.signal === 'on-pace') {
    detail = `${left} left of your ${money(pace.ceiling)} limit for ${when}. At this rate ${pace.category} finishes around ${money(pace.projected)}, within the limit.`;
  } else {
    detail = `${pace.category}: no limit set.`;
  }

  return {
    category: pace.category,
    amount: pace.projected,
    amountText: money(pace.projected),
    ceilingText: money(pace.ceiling),
    spentText: money(pace.spendSoFar),
    // 8b: the figure to keep in your head while shopping, formatted once here
    // rather than re-derived by each surface that shows it.
    remaining: pace.remaining,
    remainingText: money(Math.abs(pace.remaining)),
    isOver: pace.signal === 'over',
    needsAttention,
    // 8a: which month this card is reporting on, said plainly.
    monthText: when,
    tag: tagBy[pace.signal] || '', // pronoun-free
    tone: toneBy[pace.signal] || 'neutral',
    signal: pace.signal,
    detail,
  };
}

/* ---- helper to build a stored record (id + timestamps), for the app to save.
 *      Kept here so the shape lives in one place. Edits should CREATE a new
 *      repeating record with a later effectiveFrom, never mutate an old one. -- */
export function makeIntention({
  category,
  amount,
  kind,
  month = null,
  effectiveFrom = null,
  now = new Date().toISOString(),
}) {
  const id = `int_${Math.random().toString(36).slice(2, 10)}`;
  const base = {
    id,
    category,
    amount: r2(amount),
    kind,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  if (kind === 'month') return { ...base, month };
  return { ...base, effectiveFrom: effectiveFrom || ymOf(now) };
}
