import { detectStatementFormat } from '../application/statements/read-statements.js';
import {
  isInvestmentStatement,
  parseInvestmentStatement,
  parseInvestmentStatements,
  splitInvestmentStatements,
  holdingKey,
  canonicalHoldingSection,
  detectInvestmentProvider,
  investmentStatementFingerprint,
} from '../application/statements/read-investments.js';

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
console.log(' INVESTMENT READER - raw facts off the page, nothing assumed');
console.log('='.repeat(72));

function statementLines({
  start = '01-Apr-26',
  end = '30-Apr-26',
  total = '$627,000.00',
  pages = 2,
  activity = null,
  equityRow = 'ALPHA HOLDINGS LIMITED ORDINARY 1,000.00 JMD 25,000.00 20.00 20,000.00 20,000.00 19,000.00 5.26%',
  wrap = 'SHARES',
  extraEquity = [],
  extraCash = [],
} = {}) {
  const lines = [
    'Investment Accounts Consolidated Statement',
    'Scotia Investments Scotia Investments Jamaica Limited, a member of The Scotia Group Jamaica',
    'SAMPLE PERSON Account Number : 1234567',
    'Statement Type: Monthly',
    `Period Start Date: ${start}`,
    `Period End Date: ${end}`,
    'Consolidated Account Overview Currency: Jamaican Dollar',
    'Asset Class Summary',
    'Market Value Asset',
    'Cash 1,000.00 0.16%',
    'Equities 20,000.00 3.19%',
    'Unit Trust 606,000.00 96.65%',
    ...(total ? [`Total Value of Account ${total} 100.00%`] : []),
    `FX Rates as at ${end}`,
    'USD 150.0000 : 1.00',
    `Page 1 of ${pages}`,
    'Account Number : 1234567',
    'Details of Your Account Holdings',
    'Cash',
    'Type Account # Product Currency Start Date Book Balance Int. Rate (%) Withholding Tax Net Value Net Value in JMD',
    'CASH 900001 Trust Account JMD 01 Jan 2024 1,000.00 0.0100 0.00 1,000.00 1,000.00',
    ...extraCash,
    'Total Cash JMD 1,000.00 1,000.00 1,000.00',
    'Equities',
    'Security Description Quantity Currency Average Cost Market Price Market Value Market Value (JMD) Last Month Value % Change',
    'JMD Equities',
    equityRow,
    ...(wrap ? [wrap] : []),
    ...extraEquity,
    'Total JMD Equities 20,000.00 20,000.00 19,000.00 5.26%',
    'Unit Trust',
    'Account # 55555',
    'Security Description Currency Average Cost Shares/Unit Current NAV Current Value Last Month Value % Change',
    'JMD Unit Trust',
    'Example Money Market Fund A JMD 100.00 3000.0000 100.0000 300,000.00 300,000.00 0.00%',
    'Example Income Fund A JMD 50.00 3000.0000 55.0000 165,000.00 164,000.00 0.61%',
    'Total JMD Unit Trust 465,000.00 464,000.00 0.22%',
    'Security Description Currency Average Cost Shares/Unit Current NAV Current Value Last Month Value % Change',
    'USD Unit Trust',
    'Example Dollar Fund (USD) A USD 10.00 94.0000 10.0000 940.00 938.00 0.21%',
    'Total USD Unit Trust 940.00 938.00 0.21%',
    '1. Securities purchased on your behalf are held in segregation from our proprietary interest.',
    `Page 2 of ${pages}`,
  ];
  if (activity) {
    lines.push(
      'Account Number : 1234567',
      'Monthly Activity',
      'CASH',
      'ACCT01 - SETTLEMENT A/C - JMD',
      'Deal Date Deal No. Trans. Type Units/Amount Balance Narrative',
      '31 Mar 2026 0.00 0.00 BALANCE B/F',
      ...activity,
      'Mutual Funds/Unit Trust',
      'Account # 55555',
      '30-Apr-26 Reinvested Distribution $ 100.00 -$ 25.00 $ 75.00 100.00 0.75',
      `Page 3 of ${pages}`
    );
  }
  return lines;
}

console.log('\n -- one front door, a third branch --');
const base = statementLines();
note(isInvestmentStatement(base), 'an investment statement is recognised');
note(detectStatementFormat(base) === 'investment', 'the shared detector routes it to the investment reader');
note(detectStatementFormat(['Transactions (Withdrawals & Deposits)', 'Account Summary']) === 'bank', 'a bank statement still routes to the bank reader');
note(detectStatementFormat(['Statement Period', '01-Jan-2026 to 31-Jan-2026']) === 'card', 'a card statement still routes to the card reader');
note(
  !isInvestmentStatement(['Scotia Investments Jamaica Limited is a member of the group']),
  'one stray mention of the company is not enough to reroute a file'
);
note(detectStatementFormat([]) === 'card', 'an empty file keeps its existing failure path');

