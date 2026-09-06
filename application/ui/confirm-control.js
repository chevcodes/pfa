/* ===========================================================================
 *  confirm-control.js  -  THE writer for analysis/confirmations.js, and the
 *  way in from the row.
 *
 *  Every "the person told us this" answer in the app is written here and
 *  nowhere else: one store, one writer, so a classification decision can never
 *  exist in two places. Reads happen wherever the affected inference is
 *  consumed, through the shared resolver.
 *
 *  Two halves:
 *
 *  1) answer() - commit, render, then say so (ui/reversible.js's order), with
 *     the way back sitting next to the sentence. Flipping an answer restores
 *     the previous one on undo rather than deleting it, so yes -> no -> undo
 *     lands back on yes and not on "never answered".
 *
 *  2) classificationSections() - the half that was weakest. If someone spots a
 *     wrong inference themselves they must be able to correct it where they
 *     see it, not by hunting through a drawer. These build the answers into
 *     the dialog the category tag on a row already opens, because that tag is
 *     the control a person already uses to say how a transaction is filed -
 *     adding a second affordance beside it would teach two doors for one idea.
 *     A row is only ever offered the answers its own shape admits.
 *
 *  Each answer is true at exactly one level - a transaction, an account, a
 *  payee - so none of them asks a person to choose a scope as well as an
 *  answer. Whether a payment is a fixed expense is not here at all: that is a
 *  fact about its category, and the Plan already holds which categories are
 *  fixed.
 * ======================================================================== */

import { requireCtx, transactionName } from '../core/shared-helpers.js';
import { Store } from '../core/storage.js';
import { commitAndRender } from './reversible.js';
import {
  CONFIRMABLE,
  answerFor,
  applyAnswer,
  confirmationId,
  sanitiseConfirmations,
} from '../analysis/confirmations.js';

