/* ===========================================================================
 *  cushion.js  -  the EMERGENCY FUND goal: how big the safety pile should be,
 *  how big it actually is, and how to say the gap out loud.
 *
 *  "Emergency fund" is the person-facing name. 'cushion' stays the stored type
 *  id, the same way 'spend-ceiling' stayed one after its card was renamed to a
 *  limit: renaming a saved record's type would break every goal already on a
 *  device to change a word nobody sees.
 *
 *  WHY MONTHS OF EXPENSES, NOT MONTHS OF INCOME
 *  An emergency fund exists to keep a person afloat when income stops, so it
 *  has to cover what GOES OUT, not what comes in. The standard is months of
 *  expenses. This target was sized on income, which overstates it for anyone
 *  who does not spend everything they earn - which is precisely the person this
 *  app is built for. The unit a person can picture ("five months") is kept; the
 *  thing being multiplied is corrected.
 *
 *  Months are still the unit rather than days of outflow: nobody can picture 90
 *  days of spending without doing arithmetic first.
 *
 *  WHAT A MONTH COSTS
 *  monthlyCostOfLiving() (plan.js) - the plain average of EVERY complete month
 *  of statement data, no window and no weighting. One function, computed once
 *  and read wherever the target is needed, so no two surfaces can hold
 *  different ideas of what a month costs.
 *
 *  THE ONE CAVEAT, AND WHY IT IS NOT PERMANENT TEXT
 *  Under twelve months the average is systematically low - the once-a-year
 *  costs (insurance, tax, a car service) have not come round yet - and it
 *  cannot know that about itself. At twelve months or more they are inside the
 *  window and therefore inside the average, so the caveat stops being true and
 *  disappears. coverageCaveat() returns the sentence below a year and null at
 *  or above it: purely a function of how many months exist, with no "settled"
 *  flag for anyone to set or forget. A surface puts it behind the app's one
 *  info bubble, never as inline text beside the figure.
 *
 *  One-off shocks - a fridge replacing itself - are deliberately NOT detected
 *  or excluded. Leaving them in makes the target mildly conservative, which is
 *  the right direction to err for a safety net, and it keeps manual judgement
 *  out of a figure whose whole value is that it is mechanical.
 *
 *  WHAT COUNTS AS "ALREADY SAVED" - the decision, and why
 *  Cash on hand: the whole readable liquid balance. Not the Plan's
 *  savings figure.
 *
 *  The reason is units. A cushion is a STOCK question - how big is the pile.
 *  The Plan's set-aside figure is a FLOW - how much moved toward savings this
 *  month. Answering a stock question with a flow number is a category error no
 *  wording can repair: it would read a 40,000-a-month savings rate as a 40,000
 *  safety pile, and someone who had saved steadily for two years would still
 *  read as "40,000 saved". Wrong, and wrong in the dangerous direction.
 *
 *  The tempting middle answer - balances of the accounts that RECEIVE set-aside
 *  transfers - is a genuine stock, but it depends on account classification
 *  being right, and for the very common case of one everyday account it would
 *  report a safety net of zero to someone who has money. Also wrong, also in
 *  the dangerous direction.
 *
 *  So: everything reachable, because an emergency draws on everything reachable
 *  regardless of what it was labelled. The honesty cost of that choice - money
 *  sitting in an everyday account is counted as safety even though it is
 *  probably already spoken for - is not hidden. savedFigureNote() states it in
 *  plain words beside the figure, the same standard the Plan's hero figure
 *  already holds itself to.
 *
 *  PURE. No DOM, no fetch, no mutation.
 * ======================================================================== */

import { FULL_YEAR_MONTHS, countWord, roundMoney as r2 } from '../core/shared-helpers.js';

// Five months, adjustable, and unchanged by the move to expenses. It now sits
// inside the usual "three to six months of expenses" rather than beside it -
// the common rule's own suggestion, offered against a person's real figures,
// not this app's opinion of how much they ought to hold.
export const DEFAULT_CUSHION_MONTHS = 5;

