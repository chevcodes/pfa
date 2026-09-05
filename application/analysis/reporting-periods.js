/*
 * reporting.js  -  pure analysis, the shared on-screen render building blocks,
 * and the print-model orchestration for the Personal Finance Analyser.
 *
 * Pure and browser/Node-safe: no DOM is required except by the shared render
 * helpers and the print-model group, which take a `document` argument, so the
 * whole module is unit-testable. The printable-report renderers themselves now
 * live in report-render.js, the CSV writers in csv-export.js, and the encrypted
 * backup lock-and-key in history-codec.js; this file imports the report
 * renderers only to drive them, and holds none of those three itself. */
import {
  merchantRuleKeyFromDescription,
  merchantGroupKey,
  merchantBrandLabel,
  merchantBranch,
  merchantDisplayLabel,
} from '../../settings/category-rules.js';
import { categorise, smartTitle, merchantLabel } from '../statements/categorise.js';
import { transactionIdentity } from '../statements/read-statements.js';
import {
  analyseBankActivity,
  analyseCombinedOverview,
  analyseRollup,
  detectLargeBankOutflows,
  detectPeriodNewPayees,
} from '../analysis/bank-analysis.js';
import {
  roundMoney,
  capitaliseFirst,
  requireCtx,
  monthIndex,
  recurringStatus,
  monthKey,
  formatDisplayDate,
  medianDayOfMonth,
  addDaysIso,
  isoDay,
  detectSustainedRise,
} from '../core/shared-helpers.js';
import { renderReport, renderBankReport, renderOverviewReport } from '../output/report-render.js';
import { categoryTotalsWithSplits, splitsByTxnId, validateSplit } from './transaction-splits.js';

import { MONTH_LONG, isUnrecognised } from './reporting-core.js';
/* ===========================================================================
 * The ONE attention-item builder, read identically by Right Now's full
 * "Worth a look" queue and Overview's decision-forcing "Needs attention"
 * head - the plan's "one resolver, read identically by Activity, Needs
 * attention and Goals" rule, applied here so the two screens can never
 * author two divergent attention lists. Pure: every input is passed in via
 * deps (never closed over), so it is directly testable and both callers
 * feed it the SAME live models. Returns { tone:'blocking'|'optional',
 * title, detail, actions:[{label,onClick,variant}] }[], severity-ordered
 * (blocking first). renderAttentionList turns this into DOM; this function
 * decides only WHAT is worth attention, never how it looks.
 *
 * The shortfall item (the plan's lead attention item - "an expected
 * shortfall before income") is derived from the SAME availableNow model the
 * Overview lead card renders: its lead figure going negative IS the
 * shortfall, single-sourced, never a second calculation.
 * ======================================================================== */
export function buildAttentionItems(deps) {
  const {
    cardRows = [],
    bankRecs = [],
    cardStatements = [],
    bankStatements = [],
    brandRules = [],
    merchants = null,
    rows = [],
    period = null,
    cfg = {},
    splits = [],
    fallback = 'Uncategorised',
    availableNow = null,
    money0,
    formatDisplayDate,
    isUnrecognised,
    detectPossibleDuplicates,
    detectCategorySpikes,
    dismissReview,
    pickStatements,
    drillToTransactions,
  } = deps;

  const items = [];

  // 1) BLOCKING: an expected shortfall before the next income - the plan's
  // lead attention item. Read from availableNow's lead figure (the same one
  // Overview's hero card shows); negative means known commitments outrun the
  // cash expected before payday.
  if (
    availableNow &&
    availableNow.lead &&
    typeof availableNow.lead.amount === 'number' &&
    availableNow.lead.amount < 0
  ) {
    items.push({
      tone: 'blocking',
      title: `Cash may run short before your next income by ${money0(Math.abs(availableNow.lead.amount))}`,
      detail:
        availableNow.confidence === 'incomplete'
          ? 'This is an estimate - a missing statement or income date could change it. Add what is missing to firm it up.'
          : 'Known commitments before your next income come to more than the cash expected to cover them.',
      actions: [{ label: 'Add statement', onClick: pickStatements, variant: 'ghost' }],
    });
  }

  // 2) BLOCKING: unreconciled statements (card and bank) - a total could be
  // short until they are resolved.
  const cardUnrec = (cardStatements || []).filter((s) => !s.reconciled);
  const bankUnrec = (bankStatements || []).filter((s) => !s.reconciled);
  for (const s of cardUnrec)
    items.push({
      tone: 'blocking',
      title: `Card statement not reconciled${s.period ? ` (${s.period})` : ''}`,
      detail: s.reconNote || '',
      actions: [{ label: 'Add statement', onClick: pickStatements, variant: 'ghost' }],
    });
  for (const s of bankUnrec)
    items.push({
      tone: 'blocking',
      title: `Account statement not reconciled${s.period ? ` (${s.period})` : ''}`,
      detail: s.reconNote || '',
      actions: [{ label: 'Add statement', onClick: pickStatements, variant: 'ghost' }],
    });

  // 3) OPTIONAL: purchases worth a second look. Totals already count them, so
  // refining is optional tidying, not a blocker.
  const uncategorised = cardRows.filter(
    (r) => r.kind === 'spend' && isUnrecognised(r, fallback) && !r.reviewDismissed
  );
  const needsReviewRows = cardRows.filter(
    (r) => r.kind === 'spend' && r.needsReview && !r.reviewDismissed
  );
  const reviewRows = [...uncategorised, ...needsReviewRows];
  if (reviewRows.length) {
    const reviewTotal = reviewRows.reduce((s, r) => s + r.amount, 0);
    items.push({
      tone: 'optional',
      title: `${reviewRows.length} purchase${reviewRows.length === 1 ? '' : 's'} could use a second look (${money0(reviewTotal)})`,
      detail:
        'The totals already count them, so refining is optional. Tap any of them for the reason.',
      actions: [
        {
          label: 'Looks fine',
          onClick: () => dismissReview(reviewRows),
          variant: 'ghost',
        },
        {
          label: 'Refine',
          onClick: () => drillToTransactions({ reviewOnly: true, category: 'all' }),
          variant: 'primary',
        },
      ],
    });
  }

  // 4) OPTIONAL: possible duplicate charges.
  const dups = detectPossibleDuplicates(cardRows, brandRules, merchants);
  for (const d of dups) {
    items.push({
      tone: 'optional',
      title: `Possible duplicate: ${d.label}, ${money0(d.amount)} charged twice`,
      detail: `${formatDisplayDate(d.dates[0])} and ${formatDisplayDate(d.dates[1])}. Worth confirming this is not a double charge.`,
      actions: [
        {
          label: 'Looks fine',
          onClick: () => dismissReview(d.ids.map((id) => ({ id }))),
          variant: 'ghost',
        },
      ],
    });
  }

  // 5) OPTIONAL: a category running much hotter than usual this period.
  const spikes = period ? detectCategorySpikes(rows, period, cfg, splits) : [];
  for (const sp of spikes) {
    items.push({
      tone: 'optional',
      title: `${sp.category} spending is much higher than usual this period (${money0(sp.amount)} vs a typical ${money0(sp.typical)})`,
      detail: 'No single charge stands out, but the category total does.',
      actions: [
        {
          label: 'Refine',
          onClick: () => drillToTransactions({ category: sp.category, reviewOnly: false }),
          variant: 'primary',
        },
      ],
    });
  }

  return items;
}

