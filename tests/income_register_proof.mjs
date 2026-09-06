import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { categoryMeta, spendCategoryNames, creditCategoryNames, resolveCategoryName, pickerCategoryNames, categoryConfirmation, sortCategoryNames } from '../application/analysis/category-flow.js';
import { spendableCategoryNames } from '../application/analysis/spendable-categories.js';
import { makeCustomCategory, migrateCustomCategories, mergeCategories, colourSlot } from '../application/analysis/custom-categories.js';
import { SHARE_PALETTE } from '../application/analysis/reporting-core.js';
import { categoryContributions } from '../application/analysis/category-contributions.js';
import { spendBreakdown } from '../application/analysis/spend-breakdown.js';
import { categoriseBankRows } from '../application/analysis/bank-categorise.js';
import { isCountedBankIncome } from '../application/core/shared-helpers.js';
import { applyAnswer } from '../application/analysis/confirmations.js';
import { autoAssign } from '../application/analysis/plan-autoassign.js';
import { categoryBudgetForMonth } from '../application/analysis/category-budget.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const cfg = JSON.parse(readFileSync(join(ROOT, 'settings/config.json'), 'utf8'));
const source = (path) => readFileSync(join(ROOT, path), 'utf8');
const existing = ['Card Payment', 'Refund / Reversal', 'Fees & Interest', 'Government & Tax', 'Subscriptions', 'Online Shopping', 'Courier & Shipping', 'Telecom', 'Utilities', 'Insurance', 'Banking & Transfers', 'Fuel & Transport', 'Auto & Vehicle', 'Groceries', 'Pharmacy & Health', 'Dining & Takeout', 'Hotels & Travel', 'Entertainment & Recreation', 'Education', 'Loan Repayment', 'Cash & ATM', 'Betting & Gaming', 'Retail & Department', 'Home & Services'];
const added = ['Money in', 'Salary', 'Bonus', 'Self-employed & side income', 'Rental income', 'Government benefits', 'Pension', 'Interest', 'Dividends', 'Family & gifts', 'Expense reimbursement', 'Tax refund', 'Loan proceeds', 'Own-account transfer', 'Investment withdrawal', 'Cash deposit', 'Other deposits'];
const colours = { 'Fees & Interest':'#5b7183', 'Government & Tax':'#5b6f9f', 'Subscriptions':'#4d8b9e', 'Online Shopping':'#856a9e', 'Courier & Shipping':'#856a9e', 'Telecom':'#7b6791', 'Utilities':'#3f6d9a', 'Insurance':'#4d8b9e', 'Banking & Transfers':'#3f6d9a', 'Fuel & Transport':'#87874f', 'Auto & Vehicle':'#3d8080', 'Groceries':'#a97455', 'Pharmacy & Health':'#5b7183', 'Dining & Takeout':'#b0854e', 'Hotels & Travel':'#7b6791', 'Entertainment & Recreation':'#5b6f9f', 'Education':'#487e94', 'Loan Repayment':'#4e8b78', 'Cash & ATM':'#3d8080', 'Betting & Gaming':'#a06455', 'Retail & Department':'#5b7183', 'Home & Services':'#3d8080' };
const classes = new Set(['income', 'earned', 'benefit', 'retirement', 'investment', 'support', 'returned', 'loan', 'transfer', 'pending', 'other']);
const clone = (value) => structuredClone(value);
const rejectMutation = (check, altered) => assert.throws(() => check(altered));

function verifyRegister(config) {
  assert.deepEqual(config.categories.slice(0, existing.length).map((category) => category.name), existing);
  assert.deepEqual(config.categories.slice(existing.length).map((category) => category.name), added);
  for (const category of config.categories) {
    assert.ok(['out', 'in', 'internal'].includes(category.flow));
    if (category.flow === 'in') assert.ok(classes.has(category.incomeClass));
    assert.equal(category.inTakeHome, category.inIncomeTotal);
    assert.equal(typeof category.expectsRecurrence, 'boolean');
    assert.ok(Array.isArray(category.aliases));
    assert.equal(typeof category.selectable, 'boolean');
  }
  for (const category of config.categories.slice(existing.length)) assert.deepEqual(category.patterns, { universal: [] });
  for (const category of config.categories.filter((item) => item.flow === 'in'))
    assert.equal(category.inIncomeTotal, !['transfer', 'returned', 'pending'].includes(category.incomeClass));
}

test('register shape, appended order, and assign-only rules reject mutations', () => {
  verifyRegister(cfg);
  const bad = clone(cfg);
  bad.categories.at(-1).flow = 'sideways';
  rejectMutation(verifyRegister, bad);
  const auto = clone(cfg);
  auto.categories.at(-1).patterns.universal.push('synthetic');
  rejectMutation(verifyRegister, auto);
  const moved = clone(cfg);
  [moved.categories[0], moved.categories[moved.categories.length - 1]] = [moved.categories.at(-1), moved.categories[0]];
  rejectMutation(verifyRegister, moved);
});

