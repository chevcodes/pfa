/* Two tabs, one balance.
 *
 * Activity's account-filter chip and Position's "Where your cash sits" answer
 * the SAME question - what is this account's latest balance - through two
 * different functions. They disagreed in the field: one account read
 * $944,106.45 on Activity and $1,052,352.71 on Position, while accounts whose
 * closing day carried a single movement matched exactly.
 *
 * Cause: accountClosingBalance sorted on date ALONE. Array.prototype.sort is
 * stable, so among several movements on the closing day it kept the order they
 * arrived in from the statement file and read the balance off whichever landed
 * last there - not the last movement of the day. liquidBalance orders by date
 * AND seq, and was right.
 *
 * This is a differential test rather than a fixture: the failure only appears
 * when a closing day carries more than one movement AND file order differs from
 * seq order, which is exactly the case a hand-written fixture is least likely to
 * contain. Reverting the sort makes this fail in the hundreds.
 */
import { analyseBankActivity } from '../application/analysis/bank-analysis.js';
import { liquidBalance, resolveOpts } from '../application/analysis/commitment-income.js';
import {
  buildCashDebtModel,
  cashAndDebt,
  financialPositionSummary,
  recordedNetWorth,
} from '../application/analysis/position.js';

let pass = 0;
let fail = 0;
const note = (ok, label) => { if (ok) pass++; else { fail++; console.log('   FAIL', label); } };

console.log('='.repeat(72));
console.log(' BALANCE AGREEMENT - Activity and Position read one latest balance');
console.log('='.repeat(72));

const opts = resolveOpts({});
// Deterministic PRNG so a failure is reproducible rather than a flake.
let seed = 20260908;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

const TRIALS = 400;
const mismatches = [];
let multiMovementDays = 0;

for (let trial = 0; trial < TRIALS; trial++) {
  const recs = [];
  let seq = 0;
  for (const acct of ['1016', '6958', '0908']) {
    let bal = 100000 + rnd(500000);
    const days = 3 + rnd(4);
    for (let d = 1; d <= days; d++) {
      const perDay = 1 + rnd(3);
      if (perDay > 1) multiMovementDays++;
      const dayRows = [];
      for (let k = 0; k < perDay; k++) {
        bal += rnd(20000) - 8000;
        dayRows.push({
          account: acct,
          date: `2026-08-${String(d).padStart(2, '0')}`,
          seq: seq++,
          amount: 100,
          direction: 'out',
          currency: 'JMD',
          balanceAfter: Math.round(bal * 100) / 100,
        });
      }
      // File order deliberately not seq order - the whole point.
      for (let i = dayRows.length - 1; i > 0; i--) { const j = rnd(i + 1); [dayRows[i], dayRows[j]] = [dayRows[j], dayRows[i]]; }
      recs.push(...dayRows);
    }
  }
  for (let i = recs.length - 1; i > 0; i--) { const j = rnd(i + 1); [recs[i], recs[j]] = [recs[j], recs[i]]; }

  const a = analyseBankActivity(recs);
  const l = liquidBalance(recs, opts, null);
  for (const acct of a.accounts) {
    const activityFigure = acct.closingBalance || 0;
    const positionFigure = l.perAccount[acct.account] || 0;
    if (Math.abs(activityFigure - positionFigure) > 0.005)
      mismatches.push({ trial, acct: acct.account, activityFigure, positionFigure });
  }
  if (Math.abs(a.closingBalance - l.total) > 0.005)
    mismatches.push({ trial, acct: 'TOTAL', activityFigure: a.closingBalance, positionFigure: l.total });
}

console.log('\n -- every account, every trial, both tabs --');
note(mismatches.length === 0, `no account disagrees between tabs (${mismatches.length} mismatches)`);
if (mismatches.length) console.log('   e.g.', JSON.stringify(mismatches[0]));
note(multiMovementDays > 200, `and the cases that expose it actually occurred (${multiMovementDays} multi-movement days)`);

