import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  reviewBaseline,
  buildReviewCauses,
  passesReviewGate,
  rankReviewCauses,
  reviewBars,
  newCommitmentSentence,
  risenCommitmentSentence,
  goalQuietPhrase,
  investmentHeadlineComponents,
} from '../application/analysis/review-causes.js';
import {
  buildAttentionItems,
  detectRecurring,
  monthlyCommitmentsTotal,
  ATTENTION_LIMIT,
  monthName,
} from '../application/analysis/reporting-periods.js';
import { detectBankStandingDebits } from '../application/analysis/bank-analysis.js';
import { largeChargeSentence } from '../application/analysis/reporting-core.js';
import { largePaymentSentence } from '../application/analysis/reporting-insights.js';
import {
  growthRunSentence,
  growthRunClause,
  growthRunComponents,
} from '../application/analysis/investments.js';
import { merchantGroupKey } from '../settings/category-rules.js';

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
console.log(' REVIEW CAUSES - baseline, gate, intent order, quiet line, first run');
console.log('='.repeat(72));

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const lastDay = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const months = (from, to) => {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};
const bankStatement = (ym, importedAt, extra = {}) => {
  const [y, m] = ym.split('-').map(Number);
  return {
    hash: `bank-${ym}`,
    account: '000111',
    period: `01 ${MON[m - 1]} ${y} - ${lastDay(ym)} ${MON[m - 1]} ${y}`,
    importedAt,
    reconciled: true,
    ...extra,
  };
};
const cardStatement = (ym, importedAt, extra = {}) => ({
  hash: `card-${ym}`,
  account: '4321',
  statementKey: ym,
  periodEnd: `${ym}-25`,
  importedAt,
  reconciled: true,
  ...extra,
});
const investmentStatement = (ym, importedAt, printedTotal, added = 0) => ({
  hash: `inv-${ym}`,
  provider: 'scotia',
  account: 'INV1',
  periodEnd: `${ym}-${lastDay(ym)}`,
  printedTotal,
  pagesDeclared: 1,
  pagesSeen: [1],
  cashActivity: added ? [{ type: 'D', amount: added, currency: 'JMD' }] : [],
  holdings: [],
  fxRates: {},
  importedAt,
});

const T1 = '2026-07-03T10:00:00.000Z';
const T2 = '2026-08-03T10:00:00.000Z';
const firstHalf = months('2026-01', '2026-06');

const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const cfg = { currency: { code: 'JMD' }, insights: {} };

