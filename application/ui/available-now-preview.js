/*
 * available-now-preview.js  -  Overview's decision header: "What can I spend
 * right now?"
 *
 * Turns provenModels.availableNow()'s view-model (buildAvailableNowModel,
 * analysis/available-now.js) into the app's ONE headline component
 * (decision-header.js). It previously spoke a private dialect - .hero-eyebrow,
 * .hero-title, .hero-amount-label - which is why this screen's headline sat at
 * a different size, with a different label treatment and a different
 * disclosure style, from the identically-shaped headlines on Activity,
 * Position and Forecast. Same question-figure-meaning-confidence-why
 * structure now; only the words are Overview's own.
 *
 * The working (cash on hand, committed before payday) and the incomplete-data
 * reason stay behind progressive disclosure, never stacked on the surface as
 * co-equal number blocks competing with the one figure a person came for.
 *
 * The model's `gaps` array can carry internal state tokens (e.g.
 * 'amount-known-date-unknown'); those are translated to plain language here
 * before they ever reach the surface, never printed verbatim.
 */
import { requireCtx } from '../core/shared-helpers.js';
import { createDecisionHeader } from './decision-header.js';

// Internal gap tokens -> plain language. The primitive
// (commitmentAndIncomePrimitive, analysis/commitment-income.js) names gaps
// with terse state tokens for its own logic; a person must never see them.
//
// The tokens it ACTUALLY emits are 'no recurring income detected', a
// compound 'card leg incomplete: <basis>', and 'N account(s) with no current
// balance'. The previous version of this map keyed only on hyphenated
// identifiers that the primitive never produces, so every real gap fell
// through to the generic fallback and the card said "some inputs are still
// missing" instead of naming what was missing - the exact opposite of the
// honesty rule this card exists to keep, and the reason its own proof was
// failing on "NAMES the specific gaps".
const GAP_PLAIN = {
  'no recurring income detected': 'no regular income pattern has been detected yet',
  // card-leg bases, the tail of the compound token
  'no-card-statement': 'no card statement has been imported yet',
  'no-amount-due': 'the amount due on the card could not be read',
  'amount-known-date-unknown': 'a card payment is known but its due date could not be read',
  'no-income-date': 'the date of the next income could not be determined',
  // hyphenated aliases, kept so a future rename of a token on either side
  // degrades to plain language rather than to the generic fallback
  'no-regular-income': 'no regular income pattern has been detected yet',
  'card-leg-incomplete': 'the card side of this figure is incomplete',
};
function plainGap(raw) {
  const key = String(raw || '').trim();
  if (GAP_PLAIN[key]) return GAP_PLAIN[key];
  // 'N account(s) with no current balance' carries its own count, so it is
  // rewritten rather than looked up.
  const acct = /^(\d+) account\(s\) with no current balance$/.exec(key);
  if (acct) {
    const n = +acct[1];
    return `${n} account${n === 1 ? ' has' : 's have'} no current balance on file`;
  }
  // A compound token like 'card leg incomplete: amount-known-date-unknown':
  // take the part after the colon if it maps, else name the card leg itself.
  if (key.includes(':')) {
    const tail = key.split(':').pop().trim();
    if (GAP_PLAIN[tail]) return GAP_PLAIN[tail];
    if (/^card leg incomplete/i.test(key)) return GAP_PLAIN['card-leg-incomplete'];
  }
  return 'some inputs are still missing';
}

export function createAvailableNow(ctx) {
  requireCtx(ctx, ['el', 'icon', 'provenModels', 'bankMoney', 'iconInfo'], 'createAvailableNow');
  const { el, provenModels } = ctx;
  const { renderDecisionHeader, metric } = createDecisionHeader({ el });

  function card(m) {
    const lead = m.lead || {};
    const incomplete = m.confidence === 'incomplete';

    const tags = [];


    const why = [];
    if (m.verdict && m.verdict.text) why.push(el('p', {}, m.verdict.text));
    if (lead.detail) why.push(el('p', {}, lead.detail));
    if (incomplete && m.gaps && m.gaps.length) {
      const plain = m.gaps.map(plainGap);
      why.push(
        el(
          'p',
          { class: 'muted small' },
          `This is a rough figure, not a precise boundary, because ${plain.join('; ')}. ` +
            'Add the missing statement or income and it will firm up.'
        )
      );
    }

    if (lead.tag) tags.push({ text: lead.tag, tone: lead.tone || 'neutral', detail: why });

    const support = (m.working || []).map((layer) => ({
      text: layer.amountText != null ? layer.amountText : '',
      label: layer.label,
      tag: layer.tag,
      tone: layer.tone,
      detail: layer.detail,
    }));

    return renderDecisionHeader({
      id: 'available-now',
      class: 'view-overview',
      question: 'What can I spend right now?',
      figure: { text: lead.amountText != null ? lead.amountText : '' },
      meaning: lead.label || '',
      tags,
      support,
      supportLabel: 'How this is worked out',
    });
  }

  function renderAvailableNow() {
    const model = provenModels.availableNow();
    if (!model) return null;
    return card(model);
  }

  return { renderAvailableNow, metric };
}
