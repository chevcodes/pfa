import { makeProseMoney } from '../core/money-format.js';
import {
  displayText,
  formatDisplayDate,
  formatMonthYear,
  isoToday,
  requireCtx,
  smoothScrollToEl,
  sortedCardStatements,
} from '../core/shared-helpers.js';
import { createDecisionHeader, surfaceTone } from './decision-header.js';
import { collapsibleCardReact, decisionSurfaceReact, savingsDestinationsReact, planAssignmentsReact, planGroupEditorReact, planLeverReact, planWhyReact, updatePlanLeverReact } from './react-bridge.js';
import { commitAndRender } from './reversible.js';
import { createCategoryLimitActions } from './category-limit-actions.js';
import { renderProportionBar } from './chart-surface.js';
import { chartIsHidden, proportionShares } from './chart-helpers.js';
import {
  buildPlan,
  buildPlanModel,
  GROUP_KEYS,
  planGroups,
  defaultTargets,
  isUsableTarget,
  normaliseTargets,
  targetsTotal100,
  TARGET_SHAPE_VERSION,
  planNeedsAttention,
  onTargetTolerance,
  significantTolerance,
  takeHomeLinkable,
  takeHomeSentence,
} from '../analysis/plan.js';
import { spendableCategoryNames } from '../analysis/spendable-categories.js';
import { categoryBudgetForMonth, savingsDestinationMovements } from '../analysis/category-budget.js';
import { categoryContributions } from '../analysis/category-contributions.js';
import { makeIntention } from '../analysis/category-intentions.js';
import { ownDestinations, savingDestinationSelection } from '../analysis/set-aside.js';
import { hasAnswered } from '../analysis/confirmations.js';
import { investmentContributionsByMonth } from '../analysis/investments.js';
import { autoAssign, categoryEvidence } from '../analysis/plan-autoassign.js';
import { createPlanWizard, wizardOpen, wizardSignature, resetWizard } from './plan-wizard.js';
import { bankStatementMonths, coverageTimeline } from '../analysis/coverage-map.js';
import { createCoverageStrip } from './coverage-strip.js';
import {
  PLAN_DRAFT_KEY,
  draftDiffersFromSaved,
  draftIsEdited,
  makePlanDraft,
  planSaveState,
} from '../analysis/plan-draft.js';

let _draftTargets = null;
let _focusGroup = null;
let _assignFilter = '';
let _assignJumpVersion = 0;
let _openDrawer = null;
// The control a person last acted on. A re-render rebuilds the drawer from
// scratch, so without this the page keeps its scroll but loses the checkbox -
// tabbing resumes from the top of the document and a screen reader loses its
// place. Undoing a choice must return you to where you made it, not near it.
let _restoreFocusTo = null;
// Stage two of the categories drawer: the full editable list. Session-only, so
// it never becomes another setting to manage.
let _assignExpanded = false;
let _categoryMonth = null;
let _categoryHistory = null;

export function setPlanCategoryHistory(category) {
  _categoryHistory = category;
}

export function resetPlanDraft() {
  resetWizard();
  _draftTargets = null;
  _openDrawer = null;
  _assignFilter = '';
  _assignJumpVersion = 0;
  _assignExpanded = false;
  _categoryMonth = null;
  _categoryHistory = null;
}

// Percentages a person has typed but not saved. _draftTargets was previously
// declared, read once, and never assigned - so an edit lived only in the DOM
// input, and ANY re-render (a privacy toggle, a period change, an import) put
// the saved figures back with nothing said. Captured on input, persisted, and
// restored, so typing is never silently undone.
export function setPlanDraftTargets(targets) {
  _draftTargets = targets || null;
}

export function planDraftTargets() {
  return _draftTargets;
}

