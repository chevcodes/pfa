import { makeMoney, makeProseMoney } from '../core/money-format.js';
import {
  averageMonthlyValue,
  median,
  monthKey,
  roundMoney,
  typicalMonthlyValue,
  isInternal,
  dirOf,
  amtOf,
  dateOf,
} from '../core/shared-helpers.js';
import { isSetAside, setAsideForeign, setAsidePlan, withDesignations } from './set-aside.js';

const GROUP_KEYS = ['fixed', 'setAside', 'free'];

export function planGroups(cfg) {
  const g = ((cfg && cfg.planBands) || {}).groups;
  return Array.isArray(g) && g.length
    ? g
    : [
        { key: 'fixed', label: 'Fixed expenses', meaning: '' },
        { key: 'setAside', label: 'Savings & investments', meaning: '' },
        { key: 'free', label: 'Discretionary spending', meaning: '' },
      ];
}

export function defaultTargets(cfg) {
  const d = ((cfg && cfg.planBands) || {}).defaults || {};
  return {
    fixed: Number(d.fixed) || 60,
    setAside: Number(d.setAside) || 20,
    free: Number(d.free) || 20,
  };
}

// The category -> group map a person actually works with. Seeded from config on
// first run, then owned by the person: a stored assignment always wins, and a
// category nobody has placed falls to discretionary spending, which is the only group
// that can honestly hold "we do not know what this is yet".
export function resolveGroupMap(cfg, stored = null) {
  const seed = ((cfg && cfg.planBands) || {}).seed || {};
  const map = {};
  for (const key of GROUP_KEYS) {
    for (const name of seed[key] || []) map[String(name).toLowerCase()] = key;
  }
  for (const [name, group] of Object.entries(stored || {})) {
    if (GROUP_KEYS.includes(group)) map[String(name).toLowerCase()] = group;
  }
  return map;
}

export function groupForCategory(name, groupMap) {
  return groupMap[String(name || '').toLowerCase()] || 'free';
}

function r2(n) {
  return roundMoney(Number(n) || 0);
}
function completeTrend(trend, asOf) {
  const rows = (Array.isArray(trend) ? trend : []).filter((t) => t && t.month);
  if (!asOf) return rows.slice(0, -1);
  const cutoff = monthKey(asOf);
  return rows.filter((t) => t.month < cutoff);
}
function medianMonthly(byMonth, asOf) {
  const cutoff = asOf ? monthKey(asOf) : null;
  const values = [...byMonth.entries()]
    .filter(([m]) => (cutoff ? m < cutoff : true))
    .map(([, v]) => v)
    .filter((n) => n > 0);
  const t = typicalMonthlyValue(values);
  return { amount: r2(t.amount), monthsUsed: t.monthsUsed, basis: t.basis };
}

/* The one typical-month take-home figure in the app. The Plan's shares are
 * resolved against it and the cushion goal's target is a multiple of it, so it
 * has to be ONE function - two would let the Plan and the goal disagree about
 * what a normal month earns while both looked authoritative.
 *
 * A bare median was already robust to a double-payment month, but it also
 * ignored every month except the middle one. The shared rule keeps every
 * ordinary month in the average and sets aside only the genuinely unusual ones,
 * and it reports which months it set aside - so the figure can say where it
 * came from rather than appearing as a bare number.
 */
export const PLAN_ON_TARGET_FRACTION = 0.02;
export const PLAN_SIGNIFICANT_FRACTION = 0.05;

export function onTargetTolerance(takeHome) {
  return Math.max(1, (Number(takeHome) || 0) * PLAN_ON_TARGET_FRACTION);
}

export function significantTolerance(takeHome) {
  return Math.max(1, (Number(takeHome) || 0) * PLAN_SIGNIFICANT_FRACTION);
}

