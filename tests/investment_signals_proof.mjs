import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  investmentSnapshot,
  investmentContributionsByMonth,
  investmentValueSeries,
  growthExcludingContributions,
  investmentNetWorthItems,
  verifyAverageCost,
  monthMove,
  statementContributions,
  statementIntegrity,
  isStableValue,
  investmentAccountKey,
  latestValueMovement,
  movementTone,
} from '../application/analysis/investments.js';
import { recordedNetWorth, financialPositionSummary, buildNetWorthModel } from '../application/analysis/position.js';
import { setAsideMonthly, setAsidePlan, withDesignations } from '../application/analysis/set-aside.js';
import { buildPlan } from '../application/analysis/plan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'settings', 'config.json'), 'utf8'));
const KINDS = CONFIG.bankMovementKinds;

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
console.log(' INVESTMENT SIGNALS - money added is never mistaken for money made');
console.log('='.repeat(72));

const r2 = (n) => Math.round(n * 100) / 100;
const equity = (name, quantity, costTotal, price, lastMonthValue, statedChangePct) => ({
  key: `equity||${name}`,
  kind: 'equity',
  subAccount: '',
  description: `${name} LIMITED ORDINARY SHARES`,
  currency: 'JMD',
  quantity,
  avgCostRaw: costTotal,
  price,
  value: r2(quantity * price),
  valueBase: r2(quantity * price),
  lastMonthValue,
  statedChangePct,
});
const fund = (name, units, unitCost, nav, lastMonthValue, statedChangePct, currency = 'JMD') => ({
  key: `fund|55555|${name}`,
  kind: 'fund',
  subAccount: '55555',
  description: `Example ${name} Fund A`,
  currency,
  quantity: units,
  avgCostRaw: unitCost,
  price: nav,
  value: r2(units * nav),
  valueBase: null,
  lastMonthValue,
  statedChangePct,
});
const cash = (name, value) => ({
  key: `cash|${name}|${name}`,
  kind: 'cash',
  subAccount: name,
  description: name,
  currency: 'JMD',
  quantity: null,
  avgCostRaw: null,
  price: null,
  value,
  valueBase: value,
  lastMonthValue: null,
  statedChangePct: null,
});
function statement(periodEnd, holdings, opts = {}) {
  const rate = opts.rate || 150;
  let total = 0;
  for (const h of holdings) total += h.valueBase != null ? h.valueBase : h.currency === 'JMD' ? h.value : h.value * rate;
  const pages = opts.activity ? 3 : 2;
  return {
    hash: `${opts.account || 'A-0001'}-${periodEnd}`,
    account: opts.account || 'A-0001',
    periodStart: `${periodEnd.slice(0, 8)}01`,
    periodEnd,
    printedTotal: r2(total + (opts.totalOffset || 0)),
    fxRates: { USD: rate },
    classTotals: [],
    pagesDeclared: pages,
    pagesSeen: opts.pagesSeen || Array.from({ length: pages }, (_, i) => i + 1),
    activityPresent: !!opts.activity,
    cashActivitySection: !!opts.activity,
    cashActivity: opts.activity || [],
    holdings,
    warnings: [],
  };
}

const marchHoldings = [
  cash('TRUST', 1),
  equity('ALPHA', 1000, 12000, 10, 10500, -4.76),
  equity('BETA', 500, 10000, 18, 9200, -2.17),
  fund('MONEY', 3000, 100, 100, 300000, 0),
  fund('INCOME', 2000, 50, 55, 109500, 0.46),
  fund('DOLLAR', 100, 10, 10.2, 1015, 0.49, 'USD'),
];
const march = statement('2026-03-31', marchHoldings);
const deposit = { date: '2026-04-03', type: 'D', amount: 200000, currency: 'JMD', cashAccount: 'SETTLEMENT A/C' };
const withdrawal = { date: '2026-04-20', type: 'W', amount: 112030, currency: 'JMD', cashAccount: 'SETTLEMENT A/C' };
const aprilHoldings = [
  cash('TRUST', 1),
  cash('SETTLEMENT', 50000),
  equity('ALPHA', 2000, 21000, 9.2, 10000, 84),
  equity('BETA', 500, 10000, 17, 9000, -5.56),
  equity('GAMMA', 300, 3030, 10, 3000, 0),
  fund('MONEY', 4000, 100, 100, 300000, 33.33),
  fund('INCOME', 2010, 50.03, 55.5, 110000, 1.41),
  fund('DOLLAR', 100, 10, 10.3, 1020, 0.98, 'USD'),
];
const april = statement('2026-04-30', aprilHoldings, { rate: 151, activity: [deposit, withdrawal] });

