import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PERSONAS } from '../application/sample-data/mock-data.js';
import { hashSeed, makeRng, buildCardLedger, buildBankLedger } from '../application/sample-data/mock-generator.js';
import { classifyInternalTransfers, applyLedgerRules, bankFlowOverTime } from '../application/analysis/bank-analysis.js';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { buildIncomeModel, takeHomeBreakdown } from '../application/analysis/income-model.js';
import { buildPlanModel, takeHomeLinkable, takeHomeSentence, typicalIncome } from '../application/analysis/plan.js';
import { takeHomeModel } from '../application/ui/income-sources.js';
import { makeMoney, makeProseMoney } from '../application/core/money-format.js';
import { withConfigDefaults } from '../application/core/shared-helpers.js';
import { compileFromRaw } from '../application/statements/merchant-resolver.js';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AS_OF = '2026-09-30';
const cfg = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const resolver = compileFromRaw(JSON.parse(await readFile(join(ROOT, 'settings', cfg.merchants.file), 'utf8')), cfg, []);
const money = makeMoney(cfg);
const prose = makeProseMoney(cfg);

function personaRows(name) {
  const persona = PERSONAS[name];
  const rng = makeRng(hashSeed(persona.seed));
  const card = persona.hasCard ? buildCardLedger(persona, rng) : null;
  if (!persona.hasBank) return [];
  const bank = buildBankLedger(persona, rng, card ? card.perStatement.map((statement) => statement.payments) : null);
  const accounts = (persona.accounts || []).map((account) => account.number);
  return applyLedgerRules(classifyInternalTransfers(bank.records, accounts, [persona.cardAccount].filter(Boolean), resolver), {
    sharedAccounts: persona.sharedAccountNumbers || [], householdPayees: persona.householdPayeeNames || [],
  }).map((row) => row.direction === 'in' ? { ...row, creditClassification: classifyCredit(row, { cfg }) } : row);
}

test('the take-home breakdown restates the figure Plan reads and itemises its months and kinds', () => {
  for (const name of ['cardAndBank', 'bankOnly']) {
    const rows = personaRows(name);
    const model = buildIncomeModel({ bankRows: rows, cfg, asOf: AS_OF });
    const breakdown = takeHomeBreakdown(model, AS_OF);
    const plan = typicalIncome(bankFlowOverTime(rows).map((row) => ({ ...row, income: row.moneyIn })), AS_OF);
    assert.equal(breakdown.amount, plan.amount, name);
    assert.equal(breakdown.monthsUsed, plan.monthsUsed, name);
    assert.equal(breakdown.months.filter((item) => item.used).length, plan.monthsUsed, name);
    assert.ok(breakdown.months.length === plan.monthsSeen, name);
    assert.ok(breakdown.months.every((item) => item.month < AS_OF.slice(0, 7)), name);
    assert.ok(breakdown.classes.length > 0, name);
    assert.ok(breakdown.classes.every((item) => item.amount > 0), name);
    const wrong = { ...breakdown, amount: breakdown.amount + 0.01 };
    assert.throws(() => assert.equal(wrong.amount, plan.amount));
  }
  const set = takeHomeBreakdown({ monthlyMoneyIn: [{ month: '2026-01', amount: 100 }, { month: '2026-02', amount: 100 }, { month: '2026-03', amount: 900 }, { month: '2026-04', amount: 100 }], monthlyByClass: { '2026-01': { income: 100 }, '2026-02': { income: 100 }, '2026-03': { income: 100, earned: 800 }, '2026-04': { income: 100 } } }, '2026-05-10');
  assert.deepEqual(set.months.map((item) => [item.month, item.used]), [['2026-01', true], ['2026-02', true], ['2026-03', false], ['2026-04', true]]);
  assert.deepEqual(set.classes.map((item) => [item.incomeClass, item.amount]), [['earned', 800], ['income', 100]]);
  assert.equal(set.amount, 100);
});

test('the sentence on Plan and on Activity is one string', () => {
  const income = { amount: 260000, monthsUsed: 8 };
  const sentence = takeHomeSentence(income, prose);
  assert.equal(`${sentence.lead} ${sentence.amount}${sentence.rest}`, 'Take-home $260k - the middle of 8 complete months, not the month on screen.');
  const plan = { income: { ...income, monthsSeen: 8 }, groups: [], workings: {}, setAside: {}, unusual: { is: false }, foreignSetAside: [], unaccounted: 0 };
  assert.equal(buildPlanModel(plan, cfg).income.basis, '8 complete months');
  assert.equal(takeHomeSentence({ amount: 1, monthsUsed: 1 }, prose).rest, ' - the middle of 1 complete month, not the month on screen.');
  assert.equal(takeHomeSentence({ amount: 1, monthsUsed: 0 }, prose).rest, ' - the middle of not enough complete months yet, not the month on screen.');
});

test('the Plan link appears only when the destination restates the identical figure', () => {
  const income = { amount: 260000, monthsUsed: 8 };
  const evidence = { amount: 260000, monthsUsed: 8 };
  assert.equal(takeHomeLinkable(income, evidence, true), true);
  for (const [label, args] of [
    ['a cent apart', [income, { ...evidence, amount: 260000.01 }, true]],
    ['a different month count', [income, { ...evidence, monthsUsed: 7 }, true]],
    ['no card to land on', [income, evidence, false]],
    ['no evidence', [income, null, true]],
    ['no plan figure', [null, evidence, true]],
  ]) assert.equal(takeHomeLinkable(...args), false, label);
});

