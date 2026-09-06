/* ===========================================================================
 *  goal-progress-ctx.js  -  builds the progressCtx shape goals.js's
 *  goalProgress expects, from the app's already-computed models. Extracted
 *  from bootUI's closure (app.js) so it is a real, importable, top-level
 *  function - a function nested inside bootUI can never be exported for
 *  goal_engine_parity_proof.mjs to import directly.
 *
 *  Pure with respect to its OWN logic (no state mutation, no I/O); its
 *  inputs are the app's live model outputs, passed in explicitly via deps
 *  rather than closed over - the same "pass live data in, compute, return"
 *  shape every other proven module in this app already follows.
 *
 *  Unlike the OLD inline block this replaces (which self-computed "latest
 *  month with ANY data" for spend-ceiling), this takes month as an EXPLICIT
 *  required parameter for spend-ceiling - the caller supplies it, matching
 *  goalDataForMonth's own existing contract exactly. cushion/clear-card
 *  remain LIVE-ONLY (month is accepted but ignored for them), matching
 *  goalDataForMonth's own accepted design: reconstructing an honest
 *  historical cash position or card balance for an arbitrary past month is
 *  not attempted anywhere in this app.
 * ======================================================================== */

import { isoToday, latestCardStatement } from '../core/shared-helpers.js';
import {
  normaliseEair,
  medianRecentPayment,
} from './reporting-periods.js';
import { monthlyCostOfLiving, typicalIncome } from './plan.js';

// deps: { classifiedBank, overviewModel, typicalMonthlyOutflow, ymToday,
//         analyseBankActivity, bankFlowOverTime, state }
export function buildNewEngineProgressCtx(migratedGoal, opts = {}, deps) {
  const {
    classifiedBank,
    overviewModel,
    typicalMonthlyOutflow,
    ymToday,
    analyseBankActivity,
    bankFlowOverTime,
    state,
  } = deps;

  const cb = classifiedBank();
  const asOf = opts.asOf || isoToday();
  const { rollAllTrend, roll } = overviewModel();
  const monthlyOutflow = typicalMonthlyOutflow(rollAllTrend, ymToday());
  const dailyOutflow = monthlyOutflow / (365.25 / 12);
  const entered = opts.enteredCash || null;
  const cashPosition = entered ? entered.liquid : analyseBankActivity(cb).closingBalance;

  // No readable cash position: skip rather than let a cushion goal read a
  // misleading 0 days. Matches renderNoBalance's own reasoning.
  if (migratedGoal.type === 'cushion' && cashPosition == null) return null;

  // The Plan's idea of a normal month's take-home. Still read here because the
  // plan link and the boundary wording use it; it is no longer what sizes the
  // emergency fund.
  const income = typicalIncome(rollAllTrend, asOf);

  // What a month COSTS - the emergency-fund target's one source. Built from
  // rollAllTrend, which is statement history: an entered balance can move
  // liquidNow below, but it can never reach this figure, so a typed balance
  // cannot move the target. That separation is what
  // unreconciled_balances_proof.mjs stands guard over.
  const cost = monthlyCostOfLiving(rollAllTrend, asOf);

  const progressCtx = {
    asOf,
    typicalDailyOutflow: dailyOutflow,
    typicalMonthlyIncome: income.amount,
    incomeBasis: income,
    typicalMonthlyExpenses: cost.amount,
    expensesBasis: cost,
    expensesMonthsOfData: cost.monthsUsed,
    liquidNow: cashPosition,
    cashAsOf: entered ? entered.asOf : null,
    cardBalance: entered && entered.cardBalance != null ? entered.cardBalance : roll.cardOwed,
  };

  // G (clear-card engine extension): the SAME derivation goalDataForMonth
  // (app.js) already uses for the old engine's clear-card ctx - reused here
  // verbatim so the new engine's feasibility check reads the identical rate
  // and recent-payment history the old engine's projectCardPayoff always
  // did. Without this, goalProgress's clear-card branch still runs fine -
  // feasible just stays honestly null (unknown), and the model falls back
  // to the calm "needs about X a month" wording. This is what ACTIVATES
  // feasibility; it is not required for correctness.
  if (migratedGoal.type === 'clear-card') {
    const latestStmt = latestCardStatement(state._cardStatements);
    progressCtx.eairFrac = latestStmt ? normaliseEair(latestStmt.eair) : null;
    progressCtx.typicalPayment = medianRecentPayment(state._cardStatements || []);
  }

  if (migratedGoal.type === 'spend-ceiling') {
    const month = opts.month;
    if (!month) return null; // mirrors goalDataForMonth's own guard
    const cardSpendForMonth =
      state.allSummary && state.allSummary.by_month ? state.allSummary.by_month[month] || 0 : 0;
    const bankTrend = bankFlowOverTime(cb);
    const bankRow = bankTrend.find((t) => t.month === month);
    progressCtx.spendThisPeriod = cardSpendForMonth + (bankRow ? bankRow.moneyOut : 0);
  }

  return progressCtx;
}