console.log('\n -- the headline signal is cost-based, even in a month of heavy buying --');
const snap = investmentSnapshot([april, march], { baseCurrency: 'JMD' });
const acct = snap.accounts[0];
const h = (name) => acct.holdings.find((x) => x.key.includes(name));
note(h('ALPHA').statedChangePct === 84 && h('ALPHA').costReturn < 0, 'a holding that "jumped" 84% on value is still down on what it cost');
note(Math.abs(h('ALPHA').costReturn - (9.2 - 10.5) / 10.5) < 1e-9, 'equity cost per share is total cost divided by quantity');
note(h('ALPHA').costConfirmed, 'the blended cost after buying more is confirmed as a true weighted average');
note(h('ALPHA').move.state === 'bought', "that month's printed change is flagged, not shown as performance");
note(h('BETA').move.state === 'clean' && h('BETA').move.pct === -5.56, 'a holding left alone shows its clean month move');
note(h('INCOME').move.state === 'clean', 'a small reinvested distribution is return, not a purchase');
note(h('MONEY').move.state === 'bought', 'a large fund top-up is flagged');
note(acct.contribution.known && acct.contribution.amount === 200000, 'the contribution is read separately');

console.log('\n -- instrument-aware roles --');
note(h('MONEY').role === 'stable' && h('MONEY').costReturn === null, 'a fund pinned at its cost carries no triangle');
note(h('SETTLEMENT').role === 'cash' && h('SETTLEMENT').costReturn === null, 'parked cash is in the pile but out of performance');
note(acct.cashParked === 50001, 'parked cash is reported on its own');
note(h('GAMMA').role === 'new', 'a holding absent last month is new, not flat');
note(h('BETA').role === 'performing' && h('INCOME').role === 'performing', 'everything else carries a signal');
note(h('DOLLAR').currency === 'USD' && h('DOLLAR').rate === 151, "a USD holding stays native with its statement's rate");
note(!isStableValue(fund('X', 10, 100, 100.5, 0, 0)), 'a fund whose price has moved off its cost is not stable');
note(
  !isStableValue(fund('Y', 10, 101, 101, 0, 0), [fund('Y', 10, 101, 100, 0, 0)]),
  'a fund whose price has ever moved is not stable'
);

console.log('\n -- with only one statement loaded --');
const alone = investmentSnapshot([april], { baseCurrency: 'JMD' }).accounts[0];
const a = (name) => alone.holdings.find((x) => x.key.includes(name));
note(a('GAMMA').role === 'new', 'a fresh position is recognised from how the statement prints it');
note(a('BETA').move.state === 'uncertain', 'month moves in a contribution month are held back when last month is unknown');
const quietAlone = investmentSnapshot(
  [statement('2026-04-30', [equity('IDLE', 100, 1000, 9, 900, 0)])],
  { baseCurrency: 'JMD' }
).accounts[0];
note(quietAlone.holdings[0].role === 'performing', 'a stock that simply did not trade is not mistaken for a new position');
note(quietAlone.holdings[0].move.state === 'clean', 'and its move is clean in a quiet month');

