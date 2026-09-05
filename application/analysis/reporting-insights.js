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
  median,
} from '../core/shared-helpers.js';
import { renderReport, renderBankReport, renderOverviewReport } from '../output/report-render.js';
import { categoryTotalsWithSplits, splitsByTxnId, validateSplit } from './transaction-splits.js';

import {
  isPeriodFullyCovered,
  projectCardPayoff,
  runwayDays,
  ymToday,
  addMonthsYM,
} from './reporting-periods.js';
/* ===========================================================================
 * Round 4: goal-setting ("Where you're headed") - a person's single stated
 * target, kept to a short, fixed set of choices the app can honestly measure
 * (the plan's own restriction: never open-ended text). GOAL_TYPES is the ONE
 * declared source of that set - both the goal-picker UI (ahead-render.js) and
 * every describeGoal/computeGoalProgress call below read from it, so a new
 * type (should one ever be added) is declared in exactly one place.
 * ======================================================================== */
export const GOAL_TYPES = [
  {
    id: 'runway',
    label: 'Keep a cushion of at least this many days',
    unit: 'days',
    paramKey: 'targetDays',
  },
  {
    id: 'clear-card',
    label: 'Clear the card by a date',
    unit: 'date',
    paramKey: 'targetDate',
  },
  {
    id: 'spend-ceiling',
    label: 'Keep monthly spending under an amount',
    unit: 'amount',
    paramKey: 'ceiling',
  },
];

// The plain-language description of a goal's TARGET (never its progress) -
// the sentence a person set, restated so Overview and Ahead can never phrase
// the same goal two different ways. bankMoney/formatDisplayDate are passed in
// since this file has no DOM/currency formatting of its own. Pure.
export function describeGoal(goal, bankMoney, formatDisplayDate) {
  if (!goal) return null;
  // Accepts BOTH the old shape (type: 'runway', params.targetDays/.targetDate)
  // and the migrated shape (type: 'cushion', flat targetDays/targetDate) - see
  // goal-migrate.js. Step 3 will retire the old branches once the new engine
  // is verified end to end.
  if (goal.type === 'runway' || goal.type === 'cushion') {
    const days = goal.targetDays != null ? goal.targetDays : goal.params && goal.params.targetDays;
    return `Keep a cushion of at least ${days} days`;
  }
  if (goal.type === 'clear-card') {
    const targetDate =
      goal.targetDate != null ? goal.targetDate : goal.params && goal.params.targetDate;
    return `Clear the card by ${formatDisplayDate(targetDate)}`;
  }
  if (goal.type === 'spend-ceiling')
    return `Keep monthly spending under ${bankMoney(goal.amount != null ? goal.amount : goal.params && goal.params.ceiling)}`;
  return null;
}

/* The one place a goal's progress is judged, for EITHER a live "right now"
 * reading or a specific past month's honest follow-up - the caller decides
 * which by what it puts in `data`; this function does not know or care which.
 * Returns { met: true|false|null, headline }, where met is null only for a
 * still-in-progress goal with no clean verdict yet (currently only
 * 'clear-card' before its target date and before the card is cleared) -
 * never for 'runway' or 'spend-ceiling', which always have a clean monthly
 * reading. headline is the one sentence stating that reading in plain
 * language. bankMoney/formatDisplayDate are passed in for the same reason as
 * describeGoal. Pure. */
