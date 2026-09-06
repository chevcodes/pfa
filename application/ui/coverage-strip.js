import { formatMonthYear, namedMonths, requireCtx, STATEMENT_COVERAGE_ID } from '../core/shared-helpers.js';
import { coverageSummary } from '../analysis/coverage-map.js';
import { coverageCardReact } from './react-bridge.js';

const LEDGER_LABEL = { card: 'Card', bank: 'Bank', investment: 'Investments' };
const COVERAGE_CLASSES = { ledger: 'cov-ledger', head: 'cov-head', name: 'cov-name', count: 'cov-count', strip: 'cov-strip', scale: 'cov-scale' };

export function createCoverageStrip(ctx) {
  requireCtx(ctx, ['el'], 'createCoverageStrip');
  const { el } = ctx;

  function coverageDetail(timeline, ledger) {
    const gaps = (timeline.gaps || {})[ledger] || {};
    const absent = gaps.missing || [];
    const partial = gaps.partial || [];
    const summary = coverageSummary(timeline, ledger);
    if (!absent.length && !partial.length)
      return `${LEDGER_LABEL[ledger]}: all ${summary.total} months are loaded.`;
    const clauses = [];
    if (absent.length) clauses.push(`no statement for ${namedMonths(absent, formatMonthYear, 3)}`);
    if (partial.length)
      clauses.push(
        `${namedMonths(partial, formatMonthYear, 3)} ${partial.length === 1 ? 'is' : 'are'} only partly covered`
      );
    return `${LEDGER_LABEL[ledger]}: ${clauses.join('; ')}. Figures below cover only what is here.`;
  }

  // A month-by-month strip, one cell per calendar month. Colour distinguishes
  // loaded from missing; the label under it names only the ends of the run, so
  // twenty months read as one object rather than twenty labels.
  function renderStrip(timeline, ledger) {
    if (!timeline || !timeline.months.length) return null;
    const summary = coverageSummary(timeline, ledger);
    if (!summary.total) return null;
    const shortfall = [
      summary.missing ? `${summary.missing} missing` : '',
      summary.partial ? `${summary.partial} partly covered` : '',
    ].filter(Boolean).join(', ');
    const cells = [];
    for (const [index, m] of timeline.months.entries()) {
      const state = m[ledger] || 'missing';
      const dayGaps = m[`${ledger}DayGaps`] || [];
      const dayText = dayGaps.length
        ? `No statement covers day${dayGaps.length > 1 ? 's' : ''} ${dayGaps.map(([start, end]) => (start === end ? start : `${start}–${end}`)).join(', ')}`
        : state === 'missing' || state === 'outside'
          ? 'No statement covers this month'
          : '';
      const stateText = state === 'missing' || state === 'outside' ? 'no statement' : state === 'partial' ? 'partly covered' : 'loaded';
      const edge = index === 0 ? ' is-first' : index === timeline.months.length - 1 ? ' is-last' : '';
      cells.push({
        month: m.month,
        monthLabel: formatMonthYear(m.month),
        state: stateText,
        detail: dayText,
        className: `cov-cell is-${state}${edge}`,
        ariaLabel: `${formatMonthYear(m.month)} · ${stateText}${dayText ? ` · ${dayText}` : ''}`,
      });
    }
    return {
      ledger,
      label: LEDGER_LABEL[ledger] || ledger,
      detail: coverageDetail(timeline, ledger),
      shortfall,
      count: !shortfall
        ? `${summary.loaded} of ${summary.total} months`
        : `${summary.loaded} of ${summary.total} months · ${shortfall}`,
      ariaLabel: !shortfall
        ? `${LEDGER_LABEL[ledger]}: all ${summary.total} months loaded.`
        : `${LEDGER_LABEL[ledger]}: ${summary.loaded} of ${summary.total} months loaded, ${shortfall}.`,
      cells,
    };
  }

  function renderScale(timeline) {
    return {
      first: formatMonthYear(timeline.months[0].month),
      last: formatMonthYear(timeline.months[timeline.months.length - 1].month),
    };
  }

  /* THE destination for every statement-completeness sentence in the app.
   *
   * Four surfaces state this fact - Overview's "Based on N of M months", the
   * card and account missing-month insights, and the Account-statements gap
   * line - and not one of them could show a person WHICH months it meant. The
   * only picture that knows lives here, and it was a read-only decoration
   * counting gaps it would not name, with the way to fix them a screenful away
   * in the top bar.
   *
   * So this card carries the job rather than a link being hung beside it: a
   * stable id every one of those sentences lands on, the months named in the
   * same words the sentence that sent you used, partly-imported months named
   * as well as absent ones (Overview's sentence is about those, and nothing
   * here mentioned them), and the same Add the statement nudge already
   * offers, sitting with the gap it closes. */
  function renderCoverageCard(timeline, opts = {}) {
    if (!timeline || !timeline.months.length) return null;
    const ledgers = opts.ledgers || ['card', 'bank'];
    const strips = ledgers.map((ledger) => renderStrip(timeline, ledger)).filter(Boolean);
    const anyGap = strips.some((strip) => /\d+ missing/.test(strip.shortfall));
    const anyPartial = strips.some((strip) => /\d+ partly covered/.test(strip.shortfall));
    if (!anyGap && !anyPartial && opts.onlyWhenIncomplete) return null;
    const props = {
      id: STATEMENT_COVERAGE_ID,
      nested: !!opts.nested,
      strips,
      scale: renderScale(timeline),
      classes: COVERAGE_CLASSES,
      onAdd: anyGap || anyPartial ? opts.onAdd : null,
    };
    return opts.asProps ? props : coverageCardReact(el, props);
  }

  return { renderStrip, renderCoverageCard };
}
