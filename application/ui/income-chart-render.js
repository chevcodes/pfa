import { requireCtx, MONTHS_SHORT } from '../core/shared-helpers.js';
import { shortMonthOf, ordinalDay, chartIsHidden, renderHiddenChart } from './chart-helpers.js';
import { crossfade } from './motion.js';
import { markProportional } from '../core/privacy.js';
import { renderColumnChart } from './chart-surface.js';

export function fillMonthRange(from, to) {
  const parse = (m) => {
    const mm = /^(\d{4})-(\d{2})$/.exec(String(m));
    return mm ? +mm[1] * 12 + (+mm[2] - 1) : NaN;
  };
  const toKey = (idx) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
  const a = parse(from),
    b = parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return [String(from)];
  const out = [];
  for (let i = a; i <= b; i++) out.push(toKey(i));
  return out;
}

export function incomeChartModel(income, opts = {}) {
  if (!income || !Array.isArray(income.series)) return null;

  const raw = income.series
    .filter(
      (s) =>
        s &&
        /^\d{4}-\d{2}$/.test(String(s.month)) &&
        Number.isFinite(Number(s.amount)) &&
        Number(s.amount) >= 0
    )
    .map((s) => ({
      month: String(s.month),
      amount: Number(s.amount),
      day: Number.isFinite(Number(s.day)) && Number(s.day) > 0 ? Number(s.day) : null,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  if (raw.length < 2) return null;

  const byMonth = new Map(raw.map((s) => [s.month, s]));
  const allMonths = fillMonthRange(raw[0].month, raw[raw.length - 1].month);
  const maxCells = opts.maxCells && opts.maxCells > 0 ? opts.maxCells : 12;
  const months = allMonths.slice(-maxCells);

  const presentAmounts = months.filter((m) => byMonth.has(m)).map((m) => byMonth.get(m).amount);
  if (presentAmounts.length < 2) return null;

  const typical = Number.isFinite(Number(income.typicalAmount))
    ? Number(income.typicalAmount)
    : null;

  const OFF_RATIO = 0.18;
  const isOff = (amount) =>
    typical != null && typical > 0 && Math.abs((amount - typical) / typical) >= OFF_RATIO;

  const bandMin = 0;
  const bandMax = Math.max(1, ...presentAmounts, typical || 0) * 1.08;
  const bandRange = bandMax - bandMin;

  const cells = months.map((month) => {
    const hit = byMonth.get(month);
    if (!hit) {
      return {
        month,
        present: false,
        amount: null,
        day: null,
        off: false,
        offDirection: null,
        heightPct: 0,
      };
    }
    const amount = hit.amount;
    const off = isOff(amount);
    const offDirection = off ? (amount > typical ? 'higher' : 'lower') : null;
    const heightPct = ((amount - bandMin) / bandRange) * 100;
    return {
      month,
      present: true,
      amount,
      day: hit.day,
      off,
      offDirection,
      heightPct,
    };
  });

  const typicalPct =
    typical != null && typical >= bandMin && typical <= bandMax
      ? ((typical - bandMin) / bandRange) * 100
      : null;

  return {
    cells,
    typicalAmount: typical,
    typicalPct,
    bandMin,
    bandMax,
    label: income.label || null,
    regularity: income.regularity || null,
    stepChange: income.stepChange || null,
  };
}

export function createIncomeChartRenderer(ctx) {
  requireCtx(ctx, ['el', 'money0', 'moneyShort', 'monthLabel'], 'createIncomeChartRenderer');
  const { el } = ctx;
  function renderIncomeChart(income, opts = {}) {
    const model = incomeChartModel(income, opts);
    if (!model) return null;
    if (chartIsHidden()) return renderHiddenChart(el, 'Your income pattern', { height: '220px' });
    const root = markProportional(el('div', { class: 'ic-chart' }));
    const rows = model.cells.map((cell) => ({
      ...cell,
      detail: [cell.day ? `Landed on the ${cell.day}${ordinalDay(cell.day)}` : '', cell.off ? `${cell.offDirection} than usual` : ''].filter(Boolean).join(' · '),
    }));
    const amounts = rows.filter((row) => row.present).map((row) => row.amount);
    const low = Math.min(...amounts, model.typicalAmount ?? Infinity);
    const high = Math.max(...amounts, model.typicalAmount || 0);
    const pad = Math.max((high - low) * 0.15, high * 0.01, 1);
    const controls = el('div', { class: 'chart-controls', role: 'group', 'aria-label': 'Income scale' });
    let current;
    const buttons = [];
    function build(mode) {
      return renderColumnChart({ ...ctx, monthShort: shortMonthOf(MONTHS_SHORT) }, {
        label: mode === 'line' ? 'Income change, zoomed scale' : 'Monthly income, zero baseline',
        rows,
        series: [{ key: 'amount', label: 'Income', tone: 'in' }],
        guide: model.typicalAmount,
        mode,
        ...(mode === 'line' ? { min: Math.max(0, low - pad), max: high + pad } : {}),
      });
    }
    for (const [label, mode] of [['Amount', 'bar'], ['Change', 'line']]) {
      const button = el('button', { type: 'button', class: 'btn sm ghost', 'aria-pressed': mode === 'bar' ? 'true' : 'false' }, label);
      button.addEventListener('click', () => {
        if (chartIsHidden()) return;
        const next = build(mode);
        crossfade(current, next);
        current = next;
        for (const other of buttons) other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
      });
      buttons.push(button);
      controls.append(button);
    }
    current = build('bar');
    root.append(controls, current);
    return root;
  }
  return { renderIncomeChart };
}
