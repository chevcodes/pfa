import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  GOAL_META_KEYS,
  applyGoalSnapshot,
  goalWritePlan,
  hasGoalRemnants,
  replacementGoalSnapshot,
  snapshotGoal,
} from '../application/analysis/goal-cascade.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL', l);
  }
};
console.log('='.repeat(72));
console.log(' GOAL CASCADE - deleting a goal leaves nothing behind');
console.log('='.repeat(72));

const liveState = () => ({
  goal: { type: 'cushion', params: { targetDays: 90 }, createdAt: '2026-01-04' },
  goalLog: [
    { month: '2026-05', met: true },
    { month: '2026-06', met: false },
  ],
  _goalBoundary: { kind: 'chosen', floor: 250000 },
});

console.log('\n -- everything that hangs off a goal is named in one place --');
note(GOAL_META_KEYS.length === 3, 'three stored keys belong to a goal');
note(
  GOAL_META_KEYS.includes('financeGoal') &&
    GOAL_META_KEYS.includes('financeGoalLog') &&
    GOAL_META_KEYS.includes('financeGoalBoundary'),
  'the goal, its monthly log and its safety floor'
);

console.log('\n -- the purge --');
const before = liveState();
const snapshot = snapshotGoal(before);
applyGoalSnapshot(before, null);
note(before.goal === null, 'the goal is gone from state');
note(Array.isArray(before.goalLog) && before.goalLog.length === 0, 'the monthly log is gone too');
note(before._goalBoundary === null, 'and so is the safety floor set alongside it');
note(!hasGoalRemnants(snapshotGoal(before)), 'nothing goal-shaped survives in state');

const writes = goalWritePlan(null);
note(writes.length === 3, 'every stored key is written, not just the goal');
note(
  writes.every((w) => GOAL_META_KEYS.includes(w.key)),
  'and only the keys that genuinely belong to a goal'
);
note(
  writes.find((w) => w.key === 'financeGoal').value === null &&
    writes.find((w) => w.key === 'financeGoalLog').value.length === 0,
  'each is cleared to its own empty shape, never left undefined'
);

console.log('\n -- undo restores the WHOLE cascade, not just the goal --');
const after = { goal: null, goalLog: [], _goalBoundary: null };
applyGoalSnapshot(after, snapshot);
note(after.goal.createdAt === '2026-01-04', 'the goal comes back with its ORIGINAL created date');
note(after.goalLog.length === 2, 'the monthly log comes back in full');
note(after._goalBoundary.floor === 250000, 'the safety floor comes back');
note(
  JSON.stringify(snapshotGoal(after)) === JSON.stringify(snapshot),
  'the restored state is byte-identical to what was removed'
);

console.log('\n -- no orphans, whatever the starting state --');
note(!hasGoalRemnants({ financeGoal: null, financeGoalLog: [], financeGoalBoundary: null }), 'an empty cascade reports no remnants');
note(hasGoalRemnants({ financeGoal: null, financeGoalLog: [{ month: '2026-01' }], financeGoalBoundary: null }), 'a stranded log entry IS a remnant');
note(hasGoalRemnants({ financeGoal: null, financeGoalLog: [], financeGoalBoundary: { kind: 'chosen' } }), 'a stranded safety floor IS a remnant');
const partial = { goal: null, goalLog: undefined, _goalBoundary: undefined };
note(snapshotGoal(partial).financeGoalLog.length === 0, 'a missing field snapshots as its empty shape, never undefined');

console.log('\n -- replacing a goal cannot inherit the prior goal history --');
const replacement = replacementGoalSnapshot({ type: 'clear-card', createdAt: '2026-09-07' });
note(replacement.financeGoal.type === 'clear-card', 'the new goal is retained');
note(replacement.financeGoalLog.length === 0, 'the prior goal log is cleared');
note(replacement.financeGoalBoundary === null, 'the prior goal safety floor is cleared');

console.log('\n -- the view cache cannot serve a deleted goal --');
const controller = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
const epoch = controller.slice(controller.indexOf('const epoch = ['), controller.indexOf('if (\n      !_epochSnap'));
for (const key of ['state.goal', 'state.goalLog', 'state._goalBoundary']) {
  note(epoch.includes(key), `${key} is part of the render epoch, so its change rebuilds every view`);
}
for (const key of ['state._planTarget', 'state._planGroups', 'state._planSetAside']) {
  note(epoch.includes(key), `${key} is part of the render epoch too`);
}

console.log('\n -- the cascade is wired to the real clear path --');
const goals = readFileSync(join(ROOT, 'application', 'ui', 'app-goals.js'), 'utf8');
note(/async function clearGoal\(\)/.test(goals), 'clearGoal still exists');
note(goals.includes('goalWritePlan(null)'), 'clearGoal writes the whole plan, not one key');
note(goals.includes('replacementGoalSnapshot(goal)'), 'setting a new goal replaces the whole dependent state');
note(goals.includes('return snapshot'), 'and hands back what it removed so undo can restore it');
const ahead = readFileSync(join(ROOT, 'application', 'ui', 'ahead-render.js'), 'utf8');
note(/clearGoal\(\)\.then\(\(snapshot\)/.test(ahead), 'the Clear goal button restores from the snapshot');
note(!/restoreGoal\(prior\)/.test(ahead), 'the old goal-only undo is gone');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: clearing a goal removes the goal, its monthly log and its safety');
console.log('         floor together, leaves no stranded record, invalidates every view');
console.log('         cache through the epoch, and is fully reversible in one step.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
