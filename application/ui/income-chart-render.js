import { requireCtx, MONTHS_SHORT, monthIndex } from '../core/shared-helpers.js';
import { coverageTimeline } from '../analysis/coverage-map.js';
import { monthTickOf, ordinalDay, chartIsHidden } from './chart-helpers.js';

export function fillMonthRange(from, to) {
  const toKey = (idx) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
  const a = monthIndex(from),
    b = monthIndex(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  if (b < a) return [String(from)];
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
        Number.isFinite(monthIndex(s.month)) &&
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
  const suppliedMonths = (opts.recordedMonths || []).filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)));
  const coverageKnown = (opts.statementMonths || []).length > 0;
  const recordedMonths = [...new Set([...suppliedMonths, ...raw.map((entry) => entry.month)])];
  const bankCoverage = new Map(coverageKnown ? coverageTimeline({ bankMonths: recordedMonths, coverage: opts.coverage, ledgers: ['bank'] }).months.map((entry) => [entry.month, entry.bank]) : []);
  const lastRecorded = coverageKnown ? recordedMonths.filter((month) => !opts.currentMonth || month < opts.currentMonth).sort().at(-1) : null;
  const lastMonth = [raw[raw.length - 1].month, lastRecorded].filter(Boolean).sort().at(-1);
  const allMonths = fillMonthRange(raw[0].month, lastMonth);
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
    const status = bankCoverage.get(month);
    if (!hit) {
      if (status && status !== 'missing' && status !== 'outside') return {
        month,
        present: true,
        amount: 0,
        day: null,
        off: false,
        offDirection: null,
        heightPct: 0,
        noDeposit: true,
        incomplete: status === 'partial',
      };
      return {
        month,
        present: false,
        amount: null,
        day: null,
        off: false,
        offDirection: null,
        heightPct: 0,
        missingStatement: status === 'missing',
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
      incomplete: status === 'partial',
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
    coverageKnown,
  };
}

export function createIncomeChartRenderer(ctx) {
  requireCtx(ctx, ['el', 'money0', 'moneyShort', 'monthLabel'], 'createIncomeChartRenderer');
  function renderIncomeChart(income, opts = {}) {
    const model = incomeChartModel(income, opts);
    if (!model) return null;
    if (chartIsHidden()) return { hidden: true };
    const rows = model.cells.map((cell) => ({
      ...cell,
      detail: [cell.day ? `Landed on the ${cell.day}${ordinalDay(cell.day)}` : '', cell.off ? `${cell.offDirection} than usual` : '', cell.noDeposit ? 'No deposit recorded' : ''].filter(Boolean).join(' · '),
    }));
    const amounts = rows.filter((row) => row.present).map((row) => row.amount);
    const low = Math.min(...amounts, model.typicalAmount ?? Infinity);
    const high = Math.max(...amounts, model.typicalAmount || 0);
    const pad = Math.max((high - low) * 0.15, high * 0.01, 1);
    return {
      props: {
        ctx: { ...ctx, monthShort: monthTickOf(MONTHS_SHORT, rows) },
        rows,
        guide: model.typicalAmount,
        guideLabel: model.label ? `Typical ${model.label}` : 'Typical payment',
        missingText: model.coverageKnown ? 'No bank statement' : 'No deposit found',
        missingLegend: model.coverageKnown ? '⋮ No bank statement' : '⋮ No deposit found',
        min: Math.max(0, low - pad),
        max: high + pad,
        ...(typeof opts.onMonth === 'function' ? { onSelect: (row) => opts.onMonth(row.month, row) } : {}),
      },
    };
  }
  return { renderIncomeChart };
}