export function createPlanRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'iconPie',
      'money0',
      'moneyShort',
      'classifiedBank',
      'commitmentsModel',
      'overviewModel',
      'render',
      'toast',
      'Store',
      'trackUsage',
      'reversible',
      'confirmAnswer',
      'savingAccountKeys',
      'jump',
      'drillToTransactions',
    ],
    'createPlanRenderer'
  );
  const {
    state,
    el,
    icon,
    iconPie,
    money0,
    moneyShort,
    classifiedBank,
    commitmentsModel,
    overviewModel,
    render,
    toast,
    Store,
    trackUsage,
    reversible,
    confirmAnswer,
    savingAccountKeys,
    jump,
    drillToTransactions,
    openEvidence,
    provenModels,
    activityIncomePatternAvailable,
  } = ctx;
  const limitActions = createCategoryLimitActions({ state, Store, reversible, trackUsage, makeIntention, toast });
  const { renderDecisionHeader } = createDecisionHeader({ el });
  // Any figure that is not a headline reads short: summaries, the over/under
  // annotation, destination amounts. The ACTUAL/PLAN values stay exact.
  const prose = makeProseMoney(state.cfg || {});
  const wizard = createPlanWizard({ state, el, money0, render, toast, Store, trackUsage });
  const coverage = createCoverageStrip({ el });
  let budgetFocusKey = null;
  let heroSaveSnapshot = { label: '', tone: 'neutral', state: '' };
  const heroSaveListeners = new Set();
  const heroSaveStore = {
    getSnapshot: () => heroSaveSnapshot,
    subscribe: (listener) => {
      heroSaveListeners.add(listener);
      return () => heroSaveListeners.delete(listener);
    },
    set: (next) => {
      if (heroSaveSnapshot.label === next.label && heroSaveSnapshot.tone === next.tone && heroSaveSnapshot.state === next.state) return;
      heroSaveSnapshot = next;
      heroSaveListeners.forEach((listener) => listener());
    },
  };

  // Gaps in the statements are a data-integrity fact, so they belong beside the
  // figures they limit rather than buried in settings. Shown only when there IS
  // a gap: a complete run needs no announcement.
  function renderCoverage(opts = {}) {
    const cardMonths = [...new Set((state.rows || []).map((r) => r.month).filter((m) => m && m !== 'unknown'))];
    const bankMonths = [...new Set((state.bankRecords || []).map((r) => String(r.date || '').slice(0, 7)).filter(Boolean))];
    const investmentMonths = [...new Set((state._investmentStatements || []).map((s) => String(s.periodEnd || '').slice(0, 7)).filter(Boolean))];
    const ledgers = ['card', 'bank', ...(investmentMonths.length ? ['investment'] : [])];
    const timeline = coverageTimeline({ cardMonths, bankMonths, investmentMonths, coverage: state.coverage, ledgers });
    return coverage.renderCoverageCard(timeline, {
      onlyWhenIncomplete: !opts.always,
      nested: !!opts.nested,
      onAdd: opts.onAdd,
      ledgers,
      asProps: !!opts.asProps,
    });
  }

  const todayISO = () => isoToday();

  function cardLeg() {
    // The SHARED ordering. This sorted by periodEnd-or-filename, a different key
    // from the statementKey every other reader uses, so the Plan tab could
    // consider a different statement "latest" than the goal engine did - and
    // report a card balance belonging to a different month than the same
    // balance elsewhere in the app. Ordering is a calculation: it decides which
    // figures everything downstream reads.
    const list = sortedCardStatements(state._cardStatements);
    if (!list.length) return null;
    const latest = list[list.length - 1];
    const prev = list.length > 1 ? list[list.length - 2] : null;
    return {
      owed: latest && latest.newBalance != null ? Number(latest.newBalance) : null,
      previousOwed: prev && prev.newBalance != null ? Number(prev.newBalance) : null,
    };
  }

  // Obvious assignments are made from evidence and never asked about; a stored
  // choice always wins over one this made. What is left over is what the setup
  // wizard asks, so a person is only ever shown the decisions that are
  // genuinely theirs to make.
  function assignmentPlan() {
    const categories = spendableCategoryNames(state.cfg);
    const purchases = categoryContributions({ cardRows: state.rows, bankRows: classifiedBank(), splits: state.transactionSplits, cfg: state.cfg, cardAccounts: state.cardAccounts, designatedSetAside: savingAccountKeys() }).purchases;
    const evidence = categoryEvidence(purchases.filter((part) => part.amount > 0).map((part) => ({ date: part.date, amount: part.amount, kind: 'spend', category: part.category })), { asOf: todayISO() });
    const { assignments, ambiguous } = autoAssign({
      categories,
      evidence,
      cfg: state.cfg,
      stored: state._planGroups || null,
    });
    return {
      categories,
      evidence,
      auto: assignments,
      questions: ambiguous,
      effective: { ...assignments, ...(state._planGroups || {}) },
    };
  }

  function planModel(overrideTargets) {
    const commitments = commitmentsModel().combined;
    const raw = buildPlan({
      trend: overviewModel().rollAllTrend || [],
      bankRecords: classifiedBank(),
      cardRows: state.rows || [],
      cfg: state.cfg,
      commitmentsMonthly: commitments.total,
      commitmentItems: commitments.items,
      card: cardLeg(),
      asOf: todayISO(),
      // The SAVED plan only. A draft is work in progress, not an answer: if it
      // drove the model, untyped-but-unsaved percentages would silently move
      // the bands, the Overview figure and the printed report, and the tab
      // would describe a plan the person never committed to. The draft's only
      // job is to put the controls back where they were left.
      targets: overrideTargets !== undefined ? overrideTargets : state._planTarget,
      groupAssignments: assignmentPlan().effective,
      designatedSetAside: savingAccountKeys(),
      cardAccounts: state.cardAccounts,
      investmentContributions: investmentContributionsByMonth(state._investmentStatements || [], {
        baseCurrency: ((state.cfg && state.cfg.currency) || {}).code || 'JMD',
      }),
    });
    if (!raw.income.monthsUsed) return null;
    return { raw, model: buildPlanModel(raw, state.cfg) };
  }

  // What is typed but not saved, wherever it currently lives: this session's
  // module state, or the draft restored from storage on a fresh load. The hero
  // used to read only the first, so on a reload it announced "plan saved" above
  // an editor already showing the restored edits and reading "not saved yet".
  // One reader, so the two can no longer be looking at different things.
  function currentDraftTargets() {
    return _draftTargets || (state._planDraft && state._planDraft.targets) || null;
  }

  /* ---- the answer: one figure, one line, one picture ---- */
  function renderPlanHero(asProps = false) {
    const built = planModel();
    if (!built) return null;
    const { raw, model } = built;
    const reactActive = typeof window !== 'undefined' && typeof document !== 'undefined';

    const barSpec = { label: 'How a normal month divides', money: money0, bands: model.bands };
    const bar = reactActive ? null : renderProportionBar({ el, money0, moneyShort }, barSpec);
    const barModel = reactActive ? proportionShares(barSpec.bands) : null;
    const barHidden = reactActive && chartIsHidden();

    const tags = [];
    if (model.unusual) tags.push({ text: 'unusual month', tone: 'neutral', detail: model.unusual.detail });
    // ONE function answers "is my plan saved?", here and in the editor below.
    // The hero used to answer it from targetsAreDefault - which actually means
    // "this plan is yours rather than the default" - so it kept saying
    // "plan saved" while the editor beside it said "not saved yet".
    const saveState = planSaveState({
      draftTargets: currentDraftTargets(),
      savedTarget: state._planTarget,
      cfg: state.cfg,
      targetsAreDefault: model.targetsAreDefault,
    });
    heroSaveStore.set({ label: saveState.state === 'saved' ? '' : saveState.label, tone: surfaceTone(saveState.tone), state: saveState.state });
    if (!reactActive) tags.push(
      el(
        'span',
        {
          class: 'tag plan-save-tag tone-' + surfaceTone(saveState.tone),
          'data-save-state': saveState.state,
          ...(saveState.state !== 'saved' && saveState.label ? {} : { hidden: '' }),
        },
        saveState.state === 'saved' ? '' : saveState.label
      )
    );
    if (model.unaccounted <= -significantTolerance(model.takeHome)) {
      tags.push({
        text: 'more goes out than comes in',
        tone: 'watch',
        detail: `A normal month is ${model.unaccountedText} short once every group is counted.`,
      });
    }
    if (model.drawdown) {
      tags.push({
        text: 'savings drawn down',
        tone: model.drawdown >= significantTolerance(model.takeHome) ? 'watch' : 'neutral',
        detail: model.drawdownText,
      });
    }
    for (const f of model.foreignSetAside) {
      tags.push({ text: `${f.currency} held separately`, tone: 'neutral', detail: f.text });
    }
    const statusSlots = Math.max(0, 2 - Number(!!model.free.reconciling.text) - Number(!!saveState.label && saveState.state !== 'saved'));
    const visibleTags = tags.filter((tag) => tag.tone === 'watch' || tag.tone === 'alert').slice(0, statusSlots);
    if (!reactActive && saveState.label && saveState.state !== 'saved') visibleTags.push(tags.find((tag) => tag.nodeType));

    const takeHome = takeHomeSentence(raw.income, prose);
    const evidence = provenModels && provenModels.incomeSources().takeHome;
    const linkable = !!openEvidence && takeHomeLinkable(
      raw.income,
      evidence,
      typeof activityIncomePatternAvailable === 'function' && activityIncomePatternAvailable()
    );
    const whyItems = [
      {
        type: 'paragraph',
        text: `${takeHome.lead} ${takeHome.amount}${takeHome.rest}`,
        ...(linkable ? {
          link: {
            before: `${takeHome.lead} `,
            label: takeHome.amount,
            after: takeHome.rest,
            title: 'Your regular deposits',
            onClick: () => {
              trackUsage('plan-open-take-home');
              openEvidence({ kind: 'view', view: 'activity', activityTab: 'analysis', anchorId: '#activity-income', openCardName: 'activity-income' });
            },
          },
        } : {}),
      },
      {
        type: 'workings',
        rows: [
          { label: 'Standing payments', value: model.workings.committedText },
          { label: 'Other bank debits', value: model.workings.bankEverydayText },
          { label: 'Card, obliged', value: model.workings.cardFixedText },
          { label: 'Card discretionary spending', value: model.workings.cardFreeText },
        ],
      },
      { type: 'paragraph', text: 'A group is decided by whether the money is owed, not by how often it goes out.' },
    ];
    if (model.unusual) whyItems.push({ type: 'paragraph', text: model.unusual.detail });
    if (raw.setAsideWithinCommitments > 0) {
      whyItems.push({ type: 'paragraph', text: `${prose(raw.setAsideWithinCommitments)} of it goes into savings - counted there, not twice.` });
    }
    if (raw.statementSetAside && raw.statementSetAside.amount > 0) {
      whyItems.push({ type: 'paragraph', text: `${prose(raw.statementSetAside.amount)} of the money set aside is confirmed by your investment statements, so matching bank transfers in those months aren't counted again.` });
    }
    if (raw.statementSetAside && raw.statementSetAside.designatedOverlap) {
      whyItems.push({ type: 'paragraph', muted: true, text: 'In those months money also went to an account you marked as savings. If that account is your investment account, it may be counted twice.' });
    }
    if (model.drawdown) whyItems.push({ type: 'paragraph', text: model.drawdownText });
    if (model.unaccounted > 0.5) {
      whyItems.push({ type: 'paragraph', text: `${model.unaccountedProse} never went out - it stayed put, or moved somewhere the statements don't show.` });
    }
    for (const f of model.foreignSetAside) whyItems.push({ type: 'paragraph', text: f.text });
    if (raw.gaps.length) whyItems.push({ type: 'paragraph', muted: true, text: `Thin on data: ${raw.gaps.join('; ')}.` });

    const whyRoot = reactActive ? null : planWhyReact(el, { items: whyItems });
    const why = reactActive ? [] : whyRoot ? [whyRoot] : whyItems.map((item) => item.type === 'workings'
      ? el('div', { class: 'plan-workings' }, ...item.rows.map((row) => el('div', { class: 'plan-working' }, el('span', {}, row.label), el('span', { class: 'num money' }, row.value))))
      : el('p', item.muted ? { class: 'muted' } : {}, item.text));

    if (reactActive) {
      const props = {
      id: 'plan-header',
      className: 'view-forecast plan-primary',
      question: 'What’s free in a normal month?',
      figure: model.free.amountText,
      meaning: model.free.label,
      tags: visibleTags,
      saveStatusStore: heroSaveStore,
      note: { text: model.free.reconciling.text, tone: model.free.reconciling.tone },
      whyItems,
      extraProportion: barModel && barModel.bands.length && barModel.total > 0 && !barHidden
        ? { spec: barSpec, money: money0, model: barModel }
        : null,
      extraHidden: barHidden ? barSpec.label : null,
      extraHiddenHeight: '120px',
      extraBeforeFooter: true,
      onBudgetActual: jump(() => {
        revealPlanCard('#plan-my-plan-card', () => smoothScrollToEl('#plan-my-plan-card'));
        return true;
      }, { returnOnAction: true }),
      onCategoryBudget: jump(() => {
        revealCategoryBudget();
        return true;
      }, { returnOnAction: true }),
      };
      return asProps ? props : decisionSurfaceReact(el, props);
    }

    return renderDecisionHeader({
      id: 'plan-header',
      class: 'view-forecast plan-primary',
      question: 'What’s free in a normal month?',
      figure: { text: model.free.amountText },
      meaning: model.free.label,
      tags: visibleTags,
      note: { text: model.free.reconciling.text, tone: model.free.reconciling.tone },
      why,
      extra: bar,
      // D4: the reasoning sits below the picture it explains. Between the note
      // and the bar it interrupted answer -> picture, the one sequence this
      // card exists to deliver.
      extraBeforeFooter: true,
    });
  }

  function buildCategoryBudgetProps() {
    const currentMonth = todayISO().slice(0, 7);
    const categories = spendableCategoryNames(state.cfg);
    const bankRows = classifiedBank();
    const statementMonths = new Set((state._cardStatements || []).map((statement) => statement.statementKey).filter((month) => /^\d{4}-\d{2}$/.test(month)));
    const bankStatements = new Set(bankStatementMonths(state._bankStatements || []));
    const cardMonths = [...new Set([...(state.rows || []).map((row) => row.month), ...statementMonths])].filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month));
    const bankMonths = [...new Set([...bankRows.map((row) => String(row.date || '').slice(0, 7)), ...bankStatements])].filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month));
    const recordedMonths = [...new Set([...cardMonths, ...bankMonths])].sort().reverse();
    const calendarMonths = coverageTimeline({ cardMonths, bankMonths, coverage: state.coverage, ledgers: ['card', 'bank'] }).months;
    const investmentContributions = investmentContributionsByMonth(state._investmentStatements || [], { baseCurrency: state.cfg.currency?.code || 'JMD' });
    const budgetMonths = [...new Set([currentMonth, ...calendarMonths.map((entry) => entry.month)])].sort().reverse().map((month) => ({
      ...categoryBudgetForMonth({ rows: state.rows, bankRows, splits: state.transactionSplits, intentions: state.categoryIntentions, categories, month, statementRecorded: statementMonths.has(month), bankStatementRecorded: bankStatements.has(month), cfg: state.cfg, cardAccounts: state.cardAccounts, designatedSetAside: savingAccountKeys() }),
      savings: savingsDestinationMovements({ bankRows, month, cfg: state.cfg, designatedSetAside: savingAccountKeys(), investmentContributions }),
      investmentRecorded: !!investmentContributions.get(month)?.known,
      label: formatMonthYear(month),
      coverage: calendarMonths.find((entry) => entry.month === month) || { card: 'outside', bank: 'outside' },
    }));
    return {
      hasHistory: recordedMonths.length > 0,
      hasLimits: (state.categoryIntentions || []).length > 0,
      months: budgetMonths,
      selectedMonth: budgetMonths.some((entry) => entry.month === _categoryMonth) ? _categoryMonth : recordedMonths.includes(currentMonth) ? currentMonth : recordedMonths[0] || currentMonth,
      selectedHistoryCategory: _categoryHistory,
      currentMonth,
      categories,
      groupAssignments: assignmentPlan().effective,
      needsSorting: assignmentPlan().questions.map((item) => item.name),
      fallbackCategory: state.cfg.special?.fallback,
      money: money0,
      onMonthChange: (month) => { _categoryMonth = month; },
      onHistoryCategoryChange: (name) => { _categoryHistory = name; },
      onSave: async (category, amount) => {
        if (!category || !(amount > 0) || !Number.isFinite(amount)) return false;
        _categoryMonth = currentMonth;
        const saved = await limitActions.save(category, amount, currentMonth, 'plan-set-category-limit');
        if (saved) {
          const focusSavedLimit = (remaining) => {
            const target = document.getElementById(`plan-category-budget-row-${currentMonth}-${encodeURIComponent(category)}`);
            if (target) target.focus();
            if (document.activeElement !== target && remaining > 0) requestAnimationFrame(() => focusSavedLimit(remaining - 1));
          };
          requestAnimationFrame(() => focusSavedLimit(12));
        }
        return saved;
      },
      onOpen: (category, month, kind = 'spend') => drillToTransactions({ category, month, kind }, { showAll: true, contributionCategory: true }),
    };
  }

  /* ---- the plan: three groups, a target share each, how it is tracking ---- */
  function renderPlanLever(asProps = false) {
    const built = planModel();
    if (!built || built.model.takeHome <= 0) {
      const categoryBudgetProps = asProps ? buildCategoryBudgetProps() : null;
      return categoryBudgetProps?.hasHistory || categoryBudgetProps?.hasLimits ? { kind: 'category-only', categoryBudgetProps, hiddenCharts: chartIsHidden() } : null;
    }
    const { raw, model } = built;
    const questions = assignmentPlan().questions;

    if (wizardOpen()) {
      const result = wizard.renderWizard(questions, built.raw.groups, asProps);
      if (!asProps) return result;
      const categoryBudgetProps = buildCategoryBudgetProps();
      return { kind: 'wizard', props: result, categoryBudgetProps: categoryBudgetProps.hasHistory || categoryBudgetProps.hasLimits ? categoryBudgetProps : null, hiddenCharts: chartIsHidden() };
    }

    const incomeMethod =
      raw.income.basis === 'repeating'
        ? `the average of ${raw.income.monthsUsed} similar complete months`
        : raw.income.basis === 'median'
          ? `the middle amount from ${raw.income.monthsUsed} complete months`
          : raw.income.basis === 'lowest'
            ? `the lowest of ${raw.income.monthsSeen} complete months because money in varied`
            : 'the one complete month loaded';
    const dataNote = raw.gaps.length ? `This comparison has limited data because ${raw.gaps.join('; ')}. ` : '';
    const headerInfo = `Every percentage uses your normal monthly take-home of ${model.takeHomeText}. It is ${incomeMethod}. The three bars estimate a normal month from your records; By category shows recorded bank and card purchases in the chosen month. Each comparison bar shows a typical monthly amount, the marker shows your plan, and stripes show the amount over plan. Fixed expenses are money you owe; savings are money you move aside; everything else is discretionary spending. ${dataNote}60/20/20 is a starting point.`;
    const initialTargets = Object.fromEntries(model.groups.map((group) => {
      const restored = currentDraftTargets();
      return [group.key, restored && restored[group.key] != null ? restored[group.key] : group.targetPct];
    }));
    let targetValues = { ...initialTargets };
    let planControls = null;
    let leverContainer = null;
    let leverState = {};
    let leverSnapshot = null;
    const leverListeners = new Set();
    const leverStore = {
      getSnapshot: () => leverSnapshot,
      subscribe: (listener) => {
        leverListeners.add(listener);
        return () => leverListeners.delete(listener);
      },
      set: (next) => {
        leverSnapshot = next;
        leverListeners.forEach((listener) => listener());
      },
    };
    const reactActive = typeof document !== 'undefined' && typeof window !== 'undefined';
    const categoryBudgetProps = buildCategoryBudgetProps();
    const savedNote = reactActive ? null : el('span', { class: 'plan-saved-note' }, '');
    const unsavedFlag = reactActive ? null : el('span', { class: 'plan-unsaved', hidden: '' }, 'not saved yet');
    const save = reactActive ? null : el('button', { class: 'btn primary', type: 'button' }, 'Save my plan');
    let drawerList = [];
    let groupEditor = null;

    function readTargets() {
      const values = planControls ? planControls.getTargets() : targetValues;
      return Object.fromEntries(GROUP_KEYS.map((key) => [key, Math.max(0, Number(values[key]) || 0)]));
    }

    function leverProps() {
      return {
        classes: {
          sheet: 'plan-sheet',
          head: 'plan-sheet-head-row',
          sort: 'plan-sort',
          foot: 'plan-foot',
          status: 'plan-foot-status',
          triggers: 'plan-drawer-triggers',
          trigger: 'plan-drawer-summary',
          panels: 'plan-panels',
          more: 'plan-panel plan-panel-more',
          secondaryActions: 'plan-lever-actions is-secondary',
          total: 'plan-total',
        },
        headerInfo,
        coverageNote: dataNote.trim() || null,
        hiddenCharts: chartIsHidden(),
        sortCount: questions.length,
        onSort: () => wizard.open(),
        ...leverState,
        onBalance: balanceShares,
        editor: groupEditor,
        editorProps: reactActive ? groupEditorProps : null,
        categoryBudgetProps: reactActive ? categoryBudgetProps : null,
        unsavedFlag,
        savedNote,
        saveButton: save,
        unsaved: leverState.unsaved,
        savedText: leverState.savedText,
        saveDisabled: leverState.saveDisabled,
        saveLabel: leverState.saveLabel,
        saveTitle: leverState.saveTitle,
        onCancel: revertToSaved,
        onSave: commitPlan,
        draftNote: state._planDraft && draftIsEdited(state._planDraft.targets, state._planTarget, state.cfg) && !isUsableTarget(state._planTarget)
          ? 'These are the edits you left unsaved last time, not your saved plan. Nothing is stored until you press Save my plan.'
          : null,
        drawers: drawerList,
        openDrawer: _openDrawer,
        onToggleDrawer: (key) => {
          _openDrawer = _openDrawer === key ? null : key;
          updatePlanLeverReact(leverContainer, leverProps());
        },
        onReset: resetTargets,
        onClear: isUsableTarget(state._planTarget) ? clearPlan : null,
      };
    }

    function paintHeroSaveTag(unsaved) {
      const st = planSaveState({
        draftTargets: unsaved ? currentDraftTargets() : null,
        savedTarget: state._planTarget,
        cfg: state.cfg,
        targetsAreDefault: !isUsableTarget(state._planTarget),
      });
      if (typeof window !== 'undefined') {
        heroSaveStore.set({ label: st.state === 'saved' ? '' : st.label, tone: surfaceTone(st.tone), state: st.state });
        return;
      }
      const tag = document.querySelector('.plan-save-tag');
      if (!tag) return;
      tag.textContent = st.state === 'saved' ? '' : st.label;
      tag.hidden = st.state === 'saved' || !st.label;
      tag.dataset.saveState = st.state;
      tag.className = 'tag plan-save-tag tone-' + surfaceTone(st.tone);
    }
    let _saveTimer = null;
    function rememberDraft(t) {
      const unsaved = draftIsEdited(t, state._planTarget, state.cfg);
      const savable = draftDiffersFromSaved(t, state._planTarget, state.cfg);
      _draftTargets = unsaved ? { ...t } : null;
      const existing = state._planDraft || {};
      state._planDraft = makePlanDraft({
        targets: unsaved ? t : null,
        answers: existing.answers,
        step: existing.step,
      });
      paintHeroSaveTag(unsaved);
      if (_saveTimer) clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => {
        Store.setMeta(PLAN_DRAFT_KEY, state._planDraft).catch((error) => {
          console.warn('Plan draft could not be saved.', error);
          toast('Your unfinished plan changes could not be remembered on this device.');
        });
      }, 400);
    }

    function repaint(t = readTargets()) {
      targetValues = { ...t };
      rememberDraft(targetValues);
      const total = Math.round((targetValues.fixed + targetValues.setAside + targetValues.free) * 10) / 10;
      const balanced = Math.abs(total - 100) < 0.05;
      const savable = draftDiffersFromSaved(targetValues, state._planTarget, state.cfg);
      const savedAt = isUsableTarget(state._planTarget) && state._planTarget.savedAt
        ? formatDisplayDate(state._planTarget.savedAt)
        : '';
      const off = !targetsTotal100(targetValues);
      const unsaved = draftIsEdited(targetValues, state._planTarget, state.cfg);
      const savedText = unsaved
        ? savedAt ? `Last saved ${savedAt}` : ''
        : savedAt ? `Saved ${savedAt}` : savable ? '' : 'Saved';
      if (!reactActive) {
        unsavedFlag.hidden = !unsaved;
        savedNote.replaceChildren(displayText(savedText));
        save.disabled = !savable || off;
        save.textContent = savable ? 'Save my plan' : 'Saved';
        save.title = off ? 'The three shares do not add up to 100% of take-home' : '';
      }
      leverState = {
        totalLabel: balanced ? `${total}% of take-home` : `Shares total ${total}%. Activate to make it 100%.`,
        totalBalanced: balanced,
        totalDisabled: balanced,
        unsaved,
        savedText,
        saveDisabled: !savable || off,
        saveLabel: 'Save plan',
        saveTitle: off ? 'The three shares do not add up to 100% of take-home' : savable ? '' : 'No changes to save',
      };
      if (leverContainer) updatePlanLeverReact(leverContainer, leverProps());
    }

    const focusGroup = _focusGroup;
    _focusGroup = null;
    const groupEditorProps = {
      groups: model.groups,
      takeHome: model.takeHome,
      initialTargets,
      selectedGroupKey: model.groups.some((group) => group.key === budgetFocusKey) ? budgetFocusKey : focusPlanGroup(model)?.key || model.groups[0]?.key,
      onSelectGroup: (key) => { budgetFocusKey = key; },
      focusGroup,
      prose,
      money: money0,
      drawdown: raw.drawdown,
      tolerance: onTargetTolerance(model.takeHome),
      classes: {
        pct: 'plan-pct',
        pctSign: 'plan-pct-sign',
        track: 'plan-track',
        groups: 'plan-groups',
        row: 'plan-row',
        rowTop: 'plan-row-top',
        rowName: 'plan-row-name',
        rowLabel: 'plan-row-label',
        rowShare: 'plan-row-share',
        rowFoot: 'plan-row-foot',
        rowActual: 'plan-row-actual',
        amountLabel: 'plan-amount-label',
        targetAmount: 'plan-target-amt',
      },
      actualLabel: () => el('span', { class: 'plan-amount-label' }, 'Typical month'),
      planLabel: () => el('span', { class: 'plan-amount-label' }, 'Plan'),
      actualLabelText: reactActive ? 'Typical month' : null,
      planLabelText: reactActive ? 'Plan' : null,
      onDraftChange: repaint,
      onActionKeyDown: (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitPlan();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          revertToSaved();
        }
      },
      onOpenGroup: jump((key) => {
        budgetFocusKey = key;
        _openDrawer = 'categories';
        _assignExpanded = true;
        _assignFilter = '';
        _assignJumpVersion += 1;
        render({ preserveScroll: false });
        requestAnimationFrame(() => {
          smoothScrollToEl(`#plan-band-${key}`);
          document.getElementById(`plan-band-${key}`)?.focus({ preventScroll: true });
        });
        return true;
      }, { returnOnAction: true }),
      onControls: (controls) => {
        planControls = controls;
      },
    };
    if (!reactActive) groupEditor = planGroupEditorReact(el, groupEditorProps);
    function balanceShares() {
      const t = readTargets();
      const sum = t.fixed + t.setAside + t.free;
      if (!sum) return;
      let left = 100;
      const next = {};
      GROUP_KEYS.forEach((key, i) => {
        const share = i === GROUP_KEYS.length - 1 ? left : Math.round((t[key] / sum) * 100);
        left -= share;
        next[key] = Math.max(0, share);
      });
      if (planControls) planControls.setTargets(next);
      repaint(next);
    }

    async function revertToSaved() {
      const back = normaliseTargets(state._planTarget, state.cfg);
      if (planControls) planControls.setTargets(back);
      await commitAndRender({
        commit: async () => {
          repaint();
          if (_saveTimer) clearTimeout(_saveTimer);
          _saveTimer = null;
          await Store.setMeta(PLAN_DRAFT_KEY, state._planDraft);
        },
        render: () => {},
        notify: () => toast('Plan percentages restored.'),
      });
    }

    async function commitPlan() {
      const targets = readTargets();
      if (!targetsTotal100(targets)) {
        toast('The three shares must add up to 100% before saving.');
        return;
      }
      const saved = { ...targets, v: TARGET_SHAPE_VERSION, savedAt: todayISO() };
      if (_saveTimer) clearTimeout(_saveTimer);
      await commitAndRender({
        commit: async () => {
          await Store.setMetaMany([
            { key: 'planTarget', value: saved },
            { key: PLAN_DRAFT_KEY, value: null },
          ]);
          state._planTarget = saved;
          state._planDraft = null;
          _draftTargets = null;
          _focusGroup = document.activeElement && document.activeElement.dataset.group
            ? document.activeElement.dataset.group
            : null;
          if (trackUsage) trackUsage('plan-target-saved');
        },
        render: () => { render(); },
        notify: () => toast(`Plan saved - ${saved.fixed}/${saved.setAside}/${saved.free}.`),
      });
    }
    function resetTargets() {
      const targets = defaultTargets(state.cfg);
      if (planControls) planControls.setTargets(targets);
      repaint(targets);
    }
    if (!reactActive) save.addEventListener('click', commitPlan);

    async function clearPlan() {
      const prior = state._planTarget;
      await commitAndRender({
        commit: async () => {
          await Store.setMetaMany([
            { key: 'planTarget', value: null },
            { key: PLAN_DRAFT_KEY, value: null },
          ]);
          state._planTarget = null;
          state._planDraft = null;
          _draftTargets = null;
        },
        render,
        notify: () => toast('Plan cleared.', async () => {
          await commitAndRender({
            commit: async () => {
              await Store.setMeta('planTarget', prior);
              state._planTarget = prior;
            },
            render,
          });
        }),
      });
    }

    drawerList = [renderSavingsPicker(reactActive), renderAssignments(reactActive), { key: 'more', label: 'More', panelId: 'plan-panel-more' }].filter(Boolean);
    repaint();
    const offTarget = planNeedsAttention(raw);
    const unsavedWork = !!(state._planDraft && state._planDraft.targets);
    const limitedData = raw && raw.confidence !== 'complete';
    const summary = offTarget
      ? `${offTargetSummary(model)}${limitedData ? ' · limited data' : ''}`
      : unsavedWork
        ? (limitedData ? 'Unsaved changes · limited data' : 'Unsaved changes')
        : limitedData ? 'Limited data to compare' : 'Spending is on plan';
    if (asProps) {
      leverStore.set(leverProps());
      leverContainer = { updateReact: leverStore.set };
      return {
        kind: 'lever',
        store: leverStore,
        categoryBudgetProps: categoryBudgetProps.hasHistory || categoryBudgetProps.hasLimits ? categoryBudgetProps : null,
        summary,
        iconMarkup: iconPie(),
        initialOpen: !!_openDrawer,
      };
    }
    leverContainer = reactActive ? null : planLeverReact(el, leverProps());

    const card = collapsibleCardReact(el, {
      title: 'Budget vs actual',
      summary,
      icon: icon(iconPie()),
      iconMarkup: reactActive ? iconPie() : null,
      body: leverContainer,
      reactBody: reactActive ? { kind: 'planLever', props: leverProps(), rootClass: 'pfa-react-root' } : null,
      name: 'plan-my-plan-card',
      defaultOpen: !!_openDrawer,
    });
    if (card) card.classList.add('plan-lever');
    if (reactActive) leverContainer = card;
    return card;
  }

  function revealPlanCard(selector, afterOpen) {
    const trigger = document.querySelector(`${selector} .pfa-card-disclosure-trigger`);
    if (trigger && trigger.getAttribute('data-state') !== 'open') trigger.click();
    requestAnimationFrame(afterOpen);
  }

  function revealCategoryBudget() {
    const target = document.getElementById('plan-category-budget-card');
    const planCard = document.getElementById('plan-my-plan-card');
    const nested = target?.closest('[data-name="plan-category-breakdown"]') || (!target && planCard);
    if (nested) {
      revealPlanCard('#plan-my-plan-card', () => {
        revealInlinePlanStep('plan-category-breakdown', () => smoothScrollToEl('#plan-category-budget-card'));
      });
      return;
    }
    if (target) {
      revealPlanCard('#plan-category-budget-card', () => smoothScrollToEl('#plan-category-budget-card'));
      return;
    }
    smoothScrollToEl('#plan-category-budget-card');
  }

  function revealInlinePlanStep(name, afterOpen) {
    const trigger = document.querySelector(`[data-name="${name}"] .pfa-inline-disclosure-trigger`);
    if (trigger && trigger.getAttribute('data-state') !== 'open') trigger.click();
    requestAnimationFrame(afterOpen);
  }

  function offTargetSummary(model) {
    const worst = focusPlanGroup(model);
    if (!worst) return 'Needs a look';
    return `${worst.label} · ${worst.trackText} plan in a normal month`;
  }

  function focusPlanGroup(model) {
    return ((model && model.groups) || [])
      .filter((g) => g.direction && g.direction !== 'on')
      .filter((g) => !(g.key === 'free' && g.direction === 'under'))
      .sort((a, b) => Math.abs(b.diff || 0) - Math.abs(a.diff || 0))[0];
  }

  function renderSavingsPicker(reactActive = false) {
    const records = classifiedBank();
    const options = {
      asOf: todayISO(),
      baseCurrency: (state.cfg.currency || {}).code || 'JMD',
      cardAccounts: state.cardAccounts || [],
    };
    const dests = ownDestinations(records, options).filter((d) => d.months >= 2);
    if (!dests.length) return null;
    const cardAccounts = new Set((state.cardAccounts || []).map((a) => String(a)));
    const { suggested, chosen } = savingDestinationSelection(records, state.confirmations, options);

    const focusId = _restoreFocusTo;
    _restoreFocusTo = null;
    const destinations = dests.map((d) => {
      const isCard = [...cardAccounts].some((a) => d.key.endsWith(a.slice(-4)));
      return {
        key: d.key,
        label: d.label,
        amount: `${prose(d.perMonth)} a month`,
        id: `dest-${d.key.replace(/[^a-z0-9]+/gi, '-')}`,
        isCard,
        checked: chosen.has(d.key),
        suggested: suggested.has(d.key) && !hasAnswered(state.confirmations, 'saving', d.key),
        countLabel: reactActive ? null : el('span', {}, 'Counts as saving'),
        countLabelText: reactActive ? 'Counts as saving' : null,
        cardExplanation: 'Only payments above the minimum count here. Paying off the card clears debt rather than putting money aside.',
      };
    });
    const panelProps = {
      destinations,
      classes: {
        list: 'plan-assign-list',
        row: 'plan-assign-row',
        name: 'plan-assign-name',
        amount: 'plan-dest-amt muted',
        action: 'plan-dest-action',
        toggle: 'plan-dest-toggle',
        checkbox: 'plan-dest-check',
        suggested: 'vm-tag tone-neutral plan-dest-suggested',
      },
      focusId,
      onToggle: async (key, adding) => {
        const d = dests.find((item) => item.key === key);
        if (!d) return;
        _openDrawer = 'savings';
        _restoreFocusTo = `dest-${d.key.replace(/[^a-z0-9]+/gi, '-')}`;
        await confirmAnswer({
          inference: 'saving',
          subject: d.key,
          answer: adding,
          describe: () =>
            adding ? `${d.label} now counts as saving.` : `${d.label} no longer counts as saving.`,
          track: 'plan-designate-savings',
        });
      },
    };
    if (reactActive) return { key: 'savings', label: 'Where savings go', panelId: 'plan-panel-savings', component: 'savings', panelProps };
    const panel = el('div', { class: 'plan-panel', id: 'plan-panel-savings' });
    panel.append(savingsDestinationsReact(el, panelProps));
    return { key: 'savings', label: 'Where savings go', panelId: 'plan-panel-savings', panel };
  }

  /* ---- where each category sits, grouped by where it sits ---- */
  function renderAssignments(reactActive = false) {
    const plan = assignmentPlan();
    if (!plan.categories.length) return null;
    const groups = planGroups(state.cfg).map((group) => ({ ...group, categories: [] }));
    const effective = plan.effective;
    const byGroup = new Map(groups.map((g) => [g.key, []]));
    for (const name of plan.categories.slice().sort()) {
      const key = effective[name] || 'free';
      (byGroup.get(key) || byGroup.get('free')).push(name);
    }
    for (const group of groups) group.categories = byGroup.get(group.key) || [];
    const questions = (plan.questions || []).map((q) => (typeof q === 'string' ? q : q.category || q.name)).filter(Boolean);
    const focusId = _restoreFocusTo;
    _restoreFocusTo = null;
    const panelProps = {
      groups,
      questions,
      expanded: _assignExpanded,
      filter: _assignFilter,
      focusId,
      classes: {
        summary: 'plan-assign-summary muted small',
        group: 'plan-assign-group',
        urgent: 'plan-assign-urgent',
        heading: 'plan-assign-head',
        row: 'plan-assign-row',
        name: 'plan-assign-name',
        full: 'plan-assign-full',
        filter: 'plan-assign-filter',
        key: 'proportion-key',
        count: 'plan-assign-count muted',
        select: 'plan-assign-select',
        more: 'btn sm ghost plan-assign-more',
        empty: 'muted small',
      },
      onFilter: (value) => { _assignFilter = value; },
      onExpand: () => {
        _assignExpanded = !_assignExpanded;
        _openDrawer = 'categories';
        render();
      },
      onAssign: async (name, key, id, urgent) => {
        const next = { ...(state._planGroups || {}) };
        const movedTo = groups.find((x) => x.key === key);
        next[name] = key;
        _openDrawer = 'categories';
        _restoreFocusTo = id;
        await reversible.change({
          metaKey: 'planGroups',
          stateKey: '_planGroups',
          next,
          describe: () => `${name} ${urgent ? 'placed in' : 'moved to'} ${movedTo ? movedTo.label : key}.`,
          track: urgent ? () => trackUsage && trackUsage('plan-group-assign') : undefined,
        });
      },
    };
    if (reactActive) return { key: 'categories', label: 'Categories', panelId: 'plan-panel-categories', component: 'categories', panelProps };
    const details = el('div', { class: 'plan-panel', id: 'plan-panel-categories' });
    details.append(planAssignmentsReact(el, panelProps));
    return { key: 'categories', label: 'Categories', panelId: 'plan-panel-categories', panel: details };
  }

  function planDraftSignature() {
    const t = isUsableTarget(state._planTarget) ? state._planTarget : null;
    const g = state._planGroups ? Object.entries(state._planGroups).sort().join(',') : '';
    const sa = savingAccountKeys().join(',');
    const dr = state._planDraft ? `${JSON.stringify(state._planDraft.targets || {})}|${Object.keys(state._planDraft.answers || {}).length}` : '';
    return `${t ? `${t.fixed}|${t.setAside}|${t.free}|${t.savedAt}` : ''}|${g}|${sa}|${dr}|${_openDrawer || ''}|${_assignExpanded ? 1 : 0}|${_assignFilter}|${_assignJumpVersion}|${wizardSignature()}`;
  }

  return { renderPlanHero, renderPlanLever, renderCoverage, planDraftSignature, planModel };
}