export function computeGoalProgress(goal, data, bankMoney, formatDisplayDate) {
  if (!goal) return null;
  if (goal.type === 'runway' || goal.type === 'cushion') {
    const targetDays =
      goal.targetDays != null ? goal.targetDays : goal.params && goal.params.targetDays;
    const days = data.runwayDays;
    if (days == null)
      return {
        met: null,
        headline: 'There is not yet enough of a cash position to judge this against.',
      };
    const met = days >= targetDays;
    return {
      met,
      headline: met
        ? `Keeping about ${days} days of cushion, at or above your ${targetDays}-day target.`
        : `Currently keeping about ${days} days of cushion, below your ${targetDays}-day target.`,
    };
  }
  if (goal.type === 'clear-card') {
    const targetDate =
      goal.targetDate != null ? goal.targetDate : goal.params && goal.params.targetDate;
    const owed = data.cardOwed;
    if (owed == null || owed <= 1) return { met: true, headline: 'The card is clear.' };
    const targetMs = Date.parse(targetDate);
    const nowMs = data.now ? data.now.getTime() : Date.now();
    if (Number.isFinite(targetMs) && nowMs > targetMs) {
      return {
        met: false,
        headline: `The card was not cleared by ${formatDisplayDate(targetDate)}; ${bankMoney(owed)} is still owed.`,
      };
    }
    const monthsRemaining = Number.isFinite(targetMs)
      ? Math.max(0.1, (targetMs - nowMs) / (86400000 * 30.44))
      : null;
    const projection =
      data.eairFrac != null && data.typicalPayment > 0
        ? projectCardPayoff(owed, data.eairFrac, data.typicalPayment)
        : null;
    if (monthsRemaining != null && projection && !projection.neverClears) {
      const onTrack = projection.months <= monthsRemaining;
      return {
        met: null,
        headline: onTrack
          ? `On track to clear ${bankMoney(owed)} by ${formatDisplayDate(targetDate)}, at your recent pace.`
          : `At your recent pace, ${bankMoney(owed)} would clear after ${formatDisplayDate(targetDate)}, not by it.`,
      };
    }
    return {
      met: null,
      headline: `${bankMoney(owed)} is still owed, aiming to clear it by ${formatDisplayDate(targetDate)}.`,
    };
  }
  if (goal.type === 'spend-ceiling') {
    const spend = data.monthSpend;
    if (spend == null)
      return {
        met: null,
        headline: 'There is not yet a complete month to judge this against.',
      };
    const ceiling = goal.amount != null ? goal.amount : goal.params && goal.params.ceiling;
    const met = spend <= ceiling;
    const monthText = data.monthLabel ? ` in ${data.monthLabel}` : '';
    return {
      met,
      headline: met
        ? `Spending${monthText} was ${bankMoney(spend)}, under your ${bankMoney(ceiling)} ceiling.`
        : `Spending${monthText} was ${bankMoney(spend)}, over your ${bankMoney(ceiling)} ceiling.`,
    };
  }
  return null;
}

/* Summarise foreign-currency spending. Sums ONLY the JMD amount (r.amount) over
 * spend rows that carry a foreign leg; the foreign values themselves are mixed
 * currencies and must never be summed. Groups by the trailing currency code
 * parsed from r.foreign (e.g. "6.49 USD" -> "USD"). Pure. */
export function foreignSummary(rows) {
  const items = (rows || []).filter((r) => r && r.kind === 'spend' && r.foreign);
  let totalJmd = 0;
  const counts = {};
  for (const r of items) {
    totalJmd += Number(r.amount) || 0;
    const m = /([A-Za-z]{3})\s*$/.exec(String(r.foreign).trim());
    const ccy = m ? m[1].toUpperCase() : 'FX';
    counts[ccy] = (counts[ccy] || 0) + 1;
  }
  const byCurrency = Object.entries(counts)
    .map(([ccy, count]) => ({ ccy, count }))
    .sort((a, b) => b.count - a.count || a.ccy.localeCompare(b.ccy));
  return {
    count: items.length,
    totalJmd: roundMoney(totalJmd),
    byCurrency,
    items,
  };
}

export function effectiveForeignRate(row) {
  const m = /([\d,]+\.\d{2})\s*([A-Za-z]{3})\s*$/.exec(String((row && row.foreign) || '').trim());
  if (!m) return null;
  const foreignAmount = parseFloat(m[1].replace(/,/g, ''));
  if (!(foreignAmount > 0)) return null;
  const localAmount = Number(row && row.amount) || 0;
  return {
    rate: localAmount / foreignAmount,
    ccy: m[2].toUpperCase(),
    foreignAmount,
  };
}

export function averageForeignRates(rows) {
  const byCcy = new Map();
  for (const r of rows || []) {
    const eff = effectiveForeignRate(r);
    if (!eff) continue;
    if (!byCcy.has(eff.ccy)) byCcy.set(eff.ccy, { ccy: eff.ccy, localSum: 0, foreignSum: 0 });
    const g = byCcy.get(eff.ccy);
    g.localSum += Number(r.amount) || 0;
    g.foreignSum += eff.foreignAmount;
  }
  return [...byCcy.values()]
    .filter((g) => g.foreignSum > 0)
    .map((g) => ({ ccy: g.ccy, rate: g.localSum / g.foreignSum }))
    .sort((a, b) => a.ccy.localeCompare(b.ccy));
}

