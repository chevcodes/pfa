/* Emergency fund: a safety target a person can picture, sized on what their
 * life actually costs, and stated without arithmetic.
 *
 * Guards the decisions this goal rests on:
 *   1. months of EXPENSES, not months of income
 *   2. the cost of living is the plain average of every month there is
 *   3. below a year the figure says so; at a year or more it stops saying so
 *   4. progress spoken in whole months, never as a decimal
 *   5. "already saved" is a STOCK (cash on hand), never a monthly flow
 *   6. a goal set under the old definition is re-stated, never silently moved
 */
import {
  CUSHION_BASIS,
  DEFAULT_CUSHION_MONTHS,
  EMERGENCY_FUND_LABEL,
  coverageCaveat,
  cushionStanding,
  describeCushionMonths,
  monthsCovered,
  monthsLabel,
  monthsAdjective,
  savedFigureNote,
} from '../application/analysis/cushion.js';
import {
  averageMonthlyValue,
  typicalMonthlyValue,
  FULL_YEAR_MONTHS,
  ROBUST_MIN_MONTHS,
} from '../application/core/shared-helpers.js';
import { monthlyCostOfLiving, typicalIncome } from '../application/analysis/plan.js';
import { goalProgress, buildGoalModel } from '../application/analysis/goals.js';
import { ensureMigrated, migrateGoal } from '../application/analysis/goal-migrate.js';
import { describeGoal, GOAL_TYPES } from '../application/analysis/reporting-insights.js';
import { makeMoneyCompact, makeMoney } from '../application/core/money-format.js';
import { readFileSync, readdirSync } from 'node:fs';

let pass = 0;
let fail = 0;
const note = (ok, label) => {
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log('   FAIL', label);
  }
};

console.log('='.repeat(72));
console.log(' EMERGENCY FUND - a safety target sized on what life costs');
console.log('='.repeat(72));

