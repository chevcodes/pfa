/* ===========================================================================
 *  proven-models.js  -  app-level accessors that bind the PROVEN, corpus-tested
 *  analysis modules to live app state, following the app's own memoised-model
 *  conventions (the _key/_val single-slot caches used by overviewModel /
 *  commitmentsModel / analysis / resolved).
 *
 *  ADDITIVE BY DESIGN. This module introduces NEW capabilities and never
 *  replaces or shadows an existing model. It is constructed once in bootUI and
 *  handed to the render factories via ctx; a renderer opts in by calling an
 *  accessor. Nothing here runs until a consumer calls it, so importing and
 *  wiring it changes no existing behaviour.
 *
 *  Why a factory (not free functions): the accessors must read LIVE app state
 *  and reuse the app's already-memoised classifiedBank(), so they close over a
 *  small ctx exactly like every other render factory in this codebase. It fails
 *  loudly at construction (requireCtx) if a dependency is missing, the same
 *  guarantee the other factories give.
 * ======================================================================== */
import { requireCtx } from '../core/shared-helpers.js';
import { commitmentAndIncomePrimitive,resolveOpts, liquidBalance } from './commitment-income.js';
import { buildAvailableNowModel } from './available-now.js';
import { committedFlexible, buildCommittedFlexibleModel } from './committed-flexible.js';
import { spendBreakdown, buildSpendBreakdownModel } from './spend-breakdown.js';
import { resolveIntention, paceForMonth, buildPaceModel } from './category-intentions.js';
import { buildForecast, snapshotForAccuracy } from './forecast.js';
import {
  cashAndDebt,
  recordedNetWorth,
  financialPositionSummary,
  buildCashDebtModel,
  buildNetWorthModel,
} from './position.js';
import { tagTotals, buildTagModel } from './tag-totals.js';
import { investmentNetWorthItems } from './investments.js';
import { knownAccounts, resolveBalances, overlayCashAndDebt } from './balance-updates.js';

// FIX (period seam): the app's resolved() returns MONTH-granularity bounds
// ('YYYY-MM'), but the pure analysis modules compare against full ISO dates
// ('YYYY-MM-DD'). Passing month bounds straight through silently drops every
// end-of-month row (proven: a 25th-of-month salary vanished, income read 0).
// The binding layer normalises here so the modules stay pure and the app's
// period convention is honoured. from -> first of month; to -> last of month.
// Safe whether resolved() returns month or date bounds: a bound already in
// full YYYY-MM-DD form passes through unchanged.
function toDateBounds(period) {
  if (!period || !period.from || !period.to) return null;
  const from = /^\d{4}-\d{2}$/.test(period.from) ? period.from + '-01' : period.from;
  let to = period.to;
  if (/^\d{4}-\d{2}$/.test(to)) {
    const y = +to.slice(0, 4),
      mo = +to.slice(5, 7);
    const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    to = `${to}-${String(last).padStart(2, '0')}`;
  }
  return { from, to };
}

