/*
 * overview-render.js  -  Overview: where things stand today.
 *
 * The plan's Overview, no narration. The lead is "Available now" (three honest
 * layers, available-now-preview.js), followed by the money-in vs money-out
 * flow chart (its own card), the period-coverage note, and the two onward
 * doorways (Right Now, Ahead). Every figure it shows lives elsewhere in full -
 * this screen answers one question (where things stand) and does not restate
 * a number a person can see on its home screen.
 *
 * The twelve-beat narrative (buildOverviewNarrative) that this file once
 * rendered is retired: its figures each live on their own screens (net
 * position on Position, runway on Ahead, income anomaly on the income card,
 * category spikes on Right Now's "Worth a look"), so narrating them here was
 * duplication the plan explicitly forbids.
 */
import {
  isUnrecognised,
} from '../analysis/reporting-core.js';
import {
  ATTENTION_LIMIT,
  periodCoverageParts,
  buildAttentionItems,
  staleStatementNudges,
} from '../analysis/reporting-periods.js';
import {
  detectPossibleDuplicates,
  detectCategorySpikes,
} from '../analysis/reporting-insights.js';
import {
  requireCtx,
  formatDisplayDate,
  isoToday,
} from '../core/shared-helpers.js';
import { makeProseMoney } from '../core/money-format.js';
import { attentionListReact, overviewCoverageNoteReact, overviewFlowCardReact, overviewViewReact } from './react-bridge.js';
import { createAvailableNow } from './available-now-preview.js';
import { paymentStatusText } from '../analysis/payment-obligations.js';
import { bankStatementMonths } from '../analysis/coverage-map.js';