console.log('\n -- the average cost is checked before it is trusted --');
const stale = investmentSnapshot(
  [march, statement('2026-04-30', aprilHoldings.map((x) => (x.key.includes('ALPHA') ? equity('ALPHA', 2000, 12000, 9.2, 10000, 84) : x)), { rate: 151, activity: [deposit, withdrawal] })],
  { baseCurrency: 'JMD' }
).accounts[0];
note(!stale.holdings.find((x) => x.key.includes('ALPHA')).costConfirmed, 'a cost that did not move when shares were bought is not trusted');
note(verifyAverageCost(equity('ALPHA', 500, 6000, 10, 0, 0), equity('ALPHA', 1000, 12000, 10, 0, 0)).ok, 'a sale keeps the cost per share');
note(!verifyAverageCost(equity('ALPHA', 500, 12000, 10, 0, 0), equity('ALPHA', 1000, 12000, 10, 0, 0)).ok, 'a sale that changes the cost per share fails');
note(!verifyAverageCost({ ...equity('ALPHA', 1000, 12000, 10, 0, 0), value: 11000 }, null).ok, 'a row whose value does not match quantity times price fails');
note(
  monthMove(fund('INCOME', 1000, 50, 55, 110000, -50), {
    prev: march,
    consecutive: true,
    prevH: fund('INCOME', 2000, 50, 55, 0, 0),
    role: 'performing',
  }).state === 'sold',
  'a large fund redemption is flagged as well'
);

console.log('\n -- the printed total is the headline; the sum only checks it --');
const offset = statement('2026-04-30', aprilHoldings, { rate: 151, activity: [deposit, withdrawal], totalOffset: 500 });
const offsetSnap = investmentSnapshot([march, offset], { baseCurrency: 'JMD' });
note(offsetSnap.accounts[0].headlineTotal === offset.printedTotal, 'the printed total is shown even when the holdings disagree');
note(!offsetSnap.accounts[0].integrity.crossCheckOk && offsetSnap.accounts[0].integrity.crossCheckGap === -500, 'and the disagreement is flagged');
note(statementIntegrity(april, 'JMD').crossCheckOk, 'a statement that adds up passes');
note(snap.combinedTotal === april.printedTotal, 'the pile is the printed total of the latest statement');

console.log('\n -- a missing page makes the contribution unknown, never zero --');
const partial = statement('2026-04-30', aprilHoldings, { rate: 151, activity: [deposit], pagesSeen: [1, 2] });
note(!statementContributions(partial).known, 'a declared page that was not read leaves the contribution unknown');
note(!investmentContributionsByMonth([march, partial]).get('2026-04').known, 'the monthly figure says unknown too');
note(!investmentSnapshot([march, partial]).accounts[0].contribution.known, 'and so does the snapshot');
note(
  !statementContributions({ ...april, cashActivity: [] }).known,
  'an activity page whose cash rows could not be read is unknown'
);
note(statementContributions(march).known && Object.keys(statementContributions(march).byCurrency).length === 0, 'a genuine two-page month is a known zero');

console.log('\n -- a holding that vanishes is an event --');
const mayHoldings = aprilHoldings.filter((x) => !x.key.includes('BETA'));
const may = statement('2026-05-31', mayHoldings, { rate: 151 });
const maySnap = investmentSnapshot([march, april, may], { baseCurrency: 'JMD' }).accounts[0];
note(maySnap.disappeared.length === 1 && maySnap.disappeared[0].key.includes('BETA'), 'a holding missing from the newest statement is reported');
note(investmentSnapshot([march, april]).accounts[0].disappeared.length === 0, 'nothing is reported when nothing left');

console.log('\n -- growth excluding contributions, with currency kept apart --');
const growth = growthExcludingContributions([march, april], { baseCurrency: 'JMD' })[0];
const fxEffect = 1020 * (151 - 150);
note(growth.added === 200000, 'the money added is taken out');
note(Math.abs(growth.fxEffect - fxEffect) < 0.01, 'exchange-rate movement on USD holdings is measured separately');
note(Math.abs(growth.growth - r2(april.printedTotal - march.printedTotal - 200000 - fxEffect)) < 0.01, 'what is left is what the investments did');
const chain = growthExcludingContributions([march, april, may], { baseCurrency: 'JMD' })[0];
note(chain.months === 2 && chain.from === '2026-03-31' && !chain.brokenBy, 'consecutive statements chain together');
const june = statement('2026-06-30', mayHoldings, { rate: 151 });
const gap = growthExcludingContributions([march, april, june], { baseCurrency: 'JMD' })[0];
note(gap.months === 0 && gap.brokenBy === 'gap', 'a missing month breaks the chain instead of being bridged');
const unknown = growthExcludingContributions([march, partial], { baseCurrency: 'JMD' })[0];
note(unknown.months === 0 && unknown.brokenBy === 'contribution', 'an unknown contribution breaks the chain too');

