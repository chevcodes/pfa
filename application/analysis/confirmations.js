/* ===========================================================================
 *  confirmations.js  -  the ONE record of "the person told us this".
 *
 *  This app infers a great deal that drives real figures: whether a deposit is
 *  income, whether a reversal is money returned, whether a repeating payment is
 *  a fixed commitment, which of your own accounts count as saving, whether a
 *  flagged purchase still needs a second look. Each inference is a guess, each
 *  guess moves a number, and being wrong is invisible.
 *
 *  Before this there were three separate answers to that one problem: two
 *  confirmation id lists (confirmedIncomeIds / refundIncomeIds), a per-record
 *  resolution flag (reviewDismissed), and an account designation kept in its
 *  own meta key (planSetAside). Three stores, three writers, three shapes, one
 *  concept - the exact drift this project removes everywhere else.
 *
 *  So: one stored shape, one store, one writer, read wherever the affected
 *  inference is consumed. Any inference can register as a consumer by adding
 *  itself to CONFIRMABLE below; nothing else may grow a private store for the
 *  same idea (tests/confirmations_proof.mjs fails the build if it does).
 *
 *  THE PRECEDENCE RULE, which everything else follows from:
 *    a person's explicit answer outranks the app's inference, permanently.
 *  It sits where the app already declares precedence - merchant intelligence,
 *  then personal rules, then config - as a personal rule, exactly as a manual
 *  category override outranks the categoriser.
 *
 *  STORED SHAPE (v7 `confirmations` store, keyPath 'id'):
 *    {
 *      id:        'cf:<inference>:<scope>:<subject>'   deterministic
 *      inference: a key of CONFIRMABLE
 *      scope:     'transaction' | 'merchant' | 'account'
 *      subject:   the transaction id, merchant/counterparty key, or account key
 *      answer:    true | false
 *      source:    'person'   - the only value ever written
 *      createdAt, updatedAt
 *    }
 *
 *  `source` is what keeps a human answer distinguishable from a guess: a record
 *  only exists here because someone answered, so a later change to detection
 *  logic can never silently rewrite what a person said. Absence of a record is
 *  the app's own inference speaking; presence is the person.
 *
 *  Answering "no" is an answer. It is stored, it outranks inference exactly as
 *  "yes" does, and it is what makes "a dismissed question stays dismissed"
 *  true rather than hopeful.
 *
 *  PURE and Node-testable: no DOM, no storage, no mutation. Every writer here
 *  returns a NEW array.
 * ======================================================================== */

/* THE REGISTRY. Every inference a person can answer, the level its answer is
 * true at, and whether the answer can be given on the transaction row itself.
 *
 * `row: true` is a promise the guard enforces: if an inference is registered as
 * row-answerable, ui/confirm-control.js must actually offer it there. Noticing
 * "this is rent", "this is my pay", "that is my own savings account", "that is
 * not a transfer between my accounts" happens while looking at the row, so the
 * row is where it gets said.
 *
 * INFERENCES DELIBERATELY NOT HERE, and why:
 *   - which category a purchase belongs to. Already answerable, by the older
 *     and better-suited mechanism: a category override plus a personal rule,
 *     which this one is modelled on rather than replacing.
 *   - whether a payment is a fixed expense. That is a fact about the CATEGORY,
 *     not about the payee, and the Plan already holds it: every category sits
 *     in Fixed expenses, Savings & investments or Free spending, the person
 *     owns that placement and can change it, and the Plan asks about anything
 *     unplaced. A per-payee answer beside it would be a second answer to a
 *     question already answered, with no rule for which one wins. So rent paid
 *     by transfer becomes a fixed expense the way everything else does: it is
 *     filed as Rent, and Rent sits in Fixed expenses.
 *   - which merchant a truncated descriptor refers to. The personal rule from
 *     the category picker already carries this: filing every "AMZN MKTP" as
 *     one thing IS the answer to who it is.
 *   - support sent to a household member. A real figure-moving inference with
 *     no way in, but it fires only when a shared account and a household payee
 *     are both configured, and nothing in the app sets either - so there is no
 *     wrong guess on screen for a person to notice. The next consumer, once it
 *     has inputs.
 *   - statutory deductions, duplicate charges, reconciliation and balances.
 *     The first two are already covered - a deduction by the fixed-expense
 *     answer, a duplicate by the review answer - and the last two are facts
 *     read off a statement, not guesses.
 */