export function pairCardRefunds(rows, brandRules = [], merchants = null, opts = {}) {
  const windowDays = opts.windowDays == null ? 120 : opts.windowDays;
  const dayMs = 86400000;
  const toT = (iso) => {
    const p = String(iso || '')
      .split('-')
      .map(Number);
    return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1);
  };
  const byGroup = new Map();
  for (const r of rows) {
    if (r.kind !== 'spend') continue;
    const key = merchantGroupKey(r.description, brandRules, merchants);
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(r);
  }
  const refunds = (rows || [])
    .filter((r) => r.kind === 'refund')
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const claimed = new Set();
  const pairs = [];
  for (const ref of refunds) {
    const key = merchantGroupKey(ref.description, brandRules, merchants);
    const candidates = (byGroup.get(key) || []).filter((p) => {
      if (claimed.has(p.id)) return false;
      if (Math.abs(Math.abs(p.amount) - Math.abs(ref.amount)) > 0.01) return false;
      const gap = toT(ref.date) - toT(p.date);
      return gap >= 0 && gap <= windowDays * dayMs;
    });
    if (candidates.length === 1) {
      claimed.add(candidates[0].id);
      pairs.push({
        refundId: ref.id,
        purchaseId: candidates[0].id,
        amount: roundMoney(Math.abs(ref.amount)),
      });
    }
  }
  return { pairs, pairedPurchaseIds: claimed };
}

export function mergedMoneyMovedRanking(
  rows,
  cardMerchants,
  bankOutflows,
  bankInflows,
  refundPairs = [],
  brandRules = [],
  merchants = null
) {
  const byId = new Map((rows || []).map((r) => [r.id, r]));
  const refundByKey = new Map();
  for (const p of refundPairs) {
    const purchase = byId.get(p.purchaseId);
    if (!purchase) continue;
    const key = merchantGroupKey(purchase.description, brandRules, merchants);
    refundByKey.set(key, (refundByKey.get(key) || 0) + p.amount);
  }
  const out = (cardMerchants || []).map((m) => ({
    label: m.merchant,
    key: m.key,
    amount: roundMoney(Math.max(0, m.amount - (refundByKey.get(m.key) || 0))),
    count: m.count,
    source: 'card',
    direction: 'out',
  }));
  for (const g of bankOutflows || [])
    out.push({
      label: g.label,
      key: g.key,
      amount: roundMoney(g.moneyOut),
      count: g.count,
      source: 'bank',
      direction: 'out',
    });
  for (const g of bankInflows || [])
    out.push({
      label: g.label,
      key: g.key,
      amount: roundMoney(g.moneyIn),
      count: g.count,
      source: 'bank',
      direction: 'in',
    });
  return out.filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount);
}

export function detectPossibleDuplicates(rows, brandRules = [], merchants = null, opts = {}) {
  const windowDays = opts.windowDays == null ? 3 : opts.windowDays;
  const dayMs = 86400000;
  const toT = (iso) => {
    const p = String(iso || '')
      .split('-')
      .map(Number);
    return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1);
  };
  const byGroup = new Map();
  for (const r of rows) {
    if (r.kind !== 'spend') continue;
    const key = merchantGroupKey(r.description, brandRules, merchants);
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(r);
  }
  const out = [];
  const flagged = new Set();
  for (const list of byGroup.values()) {
    const sorted = list.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i],
          b = sorted[j];
        const gap = toT(b.date) - toT(a.date);
        if (gap > windowDays * dayMs) break;
        if (Math.abs(a.amount - b.amount) > 0.01) continue;
        if (flagged.has(a.id) || flagged.has(b.id)) continue;
        flagged.add(a.id);
        flagged.add(b.id);
        out.push({
          ids: [a.id, b.id],
          label: merchantDisplayLabel(a.description, brandRules, merchants),
          amount: roundMoney(a.amount),
          dates: [a.date, b.date],
        });
      }
    }
  }
  return out;
}

