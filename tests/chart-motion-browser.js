import { createFlowChartRenderer } from '../application/ui/flow-chart-render.js';
import { createIncomeChartRenderer } from '../application/ui/income-chart-render.js';
import { createTreemapRenderer } from '../application/ui/treemap-render.js';
import { makeMoney, makeMoneyShort } from '../application/core/money-format.js';

export async function runChartMotionChecks() {
  let pass = 0;
  let fail = 0;
  const check = (condition, message) => {
    if (condition) pass++;
    else { fail++; console.log('FAIL ' + message); }
  };
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) node.setAttribute(key, value);
    }
    node.append(...children.flat().filter((child) => child != null && child !== false));
    return node;
  };
  const previousPrivacy = document.documentElement.dataset.privacy;
  const host = el('div', { id: 'app', style: 'position:fixed;left:-10000px;top:0;width:720px;' });
  document.body.append(host);
  const money = makeMoney({ currency: { symbol: '$', locale: 'en-US', code: 'USD', decimals: 0 } });
  const ctx = { el, bankMoney: money, money0: money, moneyShort: makeMoneyShort(), monthLabel: (m) => m };
  const flow = createFlowChartRenderer(ctx);
  const income = createIncomeChartRenderer(ctx);
  const series = { typicalAmount: 100, series: [{ month: '2026-01', amount: 100 }, { month: '2026-02', amount: 120 }, { month: '2026-04', amount: 1000 }] };
  const trend = [{ month: '2026-01', income: 100, spending: 200, net: -100 }, { month: '2026-02', income: 1000, spending: 0, net: 1000 }];
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    document.documentElement.dataset.privacy = 'off';
    let chart = flow.renderFlowChart(trend);
    host.append(chart);
    check(chart.querySelectorAll('.chart-axis span').length === 10, 'cash-flow scale is visible');
    check(chart.querySelectorAll('.fl-panel').length === 2, 'cash in and out use separate upward charts');
    const scales = [...chart.querySelectorAll('.chart-axis')].map((axis) => axis.textContent);
    check(scales[0] === scales[1], 'both charts share the same scale');
    check(chart.querySelector('.fl-summary').textContent.includes('900'), 'net cash is visible for the displayed months');
    const bars = [...chart.querySelectorAll('.chart-bar')];
    check(+bars[3].getAttribute('height') === 0, 'zero spending does not paint a minimum bar');
    const button = chart.querySelector('button');
    button.focus();
    check(chart.querySelector('.chart-tooltip').hidden === false, 'keyboard focus opens details');
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    check(document.activeElement === chart.querySelectorAll('button')[1], 'arrow navigation reaches the next month');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check(chart.querySelector('.chart-tooltip').hidden, 'Escape closes details');
    document.documentElement.dataset.privacy = 'on';
    await frame();
    check(getComputedStyle(chart).display === 'none', 'existing chart disappears before a privacy rebuild');
    const hidden = flow.renderFlowChart(trend);
    check(!hidden.querySelector('svg, button'), 'private flow renders no data geometry or targets');
    const flat = income.renderIncomeChart({ typicalAmount: 100, series: ['01', '02', '03'].map((m) => ({ month: '2026-' + m, amount: 100 })) });
    check(!flat.querySelector('svg'), 'steady income also respects the hidden-state gate');
    for (let turn = 0; turn < 8; turn++) {
      document.documentElement.dataset.privacy = 'off';
      host.replaceChildren(income.renderIncomeChart(series), flow.renderFlowChart(trend));
      document.documentElement.dataset.privacy = 'on';
      host.replaceChildren(income.renderIncomeChart(series), flow.renderFlowChart(trend));
      await frame();
      check(!host.querySelector('svg, .chart-tooltip, .chart-target'), `private animation frame ${turn} contains no values or shapes`);
    }
    document.documentElement.dataset.privacy = 'off';
    chart = income.renderIncomeChart(series);
    host.replaceChildren(chart);
    const change = [...chart.querySelectorAll('.chart-controls button')].find((b) => b.textContent === 'Change');
    change.click();
    check(change.getAttribute('aria-pressed') === 'true', 'income scale selection updates accessibly');
    check(chart.querySelector('.chart-net-line') && !chart.querySelector('.chart-bar'), 'zoomed income uses points rather than truncated bars');
    check(chart.querySelectorAll('.chart-target').length === 4, 'missing months retain their own slots');
    const treemap = createTreemapRenderer({ ...ctx, catColour: () => '#3f9d6b' });
    const analysis = { by_category: [{ name: 'Groceries', amount: 200 }, { name: 'Utilities', amount: 100 }] };
    const a = treemap.renderTreemapCard(analysis);
    const b = treemap.renderTreemapCard(analysis);
    if (a && b) {
      host.replaceChildren(a, b);
      const ids = [...host.querySelectorAll('[id]')].map((node) => node.id);
      check(new Set(ids).size === ids.length, 'multiple treemaps use unique clip and tooltip ids');
    } else check(false, 'treemap fixture renders');
  } finally {
    host.remove();
    if (previousPrivacy == null) delete document.documentElement.dataset.privacy;
    else document.documentElement.dataset.privacy = previousPrivacy;
  }
  console.log(`checks: ${pass} passed, ${fail} failed`);
  if (fail) throw new Error(`${fail} chart motion browser checks failed`);
}