/* ---------------- Stage 0: the baseline ---------------- */
{
  const statements = {
    bankStatements: [...firstHalf.map((m) => bankStatement(m, T1)), bankStatement('2026-07', T2)],
  };
  const a = reviewBaseline(statements);
  const realNow = Date.now;
  Date.now = () => realNow() + 90 * 86400000;
  const b = reviewBaseline(statements);
  Date.now = realNow;
  note(JSON.stringify(a) === JSON.stringify(b), 'two opens with no new statement tell the same story');
  const bank = a.sources.find((s) => s.ledger === 'bank');
  note(a.mode === 'story' && bank.since === '2026-06-30' && bank.frontier === '2026-07-31', 'the story runs from the last statement before the newest import');

  const quarter = reviewBaseline({
    bankStatements: [
      ...months('2026-01', '2026-03').map((m) => bankStatement(m, '2026-04-02T09:00:00.000Z')),
      ...months('2026-04', '2026-06').map((m) => bankStatement(m, '2026-07-03T09:00:00.000Z')),
    ],
  });
  const q = quarter.sources[0];
  note(q.since === '2026-03-31' && q.frontier === '2026-06-30', 'a quarter imported together tells the whole quarter');

  const picked = reviewBaseline({
    bankStatements: [
      ...months('2026-01', '2026-03').map((m) => bankStatement(m, '2026-04-02T09:00:00.000Z')),
      bankStatement('2026-04', '2026-07-03T09:00:00.000Z'),
      bankStatement('2026-05', '2026-07-03T09:20:00.000Z'),
      bankStatement('2026-06', '2026-07-03T11:05:00.000Z'),
    ],
  });
  note(picked.sources[0].since === '2026-03-31', 'a quarter added one file at a time in one sitting still tells the whole quarter');

  const reimport = reviewBaseline({
    bankStatements: [...statements.bankStatements, { ...bankStatement('2026-07', T2), hash: 'bank-2026-07-copy' }],
  });
  note(reimport.sources[0].since === '2026-06-30', 'importing an existing statement again does not reset the story');

  const backfill = reviewBaseline({
    bankStatements: [
      ...statements.bankStatements,
      ...months('2025-01', '2025-06').map((m) => bankStatement(m, '2026-08-10T10:00:00.000Z')),
    ],
  });
  note(
    backfill.mode === 'story' && backfill.sources[0].since === '2026-06-30',
    'adding older statements later does not reset the story'
  );

  const first = reviewBaseline({ bankStatements: months('2026-01', '2026-07').map((m) => bankStatement(m, T1)) });
  note(first.mode === 'state' && !first.since, 'a first import has no story to tell');

  const staggered = reviewBaseline({
    bankStatements: [...firstHalf.map((m) => bankStatement(m, T1)), bankStatement('2026-07', T2)],
    cardStatements: [...firstHalf.map((m) => cardStatement(m, T1)), cardStatement('2026-07', '2026-08-20T10:00:00.000Z')],
  });
  note(
    staggered.sources.find((s) => s.ledger === 'card').compared &&
      !staggered.sources.find((s) => s.ledger === 'bank').compared,
    'a later statement starts a new story from its own import'
  );

  const missingStamp = reviewBaseline({ bankStatements: months('2026-01', '2026-07').map((m) => bankStatement(m, null)) });
  note(missingStamp.mode === 'state', 'statements without an import date never invent a story');
}

/* ---------------- fixture ledger ---------------- */
const bankRow = (id, date, amount, label, extra = {}) => ({
  id,
  date,
  amount,
  direction: 'out',
  currency: 'JMD',
  counterpartyKey: 'ext:' + label.toUpperCase(),
  counterpartyLabel: label,
  description: label,
  account: '000111',
  ...extra,
});
const cardRow = (id, date, amount, description) => ({
  id,
  date,
  month: date.slice(0, 7),
  kind: 'spend',
  amount,
  description,
  displayName: description,
  merchantGroup: merchantGroupKey(description, [], null),
});
const allMonths = months('2026-01', '2026-07');
const bankRows = [
  ...allMonths.map((m) => bankRow(`rent-${m}`, `${m}-01`, 100000, 'Landlord')),
  ...allMonths.map((m) => bankRow(`pay-${m}`, `${m}-25`, 500000, 'Employer', { direction: 'in' })),
  ...['2026-05', '2026-06', '2026-07'].map((m) => bankRow(`gym-${m}`, `${m}-05`, 3000, 'Gym Club')),
  ...['2026-05', '2026-06', '2026-07'].map((m) => bankRow(`tiny-${m}`, `${m}-06`, 200, 'Tiny Fee')),
  bankRow('sofa', '2026-07-12', 150000, 'Furniture Store'),
];
const cardRows = [
  ...allMonths.map((m) => cardRow(`phone-${m}`, `${m}-08`, 6000, 'Phone Co')),
  ...['2026-05', '2026-06', '2026-07'].map((m) => cardRow(`stream-${m}`, `${m}-10`, 2500, 'Streamflix')),
  cardRow('tv', '2026-07-14', 60000, 'Electronics Hub'),
  cardRow('lunch', '2026-07-15', 12000, 'Cafe Place'),
  cardRow('june-big', '2026-06-14', 80000, 'Travel Desk'),
];
const commitments = {
  combined: monthlyCommitmentsTotal(detectRecurring(cardRows, 3, 0.15, [], null), detectBankStandingDebits(bankRows)),
};
const byId = new Map(cardRows.map((r) => [r.id, r]));
const cardLarge = ['tv', 'lunch', 'june-big'].map((id) => ({ id, type: 'large', row: byId.get(id) }));
const bankLarge = [{ id: 'sofa', key: 'ext:FURNITURE STORE', label: 'Furniture Store', amount: 150000, date: '2026-07-12' }];
const statements = {
  bankStatements: [...firstHalf.map((m) => bankStatement(m, T1)), bankStatement('2026-07', T2)],
  cardStatements: [...firstHalf.map((m) => cardStatement(m, T1)), cardStatement('2026-07', T2)],
  investmentStatements: [
    ...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)),
    investmentStatement('2026-07', T2, 1150000, 20000),
  ],
};
const base = {
  ...statements,
  cardRows,
  bankRows,
  commitments,
  cardLarge,
  bankLarge,
  takeHome: 500000,
  cfg,
  money,
  today: '2026-08-05',
};

