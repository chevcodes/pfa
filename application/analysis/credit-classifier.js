import { isCountedBankIncome } from '../core/shared-helpers.js';
import { answerFor, transferSubjects } from './confirmations.js';
import { categoryMeta, resolveCategoryName } from './category-flow.js';

const tokenPattern = (token) => new RegExp(
  `(?<![\\p{L}\\p{N}])${String(token).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`,
  'iu'
);

const sourcesFor = (row, field) => field === 'type'
  ? [['type', row.type]]
  : [['raw_description', row.raw_description], ['description', row.description]];

export function matchingIncomeRule(row, rule) {
  if (!rule || !['type', 'description'].includes(rule.field)) return null;
  const all = [...sourcesFor(row, 'type'), ...sourcesFor(row, 'description')];
  if ((rule.exclude || []).some((token) => all.some(([, value]) => tokenPattern(token).test(String(value || ''))))) return null;
  for (const [source, value] of sourcesFor(row, rule.field)) {
    const text = String(value || '');
    for (const token of rule.prefix || []) {
      const match = tokenPattern(token).exec(text);
      if (match && match.index < 7) return { field: rule.field, source, token, match: 'prefix' };
    }
    for (const token of rule.words || []) {
      if (tokenPattern(token).test(text)) return { field: rule.field, source, token, match: 'word' };
    }
  }
  return null;
}

export function classifyCredit(row, context = {}) {
  if (row?.direction !== 'in') throw new TypeError('Credit classification requires an incoming bank row');
  const cfg = context.cfg || {};
  const role = (name) => {
    const entry = (cfg.categories || []).find((category) => category.structuralRole === name);
    if (!entry) throw new TypeError(`Missing income category role: ${name}`);
    return entry.name;
  };
  const counted = isCountedBankIncome(row);
  const result = (name, basis, evidence) => {
    const category = resolveCategoryName(cfg, name);
    const meta = categoryMeta(cfg, category);
    const incomeClass = meta?.incomeClass || (counted ? 'income' : row.internalTransfer ? 'transfer' : row.refund ? 'returned' : 'pending');
    return { category, incomeClass, basis, evidence };
  };
  if (row.categoryOverride) return result(row.categoryOverride, 'person', { kind: 'override' });
  const personalCategory = context.personalCategory;
  if (personalCategory) return result(personalCategory, 'person', { kind: 'rule' });
  const confirmations = context.confirmations || [];
  const transfer = answerFor(confirmations, 'transfer', transferSubjects(row));
  const refund = answerFor(confirmations, 'refund', [row.id]);
  const income = answerFor(confirmations, 'income', [row.id]);
  if (transfer === true) return result(role('internalTransfer'), 'person', { kind: 'confirmation', inference: 'transfer' });
  if (refund === false) return result(role('refund'), 'person', { kind: 'confirmation', inference: 'refund' });
  if (income === true || refund === true) return result(role('defaultIncome'), 'person', { kind: 'confirmation', inference: income === true ? 'income' : 'refund' });
  if (income === false) return result(role('cashDeposit'), 'person', { kind: 'confirmation', inference: 'income' });
  if (row.internalTransfer) return result(role('internalTransfer'), 'structural', { kind: 'internalTransfer' });
  if (row.refund) return result(role('refund'), 'structural', { kind: 'refund' });
  if (row.excludedFromIncome) return result(role('cashDeposit'), 'structural', { kind: 'cashDeposit' });
  if (row.cashDeposit) return result(role('defaultIncome'), 'structural', { kind: 'confirmedCashDeposit' });
  for (const rule of cfg.incomeRules || []) {
    if (!rule.active) continue;
    const meta = categoryMeta(cfg, rule.category);
    if (!meta || meta.flow !== 'in' || meta.inIncomeTotal !== counted) continue;
    const evidence = matchingIncomeRule(row, rule);
    if (evidence) return result(rule.category, 'wording', evidence);
  }
  return result(role('defaultIncome'), 'default', { kind: 'externalCredit' });
}

export function effectiveCreditIncomeTotal(row, classification, cfg) {
  const declared = categoryMeta(cfg, classification.category);
  return classification.basis === 'person' && declared?.inIncomeTotal !== isCountedBankIncome(row)
    ? isCountedBankIncome(row)
    : declared?.inIncomeTotal ?? isCountedBankIncome(row);
}

export function creditCategoryExplanation(classification) {
  if (!classification) return '';
  const { category, basis, evidence } = classification;
  if (basis === 'wording') return `${category}: the ${evidence.field} says ${String(evidence.token).toLowerCase()}`;
  if (basis === 'person') return `${category}: ${evidence.kind === 'confirmation' ? 'you answered' : 'you chose this'}`;
  if (evidence.kind === 'internalTransfer') return `${category}: between your own accounts`;
  if (evidence.kind === 'refund') return `${category}: returned money`;
  if (evidence.kind === 'cashDeposit') return `${category}: waiting for your answer`;
  if (evidence.kind === 'confirmedCashDeposit') return `${category}: you confirmed this deposit`;
  return `${category}: a deposit from another party`;
}