/* Is any band far enough off target to deserve a person's attention now?
 *
 * Discretionary spending being UNDER its target is not a problem to surface - the plan
 * model already says so, and telling someone they under-spent is exactly the
 * kind of noise this app avoids. Everything else counts in either direction:
 * under-saving and over-spending are both worth knowing.
 *
 * Takes the built plan (buildPlan's shape) so the caller does not re-derive
 * either the differences or the threshold.
 */
export function planNeedsAttention(plan) {
  if (!plan || !Array.isArray(plan.groups)) return false;
  const limit = significantTolerance(plan.takeHome);
  return plan.groups.some((g) => {
    if (g.direction === 'on') return false;
    if (g.key === 'free' && g.direction === 'under') return false;
    return Math.abs(Number(g.diff) || 0) >= limit;
  });
}

export function typicalIncome(trend, asOf) {
  const rows = completeTrend(trend, asOf);
  const values = rows.map((t) => Number(t.income) || 0).filter((n) => n > 0);
  const t = typicalMonthlyValue(values);
  return {
    amount: r2(t.amount),
    monthsUsed: t.monthsUsed,
    monthsSeen: t.monthsSeen,
    basis: t.basis,
    excluded: t.excluded.map((v) => r2(v)),
  };
}

/* THE monthly cost of living, for the emergency-fund target.
 *
 * Every complete month of statement data there is, averaged. No window, no
 * horizon to pick, no weighting: twelve months of data averages twelve, three
 * averages three. It is the simplest honest method, and it uses exactly what
 * the person has and no more.
 *
 * It reads .spending - money that actually left, card payments and transfers
 * between a person's own accounts already removed - because an emergency fund
 * exists to cover what GOES OUT if income stops. Sizing it on income, as this
 * target used to be, overstates it for anyone who does not spend all they earn.
 *
 * averageMonthlyValue, not typicalIncome's typicalMonthlyValue: see that
 * function for why a cost of living must keep its lumpy months rather than set
 * them aside.
 *
 * Carries monthsUsed and fullYear so a surface can say how much history is
 * behind the figure. Below a full year the average is systematically low - the
 * once-a-year costs have not come round yet - and a figure that cannot know
 * that about itself must be able to report it.
 */
export function monthlyCostOfLiving(trend, asOf) {
  const rows = completeTrend(trend, asOf);
  const values = rows.map((t) => Number(t.spending) || 0).filter((n) => n > 0);
  const a = averageMonthlyValue(values);
  return {
    amount: r2(a.amount),
    monthsUsed: a.monthsUsed,
    monthsSeen: a.monthsSeen,
    fullYear: a.fullYear,
    basis: 'average',
  };
}

export function unusualMonth(trend, month, asOf, tolerance = 0.25) {
  const typical = typicalIncome(trend, asOf);
  const row = (Array.isArray(trend) ? trend : []).find((t) => t && t.month === month) || null;
  const actual = row ? r2(row.income) : 0;
  if (!typical.amount || !row) {
    return { is: false, actual, typical: typical.amount, direction: '', gap: 0 };
  }
  const gap = r2(actual - typical.amount);
  return {
    is: Math.abs(gap) > typical.amount * tolerance,
    actual,
    typical: typical.amount,
    direction: gap > 0 ? 'higher' : 'lower',
    gap: r2(Math.abs(gap)),
  };
}

export function setAsideWithinCommitments(items, kinds) {
  return r2(
    (Array.isArray(items) ? items : [])
      .filter((it) => isSetAside(it, kinds))
      .reduce((sum, it) => sum + (Number(it.typical) || 0), 0)
  );
}

export const TARGET_SHAPE_VERSION = 2;

export function targetsTotal100(targets) {
  if (!targets || typeof targets !== 'object') return false;
  const total = GROUP_KEYS.reduce((sum, key) => sum + Number(targets[key]), 0);
  return Number.isFinite(total) && Math.abs(total - 100) < 0.05;
}

export function isUsableTarget(targets) {
  if (!targets || typeof targets !== 'object') return false;
  if (Number(targets.v) !== TARGET_SHAPE_VERSION) return false;
  const validShares = GROUP_KEYS.every((key) => {
    const v = Number(targets[key]);
    return Number.isFinite(v) && v >= 0 && v <= 100;
  });
  return validShares && targetsTotal100(targets);
}

