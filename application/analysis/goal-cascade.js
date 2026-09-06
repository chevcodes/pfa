export const GOAL_META_KEYS = ['financeGoal', 'financeGoalLog', 'financeGoalBoundary'];

export const GOAL_STATE_KEYS = {
  financeGoal: 'goal',
  financeGoalLog: 'goalLog',
  financeGoalBoundary: '_goalBoundary',
};

export const GOAL_EMPTY = {
  financeGoal: null,
  financeGoalLog: [],
  financeGoalBoundary: null,
};

export function snapshotGoal(state) {
  const snap = {};
  for (const key of GOAL_META_KEYS) {
    const value = state ? state[GOAL_STATE_KEYS[key]] : undefined;
    snap[key] = value === undefined ? GOAL_EMPTY[key] : value;
  }
  return snap;
}

export function hasGoalRemnants(snapshot) {
  if (!snapshot) return false;
  if (snapshot.financeGoal) return true;
  if (Array.isArray(snapshot.financeGoalLog) && snapshot.financeGoalLog.length) return true;
  if (snapshot.financeGoalBoundary) return true;
  return false;
}

export function replacementGoalSnapshot(goal) {
  return {
    financeGoal: goal || null,
    financeGoalLog: [],
    financeGoalBoundary: null,
  };
}

export function applyGoalSnapshot(state, snapshot) {
  const source = snapshot || GOAL_EMPTY;
  for (const key of GOAL_META_KEYS) {
    const value = source[key] === undefined ? GOAL_EMPTY[key] : source[key];
    state[GOAL_STATE_KEYS[key]] = value;
  }
  return state;
}

export function goalWritePlan(snapshot) {
  const source = snapshot || GOAL_EMPTY;
  return GOAL_META_KEYS.map((key) => ({
    key,
    value: source[key] === undefined ? GOAL_EMPTY[key] : source[key],
  }));
}