export const CONFIRMABLE = {
  transfer: { scope: 'merchant', row: true, noun: 'own-account transfer' },
  income: { scope: 'transaction', row: true, noun: 'income' },
  // Each key names the INFERENCE being overridden, and the answer is always
  // "is the app right about this?". So a `refund` answer of yes means the
  // money is income after all, and no means it is passing through - which is
  // also the polarity the retired refundIncomeIds list stored.
  refund: { scope: 'transaction', row: true, noun: 'refund' },
  review: { scope: 'transaction', row: true, noun: 'review' },
  saving: { scope: 'account', row: true, noun: 'savings account' },
  // Which recurring credit is the person's pay. The app picks the LARGEST
  // repeating credit above the income floor and never says so, yet that one
  // silent choice sets the next payday, which sets the window of payments
  // counted before it, which sets Overview's lead figure. A distribution, a
  // regular transfer from family or a second job can outweigh a salary, and
  // being wrong is invisible. Answered about the payee, because that is what
  // is true: this payee is where your pay comes from.
  pay: { scope: 'merchant', row: true, noun: 'regular pay' },
};

export const CONFIRMATION_SOURCE = 'person';

/* Every inference here has exactly one natural level, and that level is the
 * only one its answer accepts. Offering a per-row override as well sounds
 * generous and reads as a second question to answer: whether an account is
 * yours is true of the account, not of one movement to it. */
const EXTRA_SCOPES = {};

export function scopesFor(inference) {
  const declared = CONFIRMABLE[inference];
  if (!declared) return [];
  return [declared.scope, ...(EXTRA_SCOPES[inference] || [])];
}

export function confirmationId(inference, scope, subject) {
  return `cf:${inference}:${scope}:${String(subject)}`;
}

function isRecord(value) {
  return !!value && typeof value === 'object' && typeof value.inference === 'string';
}

export function makeConfirmation({
  inference,
  subject,
  answer,
  scope = null,
  now = new Date().toISOString(),
}) {
  const declared = CONFIRMABLE[inference];
  if (!declared) throw new Error(`Unknown inference: ${inference}`);
  const useScope = scope || declared.scope;
  if (!scopesFor(inference).includes(useScope))
    throw new Error(`Inference ${inference} does not answer at ${useScope} level`);
  const key = String(subject == null ? '' : subject);
  if (!key) throw new Error(`A ${inference} confirmation needs a subject`);
  return {
    id: confirmationId(inference, useScope, key),
    inference,
    scope: useScope,
    subject: key,
    answer: !!answer,
    source: CONFIRMATION_SOURCE,
    createdAt: now,
    updatedAt: now,
  };
}

/* THE reader. Subjects are given most-specific-first, so a fixed-expense answer
 * about one payment outranks the standing answer about its payee, which in turn
 * outranks detection. Returns the governing record, or null when the person has
 * never answered - the case where inference is still in charge. */
export function confirmationFor(confirmations, inference, subjects) {
  const wanted = Array.isArray(subjects) ? subjects : [subjects];
  const mine = (confirmations || []).filter((c) => isRecord(c) && c.inference === inference);
  if (!mine.length) return null;
  for (const subject of wanted) {
    const key = String(subject == null ? '' : subject);
    if (!key) continue;
    const hit = mine.find((c) => String(c.subject) === key);
    if (hit) return hit;
  }
  return null;
}

export function answerFor(confirmations, inference, subjects) {
  const hit = confirmationFor(confirmations, inference, subjects);
  return hit ? !!hit.answer : null;
}

export function isConfirmed(confirmations, inference, subjects) {
  return answerFor(confirmations, inference, subjects) === true;
}

export function isDeclined(confirmations, inference, subjects) {
  return answerFor(confirmations, inference, subjects) === false;
}

export function hasAnswered(confirmations, inference, subjects) {
  return answerFor(confirmations, inference, subjects) !== null;
}

