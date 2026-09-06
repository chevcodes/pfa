import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildPlan,
  buildPlanModel,
  defaultTargets,
  groupForCategory,
  normaliseTargets,
  resolveGroupMap,
  typicalIncome,
  unusualMonth,
  reconcilingLine,
  onTargetTolerance,
} from '../application/analysis/plan.js';
import { ownDestinations } from '../application/analysis/set-aside.js';
import { computeScenario } from '../application/analysis/reporting-insights.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(__dirname, '..', 'settings', 'config.json'), 'utf8'));

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL', l);
  }
};
console.log('='.repeat(72));
console.log(' PLAN - three groups, a target share each, tracked honestly');
console.log('='.repeat(72));

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const TREND = MONTHS.map((m, i) => ({
  month: m,
  income: m === '2026-05' ? 520000 : 290000 + i * 500,
  bankOut: 240000,
}));

const bank = [];
for (const t of TREND) {
  bank.push({ date: `${t.month}-25`, amount: t.income, direction: 'in', description: 'SALARY', currency: 'JMD' });
  bank.push({
    date: `${t.month}-06`, amount: 18000, direction: 'out', currency: 'JMD',
    description: 'UTILITY BILL', counterpartyKey: 'ext:UTILITY',
  });
}
bank.push({
  date: '2026-02-14', amount: 90000, direction: 'out', currency: 'JMD',
  description: 'TRANSFER TO INVESTMENT ACCOUNT', internalTransfer: true,
});
bank.push({
  date: '2026-05-14', amount: 90000, direction: 'out', currency: 'JMD',
  description: 'TRANSFER TO INVESTMENT ACCOUNT', internalTransfer: true,
});

const card = [];
for (const t of TREND) {
  card.push({ date: `${t.month}-08`, amount: 40000, kind: 'spend', category: 'Utilities' });
  card.push({ date: `${t.month}-12`, amount: 25000, kind: 'spend', category: 'Dining & Takeout' });
  card.push({ date: `${t.month}-19`, amount: 15000, kind: 'spend', category: 'Entertainment & Recreation' });
}

const ITEMS = [{ label: 'Insurance Premium', key: 'ext:INSURANCE', typical: 12000 }];
const ASOF = '2026-07-10';
const base = {
  trend: TREND, bankRecords: bank, cardRows: card, cfg: CFG,
  commitmentsMonthly: 12000, commitmentItems: ITEMS, asOf: ASOF,
};

console.log('\n -- a normal month, not the month on screen --');
// 2026-05's 520,000 is two payments landing together, not a raise. The typical
// month is built from the months that ARE typical: the outlier is set aside and
// the remaining five are averaged, so every ordinary month counts toward the
// figure rather than only the middle one a bare median would have picked.
const ti = typicalIncome(TREND, ASOF);
note(ti.amount === 291100, 'take-home averages the ordinary months (291,100)');
note(
  ti.excluded.length === 1 && ti.excluded[0] === 520000,
  'the double-payment month is set aside, not allowed to pull the figure up'
);
note(ti.basis === 'repeating' && ti.monthsUsed === 5 && ti.monthsSeen === 6,
  'and the figure says where it came from: the 5 of 6 months that agree');
note(unusualMonth(TREND, '2026-05', ASOF).is === true, 'the 520,000 month is flagged unusual');
note(unusualMonth(TREND, '2026-06', ASOF).is === false, 'an ordinary month is not flagged');

console.log('\n -- the default split is 60/20/20 --');
const d = defaultTargets(CFG);
note(d.fixed === 60 && d.setAside === 20 && d.free === 20, 'config ships 60/20/20');
const plain = buildPlan(base);
note(plain.targetsAreDefault === true, 'with nothing saved the plan runs on the default');
note(plain.targetPct.fixed === 60, 'fixed defaults to 60%');
note(plain.targetTotal === 100, 'the three targets add to 100% of take-home');
note(
  normaliseTargets({ fixed: 55 }, CFG).setAside === 20,
  'a partial target falls back to the default for the groups it does not name'
);

console.log('\n -- a target saved by an older build is discarded, not rendered --');
// The first build of this tab stored AMOUNTS under the same key. Read as
// percentages a saved 80,000 became 80,000% of take-home and the target column
// showed a figure in the hundreds of millions.
const legacy = buildPlan({ ...base, targets: { setAside: 80000, savedAt: '2026-09-06' } });
note(legacy.targetPct.setAside === 20, 'a legacy amount is ignored in favour of the default share');
note(legacy.targetTotal === 100, 'so the targets still add to 100%');
note(legacy.targetsAreDefault === true, 'and the surface does not claim a saved plan');
const versioned = buildPlan({ ...base, targets: { fixed: 50, setAside: 30, free: 20, v: 2, savedAt: '2026-09-07' } });
note(versioned.targetPct.fixed === 50 && versioned.targetsAreDefault === false, 'a versioned percentage target is honoured');
note(buildPlan({ ...base, targets: { fixed: 250, setAside: 20, free: 20, v: 2 } }).targetPct.fixed === 60, 'an impossible share falls back to the default');

