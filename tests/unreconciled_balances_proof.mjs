import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const bu = await import('../application/analysis/balance-updates.js');
const { cashAndDebt, recordedNetWorth, financialPositionSummary } = await import('../application/analysis/position.js');

console.log('='.repeat(72));
console.log(' UNRECONCILED BALANCES - a fresh present, never a rewritten past');
console.log('='.repeat(72));

const TODAY = '2026-09-15';
const rows = [
  { date: '2026-06-10', account: '000111222', currency: 'JMD', direction: 'in', amount: 100, balanceAfter: 1000, seq: 1 },
  { date: '2026-06-28', account: '000111222', currency: 'JMD', direction: 'out', amount: 50, balanceAfter: 950, seq: 2 },
  { date: '2026-06-20', account: '000333444', currency: 'JMD', direction: 'in', amount: 500, balanceAfter: 5000, seq: 1 },
  { date: '2026-06-15', account: '000555666', currency: 'USD', direction: 'in', amount: 10, balanceAfter: 200, seq: 1 },
];
const bankStatements = [{ account: '000111222', period: '01 Jun 2026 - 30 Jun 2026' }];
const cardStatements = [{ account: '4321', statementKey: '2026-06', periodEnd: '2026-06-25', newBalance: 300, creditLimit: 1000 }];
const cd = cashAndDebt({ bankRecords: rows, cardStatements, cfg: {}, asOf: TODAY });
const known = bu.knownAccounts({ cashDebt: cd, bankRecords: rows, bankStatements, cardStatements });
const keyOf = (account) => known.find((item) => item.account === account).key;
const CHECKING = keyOf('000111222');
const SAVINGS = keyOf('000333444');
const DOLLARS = keyOf('000555666');
const CARD = keyOf('4321');

console.log('\n -- the app only offers accounts its statements already know --');
note(known.length === 4, 'three bank accounts and the card are offered');
note(known.find((item) => item.key === CHECKING).anchor.date === '2026-06-30', "an account's anchor is its statement's closing date");
note(known.find((item) => item.key === SAVINGS).anchor.date === '2026-06-20', 'without a statement summary, the last recorded row dates it');
note(bu.knownAccounts({ cashDebt: null, bankRecords: [], bankStatements: [], cardStatements: [] }).length === 0, 'no statements, no feature');

console.log('\n -- typing is the confirmation --');
note(bu.parseBalanceInput('1,234.50') === 1234.5, 'thousands separators are read');
note(bu.parseBalanceInput('US$ 20') === 20, 'a currency prefix is ignored');
note(bu.parseBalanceInput('(7)') === -7 && bu.parseBalanceInput('-5') === -5, 'an overdrawn balance can be typed');
note(bu.parseBalanceInput('   ') === null, 'a blank is a blank, not a zero');
note(Number.isNaN(bu.parseBalanceInput('abc')) && Number.isNaN(bu.parseBalanceInput('1.2.3')), 'a mangled figure is refused rather than guessed');

console.log('\n -- a partial update never wipes good data --');
const first = bu.snapshotRecords({
  known,
  entries: { [CHECKING]: { value: '1100' }, [DOLLARS]: { value: '210' } },
  today: '2026-08-01',
  now: '2026-08-01T09:00:00Z',
  snapshotId: 's-aug',
});
note(first.records.length === 2 && first.blanks.length === 2, 'two typed, two left blank');
note(!first.records.some((record) => record.balance === 0), 'no blank is stored as zero');
const second = bu.snapshotRecords({
  known,
  entries: {
    [CHECKING]: { value: '1200' },
    [SAVINGS]: { value: '5000', carried: true, carriedValue: 5000 },
    [CARD]: { value: '450' },
  },
  today: TODAY,
  now: `${TODAY}T09:00:00Z`,
  snapshotId: 's-sep',
});
const statementBeaten = {
  id: 'old',
  snapshotId: 's-jun',
  key: CHECKING,
  ledger: 'bank',
  account: '000111222',
  currency: 'JMD',
  balance: 999,
  asOf: '2026-06-20',
  enteredAt: '2026-06-20T09:00:00Z',
};
const updates = [...first.records, ...second.records, statementBeaten];
const balances = bu.resolveBalances({ known, updates });
const row = (key) => balances.accounts.find((item) => item.key === key);
note(row(CHECKING).balance === 1200 && row(CHECKING).asOf === TODAY, 'newest wins per account');
note(row(DOLLARS).balance === 210 && row(DOLLARS).asOf === '2026-08-01', 'an account left out keeps its earlier figure and its earlier date');
note(row(SAVINGS).update.carried === true && row(SAVINGS).inSnapshot, 'an unchanged account carries forward into the new snapshot');
note(balances.snapshot.held.map((item) => item.key).join() === DOLLARS, 'the snapshot names exactly what it did not refresh');

