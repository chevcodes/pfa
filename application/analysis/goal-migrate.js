/*
 * goal-migrate.js  -  non-destructive migration from the OLD goal shape
 * (state.goal = { type, params, createdAt }, types runway/clear-card/spend-ceiling)
 * to the proven goals.js shape. Runs once on load. NEVER discards a saved goal
 * and NEVER touches goalLog (the frozen monthly follow-up history stays intact
 * as a read-only record, exactly as clearGoal already preserves it).
 *
 * Mapping (from the side-by-side model map):
 *   runway         -> cushion       (targetDays; identical meaning: N days of outflow buffer)
 *   clear-card     -> clear-card     (targetDate; unchanged)
 *   spend-ceiling  -> spend-ceiling  (params.ceiling -> amount)
 *
 * The old goal carried no safety boundary or trigger, so the migrated goal gets
 * NONE (boundary 'none', trigger null) - the person authors those later. That is
 * the honest default: we never invent a boundary the user didn't set.
 */
import { CUSHION_BASIS, DEFAULT_CUSHION_MONTHS } from './cushion.js';

/* THE set of goal types in the migrated shape. GOAL_TYPES (reporting-insights)
 * is the PICKER's list and still carries the legacy id 'runway' for what the
 * engine calls 'cushion', so the two lists are deliberately different views of
 * the same three goals - this one names what is actually stored. Exported so
 * nothing has to retype it. */
export const MIGRATED_GOAL_TYPES = new Set(['cushion', 'clear-card', 'spend-ceiling']);

export function migrateGoal(oldGoal) {
  if (!oldGoal || !oldGoal.type) return null;
  const p = oldGoal.params || {};
  const base = {
    id: oldGoal.id || `goal_${Math.random().toString(36).slice(2, 10)}`,
    active: true,
    trigger: null, // old goals had none; person authors later
    createdAt: oldGoal.createdAt || new Date().toISOString(),
    migratedFrom: oldGoal.type, // audit trail: what it used to be
  };
  switch (oldGoal.type) {
    case 'runway':
      return {
        ...base,
        type: 'cushion',
        // targetDays is kept verbatim: this module never discards saved state,
        // and a day count is the audit trail of what the person originally set.
        // It is no longer what the goal MEASURES - the emergency fund now asks
        // for months of expenses, a question a day count cannot be converted
        // into, so the new target starts at the default and the person adjusts
        // it rather than inheriting a silently mistranslated number.
        targetDays: Number(p.targetDays) || null,
        // A goal just SAVED by the picker arrives here carrying the months the
        // person actually chose; only a goal from an older build lacks one and
        // takes the default. Reading the default unconditionally would have
        // quietly overwritten an 8-month choice with 5.
        targetMonths: Number(p.targetMonths) > 0 ? Number(p.targetMonths) : DEFAULT_CUSHION_MONTHS,
        // The months the person chose are kept EXACTLY as they set them. What
        // changed underneath is what a month is measured in - income before,
        // expenses now - so a goal saved before the change is flagged rather
        // than quietly re-pointed, and the card says so in plain words once.
        basis: CUSHION_BASIS,
        rebasedFrom: p.basis === CUSHION_BASIS ? null : 'income',
      };
    case 'clear-card':
      return { ...base, type: 'clear-card', targetDate: p.targetDate || null };
    case 'spend-ceiling':
      return {
        ...base,
        type: 'spend-ceiling',
        amount: Number(p.ceiling) || null,
      };
    default:
      // Unknown/future type: keep it verbatim rather than dropping it, flagged
      // so a later build can decide. Never silently discards user state.
      return { ...base, type: oldGoal.type, params: p, unmigrated: true };
  }
}

// Idempotent guard: a goal already in the new shape (has no .params, has a
// known new type) passes through untouched, so running migration twice is safe.
export function ensureMigrated(goal) {
  if (!goal) return null;
  // The migrated type names, declared ONCE and exported, so a build that adds a
  // goal type cannot leave this set behind and have ensureMigrated silently
  // re-migrate an already-new goal on every load.
  const NEW_TYPES = MIGRATED_GOAL_TYPES;
  const looksNew = NEW_TYPES.has(goal.type) && !('params' in goal);
  if (!looksNew) return migrateGoal(goal);
  // A cushion saved by a build that only knew days still passes through here
  // untouched by migrateGoal. Give it the default months target rather than
  // leaving the engine to read undefined and size the pile at zero.
  if (goal.type === 'cushion' && goal.targetMonths == null) {
    return { ...goal, targetMonths: DEFAULT_CUSHION_MONTHS, basis: CUSHION_BASIS, rebasedFrom: 'income' };
  }
  // Already in the new shape but saved before the target moved to expenses: the
  // same flag, for the same reason. An absent basis is the only evidence the
  // goal was authored against income, so it has to be read here too.
  if (goal.type === 'cushion' && goal.basis !== CUSHION_BASIS) {
    return { ...goal, basis: CUSHION_BASIS, rebasedFrom: 'income' };
  }
  return goal;
}
