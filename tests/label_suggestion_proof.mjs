import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { applyAnswer } from '../application/analysis/confirmations.js';
import { labelSuggestions, suggestionSubject } from '../application/analysis/label-suggestions.js';
import { createLabelSuggestions, LABEL_SUGGESTION_WORDS } from '../application/ui/label-suggestion.js';
import { makeProseMoney } from '../application/core/money-format.js';
import { withConfigDefaults } from '../application/core/shared-helpers.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cfg = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const MONTHS = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
const credit = (id, date, amount, description, extra = {}) => {
  const row = { id, date, amount, direction: 'in', currency: 'JMD', account: '1111', type: 'CREDIT', description, ...extra };
  return { ...row, creditClassification: classifyCredit(row, { cfg }) };
};
const group = (description = 'CLIENT RETAINER PAYMENT', { amounts = [], days = [], extra = {}, months = MONTHS } = {}) =>
  months.map((month, index) => credit(`${description}-${index}`, `${month}-${String(days[index] || 12).padStart(2, '0')}`, amounts[index] || 85000, description, extra));
const forced = (classification, extra = {}) => group('CLIENT RETAINER PAYMENT', { extra }).map((row) => ({ ...row, creditClassification: { ...row.creditClassification, ...classification } }));
const anchor = credit('anchor', '2026-08-30', 400, 'SOMETHING SMALL');
const suggest = (rows, config = cfg, confirmations = []) => labelSuggestions({ rows: [...rows, anchor], cfg: config, confirmations });
const withAhead = (ahead) => ({ ...cfg, ahead: { ...cfg.ahead, ...ahead } });

test('the suggestion fires for a repeating, steady, undecided deposit group', () => {
  const [found, ...rest] = suggest(group());
  assert.equal(rest.length, 0);
  assert.equal(found.category, 'Salary');
  assert.equal(found.subject, suggestionSubject('Salary', found.ruleKey));
  assert.equal(found.typical, 85000);
  assert.equal(found.months, 6);
  assert.equal(found.count, 6);
  assert.equal(found.lastMonth, '2026-08');
  assert.equal(found.label, 'CLIENT RETAINER PAYMENT');
});

test('it fires only when every criterion holds: one criterion at a time is false', () => {
  const dismissed = applyAnswer([], { inference: 'labelSuggestion', subject: suggestionSubject('Salary', suggest(group())[0].ruleKey), answer: false }).confirmations;
  const cases = [
    ['too few months', suggest(group('CLIENT RETAINER PAYMENT', { months: MONTHS.slice(0, 2) }))],
    ['amounts outside the tolerance', suggest(group('CLIENT RETAINER PAYMENT', { amounts: [85000, 50000, 120000, 40000, 85000, 130000] }))],
    ['below the income floor', suggest(group('CLIENT RETAINER PAYMENT', { amounts: Array(6).fill(2000) }))],
    ['the day of the month is not steady', suggest(group('CLIENT RETAINER PAYMENT', { days: [2, 14, 27, 5, 21, 10] }))],
    ['already labelled Salary by its wording', suggest(group('SALARY PAYROLL'))],
    ['labelled by the person', suggest(group('CLIENT RETAINER PAYMENT', { extra: { categoryOverride: 'Pension' } }))],
    ['decided by the person as plain money in', suggest(group('CLIENT RETAINER PAYMENT', { extra: { categoryOverride: 'Money in' } }))],
    ['classified by wording rather than by default', suggest(forced({ basis: 'wording' }))],
    ['filed under another class even by default', suggest(forced({ category: 'Interest' }))],
    ['an own-account transfer, even if it were classified by default', suggest(forced({}, { internalTransfer: true }))],
    ['a refund, even if it were classified by default', suggest(forced({}, { refund: true }))],
    ['an own-account transfer', suggest(group('CLIENT RETAINER PAYMENT', { extra: { internalTransfer: true } }))],
    ['a refund', suggest(group('CLIENT RETAINER PAYMENT', { extra: { refund: true } }))],
    ['an unconfirmed cash deposit', suggest(group('CLIENT RETAINER PAYMENT', { extra: { excludedFromIncome: true, cashDeposit: true } }))],
    ['another currency', suggest(group('CLIENT RETAINER PAYMENT', { extra: { currency: 'USD' } }))],
    ['it stopped repeating months ago', suggest(group('CLIENT RETAINER PAYMENT', { months: MONTHS.slice(0, 3) }), cfg)],
    ['already dismissed', suggest(group(), cfg, dismissed)],
    ['the class is switched off', suggest(group(), { ...cfg, labelSuggestions: [{ ...cfg.labelSuggestions[0], active: false }] })],
    ['no class is configured', suggest(group(), { ...cfg, labelSuggestions: [] })],
  ];
  assert.equal(suggest(group()).length, 1);
  for (const [name, found] of cases) assert.equal(found.length, 0, name);
});

