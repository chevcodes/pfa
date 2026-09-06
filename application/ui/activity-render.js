import { buildDisclosure, collapsibleCard, createDecisionHeader, chartInfo, placeFoldAll, surfaceTone } from './decision-header.js';
import { makeProseMoney } from '../core/money-format.js';
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
} from '../core/shared-helpers.js';
import {
  reviewReasonText,
  appendExpandable,
  renderInsightList,
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
import {
  analyseBankActivity,
  analyseIncomePattern,
  externalOutflowShortlist,
  externalInflowShortlist,
  bankCounterpartyGroups,
  isCardPaymentTransfer,
} from '../analysis/bank-analysis.js';
import { createTreemapRenderer, adaptSpendBreakdownForTreemap } from './treemap-render.js';
import { pairCards, yearSpanLabel } from './chart-helpers.js';
import { markProportional } from '../core/privacy.js';
import { incomeChartModel } from './income-chart-render.js';
import { staggerIn } from './motion.js';
import { renderDonutChart, chartTooltip } from './chart-surface.js';
import { makeRenderIntentions } from './intentions-section.js';

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
const OWN_ACCOUNT_TRANSFER_FILTER = '@own-account-transfers';
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
      'catTag',
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
      'resetCardDrillFacets',
      'drillToTransactions',
      'jump',
      'noteActivityDomRebuilt',
      'balanceUpdates',
    ],
    'createActivityRenderer'
  );  const {
    state,
    balanceUpdates,
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
    catTag,
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
    resetCardDrillFacets,
    drillToTransactions,
    jump,
    // Called after every LOCAL ledger rebuild (search keystroke, category
    // chip), so the view cache's signature keeps describing the DOM it holds.
    // Without it a later render() can decide nothing changed and hand back
    // DOM that no longer matches the state - which is how "Clear all" died.
    noteActivityDomRebuilt,
  } = ctx;
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
    midMonthPace: () => detectMidMonthPace(state.rows, state.cfg, new Date()),
    drillToTransactions,
  });
  const { renderDecisionHeader } = createDecisionHeader({ el });
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
  function resetTxSearch() {
    _txSearch = '';
    // drillToTransaction promises the target row will be visible. A category
    // chip narrows the same list, so it has to go with the search text or the
    // promise only holds when no chip happens to be on.
    _txCategories = new Set();
  }

  function resetActivityViewState() {
    _txSearch = '';
    _txCategories = new Set();
    _txSort = { key: 'date', dir: 'desc' };
    _txCollapsed = false;
  }

  function activityNavigationState() {
    return {
      search: _txSearch,
      categories: [..._txCategories].sort(),
      sort: { ..._txSort },
      collapsed: _txCollapsed,
    };
  }

  function restoreActivityNavigationState(snapshot) {
    if (!snapshot) return;
    _txSearch = String(snapshot.search || '');
    _txCategories = new Set(Array.isArray(snapshot.categories) ? snapshot.categories : []);
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
  function renderCommittedFlexible() {
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
    const ring =
      totalSpend > 0
        ? renderDonutChart(
            { el, money0 },
            {
              label: 'Fixed and discretionary spending this period',
              total: totalSpend,
              money: money0,
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
            }
          )
        : null;

    return renderDecisionHeader({
      id: 'activity-header',
      class: 'view-activity activity-primary',
      question: 'Where did this period\'s money go?',
      figure: { text: lead.amountText != null ? lead.amountText : '' },
      meaning: lead.label || 'Total spending this period',
      support,
      supportLabel: 'Fixed and discretionary spending',
      extra: ring,
      extraAside: true,
    });
  }

  /* ===================================================================
   * 2) "WHERE IT WENT" - the merged category -> merchant drill. REPLACES
   *    right-now's category + merchant cards (kept uncalled until that swap).
   * =================================================================== */
  function renderSpendBreakdown() {
    const p = resolved();
    if (!p || !p.from || !p.to) return null;
    const prior = previousPeriod ? previousPeriod({ from: p.from, to: p.to }) : null;
    const priorComplete = prior ? isPeriodFullyCovered(prior) : true;
    // m.categories is checked ONLY as a presence guard (no categories with
    // spend -> nothing to show at all) - the array's contents are no longer
    // rendered directly here; the treemap below reads its OWN separately-
    // fetched raw result (spendBreakdownRawFor) instead.
    const m = provenModels.spendBreakdownFor({ from: p.from, to: p.to }, prior, priorComplete);
    if (!m || !m.categories || !m.categories.length) return null;

    const sec = el('div', {});
    sec.append(
      el(
        'div',
        { class: 'vm-lead' },
        el('div', { class: 'vm-number' }, m.total.amountText),

        el('div', { class: 'vm-label' }, m.total.tag)
      )
    );

    // E2: the spending treemap, previewed ABOVE the existing ranked list. Both
    // read spendBreakdownRawFor - the SAME underlying spendBreakdown() run
    // provenModels.spendBreakdownFor already uses for the ranked list above -
    // so the two can never disagree on the numbers, only on presentation.
    // Shape adapter: spendBreakdown()'s raw result nests merchants inside
    // each category (categories[].topMerchants[]) and uses `total` (not
    // `amount`); createTreemapRenderer expects a flat by_category/merchants
    // pair with `amount`. This maps one to the other; it computes nothing new.
    const raw = provenModels.spendBreakdownRawFor({ from: p.from, to: p.to }, prior, priorComplete);
    if (raw && raw.categories && raw.categories.length) {
      // adaptSpendBreakdownForTreemap (treemap-render.js) folds each
      // category's "moreMerchants" remainder into a synthetic "Other
      // places" entry, so sub-tile areas always reconcile to their
      // category's true total - see that function's own comment for the
      // real-world reconciliation bug this closes (a naive top-5-only
      // mapping silently inflated the visible merchants' sub-tiles).
      const { by_category, merchants } = adaptSpendBreakdownForTreemap(raw);
      const tm = renderTreemapCard(
        { by_category, merchants },
        {
          embedded: true,

          // Clicking a block jumps straight to Right Now's "All transactions"
          // section, already filtered to that category.
          onCategory: (name) => {
            if (!applyFilter) return;
            trackUsage('activity-drill-category-treemap');
            drillToTransactions({ category: name });
          },
        }
      );
      if (tm) sec.append(tm);
      // Four figures on this one screen all sound like "money spent", and they
      // measure four different things. The app already states this for one pair
      // (cards-render's "a month is a RATE" note); the same courtesy belongs
      // here, where the donut, the treemap and the commitments card sit within
      // a screen of each other and do not add up to one another.
      if (tm)
        sec.append(
          el(
            'div',
            { style: 'margin:8px 0 0' },
            // Thirty-six words, printed permanently, explaining why three
            // figures on this screen do not add up to one another. It is worth
            // saying - but only to someone who has noticed the discrepancy and
            // gone looking. Behind the app's one ⓘ, it is there for them and
            // silent for everyone else.
            chartInfo(el, 'Why these totals differ', [
              el(
                'p',
                { style: 'margin:0 0 8px' },
                'This picture counts categorised spending only, so it is lower than "Discretionary spending" above - that figure also counts transfers out and money moved into savings.'
              ),
              el(
                'p',
                { style: 'margin:0' },
                '"Fixed expenses" is a monthly rate across all your history, not this period.'
              ),
            ])
          )
        );
    }

    // The ranked per-category list (and its merchant drill-down) has been
    // removed. Its roles now live on the treemap itself: the trend-vs-prior
    // signal is an arrow on each tile's share line and the tone behind it,
    // and the share percentage is printed there too - the tile area says
    // which category is bigger, the number says by how much, which area
    // alone cannot. Both reuse the SAME guarded comparison via the shared
    // describeComparisonText/comparisonTone exports (spend-breakdown.js),
    // never a second, independently-worded copy. Merchant detail is on the
    // tile as well, revealed while a category is hovered or focused.
    // Per-merchant drill-down is unaffected - clicking a category tile still
    // opens that category's transactions (drillToTransactions, below).
    const largest = m.categories[0];
    return collapsibleCard(el, {
      title: 'Where it went',
      icon: icon(iconPie()),
      summary: `Largest: ${largest.name}, ${prose(largest.amount)}`,
      body: sec,
      name: 'activity-where-it-went',
    });
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

  function renderTagForm() {
    const nameInput = el('input', {
      type: 'text',
      class: 'name-field',
      placeholder: 'Custom label name',
      maxlength: '40',
    });
    const targetInput = el('input', {
      type: 'number',
      class: 'name-field',
      placeholder: 'Target (optional)',
      min: '1',
    });
    const confirm = async () => {
      const rawTarget = targetInput.value.trim();
      const target = rawTarget ? Number(rawTarget) : null;
      if (rawTarget && (!Number.isFinite(target) || target <= 0)) {
        toast('Enter a target greater than zero, or leave it blank.');
        targetInput.focus();
        return;
      }
      await createTag(nameInput.value.trim(), target);
      nameInput.value = '';
      targetInput.value = '';
    };
    return el(
      'div',
      {},
      // What a custom label is FOR now sits behind the (i) beside the card's
      // title, not as a permanent line above the form that creates one. The
      // line it replaced had already replaced a duplicate of the button's own
      // words; the explanation itself is worth keeping, just not worth a
      // permanent row above a control a person can already see.
      el(
        'div',
        { class: 'manage-actions compact-form' },
        nameInput,
        targetInput,
        el('button', { class: 'btn sm', onclick: confirm }, 'Create custom label')
      )
    );
  }

  function renderTags() {
    const models = provenModels.tags();
    const sec = el('div', {});

    if (models.length) {
      const list = el('div', { class: 'recurring-list' });
      for (const m of models) {
        const removeBtn = el(
          'button',
          { class: 'btn sm ghost', onclick: () => removeTag(m.id) },
          'Remove'
        );
        if (removeBtn.setAttribute) {
          removeBtn.setAttribute('data-id', m.id);
        }
        list.append(
          el(
            'div',
            { class: 'recurring-row' },
            el('span', { class: 'recurring-name' }, m.name),
            // The count is the way in to the transactions behind it, matching
            // every other count in the app. It was the only place showing
            // "N transactions" with no way to see them.
            m.tag
              ? el(
                  'button',
                  {
                    type: 'button',
                    class: 'vm-tag tone-' + surfaceTone(m.tone) + ' is-drill',
                    title: `Show the transactions labelled ${m.name}`,
                    onclick: () => {
                      trackUsage('activity-drill-tag');
                      openTransactionsForSearch(m.name);
                    },
                  },
                  m.tag
                )
              : el('span', {}),
            el('span', { class: 'recurring-amt num' }, m.amountText),
            removeBtn
          )
        );
      }
      sec.append(list);
    }

    sec.append(renderTagForm());
    return collapsibleCard(el, {
      title: 'Custom labels',
      icon: icon(iconList()),
      explain: 'Group spending that belongs together but spans categories and months - a renovation, a holiday, a trip.',
      summary: models.length ? `${models.length} label${models.length === 1 ? '' : 's'}` : 'None yet',
      body: sec,
      name: 'activity-custom-labels',
    });
  }

  /* Open the Transactions list filtered to a search term. The transaction
   * search already matches custom-label names, so a label drill is the same
   * mechanism a person would use by hand - not a second, parallel filter that
   * could disagree with it. */
  function openTransactionsForSearchRaw(term) {
    _txSearch = String(term || '');
    state.activityTab = 'transactions';
    render();
    smoothScrollToEl('#tx-search');
  }
  const openTransactionsForSearch = jump(openTransactionsForSearchRaw);

  function validSplitFor(row) {
    const split = splitsByTxnId(state.transactionSplits || []).get(row.id);
    return split && validateSplit(split, row.amount).ok ? split : null;
  }

  // How many custom labels this transaction belongs to (0 = none), for
  // the row's membership marker. Reads state.tags' txnIds directly - the same
  // membership the Custom labels card totals from - so a marker here can never
  // disagree with a label's own count.
  function tagCountFor(row) {
    let n = 0;
    for (const t of state.tags || []) if ((t.txnIds || []).includes(row.id)) n++;
    return n;
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
      add(name === OWN_ACCOUNT_TRANSFER_FILTER ? 'Own-account transfers' : name, () => {
        _txCategories.delete(name);
        if (name === OWN_ACCOUNT_TRANSFER_FILTER) state.bankFilter.hideInternal = true;
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
    _txCategories = new Set();
    state.bankAccount = 'all';
    state.showAllTx = false;
    state.bankShowAllTx = false;
    render();
  }

  // The caveat that used to BE the clear affordance. It explains why one
  // ledger is missing from a narrowed list; it is not the way out.
  function ledgerCaveat() {
    if (bankRowsInapplicable()) {
      return 'Bank transactions are hidden: a category, place or review filter has nothing to match on a bank statement.';
    }
    if (cardRowsInapplicable()) {
      return 'Card transactions are hidden: a payee filter has nothing to match on a card statement.';
    }
    return null;
  }

  function renderFilterBar() {
    const chips = activeFilterChips();
    if (!chips.length) return null;
    const bar = el('div', {
      class: 'txfilter',
      role: 'region',
      'aria-label': 'Filters applied to these transactions',
    });
    const list = el('div', { class: 'txfilter-chips' });
    for (const chip of chips) {
      list.append(
        el(
          'button',
          {
            type: 'button',
            class: 'txfilter-chip',
            'aria-label': `Remove filter: ${chip.label}`,
            onclick: () => {
              trackUsage('activity-clear-one-facet');
              chip.clear();
            },
          },
          el('span', {}, chip.label),
          el('span', { class: 'txfilter-x', 'aria-hidden': 'true' }, '\u00d7')
        )
      );
    }
    bar.append(list);
    bar.append(
      el(
        'button',
        { type: 'button', class: 'btn sm ghost txfilter-clear', onclick: clearEveryFilter },
        'Clear all'
      )
    );
    const caveat = ledgerCaveat();
    if (caveat) bar.append(el('p', { class: 'txfilter-caveat muted small' }, caveat));
    return bar;
  }

  function ledgerIsNarrowed() {
    // _txSearch is this tab's OWN search box and lives in module scope, so the
    // shared state-based check cannot see it. Without it the card head read
    // "All transactions" over a search showing zero rows.
    return ledgerIsNarrowedPure(state) || _txSearch.trim() !== '' || _txCategories.size > 0;
  }

  // What a bank row is called on screen. transactionName() already prefers the
  // row's parsed narrative, which arrives finished - parsed, cased and
  // comma-cut - so it must NOT be run back through cleanCounterparty(): that
  // would strip the very "Transfer to" the narrative just built. The
  // cleanCounterparty fallback stays for a row that has no narrative.
  function bankRowName(r) {
    return r && r.narrative ? transactionName(r) : cleanCounterparty(transactionName(r));
  }

  // Custom label names a transaction belongs to, lowercased, for search matching
  // - so typing a label's name surfaces its members (the plan's "search across ... label"
  // clause), reading the same state.tags membership the marker and Custom labels card use.
  function tagNamesFor(row) {
    const names = [];
    for (const t of state.tags || [])
      if ((t.txnIds || []).includes(row.id)) names.push(String(t.name || '').toLowerCase());
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
      (_txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER) && m.row.internalTransfer) ||
      _txCategories.has(m.row.category)
    );
  }

  // Written by renderMergedLedger, read by the live count beside the search
  // box: the true size of the result, before the ten-row display cap.
  let _ledgerCounts = { matched: 0, total: 0 };

  function renderMergedLedger(cardRows, bankRecs) {
    const q = _txSearch.trim().toLowerCase();
    const all = [
      ...cardRows.map((r) => ({ ledger: 'card', date: r.date, row: r })),
      ...bankRecs.map((r) => ({ ledger: 'bank', date: r.date, row: r })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const totalCount = all.length;
    const narrowed = q || _txCategories.size;
    const merged = narrowed
      ? all.filter((m) => matchesSearch(m, q) && matchesCategories(m))
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
    const sec = el('section', { class: 'card', id: 'acct-tx', tabindex: '-1' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el(
          'h3',
          { class: 'card-title' },
          icon(iconList()),
          // The head used to read "All transactions" over a ten-row slice of
          // one category. It now says which it is.
          ledgerIsNarrowed() ? 'Matching transactions' : 'All transactions'
        )
      )
    );

    const filterBar = renderFilterBar();
    if (filterBar) sec.append(filterBar);

    // Escape clears the whole narrow from anywhere in this card - the way out
    // of a filtered list should not require finding a control. Ignored while
    // a row detail is open (that Escape closes the row first) and while a
    // text field has focus, so it never eats a field's own Escape.
    if (filterBar) {
      sec.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return;
        const t = e.target;
        if (t && t.closest && t.closest('.tx-detail, input, textarea, select')) return;
        e.preventDefault();
        clearEveryFilter();
      });
    }

    // Nothing matched. A bare table head over an empty body reads as a
    // rendering fault; this says what happened and offers the way back in the
    // same place the filters are named.
    if (!merged.length) {
      sec.append(
        el(
          'div',
          { class: 'tx-empty' },
          el('p', { class: 'tx-empty-lead' }, 'No transactions match these filters.'),
          el(
            'button',
            { type: 'button', class: 'btn sm', onclick: clearEveryFilter },
            'Clear all filters'
          )
        )
      );
      return sec;
    }

    /*
     * WHAT THIS COLUMN SET SHOULD BE, decided from the rows actually in view.
     *
     * Ledger: a filtered list is very often one ledger end to end (a category
     * drill can only match card rows), and a column repeating "Card" forty
     * times is pure noise. It is dropped when there is nothing to tell apart,
     * and the single value is said once beneath the table instead.
     *
     * Currency: the header hard-coded the base currency code while a card
     * ledger can hold foreign rows, so a mixed column claimed to be all JMD.
     * The code is only printed when every row in view genuinely is that code.
     */
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

    const sortable = (key, label, cls) => {
      const active = _txSort.key === key;
      const arrow = active ? (_txSort.dir === 'asc' ? ' \u2191' : ' \u2193') : '';
      return el(
        'th',
        {
          class: (cls ? cls + ' ' : '') + 'tx-sort' + (active ? ' is-active' : ''),
          'aria-sort': active ? (_txSort.dir === 'asc' ? 'ascending' : 'descending') : 'none',
        },
        el(
          'button',
          {
            type: 'button',
            class: 'tx-sort-btn',
            'aria-label': `Sort by ${label}`,
            onclick: () => {
              trackUsage('activity-sort-transactions');
              _txSort =
                _txSort.key === key
                  ? { key, dir: _txSort.dir === 'asc' ? 'desc' : 'asc' }
                  : { key, dir: key === 'date' || key === 'amount' ? 'desc' : 'asc' };
              render();
            },
          },
          label + arrow
        )
      );
    };

    const table = el('table', { class: 'grid tx' });
    table.append(
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          sortable('date', 'Date'),
          sortable('description', 'Description'),
          showLedgerCol ? sortable('ledger', 'Ledger') : null,
          sortable('amount', allBaseCurrency ? `Amount (${baseCode})` : 'Amount', 'num')
        )
      )
    );
    const body = el('tbody');
    // The fuller detail behind each row - raw statement text, the account
    // tail, the transaction's kind - kept off the row itself (which stays a
    // scannable single line) and revealed only when a person opens it.
    // Reuses .tx-detail/.detail-grid, the same "opened row detail" language
    // the account ledger's own detail rows already use elsewhere.
    function buildDetailRow(m) {
      const r = m.row;
      const rows = [];
      rows.push(['Statement text', r.description || '']);
      if (m.ledger === 'card') {
        if (r.raw_description && r.raw_description !== r.description)
          rows.push(['Full statement line', r.raw_description]);
        if (r.kind) rows.push(['Type', r.kind]);
      } else if (r.account) {
        const tail = `\u2026${String(r.account).slice(-4)}`;
        const friendly = accountName(state.accountNames, 'bank', r.account);
        rows.push(['Account', friendly ? `${friendly} (${tail})` : tail]);
        // A bank statement already carries its own printed running balance
        // per row (r.balanceAfter) - the one already reconciled and trusted
        // for bank-statement reconciliation elsewhere in this app. Surfacing
        // it here is a plain read, not a new calculation.
        if (r.balanceAfter != null) rows.push(['Balance after', bankMoney(r.balanceAfter)]);
      }
      const grid = el('div', { class: 'detail-grid' });
      for (const [k, v] of rows) {
        if (!v) continue;
        grid.append(
          el(
            'div',
            {},
            el('div', { class: 'kv-k muted small' }, k),
            el('div', { class: 'kv-v' }, String(v))
          )
        );
      }
      // Must track the REAL column count: the Ledger column is dropped when
      // every row shares one ledger, so a hard-coded 4 over-spans a
      // three-column table and pulls the detail cell past the last header.
      const tr = el('tr', { class: 'tx-detail', hidden: '' });
      tr.append(el('td', { colspan: colCount }, grid));
      return tr;
    }
    // Wires a row to its detail row: click (outside any inner button) or
    // Enter/Space toggles both the visible open state and aria-expanded, so
    // a row's fuller detail is one click or keypress away without disturbing
    // any of the row's own inline controls (category, tag, drill).
    function attachRowToggle(mainTr, detailTr) {
      mainTr.classList.add('clickable');
      mainTr.tabIndex = 0;
      mainTr.setAttribute('role', 'button');
      mainTr.setAttribute('aria-expanded', 'false');
      const setOpen = (open) => {
        mainTr.classList.toggle('open', open);
        detailTr.hidden = !open;
        mainTr.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      const toggle = () => setOpen(!mainTr.classList.contains('open'));
      mainTr.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('button')) return;
        toggle();
      });
      mainTr.addEventListener('keydown', (e) => {
        if (e.target !== mainTr) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
      // An opened row could only be closed by knowing that clicking it again
      // does that. The detail now carries its own visible way out, and Escape
      // closes it from anywhere inside - returning focus to the row it came
      // from, so keyboard position is never lost.
      const closeBtn = el(
        'button',
        {
          type: 'button',
          class: 'btn sm ghost tx-detail-close',
          onclick: () => {
            setOpen(false);
            if (mainTr.focus) mainTr.focus();
          },
        },
        'Close'
      );
      const holder = detailTr.querySelector ? detailTr.querySelector('.detail-grid') : null;
      if (holder && holder.parentNode && holder.parentNode.append) {
        holder.parentNode.append(closeBtn);
      }
      detailTr.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        setOpen(false);
        if (mainTr.focus) mainTr.focus();
      });
    }
    const renderMergedRow = (m) => {
      if (m.ledger === 'card') {
        const r = m.row;
        const reason = reviewReasonText(r, FALLBACK());
        const split = validSplitFor(r);
        const nameCell = el(
          'td',
          {},
          // ONE meaning for the transaction name, on both ledgers.
          //
          // Card and bank rows sit next to each other in this list and their
          // name buttons are pixel-identical - same class, same inline style,
          // same blue, same weight, and neither carried a title. They did
          // entirely different things: a card name opened the "Change category"
          // modal, a bank name navigated away to that payee's transactions.
          // Nothing on screen or in the accessibility tree told you which you
          // were about to get.
          //
          // The name now means "show me this payee" on both. Changing a
          // category moves to the category tag below - which is what catTag's
          // onclick support was built for, and which no call site had ever
          // used, leaving both the affordance and its CSS dead. Tapping the
          // word "To review" to fix a review is also more discoverable than
          // tapping the merchant name and hoping.
          el(
            'button',
            {
              class: 'linkbtn',
              style: 'padding:0;font-weight:600',
              title: `Show ${r.displayName || r.description} transactions`,
              onclick: () => {
                trackUsage('activity-drill-payee');
                openTransactionsForSearch(r.displayName || r.description);
              },
            },
            r.displayName || r.description
          ),
          el(
            'div',
            { class: 'muted small', style: 'margin-top:2px' },
            // The category tag becomes the category control. catTag renders a
            // real button the moment it is given an onclick - a capability no
            // call site had ever used, so both the affordance and its CSS
            // (button.cat-tag-btn) sat dead while the merchant name carried the
            // job instead.
            catTag(r.category, {
              onclick: () => {
                trackUsage('activity-open-category');
                openCategoryPicker(r, 'card');
              },
            }),
            split
              ? el(
                  'span',
                  {
                    class: 'vm-tag tone-neutral',
                    title: 'This transaction is distributed across categories',
                    style: 'margin-left:6px',
                  },
                  'Split'
                )
              : null,
            tagCountFor(r) > 0
              ? el(
                  'button',
                  {
                    class: 'vm-tag tone-neutral',
                    title: 'Edit custom labels for this transaction',
                    style: 'margin-left:6px',
                    onclick: () => {
                      trackUsage('activity-open-tag');
                      openTagPicker(r);
                    },
                  },
                  `Custom label${tagCountFor(r) > 1 ? ` \u00d7${tagCountFor(r)}` : ''}`
                )
              : el(
                  'button',
                  {
                    // An icon, not a repeated sentence: "+ Custom label" appeared once
                    // per row down a 42-row list - the same three words 42 times,
                    // each a small box competing with the transaction beside it. The
                    // action is unchanged; only its footprint is. The name lives in
                    // title + aria-label, so it is still announced and still
                    // reachable by keyboard.
                    class: 'row-tag-action is-icon',
                    title: 'Add this transaction to a custom label',
                    'aria-label': 'Add this transaction to a custom label',
                    onclick: () => {
                      trackUsage('activity-open-tag');
                      openTagPicker(r);
                    },
                  },
                  el('span', { class: 'row-tag-ic', html: iconLabel() })
                )
          ),
          reason ? el('div', { class: 'muted small' }, reason) : null
        );
        // Every row now carries a stable, addressable id - previously
        // nothing in this table could be referenced from outside it, which
        // was the actual prerequisite gap behind "clicking through lands
        // near a transaction, not on it". isFocused marks the ONE row a
        // drillToTransaction call just asked for, pre-opening its detail and
        // giving it a brief highlight, rather than requiring a second,
        // separate click after landing here.
        const rowKey = m.ledger + ':' + r.id;
        const isFocused = rowKey === focusKey;
        const mainTr = el(
          'tr',
          {
            class: 'tx-row' + (isFocused ? ' open focus-row' : ''),
            id: 'tx-' + m.ledger + '-' + r.id,
          },
          el('td', { class: 'nowrap' }, formatDisplayDate(r.date)),
          nameCell,
          showLedgerCol ? el('td', {}, 'Card') : null,
          el(
            'td',
            { class: 'num amt ' + (r.amount < 0 ? 'credit' : '') },
            (r.amount < 0 ? '+' : '-') + money0(Math.abs(r.amount))
          )
        );
        const detailTr = buildDetailRow(m);
        detailTr.id = 'tx-detail-' + m.ledger + '-' + r.id;
        if (isFocused) detailTr.hidden = false;
        attachRowToggle(mainTr, detailTr);
        if (isFocused) mainTr.setAttribute('aria-expanded', 'true');
        const frag = document.createDocumentFragment();
        frag.append(mainTr, detailTr);
        return frag;
      }
      const r = m.row;
      const label = r.household ? 'Household' : r.excludedFromIncome ? 'Not yet income' : '';
      const bankTagCtrl =
        tagCountFor(r) > 0
          ? el(
              'button',
              {
                class: 'vm-tag tone-neutral',
                title: 'Edit custom labels for this transaction',
                style: 'margin-left:6px',
                onclick: () => {
                  trackUsage('activity-open-tag');
                  openTagPicker(r);
                },
              },
              `Custom label${tagCountFor(r) > 1 ? ` \u00d7${tagCountFor(r)}` : ''}`
            )
          : el(
              'button',
              {
                // An icon, not a repeated sentence: "+ Custom label" appeared once
                // per row down a 42-row list - the same three words 42 times,
                // each a small box competing with the transaction beside it. The
                // action is unchanged; only its footprint is. The name lives in
                // title + aria-label, so it is still announced and still
                // reachable by keyboard.
                class: 'row-tag-action is-icon',
                title: 'Add this transaction to a custom label',
                'aria-label': 'Add this transaction to a custom label',
                onclick: () => {
                  trackUsage('activity-open-tag');
                  openTagPicker(r);
                },
              },
              el('span', { class: 'row-tag-ic', html: iconLabel() })
            );
      // Bank rows now share the card branch's name-cell shape - a name line,
      // then one meta line beneath it for whatever badges apply - so a mixed
      // list of card and bank rows reads as one row family, not two.
      const nameCell = el(
        'td',
        {},
        el(
          'button',
          {
            class: 'linkbtn',
            style: 'padding:0;font-weight:600',
            // Says what it does, like its card-row twin. The two buttons are
            // pixel-identical and adjacent in one list; the name is the only
            // thing distinguishing them, so the action has to be announced.
            title: `Show ${bankRowName(r)} transactions`,
            onclick: () => {
              trackUsage('activity-drill-payee');
              drillToAccountsPayee(r.counterpartyKey, cleanCounterparty(r.counterpartyLabel));
            },
          },
          // Same field choice the dialogs use, so the row and the dialog it
          // opens can never name the transaction differently.
          bankRowName(r)
        ),
        el(
          'div',
          { class: 'muted small', style: 'margin-top:2px' },
          // The SAME category badge a card row gets, and now the same door.
          // A bank category is still DERIVED, not chosen - it comes from the
          // rules engine at render time - so the tag used to be an inert span
          // that said so and nothing else. But a bank row has more to settle
          // than a card row does: whether the money moved between the person's
          // own accounts, whether it was income, whether the payment is a
          // fixed commitment, whether the account it went to is savings. Those
          // are all "how is this treated" questions, which is what a person
          // already taps this tag to answer, so the tag opens them rather than
          // a second control appearing beside it.
          catTag(r.category, {
            onclick: () => {
              trackUsage('activity-open-classification');
              openCategoryPicker(r, 'bank');
            },
          }),
          label ? el('span', { class: 'vm-tag tone-neutral' }, label) : null,
          bankTagCtrl
        )
      );
      const rowKey = m.ledger + ':' + r.id;
      const isFocused = rowKey === focusKey;
      const mainTr = el(
        'tr',
        {
          class: 'tx-row' + (isFocused ? ' open focus-row' : ''),
          id: 'tx-' + m.ledger + '-' + r.id,
        },
        el('td', { class: 'nowrap' }, formatDisplayDate(r.date)),
        nameCell,
        showLedgerCol
          ? el('td', {}, r.account ? bankLedgerLabel(r.account) : 'Bank')
          : null,
        el(
          'td',
          { class: 'num amt ' + (r.direction === 'in' ? 'credit' : '') },
          (r.direction === 'in' ? '+' : '-') + bankMoney(Math.abs(r.amount))
        )
      );
      const detailTr = buildDetailRow(m);
      detailTr.id = 'tx-detail-' + m.ledger + '-' + r.id;
      if (isFocused) detailTr.hidden = false;
      attachRowToggle(mainTr, detailTr);
      if (isFocused) mainTr.setAttribute('aria-expanded', 'true');
      const frag = document.createDocumentFragment();
      frag.append(mainTr, detailTr);
      return frag;
    };
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
    // Expansion is recorded in STATE, not just inside the helper. It used to
    // live only in appendExpandable's own closure, so any re-render threw it
    // away - open all 52 rows, sort a column, and you were silently back to
    // ten. Sorting a long list is precisely when it has been expanded, so the
    // two features were working against each other.
    //
    // initial stays at 10 so the See/Hide controls always exist; expandAll
    // restores the open state on rebuild. onExpandChange is the hook this
    // helper already exposed for exactly this and had no caller for.
    appendExpandable(el, body, merged, renderMergedRow, {
      initial: 10,
      expandAll: showAll,
      onExpandChange: (open) => {
        trackUsage('activity-tx-expand');
        _txCollapsed = !open;
        state.showAllTx = open;
        state.bankShowAllTx = open;
        render();
      },
      wrapToggle: (controls) => el('tr', {}, el('td', { colspan: colCount }, controls)),
    });
    table.append(body);
    // Plain table-wrap (no 'sticky'): the sticky variant traps rows in a fixed-
    // height inner scroll (max-height: min(72vh,860px)), which doubled the
    // See-more / See-all paradigm - two scroll models for one list. The list
    // now grows with its rows and is governed solely by See-more / See-all, one
    // paradigm. The merch table (cards-render) already uses plain table-wrap, so
    // this is isolated to the merged ledger.
    sec.append(el('div', { class: 'table-wrap' }, table));
    // SAYS WHAT IT COUNTS. "52 transactions." sat on the same tab as the
    // treemap's "34 card transactions" with no way to tell why they differ -
    // this list merges both ledgers, that map reads the card only. When the
    // Ledger column has been dropped as redundant, its single value is stated
    // here instead, so the scope is never silently lost with the column.
    const scope = showLedgerCol
      ? 'card and bank'
      : ledgerLabels[0]
        ? ledgerLabels[0].toLowerCase()
        : '';
    // One sentence covering both narrowings, so the list never claims to be
    // filtered by a search alone when chips are also on.
    const narrowingParts = [];
    if (q) narrowingParts.push(`matching "${_txSearch.trim()}"`);
    if (_txCategories.size) {
      const names = [..._txCategories].sort();
      narrowingParts.push(
        names.length === 1 ? `in ${names[0]}` : `in ${names.length} categories`
      );
    }
    const countText = narrowingParts.length
      ? `Showing ${merged.length} of ${totalCount} transaction${totalCount === 1 ? '' : 's'} ${narrowingParts.join(', ')}`
      : `${merged.length} transaction${merged.length === 1 ? '' : 's'}`;
    sec.append(
      el('p', { class: 'muted small' }, scope ? `${countText} \u00b7 ${scope}.` : `${countText}.`)
    );
    return sec;
  }

  /* TEMPORAL CONTRACT: this is BACKWARD content - the income that has already
     ARRIVED over the past months (the history bars, "your income has been X").
     It belongs in Activity (looking back), not Forecast. Forecast owns the
     FORWARD half - projecting the next deposit and the cash runway - which
     lives in the forecast chart itself, not a card. Same data
     (analyseIncomePattern), two temporal stances, two homes: the past series
     here, the projection there. */
  function renderIncome(income) {
    const hero = buildIncomeHero(income, bankMoney);
    if (!hero) return null;
    const caption = buildIncomeCaption(income);
    const sec = el('div', {});
    const drawn = incomeChartModel(income) || { cells: [] };
    const yr = yearSpanLabel((drawn.cells || []).map((c) => c && c.month));
    if (yr) sec.append(el('div', { class: 'card-head' }, el('span', { class: 'card-period' }, yr)));
    const lead = el(
      'div',
      { class: 'vm-lead' },
      el('div', { class: 'vm-number' }, hero.amountText),
      hero.label ? el('div', { class: 'vm-label' }, hero.label) : null
    );
    const onclick = income.key
      ? () => {
          trackUsage('activity-drill-income');
          drillToAccountsPayee(income.key, cleanCounterparty(income.label));
        }
      : null;
    sec.append(
      onclick
        ? el(
            'button',
            {
              class: 'linkbtn',
              style: 'display:block;text-align:left;padding:0;width:100%',
              onclick,
            },
            lead
          )
        : lead
    );
    if (hero.deltaText)
      sec.append(el('span', { class: 'vm-tag tone-' + surfaceTone(hero.deltaTone) }, hero.deltaText));
    const chart = renderIncomeChart(
      income,
      income.key
        ? {
            onMonth: (month) => {
              trackUsage('activity-drill-income');
              openMonth(month);
              drillToAccountsPayee(income.key, cleanCounterparty(income.label));
            },
          }
        : {}
    );
    if (chart) sec.append(chart);
    // Same "Why ›" control the rest of this tab uses. This card previously
    // reached for the chart-side "Income details ⓘ" popover, so one screen
    // offered two different affordances for the same request.
    if (caption) sec.append(buildDisclosure(el, 'Why', [el('p', {}, caption)]));
    const usual =
      income.typicalAmount != null && income.stepChange === 'up'
        ? `, above usual ${prose(income.typicalAmount)}`
        : income.typicalAmount != null && income.stepChange === 'down'
          ? `, below usual ${prose(income.typicalAmount)}`
          : '';
    return collapsibleCard(el, {
      title: 'Your income pattern',
      icon: icon(iconSpark()),
      summary: `Latest ${prose(income.lastAmount)}${usual}`,
      body: sec,
      name: 'activity-income',
    });
  }

  function renderMergedPlaces(cardRows, bankRecs) {
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
    const sec = el('div', {});
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

    const list = el('div', { class: 'recurring-list' });
    const tips = chartTooltip(el, sec);
    const bars = [];
    const renderRow = (g) => {
      const width = Math.max(2, Math.round((g.amount / biggest) * 100));
      const fill = el('span', { class: 'rank-bar-fill', style: `width:${width}%` });
      bars.push(fill);
      // Total alone cannot separate one big purchase from a habit. The
      // average per visit is the distinction the card ledger's own explainer
      // already draws ("a high Times with a low Average is everyday
      // spending"), so the row carries it on hover rather than printing a
      // fourth number on every line.
      const detail = [
        g.label,
        money0(g.amount),
        `${g.count} transaction${g.count === 1 ? '' : 's'}`,
        g.count > 1 ? `${money0(g.amount / g.count)} each on average` : null,
      ].filter(Boolean);
      const row = el(
        'button',
        { class: 'rank-row', onclick: () => drillPlace(g) },
        el(
          'span',
          { class: 'rank-name' },
          el('span', { class: 'commit-name-main' }, g.label),
          el(
            'span',
            { class: 'commit-name-sub muted small', style: 'margin-left:6px' },
            `\u00b7 ${g.count} transaction${g.count === 1 ? '' : 's'}`
          )
        ),
        el('span', { class: 'rank-amt num strong' }, money0(g.amount)),
        // The bar's WIDTH encodes the amount, so it declares itself to the
        // privacy contract and is withdrawn with the figures rather than
        // leaving relative spend legible with every number masked.
        markProportional(el('span', { class: 'rank-bar' }, fill))
      );
      tips.bind(row, detail);
      return row;
    };
    appendExpandable(el, list, merged, renderRow, { initial: 5 });
    sec.append(list);
    staggerIn(bars, () => [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      step: 40,
      duration: 460,
    });
    return collapsibleCard(el, {
      title: 'Biggest payments',
      icon: icon(iconList()),
      summary: `Largest: ${merged[0].label}, ${prose(merged[0].amount)}`,
      body: sec,
      name: 'activity-biggest-payments',
    });
  }

  function renderMergedInsights(a, cardRows, bankRecs) {
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
      drillToTransactions({ category: 'all' })
    );
    const merged = rankInsights(
      [...cardInsights, ...bankInsights],
      (state.cfg.insights && state.cfg.insights.maxInsights) || 3
    );
    return renderInsightList(el, icon, {
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


  function renderActivityTabs() {
    const ids = ['analysis', 'transactions'];
    const labels = { analysis: 'Analysis', transactions: 'Transactions' };
    const strip = el('div', {
      class: 'ledger-tabs activity-tabs',
      role: 'tablist',
      'aria-label': 'Activity views',
    });
    const activate = (id) => {
      if (state.activityTab === id) return;
      state.activityTab = id;
      trackUsage('activity-tab-' + id);
      render();
      requestAnimationFrame(() => document.getElementById('activity-tab-' + id)?.focus());
    };
    const mkTab = (id) =>
      el(
        'button',
        {
          id: 'activity-tab-' + id,
          class: 'ledger-tab' + (state.activityTab === id ? ' active' : ''),
          role: 'tab',
          tabindex: state.activityTab === id ? '0' : '-1',
          'aria-selected': state.activityTab === id ? 'true' : 'false',
          'aria-controls': 'activity-panel',
          onclick: () => activate(id),
        },
        labels[id]
      );
    strip.append(...ids.map(mkTab));
    strip.addEventListener('keydown', (e) => {
      const current = ids.indexOf(state.activityTab);
      let next = current;
      if (e.key === 'ArrowRight') next = (current + 1) % ids.length;
      else if (e.key === 'ArrowLeft') next = (current - 1 + ids.length) % ids.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = ids.length - 1;
      else return;
      e.preventDefault();
      activate(ids[next]);
    });

    return strip;
  }

  function renderAnalysisTab() {
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

    if (a && cardRows.length) {
      // Spending over time + Spent abroad: two spending-history cards, paired.
      const trendCard = renderTrend(a);
      const foreignCard = renderForeign(a);
      pairCards(wrap, trendCard, foreignCard);
    }

    const fitnessCard = renderCardFitness();
    if (fitnessCard) wrap.append(fitnessCard);

    // Category ceilings + Tags: two authoring forms, paired.
    const ci = renderIntentions();
    const tg = renderTags();
    pairCards(wrap, ci, tg);

    if (wrap.childElementCount === 0) {
      wrap.append(
        el(
          'section',
          { class: 'card empty' },
          el('h2', {}, 'Nothing to analyse yet'),
          el(
            'p',
            { class: 'muted' },
            'Import a statement and this period\u2019s spending analysis appears here.'
          )
        )
      );
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

  function renderAccountSelector(explain) {
    // ONE meaning for every figure in this strip.
    //
    // These chips used to read ov.accounts, which is built from
    // bankRecordsInPeriod - the SELECTED period - while the "All bank accounts"
    // tile two lines below reads the unfiltered set. Same row, two different
    // questions, neither labelled: an account showed its period-END balance
    // ($944,106.45 at 25 June) beside a total showing the LATEST balance
    // ($1,052,352.71 at 31 July). Both figures were correct; nothing said they
    // were answering different questions, so they read as a contradiction.
    //
    // The strip is a filter control, and its subtitle is "how much is in here
    // now" - the same question Position answers. All figures in it now come
    // from the unfiltered ledger, matching the total that was already doing so,
    // and the strip states the date they are all as of.
    const bankAccounts = analyseBankActivity(classifiedBank()).accounts || [];
    // The card joins this same selector as a genuine third state, not a
    // second, disconnected picker - a person cycles through "All", each bank
    // account, and the card in one row. Shown whenever there is more than one
    // thing to choose between: either multiple bank accounts, or a card
    // alongside even a single bank account.
    const pm = provenModels.positionModels();
    const cardBalance = pm && pm.cashDebt ? pm.cashDebt.cardBalance : null;
    const hasCard = cardBalance != null;
    if (bankAccounts.length < 2 && !hasCard) return null;

    const current = state.bankAccount || 'all';
    const bankTotal = analyseBankActivity(classifiedBank()).closingBalance;

    const sec = el('div', { class: 'acct-slicer-card' });
    const slicer = el('div', {
      class: 'acct-slicer',
      'aria-label': 'Filter transactions by account or card',
    });
    // One scrolling row on a phone; the fade says which way there is more.
    markScrollAffordance(slicer);

    function select(value) {
      if (current === value) return;
      resetBankDrillFacets();
      state.bankAccount = value;
      state.bankShowAllTx = true;
      state.showAllTx = true;
      trackUsage('activity-select-account');
      render();
    }
    const tile = (value, name, sub, owe) =>
      el(
        'button',
        {
          class: 'acct-chip' + (current === value ? ' active' : ''),
          'aria-pressed': current === value ? 'true' : 'false',
          onclick: () => select(value),
        },
        el('span', { class: 'acct-chip-name' }, name),
        el('span', { class: 'acct-chip-sub' + (owe ? ' owe' : '') }, sub)
      );

    // With one bank account, "All bank accounts" and that account carry the
    // SAME balance, so the strip opened with two tiles showing an identical
    // figure and no way to tell what distinguished them. The "all" tile only
    // earns its place once it genuinely aggregates more than one account -
    // or once the card is beside it and "all bank" means something the
    // individual tiles do not.
    if (bankAccounts.length > 1 || hasCard) {
      slicer.append(tile('all', 'All bank accounts', bankMoney(bankTotal)));
    }
    for (const a of bankAccounts) {
      slicer.append(
        tile(a.account, accountChipLabel(a.account, bankAccounts), bankMoney(a.closingBalance))
      );
    }
    if (hasCard) {
      // Never folded into "All accounts": a card balance is money OWED, the
      // opposite direction a bank balance moves in, and this app never
      // silently nets debt against cash into one blended figure anywhere
      // else (Position's own "Cash and debt" card keeps them separate for
      // the identical reason). The card stays its own tile with its own
      // figure - signed, warm-toned - so the reversed direction is
      // unmistakable without adding any explanatory text to what is meant
      // to stay a quick, scannable strip.
      slicer.append(tile('card', 'Credit card', '-' + bankMoney(Math.abs(cardBalance)), true));
    }
    sec.append(slicer);

    const filtered = current !== 'all';
    const activeLabel =
      current === 'card'
        ? 'Credit card only'
        : filtered
          ? `${accountName(state.accountNames, 'bank', current) || `Account ${String(current).slice(-4)}`} only`
          : 'All accounts';
    return collapsibleCard(el, {
      title: 'Filter by account',
      explain,
      summary: activeLabel,
      body: sec,
      // A filter toggle, not a section. Sized to its own words rather than
      // stretched to the full width of the list it filters - it was reading as
      // heavier than the transactions beneath it.
      name: 'account-filter',
      compact: true,
    });
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
    const wrap = el('div', {
      class: 'accounts-wrap activity-transactions',
      id: 'activity-panel',
      role: 'tabpanel',
      'aria-labelledby': 'activity-tab-transactions',
    });
    if (!cardRows.length && !bankRecs.length) {
      wrap.append(
        el(
          'section',
          { class: 'card empty' },
          el('h2', {}, 'Transactions'),
          el('p', { class: 'muted' }, 'Import a statement and your transactions appear here.')
        )
      );
      return wrap;
    }
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
    if (selector) wrap.append(selector);

    // Search: the plan's Transactions spec - find a transaction across its
    // description, category, amount or tag name, LIVE as you type. The input is
    // built ONCE and lives outside the ledger; typing calls a local rebuild that
    // rewrites only the ledger container, never the input, so focus and caret
    // are preserved perfectly - the same reason the category picker filters its
    // list in-place rather than re-rendering the whole view. No render() call.
    const search = el('input', {
      type: 'search',
      id: 'tx-search',
      class: 'f-search',
      placeholder: 'Name, category, amount, or custom label',
      'aria-label': 'Search transactions',
      value: _txSearch,
    });
    const clearSearch = el('button', {
      class: 'btn sm ghost tx-search-clear',
      hidden: _txSearch || _txCategories.size ? null : '',
      type: 'button',
    }, 'Clear');
    // Live feedback beside the box. Typing used to give no answer until you
    // scrolled past the table to the count underneath it - so a search that
    // matched nothing looked like a broken list.
    const searchCount = el('span', {
      class: 'tx-search-count muted small',
      role: 'status',
      'aria-live': 'polite',
    });
    // The count and Clear are ONE group about the search, so they are grouped
    // in the markup too. The row itself is bottom-aligned - the search field is
    // taller than its neighbours because it carries a label - and bottom-
    // aligning a 17px count against a 33px pill lined up their feet rather
    // than their type, leaving "43 matches" sitting low beside "Clear".
    const searchFilters = el(
      'div',
      { class: 'tx-filters' },
      el('label', { class: 'field-label tx-search-field' },
        el('span', {}, 'Search transactions'),
        search
      ),
      el('div', { class: 'tx-search-actions' }, searchCount, clearSearch)
    );

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
    const transferChip = hiddenTransfers
      ? el(
          'button',
          {
            type: 'button',
            class: 'tx-hint-cat' + (_txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER) ? ' is-on' : ''),
            'aria-pressed': _txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER) ? 'true' : 'false',
            title: 'Money you moved between your own accounts. Left out of spending and income, so hidden unless you ask for it.',
          },
          _txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER)
            ? 'Own-account transfers'
            : `Own-account transfers (${hiddenTransfers})`
        )
      : null;
    if (transferChip)
      transferChip.addEventListener('click', () => {
        if (_txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER))
          _txCategories.delete(OWN_ACCOUNT_TRANSFER_FILTER);
        else _txCategories.add(OWN_ACCOUNT_TRANSFER_FILTER);
        state.bankFilter.hideInternal = !_txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER);
        _txCollapsed = false;
        trackUsage('activity-toggle-own-transfers');
        const on = _txCategories.has(OWN_ACCOUNT_TRANSFER_FILTER);
        transferChip.classList.toggle('is-on', on);
        transferChip.setAttribute('aria-pressed', on ? 'true' : 'false');
        repaintSummary();
        rebuildLedger();
      });

    // ITEM 5 + 7, one line, added ONCE to the shared list so it appears
    // wherever transactions are listed.
    //
    // 5: "+ Custom label" was only discoverable by clicking it and seeing what
    //    happened. Nothing said what it was for.
    // 7: the search box offers to match a category but never shows what the
    //    categories ARE, so recalling one meant leaving the tab for Analysis
    //    and coming back. The names are right here now, and each is a filter.
    // The explanation moved behind the app's one ⓘ. It taught something worth
    // knowing exactly once; printed permanently above a 42-row list it was two
    // lines of prose every visit, for a control the reader had already met.
    // The category chips stay - they are a filter, not an explanation.
    // ONE label above its control, at the same edge as the search block above.
    //
    // This read as two labels sharing a line - "Labels and categories ⓘ" at
    // x=27 and "Categories in use:" floating at x=173, its position decided by
    // however wide the first one happened to be - with the chips it introduces
    // on the line below. Going down the left edge the text landed at 27, then
    // 42, then 27, then 36: four stops in four rows.
    //
    // Now it mirrors "Search transactions" exactly: one label, the ⓘ carrying
    // the explanation, the control directly beneath, both flush left.
    // THE SAME CONTROL AS THE ONE ABOVE IT.
    //
    // Two filters sat one above the other in two different shapes: the account
    // one a closed card that names what is on, the category one a bare label
    // with its ⓘ and a permanently open strip of twenty chips - the widest,
    // busiest thing on the screen, above a list it exists to narrow. Same card
    // now, same ⓘ in the same slot, same remembered open state, and closed it
    // says which categories are on rather than showing all of them.
    const categoryExplain = [
      el(
        'p',
        { style: 'margin:0 0 8px' },
        'Use the label icon on any transaction to file it under a custom label of your own - a renovation, a holiday, anything that spans categories and months.'
      ),
      el(
        'p',
        { style: 'margin:0' },
        'Tap the category under any transaction to change it. On a card transaction you choose whether it applies to that one or to every charge from that place; on an account transaction it always applies to every transaction like it, because that is a rule.'
      ),
    ];

    // "Card Payment" is config.paymentCategory - the marker for money moving
    // from a bank account to pay down the card. It is a TRANSFER, not a place
    // money was spent, and listing it beside Groceries and Dining invites it to
    // be compared with them and quietly pollutes any filter built from this
    // list. Excluded by reading the configured marker rather than by matching
    // its label, so a renamed marker stays excluded.
    const transferMarkers = new Set(
      [
        (state.cfg && state.cfg.special && state.cfg.special.paymentCategory) || 'Card Payment',
      ].filter(Boolean)
    );
    const usedCategories = [
      ...new Set(
        [...(visibleRows() || []), ...(bankRecs || [])]
          .map((r) => r.category)
          .filter((c) => c && !transferMarkers.has(c))
      ),
    ].sort();
    // What the closed card says. Named, like the account filter's "All
    // accounts", so a filter left on two visits ago is visible without
    // opening anything.
    const chosenSummary = () => {
      const on = [..._txCategories].sort();
      const selected = on.map((name) =>
        name === OWN_ACCOUNT_TRANSFER_FILTER ? 'own-account transfers' : name
      );
      const parts = [];
      if (selected.length)
        parts.push(
          selected.length > 2
            ? `${selected.slice(0, 2).join(', ')} and ${selected.length - 2} more`
            : joinWithAnd(selected)
        );
      if (!parts.length) return usedCategories.length ? `All ${usedCategories.length} categories` : 'None yet';
      return joinWithAnd(parts);
    };
    let summaryNode = null;
    const repaintSummary = () => {
      if (summaryNode) summaryNode.textContent = chosenSummary();
    };
    const categoryFilter = el('div', { class: 'tx-categories-filter' });
    if (usedCategories.length) {
      const chips = el('span', { class: 'tx-hint-cats' });
      for (const name of usedCategories) {
        // A TOGGLE, not a shortcut into the search box. Writing the name into
        // the search field meant the second chip replaced the first, so two
        // categories could never be on at once; each chip now owns its own
        // membership in _txCategories and says so with aria-pressed.
        const on = _txCategories.has(name);
        const chip = el(
          'button',
          {
            type: 'button',
            class: 'tx-hint-cat' + (on ? ' is-on' : ''),
            'aria-pressed': on ? 'true' : 'false',
            title: on ? `Stop showing ${name}` : `Also show ${name}`,
          },
          name
        );
        chip.addEventListener('click', () => {
          if (_txCategories.has(name)) _txCategories.delete(name);
          else _txCategories.add(name);
          // A changed question re-opens the list, the same rule typing follows.
          _txCollapsed = false;
          trackUsage('activity-tx-category-chip');
          const pressed = _txCategories.has(name);
          chip.classList.toggle('is-on', pressed);
          chip.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          chip.title = pressed ? `Stop showing ${name}` : `Also show ${name}`;
          clearSearch.hidden = !_txSearch && !_txCategories.size;
          repaintSummary();
          rebuildLedger();
        });
        chips.append(chip);
      }
      if (transferChip) chips.append(transferChip);
      categoryFilter.append(chips);
    } else if (transferChip) {
      categoryFilter.append(el('span', { class: 'tx-hint-cats' }, transferChip));
    }
    const categoryCard = categoryFilter.childNodes.length
      ? collapsibleCard(el, {
          title: 'Categories in use',
          explain: categoryExplain,
          summary: chosenSummary(),
          body: categoryFilter,
          name: 'category-filter',
          compact: true,
        })
      : null;
    if (categoryCard) {
      summaryNode = categoryCard.querySelector('.card-disclosure-note');
      wrap.append(categoryCard);
    }
    wrap.append(searchFilters);

    if (isOneBank) {
      wrap.append(
        el(
          'p',
          { class: 'muted small', style: 'margin:0 0 8px' },
          `Showing ${accountName(state.accountNames, 'bank', selected) || `account ending ${String(selected).slice(-4)}`} only. Card transactions are hidden.`
        )
      );
    } else if (isCard) {
      wrap.append(
        el(
          'p',
          { class: 'muted small', style: 'margin:0 0 8px' },
          'Showing your card only. Bank account transactions are hidden.'
        )
      );
    }

    const ledgerHost = el('div', {});
    wrap.append(ledgerHost);
    const rebuildLedger = () => {
      ledgerHost.textContent = '';
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
      ledgerHost.append(renderMergedLedger(cardRowsForLedger, bankRowsForLedger));
      const q = _txSearch.trim();
      const matched = _ledgerCounts.matched;
      // The live count answers "did what I just did narrow anything", so it
      // has to appear for a chip exactly as it does for a keystroke.
      searchCount.textContent =
        q || _txCategories.size ? `${matched} match${matched === 1 ? '' : 'es'}` : '';
      noteActivityDomRebuilt();
    };
    search.addEventListener('input', () => {
      // A new search is a new question: it re-opens the list rather than
      // inheriting a collapse the person applied to the previous one.
      _txCollapsed = false;
      _txSearch = search.value;
      clearSearch.hidden = !_txSearch && !_txCategories.size;
      trackUsage('activity-tx-search');
      rebuildLedger();
    });
    clearSearch.addEventListener('click', () => {
      _txCollapsed = false;
      _txSearch = '';
      // Clear beside the box clears the whole narrowing, chips included: a
      // control labelled "Clear" that left half the filter on would be lying.
      _txCategories = new Set();
      for (const c of wrap.querySelectorAll('.tx-hint-cat.is-on')) {
        c.classList.remove('is-on');
        c.setAttribute('aria-pressed', 'false');
      }
      search.value = '';
      clearSearch.hidden = true;
      rebuildLedger();
      search.focus();
    });
    rebuildLedger();
    return wrap;
  }
  function renderActivity() {
    trackUsage('view-activity');
    const wrap = el('div', { class: 'accounts-wrap activity-view' });
    guardRerenderedActivityClicks();
    wrap.append(renderActivityTabs());

    wrap.append(
      state.activityTab === 'transactions' ? renderTransactionsTab() : renderAnalysisTab()
    );
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
      // The sort is part of what this tab currently SHOWS, so it has to be in
      // the cache key. Without it a sort click set the order, called render(),
      // and got handed back the previously-cached DOM unchanged.
      _txSort.key,
      _txSort.dir,
      _txCollapsed,
      facetValues(state.filter),
      facetValues(state.bankFilter),
      state.showAllTx,
      state.bankShowAllTx,
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
    resetActivityViewState,
    activityNavigationState,
    restoreActivityNavigationState,
  };
}