console.log('\n -- the statement wins --');
note(balances.superseded.length === 1 && balances.superseded[0].id === 'old', 'an entry dated inside a statement period is superseded');
note(!balances.accounts.some((item) => item.update && item.update.id === 'old'), 'and is never used for a figure');
const reconciled = bu.reconcileEnteredBalances({ balances, bankRecords: rows, cfg: {} });
note(reconciled.comparisons.length === 1 && reconciled.comparisons[0].actual === 1000, 'the check reads the ledger balance on the day that was typed');
note(reconciled.comparisons[0].difference === -1 && !reconciled.comparisons[0].unusual, 'a small gap is not flagged as unusual');
const message = bu.reconciliationMessage(reconciled.comparisons, { money: (value) => `$${value}`, nameOf: () => 'Checking' });
note(/within \$1/.test(message) && !/retire/i.test(message), 'the one-time message is calm and uses reconciled wording');

console.log('\n -- the present moves; history does not --');
const live = bu.overlayCashAndDebt(cd, balances);
note(live.liquid === 6200 && live.cardBalance === 450, 'cash and card read the entered balances');
note(live.foreign.USD === 210, 'a foreign balance stays native and separate');
note(live.cashFlow === cd.cashFlow && live.incomeStability === cd.incomeStability, 'typical income and cash flow are the reconciled objects, untouched');
note(cd.liquid === 5950 && cd.cardBalance === 300, 'the reconciled figures themselves are not mutated');
note(bu.overlayCashAndDebt(cd, bu.resolveBalances({ known, updates: [] })) === cd, 'with nothing entered, Position is exactly the reconciled model');
const nw = recordedNetWorth({ reconciled: live, asOf: TODAY });
note(nw.lines.filter((line) => line.source === 'entered').length === 3, 'every entered figure is marked as entered');
note(nw.lines.find((line) => line.currency === 'USD').asOf === '2026-08-01', 'a held figure keeps its own date');
const summary = financialPositionSummary({ cashDebt: cd, netWorth: recordedNetWorth({ reconciled: cd, asOf: TODAY }), cfg: {}, asOf: TODAY });
note(summary.rows.find((r) => r.key === 'cash-on-hand').value === 5950, 'the shareable summary stays statement-confirmed');

console.log('\n -- two points and a named span, never a made-up path --');
const story = bu.changeSinceStatements(balances, { today: TODAY, baseCurrency: 'JMD' });
note(story.net === 100, 'net change counts cash up and card owed as down');
note(story.rows.every((item) => Object.keys(item).every((field) => !/month/i.test(field))), 'no per-month breakdown is invented');
note(story.separate.length === 0 && story.notUpdated.length === 1, 'the account not refreshed is named, not counted');
note(bu.statementsPhrase(story.from, story.to, TODAY) === 'your June statement', 'the span is named after the statement it starts from');
note(story.span.text === 'about three months', 'and says how long ago that was');

console.log('\n -- staleness shows on the number, only when it matters --');
note(bu.balanceFreshness(balances, TODAY).stale === false, 'a fresh update is not nagged');
note(bu.balanceFreshness(bu.resolveBalances({ known, updates: [] }), TODAY).stale === true, 'a statement figure over 35 days old invites an update');

