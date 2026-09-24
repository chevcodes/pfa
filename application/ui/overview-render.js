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
  renderAttentionList,
  isUnrecognised,
} from '../analysis/reporting-core.js';
import {
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
} from '../core/shared-helpers.js';
import { chartInfoReact } from './react-bridge.js';
import { createAvailableNow } from './available-now-preview.js';

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
  } = ctx;

  const { renderAvailableNow } = createAvailableNow({
    el,
    icon,
    provenModels,
    bankMoney,
    iconInfo,
    openEvidence,
    asOfTrace: () => balanceUpdates.asOfTrace(),
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

  function renderOverview() {
    const wrap = el('div', { class: 'accounts-wrap accounts-grid view-overview' });
    const { recs, cardSummary, rollAllTrend } = overviewModel();

    // Shared-window empty state: neither ledger has activity in the selected
    // period. A plain notice instead of a screen built on nothing.
    if (!recs.length && (!cardSummary || cardSummary.n_transactions === 0)) {
      wrap.append(periodEmptyNotice('money movements', allLedgerMonths()));
      return wrap;
    }

    const story = balanceUpdates.renderChangeStory();
    if (story) wrap.append(story);
    const lead = renderAvailableNow({ demoted: !!story });
    if (lead) wrap.append(lead);

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
    const closing = storyMode ? causes.quiet : causes.stateLine;
    const attnCard = renderAttentionList(el, icon, {
      title: storyMode && causes.title ? causes.title : 'To review',
      iconInfo,
      items: attnItems,
      calmText: closing || 'Nothing needs a decision right now.',
      closing: attnItems.some((it) => it.cause) ? null : closing,
    });

    // 3) Cash inflow vs Cash outflow over the recent months, its own card. Shows
    // direction and the ahead/short balance at a glance - the plan's "recent
    // movement" element. Reads rollAllTrend (the full-history trend), moves no
    // total, so cross_screen_consistency stays green by construction.
    let flowCard = null;
    const flowChart = renderFlowChart(rollAllTrend);
    if (flowChart) {
      const chartCard = el('section', { class: 'card overview-flow' });
      // No year pill here on purpose. This chart already prints its exact
      // window in its own footer ("September 2025 - August 2026"), built from
      // the months it actually draws. A pill derived from the full history
      // said "2024-2026" over a twelve-month chart - a second, coarser answer
      // that contradicted the precise one directly below it.
      chartCard.append(
        el(
          'div',
          { class: 'card-head' },
          el('h3', { class: 'card-title' }, icon(iconInfo()), 'Cash movement')
        )
      );
      chartCard.append(flowChart);
      flowCard = chartCard;
    }

    // 3) Honest partial-data note when the period's coverage is incomplete -
    // the "partial data never looks complete" rule, kept.
    // The fact on the line, the caveat behind the (i). This used to be a
    // full-width CARD carrying nothing but one qualifying sentence about data
    // completeness - a panel, a border, a shadow and 40px of padding spent on
    // a footnote, sitting between the headline and the next real card. What a
    // person needs at a glance is the coverage itself; why the total may run a
    // little low is detail, on request.
    const covParts = periodCoverageParts(state.coverage, allTimePeriod());
    if (covParts) {
      wrap.append(
        el(
          'p',
          { class: 'coverage-note muted small' },
          // The fact is the way in. It said "Based on 41 of 44 months" and
          // stopped there: the three months it is about were not named, and
          // the picture that knows them sat unreferenced in another card. It
          // lands on that picture now, where those months are marked and the
          // way to add them sits beside them. The (i) names them too, so the
          // sentence and its destination agree before the tap as well as after.
          el(
            'button',
            {
              type: 'button',
              class: 'linkbtn',
              onclick: openStatementCoverage,
            },
            covParts.headline
          ),
          chartInfoReact(el, '', covParts.detail)
        )
      );
    }

    // 4) No "Quick actions" card. It held two buttons - "Review activity" and
    // "Open my plan" - that went to the Activity and Plan tabs, which are two
    // rows above it on every screen and pinned to the thumb on a phone. A whole
    // card, sitting beside the one thing on this screen that might genuinely
    // need a decision, spent on a second way to press a tab.
    wrap.append(attnCard);
    if (flowCard) wrap.append(flowCard);

    return wrap;
  }

  return { renderOverview };
}
