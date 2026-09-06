import { monthIndex } from '../core/shared-helpers.js';

function ymFromIndex(index) {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

// Every calendar month between the first and the last month either ledger has
// seen, including the ones with nothing in them. buildStatementCoverage only
// describes months that HAVE data, so a month with no statement at all simply
// did not appear anywhere - the gap was invisible precisely when it mattered
// most. This fills the run in and names each month for each ledger.
export function coverageTimeline({
  cardMonths = [],
  bankMonths = [],
  coverage = null,
  ledgers = ['card', 'bank'],
} = {}) {
  const card = new Set(cardMonths);
  const bank = new Set(bankMonths);
  const all = [...new Set([...card, ...bank])].filter(Boolean).sort();
  if (!all.length) return { months: [], span: 0, gaps: {}, complete: true };

  const startIndex = monthIndex(all[0]);
  const endIndex = monthIndex(all[all.length - 1]);
  if (Number.isNaN(startIndex) || Number.isNaN(endIndex)) {
    return { months: [], span: 0, gaps: {}, complete: true };
  }

  const statusFor = (ledger, ym, present) => {
    if (!present) return 'missing';
    const c = coverage && coverage.months && coverage.months[ym];
    const s = c ? c[ledger] : null;
    if (s === 'partial') return 'partial';
    if (s === 'full') return 'full';
    return 'loaded';
  };

  const months = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const ym = ymFromIndex(i);
    const row = { month: ym };
    if (ledgers.includes('card')) row.card = statusFor('card', ym, card.has(ym));
    if (ledgers.includes('bank')) row.bank = statusFor('bank', ym, bank.has(ym));
    months.push(row);
  }

  const gaps = {};
  for (const ledger of ledgers) {
    const missing = months.filter((m) => m[ledger] === 'missing').map((m) => m.month);
    const partial = months.filter((m) => m[ledger] === 'partial').map((m) => m.month);
    let longest = 0;
    let run = 0;
    for (const m of months) {
      if (m[ledger] === 'missing') {
        run += 1;
        longest = Math.max(longest, run);
      } else run = 0;
    }
    gaps[ledger] = { missing, partial, longestRun: longest };
  }

  return {
    months,
    span: months.length,
    gaps,
    complete: ledgers.every((l) => gaps[l].missing.length === 0),
  };
}

export function coverageSummary(timeline, ledger) {
  const g = (timeline && timeline.gaps && timeline.gaps[ledger]) || { missing: [], partial: [] };
  const total = (timeline && timeline.span) || 0;
  const loaded = total - g.missing.length;
  return {
    total,
    loaded,
    missing: g.missing.length,
    partial: g.partial.length,
    longestRun: g.longestRun || 0,
    complete: g.missing.length === 0 && total > 0,
  };
}

// Whether a projection can honestly be drawn. The old gate counted DISTINCT
// bank months, so two months a year apart passed it and a projection was drawn
// across a hole. Readiness now needs enough months AND an unbroken recent run,
// because a projection is a statement about continuity.
export function projectionReadiness({ bankMonths = [], minMonths = 2, coverage = null } = {}) {
  const months = [...new Set(bankMonths)].filter(Boolean).sort();
  if (months.length < minMonths) {
    return {
      ready: false,
      reason: 'too-few',
      monthsSoFar: months.length,
      minMonths,
      gapMonths: [],
    };
  }
  const timeline = coverageTimeline({ bankMonths: months, coverage, ledgers: ['bank'] });
  const recent = timeline.months.slice(-minMonths);
  const gapMonths = recent.filter((m) => m.bank === 'missing').map((m) => m.month);
  if (gapMonths.length) {
    return { ready: false, reason: 'gap', monthsSoFar: months.length, minMonths, gapMonths };
  }
  return { ready: true, reason: '', monthsSoFar: months.length, minMonths, gapMonths: [] };
}
