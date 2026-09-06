import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compileRules, categorise } from '../application/statements/categorise.js';
import { compileFromRaw } from '../application/statements/merchant-resolver.js';
import { merchantGroupKey } from '../settings/category-rules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(__dirname, '..', 'settings', 'config.json'), 'utf8'));
const RAW = JSON.parse(
  readFileSync(join(__dirname, '..', 'settings', 'jamaica-merchants.json'), 'utf8')
);
const CLEANUP = ((CFG.bankDescriptorCleanup && CFG.bankDescriptorCleanup.rules) || []).map((r) => ({
  pattern: new RegExp(r.pattern, r.flags || 'i'),
  replacement: r.replacement == null ? '' : r.replacement,
}));
const RESOLVER = compileFromRaw(RAW, CFG, CLEANUP);
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
const named = (d, profile = 'card') => RESOLVER.resolve(d, { profile }).canonicalName;
const categoryOf = (d, profile = 'card') =>
  categorise(d, COMPILED, 'Uncategorised', RESOLVER, null, profile).category;

console.log('='.repeat(72));
console.log(' MERCHANT ALIAS SHAPES - one merchant per business, whatever the branch');
console.log('='.repeat(72));

/* ---------------------------------------------------------------------------
 * 1) A chain printed with a branch suffix is ONE merchant, not one per branch.
 *    The shared branch-hyphen rule already cuts the tail before matching, so a
 *    chain needs a single alias however many branches appear. This is the
 *    guarantee that stops the merchant list growing a row per store.
 * ------------------------------------------------------------------------ */
const branches = [
  'PROGRESSIVE FOODS',
  'PROGRESSIVE FOODS-PTMORE, PORTMORE',
  'PROGRESSIVE FOODS-PORT, ST. CATHER',
];
const resolvedNames = new Set(branches.map((d) => named(d)));
note(resolvedNames.size === 1, 'three branch spellings resolve to exactly one merchant');
note([...resolvedNames][0] === 'Progressive Foods', 'and that merchant is the chain itself');
const groupKeys = new Set(branches.map((d) => merchantGroupKey(d, [], RESOLVER.compiled)));
note(groupKeys.size === 1, 'the three branches share one grouping key');
note(branches.every((d) => categoryOf(d) === 'Groceries'), 'every branch carries the chain category');
note(
  named('MYCART EXPRESS-MALLPLAZA, KINGSTON') === 'MyCart Express',
  'a branch suffix on a courier resolves the same way'
);
note(
  categoryOf('MYCART EXPRESS-MALLPLAZA, KINGSTON') === 'Courier & Shipping',
  'and carries the courier category'
);

/* ---------------------------------------------------------------------------
 * 2) A brand whose name contains a separator is printed both ways. The alias
 *    matches a separator CLASS, while staying anchored to the start of the
 *    segment so a trailing location tail is still never mis-grouped.
 * ------------------------------------------------------------------------ */
note(named('HI-LO FOOD STORES, KINGSTON 8') === 'Hi-Lo Food Stores', 'the hyphenated spelling matches');
note(named('HI LO-MANOR PARK, DELIVE - KINGSTO') === 'Hi-Lo Food Stores', 'the spaced spelling matches too');
note(named('HI-LO - MANOR PARK, KINGSTON 5') === 'Hi-Lo Food Stores', 'the spaced-hyphen branch still matches');
note(
  named("THIIAH'S JUICES -HILO, KINGSTON 6") !== 'Hi-Lo Food Stores',
  'a trailing location tail is still NOT mis-grouped as the supermarket'
);

/* ---------------------------------------------------------------------------
 * 3) An acronym utility, an operator billing on a brand's behalf, and a legal
 *    entity trading under another name all resolve to the researched merchant.
 * ------------------------------------------------------------------------ */
note(named('NWCJ -') === 'National Water Commission', 'the country-suffixed utility acronym resolves');
note(categoryOf('NWCJ -') === 'Utilities', 'and is a utility bill');
note(named('JIO-ETAG-ECOM, KINGSTON 10') === 'TransJamaican Highway', 'a toll tag top-up billed by the operator resolves to the toll road');
note(categoryOf('JIO-ETAG-ECOM, KINGSTON 10') === 'Fuel & Transport', 'and is transport, not an unknown charge');
note(named('COLUMBUS COMMUNICATIONS, JAM-TREAS') === 'Flow Jamaica', 'a telecom billed under its legal entity resolves to the brand');
note(categoryOf('COLUMBUS COMMUNICATIONS, JAM-TREAS') === 'Telecom', 'and is telecom');

/* ---------------------------------------------------------------------------
 * 4) A global biller whose descriptor carries a bare reference token instead of
 *    the usual "*service" suffix still resolves.
 * ------------------------------------------------------------------------ */