export function normaliseTargets(targets, cfg) {
  const d = defaultTargets(cfg);
  if (!targets) return { ...d };
  const partial = !targets.v && GROUP_KEYS.some((k) => {
    const v = Number(targets[k]);
    return Number.isFinite(v) && v >= 0 && v <= 100;
  });
  if (!isUsableTarget(targets) && !partial) return { ...d };
  const out = {};
  for (const key of GROUP_KEYS) {
    const v = Number(targets[key]);
    out[key] = Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v * 10) / 10 : d[key];
  }
  return out;
}

// What a normal month ACTUALLY looks like, split into the three groups. Every
// outgoing is placed exactly once: a detected commitment or a plain bank debit
// is fixed, a designated transfer to a future-money account is set-aside, and
// card spending follows whichever group its category has been assigned to.
export function observedGroups({
  bankRecords = [],
  cardRows = [],
  cfg = {},
  groupMap = {},
  committedKeys = new Set(),
  committedMonthly = 0,
  asOf = null,
} = {}) {
  const kinds = (cfg && cfg.bankMovementKinds) || {};
  const base = ((cfg && cfg.currency) || {}).code || 'JMD';
  const bankByMonth = new Map();
  for (const r of bankRecords) {
    const d = dateOf(r);
    if (!d || (asOf && d > asOf)) continue;
    if (String(r.currency || r.Currency || base) !== base) continue;
    if (isInternal(r) || dirOf(r) !== 'out') continue;
    if (isSetAside(r, kinds)) continue;
    const key = r.counterpartyKey || r.Group || r['Counterparty / Merchant'] || '';
    if (committedKeys.has(key)) continue;
    const m = monthKey(d);
    if (m === 'unknown') continue;
    bankByMonth.set(m, r2((bankByMonth.get(m) || 0) + amtOf(r)));
  }
  const cardByGroup = { fixed: new Map(), setAside: new Map(), free: new Map() };
  for (const r of cardRows) {
    const kind = String(r.kind || r.Type || r.type || '').toLowerCase();
    if (kind !== 'spend' && kind !== 'fee') continue;
    const d = dateOf(r);
    if (!d || (asOf && d > asOf)) continue;
    const m = monthKey(d);
    if (m === 'unknown') continue;
    const g = groupForCategory(r.category, groupMap);
    const bucket = cardByGroup[g] || cardByGroup.free;
    bucket.set(m, r2((bucket.get(m) || 0) + amtOf(r)));
  }
  const bankEveryday = medianMonthly(bankByMonth, asOf);
  const card = {
    fixed: medianMonthly(cardByGroup.fixed, asOf),
    setAside: medianMonthly(cardByGroup.setAside, asOf),
    free: medianMonthly(cardByGroup.free, asOf),
  };
  return {
    bankEveryday: bankEveryday.amount,
    cardFixed: card.fixed.amount,
    cardSetAside: card.setAside.amount,
    cardFree: card.free.amount,
    committed: r2(committedMonthly),
  };
}

function shareOf(amount, takeHome) {
  return takeHome > 0 ? Math.round((amount / takeHome) * 1000) / 10 : 0;
}