test('the thresholds come from config, not from the suggestion', () => {
  const unsteady = group('CLIENT RETAINER PAYMENT', { days: [2, 14, 27, 5, 21, 10] });
  assert.equal(suggest(unsteady).length, 0);
  assert.equal(suggest(unsteady, withAhead({ steadySpreadDays: 28 })).length, 1);
  const short = group('CLIENT RETAINER PAYMENT', { months: MONTHS.slice(0, 4) });
  assert.equal(suggest(short, withAhead({ minMonths: 5 })).length, 0);
  assert.equal(suggest(group('CLIENT RETAINER PAYMENT', { amounts: [85000, 91000, 85000, 91000, 85000, 91000] }), withAhead({ tolerance: 0.01 })).length, 0);
  assert.equal(suggest(group('CLIENT RETAINER PAYMENT', { amounts: [85000, 91000, 85000, 91000, 85000, 91000] })).length, 1);
  assert.equal(suggest(group('CLIENT RETAINER PAYMENT', { amounts: Array(6).fill(2000) }), { ...cfg, insights: { ...cfg.insights, meaningfulChangeMin: 1000 } }).length, 1);
});

test('the suggestion is class-extensible: a second configured class is asked and dismissed on its own', () => {
  const two = { ...cfg, labelSuggestions: [...cfg.labelSuggestions, { category: 'Pension', from: 'defaultIncome', active: true }] };
  const found = suggest(group(), two);
  assert.deepEqual(found.map((item) => item.category).sort(), ['Pension', 'Salary']);
  const dismissedSalary = applyAnswer([], { inference: 'labelSuggestion', subject: found.find((item) => item.category === 'Salary').subject, answer: false }).confirmations;
  assert.deepEqual(suggest(group(), two, dismissedSalary).map((item) => item.category), ['Pension']);
});

test('groups rank by typical amount and the attention item shows at most one, applying nothing until asked', async () => {
  const rows = [...group('CLIENT RETAINER PAYMENT'), ...group('REGULAR SUPPORT TRANSFER', { amounts: Array(6).fill(40000) })];
  const ranked = suggest(rows);
  assert.deepEqual(ranked.map((item) => item.label), ['CLIENT RETAINER PAYMENT', 'REGULAR SUPPORT TRANSFER']);
  const calls = { applied: [], answered: [] };
  const section = createLabelSuggestions({
    state: { cfg, confirmations: [] },
    classifiedBank: () => [...rows, anchor],
    answer: async (payload) => { calls.answered.push(payload); },
    applyLabel: async (...args) => { calls.applied.push(args); },
    proseMoney: makeProseMoney(cfg),
    trackUsage: () => {},
  });
  const items = section.attentionItems();
  assert.deepEqual(calls, { applied: [], answered: [] });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'These repeat. Label them as salary?');
  assert.equal(items[0].detail, 'CLIENT RETAINER PAYMENT · 6 deposits · about $85k a month');
  assert.deepEqual(items[0].actions.map((action) => [action.label, action.variant]), [['Dismiss', 'ghost'], ['Label as salary', 'primary']]);
  assert.equal(items[0].onClick, null);
  assert.equal(LABEL_SUGGESTION_WORDS.title('Pension'), 'These repeat. Label them as pension?');
  await items[0].actions[1].onClick();
  assert.equal(calls.applied.length, 1);
  assert.equal(calls.applied[0][1], 'Salary');
  assert.deepEqual(calls.applied[0][2], { applyAll: true });
  assert.equal(calls.answered.length, 0);
  await items[0].actions[0].onClick();
  assert.deepEqual([calls.answered[0].inference, calls.answered[0].answer, calls.answered[0].subject], ['labelSuggestion', false, ranked[0].subject]);
  const quiet = createLabelSuggestions({
    state: { cfg, confirmations: [] }, classifiedBank: () => [anchor], answer: () => {}, applyLabel: () => {}, proseMoney: makeProseMoney(cfg), trackUsage: () => {},
  });
  assert.deepEqual(quiet.attentionItems(), []);
});

test('Overview offers the suggestion, applying files a rule with undo and no pay answer, and private view hides the amount', async () => {
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
      await page.click('#ledger-tab-overview');
      const items = () => page.evaluate(() => [...globalThis.document.querySelectorAll('.attn-item')].map((element) => element.innerText.replace(/\n+/g, ' | ')));
      const stored = () => page.evaluate(async () => {
        const { Store } = await import('/application/core/storage.js');
        return { rules: (await Store.allRules()).map((rule) => [rule.match, rule.category]), confirmations: (await Store.confirmations.all()).map((record) => record.id) };
      });
      await page.waitForSelector('.attn-item');
      assert.deepEqual(await items(), ['These repeat. Label them as salary? | Client Retainer Payment · 6 deposits · about $85k a month | Dismiss | Label as salary']);
      assert.deepEqual(await stored(), { rules: [], confirmations: [] });
      await page.click('#privacy-btn');
      await page.waitForTimeout(400);
      const hidden = (await items())[0];
      assert.doesNotMatch(hidden, /85|\$\d/);
      assert.match(hidden, /These repeat/);
      await page.click('#privacy-btn');
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'Label as salary' }).click();
      await page.waitForTimeout(800);
      assert.deepEqual(await items(), []);
      assert.deepEqual(await stored(), { rules: [['client retainer payment', 'Salary']], confirmations: [] });
      await page.locator('[data-sonner-toast] button').first().click();
      await page.waitForTimeout(800);
      assert.deepEqual(await stored(), { rules: [], confirmations: [] });
      assert.equal((await items()).length, 1);
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
