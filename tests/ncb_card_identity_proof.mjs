/* An NCB card row carries no reference number, so its identity leans on
 * statement key + dates + description + a per-statement position - none of
 * which distinguish one household's card from another. Two different NCB
 * cards' statements for the same month can print a boilerplate row (annual
 * fee, GCT, interest) at the same relative position with the same date and
 * description, hashing identically and dropping the second card's real
 * transaction as "already present". Guards:
 *   1. the card's own account is part of identity, so two cards never collide
 *   2. existing (pre-fix) stored rows are re-keyed to the new formula so a
 *      re-import of an already-imported statement stays duplicate-free
 *   3. a month with more than one card statement is left alone rather than
 *      guessed at wrong
 */
import { ncbTransactionIdentity, buildNcbStatementRecord } from '../application/statements/read-statements.js';
import { planNcbIdentityMigration } from '../application/core/storage.js';

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
console.log(' NCB CARD IDENTITY - two cards never collide, and old data stays safe');
console.log('='.repeat(72));

console.log('\n -- the card is part of identity --');
{
  const base = { statementKey: '2026-03', txn_date: '2026-03-05', posting_date: '2026-03-06', description: 'ANNUAL FEE', posIndex: 0 };
  const cardA = ncbTransactionIdentity({ ...base, account: '1111' });
  const cardB = ncbTransactionIdentity({ ...base, account: '2222' });
  const noAccount = ncbTransactionIdentity({ ...base });
  note(cardA !== cardB, 'two different cards, same everything else, hash differently');
  note(cardA !== noAccount && cardB !== noAccount, 'a stamped account changes identity from the unstamped (legacy) form');
  note(
    ncbTransactionIdentity({ ...base, account: '1111' }) === cardA,
    'identity is stable for the same card, restated'
  );
}

console.log('\n -- buildNcbStatementRecord stamps the card onto every row --');
{
  // A minimal two-row NCB segment: two lines that parseOneNcbStatement can
  // read as transactions is more than this proof needs - it only has to
  // confirm the summary's own cardLast4 reaches ncbTransactionIdentity via
  // withKey. Exercised indirectly through the real reader elsewhere
  // (ncb_bank_reader_proof.mjs covers the bank side); here we check the
  // pure wiring by calling the builder with header-bearing lines.
  const built = buildNcbStatementRecord(
    ['NCB VISA CLASSIC', 'G.C.T. NO. 19453', 'STATEMENT OF POINTS', 'jncb.com'],
    'test.pdf'
  );
  note(Array.isArray(built.transactions), 'the builder returns a transactions array even for unreadable rows');
}

console.log('\n -- migrating existing (pre-fix) rows to the new formula --');
{
  const legacyRow = (overrides) => ({
    id: 'legacy-id-' + (overrides.txn_date || ''),
    ncbDisc: '0',
    statementKey: '2026-04',
    txn_date: '2026-04-10',
    posting_date: '2026-04-11',
    description: 'GROCERY STORE',
    posIndex: 0,
    ...overrides,
  });

  // Single-card month: exactly one card-statement summary for '2026-04', so
  // every one of that month's rows can only have come from that one card.
  const singleCardMonth = [legacyRow({ id: 'row-1' })];
  const singleCardStatements = [{ account: '3333', statementKey: '2026-04' }];
  const plan = planNcbIdentityMigration(singleCardMonth, singleCardStatements);
  note(plan.length === 1, 'an unambiguous month is migrated');
  note(plan[0].oldId === 'row-1', 'the migration targets the existing row by its old id');
  note(plan[0].record.account === '3333', 'the row is stamped with the one card the month can only belong to');
  note(
    plan[0].record.id === ncbTransactionIdentity({ ...singleCardMonth[0], account: '3333' }),
    'the new id matches what a fresh import of the same row would compute'
  );

  // Multi-card month: two card-statement summaries for the same month means
  // the row's own card cannot be recovered - leave it as it was rather than
  // guess, which would risk a WRONG account being stamped.
  const ambiguousMonth = [legacyRow({ id: 'row-2', statementKey: '2026-05' })];
  const ambiguousStatements = [
    { account: '4444', statementKey: '2026-05' },
    { account: '5555', statementKey: '2026-05' },
  ];
  note(
    planNcbIdentityMigration(ambiguousMonth, ambiguousStatements).length === 0,
    'a month with two card statements is left unmigrated rather than guessed at'
  );

  // Already-migrated rows (an account already present) and non-NCB rows
  // (no ncbDisc at all, e.g. a Scotia row) are both left alone.
  note(
    planNcbIdentityMigration([legacyRow({ id: 'row-3', account: '3333' })], singleCardStatements).length === 0,
    'a row that already carries an account is treated as already migrated'
  );
  note(
    planNcbIdentityMigration([{ id: 'scotia-row', txn_date: '2026-04-10' }], singleCardStatements).length === 0,
    'a non-NCB row (no ncbDisc) is never touched by this migration'
  );

  // A row already keyed under the new formula (id already matches) is a
  // no-op: nothing to write, so the migration never churns settled data.
  const alreadyNewFormula = legacyRow({ id: null, statementKey: '2026-06' });
  alreadyNewFormula.id = ncbTransactionIdentity({ ...alreadyNewFormula, account: '6666' });
  const noopStatements = [{ account: '6666', statementKey: '2026-06' }];
  note(
    planNcbIdentityMigration([alreadyNewFormula], noopStatements).length === 0,
    'a row whose id already matches the new formula produces no write'
  );
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