test('the Activity restatement shows exact amounts only in its evidence rows and marks set-aside months', () => {
  const breakdown = { amount: 100, basis: 'repeating', monthsUsed: 3, monthsSeen: 4, months: [{ month: '2026-01', amount: 100, used: true }, { month: '2026-03', amount: 900, used: false }], classes: [{ incomeClass: 'earned', amount: 100 }, { incomeClass: 'mystery', amount: 5 }] };
  const model = takeHomeModel(breakdown, { sentence: takeHomeSentence(breakdown, prose), money, monthLabel: (month) => `m:${month}`, classLabels: cfg.incomeClassLabels });
  assert.equal(model.line, 'Take-home $100 - the middle of 3 complete months, not the month on screen.');
  assert.equal(model.rows[0].value, '$100.00');
  assert.deepEqual(model.months, [{ label: 'm:2026-01', value: '$100.00', muted: false }, { label: 'm:2026-03 · set aside as unusual', value: '$900.00', muted: true }]);
  assert.deepEqual(model.classes.map((item) => item.label), ['Earnings', 'Mystery']);
  assert.doesNotMatch(model.line, /\.\d\d/);
  assert.equal(takeHomeModel({ monthsUsed: 0, months: [], classes: [] }, { sentence: {}, money, monthLabel: String }), null);
});

test('Plan links its take-home to the Activity income card, which restates it and offers the way back', async () => {
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
        await page.click('#ledger-tab-ahead');
        const why = page.locator('.dh-why').first();
        await why.locator('.pfa-inline-disclosure-trigger').first().click();
        const link = why.locator('button.linkbtn');
        assert.equal(await link.count(), 1, persona);
        const sentence = (await why.locator('p').first().innerText()).trim();
        assert.match(sentence, /^Take-home \$\d+k - the middle of \d+ complete months, not the month on screen\.$/, persona);
        await link.click();
        const block = page.locator('#activity-income-take-home');
        await block.waitFor({ state: 'visible', timeout: 10000 });
        assert.equal((await block.locator('p').first().innerText()).trim(), sentence, persona);
        assert.equal(await page.locator('#go-back').isVisible(), true, persona);
        assert.match(await page.locator('#go-back').innerText(), /Back to Plan/, persona);
        await block.getByText('Months and kinds behind it').click();
        assert.match(await block.innerText(), /Complete months/, persona);
        await page.locator('#go-back').click();
        await page.locator('.dh-why').first().waitFor({ state: 'attached', timeout: 10000 });
        assert.equal(await page.evaluate(() => globalThis.document.querySelector('[id^="ledger-tab-"][aria-selected="true"]')?.id), 'ledger-tab-ahead', persona);
      }
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});

test('arriving from Plan, the take-home sentence leads the card and stays clear of the Back to Plan button', async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const rect = (box) => ({ left: Math.round(box.left), top: Math.round(box.top), right: Math.round(box.right), bottom: Math.round(box.bottom) });
  const meets = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  try {
    const origin = await waitForServer(server);
    for (const [width, height] of [[375, 844], [375, 812], [390, 844], [390, 812]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto(origin, { waitUntil: 'networkidle' });
        await loadPersona(page, 'cardAndBank');
        await page.click('#ledger-tab-ahead');
        const why = page.locator('.dh-why').first();
        await why.locator('.pfa-inline-disclosure-trigger').first().click();
        await why.locator('button.linkbtn').click();
        const block = page.locator('#activity-income-take-home');
        await block.waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('#go-back').waitFor({ state: 'visible', timeout: 10000 });
        let settled = -1;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const now = await page.evaluate(() => Math.round(globalThis.scrollY));
          if (now === settled) break;
          settled = now;
          await page.waitForTimeout(150);
        }
        const found = await page.evaluate(() => {
          const { document } = globalThis;
          const box = (element) => element.getBoundingClientRect();
          return {
            sentence: box(document.querySelector('#activity-income-take-home p')),
            button: box(document.querySelector('#go-back')),
            chart: box(document.querySelector('#activity-income .pfa-react-root')),
            evidence: box(document.querySelector('#activity-income-take-home .pfa-inline-disclosure-trigger')),
          };
        });
        const sentence = rect(found.sentence);
        const button = rect(found.button);
        console.log(`take-home arrival ${width}x${height}: sentence ${JSON.stringify(sentence)}, Back to Plan ${JSON.stringify(button)}`);
        assert.equal(meets(sentence, button), false, `${width}x${height} the Back to Plan button covers the take-home sentence`);
        assert.ok(found.sentence.bottom <= found.evidence.top + 1 && found.evidence.bottom <= found.chart.top + 1, `${width}x${height} sentence, then its evidence, then the chart`);
        assert.ok(found.sentence.top >= 0 && found.sentence.bottom <= height, `${width}x${height} sentence is on screen on arrival`);
        if (width === 390 && height === 844) {
          const evidence = block.locator('.pfa-inline-disclosure-trigger');
          await evidence.focus();
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => globalThis.document.activeElement.innerText.trim()), 'Amount', 'Tab leaves the evidence control for the chart controls');
          await page.keyboard.press('Shift+Tab');
          assert.equal(await page.evaluate(() => globalThis.document.activeElement.innerText.trim()), 'Months and kinds behind it', 'Shift+Tab from the chart controls returns to the evidence control');
        }
      } finally { await page.close(); }
    }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
