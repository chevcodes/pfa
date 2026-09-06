import { makeProseMoney } from '../core/money-format.js';
import {
  displayText,
  formatDisplayDate,
  isoToday,
  requireCtx,
  selectOnFocus,
  smoothScrollToEl,
  sortedCardStatements,
} from '../core/shared-helpers.js';
import { collapsibleCard, createDecisionHeader, chartInfo, surfaceTone } from './decision-header.js';
import { commitAndRender } from './reversible.js';
import { renderProportionBar } from './chart-surface.js';
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
} from '../analysis/plan.js';
import { spendableCategoryNames } from '../analysis/spendable-categories.js';
import { ownDestinations, suggestedSetAsideDestinations } from '../analysis/set-aside.js';
import { answeredAny } from '../analysis/confirmations.js';
import { investmentContributionsByMonth } from '../analysis/investments.js';
import { autoAssign, categoryEvidence } from '../analysis/plan-autoassign.js';
import { createPlanWizard, wizardOpen, wizardSignature, resetWizard } from './plan-wizard.js';
import { coverageTimeline } from '../analysis/coverage-map.js';
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
let _openDrawer = null;
// The control a person last acted on. A re-render rebuilds the drawer from
// scratch, so without this the page keeps its scroll but loses the checkbox -
// tabbing resumes from the top of the document and a screen reader loses its
// place. Undoing a choice must return you to where you made it, not near it.
let _restoreFocusTo = null;
// Stage two of the categories drawer: the full editable list. Session-only, so
// it never becomes another setting to manage.
let _assignExpanded = false;

