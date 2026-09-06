import {
  sortedInvestmentStatements,
  supersededInvestmentStatements,
  latestInvestmentStatements,
  investmentValueSeries,
  growthExcludingContributions,
} from '../application/analysis/investments.js';

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
console.log(' INVESTMENTS - one statement per account per month');
console.log('='.repeat(72));

const stmt = (account, periodEnd, printedTotal, file) => ({
  hash: `${account}-${periodEnd}`,
  provider: 'ncb',
  account,
  periodStart: null,
  periodEnd,
  printedTotal,
  fxRates: {},
  classTotals: {},
  cashActivity: [],
  activityPresent: false,
  holdings: [],
  warnings: [],
  source_file: file,
});

const jan = stmt('100001', '2026-01-31', 1000, 'jan.pdf');
const early = stmt('100001', '2026-02-02', 1001, 'mislabelled.pdf');
const feb = stmt('100001', '2026-02-28', 1010, 'feb.pdf');
const mar = stmt('100001', '2026-03-31', 1020, 'mar.pdf');
const other = stmt('200002', '2026-02-15', 500, 'other.pdf');
const all = [mar, early, jan, feb, other];

console.log('\n -- a mid-month snapshot never counts twice --');
const kept = sortedInvestmentStatements(all);
note(kept.length === 4 && !kept.includes(early), 'the earlier statement in the same month is set aside');
note(kept.includes(other), 'a different account in the same month is kept');
note(
  supersededInvestmentStatements(all).length === 1 && supersededInvestmentStatements(all)[0] === early,
  'the set-aside statement can be named'
);
note(latestInvestmentStatements(all).includes(mar), 'the latest statement per account is unchanged');

const series = investmentValueSeries(all, { accountKey: 'ncb|100001' });
const february = series.find((row) => row.month === '2026-02');
note(february && february.total === 1010, 'February shows the month-end total once, not the sum of both');
note(series.filter((row) => row.present).length === 3, 'one point per month');

const runs = growthExcludingContributions(all, { accountKey: 'ncb|100001' });
note(runs.length === 1 && runs[0].brokenBy !== 'gap', 'a same-month duplicate no longer reads as a missing month');

console.log('\n -- a missing month is a gap in the combined line, never a dip --');
const big = ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'].map((d) => stmt('300003', d, 900000, `big-${d}.pdf`));
const small = ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'].map((d) => stmt('400004', d, 10000, `small-${d}.pdf`));
const late = [stmt('500005', '2026-03-31', 50000, 'late-mar.pdf'), stmt('500005', '2026-04-30', 50000, 'late-apr.pdf')];
const holed = [...big.filter((s) => s.periodEnd !== '2026-02-28'), ...small, ...late];
const combined = investmentValueSeries(holed, { accountKey: 'all' });
const hole = combined.find((row) => row.month === '2026-02');
note(hole && !hole.present && hole.total == null, 'a month the largest account skipped draws no combined point');
note(hole && hole.missingAccounts.join(',') === 'ncb|300003', 'the gap names the account whose statement is missing');
const opening = combined.find((row) => row.month === '2026-01');
note(opening.present && opening.partialAccounts && opening.total === 910000, 'a month before an account existed still plots, marked as partial');
note(combined.map((row) => row.month).join(',') === '2026-01,2026-02,2026-03,2026-04', 'rows stay in date order, one per month');
note(combined.filter((row) => row.present).every((row, i, list) => !i || row.total >= list[i - 1].total * 0.5), 'no plotted month falls to a fraction of its neighbours because an account went missing');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