export function createConfirmControl(ctx) {
  requireCtx(
    ctx,
    ['state', 'el', 'toast', 'render', 'closePicker', 'trackUsage', 'payCandidateKeys'],
    'createConfirmControl'
  );
  const { state, el, toast, render, closePicker, trackUsage, payCandidateKeys } = ctx;

  const list = () => state.confirmations || [];

  async function writeAll(next) {
    await Store.confirmations.replace(next);
    state.confirmations = sanitiseConfirmations(await Store.confirmations.all());
  }

  /* The one writer. Everything else in this app that records an answer calls
   * this; nothing else touches Store.confirmations. */
  async function answer({ inference, subject, answer: value, scope = null, describe, track }) {
    if (!CONFIRMABLE[inference]) throw new Error(`Unknown inference: ${inference}`);
    const before = sanitiseConfirmations(list());
    const applied = applyAnswer(before, { inference, subject, answer: value, scope });
    const prior = applied.prior;
    const id = confirmationId(inference, applied.record.scope, applied.record.subject);
    await commitAndRender({
      commit: () => writeAll(applied.confirmations),
      render,
      notify: () =>
        toast(
          typeof describe === 'function' ? describe(value) : String(describe || 'Noted.'),
          async () => {
            const back = prior
              ? [...before.filter((c) => c.id !== id), prior]
              : before.filter((c) => c.id !== id);
            await commitAndRender({
              commit: () => writeAll(back),
              render,
              notify: () => toast('Put back.'),
            });
          }
        ),
    });
    if (track) trackUsage(track);
  }

  /* Several answers about the same inference, committed together and taken
   * back together - the attention list asks about a batch of flagged purchases
   * in one question, so it must be undoable in one tap. */
  async function answerMany({ inference, subjects, answer: value, describe, track }) {
    const keys = [...new Set((subjects || []).map((k) => String(k == null ? '' : k)))].filter(
      Boolean
    );
    if (!keys.length) return;
    const before = sanitiseConfirmations(list());
    let next = before;
    for (const subject of keys) {
      next = applyAnswer(next, { inference, subject, answer: value }).confirmations;
    }
    await commitAndRender({
      commit: () => writeAll(next),
      render,
      notify: () =>
        toast(
          typeof describe === 'function' ? describe(keys.length) : String(describe || 'Noted.'),
          async () => {
            await commitAndRender({
              commit: () => writeAll(before),
              render,
              notify: () => toast('Put back.'),
            });
          }
        ),
    });
    if (track) trackUsage(track);
  }

  /* "I have looked at these" - the same answer the row's own control gives,
   * kept here rather than in the category picker so the review resolution is
   * not a mechanism of its own. */
  function dismissReview(rows) {
    return answerMany({
      inference: 'review',
      subjects: (rows || []).map((r) => r && r.id),
      answer: true,
      describe: (n) => `Marked ${n} item${n === 1 ? '' : 's'} as reviewed.`,
      track: 'confirm-review',
    });
  }

  const merchantKeyOf = (row) =>
    row.counterpartyKey || row.merchantGroup || row.displayName || row.description || '';

  /* A question worth asking only where the app actually made a choice. The
   * candidates come from the SAME primitive the figure comes from, never a
   * second detector run with its own idea of what repeats. */
  const payIsOpen = (row) => {
    const keys = payCandidateKeys();
    if (keys.length < 2) return false;
    return keys.includes(String(row.counterpartyKey || merchantKeyOf(row)));
  };

  const payeeName = (row) => transactionName(row) || 'this payee';

  function chip(label, { on, title, onclick }) {
    return el(
      'button',
      {
        class: 'vm-tag confirm-chip',
        type: 'button',
        title,
        // The pressed state IS the stored answer, so it is expressed once -
        // here, where assistive technology reads it, and styled from the same
        // attribute rather than from a second class that could disagree.
        'aria-pressed': on ? 'true' : 'false',
        onclick,
      },
      label
    );
  }

  /* One answer, one line: the question, and the two ways it can go.
   *
   * A question, not a heading. "Review", "Own account", "Income" are the app's
   * words for these decisions and they mean nothing to the person reading
   * them - a label and two chips leaves them guessing what is being asked and
   * which way round the answer runs. A sentence ending in a question mark,
   * answered yes or no, needs nothing explained underneath it. The chips'
   * titles carry the consequence for anyone who wants it. */
  function line(label, { current, yes, no, onAnswer }) {
    const pick = (value) => {
      closePicker();
      return onAnswer(value);
    };
    return el(
      'div',
      { class: 'confirm-line' },
      el('span', { class: 'confirm-line-label' }, label),
      el(
        'span',
        { class: 'confirm-pair' },
        chip(yes.label, { on: current === true, title: yes.title, onclick: () => pick(true) }),
        chip(no.label, { on: current === false, title: no.title, onclick: () => pick(false) })
      )
    );
  }

  /* Whether a movement is between the person's own accounts is decided from
   * account numbers printed on the statement, and a number that merely shares
   * its last digits with one of theirs reads as their own. Being wrong here is
   * the costliest guess in the app: an own-account move is left out of
   * spending entirely, so rent or child support paid by transfer can disappear
   * from the figures without anything being said. True of the account, not of
   * one movement to it, so it is answered once for the account. */
  function transferLine(row) {
    const place = payeeName(row);
    const key = row.transferKey || merchantKeyOf(row);
    return line('Is this between your own accounts?', {
      current: answerFor(list(), 'transfer', [key]),
      yes: { label: 'Yes', title: `Treat “${place}” as an account of yours, and leave this out of spending` },
      no: { label: 'No', title: `Treat “${place}” as somebody else, and count this as money spent` },
      onAnswer: (value) =>
        answer({
          inference: 'transfer',
          subject: key,
          answer: value,
          describe: () =>
            value ? `“${place}” counts as an account of yours.` : `“${place}” counts as someone else.`,
          track: 'confirm-own-transfer',
        }),
    });
  }

  function incomeLine(row) {
    const cash = !!row.cashDeposit;
    const inference = cash ? 'income' : 'refund';
    return line('Is this income?', {
      current: answerFor(list(), inference, [row.id]),
      yes: { label: 'Yes', title: 'Count this as your own income' },
      no: {
        label: 'No',
        title: cash
          ? 'Leave this out of income - cash that is not yours to keep'
          : 'Leave this out of income - money passing through, returned or reimbursed',
      },
      onAnswer: (value) =>
        answer({
          inference,
          subject: row.id,
          answer: value,
          describe: () => (value ? 'Counted as income.' : 'Left out of income.'),
          track: cash ? 'confirm-deposit-income' : 'confirm-refund-income',
        }),
    });
  }

  /* Which of your own accounts counts as saving, answered on a transfer into
   * it as well as in the Plan drawer - the same account-level answer and the
   * same stored subject, said where the money is seen going there. */
  function savingLine(row) {
    const key = row.counterpartyKey;
    const label = row.counterpartyLabel || key;
    return line(`Is ${label} a savings account?`, {
      current: answerFor(list(), 'saving', [key]),
      yes: { label: 'Yes', title: `Count money moved into ${label} as saving` },
      no: { label: 'No', title: `Do not count money moved into ${label} as saving` },
      onAnswer: (value) =>
        answer({
          inference: 'saving',
          subject: key,
          answer: value,
          describe: () =>
            value ? `${label} now counts as saving.` : `${label} no longer counts as saving.`,
          track: 'confirm-saving-account',
        }),
    });
  }

  /* Which repeating credit is the person's pay. It is decided by size and
   * nothing else, and it sets the next payday, which sets the window of
   * payments counted before it, which sets Overview's lead figure - so a
   * second job, a distribution or a regular transfer from family that happens
   * to be bigger than a salary moves the headline and says nothing.
   *
   * Only asked where there is something to get wrong: the payee has to repeat
   * often enough for the detector to have considered it, and there has to be
   * more than one payee it was choosing between. With a single regular credit
   * there is no guess to correct, so no question appears. True of the payee,
   * so it is answered once for the payee. */
  function payLine(row) {
    const key = row.counterpartyKey || merchantKeyOf(row);
    const place = payeeName(row);
    return line('Is this where your pay comes from?', {
      current: answerFor(list(), 'pay', [key]),
      yes: { label: 'Yes', title: `Take your next payday from “${place}”` },
      no: { label: 'No', title: `Do not treat “${place}” as your pay` },
      onAnswer: (value) =>
        answer({
          inference: 'pay',
          subject: key,
          answer: value,
          describe: () =>
            value
              ? `Your payday now comes from “${place}”.`
              : `“${place}” no longer counts as your pay.`,
          track: 'confirm-pay-payee',
        }),
    });
  }

  function reviewLine(row) {
    return line('Have you looked at this one?', {
      current: answerFor(list(), 'review', [row.id]),
      yes: { label: 'Yes', title: 'Take this off the review list' },
      no: { label: 'Not yet', title: 'Keep this on the review list' },
      onAnswer: (value) =>
        answer({
          inference: 'review',
          subject: row.id,
          answer: value,
          describe: () => (value ? 'Marked as reviewed.' : 'Kept on the review list.'),
          track: 'confirm-review',
        }),
    });
  }

  /* Everything a person can tell the app about ONE transaction, gathered
   * behind the control they already use to say how a transaction is filed -
   * the category tag on the row. What appears follows from what the row is,
   * and nothing appears for an inference that does not touch it.
   *
   * Whether a payment is a fixed expense is deliberately absent: that is a
   * fact about its category, and the Plan already holds which categories are
   * fixed. Filing this as Rent is how it becomes one. */
  /* ASKED WHERE THERE IS SOMETHING TO ANSWER, AND NOWHERE ELSE.
   *
   * "Have you looked at this one?" appeared on every card purchase in the
   * ledger - twelve hundred rows, almost all of them filed confidently by a
   * merchant the app recognises, none of them on any review list. A question
   * nobody raised, under a heading nobody asked for, every single time the
   * category tag was opened. Silence is meant to be the default; a question
   * belongs where the answer changes something.
   *
   * The row has to actually be on the review list - the SAME predicate the
   * review filter and the review count use, not a second idea of what "needs
   * a look" means - or already carry an answer, so a decision stays visible
   * and changeable where it was made. */
  const onReviewList = (row) =>
    row.category === ((state.cfg && state.cfg.special && state.cfg.special.fallback) || 'Uncategorised') ||
    !!row.needsReview;
  const reviewIsOpen = (row) =>
    row.kind === 'spend' &&
    (onReviewList(row) || answerFor(list(), 'review', [row.id]) !== null);

  function classificationSections(row, ledger) {
    if (ledger !== 'bank') return reviewIsOpen(row) ? [reviewLine(row)] : [];
    const out = [transferLine(row)];
    if (row.direction === 'in' && (row.cashDeposit || !row.internalTransfer))
      out.push(incomeLine(row));
    if (row.direction === 'in' && !row.internalTransfer && payIsOpen(row)) out.push(payLine(row));
    if (
      row.direction === 'out' &&
      row.internalTransfer &&
      /^own:/.test(String(row.counterpartyKey || ''))
    )
      out.push(savingLine(row));
    return out;
  }

  /* The same question, for a surface that already knows which one it is asking.
   * The Review & adjustments card lists exactly the rows this answer governs,
   * so it needs this one line and not the whole set a row admits. It is the
   * SAME builder, not a copy of it: two surfaces that ask "is this income?" in
   * two different shapes are two mechanisms one round of drift apart. */
  function incomeQuestion(row) {
    return incomeLine(row);
  }

  return { answer, answerMany, dismissReview, classificationSections, incomeQuestion };
}