export function resetPlanDraft() {
  resetWizard();
  _draftTargets = null;
  _openDrawer = null;
  _assignFilter = '';
  _assignExpanded = false;
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
  } = ctx;
  const { renderDecisionHeader } = createDecisionHeader({ el });
  // Any figure that is not a headline reads short: summaries, the over/under
  // annotation, destination amounts. The ACTUAL/PLAN values stay exact.
  const prose = makeProseMoney(state.cfg || {});
  const wizard = createPlanWizard({ state, el, money0, render, toast, Store, trackUsage });
  const coverage = createCoverageStrip({ el });

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
    const evidence = categoryEvidence(state.rows || [], { asOf: todayISO() });
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
  function renderPlanHero() {
    const built = planModel();
    if (!built) return null;
    const { raw, model } = built;

    const bar = renderProportionBar(
      { el, money0, moneyShort },
      { label: 'How a normal month divides', money: money0, bands: model.bands }
    );

    const tags = [];
    if (model.unusual) tags.push({ text: 'unusual month', tone: 'neutral' });
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
    // Always built, hidden when there is nothing to claim, so typing into a
    // default plan has a tag to turn on rather than needing a whole re-render
    // to make one appear.
    tags.push(
      el(
        'span',
        {
          class: 'tag plan-save-tag tone-' + surfaceTone(saveState.tone),
          'data-save-state': saveState.state,
          ...(saveState.label ? {} : { hidden: '' }),
        },
        saveState.label
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

    const workingRow = (label, value) =>
      el('div', { class: 'plan-working' }, el('span', {}, label), el('span', { class: 'num money' }, value));
    const why = [
      model.unusual ? el('p', {}, model.unusual.text) : null,
      el(
        'p',
        {},
        `Take-home ${model.income.amountProse} - the middle of ${model.income.basis}, not the month on screen.`
      ),
      el(
        'div',
        { class: 'plan-workings' },
        workingRow('Standing payments', model.workings.committedText),
        workingRow('Other bank debits', model.workings.bankEverydayText),
        workingRow('Card, obliged', model.workings.cardFixedText),
        workingRow('Card discretionary spending', model.workings.cardFreeText)
      ),
      el('p', {}, 'A group is decided by whether the money is owed, not by how often it goes out.'),
    ];
    if (raw.setAsideWithinCommitments > 0) {
      why.push(
        el('p', {}, `${money0(raw.setAsideWithinCommitments)} of it goes into savings - counted there, not twice.`)
      );
    }
    if (raw.statementSetAside && raw.statementSetAside.amount > 0) {
      why.push(
        el(
          'p',
          {},
          `${money0(raw.statementSetAside.amount)} of the money set aside is confirmed by your investment statements, so matching bank transfers in those months aren't counted again.`
        )
      );
    }
    if (raw.statementSetAside && raw.statementSetAside.designatedOverlap) {
      why.push(
        el(
          'p',
          { class: 'muted' },
          'In those months money also went to an account you marked as savings. If that account is your investment account, it may be counted twice.'
        )
      );
    }
    if (model.drawdown) why.push(el('p', {}, model.drawdownText));
    if (model.unaccounted > 0.5) {
      why.push(el('p', {}, `${model.unaccountedProse} never went out - it stayed put, or moved somewhere the statements don't show.`));
    }
    for (const f of model.foreignSetAside) why.push(el('p', {}, f.text));
    if (raw.gaps.length) why.push(el('p', { class: 'muted' }, `Thin on data: ${raw.gaps.join('; ')}.`));

    return renderDecisionHeader({
      id: 'plan-header',
      class: 'view-forecast plan-primary',
      question: 'Monthly income allocation',
      figure: { text: model.free.amountText },
      meaning: model.free.label,
      tags,
      note: { text: model.free.reconciling.text, tone: model.free.reconciling.tone },
      why,
      extra: bar,
      // D4: the reasoning sits below the picture it explains. Between the note
      // and the bar it interrupted answer -> picture, the one sequence this
      // card exists to deliver.
      extraBeforeFooter: true,
    });
  }

  /* ---- the plan: three groups, a target share each, how it is tracking ---- */
  function renderPlanLever() {
    const built = planModel();
    if (!built) return null;
    const { raw, model } = built;
    if (model.takeHome <= 0) return null;
    const questions = assignmentPlan().questions;

    if (wizardOpen()) return wizard.renderWizard(questions, built.raw.groups);

    // A plain container, NOT a card: collapsibleCard supplies the card shell and
    // the title. Leaving this as a .card nested one card inside another - two
    // borders, two lots of padding, and "My plan" printed twice, once on the
    // disclosure summary and again on the heading below it.
    const sec = el('div', { class: 'plan-sheet' });
    const head = el('div', { class: 'plan-sheet-head-row' });
    const incomeMethod =
      raw.income.basis === 'repeating'
        ? `the average of ${raw.income.monthsUsed} similar complete months`
        : raw.income.basis === 'median'
          ? `the middle amount from ${raw.income.monthsUsed} complete months`
          : raw.income.basis === 'lowest'
            ? `the lowest of ${raw.income.monthsSeen} complete months because income varied`
            : 'the one complete month loaded';
    head.append(
      chartInfo(
        el,
        'How this works',
        `Every percentage uses your normal monthly take-home of ${model.takeHomeText}. It is ${incomeMethod}. Fixed expenses are money you owe; savings are money you move aside; everything else is discretionary spending. 60/20/20 is a starting point.`
      )
    );
    if (questions.length) {
      // U4: an optional tidying task sat as a solid pill beside the card's
      // name, reading as loud as the plan itself.
      const setUp = el(
        'button',
        { class: 'btn sm ghost plan-sort', type: 'button' },
        `Sort ${questions.length} ${questions.length === 1 ? 'category' : 'categories'}`
      );
      setUp.addEventListener('click', () => wizard.open());
      head.append(setUp);
    }
    sec.append(head);

    // U1: the balance total changes as a person types, so it is announced
    // rather than silently updating for anyone not watching that corner.
    const totalPill = el('button', {
      type: 'button',
      class: 'btn sm plan-total',
    });
    totalPill.addEventListener('click', () => {
      if (!totalPill.disabled) balanceShares();
    });
    // 2: the status slot is never empty - with a plan saved and nothing typed
    // it used to render blank, leaving the left of the row a void with the
    // buttons pinned to the far edge. Its text is set by repaint().
    const savedNote = el('span', { class: 'plan-saved-note' }, '');
    // Declared after the header is built, so it is attached here rather than
    // referenced before initialisation.
    head.append(totalPill);
    const unsavedFlag = el('span', { class: 'plan-unsaved', hidden: '' }, 'not saved yet');
    // No column header: each block labels its own figures inline, so there is
    // nothing left for a header row to explain.
    const grid = el('div', { class: 'plan-groups' });
    const inputs = new Map();
    const cells = new Map();

    function readTargets() {
      const t = {};
      for (const key of GROUP_KEYS) {
        const input = inputs.get(key);
        t[key] = input ? Math.max(0, Number(input.value) || 0) : 0;
      }
      return t;
    }

    const save = el('button', { class: 'btn primary', type: 'button' }, 'Save my plan');
    // Typing does not re-render the hero, so without this the card at the top
    // of the tab kept its last answer while the editor moved on - the exact
    // contradiction this round set out to remove. Same function, same words.
    function paintHeroSaveTag(unsaved) {
      const tag = document.querySelector('.plan-save-tag');
      if (!tag) return;
      const st = planSaveState({
        draftTargets: unsaved ? currentDraftTargets() : null,
        savedTarget: state._planTarget,
        cfg: state.cfg,
        targetsAreDefault: !isUsableTarget(state._planTarget),
      });
      tag.textContent = st.label;
      tag.hidden = !st.label;
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
      unsavedFlag.hidden = !unsaved;
      paintHeroSaveTag(unsaved);
      if (savedNote) {
        const savedAt =
          isUsableTarget(state._planTarget) && state._planTarget.savedAt
            ? formatDisplayDate(state._planTarget.savedAt)
            : '';
        savedNote.replaceChildren(
          displayText(
            unsaved
              ? savedAt
                ? `Last saved ${savedAt}`
                : ''
              : savedAt
                ? `Saved ${savedAt}`
                : savable
                  ? ''
                  : 'Saved'
          )
        );
      }
      const off = !targetsTotal100(t);
      save.disabled = !savable || off;
      save.textContent = savable ? 'Save my plan' : 'Saved';
      save.title = off ? 'The three shares do not add up to 100% of take-home' : '';
      if (_saveTimer) clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => {
        Store.setMeta(PLAN_DRAFT_KEY, state._planDraft).catch((error) => {
          console.warn('Plan draft could not be saved.', error);
          toast('Your unfinished plan changes could not be remembered on this device.');
        });
      }, 400);
    }

    function repaint() {
      const t = readTargets();
      rememberDraft(t);
      const total = Math.round((t.fixed + t.setAside + t.free) * 10) / 10;
      const balanced = Math.abs(total - 100) < 0.05;
      totalPill.textContent = balanced
        ? `${total}% of take-home`
        : `${total}% of take-home - make it 100%`;
      totalPill.className = 'btn sm plan-total' + (balanced ? ' is-balanced' : ' is-off is-fixable');
      totalPill.disabled = balanced;
      totalPill.setAttribute('aria-label', balanced
        ? `${total}% of take-home`
        : `Shares total ${total}%. Activate to scale them to 100%.`);
      for (const g of model.groups) {
        const c = cells.get(g.key);
        if (!c) continue;
        const targetAmt = (model.takeHome * t[g.key]) / 100;
        const diff = g.actual - targetAmt;
        const onTarget = Math.abs(diff) < onTargetTolerance(model.takeHome);
        // Short, matching the figure it was built from (buildPlanModel's
        // targetAmountText) - this line repaints the same cell while a share is
        // being edited, so writing it exact here reintroduced the long figure
        // the moment anyone touched a percentage.
        c.target.textContent = prose(targetAmt);
        c.track.textContent = onTarget
          ? 'on target'
          : `${prose(Math.abs(diff))} ${diff > 0 ? 'over' : 'under'}`;
        c.track.className = 'plan-track' + (onTarget ? ' is-on' : diff > 0 ? ' is-over' : ' is-under');
        // U2: nothing happening in a group is shown as nothing, not as a
        // figure competing with the two that carry real money.
        if (c.row) c.row.classList.toggle('is-empty', !g.actual);
        // The track is the plan; the fill is what happened against it. Past
        // the end of the track the bar is marked over rather than silently
        // clamped, so exceeding a plan looks different from meeting it.
        const ratio = targetAmt > 0 ? g.actual / targetAmt : 0;
        c.meter.style.width = `${Math.max(g.actual > 0 ? 2 : 0, Math.min(100, ratio * 100))}%`;
        if (c.bar) c.bar.classList.toggle('is-over', !onTarget && ratio > 1);
      }
    }

    for (const g of model.groups) {
      // One self-contained block per group, not a row in a five-column table.
      // A table forced the eye across a wide gutter from a name to its
      // numbers, needed a header to explain itself, and left the one genuinely
      // actionable figure - how far off plan you are - as small grey text at
      // the far edge. Each block now reads top to bottom on its own.
      const row = el('div', { class: `plan-row is-${g.key}` });

      const restored = currentDraftTargets();
      const input = el('input', {
        type: 'number',
        min: '0',
        max: '100',
        step: '1',
        value: String(restored && restored[g.key] != null ? restored[g.key] : g.targetPct),
        class: 'plan-pct num',
        inputmode: 'numeric',
        'aria-label': `${g.label} target share of take-home`,
        title: 'Enter saves · Esc reverts · Shift+arrows step by 5',
      });
      input.addEventListener('input', repaint);
      // F2: typing a share meant clicking in, clearing the old value, then
      // typing. Shared with every other prefilled field in the app.
      selectOnFocus(input);
      // F3: the arrows already step by 1; holding shift steps by 5, so a big
      // move does not need five presses or a full retype.
      input.addEventListener('keydown', (e) => {
        if (!e.shiftKey) return;
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const current = Number(input.value) || 0;
        const next = e.key === 'ArrowUp' ? current + 5 : current - 5;
        input.value = String(Math.max(0, Math.min(100, next)));
        repaint();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitPlan();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          revertToSaved();
        }
      });
      input.addEventListener('blur', () => {
        // An emptied field stayed empty while the plan read it as 0 - the
        // number on screen and the number being used disagreed, and the total
        // pill silently counted a share the person could not see. Number('')
        // is 0, so the old finite/negative guard never fired on a blank.
        const raw = String(input.value).trim();
        const v = Number(raw);
        if (raw === '' || !Number.isFinite(v) || v < 0) input.value = '0';
        else if (v > 100) input.value = '100';
        repaint();
      });
      input.dataset.group = g.key;
      inputs.set(g.key, input);
      // Restore the caret after a save-driven rebuild.
      if (_focusGroup === g.key) {
        queueMicrotask(() => {
          input.focus();
          input.select();
        });
        _focusGroup = null;
      }

      /* THE BAND IS THE WAY INTO WHAT IS IN IT.
       *
       * "Discretionary spending - actual $143k against a plan of $60k, $83k
       * over" is the most actionable line on this tab, and it named a band
       * without ever saying which categories are in it. The answer was three
       * taps away behind a drawer trigger, a "Change any of the 20" button and
       * a scroll - the person being asked to reconstruct the band the sentence
       * had just totalled.
       *
       * The band name opens the list, at its own group. No figures there to
       * contradict the ones here: it is the composition, which is the part
       * this row cannot show and the only part a person can change. */
      const bandLink = el(
        'button',
        {
          type: 'button',
          class: 'linkbtn plan-row-label',
          title: `See the categories counted as ${g.label}`,
          onclick: () => {
            _openDrawer = 'categories';
            _assignExpanded = true;
            render();
            smoothScrollToEl(`#plan-band-${g.key}`);
          },
        },
        g.label
      );
      row.append(
        el(
          'div',
          { class: 'plan-row-top' },
          el(
            'span',
            { class: 'plan-row-name' },
            el('i', { class: `proportion-key is-${g.key}`, 'aria-hidden': 'true' }),
            bandLink
          ),
          el('span', { class: 'plan-row-share' }, input, el('span', { class: 'plan-pct-sign' }, '%'))
        )
      );

      // The bar is the block's centre of gravity: the track is the plan, the
      // fill is what actually happened against it. Progress is read at a
      // glance instead of being inferred from two figures and a hairline.
      const meter = el('i', { class: `plan-bar-fill is-${g.key}` });
      const bar = el('div', { class: 'plan-bar', 'aria-hidden': 'true' }, meter);
      row.append(bar);

      const actualEl = el(
        'span',
        { class: 'plan-row-actual' },
        el('span', { class: 'plan-amount-label' }, 'Actual'),
        el('span', { class: 'money num' }, g.actualText)
      );
      const targetValue = el('span', { class: 'money num' }, g.targetAmountText);
      const targetEl = el(
        'span',
        { class: 'plan-target-amt' },
        el('span', { class: 'plan-amount-label' }, 'Plan'),
        targetValue
      );
      const trackEl = el('span', { class: 'plan-track' }, g.trackText);
      row.append(
        el(
          'div',
          { class: 'plan-row-foot' },
          el(
            'span',
            { class: 'plan-row-amounts' },
            actualEl,
            targetEl
          ),
          trackEl
        )
      );

      cells.set(g.key, { target: targetValue, track: trackEl, meter, row, bar });
      grid.append(row);
    }
    sec.append(grid);


    function balanceShares() {
      const t = readTargets();
      const sum = t.fixed + t.setAside + t.free;
      if (!sum) return;
      let left = 100;
      GROUP_KEYS.forEach((key, i) => {
        const input = inputs.get(key);
        if (!input) return;
        const share = i === GROUP_KEYS.length - 1 ? left : Math.round((t[key] / sum) * 100);
        left -= share;
        input.value = String(Math.max(0, share));
      });
      repaint();
    }

    async function revertToSaved() {
      const back = normaliseTargets(state._planTarget, state.cfg);
      for (const key of GROUP_KEYS) {
        const input = inputs.get(key);
        if (input) input.value = String(back[key]);
      }
      // Through the shared contract, and the draft write is FLUSHED rather than
      // left on its 400ms debounce.
      //
      // Discarding edits is a commit too - the draft has to stop existing. It
      // was announced immediately while the write that removes it was still
      // pending, so a person who reverted and closed the tab inside 400ms was
      // told they were back to their saved plan and then met their discarded
      // edits again on the next load. The same shape as the other five: the
      // sentence arrived before the state it described.
      await commitAndRender({
        commit: async () => {
          repaint();
          if (_saveTimer) clearTimeout(_saveTimer);
          _saveTimer = null;
          await Store.setMeta(PLAN_DRAFT_KEY, state._planDraft);
        },
        render: () => {},
        notify: () => toast('Back to your saved plan.'),
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
          _focusGroup = document.activeElement && inputs.has(document.activeElement.dataset.group)
            ? document.activeElement.dataset.group
            : null;
          if (trackUsage) trackUsage('plan-target-saved');
        },
        render,
        notify: () => toast(`Plan saved - ${saved.fixed}/${saved.setAside}/${saved.free}.`),
      });
    }
    save.addEventListener('click', commitPlan);
    const actions = el('div', { class: 'plan-lever-actions' }, save);
    const secondary = el('div', { class: 'plan-lever-actions is-secondary' });
    // One primary action. Balancing, resetting and clearing are things a person
    // does occasionally and deliberately - they were three buttons of equal
    // weight beside Save, so the row read as four choices rather than one
    // action with an escape hatch.
    // More is a drawer like the other two, not a <details> of its own. As a
    // <details> it carried order:4 -> order:10; flex-basis:100% on open, so
    // opening it threw the button out of the toolbar onto a row of its own -
    // the summary jumped out from under the pointer, and a second click landed
    // on whatever had slid into that spot. Same defect the other two drawers
    // had; same mechanism fixes it, rather than a second one alongside.
    const moreDrawer = {
      key: 'more',
      label: 'More',
      panel: el('div', { class: 'plan-panel plan-panel-more', id: 'plan-panel-more' }, secondary),
    };

    // 1: ONE toolbar - status, settings, action - instead of an action row and
    // a separate shelf of drawers, each with its own rule above it.
    const footer = el(
      'div',
      { class: 'plan-foot', role: 'group', 'aria-label': 'Plan actions and settings' },
      el('div', { class: 'plan-foot-status' }, unsavedFlag, savedNote)
    );

    // 7: balancing three numbers by hand is arithmetic the app can do. Scales
    // the current split to 100% while keeping its proportions, so a person can
    // express intent ("more saving") without also solving for the remainder.
    const reset = el('button', { class: 'btn sm ghost', type: 'button' }, 'Reset to 60/20/20');
    reset.addEventListener('click', () => {
      const d = defaultTargets(state.cfg);
      for (const key of GROUP_KEYS) {
        const input = inputs.get(key);
        if (input) input.value = String(d[key]);
      }
      repaint();
    });
    secondary.append(reset);

    if (isUsableTarget(state._planTarget)) {
      const clear = el('button', { class: 'btn danger', type: 'button' }, 'Clear plan');
      clear.addEventListener('click', async () => {
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
      });
      secondary.append(clear);
    }
    // The triggers live in the toolbar and STAY there; their panels open in a
    // single region below it. One open at a time, so the card cannot grow two
    // long lists at once.
    const drawers = [renderSavingsPicker(), renderAssignments(), moreDrawer].filter(Boolean);
    const panels = el('div', { class: 'plan-panels' });
    const triggers = el('div', { class: 'plan-drawer-triggers' });
    for (const d of drawers) {
      const open = _openDrawer === d.key;
      const trigger = el(
        'button',
        {
          type: 'button',
          class:
            'plan-drawer-summary' +
            (open ? ' is-open' : '') +
            (d.key === 'more' ? ' is-more' : ''),
          'aria-expanded': open ? 'true' : 'false',
          'aria-controls': d.panel.id,
        },
        d.label
      );
      trigger.addEventListener('click', () => {
        _openDrawer = _openDrawer === d.key ? null : d.key;
        render();
      });
      triggers.append(trigger);
      d.panel.hidden = !open;
      panels.append(d.panel);
    }
    footer.append(triggers);
    panels.hidden = !_openDrawer;
    footer.append(panels);
    footer.append(actions);
    sec.append(footer);

    if (state._planDraft && draftIsEdited(state._planDraft.targets, state._planTarget, state.cfg) && !isUsableTarget(state._planTarget)) {
      const status =
        typeof footer.querySelector === 'function'
          ? footer.querySelector('.plan-foot-status')
          : null;
      (status || footer).append(
        chartInfo(
          el,
          '',
          'These are the edits you left unsaved last time, not your saved plan. Nothing is stored until you press Save my plan.'
        )
      );
    }
    repaint();

    const offTarget = planNeedsAttention(built.raw || null);
    const unsavedWork = !!(state._planDraft && state._planDraft.targets);
    const summary = offTarget
      ? offTargetSummary(model)
      : unsavedWork
        ? 'Unsaved changes'
        : `${model.targetTotalText || ''} on plan`.trim();
    return collapsibleCard(el, {
      title: 'My plan',
      summary,
      icon: icon(iconPie()),
      body: sec,
      name: 'plan-my-plan-card',
    });
  }

  /* The one line a closed plan card shows when something is off. Names the
   * band and the size of the gap, so the card is worth reading shut. */
  function offTargetSummary(model) {
    const groups = (model && model.groups) || [];
    const worst = groups
      .filter((g) => g.direction && g.direction !== 'on')
      .filter((g) => !(g.key === 'free' && g.direction === 'under'))
      .sort((a, b) => Math.abs(b.diff || 0) - Math.abs(a.diff || 0))[0];
    if (!worst) return 'Needs a look';
    // "Fixed expenses: $98k under" is only a complete sentence inside the card,
    // where the figure sits on a row labelled Actual and Plan. Shut, the card
    // shows this line alone, and "under" with nothing after it could as easily
    // mean under last month. Named with the same word the row beneath it uses.
    return `${worst.label}: ${worst.trackText} plan`;
  }

  /* ---- which of my own accounts counts as saving ---- */
  function renderSavingsPicker() {
    const dests = ownDestinations(classifiedBank(), {
      asOf: todayISO(),
      baseCurrency: (state.cfg.currency || {}).code || 'JMD',
    }).filter((d) => d.months >= 2);
    if (!dests.length) return null;
    // NEVER CHOSEN is not CHOSE NONE.
    //
    // With nothing ticked, "Savings & investments" reads $0.00 against its
    // target and the plan reports being tens of thousands under on saving -
    // a setup step that looks like a failure. Where an account behaves like a
    // savings destination (receives transfers most months, little comes back
    // out), it is pre-ticked as a SUGGESTION for someone who has never made a
    // choice here.
    //
    // Once a person has chosen - including choosing none, which is an empty
    // array rather than an absent value - their choice stands untouched.
    // Declared BEFORE the suggestion below reads it. It used to sit after, so
    // the branch that runs only for someone who has never chosen - the exact
    // person the suggestion exists for - hit a temporal dead zone and threw.
    const cardAccounts = new Set((state.cardAccounts || []).map((a) => String(a)));
    const hasChosen = answeredAny(state.confirmations, 'saving');
    const suggested = hasChosen
      ? []
      : suggestedSetAsideDestinations(classifiedBank(), {
          asOf: todayISO(),
          baseCurrency: (state.cfg.currency || {}).code || 'JMD',
          cardKeys: dests
            .filter((d) => [...cardAccounts].some((a) => d.key.endsWith(String(a).slice(-4))))
            .map((d) => d.key),
        }).map((d) => d.key);
    const suggestedKeys = new Set(suggested);
    const chosen = new Set(hasChosen ? savingAccountKeys() : suggested);

    // A trigger that stays put and a panel that opens beneath it. As a
    // <details> inside the toolbar, opening reordered the element to a new
    // full-width row - so the control jumped out from under the cursor at the
    // moment it was clicked.
    const panel = el('div', { class: 'plan-panel', id: 'plan-panel-savings' });
    const list = el('div', { class: 'plan-assign-list' });
    for (const d of dests) {
      const isCard = [...cardAccounts].some((a) => d.key.endsWith(a.slice(-4)));
      const on = chosen.has(d.key);
      const row = el('div', { class: 'plan-assign-row' });
      row.append(
        el(
          'span',
          { class: 'plan-assign-name' },
          el('span', {}, d.label),
          el('span', { class: 'plan-dest-amt muted' }, `${prose(d.perMonth)} a month`)
        )
      );
      const box = el('input', {
        type: 'checkbox',
        class: 'plan-dest-check',
        id: `dest-${d.key.replace(/[^a-z0-9]+/gi, '-')}`,
        ...(on ? { checked: '' } : {}),
      });
      const btn = el(
        'label',
        { class: 'plan-dest-toggle' + (isCard ? ' is-card' : ''), for: box.id },
        box,
        el('span', {}, 'Counts as saving'),
        !isCard && suggestedKeys.has(d.key)
          ? el(
              'span',
              {
                class: 'vm-tag tone-neutral plan-dest-suggested',
                title: 'Suggested because money goes here most months and little comes back out. Untick if that is wrong.',
              },
              'suggested'
            )
          : null
      );
      const action = el(
        'span',
        { class: 'plan-dest-action' },
        btn,
        isCard
          ? chartInfo(
              el,
              '',
              'Only payments above the minimum count here. Paying off the card clears debt rather than putting money aside.'
            )
          : null
      );
      box.addEventListener('change', async () => {
        // Reversible, and the drawer stays open on the row you were looking at,
        // so a tick can be undone without hunting for where you were. Ticking
        // an account changes what "Savings & investments" reports for every
        // month - a change worth being able to take straight back.
        const adding = !chosen.has(d.key);
        _openDrawer = 'savings';
        _restoreFocusTo = box.id;
        // The same stored answer, in the same place, as every other thing the
        // person has told this app. Ticking is an answer about one account, so
        // an account never asked about is left to inference rather than being
        // silently recorded as a "no".
        await confirmAnswer({
          inference: 'saving',
          subject: d.key,
          answer: adding,
          describe: () =>
            adding ? `${d.label} now counts as saving.` : `${d.label} no longer counts as saving.`,
          track: 'plan-designate-savings',
        });
      });
      row.append(action);
      list.append(row);
      if (_restoreFocusTo === box.id) {
        const id = _restoreFocusTo;
        _restoreFocusTo = null;
        queueMicrotask(() => {
          const node = document.getElementById(id);
          if (node) node.focus({ preventScroll: true });
        });
      }
    }
    panel.append(list);
    return { key: 'savings', label: 'Where savings go', panel };
  }

  /* ---- where each category sits, grouped by where it sits ---- */
  function renderAssignments() {
    const plan = assignmentPlan();
    if (!plan.categories.length) return null;
    const groups = planGroups(state.cfg);
    const effective = plan.effective;
    const byGroup = new Map(groups.map((g) => [g.key, []]));
    for (const name of plan.categories.slice().sort()) {
      const key = effective[name] || 'free';
      (byGroup.get(key) || byGroup.get('free')).push(name);
    }

    const details = el('div', { class: 'plan-panel', id: 'plan-panel-categories' });

    // Twenty categories is a wall to scan when you came to move one. Typing
    // narrows it; the filter is session-only, so it never becomes another
    // thing to clean up.
    const filter = el('input', {
      type: 'search',
      class: 'plan-assign-filter',
      placeholder: 'Find a category',
      'aria-label': 'Filter categories',
      value: _assignFilter,
    });
    filter.addEventListener('input', () => {
      _assignFilter = filter.value;
      const needle = _assignFilter.trim().toLowerCase();
      let shown = 0;
      for (const row of fullList.querySelectorAll('.plan-assign-row')) {
        const name = (row.dataset.name || '').toLowerCase();
        const hit = !needle || name.includes(needle);
        row.hidden = !hit;
        if (hit) shown += 1;
      }
      for (const block of fullList.querySelectorAll('.plan-assign-group')) {
        const any = [...block.querySelectorAll('.plan-assign-row')].some((r) => !r.hidden);
        block.hidden = !any;
      }
      empty.hidden = shown > 0;
    });
    const empty = el('p', { class: 'muted small', hidden: '' }, 'No category matches that.');

    // STAGED, not dumped. Opening this used to hand over twenty rows and
    // twenty-one controls in one motion - 835px of editable detail for someone
    // who had asked one question: "what about my categories?"
    //
    // Stage one answers that question and shows only the rows that still need a
    // decision. Stage two, a separate deliberate tap, is the full editable
    // list. Nobody is handed more than they asked for in a single motion.
    const unsorted = plan.questions ? plan.questions.length : 0;
    const summaryLine = el(
      'p',
      { class: 'plan-assign-summary muted small' },
      unsorted
        ? `${plan.categories.length} categories sorted, ${unsorted} still to place.`
        : `All ${plan.categories.length} categories are sorted.`
    );
    details.append(summaryLine);

    // The immediate cause, if there is one. A person told "6 still to place"
    // should not then have to open the full list to find WHICH six - that is
    // making them do the work of the sentence they were just shown. The rows
    // needing a decision are actionable right here; everything already sorted
    // waits behind the second tap.
    const needing = (plan.questions || []).slice();
    if (needing.length) {
      const urgent = el('div', { class: 'plan-assign-group plan-assign-urgent' });
      urgent.append(
        el('h5', { class: 'plan-assign-head' }, el('span', {}, 'Still to place'))
      );
      for (const q of needing) {
        const name = typeof q === 'string' ? q : q.category || q.name;
        if (!name) continue;
        const row = el('div', { class: 'plan-assign-row', dataset: { name } });
        const id = `place-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
        row.append(el('label', { class: 'plan-assign-name', for: id }, name));
        const select = el('select', { class: 'plan-assign-select', id, 'aria-label': `Group for ${name}` });
        select.append(el('option', { value: '' }, 'Choose…'));
        for (const option of groups) select.append(el('option', { value: option.key }, option.label));
        select.addEventListener('change', async () => {
          if (!select.value) return;
          const next = { ...(state._planGroups || {}) };
          const movedTo = groups.find((x) => x.key === select.value);
          next[name] = select.value;
          _openDrawer = 'categories';
          _restoreFocusTo = id;
          await reversible.change({
            metaKey: 'planGroups',
            stateKey: '_planGroups',
            next,
            describe: () => `${name} placed in ${movedTo ? movedTo.label : select.value}.`,
            track: () => trackUsage && trackUsage('plan-group-assign'),
          });
        });
        row.append(select);
        urgent.append(row);
      }
      details.append(urgent);
    }

    const fullList = el('div', { class: 'plan-assign-full', hidden: _assignExpanded ? null : '' });
    const moreBtn = el(
      'button',
      { type: 'button', class: 'btn sm ghost plan-assign-more' },
      _assignExpanded ? 'Hide the full list' : `Change any of the ${plan.categories.length}`
    );
    moreBtn.addEventListener('click', () => {
      // Closes exactly the way it opened, in place, without moving the page.
      _assignExpanded = !_assignExpanded;
      _openDrawer = 'categories';
      render();
    });
    details.append(moreBtn);
    fullList.append(filter);

    // Grouped under the heading it currently belongs to, so the taxonomy is
    // readable at a glance instead of having to be reconstructed row by row.
    // One dropdown per category rather than a row of buttons: with this many
    // categories a button per group is dozens of controls competing for the
    // same glance.
    for (const g of groups) {
      const names = byGroup.get(g.key) || [];
      if (!names.length) continue;
      const block = el('div', { class: 'plan-assign-group', id: `plan-band-${g.key}`, tabindex: '-1' });
      block.append(
        el(
          'h5',
          { class: 'plan-assign-head' },
          el('i', { class: `proportion-key is-${g.key}`, 'aria-hidden': 'true' }),
          el('span', {}, g.label),
          el('span', { class: 'plan-assign-count muted' }, String(names.length))
        )
      );
      for (const name of names) {
        const row = el('div', { class: 'plan-assign-row', dataset: { name } });
        const id = `assign-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
        row.append(el('label', { class: 'plan-assign-name', for: id }, name));
        const select = el('select', { class: 'plan-assign-select', id, 'aria-label': `Group for ${name}` });
        for (const option of groups) {
          const opt = el('option', { value: option.key }, option.label);
          if (option.key === g.key) opt.selected = true;
          select.append(opt);
        }
        select.addEventListener('change', async () => {
          const next = { ...(state._planGroups || {}) };
          const movedTo = groups.find((x) => x.key === select.value);
          next[name] = select.value;
          _openDrawer = 'categories';
          _restoreFocusTo = id;
          // Moving a category silently changes what every band reports for
          // every month. Saying which category moved where, with the way back
          // beside it, is the difference between a change and an accident.
          await reversible.change({
            metaKey: 'planGroups',
            stateKey: '_planGroups',
            next,
            describe: () => `${name} moved to ${movedTo ? movedTo.label : select.value}.`,
            track: () => trackUsage && trackUsage('plan-group-assign'),
          });
        });
        row.append(select);
        block.append(row);
      }
      fullList.append(block);
    }
    fullList.append(empty);
    details.append(fullList);
    return { key: 'categories', label: 'Categories', panel: details };
  }

  function planDraftSignature() {
    const t = isUsableTarget(state._planTarget) ? state._planTarget : null;
    const g = state._planGroups ? Object.entries(state._planGroups).sort().join(',') : '';
    const sa = savingAccountKeys().join(',');
    const dr = state._planDraft ? `${JSON.stringify(state._planDraft.targets || {})}|${Object.keys(state._planDraft.answers || {}).length}` : '';
    return `${t ? `${t.fixed}|${t.setAside}|${t.free}|${t.savedAt}` : ''}|${g}|${sa}|${dr}|${_openDrawer || ''}|${_assignExpanded ? 1 : 0}|${_assignFilter}|${wizardSignature()}`;
  }

  return { renderPlanHero, renderPlanLever, renderCoverage, planDraftSignature, planModel };
}
