import { readFileSync } from 'node:fs';
import {
  parseNcbStatementSummary,
  reconcileNcbStatement,
} from '../application/statements/read-statements.js';
import { parseInvestmentStatement } from '../application/statements/read-investments.js';
import {
  repairInvestmentStatementTotal,
  statementIntegrity,
} from '../application/analysis/investments.js';
import { buildPlan } from '../application/analysis/plan.js';
import { analysePeriod } from '../application/analysis/reporting-periods.js';
import { summarise } from '../application/analysis/reporting-core.js';

const cfg = JSON.parse(readFileSync(new URL('../settings/config.json', import.meta.url), 'utf8'));
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
console.log(' RECONCILIATION SEAMS - every printed and repeated figure has one source');
console.log('='.repeat(72));

console.log('\n -- separately printed card tax completes the printed summary --');
const ncbSummary = parseNcbStatementSummary([
  'PREVIOUS BALANCE + PURCHASES/CASH ADVANCE - PAYMENTS - CREDITS + INTEREST + OTHER CHARGES = NEW BALANCE',
  '100.00 20.00 0.00 0.00 0.00 5.00 140.00',
  'G.C.T Total: $ 15.00',
]);
const ncbRecon = reconcileNcbStatement({
  previousBalance: ncbSummary.previousBalance,
  newBalance: ncbSummary.newBalance,
  signedBillingSum: 40,
  boxComputedNew: ncbSummary.boxComputedNew,
});
note(ncbSummary.boxComputedNew === 140, 'the printed GCT total joins the printed summary components');
note(ncbRecon.boxOk === true, 'the complete printed summary reaches the printed new balance');

console.log('\n -- an investment headline includes accrued interest exactly once --');
const investment = parseInvestmentStatement([
  'MEMBER OF THE JAMAICA STOCK EXCHANGE',
  'SAMPLE PERSON Account Number: 765432',
  'Statement Period: April 30, 2026',
  'Summary Currency: JMD',
  'Asset Portfolio',
  'Quantity Purchase Current Unrealised',
  '/ Nominal Description Cost Price Yield Gain/Loss Current Value',
  'CASH & CASH EQUIVALENTS JMD',
  '1,000.00 SAMPLE REPO 1,000.00 0.00 1,015.00',
  'Total Value 1,015.00',
  'Portfolio Total 1,000.00',
  'Accrued Interest on notes 15.00',
  'Accrued Interest on bonds 0.00',
  'Announced dividends 0.00',
  'Total 1,015.00',
  'Page 1 of 1',
]).statement;
note(investment.printedTotal === 1015, 'the headline is the statement grand total, not its pre-interest subtotal');
note(investment.portfolioTotal === 1000, 'the portfolio subtotal remains available with its honest meaning');
note(statementIntegrity(investment).crossCheckOk, 'the parsed holding reaches the printed grand total');
const repairedInvestment = repairInvestmentStatementTotal({
  ...investment,
  printedTotal: 1000,
  portfolioTotal: undefined,
});
note(repairedInvestment.printedTotal === 1015, 'an already-stored subtotal is repaired without another upload');

console.log('\n -- recurring card spend is not added to a second band --');
const trend = [
  { month: '2026-01', income: 1000, bankOut: 0, cardOut: 100, spending: 100 },
  { month: '2026-02', income: 1000, bankOut: 0, cardOut: 100, spending: 100 },
  { month: '2026-03', income: 1000, bankOut: 0, cardOut: 100, spending: 100 },
];
const cardRows = trend.map((row) => ({
  date: `${row.month}-10`,
  month: row.month,
  amount: 100,
  kind: 'spend',
  category: 'Dining & Takeout',
}));
const plan = buildPlan({
  trend,
  cardRows,
  cfg,
  commitmentsMonthly: 100,
  commitmentItems: [{ key: 'sample', typical: 100, source: 'card' }],
  asOf: '2026-04-01',
});
note(plan.actual.fixed === 0, 'a card recurrence does not become a fixed expense by recurrence alone');
note(plan.actual.free === 100, 'the purchase remains once in its assigned card-spend band');
note(plan.accountedFor === 100, 'one card purchase contributes exactly once to the three-band total');

console.log('\n -- card fees remain separate on Activity and still count as cash outflow --');
const cardFlowRows = [
  { id: 'purchase', date: '2026-01-10', month: '2026-01', amount: 100, kind: 'spend', category: 'Groceries', description: 'Sample shop' },
  { id: 'fee', date: '2026-01-11', month: '2026-01', amount: 15, kind: 'fee', category: 'Fees & Interest', description: 'Sample fee' },
];
const all = summarise(cardFlowRows);
const period = analysePeriod(cardFlowRows, {
  from: '2026-01',
  to: '2026-01',
  label: 'January 2026',
  kind: 'month',
  prevFrom: null,
  prevTo: null,
});
note(all.total_spend === 100 && all.total_fees === 15, 'Activity keeps purchases and fees distinct');
note(all.total_outflow === 115, 'the all-time card outflow includes purchases and fees');
note(period.total_outflow === 115, 'the selected-period card outflow uses the same rule');
note(period.by_month_outflow && period.by_month_outflow['2026-01'] === 115, 'the chart month reads that shared outflow total');
const controller = readFileSync(new URL('../application/app-controller.js', import.meta.url), 'utf8');
note(/cardSpendTotal = ca\.total_outflow/.test(controller), 'Overview reads the shared card outflow total');
note(/ca\.by_month_outflow/.test(controller), 'Overview reads the shared monthly card outflow');
note(/asum \? asum\.by_month_outflow/.test(controller), 'the emergency-fund history reads the same monthly outflow');
note(/total: bank \+ card \+ investment/.test(controller), 'the statement total includes every imported ledger');
note(/renderInvestmentStatementTrust\(\)/.test(controller) && /statementIntegrity\(statement/.test(controller), 'investment reconciliation is named beside bank and card coverage');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