note(named('GOOGLE VLZJRV, 6502530000') === 'Google', 'a bare reference suffix does not break the match');
note(named('GOOGLE PLAY, LONDON') === 'Google', 'the named-service descriptors still resolve');
note(
  named('GOOGLETOWN HARDWARE, KINGSTON') !== 'Google',
  'the alias is word-bounded, so a longer word starting with the brand is not swallowed'
);

/* ---------------------------------------------------------------------------
 * 5) A person is categorised from the GENERIC title in front of their name, so
 *    the merchant list never has to carry an individual's name to file a visit
 *    to their practice. The merchant itself stays unresolved, which is the
 *    honest answer: we know what kind of charge it is, not which business.
 * ------------------------------------------------------------------------ */
note(categoryOf('DR SAMPLE SURNAME, KINGSTON 10') === 'Pharmacy & Health', 'a "Dr <name>" charge is health spending');
note(named('DR SAMPLE SURNAME, KINGSTON 10') === null, 'and no individual is named in the merchant list');
note(categoryOf('SOME DRUG & GARDEN CENTRE, KINGSTON') === 'Pharmacy & Health', 'a pharmacy named "<x> Drug" is health spending');
note(named('SOME DRUG & GARDEN CENTRE, KINGSTON') === null, 'without adding the independent business to the merchant list');
note(
  categoryOf('SOMEBODY SURNAME AND CO, KINGSTON 6') === 'Uncategorised',
  'a bare personal name with no generic signal is left uncategorised rather than guessed'
);

/* ---------------------------------------------------------------------------
 * 5a) A business whose REGISTERED name opens with a given name is still that
 *     business. Reading the leading name as a private person is the failure
 *     this guards: the supermarket must win, and its own branch spelling must
 *     keep winning too.
 * ------------------------------------------------------------------------ */
note(named('MICHELLE LOSHUSAN AND CHI, KINGSTO') === 'Loshusan Supermarket', 'the registered company form resolves to the supermarket');
note(named('LOSHUSAN SUPERMARKET, KINGSTON 6') === 'Loshusan Supermarket', 'and the plain trading name still resolves');
note(
  merchantGroupKey('MICHELLE LOSHUSAN AND CHI, KINGSTO', [], RESOLVER.compiled) ===
    merchantGroupKey('LOSHUSAN SUPERMARKET, KINGSTON 6', [], RESOLVER.compiled),
  'both spellings group together rather than splitting the supermarket in two'
);

/* ---------------------------------------------------------------------------
 * 5b) Local businesses carry a researched category like any other merchant. A
 *     misspelling in the printed name must not cost the match, and two
 *     businesses sharing a district name must stay separate merchants.
 * ------------------------------------------------------------------------ */
note(named("ZIGGGY'S MANOR CENTRE, KINGSTON 8") === "Ziggy's Restaurant & Lounge", 'a doubled letter in the printed name still resolves');
note(categoryOf("ZIGGGY'S MANOR CENTRE, KINGSTON 8") === 'Dining & Takeout', 'and a restaurant is dining, not retail');
note(named('SUPER ELEVEN-PORTMORE, PORTMORE') === 'Super Eleven', 'a branch-suffixed department store resolves');
note(
  categoryOf('SUPER ELEVEN-PORTMORE, PORTMORE') === 'Retail & Department',
  'and a "Super" prefix does not make a department store a supermarket'
);
note(named('LIGUANEA DRUG & GARDEN C, KINGSTON') === 'Liguanea Drug & Garden Centre', 'a pharmacy truncated mid-word resolves');
note(named('LIGUANEA LANE PHARMACY, KINGSTON 6') === 'Liguanea Lane Pharmacy', 'and the other pharmacy in the same district stays its own merchant');

/* ---------------------------------------------------------------------------
 * 6) Category keywords are word-bounded, so a keyword can never be swallowed by
 *    a longer word - most visibly a person's given name on a bank transfer.
 * ------------------------------------------------------------------------ */
note(categoryOf('Transfer to CLAUDENAH SURNAME 1234', 'bank') === 'Uncategorised', 'a given name beginning with a brand word is not a subscription');
note(categoryOf('CLAUDE.AI SUBSCRIPTION') === 'Subscriptions', 'while the brand itself still matches');
note(categoryOf("WENDY'S- VILLAGE, KINGSTON 10") === 'Dining & Takeout', 'a branch called Village is not a holiday villa');
note(categoryOf('SEASIDE VILLAS, NEGRIL') === 'Hotels & Travel', 'while a real villa still matches');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: a chain is one merchant however its branches are printed, an');
console.log('         operator or legal entity resolves to the brand it bills for, and a');
console.log('         person is categorised from a generic title rather than by name.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
