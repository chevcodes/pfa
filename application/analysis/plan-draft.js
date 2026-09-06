import { GROUP_KEYS, normaliseTargets, isUsableTarget } from './plan.js';

export const PLAN_DRAFT_KEY = 'planDraft';

// Work a person has started but not committed: percentages they have typed and
// wizard answers they have given. This is deliberately SEPARATE from planTarget
// and planGroups, which mean "this is my plan". A draft is not yet an answer,
// so it must never drive the bands or the Overview figure - it only restores
// the controls to where the person left them.
export function makePlanDraft({ targets = null, answers = null, step = 0, at = null } = {}) {
  const draft = {
    v: 1,
    targets: targets && typeof targets === 'object' ? pickTargets(targets) : null,
    answers: answers && typeof answers === 'object' && !Array.isArray(answers) ? { ...answers } : null,
    step: Number.isFinite(Number(step)) && Number(step) >= 0 ? Math.floor(Number(step)) : 0,
    at: at || new Date().toISOString(),
  };
  return hasDraftContent(draft) ? draft : null;
}

function pickTargets(t) {
  const out = {};
  let any = false;
  for (const key of GROUP_KEYS) {
    const v = Number(t[key]);
    if (Number.isFinite(v) && v >= 0 && v <= 100) {
      out[key] = Math.round(v * 10) / 10;
      any = true;
    }
  }
  return any ? out : null;
}

export function hasDraftContent(draft) {
  if (!draft) return false;
  if (draft.targets && Object.keys(draft.targets).length) return true;
  if (draft.answers && Object.keys(draft.answers).length) return true;
  return false;
}

export function readPlanDraft(stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  if (Number(stored.v) !== 1) return null;
  const draft = makePlanDraft(stored);
  return draft;
}

export function draftIsEdited(draftTargets, savedTarget, cfg) {
  if (!draftTargets) return false;
  const shown = normaliseTargets(savedTarget, cfg);
  return GROUP_KEYS.some((key) => {
    const d = Number(draftTargets[key]);
    return Number.isFinite(d) && Math.abs(d - Number(shown[key])) > 0.05;
  });
}

export function draftDiffersFromSaved(draftTargets, savedTarget, cfg) {
  if (!draftTargets) return false;
  if (!isUsableTarget(savedTarget)) return true;
  return draftIsEdited(draftTargets, savedTarget, cfg);
}

/* THE answer to "is my plan saved?", in one place.
 *
 * It was being answered twice, by two different functions, from two different
 * facts. The editor asked draftDiffersFromSaved (is there unsaved typing?) and
 * the hero asked model.targetsAreDefault (is this plan mine rather than the
 * 60/20/20 default?) - a different question wearing the same words. Type one
 * digit into a share and the two disagreed on screen at once:
 *
 *     hero:   "plan saved"
 *     editor: "not saved yet" / button "Save my plan" / "Last saved 09-Sep-26"
 *
 * That is item 19's contradiction again, moved to a new surface, and it is the
 * status a person checks to know whether what they are looking at is really
 * their plan. One function now decides, and every surface reads it.
 *
 * Three states, because there genuinely are three:
 *   'unsaved'  - typed edits that are not committed. Beats everything else.
 *   'saved'    - a plan of their own, committed.
 *   'default'  - no plan of their own yet; nothing to claim.
 */
export function planSaveState({ draftTargets, savedTarget, cfg, targetsAreDefault } = {}) {
  if (draftIsEdited(draftTargets, savedTarget, cfg)) {
    return { state: 'unsaved', label: 'unsaved changes', tone: 'watch' };
  }
  if (targetsAreDefault) return { state: 'default', label: '', tone: 'neutral' };
  return { state: 'saved', label: 'plan saved', tone: 'good' };
}
