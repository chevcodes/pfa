import test from 'node:test';
import assert from 'node:assert/strict';
import { flowChartModel, createFlowChartRenderer } from '../application/ui/flow-chart-render.js';
import { bankStatementMonths, cardSpendingTimeline } from '../application/analysis/coverage-map.js';
import { incomeChartModel } from '../application/ui/income-chart-render.js';
import { bankCashFlowDirection, bankFlowOverTime } from '../application/analysis/bank-analysis.js';
import { cardFlowTotals, isCardOutflow } from '../application/analysis/reporting-core.js';
import { formatMoney } from '../application/core/money-format.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('card spending history separates missing months from recorded zero and partial months', () => {
  const timeline = cardSpendingTimeline({
    rowMonths: ['2026-01', '2026-03', '2026-05'],
    statementMonths: ['2026-04'],
    byMonth: { '2026-01': 100, '2026-03': 20 },
    coverage: { months: { '2026-01': { card: 'full' }, '2026-03': { card: 'partial' }, '2026-05': { card: 'full' } } },
  });
  assert.deepEqual(timeline, [
    { month: '2026-01', amount: 100, present: true, incomplete: false },
    { month: '2026-02', amount: null, present: false, incomplete: false },
    { month: '2026-03', amount: 20, present: true, incomplete: true },
    { month: '2026-04', amount: 0, present: true, incomplete: false },
    { month: '2026-05', amount: 0, present: true, incomplete: false },
  ]);
});

test('cash-flow heights preserve ratios including outliers, zero and shortfalls', () => {
  const model = flowChartModel([
    { month: '2026-01', income: 100, spending: 200, net: -100 },
    { month: '2026-02', income: 1000, spending: 0, net: 1000 },
  ]);
  close(model.bars[1].incomePct / model.bars[0].incomePct, 10);
  close(model.bars[0].spendingPct / model.bars[0].incomePct, 2);
  close(model.bars[0].netPct, -model.bars[0].incomePct);
  assert.equal(model.bars[1].spendingPct, 0);
  assert.ok(model.bars[1].incomePct < 100);
});

test('cash-flow history gives missing and statement-only zero months different calendar slots', () => {
  const trend = [
    { month: '2026-01', income: 100, spending: 40, net: 60 },
    { month: '2026-03', income: 120, spending: 50, net: 70 },
  ];
  const gap = flowChartModel(trend);
  assert.deepEqual(gap.months, ['2026-01', '2026-02', '2026-03']);
  assert.deepEqual([gap.bars[1].present, gap.bars[1].income, gap.bars[1].spending], [false, null, null]);
  const recordedZero = flowChartModel(trend, { recordedMonths: ['2026-02'] });
  assert.deepEqual([recordedZero.bars[1].present, recordedZero.bars[1].income, recordedZero.bars[1].spending], [true, 0, 0]);
  assert.deepEqual(bankStatementMonths([{ period: '29 Mar 2026 - 02 Apr 2026' }]), ['2026-03', '2026-04']);
});

test('cash movement separates bank inflow from card-only outflow and names partial sources', () => {
  const trend = [
    { month: '2026-01', income: 100, bankOut: 40, cardOut: 10, spending: 50, net: 50 },
    { month: '2026-02', income: 0, bankOut: 0, cardOut: 30, spending: 30, net: -30 },
    { month: '2026-03', income: 100, bankOut: 40, cardOut: 0, spending: 40, net: 60 },
    { month: '2026-04', income: 100, bankOut: 20, cardOut: 15, spending: 35, net: 65 },
  ];
  const model = flowChartModel(trend, {
    bankMonths: ['2026-01', '2026-03', '2026-04'],
    cardMonths: ['2026-01', '2026-02', '2026-04'],
    coverage: { months: { '2026-04': { bank: 'partial' } } },
  });
  assert.deepEqual(model.bars.map((row) => [row.month, row.income, row.spending]), [
    ['2026-01', 100, 50],
    ['2026-02', null, 30],
    ['2026-03', 100, 40],
    ['2026-04', 100, 35],
  ]);
  assert.equal(model.bars[1].incomeIssue, 'No bank statement');
  assert.equal(model.bars[1].spendingIncomplete, true);
  assert.equal(model.bars[1].net, null);
  assert.equal(model.bars[2].spendingIssue, 'No card statement');
  assert.equal(model.bars[3].incomeIncomplete, true);
  assert.equal(model.bars[3].spendingIssue, 'Partial bank statement');
  assert.equal(model.bars.reduce((sum, row) => sum + (row.income || 0), 0), 300);
  assert.equal(model.bars.reduce((sum, row) => sum + (row.spending || 0), 0), 155);
  const cardOnly = flowChartModel(trend, { bankMonths: [], cardMonths: ['2026-01', '2026-02'] });
  assert.equal(cardOnly.scope, 'Card statements only');
  assert.equal(cardOnly.bars[1].income, null);
  assert.equal(cardOnly.bars[1].incomeIssue, 'No bank statements imported');
  assert.equal(cardOnly.bars[1].net, null);
  assert.equal(cardOnly.bars[1].spendingIssue, '');
  const bankOnly = flowChartModel(trend, { bankMonths: ['2026-01', '2026-02'], cardMonths: [] });
  assert.equal(bankOnly.scope, 'Bank statements only');
  assert.equal(bankOnly.bars[1].spendingIssue, '');
  assert.equal(bankOnly.bars[1].recorded, false);
});

