import { isoToday, requireCtx } from '../core/shared-helpers.js';
import { planGroups, defaultTargets, GROUP_KEYS } from '../analysis/plan.js';
import { PLAN_DRAFT_KEY, makePlanDraft } from '../analysis/plan-draft.js';
import { commitAndRender } from './reversible.js';
import { planWizardReact } from './react-bridge.js';

let _step = 0;
let _open = false;
let _answers = {};
const WIZARD_CLASSES = {
  head: 'wiz-head', dots: 'wiz-dots', dot: 'wiz-dot', body: 'wiz-body', step: 'wiz-step', question: 'wiz-q',
  evidence: 'wiz-evidence', picker: 'wiz-picker', targets: 'wiz-targets', targetRow: 'wiz-target-row',
  targetLabel: 'wiz-target-label', totalRow: 'wiz-total-row', actions: 'wiz-actions', foot: 'wiz-foot',
};

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
  const { state, money0, render, toast, Store, trackUsage } = ctx;

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

  function renderWizard(questions, observed, asProps = false) {
    if (!_open) return null;
    const total = questions.length + 1;
    const groups = planGroups(state.cfg);
    const targets = state._planTarget && state._planTarget.v === 2 ? state._planTarget : defaultTargets(state.cfg);
    const props = {
      questions: questions.map((question) => ({ ...question, answer: _answers[question.name] })),
      observed,
      groups,
      targets,
      classes: WIZARD_CLASSES,
      step: _step,
      money0,
      onSkip: close,
      onBack: () => {
        _step = Math.max(0, _step - 1);
        render();
      },
      onChoose: async (name, key) => {
        _answers[name] = key;
        _step += 1;
        await commitAndRender({ commit: persistDraft, render });
      },
      onDone: (values) => {
        const nextTargets = {};
        for (const key of GROUP_KEYS) nextTargets[key] = Math.max(0, Number(values[key]) || 0);
        commit(total, nextTargets);
      },
    };
    return asProps ? props : planWizardReact(ctx.el, props);
  }

  return { open, close, renderWizard };
}
