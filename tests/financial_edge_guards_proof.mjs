import * as categoryIntentions from '../application/analysis/category-intentions.js';
import { expectedIncome, resolveOpts } from '../application/analysis/commitment-income.js';
import { snapshotScorable } from '../application/analysis/forecast-accuracy.js';
import { goalProgress } from '../application/analysis/goals.js';

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
console.log(' FINANCIAL EDGE GUARDS - credits, dates, maturity and income');
console.log('='.repeat(72));

console.log('\n -- a card credit is not debt --');
const credit = goalProgress(
  { type: 'clear-card', targetDate: '2026-12-31' },
  { asOf: '2026-09-18', cardBalance: -5000 }
);
note(credit.current === 0, 'a credit balance produces zero owed');
note(credit.met === true, 'a card in credit satisfies a clear-card goal');

console.log('\n -- spending pace uses the local calendar day --');
const lateEvening = {
  getFullYear: () => 2026,
  getMonth: () => 8,
  getDate: () => 15,
  getUTCDate: () => 16,
  toISOString: () => '2026-09-16T04:30:00.000Z',
};
note(
  typeof categoryIntentions.asOfDayForMonth === 'function' &&
    categoryIntentions.asOfDayForMonth('2026-09', lateEvening) === 15,
  'late evening remains day 15 locally instead of advancing to UTC day 16'
);

console.log('\n -- forecast maturity requires a ledger end date --');
const noLedger = snapshotScorable(
  { horizonEnd: '2026-08-31' },
  '2026-09-18',
  null
);
note(!noLedger.ok && noLedger.reason === 'ledger-missing', 'no ledger coverage cannot be called matured');

console.log('\n -- excluded deposits never become expected income --');
const opts = resolveOpts({
  ahead: { minMonths: 3, tolerance: 0.15, maxGapMonths: 2 },
  insights: { meaningfulChangeMin: 1 },
  currency: { code: 'JMD' },
});
const incomeRow = (date, amount, extra = {}) => ({
  date,
  amount,
  direction: 'in',
  currency: 'JMD',
  counterpartyKey: 'income:test',
  ...extra,
});
const excluded = [
  incomeRow('2026-06-15', 100000, { excludedFromIncome: true }),
  incomeRow('2026-07-15', 100000, { excludedFromIncome: true }),
  incomeRow('2026-08-15', 100000, { refund: true }),
];
note(expectedIncome(excluded, opts, '2026-08-31') === null, 'excluded deposits and refunds do not create a payday');

console.log('\n -- split deposits are forecast at their monthly total --');
const splitIncome = [
  incomeRow('2026-06-14', 50000),
  incomeRow('2026-06-15', 50000),
  incomeRow('2026-07-14', 50000),
  incomeRow('2026-07-15', 50000),
  incomeRow('2026-08-14', 50000),
  incomeRow('2026-08-15', 50000),
];
const splitExpected = expectedIncome(splitIncome, opts, '2026-08-31');
note(splitExpected && splitExpected.amount === 100000, 'two 50,000 deposits are expected as 100,000 for the month');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