export function buildPlan({
  trend = [],
  bankRecords = [],
  cardRows = [],
  cfg = {},
  commitmentsMonthly = 0,
  commitmentItems = [],
  card = null,
  asOf = null,
  month = null,
  targets = null,
  groupAssignments = null,
  designatedSetAside = null,
  investmentContributions = null,
} = {}) {
  const kinds = withDesignations((cfg && cfg.bankMovementKinds) || {}, designatedSetAside);
  const base = ((cfg && cfg.currency) || {}).code || 'JMD';
  const rows = (Array.isArray(trend) ? trend : []).filter((t) => t && t.month);
  const latestComplete = completeTrend(rows, asOf).slice(-1)[0];
  const period =
    month || (latestComplete ? latestComplete.month : rows.length ? rows[rows.length - 1].month : '');
  const income = typicalIncome(rows, asOf);
  const groupMap = resolveGroupMap(cfg, groupAssignments);
  const statementContributions =
    investmentContributions instanceof Map
      ? new Map(
          [...investmentContributions.values()]
            .filter((entry) => entry && entry.known)
            .map((entry) => [entry.month, entry.amount])
        )
      : null;
  const setAside = setAsidePlan(bankRecords, kinds, {
    asOf,
    month: period,
    baseCurrency: base,
    ...(statementContributions ? { statementContributions } : {}),
  });
  const foreign = setAsideForeign(bankRecords, kinds, { asOf, baseCurrency: base });

  const listedCommitments = Array.isArray(commitmentItems) ? commitmentItems : [];
  const fixedCommitments = listedCommitments.filter((item) => item && item.source !== 'card');
  const fixedCommitmentsMonthly = listedCommitments.length
    ? r2(fixedCommitments.reduce((sum, item) => sum + (Number(item.typical) || 0), 0))
    : r2(commitmentsMonthly);
  const doubleCounted = setAsideWithinCommitments(fixedCommitments, kinds);
  const committed = Math.max(0, r2(fixedCommitmentsMonthly - doubleCounted));
  const committedKeys = new Set(
    fixedCommitments.map((it) => it && it.key).filter(Boolean)
  );
  const parts = observedGroups({
    bankRecords,
    cardRows,
    cfg,
    groupMap,
    committedKeys,
    committedMonthly: committed,
    asOf,
  });

  // Net saving can be NEGATIVE: a designated account that sends back more than
  // it receives has been drawn down, not saved into. A negative figure cannot
  // be a share of take-home and must never be drawn as a band, so the group
  // carries zero and the drawdown is reported as its own plain fact.
  const setAsideNet = r2(setAside.plannedMonthly + parts.cardSetAside);
  const actual = {
    fixed: r2(parts.committed + parts.bankEveryday + parts.cardFixed),
    setAside: Math.max(0, setAsideNet),
    free: r2(parts.cardFree),
  };
  const drawdown = setAsideNet < 0 ? r2(Math.abs(setAsideNet)) : 0;
  const takeHome = income.amount;
  const targetPct = normaliseTargets(targets, cfg);
  const targetAmount = {};
  for (const key of GROUP_KEYS) targetAmount[key] = r2((takeHome * targetPct[key]) / 100);

  const groups = planGroups(cfg).map((g) => {
    const a = actual[g.key] || 0;
    const t = targetAmount[g.key] || 0;
    const share = shareOf(a, takeHome);
    const diff = r2(a - t);
    return {
      key: g.key,
      label: g.label,
      meaning: g.meaning || '',
      actual: a,
      share,
      targetPct: targetPct[g.key],
      targetAmount: t,
      diff,
      // Discretionary spending is the one group where being UNDER target is not a
      // shortfall to close, so tracking is reported as a plain direction and
      // the surface decides what, if anything, that means.
      direction:
        Math.abs(diff) < onTargetTolerance(takeHome) ? 'on' : diff > 0 ? 'over' : 'under',
    };
  });

  const accountedFor = r2(actual.fixed + actual.setAside + actual.free);
  const unaccounted = r2(takeHome - accountedFor);
  const gaps = [];
  if (income.monthsUsed < 3) gaps.push('fewer than three complete months of income');
  if (!commitmentsMonthly) gaps.push('no recurring fixed expenses detected');
  if (!cardRows || !cardRows.length) gaps.push('no card spending loaded');

  return {
    period,
    asOf,
    baseCurrency: base,
    income,
    takeHome,
    unusual: unusualMonth(rows, period, asOf),
    groups,
    actual,
    targetPct,
    targetAmount,
    targetsAreDefault: !isUsableTarget(targets),
    targetTotal: r2(targetPct.fixed + targetPct.setAside + targetPct.free),
    accountedFor,
    unaccounted,
    setAsideNet,
    drawdown,
    workings: {
      committed,
      bankEveryday: parts.bankEveryday,
      cardFixed: parts.cardFixed,
      cardFree: parts.cardFree,
      setAsideTransfers: setAside.plannedMonthly,
    },
    commitmentsDetected: r2(commitmentsMonthly),
    setAsideWithinCommitments: doubleCounted,
    setAside,
    ...(statementContributions ? { statementSetAside: setAside.statement || null } : {}),
    foreignSetAside: foreign,
    groupMap,
    reconciling: reconcilingLine({
      trend: rows,
      month: period,
      fixedMonthly: actual.fixed,
      card,
      setAside: actual.setAside,
    }),
    confidence: gaps.length ? 'incomplete' : 'complete',
    gaps,
  };
}

