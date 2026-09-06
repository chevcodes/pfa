import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildIncomeModel, incomeBySource } from '../application/analysis/income-model.js';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { incomeSourcesModel } from '../application/ui/income-sources.js';
import { makeMoney, makeProseMoney } from '../application/core/money-format.js';
import { roundMoney, withConfigDefaults } from '../application/core/shared-helpers.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cfg = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const AS_OF = '2026-09-30';
const credit = (id, date, amount, key, description, extra = {}) => {
  const row = { id, date, amount, direction: 'in', currency: 'JMD', account: '1111', type: 'CREDIT', description, counterpartyKey: key, counterpartyLabel: key.replace('ext:', ''), ...extra };
  return { ...row, creditClassification: classifyCredit(row, { cfg }) };
};
const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
const rows = [
  ...months.map((month, index) => credit(`s${index}`, `${month}-25`, 200000, 'ext:EMPLOYER', 'SALARY PAYROLL')),
  ...months.map((month, index) => credit(`m${index}`, `${month}-10`, 30000, 'ext:SIDEWORK', 'TRANSFER FROM SIDEWORK')),
  ...months.map((month, index) => credit(`p${index}`, `${month}-05`, 45000, 'ext:PLAN', 'PENSION PAYMENT', { categoryOverride: 'Pension' })),
  credit('o1', '2026-05-17', 12345, 'ext:FRIEND', 'TRANSFER FROM FRIEND'),
  credit('o2', '2026-07-21', 6000, 'ext:SHOP', 'REFUND-LIKE GESTURE'),
];
const total = (model) => roundMoney(model.monthlyMoneyIn.reduce((sum, item) => sum + item.amount, 0));
const sourceTotal = (sources) => roundMoney(sources.groups.reduce((sum, group) => sum + group.streams.reduce((inner, stream) => inner + stream.total, 0), sources.other.total));
const words = { prose: makeProseMoney(cfg), money: makeMoney(cfg), monthLabel: (month) => `m:${month}`, categoryLabel: 'Money in' };

test('income by source groups streams by category and its totals equal the income model totals', () => {
  const model = buildIncomeModel({ bankRows: rows, cfg, asOf: AS_OF });
  const sources = incomeBySource(model);
  assert.deepEqual(sources.groups.map((group) => [group.category, group.streams.map((stream) => stream.label), group.typical]),
    [['Salary', ['EMPLOYER'], 200000], ['Pension', ['PLAN'], 45000], ['Money in', ['SIDEWORK'], 30000]]);
  assert.deepEqual(sources.other, { count: 2, total: 18345, months: 2 });
  assert.equal(sources.total, total(model));
  assert.equal(sourceTotal(sources), total(model));
  assert.ok(sources.groups.every((group) => group.streams.every((stream) => stream.cadence === 'monthly' && stream.lastMonth === '2026-08')));
  const dropped = { ...model, streams: model.streams.slice(1) };
  assert.notEqual(sourceTotal(incomeBySource(dropped)), total(model) - 1);
  assert.equal(sourceTotal(incomeBySource(dropped)), total(model));
  assert.throws(() => assert.equal(incomeBySource({ ...model, takeHomeCredits: model.takeHomeCredits.slice(1) }).total, total(model)));
  assert.deepEqual(incomeBySource(buildIncomeModel({ bankRows: [], cfg, asOf: AS_OF })), { groups: [], other: { count: 0, total: 0, months: 0 }, total: 0 });
});

test('the glance uses the compact money formatter and exact amounts sit only in the evidence rows', () => {
  const sources = incomeBySource(buildIncomeModel({ bankRows: rows, cfg, asOf: AS_OF }));
  const model = incomeSourcesModel(sources, words);
  assert.equal(model.label, 'Money in by source');
  const [salary] = model.groups;
  assert.equal(salary.label, 'Salary');
  assert.equal(salary.totalText, '$200k a month');
  assert.equal(salary.streams[0].glance, '$200k a month · monthly · last m:2026-08');
  assert.doesNotMatch(JSON.stringify(model.groups.map((group) => [group.label, group.totalText, group.streams.map((stream) => stream.glance)])), /\.\d\d/);
  assert.deepEqual(salary.streams[0].evidence.map((row) => row.label), ['Typical month', 'Received in all', 'Months seen', 'Usual day of the month', 'Last seen']);
  assert.equal(salary.streams[0].evidence[0].value, '$200,000.00');
  assert.equal(salary.streams[0].evidence[1].value, '$1,200,000.00');
  assert.equal(model.other, '2 other deposits that do not repeat, $18k in all');
  assert.equal(incomeSourcesModel(incomeBySource(buildIncomeModel({ bankRows: [], cfg, asOf: AS_OF })), words), null);
  assert.equal(incomeSourcesModel({ ...sources, groups: [], other: { count: 1, total: 5, months: 1 } }, words).other, '1 other deposit that does not repeat, $5 in all');
  assert.equal(incomeSourcesModel({ groups: [{ category: null, typical: 1000, streams: [{ ...sources.groups[0].streams[0] }], total: 1 }], other: { count: 0, total: 0, months: 0 } }, words).groups[0].label, 'Money in');
});

test('Activity shows income by source inside the existing card without removing anything from it', async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      for (const persona of ['cardAndBank', 'bankOnly']) {
        await loadPersona(page, persona);
        await page.click('#ledger-tab-activity');
        const card = page.locator('#activity-income');
        await card.locator('.pfa-card-disclosure-trigger').first().click();
        const text = await card.innerText();
        for (const kept of ['Typical', 'Money in by source', 'Why']) assert.match(text, new RegExp(kept), `${persona}: ${kept}`);
        assert.ok(await card.locator('.pfa-react-root').count(), `${persona}: chart root`);
        await card.getByText('Money in by source').click();
        const section = card.locator('[data-name="activity-income-sources"]');
        assert.match(await section.innerText(), /a month/);
        await section.locator('[data-name^="activity-income-source-"] .pfa-inline-disclosure-trigger').first().click();
        assert.match(await section.innerText(), /Received in all/);
      }
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