/* ---------------- Stages 2-4 ---------------- */
{
  const r = buildReviewCauses(base);
  const ids = r.candidates.map((c) => c.id);
  note(
    r.mode === 'story' &&
      r.title ===
        'Since your card statement ending 25-Jun-26 and your bank and investment statements ending 30-Jun-26',
    'the card is titled by the exact statement close dates the story starts from'
  );
  const bars = reviewBars(500000, cfg);
  note(bars.large === 25000 && bars.meaningful === 3000, 'the gate reads the app’s own significance thresholds');
  note(ids.includes('commitment-new:GYM CLUB'), 'a small new regular payment surfaces because it repeats');
  note(ids.some((id) => id.startsWith('commitment-new:') && /STREAMFLIX/.test(id)), 'a small new card subscription surfaces because it repeats');
  note(!ids.some((id) => /TINY FEE/.test(id)), 'a new regular payment too small to matter over a year stays quiet');
  note(!ids.some((id) => /LANDLORD|PHONE/.test(id)), 'a payment that was already regular is not news');
  note(ids.includes('card-large:tv') && ids.includes('bank-large:sofa'), 'a large one-off surfaces on either ledger');
  note(!ids.includes('card-large:lunch'), 'a flagged charge below the bar stays quiet');
  note(!ids.includes('card-large:june-big'), 'a large charge from before the story does not surface');
  note(
    r.candidates.every((c) => c.cause && typeof c.cause === 'string' && c.link && ['structural', 'one-off'].includes(c.kind)),
    'every cause carries a sentence, a kind and a way back to its source'
  );
  note(r.candidates.every((c) => c.tone === 'neutral'), 'causes are never alarms by default');
  note(
    r.candidates.filter((c) => c.area === 'spending').every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.link.date)),
    'a one-off charge carries its date so its source can be opened on the right month'
  );
  note(r.quiet === null, 'no quiet line when something real happened');
  note(
    ids.slice(0, 4).join(',') === 'bank-large:sofa,card-large:tv,commitment-new:GYM CLUB,' + ids[3] && /STREAMFLIX/.test(ids[3]),
    'with no stated intent, size decides the order'
  );

  const spend = buildReviewCauses({ ...base, intent: { goalType: 'spend-ceiling' } });
  note(
    /card-large:tv/.test(spend.candidates[0].id) && /STREAMFLIX/.test(spend.candidates[1].id),
    'a spending limit goal leads with the card causes, ahead of a larger bank payment'
  );
  const cushion = buildReviewCauses({ ...base, intent: { goalType: 'cushion' } });
  note(
    cushion.candidates[0].id === 'bank-large:sofa' && cushion.candidates[1].id === 'commitment-new:GYM CLUB',
    'an emergency fund goal leads with the cash causes'
  );
  const saver = buildReviewCauses({ ...base, intent: { savingKeys: ['ext:GYM CLUB'] } });
  note(saver.candidates[0].id === 'commitment-new:GYM CLUB', 'a payment into a designated saving account leads when nothing else was signalled');

  const offTrack = buildReviewCauses({
    ...base,
    intent: { goalType: 'cushion' },
    goalStanding: { type: 'cushion', offTrack: true, tone: 'watch', title: 'Your goal is off track - still needed', detail: 'x' },
  });
  note(offTrack.candidates[0].area === 'goal' && offTrack.candidates[0].tone === 'watch', 'an off-track goal leads every other cause');

  const gate = (kind, amount, monthly) => passesReviewGate({ kind, amount, monthly, flagged: true }, { meaningful: 3000, large: 25000 });
  note(gate('structural', 0, 1100) && !gate('structural', 0, 200), 'a small regular payment qualifies on its weight over a year, noise does not');
  note(gate('one-off', 30000) && !gate('one-off', 20000), 'a one-off must be large');
  note(!passesReviewGate({ kind: 'one-off', amount: 90000, flagged: false }, { meaningful: 3000, large: 25000 }), 'nothing the detectors did not flag passes');
  note(
    rankReviewCauses([
      { id: 'a', kind: 'one-off', amount: 90000, intent: [] },
      { id: 'b', kind: 'one-off', amount: 30000, intent: ['plan'] },
    ])[0].id === 'b',
    'stated intent outranks size'
  );

  const items = buildAttentionItems({
    cardStatements: [{ reconciled: false, period: '2026-07', reconNote: 'off' }],
    bankStatements: [],
    causes: r,
    openCause: () => {},
    money0: money,
    formatDisplayDate: String,
    isUnrecognised: () => false,
    detectPossibleDuplicates: () => [],
    detectCategorySpikes: () => [],
  }).filter((it) => it.tone === 'blocking' || it.cause);
  note(items.length === ATTENTION_LIMIT, 'the list never grows past three');
  note(items[0].tone === 'blocking' && items.slice(1).every((it) => it.cause), 'a decision comes before causes');
  note(items[1].actions.length === 1 && items[1].actions[0].label === 'Details', 'each cause offers its source on request');

  const crowded = buildAttentionItems({
    cardStatements: [1, 2, 3].map((n) => ({ reconciled: false, period: `2026-0${n}` })),
    causes: r,
    money0: money,
    formatDisplayDate: String,
    isUnrecognised: () => false,
    detectPossibleDuplicates: () => [],
    detectCategorySpikes: () => [],
  });
  note(!crowded.some((it) => it.cause), 'three open decisions leave no room for causes');
}

