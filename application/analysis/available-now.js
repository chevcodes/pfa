/* ===========================================================================
 *  available-now.js  -  Overview view-model for the three-layer "available now".
 *
 *  Turns the pure output of commitmentAndIncomePrimitive() into the frozen
 *  content model every card on the new surfaces uses:
 *      number  ->  the figure, largest thing, never hidden behind a click
 *      tag     ->  a few words closing the number against a reference point;
 *                  PRONOUN-FREE ("paid in full", "before payday", "usual")
 *      detail  ->  the fuller reasoning for the info dropdown, where the app
 *                  speaks as an outside source and MAY use "you"/"your"
 *
 *  PURE and Node-testable: takes the primitive result + cfg, returns a plain
 *  model. No DOM, no fetch, no mutation. The render layer (overview-render.js)
 *  consumes this and applies the single privacy state to the *Text fields.
 *
 *  HONESTY RULE (the reason this module is careful): partial data must never
 *  produce a complete-sounding conclusion. When the primitive reports
 *  confidence 'incomplete', the verdict here is explicitly hedged and the lead
 *  figure is labelled an estimate, never a crisp boundary.
 *
 *  LANGUAGE RULE: tags carry no pronoun; only the dropdown detail addresses the
 *  person as "you". Structural labels use "my" but those live in the render,
 *  not here.
 * ======================================================================== */
import { makeMoney, makeProseMoney } from '../core/money-format.js';
import { MONTHS_SHORT } from '../core/shared-helpers.js';
import { allocateSurplus, allocationView } from './spend-allocation.js';

// Money formatter from config (JMD / $ / en-JM by default). Delegates to THE
// formatter (core/money-format.js) so this module's amountText and its "why"
// sentences pass the same privacy gate as every other figure in the app.
// Re-exported under its original name; existing call sites and the proof are
// unchanged.
// Imported AND re-exported: `export ... from` alone creates no local binding,
// and this module calls makeMoney itself further down.
export { makeMoney };

function dayOrdinal(iso) {
  const d = +String(iso || '').slice(8, 10) || 0;
  if (!d) return '';
  const s = d % 100 >= 11 && d % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[d % 10] || 'th';
  return d + s;
}
function monthShort(iso) {
  const m = +String(iso || '').slice(5, 7);
  return m >= 1 && m <= 12 ? MONTHS_SHORT[m - 1] : '';
}
function dateText(iso) {
  return iso ? `${dayOrdinal(iso)} ${monthShort(iso)}` : '';
}

/* ---- card leg -> tag + detail (honest about the transactor / window) ------ */
function cardView(card, money, prose = money) {
  const basis = card.basis || '';
  const amt = Number(card.amountExpectedBeforeNextIncome || 0);
  if (basis === 'due-after-income') {
    return {
      amount: 0,
      amountText: money(0),
      tag: 'nothing due before payday',
      tone: 'good',
      detail:
        'Your card payment is due after your next pay lands, so it is not taken from what you have to move before then.',
    };
  }
  if (basis === 'due-before-income') {
    return {
      amount: amt,
      amountText: money(amt),
      tag: 'due before payday',
      tone: 'neutral',
      detail: `About ${prose(amt)} is due on the card before your next pay, on ${dateText(card.dueDate)}, so it is set aside from what you have to move.`,
    };
  }
  if (basis === 'nothing-due') {
    return {
      amount: 0,
      amountText: money(0),
      tag: 'nothing due before payday',
      tone: 'good',
      detail: 'The card statement shows no payment due, so nothing is set aside for the card.',
    };
  }
  if (basis === 'no-card-statement') {
    return {
      amount: 0,
      amountText: money(0),
      tag: 'no card statement yet',
      tone: 'watch',
      detail:
        'No card statement has been read yet, so any amount due on the card is not included. This figure is incomplete until a statement is imported.',
    };
  }
  if (basis === 'no-amount-due') {
    return {
      amount: 0,
      amountText: money(0),
      tag: 'card amount unknown',
      tone: 'watch',
      detail:
        'The amount due on the card could not be read, so no card payment is included in this figure. Add a readable statement to firm it up.',
    };
  }
  if (basis === 'no-income-date') {
    return {
      amount: 0,
      amountText: money(0),
      tag: 'pay date unknown',
      tone: 'watch',
      detail: `The card payment is due${card.dueDate ? ` on ${dateText(card.dueDate)}` : ''}, but the next pay date could not be established, so the payment cannot yet be placed before or after payday.`,
    };
  }
  return {
    amount: 0,
    amountText: money(0),
    tag: 'card date unknown',
    tone: 'watch',
    detail:
      'The card amount is known but its due date could not be read, so it cannot be placed before or after your next pay. This figure is left out until the date is confirmed.',
  };
}

