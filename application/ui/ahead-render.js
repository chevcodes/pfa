import { placeFoldAll, chartInfo } from './decision-header.js';
import { iconReceipt } from '../core/icons.js';
import { collapsibleCardReact, chartInfoReact, scenarioCardReact, monthlyCheckInReact, goalProgressReact, upcomingPaymentsReact, emptyStateReact, statementNudgesReact, statementNudgeCardReact, planViewReact } from './react-bridge.js';
import { projectionReadiness } from '../analysis/coverage-map.js';
import { paymentEvents, paymentStatusText } from '../analysis/payment-obligations.js';
/*
 * ahead-render.js  -  the "Ahead" destination: Coming Up (Round 2) and Where
 * you're headed - goal-setting, the scenario tool, the monthly follow-up
 * (Round 4, plan section 6.2).
 *
 * The forecast switches on only once there is enough bank history to trust
 * it (state.cfg.ahead.minMonthsForForecast, default 2 months) and a readable
 * cash position exists. Below that, this shows a calm explanation of what is
 * missing and how close the person already is - never a shaky guess dressed
 * up as a real number, matching how every other "not enough yet" state in
 * this app already behaves (periodEmptyNotice, detectIncompleteMonth).
 *
 * Every Coming Up figure is read from data already stored - the current cash
 * position, the combined regular commitments (with their expected day), and
 * the recurring income pattern - never from day-to-day discretionary
 * spending, which this app does not attempt to predict.
 *
 * Where you're headed holds three things new to the app: a single stated
 * goal (GOAL_TYPES, reporting.js - a short fixed set the app can honestly
 * measure, never open text), a hands-on scenario tool that recomputes the
 * SAME runway figure Overview's own narrative already uses, and the monthly
 * honest follow-up - a frozen record app.js's checkMonthlyGoalIfDue already
 * builds each month, simply displayed here. Goal-setting itself is a plain
 * inline form (matching manage-data.js's "Your name" section), not a modal,
 * since it is a personal setting a person returns to and edits, not a
 * one-off per-row action.
 */
import {
  projectCashFlow,
  staleStatementNudges,
  typicalMonthlyOutflowBasis,
  ymToday,
} from '../analysis/reporting-periods.js';
import {
  GOAL_TYPES,
  describeGoal,
  computeScenario,
  scenarioMonthlyItems,
} from '../analysis/reporting-insights.js';
import {
  analyseIncomePattern,
  analyseBankActivity,
} from '../analysis/bank-analysis.js';
import { accountName, formatDisplayDate, requireCtx, addDaysIso, isoToday,
  capitaliseFirst, markProportional, roundedDurationPhrase,
} from '../core/shared-helpers.js';
import { pairCards } from './chart-helpers.js';
import {
  DEFAULT_CUSHION_MONTHS,
  EMERGENCY_FUND_LABEL,
  savedFigureNote,
  monthsLabel,
} from '../analysis/cushion.js';
import { makeMoneyCompact, makeProseMoney } from '../core/money-format.js';
// Goal-system migration, now complete: the PROVEN goals engine
// (goalProgress/buildGoalModel/resolveSafetyBoundary/safeContribution) is
// the SOLE engine behind every goal type - cushion, spend-ceiling and (as
// of G, the clear-card engine extension) clear-card too. The old
// reporting.js computeGoalProgress/describeGoal path is retired from the
// live card entirely; describeGoal is still imported above purely for the
// "not enough data yet" fallback sentence, which reads identically well
// under either engine.
import {
  goalProgress,
  resolveSafetyBoundary,
  safeContribution,
  buildGoalModel,
  goalOffTrack,
} from '../analysis/goals.js';
import { ensureMigrated } from '../analysis/goal-migrate.js';

// Module-level, session-only UI state - the same pattern cards-render.js
// already uses for _searchDebounce/_moreFiltersOpen: state that belongs to
// the interaction itself (which goal type is being drafted, which scenario
// items are toggled), never persisted, and reset naturally on a fresh load.
let _goalDraftType = null;
let _goalManageOpen = false;
let _goalTypePickerOpen = false;
let _goalManageReturnFocus = false;
let _goalFocusChoices = false;
// key -> reduction fraction (0 keep / 0.5 cut half / 1 cut all). Replaces the
// old binary _scenarioExcluded Set: "Test a decision" now models spending
// LESS in a category, the realistic lever, not only removing it entirely.
let _scenarioReductions = new Map();
let _scenarioExtraCost = 0;
let _boundaryDraftKind = null;
let _boundaryReturnFocus = false;

const GOAL_META = {
  runway: {
    title: EMERGENCY_FUND_LABEL,
    description: 'Hold a few months’ expenses as a safety net.',
  },
  'clear-card': {
    title: 'Clear the card',
    description: 'Pay the balance off by a date.',
  },
  'spend-ceiling': {
    title: 'Spending limit',
    description: 'Hold monthly spending under an amount.',
  },
};

