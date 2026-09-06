import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { closeServer, loadPersona, openBrowser, waitForServer } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function withApp(run, viewport = { width: 1280, height: 900 }) {
  const browser = await openBrowser();
  if (!browser) return;
  let server;
  try {
    server = spawn(process.execPath, [join(ROOT, 'developer-tools', 'serve.js')], { cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const origin = await waitForServer(server);
    const page = await browser.newPage({ viewport });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await loadPersona(page, 'cardAndBank');
      await run(page);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
    await closeServer(server);
  }
}

const openCards = (page) => page.evaluate(() => [...globalThis.document.querySelectorAll('.card-collapsible[data-fold-all="true"]')].filter((card) => (card.querySelector('.pfa-card-disclosure') || card).dataset.open === 'true').map((card) => card.id || card.querySelector('h3')?.textContent).sort());

test('Open all survives leaving the Analysis tab and coming back', { timeout: 120000 }, async () => {
  await withApp(async (page) => {
    await page.locator('#ledger-tab-activity').click();
    await page.locator('#activity-tab-analysis').click();
    await page.locator('.fold-all-btn').first().waitFor();
    assert.equal((await openCards(page)).length, 0);
    await page.locator('.fold-all-btn').first().click();
    await page.waitForTimeout(400);
    const opened = await openCards(page);
    assert.ok(opened.length >= 4, `Open all opened ${opened.length} cards`);
    await page.locator('#activity-tab-transactions').click();
    await page.waitForTimeout(400);
    await page.locator('#activity-tab-analysis').click();
    await page.waitForTimeout(600);
    assert.deepEqual(await openCards(page), opened);
    await page.locator('#ledger-tab-position').click();
    await page.locator('#ledger-tab-activity').click();
    await page.waitForTimeout(600);
    assert.deepEqual(await openCards(page), opened, 'cards stay open after a trip to another tab');
  });
});

test('category chips only offer what the chosen account shows, and every chip filters', { timeout: 120000 }, async () => {
  await withApp(async (page) => {
    await page.locator('#ledger-tab-activity').click();
    await page.locator('#activity-tab-transactions').click();
    await page.getByRole('button', { name: /^Filters/ }).first().click();
    await page.locator('.tx-hint-cat').first().waitFor();
    const accounts = await page.evaluate(() => [...globalThis.document.querySelectorAll('button')].filter((b) => /^\d{3,4}\b/.test(b.innerText.trim())).map((b) => b.innerText.trim().split('\n')[0]));
    assert.ok(accounts.length >= 1, 'a bank account tile exists');
    await page.getByRole('button', { name: new RegExp(`^${accounts[0]}`) }).first().click();
    await page.waitForTimeout(500);
    const chips = await page.evaluate(() => [...globalThis.document.querySelectorAll('.tx-hint-cat')].map((b) => ({ text: b.textContent, disabled: b.disabled })));
    const enabled = chips.filter((chip) => !chip.disabled);
    assert.ok(enabled.length >= 2);
    for (let index = 0; index < chips.length; index++) {
      if (chips[index].disabled) continue;
      const chip = page.locator('.tx-hint-cat').nth(index);
      await chip.click();
      await page.waitForTimeout(650);
      assert.equal(await chip.getAttribute('aria-pressed'), 'true', `${chips[index].text} shows as chosen`);
      const rows = await page.locator('table tbody tr').count();
      assert.ok(rows > 0, `${chips[index].text} found no rows although the chip was offered`);
      const bar = await page.evaluate(() => [...globalThis.document.querySelectorAll('button')].filter((b) => /×/.test(b.textContent)).length);
      assert.ok(bar >= 2, `${chips[index].text} appears in the filter bar beside the account`);
      await chip.click();
      await page.waitForTimeout(650);
      assert.equal(await chip.getAttribute('aria-pressed'), 'false', `${chips[index].text} turns off on the second click`);
    }
    const own = page.locator('.tx-hint-cat', { hasText: /transfer/i }).first();
    if (await own.count()) {
      await own.click();
      await page.waitForTimeout(650);
      await page.getByRole('button', { name: 'Clear all' }).first().click();
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.tx-hint-cat[aria-pressed="true"]').count(), 0, 'Clear all turns every chip off');
    }
  });
});

test('a second hire purchase can be added without reopening the form', { timeout: 120000 }, async () => {
  await withApp(async (page) => {
    await page.locator('#ledger-tab-position').click();
    await page.getByRole('button', { name: /^Recorded assets and debts/ }).first().click();
    await page.getByRole('button', { name: /^Add an asset or debt/ }).first().click();
    const add = async (name, amount) => {
      await page.locator('.position-class-chips .tx-hint-cat', { hasText: /^Hire purchase/ }).click();
      await page.getByLabel(/Name of this hire purchase/).fill(name);
      await page.getByLabel('Amount', { exact: true }).fill(amount);
      await page.getByRole('button', { name: 'Add to position' }).click();
      await page.waitForTimeout(700);
    };
    await add('Lender A', '5000');
    assert.ok(await page.locator('.position-class-chips .tx-hint-cat', { hasText: 'Hire purchase · 1' }).isVisible(), 'the form stays open and shows the count');
    await add('Lender B', '7000');
    assert.ok(await page.locator('.position-class-chips .tx-hint-cat', { hasText: 'Hire purchase · 2' }).isVisible());
    const text = await page.locator('body').innerText();
    assert.ok(text.includes('Lender A') && text.includes('Lender B'));
  });
});

const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
const lum = ([r, g, b]) => [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('typed text is readable in every theme and system appearance', { timeout: 180000 }, async () => {
  await withApp(async (page) => {
    await page.locator('#ledger-tab-activity').click();
    await page.locator('#activity-tab-transactions').click();
    await page.locator('#tx-search').waitFor();
    const fields = await page.evaluate(() => {
      const host = globalThis.document.querySelector('#app');
      const make = (cls) => { const input = globalThis.document.createElement('input'); input.type = 'text'; input.value = 'Insurance'; input.className = cls; input.dataset.proofField = cls; host.append(input); };
      make('h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base dark:bg-input/30 name-field');
      make('picker-filter');
      return ['#tx-search'];
    });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const theme of ['light', 'dark', 'auto']) {
        await page.evaluate((value) => { globalThis.document.documentElement.dataset.theme = value; }, theme);
        await page.waitForTimeout(150);
        const readings = await page.evaluate((selectors) => {
          const effectiveBackground = (node) => {
            for (let el = node; el; el = el.parentElement) {
              const bg = globalThis.getComputedStyle(el).backgroundColor;
              if (!/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(bg)) return bg;
            }
            return 'rgb(255, 255, 255)';
          };
          return [...selectors, '[data-proof-field]'].flatMap((selector) => [...globalThis.document.querySelectorAll(selector)].map((node) => {
            const style = globalThis.getComputedStyle(node);
            return { selector: node.dataset.proofField || selector, color: style.color, fill: style.webkitTextFillColor, bg: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? effectiveBackground(node.parentElement) : style.backgroundColor };
          }));
        }, fields);
        assert.ok(readings.length >= 3);
        for (const reading of readings) {
          assert.ok(contrast(rgb(reading.color), rgb(reading.bg)) >= 4.5, `${reading.selector} in ${theme} theme on a ${scheme} system: ${reading.color} on ${reading.bg}`);
          assert.ok(contrast(rgb(reading.fill), rgb(reading.bg)) >= 4.5, `${reading.selector} fill colour in ${theme}/${scheme}: ${reading.fill} on ${reading.bg}`);
        }
      }
    }
  });
});
