import { roundMoney } from '../core/shared-helpers.js';

// Two goals on the same money argue with each other, and today nothing notices.
// A spending ceiling and an accelerated card paydown both draw on the SAME
// take-home: raise the paydown and the ceiling that is still affordable falls,
// whether or not anyone said so. This resolves that argument in one place.
//
// The order of claims is fixed and not a preference: obligations first, because
// they are not a choice; then debt paydown, because a target date is a promise
// with a cost attached; then saving; and a spending ceiling is only ever
// allowed what genuinely remains. A ceiling that exceeds what is left is not
// "wrong" - it is simply unaffordable alongside the other goals, and the
// engine says by how much rather than silently letting both stand.

export function monthlyPaydown({ balance = 0, monthsRemaining = 0, monthlyRate = 0 } = {}) {
  const b = Math.max(0, Number(balance) || 0);
  const n = Math.max(0, Math.floor(Number(monthsRemaining) || 0));
  const r = Math.max(0, Number(monthlyRate) || 0);
  if (!b) return { payment: 0, feasible: true, interestShare: 0 };
  if (!n) return { payment: b, feasible: false, interestShare: 0 };
  if (!r) return { payment: roundMoney(b / n), feasible: true, interestShare: 0 };
  // Standard amortised payment. There is deliberately no "never clears" flag
  // here: a payment derived from a finite term is always above the monthly
  // interest by construction, so such a flag could never be true and would
  // only look like a safeguard. Whether a payment clears a balance is a real
  // question when the PAYMENT is the input - that is monthsToClear's job.
  // What is worth knowing here is how much of the payment is interest rather
  // than progress.
  const factor = Math.pow(1 + r, n);
  const payment = (b * r * factor) / (factor - 1);
  return {
    payment: roundMoney(payment),
    feasible: true,
    interestShare: payment > 0 ? Math.round(((b * r) / payment) * 1000) / 1000 : 0,
  };
}

export function monthsToClear({ balance = 0, payment = 0, monthlyRate = 0 } = {}) {
  const b = Math.max(0, Number(balance) || 0);
  const p = Math.max(0, Number(payment) || 0);
  const r = Math.max(0, Number(monthlyRate) || 0);
  if (!b) return { months: 0, neverClears: false };
  if (!p) return { months: Infinity, neverClears: true };
  if (!r) return { months: Math.ceil(b / p), neverClears: false };
  if (p <= b * r) return { months: Infinity, neverClears: true };
  const months = Math.log(p / (p - b * r)) / Math.log(1 + r);
  return { months: Math.ceil(months), neverClears: false };
}

// The whole picture: what each concurrent goal claims of a normal month, and
// what a spending ceiling can actually be once they are all honoured.
export function resolveGoalConstraints({
  takeHome = 0,
  fixedCosts = 0,
  savingTarget = 0,
  paydown = null,
  ceiling = null,
} = {}) {
  const income = Math.max(0, roundMoney(takeHome));
  const fixed = Math.max(0, roundMoney(fixedCosts));
  const saving = Math.max(0, roundMoney(savingTarget));

  let paydownClaim = 0;
  let paydownDetail = null;
  if (paydown && Number(paydown.balance) > 0) {
    const need = monthlyPaydown({
      balance: paydown.balance,
      monthsRemaining: paydown.monthsRemaining,
      monthlyRate: paydown.monthlyRate,
    });
    paydownClaim = need.payment;
    paydownDetail = {
      balance: roundMoney(paydown.balance),
      monthsRemaining: Math.max(0, Math.floor(Number(paydown.monthsRemaining) || 0)),
      required: need.payment,
      interestShare: need.interestShare,
      noDate: !paydown.monthsRemaining,
    };
  }

  const claimed = roundMoney(fixed + saving + paydownClaim);
  const maxCeiling = roundMoney(income - claimed);
  const requested = ceiling == null ? null : Math.max(0, roundMoney(ceiling));
  const overBy = requested == null ? 0 : roundMoney(Math.max(0, requested - maxCeiling));
  const conflict = overBy > 0 || maxCeiling < 0;

  return {
    takeHome: income,
    claims: [
      { key: 'fixed', label: 'Fixed expenses', amount: fixed },
      { key: 'paydown', label: 'Card paydown', amount: paydownClaim },
      { key: 'setAside', label: 'Savings & investments', amount: saving },
    ].filter((c) => c.amount > 0),
    claimed,
    maxCeiling: roundMoney(Math.max(0, maxCeiling)),
    unconstrainedCeiling: maxCeiling,
    requestedCeiling: requested,
    overBy,
    conflict,
    paydown: paydownDetail,
    // What would have to give, expressed as a choice rather than a verdict.
    resolutions: buildResolutions({ conflict, overBy, paydownDetail, saving, maxCeiling }),
  };
}

function buildResolutions({ conflict, overBy, paydownDetail, saving, maxCeiling }) {
  if (!conflict) return [];
  const out = [];
  out.push({ key: 'lower-ceiling', amount: Math.max(0, round0(maxCeiling)) });
  if (paydownDetail && paydownDetail.monthsRemaining > 0) {
    const stretched = monthlyPaydown({
      balance: paydownDetail.balance,
      monthsRemaining: paydownDetail.monthsRemaining + 3,
      monthlyRate: 0,
    });
    out.push({ key: 'extend-paydown', amount: round0(paydownDetail.required - stretched.payment) });
  }
  if (saving > 0) {
    out.push({ key: 'lower-saving', amount: round0(Math.min(saving, overBy)) });
  }
  return out;
}

// Resolutions carry money, so they take the caller's formatter rather than
// formatting numbers themselves. A module that prints its own amounts cannot
// honour the privacy gate, and this one is pure - it has no way to know the
// currency either.
function round0(n) {
  return Math.round(Number(n) || 0);
}

// The resolutions as SENTENCES, formatted by the caller's money formatter so
// they pass the same gate as every other figure on screen.
export function describeResolutions(result, money) {
  if (!result || !result.resolutions) return [];
  return result.resolutions.map((r) => {
    if (r.key === 'lower-ceiling') {
      return result.maxCeiling > 0
        ? `Hold spending to ${money(result.maxCeiling)} instead`
        : 'Lower the spending limit until it fits';
    }
    if (r.key === 'extend-paydown') return `Give the card three more months, freeing about ${money(r.amount)} a month`;
    if (r.key === 'lower-saving') return `Set aside ${money(r.amount)} a month less while the card is cleared`;
    return '';
  }).filter(Boolean);
}

export function constraintSummary(result, money) {
  if (!result) return null;
  if (!result.conflict) {
    return {
      tone: 'good',
      text:
        result.requestedCeiling == null
          ? `${money(result.maxCeiling)} a month is available for spending once your other goals are met.`
          : `Both goals fit: ${money(result.requestedCeiling)} of spending leaves your other goals intact.`,
    };
  }
  return {
    tone: 'watch',
    text: `These goals ask for ${money(result.overBy)} a month more than a normal month has. The most a spending limit can be, alongside them, is ${money(result.maxCeiling)}.`,
  };
}