/* ---------------- Stage 5: the quiet month ---------------- */
{
  const quietRows = bankRows.filter((r) => !/gym|tiny|sofa/.test(r.id));
  const quietCard = cardRows.filter((r) => !/stream|tv|lunch/.test(r.id));
  const quietBase = {
    ...base,
    investmentStatements: [
      ...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)),
      investmentStatement('2026-07', T2, 1125000, 20000),
    ],
    bankRows: quietRows,
    cardRows: quietCard,
    commitments: {
      combined: monthlyCommitmentsTotal(detectRecurring(quietCard, 3, 0.15, [], null), detectBankStandingDebits(quietRows)),
    },
    cardLarge: [],
    bankLarge: [],
  };
  const quiet = buildReviewCauses(quietBase);
  note(quiet.candidates.length === 0, 'a quiet month passes nothing through the gate');
  note(
    quiet.quiet === 'Nothing new or unusual stood out in your spending and your investments grew by about $5,000 on their own.',
    'a quiet month closes with what is true'
  );
  const onTrack = buildReviewCauses({ ...quietBase, goalStanding: { type: 'spend-ceiling', good: true, tag: 'within your limit' } });
  note(/^Spending is within your limit, /.test(onTrack.quiet), 'a goal state is stated without a congratulatory lead-in');
  note(!/nothing needs/i.test(quiet.quiet) && !/nothing needs/i.test(onTrack.quiet), 'the quiet line is never a bare “nothing”');

  const locked = buildReviewCauses({
    ...quietBase,
    investmentStatements: [
      ...months('2026-01', '2026-05').map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)),
      investmentStatement('2026-07', T2, 1125000, 20000),
    ],
  });
  note(
    locked.suppressed.some((s) => s.area === 'investments') && !/investments/.test(locked.quiet),
    'investments that cannot be explained yet are neither shown nor claimed as fine'
  );

  const fell = buildReviewCauses({
    ...quietBase,
    investmentStatements: [...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)), investmentStatement('2026-07', T2, 1000000, 20000)],
  });
  const fall = fell.candidates.find((c) => c.area === 'investments');
  const grew = buildReviewCauses({
    ...quietBase,
    investmentStatements: [...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)), investmentStatement('2026-07', T2, 1150000)],
  });
  const growth = grew.candidates.find((c) => c.area === 'investments');
  const saved = buildReviewCauses({
    ...quietBase,
    investmentStatements: [...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)), investmentStatement('2026-07', T2, 1500500, 400000)],
  });
  const addition = saved.candidates.find((c) => c.area === 'investments');
  note(
    !!addition && addition.cause === 'You added $400,000 to your investments.',
    'a large addition leads without giving trivial growth equal weight'
  );
  note(
    !!growth && growth.cause === 'The investments grew by about $50,000 on their own.',
    'significant growth leads when no contribution was made'
  );
  const mixed = buildReviewCauses({
    ...quietBase,
    investmentStatements: [
      ...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)),
      investmentStatement('2026-07', T2, 1125000, 20000),
      ...firstHalf.map((m) => ({ ...investmentStatement(m, T1, 300000), account: 'INV2', hash: `inv2-${m}` })),
      { ...investmentStatement('2026-07', T2, 299000), account: 'INV2', hash: 'inv2-2026-07' },
    ],
  });
  note(
    mixed.candidates.length === 0 && !/investments/.test(mixed.quiet),
    'a small fall in one account keeps the quiet line from calling investments up'
  );
  note(
    !!fall && fall.cause === 'The investments fell by about $120,000 on their own.',
    'a significant fall leads when the contribution is below the gate'
  );
  const opposed = buildReviewCauses({
    ...quietBase,
    investmentStatements: [...firstHalf.map((m, i) => investmentStatement(m, T1, 1000000 + i * 20000)), investmentStatement('2026-07', T2, 1450000, 400000)],
  }).candidates.find((c) => c.area === 'investments');
  note(
    !!opposed && opposed.cause === 'You added $400,000 to your investments and the investments fell by about $50,000 on their own.',
    'opposing significant components both remain in the headline'
  );

  const unreconciled = buildReviewCauses({
    ...quietBase,
    bankStatements: [...firstHalf.map((m) => bankStatement(m, T1)), bankStatement('2026-07', T2, { reconciled: false })],
  });
  note(!/stood out/.test(unreconciled.quiet || ''), 'a statement that does not add up is never vouched for');

  const shortHistory = buildReviewCauses({
    ...quietBase,
    bankStatements: [bankStatement('2026-06', T1), bankStatement('2026-07', T2)],
    cardStatements: [cardStatement('2026-06', T1), cardStatement('2026-07', T2)],
    bankRows: quietRows.filter((r) => r.date >= '2026-06'),
    cardRows: quietCard.filter((r) => r.date >= '2026-06'),
    investmentStatements: [],
  });
  note(
    shortHistory.quiet === 'Your newer statements all add up.',
    'too little history to judge “unusual” says only what it knows'
  );
}