console.log('\n -- the per-account figures sum to the total shown beside them --');
{
  const recs = [
    { account: 'A', date: '2026-08-31', seq: 9, currency: 'JMD', amount: 1, direction: 'out', balanceAfter: 1052352.71 },
    { account: 'A', date: '2026-08-31', seq: 2, currency: 'JMD', amount: 1, direction: 'out', balanceAfter: 944106.45 },
    { account: 'B', date: '2026-08-30', seq: 1, currency: 'JMD', amount: 1, direction: 'out', balanceAfter: 20000 },
  ];
  const a = analyseBankActivity(recs);
  const l = liquidBalance(recs, opts, null);
  note(a.accounts.find((x) => x.account === 'A').closingBalance === 1052352.71,
    'the LAST movement of the closing day wins, not the last line in the file');
  note(Math.abs(a.closingBalance - l.total) < 0.005, 'and the total agrees with Position');
}

console.log('\n -- the cases the first version of this proof did not generate --');
{
  // The differential trials above only ever produced base-currency rows whose
  // balance sat in `balanceAfter`. Both functions agreed across 400 trials and
  // the bug was still live, because the real divergence was in WHICH FIELD and
  // WHICH CURRENCY each function would accept - not in how they ordered a day.
  // A passing differential test over too narrow a generator is worth exactly
  // nothing, so the two missing shapes are pinned here explicitly.
  const runningBalanceOnly = [
    { account: '0908', date: '2026-08-20', seq: 1, currency: 'JMD', amount: 1, direction: 'out', balanceAfter: 944106.45 },
    { account: '0908', date: '2026-08-31', seq: 2, currency: 'JMD', amount: 1, direction: 'out', 'Running Balance': 1052352.71 },
  ];
  const a1 = analyseBankActivity(runningBalanceOnly);
  const l1 = liquidBalance(runningBalanceOnly, opts, null);
  note(
    a1.accounts[0].closingBalance === 1052352.71 && l1.perAccount['0908'] === 1052352.71,
    'a latest movement carrying only "Running Balance" is read by BOTH, not just Position'
  );

  const mixedCurrency = [
    { account: '0908', date: '2026-08-20', seq: 1, currency: 'JMD', amount: 1, direction: 'out', balanceAfter: 944106.45 },
    { account: '0908', date: '2026-08-31', seq: 2, currency: 'USD', amount: 1, direction: 'out', balanceAfter: 5000 },
  ];
  const a2 = analyseBankActivity(mixedCurrency);
  const l2 = liquidBalance(mixedCurrency, opts, null);
  note(
    a2.accounts[0].closingBalance === 944106.45 && l2.perAccount['0908'] === 944106.45,
    'a foreign-currency row never supplies an account\'s base-currency closing figure'
  );
}

console.log('\n -- missing bank data is not a zero bank balance --');
{
  const cd = cashAndDebt({
    bankRecords: [],
    cardStatements: [{ newBalance: 65700.64, creditLimit: 250000, statementDate: '2023-05-31' }],
    asOf: '2026-09-10',
  });
  const nw = recordedNetWorth({ reconciled: cd, asOf: '2026-09-10' });
  const summary = financialPositionSummary({ cashDebt: cd, netWorth: nw, asOf: '2026-09-10' });
  const model = buildCashDebtModel(cd);
  note(nw.coverage.covered === 1, 'card-only Position covers one class, not a fictional cash class');
  note(!nw.lines.some((line) => line.class === 'Cash & bank'), 'card-only Position does not record cash as zero');
  note(!summary.rows.some((row) => row.label === 'Cash on hand'), 'the shareable summary omits missing cash');
  note(model.cards.every((card) => card.id !== 'cash' && card.id !== 'income'), 'the supporting cards omit missing bank evidence');
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
if (fail) process.exit(1);