function commitmentsMoved(trend, month, fixedMonthly, tolerance = 0.15) {
  const row = (Array.isArray(trend) ? trend : []).find((t) => t && t.month === month) || null;
  if (!row || !fixedMonthly) return { known: false, text: '' };
  const out = Number(row.bankOut) || 0;
  if (out <= 0) return { known: false, text: '' };
  const short = out < fixedMonthly * (1 - tolerance);
  return {
    known: true,
    usual: !short,
    text: short ? 'some expected payments have not left your account yet' : 'payments are leaving as usual',
  };
}

function cardSentence(card) {
  if (!card || card.owed == null) return '';
  const owed = Number(card.owed) || 0;
  if (owed <= 0) return 'the card was cleared in full';
  if (card.previousOwed != null && Number(card.previousOwed) > 0) {
    const prev = Number(card.previousOwed);
    if (owed > prev) return 'your credit-card balance is higher than last month';
    if (owed < prev) return 'your credit-card balance is lower than last month';
    return 'your credit-card balance is unchanged';
  }
  return 'your credit card has a balance';
}

export function reconcilingLine({ trend, month, fixedMonthly, card, setAside }) {
  const parts = [];
  const moved = commitmentsMoved(trend, month, fixedMonthly);
  if (moved.known) parts.push(moved.text);
  const cardText = cardSentence(card);
  if (cardText) parts.push(cardText);
  if (!parts.length) parts.push('this is what is left once everything that goes out is counted');
  const carrying = !!(card && Number(card.owed) > 0);
  const text = parts.join(', and ') + '.';
  return {
    text: text.charAt(0).toUpperCase() + text.slice(1),
    tone: carrying || (moved.known && !moved.usual) ? 'watch' : 'neutral',
    competing: carrying && Number(setAside) > 0,
  };
}

