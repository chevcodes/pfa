/*
 * The "Add your next statement" prompt: one plain sentence on the surface, all
 * of its provenance behind the app's one info bubble, and a cadence measured
 * per account rather than assumed monthly.
 *
 * The prompt used to read: "USD Digital - Jul 2026.pdf" · account statement ·
 * account …6959 was last loaded through 31-Jul-26 - 47 days ago, beyond its
 * usual 31-day cycle. Six pieces of provenance in front of one action. These
 * checks hold the shape that replaced it, and hold the flag itself honest -
 * the defensive "beyond its usual N-day cycle" wording was only ever needed
 * because the sentence was explaining a judgement it had not shown its working
 * for.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  nextStatementNudge,
  staleStatementNudges,
} from '../application/analysis/reporting-periods.js';
import { roundedDurationPhrase, daysBetweenIso } from '../application/core/shared-helpers.js';

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
console.log(' STATEMENT NUDGE - a soft prompt, its working tucked behind the (i)');
console.log('='.repeat(72));

/* ---------------------------------------------------------------------------
 * 1. The flag itself. Each stream is compared against ITS OWN observed cadence.
 *    The real data is the test case: a monthly USD savings account and a
 *    quarterly JMD savings account whose latest statements both end 31-Jul-26.
 *    At the same gap the monthly one is overdue and the quarterly one is fine -
 *    which is exactly what a global monthly default would get wrong.
 * ------------------------------------------------------------------------ */
const monthlyEnds = [
  '28 Feb 2026', '31 Mar 2026', '30 Apr 2026', '31 May 2026', '30 Jun 2026', '31 Jul 2026',
];
const quarterlyEnds = ['31 Oct 2025', '31 Jan 2026', '30 Apr 2026', '31 Jul 2026'];
const bankStream = (account, ends, file) =>
  ends.map((end, i) => ({
    period: `01 Jan 2025 - ${end}`,
    source_file: `${file} ${i}.pdf`,
    account,
  }));

const now = new Date('2026-09-15T23:30:00-05:00');
const flagged = staleStatementNudges(
  [],
  [
    ...bankStream('416959', monthlyEnds, 'USD Digital'),
    ...bankStream('420908', quarterlyEnds, 'JMD Digital'),
  ],
  {},
  now
);
const monthly = flagged.find((n) => n.account === '416959');
const quarterly = flagged.find((n) => n.account === '420908');
note(monthly && monthly.status === 'overdue', 'a monthly account six weeks past its last statement is overdue');
note(monthly && monthly.cadenceDays === 31, "the monthly cadence comes from that account's own statements");
note(monthly && monthly.accountCount === 2, 'a statement prompt knows when it refers to one of several bank accounts');
note(!quarterly, 'a quarterly account at the same gap is not flagged at all');
const quarterlyAll = staleStatementNudges([], bankStream('420908', quarterlyEnds, 'JMD Digital'), {}, now);
note(quarterlyAll.length === 0, 'an irregular, longer-cycle account raises no prompt of its own');
const tracked = staleStatementNudges([], bankStream('420908', quarterlyEnds, 'JMD Digital'), { includeOnTrack: true }, now);
note(tracked.length === 1 && tracked[0].status === 'ontrack', 'asked for every tracked account, an up-to-date one comes back marked on track');
note(
  staleStatementNudges([], bankStream('999', ['31 Jan 2026'], 'One'), { includeOnTrack: true }, now).length === 0,
  'an account with no measured cycle is never claimed to be up to date'
);

/* An account with a single statement has no observed cadence, so nothing is
   assumed for it - it is left alone rather than measured against a month. */
note(
  staleStatementNudges([], bankStream('999', ['31 Jan 2026'], 'One'), {}, now).length === 0,
  'one statement is not enough to claim an account is overdue'
);

/* ---------------------------------------------------------------------------
 * 2. Every flagged account, not just the worst one.
 * ------------------------------------------------------------------------ */
const many = staleStatementNudges(
  [],
  [
    ...bankStream('416959', monthlyEnds, 'USD Digital'),
    ...bankStream('416958', ['31 Mar 2026', '30 Apr 2026', '31 May 2026', '15 Aug 2026'], 'JMD Checking'),
    ...bankStream('101016', ['31 Mar 2026', '30 Apr 2026', '31 May 2026', '05 Aug 2026'], 'JMD Junior'),
  ],
  {},
  now
);
note(many.length === 3, 'every account behind on its statements is reported');
note(
  many[0].daysSinceLast >= many[many.length - 1].daysSinceLast,
  'the list is ordered with the furthest behind first'
);
note(
  nextStatementNudge([], [...bankStream('416959', monthlyEnds, 'USD Digital')], {}, now)?.account ===
    '416959',
  'the single-nudge reader still returns the worst stream'
);

/* ---------------------------------------------------------------------------
 * 3. The day count is date-only. Taken as a millisecond difference it included
 *    the time of day, so one unchanged statement read 46 days in the morning
 *    and 47 in the evening.
 * ------------------------------------------------------------------------ */
