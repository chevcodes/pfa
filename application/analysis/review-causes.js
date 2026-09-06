import { formatDisplayDate, formatMonthYear, joinWithAnd, monthsBetween, roundMoney as r2 } from '../core/shared-helpers.js';
import {
  coverageBankSpan,
  detectRecurring,
  monthlyCommitmentsTotal,
  commitmentLink,
} from './reporting-periods.js';
import { detectBankStandingDebits } from './bank-analysis.js';
import { largeChargeSentence } from './reporting-core.js';
import { largePaymentSentence } from './reporting-insights.js';
import { accountId } from './balance-updates.js';
import {
  investmentAccountKey,
  investmentAccountLabel,
  growthExcludingContributions,
  growthRunComponents,
} from './investments.js';
import { significantTolerance } from './plan.js';

export const REVIEW_SITTING_HOURS = 12;
export const REVIEW_HISTORY_MONTHS = 3;
export const CARD_SOURCE_KEY = 'card';

const LEDGER_ORDER = ['bank', 'card', 'investment'];
const INTENT_TIERS = { goal: 0, plan: 1, savings: 2 };
const NO_INTENT_TIER = 3;
const CARD_GOALS = new Set(['spend-ceiling', 'clear-card']);
const CASH_GOALS = new Set(['cushion']);

function isoDate(value) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value == null ? '' : value));
  return m ? m[1] : null;
}

function monthEnd(ym) {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10) : null;
}

function stamp(value) {
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? t : null;
}

export function bankSourceKey(account) {
  return `bank:${accountId(account)}`;
}

export function investmentSourceKey(statement) {
  return `investment:${investmentAccountKey(statement)}`;
}

function bankEdge(statement) {
  const span = coverageBankSpan(statement && statement.period);
  return span ? new Date(span[1]).toISOString().slice(0, 10) : null;
}

function cardEdge(statement) {
  return isoDate(statement && statement.periodEnd) || monthEnd(statement && statement.statementKey);
}

export function statementEntries({ bankStatements = [], cardStatements = [], investmentStatements = [] } = {}) {
  const entries = [];
  for (const s of bankStatements || [])
    entries.push({
      key: bankSourceKey(s.account),
      ledger: 'bank',
      account: accountId(s.account),
      edge: bankEdge(s),
      importedAt: s.importedAt || null,
      reconciled: s.reconciled,
    });
  for (const s of cardStatements || [])
    entries.push({
      key: CARD_SOURCE_KEY,
      ledger: 'card',
      account: String(s.account || ''),
      edge: cardEdge(s),
      importedAt: s.importedAt || null,
      reconciled: s.reconciled,
    });
  for (const s of investmentStatements || [])
    entries.push({
      key: investmentSourceKey(s),
      ledger: 'investment',
      account: investmentAccountKey(s),
      edge: isoDate(s.periodEnd),
      importedAt: s.importedAt || null,
      reconciled: undefined,
    });
  return entries;
}