export function detectCategorySpikes(rows, period, cfg = {}, splits = []) {
  const t = Object.assign(
    { categorySpikeZ: 3.5, categorySpikeMin: 10000, categorySpikeMinMonths: 3 },
    cfg.insights || {}
  );
  if (!period) return [];
  const spend = (rows || []).filter((r) => r.kind === 'spend');
  // Split-aware: a category spike must be judged on the SAME category
  // attribution every other reader (summarise/analysePeriod/spendBreakdown)
  // uses, or a split transaction could trigger (or silently miss) a spike
  // based on stale, whole-transaction attribution. Mirrors spend-breakdown.js's
  // own contributionsFor exactly - see that file's comment for the reasoning.
  const splitMap = splitsByTxnId(splits);
  const contributionsFor = (r) => {
    const split = splitMap.get(r.id);
    if (split && validateSplit(split, r.amount).ok) {
      return split.parts.map((p) => ({
        category: p.category,
        amount: Math.abs(Number(p.amount) || 0),
      }));
    }
    return [{ category: r.category, amount: Math.abs(Number(r.amount) || 0) }];
  };
  const byMonthCat = new Map();
  for (const r of spend) {
    if (!byMonthCat.has(r.month)) byMonthCat.set(r.month, new Map());
    const m = byMonthCat.get(r.month);
    for (const part of contributionsFor(r)) {
      m.set(part.category, (m.get(part.category) || 0) + part.amount);
    }
  }
  const currentMonths = new Set(
    [...byMonthCat.keys()].filter((m) => m >= period.from && m <= period.to)
  );
  const currentTotals = new Map();
  for (const m of currentMonths) {
    for (const [cat, amt] of byMonthCat.get(m))
      currentTotals.set(cat, (currentTotals.get(cat) || 0) + amt);
  }
  const out = [];
  for (const [cat, curAmt] of currentTotals) {
    if (curAmt < t.categorySpikeMin) continue;
    const history = [];
    for (const [m, catMap] of byMonthCat) {
      if (currentMonths.has(m)) continue;
      if (catMap.has(cat)) history.push(catMap.get(cat));
    }
    if (history.length < t.categorySpikeMinMonths) continue;
    const centre = median(history);
    const mad = median(history.map((v) => Math.abs(v - centre)));
    const z =
      mad > 0
        ? (0.6745 * (curAmt - centre)) / mad
        : centre > 0 && curAmt >= centre * 2.5
          ? t.categorySpikeZ
          : 0;
    if (z >= t.categorySpikeZ && curAmt > centre)
      out.push({
        category: cat,
        amount: roundMoney(curAmt),
        typical: roundMoney(centre),
        z,
      });
  }
  return out.sort((a, b) => b.z - a.z);
}

export function detectMidMonthPace(rows, cfg = {}, now = new Date()) {
  const t = Object.assign(
    { paceMinMonths: 3, paceThreshold: 1.5, paceMin: 5000 },
    cfg.insights || {}
  );
  const months = [
    ...new Set(
      (rows || []).filter((r) => r.kind === 'spend' && r.month !== 'unknown').map((r) => r.month)
    ),
  ].sort();
  if (!months.length) return [];
  const latest = months[months.length - 1];
  if (latest !== ymToday(now)) return [];
  const [y, mo] = latest.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const dayOfMonth = now.getDate();
  if (dayOfMonth >= daysInMonth - 1) return [];
  const elapsedFraction = dayOfMonth / daysInMonth;
  const spend = rows.filter((r) => r.kind === 'spend');
  const byMonthCat = new Map();
  for (const r of spend) {
    if (!byMonthCat.has(r.month)) byMonthCat.set(r.month, new Map());
    const m = byMonthCat.get(r.month);
    m.set(r.category, (m.get(r.category) || 0) + r.amount);
  }
  const currentCat = byMonthCat.get(latest) || new Map();
  const out = [];
  for (const [cat, soFar] of currentCat) {
    if (soFar < t.paceMin) continue;
    const history = [];
    for (const [m, catMap] of byMonthCat) {
      if (m === latest) continue;
      if (catMap.has(cat)) history.push(catMap.get(cat));
    }
    if (history.length < t.paceMinMonths) continue;
    const typical = median(history);
    if (typical <= 0) continue;
    const projected = soFar / elapsedFraction;
    if (projected >= typical * t.paceThreshold)
      out.push({
        category: cat,
        projected: roundMoney(projected),
        typical: roundMoney(typical),
        dayOfMonth,
        daysInMonth,
      });
  }
  return out.sort((a, b) => b.projected / b.typical - a.projected / a.typical);
}

