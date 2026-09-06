import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseInvestmentStatements } from '../application/statements/read-investments.js';

const HOLDINGS = [
  'Unit Trust',
  'Account # 55555',
  'Security Description Currency Average Cost Shares/Unit Current NAV Current Value Last Month Value % Change',
  'JMD Unit Trust',
  'Example Money Market Fund A JMD 100.00 3000.0000 100.0000 300,000.00 300,000.00 0.00%',
  'Example Income Fund A JMD 50.00 3000.0000 55.0000 165,000.00 164,000.00 0.61%',
  'Total JMD Unit Trust 465,000.00 464,000.00 0.22%',
  'USD Unit Trust',
  'Example Dollar Fund (USD) A USD 10.00 94.0000 10.0000 940.00 938.00 0.21%',
  'Total USD Unit Trust 940.00 938.00 0.21%',
];
const CASH_ACTIVITY = [
  'CASH',
  'ACCT01 - SETTLEMENT A/C - JMD',
  'Deal Date Deal No. Trans. Type Units/Amount Balance Narrative',
  '31 Mar 2026 0.00 0.00 BALANCE B/F',
  '14 Apr 2026 1001 D 5,000.00 5,000.00 CASH DEPOSIT',
];
const FUND_HEADING = 'Mutual Funds / Unit Trust';
const FUND_COLUMNS = [
  'Account # 55555',
  'Trade Date Transaction Type Gross Amount Net Amount Transaction NAV Shares/Units Balance',
];
const block = (label, ...rows) => [label, 'Opening Balance 1,000.00', ...rows, 'Closing Balance 1,100.00'];
const NOTES = [
  '1. Distributions are credited to your account and may be reinvested. Interest earned is shown gross.',
  '2. Dividend and interest wording in these notes is explanatory only.',
];

function statement(activity, { holdings = HOLDINGS, pages = 3 } = {}) {
  return [
    'Investment Accounts Consolidated Statement',
    'Scotia Investments Scotia Investments Jamaica Limited, a member of The Scotia Group Jamaica',
    'SAMPLE PERSON Account Number : 1234567',
    'Statement Type: Monthly',
    'Period Start Date: 01-Apr-26',
    'Period End Date: 30-Apr-26',
    'Consolidated Account Overview Currency: Jamaican Dollar',
    'Asset Class Summary',
    'Market Value Asset',
    'Unit Trust 465,940.00 100.00%',
    'Total Value of Account $465,940.00 100.00%',
    'FX Rates as at 30-Apr-26',
    'USD 150.0000 : 1.00',
    'Page 1 of 3',
    'Account Number : 1234567',
    'Details of Your Account Holdings',
    ...holdings,
    'Page 2 of 3',
    'Account Number : 1234567',
    'Monthly Activity',
    ...activity,
    `Page 3 of ${pages}`,
  ];
}

const parse = (activity, options) => parseInvestmentStatements(statement(activity, options), 'synthetic.pdf').statements[0];
const lines = (activity, options) => parse(activity, options).incomeLines;
const fund = (...parts) => [FUND_HEADING, ...FUND_COLUMNS, ...parts.flat()];
const row = (date, treatment, gross, deduction, net) =>
  `${date} ${treatment ? `${treatment} ` : ''}Distribution $ ${gross} -$ ${deduction} $ ${net} 100.00 10.00`;

const captured = [
  {
    name: 'a reinvested distribution on a JMD fund is captured with its stated amounts and the row as evidence',
    activity: fund(block('Example Money Market Fund A', row('30-Apr-26', 'Reinvested', '100.00', '25.00', '75.00'))),
    expected: [{
      kind: 'distribution', date: '2026-04-30', amount: 100, deduction: 25, net: 75, currency: 'JMD',
      fundLabel: 'Example Money Market Fund A', subAccount: '55555', treatment: 'reinvested',
      evidence: row('30-Apr-26', 'Reinvested', '100.00', '25.00', '75.00'),
    }],
  },
  {
    name: 'a label naming its currency in brackets gives that currency',
    activity: fund(block('Example Dollar Fund (USD) A', row('15-Apr-26', 'Reinvested', '1.20', '0.30', '0.90'))),
    expected: [{ date: '2026-04-15', amount: 1.2, deduction: 0.3, net: 0.9, currency: 'USD', fundLabel: 'Example Dollar Fund (USD) A' }],
  },
  {
    name: 'several funds each keep their own label and currency',
    activity: fund(
      block('Example Money Market Fund A', row('30-Apr-26', 'Reinvested', '100.00', '25.00', '75.00')),
      block('Example Dollar Fund (USD) A', row('15-Apr-26', 'Reinvested', '1,200.00', '300.00', '900.00')),
      block('Example Income Fund A', row('30-Apr-26', 'Reinvested', '10.00', '2.50', '7.50'))
    ),
    expected: [
      { fundLabel: 'Example Money Market Fund A', currency: 'JMD', amount: 100 },
      { fundLabel: 'Example Dollar Fund (USD) A', currency: 'USD', amount: 1200 },
      { fundLabel: 'Example Income Fund A', currency: 'JMD', amount: 10 },
    ],
  },
  {
    name: 'a distribution with no treatment word keeps the treatment unstated',
    activity: fund(block('Example Income Fund A', row('30-Apr-26', '', '10.00', '2.50', '7.50'))),
    expected: [{ treatment: null, currency: 'JMD', amount: 10 }],
  },
  {
    name: 'a four-digit year reads the same date',
    activity: fund(block('Example Income Fund A', row('30-Apr-2026', 'Reinvested', '10.00', '2.50', '7.50'))),
    expected: [{ date: '2026-04-30' }],
  },
  {
    name: 'a label that matches no holding leaves the currency unstated instead of guessing',
    activity: fund(block('Example Unlisted Fund A', row('30-Apr-26', 'Reinvested', '10.00', '2.50', '7.50'))),
    expected: [{ currency: null, fundLabel: 'Example Unlisted Fund A', amount: 10 }],
  },
  {
    name: 'a row before any fund label is kept with an empty label and no currency',
    activity: [FUND_HEADING, ...FUND_COLUMNS, row('30-Apr-26', 'Reinvested', '10.00', '2.50', '7.50')],
    expected: [{ fundLabel: '', currency: null }],
  },
];

