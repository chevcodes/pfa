import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  isSetAside,
  setAsideRuleFor,
  setAsideMonthly,
  setAsidePlan,
  suggestedSetAsideDestinations,
} from '../application/analysis/set-aside.js';
import { bankMovementKind } from '../application/analysis/bank-analysis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(
  readFileSync(join(__dirname, '..', 'settings', 'config.json'), 'utf8')
).bankMovementKinds;

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
console.log(' SET-ASIDE - future-money survives the own-account test');
console.log('='.repeat(72));

const row = (date, amount, direction, description, extra = {}) => ({
  date,
  amount,
  direction,
  description,
  currency: 'JMD',
  ...extra,
});

const contribution = (date, amount) =>
  row(date, amount, 'out', 'TRANSFER TO INVESTMENT ACCOUNT', { internalTransfer: true });

note(isSetAside(contribution('2026-02-14', 90000), CFG), 'an investment contribution is set-aside');
note(
  setAsideRuleFor(contribution('2026-02-14', 90000), CFG).label === 'Investment account',
  'the matching rule carries its plain label'
);
note(
  !isSetAside(row('2026-02-14', 5000, 'out', 'TRANSFER TO CHEQUING', { internalTransfer: true }), CFG),
  'a neutral own-account sweep is NOT set-aside'
);
note(!isSetAside(contribution('2026-02-14', 90000), {}), 'no rules configured -> nothing is set-aside');
note(!isSetAside(null, CFG), 'a missing row does not crash');

console.log('\n -- the precedence fix (the whole point of the change) --');
note(
  bankMovementKind(contribution('2026-02-14', 90000), null, CFG) === 'set-aside',
  'an INTERNAL transfer to an investment account is kinded set-aside, not internal'
);
note(
  bankMovementKind(
    row('2026-02-14', 5000, 'out', 'TRANSFER TO CHEQUING', { internalTransfer: true }),
    null,
    CFG
  ) === 'internal',
  'REGRESSION GUARD: a neutral own-account sweep is still internal'
);
note(
  bankMovementKind(contribution('2026-02-14', 90000), null, {}) === 'internal',
  'with no set-aside rules the old behaviour is byte-for-byte unchanged'
);
note(
  bankMovementKind(row('2026-02-01', 290000, 'in', 'SALARY'), null, CFG) === 'income',
  'REGRESSION GUARD: salary is still income'
);
note(
  bankMovementKind(row('2026-02-03', 4000, 'out', 'ANYTHING', { refund: true }), null, CFG) ===
    'refund',
  'REGRESSION GUARD: a refund is still a refund'
);
note(bankMovementKind(null, null, CFG) === 'other', 'a missing row is still other');

console.log('\n -- the monthly series --');
const salaries = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map((m) =>
  row(`${m}-25`, 290000, 'in', 'SALARY')
);
const ledger = [...salaries, contribution('2026-02-14', 90000), contribution('2026-05-14', 90000)];

const series = setAsideMonthly(ledger, CFG, { asOf: '2026-07-15' });
note(series.length === 2, 'only the two months money actually moved appear in the series');
note(series[0].month === '2026-02' && series[0].net === 90000, 'February carries its contribution');
note(series[1].month === '2026-05' && series[1].net === 90000, 'May carries its contribution');

console.log('\n -- DECISION TWO: planned and actual, side by side --');
const plan = setAsidePlan(ledger, CFG, { asOf: '2026-07-15', month: '2026-06' });
note(
  plan.monthsUsed === 6,
  'the spread divides by the LEDGER span (6 months), not the gap between contributions'
);
note(plan.plannedMonthly === 30000, 'two quarterly contributions of 90,000 read as 30,000 a month');
note(plan.actual === 0, 'June, where no money moved, honestly reports 0 actual');
note(plan.lumpy === true, 'the lumpy flag is set, so the surface can say the rhythm is quarterly');
note(plan.lastMoved === '2026-05', 'the real timing of the last contribution is carried, not hidden');