/* ---------------- Stage 6: first run ---------------- */
{
  const firstRun = buildReviewCauses({
    ...base,
    bankStatements: allMonths.map((m) => bankStatement(m, T1)),
    cardStatements: allMonths.map((m) => cardStatement(m, T1)),
    investmentStatements: allMonths.map((m, i) => investmentStatement(m, T1, 1000000 + i * 1000)),
  });
  note(firstRun.mode === 'state' && firstRun.title === null, 'first run claims no “since”');
  note(firstRun.candidates.length === 0 && firstRun.quiet === null, 'first run runs no cause engine');
  note(firstRun.stateLine === 'Your statements through July 2026 all add up.', 'first run states where things stand');
  const firstGoal = buildReviewCauses({
    ...base,
    bankStatements: allMonths.map((m) => bankStatement(m, T1)),
    cardStatements: allMonths.map((m) => cardStatement(m, T1)),
    investmentStatements: [],
    goalStanding: { type: 'cushion', offTrack: true, tone: 'watch', title: 'Your goal is off track - still needed' },
  });
  note(firstGoal.candidates.length === 1 && firstGoal.candidates[0].area === 'goal', 'an off-track goal still shows on a first run');
}

/* ---------------- Stage 7: tone ---------------- */
{
  const texts = [];
  const collect = (r) => {
    for (const c of r.candidates) texts.push(c.cause, c.detail);
    texts.push(r.quiet, r.stateLine, r.title);
  };
  collect(buildReviewCauses(base));
  collect(buildReviewCauses({ ...base, bankStatements: allMonths.map((m) => bankStatement(m, T1)) }));
  texts.push(
    newCommitmentSentence({ label: 'Gym Club', typical: 3000 }, money),
    risenCommitmentSentence({ label: 'Gym Club', risen: { oldTypical: 3000, newTypical: 4000 } }, money),
    largeChargeSentence({ displayName: 'Electronics Hub', amount: 60000, date: '2026-07-14' }, money),
    largePaymentSentence({ label: 'Furniture Store', amount: 150000 }, money),
    growthRunSentence({ from: '2026-06-30', to: '2026-07-31', added: 20000, growth: -120000, fxEffect: 0, provider: 'scotia' }, { money, monthOf: (iso) => monthName(String(iso).slice(0, 7)) }),
    goalQuietPhrase({ good: true, type: 'cushion' }),
    goalQuietPhrase({ good: true, type: 'clear-card', tag: 'on track' }),
    goalQuietPhrase({ good: true, type: 'spend-ceiling' })
  );
  const all = texts.filter(Boolean);
  note(!all.some((t) => /\b\d{4}-\d{2}-\d{2}\b/.test(t)), 'no cause sentence prints a raw ISO date');
  note(
    largeChargeSentence({ displayName: 'Electronics Hub', amount: 60000, date: '2026-07-14' }, money) ===
      'A Electronics Hub charge of $60,000 on 14-Jul-26 is larger than usual for that place.',
    'a charge names its day in the app’s shared day format'
  );
  note(
    /on \$\{formatDisplayDate\(row\.date\)\}/.test(read('application', 'analysis', 'reporting-core.js')),
    'the day is formatted inside the shared sentence, so Activity and Overview inherit it together'
  );
  const blame = /\b(failed|fail|bad|should have|should|too late|irresponsible|over budget|wrong|overspen\w*|careless|mistake|warning|alarm|danger|problem|blame|forgot|missed|poor)\b|!/i;
  const coined = /\b(committed|flexible|discretionary|set-aside|band|free spending|guilt)\b/i;
  const offenders = all.filter((t) => blame.test(t) || coined.test(t));
  note(all.length >= 15 && !offenders.length, `every cause template reads without blame or app jargon${offenders.length ? ': ' + offenders.join(' | ') : ''}`);
  const blind = /chose|choice|decided|you (spent|paid|bought)/i;
  note(!all.some((t) => blind.test(t)), 'no template says who chose the change, so it reads the same either way');
  const templateSources = read('application', 'analysis', 'review-causes.js');
  note(!/chosen|voluntary|deliberate/.test(templateSources), 'the cause engine takes no “was this chosen” input at all');
}