/* ---- income -> tag + detail ----------------------------------------------- */
function incomeView(income, money, prose = money) {
  if (!income) {
    return {
      present: false,
      tag: 'no regular income found',
      tone: 'watch',
      detail:
        'No repeating income has been detected yet, so the date of your next pay is unknown and the figures below are marked incomplete.',
    };
  }
  const steady = String(income.confidence || '').toLowerCase() === 'high';
  const conf = steady ? 'Steady' : 'Likely';
  return {
    present: true,
    steady,
    amount: income.amount,
    amountText: money(income.amount),
    dateText: dateText(income.date),
    tag: `${conf} · ~${dayOrdinal(income.date)}`,
    tone: 'good',
    detail: `Your pay of about ${prose(income.amount)} is expected around ${dateText(income.date)}, based on a ${steady ? 'well-established' : 'developing'} monthly pattern.`,
  };
}

/* ---- one plain verdict, honestly hedged when data is incomplete ----------- */
function buildVerdict(p, cardV, incomeV) {
  const est = p.layers.estimatedAvailableAfterCommitments;
  const incomplete = p.confidence === 'incomplete';
  const parts = [];
  if (incomeV.present) parts.push(incomeV.steady ? 'Steady income' : 'Income detected');
  // card clause
  if (cardV.tag === 'nothing due before payday')
    parts.push('nothing due on the card before payday');
  else if (cardV.tag === 'due before payday') parts.push('a card payment due before payday');
  // coverage clause
  const covered = est >= 0;
  if (!incomplete) {
    parts.push(
      covered
        ? 'fixed expenses are covered before your next pay'
        : 'fixed expenses exceed the amount available before your next pay'
    );
  }
  let text = parts.length ? parts.join(', ') : 'position calculated';
  text = text.charAt(0).toUpperCase() + text.slice(1) + '.';
  if (incomplete) {
    text = `${text} Some inputs are missing, so this is an estimate, not a firm figure.`;
  }
  const tone = incomplete ? 'watch' : covered ? 'good' : 'watch';
  return { text, tone };
}

/* ===========================================================================
 *  buildAvailableNowModel - the exported view-model builder.
 *  Lead figure = estimated available AFTER commitments, framed as a boundary
 *  ("left after what's already committed"), with the working beneath it.
 * ======================================================================== */
