import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommittedFlexibleModel } from '../application/analysis/committed-flexible.js';
import { planGroups } from '../application/analysis/plan.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
let pass = 0;
let fail = 0;
const note = (condition, label) => {
  if (condition) pass++;
  else {
    fail++;
    console.log('   FAIL', label);
  }
};

console.log('='.repeat(72));
console.log(' PRODUCT POLISH - terminology, hierarchy, and privacy contracts');
console.log('='.repeat(72));

const activityModel = buildCommittedFlexibleModel(
  {
    period: { from: '2026-08-01', to: '2026-08-31' },
    committed: 125,
    flexibleSpent: 275,
    commitMove: 'in-line',
    committedKeyCount: 2,
    typicalCommitted: 125,
    breakdown: { cardSpend: 175, otherFlexibleOut: 100 },
  },
  { currency: { code: 'JMD', symbol: '$', locale: 'en-JM' } }
);
note(activityModel.lead.amount === 400, 'Activity leads with total period spending');
note(activityModel.lead.label === 'Total spending this period', 'Activity names the quantity plainly');
note(activityModel.committed.label === 'Fixed expenses', 'Activity uses fixed expenses');
note(activityModel.flexibleSpent.label === 'Discretionary spending', 'Activity uses discretionary spending');
const compactActivityModel = buildCommittedFlexibleModel(
  {
    period: { from: '2026-08-01', to: '2026-08-31' },
    committed: 532280.34,
    flexibleSpent: 8911144.73,
    commitMove: 'in-line',
    committedKeyCount: 2,
    typicalCommitted: 0,
    breakdown: { cardSpend: 5194590.54, otherFlexibleOut: 3716554.19 },
  },
  { currency: { code: 'JMD', symbol: '$', locale: 'en-JM' } }
);
note(compactActivityModel.committed.amountText === '$532k', 'fixed-expense support uses compact money');
note(compactActivityModel.flexibleSpent.amountText === '$8.91m', 'discretionary support uses compact money');
note(compactActivityModel.flexibleSpent.tag === '$5.19m card', 'card spending tag uses compact money');
note(
  compactActivityModel.flexibleSpent.detail.includes('$3.72m'),
  'discretionary explanation uses compact money throughout'
);
note(
  compactActivityModel.committed.detail === '2 recurring payees.',
  'fixed-expense note does not claim a zero typical payment'
);
// ONE NAME for the band. The Plan called it "Free spending" and Activity called
// the identical quantity "Discretionary spending" - two names for one idea, one
// of them invented where the standard finance term already existed. Whichever
// the app settles on, both surfaces have to say it, so this reads the plan
// band's own label out of config rather than restating a string here.
const planBand = planGroups(JSON.parse(read('settings', 'config.json'))).find((g) => g.key === 'free');
note(
  planBand.label === activityModel.flexibleSpent.label,
  `the Plan band and Activity call the same money the same thing (plan: ${planBand.label}, activity: ${activityModel.flexibleSpent.label})`
);
note(
  !/free spending/i.test(read('settings', 'config.json') + read('application', 'analysis', 'plan.js') + read('application', 'ui', 'plan-render.js') + read('application', 'analysis', 'spend-allocation.js') + read('application', 'analysis', 'available-now.js')),
  'and the retired name survives nowhere the person can read it'
);
note(!('reconciling' in activityModel), 'Activity omits the redundant reconciling explanation');

const activity = read('application', 'ui', 'activity-render.js');
note(/support = \[m\.committed, m\.flexibleSpent\]/.test(activity), 'Activity support contains the two spending components');
note(/centre:\s*\{ value: prose\(totalSpend\), label: 'spent' \}/.test(activity), 'Activity chart describes money spent');

const plan = read('application', 'ui', 'plan-render.js');
note(/title:\s*'My plan',[\s\S]{0,120}icon:\s*icon\(iconPie\(\)\)/.test(plan), 'My plan uses the existing allocation icon');
note(/name:\s*'plan-my-plan-card'/.test(plan), 'My plan has a stable disclosure name');
note(/model\.unusual\) tags\.push\(\{ text: 'unusual month', tone: 'neutral' \}\)/.test(plan), 'Unusual month uses the shared status tag');

const investments = read('application', 'ui', 'investments-render.js');
note(/working\.length \? chartInfo\(el, 'Explain', working\)/.test(investments), 'Investment account decomposition sits behind Explain');
note(/name:\s*'position-investments-card'/.test(investments), 'Investments has a stable disclosure name');
note(/summary:\s*`\$\{prose\(available\.combinedTotal\)\} in \$\{accountCount\}/.test(investments), 'Investments closes to value and account count');
note(/as of \$\{formatDisplayDate\(available\.asOf\)\}/.test(investments), 'Investment summary includes its as-of date');
note(/remember:\s*`investment-group-\$\{group\.kind\}`/.test(investments), 'Nested investment groups retain their own state');

const featureCss = read('interface', 'feature-additions.css');
note(!/\.inv-growth-row\b/.test(featureCss), 'Retired investment growth-row CSS is removed');

const controller = read('application', 'app-controller.js');
note(/const drillToAccount = jump\(drillToAccountRaw\)/.test(controller), 'account drills create a return path');
note(/const openRulesSection = jump\(openRulesSectionRaw, \{ returnOnScroll: true \}\)/.test(controller), 'rules links create a return path');
note(/const openStatementsReview = jump\(openStatementsReviewRaw, \{ returnOnScroll: true \}\)/.test(controller), 'statement review links create a return path');
note(/const openStatementCoverage = jump\(/.test(controller), 'statement coverage links create a return path');
note(/createActivityRenderer\(\{[\s\S]*?jump,/.test(controller), 'Activity drills use the shared return path');
const backgroundPrivacy = controller.slice(
  controller.indexOf('let foregroundPrivacy = null;'),
  controller.indexOf("privacyBtn.addEventListener('click'")
);
note(/visibilitychange/.test(backgroundPrivacy) && /pagehide/.test(backgroundPrivacy), 'Background privacy uses both lifecycle hooks');
note(!/Store\./.test(backgroundPrivacy), 'Background privacy never writes the stored preference');
note(/const next = foregroundPrivacy;[\s\S]*dataset\.privacy = next/.test(backgroundPrivacy), 'Foreground return restores the captured display state');

const visibleCopy = [
  read('application', 'analysis', 'available-now.js'),
  read('application', 'analysis', 'goals.js'),
  read('application', 'analysis', 'plan.js'),
  read('application', 'analysis', 'reporting-periods.js'),
  read('application', 'analysis', 'spend-allocation.js'),
  read('application', 'ui', 'activity-render.js'),
  read('application', 'ui', 'ahead-render.js'),
  read('application', 'ui', 'app-messages.js'),
  read('application', 'ui', 'cards-render.js'),
].join('\n');
for (const phrase of [
  'Left after committed spending',
  'Committed spending',
  'Regular commitments',
  'When commitments land',
  'Commitments plus a cushion',
]) {
  note(!visibleCopy.includes(`'${phrase}'`) && !visibleCopy.includes(`\`${phrase}`), `user-facing copy omits “${phrase}”`);
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