/* ---------------- Stage 8: one judgement, one copy, read not recomputed ---------------- */
{
  const cards = read('application', 'ui', 'cards-render.js');
  const insights = read('application', 'analysis', 'reporting-insights.js');
  const invRender = read('application', 'ui', 'investments-render.js');
  const engine = read('application', 'analysis', 'review-causes.js');
  const overview = read('application', 'ui', 'overview-render.js');
  const controller = read('application', 'app-controller.js');
  note(/largeChargeSentence\(f\.row, prose\)/.test(cards) && !/charge of \$\{prose/.test(cards), 'Activity’s large-charge insight and Overview share one sentence');
  note(/largePaymentSentence\(f, proseMoney\)/.test(insights) && (insights.match(/is larger than usual\./g) || []).length === 1, 'Activity’s large-payment insight and Overview share one sentence');
  note(/growthRunSentence\(run, \{ who, money: prose, monthOf \}\)/.test(invRender) && !/Comparing stored statements/.test(invRender), 'the investment view keeps its growth sentence in the shared module');
  note(/growthRunComponents\(run, money\)/.test(engine) && /growthRunComponents\(run, money\)/.test(read('application', 'analysis', 'investments.js')), 'Overview and the investment view derive their clauses from the same semantic components');
  const run = { from: '2026-06-30', to: '2026-07-31', added: 400000, growth: 356, fxEffect: -37, provider: 'scotia' };
  const components = growthRunComponents(run, money);
  const headline = investmentHeadlineComponents(run, { meaningful: 3000, large: 25000 }, money);
  note(
    headline.length === 1 &&
      headline[0].key === components[0].key &&
      headline[0].amount === components[0].amount &&
      headline[0].direction === components[0].direction,
    'the shared headline clause carries the same semantic fact on both surfaces'
  );
  note(
    growthRunSentence(run, { who: '', money, monthOf: String }) ===
      `Comparing stored statements from 2026-06-30 to 2026-07-31, ${growthRunClause(run, money)}. Exchange-rate movement took off about $37.`,
    'the investment view’s sentence is exactly the shared clause inside its working note'
  );
  note(
    growthRunClause(run, money) === 'you added $400,000 and the investments grew by about $356 on their own',
    'the card keeps the full decomposition after Overview shortens its headline'
  );
  const selector = engine.slice(engine.indexOf('export function investmentHeadlineComponents'), engine.indexOf('function investmentCauses'));
  note(!/tone|colour|color|style/.test(selector), 'headline selection reads significance and direction, never presentation state');
  note(/commitmentLink\(item\)/.test(cards) && /commitmentLink\(item\)/.test(engine), 'a regular payment opens the same place from Activity and from Overview');
  note(
    !/detectRecurring|detectBankStandingDebits|detectLargeBankOutflows|growthExcludingContributions|buildReviewCauses/.test(overview),
    'Overview runs no detector of its own'
  );
  note(/const causes = reviewCauses\(\);/.test(overview), 'Overview reads the one cause model');
  const opener = controller.slice(controller.indexOf('function openCause('), controller.indexOf('function renderManageData()'));
  note(
    /month < p\.from \|\| month > p\.to\)\) state\.period = \{ type: 'custom', from: month, to: month \}/.test(opener),
    'opening a cause brings its month into Activity’s period when it is outside it'
  );
  const memo = controller.slice(controller.indexOf('function reviewCauses()'), controller.indexOf('function openCause('));
  note(/const commitments = commitmentsModel\(\);/.test(memo), 'causes reuse the regular-payment model Activity already computed');
  note(/_rvVal && _rvKey && key\.every/.test(memo), 'the cause model is memoised');
  for (const input of ['state.rows', 'state._bankStatements', 'state._cardStatements', 'state._investmentStatements', 'state.goal', 'state._planTarget', 'state._planSetAside', 'privateViewOn()']) {
    note(memo.includes(input), `the cause model is invalidated by ${input}`);
  }
  const epoch = controller.slice(controller.indexOf('const epoch = ['), controller.indexOf('if (\n      !_epochSnap'));
  for (const input of ['state.rows', 'classifiedBank()', 'state._investmentStatements', 'state.goal', 'state._planTarget', 'state._planSetAside', 'privateViewOn()']) {
    note(epoch.includes(input), `a cached Overview is rebuilt when ${input} changes`);
  }
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
