import { buildDisclosure, placeFoldAll, surfaceTone } from './decision-header.js';
import { chartIsHidden, pairCards } from './chart-helpers.js';
import { collapsibleCardReact, chartInfoReact, donutChartReact, activityTabsReact, activityViewReact, transactionTableReact, transactionSearchReact, transactionCategoryFilterReact, transactionAccountFilterReact, customLabelsReact, activityIncomeReact, emptyStateReact, rankedPaymentListReact, decisionSurfaceReact, metricLeadReact, insightListReact, whereItWentCardReact } from './react-bridge.js';
import { makeProseMoney } from '../core/money-format.js';
import { rememberOpen } from './collapsible-card-state.js';
/*
 * activity-render.js  -  the "Activity" surface's distinctive analysis cards,
 * rendered from the PROVEN models via the shared number -> tag -> dropdown
 * content model:
 *   - committed vs flexible (the past-tense lens; genuinely new to the app)
 *   - "where it went": the merged category -> merchant drill
 *   - category spending intentions surfaced as forward PACE
 *
 * It owns no analysis - every figure comes from the corpus-proven modules via
 * provenModels; this file only turns those models into DOM. Follows the app's
 * render-factory pattern (requireCtx-guarded, ctx-injected, returns the render
 * functions the host appends).
 *
 * COLLISION NOTE (deliberate): the spend-breakdown card REPLACES right-now's
 * separate category + merchant cards - it is the one merged drill, not a second
 * spending view. Rendering both would show two breakdowns that could disagree.
 * So the SHIPPING Activity branch calls renderCommittedFlexible() +
 * renderIntentions() only; renderSpendBreakdown()/renderActivity() stay defined
 * but uncalled until right-now's category/merchant cards are removed in the SAME
 * pass. committed-vs-flexible has no existing equivalent, so it is additive.
 *
 * HONESTY, ENFORCED IN THE MARKUP:
 *   - committed-vs-flexible always renders its reconciling line BENEATH the
 *     split, never as a separate dismissible element;
 *   - the drill's comparison markers carry direction + size + period, and a
 *     partial-prior month shows an amount, never an exaggerated percentage;
 *   - intention pace uses forward, no-guilt language only.
 */
import {
  requireCtx,
  formatDisplayDate,
  drillToTransaction as drillToTransactionPure,
  ledgerIsNarrowed as ledgerIsNarrowedPure,
  joinWithAnd,
  markScrollAffordance,
  transactionName,
  accountName,
  accountShortLabel,
  isoToday,
  formatMonthYear,
} from '../core/shared-helpers.js';
import {
  reviewReasonText,
  appendExpandable,
} from '../analysis/reporting-core.js';
import {
  buildIncomeHero,
  buildIncomeCaption,
  detectMidMonthPace,
  pairCardRefunds,
  mergedMoneyMovedRanking,
  rankInsights,
} from '../analysis/reporting-insights.js';
import { splitsByTxnId, validateSplit } from '../analysis/transaction-splits.js';
import { CATEGORY_CONTRIBUTIONS_LABEL, categoryContributions } from '../analysis/category-contributions.js';
import {
  analyseBankActivity,
  analyseIncomePattern,
  externalOutflowShortlist,
  externalInflowShortlist,
  bankCounterpartyGroups,
  isCardPaymentTransfer,
} from '../analysis/bank-analysis.js';
import { createTreemapRenderer } from './treemap-render.js';
import { groupTreemapCategories } from '../analysis/treemap-categories.js';
import { incomeChartModel } from './income-chart-render.js';
import { incomeSourcesModel, takeHomeModel } from './income-sources.js';
import { takeHomeSentence } from '../analysis/plan.js';
import { roleCategoryName, sortCategoryNames } from '../analysis/category-flow.js';
import { staggerIn } from './motion.js';
import { makeRenderIntentions } from './intentions-section.js';
import { categoryTagModel } from './category-tag-model.js';
import { bankStatementMonths } from '../analysis/coverage-map.js';
import { creditCategoryExplanation } from '../analysis/credit-classifier.js';

function renderReactInsightList(el, icon, opts) {
  const { title, iconBulb, iconChevron, insights, emptyText, wrapCard, summary, name, alwaysOpen, foldAll } = opts;
  const listProps = {
    insights: insights.map((item, index) => ({
      ...item,
      id: item.id || `${item.tone}:${index}`,
      chevron: iconChevron(),
    })),
    emptyText,
  };
  const reactActive = typeof window !== 'undefined';
  const body = reactActive ? null : el('div', { class: 'insights' }, insightListReact(el, listProps));
  const card = wrapCard(el, {
    title,
    icon: reactActive ? null : icon(iconBulb()),
    iconMarkup: reactActive ? iconBulb() : null,
    summary,
    body,
    reactBody: reactActive ? { kind: 'insights', props: listProps, wrapClass: 'insights', rootClass: 'pfa-react-root' } : null,
    name,
    alwaysOpen,
    foldAll,
  });
  if (card) card.classList.add('insights');
  return card;
}

// Session-only Transactions-tab search text, the same module-scope pattern
// ahead-render.js uses for its own draft state. Folded into activityTabSignature
// so a keystroke rebuilds the ledger; reset naturally on reload.
let _txSearch = '';
/* Categories chosen from the chip row, as a SET.
 *
 * The chips used to write the category's name into the search box, so picking
 * a second one replaced the first: there was no way to ask for "Groceries and
 * Dining" because the thing holding the answer was a single string. A set can
 * hold as many as are clicked, each chip toggles its own membership, and the
 * text search still applies on top (AND), which is what a person means when
 * they type into the box with chips already on. Session-only, like _txSearch. */
let _txCategories = new Set();
let _txContributionDrill = null;
// Column sort for the merged ledger. Module scope for the same reason
// _txSearch is: it is a view preference, not app data, and it resets on
// reload. Default is date-descending, which is what the list always did.
let _txSort = { key: 'date', dir: 'desc' };
// An EXPLICIT collapse. A search (and a focused row) auto-expands the ledger
// so no match is hidden past the tenth row, but that override also beat the
// user's own "Hide": the collapse re-rendered and the auto-expand immediately
// undid it, so the button appeared dead. Reset whenever the search changes,
// so a new search still opens fully.
let _txCollapsed = false;

