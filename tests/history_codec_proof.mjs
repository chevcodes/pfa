import { exportHistory, importHistory } from '../application/output/history-codec.js';

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
console.log(' HISTORY BACKUP - every bank adjustment survives a device move');
console.log('='.repeat(72));

const encrypted = await exportHistory(
  [{ id: 'card-1' }],
  { device: 'test-device' },
  'correct horse battery staple',
  {
    sourceStatements: [{ hash: 'source-1', source_file: 'Card.pdf' }],
    bankRecords: [{ id: 'bank-1' }],
    bankStatements: [{ hash: 'bank-statement-1' }],
    cardStatements: [{ hash: 'card-statement-1' }],
    myAccounts: ['account-1'],
    cardAccounts: ['card-account-1'],
    rules: [{ match: 'merchant', category: 'Groceries', updatedAt: '2026-01-01T00:00:00.000Z' }],
    confirmations: [
      {
        id: 'cf:income:transaction:bank-income-1',
        inference: 'income',
        scope: 'transaction',
        subject: 'bank-income-1',
        answer: true,
        source: 'person',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cf:saving:account:emergency',
        inference: 'saving',
        scope: 'account',
        subject: 'emergency',
        answer: true,
        source: 'person',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    sharedAccounts: ['1111'],
    householdPayees: ['HOUSEHOLD'],
    firstName: 'Alex',
    firstNameSource: 'manual',
    goal: { type: 'cushion', createdAt: '2026-01-01' },
    goalLog: [{ month: '2026-02', met: true }],
    goalBoundary: { kind: 'chosen', amount: 100 },
    planTarget: { v: 2, savedAt: '2026-02-01' },
    planGroups: { essentials: 60 },
    planDraft: { v: 1, targets: { fixed: 55, setAside: 25, free: 20 }, step: 2 },
    customCategories: [{ name: 'Learning', custom: true }],
    tags: [{ id: 'tag-1', name: 'Project' }],
    transactionSplits: [{ id: 'split-1', txnId: 'card-1' }],
    categoryIntentions: [{ id: 'intention-1', category: 'Groceries' }],
    forecastSnapshots: [{ id: 'forecast-1', horizonDays: 90 }],
    manualAssets: [{ id: 'asset-1', value: 500 }],
    balanceUpdates: [{ id: 'snap-1:bank:1234:JMD', key: 'bank:1234:JMD', balance: 250, asOf: '2026-03-10' }],
    investmentStatements: [{ hash: 'investment-1', periodEnd: '2026-02-28', printedTotal: 1000 }],
    goals: [{ id: 'future-goal-1' }],
    workspace: { version: 1, view: 'activity', activityTab: 'transactions' },
    theme: 'dark',
    privacy: 'on',
  }
);
const restored = await importHistory(encrypted, 'correct horse battery staple');
note(restored.records.length === 1, 'transaction history still round-trips');
note(
  restored.userData.confirmations.some((c) => c.id === 'cf:income:transaction:bank-income-1'),
  'income confirmations round-trip'
);
note(
  restored.userData.confirmations.some((c) => c.id === 'cf:saving:account:emergency'),
  'savings-account confirmations round-trip in the same one store'
);
note(restored.ledgerRules.sharedAccounts[0] === '1111', 'shared-account adjustments round-trip');
note(restored.ledgerRules.householdPayees[0] === 'HOUSEHOLD', 'household adjustments round-trip');
note(restored.bank.transactions[0].id === 'bank-1', 'bank transactions round-trip');
note(restored.bank.sourceStatements[0].hash === 'source-1', 'statement duplicate/removal index round-trips');
note(restored.bank.statements[0].hash === 'bank-statement-1', 'bank statement summaries round-trip');
note(restored.bank.cardStatements[0].hash === 'card-statement-1', 'card statement summaries round-trip');
note(restored.rules[0].category === 'Groceries', 'category rules round-trip');
note(restored.profile.firstNameSource === 'manual', 'profile source precedence round-trips');
note(restored.profile.goalLog[0].month === '2026-02', 'goal history round-trips');
note(restored.profile.goalBoundary.amount === 100, 'goal boundary round-trips');
note(restored.planning.target.v === 2, 'saved plan target round-trips');
note(restored.planning.groups.essentials === 60, 'plan assignments round-trip');
note(restored.planning.draft.targets.setAside === 25, 'unfinished plan edits round-trip');
note(restored.userData.customCategories[0].name === 'Learning', 'custom categories round-trip');
note(restored.userData.tags[0].id === 'tag-1', 'tags round-trip');
note(restored.userData.transactionSplits[0].txnId === 'card-1', 'transaction splits round-trip');
note(restored.userData.categoryIntentions[0].id === 'intention-1', 'category intentions round-trip');
note(restored.userData.forecastSnapshots[0].id === 'forecast-1', 'forecast history round-trips');
note(restored.userData.manualAssets[0].id === 'asset-1', 'manual assets round-trip');
note(restored.userData.balanceUpdates[0].balance === 250, 'entered balances round-trip');
note(
  restored.investments.statements[0].hash === 'investment-1' &&
    restored.investments.statements[0].printedTotal === 1000,
  'investment statements round-trip'
);
note(restored.userData.goals[0].id === 'future-goal-1', 'reserved goal records round-trip');
note(restored.workspace.view === 'activity', 'workspace state round-trips');
note(restored.preferences.theme === 'dark', 'theme preference round-trips');
note(restored.preferences.privacy === 'on', 'privacy preference round-trips');

let wrongPass = '';
try {
  await importHistory(encrypted, 'wrong passphrase');
} catch (error) {
  wrongPass = error.message;
}
note(/passphrase/i.test(wrongPass), 'a wrong passphrase reveals no backup contents');

const damaged = JSON.parse(encrypted);
damaged.data = damaged.data.slice(0, -2) + 'AA';
let corrupt = '';
try {
  await importHistory(JSON.stringify(damaged), 'correct horse battery staple');
} catch (error) {
  corrupt = error.message;
}
note(/corrupt/i.test(corrupt), 'a damaged transfer is rejected before restore');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