// The person-facing name, declared once so the goal picker, the card and the
// printed report cannot drift into calling it three different things.
export const EMERGENCY_FUND_LABEL = 'Emergency fund';

// Stamped on every goal saved since the target moved to expenses. Its ABSENCE
// on a stored goal is the only way to tell that the goal was authored when the
// same number of months meant months of INCOME - a materially larger target.
// Such a goal keeps the months the person chose and is told, once and plainly,
// what those months are now measured against. Nothing is changed underneath
// them without being said.
export const CUSHION_BASIS = 'expenses';

/* A whole number as a word, so the sentence reads as speech rather than as a
 * readout. Above twelve, digits are clearer than words. The list itself now
 * lives in shared-helpers (countWord), shared with the app's spoken durations,
 * so one number cannot be spelled two ways. This name stays: every month count
 * on screen is still said through it. */
export function monthWord(n) {
  return countWord(n);
}

export function monthsLabel(n) {
  const i = Math.round(Number(n) || 0);
  return `${monthWord(i)} ${i === 1 ? 'month' : 'months'}`;
}

/* The same count used as an adjective: "a five-month target", not "a five
 * months target". Two forms because English needs two, and a sentence that
 * reads wrongly undermines the figure standing next to it. */
export function monthsAdjective(n) {
  return `${monthWord(n)}-month`;
}

/* How many months of living costs the pile currently covers. Null - not zero -
 * when there is no expenses figure to divide by, so a caller with nothing
 * honest to say can stay quiet instead of printing "0 months" at someone whose
 * data simply has not loaded. */
export function monthsCovered(saved, monthlyExpenses) {
  const cost = Number(monthlyExpenses) || 0;
  if (!(cost > 0)) return null;
  return Math.max(0, Number(saved) || 0) / cost;
}

/* The target pile: N months of what a month actually costs. */
export function cushionTarget(monthlyExpenses, targetMonths = DEFAULT_CUSHION_MONTHS) {
  const cost = Math.max(0, Number(monthlyExpenses) || 0);
  const months = Math.max(0, Number(targetMonths) || 0);
  return r2(cost * months);
}

/* The provenance line for a target built on less than a full year, or null when
 * there is nothing left to caveat.
 *
 * Null at twelve months or more is the whole design: the average then contains
 * a complete annual cycle, so the caveat is no longer TRUE and the marker has
 * to go rather than linger as decoration. It clears itself the moment the data
 * crosses a year - there is no flag to set.
 *
 * The count is spoken with monthsLabel, the app's one way of saying a number of
 * months, so this sentence cannot drift from every other month count on screen.
 */
export function coverageCaveat(monthsOfData) {
  const n = Math.max(0, Math.round(Number(monthsOfData) || 0));
  if (!n || n >= FULL_YEAR_MONTHS) return null;
  return `Based on ${monthsLabel(n)} of statements - may rise as yearly costs like insurance or tax appear.`;
}

/* How much history is behind the target, in the one shape a surface needs to
 * decide whether to show the info bubble at all. */
export function cushionCoverage(monthsOfData) {
  const n = Math.max(0, Math.round(Number(monthsOfData) || 0));
  return { monthsOfData: n, fullYear: n >= FULL_YEAR_MONTHS, caveat: coverageCaveat(n) };
}

/* Progress in plain, rounded, spoken language - never a decimal. "1.2 of 5" is
 * a number a person has to translate before it means anything; "just over one
 * month, working toward five" is already the thought.
 *
 * The qualifier is chosen by where the real figure sits relative to the nearest
 * whole month, the way someone would describe it out loud:
 *   within 0.15 of a whole month  -> "about two months"
 *   above it                      -> "just over two months"
 *   below it                      -> "close to two months"
 * with two ends that deserve their own words: under half a month is "a start",
 * and within a quarter-month of the target is "nearly there".
 *
 * Returns { phrase, whole, qualifier, met } - the phrase is the sentence-ready
 * fragment; the parts are exposed so a caller can build its own wording without
 * re-deriving the rounding and drifting from this one.
 */