console.log('\n -- FALSE HEADROOM: everyday spending must be counted --');
// The trap real statements exposed: with only detected commitments subtracted,
// "free" swallowed every grocery, bill and card purchase and read about four
// times too generous. Discretionary spending must be what is actually spent freely.
const groups = Object.fromEntries(plain.groups.map((g) => [g.key, g]));
note(groups.fixed.actual === 70000, 'fixed = 12,000 commitments + 18,000 bank debits + 40,000 obliged card spend');
note(groups.free.actual === 40000, 'free = only the discretionary card spend, not the whole remainder');
note(
  groups.free.actual < plain.takeHome - plain.workings.committed,
  'free is FAR below "income minus commitments" - the headroom trap is closed'
);
note(
  plain.accountedFor === groups.fixed.actual + groups.setAside.actual + groups.free.actual,
  'the three groups account for what actually goes out'
);
note(plain.unaccounted === plain.takeHome - plain.accountedFor, 'and what never went out is named, not absorbed into free');

console.log('\n -- tracking against the target --');
note(onTargetTolerance(100000) === 2000, 'a 2% variance stays within the neutral target band');
note(groups.fixed.targetAmount === Math.round(291100 * 0.6 * 100) / 100, 'the target amount is the share of take-home');
note(groups.fixed.direction === 'under', '70,000 against a 60% target reads as under');
note(groups.setAside.actual === 30000, 'set-aside picks up the quarterly transfers, spread over the ledger');
note(groups.setAside.direction === 'under', 'and reports being under its 20% target');
const m = buildPlanModel(plain, CFG);
note(/under/.test(m.groups.find((g) => g.key === 'fixed').trackText), 'the surface states the gap in money, not a grade');
note(
  !/(fail|bad|should|too much|overspend)/i.test(m.groups.map((g) => g.trackText).join(' ')),
  'NO-SHAMING: tracking text carries no reproach'
);

console.log('\n -- categories are assignable, and the money follows --');
const seeded = resolveGroupMap(CFG, null);
note(groupForCategory('Utilities', seeded) === 'fixed', 'a bill you are obliged to pay seeds into fixed');
note(groupForCategory('Dining & Takeout', seeded) === 'free', 'dining is discretionary spending, however often it recurs');
note(groupForCategory('Entertainment & Recreation', seeded) === 'free', 'so is entertainment');
note(groupForCategory('Groceries', seeded) === 'free', 'Groceries is NOT assumed to be fixed - it is a judgement call, and defaults to free until asked');
const moved = buildPlan({ ...base, groupAssignments: { Utilities: 'free' } });
const movedGroups = Object.fromEntries(moved.groups.map((g) => [g.key, g]));
note(movedGroups.free.actual === 80000, 'moving a category to free adds its 40,000 to free');
note(movedGroups.fixed.actual === 30000, 'and removes it from fixed');
note(
  movedGroups.free.actual + movedGroups.fixed.actual === groups.free.actual + groups.fixed.actual,
  'reassigning moves money between groups without creating or destroying any'
);

console.log('\n -- the double-count trap: one payment, one group --');
const dbl = buildPlan({
  ...base,
  commitmentsMonthly: 52000,
  commitmentItems: [...ITEMS, { label: 'Unit Trust Investment', key: 'ext:UNIT TRUST', typical: 40000 }],
});
note(dbl.setAsideWithinCommitments === 40000, 'the standing order into a future-money account is spotted');
note(dbl.commitmentsDetected === 52000, 'the shared commitments total the rest of the app reads is untouched');
note(dbl.workings.committed === 12000, 'but the fixed group nets it back out');

console.log('\n -- the free figure is never shown alone --');
note(!!m.free.reconciling && !!m.free.reconciling.text, 'the free figure carries a reconciling line');
note(Object.prototype.hasOwnProperty.call(m.free, 'reconciling'), 'the line lives inside the free object');
note(m.free.label === 'discretionary spending allocation', 'the label uses the standard finance term the rest of the app already uses');
const carrying = buildPlanModel(
  buildPlan({ ...base, card: { owed: 60000, previousOwed: 40000 } }),
  CFG
);
note(/higher than last month/.test(carrying.free.reconciling.text), 'a growing card balance surfaces as plain fact');
note(carrying.free.reconciling.tone === 'watch', 'and changes the tone rather than being buried');

