import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryContributions } from '../application/analysis/category-contributions.js';
import { categoryBudgetForMonth, categoryBudgetPastAverage } from '../application/analysis/category-budget.js';
import { scenarioMonthlyItems, computeScenario } from '../application/analysis/reporting-insights.js';
import { coverageTimeline } from '../application/analysis/coverage-map.js';
import { typicalMonthlyOutflowBasis } from '../application/analysis/reporting-periods.js';

const cfg = {
  currency: { code: 'JMD' },
  special: { fallback: 'Uncategorised', paymentCategory: 'Card Payment', refundCategory: 'Refund', feeCategories: ['Fees'] },
  bankMovementKinds: { setAsideRules: [{ match: 'SAVINGS', label: 'Saving' }] },
};

test('bank and card categories reconcile without repayments, transfers, or savings moves', () => {
  const cardRows = [
    { id: 'card-1', date: '2026-08-03', kind: 'spend', category: 'Groceries', amount: 100 },
    { id: 'card-2', date: '2026-08-05', kind: 'fee', category: 'Fees', amount: 5 },
    { id: 'card-3', date: '2026-08-06', kind: 'refund', category: 'Groceries', categoryOverride: 'Groceries', amount: -10 },
    { id: 'card-4', date: '2026-08-07', kind: 'refund', category: 'Refund', amount: -7 },
  ];
  const bankRows = [
    { id: 'bank-1', date: '2026-08-08', direction: 'out', currency: 'JMD', category: 'Groceries', amount: 30, description: 'Shop' },
    { id: 'bank-2', date: '2026-08-09', direction: 'out', currency: 'JMD', category: 'Travel', amount: 20, description: 'Transit' },
    { id: 'bank-3', date: '2026-08-10', direction: 'out', currency: 'JMD', category: 'Card Payment', amount: 60, description: 'CARD 00001234' },
    { id: 'bank-4', date: '2026-08-11', direction: 'out', currency: 'JMD', category: 'Travel', amount: 50, internalTransfer: true, description: 'Own account' },
    { id: 'bank-5', date: '2026-08-12', direction: 'out', currency: 'JMD', category: 'Investments', amount: 70, description: 'Savings' },
    { id: 'bank-6', date: '2026-08-13', direction: 'out', currency: 'JMD', category: 'Groceries', amount: 80, household: true, description: 'Household' },
  ];
  const result = categoryContributions({
    cardRows,
    bankRows,
    cfg,
    cardAccounts: ['00001234'],
    splits: [{ txnId: 'card-1', parts: [{ category: 'Groceries', amount: 60 }, { category: 'Travel', amount: 40 }] }],
    from: '2026-08-01',
    to: '2026-08-31',
  });
  assert.equal(result.byCategory.get('Groceries'), 80);
  assert.equal(result.byCategory.get('Travel'), 60);
  assert.equal(result.total, 140);
  assert.equal(result.feeTotal, 5);
  assert.equal(result.refundTotal, -7);
  assert.equal(result.purchases.filter((part) => part.id === 'card-1').length, 2);
  assert.equal(result.purchases.filter((part) => part.ledger === 'bank').length, 2);
  assert.equal(categoryContributions({ cardRows, bankRows, cfg, cardAccounts: ['00001234'], source: 'card' }).total, 90);
  assert.equal(categoryContributions({ cardRows, bankRows, cfg, cardAccounts: ['00001234'], source: 'bank' }).total, 50);
});

test('category months distinguish missing, partial, and recorded zero', () => {
  const bankRows = [{ id: 'fee-only', date: '2026-04-06', direction: 'out', amount: 5, currency: 'JMD', category: 'Fees' }];
  const april = categoryBudgetForMonth({ month: '2026-04', bankRows, cfg, bankStatementRecorded: true });
  const may = categoryBudgetForMonth({ month: '2026-05', bankRows, cfg });
  assert.equal(april.hasRecords, true);
  assert.equal(april.purchaseTotal, 0);
  assert.equal(may.hasRecords, false);
  const coverage = coverageTimeline({ bankMonths: ['2026-04', '2026-06'], cardMonths: ['2026-04'], ledgers: ['bank', 'card'], coverage: { months: { '2026-04': { bank: 'partial', card: 'full' }, '2026-06': { bank: 'full' } } } });
  assert.deepEqual(coverage.months.map((entry) => [entry.bank, entry.card]), [['partial', 'full'], ['missing', 'outside'], ['full', 'outside']]);
});

test('past average only uses fully covered months within the previous six', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map((month, index) => ({ month, hasRecords: index !== 4, coverage: { bank: index === 4 ? 'missing' : index === 5 ? 'partial' : 'full', card: 'outside' }, items: index === 2 ? [] : [{ category: 'Groceries', actual: 10 }] }));
  assert.deepEqual(categoryBudgetPastAverage(months, '2026-07', 'Groceries'), { amount: 7.5, months: 4 });
  assert.equal(categoryBudgetPastAverage(months, '2026-07', 'Groceries', 3), null);
});

test('scenario levers use the cash baseline months and cannot remove more than its monthly outflow', () => {
  const months = ['2026-06', '2026-07', '2026-08'];
  const bankRows = months.flatMap((month) => [
    { id: `bank-${month}`, date: `${month}-06`, direction: 'out', amount: 50, currency: 'JMD', category: 'Groceries' },
    { id: `fixed-${month}`, date: `${month}-07`, direction: 'out', amount: 20, currency: 'JMD', category: 'Insurance' },
  ]);
  const cardRows = months.map((month) => ({ id: `card-${month}`, date: `${month}-08`, kind: 'spend', category: 'Groceries', amount: 30 }));
  const items = scenarioMonthlyItems({ cardRows, bankRows, cfg: { ...cfg, planBands: { seed: { fixed: ['Insurance'] } } }, monthlyBasis: { months, amount: 100, observedTotal: 300 } });
  assert.deepEqual(items.map((item) => [item.label, item.amount]), [['Groceries', 80]]);
  const changed = computeScenario({ cashPosition: 300, monthlyOutflow: 100, toggleableItems: items, reductions: new Map([[items[0].key, 1]]) });
  assert.equal(changed.monthlySaved, 80);
  assert.equal(changed.scenarioOutflow, 20);
  assert.equal(computeScenario({ cashPosition: 300, monthlyOutflow: 100, toggleableItems: [{ key: 'all', amount: 200 }], reductions: new Map([['all', 1]]) }).scenarioState, 'zero-outflow');
  assert.equal(computeScenario({ cashPosition: 50, monthlyOutflow: 100, extraCost: 60 }).scenarioState, 'cash-exhausted');
  const zeroBasis = typicalMonthlyOutflowBasis([{ month: '2026-06', spending: 0 }, { month: '2026-07', spending: 0 }], '2026-08');
  assert.equal(zeroBasis.amount, 0);
  assert.deepEqual(zeroBasis.months, ['2026-06', '2026-07']);
  assert.equal(computeScenario({ cashPosition: 50, monthlyOutflow: 0, historyKnown: true }).scenarioState, 'zero-outflow');
  assert.equal(computeScenario({ cashPosition: 50, monthlyOutflow: 0, historyKnown: false }).scenarioState, 'missing-history');
});