export function describeCushionMonths(months, targetMonths = DEFAULT_CUSHION_MONTHS) {
  const t = Math.max(0, Number(targetMonths) || 0);
  if (months == null) {
    return { phrase: 'not enough yet to say', whole: null, qualifier: 'unknown', met: false };
  }
  const m = Math.max(0, Number(months) || 0);
  if (t > 0 && m >= t) {
    return { phrase: 'you have reached your target', whole: t, qualifier: 'met', met: true };
  }
  if (t > 0 && m >= t - 0.25) {
    return { phrase: 'you are nearly there', whole: t, qualifier: 'nearly', met: false };
  }
  if (m < 0.5) {
    return { phrase: 'you have made a start', whole: 0, qualifier: 'start', met: false };
  }
  const whole = Math.round(m);
  const gap = m - whole;
  const label = monthsLabel(whole);
  if (Math.abs(gap) <= 0.15) {
    return { phrase: `about ${label} saved`, whole, qualifier: 'about', met: false };
  }
  if (gap > 0) {
    return { phrase: `just over ${label} saved`, whole, qualifier: 'over', met: false };
  }
  return { phrase: `close to ${label} saved`, whole, qualifier: 'under', met: false };
}

/* The full standing of the goal, ready for any surface to render. One place
 * decides what "saved", "target" and "short by" mean, so the goal card, the
 * monthly check-in and the plan's own link back to the goal cannot describe the
 * same progress three different ways. */
export function cushionStanding({
  saved = 0,
  monthlyExpenses = 0,
  targetMonths = DEFAULT_CUSHION_MONTHS,
  monthsOfData = 0,
} = {}) {
  const cost = Math.max(0, Number(monthlyExpenses) || 0);
  const months = Math.max(0, Number(targetMonths) || 0);
  const have = Math.max(0, Number(saved) || 0);
  const targetAmount = cushionTarget(cost, months);
  const covered = monthsCovered(have, cost);
  const shortfall = r2(Math.max(0, targetAmount - have));
  const progress = describeCushionMonths(covered, months);
  return {
    saved: r2(have),
    monthlyExpenses: r2(cost),
    targetMonths: months,
    targetAmount,
    monthsCovered: covered,
    shortfall,
    met: targetAmount > 0 ? have >= targetAmount : false,
    readable: cost > 0,
    coverage: cushionCoverage(monthsOfData),
    progress,
  };
}

/* What the "already saved" figure does and does not include, in one plain
 * sentence. The Plan's hero figure never shows a number without this; the goal
 * card holds itself to the same standard rather than inventing a lower one.
 *
 * It leads with the thing most easily misread. Progress counts ALL cash, which
 * is the honest answer for an emergency (an emergency reaches everything
 * reachable), but read quickly it looks like a claim about money deliberately
 * ring-fenced. Saying so plainly is cheaper than letting someone believe their
 * everyday balance is a safety net they set aside on purpose.
 *
 * money is the app's formatter, passed in so this module stays pure and the
 * figure passes the same privacy gate as every other number on screen.
 */
export function savedFigureNote({ excludedForeign = 0, cardOwed = 0 } = {}, money = null) {
  const parts = [
    'Counts all the cash in your accounts, not only what you have set aside for emergencies',
  ];
  const also = [];
  if (cardOwed > 0) also.push(`what you owe on the card${money ? ` (${money(cardOwed)})` : ''}`);
  if (excludedForeign > 0) also.push('money held in another currency');
  if (also.length) parts.push(`not ${also.join(', nor ')}`);
  return `${parts.join(' - ')}.`;
}
