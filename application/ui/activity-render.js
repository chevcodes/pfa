import { buildDisclosure } from './decision-header.js';
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
import { pairCards } from './chart-helpers.js';
import { markProportional } from '../core/privacy.js';
import { staggerIn } from './motion.js';
import { renderDonutChart, chartTooltip } from './chart-surface.js';
import { makeRenderIntentions } from './intentions-section.js';
import { createDecisionHeader } from './decision-header.js';

// Session-only Transactions-tab search text, the same module-scope pattern
// ahead-render.js uses for its own draft state. Folded into activityTabSignature
// so a keystroke rebuilds the ledger; reset naturally on reload.
let _txSearch = '';
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
      'catTag',
      'analysis',
      'renderRecurring',
      'renderForeign',
      'renderCardFitness',
      'renderTrend',
      'renderLedgerReview',
      'renderIncomeChart',
      'overviewModel',
      'iconSpark',
      'iconGap',
      'moneyShort',
      'buildBankInsights',
      'buildInsights',
      'iconBulb',
      'iconChevron',
      'smoothScrollToEl',
      'resetCardDrillFacets',
      'drillToTransactions',
    ],
    'createActivityRenderer'
  );  const {
    state,
    el,
    icon,
    provenModels,
    resolved,
    trackUsage,
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
    catTag,
    analysis,
    renderRecurring,
    renderForeign,
    renderCardFitness,
    renderTrend,
    renderLedgerReview,
    renderIncomeChart,
    overviewModel,
    iconSpark,
    iconGap,
    moneyShort,
    buildBankInsights,
    buildInsights,
    iconBulb,
    iconChevron,
    smoothScrollToEl,
    resetCardDrillFacets,
    drillToTransactions,
  } = ctx;
  const iconInfo = ctx.iconInfo || (() => '');
  const iconPie = ctx.iconPie || iconInfo;
  const iconRepeat = ctx.iconRepeat || iconInfo;
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
    iconRepeat,
    toast,
  });
  const { renderDecisionHeader } = createDecisionHeader({ el });
  const { renderTreemapCard } = createTreemapRenderer({
    el,
    money0,
    catColour,
  });

  // The one place _txSearch is ever cleared from outside this module - a
  // plain reset, so drillToTransaction (below) can genuinely guarantee an
  // empty search before jumping to a specific row, closing the stale-search
  // gap CARD_FACETS/BANK_FACETS never covered (see shared-helpers.js's own
  // comment on why).
  function resetTxSearch() {
    _txSearch = '';
  }

  // Identity-level anchor: jumps straight to and opens ONE specific
  // transaction, rather than narrowing the ledger to a class of rows and
  // leaving a person to find it themselves. Exposed on this factory's
  // return value too, so other renderers (cards-render.js) that reference a
  // single, already-identified transaction can call the same mechanism.
  function drillToTransaction(target) {
    drillToTransactionPure(
      { state, trackUsage, resetCardDrillFacets, resetBankDrillFacets, resetTxSearch, render },
      target
    );
  }
  /* ===================================================================
   * 1) COMMITTED vs FLEXIBLE - the distinctive lens. Reconciling line is
   *    ALWAYS attached beneath the split, never omitted.
   * =================================================================== */
  function renderCommittedFlexible() {
    const p = resolved();
    if (!p || !p.from || !p.to) return null;
    const m = provenModels.committedFlexibleFor({ from: p.from, to: p.to });
    if (!m) return null;

    // ONE primary figure, not three. This card used to print the discretionary
    // pool, the committed total and the discretionary spent as three equal
    // headline numbers in one row - three answers to a question a person only
    // asked once, each as loud as the others, so nothing led. The pool is the
    // decision-useful figure (it is what is left to choose about); the other
    // two are its working and now sit at the supporting size behind their own
    // disclosure, exactly as Overview's cash-on-hand and committed layers do.
    const lead = m.lead || {};
    const tags = [];
    // The reconciling note below already says how the discretionary pool was
    // used ("most of the money you had a choice about went out"), so the tag
    // repeating it as "90% of it spent" said one fact twice in two registers.
    // The tag now carries what the note cannot: how commitments themselves
    // moved, which is the part a person can act on.
    const commitTag = m.committed && m.committed.tag;
    if (commitTag && commitTag !== 'usual') {
      tags.push({ text: `commitments ${commitTag}`, tone: m.committed.tone || 'neutral' });
    } else if (lead.tag) {
      tags.push({ text: lead.tag, tone: lead.tone || 'neutral' });
    }

    const why = [];
    if (lead.detail) why.push(el('p', {}, lead.detail));

    // All THREE slices of the ring, so nothing the picture names is left
    // without a definition. The third slice was previously drawn and never
    // explained, which left the only nearby sentence (discretionary
    // spending's) looking like it described it.
    const support = [m.committed, m.flexibleSpent, m.flexibleKept].filter(Boolean).map((c) => ({
      text: c.amountText,
      label: c.label,
      tag: c.tag,
      tone: c.tone,
      detail: c.detail,
    }));

    // The period's whole story is a genuine part-to-whole - everything that
    // came in either went on commitments, went out by choice, or was still
    // there at the end. Three segments that provably sum to the income is
    // exactly the shape a ring is for, and it gives the headline figure
    // something to be a part OF. Labels come from the model so the ring, the
    // disclosure rows and the prose can never drift apart.
    const committedAmt = m.committed ? Number(m.committed.amount) || 0 : 0;
    const spentAmt = m.flexibleSpent ? Number(m.flexibleSpent.amount) || 0 : 0;
    const poolAmt = Number(lead.amount) || 0;
    const keptAmt = Math.max(0, poolAmt - spentAmt);
    const incomeAmt = committedAmt + poolAmt;
    const ring =
      incomeAmt > 0
        ? renderDonutChart(
            { el, money0 },
            {
              label: 'How this period’s money was used',
              total: incomeAmt,
              money: money0,
              segments: [
                {
                  label: (m.committed && m.committed.label) || 'Committed spending',
                  amount: committedAmt,
                  tone: 'committed',
                },
                {
                  label: (m.flexibleSpent && m.flexibleSpent.label) || 'Discretionary spending',
                  amount: spentAmt,
                  tone: 'out',
                },
                {
                  label: (m.flexibleKept && m.flexibleKept.label) || 'Not spent',
                  amount: keptAmt,
                  tone: 'in',
                },
              ],
              // Compact, like every other ring centre. The exact figure at
              // full precision is wider than the ring's own hole on a phone,
              // so it collided with the track it sits inside; the legend
              // beside it carries every amount in full.
              centre: { value: moneyShort(incomeAmt), label: 'came in' },
            }
          )
        : null;

    return renderDecisionHeader({
      id: 'activity-header',
      class: 'view-activity activity-primary',
      question: 'Where did this period\'s money go?',
      figure: { text: lead.amountText != null ? lead.amountText : '' },
      meaning: lead.label || 'Left after committed spending',
      tags,
      // The reconciling line is NOT optional and never collapses: it is the
      // sentence that ties the three figures together honestly, so it stays on
      // the surface as the header's always-visible note.
      note:
        m.reconciling && m.reconciling.text
          ? { text: m.reconciling.text, tone: m.reconciling.tone || 'neutral' }
          : null,
      why,
      support,
      // Not "committed and discretionary": the split also contains what was
      // KEPT, which is not spending at all. The disclosure is named for what
      // it actually holds - every use the period's money was put to.
      supportLabel: 'How the money was used',
      extra: ring,
      // The ring is compact, so it sits beside the figure and its working on
      // a wide card instead of under them - the lead card is full width and
      // the stacked version left its whole right-hand side empty.
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

    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconPie()), 'Where it went')
      )
    );
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
    return sec;
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
    await Store.tags.put(makeTag({ name, target }));
    state.tags = await Store.tags.all();
    trackUsage('activity-create-tag');
    render();
    toast(`Custom label "${name}" created.`);
  }

  async function removeTag(id) {
    await Store.tags.delete(id);
    state.tags = await Store.tags.all();
    trackUsage('activity-remove-tag');
    render();
    toast('Custom label removed.');
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
      await createTag(nameInput.value.trim(), Number(targetInput.value) || null);
      nameInput.value = '';
      targetInput.value = '';
    };
    return el(
      'div',
      {},
      el('p', { class: 'muted small' }, 'Create a custom label'),
      el(
        'div',
        { class: 'manage-actions' },
        nameInput,
        targetInput,
        el('button', { class: 'btn sm', onclick: confirm }, 'Create custom label')
      )
    );
  }

  function renderTags() {
    const models = provenModels.tags();
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconRepeat()), 'Custom labels')
      )
    );

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
            m.tag
              ? el('span', { class: 'vm-tag tone-' + (m.tone || 'neutral') }, m.tag)
              : el('span', {}),
            el('span', { class: 'recurring-amt num' }, m.amountText),
            removeBtn
          )
        );
      }
      sec.append(list);
    }

    sec.append(renderTagForm());
    return sec;
  }

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
    if (f.foreignOnly) add('Foreign only', () => applyFilter({ foreignOnly: false }));
    if (f.min != null || f.max != null) {
      add('Amount range', () => applyFilter({ min: null, max: null }));
    }
    if (f.search) add(`Matching: ${f.search}`, () => applyFilter({ search: '' }));
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
    return chips;
  }

  function clearEveryFilter() {
    trackUsage('activity-clear-ledger-filters');
    _txSort = { key: 'date', dir: 'desc' };
    _txCollapsed = false;
    clearFilters();
    clearBankFilters();
    _txSearch = '';
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
    return ledgerIsNarrowedPure(state) || _txSearch.trim() !== '';
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
      m.ledger === 'card' ? r.category : '',
      String(Math.abs(Number(r.amount) || 0)),
      ...tagNamesFor(r),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }

  function renderMergedLedger(cardRows, bankRecs) {
    const q = _txSearch.trim().toLowerCase();
    const all = [
      ...cardRows.map((r) => ({ ledger: 'card', date: r.date, row: r })),
      ...bankRecs.map((r) => ({ ledger: 'bank', date: r.date, row: r })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const totalCount = all.length;
    const merged = q ? all.filter((m) => matchesSearch(m, q)) : all;
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
      m.ledger === 'card'
        ? 'Card'
        : m.row.account
          ? `Bank \u00b7 \u2026${String(m.row.account).slice(-4)}`
          : 'Bank';
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
        rows.push(['Account', `\u2026${String(r.account).slice(-4)}`]);
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
        const reason = reviewReasonText(r, FALLBACK(), state.brandRules, state.merchants);
        const split = validSplitFor(r);
        const nameCell = el(
          'td',
          {},
          el(
            'button',
            {
              class: 'linkbtn',
              style: 'padding:0;font-weight:600',
              onclick: () => {
                trackUsage('activity-open-category');
                openCategoryPicker(r);
              },
            },
            r.displayName || r.description
          ),
          el(
            'div',
            { class: 'muted small', style: 'margin-top:2px' },
            catTag(r.category, {}),
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
                    class: 'row-tag-action',
                    title: 'Add this transaction to a custom label',
                    onclick: () => {
                      trackUsage('activity-open-tag');
                      openTagPicker(r);
                    },
                  },
                  '+ Custom label'
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
                class: 'row-tag-action',
                title: 'Add this transaction to a custom label',
                onclick: () => {
                  trackUsage('activity-open-tag');
                  openTagPicker(r);
                },
              },
              '+ Custom label'
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
            onclick: () => {
              trackUsage('activity-drill-payee');
              drillToAccountsPayee(r.counterpartyKey, cleanCounterparty(r.counterpartyLabel));
            },
          },
          cleanCounterparty(r.counterpartyLabel || r.description)
        ),
        el(
          'div',
          { class: 'muted small', style: 'margin-top:2px' },
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
          ? el('td', {}, r.account ? `Bank \u00b7 \u2026${String(r.account).slice(-4)}` : 'Bank')
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
    const countText = q
      ? `Showing ${merged.length} of ${totalCount} transaction${totalCount === 1 ? '' : 's'} matching "${_txSearch.trim()}"`
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
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconSpark()), 'Your income pattern')
      )
    );
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
      sec.append(el('span', { class: 'vm-tag tone-' + hero.deltaTone }, hero.deltaText));
    const chart = renderIncomeChart(income);
    if (chart) sec.append(chart);
    // Same "Why ›" control the rest of this tab uses. This card previously
    // reached for the chart-side "Income details ⓘ" popover, so one screen
    // offered two different affordances for the same request.
    if (caption) sec.append(buildDisclosure(el, 'Why', [el('p', {}, caption)]));
    return sec;
  }

  function renderPace() {
    const pace = detectMidMonthPace(state.rows, state.cfg, new Date());
    if (!pace.length) return null;
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconGap()), 'Partway through the month')
      )
    );
    // Each warning already names the exact category running hot; previously
    // that was the end of the road, with the actual tool to act on it (a
    // category ceiling) sitting a scroll away on this same tab and no link
    // between the two. Jumps straight there and pre-selects the same
    // category, rather than leaving a person to find it themselves.
    function goSetCeiling(category) {
      trackUsage('activity-pace-set-ceiling');
      const select = document.getElementById('ceiling-category-select');
      if (select) {
        select.value = category;
        select.dispatchEvent(new Event('change'));
      }
      smoothScrollToEl('#activity-ceilings');
    }
    for (const p of pace) {
      sec.append(
        el(
          'div',
          { class: 'muted small', style: 'margin-bottom:6px' },
          `${p.category} spending is on pace for about ${money0(p.projected)} this month, against a typical ${money0(p.typical)}. It is only day ${p.dayOfMonth} of ${p.daysInMonth}, so this is a projection, not a final figure.`,
          ' ',
          el(
            'button',
            { class: 'linkbtn', onclick: () => goSetCeiling(p.category) },
            'Set a ceiling'
          )
        )
      );
    }
    return sec;
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
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconList()), 'Biggest payments')
      )
    );
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
    return sec;
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
    const bankInsights = buildBankInsights(a, bankRecs, classifiedBank());
    const merged = rankInsights(
      [...cardInsights, ...bankInsights],
      (state.cfg.insights && state.cfg.insights.maxInsights) || 3
    );
    return renderInsightList(el, icon, {
      title: 'What\u2019s new or unusual',
      iconBulb,
      iconChevron,
      insights: merged,
      emptyText: 'A calm period. Nothing stands out against your usual pattern.',
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

    if (bankRecs.length) {
      const bankA = analyseBankActivity(bankRecs);
      const reviewCard = renderLedgerReview(bankA, bankRecs);
      if (reviewCard) wrap.append(reviewCard);
    }

    const fitnessCard = renderCardFitness();
    if (fitnessCard) wrap.append(fitnessCard);

    const paceCard = renderPace();
    if (paceCard) wrap.append(paceCard);

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
    return wrap;
  }

  // A short, scannable label for an account. No account name exists in the
  // data (analyseBankActivity carries only the raw number), so the last four
  // digits - the universal "account ending in" convention people recognise -
  // are used when they are unique across the person's accounts, with the full
  // number as an unambiguous fallback when any two share a last-4. The balance
  // is deliberately NOT shown here: it lives on Position, and fusing it onto
  // the selection token made picking an account a reading task, not a
  // recognition one.
  function accountChipLabel(account, allAccounts) {
    const s = String(account);
    const last4 = s.slice(-4);
    const collides = allAccounts.filter((a) => String(a.account).slice(-4) === last4).length > 1;
    return collides || s.length <= 4 ? s : '\u2026' + last4;
  }

  function renderAccountSelector() {
    const ov = overviewModel().ov;
    const bankAccounts = (ov && ov.accounts) || [];
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

    const sec = el('section', { class: 'card acct-slicer-card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconInfo()), 'Filter by account')
      )
    );
    const slicer = el('div', {
      class: 'acct-slicer',
      'aria-label': 'Filter transactions by account or card',
    });

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

    const oneBank = current !== 'all' && current !== 'card';
    sec.append(
      el(
        'p',
        { class: 'muted small', style: 'margin:8px 0 0' },
        oneBank
          ? 'Tap an account or your card to show only its transactions below, with a running balance.'
          : 'Tap an account or your card to show only its transactions below.'
      )
    );
    return sec;
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
    const selector = renderAccountSelector();
    if (selector) wrap.append(selector);

    // Search: the plan's Transactions spec - find a transaction across its
    // description, category, amount or tag name, LIVE as you type. The input is
    // built ONCE and lives outside the ledger; typing calls a local rebuild that
    // rewrites only the ledger container, never the input, so focus and caret
    // are preserved perfectly - the same reason the category picker filters its
    // list in-place rather than re-rendering the whole view. No render() call.
    const search = el('input', {
      type: 'search',
      class: 'f-search',
      placeholder: 'Name, category, amount, or custom label',
      'aria-label': 'Search transactions',
      value: _txSearch,
    });
    const clearSearch = el('button', {
      class: 'btn sm ghost tx-search-clear',
      hidden: _txSearch ? null : '',
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
    wrap.append(
      el('div', { class: 'tx-filters' },
        el('label', { class: 'field-label tx-search-field' },
          el('span', {}, 'Search transactions'),
          search
        ),
        searchCount,
        clearSearch
      )
    );

    if (isOneBank) {
      wrap.append(
        el(
          'p',
          { class: 'muted small', style: 'margin:0 0 8px' },
          `Showing account ending ${String(selected).slice(-4)} only. Card transactions are hidden.`
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
      const shown = ledgerHost.querySelectorAll
        ? ledgerHost.querySelectorAll('tr.tx-row').length
        : 0;
      searchCount.textContent = q
        ? `${shown} match${shown === 1 ? '' : 'es'}`
        : '';
    };
    search.addEventListener('input', () => {
      // A new search is a new question: it re-opens the list rather than
      // inheriting a collapse the person applied to the previous one.
      _txCollapsed = false;
      _txSearch = search.value;
      clearSearch.hidden = !_txSearch;
      trackUsage('activity-tx-search');
      rebuildLedger();
    });
    clearSearch.addEventListener('click', () => {
      _txCollapsed = false;
      _txSearch = '';
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
  function activityTabSignature() {
    const f = state.filter,
      bf = state.bankFilter;
    return [
      state.activityTab,
      state.bankAccount,
      _txSearch,
      // The sort is part of what this tab currently SHOWS, so it has to be in
      // the cache key. Without it a sort click set the order, called render(),
      // and got handed back the previously-cached DOM unchanged.
      _txSort.key,
      _txSort.dir,
      _txCollapsed,
      f.category,
      f.kind,
      f.merchant,
      f.month,
      f.min,
      f.max,
      f.foreignOnly,
      f.reviewOnly,
      f.search,
      bf.payeeKey,
      bf.kind,
      bf.search,
      bf.hideInternal,
      state.showAllTx,
      state.bankShowAllTx,
    ].join('|');
  }

  return {
    renderActivity,
    renderCommittedFlexible,
    renderSpendBreakdown,
    renderIntentions,
    renderTags,
    activityTabSignature,
    drillToTransaction,
  };
}
