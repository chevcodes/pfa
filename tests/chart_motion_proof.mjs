import test from 'node:test';
import assert from 'node:assert/strict';
import { flowChartModel } from '../application/ui/flow-chart-render.js';
import { incomeChartModel } from '../application/ui/income-chart-render.js';
import { formatMoney } from '../application/core/money-format.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

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

test('motion blocks private frames, validates properties, and cancels on reduced motion', async () => {
  const oldDocument = globalThis.document;
  const oldMedia = globalThis.matchMedia;
  const media = { matches: false, addEventListener: (_event, callback) => { media.change = callback; } };
  globalThis.matchMedia = () => media;
  globalThis.document = { documentElement: { dataset: { privacy: 'off' } } };
  const { growIn, drawPath } = await import('../application/ui/motion.js?proof');
  const calls = [];
  const attrs = {};
  const node = {
    setAttribute: (key, value) => { attrs[key] = value; },
    animate: (frames, options) => {
      const animation = { cancel() { this.cancelled = true; this.oncancel?.(); } };
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
    assert.equal(attrs['stroke-dashoffset'], '0');
    media.matches = true;
    media.change();
    assert.ok(calls.every((call) => call.animation.cancelled));
    const reducedCount = calls.length;
    growIn(node, { opacity: 0 }, { opacity: 1 });
    assert.equal(calls.length, reducedCount);
  } finally {
    globalThis.document = oldDocument;
    globalThis.matchMedia = oldMedia;
  }
});