const inMay = setAsidePlan(ledger, CFG, { asOf: '2026-07-15', month: '2026-05' });
note(
  inMay.plannedMonthly === 30000 && inMay.actual === 90000,
  'in the month it moved, planned and actual differ and BOTH are reported'
);

console.log('\n -- honesty guards --');
const withdrawn = [...ledger, row('2026-06-10', 40000, 'in', 'TRANSFER FROM INVESTMENT ACCOUNT')];
const netted = setAsidePlan(withdrawn, CFG, { asOf: '2026-07-15', month: '2026-06' });
note(netted.actual === -40000, 'money taken back OUT of the future reduces the month, never hidden');
note(
  netted.plannedMonthly === roundTo(140000 / 6),
  'a drawdown lowers the spread figure too, rather than being floored away'
);

const usd = [...salaries, { ...contribution('2026-03-14', 500), currency: 'USD' }];
note(
  setAsideMonthly(usd, CFG, { asOf: '2026-07-15' }).length === 0,
  'foreign-currency set-aside is left out of the base-currency total, never converted'
);

const partial = setAsidePlan(ledger, CFG, { asOf: '2026-05-20', month: '2026-05' });
note(
  partial.monthsUsed === 4,
  'the incomplete current month is excluded from the spread (Jan-Apr counted)'
);

note(setAsidePlan([], CFG, {}).plannedMonthly === 0, 'an empty ledger gives 0, not NaN');
note(setAsidePlan(ledger, {}, { asOf: '2026-07-15' }).plannedMonthly === 0, 'no rules -> 0 set aside');

console.log('\n -- the path the real corpus actually needs --');
const OWN = { setAsideRules: [{ match: '4821', label: 'Savings account' }] };
const sweep = row('2026-03-12', 25000, 'out', 'TRANSFER TO ACCOUNT', {
  internalTransfer: true,
  counterpartyLabel: 'Own account 4821',
});
note(
  isSetAside(sweep, OWN),
  'a destination carrying NO product word is designated by an account-tail rule'
);
note(
  bankMovementKind(sweep, null, OWN) === 'set-aside',
  'that designated sweep is kinded set-aside rather than neutral internal'
);
note(
  bankMovementKind(sweep, null, CFG) === 'internal',
  'and until it IS designated it stays internal, so the default rules invent nothing'
);

function roundTo(n) {
  return parseFloat(Number(n).toFixed(2));
}


console.log('\n -- a likely savings destination is suggested, never imposed --');
{
  const mk = (ym, day, key, amt, dir) => ({
    date: `${ym}-${day}`, amount: amt, direction: dir, currency: 'JMD',
    internalTransfer: true, counterpartyKey: key, counterpartyLabel: key,
  });
  const recs = [];
  for (const ym of ['2026-04', '2026-05', '2026-06', '2026-07']) {
    recs.push(mk(ym, '25', 'ext:UNIT TRUST', 50000, 'out'));   // goes, stays
    recs.push(mk(ym, '26', 'ext:PARKING', 80000, 'out'));      // goes...
    recs.push(mk(ym, '28', 'ext:PARKING', 70000, 'in'));       // ...and returns
  }
  recs.push(mk('2026-07', '10', 'ext:ONE OFF', 20000, 'out')); // a single month
  const keys = suggestedSetAsideDestinations(recs, {}).map((d) => d.key);
  note(keys.includes('ext:UNIT TRUST'), 'an account that receives most months and rarely pays back out is suggested');
  note(!keys.includes('ext:PARKING'), 'money that comes straight back was parked, not saved');
  note(!keys.includes('ext:ONE OFF'), 'a single month is not a habit');
  const noCard = suggestedSetAsideDestinations(recs, { cardKeys: ['ext:UNIT TRUST'] }).map((d) => d.key);
  note(noCard.length === 0, 'a credit card is never suggested - clearing a debt is not setting money aside');
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: money moved toward the future is identified, kept out of the neutral');
console.log('         internal bucket, and reported as BOTH a monthly plan figure and the');
console.log('         cash that actually moved - with drawdowns and foreign currency honest.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