// Shared "how this is worked out" disclosure for methodology / caveat prose
// (Recommendation 4, Class 5). Dense grey explanatory paragraphs used to sit
// permanently under heroes and cards - read once, ignored forever - making
// otherwise calm screens read as text-heavy. This wraps such prose in a native
// <details>, CLOSED by default so the screen stays calm, revealed on demand by
// anyone who wants the detail. Native <details> mirrors the app's existing
// "Data & settings" card pattern, needs no JS, and is keyboard / screen-reader
// accessible by default. `body` may be a string or a prebuilt node. Used ONLY
// for genuinely multi-sentence methodology; one-line hints, warnings and
// interaction cues stay inline where hiding them would cost more than it saves.
export function renderExplainer(el, body, opts = {}) {
  const d = el('details', {
    class: 'explainer' + (opts.class ? ' ' + opts.class : ''),
  });
  d.append(el('summary', {}, opts.label || 'How this is worked out'));
  d.append(el('div', { class: 'explainer-body muted small' }, body));
  return d;
}

/* ===========================================================================
 * 10b) Period + analysis helpers  (pure, additive, testable)
 * ---------------------------------------------------------------------------
 * These power the reorganised dashboard: a period selector, an honest
 * "latest complete month" default, comparison with the previous comparable
 * period and the historical average, incomplete-month detection, recurring
 * charge detection and richer insights. They are pure functions of the rows
 * (and an optional "today") so they can be unit-tested without a browser and
 * never change any stored value.
 * ======================================================================== */

const DAYS_IN_MONTH = (y, m) => new Date(y, m, 0).getDate(); // m = 1..12

// 'YYYY-MM' -> 'Month YYYY'. Uses MONTH_LONG from the preserved core (same module scope).
export function monthName(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  return m ? `${MONTH_LONG[+m[2] - 1]} ${m[1]}` : ym;
}

