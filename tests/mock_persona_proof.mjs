import { PERSONAS } from '../application/sample-data/mock-data.js';
import {
  hashSeed,
  makeRng,
  buildCardLedger,
  buildBankLedger,
  buildInvestmentStatements,
  monthSequence,
  ymOf,
} from '../application/sample-data/mock-generator.js';
import {
  reconcileCardStatement,
  reconcileBankStatement,
} from '../application/statements/read-statements.js';
import {
  classifyInternalTransfers,
  applyLedgerRules,
} from '../application/analysis/bank-analysis.js';
import {
  latestValueMovement,
  statementContributions,
} from '../application/analysis/investments.js';
import { readFile } from 'node:fs/promises';

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
console.log(' MOCK PERSONA - Trevor exercises the whole product');
console.log('='.repeat(72));

const trevor = PERSONAS.cardAndBank;
const build = () => {
  const rng = makeRng(hashSeed(trevor.seed));
  const card = buildCardLedger(trevor, rng);
  const bank = buildBankLedger(
    trevor,
    rng,
    card.perStatement.map((statement) => statement.payments)
  );
  const investments = buildInvestmentStatements(trevor, rng);
  return { card, bank, investments };
};
const generated = build();

console.log('\n -- coverage is deliberate, not accidental --');
note(trevor.months === 12, 'Trevor carries a full year of history');
note(
  trevor.accounts.map((account) => account.currency).join(',') === 'JMD,JMD,USD',
  'the profile has everyday, savings and foreign-currency accounts'
);
note(
  trevor.budgetPlan.fixed + trevor.budgetPlan.setAside + trevor.budgetPlan.free === 100,
  'the saved Plan target is a valid 100% allocation'
);
note(trevor.goalPlan.targetMonths === 4, 'the emergency-fund goal has a measurable target');
note(trevor.categoryIntentions.length > 0, 'a category spending limit is present');
note(trevor.manualAsset.staleMonthsAgo > 4, 'a self-reported asset exercises the stale marker');
note(trevor.cardBehaviour === 'revolver', 'Trevor carries rather than clears his card balance');

console.log('\n -- card and bank ledgers still reconcile --');
note(generated.card.statements.length === 12, 'one card statement is generated per month');
note(
  generated.card.perStatement.every((statement) => reconcileCardStatement(statement).ok),
  'every generated card statement reconciles'
);
note(
  generated.card.perStatement.slice(1).every((statement) => statement.interestCharges > 0),
  'interest is charged in every cycle after the opening statement'
);
note(
  generated.card.perStatement.at(-1).newBalance === trevor.creditLimit * trevor.targetUtilisation,
  'the latest statement still carries the configured balance'
);
note(generated.bank.statements.length === 35, 'three bank accounts produce 35 statements (one USD gap)');
note(
  generated.bank.parses.every((statement) =>
    reconcileBankStatement({
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      transactions: statement.transactions,
    }).ok
  ),
  'every generated bank statement reconciles'
);
note(
  Object.values(generated.bank.monthlyClosing).every((series) => series.length === 12),
  'every account exposes a 12-point balance series even across a skipped statement'
);
note(
  Object.values(generated.bank.monthlyClosing).every((series) => series.every((balance) => balance >= 0)),
  'carrying the card never pushes a generated bank account into overdraft'
);
note(
  generated.bank.monthlyClosing['7799'][8] === generated.bank.monthlyClosing['7799'][7],
  'the skipped USD month carries its last known balance without inventing a statement'
);
const skipped = monthSequence(trevor.months)[8];
const skippedYm = ymOf(skipped.y, skipped.m);
note(
  !generated.bank.statements.some(
    (statement) => statement.account === '7799' && statement.periodKey === skippedYm
  ),
  'the USD coverage gap is visible in the statement record itself'
);
const statementPayments = generated.card.perStatement
  .map((statement) => Math.abs(statement.payments))
  .filter((amount) => amount > 0);
const bankCardPayments = generated.bank.records
  .filter((row) => row.account === '1234' && row.description === `TRANSFER TO ${trevor.cardAccount}`)
  .map((row) => row.amount);
note(
  bankCardPayments.join(',') === statementPayments.join(','),
  'each card payment is the same amount on the card and bank ledgers'
);

