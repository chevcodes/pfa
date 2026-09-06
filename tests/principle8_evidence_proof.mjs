import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { committedFlexible, buildCommittedFlexibleModel } from '../application/analysis/committed-flexible.js';
import { buildAvailableNowModel } from '../application/analysis/available-now.js';
import { resolveBalances, knownAccounts, overlayCashAndDebt } from '../application/analysis/balance-updates.js';
import { cashAndDebt } from '../application/analysis/position.js';

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
console.log(' PRINCIPLE 8 - evidence and in-context action');
console.log('='.repeat(72));

const period = { from: '2026-08-01', to: '2026-08-31' };
const bankRecords = [
  { id: 'in', date: '2026-08-01', direction: 'in', amount: 1000, currency: 'JMD' },
  { id: 'fixed', date: '2026-08-03', direction: 'out', amount: 200, currency: 'JMD', category: 'Rent' },
  { id: 'free', date: '2026-08-04', direction: 'out', amount: 50, currency: 'JMD', category: 'Dining' },
  { id: 'transfer', date: '2026-08-05', direction: 'out', amount: 75, currency: 'JMD', internalTransfer: true },
];
const cardRecords = [
  { id: 'card-spend', date: '2026-08-06', kind: 'spend', amount: 80 },
  { id: 'card-refund', date: '2026-08-07', kind: 'refund', amount: -20 },
];
const split = committedFlexible({
  bankRecords,
  cardRecords,
  cfg: {},
  period,
  groupAssignments: { Rent: 'fixed', Dining: 'free' },
});
const splitModel = buildCommittedFlexibleModel(split, {});
note(split.committed === 200 && split.flexibleSpent === 130, 'the split still totals each spending half once');
note(
  split.evidence.committed.bankIds.join() === 'fixed' && !split.evidence.committed.cardIds.length,
  'fixed expenses carry exactly the bank rows counted'
);
note(
  split.evidence.discretionary.bankIds.join() === 'free' && split.evidence.discretionary.cardIds.join() === 'card-spend',
  'discretionary spending carries exactly its bank and card rows'
);
note(splitModel.evidence === split.evidence, 'the Activity model preserves the exact evidence identities');

const primitive = {
  asOf: '2026-09-21',
  confidence: 'complete',
  income: { date: '2026-09-25' },
  card: { amountExpectedBeforeNextIncome: 40, basis: 'due-before-income', dueDate: '2026-09-23' },
  commitments: [
    { key: 'rent', label: 'Rent', amount: 200, date: '2026-09-22', basis: 'recurring' },
    { key: 'card', label: 'Card payment', amount: 40, date: '2026-09-23', basis: 'card' },
  ],
  layers: {
    availableBalance: 900,
    commitmentsBeforeIncome: 240,
    estimatedAvailableAfterCommitments: 660,
  },
  gaps: [],
};
const available = buildAvailableNowModel(primitive, {});
const fixedExpenses = available.working.find((item) => item.id === 'commitments');
note(
  primitive.commitments.reduce((sum, item) => sum + item.amount, 0) === primitive.layers.commitmentsBeforeIncome &&
    fixedExpenses.amount === primitive.layers.commitmentsBeforeIncome,
  'the Overview figure matches the exact pre-payday payment list'
);

const cardStatements = [{ account: '4321', statementKey: '2026-08', periodEnd: '2026-08-31', newBalance: 300 }];
const cashDebt = cashAndDebt({ bankRecords: [], cardStatements, cfg: {}, asOf: '2026-09-21' });
const accounts = knownAccounts({ cashDebt, cardStatements });
const card = accounts.find((account) => account.ledger === 'card');
const balances = resolveBalances({
  known: accounts,
  updates: [
    {
      id: 'entered-card',
      snapshotId: 's1',
      key: card.key,
      ledger: 'card',
      account: card.account,
      balance: 125,
      asOf: '2026-09-21',
      enteredAt: '2026-09-21T10:00:00Z',
    },
  ],
});
const live = overlayCashAndDebt(cashDebt, balances);
note(live.cardBalance === balances.accounts.find((account) => account.ledger === 'card').balance, 'Position and Card health read the same live card balance');

const controller = read('application', 'app-controller.js');
const activity = read('application', 'ui', 'activity-render.js');
const ahead = read('application', 'ui', 'ahead-render.js');
const preview = read('application', 'ui', 'available-now-preview.js');
const position = read('application', 'ui', 'position-render.js');
const cards = read('application', 'ui', 'cards-render.js');
note(
  (controller.match(/key: 'spendingLens'/g) || []).length === 2 &&
    /spendingLensEvidence\(f\.spendingLens\)/.test(controller) &&
    /visibleRowsSignature[\s\S]{0,500}f\.spendingLens/.test(controller),
  'one registered lens drives filtering, reset state and cached rows in both ledgers'
);
note(
  /spendingLens/.test(activity) && /spendingLens/.test(read('application', 'core', 'shared-helpers.js')),
  'the Activity doors and active-filter summary use the shared lens'
);
note(
  /commitmentIncome\(\)/.test(ahead) && /beforeIncome\.length/.test(ahead) && /anchorId: '#plan-expected-payments'/.test(preview),
  'Overview opens the focused Expected payments card built from the same commitments'
);
note(
  /anchorId: '#activity-card-health'/.test(position) &&
    /balanceUpdates\.openUpdater\(cardBalance\.key\)/.test(position) &&
    /const balanceModel = provenModels\.balances\(\)/.test(cards) &&
    /balanceUpdates\.openUpdater\(liveCard\.key\)/.test(cards),
  'Position reaches Card health, and both surfaces retain the existing balance updater'
);

console.log(` checks: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
