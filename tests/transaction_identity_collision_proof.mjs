import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  mergeBankTransactions,
  mergeTransactions,
  transactionIdentity,
} from '../application/statements/read-statements.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
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
console.log(' TRANSACTION IDENTITY COLLISIONS - verify fields after the hash');
console.log('='.repeat(72));

const cardA = {
  id: 'deadbeef',
  account: '4444',
  txn_date: '2026-05-01',
  posting_date: '2026-05-02',
  ref: 'REF-A',
  description: 'First transaction',
  amount: 100,
};
const cardB = {
  ...cardA,
  ref: 'REF-B',
  description: 'Second transaction',
  amount: 200,
};
const cardCollision = mergeTransactions([], [cardA, cardB]);
note(cardCollision.records.length === 2, 'two different card rows with one forced hash both survive');
note(cardCollision.records[1].id === 'deadbeef#1', 'only the colliding row receives a collision suffix');
note(cardCollision.hashCollisions === 1, 'the collision is reported to the intake path');
const cardRepeat = mergeTransactions(cardCollision.records, [cardB]);
note(cardRepeat.records.length === 2 && cardRepeat.alreadyPresent === 1, 'the verified card row still deduplicates on re-import');

const bankA = {
  id: 'cafebabe',
  account: '1111',
  date: '2026-05-01',
  description: 'First transaction',
  signedAmount: -100,
  balanceAfter: 900,
  sseq: 0,
};
const bankB = { ...bankA, description: 'Second transaction', signedAmount: -200, balanceAfter: 700 };
const bankCollision = mergeBankTransactions([], [bankA, bankB]);
note(bankCollision.records.length === 2, 'two different bank rows with one forced hash both survive');
note(bankCollision.records[1].id === 'cafebabe#1', 'bank collisions receive the same stable suffix rule');
note(bankCollision.hashCollisions === 1, 'bank collisions are reported to the intake path');

const normal = {
  txn_date: '2026-06-01',
  posting_date: '2026-06-02',
  ref: 'NORMAL-REF',
  description: 'Normal transaction',
  amount: 300,
};
const normalMerged = mergeTransactions([], [normal]);
note(
  JSON.stringify(normalMerged.records) === JSON.stringify([{ ...normal, id: transactionIdentity(normal) }]),
  'a normal transaction remains byte-for-byte unchanged in storage'
);
note(normalMerged.hashCollisions === 0, 'normal imports do not take the collision path');

const reader = readFileSync(join(root, 'application', 'statements', 'read-statements.js'), 'utf8');
const intake = readFileSync(join(root, 'application', 'ui', 'app-intake.js'), 'utf8');
note(
  (reader.match(/matchingTransaction\(records, rec\)/g) || []).length === 2 &&
    (reader.match(/sameTransactionIdentityFields\(/g) || []).length === 2,
  'both merge paths use one field-level comparison'
);
note(!/byId\.has\(rec\.id\)/.test(reader), 'a hash alone cannot discard an incoming row');
note((intake.match(/hashCollisionWarning\(/g) || []).length >= 4, 'bank and both card imports surface detected collisions');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