export function buildAvailableNowModel(primitiveResult, cfg = {}, planTargets = null) {
  const money = makeMoney(cfg);
  // Figures inside a sentence are context, not the answer - shortened so a
  // proportion reads at a glance instead of as eighteen digits. Headline
  // amountText keeps full precision. See makeProseMoney.
  const prose = makeProseMoney(cfg);
  const p = primitiveResult;
  const incomplete = p.confidence === 'incomplete';

  const cardV = cardView(p.card, money, prose);
  const incomeV = incomeView(p.income, money, prose);

  const nCommit = (p.commitments && p.commitments.length) || 0;
  const hasCardCommit = (p.commitments || []).some((c) => c.basis === 'card');

  // The lead is no longer the whole post-commitment surplus. The surplus is
  // divided by the person's own plan: their guilt-free share is what is free
  // to spend, and the rest is held for saving. Showing the undivided surplus
  // as the answer to "what can I spend" told them the saving was spendable.
  const allocation = allocateSurplus({
    surplus: p.layers.estimatedAvailableAfterCommitments,
    targets: planTargets,
    cfg,
  });
  const allocated = allocationView(allocation, money, prose);

  const lead = {
    id: 'guiltFreeNow',
    label: 'Free to spend before payday',
    amount: allocated.amount,
    amountText: allocated.amountText,
    tag: incomplete ? 'estimate' : allocated.tag,
    tone: incomplete ? 'watch' : allocated.tone,
    detail: allocated.detail,
  };

  // The permissive figure is never shown alone. This line is what the surface
  // must print beside it: where the figure came from, and what the rest of the
  // surplus is for. Same rule the Plan tab's free band already follows.
  const leadNote = allocation.nothingSpare
    ? {
        text: `Fixed expenses due before payday account for the ${prose(p.layers.availableBalance)} on hand.`,
        tone: 'watch',
      }
    : {
        text: `${allocated.earmarkProse} of the ${prose(allocation.surplus)} left after fixed expenses is held for saving.`,
        tone: 'neutral',
      };

  const working = [
    {
      id: 'surplusAfterCommitments',
      label: 'Left after fixed expenses',
      amount: p.layers.estimatedAvailableAfterCommitments,
      amountText: money(p.layers.estimatedAvailableAfterCommitments),
      tag: 'the whole surplus',
      tone: 'neutral',
      detail: `Cash on hand of ${prose(p.layers.availableBalance)} minus ${prose(p.layers.commitmentsBeforeIncome)} of payments due before your next pay${hasCardCommit ? ', including your card payment' : ''}. Your plan divides this figure; it is not itself what is free to spend.`,
    },
    {
      id: 'earmarkedSaving',
      label: 'Held for saving',
      amount: allocation.earmarkedSaving,
      amountText: money(allocation.earmarkedSaving),
      tag: 'not yet moved',
      tone: 'neutral',
      detail:
        'The part of the surplus your plan does not allocate to free spending. It is earmarked, not saved: it counts toward savings only once it actually moves.',
    },
    {
      id: 'availableBalance',
      label: 'Cash on hand',
      amount: p.layers.availableBalance,
      amountText: money(p.layers.availableBalance),
      tag: 'everyday accounts',
      tone: 'neutral',
      detail:
        'The latest balance across your everyday accounts. Savings in the same currency are included; foreign-currency accounts are shown separately, and the card is not part of this figure.',
    },
    {
      id: 'commitments',
      label: 'Fixed expenses before payday',
      amount: p.layers.commitmentsBeforeIncome,
      amountText: money(p.layers.commitmentsBeforeIncome),
      tag: nCommit
        ? `${nCommit} payment${nCommit > 1 ? 's' : ''}${hasCardCommit ? ' incl. card' : ''}`
        : 'nothing due before payday',
      tone: 'neutral',
      detail: nCommit
        ? `Payments already due to leave before your next pay: ${p.commitments.map((c) => `${money(c.amount)}${c.basis === 'card' ? ' (card)' : ''} on ${dateText(c.date)}`).join('; ')}.`
        : 'Nothing is due to leave before your next pay. Money that recurs on or after payday, and your full card balance, are not counted here.',
    },
  ];

  const verdict = buildVerdict(p, cardV, incomeV);

  return {
    asOf: p.asOf,
    confidence: p.confidence, // 'complete' | 'incomplete'
    verdict, // { text, tone } - one plain conclusion
    lead, // the boundary figure (number/tag/detail)
    leadNote, // MANDATORY line beside the figure - never render one without it
    allocation, // how the surplus divides under the person's own plan
    working, // [cash on hand, committed] beneath it
    income: incomeV, // number/tag/detail
    card: cardV, // number/tag/detail, reassurance beside owed
    gaps: p.gaps || [], // named, surfaced honestly when incomplete
  };
}