export function createProvenModels(ctx) {
  requireCtx(ctx, ['state', 'classifiedBank', 'todayISO'], 'createProvenModels');
  const { state, classifiedBank, todayISO } = ctx;

  let _cdKey = null,
    _cdVal = null;
  function reconciledCashDebt() {
    const cb = classifiedBank();
    const cs = state._cardStatements;
    const asOf = todayISO();
    if (
      _cdVal &&
      _cdKey.cb === cb &&
      _cdKey.cs === cs &&
      _cdKey.asOf === asOf &&
      _cdKey.cfg === state.cfg &&
      _cdKey.fx === state.fxRates
    ) {
      return _cdVal;
    }
    _cdVal = cashAndDebt({
      bankRecords: cb,
      cardStatements: cs || [],
      cfg: state.cfg,
      asOf,
      fx: state.fxRates || null,
    });
    _cdKey = { cb, cs, asOf, cfg: state.cfg, fx: state.fxRates };
    return _cdVal;
  }

  let _balKey = null,
    _balVal = null;
  function balances() {
    const cd = reconciledCashDebt();
    const bs = state._bankStatements;
    const updates = state.balanceUpdates;
    if (_balVal && _balKey.cd === cd && _balKey.bs === bs && _balKey.updates === updates) return _balVal;
    _balVal = resolveBalances({
      known: knownAccounts({
        cashDebt: cd,
        bankRecords: classifiedBank(),
        bankStatements: bs || [],
        cardStatements: state._cardStatements || [],
      }),
      updates: updates || [],
    });
    _balKey = { cd, bs, updates };
    return _balVal;
  }

  let _liveKey = null,
    _liveVal = null;
  function liveCashDebt() {
    const cd = reconciledCashDebt();
    const b = balances();
    if (_liveVal && _liveKey.cd === cd && _liveKey.b === b) return _liveVal;
    _liveVal = overlayCashAndDebt(cd, b);
    _liveKey = { cd, b };
    return _liveVal;
  }

  function enteredCash() {
    const live = liveCashDebt();
    if (!live || !live.entered || !live.entered.cash) return null;
    return {
      liquid: live.liquid,
      perAccount: live.perAccount,
      asOf: live.entered.asOf,
      cardBalance: live.entered.card ? live.cardBalance : null,
    };
  }

  let _cipKey = null,
    _cipVal = null;
  function commitmentIncome() {
    const cb = classifiedBank();
    const cs = state._cardStatements;
    const asOf = todayISO();
    const entered = liveCashDebt();
    const groups = state._planGroups;
    const answers = state.confirmations;
    if (
      _cipVal &&
      _cipKey &&
      _cipKey.cb === cb &&
      _cipKey.cs === cs &&
      _cipKey.asOf === asOf &&
      _cipKey.cfg === state.cfg &&
      _cipKey.entered === entered &&
      _cipKey.groups === groups &&
      _cipKey.answers === answers
    ) {
      return _cipVal;
    }
    const cash = enteredCash();
    _cipVal = commitmentAndIncomePrimitive({
      bankRecords: cb,
      cardStatements: cs || [],
      cfg: state.cfg,
      asOf,
      groupAssignments: groups,
      confirmations: answers || [],
      liquidNow: cash
        ? {
            total: cash.liquid,
            perAccount: cash.perAccount,
            staleAccounts: liquidBalance(cb, resolveOpts(state.cfg), asOf).staleAccounts,
          }
        : null,
    });
    _cipKey = { cb, cs, asOf, cfg: state.cfg, entered, groups, answers };
    return _cipVal;
  }

  // "Available now" three-layer view-model (Overview surface).
  function availableNow() {
    // The person's own guilt-free share drives Overview's lead figure, so the
    // saved plan is read here rather than each surface deriving its own.
    return buildAvailableNowModel(commitmentIncome(), state.cfg, state._planTarget || null);
  }

  /* ---- committed vs flexible (period-scoped) ----
   * cardRecords = state.rows (the built card rows carry .kind spend/fee/…,
   * .amount, .date, .category, .merchantGroup - the exact fields the module
   * reads), so it consumes what the app already computes, no re-derivation. */
  function committedFlexibleFor(period) {
    const b = toDateBounds(period);
    if (!b) return null;
    const res = committedFlexible({
      bankRecords: classifiedBank(),
      cardRecords: state.rows,
      cfg: state.cfg,
      period: b,
      groupAssignments: state._planGroups,
    });
    return buildCommittedFlexibleModel(res, state.cfg);
  }

  /* ---- "where it went": one category -> merchant drill (period + prior) ----
   * priorComplete should come from the app's coverage helper so a partial prior
   * month never yields an exaggerated percentage (the guard the proof added). */
  function spendBreakdownFor(period, priorPeriod = null, priorComplete = true) {
    const b = toDateBounds(period);
    if (!b) return null;
    const pb = priorPeriod ? toDateBounds(priorPeriod) : null;
    const res = spendBreakdown({
      cardRecords: state.rows,
      cfg: state.cfg,
      period: b,
      priorPeriod: pb,
      priorComplete,
      splits: state.transactionSplits || [],
    });
    return buildSpendBreakdownModel(res, state.cfg);
  }

  // E2 (treemap): the RAW spendBreakdown result, before buildSpendBreakdownModel
  // formats every figure into display text. The treemap needs real numbers
  // (amount, for its area math) that the formatted view-model no longer
  // carries - this is the SAME analysis run once, read at a different layer,
  // never a second computation. Same period/prior/splits handling as
  // spendBreakdownFor, so the two can never silently disagree on the
  // underlying numbers, only on how they're presented.
  function spendBreakdownRawFor(period, priorPeriod = null, priorComplete = true) {
    const b = toDateBounds(period);
    if (!b) return null;
    const pb = priorPeriod ? toDateBounds(priorPeriod) : null;
    return spendBreakdown({
      cardRecords: state.rows,
      cfg: state.cfg,
      period: b,
      priorPeriod: pb,
      priorComplete,
      splits: state.transactionSplits || [],
    });
  }

  /* ---- category intentions: forward pace for a category in a month ----
   * spendSoFar MUST be the app's own category spend for that window (refunds/
   * exclusions/splits already applied); this only turns it into a pace reading
   * via the single shared precedence resolver. Returns null when no intention. */
  function paceFor(category, targetMonth, spendSoFar, asOfDay) {
    const it = resolveIntention(state.categoryIntentions || [], category, targetMonth);
    if (!it) return null;
    const pace = paceForMonth({
      intention: it,
      targetMonth,
      spendSoFar,
      asOfDay,
      cfg: state.cfg,
    });
    return buildPaceModel(pace, state.cfg);
  }
  // The raw resolver, for callers that need the governing intention itself.
  function intentionFor(category, targetMonth) {
    return resolveIntention(state.categoryIntentions || [], category, targetMonth);
  }

  /* ---- forecast + chart geometry (per-horizon memo, invalidated by data/day) ---- */
  const _fc = new Map(); // horizon -> { cb, cs, asOf, val }
  function forecast(horizonDays = 30) {
    const cb = classifiedBank();
    const cs = state._cardStatements;
    const asOf = todayISO();
    const answers = state.confirmations;
    const e = _fc.get(horizonDays);
    if (e && e.cb === cb && e.cs === cs && e.asOf === asOf && e.cfg === state.cfg && e.answers === answers)
      return e.val;
    const val = buildForecast({
      bankRecords: cb,
      cardStatements: cs || [],
      cfg: state.cfg,
      asOf,
      horizonDays,
      confirmations: answers || [],
    });
    _fc.set(horizonDays, { cb, cs, asOf, cfg: state.cfg, answers, val });
    return val;
  }
  // A snapshot for accuracy tracking; the caller persists it to the
  // forecastSnapshots store (never written here - this module has no I/O).
  function forecastSnapshot(horizonDays = 90) {
    return snapshotForAccuracy(forecast(horizonDays));
  }

  function positionModels() {
    const asOf = todayISO();
    const cd = reconciledCashDebt();
    const nw = recordedNetWorth({
      reconciled: cd,
      manualAssets: state.manualAssets || [],
      investments: investmentNetWorthItems(state._investmentStatements || []),
      asOf,
      fx: state.fxRates || null,
    });
    const summary = financialPositionSummary({
      cashDebt: cd,
      netWorth: nw,
      cfg: state.cfg,
      asOf,
      fx: state.fxRates || null,
    });
    const live = liveCashDebt();
    const liveNetWorth =
      live === cd
        ? nw
        : recordedNetWorth({
            reconciled: live,
            manualAssets: state.manualAssets || [],
            investments: investmentNetWorthItems(state._investmentStatements || []),
            asOf,
            fx: state.fxRates || null,
          });
    return {
      cashDebt: live,
      netWorth: liveNetWorth,
      summary,
      balances: balances(),
      cashDebtModel: buildCashDebtModel(live, state.cfg),
      netWorthModel: buildNetWorthModel(liveNetWorth, state.cfg),
    };
  }

  // Personal cross-category tags (B3a): joins state.tags against the SAME
  // combined card+bank rows the rest of this app already treats as one
  // ledger-agnostic set, so a tag's total can never disagree with any other
  // surface's idea of "what this transaction is". Ids are unique across
  // ledgers (transactionIdentity / bankTransactionIdentity), so no
  // collision risk mixing card rows and classifiedBank() rows here.
  function tags() {
    const rows = [...(state.rows || []), ...classifiedBank()];
    return tagTotals(state.tags || [], rows).map((tt) => buildTagModel(tt, state.cfg));
  }

  /* The repeating credits the pay guess was made from, straight off the same
   * cached primitive that produced the figure - so the question a person is
   * asked can never be about a different set than the one that decided it. */
  function payCandidateKeys() {
    const model = commitmentIncome();
    return ((model && model.payCandidates) || []).map((c) => String(c.key));
  }

  return {
    commitmentIncome,
    payCandidateKeys,
    availableNow,
    committedFlexibleFor,
    spendBreakdownFor,
    spendBreakdownRawFor,
    paceFor,
    intentionFor,
    forecast,
    forecastSnapshot,
    positionModels,
    balances,
    enteredCash,
    tags,
  };
}
