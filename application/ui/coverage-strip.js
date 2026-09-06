import { requireCtx } from '../core/shared-helpers.js';
import { coverageSummary } from '../analysis/coverage-map.js';

const LEDGER_LABEL = { card: 'Card', bank: 'Bank' };

export function createCoverageStrip(ctx) {
  requireCtx(ctx, ['el', 'monthLabel'], 'createCoverageStrip');
  const { el, monthLabel } = ctx;

  // A month-by-month strip, one cell per calendar month. Colour distinguishes
  // loaded from missing; the label under it names only the ends of the run, so
  // twenty months read as one object rather than twenty labels.
  function renderStrip(timeline, ledger) {
    if (!timeline || !timeline.months.length) return null;
    const summary = coverageSummary(timeline, ledger);
    if (!summary.total) return null;

    const wrap = el('div', { class: 'cov-ledger' });
    const head = el('div', { class: 'cov-head' });
    head.append(el('span', { class: 'cov-name' }, LEDGER_LABEL[ledger] || ledger));
    head.append(
      el(
        'span',
        { class: 'cov-count' + (summary.complete ? ' is-complete' : ' is-gappy') },
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
        summary.complete
          ? `${summary.loaded} of ${summary.total} months`
          : `${summary.loaded} of ${summary.total} months \u00b7 ${summary.missing} missing`
      )
    );
    wrap.append(head);

    const strip = el('div', {
      class: 'cov-strip',
      role: 'img',
      'aria-label': summary.complete
        ? `${LEDGER_LABEL[ledger]}: all ${summary.total} months loaded.`
        : `${LEDGER_LABEL[ledger]}: ${summary.loaded} of ${summary.total} months loaded, ${summary.missing} missing.`,
    });
    for (const m of timeline.months) {
      const state = m[ledger] || 'missing';
      strip.append(
        el('i', {
          class: `cov-cell is-${state}`,
          title: `${monthLabel(m.month)} · ${state === 'missing' ? 'not loaded' : state}`,
        })
      );
    }
    wrap.append(strip);

    const first = timeline.months[0].month;
    const last = timeline.months[timeline.months.length - 1].month;
    wrap.append(
      el(
        'div',
        { class: 'cov-scale' },
        el('span', {}, monthLabel(first)),
        el('span', {}, monthLabel(last))
      )
    );
    return wrap;
  }

  function renderCoverageCard(timeline, opts = {}) {
    if (!timeline || !timeline.months.length) return null;
    const ledgers = opts.ledgers || ['card', 'bank'];
    const anyGap = ledgers.some((l) => coverageSummary(timeline, l).missing > 0);
    if (!anyGap && opts.onlyWhenIncomplete) return null;

    // `nested` drops the card shell for callers that already render one around
    // it - Data & settings hosts this, so it was drawing a bordered, padded
    // card inside a bordered, padded card.
    const sec = el('section', {
      class: opts.nested ? 'cov-card is-nested' : 'card cov-card',
    });
    sec.append(el('h3', {}, 'Statements loaded'));
    for (const ledger of ledgers) {
      const strip = renderStrip(timeline, ledger);
      if (strip) sec.append(strip);
    }
    if (anyGap) {
      const missing = [];
      for (const l of ledgers) {
        const s = coverageSummary(timeline, l);
        if (s.missing) missing.push(`${s.missing} ${LEDGER_LABEL[l].toLowerCase()}`);
      }
      sec.append(
        el(
          'p',
          { class: 'cov-note muted small' },
          `${missing.join(' and ')} statement months are not loaded. Figures below cover only what is here.`
        )
      );
    }
    return sec;
  }

  return { renderStrip, renderCoverageCard };
}
