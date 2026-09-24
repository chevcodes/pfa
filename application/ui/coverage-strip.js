import { formatMonthYear, namedMonths, requireCtx, STATEMENT_COVERAGE_ID } from '../core/shared-helpers.js';
import { coverageSummary } from '../analysis/coverage-map.js';
import { chartInfoReact } from './react-bridge.js';

const LEDGER_LABEL = { card: 'Card', bank: 'Bank', investment: 'Investments' };

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

    // Both states the strip DRAWS, said in words. It counted only the months
    // with nothing at all, so a ledger whose gap is a half-imported month read
    // as complete while the cells beside the count were visibly paler - and
    // Overview's "Based on N of M months", which is about exactly those
    // months, now lands here.
    const shortfall = [
      summary.missing ? `${summary.missing} missing` : '',
      summary.partial ? `${summary.partial} partly covered` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const wrap = el('div', { class: 'cov-ledger' });
    const head = el('div', { class: 'cov-head' });
    head.append(el('span', { class: 'cov-name' }, LEDGER_LABEL[ledger] || ledger));
    head.append(chartInfoReact(el, '', coverageDetail(timeline, ledger)));
    head.append(
      el(
        'span',
        { class: 'cov-count' + (shortfall ? ' is-gappy' : ' is-complete') },
        // ONE frame for both ledgers.
        //
        // Card and Bank sit one above the other in this component, and the
        // label used to flip both its direction and its unit depending on
        // state: "21 of 21 months" for the complete one, "2 missing of 21" for
        // the one with gaps. One counted what you have, the other what you
        // lack, and only one named the unit - so comparing the two rows meant
        // mentally inverting one of them.
        //
        // Both now count what is loaded, out of the same total. The gap is
        // still named, appended rather than substituted, so nothing is lost.
        !shortfall
          ? `${summary.loaded} of ${summary.total} months`
          : `${summary.loaded} of ${summary.total} months \u00b7 ${shortfall}`
      )
    );
    wrap.append(head);

    const strip = el('div', {
      class: 'cov-strip',
      role: 'img',
      'aria-label': !shortfall
        ? `${LEDGER_LABEL[ledger]}: all ${summary.total} months loaded.`
        : `${LEDGER_LABEL[ledger]}: ${summary.loaded} of ${summary.total} months loaded, ${shortfall}.`,
    });
    for (const [index, m] of timeline.months.entries()) {
      const state = m[ledger] || 'missing';
      const dayGaps = m[`${ledger}DayGaps`] || [];
      const dayText = dayGaps.length
        ? `No statement covers day${dayGaps.length > 1 ? 's' : ''} ${dayGaps
            .map(([start, end]) => (start === end ? start : `${start}–${end}`))
            .join(', ')}`
        : state === 'missing' || state === 'outside'
          ? 'No statement covers this month'
          : '';
      const stateText =
        state === 'missing' || state === 'outside'
          ? 'no statement'
          : state === 'partial'
            ? 'partly covered'
            : 'loaded';
      const edge = index === 0 ? ' is-first' : index === timeline.months.length - 1 ? ' is-last' : '';
      strip.append(
        el('i', {
          class: `cov-cell is-${state}${edge}`,
          'aria-label': `${formatMonthYear(m.month)} · ${stateText}${dayText ? ` · ${dayText}` : ''}`,
          dataset: {
            month: formatMonthYear(m.month),
            state: stateText,
            detail: dayText,
          },
        })
      );
    }
    wrap.append(strip);
    return wrap;
  }

  // ONE scale, for the one axis both strips are drawn against. It was printed
  // under each ledger, which read as that ledger's own span - so a bank row
  // counting 20 of its own 20 months sat above "January 2023 - August 2026",
  // a range its records never reached.
  function renderScale(timeline) {
    const first = timeline.months[0].month;
    const last = timeline.months[timeline.months.length - 1].month;
    return el(
      'div',
      { class: 'cov-scale' },
      el('span', {}, formatMonthYear(first)),
      el('span', {}, formatMonthYear(last))
    );
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
    const anyGap = ledgers.some((l) => coverageSummary(timeline, l).missing > 0);
    const anyPartial = ledgers.some((l) => coverageSummary(timeline, l).partial > 0);
    if (!anyGap && !anyPartial && opts.onlyWhenIncomplete) return null;

    // `nested` drops the card shell for callers that already render one around
    // it - Data & settings hosts this, so it was drawing a bordered, padded
    // card inside a bordered, padded card.
    const sec = el('section', {
      class: opts.nested ? 'cov-card is-nested' : 'card cov-card',
      id: STATEMENT_COVERAGE_ID,
      tabindex: '-1',
    });
    sec.append(el('h3', {}, 'Statements loaded'));
    let drew = false;
    for (const ledger of ledgers) {
      const strip = renderStrip(timeline, ledger);
      if (strip) {
        sec.append(strip);
        drew = true;
      }
    }
    if (drew) sec.append(renderScale(timeline));
    if (anyGap || anyPartial) {
      if (typeof opts.onAdd === 'function') {
        sec.append(
          el(
            'div',
            { class: 'manage-actions settings-actions' },
            el('button', { class: 'btn sm', type: 'button', onclick: opts.onAdd }, 'Add')
          )
        );
      }
    }
    return sec;
  }

  return { renderStrip, renderCoverageCard };
}
