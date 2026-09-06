import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildStatementRemovalPlan } from '../application/analysis/statement-cascade.js';

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

const state = {
  records: [
    { id: 'c-old', source_file: 'card-a.pdf', txn_date: '2026-05-02' },
    { id: 'c-keep', source_file: 'card-b.pdf', txn_date: '2026-06-02' },
  ],
  bankRecords: [
    { id: 'b-old-1', source_file: 'bank-a.pdf', date: '2026-05-03', account: '1111' },
    { id: 'b-old-2', source_file: 'bank-a.pdf', date: '2026-05-04', account: '1111' },
    { id: 'b-keep', source_file: 'bank-b.pdf', date: '2026-06-03', account: '2222' },
  ],
  _cardStatements: [
    { hash: 'cs-a1', source_file: 'card-a.pdf' },
    { hash: 'cs-a2', source_file: 'card-a.pdf' },
    { hash: 'cs-b', source_file: 'card-b.pdf' },
    { hash: 'cs-collision', source_file: 'bank-a.pdf' },
  ],
  _bankStatements: [
    { hash: 'bs-a1', source_file: 'bank-a.pdf' },
    { hash: 'bs-a2', source_file: 'bank-a.pdf' },
    { hash: 'bs-b', source_file: 'bank-b.pdf' },
    { hash: 'bs-collision', source_file: 'card-a.pdf' },
  ],
  tags: [{ id: 'tag-1', txnIds: ['b-old-1', 'b-keep', 'missing'] }],
  transactionSplits: [
    { id: 'split-old', txnId: 'b-old-2' },
    { id: 'split-keep', txnId: 'c-keep' },
  ],
  confirmedIncomeIds: ['b-old-1', 'b-keep', 'missing'],
  refundIncomeIds: ['b-old-2', 'b-keep'],
  goalLog: [{ month: '2026-05' }, { month: '2026-06' }],
  forecastSnapshots: [{ id: 'forecast-1' }],
  bankAccount: '1111',
};

console.log('='.repeat(72));
console.log(' STATEMENT CASCADE - one removal leaves no transaction remnants');
console.log('='.repeat(72));

const before = JSON.stringify(state);
const bankPlan = buildStatementRemovalPlan(state, 'bank-a.pdf', 'bank');
note(JSON.stringify(state) === before, 'planning does not mutate live state before persistence succeeds');
note(bankPlan.removedTransactions === 2, 'every transaction from the selected bank file is removed');
note(bankPlan.state.bankRecords.length === 1 && bankPlan.state.bankRecords[0].id === 'b-keep', 'other bank files remain');
note(bankPlan.state.records.length === 2, 'the other ledger is untouched');
note(bankPlan.bankSummaryHashes.join(',') === 'bs-a1,bs-a2', 'all summaries from a consolidated PDF are deleted');
note(bankPlan.state._bankStatements.length === 2 && bankPlan.state._bankStatements.some((item) => item.hash === 'bs-b'), 'the in-memory statement list matches storage');
note(bankPlan.state._cardStatements.some((item) => item.hash === 'cs-collision'), 'a same-named card summary remains when a bank statement is removed');
note(bankPlan.state.tags[0].txnIds.join(',') === 'b-keep', 'custom-label memberships retain only live transaction ids');
note(bankPlan.state.transactionSplits.length === 1 && bankPlan.state.transactionSplits[0].id === 'split-keep', 'orphaned splits are purged');
note(bankPlan.state.confirmedIncomeIds.join(',') === 'b-keep', 'income adjustments retain only live bank ids');
note(bankPlan.state.refundIncomeIds.join(',') === 'b-keep', 'refund adjustments retain only live bank ids');
note(bankPlan.state.goalLog.length === 1 && bankPlan.state.goalLog[0].month === '2026-06', 'derived goal history for the removed month is purged');
note(bankPlan.state.forecastSnapshots.length === 0, 'forecast snapshots are invalidated');
note(bankPlan.state.bankAccount === 'all', 'a removed selected account cannot remain active');

const cardPlan = buildStatementRemovalPlan(state, 'card-a.pdf', 'card');
note(cardPlan.removedTransactions === 1, 'card removal uses the same cascade');
note(cardPlan.cardSummaryHashes.join(',') === 'cs-a1,cs-a2', 'all card summaries from the file are deleted');
note(cardPlan.state._cardStatements.length === 2 && cardPlan.state._cardStatements.some((item) => item.hash === 'cs-b'), 'other card summaries remain');
note(cardPlan.state._bankStatements.some((item) => item.hash === 'bs-collision'), 'a same-named bank summary remains when a card statement is removed');
note(cardPlan.state.bankRecords.length === 3, 'card removal cannot disturb bank transactions');

const lastCardPlan = buildStatementRemovalPlan({
  records: [{ id: 'only-card', source_file: 'only-card.pdf', txn_date: '2026-07-02' }],
  bankRecords: [],
  _cardStatements: [{ hash: 'legacy-card-summary' }],
  _bankStatements: [],
}, 'only-card.pdf', 'card');
note(lastCardPlan.state._cardStatements.length === 0, 'removing the last card file also clears a legacy summary with no source filename');

const lastBankPlan = buildStatementRemovalPlan({
  records: [],
  bankRecords: [{ id: 'only-bank', source_file: 'only-bank.pdf', date: '2026-07-02' }],
  _cardStatements: [],
  _bankStatements: [{ hash: 'legacy-bank-summary' }],
}, 'only-bank.pdf', 'bank');
note(lastBankPlan.state._bankStatements.length === 0, 'removing the last bank file also clears a legacy summary with no source filename');

const manage = readFileSync(join(root, 'application', 'ui', 'manage-data.js'), 'utf8');
note(/const grouped = new Map\(\)/.test(manage), 'the picker groups statement summaries by imported file');
note(/for \(const st of grouped\.values\(\)\)/.test(manage), 'each imported file appears once in the picker');
note(/every statement in that PDF/.test(manage), 'the removal warning names its complete file scope');
for (const contract of [
  'await Store.restoreSnapshot({',
  'tags: state.tags',
  'transactionSplits: state.transactionSplits',
  'forecastSnapshots: []',
  'financeGoalLog: state.goalLog',
  'planSetAside: state._planSetAside',
]) {
  note(manage.includes(contract), `${contract} is persisted by the removal path`);
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