// Amounts are illustrative, not anyone's actual figures.
const trendOf = (spends, income = 285000) =>
  spends.map((spending, i) => ({
    month: `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
    spending,
    income,
  }));

console.log('\n -- an emergency fund covers what goes OUT, not what comes in --');
{
  // The correction this goal exists to make. Someone earning 285,000 and
  // spending 190,000 does not need five months of 285,000 to stay afloat - they
  // need five months of 190,000. Sizing on income overstates the target for
  // exactly the person who saves rather than spends everything.
  const trend = trendOf(Array.from({ length: 12 }, () => 190000));
  const cost = monthlyCostOfLiving(trend, '2026-02-01');
  const income = typicalIncome(trend, '2026-02-01');
  note(cost.amount === 190000, 'the cost of living reads what actually left (190,000)');
  note(income.amount === 285000, 'income is a different, larger figure (285,000)');
  const standing = cushionStanding({
    saved: 0,
    monthlyExpenses: cost.amount,
    targetMonths: 5,
    monthsOfData: cost.monthsUsed,
  });
  note(standing.targetAmount === 950000, 'the target is five months of EXPENSES (950,000)');
  note(
    standing.targetAmount < 5 * income.amount,
    'which is smaller than five months of income would have demanded'
  );
  const wouldHaveBeen = 5 * income.amount;
  note(wouldHaveBeen === 1425000, 'the old income-based target was 1,425,000 - 475,000 higher');
}

console.log('\n -- every month counts, once, at face value --');
{
  // The lumpy months are the POINT. Annual insurance, property tax, a car
  // service: unusual in WHEN they land, never in whether they happen, and
  // exactly what a safety net has to cover. typicalMonthlyValue would set them
  // aside - correct for income, wrong here - so the cost of living uses the
  // plain average instead.
  const ordinary = Array.from({ length: 11 }, () => 190000);
  const withAnnualBills = [...ordinary, 400000];
  const avg = averageMonthlyValue(withAnnualBills);
  const typical = typicalMonthlyValue(withAnnualBills);
  note(typical.excluded.length === 1, 'the typical-month rule WOULD have set the lumpy month aside');
  note(avg.monthsUsed === 12 && avg.monthsSeen === 12, 'the average drops nothing at all');
  note(Math.round(avg.amount) === 207500, 'so the lump lands in the figure (207,500)');
  note(avg.amount > typical.amount, 'and the target it sizes is the more conservative of the two');

  // No window, no horizon to pick: the number of months in equals the number
  // averaged, whatever that number is.
  for (const n of [3, 12, 15, 26]) {
    const t = trendOf(Array.from({ length: n }, (_, i) => 100000 + i));
    note(
      monthlyCostOfLiving(t, '2030-01-01').monthsUsed === n,
      `${n} months of data averages ${n} months`
    );
  }
  const three = monthlyCostOfLiving(trendOf([100000, 200000, 300000]), '2030-01-01');
  note(three.amount === 200000, 'three months is their plain mean, with nothing excluded');
  note(three.basis === 'average', 'and it reports the route it took');
}

console.log('\n -- a one-off shock is deliberately left in --');
{
  // A fridge replacing itself is not detected or removed. Leaving it in makes
  // the target mildly conservative, which is the right direction to err for a
  // safety net, and keeps manual judgement out of a mechanical figure.
  const calm = trendOf(Array.from({ length: 12 }, () => 190000));
  const withFridge = trendOf([...Array.from({ length: 11 }, () => 190000), 190000 + 180000]);
  const a = monthlyCostOfLiving(calm, '2026-02-01').amount;
  const b = monthlyCostOfLiving(withFridge, '2026-02-01').amount;
  note(b > a, 'the shock raises the figure rather than being filtered out');
  note(b === 205000, 'by exactly its share of the year (15,000 a month), nothing cleverer');
}

console.log('\n -- below a year it says so; at a year it stops --');
{
  note(FULL_YEAR_MONTHS === 12, 'a full annual cycle is twelve months');
  const thin = coverageCaveat(7);
  note(/^Based on seven months of statements/.test(thin), 'the caveat names how much history there is');
  note(/may rise as yearly costs like insurance or tax appear/.test(thin), 'and why the figure may move');
  note(coverageCaveat(11) !== null, 'eleven months still carries it');
  note(coverageCaveat(12) === null, 'twelve months does NOT - the caveat is no longer true');
  note(coverageCaveat(15) === null, 'and neither does anything beyond a year');
  note(coverageCaveat(0) === null, 'no data at all makes no claim either way');

  // It clears itself. The marker is purely a function of how many months
  // exist: nothing else is an input, so there is no flag to set or forget and
  // no state that could leave it showing after it stopped being true.
  note(coverageCaveat.length === 1, 'the caveat takes one input - the month count - and nothing else');
  note(
    coverageCaveat(7) === coverageCaveat(7) && coverageCaveat(7) !== coverageCaveat(8),
    'the same count always gives the same answer, and a different count a different one'
  );

  const short = cushionStanding({ saved: 0, monthlyExpenses: 190000, targetMonths: 5, monthsOfData: 7 });
  const full = cushionStanding({ saved: 0, monthlyExpenses: 190000, targetMonths: 5, monthsOfData: 14 });
  note(short.coverage.caveat != null && short.coverage.fullYear === false, 'a thin standing carries it');
  note(full.coverage.caveat === null && full.coverage.fullYear === true, 'a full-year standing does not');
  note(
    short.targetAmount === full.targetAmount,
    'and the caveat changes only what is SAID, never the figure itself'
  );
}

console.log('\n -- the caveat is provenance, never text on the figure --');
{
  // It rides the app's one info bubble. The number leads clean; the reason it
  // might move is one tap away for whoever wants it, invisible to everyone else.
  const goal = { type: 'cushion', targetMonths: 5 };
  const thin = goalProgress(goal, {
    typicalMonthlyExpenses: 190000,
    liquidNow: 300000,
    expensesMonthsOfData: 6,
  });
  const model = buildGoalModel(goal, thin, null, { currency: { code: 'JMD', symbol: '$' } });
  note(thin.coverage.caveat != null, 'the progress carries the caveat for the surface to place');
  note(
    !/may rise|Based on/.test(model.leadText) && !/may rise|Based on/.test(model.detail),
    'but neither the lead figure nor the sentence beside it states it inline'
  );

  // The surface puts it behind chartInfo - the app's one (i) - and only when
  // there is something true to say.
  const render = readFileSync('application/ui/ahead-render.js', 'utf8');
  note(
    /const caveat = progress\.coverage && progress\.coverage\.caveat;/.test(render),
    'the card reads the caveat from the one place that decides it'
  );
  note(
    /caveat \? chartInfo\(el, null, caveat\) : null/.test(render),
    'and hangs it on the app’s existing (i), icon-only, or renders nothing'
  );
}

console.log('\n -- the target never reads a typed balance --');
{
  // Standing constraint: expenses come from reconciled statement data only.
  // unreconciled_balances_proof.mjs guards the module list; this asserts the
  // specific path - the target is built from the trend, the PROGRESS side is
  // the only thing an entered balance may move.
  const ctx = readFileSync('application/analysis/goal-progress-ctx.js', 'utf8');
  note(
    /const cost = monthlyCostOfLiving\(rollAllTrend, asOf\);/.test(ctx),
    'the cost of living is built from statement history'
  );
  note(
    !/typicalMonthlyExpenses:\s*entered/.test(ctx) && /liquidNow: cashPosition/.test(ctx),
    'an entered balance reaches liquidNow and nothing else'
  );
  const cushionSrc = readFileSync('application/analysis/cushion.js', 'utf8');
  note(
    !/enteredCash|balanceUpdates|balance-updates/.test(cushionSrc),
    'and the goal module itself cannot see entered balances at all'
  );
}

console.log('\n -- the Plan and the goal still read one shared rule each --');
{
  const incomes = [282000, 288000, 285000, 291000, 279000, 510000];
  const trend = incomes.map((income, i) => ({
    month: `2025-${String(i + 1).padStart(2, '0')}`,
    income,
    spending: 190000,
  }));
  const fromPlan = typicalIncome(trend, '2026-01-01');
  note(fromPlan.amount === 285000, 'income still uses the typical-month rule, one double-payment set aside');
  note(fromPlan.excluded.length === 1, 'and it still names the month it set aside');
  note(ROBUST_MIN_MONTHS === 4, 'position-based fallback still needs four months');
  const single = typicalMonthlyValue([285000]);
  note(single.basis === 'single', 'one month is still stated as one month');
}

console.log('\n -- progress is spoken, never a decimal --');
{
  const cases = [
    [0.0, 'made a start'],
    [0.42, 'made a start'],
    [1.0, 'about one month'],
    [1.2, 'just over one month'],
    [1.8, 'close to two months'],
    [2.9, 'about three months'],
    [4.8, 'nearly there'],
    [5.0, 'reached your target'],
  ];
  let allPlain = true;
  for (const [m, expect] of cases) {
    const d = describeCushionMonths(m, 5);
    if (!d.phrase.includes(expect)) {
      allPlain = false;
      console.log(`      ${m} -> "${d.phrase}" (wanted "${expect}")`);
    }
    if (/\d/.test(d.phrase)) allPlain = false;
  }
  note(allPlain, 'every reading is plain words, with no digit anywhere in it');
  note(describeCushionMonths(1.2, 5).phrase === 'just over one month saved', '"1.2 of 5" is never printed');
}

console.log('\n -- the two grammatical forms, because English needs both --');
{
  note(monthsLabel(5) === 'five months' && monthsLabel(1) === 'one month', 'noun form agrees in number');
  note(monthsAdjective(5) === 'five-month', 'adjective form hyphenates');
}

console.log('\n -- nothing to divide by: stay quiet, do not print zero --');
{
  note(monthsCovered(500000, 0) === null, 'no expenses figure returns null, not 0 months');
  const s = cushionStanding({ saved: 500000, monthlyExpenses: 0, targetMonths: 5 });
  note(s.readable === false && s.met === false, 'and the standing says so rather than claiming met');
  note(describeCushionMonths(null, 5).phrase === 'not enough yet to say', 'the wording admits it');
}

console.log('\n -- the gap is the headline --');
{
  const goal = { type: 'cushion', targetMonths: 5 };
  const progress = goalProgress(goal, {
    typicalMonthlyExpenses: 190000,
    liquidNow: 228000,
    expensesMonthsOfData: 14,
  });
  const model = buildGoalModel(goal, progress, null, { currency: { code: 'JMD', symbol: '$' } });
  note(progress.targetAmount === 950000, 'target is five months of what a month costs');
  note(progress.shortfall === 722000, 'and the shortfall is stated as a real amount');
  note(/still needed/.test(model.tag), 'the card leads with what is still needed');
  note(model.leadText.includes('722,000'), 'and the lead figure IS the gap, not a day count');
  note(/just over one month/i.test(model.detail), 'with the plain reading beside it');
  note(/five months of expenses/.test(model.detail), 'the sentence names the unit it is working toward');
}

console.log('\n -- a stock, never a flow --');
{
  // "already saved" is the pile, not the rate. Reading a 40,000-a-month savings
  // rate as the pile would report the same safety net to someone one month in
  // and someone two years in.
  const monthOne = cushionStanding({ saved: 40000, monthlyExpenses: 190000, targetMonths: 5 });
  const yearTwo = cushionStanding({ saved: 40000 * 24, monthlyExpenses: 190000, targetMonths: 5 });
  note(
    yearTwo.saved > monthOne.saved && yearTwo.shortfall < monthOne.shortfall,
    'saving for longer moves the goal; a flow figure would have frozen it'
  );
  note(monthOne.progress.qualifier === 'start', 'one month in reads as a start');
  note(yearTwo.monthsCovered > 3, 'two years in reads as real progress');
}

console.log('\n -- all cash is counted, and that is said out loud --');
{
  // Progress counts every reachable balance, which is honest for an emergency
  // but reads like a claim about money deliberately ring-fenced. The figure
  // never appears without the correction.
  const plain = savedFigureNote({});
  note(/all the cash/.test(plain), 'says it counts every account');
  note(
    /not only what you have set aside/.test(plain),
    'and that it is NOT only what was deliberately set aside'
  );
  const withCard = savedFigureNote({ cardOwed: 240000 }, (v) => `$${v.toLocaleString()}`);
  note(/not what you owe on the card/.test(withCard), 'and names what it leaves out');
  note(withCard.includes('240,000'), 'with the excluded amount stated, not just alluded to');
  const render = readFileSync('application/ui/ahead-render.js', 'utf8');
  note(/savedFigureNote\(/.test(render), 'the card shows it beside the progress figure');
}

console.log('\n -- "emergency fund" is what it is called --');
{
  note(EMERGENCY_FUND_LABEL === 'Emergency fund', 'the person-facing name is declared once');
  const render = readFileSync('application/ui/ahead-render.js', 'utf8');
  note(/title: EMERGENCY_FUND_LABEL/.test(render), 'the picker reads that one declaration');
  note(!/Cash cushion/.test(render), 'and "Cash cushion" is gone from the goal picker');
  const months = GOAL_TYPES.find((t) => t.unit === 'months');
  note(/emergency fund/i.test(months.label), 'the goal list calls it an emergency fund');
  note(/of expenses/.test(months.label), 'measured in expenses');
  const described = describeGoal({ type: 'cushion', targetMonths: 5 }, null, null);
  note(
    described === 'Keep an emergency fund of at least five months of expenses',
    'and every surface restates it the same way'
  );
}

console.log('\n -- an existing goal is re-stated, never silently moved --');
{
  // The same "5" meant months of INCOME before. The months a person chose are
  // kept exactly; what they now measure is stated in plain words on the card.
  const old = migrateGoal({ type: 'runway', params: { targetMonths: 8 } });
  note(old.targetMonths === 8, 'the eight months they chose survive untouched');
  note(old.rebasedFrom === 'income', 'and the goal is flagged as re-based');
  const fresh = migrateGoal({ type: 'runway', params: { targetMonths: 8, basis: CUSHION_BASIS } });
  note(fresh.rebasedFrom === null, 'a goal saved since the change carries no such flag');
  const already = { id: 'g', type: 'cushion', targetMonths: 5, basis: CUSHION_BASIS, active: true };
  note(ensureMigrated(already) === already, 'and re-running migration changes nothing');

  const progress = goalProgress(old, {
    typicalMonthlyExpenses: 190000,
    liquidNow: 300000,
    expensesMonthsOfData: 14,
  });
  note(progress.rebasedFromIncome === true, 'the card is told to say so');
  const render = readFileSync('application/ui/ahead-render.js', 'utf8');
  note(
    /if \(progress\.rebasedFromIncome\)/.test(render),
    'and it does, on that goal only'
  );
  note(
    /You set this target against your income/.test(render),
    'in plain words that name what changed'
  );
}

console.log('\n -- the default is a starting point, not an assumption --');
{
  note(DEFAULT_CUSHION_MONTHS === 5, 'five months by default');
  const eight = cushionStanding({ saved: 0, monthlyExpenses: 190000, targetMonths: 8 });
  note(eight.targetAmount === 1520000, 'and a person who chooses eight gets eight');
}

console.log('\n -- large figures shorten on screen, never in a stored record --');
{
  const cfg = { currency: { code: 'JMD', symbol: '$' } };
  const compact = makeMoneyCompact(cfg);
  note(compact(1090386.3) === '$1.09M', 'millions keep two decimals in prose');
  // Lowercase 'k', matching makeMoneyShort and every chart axis.
  note(compact(447005.95) === '$447k', 'thousands round, lowercase k - the same suffix the axes use');
  note(compact(9500) === '$9,500', 'a figure short enough to read stays whole, and keeps its separator');
  note(compact(-1090386.3) === '-$1.09M', 'and the sign survives shortening');

  const goal = { type: 'cushion', targetMonths: 5 };
  const p = goalProgress(goal, {
    typicalMonthlyExpenses: 307478.45,
    liquidNow: 1090386.3,
    expensesMonthsOfData: 14,
  });
  const screen = buildGoalModel(goal, p, null, cfg, { compact: true }).detail;
  const stored = buildGoalModel(goal, p, null, cfg).detail;
  note(/\$1\.09M of a \$1\.54M target, so \$447k is still needed/.test(screen), 'the card reads compactly');
  note(/1,090,386\.30/.test(stored) && /447,005\.95/.test(stored), 'the STORED headline keeps exact figures');
  note(
    buildGoalModel(goal, p, null, cfg).detail === makeMoney(cfg)(0) ? false : !/M\b|K\b/.test(stored),
    'and carries no shortened figure at all - exact is the default, opting in is deliberate'
  );
}

console.log('\n -- the exact-figures rule for exports and the report holds --');
{
  // Enforced, not merely intended: no output module may reach for a shortening
  // formatter. A pasted report has no interface to tap into, and the CSV is
  // arithmetic input for a spreadsheet.
  //
  // A bare identifier match (no trailing "(") on purpose: a shortened figure
  // computed elsewhere and threaded through as data (e.g. a model field named
  // moneyShort/avgLabel) is just as much a violation as calling the formatter
  // directly, and reporting-print.js is where the printed report's own model
  // is actually built - not application/output - so it is scanned here too.
  const offenders = [];
  const reportSources = [
    ...readdirSync('application/output')
      .filter((f) => f.endsWith('.js'))
      .map((f) => `application/output/${f}`),
    'application/analysis/reporting-print.js',
  ];
  for (const path of reportSources) {
    const src = readFileSync(path, 'utf8');
    if (/\bmakeMoneyShort\b|\bmakeMoneyCompact\b|\bmoneyShort\b/.test(src)) offenders.push(path);
  }
  note(offenders.length === 0, `no export/report module shortens money (${offenders.join(', ') || 'none'})`);
}

console.log('\n -- one source: the cost of living is computed in exactly one place --');
{
  // A second copy would drift. Every surface that needs the figure imports the
  // one function rather than averaging the trend itself.
  const files = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (f.isDirectory()) walk(`${dir}/${f.name}`);
      else if (f.name.endsWith('.js')) files.push(`${dir}/${f.name}`);
    }
  };
  walk('application');
  const definitions = files.filter((f) => /export function monthlyCostOfLiving/.test(readFileSync(f, 'utf8')));
  note(definitions.length === 1, `monthlyCostOfLiving is defined once (${definitions.join(', ')})`);
  const readers = files.filter((f) => /monthlyCostOfLiving\(/.test(readFileSync(f, 'utf8')));
  note(readers.length > 1, `and read by the surfaces that need it (${readers.length} files)`);
  const avgDefs = files.filter((f) => /export function averageMonthlyValue/.test(readFileSync(f, 'utf8')));
  note(avgDefs.length === 1, 'the plain-average rule is declared once too');
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: the emergency fund is sized on months of what life actually');
console.log('         costs, averaged over every month there is; below a year it');
console.log('         says so behind the quiet (i) and above a year it stops.');
console.log('='.repeat(72));
if (fail) process.exit(1);