export function reviewBaseline(input = {}, { sittingHours = REVIEW_SITTING_HOURS } = {}) {
  const timed = statementEntries(input)
    .map((entry) => ({ ...entry, at: stamp(entry.importedAt) }))
    .filter((entry) => entry.at != null)
    .sort((a, b) => a.at - b.at || (a.edge < b.edge ? -1 : a.edge > b.edge ? 1 : 0));
  const gap = sittingHours * 3600000;
  let latestStart = timed.length - 1;
  while (latestStart > 0 && timed[latestStart].at - timed[latestStart - 1].at <= gap) latestStart--;
  const anchorUnreadable = timed.slice(Math.max(0, latestStart)).some((entry) => !entry.edge);
  const entries = timed.filter((entry) => entry.edge);
  const reach = new Map();
  const advancing = [];
  for (const entry of entries) {
    const before = reach.get(entry.key);
    if (before == null || entry.edge > before) {
      advancing.push(entry);
      reach.set(entry.key, entry.edge);
    }
  }
  let start = advancing.length - 1;
  while (start > 0 && advancing[start].at - advancing[start - 1].at <= gap) start--;
  const sittingAt = start >= 0 ? advancing[start].at : null;
  const byKey = new Map();
  for (const entry of entries) {
    if (!byKey.has(entry.key))
      byKey.set(entry.key, {
        key: entry.key,
        ledger: entry.ledger,
        account: entry.account,
        since: null,
        frontier: null,
        sitting: [],
      });
    const source = byKey.get(entry.key);
    if (sittingAt != null && entry.at >= sittingAt) source.sitting.push(entry);
    else if (!source.since || entry.edge > source.since) source.since = entry.edge;
    if (!source.frontier || entry.edge > source.frontier) source.frontier = entry.edge;
  }
  const sources = [...byKey.values()].map((source) => ({
    ...source,
    compared: !!source.since && source.frontier > source.since,
    fresh: !source.since && source.sitting.length > 0,
  }));
  const compared = sources.filter((source) => source.compared);
  const sinceDates = compared.map((source) => source.since).sort();
  const ledgerEdges = sources
    .filter((source) => source.ledger !== 'investment')
    .map((source) => source.frontier)
    .sort();
  return {
    mode: compared.length && !anchorUnreadable ? 'story' : 'state',
    anchorUnreadable,
    sittingAt: sittingAt == null ? null : new Date(sittingAt).toISOString(),
    sources,
    anchors: anchorUnreadable
      ? []
      : compared.map((source) => ({ key: source.key, ledger: source.ledger, since: source.since })),
    ledgers: LEDGER_ORDER.filter((ledger) => sources.some((source) => source.ledger === ledger)),
    since:
      sinceDates.length && !anchorUnreadable
        ? { from: sinceDates[0], to: sinceDates[sinceDates.length - 1] }
        : null,
    frontier: ledgerEdges.length ? ledgerEdges[ledgerEdges.length - 1] : null,
    sittingUnreconciled: sources
      .flatMap((source) => source.sitting)
      .filter((entry) => entry.ledger !== 'investment' && entry.reconciled === false).length,
    unreconciled: entries.filter((entry) => entry.ledger !== 'investment' && entry.reconciled === false)
      .length,
  };
}

export function sinceHeader(baseline) {
  const anchors = (baseline && baseline.anchors) || [];
  if (!anchors.length) return null;
  const byDate = new Map();
  for (const anchor of anchors) {
    const date = String(anchor.since).slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, { since: anchor.since, ledgers: new Set() });
    byDate.get(date).ledgers.add(anchor.ledger);
  }
  const dates = [...byDate.keys()].sort();
  const only = byDate.get(dates[0]);
  if (dates.length === 1 && baseline.ledgers.every((ledger) => only.ledgers.has(ledger)))
    return `Since your statement ending ${formatDisplayDate(only.since)}`;
  const parts = dates.map((date) => {
    const group = byDate.get(date);
    const ledgers = LEDGER_ORDER.filter((ledger) => group.ledgers.has(ledger));
    return `${joinWithAnd(ledgers)} statement${ledgers.length > 1 ? 's' : ''} ending ${formatDisplayDate(group.since)}`;
  });
  return `Since your ${parts.join(' and your ')}`;
}

export function reviewBars(takeHome, cfg = {}) {
  const insights = (cfg && cfg.insights) || {};
  return {
    meaningful: Number(insights.meaningfulChangeMin) || 3000,
    large: Number(takeHome) > 0 ? significantTolerance(takeHome) : Number(insights.largeChargeMin) || 10000,
  };
}

export function passesReviewGate(candidate, bars) {
  if (!candidate || !candidate.flagged || !bars) return false;
  const amount = Math.abs(Number(candidate.amount) || 0);
  const monthly = Number(candidate.monthly) || 0;
  const structural = candidate.kind === 'structural';
  const yearly = structural ? monthly * 12 : amount;
  if (!(yearly >= bars.meaningful)) return false;
  return structural || amount >= bars.large;
}

export function intentTier(tags = []) {
  return tags.reduce((best, tag) => Math.min(best, INTENT_TIERS[tag] ?? NO_INTENT_TIER), NO_INTENT_TIER);
}

export function rankReviewCauses(candidates = []) {
  const weight = (c) => (c.kind === 'structural' ? c.monthly * 12 : Math.abs(Number(c.amount) || 0));
  return candidates
    .map((c) => ({ ...c, tier: intentTier(c.intent || []), weight: r2(weight(c)) }))
    .sort(
      (a, b) =>
        (a.area === 'goal' ? 0 : 1) - (b.area === 'goal' ? 0 : 1) || a.tier - b.tier || b.weight - a.weight
    );
}

function rowDay(row) {
  return isoDate(row && (row.date || row.Date));
}

function bankRowKey(row) {
  return bankSourceKey(row.account || row.Account);
}

function bankPayeeKey(row) {
  return row.counterpartyKey || 'ext:' + String(row.description || '').toUpperCase();
}