export function createAheadRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'render',
      'bankMoney',
      'classifiedBank',
      'commitmentsModel',
      'money0',
      'moneyShort',
      'monthLabel',
      'monthShort',
      'bankMonthsList',
      'pickStatements',
      'trackUsage',
      'openEvidence',
      'toast',
      'overviewModel',
      'savingAccountKeys',
      'setGoal',
      'clearGoal',
      'restoreGoal',
      'Store',
      'provenModels',
      'buildNewEngineProgressCtx',
      'latestCompleteGoalMonth',
      'evaluateGoal',
      'iconCal',
      'iconRepeat',
      'iconChart',
      'iconFlag',
      'renderPlanHero',
      'renderPlanLever',
      'planModel',
      'balanceUpdates',
      'openPaymentEditor',
      'openPaymentDetail',
    ],
    'createAheadRenderer'
  );
  const {
    state,
    el,
    icon,
    render,
    bankMoney,
    classifiedBank,
    commitmentsModel,
    bankMonthsList,
    pickStatements,
    trackUsage,
    openEvidence,
    toast,
    overviewModel,
    savingAccountKeys,
    setGoal,
    clearGoal,
    restoreGoal,
    Store,
    provenModels,
    buildNewEngineProgressCtx,
    latestCompleteGoalMonth,
    iconCal,
    iconRepeat,
    iconChart,
    iconFlag,
    monthLabel,
    monthShort,
    renderPlanHero,
    renderPlanLever,
    planModel,
    balanceUpdates,
    openPaymentEditor,
    openPaymentDetail,
  } = ctx;
  // Summary lines and annotations read short; headline figures stay exact.
  const prose = makeProseMoney((ctx.state && ctx.state.cfg) || {});
  const paymentSourceLabel = (paymentId) => paymentId ? 'You set' : 'Estimated';

  function rowDrill(item) {
    if (item.paymentId) return () => openPaymentDetail(item.paymentId);
    if (item.source === 'card') {
      return () => {
        trackUsage('ahead-open-activity');
        if (item.key) {
          openEvidence({ kind: 'merchant', patch: { merchant: item.key, merchantLabel: item.label }, allHistory: true });
        } else {
          openEvidence({ kind: 'view', view: 'activity', activityTab: 'transactions', anchorId: '#acct-tx', allHistory: true });
        }
      };
    }
    if (item.key)
      return () => {
        trackUsage('ahead-drill-payee');
        openEvidence({ kind: 'payee', key: item.key, label: item.label, allHistory: true });
      };
    return null;
  }

  // Round 2 (Ahead foundation): the readiness gate. Bank history alone (not
  // card history) powers the forecast, since "cash position" and "income"
  // are bank-ledger concepts everywhere else in this app too. Below the
  // configured minimum, or with no readable closing balance yet, this
  // explains plainly what is missing rather than guessing.
  function renderNotReady(readiness, asProps = false) {
    const { monthsSoFar, minMonths, reason, gapMonths } = readiness;
    let infoLabel = '';
    let infoContent = '';
    let progress = null;
    if (reason === 'gap') {
      infoLabel = 'A month is missing';
      infoContent = `A projection assumes one month follows the next. ${gapMonths.map((m) => monthShort(m)).join(', ')} has no bank statement, so the run is broken.`;
    } else if (monthsSoFar === 0) {
      infoLabel = 'Bank statement needed';
      infoContent = 'Cash forecasts need a bank balance. Add a bank statement to begin.';
    } else {
      progress = { max: minMonths, value: monthsSoFar, label: `${monthsSoFar} of ${minMonths} bank months` };
    }
    const props = {
      iconMarkup: typeof window !== 'undefined' ? iconCal() : null,
      iconNode: typeof window === 'undefined' ? icon(iconCal()) : null,
      title: reason === 'gap' ? 'A statement is missing' : 'Not enough bank history yet',
      infoLabel,
      infoContent,
      progress,
      actionLabel: 'Add',
      onAction: pickStatements,
    };
    return asProps ? props : emptyStateReact(el, props);
  }

  function renderNoBalance(asProps = false) {
    const props = {
      iconMarkup: typeof window !== 'undefined' ? iconCal() : null,
      iconNode: typeof window === 'undefined' ? icon(iconCal()) : null,
      title: 'Nothing to project yet',
      infoLabel: 'Closing balance needed',
      infoContent: 'Add a bank statement with a readable closing balance.',
      actionLabel: 'Add',
      onAction: pickStatements,
    };
    return asProps ? props : emptyStateReact(el, props);
  }

  function renderUpcoming(proj = null, asProps = false) {
    const rows = [];
    for (const d of (proj && proj.days) || []) for (const ev of d.events) rows.push({ ...ev, date: d.date });
    const commitmentIncome = provenModels.commitmentIncome();
    const beforeIncome = (commitmentIncome && commitmentIncome.commitments) || [];
    const scheduled = (state.paymentObligations || []).map((payment) => {
      const coverage = provenModels.paymentCoverageFor(payment);
      return {
        id: payment.id,
        label: payment.label,
        due: coverage?.occurrence?.date ? formatDisplayDate(coverage.occurrence.date) : 'No future date',
        status: `You set · ${coverage?.overdue ? 'past due · review payment' : paymentStatusText(coverage?.recordedStatus)}`,
        amount: bankMoney(payment.amount),
        onClick: () => openPaymentDetail(payment.id),
      };
    });
    const beforeIncomeTotal = beforeIncome.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const incomeDate = commitmentIncome && commitmentIncome.income && commitmentIncome.income.date;
    const beforeIncomeText = `Before your next pay${incomeDate ? ` on ${formatDisplayDate(incomeDate)}` : ''}: ${prose(beforeIncomeTotal)} across ${beforeIncome.length} payment${beforeIncome.length === 1 ? '' : 's'}.`;
    const beforeIncomeRows = beforeIncome.map((item) => {
      const source = item.basis === 'card' ? 'card' : item.basis === 'recurring' ? 'bank' : '';
      return {
        label: item.label || item.key || 'Payment',
        date: formatDisplayDate(item.date),
        status: paymentSourceLabel(item.paymentId),
        amount: bankMoney(item.amount),
        onClick: rowDrill({ source, key: item.basis === 'recurring' ? item.key : '', paymentId: item.paymentId, label: item.label || item.key || 'Payment' }),
      };
    });
    if (!rows.length) {
      const paymentProps = { beforeIncomeText, beforeIncomeTotal: prose(beforeIncomeTotal), beforeIncomeDate: incomeDate ? formatDisplayDate(incomeDate) : null, beforeIncome: beforeIncomeRows, scheduled, onAdd: () => openPaymentEditor(), days: [], hasTimeline: false };
      if (asProps) return { summary: beforeIncome.length ? `${beforeIncome.length} before next pay · ${prose(beforeIncomeTotal)}` : scheduled.length ? `${scheduled.length} person-set monthly payment${scheduled.length === 1 ? '' : 's'}` : 'Set known payment dates', iconMarkup: iconRepeat(), paymentProps };
      const reactActive = typeof window !== 'undefined';
      return collapsibleCardReact(el, {
        title: 'Expected payments',
        icon: reactActive ? null : icon(iconRepeat()),
        iconMarkup: reactActive ? iconRepeat() : null,
        summary: beforeIncome.length ? `${beforeIncome.length} before next pay · ${prose(beforeIncomeTotal)}` : scheduled.length ? `${scheduled.length} person-set monthly payment${scheduled.length === 1 ? '' : 's'}` : 'Set known payment dates',
        body: reactActive ? null : upcomingPaymentsReact(el, paymentProps),
        reactBody: reactActive ? { kind: 'upcomingPayments', props: paymentProps, rootClass: 'pfa-react-root' } : null,
        name: 'plan-expected-payments',
      });
    }
    const todayIso = proj.todayIso;
    const horizon = Math.max(1, proj.horizonDays || 21);
    const dayOffset = (iso) => {
      let n = 0;
      let cur = todayIso;
      while (cur < iso && n < horizon) {
        cur = addDaysIso(cur, 1);
        n++;
      }
      return n;
    };
    const awayText = (n) => {
      if (n <= 0) return 'today';
      if (n === 1) return 'tomorrow';
      if (n < 14) return `in ${n} days`;
      const weeks = Math.round(n / 7);
      return `in about ${weeks} week${weeks === 1 ? '' : 's'}`;
    };
    const byDate = new Map();
    for (const row of rows) {
      if (!byDate.has(row.date)) byDate.set(row.date, []);
      byDate.get(row.date).push(row);
    }
    const dates = [...byDate.keys()].sort();
    const maxAbs = rows.reduce((max, row) => Math.max(max, Math.abs(Number(row.amount) || 0)), 0) || 1;
    let prevOffset = 0;
    const days = dates.map((date, index) => {
      const group = byDate.get(date);
      const offset = dayOffset(date);
      const gapDays = Math.max(0, offset - prevOffset);
      prevOffset = offset;
      return {
        date,
        dateLabel: formatDisplayDate(date),
        awayText: awayText(offset),
        gapFlex: Math.max(1, gapDays),
        gapMinHeight: Math.min(40, gapDays * 5),
        events: group.map((row) => {
          const isIncome = row.type === 'income';
          const ratio = Math.abs(Number(row.amount) || 0) / maxAbs;
          return {
            label: row.label,
            status: paymentSourceLabel(row.paymentId),
            amount: (isIncome ? '+' : '-') + prose(Math.abs(row.amount)),
            amountClass: isIncome ? 'credit' : 'strong',
            width: Math.round(ratio * 1000) / 10,
            colour: isIncome ? 'var(--flow-in, var(--down))' : 'var(--flow-out, var(--up))',
            onClick: rowDrill(row),
          };
        }),
      };
    });
    const soonDays = 7;
    const soon = rows.filter((row) => {
      const offset = dayOffset(row.date);
      return offset != null && offset >= 0 && offset <= soonDays && Number(row.amount) < 0;
    });
    const nextOut = rows.find((row) => Number(row.amount) < 0);
    const nextOutSummary = nextOut ? `${prose(Math.abs(Number(nextOut.amount)))} on ${formatDisplayDate(nextOut.date)}` : '';
    const forecastOutflows = rows.filter((row) => Number(row.amount) < 0);
    const forecastTotal = forecastOutflows.reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
    const timelineLabel = `Cash flow forecast · next ${horizon} days`;
    const timelineText = `${forecastOutflows.length} projected outflow${forecastOutflows.length === 1 ? '' : 's'} totaling ${prose(forecastTotal)} through ${formatDisplayDate(dates.at(-1))}.`;
    const timelineInfo = `This forecast covers the next ${horizon} days and includes repeated spending and saved payments. Its window is separate from the payments list above, which ends at your next pay date. Bar length compares relative amount; dates show timing.`;
    const paymentProps = { beforeIncomeText, beforeIncomeTotal: prose(beforeIncomeTotal), beforeIncomeDate: incomeDate ? formatDisplayDate(incomeDate) : null, beforeIncome: beforeIncomeRows, scheduled, onAdd: () => openPaymentEditor(), days, hasTimeline: true, timelineLabel, timelineText, timelineInfo };
    if (asProps) return {
      summary: beforeIncome.length
        ? `${beforeIncome.length} before next pay · ${prose(beforeIncomeTotal)}`
        : soon.length
          ? `${soon.length} due within ${soonDays} days${nextOutSummary ? ` · next ${nextOutSummary}` : ''}`
          : nextOut ? `Next: ${nextOutSummary}` : `${rows.length} expected`,
      iconMarkup: iconRepeat(),
      paymentProps,
    };
    const reactActive = typeof window !== 'undefined';
    return collapsibleCardReact(el, {
      title: 'Expected payments',
      icon: reactActive ? null : icon(iconRepeat()),
      iconMarkup: reactActive ? iconRepeat() : null,
      summary: beforeIncome.length
        ? `${beforeIncome.length} before next pay · ${prose(beforeIncomeTotal)}`
        : soon.length
        ? `${soon.length} due within ${soonDays} days${nextOutSummary ? ` · next ${nextOutSummary}` : ''}`
        : nextOut
          ? `Next: ${nextOutSummary}`
          : `${rows.length} expected`,
      body: reactActive ? null : upcomingPaymentsReact(el, paymentProps),
      reactBody: reactActive ? { kind: 'upcomingPayments', props: paymentProps, rootClass: 'pfa-react-root' } : null,
      name: 'plan-expected-payments',
    });
  }

  function scheduledTimelineCommitments(horizonDays) {
    const today = isoToday();
    const governed = new Set((state.paymentObligations || []).map((item) => item.payeeKey).filter(Boolean));
    const inferred = commitmentsModel().combined.items.filter((item) => !governed.has(item.key));
    const scheduled = paymentEvents(state.paymentObligations || [], classifiedBank(), today, addDaysIso(today, horizonDays))
      .map((item) => ({ key: item.key, paymentId: item.paymentId, label: item.label, typical: item.amount, date: item.date, source: 'bank' }));
    return [...inferred, ...scheduled];
  }

  // TEMPORAL CONTRACT: the income HISTORY card (the past months' bars) moved to
  // Activity (backward content belongs in the looking-back destination). Forecast
  // keeps only the FORWARD half of income - the projected next deposit and its
  // effect on the cash runway - which is already baked into projectCashFlow (the
  // forecast chart) and the statement nudge below, so no income card is needed
  // here. Same analyseIncomePattern data, split by temporal stance.

  /* What to call the account on the SURFACE. A person thinks "my USD savings",
   * never "the file called USD Digital - Jul 2026.pdf", so the filename is not
   * a candidate here at all - it lives behind the ⓘ with the rest of the
   * provenance. The rename feature is the one source of friendly names
   * (accountName, shared-helpers); with no name set this falls back to a plain
   * descriptor built from what the app actually knows about the account - its
   * currency, when that distinguishes it from the rest, and otherwise just what
   * kind of thing it is. Never the account tail: that is provenance, it is
   * suppressed in private view, and it cannot carry a sentence. */
  function nudgeSubject(nudge) {
    if (Number(nudge.accountCount) > 1)
      return nudge.ledger === 'card' ? 'one of your credit cards' : 'one of your bank accounts';
    const friendly =
      nudge.ledger === 'card' ? null : accountName(state.accountNames, 'bank', nudge.account);
    if (friendly) {
      /* A name the person typed may already read as possessive or already carry
         its own determiner - "my USD savings", "Chev's savings". Only a bare
         name gets "your" put in front of it. */
      const owned = /^(my|your|our|the|a|an)\s/i.test(friendly) || /(’|')s\b/i.test(friendly);
      return owned ? friendly : `your ${friendly}`;
    }
    if (nudge.ledger === 'card') return 'your credit card';
    const base = ((state.cfg && state.cfg.currency) || {}).code || 'JMD';
    const ccy = bankAccountCurrency(nudge.account);
    /* KNOWN LIMIT, deliberately left: two unnamed accounts in the base currency
       read the same here ("your bank account"), and are told apart only by
       their durations and by opening the (i). The fix is a name, which the
       person already has one click away in Position - not an account tail on
       the surface, which is provenance and disappears in private view. Do not
       "fix" this by putting the digits back in the sentence. */
    return ccy && ccy !== base ? `your ${ccy} account` : 'your bank account';
  }

  /* The account's currency, read from the transactions already loaded. Used
     only to tell one unnamed account from another, so the first row that
     answers is enough. */
  function bankAccountCurrency(account) {
    const want = String(account == null ? '' : account);
    for (const row of state.bankRecords || []) {
      if (String(row.account) === want && row.currency) return String(row.currency);
    }
    return null;
  }

  function nudgeProvenance(nudge, asText = false) {
    const kind = nudge.ledger === 'card' ? 'credit card statement' : 'account statement';
    const digits = String(nudge.account || '').replace(/\D/g, '');
    const tail = digits ? ` for account …${digits.slice(-4)}` : '';
    const file = nudge.sourceFile ? `“${nudge.sourceFile}”` : 'the last file added';
    const lines = [
      `Latest ${kind}${tail}: ${file}, covering through ${formatDisplayDate(nudge.latestEndDate)} - ${nudge.daysSinceLast} days ago.`,
      `This account's own statements have arrived about every ${nudge.cadenceDays} days - measured from its history, not assumed - so the next one is ${nudge.status === 'overdue' ? 'past due' : nudge.status === 'due' ? 'due about now' : 'not due yet'}.`,
    ];
    return asText ? lines : [
      el('div', {}, lines[0]),
      el('div', { class: 'nudge-working' }, lines[1]),
    ];
  }

  function renderStatementNudges(nudges, asProps = false) {
    const tracked = (nudges || []).filter(Boolean);
    if (!tracked.length) return null;
    const list = tracked.filter((n) => n.status !== 'ontrack');
    const current = !list.length;
    const single = list.length === 1 ? list[0] : null;
    const kind = single
      ? single.ledger === 'card'
        ? 'credit card statement'
        : 'account statement'
      : 'statements';
    const reactActive = typeof window !== 'undefined';
    let sec = null;
    if (!reactActive) {
      sec = el('div', {});
      if (!current) {
        sec.append(
          el(
            'div',
            { class: 'attn-actions' },
            el('button', { class: 'btn sm', onclick: pickStatements }, 'Add')
          )
        );
      }
    }
    const items = (current ? tracked : list).map((nudge) => ({
      tone: nudge.status === 'overdue' ? 'warn' : current ? 'neutral' : 'review',
      title: current
        ? `${capitaliseFirst(nudgeSubject(nudge))} is up to date.`
        : `${capitaliseFirst(nudgeSubject(nudge))} hasn't been updated in ${roundedDurationPhrase(nudge.daysSinceLast)}.`,
      ...(reactActive
        ? { provenance: nudgeProvenance(nudge, true) }
        : { infoNode: chartInfo(el, null, nudgeProvenance(nudge)) }),
    }));
    const overdue = list.filter((n) => n.status === 'overdue').length;
    if (asProps) return {
      title: current ? 'Your statements' : `Add your next ${kind}`,
      summary: current ? 'All up to date' : overdue ? 'Past expected date' : 'Expected about now',
      iconMarkup: iconReceipt(),
      items,
      current,
      onAdd: pickStatements,
    };
    const card = reactActive ? statementNudgeCardReact(el, {
      title: current ? 'Your statements' : `Add your next ${kind}`,
      summary: current ? 'All up to date' : overdue ? 'Past expected date' : 'Expected about now',
      iconNode: null,
      iconMarkup: iconReceipt(),
      items,
      current,
      onAdd: pickStatements,
    }) : collapsibleCardReact(el, {
      title: current ? 'Your statements' : `Add your next ${kind}`,
      icon: icon(iconReceipt()),
      summary: current
        ? 'All up to date'
        : overdue
          ? 'Past expected date'
          : 'Expected about now',
      body: statementNudgesReact(el, { items, current, actionNode: sec, onAdd: reactActive ? pickStatements : null }),
      name: 'plan-statement-nudge',
    });
    if (card) card.classList.add('attention', 'statement-nudge');
    return card;
  }

  function goalFormProps(currentGoal = null, mode = 'create') {
    const savedType = currentGoal?.type === 'cushion' ? 'runway' : currentGoal?.type;
    const savedValues = currentGoal ? {
      months: currentGoal.targetMonths,
      date: currentGoal.targetDate,
      amount: currentGoal.amount,
    } : {};
    const options = GOAL_TYPES.map((type) => {
      const savedValue = type.id === savedType ? savedValues[type.unit] : null;
      return {
        id: type.id,
        unit: type.unit,
        title: GOAL_META[type.id]?.title || type.label,
        description: GOAL_META[type.id]?.description || '',
        defaultValue: savedValue ?? (type.unit === 'months' ? DEFAULT_CUSHION_MONTHS : ''),
      };
    });
    const onSelect = (id) => {
      _goalDraftType = id;
      _goalTypePickerOpen = false;
      render();
    };
    const onSubmit = (id, rawValue) => {
      const type = GOAL_TYPES.find((item) => item.id === id);
      const raw = String(rawValue || '').trim();
      if (!raw) {
        toast('Enter a value first.');
        return;
      }
      const params = {};
      if (type.unit === 'date') params.targetDate = raw;
      else {
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) {
          toast('Enter a value greater than zero.');
          document.getElementById('goal-draft-input')?.focus();
          return;
        }
        if (type.unit === 'months') params.targetMonths = Math.min(24, Math.round(value));
        else params.ceiling = Math.round(value * 100) / 100;
      }
      trackUsage('ahead-set-goal');
      _goalDraftType = null;
      _goalManageOpen = false;
      _goalTypePickerOpen = false;
      _goalManageReturnFocus = true;
      setGoal(type.id, params);
    };
    const onCancel = () => {
      const returnToChoices = mode === 'create' && !!_goalDraftType;
      _goalDraftType = null;
      _goalManageOpen = false;
      _goalTypePickerOpen = false;
      _goalFocusChoices = returnToChoices;
      _goalManageReturnFocus = mode === 'manage';
      render();
    };
    const onChangeType = () => {
      _goalDraftType = null;
      _goalTypePickerOpen = true;
      _goalFocusChoices = true;
      render();
    };
    const onBackToCurrent = () => {
      _goalDraftType = savedType;
      _goalTypePickerOpen = false;
      render();
    };
    const onClear = () => currentGoal && goalClearAction();
    const focusChoices = _goalFocusChoices;
    if (focusChoices) _goalFocusChoices = false;
    return {
      options,
      draftType: _goalDraftType,
      mode,
      showChoices: mode === 'create' ? !_goalDraftType : _goalTypePickerOpen,
      focusChoices,
      onSelect,
      onSubmit,
      onCancel,
      onChangeType,
      onBackToCurrent,
      onClear,
    };
  }

  function goalClearAction() {
    trackUsage('ahead-clear-goal');
    _goalDraftType = null;
    _goalManageOpen = false;
    _goalTypePickerOpen = false;
    _goalFocusChoices = true;
    clearGoal().then((snapshot) => {
      toast('Goal cleared.', () => {
        trackUsage('ahead-restore-goal');
        _goalManageReturnFocus = true;
        restoreGoal(snapshot);
      });
    });
  }

  function renderGoalCard(asProps = false) {
    const reactActive = typeof window !== 'undefined';
    if (!state.goal) {
      const goalProps = {
        emptyIntro: 'Choose what you want to work toward.',
        goalFormProps: goalFormProps(),
      };
      if (asProps) return { summary: 'None set yet', iconMarkup: iconFlag(), goalProps, alwaysOpen: !!_goalDraftType || _goalTypePickerOpen };
      return collapsibleCardReact(el, {
        title: 'Your goal',
        icon: reactActive ? null : icon(iconFlag()),
        iconMarkup: reactActive ? iconFlag() : null,
        summary: 'None set yet',
        body: reactActive ? null : goalProgressReact(el, goalProps),
        reactBody: reactActive ? { kind: 'goalProgress', props: goalProps, rootClass: 'pfa-react-root' } : null,
        alwaysOpen: !!_goalDraftType || _goalTypePickerOpen,
      });
    }

    const migrated = ensureMigrated(state.goal);
    const goalContent = renderGoalCardNewEngine(migrated, reactActive);

    const standing = goalCardStanding(migrated);
    if (asProps) return { summary: standing.summary, iconMarkup: iconFlag(), goalProps: goalContent, initialOpen: !!_goalDraftType || _goalManageOpen || _goalTypePickerOpen || _boundaryDraftKind !== null };
    return collapsibleCardReact(el, {
      title: 'Your goal',
      icon: reactActive ? null : icon(iconFlag()),
      iconMarkup: reactActive ? iconFlag() : null,
      summary: standing.summary,
      body: reactActive ? null : goalContent,
      reactBody: reactActive ? { kind: 'goalProgress', props: goalContent, rootClass: 'pfa-react-root' } : null,
      defaultOpen: !!_goalDraftType || _goalManageOpen || _goalTypePickerOpen || _boundaryDraftKind !== null,
    });
  }

  /* One line describing where the goal stands, and whether that needs a
   * decision now. Reads the same engine the card body renders from. */
  function goalCardStanding(migrated) {
    try {
      const ctx = buildNewEngineProgressCtx(migrated, {
        month: latestCompleteGoalMonth(),
        enteredCash: provenModels.enteredCash(),
      });
      if (!ctx) return { offTrack: false, summary: 'Not enough data yet' };
      const progress = goalProgress(migrated, ctx);
      const model = buildGoalModel(migrated, progress, null, state.cfg);
      const type = migrated.type === 'cushion' ? 'runway' : migrated.type;
      const title = GOAL_META[type]?.title || 'Your goal';
      const money = makeMoneyCompact(state.cfg);
      let nextStep = model.tag;
      if (migrated.type === 'cushion') {
        nextStep = !progress.readable
          ? 'Not enough data yet'
          : progress.met
            ? 'Target met'
            : `${money(progress.shortfall)} still needed`;
      } else if (migrated.type === 'spend-ceiling') {
        nextStep = `${money(Math.abs(progress.remaining))} ${progress.remaining >= 0 ? 'left' : 'over'}`;
      }
      return {
        offTrack: goalOffTrack(progress, model),
        summary: `${title} · ${nextStep}`,
      };
    } catch {
      return { offTrack: false, summary: '' };
    }
  }

  function renderGoalCardNewEngine(migrated, asProps = false) {
    const cardMoney = makeMoneyCompact(state.cfg);
    const bankRows = classifiedBank();
    const month = latestCompleteGoalMonth();
    const progressCtx = buildNewEngineProgressCtx(migrated, { month, enteredCash: provenModels.enteredCash() });
    const goalType = migrated.type === 'cushion' ? 'runway' : migrated.type;
    const goalTitle = GOAL_META[goalType]?.title || 'Your goal';
    const manageReturnFocus = _goalManageReturnFocus;
    _goalManageReturnFocus = false;
    const goalProps = {
      goalFormProps: _goalManageOpen ? goalFormProps(migrated, 'manage') : null,
      manageReturnFocus,
      onManageGoal: () => {
        _goalManageOpen = true;
        _goalDraftType = migrated.type === 'cushion' ? 'runway' : migrated.type;
        _goalTypePickerOpen = false;
        render();
      },
    };
    if (!progressCtx) {
      const fallbackProps = {
        ...goalProps,
        manageReturnFocus,
        fallback: describeGoal(migrated, bankMoney, formatDisplayDate),
        goalPresentation: { type: migrated.type, title: goalTitle, status: 'Not enough data yet', tone: 'neutral' },
        boundaryDraftKind: null,
      };
      return asProps ? fallbackProps : goalProgressReact(el, fallbackProps);
    }

    const commitmentsMonthly = commitmentsModel().combined.total;
    const progress = goalProgress(migrated, progressCtx);
    const model = buildGoalModel(migrated, progress, null, state.cfg, { compact: true });
    const goalPresentation = {
      type: migrated.type,
      title: goalTitle,
      status: model.tag,
      tone: goalOffTrack(progress, model) ? 'watch' : model.tone === 'good' ? 'good' : 'neutral',
      value: '',
      valueLabel: '',
      context: '',
      meter: null,
    };
    if (migrated.type === 'cushion') {
      if (progress.readable) {
        goalPresentation.value = bankMoney(progress.met ? progress.current : progress.shortfall);
        goalPresentation.valueLabel = progress.met ? 'Saved toward your goal' : 'Still needed';
        goalPresentation.context = `${cardMoney(progress.current)} saved of ${cardMoney(progress.targetAmount)} · ${monthsLabel(progress.targetMonths)} of expenses`;
        goalPresentation.meter = {
          actual: Math.min(progress.current, progress.targetAmount),
          target: progress.targetAmount,
          scaleMax: progress.targetAmount,
          tone: 'setAside',
          label: `${cardMoney(progress.current)} saved of ${cardMoney(progress.targetAmount)} target`,
        };
      } else {
        goalPresentation.valueLabel = 'Goal progress';
        goalPresentation.context = model.detail;
      }
    } else if (migrated.type === 'clear-card') {
      goalPresentation.value = bankMoney(progress.current);
      goalPresentation.valueLabel = progress.met ? 'Balance remaining' : 'Balance to clear';
      goalPresentation.context = progress.met
        ? `The card is clear · target ${formatDisplayDate(progress.targetDate)}`
        : progress.deadlinePassed
          ? `The target date ${formatDisplayDate(progress.targetDate)} has passed.`
          : progress.monthlyNeeded != null
            ? `About ${cardMoney(progress.monthlyNeeded)} a month · by ${formatDisplayDate(progress.targetDate)}`
            : model.detail;
    } else if (migrated.type === 'spend-ceiling') {
      goalPresentation.value = bankMoney(progress.spent);
      goalPresentation.valueLabel = `Spent ${progress.month ? monthLabel(progress.month) : 'this period'}`;
      goalPresentation.context = `${cardMoney(progress.ceiling)} limit · ${cardMoney(Math.abs(progress.remaining))} ${progress.remaining >= 0 ? 'left' : 'over'}`;
      goalPresentation.meter = {
        actual: progress.spent,
        target: progress.ceiling,
        scaleMax: Math.max(progress.spent, progress.ceiling),
        tone: 'free',
        label: `${cardMoney(progress.spent)} spent against ${cardMoney(progress.ceiling)} limit`,
      };
    }
    const boundaryConfig = state._goalBoundary || null;
    const boundary = resolveSafetyBoundary(boundaryConfig, {
      typicalDailyOutflow: progressCtx.typicalDailyOutflow,
      commitmentsMonthly,
    });
    const proposedMonthly = migrated.type === 'clear-card' && progress.monthlyNeeded > 0 ? progress.monthlyNeeded : 0;
    const guard = safeContribution({
      bankRecords: bankRows,
      cardStatements: state._cardStatements || [],
      cfg: state.cfg,
      asOf: progressCtx.asOf,
      proposedMonthly,
      boundary,
      goal: migrated,
      horizonDays: 90,
    });
    const guardDetail = guard.projectedLow != null
      ? `Projected low over the next 90 days: ${bankMoney(guard.projectedLow)}${guard.projectedLowDate ? ` around ${formatDisplayDate(guard.projectedLowDate)}` : ''}.`
      : guard.note || '';
    const caveat = progress.coverage && progress.coverage.caveat;
    const caveatNode = typeof window === 'undefined' && caveat ? chartInfo(el, null, caveat) : null;
    let rebasedMessage = null;
    if (progress.rebasedFromIncome) {
      rebasedMessage = `You set this target against your pay. It is now measured against what you actually spend, which is what an emergency fund has to cover, so the amount differs from the one you first saw. The ${monthsLabel(progress.targetMonths)} you chose is unchanged.`;
    }
    const cashMessage = progressCtx.cashAsOf
      ? `Progress uses the balances you entered on ${formatDisplayDate(progressCtx.cashAsOf)}. The target still comes from your statements.`
      : null;
    const floorApplies = migrated.type === 'cushion' || migrated.type === 'clear-card';
    const boundaryReturnFocus = _boundaryReturnFocus;
    _boundaryReturnFocus = false;
    const resultProps = {
      ...goalProps,
      manageReturnFocus,
      fallback: null,
      goalPresentation,
      caveat: typeof window === 'undefined' ? null : caveat,
      caveatNode,
      savedNote: migrated.type === 'cushion' && progress.readable ? savedFigureNote({ cardOwed: progressCtx.cardBalance || 0, excludedForeign: 0 }, cardMoney) : '',
      rebasedMessage,
      cashMessage,
      planLink: goalAgainstPlan(migrated, progress, cardMoney),
      planNoteClass: 'plan-note muted small',
      guardDetail,
      boundaryStatus: renderBoundaryStatus(boundaryConfig),
      boundaryDraftKind: _boundaryDraftKind,
      boundaryDraftValue: boundaryConfig && boundaryConfig.kind === _boundaryDraftKind
        ? (boundaryConfig.kind === 'chosen' ? boundaryConfig.value : boundaryConfig.cushionDays)
        : '',
      boundaryReturnFocus,
      changeBoundaryLabel: floorApplies ? (boundaryConfig && boundaryConfig.kind !== 'none' ? 'Change safety floor' : 'Set a safety floor') : null,
      onStartBoundary: () => {
        _boundaryDraftKind = boundaryConfig ? boundaryConfig.kind : 'chosen';
        render();
      },
      onBoundaryKindChange: (kind) => {
        _boundaryDraftKind = kind;
        render();
      },
      onBoundaryCancel: () => {
        _boundaryDraftKind = null;
        _boundaryReturnFocus = true;
        render();
      },
      onBoundarySave: (value) => {
        _boundaryDraftKind = null;
        _boundaryReturnFocus = true;
        trackUsage('ahead-set-boundary');
        saveBoundary(value);
      },
      onBoundaryClear: () => {
        _boundaryDraftKind = null;
        _boundaryReturnFocus = true;
        trackUsage('ahead-clear-boundary');
        saveBoundary(null);
      },
      onBoundaryInvalid: () => toast('Enter a value first.'),
    };
    return asProps ? resultProps : goalProgressReact(el, resultProps);
  }

  // The goal and the set-aside band are the same fact seen twice: a savings
  // goal is the REASON that band is the size it is. When a target has been
  // saved, this states the connection in one plain sentence rather than
  // leaving the two cards to be read as unrelated. Silent when no target is
  // saved, so it never invents a rate the person did not choose.
  function goalAgainstPlan(goal, progress, money = bankMoney) {
    // The plan stores a SHARE of take-home, not an amount, so the monthly rate
    // is resolved against the same typical-month take-home the Plan tab reads.
    // Reading the stored number as money would state a rate of "20 a month".
    const built = planModel ? planModel() : null;
    const target = built && built.raw ? built.raw : null;
    if (!target || target.targetsAreDefault || !goal || !progress) return '';
    const rate = Number(target.targetAmount.setAside) || 0;
    if (!(rate > 0)) return '';
    const rateText = money(rate);
    if (goal.type === 'cushion' && progress.shortfall != null) {
      if (!(progress.shortfall > 0)) {
        return `Your plan sets aside ${rateText} a month.`;
      }
      // Spelled the same way the goal card and the check-in history spell it -
      // the same progress must never be described two different ways depending
      // on which line of the same screen you read.
      const months = Math.ceil(progress.shortfall / rate);
      return `Your plan sets aside ${rateText} a month. At that rate the remaining ${money(progress.shortfall)} is covered in about ${monthsLabel(months)}.`;
    }
    if (goal.type === 'clear-card' && progress.monthlyNeeded != null) {
      const needed = Number(progress.monthlyNeeded);
      if (rate >= needed) {
        return `Your plan sets aside ${rateText} a month, which covers the ${money(needed)} a month this needs.`;
      }
      return `Your plan sets aside ${rateText} a month; this needs ${money(needed)}, so it is ${money(needed - rate)} a month short.`;
    }
    // No catch-all. This sentence used to be appended to EVERY goal type, so a
    // spending-limit goal ended up reading "...of your limit this period, X
    // over. Your plan sets aside Y a month." - two goals' vocabularies in one
    // card, under a single heading, looking like one broken sentence. The plan
    // link is only meaningful where the plan's set-aside rate actually bears on
    // the goal, which is the two branches above.
    return '';
  }

  /* ===========================================================================
   * Step 2 continued: the safety-boundary authoring form. THREE explicit
   * states only, matching goals.js's frozen contract exactly - 'chosen' (a
   * number the person sets), 'calculated' (commitments + N cushion days), or
   * 'none' (cleared/default). Never invents a boundary; a suggestion from
   * resolveSafetyBoundary is informational only until saved here by hand.
   * ======================================================================== */
  function renderBoundaryStatus(boundaryConfig) {
    if (!boundaryConfig || boundaryConfig.kind === 'none') {
      return 'No safety floor is set yet. Set one so a contribution can be checked against it.';
    }
    if (boundaryConfig.kind === 'chosen') {
      return `Safety floor: keep at least ${bankMoney(boundaryConfig.value)}.`;
    }
    if (boundaryConfig.kind === 'calculated') {
      return `Safety floor: your fixed expenses plus ${boundaryConfig.cushionDays} day${boundaryConfig.cushionDays === 1 ? '' : 's'} of typical spending.`;
    }
    return null;
  }


  async function saveBoundary(boundaryConfig) {
    await Store.setMeta('financeGoalBoundary', boundaryConfig);
    state._goalBoundary = boundaryConfig;
    render();
  }

  // The monthly, honest follow-up: the frozen record app.js's
  // checkMonthlyGoalIfDue already builds once per genuinely new complete
  // month, simply displayed here, most recent first. Shown only once at
  // least one month has been checked, regardless of whether a goal is
  // currently active (a cleared goal's own history stays visible - see
  // clearGoal's own comment on why goalLog is never erased).
  function renderMonthlyFollowUp(asProps = false) {
    const log = state.goalLog || [];
    if (!log.length) return null;
    const shown = log.slice().reverse().slice(0, 12);
    const compact = makeMoneyCompact(state.cfg);
    const monthProps = {
      entries: shown.map((entry) => {
        const amounts = entry.type === 'cushion' ? [...String(entry.headline || '').matchAll(/\$([\d,]+(?:\.\d{2})?)/g)].map((match) => Number(match[1].replaceAll(',', ''))) : [];
        const current = amounts[0];
        const target = amounts[1];
        return {
          month: entry.month,
          label: monthShort(entry.month),
          tone: entry.met === false ? 'warn' : 'neutral',
          headline: entry.headline,
          status: entry.met === true ? 'Target met' : entry.met === false ? 'Target not met' : 'Not enough data',
          progress: Number.isFinite(current) && Number.isFinite(target) && target > 0 ? { current: compact(current), target: compact(target), currentAmount: current, targetAmount: target, share: Math.round(current / target * 100), remaining: entry.met === false && Number.isFinite(amounts[2]) ? compact(amounts[2]) : null } : null,
        };
      }),
    };
    if (asProps) return { summary: `${shown.length} month${shown.length === 1 ? '' : 's'} recorded`, iconMarkup: iconCal(), monthProps };
    const reactActive = typeof window !== 'undefined';
    const body = reactActive ? null : monthlyCheckInReact(el, monthProps);
    return collapsibleCardReact(el, {
      title: 'Monthly check-in',
      icon: reactActive ? null : icon(iconCal()),
      iconMarkup: reactActive ? iconCal() : null,
      summary: `${shown.length} month${shown.length === 1 ? '' : 's'} recorded`,
      body,
      reactBody: reactActive ? { kind: 'monthlyCheckIn', props: monthProps, rootClass: 'pfa-react-root' } : null,
      name: 'plan-monthly-check-in',
    });
  }

  /* ===========================================================================
   * The scenario tool: toggle a category or place off to test "what if I
   * stopped spending here"; add a hypothetical cost to test "what if this
   * came up". Both recompute the SAME runway figure Overview's own narrative
   * already uses (computeScenario, reporting.js), so the result here is
   * never a different idea of "how long the cushion lasts" from the rest of
   * the app. Toggleable items are the SAME categories and places already
   * shown on Right Now this period, so nothing new is introduced to scan.
   * ======================================================================== */
  function renderScenarioCard(asProps = false) {
    const bankRows = classifiedBank();
    const cashPosition = analyseBankActivity(bankRows).closingBalance;
    if (cashPosition == null) return null;
    const { rollAllTrend } = overviewModel();
    const monthlyBasis = typicalMonthlyOutflowBasis(rollAllTrend, ymToday());
    const monthlyOutflow = monthlyBasis.amount;
    const items = scenarioMonthlyItems({ cardRows: state.rows, bankRows, splits: state.transactionSplits, cfg: state.cfg, cardAccounts: state.cardAccounts, designatedSetAside: savingAccountKeys(), groupAssignments: state._planGroups, monthlyBasis, fixedKeys: commitmentsModel().combined.items.filter((item) => item.source !== 'card').map((item) => item.key) });
    _scenarioReductions = new Map([..._scenarioReductions].filter(([key]) => items.some((item) => item.key === key)));
    const income = analyseIncomePattern(bankRows, state.cfg, new Date());
    const monthlyIncome = income && income.typicalAmount ? Number(income.typicalAmount) : 0;
    const calculate = (reductions, extraCost) => computeScenario({
      cashPosition,
      monthlyOutflow,
      historyKnown: monthlyBasis.months.length > 0,
      toggleableItems: items,
      reductions,
      extraCost,
    });
    const scenarioProps = {
      items,
      reductions: _scenarioReductions,
      extraCost: _scenarioExtraCost,
      explain: 'Monthly amounts are estimates from recent complete statement months. Cuts change recurring discretionary spending; a one-off cost is tested separately. Runway assumes nothing new comes in.',
      basis: monthlyBasis.months.length ? `Based on your last ${monthlyBasis.months.length} complete month${monthlyBasis.months.length === 1 ? '' : 's'} of spending. The range chosen on Activity does not change this.` : '',
      monthlyIncome,
      monthlyOutflow,
      money: bankMoney,
      calculate,
      isInvalidCost: (value) => !Number.isFinite(value) || value < 0,
      runwaySummary: (result) => {
        if (result.scenarioRunwayDays === result.baselineRunwayDays) return `If nothing new came in, your cash would last about ${result.scenarioRunwayDays} days.`;
        const direction = result.scenarioRunwayDays > result.baselineRunwayDays ? 'up' : 'down';
        return `If nothing new came in, your cash would last about ${result.scenarioRunwayDays} days - ${direction} from about ${result.baselineRunwayDays} today.`;
      },
      onReduction: (reductions) => {
        _scenarioReductions = new Map(reductions);
        trackUsage('ahead-scenario-adjust');
      },
      onApplyCost: (amount) => {
        _scenarioExtraCost = amount;
      },
      onInvalid: () => toast('Enter a cost of zero or more.'),
    };
    if (asProps) return { summary: 'See how long your cash could last', iconMarkup: iconChart(), scenarioProps };
    const reactActive = typeof window !== 'undefined';
    const content = reactActive ? null : scenarioCardReact(el, scenarioProps);
    return collapsibleCardReact(el, {
      title: 'Try a change',
      icon: reactActive ? null : icon(iconChart()),
      iconMarkup: reactActive ? iconChart() : null,
      summary: 'See how long your cash could last',
      body: content,
      reactBody: reactActive ? { kind: 'scenarioCard', props: scenarioProps, rootClass: 'pfa-react-root' } : null,
    });
  }

  function renderAhead() {
    const settings = typeof window !== 'undefined' ? ctx.settingsProps?.() : null;
    const reactActive = typeof window !== 'undefined' && !!settings;
    const cfg = Object.assign({ minMonthsForForecast: 2, horizonDays: 21 }, state.cfg.ahead || {});
    const months = bankMonthsList();
    if (reactActive) {
      const hero = renderPlanHero(true);
      const lever = renderPlanLever(true);
      const nudges = staleStatementNudges(
        state._cardStatements || [],
        state._bankStatements || [],
        { toleranceDays: cfg.statementToleranceDays, includeOnTrack: true },
        new Date()
      );
      const statement = renderStatementNudges(nudges, true);
      const readiness = projectionReadiness({ bankMonths: months, minMonths: cfg.minMonthsForForecast, coverage: state.coverage });
      let empty = null;
      let upcoming = null;
      const scenario = renderScenarioCard(true);
      let pairUpcoming = false;
      if (!readiness.ready) {
        empty = renderNotReady(readiness, true);
        upcoming = renderUpcoming(null, true);
      } else {
        const cb = classifiedBank();
        const cashPosition = analyseBankActivity(cb).closingBalance;
        if (cashPosition == null) {
          empty = renderNoBalance(true);
          upcoming = renderUpcoming(null, true);
        } else {
          const income = analyseIncomePattern(cb, state.cfg, new Date());
          const proj = projectCashFlow({ cashPosition, commitments: scheduledTimelineCommitments(cfg.horizonDays), income, horizonDays: cfg.horizonDays, now: new Date() });
          upcoming = renderUpcoming(proj, true);
          pairUpcoming = true;
        }
      }
      return planViewReact(el, {
        hero,
        historyBasisText: hero ? balanceUpdates.historyBasisText() : null,
        lever,
        statement,
        empty,
        goal: renderGoalCard(true),
        monthly: renderMonthlyFollowUp(true),
        upcoming,
        scenario,
        pairUpcoming,
        settings,
      });
    }
    const wrap = el('div', { class: 'accounts-wrap accounts-grid view-forecast' });
    let goalPlaced = false;
    const scenario = renderScenarioCard();
    const nudges = staleStatementNudges(
      state._cardStatements || [],
      state._bankStatements || [],
      { toleranceDays: cfg.statementToleranceDays, includeOnTrack: true },
      new Date()
    );
    const nudgeCard = renderStatementNudges(nudges);
    const planHero = renderPlanHero();
    const planLever = planHero ? renderPlanLever() : null;
    let followUp = renderMonthlyFollowUp();
    const expectedWithoutForecast = renderUpcoming();
    if (planHero) {
      const basis = balanceUpdates.historyBasisNote();
      if (basis) planHero.append(basis);
      wrap.append(planHero);
    }
    if (nudgeCard) wrap.append(nudgeCard);
    if (planLever) wrap.append(planLever);
    const readiness = projectionReadiness({
      bankMonths: months,
      minMonths: cfg.minMonthsForForecast,
      coverage: state.coverage,
    });
    if (!readiness.ready) {
      wrap.append(renderNotReady(readiness));
      if (expectedWithoutForecast) wrap.append(expectedWithoutForecast);
      if (scenario) wrap.append(scenario);
    } else {
      const cb = classifiedBank();
      const cashPosition = analyseBankActivity(cb).closingBalance;
      if (cashPosition == null) {
        wrap.append(renderNoBalance());
        if (expectedWithoutForecast) wrap.append(expectedWithoutForecast);
        if (scenario) wrap.append(scenario);
      } else {
        const income = analyseIncomePattern(cb, state.cfg, new Date());
        const proj = projectCashFlow({
          cashPosition,
          commitments: scheduledTimelineCommitments(cfg.horizonDays),
          income,
          horizonDays: cfg.horizonDays,
          now: new Date(),
        });
        const goalCardTop = renderGoalCard();
        pairCards(wrap, goalCardTop, followUp);
        followUp = null;
        goalPlaced = true;
        const upcoming = renderUpcoming(proj);
        pairCards(wrap, upcoming, scenario);
      }
    }

    if (!goalPlaced) {
      const goalCard = renderGoalCard();
      pairCards(wrap, goalCard, followUp);
      followUp = null;
    }
    if (followUp) wrap.append(followUp);
    placeFoldAll(el, wrap);
    return wrap;
  }

  function draftSignature() {
    const reductionSig = [..._scenarioReductions.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${_goalDraftType || ''}|${_goalManageOpen ? 'manage' : ''}|${_goalTypePickerOpen ? 'types' : ''}|${_boundaryDraftKind || ''}|${reductionSig}|${_scenarioExtraCost || 0}`;
  }

  return { renderAhead, draftSignature };
}