test('cash-flow evidence rows reconcile to each chart series', () => {
  const month = '2026-01';
  const bank = [
    { date: '2026-01-02', direction: 'in', amount: 100 },
    { date: '2026-01-03', direction: 'out', amount: 20 },
    { date: '2026-01-04', direction: 'in', amount: 50, internalTransfer: true },
    { date: '2026-01-05', direction: 'in', amount: 3, refund: true },
    { date: '2026-01-06', direction: 'in', amount: 4, excludedFromIncome: true },
    { date: '2026-01-07', direction: 'out', amount: 5, household: true },
    { date: '2026-01-08', direction: 'out', amount: 7, currency: 'USD' },
  ];
  const card = [
    { month, amount: 40, kind: 'spend' },
    { month, amount: 2, kind: 'fee' },
    { month, amount: -25, kind: 'payment' },
    { month, amount: -4, kind: 'refund' },
  ];
  const flow = bankFlowOverTime(bank).find((row) => row.month === month);
  const cardOut = cardFlowTotals(card).byMonthOutflow[month];
  assert.equal(bank.filter((row) => bankCashFlowDirection(row) === 'income').reduce((sum, row) => sum + row.amount, 0), flow.moneyIn);
  assert.equal(bank.filter((row) => bankCashFlowDirection(row) === 'spending').reduce((sum, row) => sum + row.amount, 0) + card.filter(isCardOutflow).reduce((sum, row) => sum + row.amount, 0), flow.moneyOut + cardOut);
  assert.equal(flow.moneyIn, 100);
  assert.equal(flow.moneyOut + cardOut, 62);
});

test('cash-flow selection carries the chosen series into the month drill', () => {
  const opened = [];
  const missing = [];
  const { renderFlowChart } = createFlowChartRenderer({
    el: () => {},
    bankMoney: (amount) => String(amount),
    monthLabel: (month) => month,
    monthShort: (month) => month,
    openMonth: (...args) => opened.push(args),
    openStatementCoverage: () => missing.push('statements'),
  });
  const chart = renderFlowChart([
    { month: '2026-01', income: 100, spending: 62, net: 38 },
    { month: '2026-02', income: 120, spending: 70, net: 50 },
  ]);
  chart.props.onSelect(chart.props.rows[0], 'income');
  chart.props.onSelect(chart.props.rows[1], 'spending');
  assert.deepEqual(opened.map(([month, options]) => [month, options.flow]), [
    ['2026-01', 'income'],
    ['2026-02', 'spending'],
  ]);
  const gap = renderFlowChart([
    { month: '2026-01', income: 100, spending: 62, net: 38 },
    { month: '2026-03', income: 120, spending: 70, net: 50 },
  ]);
  gap.props.onSelect(gap.props.rows[1], 'income');
  assert.deepEqual(missing, ['statements']);
  assert.equal(opened.length, 2);
  const oneSource = renderFlowChart([
    { month: '2026-01', income: 100, bankOut: 30, cardOut: 10, spending: 40, net: 60 },
    { month: '2026-02', income: 0, bankOut: 0, cardOut: 20, spending: 20, net: -20 },
    { month: '2026-03', income: 100, bankOut: 30, cardOut: 10, spending: 40, net: 60 },
  ], { bankMonths: ['2026-01', '2026-03'], cardMonths: ['2026-01', '2026-02', '2026-03'] });
  oneSource.props.onSelect(oneSource.props.rows[1], 'income');
  oneSource.props.onSelect(oneSource.props.rows[1], 'spending');
  assert.deepEqual(missing, ['statements', 'statements']);
  assert.deepEqual(opened.at(-1).map((value, index) => index === 0 ? value : value.flow), ['2026-02', 'spending']);
});