function inWindow(source, day) {
  return !!source && source.compared && !!day && day > source.since && day <= source.frontier;
}

function knownAtBaseline(source, day) {
  if (!source) return true;
  if (!source.since) return false;
  return !!day && day <= source.since;
}

function normLabel(label) {
  return String(label == null ? '' : label)
    .trim()
    .toUpperCase();
}

function sentence(text) {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : '';
}

export function newCommitmentSentence(item, money) {
  return `${item.label} is now a regular payment, about ${money(item.typical)} a month.`;
}

export function risenCommitmentSentence(item, money) {
  return `${item.label} went up to about ${money(item.risen.newTypical)} a month, from about ${money(item.risen.oldTypical)}.`;
}

export function goalQuietPhrase(standing) {
  if (!standing || !standing.good) return '';
  if (standing.type === 'cushion') return 'your emergency fund has reached its target';
  if (standing.type === 'clear-card')
    return standing.tag === 'cleared' ? 'the card is clear' : 'clearing the card is on track';
  if (standing.type === 'spend-ceiling') return 'spending is within your limit';
  return '';
}

function intentTags(ctx, { ledger, key = null }) {
  const { goalType, planSaved, savingKeys } = ctx.intent;
  const goals = ledger === 'card' ? CARD_GOALS : ledger === 'bank' ? CASH_GOALS : null;
  return [
    goals && goalType && goals.has(goalType) ? 'goal' : null,
    planSaved ? 'plan' : null,
    key && savingKeys.has(key) ? 'savings' : null,
  ];
}

function goalCause(standing) {
  if (!standing || !standing.offTrack) return null;
  return {
    id: 'goal',
    area: 'goal',
    kind: 'structural',
    flagged: true,
    monthly: 0,
    intent: ['goal'],
    tone: 'watch',
    cause: standing.title,
    detail: standing.detail || '',
    link: { kind: 'view', view: 'ahead' },
  };
}

function firstMonth(months) {
  return months.reduce((min, m) => (m && (!min || m < min) ? m : min), null);
}

function commitmentRows(ctx, item) {
  if (item.source === 'card')
    return ctx.cardRows.filter((row) => row.kind === 'spend' && row.merchantGroup === item.key);
  return ctx.bankRows.filter(
    (row) => row.direction === 'out' && !row.internalTransfer && bankPayeeKey(row) === item.key
  );
}

function commitmentsAtBaseline(ctx) {
  const cardThen = ctx.cardRows.filter((row) => knownAtBaseline(ctx.card, rowDay(row)));
  const bankThen = ctx.bankRows.filter((row) => knownAtBaseline(ctx.bySource.get(bankRowKey(row)), rowDay(row)));
  const then = monthlyCommitmentsTotal(
    detectRecurring(cardThen, 3, 0.15, ctx.brandRules, ctx.merchants),
    detectBankStandingDebits(bankThen)
  );
  const items = [...then.items, ...then.lapsed];
  const byLabel = new Map(items.map((item) => [normLabel(item.label), item]));
  const byKey = new Map(items.filter((item) => item.key).map((item) => [`${item.source}:${item.key}`, item]));
  return (item) => (item.key && byKey.get(`${item.source}:${item.key}`)) || byLabel.get(normLabel(item.label));
}

function commitmentCauses(ctx) {
  if (!ctx.story || !ctx.commitments || !ctx.commitments.combined) return [];
  const before = commitmentsAtBaseline(ctx);
  const ledgerFirst = {
    card: firstMonth(ctx.cardRows.map((row) => row.month)),
    bank: firstMonth(ctx.bankRows.map((row) => String(rowDay(row) || '').slice(0, 7))),
  };
  const out = [];
  for (const item of ctx.commitments.combined.items || []) {
    const rows = commitmentRows(ctx, item);
    if (!rows.length) continue;
    const sources = item.source === 'card' ? [ctx.card] : rows.map((row) => ctx.bySource.get(bankRowKey(row)));
    if (!sources.some((source) => source && source.compared)) continue;
    if (sources.some((source) => !source || source.fresh)) continue;
    const common = {
      area: 'commitments',
      kind: 'structural',
      flagged: true,
      intent: intentTags(ctx, { ledger: item.source, key: item.key }),
      tone: 'neutral',
      link: commitmentLink(item),
    };
    const then = before(item);
    if (!then) {
      const seen = firstMonth(rows.map((row) => String(rowDay(row) || '').slice(0, 7)));
      const first = ledgerFirst[item.source];
      if (!seen || !first || monthsBetween(first, seen) < REVIEW_HISTORY_MONTHS - 1) continue;
      out.push({
        ...common,
        id: `commitment-new:${normLabel(item.label)}`,
        monthly: item.typical,
        cause: newCommitmentSentence(item, ctx.money),
        detail: `First seen in ${formatMonthYear(seen)}.`,
      });
    } else if (item.risen && !then.risen) {
      out.push({
        ...common,
        id: `commitment-risen:${normLabel(item.label)}`,
        monthly: r2(item.risen.newTypical - item.risen.oldTypical),
        cause: risenCommitmentSentence(item, ctx.money),
        detail: `Since ${formatMonthYear(item.risen.sinceMonth)}.`,
      });
    }
  }
  return out;
}

