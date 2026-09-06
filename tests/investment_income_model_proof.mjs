import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { investmentIncomeSection, investmentIncomeSince } from '../application/analysis/income-model.js';
import { statedIncomeModel } from '../application/ui/investments-render.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const line = (date, amount, deduction, currency, tag = '') => ({
  kind: 'distribution', date, amount, deduction, net: amount - deduction, currency, evidence: `${date} ${amount} ${tag}`,
});
const statement = (account, periodEnd, incomeLines) => ({ provider: 'scotia', account, periodStart: `${periodEnd.slice(0, 7)}-01`, periodEnd, incomeLines });
const statements = [
  statement('111', '2026-03-31', [line('2026-03-31', 100, 25, 'JMD'), line('2026-03-15', 10, 2.5, 'USD'), line('2026-03-20', 7, 1, null)]),
  statement('111', '2026-03-30', [line('2026-03-30', 999, 0, 'JMD', 'superseded')]),
  statement('222', '2026-03-31', [line('2026-03-31', 50, 10, 'JMD', 'second account')]),
  statement('111', '2026-06-30', [line('2026-06-30', 100, 25, 'JMD'), line('2026-06-30', 100, 25, 'JMD')]),
  statement('111', '2025-05-31', [line('2025-05-31', 40, 10, 'JMD')]),
  statement('111', '2026-05-31', []),
  { provider: 'ncb', account: '333', periodEnd: '2026-05-31' },
];
const money = (n) => `$${n.toLocaleString('en-US')}`;
const words = { base: 'JMD', prose: money, bankMoney: (n, currency) => `${currency} ${n}` };

test('the investment section holds stated distributions by month and currency and never counts toward take-home', () => {
  const section = investmentIncomeSection(statements);
  assert.equal(section.countsTowardTakeHome, false);
  assert.equal(section.basis, 'stated');
  assert.deepEqual(section.distributions.map(({ month, currency, amount, deduction, net, count }) => [month, currency, amount, deduction, net, count]), [
    ['2025-05', 'JMD', 40, 10, 30, 1],
    ['2026-03', 'JMD', 150, 35, 115, 2],
    ['2026-03', 'USD', 10, 2.5, 7.5, 1],
    ['2026-03', 'unstated', 7, 1, 6, 1],
    ['2026-06', 'JMD', 100, 25, 75, 1],
  ]);
  assert.deepEqual(investmentIncomeSection([]).distributions, []);
  assert.deepEqual(investmentIncomeSection(undefined).distributions, []);
  assert.deepEqual(investmentIncomeSection([{ provider: 'scotia', account: '1', periodEnd: '2026-01-31' }]).distributions, []);
});

test('mutating a statement changes the section and a superseded or repeated line is not counted twice', () => {
  const intact = JSON.stringify(investmentIncomeSection(statements));
  const mutated = statements.map((item, index) => index === 0 ? { ...item, incomeLines: [...item.incomeLines, line('2026-03-31', 5, 0, 'JMD', 'extra')] } : item);
  assert.notEqual(JSON.stringify(investmentIncomeSection(mutated)), intact);
  const twice = investmentIncomeSection([...statements, ...statements]);
  assert.equal(JSON.stringify(twice), intact);
  assert.notEqual(JSON.stringify(investmentIncomeSection(statements.filter((item) => item.account !== '222'))), intact);
});

test('the trailing twelve months are inclusive of the latest statement month and respect year boundaries', () => {
  const section = investmentIncomeSection(statements);
  assert.deepEqual(investmentIncomeSince(section, '2026-06-30'), [
    { currency: 'JMD', amount: 250, count: 3 }, { currency: 'USD', amount: 10, count: 1 }, { currency: 'unstated', amount: 7, count: 1 },
  ]);
  assert.deepEqual(investmentIncomeSince(section, '2026-04-30').map(({ currency, amount }) => [currency, amount]), [['JMD', 190], ['USD', 10], ['unstated', 7]]);
  assert.deepEqual(investmentIncomeSince(section, '2026-05-31').map(({ currency, amount }) => [currency, amount]), [['JMD', 150], ['USD', 10], ['unstated', 7]]);
  assert.deepEqual(investmentIncomeSince(section, '2026-04-30', 12).map(({ amount }) => amount), [190, 10, 7]);
  assert.deepEqual(investmentIncomeSince(section, '2025-05-31', 1).map(({ amount }) => amount), [40]);
  assert.deepEqual(investmentIncomeSince(section, '2025-04-30'), []);
  assert.deepEqual(investmentIncomeSince(section, null), []);
});

test('the Position line says what is stated, separates currencies and leaves out amounts with no currency', () => {
  const text = (totals) => statedIncomeModel(totals, words);
  assert.equal(text([]), null);
  assert.equal(text([{ currency: 'unstated', amount: 7, count: 1 }]), null);
  assert.equal(text([{ currency: 'JMD', amount: 4800, count: 4 }]).text, '$4,800 in fund distributions, last 12 months');
  assert.equal(text([{ currency: 'JMD', amount: 4800, count: 4 }, { currency: 'USD', amount: 12, count: 1 }]).text, '$4,800 and USD 12 in fund distributions, last 12 months');
  const model = text([{ currency: 'JMD', amount: 4800, count: 4 }, { currency: 'unstated', amount: 7, count: 2 }]);
  assert.equal(model.explain.length, 4);
  assert.match(model.explain.join(' '), /not money that reached your bank account/);
  assert.match(model.explain.join(' '), /not counted in your take-home, pay day or forecast/);
  assert.match(model.explain.join(' '), /gross figures/);
  assert.match(model.explain[3], /2 distributions did not state a currency and are left out/);
  assert.equal(text([{ currency: 'JMD', amount: 1, count: 1 }]).explain.length, 3);
});

test('Position shows the stated line only where statements state distributions, behind the shared info icon', async () => {
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
      await loadPersona(page, 'cardAndBank');
      await page.click('#ledger-tab-position');
      await page.getByRole('button', { name: /Open all/i }).first().click();
      const total = page.locator('.inv-card .inv-total');
      await total.waitFor({ state: 'attached', timeout: 10000 });
      assert.match(await total.innerText(), /\$4,800 in fund distributions, last 12 months/);
      await total.locator('.pfa-info-trigger').click();
      const popover = await page.locator('[data-radix-popper-content-wrapper]').innerText();
      assert.match(popover, /not counted in your take-home, pay day or forecast/);
      await loadPersona(page, 'bankOnly');
      await page.click('#ledger-tab-position');
      assert.equal(await page.locator('.inv-card').count(), 0);
      assert.equal(await page.getByText(/fund distributions/).count(), 0);
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
