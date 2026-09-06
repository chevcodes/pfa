import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { goalProgress, buildGoalModel, goalOffTrack } from '../application/analysis/goals.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

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
console.log(' GOAL OFF TRACK - one judgement for the goal card and Overview');
console.log('='.repeat(72));

const cfg = { currency: { code: 'JMD', symbol: '$', locale: 'en-US' } };
const judge = (goal, ctx) => {
  const progress = goalProgress(goal, ctx);
  const model = buildGoalModel(goal, progress, null, cfg);
  return { progress, model, offTrack: goalOffTrack(progress, model) };
};
const asOf = '2026-09-16';
const clearCard = { type: 'clear-card', targetDate: '2027-09-16' };

const onTrack = judge(clearCard, { asOf, cardBalance: 100000, eairFrac: 0.4, typicalPayment: 20000 });
note(onTrack.progress.met === false && onTrack.model.tag === 'on track', 'fixture: an unfinished clear-card goal on track');
note(!onTrack.offTrack, 'an on-track clear-card goal stays closed');

const behind = judge(clearCard, { asOf, cardBalance: 100000, eairFrac: 0.4, typicalPayment: 3000 });
note(behind.model.tag === 'behind', 'fixture: a clear-card goal behind its date');
note(behind.offTrack, 'a behind clear-card goal opens');

const over = judge({ type: 'spend-ceiling', amount: 50000 }, { asOf, spendThisPeriod: 80000 });
note(over.model.tag === 'over your limit', 'fixture: a spending limit exceeded');
note(over.offTrack, 'a spending limit exceeded opens');

const within = judge({ type: 'spend-ceiling', amount: 50000 }, { asOf, spendThisPeriod: 20000 });
note(!within.offTrack, 'a spending limit being kept stays closed');

const unreadable = judge({ type: 'cushion', targetMonths: 3 }, { asOf, liquidNow: 50000, typicalMonthlyExpenses: 0 });
note(unreadable.model.tag === 'not enough yet' && unreadable.progress.met === false, 'fixture: a cushion goal that cannot be judged yet');
note(!unreadable.offTrack, 'a goal that cannot be judged yet stays closed');

const unknownPace = judge(clearCard, { asOf, cardBalance: 100000 });
note(unknownPace.model.tone === 'neutral' && !unknownPace.offTrack, 'a clear-card goal with no rate or payment to judge by stays closed');

const cleared = judge(clearCard, { asOf, cardBalance: 0 });
note(cleared.progress.met === true && !cleared.offTrack, 'a cleared card stays closed');

const passed = judge({ type: 'clear-card', targetDate: '2026-06-30' }, { asOf, cardBalance: 40000 });
note(passed.model.tag === 'deadline passed' && passed.offTrack, 'a passed deadline with a balance left opens');

const short = judge({ type: 'cushion', targetMonths: 3 }, { asOf, liquidNow: 50000, typicalMonthlyExpenses: 100000, expensesMonthsOfData: 12 });
note(short.model.tag === 'still needed' && short.offTrack, 'an emergency fund short of its target opens');

const ahead = read('application', 'ui', 'ahead-render.js');
const controller = read('application', 'app-controller.js');
const cardStanding = ahead.slice(ahead.indexOf('function goalCardStanding('), ahead.indexOf('function renderGoalCardNewEngine('));
note(/offTrack: goalOffTrack\(progress, model\)/.test(cardStanding), 'the goal card opens on the shared judgement');
note(/const dot = goalOffTrack\(progress, model\) \? 'warn' : 'neutral';/.test(ahead), 'the goal card warns only on the shared judgement');
const standing = controller.slice(controller.indexOf('function goalStanding()'), controller.indexOf('function reviewCauses()'));
note(/const offTrack = goalOffTrack\(progress, model\);/.test(standing), 'Overview’s goal item reads the same judgement');
note(
  !/met === false/.test(cardStanding) && !/met === false/.test(standing),
  'neither surface re-derives “off track” by hand'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