console.log('\n -- history --');
const series = investmentValueSeries([march, june], { baseCurrency: 'JMD' });
note(series.length === 4 && series.filter((row) => row.present).length === 2, 'months without a statement are gaps, not zeros');
const withAdded = investmentValueSeries([march, april]);
note(withAdded[1].contribution === 200000 && withAdded[1].contributionKnown, 'contributions ride along as markers');
const other = statement('2026-03-31', [cash('OTHER', 5000)], { account: 'B-0002' });
const byMonth = investmentContributionsByMonth([march, april, other]);
note(byMonth.get('2026-03').known && !byMonth.get('2026-04').known, 'a month is only known when every account has a statement for it');
const items = investmentNetWorthItems([march, april, other]);
note(items.length === 2 && items[0].label !== items[1].label, 'two investment accounts are labelled apart');

console.log('\n -- the card leads with the whole pile, drawn in proportion --');
const moved = latestValueMovement([march, april], { baseCurrency: 'JMD' });
note(moved && moved.from === '2026-03' && moved.to === '2026-04', 'the headline compares the two latest statement months');
note(moved && moved.change === r2(april.printedTotal - march.printedTotal), 'it is the movement of every holding and the cash together, the step the value chart draws');
note(moved && moved.added === 200000, 'money added in that month rides along, so a deposit is never read as a gain');
note(latestValueMovement([march], { baseCurrency: 'JMD' }) === null, 'one statement has nothing to compare, so the card falls back to the cost read');
note(latestValueMovement([march, june], { baseCurrency: 'JMD' }) === null, 'a missing month is not bridged');
note(latestValueMovement([march, april, other], { baseCurrency: 'JMD' }) === null, 'a month that covers only some accounts is not compared with one that covers all');
note(movementTone(-0.013) === 'neutral' && movementTone(-0.02) === 'neutral', 'a fall of a couple of percent is drawn as calmly as a rise');
note(movementTone(0.4) === 'neutral', 'a rise is never celebrated');
note(movementTone(-0.1) === 'watch' && movementTone(-0.2) === 'alert', 'only a correction-sized fall (10%) or a bear-market-sized one (20%) carries weight');
note(movementTone(null) === 'neutral' && movementTone(NaN) === 'neutral', 'a missing share never raises the tone');
const chainRun = growthExcludingContributions([march, april, may], { baseCurrency: 'JMD' })[0];
note(chainRun.fromTotal === march.printedTotal, 'a growth run carries the value it started from, so its size can be read in proportion');
const investmentsUi = readFileSync(join(__dirname, '..', 'application', 'ui', 'investments-render.js'), 'utf8');
note(
  /if \(movement\) signals\.append\(movementRead\(movement, prose\)\);\s*\n\s*signals\.append\(performanceRead\(snap\)\);/.test(investmentsUi),
  'both readings of the movement sit in one row, last month first and cost always present'
);
note(
  !/performanceRead\(snap\)/.test(investmentsUi.split('function holdingsDetail')[1] || ''),
  'the cost read is not drawn a second time below the chart'
);
note(!/is-\$\{direction\}|is-up|is-down/.test(investmentsUi), 'no investment signal picks its colour from direction alone');
const investmentCss = readFileSync(join(__dirname, '..', 'interface', 'feature-additions.css'), 'utf8');
note(!/\.inv-(signal|growth-figure)\.is-(up|down)/.test(investmentCss) && !/\.inv-(signal|growth-figure)[^{]*\{[^}]*good-ink/.test(investmentCss), 'no investment figure is painted as a win or a loss by direction');

console.log('\n -- two providers share one sliceable investment model --');
const sharedScotia = equity('SAMPLE GROUP LIMITED', 20, 100, 12, 220, 9.09);
const sharedNcb = {
  ...equity('SAMPLE GROUP LTD.', 20, 300, 12, null, null),
  provider: 'ncb',
  costBasisType: 'total',
  unrealisedGainLoss: -60,
  provenance: { unrealisedGainLoss: 'statement' },
};
const ncbMarch = {
  ...statement('2026-03-31', [sharedNcb], { account: 'N-0002' }),
  provider: 'ncb',
  pagesDeclared: 1,
  pagesSeen: [1],
};
const scotiaAugust = statement('2026-08-31', [sharedScotia], { account: 'S-0001' });
const ncbAugust = {
  ...statement('2026-08-31', [sharedNcb], { account: 'N-0002' }),
  provider: 'ncb',
  pagesDeclared: 1,
  pagesSeen: [1],
};
const scotiaSeptember = statement('2026-09-30', [sharedScotia], { account: 'S-0001' });
const ncbSeptember = {
  ...statement('2026-09-30', [sharedNcb], { account: 'N-0002' }),
  provider: 'ncb',
  pagesDeclared: 1,
  pagesSeen: [1],
};
const twoProviders = [ncbMarch, scotiaAugust, ncbAugust, scotiaSeptember, ncbSeptember];
const both = investmentSnapshot(twoProviders);
note(both.accounts.length === 2 && both.combinedTotal === 480, 'Both adds the two latest printed totals');
note(both.holdings.length === 1 && both.holdings[0].merged, 'the same security merges into one row in Both');
note(Math.abs(both.holdings[0].costReturn - 0.2) < 1e-9, 'the merged row uses one honest weighted cost result');
note(both.performance.mixedAccounts, 'the model exposes that the provider accounts move in different cost directions');
const ncbKey = investmentAccountKey(ncbSeptember);
const ncbOnly = investmentSnapshot(twoProviders, { accountKey: ncbKey });
note(ncbOnly.accounts.length === 1 && ncbOnly.holdings.length === 1, 'an account selection re-slices the whole snapshot');
note(ncbOnly.holdings[0].costReturn === -0.2 && ncbOnly.holdings[0].performanceProvenance === 'statement', 'NCB performance uses its stated gain or loss');
note(ncbOnly.holdings[0].move.state === 'none' && ncbOnly.holdings[0].move.pct == null, 'NCB gets no fabricated month move');
note(statementContributions(ncbSeptember).known && Object.keys(statementContributions(ncbSeptember).byCurrency).length === 0, 'NCB contributes no invented activity');
const providerSeries = investmentValueSeries(twoProviders);
note(providerSeries.find((row) => row.month === '2026-03').partialAccounts && providerSeries.find((row) => row.month === '2026-03').total === ncbMarch.printedTotal, 'an NCB-only early month remains part of the combined portfolio story');
note(providerSeries.filter((row) => row.present).map((row) => row.month).join(',') === '2026-03,2026-08,2026-09', 'the combined line includes every real portfolio statement month');
note(providerSeries.find((row) => row.month === '2026-03').accounts.join(',') === ncbKey, 'the early combined point records which account it reflects');

const migrationCash = {
  key: 'ncb|retail-repo-migration',
  provider: 'ncb',
  kind: 'cash',
  description: 'Cash Balance',
  currency: 'JMD',
  value: 200,
  valueBase: 200,
};
const migrationFund = {
  ...sharedNcb,
  key: 'ncb|retail-repo-migration',
  kind: 'fund',
  description: 'NCB Cap M Fund (Retail Repo Migration)',
  quantity: 10,
  avgCostRaw: 200,
  price: 20,
  value: 200,
  valueBase: 200,
  unrealisedGainLoss: 0,
};
const beforeMigration = { ...ncbAugust, periodEnd: '2026-07-31', hash: 'ncb-jul', holdings: [migrationCash] };
const afterMigration = { ...ncbAugust, hash: 'ncb-aug', holdings: [migrationFund] };
const migrated = investmentSnapshot([beforeMigration, afterMigration], { accountKey: ncbKey }).accounts[0];
note(migrated.holdings[0].role === 'performing' && migrated.disappeared.length === 0, 'a section migration stays one continuous holding');

console.log('\n -- Position gains a confirmed, dated input; the maths does not change --');
const manual = [{ id: 'm1', class: 'Property', label: 'Home', amount: 1000000, kind: 'asset', lastReviewed: '2026-05-01' }];
const before = recordedNetWorth({ reconciled: null, manualAssets: manual, asOf: '2026-05-10' });
const empty = recordedNetWorth({ reconciled: null, manualAssets: manual, investments: [], asOf: '2026-05-10' });
note(JSON.stringify(before) === JSON.stringify(empty), 'with no investments, net worth is exactly what it was');
const nw = recordedNetWorth({
  reconciled: null,
  manualAssets: manual,
  investments: investmentNetWorthItems([march, april]),
  asOf: '2026-05-10',
});
note(nw.totalAssets === r2(1000000 + april.printedTotal), 'the latest printed total joins the same asset sum, once');
const line = nw.lines.filter((l) => l.class === 'Investments');
note(line.length === 1 && line[0].source === 'reconciled' && line[0].statementDate === '2026-04-30', 'it is a reconciled line dated by its statement');
note(!('rate' in line[0]) && !('stale' in line[0]), 'it carries no conversion mark and no staleness');
note(nw.included.includes('Investments') && !nw.notIncluded.assets.includes('Investments'), 'investments count as a covered class');
const nwModel = buildNetWorthModel(nw, CONFIG);
note(nwModel.lead.label === 'Recorded net worth across investments and property', 'the net worth names what it is made of, in the order it was recorded');
note(!('tag' in nwModel.lead), 'and carries no coverage count beside it');
note(/Not included or not confirmed: /.test(nwModel.coverageNote) && nwModel.coverageNote.includes('Vehicle'), 'the note still names what is not included');
note(buildNetWorthModel(recordedNetWorth({ reconciled: null, asOf: '2026-05-10' }), CONFIG).lead.label === 'Recorded net worth', 'with nothing recorded the label claims nothing');
const summary = financialPositionSummary({ netWorth: nw, cfg: CONFIG, asOf: '2026-05-10' });
const invRow = summary.rows.find((row) => row.key === 'investments');
note(invRow && invRow.value === april.printedTotal && invRow.period === 'as of 2026-04-30', 'the shareable summary names the figure and its statement date');
note(!summary.selfReported.some((item) => item.label === 'Investments'), 'and never lists it as self-reported');
note(summary.coverageNote.startsWith('Net worth includes Investments and Property. Not included or not confirmed: '), 'the copied summary names what is included rather than counting it');
note(!/\d+ of \d+/.test(summary.coverageNote + nwModel.coverageNote + nwModel.lead.label), 'no coverage figure is written as a fraction');
const positionUi = readFileSync(join(__dirname, '..', 'application', 'ui', 'position-render.js'), 'utf8');
note(!/nw-cov|classes recorded|\.coverage\b/.test(positionUi), 'Position draws no segmented coverage track or count');
note(/summary: \(\(nw && nw\.included\) \|\| \[\]\)\.join\(', '\)/.test(positionUi), 'the card summary names every recorded class, including ones entered by hand');

console.log('\n -- Plan: the statement wins for the months it covers --');
const row = (date, amount, direction, description, extra = {}) => ({ date, amount, direction, description, currency: 'JMD', ...extra });
const ledger = [];
for (const m of ['01', '02', '03', '04', '05', '06']) ledger.push(row(`2026-${m}-25`, 300000, 'in', 'SALARY'));
ledger.push(row('2026-02-10', 20000, 'out', 'TRANSFER TO INVESTMENT ACCOUNT', { internalTransfer: true }));
ledger.push(row('2026-04-02', 200000, 'out', 'TRANSFER TO INVESTMENT ACCOUNT', { internalTransfer: true }));
ledger.push(row('2026-04-05', 10000, 'out', 'TRANSFER TO PENSION PLAN', { internalTransfer: true }));
const opts = { asOf: '2026-06-28' };
const bankOnly = setAsideMonthly(ledger, KINDS, opts);
const covered = setAsideMonthly(ledger, KINDS, { ...opts, statementContributions: new Map([['2026-04', 250000]]) });
note(bankOnly.find((m) => m.month === '2026-04').moneyOut === 210000, 'on bank data alone April counts both transfers');
const aprCovered = covered.find((m) => m.month === '2026-04');
note(aprCovered.moneyOut === 260000 && aprCovered.fromStatement === 250000, "the statement's figure replaces the matching investment transfer rather than adding to it");
note(
  JSON.stringify(covered.find((m) => m.month === '2026-02')) === JSON.stringify(bankOnly.find((m) => m.month === '2026-02')),
  'a month with no investment statement is untouched'
);
const zero = setAsideMonthly(ledger, KINDS, { ...opts, statementContributions: new Map([['2026-02', 0]]) });
note(!zero.some((m) => m.month === '2026-02'), 'a covered month where nothing was added drops the bank transfer it covers');
const outside = setAsideMonthly(ledger, KINDS, { ...opts, statementContributions: new Map([['2025-12', 99999], ['2026-07', 5000]]) });
note(JSON.stringify(outside) === JSON.stringify(bankOnly), 'statement months outside the bank history change nothing');
const designated = setAsideMonthly(
  [...ledger, row('2026-04-08', 5000, 'out', 'TRANSFER TO OWN SAVINGS', { internalTransfer: true, counterpartyKey: 'OWN-SAVINGS' })],
  withDesignations(KINDS, ['OWN-SAVINGS']),
  { ...opts, statementContributions: new Map([['2026-04', 250000]]) }
);
const aprDesignated = designated.find((m) => m.month === '2026-04');
note(aprDesignated.moneyOut === 265000 && aprDesignated.designatedOut === true, 'a designated destination is kept but flagged in a covered month');
const planBank = setAsidePlan(ledger, KINDS, { ...opts, month: '2026-06' });
const planCovered = setAsidePlan(ledger, KINDS, { ...opts, month: '2026-06', statementContributions: new Map([['2026-04', 250000]]) });
note(planBank.plannedMonthly === 46000 && !('statement' in planBank), 'bank-only planning is unchanged');
note(planCovered.plannedMonthly === 56000, 'the spread uses the statement figure in place of the bank one');
note(planCovered.statement.amount === 250000 && planCovered.statement.months[0].month === '2026-04' && !planCovered.statement.designatedOverlap, 'the plan reports what the statements confirmed');

const TREND = ['01', '02', '03', '04', '05', '06'].map((m) => ({ month: `2026-${m}`, income: 300000, bankOut: 100000 }));
const planInputs = { trend: TREND, bankRecords: ledger, cardRows: [], cfg: CONFIG, commitmentsMonthly: 0, commitmentItems: [], asOf: '2026-06-28' };
note(
  JSON.stringify(buildPlan(planInputs)) === JSON.stringify(buildPlan({ ...planInputs, investmentContributions: null })),
  'with no investment statements the whole plan is byte-identical'
);
const aprilStatement = statement('2026-04-30', aprilHoldings, { rate: 151, activity: [{ ...deposit, date: '2026-04-02' }] });
const mayUnknown = statement('2026-05-31', mayHoldings, { rate: 151, activity: [deposit], pagesSeen: [1, 2] });
const withInvestments = buildPlan({
  ...planInputs,
  investmentContributions: investmentContributionsByMonth([march, aprilStatement, mayUnknown]),
});
const plainPlan = buildPlan(planInputs);
note(withInvestments.statementSetAside.amount === 200000, 'the plan knows which saving the statement confirmed');
note(withInvestments.setAside.plannedMonthly === plainPlan.setAside.plannedMonthly, 'the same 200,000 seen by both the bank and the statement is counted once');
note(!withInvestments.setAside.months.some((m) => m.month === '2026-05' && m.fromStatement != null), 'an unreadable month stays bank-driven');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
