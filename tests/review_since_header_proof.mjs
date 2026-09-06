import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as engine from '../application/analysis/review-causes.js';

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
console.log(' SINCE HEADER - names the anchor the engine actually used');
console.log('='.repeat(72));

const TODAY = '2026-10-20';
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
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};
const bank = (ym, importedAt, account = '000111') => {
  const [y, m] = ym.split('-').map(Number);
  return {
    hash: `bank-${account}-${ym}`,
    account,
    period: `01 ${MON[m - 1]} ${y} - ${lastDay(ym)} ${MON[m - 1]} ${y}`,
    importedAt,
    reconciled: true,
  };
};
const card = (ym, importedAt) => ({
  hash: `card-${ym}`,
  account: '4321',
  statementKey: ym,
  periodEnd: `${ym}-25`,
  importedAt,
  reconciled: true,
});
const inv = (ym, importedAt) => ({
  hash: `inv-${ym}`,
  provider: 'scotia',
  account: 'INV1',
  periodEnd: `${ym}-${lastDay(ym)}`,
  printedTotal: 1000000,
  pagesDeclared: 1,
  pagesSeen: [1],
  cashActivity: [],
  holdings: [],
  fxRates: {},
  importedAt,
});
const at = (base, hours) => new Date(Date.parse(base) + hours * 3600000).toISOString();
const T1 = '2026-07-03T10:00:00.000Z';
const T2 = '2026-08-03T10:00:00.000Z';
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const cfg = { currency: { code: 'JMD' }, insights: {} };
const firstHalf = months('2026-01', '2026-06');

const label = (iso) => {
  const [year, month, day] = String(iso).slice(0, 10).split('-');
  return `${day}-${MON[+month - 1]}-${year.slice(2)}`;
};

function expectedGroups(baseline) {
  const groups = new Map();
  for (const source of baseline.sources.filter((s) => s.compared)) {
    const key = label(source.since);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(source.ledger);
  }
  return groups;
}

function parseHeader(title) {
  const covered = /^Since your statement ending (\d{2}-[A-Z][a-z]{2}-\d{2})$/.exec(title || '');
  if (covered) return { covered: true, groups: new Map([[covered[1], null]]) };
  const body = /^Since your (.+)$/.exec(title || '');
  if (!body) return null;
  const groups = new Map();
  for (const part of body[1].split(' and your ')) {
    const m = /^(.+) statements? ending (\d{2}-[A-Z][a-z]{2}-\d{2})$/.exec(part);
    if (!m) return null;
    groups.set(m[2], new Set(m[1].split(/, | and /)));
  }
  return { covered: false, groups };
}

function check(name, input) {
  const result = engine.buildReviewCauses({ ...input, cfg, money, today: TODAY });
  const baseline = result.baseline;
  const expected = expectedGroups(baseline);
  const ledgersPresent = new Set(baseline.sources.map((s) => s.ledger));
  const parsed = parseHeader(result.title);
  note(!!parsed, `${name}: the header is readable (${result.title})`);
  if (!parsed) return result;
  const expectCovered =
    expected.size === 1 && [...ledgersPresent].every((ledger) => [...expected.values()][0].has(ledger));
  note(parsed.covered === expectCovered, `${name}: the header names ledgers only when the story does not cover all of them (${result.title})`);
  const sameMonths =
    parsed.groups.size === expected.size && [...expected.keys()].every((month) => parsed.groups.has(month));
  note(sameMonths, `${name}: every month in the header is a month the engine anchored on (${result.title})`);
  if (!parsed.covered && sameMonths) {
    note(
      [...expected].every(
        ([month, ledgers]) =>
          parsed.groups.get(month).size === ledgers.size && [...ledgers].every((l) => parsed.groups.get(month).has(l))
      ),
      `${name}: each month names exactly the statements that anchored on it (${result.title})`
    );
  }
  note(
    typeof engine.sinceHeader === 'function' && result.title === engine.sinceHeader(baseline, TODAY),
    `${name}: the header is the engine’s own reading of its baseline`
  );
  return result;
}

const allTogether = {
  bankStatements: [...firstHalf.map((m) => bank(m, T1)), bank('2026-07', T2)],
  cardStatements: [...firstHalf.map((m) => card(m, T1)), card('2026-07', T2)],
  investmentStatements: [...firstHalf.map((m) => inv(m, T1)), inv('2026-07', T2)],
};