console.log('\n -- the header: date, rate and the printed total --');
const { ok, statement: st } = parseInvestmentStatement(base, 'April.pdf');
note(ok, 'a complete statement parses');
note(st.account === '1234567', 'the account number is read');
note(st.periodStart === '2026-04-01' && st.periodEnd === '2026-04-30', 'period dates become ISO dates');
note(st.printedTotal === 627000, 'the printed total is captured as printed');
note(st.fxRates.USD === 150, "the statement's own dated rate is kept");
note(st.classTotals.length === 3 && st.classTotals[2].value === 606000, 'the asset-class totals are kept');
note(st.pagesDeclared === 2 && st.pagesSeen.join(',') === '1,2', 'page positions are recorded');
note(st.warnings.length === 0, `a clean statement carries no warnings (${st.warnings.join(', ')})`);
note(/^[0-9a-f]{8}$/.test(st.hash), 'the record is keyed by account and period end');

console.log('\n -- holdings: whatever is listed, in both shapes --');
const kinds = st.holdings.map((h) => h.kind).join(',');
note(kinds === 'cash,equity,fund,fund,fund', `every listed line becomes a holding (${kinds})`);
const equity = st.holdings.find((h) => h.kind === 'equity');
note(equity.description === 'ALPHA HOLDINGS LIMITED ORDINARY SHARES', 'a wrapped description is joined back together');
note(equity.quantity === 1000 && equity.avgCostRaw === 25000 && equity.price === 20, 'equity average cost is kept as the printed total cost');
note(equity.value === 20000 && equity.valueBase === 20000 && equity.lastMonthValue === 19000 && equity.statedChangePct === 5.26, 'equity value, last month and stated change are kept');
const income = st.holdings.find((h) => h.description === 'Example Income Fund A');
note(income.avgCostRaw === 50 && income.quantity === 3000 && income.price === 55 && income.subAccount === '55555', 'unit trusts keep their per-unit cost, units, NAV and account');
const usd = st.holdings.find((h) => h.currency === 'USD');
note(usd && usd.value === 940 && usd.valueBase === null, 'a USD fund stays in US dollars, never converted on the record');
note(!('signal' in equity) && !('costReturn' in equity) && !('role' in equity), 'no derived signal is stored on a holding');

console.log('\n -- identity that survives cosmetic drift --');
const unwrapped = parseInvestmentStatement(
  statementLines({
    equityRow: 'Alpha Holdings Limited. 1,000.00 JMD 25,000.00 20.00 20,000.00 20,000.00 19,000.00 5.26%',
    wrap: null,
  })
).statement;
note(
  unwrapped.holdings.find((h) => h.kind === 'equity').key === equity.key,
  'casing, punctuation and a dropped "ORDINARY SHARES" tail keep the same key'
);
note(holdingKey('fund', '55555', 'Example Income Fund A') !== holdingKey('fund', '66666', 'Example Income Fund A'), 'the same name under a different account is a different holding');

console.log('\n -- the activity page: a contribution, and only what is needed --');
const withActivity = parseInvestmentStatement(
  statementLines({
    pages: 3,
    activity: [
      '02 Apr 2026 1001 D 50,000.00 50,000.00 DEPOSIT FROM A PRIVATE NOTE',
      'SECOND LINE OF A PRIVATE NOTE',
      '02 Apr 2026 1002 W (30,000.00) 20,000.00 PURCHASE OF FUNDS',
    ],
    extraCash: ['CASH ACCT01 SETTLEMENT A/C JMD 02 Feb 2024 20,000.00 0.0000 0.00 20,000.00 20,000.00'],
  })
).statement;
note(withActivity.activityPresent && withActivity.cashActivitySection, 'the activity page is recognised');
note(withActivity.cashActivity.length === 2, 'both cash movements are read');
const deposit = withActivity.cashActivity.find((row) => row.type === 'D');
note(deposit && deposit.amount === 50000 && deposit.currency === 'JMD' && deposit.date === '2026-04-02', 'the deposit is read with its date and currency');
note(withActivity.cashActivity.find((row) => row.type === 'W').amount === 30000, 'a bracketed withdrawal is read as a positive amount with its type');
note(!JSON.stringify(withActivity).includes('PRIVATE NOTE'), 'the narrative is never stored');
note(deposit.cashAccount === 'SETTLEMENT A/C', 'the cash account is named by its product, not its code');
note(withActivity.holdings.filter((h) => h.kind === 'cash').length === 2, 'a new cash account is read without any fixed roster');
note(withActivity.warnings.length === 0, 'a three-page month with activity is clean');

console.log('\n -- a missing page is a fault, not a quiet month --');
const quiet = parseInvestmentStatement(statementLines()).statement;
note(!quiet.activityPresent && quiet.cashActivity.length === 0 && !quiet.warnings.includes('pages-missing'), 'a two-page month has no activity and no warning');
const missing = parseInvestmentStatement(statementLines({ pages: 3 })).statement;
note(missing.warnings.includes('pages-missing'), 'a statement that declares three pages but shows two is flagged');
const noFooter = parseInvestmentStatement(statementLines().filter((l) => !/^Page \d/.test(l))).statement;
note(noFooter.warnings.includes('pages-missing'), 'no page footer at all is treated as incomplete');