export function ymToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
export function addMonthsYM(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dayOfIso(iso) {
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(iso);
  return m ? +m[1] : 0;
}
function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/* ===========================================================================
 * Statement coverage model  (fact-based calendar-month completeness)
 * ---------------------------------------------------------------------------
 * buildRows already buckets every transaction by its CALENDAR month, so "June"
 * means 1-30 June app-wide, not a 15-May-to-15-June billing cycle. What was
 * missing was any knowledge of HOW MUCH of each calendar month is actually
 * imported. detectIncompleteMonth used to GUESS this from the shape of spending
 * (a quiet-but-complete month read as partial; a partial month carrying one big
 * charge read as complete - the "18% less than June" distortion). This replaces
 * the guess with a FACT derived from the statement periods the app already
 * stores. For each ledger and calendar month it reports 'full' (statements span
 * the whole month), 'partial' (only part), 'none' (the ledger has data that
 * month but no parseable covering statement), or 'absent' (no data that month).
 *
 * Defensive by construction: any statement whose dates cannot be parsed simply
 * contributes no span, so an unrecognised statement shape degrades a month to
 * 'unknown' at the verdict level and the caller falls back to the old spend
 * heuristic - never worse than today, better wherever the dates parse.
 *
 * Field shapes read (confirm against read-statements.js if coverage does not
 * activate): card statements carry ISO periodStart/periodEnd ('YYYY-MM-DD');
 * bank statements carry a `period` string "DD Mon YYYY - DD Mon YYYY" (the
 * exact form accounts-render already parses to sort statements). NCB card
 * records may carry neither, in which case their months read 'none'/'unknown'
 * and fall back to the heuristic - a noted follow-up, not a regression.
 * ======================================================================== */

const COVERAGE_MON = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// Parse ISO 'YYYY-MM-DD' to a UTC day-ms, or null. UTC throughout so a device
// time zone can never shift a statement date across a month boundary.
function coverageIsoMs(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
}

// Parse the two "DD Mon YYYY" dates out of a bank period string -> [startMs,
// endMs], or null when fewer than two dates are present/parseable.
function coverageBankSpan(period) {
  const re = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/g;
  const found = [];
  let m;
  while ((m = re.exec(String(period || ''))) !== null) {
    const mo = COVERAGE_MON[m[2].toLowerCase()];
    if (mo != null) found.push(Date.UTC(+m[3], mo, +m[1]));
  }
  return found.length >= 2 ? [found[0], found[found.length - 1]] : null;
}

// Classify one calendar month against covered [startMs,endMs] spans: 'full'
// when the spans, starting on or before day 1, reach the last day with no gap;
// 'partial' when they cover only part; 'none' when nothing touches the month.
function coverageMonthStatus(spans, ym) {
  const [y, mo] = ym.split('-').map(Number);
  if (!y || !mo) return 'none';
  const firstMs = Date.UTC(y, mo - 1, 1);
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lastMs = Date.UTC(y, mo - 1, lastDay);
  const clamped = [];
  for (const [a, b] of spans) {
    const lo = Math.max(a, firstMs),
      hi = Math.min(b, lastMs);
    if (lo <= hi) clamped.push([lo, hi]);
  }
  if (!clamped.length) return 'none';
  clamped.sort((x, z) => x[0] - z[0]);
  if (clamped[0][0] > firstMs) return 'partial'; // coverage starts mid-month
  let reach = clamped[0][1];
  for (let i = 1; i < clamped.length; i++) {
    if (clamped[i][0] <= reach + 86400000) reach = Math.max(reach, clamped[i][1]);
    else break; // gap: stop counting
  }
  return reach >= lastMs ? 'full' : 'partial';
}

// Build the coverage map. cardMonths/bankMonths are the Sets of 'YYYY-MM' that
// actually carry transactions on each ledger, so a month with no data on a
// ledger reads 'absent' (never blocking completeness) rather than 'none'.
export function buildStatementCoverage(
  cardStatements = [],
  bankStatements = [],
  cardMonths = new Set(),
  bankMonths = new Set()
) {
  const cardSpans = [];
  for (const s of cardStatements || []) {
    const a = coverageIsoMs(s.periodStart),
      b = coverageIsoMs(s.periodEnd);
    if (a != null && b != null && a <= b) cardSpans.push([a, b]);
  }
  const bankSpans = [];
  for (const s of bankStatements || []) {
    const span = coverageBankSpan(s.period);
    if (span) bankSpans.push(span);
  }
  const months = {};
  for (const ym of new Set([...cardMonths, ...bankMonths])) {
    months[ym] = {
      card: cardMonths.has(ym) ? coverageMonthStatus(cardSpans, ym) : 'absent',
      bank: bankMonths.has(ym) ? coverageMonthStatus(bankSpans, ym) : 'absent',
    };
  }
  return { months };
}

// The shared verdict a calendar month gets, considering only ledgers that have
// data that month: 'partial' if any present ledger is provably partial, 'full'
// if every present ledger is provably full, 'unknown' otherwise (nothing
// parseable to decide - the caller falls back).
function monthCoverageVerdict(coverage, ym) {
  const c = coverage && coverage.months && coverage.months[ym];
  if (!c) return 'unknown';
  const present = [];
  if (c.card !== 'absent') present.push(c.card);
  if (c.bank !== 'absent') present.push(c.bank);
  if (!present.length) return 'unknown';
  if (present.some((s) => s === 'partial')) return 'partial';
  if (present.every((s) => s === 'full')) return 'full';
  return 'unknown';
}

// Is every month in a resolved period provably fully covered? Gates period-
// over-period comparisons so a half-imported current month is never compared
// as if whole. Conservative: an 'unknown' month does NOT block the comparison
// (no regression where statement dates cannot yet be parsed); only a provably
// 'partial' month does.
export function isPeriodFullyCovered(coverage, period) {
  if (!coverage || !period || !period.from || !period.to) return true;
  let ym = period.from;
  while (ym <= period.to) {
    if (monthCoverageVerdict(coverage, ym) === 'partial') return false;
    if (ym === period.to) break;
    ym = addMonthsYM(ym, 1);
  }
  return true;
}

// Coverage disclosure (Round 1, foundation): how many of the months in a
// multi-month period are provably NOT partial (full or unknown), out of the
// total months the period spans. Reuses the exact same per-month verdict and
// the same conservative rule isPeriodFullyCovered already applies - an
// 'unknown' month (no parseable statement dates) is never counted against the
// total, only a PROVABLY 'partial' month is - so this can never wrongly claim
// "based on 0 of 6 months" on a complete history the coverage model simply
// cannot classify. Returns null for a single-month period (from === to): that
// case already has its own, more specific "may be incomplete" wording at the
// call site, and "based on 1 of 1 months" would say nothing useful. Also
// returns null when every month is confirmed-not-partial, so a caller can
// treat null as "nothing to disclose". Pure.
export function periodCoverage(coverage, period) {
  if (!coverage || !period || !period.from || !period.to || period.from === period.to) return null;
  let total = 0,
    full = 0;
  let ym = period.from;
  while (true) {
    total++;
    if (monthCoverageVerdict(coverage, ym) !== 'partial') full++;
    if (ym === period.to) break;
    ym = addMonthsYM(ym, 1);
  }
  if (full >= total) return null;
  return { full, total };
}

// The plain-language sentence built from periodCoverage, above - the fixed
// "based on N of M months" wording used everywhere a multi-month total, list
// or breakdown rests on a period with a provably partial month in it. One
// wording, one place it is built, so it can never drift between the three
// tabs that each show it.
export function periodCoverageNote(coverage, period) {
  const c = periodCoverage(coverage, period);
  if (!c) return null;
  const missing = c.total - c.full;
  return `Based on ${c.full} of ${c.total} months. ${missing === 1 ? 'One month is' : `${missing} months are`} only partly imported, so this total may be a little higher.`;
}

/* Which month, if any, looks incomplete. The latest month is flagged when it
 * is the live calendar month (more can still post), or when its statement
 * clearly has not closed: it did not reach near the month end AND its spend is
 * far below the recent norm. Returns { month, reason } or null. Language stays
 * cautious ("may be incomplete") because this is a heuristic, not a fact. */
export function detectIncompleteMonth(rows, months, now = new Date(), opts = {}) {
  // D-audit item 5. The two constants below are a product judgement call, not a
  // derivable fact (how conservative should "this month looks unfinished" feel?),
  // so they are now overridable via config while keeping the shipped defaults:
  //   incompleteDayMargin (3) - the latest month's newest transaction must be at
  //     least this many days short of month-end for it to look unclosed;
  //   incompleteSpendRatio (0.6) - AND its spend must be below this fraction of
  //     the recent median month. Both conditions must hold, so an ordinary quiet
  //     month that simply ran to month-end is never flagged. Defaults preserved.
  const dayMargin = opts.dayMargin == null ? 3 : opts.dayMargin;
  const spendRatio = opts.spendRatio == null ? 0.6 : opts.spendRatio;
  if (!months.length) return null;
  const latest = months[months.length - 1];
  const todayYM = ymToday(now);
  if (latest === todayYM) return { month: latest, reason: 'current' };
  if (latest > todayYM) return null; // future-dated data: don't guess

  // Coverage-first: when the imported statements can decide whether the newest
  // calendar month is fully or only partly imported, trust that FACT and skip
  // the spend-shape guess below. Only 'unknown' (no parseable statement dates
  // for a ledger with data that month) falls through to the heuristic - so this
  // is never worse than before, and better wherever statement dates parse.
  const coverage = opts.coverage || null;
  if (coverage) {
    const verdict = monthCoverageVerdict(coverage, latest);
    if (verdict === 'partial') return { month: latest, reason: 'partial' };
    if (verdict === 'full') return null;
    // 'unknown' → fall through to the spend-shape heuristic below.
  }

  const spendByMonth = {};
  let lastDay = 0;
  for (const r of rows) {
    if (r.kind !== 'spend') continue;
    spendByMonth[r.month] = (spendByMonth[r.month] || 0) + r.amount;
    if (r.month === latest) lastDay = Math.max(lastDay, dayOfIso(r.date));
  }
  const prior = months.slice(0, -1).slice(-3);
  if (prior.length >= 2) {
    const [y, m] = latest.split('-').map(Number);
    const dim = DAYS_IN_MONTH(y, m);
    const med = median(prior.map((mm) => spendByMonth[mm] || 0));
    const latestTotal = spendByMonth[latest] || 0;
    if (lastDay > 0 && lastDay < dim - dayMargin && med > 0 && latestTotal < spendRatio * med) {
      return { month: latest, reason: 'partial' };
    }
  }
  return null;
}

/* The latest month we can report on with confidence. */
export function latestCompleteMonth(rows, months, now = new Date(), coverage = null) {
  if (!months.length) return null;
  const inc = detectIncompleteMonth(rows, months, now, { coverage });
  if (inc && inc.month === months[months.length - 1]) {
    return months.length >= 2 ? months[months.length - 2] : months[months.length - 1];
  }
  return months[months.length - 1];
}

/* Resolve a period selection into a concrete { from, to } month range (both
 * inclusive, 'YYYY-MM'), plus a label and the previous comparable range for
 * change calculations. `sel` is { type, month?, from?, to? }. */
export function resolvePeriod(sel, rows, months, now = new Date(), coverage = null) {
  if (!months.length) return null;
  const first = months[0];
  const last = months[months.length - 1];
  const todayYM = ymToday(now);
  const lcm = latestCompleteMonth(rows, months, now, coverage);
  const clampLo = (ym) => (ym < first ? first : ym);
  const mk = (from, to, label, prevFrom, prevTo, kind) => ({
    from: clampLo(from),
    to,
    label,
    prevFrom: prevFrom ? clampLo(prevFrom) : null,
    prevTo: prevTo || null,
    kind: kind || sel.type,
  });

  switch (sel.type) {
    case 'latest-complete': {
      const t = lcm || last;
      return mk(t, t, monthName(t), addMonthsYM(t, -1), addMonthsYM(t, -1), 'month');
    }
    case 'current-month': {
      const t = last; // newest month present (may be in progress)
      return mk(t, t, monthName(t), addMonthsYM(t, -1), addMonthsYM(t, -1), 'month');
    }
    case 'previous-month': {
      const base = lcm || last;
      const t = addMonthsYM(base, -1);
      return mk(t, t, monthName(t), addMonthsYM(t, -1), addMonthsYM(t, -1), 'month');
    }
    case 'last-3': {
      const to = lcm || last;
      const from = addMonthsYM(to, -2);
      return mk(from, to, 'Last 3 months', addMonthsYM(from, -3), addMonthsYM(to, -3), 'range');
    }
    case 'last-6': {
      const to = lcm || last;
      const from = addMonthsYM(to, -5);
      return mk(from, to, 'Last 6 months', addMonthsYM(from, -6), addMonthsYM(to, -6), 'range');
    }
    case 'this-year': {
      const y = (lcm || last).slice(0, 4);
      const from = `${y}-01`;
      const to = lcm || last;
      const py = String(+y - 1);
      return mk(from, to, `${y}`, `${py}-01`, `${py}-12`, 'range');
    }
    case 'custom': {
      const from = sel.from || first;
      const to = sel.to || last;
      const span = monthSpanCount(from, to);
      return mk(
        from,
        to,
        `${monthName(from)} - ${monthName(to)}`,
        addMonthsYM(from, -span),
        addMonthsYM(to, -span),
        'range'
      );
    }
    case 'all':
    default:
      return mk(first, last, 'All time', null, null, 'all');
  }
}

function monthSpanCount(from, to) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}
function inRange(ym, from, to) {
  return ym >= from && ym <= to;
}