export function createOverviewRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'bankMoney',
      'resolved',
      'allLedgerMonths',
      'overviewModel',
      'periodEmptyNotice',
      'iconInfo',
      'provenModels',
      'renderFlowChart',
      'money0',
      'dismissReview',
      'pickStatements',
      'openStatementCoverage',
      'openImportedFiles',
      'openRulesSection',
      'openStatementNudge',
      'drillToTransactions',
      'reviewCauses',
      'openEvidence',
      'balanceUpdates',
      'openPaymentDetail',
      'ownAccountAsks',
      'labelSuggestionAsks',
    ],
    'createOverviewRenderer'
  );

  const {
    state,
    el,
    icon,
    bankMoney,
    resolved,
    allLedgerMonths,
    overviewModel,
    periodEmptyNotice,
    iconInfo,
    provenModels,
    renderFlowChart,
    money0,
    dismissReview,
    pickStatements,
    openStatementCoverage,
    openImportedFiles,
    openRulesSection,
    openStatementNudge,
    drillToTransactions,
    reviewCauses,
    openEvidence,
    balanceUpdates,
    openPaymentDetail,
    ownAccountAsks,
    labelSuggestionAsks,
  } = ctx;

  const { renderAvailableNow } = createAvailableNow({
    el,
    icon,
    provenModels,
    bankMoney,
    iconInfo,
    openEvidence,
    asOfTrace: (asProps = false) => balanceUpdates.asOfTrace(asProps),
  });


  /* Overview reads the FULL imported range, not the selected reporting period.
   * Its period control is plain text (see renderPeriodBar's LIVE_VIEWS): the
   * things this tab answers - what is spendable now, what needs attention - are
   * either period-independent or actively wrong when narrowed, because a
   * blocking item must not vanish just because a person is looking at an
   * earlier month. Shaped exactly like resolvePeriod's output so every consumer
   * below is unchanged. */
  function allTimePeriod() {
    const months = allLedgerMonths();
    if (!months.length) return resolved();
    const from = months[0];
    const to = months[months.length - 1];
    return {
      type: 'all',
      from,
      to,
      label: 'All time',
      prevFrom: null,
      prevTo: null,
      kind: 'all',
    };
  }

  function renderOverview(settings = null) {
    const reactActive = typeof window !== 'undefined' && !!settings;
    const wrap = reactActive ? null : el('div', { class: 'accounts-wrap accounts-grid view-overview' });
    const { recs, cardSummary, rollAllTrend } = overviewModel();

    // Shared-window empty state: neither ledger has activity in the selected
    // period. A plain notice instead of a screen built on nothing.
    if (!recs.length && (!cardSummary || cardSummary.n_transactions === 0)) {
      if (reactActive) return overviewViewReact(el, { empty: periodEmptyNotice('money movements', allLedgerMonths(), true), settings });
      wrap.append(periodEmptyNotice('money movements', allLedgerMonths()));
      return wrap;
    }

    const story = balanceUpdates.renderChangeStory(reactActive);
    if (story && !reactActive) wrap.append(story);
    const lead = renderAvailableNow({ demoted: !!story, asProps: reactActive });
    if (lead && !reactActive) wrap.append(lead);

    const causes = reviewCauses();
    const storyMode = causes.mode === 'story';
    const attnItems = buildAttentionItems({
      cardRows: state.rows || [],
      cardStatements: state._cardStatements || [],
      bankStatements: state._bankStatements || [],
      brandRules: state.brandRules,
      merchants: state.merchants,
      rows: state.rows,
      period: allTimePeriod(),
      causes,
      openEvidence,
      cfg: state.cfg,
      splits: state.transactionSplits || [],
      fallback: undefined,
      availableNow: provenModels.availableNow(),
      money0,
      proseMoney: makeProseMoney(state.cfg),
      formatDisplayDate,
      isUnrecognised,
      detectPossibleDuplicates,
      detectCategorySpikes,
      dismissReview,
      pickStatements,
      openImportedFiles,
      openRulesSection,
      statementNudges: staleStatementNudges(
        state._cardStatements || [],
        state._bankStatements || [],
        { toleranceDays: state.cfg.statementToleranceDays, includeOnTrack: true },
        new Date()
      ),
      openStatementNudge,
      drillToTransactions,
    }).filter((it) => it.tone === 'blocking' || it.cause || it.destination === 'rules');
    const nextPayment = (state.paymentObligations || [])
      .map((payment) => provenModels.paymentCoverageFor(payment))
      .filter((item) => item?.occurrence)
      .sort((a, b) => a.occurrence.date.localeCompare(b.occurrence.date))[0];
    if (nextPayment) {
      const payment = nextPayment.payment;
      attnItems.unshift({
        tone: nextPayment.overdue || nextPayment.recordedStatus === 'short' ? 'blocking' : 'watch',
        cause: true,
        title: `${nextPayment.overdue ? 'Past due' : 'Next'} ${payment.label}: ${formatDisplayDate(nextPayment.occurrence.date)}`,
        detail: `${nextPayment.lastPostedMatch && nextPayment.lastPosted.date.slice(0, 7) === isoToday().slice(0, 7) ? `Paid ${formatDisplayDate(nextPayment.lastPosted.date)}. ` : ''}Payment account ${paymentStatusText(nextPayment.recordedStatus)}; forecast ${paymentStatusText(nextPayment.forecastStatus)}. Balance recorded through ${nextPayment.account?.asOf ? formatDisplayDate(nextPayment.account.asOf) : 'unknown date'}.`,
        onClick: () => openPaymentDetail(payment.id),
        actions: [],
      });
    }
    attnItems.push(...ownAccountAsks());
    if (attnItems.length < ATTENTION_LIMIT) attnItems.push(...labelSuggestionAsks());
    const closing = storyMode ? causes.quiet : causes.stateLine;
    const attention = {
      title: storyMode && causes.title ? causes.title : 'To review',
      titleDetail: storyMode && causes.titleDetail ? causes.titleDetail : null,
      items: attnItems,
      calmText: closing || 'Nothing needs a decision right now.',
      closing: attnItems.some((it) => it.cause) ? null : closing,
    };
    const attnCard = reactActive ? null : attentionListReact(attention);

    let flowCard = null;
    const flowChart = renderFlowChart(rollAllTrend, {
      bankMonths: [
        ...(state.bankRecords || []).map((row) => String(row.date || '').slice(0, 7)),
        ...bankStatementMonths(state._bankStatements),
      ],
      cardMonths: [
        ...(state.rows || []).map((row) => row.month),
        ...(state._cardStatements || []).map((statement) => statement.statementKey),
      ],
      coverage: state.coverage,
    });
    if (flowChart) {
      const visibleRows = flowChart.props?.rows || [];
      const recorded = visibleRows.some((row) => row.recorded);
      flowChart.summary = flowChart.hidden
        ? 'Figures hidden'
        : `${recorded ? 'Recorded net cash' : 'Net cash'} ${makeProseMoney(state.cfg)(flowChart.props.net)} · ${flowChart.props.range}`;
    }
    if (flowChart && !reactActive) flowCard = overviewFlowCardReact(el, flowChart);

    // 3) Honest partial-data note when the period's coverage is incomplete -
    // the "partial data never looks complete" rule, kept.
    // The fact on the line, the caveat behind the (i). This used to be a
    // full-width CARD carrying nothing but one qualifying sentence about data
    // completeness - a panel, a border, a shadow and 40px of padding spent on
    // a footnote, sitting between the headline and the next real card. What a
    // person needs at a glance is the coverage itself; why the total may run a
    // little low is detail, on request.
    const covParts = periodCoverageParts(state.coverage, allTimePeriod());
    if (covParts && !reactActive) {
      wrap.append(overviewCoverageNoteReact(el, {
        headline: covParts.headline,
        detail: covParts.detail,
        onOpen: openStatementCoverage,
      }));
    }

    // 4) No "Quick actions" card. It held two buttons - "Review activity" and
    // "Open my plan" - that went to the Activity and Plan tabs, which are two
    // rows above it on every screen and pinned to the thumb on a phone. A whole
    // card, sitting beside the one thing on this screen that might genuinely
    // need a decision, spent on a second way to press a tab.
    if (reactActive) return overviewViewReact(el, { story, lead, attention, chart: flowChart, coverage: covParts ? { headline: covParts.headline, detail: covParts.detail, onOpen: openStatementCoverage } : null, settings });
    wrap.append(attnCard);
    if (flowCard) wrap.append(flowCard);

    return wrap;
  }

  return { renderOverview };
}