const fresh = check('fresh story', allTogether);
note(
  fresh.title ===
    'Since your card statement ending 25-Jun-26 and your bank and investment statements ending 30-Jun-26',
  'fresh story: every mid-month and month-end anchor is named exactly'
);

const again = check('re-import', {
  bankStatements: [...allTogether.bankStatements, { ...bank('2026-07', T2), hash: 'bank-copy' }],
  cardStatements: [...allTogether.cardStatements, { ...card('2026-07', T2), hash: 'card-copy' }],
  investmentStatements: allTogether.investmentStatements,
});
note(again.title === fresh.title, 're-import: importing the same statements again leaves the header alone');

const late = check('late import outside the window', {
  bankStatements: allTogether.bankStatements,
  cardStatements: [...firstHalf.map((m) => card(m, T1)), card('2026-07', at(T2, 13))],
  investmentStatements: allTogether.investmentStatements,
});
note(late.title === 'Since your card statement ending 25-Jun-26', 'late import: a card statement imported on its own names its close date');

const sitting = check('several statements in one sitting', {
  bankStatements: [
    ...firstHalf.map((m) => bank(m, T1)),
    bank('2026-07', T2),
    bank('2026-08', at(T2, 0.3)),
    bank('2026-09', at(T2, 2)),
  ],
  cardStatements: [
    ...firstHalf.map((m) => card(m, T1)),
    card('2026-07', at(T2, 3)),
    card('2026-08', at(T2, 4)),
    card('2026-09', at(T2, 15)),
  ],
  investmentStatements: [...firstHalf.map((m) => inv(m, T1)), inv('2026-07', at(T2, 5)), inv('2026-08', at(T2, 26))],
});
note(
  sitting.title ===
    'Since your card statement ending 25-Jun-26 and your bank and investment statements ending 30-Jun-26',
  'one sitting: statements chained within the window keep their exact anchors'
);

const cardAhead = check('card anchored on a different month from the bank', {
  bankStatements: [...months('2026-01', '2026-07').map((m) => bank(m, T1)), bank('2026-08', T2)],
  cardStatements: [...months('2026-01', '2026-08').map((m) => card(m, T1)), card('2026-09', T2)],
  investmentStatements: [...months('2026-01', '2026-08').map((m) => inv(m, T1)), inv('2026-09', T2)],
});
note(
  cardAhead.title ===
    'Since your bank statement ending 31-Jul-26 and your card statement ending 25-Aug-26 and your investment statement ending 31-Aug-26',
  'card and bank anchored on different dates: every close is named'
);

const quarterly = check('a quarterly account imported late alongside the month', {
  bankStatements: [
    ...firstHalf.map((m) => bank(m, T1)),
    bank('2026-07', T2),
    bank('2026-04', T1, '000222'),
    bank('2026-07', T2, '000222'),
  ],
  cardStatements: allTogether.cardStatements,
  investmentStatements: allTogether.investmentStatements,
});
note(
  quarterly.title ===
    'Since your bank statement ending 30-Apr-26 and your card statement ending 25-Jun-26 and your bank and investment statements ending 30-Jun-26',
  'bank accounts anchored on different dates: the earlier one is named, not hidden in a range'
);

const lastYear = check('a story anchored in an earlier year', {
  bankStatements: [bank('2025-11', T1), bank('2025-12', T2)],
});
note(lastYear.title === 'Since your statement ending 30-Nov-25', 'a close date from another year keeps its year');

if (typeof engine.sinceHeader === 'function') {
  const moved = { ...cardAhead.baseline, anchors: cardAhead.baseline.anchors.map((a) => ({ ...a, since: '2026-05-31' })) };
  note(
    engine.sinceHeader(moved, TODAY) === 'Since your statement ending 31-May-26',
    'the header follows the baseline’s exact anchors, not a separate reading of the statements'
  );
} else {
  note(false, 'the engine exposes one header reading of its baseline');
}

const overview = read('application', 'ui', 'overview-render.js');
note(/title: storyMode && causes\.title \? causes\.title : 'To review'/.test(overview), 'Overview prints the engine’s header as given');
note(
  !/statementsPhrase|statementMonthLabel|sinceHeader|reviewBaseline|monthName/.test(overview),
  'Overview never works out the anchor month itself'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
