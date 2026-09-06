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
  investmentMonths = [],
  coverage = null,
  ledgers = ['card', 'bank'],
} = {}) {
  const monthsByLedger = {
    card: new Set(cardMonths),
    bank: new Set(bankMonths),
    investment: new Set(investmentMonths),
  };
  const all = [...new Set(ledgers.flatMap((ledger) => [...(monthsByLedger[ledger] || [])]))].filter(Boolean).sort();
  if (!all.length) return { months: [], span: 0, gaps: {}, complete: true };

  const startIndex = monthIndex(all[0]);
  const endIndex = monthIndex(all[all.length - 1]);
  if (Number.isNaN(startIndex) || Number.isNaN(endIndex)) {
    return { months: [], span: 0, gaps: {}, complete: true };
  }

  // A LEDGER'S OWN RANGE, not the run the two of them share.
  //
  // The timeline spans both ledgers together so the two strips line up against
  // one calendar, which is the point of drawing them one above the other. But
  // "missing" was then taken to mean every month inside that shared run where
  // a ledger had nothing - so a bank history that honestly starts two years
  // after the card history was reported as 24 missing bank statements. The
  // card said that while the Account-statements panel two rows above it said
  // "All months covered", both about the same records.
  //
  // Months outside a ledger's own first-to-last run are its own state:
  // nothing is missing there, its records simply do not reach that far.
  const rangeOf = (set) => {
    const list = [...set].filter(Boolean).sort();
    return list.length ? { first: list[0], last: list[list.length - 1] } : null;
  };
  const ranges = Object.fromEntries(ledgers.map((ledger) => [ledger, rangeOf(monthsByLedger[ledger] || [])]));

  const statusFor = (ledger, ym, present) => {
    if (present) {
      const c = coverage && coverage.months && coverage.months[ym];
      const s = c ? c[ledger] : null;
      if (s === 'partial') return 'partial';
      if (s === 'full') return 'full';
      return 'loaded';
    }
    const range = ranges[ledger];
    if (!range || ym < range.first || ym > range.last) return 'outside';
    return 'missing';
  };

  const months = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const ym = ymFromIndex(i);
    const row = { month: ym };
    for (const ledger of ledgers) {
      row[ledger] = statusFor(ledger, ym, (monthsByLedger[ledger] || new Set()).has(ym));
      row[`${ledger}DayGaps`] =
        coverage && coverage.months && coverage.months[ym]
          ? coverage.months[ym].dayGaps?.[ledger] || []
          : [];
    }
    months.push(row);
  }

  const gaps = {};
  for (const ledger of ledgers) {
    const missing = months.filter((m) => m[ledger] === 'missing').map((m) => m.month);
    const partial = months.filter((m) => m[ledger] === 'partial').map((m) => m.month);
    const outside = months.filter((m) => m[ledger] === 'outside').map((m) => m.month);
    let longest = 0;
    let run = 0;
    for (const m of months) {
      if (m[ledger] === 'missing') {
        run += 1;
        longest = Math.max(longest, run);
      } else run = 0;
    }
    gaps[ledger] = { missing, partial, outside, longestRun: longest };
  }

  return {
    months,
    span: months.length,
    gaps,
    complete: ledgers.every((l) => gaps[l].missing.length === 0 && gaps[l].partial.length === 0),
  };
}

// Counted over the ledger's OWN run. Months before its first statement or
// after its last are not part of the question "how much of this ledger do I
// have", so they are taken off both sides of the ratio rather than counted
// against it.
export function coverageSummary(timeline, ledger) {
  const g = (timeline && timeline.gaps && timeline.gaps[ledger]) || {
    missing: [],
    partial: [],
    outside: [],
  };
  const span = (timeline && timeline.span) || 0;
  const total = Math.max(0, span - (g.outside || []).length);
  const loaded = total - g.missing.length;
  return {
    total,
    loaded,
    missing: g.missing.length,
    partial: g.partial.length,
    longestRun: g.longestRun || 0,
    complete: g.missing.length === 0 && g.partial.length === 0 && total > 0,
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
