import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { applyAnswer, pruneConfirmations, sanitiseConfirmations } from '../application/analysis/confirmations.js';
import { labelSuggestions } from '../application/analysis/label-suggestions.js';
import { exportHistory, importHistory } from '../application/output/history-codec.js';
import { withConfigDefaults } from '../application/core/shared-helpers.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cfg = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const credit = (id, date) => {
  const row = { id, date, amount: 85000, direction: 'in', currency: 'JMD', account: '1111', type: 'CREDIT', description: 'CLIENT RETAINER PAYMENT' };
  return { ...row, creditClassification: classifyCredit(row, { cfg }) };
};
const rows = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].map((month, index) => credit(`r${index}`, `${month}-12`));
const asked = (confirmations) => labelSuggestions({ rows, cfg, confirmations });
const dismissal = () => applyAnswer([], { inference: 'labelSuggestion', subject: asked([])[0].subject, answer: false }).confirmations;

test('a dismissal is a person answer in the shared store at merchant scope, silent forever for that group', () => {
  const [record] = dismissal();
  assert.equal(record.inference, 'labelSuggestion');
  assert.equal(record.scope, 'merchant');
  assert.equal(record.answer, false);
  assert.equal(record.source, 'person');
  assert.match(record.id, /^cf:labelSuggestion:merchant:Salary\|/);
  assert.equal(asked([]).length, 1);
  assert.equal(asked([record]).length, 0);
  assert.equal(asked(sanitiseConfirmations([record])).length, 0);
  assert.equal(asked(pruneConfirmations([record], new Set())).length, 0);
  assert.equal(asked(pruneConfirmations([record], new Set(rows.map((row) => row.id)))).length, 0);
  assert.equal(asked(sanitiseConfirmations([{ ...record, scope: 'transaction' }])).length, 1);
});

test('a dismissal survives an encrypted backup export and restore', async () => {
  const [record] = dismissal();
  const file = await exportHistory([], { device: 'test-device' }, 'a passphrase for the proof', { confirmations: [record] });
  const restored = await importHistory(file, 'a passphrase for the proof');
  const back = sanitiseConfirmations(restored.userData.confirmations);
  assert.deepEqual(back.map((item) => item.id), [record.id]);
  assert.equal(asked(back).length, 0);
  const without = await importHistory(await exportHistory([], { device: 'test-device' }, 'a passphrase for the proof', { confirmations: [] }), 'a passphrase for the proof');
  assert.equal(asked(sanitiseConfirmations(without.userData.confirmations)).length, 1);
});

test('the dismissal lives in the one confirmation store and Clear all data empties it with the other answers', async () => {
  const manage = await readFile(join(ROOT, 'application/ui/manage-data.js'), 'utf8');
  const suggestion = await readFile(join(ROOT, 'application/ui/label-suggestion.js'), 'utf8');
  assert.match(manage.slice(manage.indexOf('async function doClearAll')), /confirmations: \[\]/);
  assert.doesNotMatch(suggestion, /Store\.|localStorage|indexedDB|applyAnswer\(/);
  assert.match(suggestion, /answer\(\{\s*inference: 'labelSuggestion'/);
});

test('in the app a dismissal survives reload, a backup export and restore, and is cleared with the other answers', async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const folder = await mkdtemp(join(tmpdir(), 'pfa-label-suggestion-'));
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage();
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
      const stored = () => page.evaluate(async () => {
        const { Store } = await import('/application/core/storage.js');
        return (await Store.confirmations.all()).map((record) => record.id);
      });
      const asks = async () => {
        await page.click('#ledger-tab-overview');
        await page.waitForTimeout(900);
        return page.locator('.attn-item', { hasText: 'These repeat' }).count();
      };
      const reload = async () => { await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('#ledger-tab-overview'); };
      await reload();
      assert.equal(await asks(), 1);
      await page.locator('.attn-item', { hasText: 'These repeat' }).getByRole('button', { name: 'Dismiss' }).click();
      await page.waitForTimeout(800);
      const ids = await stored();
      assert.equal(ids.length, 1);
      assert.match(ids[0], /^cf:labelSuggestion:merchant:Salary\|CLIENT RETAINER PAYMENT$/);
      assert.equal(await asks(), 0);
      await reload();
      assert.equal(await asks(), 0);

      await page.click('#export-btn');
      await page.click('#exp-export');
      const passwords = page.locator('.picker input.pass');
      await passwords.nth(0).fill('proof passphrase');
      await passwords.nth(1).fill('proof passphrase');
      const download = page.waitForEvent('download');
      await page.locator('.picker').getByRole('button', { name: 'Continue' }).click();
      const backup = join(folder, 'backup.ccah');
      await (await download).saveAs(backup);

      await page.evaluate(async () => {
        const { Store } = await import('/application/core/storage.js');
        await Store.confirmations.replace([]);
      });
      await reload();
      assert.deepEqual(await stored(), []);
      assert.equal(await asks(), 1);

      await page.click('#export-btn');
      await page.locator('#exp-import-input').setInputFiles(backup);
      await page.locator('.picker input.pass').fill('proof passphrase');
      await page.locator('.picker').getByRole('button', { name: 'Continue' }).click();
      await page.waitForTimeout(2500);
      await reload();
      assert.deepEqual(await stored(), ids);
      assert.equal(await asks(), 0);

      await page.getByText('Data & settings').first().click();
      await page.evaluate(() => [...globalThis.document.querySelectorAll('button')].find((button) => /Start over/.test(button.innerText))?.click());
      await page.waitForTimeout(500);
      await page.evaluate(() => [...globalThis.document.querySelectorAll('button')].find((button) => /Clear to an empty app/.test(button.innerText))?.click());
      await page.waitForTimeout(1500);
      assert.deepEqual(await stored(), []);
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
    await rm(folder, { recursive: true, force: true });
  }
});
