import { makeMoney } from '../core/money-format.js';

// The printed form of a plan. Pure: it turns an already-built plan model into
// the flat, text-only shape the report renderer draws, and adds nothing the
// screen does not already say.
export function buildPlanPrintModel({ plan = null, model = null, cfg = {}, meta = {} } = {}) {
  if (!plan || !model) return null;
  const money = makeMoney(cfg);
  const groups = model.groups.map((g) => ({
    key: g.key,
    label: g.label,
    meaning: g.meaning,
    actual: g.actualText,
    target: g.targetAmountText,
    share: `${g.share}%`,
    targetShare: `${g.targetPct}%`,
    // The same plain direction the screen shows - never a grade.
    tracking: g.trackText,
    onTarget: g.direction === 'on',
  }));
  return {
    title: 'Plan',
    takeHome: model.takeHomeText,
    basis: model.income.basis,
    period: meta.period || model.period || '',
    groups,
    free: {
      amount: model.free.amountText,
      label: model.free.label,
      note: (model.free.reconciling && model.free.reconciling.text) || '',
    },
    unaccounted: plan.unaccounted > 0.5 ? money(plan.unaccounted) : null,
    drawdown: model.drawdown ? model.drawdownText : null,
    foreign: (model.foreignSetAside || []).map((f) => f.text),
    savedOn: plan.target && plan.target.savedAt ? plan.target.savedAt : null,
    usingDefault: model.targetsAreDefault,
    gaps: plan.gaps || [],
  };
}