/* Every subject answered 'yes' for one inference. Used where the consumer wants
 * the whole set rather than one lookup (which accounts count as saving). */
export function confirmedSubjects(confirmations, inference) {
  return (confirmations || [])
    .filter((c) => isRecord(c) && c.inference === inference && c.answer === true)
    .map((c) => String(c.subject));
}

export function answeredAny(confirmations, inference) {
  return (confirmations || []).some((c) => isRecord(c) && c.inference === inference);
}

/* Inference plus the person's answers, in one set. Detection proposes; a 'no'
 * removes, a 'yes' adds and KEEPS - which is how a payment confirmed fixed
 * that then skips a month stays fixed. Intent was captured; intent does not
 * change because the data wobbled. */
export function resolvedSet(detected, confirmations, inference, scope = null) {
  const out = new Set(detected || []);
  for (const c of confirmations || []) {
    if (!isRecord(c) || c.inference !== inference) continue;
    if (scope && c.scope !== scope) continue;
    if (c.answer) out.add(String(c.subject));
    else out.delete(String(c.subject));
  }
  return out;
}

/* Record an answer. Replaces any earlier answer about the same subject at the
 * same level (the id is deterministic), and returns both the next array and the
 * record it displaced, so the caller can put it back. */
export function applyAnswer(confirmations, { inference, subject, answer, scope = null, now }) {
  const record = makeConfirmation({ inference, subject, answer, scope, now });
  const list = (confirmations || []).filter(isRecord);
  const prior = list.find((c) => c.id === record.id) || null;
  const next = list.filter((c) => c.id !== record.id);
  next.push(prior ? { ...record, createdAt: prior.createdAt } : record);
  return { confirmations: next, record: next[next.length - 1], prior };
}

export function withoutAnswer(confirmations, id) {
  return (confirmations || []).filter((c) => isRecord(c) && c.id !== id);
}

/* A transaction-level answer is about a specific imported row, so it goes when
 * that row goes. A merchant- or account-level answer is about a standing fact
 * the person stated, so it survives removing and re-importing a statement. */
export function pruneConfirmations(confirmations, validTransactionIds) {
  const valid = validTransactionIds instanceof Set
    ? validTransactionIds
    : new Set(validTransactionIds || []);
  return (confirmations || []).filter(
    (c) => isRecord(c) && (c.scope !== 'transaction' || valid.has(String(c.subject)))
  );
}

/* Read back from storage or a backup file: anything that is not a well-formed
 * answer from a person is dropped rather than trusted. */
export function sanitiseConfirmations(list) {
  const seen = new Set();
  const out = [];
  for (const c of list || []) {
    if (!isRecord(c)) continue;
    if (!CONFIRMABLE[c.inference]) continue;
    if (!scopesFor(c.inference).includes(c.scope)) continue;
    const subject = String(c.subject == null ? '' : c.subject);
    if (!subject) continue;
    const id = confirmationId(c.inference, c.scope, subject);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      inference: c.inference,
      scope: c.scope,
      subject,
      answer: !!c.answer,
      source: CONFIRMATION_SOURCE,
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date(0).toISOString(),
      updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date(0).toISOString(),
    });
  }
  return out;
}

/* The one-off move from the three old mechanisms onto this one. Every stored
 * answer becomes a confirmation of the matching inference; nothing a person
 * already told the app is lost. Existing confirmations always win, so running
 * this twice cannot overwrite a newer answer with a stale legacy one. */
export function migrateLegacyConfirmations(legacy = {}, existing = [], now = new Date().toISOString()) {
  const out = sanitiseConfirmations(existing);
  const have = new Set(out.map((c) => c.id));
  const add = (inference, subject, answer) => {
    const key = String(subject == null ? '' : subject);
    if (!key) return;
    const record = makeConfirmation({ inference, subject: key, answer, now });
    if (have.has(record.id)) return;
    have.add(record.id);
    out.push(record);
  };
  for (const id of legacy.incomeIds || []) add('income', id, true);
  for (const id of legacy.refundIds || []) add('refund', id, true);
  for (const id of legacy.reviewIds || []) add('review', id, true);
  for (const key of legacy.savingKeys || []) add('saving', key, true);
  return out;
}
