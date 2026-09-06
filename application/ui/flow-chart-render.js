import { requireCtx, MONTHS_SHORT, monthIndex, roundMoney } from '../core/shared-helpers.js';
import { monthTickOf, chartIsHidden } from './chart-helpers.js';
import { coverageTimeline } from '../analysis/coverage-map.js';

export function flowChartModel(trend, opts = {}) {
  const recorded = (Array.isArray(trend) ? trend : [])
    .filter((r) => r && Number.isFinite(monthIndex(r.month)))
    .map((r) => ({
      month: String(r.month),
      income: Math.max(0, Number(r.income) || 0),
      spending: Math.max(0, Number(r.spending) || 0),
      net: Number(r.net) || 0,
      bankOut: Math.max(0, Number(r.bankOut) || 0),
      cardOut: Math.max(0, Number(r.cardOut) || 0),
    }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  const byMonth = new Map(recorded.map((row) => [row.month, row]));
  const sourceAware = Array.isArray(opts.bankMonths) || Array.isArray(opts.cardMonths);
  const bankMonths = (sourceAware ? opts.bankMonths || [] : [...byMonth.keys(), ...(opts.recordedMonths || [])]).filter((month) => Number.isFinite(monthIndex(month)));
  const cardMonths = (sourceAware ? opts.cardMonths || [] : []).filter((month) => Number.isFinite(monthIndex(month)));
  const timeline = coverageTimeline({ bankMonths, cardMonths, coverage: opts.coverage, ledgers: sourceAware ? ['bank', 'card'] : ['bank'] });
  const rows = timeline.months.map((entry) => {
    const row = byMonth.get(entry.month) || { month: entry.month, income: 0, spending: 0, net: 0, bankOut: 0, cardOut: 0 };
    if (!sourceAware) return { ...row, present: entry.bank !== 'missing' };
    const bankPresent = entry.bank !== 'missing' && entry.bank !== 'outside';
    const cardPresent = entry.card !== 'missing' && entry.card !== 'outside';
    const present = bankPresent || cardPresent;
    const income = bankPresent ? row.income : null;
    const spending = present ? roundMoney((bankPresent ? row.bankOut : 0) + (cardPresent ? row.cardOut : 0)) : null;
    const net = income == null || spending == null ? null : roundMoney(income - spending);
    const issue = (status, source) => status === 'partial' ? `Partial ${source} statement` : status === 'missing' ? `No ${source} statement` : status === 'outside' ? `${source === 'bank' ? 'Bank' : 'Card'} history unavailable` : null;
    const incomeIssue = bankMonths.length ? issue(entry.bank, 'bank') : 'No bank statements imported';
    const spendingIssue = [bankMonths.length ? incomeIssue : null, cardMonths.length ? issue(entry.card, 'card') : null].filter(Boolean).join(' · ');
    return {
      month: entry.month,
      income,
      spending,
      net,
      present,
      incomeIssue,
      spendingIssue,
      incomeIncomplete: entry.bank === 'partial',
      spendingIncomplete: !!spendingIssue,
    };
  });
  if (rows.length < 2) return null;

  const maxBars = opts.maxBars && opts.maxBars > 0 ? opts.maxBars : 12;
  const months = rows.slice(-maxBars);

  const peakRaw = Math.max(...months.map((r) => Math.max(r.income || 0, r.spending || 0, Math.abs(r.net || 0))), 1);
  const ref = peakRaw * 1.08;
  const scale = (v) => (v / ref) * 100;
  const netScale = scale;
  const bars = months.map((r) => ({
    month: r.month,
    income: r.present ? r.income : null,
    spending: r.present ? r.spending : null,
    net: r.present ? r.net : null,
    present: r.present,
    incomeIssue: r.incomeIssue,
    spendingIssue: r.spendingIssue,
    incomeIncomplete: r.incomeIncomplete,
    spendingIncomplete: r.spendingIncomplete,
    recorded: !r.present || r.income == null || r.spending == null || !!r.incomeIncomplete || !!r.spendingIncomplete,
    incomePct: scale(r.income || 0),
    spendingPct: scale(r.spending || 0),
    netPct: netScale(r.net || 0),
  }));

  const peak = peakRaw;

  const scope = sourceAware ? bankMonths.length && cardMonths.length ? 'Bank and card statements' : bankMonths.length ? 'Bank statements only' : 'Card statements only' : null;
  return { bars, peak, ref, months: months.map((r) => r.month), scope };
}

export function createFlowChartRenderer(ctx) {
  requireCtx(ctx, ['el', 'bankMoney', 'monthLabel', 'monthShort', 'openMonth', 'openStatementCoverage'], 'createFlowChartRenderer');
  function guardFollowupClick(event) {
    if (typeof document === 'undefined' || !event || !event.detail) return;
    const x = event.clientX;
    const y = event.clientY;
    const expires = Date.now() + 500;
    let timer;
    const remove = () => {
      document.removeEventListener('pointerdown', suppress, true);
      document.removeEventListener('click', suppress, true);
      clearTimeout(timer);
    };
    const suppress = (next) => {
      if (Date.now() > expires) {
        remove();
        return;
      }
      if (Math.abs(next.clientX - x) <= 10 && Math.abs(next.clientY - y) <= 10) {
        next.preventDefault();
        next.stopImmediatePropagation();
      }
    };
    queueMicrotask(() => {
      document.addEventListener('pointerdown', suppress, true);
      document.addEventListener('click', suppress, true);
    });
    timer = setTimeout(remove, 500);
  }
  function renderFlowChart(trend, opts = {}) {
    const model = flowChartModel(trend, opts);
    if (!model) return null;
    const { bankMoney } = ctx;
    if (chartIsHidden()) return { hidden: true };
    const rows = model.bars.map((bar) => ({ ...bar, detail: bar.recorded || bar.net == null ? null : `${bar.net < 0 ? 'Shortfall' : 'Net cash'}: ${bankMoney(bar.net)}` }));
    const net = rows.reduce((sum, row) => sum + (row.net || 0), 0);
    const range = `${ctx.monthShort(model.months[0])} - ${ctx.monthShort(model.months[model.months.length - 1])}`;
    const onSelect = (row, flow, event) => {
      guardFollowupClick(event);
      if (!row.present || row[flow] == null) {
        ctx.openStatementCoverage();
        return;
      }
      ctx.openMonth(row.month, {
        view: 'activity',
        activityTab: 'transactions',
        anchorId: '#acct-tx',
        flow,
      });
    };
    return {
      props: {
        ctx,
        rows,
        reference: model.ref,
        range,
        scope: model.scope,
        net,
        totals: {
          income: rows.reduce((sum, row) => sum + (row.income || 0), 0),
          spending: rows.reduce((sum, row) => sum + (row.spending || 0), 0),
        },
        monthShort: monthTickOf(MONTHS_SHORT, rows),
        onSelect,
      },
    };
  }
  return { renderFlowChart };
}
