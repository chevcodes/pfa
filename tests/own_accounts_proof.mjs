/* own_accounts_proof.mjs - telling the app which accounts are yours.
 *
 * A declared account is ONE kind of record: a `transfer` answer about
 * `own:<last4>` in the shared confirmation store. The first half proves what a
 * person sees: a declared account turns the transfers to it into moves of their
 * own money, a number that only looks like theirs does not, and their answer
 * outranks the app's guess in both directions. The second half is the
 * build-failing guard: no second list of own accounts may exist again, and
 * everything that used to read or write the old one goes through the store. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  applyAnswer,
  declaredOwnAccounts,
  makeConfirmation,
  migrateLegacyConfirmations,
  ownSubject,
  transferSubject,
  transferSubjects,
} from '../application/analysis/confirmations.js';
import { buildOwnAccountIndex, classifyInternalTransfers } from '../application/analysis/bank-analysis.js';
import {
  ownAccountRows,
  parseAccountEntry,
  suggestedOwnAccounts,
} from '../application/analysis/own-accounts.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');

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
console.log(' OWN ACCOUNTS - one record, one resolver, two doors');
console.log('='.repeat(72));

const row = (id, description, extra = {}) => ({
  id,
  date: '2026-01-10',
  account: '000111222333',
  type: 'TRANSFER',
  description,
  direction: 'out',
  amount: 1000,
  currency: 'JMD',
  ...extra,
});
const declare = (...tails) =>
  tails.reduce(
    (list, tail) => applyAnswer(list, { inference: 'transfer', subject: ownSubject(tail), answer: true }).confirmations,
    []
  );
const classify = (rows, confirmations = [], names = null) =>
  classifyInternalTransfers(rows, [], [], null, confirmations, names);

console.log('\n -- a declared account turns its transfers into your own money --');
{
  const rows = [row('a', 'TRANSFER TO 7777'), row('b', 'Transfer from Pat Example 7777', { direction: 'in' })];
  const before = classify(rows);
  note(before.every((r) => !r.internalTransfer), 'an account the app has never seen counts as money spent');
  note(before.every((r) => r.transferAccount === '7777'), 'each row names the account it is about');
  const after = classify(rows, declare('7777'));
  note(after.every((r) => r.internalTransfer), 'declaring it moves every transfer to or from it out of spending');
  note(after.every((r) => r.counterpartyKey === 'own:7777'), 'and groups them as one account');
  note(classify(rows, []).every((r) => !r.internalTransfer), 'removing the declaration puts them back');
  note(
    JSON.stringify(declaredOwnAccounts(declare('7777', '8888'))) === JSON.stringify(['7777', '8888']),
    'declared accounts read back from the store'
  );
}

console.log('\n -- a number that merely looks like yours is not yours --');
{
  const confirmations = declare('7777');
  const shop = classify([row('s', 'POS PURCHASE 7777', { type: 'POINT OF SALE' })], confirmations)[0];
  note(!shop.internalTransfer, 'a store or reference number is not an account, so a declared tail does not claim it');
  const bill = classify([row('b', 'BPYMT:5557777/SOME UTILITY', { type: 'BPYMT' })], confirmations)[0];
  note(bill.transferAccount === '', 'a bill payment reference is never offered as an account');
  note(
    classify([row('w', 'Payment of 7777 things')], [])[0].transferAccount === '',
    'a narrative that is not a transfer never offers an account'
  );
  const statement = classify([row('t', 'POS PURCHASE 2333', { type: 'POINT OF SALE' })])[0];
  note(statement.internalTransfer, 'an account a statement vouches for still matches wherever its number appears');
}

console.log('\n -- digits must agree over the shorter number --');
{
  const own = { account: '000999111222' };
  const same = classifyInternalTransfers([row('x', 'TRANSFER TO 111222', own)], [], []);
  note(same[0].internalTransfer, 'a printed 6-digit number that equals the end of the account matches');
  const other = classifyInternalTransfers([row('y', 'TRANSFER TO 555222', own)], [], []);
  note(!other[0].internalTransfer, 'a 6-digit number that only shares the last 4 digits does not');
  const tail = classifyInternalTransfers([row('z', 'TRANSFER TO 1222', own)], [], []);
  note(tail[0].internalTransfer, 'a printed 4-digit tail still matches');
  const index = buildOwnAccountIndex(['000123450908']);
  note(index.get('0908') === '0908' && index.strong.has('0908'), 'the index still answers by token');
}

console.log('\n -- your answer outranks the guess, both ways --');
{
  const rows = [row('a', 'TRANSFER TO 7777')];
  const no = applyAnswer(declare('7777'), { inference: 'transfer', subject: ownSubject('7777'), answer: false }).confirmations;
  note(!classify(rows, no)[0].internalTransfer, 'No about an account is an answer and keeps it out');
  const statementRow = row('s', 'TRANSFER TO 2333');
  const statementNo = [makeConfirmation({ inference: 'transfer', subject: ownSubject('2333'), answer: false })];
  note(!classify([statementRow], statementNo)[0].internalTransfer, 'No outranks a statement account too');
  const probe = classify(rows)[0];
  const nameYes = [makeConfirmation({ inference: 'transfer', subject: probe.transferKey, answer: true })];
  note(classify(rows, nameYes)[0].internalTransfer, 'an answer given about the name before this change still applies');
  const both = [...nameYes, makeConfirmation({ inference: 'transfer', subject: ownSubject('7777'), answer: false })];
  note(!classify(rows, both)[0].internalTransfer, 'an answer about the account outranks one about the name');
  note(
    JSON.stringify(transferSubjects(probe)) === JSON.stringify([probe.id, 'own:7777', probe.transferKey].filter(Boolean)),
    'the most specific subject is asked first'
  );
  note(transferSubject(probe) === 'own:7777', 'and is the one an answer is written about');
  note(transferSubject({ transferKey: 'ext:X' }) === 'ext:X', 'a row with no account falls back to the name');
}

console.log('\n -- a name you gave the account is what the rows say --');
{
  const rows = [row('a', 'TRANSFER TO 7777')];
  const named = classify(rows, declare('7777'), { 'bank:7777': 'Other bank savings' })[0];
  note(named.counterpartyLabel === 'Other bank savings', 'the row reads the friendly name');
  note(named.counterpartyKey === 'own:7777', 'and its key does not change with the name');
  note(classify(rows, declare('7777'))[0].counterpartyLabel === 'Account 7777', 'unnamed accounts read as before');
}

console.log('\n -- what goes into the field --');
{
  note(parseAccountEntry('').error === 'empty', 'nothing typed is not an error to shout about');
  note(parseAccountEntry('12 3').error === 'short', 'fewer than four digits is refused');
  note(parseAccountEntry('ab1234').error === 'characters', 'letters are refused');
  note(parseAccountEntry('0012 3456 7890').id === '7890', 'a longer number reduces to the identity the app uses everywhere');
  note(parseAccountEntry(' 9876 ').id === '9876', 'spaces are ignored');
}

console.log('\n -- the list --');
{
  const list = ownAccountRows({
    bankRecords: [{ account: '000111222333' }, { account: '000111222333' }],
    cardAccounts: ['4111222299990001'],
    confirmations: declare('7777', '2333'),
  });
  const by = Object.fromEntries(list.map((r) => [r.id, r]));
  note(list.length === 3, 'each account appears once');
  note(by['2333'].source === 'statement' && !by['2333'].removable, 'a statement account cannot be removed from here');
  note(by['0001'].source === 'card' && !by['0001'].removable, 'a card is listed and is not removable');
  note(by['7777'].source === 'declared' && by['7777'].removable, 'an account the person added can be removed');
}

console.log('\n -- asking about the one that matters --');
{
  const rows = [];
  for (let m = 1; m <= 6; m++) {
    rows.push(row('big' + m, 'TRANSFER TO 7777', { date: `2026-0${m}-05`, amount: 90000 }));
    rows.push(row('pos' + m, 'POS PURCHASE', { date: `2026-0${m}-06`, amount: 10000, type: 'POINT OF SALE' }));
  }
  for (let m = 1; m <= 6; m++) rows.push(row('small' + m, 'TRANSFER TO 6666', { date: `2026-0${m}-07`, amount: 100 }));
  rows.push(row('once', 'TRANSFER TO 5555', { date: '2026-02-01', amount: 500000 }));
  const classified = classify(rows);
  const asks = suggestedOwnAccounts(classified, []);
  note(asks.length === 1 && asks[0].id === '7777', 'only the account that moves real money is raised');
  note(asks[0].months === 6 && asks[0].rows === 6, 'with how often it happened');
  note(suggestedOwnAccounts(classified, declare('7777')).length === 0, 'an answered account is never raised again');
  const no = [makeConfirmation({ inference: 'transfer', subject: ownSubject('7777'), answer: false })];
  note(suggestedOwnAccounts(classify(rows, no), no).length === 0, 'and neither is one the person said is not theirs');
  note(suggestedOwnAccounts(classified, [], { minMonths: 7 }).length === 0, 'a single month or two never raises a question');
  const foreign = classified.map((r) => ({ ...r, currency: 'USD' }));
  note(suggestedOwnAccounts(foreign, []).length === 0, 'money in another currency is not counted against the base figures');
}

console.log('\n -- what a person already told the old list survives --');
{
  const moved = migrateLegacyConfirmations({ ownAccounts: ['0001 2345 7777', '  ', '12'] }, []);
  note(moved.length === 1 && moved[0].subject === 'own:7777' && moved[0].answer === true, 'the old list becomes declared accounts');
  note(classify([row('a', 'TRANSFER TO 7777')], moved)[0].internalTransfer, 'and they work at once');
  const again = migrateLegacyConfirmations({ ownAccounts: ['7777'] }, moved);
  note(again.length === 1, 'moving twice does not duplicate');
  const said = [makeConfirmation({ inference: 'transfer', subject: 'own:7777', answer: false })];
  note(
    migrateLegacyConfirmations({ ownAccounts: ['7777'] }, said)[0].answer === false,
    'an answer already given is never overwritten by the old list'
  );
}

console.log('\n -- guard: one record, one writer, nothing private --');
{
  const controller = read('application', 'app-controller.js');
  const intake = read('application', 'ui', 'app-intake.js');
  const manage = read('application', 'ui', 'manage-data.js');
  const exporter = read('application', 'output', 'data-export.js');
  const section = read('application', 'ui', 'own-accounts-section.js');
  const control = read('application', 'ui', 'confirm-control.js');
  const personas = read('application', 'sample-data', 'mock-personas.js');
  const accounts = read('application', 'ui', 'accounts-render.js');

  note(!/state\.myAccounts/.test(controller + intake + exporter + accounts), 'no screen holds a second list of own accounts');
  note(!/'bankMyAccounts'/.test(intake + manage + personas + exporter), 'nothing writes the old list any more');
  note(
    (controller.match(/'bankMyAccounts'/g) || []).length === 2 && /ownAccounts: await storedArray\('bankMyAccounts'\)/.test(controller),
    'the old key is read once to be moved, and cleared once moved'
  );
  note(/ownAccounts: bank\.myAccounts/.test(exporter), 'an older backup restores its list as declared accounts');
  note(!/myAccounts: state/.test(exporter), 'a new backup carries them as confirmations and writes no second list');
  note(!/Store\.confirmations|applyAnswer\(/.test(section), 'the list writes only through the one answer writer');
  note(/retract/.test(section) && /async function retract/.test(control), 'removing is the same writer, with the same undo');
  note(/transferSubject/.test(control), 'the row question is asked about the account when the row names one');
  note(
    /transferSubject\(row\)/.test(read('application', 'analysis', 'category-flow.js')) &&
      /transferSubjects\(row\)/.test(read('application', 'analysis', 'credit-classifier.js')),
    'the category picker and the credit classifier read the same subject'
  );
  note(
    /ownAccountAsks: ownAccounts\.attentionItems/.test(controller) && /ownAccountAsks\(\)/.test(read('application', 'ui', 'overview-render.js')),
    'the question is raised in the list Overview already uses'
  );
  note(
    /Object\.values\(state\.accountNames \|\| \{\}\)\.includes\(given\)\) return given/.test(accounts),
    'a name the person gave an account is shown as typed, by the one function every screen cleans names through'
  );
  note(
    /fold\('settings-fold-own-accounts'/.test(controller) && /foldSection\('Your accounts'/.test(controller),
    'the list sits in Data & settings in both renderers'
  );
}

console.log('\n' + '='.repeat(72));
console.log(` checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
if (fail) process.exit(1);