export function buildPlanModel(plan, cfg = {}) {
  if (!plan) return null;
  const money = makeMoney(cfg);
  // Figures inside a sentence read short; headline amountText stays exact.
  const prose = makeProseMoney(cfg);
  const free = plan.groups.find((g) => g.key === 'free') || { actual: 0 };
  // The over/under line is an annotation, not a value - it appears under each
  // band and again in the card's closed summary ("Discretionary spending: $83,961.14
  // over"). Short, like every other figure that sits inside a sentence.
  const trackText = (g) => {
    if (g.direction === 'on') return 'on target';
    const amount = prose(Math.abs(g.diff));
    return g.direction === 'over' ? `${amount} over` : `${amount} under`;
  };
  return {
    period: plan.period,
    takeHome: plan.takeHome,
    takeHomeText: money(plan.takeHome),
    groups: plan.groups.map((g) => ({
      ...g,
      /* ACTUAL, PLAN and the variance are three figures in ONE comparison, on
         one line, and a comparison is read at a glance. Two of them were
         already short (the variance always was), so the third printing eight
         digits made the row read as two different kinds of number rather than
         as a like-for-like. All three short; the exact totals are on the
         screens that own them. */
      actualText: prose(g.actual),
      targetAmountText: prose(g.targetAmount),
      shareText: `${g.share}%`,
      targetText: `${g.targetPct}%`,
      trackText: trackText(g),
      tone: 'neutral',
    })),
    // ONE order for the three bands, everywhere: Fixed -> Savings -> Free, the
    // order plan.groups is already built in and the order the plan editor
    // directly beneath this picture uses.
    //
    // This used to sort by size, so the hero listed "Discretionary spending, Fixed
    // expenses" while the editor an inch below listed "Fixed, Savings, Free".
    // The same three things in two orders within one screen means the eye
    // cannot carry a position from one card to the next, and the order changes
    // under a person as their own figures change.
    // ALL THREE BANDS, always - including one sitting at zero.
    //
    // Bands with no actual spend were dropped entirely, so a person who had not
    // yet designated a savings account saw a hero reading "Fixed 41% / Free
    // 59%" - a two-way split - directly above an editor listing three bands
    // with a savings target. The picture contradicted the plan beneath it, and
    // the band most likely to be missing is the one most worth noticing.
    //
    // A zero that is stated is information; a band that vanishes is not.
    bands: plan.groups.map((g) => ({
      key: g.key,
      label: g.label,
      meaning: g.meaning,
      amount: g.actual,
    })),
    free: {
      amount: free.actual,
      amountText: money(free.actual),
      label:
        plan.confidence === 'incomplete'
          ? 'estimated discretionary spending allocation'
          : 'discretionary spending allocation',
      reconciling: plan.reconciling,
    },
    targetTotal: plan.targetTotal,
    targetsBalance: Math.abs(plan.targetTotal - 100) < 0.05,
    targetsAreDefault: plan.targetsAreDefault,
    unaccounted: plan.unaccounted,
    drawdown: plan.drawdown,
    drawdownText: plan.drawdown
      ? `${money(plan.drawdown)} a month came back out of the accounts marked as savings, so nothing net was saved.`
      : '',
    unaccountedText: money(Math.abs(plan.unaccounted)),
    // Prose variant: this figure is only ever used inside the "why" sentence,
    // where a shortened number reads at a glance. The exact text stays for any
    // surface that treats it as a headline.
    unaccountedProse: prose(Math.abs(plan.unaccounted)),
    unaccountedShare: shareOf(Math.abs(plan.unaccounted), plan.takeHome),
    setAside: {
      observedText: money(plan.workings.setAsideTransfers),
      actualText: money(plan.setAside.actual),
      lumpy: plan.setAside.lumpy,
    },
    workings: {
      committedText: money(plan.workings.committed),
      bankEverydayText: money(plan.workings.bankEveryday),
      cardFixedText: money(plan.workings.cardFixed),
      cardFreeText: money(plan.workings.cardFree),
    },
    income: {
      amountText: money(plan.income.amount),
      amountProse: prose(plan.income.amount),
      monthsUsed: plan.income.monthsUsed,
      basis: plan.income.monthsUsed
        ? `${plan.income.monthsUsed} complete ${plan.income.monthsUsed === 1 ? 'month' : 'months'}`
        : 'not enough complete months yet',
    },
    unusual: plan.unusual.is
      ? {
          text: `Unusual month: ${prose(plan.unusual.actual)} came in against a normal ${prose(plan.unusual.typical)}. The plan stays on the normal month.`,
        }
      : null,
    // Formatted through makeMoney in the ROW's own currency, not raw. Built
    // with toLocaleString this was the one figure in the whole model that
    // ignored the privacy gate: with figures hidden every other amount masked
    // and this one printed in full.
    foreignSetAside: (plan.foreignSetAside || []).map((f) => {
      const inCurrency = makeMoney({
        ...cfg,
        currency: { ...((cfg && cfg.currency) || {}), code: f.currency, symbol: `${f.currency} ` },
      });
      return {
        currency: f.currency,
        text: `${inCurrency(f.net)} was set aside in ${f.currency}, named rather than converted.`,
      };
    }),
    confidence: plan.confidence,
    gaps: plan.gaps,
  };
}

export { GROUP_KEYS };