test('income uses one scale for deposits and typical, preserving missing months and zero', () => {
  const model = incomeChartModel({ typicalAmount: 100, series: [
    { month: '2026-01', amount: 100 },
    { month: '2026-02', amount: 1000 },
    { month: '2026-04', amount: 0 },
  ] });
  close(model.cells[1].heightPct / model.cells[0].heightPct, 10);
  close(model.typicalPct, model.cells[0].heightPct);
  assert.equal(model.cells[2].present, false);
  assert.equal(model.cells[2].amount, null);
  assert.equal(model.cells[3].present, true);
  assert.equal(model.cells[3].heightPct, 0);
});

test('income distinguishes a covered month without a deposit from a missing bank statement', () => {
  const model = incomeChartModel({ typicalAmount: 100, series: [
    { month: '2026-01', amount: 100 },
    { month: '2026-04', amount: 120 },
  ] }, {
    recordedMonths: ['2026-01', '2026-02', '2026-04'],
    statementMonths: ['2026-01', '2026-02', '2026-04'],
    coverage: { months: { '2026-04': { bank: 'partial' } } },
  });
  assert.equal(model.cells[1].present, true);
  assert.equal(model.cells[1].amount, 0);
  assert.equal(model.cells[1].noDeposit, true);
  assert.equal(model.cells[2].present, false);
  assert.equal(model.cells[2].missingStatement, true);
  assert.equal(model.cells[2].amount, null);
  assert.equal(model.cells[3].incomplete, true);
  const withoutStatements = incomeChartModel({ series: [
    { month: '2026-01', amount: 100 },
    { month: '2026-04', amount: 120 },
  ] }, { recordedMonths: ['2026-01', '2026-02', '2026-04'] });
  assert.equal(withoutStatements.cells[1].present, false);
  assert.equal(withoutStatements.cells[2].missingStatement, false);
  const lateDeposit = incomeChartModel({ series: [
    { month: '2026-01', amount: 100 },
    { month: '2026-03', amount: 120 },
  ] }, {
    recordedMonths: ['2026-01', '2026-03', '2026-04', '2026-05'],
    statementMonths: ['2026-01', '2026-03', '2026-04', '2026-05'],
    currentMonth: '2026-05',
  });
  assert.equal(lateDeposit.cells.at(-1).month, '2026-04');
  assert.equal(lateDeposit.cells.at(-1).noDeposit, true);
});

test('motion blocks private frames, validates properties, and cancels on reduced motion', async () => {
  const oldDocument = globalThis.document;
  const oldMedia = globalThis.matchMedia;
  const media = { matches: false, addEventListener: (_event, callback) => { media.change = callback; } };
  globalThis.matchMedia = () => media;
  globalThis.document = { documentElement: { dataset: { privacy: 'off' } } };
  const { growIn, drawPath } = await import('../application/ui/motion.js?proof');
  const calls = [];
  const attrs = {};
  const oldStyle = globalThis.getComputedStyle;
  const node = {
    setAttribute: (key, value) => { attrs[key] = value; },
    removeAttribute: (key) => { delete attrs[key]; },
    animate: (frames, options) => {
      const animation = {
        listeners: {},
        addEventListener(type, callback) { this.listeners[type] = callback; },
        cancel() { this.cancelled = true; this.oncancel?.(); this.listeners.cancel?.(); },
      };
      calls.push({ frames, options, animation });
      return animation;
    },
  };
  try {
    assert.throws(() => growIn(node, { textContent: 'secret' }, {}), /not an allowed/);
    growIn(node, { opacity: 0 }, { opacity: 1 });
    assert.equal(calls.length, 1);
    document.documentElement.dataset.privacy = 'on';
    const count = calls.length;
    growIn(node, { opacity: 0 }, { opacity: 1 });
    assert.equal(calls.length, count);
    assert.ok(!formatMoney(123456, '$', 'en-US', 0).includes('123'));
    document.documentElement.dataset.privacy = 'off';
    drawPath(node, 100);
    assert.equal(attrs['stroke-dasharray'], undefined);
    assert.equal(calls.length, count);
    globalThis.getComputedStyle = () => ({ vectorEffect: 'non-scaling-stroke' });
    drawPath({ ...node, isConnected: true, getScreenCTM: () => ({ a: 1.848, d: 0.917 }) }, 100);
    const reveal = calls[calls.length - 1];
    close(reveal.frames[0].strokeDashoffset, 184.8);
    close(Number(attrs['stroke-dasharray']), 184.8);
    media.matches = true;
    media.change();
    assert.ok(calls.every((call) => call.animation.cancelled));
    assert.equal(attrs['stroke-dasharray'], undefined);
    assert.equal(attrs['stroke-dashoffset'], undefined);
    const reducedCount = calls.length;
    growIn(node, { opacity: 0 }, { opacity: 1 });
    assert.equal(calls.length, reducedCount);
  } finally {
    globalThis.document = oldDocument;
    globalThis.matchMedia = oldMedia;
    globalThis.getComputedStyle = oldStyle;
  }
});
