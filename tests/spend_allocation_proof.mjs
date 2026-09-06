import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { allocateSurplus, allocationView } from '../application/analysis/spend-allocation.js';
import { buildAvailableNowModel } from '../application/analysis/available-now.js';
import { cardLegBeforeIncome } from '../application/analysis/commitment-income.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(__dirname, '..', 'settings', 'config.json'), 'utf8'));
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
console.log(' SPEND ALLOCATION - the surplus is divided by the plan, not handed over');
console.log('='.repeat(72));

console.log('\n -- the guilt-free share is applied to the SURPLUS --');
const d = allocateSurplus({ surplus: 200000, targets: null, cfg: CFG });
note(d.sharePct === 20, 'with no plan saved the starting 20% share is used');
note(d.spendable === 40000, '20% of a 200,000 surplus is 40,000 free to spend');
note(d.earmarkedSaving === 160000, 'and the other 160,000 is held for saving');
note(d.spendable + d.earmarkedSaving === d.surplus, 'the two always add back to the surplus exactly');
note(d.usingDefault === true, 'and the surface can say the default is in play');

const own = allocateSurplus({ surplus: 200000, targets: { fixed: 50, setAside: 15, free: 35, v: 2 }, cfg: CFG });
note(own.sharePct === 35, 'a saved plan drives the share');
note(own.spendable === 70000, 'so 35% of the same surplus is 70,000');
note(own.usingDefault === false, 'and it is no longer the default');

console.log('\n -- it is NOT scaled up against the saving share --');
// free/(free+setAside) would be 50% here, which reads as 100,000 - a bigger,
// more flattering figure. The surplus still has to carry everyday fixed costs
// that are not detected commitments, so the conservative reading is the
// honest one.
note(d.spendable < 200000 * (20 / (20 + 20)), 'the figure is deliberately lower than the relative-share reading');

console.log('\n -- nothing spare is stated plainly --');
for (const s of [0, -5000]) {
  const none = allocateSurplus({ surplus: s, targets: null, cfg: CFG });
  note(none.spendable === 0 && none.earmarkedSaving === 0, `a surplus of ${s} yields nothing spendable and nothing earmarked`);
  note(none.nothingSpare === true, `and says so (${s})`);
}
const v = allocationView(allocateSurplus({ surplus: -1, cfg: CFG }), money);
note(/nothing spare/.test(v.tag), 'the view carries the plain "nothing spare" tag');
note(v.tone === 'watch', 'toned as something to notice, not as good news');

console.log('\n -- money not moved is EARMARKED, never recorded as saved --');
const view = allocationView(d, money);
note(/held for saving/i.test(view.detail), 'the wording is "held for saving"');
note(!/(saved|you saved)\b/i.test(view.tag), 'the tag never claims the money was saved');

console.log('\n -- Overview reads the plan, and never shows the figure alone --');
const primitive = {
  asOf: '2026-09-07',
  income: { amount: 300000, date: '2026-09-25', typicalDay: 25, confidence: 'high' },
  liquid: { total: 300000, staleAccounts: 0 },
  card: { amountExpectedBeforeNextIncome: 0, basis: 'paid-in-full', dueDate: null },
  commitments: [{ key: 'ext:INSURANCE', amount: 100000, date: '2026-09-12', basis: 'bank' }],
  layers: { availableBalance: 300000, commitmentsBeforeIncome: 100000, estimatedAvailableAfterCommitments: 200000 },
  confidence: 'complete',
  gaps: [],
};
const model = buildAvailableNowModel(primitive, CFG, null);
note(model.lead.amount === 40000, 'the lead is the guilt-free share, not the 200,000 surplus');
note(model.lead.id === 'guiltFreeNow', 'and is identified as such');
note(!!model.leadNote && model.leadNote.text.length > 0, 'a reconciling line always accompanies it');
note(/held for saving/.test(model.leadNote.text), 'saying what the rest of the surplus is for');
note(
  model.working.some((w) => w.id === 'surplusAfterCommitments' && w.amount === 200000),
  'the whole surplus is still shown, as working rather than as the answer'
);
note(
  model.working.some((w) => w.id === 'earmarkedSaving' && w.amount === 160000),
  'and what is held for saving is visible beside it'
);
const zeroCommitments = buildAvailableNowModel(
  {
    ...primitive,
    commitments: [],
    layers: {
      availableBalance: 300000,
      commitmentsBeforeIncome: 0,
      estimatedAvailableAfterCommitments: 300000,
    },
  },
  CFG,
  null
);
note(
  !zeroCommitments.working.some((w) => w.id === 'commitments' || w.id === 'surplusAfterCommitments'),
  'zero scheduled payments do not create a zero-value or duplicate balance in the working'
);
note(
  zeroCommitments.working.some((w) => w.id === 'availableBalance') &&
    zeroCommitments.working.some((w) => w.id === 'earmarkedSaving'),
  'cash on hand and the amount held for saving remain visible when no payment is due'
);
const withPlan = buildAvailableNowModel(primitive, CFG, { fixed: 50, setAside: 15, free: 35, v: 2 });
note(withPlan.lead.amount === 70000, 'changing the plan changes the Overview figure');
note(
  buildAvailableNowModel(primitive, CFG, { setAside: 80000, savedAt: 'x' }).lead.amount === 40000,
  'a legacy amount-shaped target is ignored here too, exactly as the Plan tab ignores it'
);

console.log('\n -- income confidence is reported consistently --');
note(/^Steady ·/.test(model.income.tag), 'high-confidence income is tagged as steady');
note(/^Steady income,/.test(model.verdict.text), 'the verdict also calls high-confidence income steady');
const mediumIncome = buildAvailableNowModel(
  { ...primitive, income: { ...primitive.income, confidence: 'medium' } },
  CFG,
  null
);
note(/^Likely ·/.test(mediumIncome.income.tag), 'medium-confidence income remains tagged as likely');
note(/^Income detected,/.test(mediumIncome.verdict.text), 'the medium-confidence verdict does not overstate certainty');

console.log('\n -- each missing card input names the input that is missing --');
const withCardBasis = (basis, dueDate = null) =>
  buildAvailableNowModel(
    {
      ...primitive,
      card: { amountExpectedBeforeNextIncome: 0, basis, dueDate },
      confidence: 'incomplete',
      gaps: [`card leg incomplete: ${basis}`],
    },
    CFG,
    null
  ).card;
const missingAmount = withCardBasis('no-amount-due', '2026-09-20');
note(missingAmount.tag === 'card amount unknown', 'a missing amount is not mislabeled as a missing date');
note(/amount due .*could not be read/.test(missingAmount.detail), 'the missing-amount detail says what could not be read');
const missingCardDate = withCardBasis('amount-known-date-unknown');
note(missingCardDate.tag === 'card date unknown', 'a missing card date keeps the card-date label');
const missingPayDate = withCardBasis('no-income-date', '2026-09-20');
note(missingPayDate.tag === 'pay date unknown', 'a missing income date is labeled as a missing pay date');
note(/next pay date/.test(missingPayDate.detail), 'the missing-pay-date detail says what could not be established');
const cardWithoutIncome = cardLegBeforeIncome(
  [{ periodEnd: '2026-09-07', newBalance: 25000, dueDate: '2026-09-20' }],
  {},
  '2026-09-07',
  null
);
note(cardWithoutIncome.dueDate === '2026-09-20', 'a known card due date survives when the next pay date is missing');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: Overview answers with the person\'s own guilt-free share of what is');
console.log('         left after commitments, never the whole surplus, never alone, and');
console.log('         the remainder is held for saving rather than counted as saved.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