export function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function buildIncomeHero(income, bankMoney) {
  if (!income) return null;
  const lastText = income.lastAmount != null ? bankMoney(income.lastAmount) : null;
  const typicalText = income.typicalAmount != null ? bankMoney(income.typicalAmount) : null;
  if (!lastText) return null;
  let deltaTone = 'neutral';
  let deltaText = null;
  if (typicalText && income.stepChange === 'up') {
    deltaTone = 'good';
    deltaText = `above usual ${typicalText}`;
  } else if (typicalText && income.stepChange === 'down') {
    deltaTone = 'watch';
    deltaText = `below usual ${typicalText}`;
  }
  return {
    amountText: lastText,
    label: income.label || null,
    deltaText,
    deltaTone,
  };
}

export function buildIncomeCaption(income) {
  if (!income) return null;
  const parts = [];
  if (income.regularity === 'Steady' && income.expectedDay) {
    parts.push(`Usually around the ${income.expectedDay}${ordinalSuffix(income.expectedDay)}.`);
  } else if (income.regularity !== 'Steady') {
    parts.push('Arrives on no fixed day, so the timing is a rough guide.');
  }
  if (income.late) {
    parts.push(
      `Next deposit due - the most recent was ${formatDisplayDate(income.lastDate)}. Add the latest statement to update.`
    );
  }
  return parts.length ? parts.join(' ') : null;
}

/* ===========================================================================
 * Round 4: the hands-on scenario tool (plan section 6.2, second bullet) - the
 * first tool in the app that lets a person rehearse a decision before making
 * it. Toggling a category or place off tests "what if I stopped spending
 * here"; a hypothetical extra cost tests "what if this came up". Both
 * recompute the SAME runway figure (runwayDays, already used by Overview's
 * beat 4 and Right Now's own cash-position framing), so the scenario result
 * and the real figure elsewhere in the app are never two different ideas of
 * "how long the cushion lasts".
 *
 * toggleableItems is [{ key, label, amount }] - the amounts this period
 * contributed to typical monthly outflow, already computed and shown
 * elsewhere (Right Now's category panel and "where money went" ranking); a
 * checked-off item's amount is subtracted from monthlyOutflow before the
 * scenario's runway is computed. extraCost is a one-off amount subtracted
 * from cashPosition only (a future cost, not a recurring one). Returns
 * { baselineRunwayDays, scenarioRunwayDays, scenarioOutflow, scenarioCash }.
 * Pure. */
export function computeScenario(opts = {}) {
  const cashPosition = opts.cashPosition;
  const monthlyOutflow = opts.monthlyOutflow;
  // reductions: a Map (or plain object) of item.key -> reduction FRACTION in
  // [0,1], where 0 = keep in full, 0.5 = cut half, 1 = cut entirely. This
  // generalises the previous binary excludedKeys Set (which only expressed
  // "removed entirely" = fraction 1) to partial reductions, so the scenario
  // tool can model "spend LESS here", the realistic decision, not only
  // "spend nothing here". Back-compat: an excludedKeys Set is still accepted
  // and treated as fraction 1 for each key, so any existing caller keeps
  // working unchanged.
  const reductions =
    opts.reductions instanceof Map
      ? opts.reductions
      : new Map(Object.entries(opts.reductions || {}));
  const legacyExcluded =
    opts.excludedKeys instanceof Set ? opts.excludedKeys : new Set(opts.excludedKeys || []);
  const extraCost = Number(opts.extraCost) || 0;
  const toggleableItems = opts.toggleableItems || [];

  const fractionFor = (key) => {
    if (reductions.has(key)) {
      const f = Number(reductions.get(key));
      return Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0;
    }
    return legacyExcluded.has(key) ? 1 : 0;
  };

  const removedAmount = toggleableItems.reduce(
    (s, it) => s + (Number(it.amount) || 0) * fractionFor(it.key),
    0
  );
  const scenarioOutflow = Math.max(0, (Number(monthlyOutflow) || 0) - removedAmount);
  const scenarioCash = cashPosition == null ? null : roundMoney(cashPosition - extraCost);

  return {
    baselineRunwayDays: runwayDays(cashPosition, monthlyOutflow),
    scenarioRunwayDays: runwayDays(scenarioCash, scenarioOutflow),
    scenarioOutflow: roundMoney(scenarioOutflow),
    scenarioCash,
    monthlySaved: roundMoney(removedAmount),
  };
}

