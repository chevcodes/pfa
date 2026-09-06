import { requireCtx, MONTHS_SHORT } from '../core/shared-helpers.js';
import { shortMonthOf, chartIsHidden, renderHiddenChart } from './chart-helpers.js';
import { markProportional } from '../core/privacy.js';
import { renderColumnChart } from './chart-surface.js';

export function flowChartModel(trend, opts = {}) {
  const rows = (Array.isArray(trend) ? trend : [])
    .filter((r) => r && /^\d{4}-\d{2}$/.test(String(r.month)))
    .map((r) => ({
      month: String(r.month),
      income: Math.max(0, Number(r.income) || 0),
      spending: Math.max(0, Number(r.spending) || 0),
      net: Number(r.net) || 0,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  if (rows.length < 2) return null;

  const maxBars = opts.maxBars && opts.maxBars > 0 ? opts.maxBars : 12;
  const months = rows.slice(-maxBars);

  const peakRaw = Math.max(...months.map((r) => Math.max(r.income, r.spending, Math.abs(r.net))), 1);
  const ref = peakRaw * 1.08;
  const scale = (v) => (v / ref) * 100;
  const netScale = scale;
  const bars = months.map((r) => ({
    month: r.month,
    income: r.income,
    spending: r.spending,
    net: r.net,
    incomePct: scale(r.income),
    spendingPct: scale(r.spending),
    netPct: netScale(r.net),
  }));

  const peak = peakRaw;

  return { bars, peak, ref, months: months.map((r) => r.month) };
}

export function createFlowChartRenderer(ctx) {
  requireCtx(ctx, ['el', 'bankMoney', 'monthLabel'], 'createFlowChartRenderer');
  function renderFlowChart(trend, opts = {}) {
    const model = flowChartModel(trend, opts);
    if (!model) return null;
    const { el, bankMoney, monthLabel } = ctx;
    if (chartIsHidden()) return renderHiddenChart(el, 'Cash in and out', { height: '220px' });
    const root = markProportional(el('div', { class: 'fl-chart', role: 'group', 'aria-label': 'Cash in and out' }));
    const panels = el('div', { class: 'fl-panels' });
    const rows = model.bars.map((bar) => ({ ...bar, detail: `${bar.net < 0 ? 'Shortfall' : 'Net cash'}: ${bankMoney(bar.net)}` }));
    const inspect = (_row, index) => {
      for (const panel of charts) {
        [...panel.querySelectorAll('.chart-target')].forEach((target, i) => target.classList.toggle('is-compared', i === index));
      }
    };
    const charts = [];
    for (const [key, label, tone] of [['income', 'Cash inflow', 'in'], ['spending', 'Cash outflow', 'out']]) {
      const total = rows.reduce((sum, row) => sum + row[key], 0);
      const chart = renderColumnChart({ ...ctx, monthShort: shortMonthOf(MONTHS_SHORT) }, {
        label,
        rows,
        money: bankMoney,
        min: 0,
        max: model.ref,
        series: [{ key, label, tone }],
        hideLegend: true,
        onInspect: inspect,
      });
      charts.push(chart);
      panels.append(el('section', { class: 'fl-panel' },
        el('div', { class: 'fl-panel-head' }, el('h4', {}, el('i', { class: `chart-key is-${tone}`, 'aria-hidden': 'true' }), label), el('span', { class: 'num' }, bankMoney(total))), chart));
    }
    for (const chart of charts) {
      const scroll = chart.querySelector('.chart-scroll');
      scroll.addEventListener('scroll', () => {
        for (const other of charts) {
          const target = other.querySelector('.chart-scroll');
          if (target !== scroll && target.scrollLeft !== scroll.scrollLeft) target.scrollLeft = scroll.scrollLeft;
        }
      });
    }
    const net = rows.reduce((sum, row) => sum + row.net, 0);
    const range = `${monthLabel(model.months[0])} – ${monthLabel(model.months[model.months.length - 1])}`;
    root.append(panels, el('div', { class: 'fl-summary' },
      el('span', { class: 'muted small' }, range),
      el('span', { class: net < 0 ? 'fl-net is-short' : 'fl-net' }, 'Net cash ', el('strong', { class: 'num' }, bankMoney(net)))));
    return root;
  }
  return { renderFlowChart };
}