function oneOffCauses(ctx) {
  if (!ctx.story) return [];
  const out = [];
  for (const flag of ctx.cardLarge) {
    if (!flag || !flag.row || !inWindow(ctx.card, rowDay(flag.row))) continue;
    out.push({
      id: `card-large:${flag.row.id}`,
      area: 'spending',
      kind: 'one-off',
      flagged: true,
      amount: flag.row.amount,
      intent: intentTags(ctx, { ledger: 'card' }),
      tone: 'neutral',
      cause: largeChargeSentence(flag.row, ctx.money),
      detail: '',
      link: { kind: 'transaction', ledger: 'card', id: flag.row.id, date: rowDay(flag.row) },
    });
  }
  const bankById = new Map(ctx.bankRows.map((row) => [row.id, row]));
  for (const flag of ctx.bankLarge) {
    const row = flag && bankById.get(flag.id);
    if (!row || !inWindow(ctx.bySource.get(bankRowKey(row)), rowDay(row))) continue;
    out.push({
      id: `bank-large:${flag.id}`,
      area: 'spending',
      kind: 'one-off',
      flagged: true,
      amount: flag.amount,
      intent: intentTags(ctx, { ledger: 'bank', key: flag.key }),
      tone: 'neutral',
      cause: largePaymentSentence(flag, ctx.money),
      detail: '',
      link: { kind: 'payee', key: flag.key, label: flag.label, date: rowDay(row) },
    });
  }
  return out;
}

export function investmentHeadlineComponents(run, bars, money) {
  const significant = growthRunComponents(run, money).filter((component) =>
    passesReviewGate(
      { kind: 'one-off', amount: component.amount, flagged: true },
      bars
    )
  );
  if (significant.length < 2) return significant;
  const contribution = significant.find((component) => component.key === 'contribution');
  const growth = significant.find((component) => component.key === 'growth');
  if (contribution && growth && growth.direction === 'down') return [contribution, growth];
  return significant
    .slice()
    .sort(
      (a, b) =>
        (a.direction === 'down' ? 0 : 1) - (b.direction === 'down' ? 0 : 1) ||
        b.amount - a.amount
    )
    .slice(0, 1);
}

function investmentCauses(ctx) {
  const sources = ctx.baseline.sources.filter((source) => source.ledger === 'investment' && source.compared);
  const result = { sources, runs: [], suppressed: [], causes: [] };
  for (const source of sources) {
    const own = ctx.investmentStatements.filter(
      (statement) =>
        investmentAccountKey(statement) === source.account && (isoDate(statement.periodEnd) || '') >= source.since
    );
    const run = growthExcludingContributions(own, { baseCurrency: ctx.base })[0] || null;
    if (!run || !run.months || run.brokenBy || isoDate(run.from) !== source.since) {
      result.suppressed.push({
        area: 'investments',
        account: source.account,
        reason: run ? run.brokenBy || 'partial' : 'single',
      });
      continue;
    }
    result.runs.push(run);
    const headline = investmentHeadlineComponents(run, ctx.bars, ctx.money);
    if (!headline.length) continue;
    const latest = own.slice().sort((a, b) => String(a.periodEnd).localeCompare(String(b.periodEnd))).pop();
    const who = sources.length > 1 ? `${investmentAccountLabel(latest, ctx.investmentStatements)}: ` : '';
    const clause = joinWithAnd(headline.map((component) => component.standalone));
    result.causes.push({
      id: `investment:${source.account}`,
      area: 'investments',
      kind: 'one-off',
      flagged: true,
      amount: Math.max(...headline.map((component) => component.amount)),
      intent: [ctx.intent.savingKeys.size ? 'savings' : null, ctx.intent.planSaved ? 'plan' : null],
      tone: 'neutral',
      cause: who ? `${who}${clause}.` : sentence(clause),
      detail: '',
      link: { kind: 'view', view: 'position', anchorId: '#position-investments-card' },
    });
  }
  return result;
}