test('spending lists and the 22 original spend colours reject income leakage', () => {
  const spending = spendCategoryNames(cfg);
  const spendable = spendableCategoryNames(cfg);
  assert.equal(spending.length, 22);
  assert.ok(spendable.every((name) => spending.includes(name)));
  assert.ok(cfg.categories.filter((category) => category.flow === 'in').every((category) => !spending.includes(category.name) && !spendable.includes(category.name)));
  assert.deepEqual(Object.fromEntries(spending.map((name) => [name, colourSlot(name, SHARE_PALETTE)])), colours);
  const bad = clone(cfg);
  bad.categories.find((category) => category.name === 'Salary').flow = 'out';
  rejectMutation((config) => assert.ok(!spendCategoryNames(config).includes('Salary')), bad);
  rejectMutation((palette) => assert.deepEqual(Object.fromEntries(spending.map((name) => [name, colourSlot(name, palette)])), colours), [...SHARE_PALETTE].reverse());
});

test('aliases and custom name collisions preserve row choices and rules', () => {
  const named = clone(cfg);
  categoryMeta(named, 'Money in').aliases.push('Former income label');
  assert.equal(resolveCategoryName(named, 'former INCOME label'), 'Money in');
  rejectMutation((config) => assert.equal(resolveCategoryName(config, 'former INCOME label'), 'Money in'), cfg);
  const custom = [makeCustomCategory({ name: 'income' }), makeCustomCategory({ name: 'Garden' })];
  const row = { categoryOverride: 'income' };
  const rule = { match: 'synthetic', category: 'income' };
  const migrated = migrateCustomCategories(cfg.categories, custom);
  assert.deepEqual(migrated.map((category) => category.name), ['Garden']);
  assert.equal(mergeCategories(cfg.categories, migrated).filter((category) => ['income', 'money in'].includes(category.name.toLowerCase())).length, 1);
  assert.equal(resolveCategoryName(cfg, row.categoryOverride), 'Money in');
  assert.equal(resolveCategoryName(cfg, rule.category), 'Money in');
  assert.equal(row.categoryOverride, 'income');
  assert.equal(rule.category, 'income');
  rejectMutation((categories) => assert.equal(categories.length, 1), custom);
  assert.match(source('application/app-controller.js'), /migrateCustomCategories\(state\.cfg\.categories, storedCustomCategories\)/);
  assert.match(source('application/output/data-export.js'), /migrateCustomCategories\(/);
});

test('picker direction, grouping, and confirmation mapping reject mutations', () => {
  const card = pickerCategoryNames(cfg, 'card');
  const debit = pickerCategoryNames(cfg, 'bank', 'out');
  const credit = pickerCategoryNames(cfg, 'bank', 'in');
  assert.deepEqual(credit, creditCategoryNames(cfg));
  assert.deepEqual(card, sortCategoryNames(existing, cfg));
  assert.deepEqual(debit, sortCategoryNames(existing.slice(2), cfg));
  assert.deepEqual(credit, sortCategoryNames(credit, cfg));
  assert.equal(credit[0], 'Bonus');
  assert.ok(credit.includes('Refund / Reversal'));
  assert.ok(!credit.includes('Cash deposit'));
  assert.ok(credit.every((name) => categoryMeta(cfg, name).flow === 'in'));
  assert.ok(debit.every((name) => !credit.includes(name)));
  const picker = source('application/ui/category-picker.js');
  const component = source('react-ui/components/pfa-category-picker.jsx');
  assert.doesNotMatch(picker, /more: credit/);
  assert.doesNotMatch(component, /category\.more/);
  assert.match(picker, /currentCategory\.selectable !== false && !cats\.includes\(row\.category\)/);
  assert.match(picker, /category !== row\.category && !pickerCategoryNames/);
  rejectMutation((names) => assert.deepEqual(names, sortCategoryNames(credit, cfg)), [...credit].reverse());
  const row = { id: 'synthetic-credit', direction: 'in', transferKey: 'synthetic-own', cashDeposit: false };
  const expected = new Map([['Own-account transfer', ['transfer', true]], ['Investment withdrawal', ['transfer', true]], ['Refund / Reversal', ['refund', false]], ['Expense reimbursement', ['refund', false]], ['Tax refund', ['refund', false]], ['Loan proceeds', ['refund', false]]]);
  for (const [name, [inference, answer]] of expected) {
    const mapped = categoryConfirmation(cfg, name, row);
    assert.equal(mapped.inference, inference);
    assert.equal(mapped.answer, answer);
    assert.equal(applyAnswer([], mapped).record.inference, inference);
  }
  for (const name of credit.filter((item) => !expected.has(item))) assert.equal(categoryConfirmation(cfg, name, row), null);
  assert.equal(categoryConfirmation(cfg, 'Salary', row), null);
  assert.equal(categoryConfirmation(cfg, 'Money in', { ...row, cashDeposit: true }).inference, 'income');
  rejectMutation((mapped) => assert.equal(mapped, null), { inference: 'pay' });
  assert.match(picker, /confirmAnswer\(/);
});

test('plan, budgets, intentions, payment select, treemap, and breakdown stay spending-only', () => {
  const names = spendableCategoryNames(cfg);
  for (const path of ['application/ui/plan-render.js', 'application/ui/intentions-section.js'])
    assert.match(source(path), /spendableCategoryNames\(state\.cfg\)/);
  const controller = source('application/app-controller.js');
  assert.match(controller, /state: paymentState, Store/);
  assert.match(controller, /spendCategoryNames\(target\.cfg\)/);
  rejectMutation((text) => assert.match(text, /state: paymentState, Store/), controller.replace('state: paymentState, Store', 'state, Store'));
  assert.ok(names.every((name) => categoryMeta(cfg, name).flow === 'out'));
  const assigned = autoAssign({ categories: names, cfg });
  assert.ok(Object.keys(assigned.assignments).every((name) => categoryMeta(cfg, name).flow === 'out'));
  assert.ok(assigned.ambiguous.every((item) => categoryMeta(cfg, item.name).flow === 'out'));
  const budget = categoryBudgetForMonth({ rows: [], bankRows: [], splits: [], intentions: [{ id: 'synthetic-intention', category: 'Salary', amount: 10, kind: 'repeating', effectiveFrom: '2026-01', active: true }], categories: names, month: '2026-01', cfg });
  assert.ok(budget.items.every((item) => categoryMeta(cfg, item.category).flow === 'out'));
  const income = { id: 'synthetic-income', date: '2026-01-10', month: '2026-01', amount: 10, category: 'Salary', categoryOverride: 'Salary', kind: 'spend', direction: 'out', currency: 'JMD' };
  const untouchedCredit = categoriseBankRows([{ id: 'synthetic-credit', date: '2026-01-10', direction: 'in', description: 'synthetic credit' }], [], { cfg, fallback: cfg.special.fallback });
  assert.equal(untouchedCredit[0].category, 'Money in');
  const contribution = categoryContributions({ cardRows: [income], bankRows: [income], cfg });
  assert.equal(contribution.purchases.length, 0);
  assert.equal(contribution.byCategory.size, 0);
  const breakdown = spendBreakdown({ cardRecords: [income], cfg, period: { from: '2026-01-01', to: '2026-01-31' } });
  assert.equal(breakdown.categories.length, 0);
  rejectMutation((row) => assert.equal(categoryContributions({ cardRows: [row], cfg }).purchases.length, 0), { ...income, category: 'Groceries' });
  assert.match(source('application/ui/activity-render.js'), /categoryContributions\(\{ cardRows, bankRows/);
  assert.match(source('application/analysis/reporting-core.js'), /categoryMeta\(options\.cfg, category\)\?\.flow === 'in'/);
  assert.match(source('application/output/csv-export.js'), /r\.category/);
  assert.match(source('application/output/data-export.js'), /customCategories: state\.customCategories/);
  assert.match(source('application/analysis/reporting-print.js'), /by_category/);
});

test('source has no literal income-category comparisons', () => {
  const names = cfg.categories.filter((category) => category.flow === 'in').map((category) => category.name);
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const compare = new RegExp(`(?:===|!==|==|!=)\\s*['"](?:${escaped})['"]|['"](?:${escaped})['"]\\s*(?:===|!==|==|!=)|case\\s+['"](?:${escaped})['"]`, 'g');
  const scan = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? scan(join(dir, entry.name)) : /\.(js|jsx)$/.test(entry.name) ? [join(dir, entry.name)] : []);
  const files = [...scan('application'), ...scan('react-ui')];
  for (const path of files) assert.equal(compare.test(source(path)), false, path);
  rejectMutation((text) => assert.equal(compare.test(text), false), "category === 'Salary'");
});

test('income predicate is concentrated in the model and the two former exception files read it', () => {
  const analysis = source('application/analysis/bank-analysis.js');
  const commitment = source('application/analysis/commitment-income.js');
  const print = source('application/analysis/reporting-print.js');
  const model = source('application/analysis/income-model.js');
  assert.equal((analysis.match(/isCountedBankIncome\(/g) || []).length, 1);
  assert.equal((commitment.match(/isCountedBankIncome\(/g) || []).length, 0);
  assert.equal((print.match(/isCountedBankIncome\(/g) || []).length, 0);
  assert.equal((model.match(/isCountedBankIncome\(/g) || []).length, 4);
  assert.equal(isCountedBankIncome({ direction: 'in', internalTransfer: false, refund: false, excludedFromIncome: false }), true);
  for (const flag of ['internalTransfer', 'refund', 'excludedFromIncome']) assert.equal(isCountedBankIncome({ direction: 'in', [flag]: true }), false);
  rejectMutation((row) => assert.equal(isCountedBankIncome(row), true), { direction: 'in', refund: true });
  const modelReaders = ['application/analysis/position.js', 'application/analysis/committed-flexible.js'];
  for (const path of modelReaders) {
    assert.doesNotMatch(source(path), /isCountedBankIncome/);
    assert.match(source(path), /buildIncomeModel\(/);
  }
  rejectMutation((list) => assert.deepEqual(list, modelReaders), modelReaders.slice(1));
});

test('synthetic credit and debit dialogs show the right categories at 390px', { timeout: 60000 }, async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await loadPersona(page, 'bankOnly');
      await page.locator('#ledger-tab-activity').click();
      await page.locator('#activity-tab-transactions').click();
      const shown = (await page.locator('body').innerText()).match(/Showing ([A-Z][a-z]{2}-\d{2})\b/)?.[1];
      assert.ok(shown);
      const descriptions = await page.evaluate(async (label) => {
        const { Store } = await import('/application/core/storage.js');
        const rows = await Store.allBankTransactions();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const inShown = (row) => `${months[Number(row.date.slice(5, 7)) - 1]}-${row.date.slice(2, 4)}` === label;
        const shownDescriptions = new Set(rows.filter(inShown).map((row) => row.description));
        return ['in', 'out'].map((direction) => rows.find((row) => row.direction === direction && shownDescriptions.has(row.description))?.description || '');
      }, shown);
      for (const [index, description] of descriptions.entries()) {
        assert.ok(description);
        await page.locator('#tx-search').fill(description);
        await page.locator('.tx-row .cat-tag-btn').first().click();
        const choices = await page.locator('.picker-list > .picker-item').allTextContents();
        if (index === 0) {
          assert.deepEqual(choices, sortCategoryNames(creditCategoryNames(cfg), cfg));
          assert.equal(await page.locator('.picker-more').count(), 0);
          if (process.env.PFA_INCOME_SCREENSHOTS === '1')
            await page.locator('.picker').screenshot({ path: '/private/tmp/pfa-income-credit-picker-390.png' });
        } else {
          assert.equal(choices.length, 22);
          assert.ok(!choices.includes('Money in') && !choices.includes('Salary'));
          assert.equal(await page.locator('.picker-more').count(), 0);
          if (process.env.PFA_INCOME_SCREENSHOTS === '1')
            await page.locator('.picker').screenshot({ path: '/private/tmp/pfa-income-debit-picker-390.png' });
          await page.getByRole('button', { name: 'Set monthly payment' }).click();
          const paymentChoices = await page.locator('.picker-form select').first().locator('option').allTextContents();
          assert.equal(paymentChoices.length, 22);
          assert.ok(!paymentChoices.includes('Money in') && !paymentChoices.includes('Salary'));
        }
        await page.locator('.picker-actions button').last().click();
      }
      await page.locator('#tx-search').fill(descriptions[0]);
      const legacyCreditId = await page.evaluate(async () => {
        const { Store } = await import('/application/core/storage.js');
        const visible = [...globalThis.document.querySelectorAll('.tx-row')].find((row) => row.id.startsWith('tx-bank:') && row.querySelector('.amt.credit'));
        if (!visible) return '';
        const id = visible.id.slice('tx-bank:'.length);
        const rows = await Store.allBankTransactions();
        const target = rows.find((row) => row.id === id);
        target.categoryOverride = 'Banking & Transfers';
        await Store.replaceBankTransactions(rows);
        return id;
      });
      assert.ok(legacyCreditId);
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#ledger-tab-activity').click();
      await page.locator('#activity-tab-transactions').click();
      await page.locator(`[id="tx-bank:${legacyCreditId}"] .cat-tag-btn`).click();
      assert.equal((await page.locator('.picker-list > .picker-item.current').allTextContents()).join(''), 'Banking & Transfers current');
      const legacyChoices = await page.locator('.picker-list > .picker-item').allTextContents();
      assert.deepEqual(legacyChoices, sortCategoryNames([...creditCategoryNames(cfg), 'Banking & Transfers'], cfg).map((name) => name === 'Banking & Transfers' ? 'Banking & Transfers current' : name));
      await page.locator('.picker-actions button').last().click();
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
    await closeServer(server);
  }
});
