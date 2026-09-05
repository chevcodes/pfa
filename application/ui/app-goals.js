import { Store } from '../core/storage.js';
import { ensureMigrated } from '../analysis/goal-migrate.js';
import { evaluateGoal } from '../analysis/goals.js';
import { buildNewEngineProgressCtx as buildNewEngineProgressCtxPure } from '../analysis/goal-progress-ctx.js';
import { analyseBankActivity, analyseRollup, bankFlowOverTime } from '../analysis/bank-analysis.js';
import { monthKey, roundMoney, formatDisplayDate } from '../core/shared-helpers.js';
import {
  monthName,
  resolvePeriod,
  runwayDays,
  typicalMonthlyOutflow,
  ymToday,
  normaliseEair,
  medianRecentPayment,
} from '../analysis/reporting-periods.js';
import { computeGoalProgress } from '../analysis/reporting-insights.js';

export function createGoalController(ctx) {
  const { state, render, classifiedBank, overviewModel, allLedgerMonths, bankMoney } = ctx;
  /* ===================================================================
   * Round 4 (Where you're headed): goal-setting, its monthly honest
   * follow-up, and the small persisted log that follow-up writes to.
   * computeGoalProgress/describeGoal (reporting.js) do the actual judging;
   * everything here is orchestration - building the right data bundle for
   * whichever goal type is active, persisting the goal itself, and
   * recording one frozen entry per genuinely new complete month.
   * =================================================================== */
  async function setGoal(type, params) {
    state.goal = {
      type,
      params,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    await Store.setMeta('financeGoal', state.goal);
    render();
  }
  async function clearGoal() {
    // The goal itself is cleared; goalLog (the historical record of past
    // months' honest checks) is deliberately left intact, exactly like
    // closing a chapter without erasing what already happened in it.
    state.goal = null;
    await Store.setMeta('financeGoal', null);
    render();
  }
  // Restore a previously-cleared goal EXACTLY as it was - crucially keeping
  // its ORIGINAL createdAt, not today's date. setGoal() always stamps a fresh
  // createdAt (correct when genuinely setting a new goal), but an undo must
  // preserve the original, or the monthly-check gate (checkMonthlyGoalIfDue's
  // `month < createdMonth` test) would silently shift and a month already
  // logged under the old goal could be re-evaluated. So this restores the
  // whole stored object directly rather than routing through setGoal.
  async function restoreGoal(goalObject) {
    if (!goalObject) return;
    state.goal = goalObject;
    await Store.setMeta('financeGoal', goalObject);
    render();
  }

  // The data bundle computeGoalProgress needs for a specific goal type.
  // 'runway' and 'clear-card' both read LIVE current figures - genuinely "how
  // are things right now" readings, since reconstructing either honestly for
  // an arbitrary past month would need a fragile historical balance
  // rebuild this app does not attempt. 'spend-ceiling' instead reads the
  // ACTUAL completed month's real total spend for the given month - the one
  // goal type with a genuinely knowable historical fact, so it uses it.
  // Step 3 (goal-system migration): the new engine's equivalent of
  // goalDataForMonth, above - builds the exact progressCtx shape goals.js's
  // goalProgress expects. Proven byte-identical to the inline block it
  // replaces (previously duplicated inside ahead-render.js's live
  // comparison card) via parity_proof_ctx.mjs, on identical mock inputs,
  // including proof that the `month` parameter genuinely changes the
  // spend-ceiling reading rather than being ignored.
  //
  // Unlike the OLD inline block (which self-computed "latest month with
  // ANY data" for spend-ceiling), this takes month as an EXPLICIT required
  // parameter for spend-ceiling - the caller supplies it, matching
  // goalDataForMonth's own existing contract exactly. This is a deliberate
  // fix, not a preserved quirk: both callers below now pass the SAME
  // "latest COMPLETE month" concept the rest of the app already uses
  // (resolvePeriod({type:'latest-complete'})), closing the gap the
  // comparison card's own comment previously flagged as a known
  // simplification.
  //
  // cushion/clear-card remain LIVE-ONLY (month is accepted but ignored for
  // them), matching goalDataForMonth's own accepted design: reconstructing
  // an honest historical cash position or card balance for an arbitrary
  // past month is not attempted anywhere in this app.
  // Extracted to goal-progress-ctx.js (application/analysis/) so it is a
  // real, importable, top-level function - useful for goal_engine_parity_
  // proof.mjs to import directly, and matching the pattern already
  // established by goal-migrate.js/goals.js of small, pure, standalone
  // analysis files. This wrapper just supplies this closure's own live
  // bindings as explicit deps; the actual logic (and its own detailed
  // comment on the month-parameter design) now lives in that file.
  function buildNewEngineProgressCtx(migratedGoal, opts = {}) {
    return buildNewEngineProgressCtxPure(migratedGoal, opts, {
      classifiedBank,
      overviewModel,
      typicalMonthlyOutflow,
      ymToday,
      analyseBankActivity,
      bankFlowOverTime,
      state,
    });
  }

  // The single place "which month counts as latest-complete for goal
  // purposes" is resolved, shared by the live comparison card (Ahead) and
  // the monthly log below, so the two can never silently disagree on what
  // "this period" means for a spend-ceiling goal.
  function latestCompleteGoalMonth() {
    const months = allLedgerMonths();
    if (!months.length) return null;
    const period = resolvePeriod(
      { type: 'latest-complete' },
      state.rows,
      months,
      new Date(),
      state.coverage
    );
    return period ? period.from : null;
  }

  // The new engine's goalProgress returns a strict boolean `met` for
  // clear-card (balance <= 1) - correct for the live card, where
  // buildGoalModel already softens an in-progress goal with
  // tone:'neutral'/tag:'on a plan' rather than a warning. The monthly log
  // below has no such softening layer - it maps met straight to a dot
  // colour - so a strict boolean would show every unfinished clear-card
  // goal as a monthly WARNING until the day it's paid off, even while
  // genuinely on track. parity_proof.mjs proved this exact divergence
  // empirically (old.met=null, new.met=false for the identical
  // "in-progress, on-track" case). This restores the three real states
  // the old engine's computeGoalProgress always distinguished, using the
  // SAME `now` the caller already resolved its period with - never a
  // second, independent new Date() call, so a log entry judges the
  // deadline against one single clock, not two.
  function threeStateMetForLog(migratedGoal, progress, now) {
    if (migratedGoal.type !== 'clear-card') return progress.met;
    if (progress.current <= 1) return true;
    const targetMs = Date.parse(migratedGoal.targetDate);
    if (Number.isFinite(targetMs) && now.getTime() > targetMs) return false;
    return null; // still trying, deadline not yet passed
  }

  function goalDataForMonth(goal, month) {
    if (!goal) return null;
    if (goal.type === 'runway' || goal.type === 'cushion') {
      const cb = classifiedBank();
      const cashPosition = analyseBankActivity(cb).closingBalance;
      const asum = state.allSummary;
      const rollAllTrend = analyseRollup({
        bankRecords: cb,
        cardSpendTotal: 0,
        cardSpendByMonth: asum ? asum.by_month : {},
        cardStatements: [],
      }).trend;
      const monthlyOutflow = typicalMonthlyOutflow(rollAllTrend, ymToday());
      return { runwayDays: runwayDays(cashPosition, monthlyOutflow) };
    }
    if (goal.type === 'clear-card') {
      const roll = overviewModel().roll;
      const latestStmt = (state._cardStatements || [])
        .slice()
        .sort((a, b) => String(a.statementKey).localeCompare(String(b.statementKey)))
        .pop();
      const eairFrac = latestStmt ? normaliseEair(latestStmt.eair) : null;
      const typicalPayment = medianRecentPayment(state._cardStatements || []);
      return {
        cardOwed: roll.cardOwed,
        eairFrac,
        typicalPayment,
        now: new Date(),
      };
    }
    if (goal.type === 'spend-ceiling') {
      if (!month) return null;
      const cardSpendForMonth =
        state.allSummary && state.allSummary.by_month ? state.allSummary.by_month[month] || 0 : 0;
      const bankTrend = bankFlowOverTime(classifiedBank());
      const bankRow = bankTrend.find((t) => t.month === month);
      const bankSpendForMonth = bankRow ? bankRow.moneyOut : 0;
      return {
        monthSpend: roundMoney(cardSpendForMonth + bankSpendForMonth),
        monthLabel: monthName(month),
      };
    }
    return null;
  }

  // The monthly, honest follow-up (plan section 6.2, third bullet): fires
  // once per genuinely NEW complete month, appending a FROZEN record to
  // state.goalLog so a past month's verdict can never quietly change later
  // just because the goal was since altered. A month is checked at most
  // once (the log is searched for an existing entry first), and never a
  // month before the goal existed, so setting or changing a goal can never
  // retroactively grade history that predates it.
  function checkMonthlyGoalIfDue() {
    if (!state.goal) return;
    const months = allLedgerMonths();
    if (!months.length) return;
    // ONE Date instance for this whole check - reused below for the
    // three-state clear-card derivation, never a second independent
    // new Date() call, so "has the deadline passed" is judged against the
    // same clock the period itself was resolved against.
    const now = new Date();
    const period = resolvePeriod(
      { type: 'latest-complete' },
      state.rows,
      months,
      now,
      state.coverage
    );
    if (!period) return;
    const month = period.from;
    if (state.goalLog.some((g) => g.month === month)) return;
    const createdMonth = monthKey(state.goal.createdAt);
    if (month < createdMonth) return;

    // Step 3: repointed at the new engine. ensureMigrated() runs on a local
    // copy - never mutates the stored state.goal - matching the same
    // non-destructive discipline goal-migrate.js's own contract already
    // established. state.goal itself is left exactly as-is; only what
    // feeds this ONE log entry now comes from the proven engine.
    const migrated = ensureMigrated(state.goal);
    if (!migrated) return;
    const progressCtx = buildNewEngineProgressCtx(migrated, { month });
    if (!progressCtx) return;
    const evaluated = evaluateGoal(migrated, progressCtx, state.cfg);
    if (!evaluated) return;

    const met = threeStateMetForLog(migrated, evaluated.progress, now);
    const headline = evaluated.model.detail;

    // Flat fields from the MIGRATED shape (targetDays/targetDate/amount),
    // never a stale .params blob - a goal set under the old shape is
    // migrated above before being evaluated, so every future log entry
    // stores the same field names the new engine (and the live card)
    // already read, closing the shape gap the old log entry (type +
    // params) would otherwise have carried forward indefinitely.
    state.goalLog = [
      ...state.goalLog,
      {
        month,
        type: migrated.type,
        targetDays: migrated.targetDays ?? null,
        targetDate: migrated.targetDate ?? null,
        amount: migrated.amount ?? null,
        met,
        headline,
      },
    ].slice(-24);
    Store.setMeta('financeGoalLog', state.goalLog);
  }

  // Round 4: Overview's beat 11 needs a LIVE "how is this going right now"
  // reading, separate from checkMonthlyGoalIfDue's once-a-month FROZEN log
  // entry above - reuses the exact same goalDataForMonth/computeGoalProgress
  // pair rather than a second, possibly drifting reading. For 'spend-ceiling'
  // (the one type that needs a specific month), this reads the latest
  // complete month, matching how the rest of the app already frames "the
  // month we can currently trust" (detectIncompleteMonth/latestCompleteMonth).
  function liveGoalProgress() {
    if (!state.goal) return null;
    const months = allLedgerMonths();
    const period = months.length
      ? resolvePeriod({ type: 'latest-complete' }, state.rows, months, new Date(), state.coverage)
      : null;
    const data = goalDataForMonth(state.goal, period ? period.from : null);
    if (!data) return null;
    return computeGoalProgress(state.goal, data, bankMoney, formatDisplayDate);
  }

  return {
    setGoal,
    clearGoal,
    restoreGoal,
    buildNewEngineProgressCtx,
    latestCompleteGoalMonth,
    checkMonthlyGoalIfDue,
    liveGoalProgress,
  };
}