const ignored = [
  { name: 'numbered notes that mention distributions, interest and dividends', activity: fund(block('Example Income Fund A'), NOTES) },
  { name: 'column headings and balance lines', activity: fund(block('Example Income Fund A')) },
  {
    name: 'a dated purchase in the fund activity',
    activity: fund(block('Example Income Fund A', '14-Apr-26 Purchase $ 5,000.00 -$ 0.00 $ 5,000.00 100.00 50.00')),
  },
  { name: 'a distribution row in the cash section', activity: [...CASH_ACTIVITY, row('30-Apr-26', 'Reinvested', '100.00', '25.00', '75.00'), FUND_HEADING, ...FUND_COLUMNS] },
  { name: 'wording only, with no date or amount', activity: fund(block('Example Income Fund A', 'Distribution of income may be reinvested at the net asset value')) },
  { name: 'a bare dated interest reference with no amounts', activity: fund(block('Example Income Fund A', '30-Apr-26 Interest accrued on balance')) },
  { name: 'a holding value, yield or gain', activity: fund(block('Example Income Fund A', 'Current NAV 55.0000 Yield 4.20% Unrealised gain 1,000.00')) },
];

test('table: stated distribution rows are captured with their evidence', () => {
  for (const item of captured) {
    const found = lines(item.activity);
    assert.equal(found.length, item.expected.length, item.name);
    item.expected.forEach((expected, index) => assert.deepEqual(
      Object.fromEntries(Object.keys(expected).map((key) => [key, found[index][key]])), expected, item.name));
  }
});

test('table: wording, notes, purchases, headings and other sections are never income', () => {
  for (const item of ignored) {
    const result = parse(item.activity);
    assert.deepEqual(result.incomeLines, [], item.name);
    assert.ok(!result.warnings.includes('income-unread'), item.name);
  }
});

test('a dated distribution row that cannot be read is counted as unread, not captured', () => {
  for (const unread of [
    '30-Apr-26 Reinvested Distribution',
    '30-Apr-26 Reinvested Distribution -$ 25.00',
    '30-Apr-26 Reinvested Distribution $ -75.00 -$ 25.00 $ 50.00',
    '31-Feb-26 Reinvested Distribution $ 100.00 -$ 25.00 $ 75.00 100.00 0.75',
  ]) {
    const result = parse(fund(block('Example Income Fund A', unread)));
    assert.deepEqual(result.incomeLines, [], unread);
    assert.ok(result.warnings.includes('income-unread'), unread);
  }
});

test('an unreadable or absent fund section leaves every other statement fact unchanged', () => {
  const withRows = parse(fund(block('Example Money Market Fund A', row('30-Apr-26', 'Reinvested', '100.00', '25.00', '75.00'))));
  const without = parse(fund(block('Example Money Market Fund A')));
  const withCash = parse([...CASH_ACTIVITY, ...fund(block('Example Money Market Fund A', row('30-Apr-26', 'Reinvested', '100.00', '25.00', '75.00')))]);
  const rest = ({ incomeLines: _incomeLines, ...others }) => others;
  assert.deepEqual(rest(withRows), rest(without));
  assert.deepEqual(rest(withCash).cashActivity, [{ date: '2026-04-14', type: 'D', amount: 5000, currency: 'JMD', cashAccount: 'SETTLEMENT A/C' }]);
  assert.deepEqual(rest(withCash).holdings, rest(withRows).holdings);
  assert.equal(withRows.incomeLines.length, 1);
  assert.equal(without.incomeLines.length, 0);
});

test('mutating a captured row changes what is captured', () => {
  for (const item of captured) {
    const intact = JSON.stringify(lines(item.activity));
    for (const mutate of [
      (text) => text.replace('Distribution', 'Distributions of'),
      (text) => text.replace(/^(\d{1,2})-([A-Za-z]{3})-/, 'Dated $2 '),
      (text) => text.replace(/\$ [\d,]+\.\d{2}/, '$ ten'),
    ]) {
      const changed = item.activity.map((line) => (/Distribution \$/.test(line) ? mutate(line) : line));
      assert.notEqual(JSON.stringify(lines(changed)), intact, item.name);
    }
  }
});