// The ONE priority scale both insight engines rank against (buildInsights on
// the card side, buildBankAppropriateInsights on the bank side). Higher = more
// important. Previously each engine showed the first `maxInsights` it authored
// in code order, so a genuinely important flag (a large unusual charge, a
// missing statement month) could be silently dropped below the cap by an
// earlier but milder insight. Ranking against one shared scale means the three
// shown are the three that matter, and "importance" means the same thing on
// every tab. Tuned in ONE place; a kind absent here sinks below all named ones.
export const INSIGHT_WEIGHTS = {
  // Needs a look now - possible error or genuine anomaly.
  'large-charge': 90,
  'large-payment': 90,
  // Completeness of the whole picture.
  'missing-months': 70,
  // Meaningful change, with a named cause.
  'overall-change': 60,
  'money-in-change': 60,
  'category-move': 55,
  // Direction / what it cost.
  verdict: 50,
  fees: 50,
  'new-merchant': 45,
  'new-payee': 45,
  refunds: 40,
  // Steady context.
  recurring: 30,
  foreign: 30,
  'high-month': 25,
};

// Rank a candidate insight list by INSIGHT_WEIGHTS and cap it. Stable within a
// tier via an explicit index tiebreak, so equal-weight insights keep their
// authored order (which is a sensible secondary priority). An untagged insight
// (missing/unknown kind) gets a low default so it sinks rather than jumps the
// queue. Pure; used by both engines so the cap and the ordering are identical.
export function rankInsights(insights, cap = 3) {
  const weightOf = (i) => (i && INSIGHT_WEIGHTS[i.kind] != null ? INSIGHT_WEIGHTS[i.kind] : 20);
  return insights
    .map((ins, idx) => ({ ins, idx, weight: weightOf(ins) }))
    .sort((a, b) => b.weight - a.weight || a.idx - b.idx)
    .slice(0, cap > 0 ? cap : insights.length)
    .map((x) => x.ins);
}

/* Any gaps in the monthly sequence (missing statement periods). */
export function missingMonths(months) {
  if (months.length < 2) return [];
  const gaps = [];
  let cur = months[0];
  const set = new Set(months);
  while (cur < months[months.length - 1]) {
    cur = addMonthsYM(cur, 1);
    if (!set.has(cur) && cur < months[months.length - 1]) gaps.push(cur);
  }
  return gaps;
}

