import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryBudgetForMonth, categoryBudgetHistory, categoryBudgetPastAverage, categoryBudgetRecentMonths } from '../application/analysis/category-budget.js';
import { makeSplit } from '../application/analysis/transaction-splits.js';

const rows = [
  { id: 'purchase-jul', kind: 'spend', month: '2026-07', category: 'Shopping', amount: 100 },
  { id: 'fee-jul', kind: 'fee', month: '2026-07', category: 'Fees', amount: 10 },
  { id: 'purchase-aug', kind: 'spend', month: '2026-08', category: 'Shopping', amount: 80 },
];
const splits = [makeSplit({ txnId: 'purchase-jul', parts: [
  { category: 'Groceries', amount: 60 },
  { category: 'Dining', amount: 40 },
] })];
const intentions = [
  { category: 'Groceries', amount: 50, kind: 'repeating', effectiveFrom: '2026-07' },
  { category: 'Groceries', amount: 80, kind: 'repeating', effectiveFrom: '2026-08' },
];
const options = { rows, splits, intentions, categories: ['Groceries', 'Dining', 'Shopping'] };

test('category budget uses split purchases, separates fees, and keeps dated limits', () => {
  const july = categoryBudgetForMonth({ ...options, month: '2026-07' });
  assert.equal(july.total, 110);
  assert.equal(july.purchaseTotal, 100);
  assert.equal(july.feeTotal, 10);
  assert.deepEqual(july.fees, [{ category: 'Fees', actual: 10 }]);
  assert.deepEqual(july.items.find((item) => item.category === 'Groceries'), { category: 'Groceries', actual: 60, limit: 50 });
  assert.deepEqual(july.items.find((item) => item.category === 'Dining'), { category: 'Dining', actual: 40, limit: null });
  assert.equal(july.items.some((item) => item.category === 'Shopping'), false);

  const august = categoryBudgetForMonth({ ...options, month: '2026-08' });
  assert.equal(august.total, 80);
  assert.deepEqual(august.items.find((item) => item.category === 'Groceries'), { category: 'Groceries', actual: 0, limit: 80 });
  assert.deepEqual(august.items.find((item) => item.category === 'Shopping'), { category: 'Shopping', actual: 80, limit: null });
});

test('category history compares recorded months without inventing missing limits', () => {
  const july = { ...categoryBudgetForMonth({ ...options, month: '2026-07' }), label: 'Jul-26', coverage: 'partial' };
  const august = { ...categoryBudgetForMonth({ ...options, month: '2026-08' }), label: 'Aug-26' };
  const noCard = { ...categoryBudgetForMonth({ ...options, month: '2026-09' }), label: 'Sep-26' };
  assert.deepEqual(categoryBudgetHistory([noCard, august, july], 'Groceries'), [
    { month: '2026-07', label: 'Jul-26', actual: 60, limit: 50, coverage: 'partial' },
    { month: '2026-08', label: 'Aug-26', actual: 0, limit: 80, coverage: 'unknown' },
  ]);
  assert.deepEqual(categoryBudgetHistory([noCard, august, july], 'Shopping'), [
    { month: '2026-07', label: 'Jul-26', actual: 0, limit: null, coverage: 'partial' },
    { month: '2026-08', label: 'Aug-26', actual: 80, limit: null, coverage: 'unknown' },
  ]);
});

test('a card month with no purchases is recorded as zero, not a missing statement', () => {
  const feeOnly = categoryBudgetForMonth({ ...options, rows: [{ id: 'fee-sep', kind: 'fee', month: '2026-09', category: 'Fees', amount: 10 }], month: '2026-09' });
  const paymentOnly = categoryBudgetForMonth({ ...options, rows: [{ id: 'payment-oct', kind: 'payment', month: '2026-10', amount: 25 }], month: '2026-10' });
  assert.equal(feeOnly.hasRecords, true);
  assert.equal(feeOnly.purchaseTotal, 0);
  assert.equal(feeOnly.feeTotal, 10);
  assert.equal(paymentOnly.hasRecords, true);
  assert.equal(paymentOnly.total, 0);
  assert.deepEqual(categoryBudgetHistory([{ ...paymentOnly, label: 'Oct-26' }, { ...feeOnly, label: 'Sep-26' }], 'Groceries'), [
    { month: '2026-09', label: 'Sep-26', actual: 0, limit: 80, coverage: 'unknown' },
    { month: '2026-10', label: 'Oct-26', actual: 0, limit: 80, coverage: 'unknown' },
  ]);
  const statementOnly = categoryBudgetForMonth({ ...options, rows: [], month: '2026-11', statementRecorded: true });
  assert.equal(statementOnly.hasRecords, true);
  assert.equal(statementOnly.total, 0);
  assert.equal(categoryBudgetForMonth({ ...options, rows: [], month: '2026-11' }).hasRecords, false);
});

test('category history keeps an absent calendar month between recorded amounts and zeroes', () => {
  const january = { month: '2026-01', label: 'Jan-26', hasRecords: true, coverage: 'full', items: [{ category: 'Groceries', actual: 40, limit: 50 }] };
  const february = { month: '2026-02', label: 'Feb-26', hasRecords: false, coverage: 'missing', items: [] };
  const march = { month: '2026-03', label: 'Mar-26', hasRecords: true, coverage: 'full', items: [{ category: 'Groceries', actual: 0, limit: 50 }] };
  assert.deepEqual(categoryBudgetRecentMonths([march, february, january]).map((entry) => [entry.month, entry.hasRecords]), [
    ['2026-01', true], ['2026-02', false], ['2026-03', true],
  ]);
  assert.deepEqual(categoryBudgetHistory([march, february, january], 'Groceries'), [
    { month: '2026-01', label: 'Jan-26', actual: 40, limit: 50, coverage: 'full' },
    { month: '2026-02', label: 'Feb-26', actual: null, limit: null, coverage: 'missing' },
    { month: '2026-03', label: 'Mar-26', actual: 0, limit: 50, coverage: 'full' },
  ]);
});

test('past category average uses earlier full card months, including recorded zeroes', () => {
  const months = [
    { month: '2026-09', hasRecords: true, coverage: 'full', items: [{ category: 'Shopping', actual: 999 }] },
    { month: '2026-08', hasRecords: true, coverage: 'full', items: [{ category: 'Shopping', actual: 80 }] },
    { month: '2026-07', hasRecords: true, coverage: 'full', items: [{ category: 'Shopping', actual: 20 }] },
    { month: '2026-06', hasRecords: true, coverage: 'full', items: [] },
    { month: '2026-05', hasRecords: true, coverage: 'partial', items: [{ category: 'Shopping', actual: 100 }] },
    { month: '2026-04', hasRecords: true, coverage: 'full', items: [{ category: 'Shopping', actual: 40 }] },
    { month: '2026-03', hasRecords: true, coverage: 'full', items: [{ category: 'Shopping', actual: 60 }] },
    { month: '2026-02', hasRecords: true, coverage: 'full', items: [] },
    { month: '2026-01', hasRecords: false, coverage: 'full', items: [{ category: 'Shopping', actual: 300 }] },
  ];
  assert.deepEqual(categoryBudgetPastAverage(months, '2026-08', 'Shopping'), { amount: 24, months: 5 });
  assert.equal(categoryBudgetPastAverage(months.slice().reverse(), '2026-08', 'Shopping', 3), null);
  assert.deepEqual(categoryBudgetPastAverage(months, '2026-08', 'Other'), { amount: 0, months: 5 });
  assert.equal(categoryBudgetPastAverage(months, '2026-04', 'Shopping'), null);
});
