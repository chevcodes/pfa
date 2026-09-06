import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  categoriseBankRows,
  bankCategoryCoverage,
  routeForAccount,
} from '../application/analysis/bank-categorise.js';
import { compileRules, categorise } from '../application/statements/categorise.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(__dirname, '..', 'settings', 'config.json'), 'utf8'));
const COMPILED = compileRules(CFG.categories);

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
console.log(' BANK CATEGORISATION - the same door as the card ledger');
console.log('='.repeat(72));

const rows = [
  { id: 'b1', description: 'NETFLIX SUBSCRIPTION', direction: 'out', amount: 2500, date: '2026-05-04' },
  { id: 'b2', description: 'WITHHOLDING TAX', direction: 'out', amount: 400, date: '2026-05-06' },
  { id: 'b3', description: 'LIFE INSURANCE PREMIUM', direction: 'out', amount: 10000, date: '2026-05-08' },
  { id: 'b4', description: 'TRANSFER TO 1234', direction: 'out', amount: 50000, date: '2026-05-11' },
  { id: 'b5', description: 'SALARY DEPOSIT', direction: 'in', amount: 290000, date: '2026-05-25' },
  { id: 'b6', description: '', type: '', direction: 'out', amount: 100, date: '2026-05-26' },
];
const out = categoriseBankRows(rows, COMPILED, { fallback: 'Uncategorised' });
const by = Object.fromEntries(out.map((r) => [r.id, r.category]));

console.log('\n -- bank rows now carry a category at all --');
note(out.every((r) => r.category !== undefined), 'every row comes back with a category field');
note(by.b1 === 'Subscriptions', 'a subscription on the bank ledger categorises like one on the card');
note(by.b2 === 'Government & Tax', 'a tax debit categorises');
note(by.b3 === 'Fees & Interest', 'without routing, the shared register calls a bank premium a card fee');

console.log('\n -- the same words mean different things on different statements --');
const ROUTES = CFG.accountCategoryRoutes.bank;
const routed = categoriseBankRows(rows, COMPILED, { fallback: 'Uncategorised', routes: ROUTES });
const rby = Object.fromEntries(routed.map((r) => [r.id, r.category]));
note(rby.b3 === 'Insurance', 'on a BANK row, "LIFE INSURANCE PREMIUM" routes to Insurance');
note(
  routed.find((r) => r.id === 'b3').categoryRouted === 'Fees & Interest',
  'and the row records what the shared engine had said, so the correction is traceable'
);
note(
  categorise('LIFE INSURANCE PREMIUM', COMPILED, 'Uncategorised', null, null, 'card').category === 'Fees & Interest',
  'the CARD ledger is untouched and still reads it as the issuer fee'
);
for (const phrase of [
  'INSURANCE PREMIUM',
  'LIFE INSURANCE PREMIUM',
  'HEALTH INSURANCE PREMIUM',
  'MONTHLY INSURANCE PREMIUM',
  'AUTOMATIC INSURANCE PREMIUM PAYMENT',
]) {
  const bank = categoriseBankRows([{ id: phrase, description: phrase }], COMPILED, {
    fallback: 'Uncategorised',
    routes: ROUTES,
  })[0];
  const card = categorise(phrase, COMPILED, 'Uncategorised', null, null, 'card');
  note(bank.category === 'Insurance', `${phrase}: bank profile reads a payment to an insurer`);
  note(card.category === 'Fees & Interest', `${phrase}: card profile keeps the issuer-fee meaning`);
}
note(ROUTES.length === 1, 'the route register contains no conditions the shared classifier can never reach');
note(rby.b1 === 'Subscriptions' && rby.b2 === 'Government & Tax', 'no other row is disturbed by routing');
note(
  routeForAccount('Groceries', 'LIFE INSURANCE PREMIUM', ROUTES) === 'Groceries',
  'a route never fires when the engine chose a different category'
);
note(routeForAccount('Fees & Interest', 'ATM FEE', ROUTES) === 'Fees & Interest', 'nor when the wording does not match');
note(routeForAccount('Fees & Interest', 'INSURANCE PREMIUM', []) === 'Fees & Interest', 'no routes configured changes nothing');
// The plan groups both categories the same way, so a corrected LABEL must not
// move a single dollar between bands.
const seedFixed = CFG.planBands.seed.fixed.map((n) => n.toLowerCase());
note(
  seedFixed.includes('fees & interest') && seedFixed.includes('insurance'),
  'both categories sit in the same plan group, so net fixed expenses are unchanged'
);

console.log('\n -- a bank CREDIT is not a card refund --');
// categorise()'s last-resort rule reads an unmatched credit as a refund, which
// is right on a card statement and wrong on a bank one: this corpus turned 224
// ordinary deposits into "Refund / Reversal" the first time this was wired up.
note(by.b5 === 'Uncategorised', 'an unmatched deposit stays uncategorised rather than becoming a refund');
note(
  out.filter((r) => r.category === 'Refund / Reversal').length === 0,
  'no bank row is invented as a refund'
);
const asCard = categorise('SALARY DEPOSIT', COMPILED, 'Uncategorised', null, { isCredit: true, refundCategory: 'Refund / Reversal' });
note(asCard.category === 'Refund / Reversal', 'the card path is deliberately unchanged and still does read a credit as a refund');

console.log('\n -- personal rules and overrides work on BOTH ledgers --');
const overridden = categoriseBankRows(rows, COMPILED, {
  fallback: 'Uncategorised',
  merchantOverrides: { 'TRANSFER TO 1234': 'Groceries' },
});
note(
  overridden.find((r) => r.id === 'b4').category === 'Groceries',
  'a personal merchant rule reaches bank rows'
);
const explicit = categoriseBankRows([{ ...rows[0], categoryOverride: 'Groceries' }], COMPILED, {});
note(explicit[0].category === 'Groceries' && explicit[0].categoryConfidence === 1, 'an explicit override wins outright');

console.log('\n -- additive and safe --');
note(out.find((r) => r.id === 'b1').description === 'NETFLIX SUBSCRIPTION', 'the original description is untouched');
note(out.find((r) => r.id === 'b1').amount === 2500, 'and so is the amount');
note(rows[0].category === undefined, 'the input rows are not mutated - a copy is returned');
note(by.b6 === 'Uncategorised', 'a row with no wording at all is uncategorised, not crashed');
note(categoriseBankRows(null, COMPILED, {}).length === 0, 'no rows in, no rows out');
const already = categoriseBankRows([{ id: 'x', description: 'NETFLIX', category: 'Kept' }], COMPILED, {});
note(already[0].category === 'Kept', 'a row that already has a category is left alone');

console.log('\n -- coverage is measurable --');
const cov = bankCategoryCoverage(out);
note(cov.total === 6 && cov.categorised === 3, 'coverage counts only genuinely categorised rows');
note(cov.share === 50, 'and reports the share');
note(bankCategoryCoverage([]).share === 0, 'an empty ledger reports 0, not NaN');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: bank transactions are categorised through the same door as card');
console.log('         transactions, with the same personal rules, and a bank credit is');
console.log('         never invented as a refund.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