function monthsKnownAtBaseline(ctx) {
  const history = new Map();
  const add = (key, month) => {
    if (!history.has(key)) history.set(key, new Set());
    history.get(key).add(month);
  };
  for (const row of ctx.cardRows) if (knownAtBaseline(ctx.card, rowDay(row))) add(CARD_SOURCE_KEY, row.month);
  for (const row of ctx.bankRows) {
    const key = bankRowKey(row);
    if (knownAtBaseline(ctx.bySource.get(key), rowDay(row))) add(key, String(rowDay(row) || '').slice(0, 7));
  }
  return history;
}

function quietLine(ctx, investments) {
  const goalText = goalQuietPhrase(ctx.goalStanding);
  const history = monthsKnownAtBaseline(ctx);
  const spendingSources = ctx.baseline.sources.filter((source) => source.ledger !== 'investment' && source.compared);
  const spendingChecked =
    spendingSources.length > 0 &&
    !ctx.baseline.sittingUnreconciled &&
    spendingSources.every((source) => (history.get(source.key) || new Set()).size >= REVIEW_HISTORY_MONTHS);
  const { sources, runs, suppressed } = investments;
  const totalGrowth = r2(runs.reduce((sum, run) => sum + run.growth, 0));
  const investmentsGrew =
    sources.length > 0 &&
    !suppressed.length &&
    runs.length === sources.length &&
    runs.every((run) => run.growth >= 0) &&
    totalGrowth > 0;
  const parts = [
    goalText,
    spendingChecked ? 'nothing new or unusual stood out in your spending' : '',
    investmentsGrew ? `your investments grew by about ${ctx.money(totalGrowth)} on their own` : '',
  ].filter(Boolean);
  if (!parts.length && !ctx.baseline.sittingUnreconciled && spendingSources.length)
    parts.push('your newer statements all add up');
  if (!parts.length) return 'Your newer statements are in.';
  return sentence(joinWithAnd(parts));
}

export function buildReviewCauses({
  bankStatements = [],
  cardStatements = [],
  investmentStatements = [],
  cardRows = [],
  bankRows = [],
  commitments = null,
  cardLarge = [],
  bankLarge = [],
  goalStanding = null,
  intent = {},
  takeHome = 0,
  cfg = {},
  brandRules = [],
  merchants = null,
  money,
  today = null,
  sittingHours = REVIEW_SITTING_HOURS,
} = {}) {
  const baseline = reviewBaseline({ bankStatements, cardStatements, investmentStatements }, { sittingHours });
  const bySource = new Map(baseline.sources.map((source) => [source.key, source]));
  const story = baseline.mode === 'story';
  const bars = reviewBars(takeHome, cfg);
  const ctx = {
    baseline,
    bySource,
    story,
    card: bySource.get(CARD_SOURCE_KEY) || null,
    cardRows: cardRows || [],
    bankRows: bankRows || [],
    investmentStatements: investmentStatements || [],
    commitments,
    cardLarge: cardLarge || [],
    bankLarge: bankLarge || [],
    goalStanding,
    intent: {
      goalType: intent.goalType || null,
      planSaved: !!intent.planSaved,
      savingKeys: new Set(intent.savingKeys || []),
    },
    brandRules,
    merchants,
    money,
    bars,
    base: ((cfg && cfg.currency) || {}).code || 'JMD',
  };
  const investments = investmentCauses(ctx);
  const built = [
    goalCause(goalStanding),
    ...commitmentCauses(ctx),
    ...oneOffCauses(ctx),
    ...investments.causes,
  ].filter(Boolean);
  const candidates = rankReviewCauses(
    built.filter((candidate) => candidate.area === 'goal' || passesReviewGate(candidate, bars))
  );
  return {
    mode: baseline.mode,
    title: story ? sinceHeader(baseline, today) : null,
    baseline,
    bars,
    candidates,
    suppressed: investments.suppressed,
    quiet: story && !candidates.length ? quietLine(ctx, investments) : null,
    stateLine:
      !story && baseline.frontier && !baseline.unreconciled
        ? `Your statements through ${formatMonthYear(baseline.frontier.slice(0, 7))} all add up.`
        : null,
  };
}
