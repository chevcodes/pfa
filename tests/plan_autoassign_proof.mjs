import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { autoAssign, categoryEvidence, groupSummary } from '../application/analysis/plan-autoassign.js';

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
console.log(' AUTO-ASSIGN - obligation decides the group, never rhythm');
console.log('='.repeat(72));

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const rows = [];
for (const m of MONTHS) {
  // Every one of these recurs in every single month. Only some are obligations.
  rows.push({ date: `${m}-03`, amount: 12000, kind: 'spend', category: 'Utilities' });
  rows.push({ date: `${m}-07`, amount: 30000, kind: 'spend', category: 'Dining & Takeout' });
  rows.push({ date: `${m}-11`, amount: 20000, kind: 'spend', category: 'Entertainment & Recreation' });
  rows.push({ date: `${m}-15`, amount: 45000, kind: 'spend', category: 'Groceries' });
  rows.push({ date: `${m}-21`, amount: 6000, kind: 'spend', category: 'Subscriptions' });
  rows.push({ date: `${m}-24`, amount: 300, kind: 'spend', category: 'Courier & Shipping' });
}
const evidence = categoryEvidence(rows, { asOf: '2026-07-01' });
const categories = [
  'Utilities', 'Dining & Takeout', 'Entertainment & Recreation',
  'Groceries', 'Subscriptions', 'Courier & Shipping', 'Insurance',
];
const result = autoAssign({ categories, evidence, cfg: CFG, stored: null });
const asked = new Set(result.ambiguous.map((q) => q.name));

console.log('\n -- recurring is NOT the same as fixed --');
note(
  evidence.find((e) => e.name === 'Dining & Takeout').monthsPresent === 6,
  'dining recurs in every one of the six months'
);
note(
  evidence.find((e) => e.name === 'Entertainment & Recreation').monthsPresent === 6,
  'so does entertainment'
);
note(result.assignments['Dining & Takeout'] === 'free', 'and dining is STILL discretionary spending');
note(result.assignments['Entertainment & Recreation'] === 'free', 'and so is entertainment');
note(result.assignments['Subscriptions'] === 'free', 'a monthly subscription is recurring, not obliged');
note(!asked.has('Dining & Takeout'), 'none of them is even put to the person - they are not in doubt');

console.log('\n -- obligation decides fixed --');
note(result.assignments['Utilities'] === 'fixed', 'a utility bill is an obligation, so it is placed automatically');
note(result.assignments['Insurance'] === 'fixed', 'so is insurance, with no spending evidence needed at all');
note(!asked.has('Utilities') && !asked.has('Insurance'), 'neither is put to the person');

console.log('\n -- genuine judgement calls ARE asked --');
note(asked.has('Groceries'), 'Groceries is asked, not guessed: food is necessary, the amount is elastic');
note(result.assignments['Groceries'] === undefined, 'and it is left unassigned until answered');
note(
  result.ambiguous.find((q) => q.name === 'Groceries').typical === 45000,
  'the question carries what a normal month actually spends there'
);
note(
  !/recur|steady|regular|every month/i.test(result.ambiguous.find((q) => q.name === 'Groceries').because),
  'and its context never implies that recurring means fixed'
);
note(!asked.has('Courier & Shipping'), 'a judgement call too small to matter is settled quietly, not asked');
note(result.assignments['Courier & Shipping'] === 'free', 'falling to free, the honest resting place');

console.log('\n -- the person always wins --');
const stored = { Groceries: 'fixed', 'Dining & Takeout': 'fixed' };
const withStored = autoAssign({ categories, evidence, cfg: CFG, stored });
note(withStored.assignments['Dining & Takeout'] === undefined, 'a stored choice is never overwritten');
note(!withStored.ambiguous.some((q) => q.name === 'Groceries'), 'and an answered question is not asked again');
note(
  groupSummary({ categories, cfg: CFG, stored }).fixed >= 2,
  'the stored overrides are what the summary counts'
);

console.log('\n -- ordering and robustness --');
note(
  result.ambiguous.every((q, i, a) => i === 0 || a[i - 1].typical >= q.typical),
  'questions come biggest-first, so the decision that matters most is asked first'
);
note(autoAssign({}).ambiguous.length === 0, 'no input asks nothing and does not crash');
note(categoryEvidence([]).length === 0, 'no rows produce no evidence');
note(
  categoryEvidence([{ date: '2026-01-05', amount: 100, kind: 'payment', category: 'Groceries' }]).length === 0,
  'a card payment is not spending and never becomes evidence'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: obligations are placed automatically, guilt-free spending stays');
console.log('         guilt-free however often it recurs, and only genuine judgement');
console.log('         calls with real money behind them are put to the person.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
