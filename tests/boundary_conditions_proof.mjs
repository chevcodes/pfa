import { buildAvailableNowModel } from '../application/analysis/available-now.js';
import { cardLegBeforeIncome } from '../application/analysis/commitment-income.js';
import { coverageTimeline } from '../application/analysis/coverage-map.js';
import { monthIndex } from '../application/core/shared-helpers.js';
import { fillMonthRange, incomeChartModel } from '../application/ui/income-chart-render.js';

let pass = 0;
let fail = 0;
const note = (condition, label) => {
  if (condition) pass++;
  else {
    fail++;
    console.log('   FAIL', label);
  }
};

console.log('='.repeat(72));
console.log(' BOUNDARY CONDITIONS - invalid months, exact coverage, zero card due');
console.log('='.repeat(72));

console.log('\n -- invalid calendar months stay invalid --');
note(Number.isNaN(monthIndex('2026-00')), 'month zero is rejected');
note(Number.isNaN(monthIndex('2026-13')), 'month thirteen is rejected');
note(
  coverageTimeline({ bankMonths: ['2026-13'], ledgers: ['bank'] }).months.length === 0,
  'an invalid statement month is not silently moved into another year'
);
note(fillMonthRange('2026-13', '2027-02').length === 0, 'an invalid chart month produces no invented range');
note(
  incomeChartModel({
    typicalAmount: 100,
    series: [
      { month: '2026-13', amount: 100 },
      { month: '2027-01', amount: 100 },
    ],
  }) === null,
  'an invalid income month is not plotted as a real month'
);

console.log('\n -- using the exact available amount is not called a shortfall --');
const exact = buildAvailableNowModel({
  asOf: '2026-09-18',
  income: { amount: 300000, date: '2026-09-25', confidence: 'high' },
  card: { amountExpectedBeforeNextIncome: 0, basis: 'due-after-income', dueDate: '2026-10-01' },
  commitments: [{ key: 'fixed', amount: 100000, date: '2026-09-20', basis: 'recurring' }],
  layers: {
    availableBalance: 100000,
    commitmentsBeforeIncome: 100000,
    estimatedAvailableAfterCommitments: 0,
  },
  confidence: 'complete',
  gaps: [],
});
note(/fixed expenses are covered/.test(exact.verdict.text), 'an exact fit is described as covered');
note(!/exceed/.test(exact.verdict.text), 'an exact fit is not described as exceeded');

console.log('\n -- a zero card amount does not become a payment --');
const zeroDue = cardLegBeforeIncome(
  [{ periodEnd: '2026-09-01', amountDue: 0, newBalance: 25000, dueDate: '2026-09-20' }],
  {},
  '2026-09-18',
  '2026-09-25'
);
note(zeroDue.basis === 'nothing-due', 'zero due is represented as no payment due');
note(zeroDue.amount === 0 && zeroDue.stale === false, 'zero due is complete data, not a stale card leg');
const zeroModel = buildAvailableNowModel({
  asOf: '2026-09-18',
  income: { amount: 300000, date: '2026-09-25', confidence: 'high' },
  card: { amountExpectedBeforeNextIncome: zeroDue.amount, basis: zeroDue.basis, dueDate: zeroDue.dueDate },
  commitments: [],
  layers: {
    availableBalance: 100000,
    commitmentsBeforeIncome: 0,
    estimatedAvailableAfterCommitments: 100000,
  },
  confidence: 'complete',
  gaps: [],
});
note(zeroModel.card.tag === 'nothing due before payday', 'the card view says nothing is due');
note(!/About .* is due/.test(zeroModel.card.detail), 'the card view does not invent a zero payment');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