export function createActivityRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'provenModels',
      'resolved',
      'trackUsage',
      'reversible',
      'Store',
      'render',
      'makeIntention',
      'makeTag',
      'toast',
      'catColour',
      'money0',
      'resetBankDrillFacets',
      'bankMoney',
      'cleanCounterparty',
      'drillToAccountsPayee',
      'openCategoryPicker',
      'openTagPicker',
      'FALLBACK',
      'iconList',
      'visibleRows',
      'visibleBankRows',
      'bankRecordsInPeriod',
      'classifiedBank',
      'periodRows',
      'bankRowsInapplicable',
      'cardRowsInapplicable',
      'clearFilters',
      'clearBankFilters',
      'openMonth',
      'openStatementCoverage',
      'analysis',
      'renderRecurring',
      'renderForeign',
      'renderCardFitness',
      'renderTrend',
      'renderLedgerReview',
      'renderIncomeChart',
      'iconSpark',
      'buildBankInsights',
      'buildInsights',
      'iconBulb',
      'iconChevron',
      'smoothScrollToEl',
      'scrollToRenderedAnchor',
      'resetCardDrillFacets',
      'drillToTransactions',
      'switchLedgerView',
      'jump',
      'noteActivityDomRebuilt',
      'balanceUpdates',
      'savingAccountKeys',
      'onCategoryHistory',
    ],
    'createActivityRenderer'
  );  const {
    state,
    balanceUpdates,
    savingAccountKeys,
    onCategoryHistory,
    el,
    icon,
    provenModels,
    resolved,
    trackUsage,
    reversible,
    Store,
    render,
    makeIntention,
    makeTag,
    toast,
    catColour,
    money0,
    resetBankDrillFacets,
    bankMoney,
    cleanCounterparty,
    drillToAccountsPayee,
    openCategoryPicker,
    openTagPicker,
    FALLBACK,
    iconList,
    visibleRows,
    visibleBankRows,
    bankRecordsInPeriod,
    classifiedBank,
    periodRows,
    bankRowsInapplicable,
    cardRowsInapplicable,
    clearFilters,
    clearBankFilters,
    openMonth,
    openStatementCoverage,
    analysis,
    renderRecurring,
    renderForeign,
    renderCardFitness,
    renderTrend,
    renderLedgerReview,
    renderIncomeChart,
    iconSpark,
    buildBankInsights,
    buildInsights,
    iconBulb,
    iconChevron,
    smoothScrollToEl,
    scrollToRenderedAnchor,
    resetCardDrillFacets,
    drillToTransactions,
    switchLedgerView,
    jump,
    // Called after every LOCAL ledger rebuild (search keystroke, category
    // chip), so the view cache's signature keeps describing the DOM it holds.
    // Without it a later render() can decide nothing changed and hand back
    // DOM that no longer matches the state - which is how "Clear all" died.
    noteActivityDomRebuilt,
  } = ctx;
  const ownAccountTransferCategory = () => (state.cfg?.categories || []).find((category) => category.structuralRole === 'internalTransfer')?.name || '';
  /* Money written for a sentence or a chart label, not for a value slot. */
  const prose = makeProseMoney(state.cfg || {});
  const iconInfo = ctx.iconInfo || (() => '');
  const iconPie = ctx.iconPie || iconInfo;
  const iconFlag = ctx.iconFlag || iconInfo;
  const iconLabel = ctx.iconLabel || iconInfo;
  const applyFilter = ctx.applyFilter || null; // optional: enables drill-to-transactions
  const isPeriodFullyCovered = ctx.isPeriodFullyCovered || (() => true);
  const previousPeriod = ctx.previousPeriod || null;
  const categorySpend = ctx.categorySpend || null; // shared category calc, for intentions
  const renderIntentions = makeRenderIntentions({
    state,
    el,
    icon,
    provenModels,
    resolved,
    trackUsage,
    Store,
    render,
    makeIntention,
    categorySpend,
    iconFlag,
    toast,
    reversible,
    money0,
    // The same detector the retired pace card ran, handed to the one card that
    // can act on what it finds.
    midMonthPace: () => detectMidMonthPace(categoryContributions({ cardRows: state.rows, bankRows: classifiedBank(), splits: state.transactionSplits, cfg: state.cfg, cardAccounts: state.cardAccounts, designatedSetAside: savingAccountKeys() }).purchases.map((part) => ({ kind: 'spend', month: part.month, category: part.category, amount: part.amount })), state.cfg, new Date()),
    drillToTransactions,
  });
  const { renderTreemapCard } = createTreemapRenderer({
    el,
    money0,
    catColour,
  });
  let guardedClick = null;
  let activityClickGuardAttached = false;

  function activityEventSignature() {
    return `${state.view}|${activityTabSignature()}`;
  }

  function guardRerenderedActivityClicks() {
    if (typeof document === 'undefined' || activityClickGuardAttached) return;
    activityClickGuardAttached = true;
    let eventSignature = null;
    let clickEvent = null;
    let clickTarget = null;
    const suppressFollowup = (event) => {
      if (!guardedClick || !event.detail) return;
      if (Math.abs(event.clientX - guardedClick.x) > 10 || Math.abs(event.clientY - guardedClick.y) > 10) {
        guardedClick = null;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'click') guardedClick = null;
    };
    document.addEventListener('pointerdown', suppressFollowup, true);
    document.addEventListener('click', (event) => {
      suppressFollowup(event);
      if (event.defaultPrevented) return;
      eventSignature = clickEvent = clickTarget = null;
      if (event.target instanceof Element && event.target.closest('.activity-view')) {
        eventSignature = activityEventSignature();
        clickEvent = event;
        clickTarget = event.target;
      }
    }, true);
    document.addEventListener('click', (event) => {
      if (
        event === clickEvent &&
        event.detail &&
        (eventSignature !== activityEventSignature() || !clickTarget.isConnected || !clickTarget.getClientRects().length)
      ) {
        const nextGuard = { x: event.clientX, y: event.clientY };
        guardedClick = nextGuard;
        setTimeout(() => {
          if (guardedClick === nextGuard) guardedClick = null;
        }, 500);
      }
    });
  }

  // The one place _txSearch is ever cleared from outside this module - a
  // plain reset, so drillToTransaction (below) can genuinely guarantee an
  // empty search before jumping to a specific row, closing the stale-search
  // gap CARD_FACETS/BANK_FACETS never covered (see shared-helpers.js's own
  // comment on why).
  function setTxCategories(next) {
    _txCategories = new Set(next || []);
    state.bankFilter.hideInternal = !_txCategories.has(ownAccountTransferCategory());
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('pfa-ledger-categories-change', { detail: { active: _txCategories.size > 0, selected: [..._txCategories] } }));
    }
  }

  function toggleTxCategory(name) {
    const next = new Set(_txCategories);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setTxCategories(next);
  }

  function resetTxSearch() {
    _txSearch = '';
    // drillToTransaction promises the target row will be visible. A category
    // chip narrows the same list, so it has to go with the search text or the
    // promise only holds when no chip happens to be on.
    setTxCategories([]);
    _txContributionDrill = null;
  }

  function setContributionDrill(category, source = 'all', kind = 'spend', label = '') {
    _txContributionDrill = { category, source, kind, label };
  }

  function resetActivityViewState() {
    _txSearch = '';
    setTxCategories([]);
    _txContributionDrill = null;
    _txSort = { key: 'date', dir: 'desc' };
    _txCollapsed = false;
  }

  function activityNavigationState() {
    return {
      search: _txSearch,
      categories: [..._txCategories].sort(),
      contributionDrill: _txContributionDrill,
      sort: { ..._txSort },
      collapsed: _txCollapsed,
    };
  }

  function restoreActivityNavigationState(snapshot) {
    if (!snapshot) return;
    _txSearch = String(snapshot.search || '');
    setTxCategories(Array.isArray(snapshot.categories) ? snapshot.categories : []);
    _txContributionDrill = snapshot.contributionDrill || null;
    _txSort = snapshot.sort && snapshot.sort.key ? { ...snapshot.sort } : { key: 'date', dir: 'desc' };
    _txCollapsed = !!snapshot.collapsed;
  }

  // Identity-level anchor: jumps straight to and opens ONE specific
  // transaction, rather than narrowing the ledger to a class of rows and
  // leaving a person to find it themselves. Exposed on this factory's
  // return value too, so other renderers (cards-render.js) that reference a
  // single, already-identified transaction can call the same mechanism.
  function drillToTransactionRaw(target) {
    drillToTransactionPure(
      { state, trackUsage, resetCardDrillFacets, resetBankDrillFacets, resetTxSearch, render },
      target
    );
  }
  const drillToTransaction = jump(drillToTransactionRaw);
  /* ===================================================================
   * 1) COMMITTED vs FLEXIBLE - the distinctive lens. Reconciling line is
   *    ALWAYS attached beneath the split, never omitted.
   * =================================================================== */
  function renderCommittedFlexible(asProps = false) {
    const p = resolved();
    if (!p || !p.from || !p.to) return null;
    const m = provenModels.committedFlexibleFor({ from: p.from, to: p.to });
    if (!m) return null;

    const lead = m.lead || {};
    const support = [m.committed, m.flexibleSpent]
      .map((c, index) =>
        c
          ? {
              ...c,
              spendingLens: index === 0 ? 'committed' : 'discretionary',
            }
          : null
      )
      .filter(Boolean)
      .map(({ spendingLens, ...c }) => ({
        text: c.amountText,
        label: c.label,
        tag: c.tag,
        tone: c.tone,
        detail: c.detail,
        onClick: () => drillToTransactions(
          { spendingLens },
          { bankPatch: { spendingLens } }
        ),
        goesTo: `${c.label} transactions`,
      }));

    const committedAmt = m.committed ? Number(m.committed.amount) || 0 : 0;
    const spentAmt = m.flexibleSpent ? Number(m.flexibleSpent.amount) || 0 : 0;
    const totalSpend = committedAmt + spentAmt;
    const ringSpec =
      totalSpend > 0
        ? {
              label: 'Fixed and discretionary spending this period',
              total: totalSpend,
              money: prose,
              segments: [
                {
                  label: (m.committed && m.committed.label) || 'Fixed expenses',
                  amount: committedAmt,
                  tone: 'committed',
                },
                {
                  label: (m.flexibleSpent && m.flexibleSpent.label) || 'Discretionary spending',
                  amount: spentAmt,
                  tone: 'out',
                },
              ],
              centre: { value: prose(totalSpend), label: 'spent' },
              hideTooltip: true,
              hideCentreValue: true,
            }
        : null;
    const ring = ringSpec && typeof window === 'undefined' ? donutChartReact({ el, money0 }, ringSpec) : null;
    const ringHidden = ringSpec && typeof window !== 'undefined' && chartIsHidden();

    const leadProps = {
      id: 'activity-header',
      className: 'view-activity activity-primary',
      question: 'Where did this period\'s money go?',
      figure: lead.amountText != null ? lead.amountText : '',
      meaning: lead.label || 'Total spending this period',
      support,
      supportLabel: 'Fixed and discretionary spending',
      supportOpen: false,
      extra: ring,
      extraChart: ringHidden ? null : typeof window !== 'undefined' ? ringSpec : null,
      extraHidden: ringHidden ? ringSpec.label : null,
      extraAside: true,
    };
    return asProps ? leadProps : decisionSurfaceReact(el, leadProps);
  }

  function renderSpendBreakdown(asProps = false) {
    const period = resolved();
    if (!period?.from || !period?.to) return null;
    const bankRows = bankRecordsInPeriod(classifiedBank());
    const cardRows = periodRows();
    const views = {};
    for (const source of ['all', 'bank', 'card']) {
      const data = categoryContributions({ cardRows, bankRows, splits: state.transactionSplits, cfg: state.cfg, cardAccounts: state.cardAccounts, designatedSetAside: savingAccountKeys(), source });
      const ranked = [...data.byCategory].filter(([, amount]) => amount !== 0).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount, fill: catColour(name) }));
      const positive = ranked.filter((item) => item.amount > 0);
      const total = positive.reduce((sum, item) => sum + item.amount, 0);
      const { categories: by_category, groupedNames, otherName } = groupTreemapCategories(positive, total);
      const onCategory = (name) => {
        trackUsage('activity-drill-category-treemap');
        drillToTransactions({ category: name === otherName ? groupedNames : name, kind: 'spend' }, { showAll: true, contributionCategory: true, source, contributionLabel: name });
      };
      const treemap = by_category.length ? renderTreemapCard({ by_category, merchants: [] }, { embedded: true, model: true, onCategory }) : ranked.length ? { categories: [], onCategory, money: money0 } : null;
      views[source] = {
        amount: data.total,
        total,
        summary: ranked[0]?.amount > 0 ? `Largest: ${ranked[0].name}, ${prose(ranked[0].amount)}` : 'Attributed refunds this period',
        ranked,
        treemap,
        fees: data.feeTotal,
        returned: data.refundTotal,
        onCategory,
      };
    }
    if (!views.all.ranked.length && !views.bank.ranked.length && !views.card.ranked.length) return null;
    const props = { iconMarkup: iconPie(), views, periodLabel: period.from === period.to ? formatMonthYear(period.from) : `${formatMonthYear(period.from)}–${formatMonthYear(period.to)}`, money: money0, compactMoney: prose, compactAmount: prose(views.all.amount) };
    return asProps ? props : whereItWentCardReact(el, props);
  }

  /* ===================================================================
   * 3) CATEGORY INTENTIONS - forward pace, no-guilt language, PLUS the
   *    authoring form (B2): a person sets, edits, or removes a category
   *    ceiling directly from this card. The card is now the ONE entry
   *    point - it never returns null when categorySpend exists, even with
   *    zero ceilings set, so the empty state IS the "way in" rather than
   *    a card that only ever appears once a ceiling already exists
   *    somewhere else (proven by b2_render_proof.mjs's card-always-renders
   *    check).
   *
   *    Save NEVER mutates an existing record - it always creates a NEW
   *    repeating intention, matching category-intentions.js's own frozen
   *    contract (an edit is a new record, never a rewrite of history).
   *    Remove clears EVERY record for that category, reverting it fully to
   *    "no ceiling set" - there is no partial/point-in-time removal exposed
   *    here; the precise single-record delete-by-id path already exists
   *    and is proven correct at the resolver level (b2_resolver_proof.mjs).
   *
   *    Each row's Remove button carries the GOVERNING record's real id
   *    (from provenModels.intentionFor, never a raw/unresolved record) as
   *    a data-id attribute - a defensive, always-real reference, guarding
   *    against the exact "undefined id" class of bug an earlier round hit.
   * =================================================================== */
  /* ===================================================================
  * 4) CUSTOM LABELS - cross-category totals against an optional target
   *    (a renovation, a holiday - spending a monthly pace signal can't
   *    express since it spans categories and months). Same pattern as
   *    intentions: the card is ALWAYS the way in, never appearing only
   *    once a tag already exists. Reads provenModels.tags() (the proven
   *    reader), never re-derives totals here. Assignment (attaching a
  *    transaction to a custom label) IS wired: every row in the merged Transactions
  *    ledger (renderMergedLedger, both card and bank) carries a "+ Custom label" /
  *    "Custom label \u00d7N" control that opens the same label picker this card's
   *    totals read from, so a tag's count updates the moment a row is
   *    attached, with no separate assignment surface left to build.
   * =================================================================== */  async function createTag(name, target) {
    if (!name) {
      toast('Name the custom label first.');
      return;
    }
    await reversible.addRecord({
      store: Store.tags,
      record: makeTag({ name, target }),
      reload: async () => {
        state.tags = await Store.tags.all();
      },
      describe: () => `Custom label "${name}" created.`,
      track: () => trackUsage('activity-create-tag'),
    });
  }

  async function removeTag(id) {
    // A label carries every transaction a person filed under it. Deleting it
    // was one tap with no way back; the record is now restored on undo.
    const gone = (state.tags || []).find((t) => t.id === id);
    await reversible.removeRecords({
      store: Store.tags,
      records: gone ? [gone] : [],
      reload: async () => {
        state.tags = await Store.tags.all();
      },
      describe: () => `Custom label "${gone ? gone.name : ''}" removed.`,
      track: () => trackUsage('activity-remove-tag'),
    });
  }

  function renderTags(asProps = false) {
    const models = provenModels.tags();
    const labelProps = {
      models: models.map((model) => ({ ...model, tone: surfaceTone(model.tone) })),
      onRemove: removeTag,
      onOpen: (name) => {
        trackUsage('activity-drill-tag');
        openTransactionsForSearch(name);
      },
      onCreate: async (name, rawTarget) => {
        const target = rawTarget ? Number(rawTarget) : null;
        if (rawTarget && (!Number.isFinite(target) || target <= 0)) {
          toast('Enter a target greater than zero, or leave it blank.');
          return false;
        }
        return createTag(name, target);
      },
    };
    if (asProps) return { summary: models.length ? `${models.length} label${models.length === 1 ? '' : 's'}` : 'None yet', explain: 'Group spending that belongs together but spans categories and months - a renovation, a holiday, a trip.', labelProps };
    const reactActive = typeof window !== 'undefined';
    const sec = reactActive ? null : customLabelsReact(el, labelProps);
    return collapsibleCardReact(el, {
      title: 'Custom labels',
      icon: reactActive ? null : icon(iconList()),
      explain: 'Group spending that belongs together but spans categories and months - a renovation, a holiday, a trip.',
      summary: models.length ? `${models.length} label${models.length === 1 ? '' : 's'}` : 'None yet',
      body: sec,
      reactBody: reactActive ? { kind: 'customLabels', props: labelProps, rootClass: 'pfa-react-root' } : null,
      name: 'activity-custom-labels',
    });
  }

  function openTransactionsForSearchRaw(term) {
    resetCardDrillFacets();
    resetBankDrillFacets();
    resetTxSearch();
    _txSearch = String(term || '');
    state.activityTab = 'transactions';
    render({ preserveScroll: false });
    scrollToRenderedAnchor('#tx-search');
  }
  const openTransactionsForSearch = jump(openTransactionsForSearchRaw);

  function validSplitFor(row) {
    const split = splitsByTxnId(state.transactionSplits || []).get(row.id);
    return split && validateSplit(split, row.amount).ok ? split : null;
  }

  function contributionDrillLabel() {
    if (!_txContributionDrill) return '';
    const drill = _txContributionDrill;
    const source = drill.source === 'bank' ? 'Bank' : drill.source === 'card' ? 'Card' : 'All sources';
    if (drill.kind === 'fee') return `Fees · ${source}`;
    const grouped = Array.isArray(drill.category);
    const category = drill.label || (grouped ? 'Other' : drill.category) || 'All categories';
    return `${grouped ? 'Category group' : 'Category'}: ${category}${grouped ? ` (${drill.category.length} categories)` : ''} · ${source}`;
  }

  function contributionDrillSummary() {
    if (!_txContributionDrill) return '';
    const drill = _txContributionDrill;
    const source = drill.source === 'bank' ? 'Bank' : drill.source === 'card' ? 'Card' : 'All sources';
    const category = drill.label || (Array.isArray(drill.category) ? 'Other' : drill.category) || 'all categories';
    const grouped = Array.isArray(drill.category) ? ` (${drill.category.length} categories)` : '';
    return `in ${drill.kind === 'fee' ? 'fees' : category + grouped} (${source})`;
  }


  /*
   * WHAT IS THIS LIST NARROWED TO, and how do I get out of it.
   *
   * Every drill in the app lands here having quietly narrowed the ledger, and
   * the only thing that ever said so was a card head still reading "All
   * transactions" over ten Groceries rows. The one escape was a "Show all"
   * button buried inside a note about bank statements, which cleared
   * EVERYTHING - so removing one facet of a two-facet drill was impossible.
   *
   * Each active facet is named and individually removable, with a single
   * clear-all beside them.
   */
  function activeFilterChips() {
    const f = state.filter || {};
    const bf = state.bankFilter || {};
    const chips = [];
    const add = (label, clear) => chips.push({ label, clear });

    if (f.category && f.category !== 'all') {
      add(`Category: ${f.category}`, () => applyFilter({ category: 'all' }));
    }
    if (f.merchant) {
      add(`Place: ${f.merchantLabel || f.merchant}`, () =>
        applyFilter({ merchant: '', merchantLabel: '' })
      );
    }
    if (f.kind && f.kind !== 'all') add(`Type: ${f.kind}`, () => applyFilter({ kind: 'all' }));
    if (f.flow && f.flow !== 'all') {
      add(f.flow === 'income' ? 'Cash inflow' : 'Cash outflow', () => applyFilter({ flow: 'all' }));
    }
    if (f.reviewOnly) add('Needs review', () => applyFilter({ reviewOnly: false }));
    if (f.spendingLens && f.spendingLens !== 'all') {
      const label = f.spendingLens === 'committed' ? 'Fixed expenses' : 'Discretionary spending';
      add(label, () => {
        state.bankFilter.spendingLens = 'all';
        applyFilter({ spendingLens: 'all' });
      });
    }
    if (f.foreignOnly) add('Foreign only', () => applyFilter({ foreignOnly: false }));
    if (f.min != null || f.max != null) {
      add('Amount range', () => applyFilter({ min: null, max: null }));
    }
    if (f.search) add(`Matching: ${f.search}`, () => applyFilter({ search: '' }));
    // A rule drill narrows BOTH ledgers, so its way back clears both. Named
    // and removable like every other facet, through the same chips.
    if (f.ruleKey || (bf && bf.ruleKey)) {
      add(`Rule: ${f.ruleLabel || bf.ruleLabel || f.ruleKey || bf.ruleKey}`, () => {
        state.bankFilter.ruleKey = '';
        state.bankFilter.ruleLabel = '';
        applyFilter({ ruleKey: '', ruleLabel: '' });
      });
    }
    if (bf.payeeKey) {
      add(`Payee: ${bf.payeeLabel || bf.payeeKey}`, () => {
        state.bankFilter.payeeKey = '';
        state.bankFilter.payeeLabel = '';
        render();
      });
    }
    if (bf.kind && bf.kind !== 'all') {
      add(`Bank type: ${bf.kind}`, () => {
        state.bankFilter.kind = 'all';
        render();
      });
    }
    if (state.bankAccount && state.bankAccount !== 'all') {
      add('One account', () => {
        state.bankAccount = 'all';
        render();
      });
    }
    if (_txSearch.trim()) {
      add(`Search: ${_txSearch.trim()}`, () => {
        _txSearch = '';
        render();
      });
    }
    // One removable chip per chosen category, so a filter set two screens ago
    // is both visible and undoable from the same place every other filter is.
    for (const name of [..._txCategories].sort()) {
      add(name, () => {
        toggleTxCategory(name);
        render();
      });
    }
    if (_txContributionDrill) {
      add(contributionDrillLabel(), () => {
        _txContributionDrill = null;
        setTxCategories(_txCategories);
        render();
      });
    }
    return chips;
  }

  function clearEveryFilter() {
    trackUsage('activity-clear-ledger-filters');
    _txSort = { key: 'date', dir: 'desc' };
    _txCollapsed = false;
    clearFilters();
    clearBankFilters();
    _txSearch = '';
    setTxCategories([]);
    _txContributionDrill = null;
    state.bankAccount = 'all';
    state.showAllTx = false;
    state.bankShowAllTx = false;
    render();
  }

  // The caveat that used to BE the clear affordance. It explains why one
  // ledger is missing from a narrowed list; it is not the way out.
  function ledgerCaveat() {
    if (bankRowsInapplicable()) {
      return state.filter.kind && state.filter.kind !== 'all'
        ? 'Bank transactions are hidden: this type is from card statements.'
        : 'Bank transactions are hidden: this place or foreign filter has nothing to match on a bank statement.';
    }
    if (cardRowsInapplicable()) {
      return state.bankFilter.kind && state.bankFilter.kind !== 'all'
        ? 'Card transactions are hidden: this type is from bank statements.'
        : 'Card transactions are hidden: a payee filter has nothing to match on a card statement.';
    }
    return null;
  }

  function renderFilterBar() {
    const chips = activeFilterChips();
    if (!chips.length) return null;
    return {
      chips: chips.map((chip) => ({
        label: chip.label,
        clear: () => {
          trackUsage('activity-clear-one-facet');
          chip.clear();
        },
      })),
      clear: clearEveryFilter,
      caveat: ledgerCaveat(),
    };
  }

  function ledgerIsNarrowed() {
    // _txSearch is this tab's OWN search box and lives in module scope, so the
    // shared state-based check cannot see it. Without it the card head read
    // "All transactions" over a search showing zero rows.
    return ledgerIsNarrowedPure(state) || _txSearch.trim() !== '' || _txCategories.size > 0 || !!_txContributionDrill;
  }

  // What a bank row is called on screen. transactionName() already prefers the
  // row's parsed narrative, which arrives finished - parsed, cased and
  // comma-cut - so it must NOT be run back through cleanCounterparty(): that
  // would strip the very "Transfer to" the narrative just built. The
  // cleanCounterparty fallback stays for a row that has no narrative.
  function bankRowName(r) {
    return r && r.narrative ? transactionName(r) : cleanCounterparty(transactionName(r));
  }

  function tagNamesFor(row) {
    const names = [];
    for (const t of state.tags || [])
      if ((t.txnIds || []).includes(row.id)) names.push(String(t.name || ''));
    return names;
  }

  // Does a merged entry match the current search text? Case-insensitive over
  // the description/payee, the category (card side), the absolute amount, and
  // any tag names. Empty search matches everything.
  function matchesSearch(m, q) {
    if (!q) return true;
    const r = m.row;
    const hay = [
      r.displayName,
      r.description,
      r.counterpartyLabel,
      // The row shows the narrative, so the search box has to match what the
      // person can actually read on screen.
      r.narrative,
      // Was card-only: the search box offers to match a category, and bank rows
      // now show one, so it has to search theirs too.
      r.category,
      String(Math.abs(Number(r.amount) || 0)),
      ...tagNamesFor(r),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }

  // Chosen from the chip row. An empty set means "every category", and two or
  // more chips mean OR between them - "show me Groceries and Dining", not
  // "show me rows that are somehow both".
  function matchesCategories(m) {
    if (!_txCategories.size) return true;
    return (
      (_txCategories.has(ownAccountTransferCategory()) && m.row.internalTransfer) ||
      _txCategories.has(m.row.category)
    );
  }

  // Written by renderMergedLedger, read by the live count beside the search
  // box: the true size of the result, before the ten-row display cap.
  let _ledgerCounts = { matched: 0, total: 0 };

  function renderMergedLedger(cardRows, bankRecs, asProps = false, onlyHiddenTransfers = false, showTransfers = null) {
    const q = _txSearch.trim().toLowerCase();
    const all = [
      ...cardRows.map((r) => ({ ledger: 'card', date: r.date, row: r })),
      ...bankRecs.map((r) => ({ ledger: 'bank', date: r.date, row: r })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const evidence = _txContributionDrill ? categoryContributions({ cardRows, bankRows: bankRecs, splits: state.transactionSplits, cfg: state.cfg, cardAccounts: state.cardAccounts, designatedSetAside: savingAccountKeys(), source: _txContributionDrill.source }) : null;
    const evidenceParts = evidence && (_txContributionDrill.kind === 'fee' ? evidence.fees : evidence.purchases);
    const evidenceCategories = _txContributionDrill ? new Set([_txContributionDrill.category].flat()) : null;
    const evidenceAmounts = evidenceParts ? new Map() : null;
    if (evidenceAmounts) for (const part of evidenceParts) {
      if (!evidenceCategories.has(part.category)) continue;
      const key = `${part.ledger}:${part.id}`;
      evidenceAmounts.set(key, (evidenceAmounts.get(key) || 0) + part.amount);
    }
    const evidenceIds = evidenceAmounts ? new Set(evidenceAmounts.keys()) : null;
    const totalCount = all.length;
    const narrowed = q || _txCategories.size || evidenceIds;
    const merged = narrowed
      ? all.filter((m) => matchesSearch(m, q) && matchesCategories(m) && (!evidenceIds || evidenceIds.has(`${m.ledger}:${m.row.id}`)))
      : all;
    // What MATCHED, not what fitted. The list caps its rows at ten until it is
    // expanded, so counting the rendered <tr>s answered "how many can you see"
    // when the question is "how many are there" - a search finding forty rows
    // reported ten of them.
    _ledgerCounts = { matched: merged.length, total: totalCount };
    // Consumed here, once: drillToTransaction (shared-helpers.js) sets this
    // key before calling render(); if the target row is present in THIS
    // period's merged list, it is forced into the DOM below regardless of
    // the normal 10-row cap, and marked open/highlighted at build time. The
    // key is cleared immediately after use so an unrelated later render()
    // never re-triggers the highlight a second time.
    const focusKey = state._focusTxnKey || null;
    const focusIndex = focusKey
      ? merged.findIndex((m) => m.ledger + ':' + m.row.id === focusKey)
      : -1;
    if (focusKey) state._focusTxnKey = null;
    const filterBar = renderFilterBar();
    const ledgerLabelOf = (m) =>
      m.ledger === 'card' ? 'Card' : m.row.account ? bankLedgerLabel(m.row.account) : 'Bank';
    const ledgerLabels = [...new Set(merged.map(ledgerLabelOf))];
    const showLedgerCol = ledgerLabels.length > 1;
    const baseCode = state.cfg.currency.code;
    const allBaseCurrency = merged.every((m) => {
      const c = m.row.currency || m.row.Currency;
      return !c || c === baseCode;
    });
    const colCount = showLedgerCol ? 4 : 3;
    // A search shows every match with no cap (so a match past row 10 is never
    // hidden); no search keeps the calm 10-row initial cap with See more/all.
    // A focused single-transaction target ALSO forces a full reveal for this
    // one render pass - simplest guarantee the row genuinely exists in the
    // DOM before focusTransactionRow tries to scroll to it. A more surgical
    // "reveal exactly up to the target" is possible (appendExpandable's own
    // reveal(n) already accepts an arbitrary count) but was not pursued here
    // in favour of the simpler, unambiguously-correct option.
    // Applied here, after filtering and before paging, so a sort orders the
    // whole matching set rather than just the ten rows currently revealed.
    const sortDir = _txSort.dir === 'asc' ? 1 : -1;
    const sortValue = (m) => {
      if (_txSort.key === 'amount') {
        return m.ledger === 'card'
          ? -Number(m.row.amount || 0)
          : (m.row.direction === 'in' ? 1 : -1) * Math.abs(Number(m.row.amount) || 0);
      }
      if (_txSort.key === 'description') {
        return String(
          m.ledger === 'card'
            ? m.row.displayName || m.row.description || ''
            : m.row.counterpartyLabel || m.row.description || ''
        ).toLowerCase();
      }
      if (_txSort.key === 'ledger') return ledgerLabelOf(m).toLowerCase();
      return m.date || '';
    };
    merged.sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      // Stable tie-break on date so equal keys keep a predictable order.
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    const showAll =
      !_txCollapsed && (state.showAllTx || state.bankShowAllTx || !!q || focusIndex >= 0);
    const rows = merged.map((m) => {
      const r = m.row;
      const key = m.ledger + ':' + r.id;
      const card = m.ledger === 'card';
      const name = card ? r.displayName || r.description : bankRowName(r);
      const details = [['Statement text', r.description || '']];
      let reason = '';
      let split = false;
      const rowLabel = card ? '' : r.household ? 'Household' : '';
      if (card) {
        reason = reviewReasonText(r, FALLBACK());
        split = validSplitFor(r);
        if (r.raw_description && r.raw_description !== r.description)
          details.push(['Full statement line', r.raw_description]);
        if (r.kind) details.push(['Type', r.kind]);
      } else if (r.account) {
        const tail = String(r.account).slice(-4);
        const friendly = accountName(state.accountNames, 'bank', r.account);
        details.push(['Account', friendly ? friendly + ' (…' + tail + ')' : '…' + tail]);
        if (r.balanceAfter != null) details.push(['Balance after', bankMoney(r.balanceAfter)]);
      }
      if (!card && r.direction === 'in')
        details.push(['Category', creditCategoryExplanation(r.creditClassification)]);
      if (!card && r.excludedFromIncome) reason = 'Not yet counted as money in';
      const evidenceAmount = evidenceAmounts?.get(key);
      const evidenceCategory = evidenceCategories?.size === 1 ? [...evidenceCategories][0] : r.category;
      const category = categoryTagModel(evidenceAmount == null ? r.category : evidenceCategory, catColour, (name) => name === FALLBACK());
      if (evidenceAmount != null) details.push(['Statement amount', card ? money0(Math.abs(r.amount)) : bankMoney(Math.abs(r.amount))]);
      return {
        key,
        id: 'tx-' + key,
        detailId: 'tx-detail-' + key,
        model: m,
        date: formatDisplayDate(r.date),
        name,
        nameTitle: 'Show ' + name + ' transactions',
        ledger: card ? 'Card' : r.account ? bankLedgerLabel(r.account) : 'Bank',
        amount: evidenceAmount == null ? (card ? (r.amount < 0 ? '+' : '-') + money0(Math.abs(r.amount)) : (r.direction === 'in' ? '+' : '-') + bankMoney(Math.abs(r.amount))) : (evidenceAmount < 0 ? '+' : '-') + money0(Math.abs(evidenceAmount)),
        amountClass: evidenceAmount == null ? (card ? (r.amount < 0 ? 'credit' : '') : (r.direction === 'in' ? 'credit' : '')) : (evidenceAmount < 0 ? 'credit' : ''),
        category,
        rowLabel,
        tagNames: tagNamesFor(r),
        split,
        reason,
        details,
        focused: key === focusKey,
      };
    });
    const ledgerKinds = new Set(merged.map((m) => m.ledger));
    const scope = ledgerKinds.size > 1
      ? 'card and bank'
      : ledgerKinds.has('card')
        ? 'card'
        : ledgerLabels.length > 1
          ? 'bank accounts'
          : ledgerLabels[0]
            ? ledgerLabels[0].toLowerCase()
            : '';
    const narrowingParts = [];
    if (q) narrowingParts.push('matching "' + _txSearch.trim() + '"');
    if (_txCategories.size) {
      const names = [..._txCategories].sort();
      narrowingParts.push(names.length === 1 ? 'in ' + names[0].toLowerCase() : 'in ' + names.length + ' categories');
    }
    if (_txContributionDrill) narrowingParts.push(contributionDrillSummary());
    const countText = narrowingParts.length
      ? 'Showing ' + merged.length + ' of ' + totalCount + ' transaction' + (totalCount === 1 ? '' : 's') + ' ' + narrowingParts.join(', ')
      : merged.length + ' transaction' + (merged.length === 1 ? '' : 's');
    const flowLabel = state.filter.flow === 'income' ? 'Cash inflow' : state.filter.flow === 'spending' ? 'Cash outflow' : '';
    const flowTotal = flowLabel ? bankMoney(merged.reduce((sum, item) => sum + (Number(item.row.amount) || 0), 0)) : '';
    const tableProps = {
      rows,
      columns: {
        sort: _txSort,
        showLedger: showLedgerCol,
        count: colCount,
        amountLabel: allBaseCurrency ? 'Amount (' + baseCode + ')' : 'Amount',
        title: flowLabel ? flowLabel + ' transactions' : ledgerIsNarrowed() ? 'Matching transactions' : 'All transactions',
      },
      filterBar,
      empty: merged.length ? null : {
        message: onlyHiddenTransfers ? 'This account has only own-account transfers in this period.' : null,
        actionLabel: onlyHiddenTransfers ? 'Show own-account transfers' : 'Clear all filters',
        onClear: onlyHiddenTransfers ? showTransfers : clearEveryFilter,
      },
      summary: (flowLabel ? flowLabel + ': ' + flowTotal + ' · ' : '') + (scope ? countText + ' · ' + scope + '.' : countText + '.'),
      expanded: showAll,
      focusKey: focusIndex >= 0 ? focusKey : null,
      onSort: (key) => {
        trackUsage('activity-sort-transactions');
        _txSort = _txSort.key === key
          ? { key, dir: _txSort.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: key === 'date' || key === 'amount' ? 'desc' : 'asc' };
        render();
      },
      onName: (m) => {
        if (m.ledger === 'card') {
          trackUsage('activity-drill-payee');
          openTransactionsForSearch(m.row.displayName || m.row.description);
        } else {
          trackUsage('activity-drill-payee');
          drillToAccountsPayee(m.row.counterpartyKey, cleanCounterparty(m.row.counterpartyLabel));
        }
      },
      onTag: (m) => {
        trackUsage('activity-open-tag');
        openTagPicker(m.row);
      },
      onCategory: (m) => {
        const r = m.row;
        if (m.ledger === 'card') {
          trackUsage('activity-open-category');
          openCategoryPicker(r, 'card');
        } else {
          trackUsage('activity-open-classification');
          openCategoryPicker(r, 'bank');
        }
      },
      onExpandChange: (open) => {
        trackUsage('activity-tx-expand');
        _txCollapsed = !open;
        state.showAllTx = open;
        state.bankShowAllTx = open;
        render();
      },
      onKeyDown: (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        const target = event.target;
        if (target?.closest?.('.tx-detail, input, textarea, select')) return;
        event.preventDefault();
        clearEveryFilter();
      },
    };
    return asProps ? tableProps : transactionTableReact(tableProps);
  }

  /* TEMPORAL CONTRACT: this is BACKWARD content - the income that has already
     ARRIVED over the past months (the history bars, "your income has been X").
     It belongs in Activity (looking back), not Forecast. Forecast owns the
     FORWARD half - projecting the next deposit and the cash runway - which
     lives in the forecast chart itself, not a card. Same data
     (analyseIncomePattern), two temporal stances, two homes: the past series
     here, the projection there. */
  function renderIncome(income, asProps = false) {
    const hero = buildIncomeHero(income, bankMoney);
    if (!hero) return null;
    const caption = buildIncomeCaption(income);
    const statementMonths = bankStatementMonths(state._bankStatements);
    const chartOptions = {
      recordedMonths: [
        ...(state.bankRecords || []).map((row) => String(row.date || '').slice(0, 7)),
        ...statementMonths,
      ],
      statementMonths,
      coverage: state.coverage,
      currentMonth: isoToday().slice(0, 7),
    };
    const drawn = incomeChartModel(income, chartOptions) || { cells: [] };
    const onclick = income.key
      ? () => {
          trackUsage('activity-drill-income');
          drillToAccountsPayee(income.key, cleanCounterparty(income.label));
        }
      : null;
    const chart = renderIncomeChart(
      income,
      income.key
        ? {
          ...chartOptions,
          onMonth: (month, row) => {
            trackUsage('activity-drill-income');
            if (row.missingStatement) return openStatementCoverage();
            drillToAccountsPayee(income.key, cleanCounterparty(income.label), { month });
          },
        }
        : chartOptions
    );
    const usual =
      income.typicalAmount != null && income.stepChange === 'up'
        ? `, above usual ${prose(income.typicalAmount)}`
        : income.typicalAmount != null && income.stepChange === 'down'
          ? `, below usual ${prose(income.typicalAmount)}`
          : '';
    const lastCell = drawn.cells.at(-1);
    const summary = lastCell?.missingStatement
      ? `No bank statement · ${formatMonthYear(lastCell.month)}`
      : lastCell?.noDeposit
        ? `No deposit recorded · ${formatMonthYear(lastCell.month)}`
        : `Latest ${prose(income.lastAmount)}${usual}`;
    const lastDepositMonth = income.series?.at(-1)?.month;
    const reactActive = typeof window !== 'undefined';
    const incomeProps = {
      amount: hero.amountText,
      label: (lastCell?.noDeposit || lastCell?.missingStatement) && lastDepositMonth
        ? `${hero.label} · last recorded ${formatMonthYear(lastDepositMonth)}`
        : hero.label,
      onClick: onclick,
      deltaText: hero.deltaText,
      deltaTone: surfaceTone(hero.deltaTone),
      chart,
      takeHome: takeHomeModel(provenModels.incomeSources().takeHome, {
        sentence: takeHomeSentence(provenModels.incomeSources().takeHome, prose),
        money: bankMoney,
        monthLabel: formatMonthYear,
        classLabels: state.cfg.incomeClassLabels,
      }),
      sources: incomeSourcesModel(provenModels.incomeSources().sources, {
        prose,
        money: bankMoney,
        monthLabel: formatMonthYear,
        categoryLabel: roleCategoryName(state.cfg, 'defaultIncome'),
      }),
      why: caption,
    };
    if (asProps) return { summary, iconMarkup: iconSpark(), incomeProps };
    return collapsibleCardReact(el, {
      title: 'Your regular deposits',
      icon: reactActive ? null : icon(iconSpark()),
      iconMarkup: reactActive ? iconSpark() : null,
      summary,
      body: reactActive ? null : activityIncomeReact(el, incomeProps),
      reactBody: reactActive ? { kind: 'activityIncome', props: incomeProps, rootClass: 'pfa-react-root' } : null,
      name: 'activity-income',
    });
  }

  function renderMergedPlaces(cardRows, bankRecs, asProps = false) {
    const cardMerchants = (analysis() || {}).merchants || [];
    const refundPairs = pairCardRefunds(cardRows, state.brandRules, state.merchants).pairs;
    const cpGroups = bankCounterpartyGroups(bankRecs);
    const outflows = externalOutflowShortlist(cpGroups, 8).filter((g) => {
      const rec = bankRecs.find((r) => r.counterpartyKey === g.key);
      return !rec || !isCardPaymentTransfer(rec, state.cardAccounts);
    });
    const inflows = externalInflowShortlist(cpGroups, 8);
    // MONEY LEAVING ONLY. This card used to rank inflows and outflows
    // together, which put one salary line at the top of a list about places -
    // and the income pattern chart directly above already answers where money
    // came from. Ranking outflows alone makes it the "where did it actually
    // go, by place" companion to the treemap's "by category".
    //
    // Called PAYMENTS, not spending: a loan repayment and a transfer into an
    // investment both rank here, and neither is money spent. Money leaving is
    // what the list actually measures, so it is what the title says.
    const merged = mergedMoneyMovedRanking(
      cardRows,
      cardMerchants,
      outflows,
      inflows,
      refundPairs,
      state.brandRules,
      state.merchants
    )
      .filter((g) => g.direction !== 'in')
      .slice(0, 10);
    if (!merged.length) return null;
    const reactActive = typeof window !== 'undefined';
    const sec = reactActive ? null : el('div', {});
    // Bars are scaled against the BIGGEST place, not the total: the question
    // this card answers is "how do these compare to each other", and a
    // share-of-total scale leaves every row a short stub once the tail is
    // long enough.
    const biggest = merged.reduce((m, g) => Math.max(m, g.amount), 0) || 1;
    function drillPlace(g) {
      trackUsage('activity-drill-place');
      if (g.source === 'card')
        drillToTransactions({
          merchant: g.key,
          merchantLabel: g.label,
          category: 'all',
        });
      else drillToAccountsPayee(g.key, cleanCounterparty(g.label));
    }

    const rows = merged.map((g) => {
      const width = Math.max(2, Math.round((g.amount / biggest) * 100));
      const detail = [
        g.label,
        money0(g.amount),
        `${g.count} transaction${g.count === 1 ? '' : 's'}`,
        g.count > 1 ? `${prose(g.amount / g.count)} each on average` : null,
      ].filter(Boolean);
      return {
        key: g.key,
        label: g.label,
        count: g.count,
        amount: money0(g.amount),
        width,
        detail,
        onClick: () => drillPlace(g),
      };
    });
    const rankedProps = {
      rows,
      onMounted: (bars) => staggerIn(bars, () => [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { step: 40, duration: 460 }),
    };
    if (asProps) return { summary: `Largest: ${merged[0].label}, ${prose(merged[0].amount)}`, iconMarkup: iconList(), rankedProps };
    if (!reactActive) sec.append(rankedPaymentListReact(el, rankedProps));
    return collapsibleCardReact(el, {
      title: 'Biggest payments',
      icon: reactActive ? null : icon(iconList()),
      iconMarkup: reactActive ? iconList() : null,
      summary: `Largest: ${merged[0].label}, ${prose(merged[0].amount)}`,
      body: sec,
      reactBody: reactActive ? { kind: 'rankedPayments', props: rankedProps, wrapClass: '', rootClass: 'pfa-react-root' } : null,
      name: 'activity-biggest-payments',
    });
  }

  function renderMergedInsights(a, cardRows, bankRecs, asProps = false) {
    // Previously hardcoded to an empty array regardless of what the card
    // ledger actually showed, meaning this card's only real content ever came
    // from bank data - for a card-only person (or a bank-only person, in
    // reverse) it always read "calm, nothing stands out" no matter what was
    // genuinely unusual in their own ledger. buildInsights (cards-render.js)
    // already computes real per-category and per-merchant signals from the
    // same resolved period and periodRows() this whole tab already reads;
    // it was simply never wired into this merge.
    const cardInsights = buildInsights(a);
    const bankInsights = buildBankInsights(a, bankRecs, classifiedBank(), () =>
      switchLedgerView('overview', { anchorId: '#overview-cash-movement' })
    );
    const merged = rankInsights(
      [...cardInsights, ...bankInsights],
      (state.cfg.insights && state.cfg.insights.maxInsights) || 3
    );
    if (asProps) return {
      summary: merged.length ? `${merged.length} material change${merged.length === 1 ? '' : 's'} detected` : 'No material change detected',
      iconMarkup: iconBulb(),
      listProps: {
        insights: merged.map((item, index) => ({ ...item, id: item.id || `${item.tone}:${index}`, chevron: iconChevron() })),
        emptyText: 'No material change was detected against the usual pattern.',
      },
    };
    const collapsibleCard = collapsibleCardReact;
    return renderReactInsightList(el, icon, {
      title: 'What\u2019s new or unusual',
      iconBulb,
      iconChevron,
      insights: merged,
      emptyText: 'No material change was detected against the usual pattern.',
      wrapCard: collapsibleCard,
      summary: merged.length
        ? `${merged.length} material change${merged.length === 1 ? '' : 's'} detected`
        : 'No material change detected',
      name: 'activity-unusual',
      alwaysOpen: true,
      foldAll: false,
    });
  }


  function renderActivityTabs(asProps = false) {
    const activate = (id) => {
      if (state.activityTab === id) return;
      state.activityTab = id;
      trackUsage('activity-tab-' + id);
      render();
      requestAnimationFrame(() => document.getElementById('activity-tab-' + id)?.focus());
    };
    if (asProps) return { value: state.activityTab, onValueChange: activate };
    return activityTabsReact(state.activityTab, activate);
  }

  function renderAnalysisTab() {
    const reactActive = typeof window !== 'undefined';
    const hasCardHistory = !!(state.allSummary?.months?.length || state._cardStatements?.length);
    if (reactActive) {
      const a = analysis();
      const bankRecs = bankRecordsInPeriod(classifiedBank());
      const cardRows = periodRows();
      const income = analyseIncomePattern(classifiedBank(), state.cfg, new Date());
      const bankA = bankRecs.length ? analyseBankActivity(bankRecs) : null;
      const where = renderSpendBreakdown(true);
      const lead = renderCommittedFlexible(true);
      if (lead && where) lead.secondaryMetric = {
        figure: where.compactAmount,
        label: `${CATEGORY_CONTRIBUTIONS_LABEL} · See categories`,
        onClick: jump(() => {
          rememberOpen('activity-where-it-went', true);
          render({ preserveScroll: false });
          requestAnimationFrame(() => {
            smoothScrollToEl('#activity-where-it-went');
            document.getElementById('activity-where-it-went')?.focus({ preventScroll: true });
          });
          return true;
        }, { returnOnAction: true }),
      };
      const model = {
        kind: 'analysis',
        lead,
        insights: renderMergedInsights(a, cardRows, bankRecs, true),
        review: bankA ? renderLedgerReview(bankA, bankRecs, true) : null,
        where,
        places: renderMergedPlaces(cardRows, bankRecs, true),
        commitments: renderRecurring(true),
        income: renderIncome(income, true),
        trend: hasCardHistory ? renderTrend(true) : null,
        foreign: a && cardRows.length ? renderForeign(a, true) : null,
        fitness: renderCardFitness(true),
        limits: renderIntentions(true),
        tags: renderTags(true),
      };
      if (!Object.entries(model).some(([key, value]) => key !== 'kind' && value)) model.empty = { title: 'Nothing to analyse yet', body: 'Import a statement and this period’s spending analysis appears here.' };
      return model;
    }
    const wrap = el('div', {
      class: 'accounts-wrap accounts-grid activity-analysis',
      id: 'activity-panel',
      role: 'tabpanel',
      'aria-labelledby': 'activity-tab-analysis',
    });
    const a = analysis();
    const bankRecs = bankRecordsInPeriod(classifiedBank());
    const cardRows = periodRows();

    const cf = renderCommittedFlexible();
    if (cf) wrap.append(cf);

    const insightsCard = renderMergedInsights(a, cardRows, bankRecs);
    if (insightsCard) wrap.append(insightsCard);

    if (bankRecs.length) {
      const bankA = analyseBankActivity(bankRecs);
      const reviewCard = renderLedgerReview(bankA, bankRecs);
      if (reviewCard) wrap.append(reviewCard);
    }

    // ORDER: the three views of where money went run together - by category
    // (the map), by place (the ranked list) and by commitment - before the
    // tab changes the subject to income. The income card used to sit between
    // the ring and the map, splitting the one question this tab exists to
    // answer across two halves of the page.
    const sb = renderSpendBreakdown();
    if (sb) wrap.append(sb);

    // Biggest payments + Regular commitments: two proportion lists, paired.
    const placesCard = renderMergedPlaces(cardRows, bankRecs);
    const commitCard = renderRecurring();
    pairCards(wrap, placesCard, commitCard);

    const income = analyseIncomePattern(classifiedBank(), state.cfg, new Date());
    const incomeCard = renderIncome(income);
    if (incomeCard) wrap.append(incomeCard);

    const trendCard = hasCardHistory ? renderTrend() : null;
    const foreignCard = a && cardRows.length ? renderForeign(a) : null;
    pairCards(wrap, trendCard, foreignCard);

    const fitnessCard = renderCardFitness();
    if (fitnessCard) wrap.append(fitnessCard);

    // Category ceilings + Tags: two authoring forms, paired.
    const ci = renderIntentions();
    const tg = renderTags();
    pairCards(wrap, ci, tg);

    if (wrap.childElementCount === 0) {
      wrap.append(emptyStateReact(el, {
        title: 'Nothing to analyse yet',
        body: 'Import a statement and this period\u2019s spending analysis appears here.',
      }));
    }
    placeFoldAll(el, wrap);
    return wrap;
  }

  function bankLedgerLabel(account) {
    return `Bank · ${accountName(state.accountNames, 'bank', account) || `…${String(account).slice(-4)}`}`;
  }

  function accountChipLabel(account, allAccounts) {
    return accountName(state.accountNames, 'bank', account) || accountShortLabel(account, allAccounts);
  }

  function renderAccountSelector(explain, asProps = typeof window !== 'undefined') {
    const bankAccounts = analyseBankActivity(classifiedBank()).accounts || [];
    const pm = provenModels.positionModels();
    const cardBalance = pm && pm.cashDebt ? pm.cashDebt.cardBalance : null;
    const hasCard = cardBalance != null;
    if (bankAccounts.length < 2 && !hasCard) return null;

    const current = state.bankAccount || 'all';
    const bankTotal = analyseBankActivity(classifiedBank()).closingBalance;
    const items = [];
    if (bankAccounts.length > 1 || hasCard) {
      items.push({ value: 'all', name: 'All bank accounts', sub: bankMoney(bankTotal), active: current === 'all' });
    }
    for (const a of bankAccounts) {
      items.push({ value: a.account, name: accountChipLabel(a.account, bankAccounts), sub: bankMoney(a.closingBalance), active: current === a.account });
    }
    if (hasCard) {
      items.push({ value: 'card', name: 'Credit card', sub: '-' + bankMoney(Math.abs(cardBalance)), active: current === 'card', owe: true });
    }
    const filtered = current !== 'all';
    const activeLabel =
      current === 'card'
        ? 'Credit card only'
        : filtered
          ? `${accountName(state.accountNames, 'bank', current) || `Account ${String(current).slice(-4)}`} only`
          : 'All accounts';
    const accountProps = {
      items,
      summary: activeLabel,
      iconNode: typeof window === 'undefined' && explain ? chartInfoReact(el, '', explain) : null,
      explain: typeof window !== 'undefined' ? explain : null,
      markScrollAffordance: (node) => markScrollAffordance(node),
      onSelect: (value) => {
        if (current === value) return;
        _txContributionDrill = null;
        resetBankDrillFacets();
        state.bankAccount = value;
        state.bankShowAllTx = true;
        state.showAllTx = true;
        trackUsage('activity-select-account');
        render();
      },
    };
    return asProps ? accountProps : transactionAccountFilterReact(el, accountProps);
  }

  function renderTransactionsTab() {
    const cardRowsAll = periodRows();
    const bankRecsAll = bankRecordsInPeriod(classifiedBank());
    const selected = state.bankAccount || 'all';
    // Each tile isolates its OWN ledger, matching the panel's own title
    // ("Show one account") and caption ("show only its transactions") -
    // selecting a bank account no longer leaves every card transaction
    // showing alongside it, and selecting the card excludes bank rows.
    const isCard = selected === 'card';
    const isOneBank = selected !== 'all' && !isCard;
    const cardRows = isOneBank ? [] : cardRowsAll;
    const bankRecs = isCard
      ? []
      : isOneBank
        ? bankRecsAll.filter((r) => r.account === selected)
        : bankRecsAll;
    const reactActive = typeof window !== 'undefined';
    const wrap = reactActive ? null : el('div', {
      class: 'accounts-wrap activity-transactions',
      id: 'activity-panel',
      role: 'tabpanel',
      'aria-labelledby': 'activity-tab-transactions',
    });
    const asOfDate = (classifiedBank() || [])
      .map((r) => r.date)
      .filter(Boolean)
      .sort()
      .pop();
    const balanceContext = [
      asOfDate
        ? `Balances as of ${formatDisplayDate(asOfDate)}, the latest movement recorded - not the selected period.`
        : '',
      isOneBank
        ? 'Choose an account or your card to show only its transactions below, with a running balance.'
        : 'Choose an account or your card to show only its transactions below.',
    ].filter(Boolean);
    const selector = renderAccountSelector(balanceUpdates.reconciledEdge(selected, balanceContext));
    if (selector && !reactActive) wrap.append(selector);
    if (!cardRows.length && !bankRecs.length) {
      const hasRecords = (state.rows || []).length || (state.bankRecords || []).length;
      const body = hasRecords
        ? `${isCard ? 'No card transactions' : isOneBank ? 'No transactions for this account' : 'No transactions'} in the selected period. Choose another period${selector ? ' or account' : ''} to review recorded transactions.`
        : 'Import a statement and your transactions appear here.';
      if (reactActive) return { kind: 'empty', selector, empty: { title: 'Transactions', body } };
      wrap.append(emptyStateReact(el, { title: 'Transactions', body }));
      return wrap;
    }

    // Search: the plan's Transactions spec - find a transaction across its
    // description, category, amount or tag name, LIVE as you type. The input is
    // built ONCE and lives outside the ledger; typing calls a local rebuild that
    // rewrites only the ledger container, never the input, so focus and caret
    // are preserved perfectly - the same reason the category picker filters its
    // list in-place rather than re-rendering the whole view. No render() call.
    let countText = '';
    const countListeners = new Set();
    const countStore = {
      getSnapshot: () => countText,
      subscribe: (listener) => {
        countListeners.add(listener);
        return () => countListeners.delete(listener);
      },
      set: (text) => {
        if (countText === text) return;
        countText = text;
        countListeners.forEach((listener) => listener());
      },
    };

    // Transfers between the person's own accounts were hidden by a filter that
    // defaulted to on and had no control anywhere: on a real ledger that is
    // most of every bank movement, unreachable. They could not be labelled,
    // and the guess that put them there could not be corrected - which matters
    // because the guess is made from account numbers, and a number sharing its
    // last four digits with one of yours reads as yours. Rent, an allowance or
    // money sent to family can sit behind it. The registry already declared
    // the facet and its default; this is one more chip in the row of chips
    // that already narrows this list, which is the control it never had.
    //
    // Only when there are any. On a card-only ledger, or with the card tile
    // selected, there is no own-account transfer anywhere in the list, and the
    // chip was a switch that changed nothing whichever way it was thrown.
    const hiddenTransfers = (bankRecs || []).filter((r) => r.internalTransfer).length;
    const transferMarkers = new Set([(state.cfg && state.cfg.special && state.cfg.special.paymentCategory) || 'Card Payment']);
    const isListed = (category) => category && !transferMarkers.has(category) && (!hiddenTransfers || category !== ownAccountTransferCategory());
    const categoryCounts = {};
    for (const row of [...cardRows, ...bankRecs]) {
      if (isListed(row.category)) categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    }
    const ownCategories = (state.cfg.categories || []).filter((category) => category.custom).map((category) => category.name);
    const usedCategories = sortCategoryNames([...Object.keys(categoryCounts), ...ownCategories, ...[..._txCategories].filter(isListed)], state.cfg);
    const inView = usedCategories.filter((name) => categoryCounts[name]).length;
    const chosenSummary = (names) => {
      const selected = sortCategoryNames([...(names || _txCategories)], state.cfg).map((name) => name === ownAccountTransferCategory() ? name.toLowerCase() : name);
      if (!selected.length) return inView ? `All ${inView} categories` : 'None yet';
      return selected.length > 2 ? `${selected.slice(0, 2).join(', ')} and ${selected.length - 2} more` : joinWithAnd(selected);
    };
    const categoryExplain = [
      'Use the label icon on any transaction to file it under a custom label of your own - a renovation, a holiday, anything that spans categories and months.',
      'Tap the category under any transaction to change it. On a card transaction you choose whether it applies to that one or to every charge from that place; on an account transaction it always applies to every transaction like it, because that is a rule.',
    ];
    const categoryProps = usedCategories.length || hiddenTransfers
      ? {
          categories: usedCategories,
          counts: categoryCounts,
          selectedCategories: [..._txCategories],
          explain: categoryExplain,
          name: 'category-filter', compact: true,
          transfer: hiddenTransfers ? {
            value: ownAccountTransferCategory(),
            label: ownAccountTransferCategory(),
            count: hiddenTransfers,
            title: 'Money you moved between your own accounts. Left out of spending and money in, so hidden unless you ask for it.',
          } : null,
          summaryFor: chosenSummary,
          onToggleCategory: (name) => {
            _txContributionDrill = null;
            toggleTxCategory(name);
            _txCollapsed = false;
            trackUsage('activity-tx-category-chip');
            rebuildLedger();
          },
          onToggleTransfer: () => {
            toggleTxCategory(ownAccountTransferCategory());
            _txCollapsed = false;
            trackUsage('activity-toggle-own-transfers');
            rebuildLedger();
          },
        }
      : null;
    if (categoryProps && !reactActive) wrap.append(transactionCategoryFilterReact(el, categoryProps));
    const searchProps = {
      initialSearch: _txSearch,
      countStore,
      categoriesOn: _txCategories.size > 0 || !!_txContributionDrill,
      onInput: (value) => {
        _txCollapsed = false;
        _txSearch = value;
        trackUsage('activity-tx-search');
        rebuildLedger();
      },
      onClear: () => {
        _txCollapsed = false;
        _txSearch = '';
        setTxCategories([]);
        _txContributionDrill = null;
        rebuildLedger();
      },
    };
    const searchFilters = reactActive ? searchProps : transactionSearchReact(el, searchProps);
    if (!reactActive) wrap.append(searchFilters);

    const ledgerHost = reactActive ? null : el('div', {});
    if (!reactActive) wrap.append(ledgerHost);
    let ledgerSnapshot = null;
    const ledgerListeners = new Set();
    const ledgerStore = {
      getSnapshot: () => ledgerSnapshot,
      subscribe: (listener) => {
        ledgerListeners.add(listener);
        return () => ledgerListeners.delete(listener);
      },
      set: (next) => {
        ledgerSnapshot = next;
        ledgerListeners.forEach((listener) => listener());
      },
    };
    const rebuildLedger = () => {
      if (ledgerHost) ledgerHost.textContent = '';
      // visibleRows()/visibleBankRows() still apply every OTHER active filter
      // facet (category, kind, merchant, search, payee...); the account/card
      // tile narrows on top of that by simply excluding the other ledger's
      // rows outright when one specific account or the card is selected.
      // The card/bank exclusions are STATED by ledgerCaveat ("Card
      // transactions are hidden: a payee filter has nothing to match on a
      // card statement") and were never actually applied - a payee drill
      // listed every card row underneath the one payee's bank rows, so the
      // list did not show what was clicked. The claim and the filtering now
      // come from the same two predicates.
      const cardRowsForLedger = isOneBank || cardRowsInapplicable() ? [] : visibleRows();
      const bankRowsForLedger = bankRowsInapplicable() ? [] : visibleBankRows(bankRecs);
      const onlyHiddenTransfers = isOneBank && !cardRowsForLedger.length && !bankRowsForLedger.length && bankRecs.length > 0 && bankRecs.every((r) => r.internalTransfer) && state.bankFilter.hideInternal;
      if (reactActive) ledgerStore.set(renderMergedLedger(cardRowsForLedger, bankRowsForLedger, true, onlyHiddenTransfers, categoryProps?.onToggleTransfer));
      else ledgerHost.append(renderMergedLedger(cardRowsForLedger, bankRowsForLedger, false, onlyHiddenTransfers, categoryProps?.onToggleTransfer));
      const q = _txSearch.trim();
      const matched = _ledgerCounts.matched;
      countStore.set(q || _txCategories.size || _txContributionDrill ? `${matched} match${matched === 1 ? '' : 'es'}` : '');
      noteActivityDomRebuilt();
    };
    rebuildLedger();
    return reactActive ? { kind: 'transactions', selector, categoryProps, searchProps, ledgerStore } : wrap;
  }
  function renderActivity(settings = null) {
    trackUsage('view-activity');
    const reactActive = typeof window !== 'undefined' && !!settings;
    guardRerenderedActivityClicks();
    const tabs = renderActivityTabs(reactActive);
    const panel = state.activityTab === 'transactions' ? renderTransactionsTab() : renderAnalysisTab();
    if (reactActive) return activityViewReact(el, { tabs, panel, settings });
    const wrap = el('div', { class: 'accounts-wrap activity-view' });
    wrap.append(tabs, panel);
    return wrap;
  }

  // The Activity cache signature (app.js's mountView keys on this). It must
  // include EVERYTHING that changes what the Transactions tab shows - not just
  // which tab is open. Without the filter/account facets here, a drill into
  // Transactions (a treemap category click, a "where money went" row, an
  // account chip, or the "Show all transactions" clear) mutates state and calls
  // render(), but mountView sees an unchanged signature and reuses stale DOM -
  // exactly the class of bug the goal-draft signature already fixed. Mirrors
  // Right Now's own signature facet set (app.js), so both surfaces rebuild on
  // the same state changes.
  // DERIVED from the filter objects themselves, never a hand-written field
  // list. The registries in app-controller (CARD_FACETS / BANK_FACETS) already
  // carry the rule that "nothing past this point re-lists a field name by
  // hand", and this signature was the one place still doing it - which is why
  // it had silently drifted, missing merchantLabel and payeeLabel. Both are
  // shown in the filter chips, so a drill that changed only the label handed
  // back cached DOM with the previous wording. Reading every own key means a
  // facet added later is in the cache key the moment it exists.
  function facetValues(obj) {
    if (!obj) return '';
    return Object.keys(obj)
      .sort()
      .map((k) => `${k}=${obj[k]}`)
      .join(',');
  }

  function activityTabSignature() {
    return [
      state.activityTab,
      state.bankAccount,
      _txSearch,
      [..._txCategories].sort().join(','),
      _txContributionDrill ? JSON.stringify(_txContributionDrill) : '',
      // The sort is part of what this tab currently SHOWS, so it has to be in
      // the cache key. Without it a sort click set the order, called render(),
      // and got handed back the previously-cached DOM unchanged.
      _txSort.key,
      _txSort.dir,
      _txCollapsed,
      facetValues(state.filter),
      facetValues(state.bankFilter),
      state.showAllTx || state.bankShowAllTx,
    ].join('|');
  }

  return {
    renderActivity,
    createTag,
    renderCommittedFlexible,
    renderSpendBreakdown,
    renderIntentions,
    renderTags,
    activityTabSignature,
    drillToTransaction,
    resetTxSearch,
    setContributionDrill,
    resetActivityViewState,
    activityNavigationState,
    restoreActivityNavigationState,
  };
}
