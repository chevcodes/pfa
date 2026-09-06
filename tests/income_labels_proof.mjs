import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { roleCategoryName } from '../application/analysis/category-flow.js';
import { takeHomeModel } from '../application/ui/income-sources.js';
import { withConfigDefaults } from '../application/core/shared-helpers.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cfg = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const takeHomeClasses = [...new Set(cfg.categories.filter((category) => category.flow === 'in' && category.inTakeHome).map((category) => category.incomeClass))];
const namesIn = (incomeClass) => cfg.categories.filter((category) => category.flow === 'in' && category.incomeClass === incomeClass).map((category) => category.name);

test('every kind of deposit that can reach take-home has a label, and a kind with one register name uses it', () => {
  assert.ok(takeHomeClasses.length >= 6);
  for (const incomeClass of takeHomeClasses) assert.ok(cfg.incomeClassLabels[incomeClass], `${incomeClass} has no label`);
  for (const incomeClass of takeHomeClasses) {
    const names = namesIn(incomeClass);
    if (names.length === 1) assert.equal(cfg.incomeClassLabels[incomeClass], names[0], `${incomeClass} should read as its register name`);
  }
  assert.equal(cfg.incomeClassLabels.income, roleCategoryName(cfg, 'defaultIncome'));
  assert.ok(Object.keys(cfg.incomeClassLabels).every((incomeClass) => takeHomeClasses.includes(incomeClass)), 'a label for a kind that cannot reach take-home');
});

test('a label that drifts from the register is caught', () => {
  const drifted = { ...cfg.incomeClassLabels, support: 'Family and gifts' };
  const check = (labels) => namesIn('support').every((name) => labels.support === name);
  assert.equal(check(cfg.incomeClassLabels), true);
  assert.equal(check(drifted), false);
  assert.notEqual({ ...cfg.incomeClassLabels, income: 'Income' }.income, roleCategoryName(cfg, 'defaultIncome'));
});

test('the row tag and the take-home kind name an unlabelled deposit with the same word', () => {
  const row = { id: 'a', date: '2026-04-12', amount: 85000, direction: 'in', currency: 'JMD', account: '1111', type: 'CREDIT', description: 'CLIENT RETAINER PAYMENT' };
  const tag = classifyCredit(row, { cfg }).category;
  const model = takeHomeModel({ amount: 1, monthsUsed: 3, months: [], classes: [{ incomeClass: 'income', amount: 85000 }] }, { sentence: { lead: 'Take-home', amount: '$1', rest: '.' }, money: String, monthLabel: String, classLabels: cfg.incomeClassLabels });
  assert.equal(model.classes[0].label, tag);
});

test('in the app the row tag, the take-home kind and the source group read one word', async () => {
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
      await loadPersona(page, 'bankOnly');
      await page.evaluate(async () => {
        const { Store } = await import('/application/core/storage.js');
        const records = await Store.allBankTransactions();
        const template = records.find((row) => row.direction === 'in');
        const months = [...new Set(records.map((row) => String(row.date).slice(0, 7)))].sort().slice(-6);
        await Store.replaceBankTransactions([...records, ...months.map((month, index) => ({
          ...template, id: `injected-${index}`, date: `${month}-12`, amount: 85000, description: 'CLIENT RETAINER PAYMENT', type: 'CREDIT',
          balance: undefined, balanceAfter: undefined, counterpartyKey: undefined, counterpartyLabel: undefined,
        }))]);
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.click('#ledger-tab-activity');
      await page.getByRole('tab', { name: /Transactions/ }).first().click();
      await page.getByRole('searchbox').first().fill('retainer');
      await page.waitForTimeout(900);
      const tags = await page.evaluate(() => [...new Set([...globalThis.document.querySelectorAll('#app .cat-tag-name')].map((element) => element.textContent.trim()))]);
      assert.deepEqual(tags, ['Money in']);
      await page.getByRole('tab', { name: /Analysis/ }).first().click();
      const card = page.locator('#activity-income');
      await card.locator('.pfa-card-disclosure-trigger').first().click();
      await card.getByText('Months and kinds behind it').click();
      await card.getByText('Money in by source').click();
      await page.waitForTimeout(500);
      const labels = await card.locator('.plan-working > :first-child').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
      assert.ok(labels.filter((label) => label === tags[0]).length >= 2, `kind and group should both read ${tags[0]}: ${labels.join(', ')}`);
      assert.ok(!labels.includes('Income'));
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