console.log('\n -- internal and household money keep their distinct meanings --');
const ownAccounts = trevor.accounts.map((account) => account.number);
const classified = applyLedgerRules(
  classifyInternalTransfers(
    generated.bank.records,
    ownAccounts,
    [trevor.cardAccount],
    null,
    []
  ),
  {
    confirmations: [],
    sharedAccounts: trevor.sharedAccountNumbers,
    householdPayees: trevor.householdPayeeNames,
  }
);
note(classified.filter((row) => row.household).length === 12, 'one household-support payment is identified each month');
note(
  classified.filter((row) => row.household).every((row) => !row.internalTransfer),
  'household support stays distinct from transfers between Trevor’s own accounts'
);
note(
  classified.some((row) => row.internalTransfer && /5588/.test(row.description)),
  'the JMD savings sweep is classified as an internal transfer'
);
note(
  classified.some((row) => row.internalTransfer && /7799/.test(row.description)),
  'the USD top-up is classified as an internal transfer'
);

console.log('\n -- investments exercise contribution-aware watch logic --');
note(generated.investments.statements.length === 12, 'one investment statement is generated per month');
note(
  generated.investments.statements.every((statement) => !statement.warnings.length),
  'generated investment statements are complete and warning-free'
);
note(
  generated.investments.statements.every((statement) => {
    const contribution = statementContributions(statement);
    return contribution.known && contribution.byCurrency.JMD === 40000;
  }),
  'each investment contribution is readable as JMD 40,000'
);
const movement = latestValueMovement(generated.investments.statements);
note(movement && movement.tone === 'watch', 'the latest market move crosses the 10% watch threshold');
note(movement && movement.added === 40000, 'the watch calculation separates money added from market movement');

console.log('\n -- the seeded output remains reproducible --');
const repeated = build();
note(
  generated.card.records.map((row) => row.id).join(',') ===
    repeated.card.records.map((row) => row.id).join(','),
  'the same seed reproduces every card transaction identity'
);
note(
  generated.bank.records.map((row) => row.id).join(',') ===
    repeated.bank.records.map((row) => row.id).join(','),
  'the same seed reproduces every bank transaction identity'
);
note(
  generated.investments.statements.map((statement) => statement.printedTotal).join(',') ===
    repeated.investments.statements.map((statement) => statement.printedTotal).join(','),
  'the same seed reproduces the investment value series'
);

console.log('\n -- sample state cannot leak into a real import --');
const personaSource = await readFile(
  new URL('../application/sample-data/mock-personas.js', import.meta.url),
  'utf8'
);
const intakeSource = await readFile(
  new URL('../application/ui/app-intake.js', import.meta.url),
  'utf8'
);
const cardsRenderSource = await readFile(
  new URL('../application/ui/cards-render.js', import.meta.url),
  'utf8'
);
note(
  !/secItem\(\s*['"]/.test(cardsRenderSource),
  'every card-health metric passes the DOM factory to secItem'
);
note(
  personaSource.includes("pill.textContent = 'Sample: ' + ((PERSONAS[current]"),
  'the developer pill displays the person name rather than the persona key'
);
note(
  personaSource.includes("new URL('../../settings/config.json', import.meta.url)") &&
    personaSource.includes("new URL('../../settings/' + mFile, import.meta.url)"),
  'the developer loader resolves both settings files from the repository root'
);
for (const marker of [
  'Store.categoryIntentions.clear()',
  'Store.manualAssets.clear()',
  "Store.setMeta('financeGoal', null)",
  "Store.setMeta('financeGoalBoundary', null)",
  "Store.setMeta('planTarget', null)",
  "Store.setMeta('planGroups', null)",
  "Store.setMeta('planDraft', null)",
]) {
  note(
    personaSource.includes(marker) && intakeSource.includes(marker),
    `${marker} runs both when clearing a persona and before importing real data`
  );
}

console.log('\n -- the shared builders still serve Marsha and Damion --');
for (const name of ['bankOnly', 'cardOnly']) {
  const persona = PERSONAS[name];
  const rng = makeRng(hashSeed(persona.seed));
  if (persona.hasCard) {
    const card = buildCardLedger(persona, rng);
    note(
      card.perStatement.every((statement) => reconcileCardStatement(statement).ok),
      `${name} card statements still reconcile`
    );
  }
  if (persona.hasBank) {
    const bank = buildBankLedger(persona, rng);
    note(
      bank.parses.every((statement) =>
        reconcileBankStatement({
          openingBalance: statement.openingBalance,
          closingBalance: statement.closingBalance,
          transactions: statement.transactions,
        }).ok
      ),
      `${name} bank statements still reconcile`
    );
  }
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
