import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  accountName,
  accountNameKey,
  accountNamesOnly,
  bankAccountIdentity,
  cleanName,
  NAME_MAX_LENGTH,
} from '../application/core/shared-helpers.js';
import { buildOwnAccountIndex } from '../application/analysis/bank-analysis.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');
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
console.log(' ACCOUNT NAMES - one identity, one lookup, display only');
console.log('='.repeat(72));

console.log('\n -- a name is keyed on the identity reconciliation already uses --');
note(bankAccountIdentity('000123450908') === '0908', 'a full account number reduces to its canonical identity');
note(
  accountNameKey('bank', '000123450908') === accountNameKey('bank', '12-3450-0908') &&
    accountNameKey('bank', '000123450908') === accountNameKey('bank', '…0908'),
  'the same account printed three ways keeps one name'
);
note(
  buildOwnAccountIndex(['000123450908']).get('0908') === bankAccountIdentity('000123450908'),
  'own-account matching and naming share the same identity'
);
note(accountNameKey('investment', 'ncb|635509') === 'investment:ncb|635509', 'an investment account keys on provider and account');
note(accountNameKey('bank', '635509') !== accountNameKey('investment', 'ncb|635509'), 'bank and investment names cannot collide');

console.log('\n -- the name field rules are the existing ones --');
note(cleanName('  Everyday   Chequing  ') === 'Everyday Chequing', 'whitespace is trimmed and collapsed');
note(cleanName('x'.repeat(60)).length === NAME_MAX_LENGTH && NAME_MAX_LENGTH === 40, 'length is capped at the shared 40');
note(cleanName('   ') === '', 'a blank name is empty');
const names = { [accountNameKey('bank', '0908')]: 'Savings', [accountNameKey('bank', '6958')]: 'Savings' };
note(accountName(names, 'bank', '000123450908') === 'Savings' && accountName(names, 'bank', '6958') === 'Savings', 'duplicate names are allowed');
note(accountName(names, 'bank', '1016') === null && accountName(null, 'bank', '0908') === null, 'no name falls back to the account number');
const sanitised = accountNamesOnly({ 'bank:0908': '  Home  ', 'bank:6958': '', 'card:1234': 'Card', 'investment:ncb|1': 7 });
note(JSON.stringify(sanitised) === JSON.stringify({ 'bank:0908': 'Home', 'investment:ncb|1': '7' }), 'a restored backup keeps only well-formed names');

console.log('\n -- one shared lookup everywhere the account is shown --');
const position = read('application', 'ui', 'position-render.js');
const investments = read('application', 'ui', 'investments-render.js');
const activity = read('application', 'ui', 'activity-render.js');
const ahead = read('application', 'ui', 'ahead-render.js');
for (const [file, src] of [
  ['position-render.js', position],
  ['investments-render.js', investments],
  ['activity-render.js', activity],
  ['ahead-render.js', ahead],
]) {
  note(/accountName\(state\.accountNames,/.test(src), `${file} reads names through the shared lookup`);
}
note((activity.match(/Bank (?:\\u00b7|·) /g) || []).length === 1, 'the bank ledger label is built in one place');
note(!/Account \$\{String\(current\)\.slice\(-4\)\} only`\s*:/.test(activity), 'the account filter summary uses the name');
note(/label: accountName\(state\.accountNames, 'investment', item\.accountKey\) \|\| item\.label/.test(investments), 'the investment segment takes its labels from the same lookup');
note(/renameControl\(\{\s*kind: 'bank'/.test(position) && /renameControl\(\{\s*kind: 'investment'/.test(position), 'bank and investment accounts rename through one control');
note(/friendly\s*\?\s*chartInfo[\s\S]{0,700}\]\.filter\(Boolean\)/.test(position), 'an unnamed account never prints a stray "null" beside its number');

console.log('\n -- saved, undoable, and wiped only by clear-all --');
const controller = read('application', 'app-controller.js');
const manage = read('application', 'ui', 'manage-data.js');
note(/metaKey: 'accountNames',\s*stateKey: 'accountNames'/.test(position) && /changeSetting: \(\.\.\.args\) => reversible\.change\(\.\.\.args\)/.test(controller), 'a rename goes through the reversible setting change');
note(/state\.accountNames = \(await storedObject\('accountNames'\)\) \|\| \{\}/.test(controller), 'names load at boot');
note(/state\.manualAssets,\s*state\.accountNames,/.test(controller), 'a rename invalidates every cached view');
note(/state\.investmentAccount = 'all';\s*state\.accountNames = \{\};/.test(controller), 'the reset mirrors clear-all in memory');
note(/accountNames: null,/.test(manage) && (manage.match(/accountNames/g) || []).length === 1, 'clear-all wipes names and removing a file leaves them dormant');

console.log('\n -- provenance surfaces keep the real identifier --');
const copyStart = position.indexOf('function copySummary');
const copyBlock = position.slice(copyStart, position.indexOf('function renderPositionHeader'));
note(copyStart > -1 && !/accountName/.test(copyBlock), 'the copied summary never uses a friendly name');
for (const file of ['csv-export.js', 'report-render.js']) {
  note(!/accountName/.test(read('application', 'output', file)), `${file} keeps the account number`);
}
const codec = read('application', 'output', 'history-codec.js');
note((codec.match(/accountNamesOnly\(/g) || []).length === 2, 'the encrypted backup carries names in and out through one sanitiser');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
