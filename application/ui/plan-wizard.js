import { isoToday, requireCtx, selectOnFocus } from '../core/shared-helpers.js';
import { planGroups, defaultTargets, GROUP_KEYS } from '../analysis/plan.js';
import { PLAN_DRAFT_KEY, makePlanDraft } from '../analysis/plan-draft.js';
import { commitAndRender } from './reversible.js';

let _step = 0;
let _open = false;
let _answers = {};

export function resetWizard() {
  _step = 0;
  _open = false;
  _answers = {};
}

export function wizardOpen() {
  return _open;
}

export function wizardSignature() {
  return `${_open ? 1 : 0}|${_step}|${Object.entries(_answers).sort().join(',')}`;
}

export function createPlanWizard(ctx) {
  requireCtx(ctx, ['state', 'el', 'money0', 'render', 'toast', 'Store', 'trackUsage'], 'createPlanWizard');
  const { state, el, money0, render, toast, Store, trackUsage } = ctx;

  // Answers already given, recovered from a previous session. A half-finished
  // run of the wizard is real work: seven questions about twenty categories is
  // not something to ask twice because a tab was closed.
  function open() {
    _open = true;
    const draft = state._planDraft;
    _answers = draft && draft.answers ? { ...draft.answers } : {};
    _step = draft && Number.isFinite(draft.step) ? draft.step : 0;
    if (trackUsage) trackUsage('plan-wizard-open');
    render();
  }

  async function close() {
    await commitAndRender({
      commit: persistDraft,
      render: () => {
        resetWizard();
        render();
      },
    });
  }

  async function persistDraft() {
    const existing = state._planDraft || {};
    const draft = makePlanDraft({ answers: _answers, step: _step, targets: existing.targets });
    await Store.setMeta(PLAN_DRAFT_KEY, draft);
    state._planDraft = draft;
    return draft;
  }

  async function commit(questions, targets) {
    const groups = { ...(state._planGroups || {}), ..._answers };
    const writes = [{ key: 'planGroups', value: groups }];
    let saved = null;
    if (targets) {
      saved = { ...targets, v: 2, savedAt: isoToday() };
      writes.push({ key: 'planTarget', value: saved });
    }
    writes.push({ key: PLAN_DRAFT_KEY, value: null });
    const answered = Object.keys(_answers).length;
    await commitAndRender({
      commit: async () => {
        await Store.setMetaMany(writes);
        state._planDraft = null;
        state._planGroups = groups;
        if (saved) state._planTarget = saved;
        resetWizard();
        if (trackUsage) trackUsage('plan-wizard-done');
      },
      render,
      notify: () => toast(answered ? `${answered} sorted.` : 'Plan saved.'),
    });
  }

  function stepDots(total, index) {
    const row = el('div', { class: 'wiz-dots', 'aria-hidden': 'true' });
    for (let i = 0; i < total; i++) {
      row.append(el('i', { class: 'wiz-dot' + (i === index ? ' is-on' : i < index ? ' is-done' : '') }));
    }
    return row;
  }

  // One question per screen. The evidence that settles it sits under the
  // question; everything else the person might want is a click away, never
  // in front of them by default.
  function renderQuestion(q, index, total) {
    const body = el('div', { class: 'wiz-body' });
    body.append(el('p', { class: 'wiz-step' }, `${index + 1} of ${total}`));
    body.append(el('h4', { class: 'wiz-q' }, q.name));
    body.append(
      el(
        'p',
        { class: 'wiz-evidence' },
        `${money0(q.typical)} a month · ${q.because}`
      )
    );
    const picker = el('div', { class: 'wiz-picker', role: 'group', 'aria-label': `Group for ${q.name}` });
    for (const g of planGroups(state.cfg)) {
      const chosen = _answers[q.name] === g.key;
      const btn = el(
        'button',
        {
          type: 'button',
          class: 'btn' + (chosen ? ' primary' : ' ghost'),
          'aria-pressed': chosen ? 'true' : 'false',
        },
        g.label
      );
      btn.addEventListener('click', async () => {
        _answers[q.name] = g.key;
        _step = index + 1;
        await commitAndRender({ commit: persistDraft, render });
      });
      picker.append(btn);
    }
    body.append(picker);
    return body;
  }

  /* Every question before this one shows the evidence that settles it. This one
   * asked a person to type three percentages against nothing - and the app
   * already knows what their months actually run at, because it is the figure
   * the Plan reports on every other screen. The target stays their choice and
   * the fields still start at the 60/20/20 reference rather than at their own
   * habit, which would make any plan on-target by definition; what changes is
   * that they can now see what they are choosing against. */
  function renderTargets(total, observed) {
    const body = el('div', { class: 'wiz-body' });
    body.append(el('p', { class: 'wiz-step' }, 'Last one'));
    body.append(el('h4', { class: 'wiz-q' }, 'How should a normal month split?'));
    const seen = (observed || []).filter((g) => Number.isFinite(g.share)).map((g) => ({
      label: g.label.toLowerCase(),
      pct: Math.round(g.share),
    }));
    if (seen.length) {
      // The control below insists on 100, so the evidence above it has to add up
      // to 100 on the page - otherwise the first thing a person does with it is
      // add three numbers and find they are short. The remainder is derived from
      // the PRINTED figures, never recomputed, so the arithmetic is visible.
      const rest = 100 - seen.reduce((sum, g) => sum + g.pct, 0);
      const parts = seen.map((g) => `${g.pct}% ${g.label}`);
      if (rest >= 1) parts.push(`${rest}% not spent`);
      body.append(el('p', { class: 'wiz-evidence' }, `Your months run at ${parts.join(' \u00b7 ')}`));
    }
    const d = state._planTarget && state._planTarget.v === 2 ? state._planTarget : defaultTargets(state.cfg);
    const inputs = new Map();
    const totalPill = el('span', { class: 'plan-total' }, '');
    const rows = el('div', { class: 'wiz-targets' });
    for (const g of planGroups(state.cfg)) {
      const input = el('input', {
        type: 'number',
        min: '0',
        max: '100',
        step: '1',
        value: String(d[g.key]),
        class: 'plan-pct num',
        inputmode: 'numeric',
        'aria-label': `${g.label} share`,
      });
      selectOnFocus(input);
      const repaint = () => {
        let sum = 0;
        for (const [, i] of inputs) sum += Number(i.value) || 0;
        sum = Math.round(sum * 10) / 10;
        totalPill.textContent = `${sum}%`;
        totalPill.className = 'plan-total' + (Math.abs(sum - 100) < 0.05 ? ' is-balanced' : ' is-off');
      };
      input.addEventListener('input', repaint);
      inputs.set(g.key, input);
      rows.append(
        el(
          'div',
          { class: 'wiz-target-row' },
          el('i', { class: `proportion-key is-${g.key}`, 'aria-hidden': 'true' }),
          el('span', { class: 'wiz-target-label' }, g.label),
          input,
          el('span', { class: 'plan-pct-sign' }, '%')
        )
      );
      queueMicrotask(repaint);
    }
    body.append(rows);
    body.append(el('div', { class: 'wiz-total-row' }, totalPill));

    const done = el('button', { class: 'btn primary', type: 'button' }, 'Done');
    done.addEventListener('click', () => {
      const targets = {};
      for (const key of GROUP_KEYS) targets[key] = Math.max(0, Number(inputs.get(key).value) || 0);
      commit(total, targets);
    });
    body.append(el('div', { class: 'wiz-actions' }, done));
    return body;
  }

  function renderWizard(questions, observed) {
    if (!_open) return null;
    const total = questions.length + 1;
    const card = el('section', { class: 'card plan-wizard', role: 'dialog', 'aria-label': 'Set up my plan' });
    const head = el('div', { class: 'wiz-head' });
    head.append(el('h3', {}, 'Set up my plan'));
    const skip = el('button', { class: 'btn sm ghost', type: 'button' }, 'Not now');
    skip.addEventListener('click', close);
    head.append(skip);
    card.append(head);
    card.append(stepDots(total, Math.min(_step, total - 1)));

    if (_step < questions.length) {
      card.append(renderQuestion(questions[_step], _step, total));
    } else {
      card.append(renderTargets(questions, observed));
    }

    if (_step > 0) {
      const back = el('button', { class: 'btn sm ghost', type: 'button' }, 'Back');
      back.addEventListener('click', () => {
        _step = Math.max(0, _step - 1);
        render();
      });
      card.append(el('div', { class: 'wiz-foot' }, back));
    }
    return card;
  }

  return { open, close, renderWizard };
}