const morning = staleStatementNudges([], bankStream('416959', monthlyEnds, 'USD'), {}, new Date('2026-09-15T07:05:00-05:00'));
const evening = staleStatementNudges([], bankStream('416959', monthlyEnds, 'USD'), {}, new Date('2026-09-15T23:55:00-05:00'));
note(
  morning[0].daysSinceLast === evening[0].daysSinceLast,
  'the same statement reads the same number of days all day'
);
note(
  morning[0].daysSinceLast === daysBetweenIso('2026-07-31', '2026-09-15'),
  'the day count is the shared daysBetweenIso, not a private calculation'
);

/* ---------------------------------------------------------------------------
 * 4. Durations are said the way a person says them, and never in days.
 * ------------------------------------------------------------------------ */
const phrases = {
  0: 'today',
  1: 'a day',
  3: 'a few days',
  8: 'about a week',
  17: 'about two weeks',
  32: 'about a month',
  42: 'about six weeks',
  46: 'about seven weeks',
  63: 'about two months',
  92: 'about three months',
};
for (const [days, expected] of Object.entries(phrases)) {
  note(roundedDurationPhrase(Number(days)) === expected, `${days} days reads "${expected}"`);
}
note(
  [1, 3, 8, 17, 32, 42, 46, 63, 92, 200].every((d) => !/\d/.test(roundedDurationPhrase(d))),
  'no duration phrase puts a numeral on the surface'
);
/* An account one day past a monthly cycle must not be rounded up into sounding
   overdue - proportionate at the low end is the whole point of the bands. */
note(roundedDurationPhrase(32) === roundedDurationPhrase(30), 'a few days late reads the same as on time');

/* ---------------------------------------------------------------------------
 * 5. The surface sentence carries the account and the duration. Every piece of
 *    provenance - the filename, the tail, the exact through-date, the exact day
 *    count, the cycle reasoning - lives in the (i) body instead.
 * ------------------------------------------------------------------------ */
const ahead = read('application', 'ui', 'ahead-render.js');
const slice = (from, to) => {
  const start = ahead.indexOf(from);
  return ahead.slice(start, ahead.indexOf(to, start + from.length));
};
const surface = slice('function renderStatementNudges(', '\n  /* =');
const provenance = slice('function nudgeProvenance(', 'function renderStatementNudges(');
const subject = slice('function nudgeSubject(', 'function bankAccountCurrency(');

note(/hasn't been updated in \$\{roundedDurationPhrase/.test(surface), 'the surface line is one plain sentence with a rounded duration');
note(/nudgeSubject\(nudge\)/.test(surface), 'the surface line names the account, not the file');
for (const provenanceField of ['sourceFile', 'latestEndDate', 'cadenceDays']) {
  note(!surface.includes(provenanceField), `the surface line does not mention ${provenanceField}`);
  note(provenance.includes(provenanceField), `the (i) body does carry ${provenanceField}`);
}
/* The day count is the one provenance field the surface may TOUCH, because the
   rounded phrase is derived from it - but every use of it has to go through
   that phrase, never to the screen as a number. */
note(
  (surface.match(/daysSinceLast/g) || []).length ===
    (surface.match(/roundedDurationPhrase\(nudge\.daysSinceLast\)/g) || []).length,
  'the surface line reaches the day count only through the rounded phrase'
);
note(provenance.includes('daysSinceLast'), 'the (i) body does carry daysSinceLast');
note(/account \\u2026|account …/.test(provenance), 'the account tail is shown only inside the (i) body');
note(!/…\$\{|slice\(-4\)/.test(surface), 'no account tail reaches the surface line');
note(/chartInfo\(el, null, nudgeProvenance\(nudge\)\)/.test(surface), 'the provenance rides the app\'s one info bubble, not a new marker');
note(/accountName\(state\.accountNames, 'bank'/.test(subject), 'the friendly name comes from the one rename lookup');
note(/nudge\.accountCount\) > 1/.test(subject), 'multiple accounts use an unambiguous shared subject');
note(!/sourceFile/.test(subject), 'the account name never falls back to the filename');

/* Private view: the (i) body is display:none while figures are hidden, which is
   what masks the account tail here - the same rule every other (i) obeys. */
const chartCss = read('interface', 'flow-chart.css');
note(
  /html\[data-privacy='on'\] \.chart-info-body,[\s\S]{0,400}?display: none/.test(chartCss),
  'private view suppresses (i) bodies, so the tail masks with every other one'
);

note(/current\s*\?\s*`\$\{capitaliseFirst\(nudgeSubject\(nudge\)\)\} is up to date\.`/.test(surface), 'with nothing behind, each tracked account reads as up to date in the same plain shape');
note(/title: current \? 'Your statements' : `Add your next \$\{kind\}`/.test(surface) && /\? 'All up to date'/.test(surface) && /'Past expected date'/.test(surface) && /'Expected about now'/.test(surface), 'and the folded card states timing without a guilt count');
note(/if \(!tracked\.length\) return null;/.test(surface), 'with no account it can measure, the card says nothing rather than claim all is current');
note(/if \(!current\) \{\s*sec\.append\(/.test(surface), 'an Add action is offered only when something is actually behind');
note(/'past due' : nudge\.status === 'due' \? 'due about now' : 'not due yet'/.test(provenance), "the (i) for an up-to-date account says the next one isn't due yet");

/* One action for the card rather than one per listed account. */
note(
  (surface.match(/onclick: pickStatements/g) || []).length === 1,
  'a list of stale accounts offers one Add action, not one per row'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
