import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listCategoryRules,
  upsertCategoryRule,
  merchantRuleKeyFromDescription,
} from '../settings/category-rules.js';
import { bankRuleMatch } from '../application/analysis/bank-categorise.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
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
console.log(' PRINCIPLE 8 - actions in the room where the need is visible');
console.log('='.repeat(72));

// -----------------------------------------------------------------------
// 1) A rule stops right where you see it firing. The card and bank pickers
//    find "the rule governing this row" with the SAME key the categoriser
//    itself matches on - proved directly here against the real primitives,
//    since that is exactly what a wrong finding would silently mis-file.
// -----------------------------------------------------------------------
const { rules } = upsertCategoryRule([], { match: 'AMAZON', category: 'Shopping' }, new Date());
const listed = listCategoryRules(rules, [], null);
// The SAME lookup category-picker.js's governingRule() does: the row's own
// match text, reduced to a key, found among the rules the app already lists.
const findRule = (matchText) => {
  const key = merchantRuleKeyFromDescription(matchText);
  return key ? listed.find((r) => r.key === key) || null : null;
};
note(
  findRule('AMAZON, Seattle WA')?.category === 'Shopping',
  'a card row filed under a ruled merchant finds its own rule'
);
note(!findRule('NETFLIX'), 'an unrelated merchant finds no rule to stop');

const bankRow = { description: 'AMAZON, MKTPLACE PAYMENT' };
note(
  findRule(bankRuleMatch(bankRow))?.category === 'Shopping',
  'a bank row is matched through the same bankRuleMatch expression the categoriser reads it back with'
);
const bankRowNoDescription = { type: 'INTEREST PAYMENT' };
note(
  !findRule(bankRuleMatch(bankRowNoDescription)),
  'a bank row with no matching rule (identified only by its statement type) finds none'
);

// -----------------------------------------------------------------------
// 2) Source contracts: the inline "Stop rule" action reuses dropCategoryRule
//    directly (no navigation away), on BOTH the card and bank halves of the
//    picker, and the writer is actually threaded in from app-controller.js.
// -----------------------------------------------------------------------
const picker = read('application', 'ui', 'category-picker.js');
const controller = read('application', 'app-controller.js');
note(
  /function governingRule\(/.test(picker) && /function stopRuleButton\(/.test(picker),
  'the picker computes the governing rule and builds one inline action from it'
);
note(
  /stopRuleButton\(row\.raw_description\)/.test(picker) &&
    /stopRuleButton\(bankRuleMatch\(row\)\)/.test(picker),
  'both the card and bank pickers offer the inline stop action, each keyed on its own ledger’s match text'
);
note(
  /onclick: \(\) => \{\s*closePicker\(\);\s*dropCategoryRule\(rule\);/.test(picker),
  'stopping a rule calls the SAME writer Data & settings uses - no parallel removal path'
);
note(
  /'dropCategoryRule',/.test(picker) && /dropCategoryRule,\s*\}\s*=\s*ctx;/.test(picker),
  'dropCategoryRule is a required dependency, not an optional extra a caller can forget'
);
note(
  /dropCategoryRule,\s*\}\);/.test(controller),
  'app-controller.js actually threads dropCategoryRule into the picker it constructs'
);

// -----------------------------------------------------------------------
// 3) Statement reconciliation: one dialog, extended with a filter and a
//    reason, carries the job for all three ledgers - never a second,
//    parallel filtered view growing beside it.
// -----------------------------------------------------------------------
const manageData = read('application', 'ui', 'manage-data.js');
const accounts = read('application', 'ui', 'accounts-render.js');
const cards = read('application', 'ui', 'cards-render.js');
note(
  /async function openRemoveStatement\(opts = \{\}\)/.test(manageData) &&
    /const \{ match = null, reason = null \} = opts;/.test(manageData),
  'openRemoveStatement takes an optional filter and reason rather than a second function'
);
note(
  /\.filter\(\(st\) => !match \|\| match\(st\)\)/.test(manageData) &&
    /investmentRows\(match\)/.test(manageData),
  'the filter applies to card, bank AND investment statements alike'
);
note(
  /if \(match && !list\.children\.length\)/.test(manageData),
  'a filtered door that turns up nothing says so rather than opening empty'
);
note(
  /const heading = reason \|\| 'Imported files';/.test(manageData),
  'a filtered door states why it is showing only some files, on arrival'
);
note(
  /reviewStatements\(\{\s*match: \(st\) => st\.ledger === 'bank' && !st\.reconciled,/.test(accounts) &&
    /totalOk < totalN/.test(accounts),
  'Account statements offers Review only while something is unreconciled, filtered to the bank ledger'
);
note(
  /st\.ledger === 'bank' && st\.account === g\.account && !st\.reconciled/.test(accounts) &&
    /g\.failed \? 'button' : 'div'/.test(accounts),
  'each per-account tile that names a problem IS the door to it; one that reconciles fully stays a plain summary'
);
note(
  /reviewStatements\(\{\s*match: \(st\) => st\.ledger === 'card' && failingFiles\.has\(st\.source_file\),/.test(
    cards
  ) && /reconciled < stmts\.length/.test(cards),
  // Card statements are grouped as FILES for removal but reconciled as
  // STATEMENTS (a PDF can hold several), in separate stores with no shared
  // field - so this filter matches by source file, never by a field the
  // file-level record does not carry.
  'Card statements offers the same Review action, matched by the file a failing statement actually came from'
);
note(
  /st\.ledger === 'investment' && failsIntegrity\(st\)/.test(controller) &&
    /reconciled < statements\.length/.test(controller),
  'Investment statements reuses the SAME integrity check for its count and its filter, so they cannot drift apart'
);
note(
  /let openRemoveStatementRef;/.test(controller) &&
    /reviewStatements: \(\.\.\.args\) => openRemoveStatementRef\(\.\.\.args\)/.test(controller) &&
    /openRemoveStatementRef = openRemoveStatement;/.test(controller),
  'accounts-render.js (built before createManageData) reaches the dialog through the established late-bound-ref idiom'
);
note(
  /reviewStatements: openRemoveStatement,/.test(controller),
  'cards-render.js (built after createManageData) reaches the same dialog directly'
);

console.log(` checks: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