console.log('\n -- unreadable lines are counted, not guessed --');
const broken = parseInvestmentStatement(
  statementLines({ extraEquity: ['BETA LIMITED 500.00 JMD 1,000.00 2.00%'] })
).statement;
note(broken.warnings.filter((w) => w === 'row-unread').length === 1, 'a holding line that does not fit is flagged');
note(broken.holdings.length === 5, 'and nothing is invented from it');
const noTotal = parseInvestmentStatements(statementLines({ total: null }), 'x.pdf');
note(noTotal.statements.length === 0 && noTotal.unreadable === 1, 'a statement without its printed total is not stored');

console.log('\n -- many statements in one file, in any order --');
const combined = [
  ...statementLines({ start: '01-Apr-26', end: '30-Apr-26' }),
  ...statementLines({ start: '01-Feb-26', end: '28-Feb-26' }),
  ...statementLines({ start: '01-Mar-26', end: '31-Mar-26', pages: 3, activity: ['05 Mar 2026 900 D 10,000.00 10,000.00 NOTE'] }),
];
note(splitInvestmentStatements(combined).length === 3, 'a combined download splits into its statements');
const parsedCombined = parseInvestmentStatements(combined, 'combined.pdf');
note(
  parsedCombined.statements.map((s) => s.periodEnd).sort().join(',') === '2026-02-28,2026-03-31,2026-04-30',
  'each statement keeps its own period'
);
note(parsedCombined.statements.find((s) => s.periodEnd === '2026-03-31').cashActivity.length === 1, 'activity stays with the statement it belongs to');

console.log('\n -- re-loading the same month replaces, never duplicates --');
const first = parseInvestmentStatements(base, 'first.pdf').statements[0];
const second = parseInvestmentStatements(base, 'second-copy.pdf').statements[0];
note(first.hash === second.hash, 'the same account and period give the same key');
note(investmentStatementFingerprint(first) === investmentStatementFingerprint(second), 'an identical re-upload is recognised as unchanged');
const corrected = parseInvestmentStatements(statementLines({ total: '$627,500.00' }), 'x.pdf').statements[0];
note(corrected.hash === first.hash && investmentStatementFingerprint(corrected) !== investmentStatementFingerprint(first), 'a corrected copy of the same month replaces the old one');

console.log('\n -- NCB Capital Markets uses the same front door and raw record --');
const ncbLines = [
  'MEMBER OF THE JAMAICA STOCK EXCHANGE',
  'SAMPLE PERSON Account Number: 765432',
  'Statement Period: August 31, 2026',
  'Summary Currency: JMD',
  'Asset Portfolio',
  'Quantity Purchase Current Unrealised',
  '/ Nominal Description Cost Price Yield Gain/Loss Current Value',
  'MUTUAL FUNDS & COLLECTIVE INV JMD',
  '10.00 SAMPLE FUND 200.00 22.00 20.00 220.00',
  'Total Value 220.00',
  'STOCKS JMD',
  '20.00 SAMPLE GROUP LIMITED 300.00 12.00 4.50% -60.00 240.00',
  'Total Value 240.00',
  'Portfolio Total 460.00',
  'Page 1 of 1',
];
note(detectInvestmentProvider(ncbLines) === 'ncb', 'the provider detector identifies NCB');
note(detectStatementFormat(ncbLines) === 'investment', 'the shared detector routes NCB to investments');
const ncb = parseInvestmentStatement(ncbLines, 'sample.pdf').statement;
note(ncb.provider === 'ncb' && ncb.account === '765432', 'the provider and account are stored on the shared record');
note(ncb.periodStart === null && ncb.periodEnd === '2026-08-31', 'NCB keeps the absent start date absent');
note(ncb.printedTotal === 460 && ncb.holdings.length === 2, 'the printed portfolio total and holdings are read');
note(ncb.holdings[0].kind === 'fund' && ncb.holdings[1].kind === 'equity', 'provider section names become canonical kinds');
note(ncb.holdings[1].unrealisedGainLoss === -60, 'the statement gain or loss is stored directly');
note(ncb.holdings[1].yield === 4.5 && ncb.holdings[1].provenance.yield === 'statement' && ncb.holdings[0].provenance.yield === 'absent', 'a stated yield is read while a blank yield remains absent');
note(ncb.holdings.every((h) => h.provenance.valueBase === 'derived'), 'base value provenance records the app conversion rather than a second statement figure');
note(ncb.holdings.every((h) => h.lastMonthValue == null && h.statedChangePct == null), 'NCB never receives fabricated month movement');
note(ncb.provenance.cashActivity === 'absent' && ncb.holdings[0].provenance.unrealisedGainLoss === 'statement', 'field provenance records what NCB states and omits');
note(canonicalHoldingSection('scotia', 'Unit Trust').label === 'Funds' && canonicalHoldingSection('ncb', 'MUTUAL FUNDS & COLLECTIVE INV JMD').label === 'Funds', 'provider labels share one canonical funds class');
note(
  holdingKey('cash', '', 'Cash Balance', 'ncb') ===
    holdingKey('fund', '', 'NCB Cap M Fund (Retail Repo Migration)', 'ncb'),
  'the NCB cash-to-fund migration keeps one stable identity'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