/* Analyse a resolved period into everything the dashboard shows for it:
 * totals split by kind, purchase count, leading category, category and
 * merchant breakdowns, per-month spend, and change vs the previous comparable
 * period and vs the historical monthly average. Pure. */
export function analysePeriod(rows, period, opts = {}) {
  // Named merchantIntel here (not `merchants`) to avoid colliding with the local
  // `const merchants` result array built below; it is the compiled merchant list.
  const {
    keepUpperSet = new Set(),
    smallWordsSet = new Set(),
    merchantLabelFn = (s) => s,
    brandRules = [],
    merchants: merchantIntel = null,
    splits = [],
  } = opts;
  const inP = rows.filter((r) => inRange(r.month, period.from, period.to));
  const spend = inP.filter((r) => r.kind === 'spend');

  const totalSpend = roundMoney(spend.reduce((a, r) => a + r.amount, 0));
  const totalPayments = roundMoney(
    inP.filter((r) => r.kind === 'payment').reduce((a, r) => a - r.amount, 0)
  );
  const totalRefunds = roundMoney(
    inP.filter((r) => r.kind === 'refund').reduce((a, r) => a - r.amount, 0)
  );
  const totalFees = roundMoney(
    inP.filter((r) => r.kind === 'fee').reduce((a, r) => a + r.amount, 0)
  );

  const monthsInP = [...new Set(inP.map((r) => r.month))].sort();

  // See summarise's own comment: splits redistribute category attribution only.
  // Shares still sum to ~1 because the split total equals the unsplit total.
  const splitsByTxn = splitsByTxnId(splits);
  const { byCategory: byCatSplit } = categoryTotalsWithSplits(spend, splitsByTxn);
  const byCategory = Object.entries(byCatSplit)
    .map(([name, amt]) => ({
      name,
      amount: roundMoney(amt),
      share: totalSpend ? amt / totalSpend : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const byMonth = {};
  for (const r of spend) byMonth[r.month] = roundMoney((byMonth[r.month] || 0) + r.amount);

  const merch = {};
  for (const r of spend) {
    // Additive brand key for grouping; per-transaction display/totals unchanged.
    // The group keeps its first row's raw description so its display label comes
    // from the one shared merchantDisplayLabel, not a hand-copied formula.
    const key = merchantGroupKey(r.description, brandRules, merchantIntel) || 'UNKNOWN';
    if (!merch[key])
      merch[key] = {
        key,
        amount: 0,
        count: 0,
        category: r.category,
        descSrc: r.description,
        branches: new Set(),
        ids: [],
      };
    const br = merchantBranch(r.description);
    if (br) merch[key].branches.add(br);
    merch[key].amount += r.amount;
    merch[key].count += 1;
    merch[key].ids.push(r.id);
  }
  const merchants = Object.values(merch)
    .map((v) => ({
      merchant: merchantDisplayLabel(
        v.descSrc,
        brandRules,
        merchantIntel,
        keepUpperSet,
        smallWordsSet
      ),
      key: v.key,
      branches: [...v.branches].sort(),
      amount: roundMoney(v.amount),
      count: v.count,
      avg: roundMoney(v.amount / v.count),
      share: totalSpend ? v.amount / totalSpend : 0,
      category: v.category,
    }))
    .sort((a, b) => b.amount - a.amount);

  const leading = byCategory[0] || null;

  // Previous comparable period (same number of months, immediately before).
  let prevTotal = null;
  if (period.prevFrom && period.prevTo) {
    const prev = rows.filter(
      (r) => r.kind === 'spend' && inRange(r.month, period.prevFrom, period.prevTo)
    );
    prevTotal = roundMoney(prev.reduce((a, r) => a + r.amount, 0));
  }

  return {
    from: period.from,
    to: period.to,
    label: period.label,
    kind: period.kind,
    months: monthsInP,
    total_spend: totalSpend,
    total_payments: totalPayments,
    total_refunds: totalRefunds,
    total_fees: totalFees,
    n_purchases: spend.length,
    n_transactions: inP.length,
    by_category: byCategory,
    by_month: byMonth,
    merchants,
    leading,
    prev_total: prevTotal,
  };
}

/* Make a PREVIOUS window addressable as a full breakdown (Round 1, A0).
 * analysePeriod only ever runs for the current window; a previous window is
 * otherwise exposed only as the scalar prev_total. This wraps analysePeriod over
 * an explicit { from, to } with no previous-of-the-previous, and forwards opts
 * unchanged so keepUpperSet / smallWordsSet / merchantLabelFn are applied - the
 * merchant labels then come back tidied, so a later comparison never mismatches
 * "STARBUCKS" against "Starbucks". Adds no analysis logic. Pure. */
export function analysisForWindow(rows, from, to, opts = {}) {
  const period = {
    from,
    to,
    label: '',
    kind: 'range',
    prevFrom: null,
    prevTo: null,
  };
  return analysePeriod(rows, period, opts);
}

/* The largest gap, in months, between consecutive occurrence-months. A steady
 * monthly commitment has a maximum gap of 1; a charge seen twice in quick
 * succession and then not again for six months has a gap of 6. Used by
 * detectRecurring to reject an irregular repeat purchase that a bare "3+ months
 * at a similar amount" test would otherwise accept as recurring. Its own
 * month-key-to-index arithmetic now delegates to the shared monthIndex
 * (shared-helpers.js) - previously reimplemented here privately, byte-for-
 * byte identical to a second private copy inside read-statements.js's
 * standingDebitMonthGap. */
export function maxConsecutiveGap(monthKeys) {
  const idx = monthKeys
    .map(monthIndex)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  let mx = 0;
  for (let i = 1; i < idx.length; i++) mx = Math.max(mx, idx[i] - idx[i - 1]);
  return mx;
}

/* Detect likely recurring charges: the same merchant appearing in 3+ distinct
 * months at a similar amount, AND with those months close together in time.
 * Returns [{ merchant, months, typical }].
 *
 * D-audit item 1 - day-of-month is deliberately NOT used as a filter. A genuine
 * monthly subscription often DOES charge near the same date, and Plaid's public
 * cadence model leans on that regularity; but on real statement data the printed
 * transaction/posting date drifts from the true billing date, and one merchant
 * group can bill several services on different anniversary days (Apple). Measured
 * on the real card export, the clearest true subscriptions have a WIDE
 * day-of-month spread - a wide day-of-month spread - so a day-of-month
 * regularity gate would produce false negatives on exactly the charges it should
 * keep. The month-count + maximum-gap cadence gate below is the well-grounded
 * signal that survives that noise; day-of-month is left out on purpose. (If ever
 * wanted, it belongs as a soft confidence score shown to the user, never as a
 * hard filter.) */
export function detectRecurring(
  rows,
  minMonths = 3,
  tolerance = 0.15,
  brandRules = [],
  merchants = null,
  maxGapMonths = 2
) {
  const byMerch = {};
  for (const r of rows.filter((r) => r.kind === 'spend')) {
    const key = merchantGroupKey(r.description, brandRules, merchants);
    (byMerch[key] = byMerch[key] || []).push(r);
  }
  // Ledger-recency anchor for the forward lapsed check below: the most recent
  // month ANY row (any kind, not just spend) in the WHOLE rows array reaches -
  // the same "how current is this ledger" concept detectIncompleteMonth/
  // latestCompleteMonth already anchor on, never real calendar "today". This
  // is computed once, over the entire ledger, not per-merchant, so it reflects
  // how current the ledger is as a whole, independent of any one merchant's
  // own last appearance.
  const latestMonth = (rows || []).reduce((mx, r) => (r.month > mx ? r.month : mx), '');
  const out = [];
  for (const [key, list] of Object.entries(byMerch)) {
    const byM = {};
    for (const r of list) byM[r.month] = (byM[r.month] || 0) + r.amount;
    const monthsSeen = Object.keys(byM);
    if (monthsSeen.length < minMonths) continue;
    // Cadence gate: a genuine monthly commitment recurs at a steady rhythm, so
    // reject any merchant whose longest gap between consecutive occurrence-months
    // exceeds maxGapMonths (default 2). This is what separates a standing charge
    // from an irregular large purchase that merely repeated a few times.
    if (maxConsecutiveGap(monthsSeen) > maxGapMonths) continue;
    const amounts = Object.values(byM);
    const typical = median(amounts);
    if (typical <= 0) continue;
    const consistent = amounts.filter((a) => Math.abs(a - typical) <= typical * tolerance).length;
    if (consistent >= minMonths) {
      // The forward half of the SAME cadence gate above, applied prospectively:
      // a commitment that recurred consistently in the past is only still
      // ACTIVE if its own last occurrence is within maxGapMonths of the
      // ledger's newest month; otherwise it has LAPSED. lastMonth is carried
      // on the returned item (previously only a bare count was returned) so a
      // caller can show exactly when it was last seen, never just "gone".
      const lastMonth = monthsSeen.slice().sort().pop();
      out.push({
        key,
        label: merchantDisplayLabel(list[0].description, brandRules, merchants),
        months: monthsSeen.length,
        typical: roundMoney(typical),
        lastMonth,
        status: recurringStatus(lastMonth, latestMonth, maxGapMonths),
        expectedDay: medianDayOfMonth(list.map((r) => r.date)),
        risen: detectSustainedRise(
          Object.entries(byM).map(([month, amount]) => ({ month, amount }))
        ),
      });
    }
  }
  return out.sort((a, b) => b.typical - a.typical);
}

/* One combined monthly-commitments figure, de-duplicated across the two ledgers
 * (Round 1, A3). Inputs are the outputs of detectRecurring(...) (card side) and
 * detectBankStandingDebits(...) (bank side). A commitment is de-duped on a
 * normalised label (trim + toUpperCase); when the same label appears on both
 * sides the card one is kept, marked source 'card', and its typical is counted
 * once, never twice. Returns { total, items:[{ label, typical, source }] } sorted
 * by typical desc, with total the sum of the kept typicals. Pure. */
export function monthlyCommitmentsTotal(cardRecurring, bankStandingDebits) {
  const byNorm = new Map();
  const norm = (s) =>
    String(s == null ? '' : s)
      .trim()
      .toUpperCase();
  for (const c of cardRecurring || []) {
    const k = norm(c.label);
    if (!byNorm.has(k))
      byNorm.set(k, {
        label: c.label,
        key: c.key || null,
        typical: roundMoney(c.typical),
        source: 'card',
        lastMonth: c.lastMonth || null,
        status: c.status || 'active',
        expectedDay: c.expectedDay || null,
        risen: c.risen || null,
      });
  }
  for (const b of bankStandingDebits || []) {
    const k = norm(b.label);
    if (byNorm.has(k)) continue;
    byNorm.set(k, {
      label: b.label,
      key: b.key || null,
      typical: roundMoney(b.typical),
      source: 'bank',
      lastMonth: b.lastMonth || null,
      status: b.status || 'active',
      expectedDay: b.expectedDay || null,
      risen: b.risen || null,
    });
  }
  const all = [...byNorm.values()].sort((a, b) => b.typical - a.typical);
  const items = all.filter((it) => it.status !== 'lapsed');
  const lapsed = all.filter((it) => it.status === 'lapsed');
  const total = roundMoney(items.reduce((a, it) => a + it.typical, 0));
  return { total, items, lapsed };
}

export function projectCashFlow(opts = {}) {
  const cashPosition = opts.cashPosition;
  if (cashPosition == null || !Number.isFinite(cashPosition)) return null;
  const commitments = (opts.commitments || []).filter((c) => c.expectedDay);
  const income = opts.income || null;
  const now = opts.now || new Date();
  const horizonDays = Math.max(7, Math.min(28, opts.horizonDays || 21));
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const days = [];
  let balance = roundMoney(cashPosition);
  let lowPoint = { date: todayIso, balance };
  for (let i = 1; i <= horizonDays; i++) {
    const date = addDaysIso(todayIso, i);
    const day = isoDay(date);
    const events = [];
    for (const c of commitments) {
      if (c.expectedDay === day) {
        balance = roundMoney(balance - c.typical);
        events.push({
          type: 'commitment',
          label: c.label,
          amount: -c.typical,
          source: c.source || null,
          key: c.key || null,
        });
      }
    }
    if (income && income.nextExpectedDate === date) {
      balance = roundMoney(balance + income.typicalAmount);
      events.push({
        type: 'income',
        label: income.label,
        amount: income.typicalAmount,
        source: 'bank',
        key: income.key || null,
      });
    }
    days.push({ date, balance, events });
    if (balance < lowPoint.balance) lowPoint = { date, balance };
  }

  return {
    startBalance: roundMoney(cashPosition),
    todayIso,
    horizonDays,
    days,
    lowPoint,
    nextIncome:
      income && income.nextExpectedDate
        ? { date: income.nextExpectedDate, amount: income.typicalAmount }
        : null,
  };
}

export function nextStatementNudge(cardStatements, bankStatements, opts = {}, now = new Date()) {
  const toleranceDays = opts.toleranceDays == null ? 4 : opts.toleranceDays;
  const ends = [];
  for (const s of cardStatements || []) {
    const ms = coverageIsoMs(s.periodEnd);
    if (ms != null) ends.push(ms);
  }
  for (const s of bankStatements || []) {
    const span = coverageBankSpan(s.period);
    if (span) ends.push(span[1]);
  }
  if (ends.length < 2) return null;
  ends.sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < ends.length; i++) gaps.push((ends[i] - ends[i - 1]) / 86400000);
  const cadenceDays = Math.round(median(gaps));
  if (cadenceDays <= 0) return null;
  const latestEndMs = ends[ends.length - 1];
  const daysSinceLast = Math.round((now.getTime() - latestEndMs) / 86400000);
  let status = 'ontrack';
  if (daysSinceLast >= cadenceDays + toleranceDays) status = 'overdue';
  else if (daysSinceLast >= cadenceDays - toleranceDays) status = 'due';
  return {
    status,
    cadenceDays,
    daysSinceLast,
    latestEndDate: new Date(latestEndMs).toISOString().slice(0, 10),
  };
}

// A robust "typical month's Cash outflow" from the roll-up trend (each row's
// .spending is bank external outflow plus card purchases, transfers and card
// payments already removed). Uses the median of recent complete months so one
// unusually large or quiet month never skews it. currentYm, when supplied,
// drops an in-progress current month, which is naturally partial and would
// understate the norm. Returns 0 when there is nothing to measure. Pure.
export function typicalMonthlyOutflow(trend, currentYm = null) {
  const rows = (trend || []).filter((t) => t && t.month && Number(t.spending) >= 0);
  const complete = currentYm ? rows.filter((t) => t.month !== currentYm) : rows;
  const use = (complete.length ? complete : rows)
    .slice(-6)
    .map((t) => Number(t.spending) || 0)
    .filter((v) => v > 0);
  if (!use.length) return 0;
  const s = use.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// How many days the cash on hand would last at a typical recent monthly
// outflow - the "runway" a person feels as "if income stopped, how long could
// I actually last". cashPosition is the current base-currency cash balance;
// monthlyOutflow is typicalMonthlyOutflow above. Returns whole days, or null
// when either input is missing or non-positive, so a caller with no honest
// number to show (e.g. a card-only device with no cash balance) can fall back
// rather than invent one. Pure.
export function runwayDays(cashPosition, monthlyOutflow) {
  if (cashPosition == null || !(cashPosition > 0) || !(monthlyOutflow > 0)) return null;
  const dailyBurn = monthlyOutflow / (365.25 / 12); // ~30.44 days per month
  return Math.max(0, Math.round(cashPosition / dailyBurn));
}
/* Name the single category or merchant most responsible for an increase, or null
 * when the rise is spread (Round 1, A4). current and previous are full analysis
 * objects (each with by_category and merchants); previous MUST come from
 * analysisForWindow (the real previous breakdown), never from the scalar
 * prev_total. For every category (matched by name) and every merchant (matched by
 * key) the delta is current amount minus previous amount, a side missing on
 * either counting as 0. The largest positive delta across both sets is the
 * candidate, and it is returned only when it accounts for at least driverShare of
 * the sum of all positive deltas (config insights.driverShare, default 0.5 so an
 * older config still works); otherwise null. Pure. */
export function insightDriver(current, previous, cfg = {}) {
  const share = cfg.insights && cfg.insights.driverShare != null ? cfg.insights.driverShare : 0.5;
  const index = (arr, keyFn) => {
    const m = new Map();
    for (const it of arr || []) m.set(keyFn(it), it);
    return m;
  };
  const deltas = [];
  const curCat = index(current && current.by_category, (c) => c.name);
  const prevCat = index(previous && previous.by_category, (c) => c.name);
  for (const name of new Set([...curCat.keys(), ...prevCat.keys()])) {
    const cur = curCat.has(name) ? curCat.get(name).amount : 0;
    const prev = prevCat.has(name) ? prevCat.get(name).amount : 0;
    deltas.push({ label: name, kind: 'category', delta: cur - prev });
  }
  const curMer = index(current && current.merchants, (m) => m.key);
  const prevMer = index(previous && previous.merchants, (m) => m.key);
  for (const key of new Set([...curMer.keys(), ...prevMer.keys()])) {
    const cur = curMer.has(key) ? curMer.get(key).amount : 0;
    const prev = prevMer.has(key) ? prevMer.get(key).amount : 0;
    const label = curMer.has(key) ? curMer.get(key).merchant : prevMer.get(key).merchant;
    deltas.push({ label, kind: 'merchant', delta: cur - prev });
  }
  const positiveSum = deltas.reduce((a, d) => a + (d.delta > 0 ? d.delta : 0), 0);
  if (positiveSum <= 0) return null;
  let top = null;
  for (const d of deltas) if (d.delta > 0 && (!top || d.delta > top.delta)) top = d;
  if (!top) return null;
  return top.delta >= share * positiveSum ? { label: top.label, kind: top.kind } : null;
}

/* Detect a consistent pay-in-full cardholder (Round 1, A5). A copy of the
 * statements is sorted by statementKey exactly the way renderCardStatementHealth
 * sorts them (String(a.statementKey).localeCompare(String(b.statementKey))), the
 * most recent 3 are taken, and the result is true only when every one of them is
 * payingInFull === true. With fewer than 3 present the decision is made on those
 * present; any revolving statement in that window makes it false. Pure. */
export function payingInFullPattern(cardStatements) {
  const sorted = (cardStatements || [])
    .slice()
    .sort((a, b) => String(a.statementKey).localeCompare(String(b.statementKey)));
  const window = sorted.slice(-3);
  if (!window.length) return false;
  if (window.some((s) => s.revolving === true)) return false;
  return window.every((s) => s.payingInFull === true);
}

// The observed card-BEHAVIOUR state, decided from evidence the statements
// actually carry - never an assumption about intent. The credit-card
// literature defines the split by INTEREST, not by balance: a transactor pays
// in full and incurs no interest; a revolver carries a balance and pays
// interest (Crook & Osipenko; Beales & Plache), and a single cycle must not
// characterise behaviour, so this reads a recent window. Keys on
// `interestCharges`, NOT the stored payingInFull/revolving booleans (which are
// balance-derived and mislabelled a $0-interest large-balance pay-in-full user
// as a revolver). Returns 'pays-in-full' | 'paying-interest' | 'insufficient'.
export function cardBehaviourState(cardStatements, opts = {}) {
  const interestFloor = opts.interestFloor == null ? 1 : opts.interestFloor;
  const minCycles = opts.minCycles == null ? 2 : opts.minCycles;
  const sorted = (cardStatements || [])
    .slice()
    .sort((a, b) => String(a.statementKey).localeCompare(String(b.statementKey)));
  if (!sorted.length) return 'insufficient';
  const window = sorted.slice(-3);
  const withInterest = window.filter(
    (s) => s.interestCharges != null && Number.isFinite(Number(s.interestCharges))
  );
  if (withInterest.length < minCycles) return 'insufficient';
  const carryingInterest = withInterest.some((s) => Number(s.interestCharges) > interestFloor);
  return carryingInterest ? 'paying-interest' : 'pays-in-full';
}

// Forward payoff estimate, amortised month by month so the interest figure is
// TRUE (depends on the rate and the declining balance) rather than the old
// `payment*months - balance`, which over-counted total paid as "interest" and
// referenced no rate at all. `eairFrac` is the effective annual rate as a
// fraction; the monthly rate is the one that compounds to it. Returns
// { neverClears:true } when the payment cannot cover a month's interest, or
// null when there is no balance / rate / payment to work with.
export function projectCardPayoff(balance, eairFrac, payment) {
  if (!(balance > 0) || eairFrac == null || !(payment > 0)) return null;
  const r = Math.pow(1 + eairFrac, 1 / 12) - 1;
  if (payment <= balance * r) return { neverClears: true };
  let bal = balance;
  let totalInterest = 0;
  let months = 0;
  while (bal > 0.005 && months < 600) {
    // 600 = 50-year safety cap
    const interest = bal * r;
    totalInterest += interest;
    bal = bal + interest - payment;
    if (bal < 0) bal = 0;
    months++;
  }
  return {
    months,
    totalInterest: roundMoney(totalInterest),
    neverClears: false,
  };
}

// The month-by-month balance path projectCardPayoff summarises, exposed so the
// "How your card is doing" card can DRAW the trajectory (the payoff chart), not
// just state the endpoint. Identical amortisation to projectCardPayoff (a
// monthly-compounded EAIR, payment applied after interest), so the picture and
// the sentence can never disagree. Returns series[0]=today's balance through
// each month, whether it clears, and the month it reaches zero (null when it
// never does, so the chart never draws a zero the pace cannot reach). Additive:
// projectCardPayoff itself is unchanged.
export function cardPayoffSeries(balance, eairFrac, payment, maxMonths = 120) {
  if (!(balance > 0) || eairFrac == null || !(payment > 0)) return null;
  const r = Math.pow(1 + eairFrac, 1 / 12) - 1;
  const neverClears = payment <= balance * r;
  const series = [roundMoney(balance)];
  let bal = balance,
    months = 0,
    clearedMonth = null;
  while (months < maxMonths) {
    const interest = bal * r;
    bal = bal + interest - payment;
    if (bal < 0) bal = 0;
    months++;
    series.push(roundMoney(bal));
    if (bal <= 0.005) {
      clearedMonth = months;
      break;
    }
  }
  return { series, neverClears, clearedMonth };
}

export function totalCardInterest(cardStatements) {
  return roundMoney(
    (cardStatements || []).reduce((s, st) => s + (Number(st.interestCharges) || 0), 0)
  );
}

// Round 4: lifted out of cards-render.js's private normEair/medianPayment so
// the goal-tracking logic below (the "clear the card by" goal type) can share
// the EXACT same reading of a card's rate and recent payment behaviour that
// "How your card is doing" already uses, rather than a second, possibly
// drifting copy. cards-render.js now imports both from here.
//
// Normalise a stored EAIR to a fraction. Some card records carry a percent
// (42.0), others a fraction (0.42); anything > 1 is read as a percent.
// Returns null when absent or non-positive, so a caller degrades to a calm
// status with no projection rather than inventing a rate.
export function normaliseEair(eair) {
  const n = Number(eair);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1 ? n / 100 : n;
}

// The median posted payment over the most recent (up to 6) statements that
// carry one - roughly what the person has actually been paying, robust to a
// single unusually large or small month. 0 when none is recorded.
export function medianRecentPayment(cardStatements) {
  const pays = (cardStatements || [])
    .slice(-6)
    .map((s) => Math.abs(Number(s.payments) || 0))
    .filter((v) => v > 0);
  if (!pays.length) return 0;
  return median(pays);
}
