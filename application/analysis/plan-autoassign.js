import { median, monthKey, roundMoney, amtOf, dateOf } from '../core/shared-helpers.js';
import { GROUP_KEYS, groupForCategory, resolveGroupMap } from './plan.js';

export function categoryEvidence(cardRows, opts = {}) {
  const asOf = opts.asOf || null;
  const byCategory = new Map();
  const monthsSeen = new Set();
  for (const r of cardRows || []) {
    const kind = String(r.kind || r.Type || r.type || '').toLowerCase();
    if (kind !== 'spend' && kind !== 'fee') continue;
    const d = dateOf(r);
    if (!d || (asOf && d > asOf)) continue;
    const m = monthKey(d);
    if (m === 'unknown') continue;
    monthsSeen.add(m);
    const name = r.category || '';
    if (!name) continue;
    if (!byCategory.has(name)) byCategory.set(name, new Map());
    const months = byCategory.get(name);
    months.set(m, roundMoney((months.get(m) || 0) + amtOf(r)));
  }
  const span = monthsSeen.size || 1;
  const out = [];
  for (const [name, months] of byCategory) {
    const values = [...months.values()];
    const typical = roundMoney(median(values));
    if (typical <= 0) continue;
    const spread = values.length
      ? roundMoney(median(values.map((v) => Math.abs(v - typical))) / (typical || 1))
      : 0;
    out.push({
      name,
      typical,
      monthsPresent: months.size,
      coverage: Math.round((months.size / span) * 100) / 100,
      spread,
    });
  }
  return out.sort((a, b) => b.typical - a.typical);
}

// A category's group is decided by OBLIGATION, never by rhythm. Recurring is
// not the same as fixed: dining out every month is recurring AND guilt-free,
// so recurrence is deliberately not used to infer a group anywhere here. Only
// the categories whose group is genuinely not a judgement call are placed
// automatically; everything the config marks as a real decision is put to the
// person, and so is anything unrecognised with material spending behind it.
//
// The evidence attached to a question is context for the person - how much,
// how often - and never a recommendation dressed up as one.
export function autoAssign({ categories = [], evidence = [], cfg = {}, stored = null, minShare = 0.02 } = {}) {
  const seed = ((cfg && cfg.planBands) || {}).seed || {};
  const ask = new Set((seed.ask || []).map((n) => String(n).toLowerCase()));
  const placed = resolveGroupMap(cfg, null);
  const storedMap = { ...(stored || {}) };
  const byName = new Map(evidence.map((e) => [e.name, e]));
  const totalTypical = evidence.reduce((s, e) => s + e.typical, 0) || 1;

  const assignments = {};
  const ambiguous = [];
  for (const name of categories) {
    const key = String(name).toLowerCase();
    if (storedMap[name] && GROUP_KEYS.includes(storedMap[name])) continue;
    const ev = byName.get(name) || null;
    const share = ev ? ev.typical / totalTypical : 0;
    const isQuestion = ask.has(key) || !placed[key];

    if (!isQuestion) {
      assignments[name] = placed[key];
      continue;
    }
    // Nothing is spent here, or so little that asking would cost more
    // attention than the answer is worth. Free spending is the honest
    // resting place for anything not shown to be an obligation.
    if (!ev || share < minShare) {
      assignments[name] = placed[key] || 'free';
      continue;
    }
    ambiguous.push({
      name,
      typical: ev.typical,
      share: Math.round(share * 1000) / 10,
      coverage: ev.coverage,
      monthsPresent: ev.monthsPresent,
      because: `in ${ev.monthsPresent} of the last ${Math.max(ev.monthsPresent, Math.round(ev.monthsPresent / (ev.coverage || 1)))} months`,
    });
  }
  return { assignments, ambiguous: ambiguous.sort((a, b) => b.typical - a.typical) };
}

export function groupSummary({ categories = [], cfg = {}, stored = null }) {
  const map = resolveGroupMap(cfg, stored);
  const counts = { fixed: 0, setAside: 0, free: 0 };
  for (const name of categories) counts[groupForCategory(name, map)] += 1;
  return counts;
}
