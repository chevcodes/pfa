import { roundMoney } from '../core/shared-helpers.js';
import { resolveIntention } from './category-intentions.js';
import { categoryContributions } from './category-contributions.js';
import { setAsideRuleFor, withDesignations } from './set-aside.js';

export function savingsDestinationMovements({ bankRows = [], month, cfg = {}, designatedSetAside = [], investmentContributions = null } = {}) {
  const base = cfg.currency?.code || 'JMD';
  const kinds = withDesignations(cfg.bankMovementKinds || {}, designatedSetAside);
  const byDestination = new Map();
  for (const row of bankRows) {
    if (!String(row.date || '').startsWith(month) || (row.currency || base) !== base) continue;
    const rule = setAsideRuleFor(row, kinds);
    if (!rule || !['in', 'out'].includes(row.direction)) continue;
    if (rule.investment && row.direction === 'out' && investmentContributions?.get(month)?.known) continue;
    const key = row.counterpartyKey || rule.label;
    const label = row.counterpartyLabel || rule.label || key;
    const prior = byDestination.get(key) || { key, label, amount: 0 };
    prior.amount = roundMoney(prior.amount + (row.direction === 'out' ? 1 : -1) * Math.abs(Number(row.amount) || 0));
    byDestination.set(key, prior);
  }
  const statement = investmentContributions?.get(month);
  if (statement?.known && statement.amount) byDestination.set('investment-statements', { key: 'investment-statements', label: 'Investments from statements', amount: roundMoney(statement.amount) });
  return [...byDestination.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export function categoryBudgetForMonth({ rows, bankRows, splits, intentions, categories, month, statementRecorded = false, bankStatementRecorded = false, cfg, cardAccounts, designatedSetAside }) {
  const contributions = categoryContributions({ cardRows: rows, bankRows, splits, cfg, cardAccounts, designatedSetAside, from: `${month}-01`, to: `${month}-31` });
  const { byCategory, total: purchaseTotal, feeTotal } = contributions;
  const names = new Set([...byCategory.keys(), ...(categories || [])]);
  const items = [...names].map((category) => {
    const intention = resolveIntention(intentions, category, month);
    const limit = intention && Number(intention.amount) > 0 ? roundMoney(intention.amount) : null;
    return { category, actual: roundMoney(byCategory.get(category) || 0), limit };
  }).filter((item) => item.actual !== 0 || item.limit != null);
  const feeCategories = new Map();
  for (const part of contributions.fees) feeCategories.set(part.category, roundMoney((feeCategories.get(part.category) || 0) + part.amount));
  return {
    month,
    total: roundMoney(purchaseTotal + feeTotal),
    purchaseTotal,
    feeTotal,
    refundTotal: contributions.refundTotal,
    hasRecords: (rows || []).some((row) => row.month === month) || (bankRows || []).some((row) => String(row.date || '').startsWith(month)) || statementRecorded || bankStatementRecorded,
    items,
    fees: [...feeCategories].map(([category, actual]) => ({ category, actual })).sort((a, b) => b.actual - a.actual),
  };
}

export function categoryBudgetRecentMonths(months, count = 6) {
  const ordered = [...(months || [])].sort((a, b) => b.month.localeCompare(a.month));
  const latest = ordered.find((entry) => entry.hasRecords)?.month;
  return latest ? ordered.filter((entry) => entry.month <= latest).slice(0, count).reverse() : [];
}

export function categoryCoverageText(coverage) {
  if (typeof coverage === 'string') return coverage === 'partial' ? 'Partial statement' : coverage === 'missing' ? 'Statement missing' : 'Statement recorded';
  const text = (ledger, state) => {
    if (state === 'outside') return `${ledger} history unavailable`;
    if (state === 'missing') return `${ledger} statement missing`;
    if (state === 'partial') return `${ledger} partial`;
    return `${ledger} recorded`;
  };
  return [text('Bank', coverage?.bank || 'outside'), text('Card', coverage?.card || 'outside')].join(' · ');
}

function comparableCoverage(candidate, selected) {
  if (typeof selected === 'string') return candidate.coverage === 'full';
  const ledgers = ['bank', 'card'].filter((ledger) => selected?.[ledger] !== 'outside');
  return ledgers.length > 0 && ledgers.every((ledger) => candidate.coverage?.[ledger] === 'full') && ['bank', 'card'].every((ledger) => selected?.[ledger] !== 'outside' || candidate.coverage?.[ledger] === 'outside');
}

export function categoryBudgetHistory(months, category, count = 6) {
  return categoryBudgetRecentMonths(months, count).map((entry) => {
    if (!entry.hasRecords) return { month: entry.month, label: entry.label, actual: null, limit: null, coverage: 'missing' };
    const item = entry.items.find((candidate) => candidate.category === category);
    return { month: entry.month, label: entry.label, actual: item?.actual || 0, limit: item?.limit ?? null, coverage: entry.coverage || 'unknown' };
  });
}

export function categoryBudgetPastAverage(months, selectedMonth, category, count = 6) {
  const selected = (months || []).find((entry) => entry.month === selectedMonth);
  const earlier = (months || []).filter((entry) => entry.month < selectedMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, count).filter((entry) => entry.hasRecords && comparableCoverage(entry, selected?.coverage || 'full'));
  if (earlier.length < 3) return null;
  const total = earlier.reduce((sum, entry) => sum + (entry.items.find((item) => item.category === category)?.actual || 0), 0);
  return { amount: roundMoney(total / earlier.length), months: earlier.length };
}

export function savingsDestinationPastAverage(months, selectedMonth, key, count = 6) {
  const earlier = (months || []).filter((entry) => entry.month < selectedMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, count).filter((entry) => key === 'investment-statements' ? entry.investmentRecorded : entry.coverage?.bank === 'full');
  if (earlier.length < 3) return null;
  const total = earlier.reduce((sum, entry) => sum + ((entry.savings || []).find((item) => item.key === key)?.amount || 0), 0);
  return { amount: roundMoney(total / earlier.length), months: earlier.length };
}