console.log('\n -- guards: entered balances never reach the reconciled store --');
const LEDGER_WRITE =
  /\b(?:putTransactions|replaceTransactions|putBankTransactions|replaceBankTransactions|putStatement|putBankStatement|putCardStatement|mergeTransactions|mergeBankTransactions|persistBank|persist)\s*\(/;
const analysisSrc = read('application', 'analysis', 'balance-updates.js');
const uiSrc = read('application', 'ui', 'balance-updates-render.js');
note(!LEDGER_WRITE.test(analysisSrc) && !LEDGER_WRITE.test(uiSrc), 'neither balance module writes a card or bank ledger');
note(!/\bStore\b/.test(analysisSrc), 'the balance analysis has no storage access at all');
note(/Store\.balanceUpdates\.replace\(/.test(uiSrc), 'the update form writes only its own store');

const appFiles = [];
for (const dir of ['analysis', 'ui', 'statements', 'output', 'core', 'sample-data']) {
  for (const file of readdirSync(join(ROOT, 'application', dir)).filter((f) => f.endsWith('.js'))) {
    appFiles.push([`application/${dir}/${file}`, read('application', dir, file)]);
  }
}
appFiles.push(['application/app-controller.js', read('application', 'app-controller.js')]);
const writers = appFiles
  .filter(([, src]) => /Store\.balanceUpdates\.(?:put|putMany|replace|delete|clear)\(/.test(src))
  .map(([name]) => name)
  .sort();
note(
  writers.join() === ['application/sample-data/mock-personas.js', 'application/ui/app-intake.js', 'application/ui/balance-updates-render.js'].join(),
  `only the form writes entered balances; sample cleanup only clears them (${writers.join(', ')})`
);

console.log('\n -- guards: history-based calculations never read them --');
const HISTORY = [
  'plan.js', 'forecast.js', 'forecast-accuracy.js', 'cushion.js', 'goals.js',
  'commitment-income.js', 'reporting-core.js', 'reporting-periods.js', 'reporting-insights.js', 'reporting-print.js',
  'bank-analysis.js', 'spend-breakdown.js', 'committed-flexible.js', 'set-aside.js', 'category-intentions.js',
  'investments.js', 'plan-autoassign.js', 'plan-draft.js', 'goal-cascade.js', 'goal-constraints.js',
  'spend-allocation.js', 'statement-cascade.js', 'coverage-map.js',
];
const ENTERED = /balanceUpdates|balance-updates|enteredCash|overlayCashAndDebt|\.entered\b/;
const readers = HISTORY.filter((file) => ENTERED.test(read('application', 'analysis', file)));
note(readers.length === 0, `no history-based module reads an entered balance${readers.length ? ' - ' + readers.join(', ') : ''}`);
const proven = read('application', 'analysis', 'proven-models.js');
const body = (name) => {
  const start = proven.indexOf(`function ${name}(`);
  const end = proven.indexOf('\n  }\n', start);
  return proven.slice(start, end);
};
note(!/balances\(|liveCashDebt\(|enteredCash\(/.test(body('forecast')), 'the forecast is built from statements only');
note(/const cd = reconciledCashDebt\(\);[\s\S]*financialPositionSummary\(\{\s*cashDebt: cd,/.test(body('positionModels')), 'the shareable summary is fed the reconciled figures');
note(!/enteredCash/.test(read('application', 'ui', 'app-goals.js')), 'the monthly goal log grades a past month on statements only');
for (const file of ['report-render.js', 'reporting-print.js', 'data-export.js']) {
  const dir = file === 'reporting-print.js' ? 'analysis' : 'output';
  const src = read('application', dir, file);
  note(!/enteredCash|provenModels\.balances|overlayCashAndDebt/.test(src), `${file} never prints an entered balance as a statement figure`);
}

console.log('\n -- guards: the store is declared, restorable and backed up --');
const storage = read('application', 'core', 'storage.js');
note(/name: 'balanceUpdates', keyPath: 'id'/.test(storage) && /for \(const s of V6_STORES\)/.test(storage), 'the store is created on upgrade');
note(/balanceUpdates: idStore\('balanceUpdates'\)/.test(storage), 'and exposed');
note(/\.\.\.V6_STORES\.map/.test(storage), 'and part of the atomic restore contract');
note(/balanceUpdates: recordsWith\(userData\.balanceUpdates, 'id'\)/.test(read('application', 'output', 'history-codec.js')), 'and carried by the encrypted backup');

console.log(`\n  checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
