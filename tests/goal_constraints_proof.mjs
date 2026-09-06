import {
  monthlyPaydown,
  monthsToClear,
  resolveGoalConstraints,
  constraintSummary,
  describeResolutions,
} from '../application/analysis/goal-constraints.js';

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL', l);
  }
};
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
console.log('='.repeat(72));
console.log(' GOAL CONSTRAINTS - two goals on one income, resolved rather than ignored');
console.log('='.repeat(72));

console.log('\n -- the paydown maths --');
note(monthlyPaydown({ balance: 120000, monthsRemaining: 12, monthlyRate: 0 }).payment === 10000, 'no interest: balance split evenly over the months');
const amort = monthlyPaydown({ balance: 120000, monthsRemaining: 12, monthlyRate: 0.04 });
note(amort.payment > 10000, 'with interest the payment is higher than the plain split');
note(amort.interestShare > 0 && amort.interestShare < 1, 'and it reports what share of the payment is interest');
// A payment derived from a finite term is ALWAYS above the monthly interest,
// so a "never clears" flag here could never fire. It belongs to the inverse
// question, where the payment is the input.
const stretched = monthlyPaydown({ balance: 100000, monthsRemaining: 600, monthlyRate: 0.05 });
note(stretched.interestShare > 0.99, 'stretched far enough, almost the whole payment is interest');
note(stretched.interestShare === 1, 'and at that extreme the share reads 1, which is the honest "this is barely progress" signal');
note(stretched.payment === 100000 * 0.05, 'the payment rounds to the interest charge itself at that limit');
note(monthlyPaydown({ balance: 0, monthsRemaining: 12 }).payment === 0, 'nothing owed asks for nothing');
note(monthlyPaydown({ balance: 5000, monthsRemaining: 0 }).feasible === false, 'no months left is infeasible, not a divide by zero');

console.log('\n -- and its inverse --');
note(monthsToClear({ balance: 120000, payment: 10000, monthlyRate: 0 }).months === 12, 'paying 10,000 clears 120,000 in 12 months');
note(monthsToClear({ balance: 100000, payment: 100, monthlyRate: 0.05 }).neverClears === true, 'a payment below the interest never clears');
note(monthsToClear({ balance: 100000, payment: 0 }).months === Infinity, 'paying nothing never clears');
note(monthsToClear({ balance: 0, payment: 500 }).months === 0, 'nothing owed is already clear');

console.log('\n -- two goals that FIT --');
const ok = resolveGoalConstraints({
  takeHome: 300000, fixedCosts: 150000, savingTarget: 30000,
  paydown: { balance: 60000, monthsRemaining: 6, monthlyRate: 0 }, ceiling: 40000,
});
note(ok.conflict === false, 'a ceiling within what remains is not a conflict');
note(ok.overBy === 0, 'nothing is over');
note(ok.maxCeiling === 110000, 'the most a ceiling could be is what is genuinely left');
note(ok.resolutions.length === 0, 'nothing needs resolving');
note(constraintSummary(ok, money).tone === 'good', 'and it reads as fine');

console.log('\n -- two goals that FIGHT --');
const clash = resolveGoalConstraints({
  takeHome: 300000, fixedCosts: 150000, savingTarget: 60000,
  paydown: { balance: 112000, monthsRemaining: 6, monthlyRate: 0.0472 }, ceiling: 80000,
});
note(clash.conflict === true, 'a ceiling beyond what remains IS a conflict');
note(clash.paydown.required > 20000, 'the accelerated paydown claims a real amount');
note(clash.overBy > 0, 'and the engine says by how much the goals overreach');
note(
  Math.abs(clash.maxCeiling + clash.claimed - clash.takeHome) < 0.01,
  'the ceiling it allows plus every other claim is exactly a normal month'
);
note(clash.requestedCeiling === 80000, 'the requested ceiling is preserved, not silently overwritten');

console.log('\n -- a faster paydown TIGHTENS the ceiling, automatically --');
const slow = resolveGoalConstraints({ takeHome: 300000, fixedCosts: 150000, savingTarget: 30000, paydown: { balance: 120000, monthsRemaining: 12, monthlyRate: 0 } });
const fast = resolveGoalConstraints({ takeHome: 300000, fixedCosts: 150000, savingTarget: 30000, paydown: { balance: 120000, monthsRemaining: 6, monthlyRate: 0 } });
note(fast.maxCeiling < slow.maxCeiling, 'clearing the card twice as fast leaves less to spend');
note(slow.maxCeiling - fast.maxCeiling === 10000, 'by exactly the extra the shorter timeline demands');

console.log('\n -- the way out is offered as a choice, not a verdict --');
note(clash.resolutions.length >= 2, 'more than one way to resolve it is offered');
note(describeResolutions(null, money).length === 0, 'no result yields no sentences');
note(clash.resolutions.some((r) => r.key === 'extend-paydown'), 'giving the card longer is one of them');
note(clash.resolutions.some((r) => r.key === 'lower-saving'), 'saving less for now is another');
// The engine carries AMOUNTS and the caller formats them. A pure module that
// printed its own money could not honour the privacy gate, and would have to
// guess a currency it is never told.
note(
  clash.resolutions.every((r) => typeof r.amount === 'number' && r.text === undefined),
  'each resolution carries a number, never a pre-formatted money string'
);
const sentences = describeResolutions(clash, money);
note(sentences.length === clash.resolutions.length, 'the caller turns them into sentences with its own formatter');
note(
  sentences.every((t) => t.includes('$')),
  'and every amount in them went through that formatter'
);
note(
  !/(fail|bad|cannot afford|irresponsible|too much)/i.test(sentences.join(' ')),
  'NO-SHAMING: none of them scolds'
);
note(!/(fail|should have)/i.test(constraintSummary(clash, money).text), 'nor does the summary');

console.log('\n -- edges --');
const broke = resolveGoalConstraints({ takeHome: 100000, fixedCosts: 120000, savingTarget: 0, ceiling: 10000 });
note(broke.maxCeiling === 0, 'when fixed costs already exceed income no ceiling is affordable');
note(broke.unconstrainedCeiling < 0, 'and the true shortfall is still carried, not clamped away');
note(broke.conflict === true, 'which is a conflict');
note(resolveGoalConstraints({}).takeHome === 0, 'no input does not crash');
note(resolveGoalConstraints({ takeHome: 300000, fixedCosts: 100000 }).requestedCeiling === null, 'no ceiling asked means none reported');
note(constraintSummary(null, money) === null, 'no result, no summary');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: concurrent goals draw on one income in a fixed order, an accelerated');
console.log('         paydown automatically tightens the spending a ceiling can allow, and');
console.log('         a clash is reported with ways out rather than left to contradict.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