// The ONE shared "What's new or unusual" bank-insight builder. Previously
// this exact logic - the money-in-vs-previous-period comparison, the large/
// unusual-payment check, the new-payee check, the missing-statement-months
// check, all reading the SAME config thresholds - existed as two separate,
// independently hand-written copies: buildOverviewInsights (app.js, Overview
// tab) and buildBankInsights (accounts-render.js, Accounts tab). They had
// already begun to drift (compare the two large-payment sentences: "A ... is
// much larger than a typical outflow - worth a look?" vs "Payment to ... is
// larger than usual. Worth a look?" - the second carried a stray double
// space, a small but real sign of independent maintenance). Consolidating
// removes that drift risk entirely: both tabs now read one authoritative
// implementation, and a future threshold or wording change only ever
// happens once.
//
// What stays per-caller, deliberately NOT absorbed here, because it is
// genuinely different between the two tabs, not duplicated:
//   - currentIncome/prevIncome: Overview compares analyseRollup's
//     cross-ledger income; Accounts compares analyseBankActivity's bank-only
//     cashIn. Both arrive here as already-resolved NUMBERS, so this function
//     never needs to know which analysis produced them.
//   - verdict: already computed by the caller via overviewVerdict(), each
//     from its own appropriately-shaped trend (Overview's whole cross-ledger
//     roll-up trend; Accounts' own bankFlowOverTime trend) - reused here
//     exactly as buildOverviewInsights already reused it, never recomputed.
//   - onNavigate: where a click should take the person (switch to Accounts
//     from Overview; scroll to the transaction list already on screen from
//     Accounts itself).
export function buildBankAppropriateInsights(opts) {
  const {
    recsAll,
    period,
    cfg,
    currentIncome,
    prevIncome,
    verdict,
    coverage,
    bankMoney,
    prevLabel,
    monthLabel,
    bankMonthsList,
    onNavigate,
    onDrillToPayee,
    icons,
  } = opts;
  const insightsCfg = cfg.insights || {};
  const drillTo = (key, label) => (onDrillToPayee ? () => onDrillToPayee(key, label) : onNavigate);
  const out = [];

  // 1) Cash inflow vs the previous comparable period.
  // Fairness gate: never compare a not-yet-complete window against a full one -
  // that is what produced "`` (delete - empty replacement) near-zero income vs a full prior month" when
  // the current month was only part-imported. A provably partial period
  // suppresses the comparison entirely (an unknown one is allowed through, so
  // ledgers whose statement dates cannot yet be parsed keep today's behaviour).
  if (
    prevIncome != null &&
    prevIncome > 0 &&
    currentIncome != null &&
    isPeriodFullyCovered(coverage, period)
  ) {
    const diff = currentIncome - prevIncome;
    const dp = Math.round((diff / prevIncome) * 100);
    if (
      Math.abs(dp) >= (insightsCfg.meaningfulChangePct || 25) &&
      Math.abs(diff) >= (insightsCfg.meaningfulChangeMin || 3000)
    ) {
      out.push({
        // Income, not spending: more income read as the green family, less as the
        // warm family. The tone-up/tone-down classes are spending-valenced (up=warm,
        // down=green), so an income movement must flip them to land in the right
        // family. The up/down ARROW (icon) still tracks the actual direction.
        tone: diff > 0 ? 'down' : 'up',
        kind: 'money-in-change',
        icon: diff > 0 ? icons.up() : icons.down(),

        text: `Cash inflow this period was ${bankMoney(Math.abs(diff))} ${diff > 0 ? 'higher' : 'lower'} than ${prevLabel()}, at ${bankMoney(currentIncome)} vs ${bankMoney(prevIncome)}.`,
        onClick: onNavigate,
      });
    }
  }

  // 2) Large/unusual external payment: the SAME median + MAD / modified-
  // z-score method attentionItems() uses on the card side, applied to bank
  // payees. Peer population is the whole classified history (recsAll).
  const largeAll = detectLargeBankOutflows(recsAll, cfg);
  const largeInPeriod = period
    ? largeAll.filter((f) => {
        const m = String(f.date || '').slice(0, 7);
        return m >= period.from && m <= period.to;
      })
    : largeAll;
  if (largeInPeriod.length) {
    const f = largeInPeriod[0];
    out.push({
      tone: 'up',
      kind: 'large-payment',
      icon: icons.alert(),
      text: `A payment to ${f.label} of ${bankMoney(f.amount)} is larger than usual - worth a look?`,
      onClick: drillTo(f.key, f.label),
    });
  }

  // 3) New large payee this period: true first-ever occurrence, reusing the
  // SAME newMerchantMin config value Cards' own "new merchant" insight uses.
  const newPayees = detectPeriodNewPayees(recsAll, period);
  const newBig = newPayees.filter((x) => x.amount >= (insightsCfg.newMerchantMin || 2000))[0];
  if (newBig) {
    out.push({
      tone: 'new',
      kind: 'new-payee',
      icon: icons.spark(),
      text: `New this period: ${newBig.label} (${bankMoney(newBig.amount)}).`,
      onClick: drillTo(newBig.key, newBig.label),
    });
  }

  // 4) Net cash-flow direction and pattern continuation - reusing the
  // CALLER's own already-computed verdict, never a second copy of that logic.
  if (verdict) {
    out.push({
      // Cash-flow valence, not spending valence: a GOOD verdict (more came in
      // than went out) reads as the green family, a WATCH verdict as the warm
      // family. The tone-up/tone-down classes are spending-valenced (up=warm,
      // down=green), so the mapping is flipped to land in the right family -
      // the same correction insight #1 (money-in-change) already makes. The
      // up/down ARROW still tracks the actual direction.
      tone: verdict.tone === 'good' ? 'down' : verdict.tone === 'watch' ? 'up' : 'info',
      icon:
        verdict.tone === 'good'
          ? icons.up()
          : verdict.tone === 'watch'
            ? icons.down()
            : icons.info(),
      kind: 'verdict',
      text: `${capitaliseFirst(verdict.text)}${verdict.comparison ? ', and ' + verdict.comparison : ''}.`,
      onClick: onNavigate,
    });
  }
  // 5) Missing statement months.
  const gaps = missingMonths(bankMonthsList().slice().sort());
  if (gaps.length) {
    out.push({
      tone: 'info',
      kind: 'missing-months',
      icon: icons.gap(),
      text: `No account statement found for ${gaps.slice(0, 2).map(monthLabel).join(' and ')}${gaps.length > 2 ? ` and ${gaps.length - 2} more` : ''}. Add ${gaps.length === 1 ? 'it' : 'them'} for a complete picture.`,
      onClick: opts.onMissingMonths || onNavigate,
    });
  }

  return rankInsights(out, insightsCfg.maxInsights || 3);
}
