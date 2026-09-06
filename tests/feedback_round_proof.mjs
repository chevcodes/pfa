import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { pickerCategoryNames, spendCategoryNames, creditCategoryNames, sortCategoryNames } from '../application/analysis/category-flow.js';
import { spendableCategoryNames } from '../application/analysis/spendable-categories.js';
import { monthTickOf } from '../application/ui/chart-helpers.js';
import { MONTHS_SHORT } from '../application/core/shared-helpers.js';
import { recordedNetWorth, makeManualAsset } from '../application/analysis/position.js';
import { categoryNameExists, migrateCustomCategories, makeCustomCategory } from '../application/analysis/custom-categories.js';

const ROOT = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const cfg = JSON.parse(readFileSync(join(ROOT, 'settings/config.json'), 'utf8'));
const source = (path) => readFileSync(join(ROOT, path), 'utf8');
const walk = (dir, accept, out = []) => {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name === 'react-dist' || name === 'sample-data' || name === 'node_modules') continue;
    const path = `${dir}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) walk(path, accept, out);
    else if (accept(name)) out.push(path);
  }
  return out;
};
const codeFiles = [...walk('application', (n) => n.endsWith('.js')), ...walk('react-ui', (n) => n.endsWith('.js') || n.endsWith('.jsx'))];
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

test('every category chooser is alphabetical, with the fallback last', () => {
  const lists = {
    card: pickerCategoryNames(cfg, 'card'),
    debit: pickerCategoryNames(cfg, 'bank', 'out'),
    credit: pickerCategoryNames(cfg, 'bank', 'in'),
    spendable: spendableCategoryNames(cfg),
    creditNames: creditCategoryNames(cfg),
  };
  for (const [name, list] of Object.entries(lists)) {
    assert.ok(list.length > 5, name);
    assert.deepEqual(list, sortCategoryNames(list, cfg), `${name} is not in alphabetical order`);
    assert.deepEqual(list, [...list].sort((a, b) => collator.compare(a, b)), `${name} differs from a plain alphabetical sort`);
  }
  assert.equal(sortCategoryNames(['Zoo', 'Uncategorised', 'baby', 'Apple'], cfg).join(), 'Apple,baby,Zoo,Uncategorised');
  assert.equal(spendCategoryNames(cfg).length, 22);
});

test('no picker re-ranks categories by use any more', () => {
  assert.ok(!codeFiles.some((path) => /orderCategoriesForPicker|pickerPriority/.test(source(path))));
  assert.ok(!/pickerPriority/.test(source('settings/config.json')));
});

test('a custom category cannot take a shipped name or alias', () => {
  assert.equal(categoryNameExists('income', cfg.categories), true);
  assert.equal(categoryNameExists('Other income', cfg.categories), true);
  assert.deepEqual(migrateCustomCategories(cfg.categories, [makeCustomCategory({ name: 'income' }), makeCustomCategory({ name: 'Rent' })]).map((c) => c.name), ['Rent']);
});

test('Open all is remembered: nothing marks a fold as transient', () => {
  for (const path of codeFiles) assert.ok(!/foldTransient/.test(source(path)), `${path} still has a transient fold flag`);
});

test('every inline disclosure either remembers its state or says it is ephemeral', () => {
  const offenders = [];
  for (const path of codeFiles.filter((p) => p.endsWith('.jsx'))) {
    const text = source(path);
    for (const match of text.matchAll(/<PfaInlineDisclosure\b([\s\S]*?)>/g)) {
      const attrs = match[1];
      if (!/\bname=|\bopen=|\bephemeral\b|\{\.\.\.props\}/.test(attrs)) offenders.push(`${path}: ${attrs.trim().slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('one writer changes the transaction category filter, and it tells every listener', () => {
  const text = source('application/ui/activity-render.js');
  assert.equal((text.match(/_txCategories = /g) || []).length, 2, 'only the declaration and the setter assign the set');
  assert.ok(!/_txCategories\.(add|delete|clear)\(/.test(text));
  assert.equal((text.match(/new CustomEvent\('pfa-ledger-categories-change'/g) || []).length, 1);
  assert.match(text, /function setTxCategories\(next\) \{[\s\S]*?hideInternal = !_txCategories\.has\(ownAccountTransferCategory\(\)\)[\s\S]*?pfa-ledger-categories-change/);
  for (const reset of ['resetTxSearch', 'resetActivityViewState', 'restoreActivityNavigationState']) {
    const body = text.slice(text.indexOf(`function ${reset}(`));
    assert.match(body.slice(0, body.indexOf('\n  }\n')), /setTxCategories\(/, `${reset} must go through the setter`);
  }
});

test('the category chips list what the view shows, with counts, plus the categories you made', () => {
  const text = source('application/ui/activity-render.js');
  assert.match(text, /for \(const row of \[\.\.\.cardRows, \.\.\.bankRecs\]\)/);
  assert.match(text, /ownCategories = \(state\.cfg\.categories \|\| \[\]\)\.filter\(\(category\) => category\.custom\)/);
  assert.ok(!/visibleRows\(\) \|\| \[\]\), \.\.\.\(bankRecs/.test(text));
  assert.match(source('react-ui/components/pfa-transaction-category-filter.jsx'), /disabled=\{empty\}/);
});

test('every month axis names the year under its first month, its latest month and each January', () => {
  const single = monthTickOf(MONTHS_SHORT, ['2026-03', '2026-04', '2026-05']);
  assert.equal(single.year('2026-03'), '2026');
  assert.equal(single.year('2026-04'), '');
  assert.equal(single.year('2026-05'), '2026');
  const multi = monthTickOf(MONTHS_SHORT, ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
  assert.deepEqual(['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'].map((m) => multi.year(m)), ['2025', '', '2026', '', '2026']);
  assert.match(source('application/ui/income-chart-render.js'), /monthTickOf\(MONTHS_SHORT, rows\)/);
  assert.ok(!codeFiles.some((path) => /yearSpanLabel|card-period/.test(source(path))));
});

test('two entries of one class both persist, list and sum', () => {
  const reconciled = { baseCurrency: 'JMD', hasBankData: false, asOf: '2026-09-30' };
  const a = makeManualAsset({ class: 'Hire purchase', label: 'Lender A', amount: 5000, kind: 'liability' });
  const b = makeManualAsset({ class: 'Hire purchase', label: 'Lender B', amount: 7000, kind: 'liability' });
  const c = makeManualAsset({ class: 'Investments', label: 'Fund A', amount: 100, kind: 'asset' });
  const d = makeManualAsset({ class: 'Investments', label: 'Fund B', amount: 250, kind: 'asset' });
  const model = recordedNetWorth({ reconciled, manualAssets: [a, b, c, d] });
  assert.equal(model.totalLiabilities, 12000);
  assert.equal(model.totalAssets, 350);
  assert.equal(model.recordedNetWorth, 350 - 12000);
  assert.deepEqual(model.lines.filter((line) => line.class === 'Hire purchase').map((line) => line.label), ['Lender A', 'Lender B']);
  const form = source('react-ui/components/pfa-position-asset-form.jsx');
  assert.ok(!/gaps|SelectItem/.test(form), 'the form has one door, not a menu plus a list of gaps');
  assert.match(form, /Add another/);
});

test('Try a change never reads the chosen period', () => {
  const text = source('application/ui/ahead-render.js');
  const body = text.slice(text.indexOf('function renderScenarioCard('), text.indexOf('function renderAhead('));
  assert.ok(!/resolved\(|state\.period|periodRows|bankRecordsInPeriod/.test(body));
  assert.match(body, /rollAllTrend/);
  assert.match(body, /does not change this/);
});

test('the payoff sentence says whose payment it uses and what the band means', () => {
  assert.match(source('react-ui/components/pfa-payoff-chart.jsx'), /a month you have been paying/);
  assert.match(source('react-ui/components/pfa-payoff-chart.jsx'), /After month 6 the line is dashed because it is less certain/);
  assert.match(source('application/ui/cards-render.js'), /It does not look at your spending or what you could afford to pay/);
  assert.match(source('application/ui/cards-render.js'), /note: `at the \$\{money0\(typicalPayment\)\} a month you have been paying`/);
});

const ALLOWED = [
  /Self-employed & side income/,
  /Rental income/,
  /Missing income category role/,
];
const bareIncome = (path, text) => {
  const literal = /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)/g;
  const offenders = [];
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat(m.split('\n').length - 1));
  stripped.split('\n').forEach((raw, index) => {
    const line = raw.replace(/(^|\s)\/\/.*$/, '');
    for (const match of line.matchAll(literal)) {
      const prose = match[0].slice(1, -1).replace(/\$\{[^}]*\}/g, '');
      if (!/\bincome\b/i.test(prose) || !/\s/.test(prose.trim())) continue;
      if (/^\.?\.?\//.test(prose) || ALLOWED.some((pattern) => pattern.test(prose))) continue;
      offenders.push(`${path}:${index + 1}: ${prose.slice(0, 80)}`);
    }
    const jsx = raw.match(/>([^<>{}]*\bincome\b[^<>{}]*)</i);
    if (jsx && /^[A-Za-z][A-Za-z ,.'’-]*$/.test(jsx[1].trim()) && /\s/.test(jsx[1].trim())) offenders.push(`${path}:${index + 1}: ${jsx[1].slice(0, 80)}`);
  });
  return offenders;
};
test('user-visible text says "pay", "money in" or "deposit", never a bare "income"', () => {
  const offenders = [];
  for (const path of codeFiles) {
    if (/\/(sample-data)\//.test(path)) continue;
    offenders.push(...bareIncome(path, source(path)));
  }
  assert.deepEqual(offenders, [], 'rename these, or add a reason to ALLOWED');
});

test('the wording scan flags a bare income, segment framing and affluence framing, and passes the declared names', () => {
  const flagged = [
    "const a = 'Income by source';",
    "const a = 'Your high income allows more';",
    "const a = 'Which income bracket are you in?';",
    "const a = 'A low-income household';",
    'const a = `Typical income of ${amount}`;',
    '<span>Income by source</span>',
  ];
  const passed = [
    "const a = 'Money in by source';",
    "const a = 'Self-employed & side income';",
    "const a = 'Rental income';",
    "const a = 'Income';",
    "const a = '../analysis/income-model.js';",
    "// a high income comment is not shown\nconst a = 1;",
  ];
  for (const text of flagged) assert.equal(bareIncome('sample.js', text).length, 1, text);
  for (const text of passed) assert.deepEqual(bareIncome('sample.js', text), [], text);
});

test('the default deposit bucket is named Money in and still answers to its old name', () => {
  const bucket = cfg.categories.find((category) => category.structuralRole === 'defaultIncome');
  assert.equal(bucket.name, 'Money in');
  assert.ok(bucket.aliases.includes('Income'));
  assert.ok(cfg.categories.find((category) => category.name === 'Other deposits').aliases.includes('Other income'));
});