console.log('\n -- own accounts only count as saving once designated --');
// The real corpus has no descriptor with a product word in it: future money
// moves between the person's own accounts. Until one is designated, the
// savings group must honestly read zero rather than guess.
const sweeps = [
  ...bank,
  ...MONTHS.map((mo) => ({
    date: `${mo}-20`, amount: 25000, direction: 'out', currency: 'JMD',
    description: 'TRANSFER TO ACCOUNT', internalTransfer: true,
    counterpartyKey: 'own:4821', counterpartyLabel: 'Account 4821',
  })),
];
const undesignated = buildPlan({ ...base, bankRecords: sweeps });
note(undesignated.actual.setAside === 30000, 'an undesignated own-account sweep is NOT counted as saving');
const designated = buildPlan({ ...base, bankRecords: sweeps, designatedSetAside: ['own:4821'] });
note(designated.actual.setAside === 55000, 'once designated it joins the savings group');
note(
  designated.actual.fixed === undesignated.actual.fixed,
  'and it never appears in fixed expenses as well'
);
note(
  ownDestinations(sweeps, { asOf: ASOF }).some((d) => d.key === 'own:4821' && d.perMonth === 25000),
  'the destination list offers it with what a normal month sends there'
);

console.log('\n -- an account that is drawn down is not "negative saving" --');
const twoWay = [
  ...sweeps,
  ...MONTHS.map((mo) => ({
    date: `${mo}-27`, amount: 60000, direction: 'in', currency: 'JMD',
    description: 'TRANSFER FROM ACCOUNT', internalTransfer: true,
    counterpartyKey: 'own:4821', counterpartyLabel: 'Account 4821',
  })),
];
const drawn = buildPlan({ ...base, bankRecords: twoWay, designatedSetAside: ['own:4821'] });
note(drawn.setAsideNet < 0, 'the true net is negative when more comes back than goes in');
note(drawn.actual.setAside === 0, 'but the savings group reads zero, never a negative amount');
note(drawn.drawdown === Math.abs(drawn.setAsideNet), 'and the drawdown is carried as its own figure');
note(
  drawn.groups.every((g) => g.share >= 0),
  'no group can claim a negative share of take-home'
);
note(/came back out/.test(buildPlanModel(drawn, CFG).drawdownText), 'the surface says plainly what happened');

console.log('\n -- foreign future money is named, never converted --');
const usd = buildPlan({
  ...base,
  bankRecords: [...bank, { date: '2026-04-11', amount: 500, direction: 'out', currency: 'USD', description: 'TRANSFER TO INVESTMENT ACCOUNT', internalTransfer: true }],
});
note(usd.foreignSetAside.length === 1 && usd.foreignSetAside[0].currency === 'USD', 'the USD contribution is picked up separately');
note(usd.actual.setAside === plain.actual.setAside, 'and does not move the base-currency groups');

console.log('\n -- honesty guards --');
note(plain.confidence === 'complete', 'six months, commitments and card data read as complete');
const thin = buildPlan({ ...base, trend: TREND.slice(0, 2), cardRows: [], commitmentsMonthly: 0, asOf: '2026-03-10' });
note(thin.confidence === 'incomplete' && thin.gaps.length > 0, 'thin data reports itself incomplete and says why');
note(/^estimated /.test(buildPlanModel(thin, CFG).free.label), 'an incomplete plan hedges its lead figure');
note(buildPlan({}).takeHome === 0, 'no data gives 0, not NaN');
note(buildPlanModel(null, CFG) === null, 'a missing plan yields no model');
note(reconcilingLine({ trend: [], month: '', fixedMonthly: 0, card: null }).text.length > 0, 'the reconciling line is never empty');
const negativeCost = computeScenario({ cashPosition: 1000, monthlyOutflow: 100, extraCost: -5 });
note(negativeCost.scenarioCash === 1000, 'a negative hypothetical cost cannot create extra cash');
const decimalCost = computeScenario({ cashPosition: 1000, monthlyOutflow: 100, extraCost: 100.55 });
note(decimalCost.scenarioCash === 899.45, 'a hypothetical cost preserves currency decimals');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: a normal month divides into fixed, saved and free; each group carries');
console.log('         a target share of take-home starting at 60/20/20; categories can be');
console.log('         reassigned; and discretionary spending is what is actually spent freely.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
