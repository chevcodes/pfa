import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { waitForServer, closeServer, openBrowser, loadPersona } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WIDTHS = [375, 390, 640, 1280];
const TOLERANCE = 1;

const edges = (page, cardQuery, rowQuery) => page.evaluate(({ cardSelector, rowSelector, tolerance }) => {
  const { document, getComputedStyle, innerWidth } = globalThis;
  const card = document.querySelector(cardSelector);
  const cardRect = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  const pad = parseFloat(style.getPropertyValue('--card-pad-x')) || 0;
  const border = parseFloat(style.borderLeftWidth) || 0;
  const content = { left: cardRect.left + border + pad, right: cardRect.right - border - pad };
  const visible = (element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; };
  const overflow = [...card.querySelectorAll('*')].filter((element) => visible(element) && !element.closest('.hscroll') &&
    element.getBoundingClientRect().right > cardRect.right + tolerance).map((element) => String(element.className || element.tagName));
  const rows = [...card.querySelectorAll(rowSelector)].filter(visible).map((row) => {
    const first = row.firstElementChild.getBoundingClientRect();
    const last = row.lastElementChild.getBoundingClientRect();
    return { left: Math.round(first.left * 10) / 10, right: Math.round(last.right * 10) / 10, width: Math.round(row.getBoundingClientRect().width * 10) / 10 };
  });
  return { documentOverflow: document.documentElement.scrollWidth > innerWidth + tolerance, overflow, content, rows, cardWidth: cardRect.width };
}, { cardSelector: cardQuery, rowSelector: rowQuery, tolerance: TOLERANCE });

async function openIncomeCard(page) {
  await page.click('#ledger-tab-activity');
  const card = page.locator('#activity-income');
  await card.locator('.pfa-card-disclosure-trigger').first().click();
  await card.getByText('Money in by source').click();
  await card.locator('[data-name^="activity-income-source-"] .pfa-inline-disclosure-trigger').first().click();
  await card.getByText('Months and kinds behind it').click();
  await page.waitForTimeout(500);
}

test('the income card content holds its edges at 375, 390, 640 and 1280px with every disclosure open', async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.goto(origin, { waitUntil: 'networkidle' });
        await loadPersona(page, 'cardAndBank');
        await openIncomeCard(page);
        const measured = await edges(page, '#activity-income', '.plan-working');
        assert.equal(measured.documentOverflow, false, `${width}px document overflow`);
        assert.deepEqual(measured.overflow, [], `${width}px children beyond the card`);
        assert.ok(measured.rows.length >= 8, `${width}px rows measured`);
        for (const row of measured.rows) {
          assert.ok(Math.abs(row.right - measured.content.right) <= TOLERANCE, `${width}px value ends at the card inset: ${row.right} vs ${measured.content.right}`);
          assert.ok(row.left >= measured.content.left - TOLERANCE, `${width}px row starts inside the card inset: ${row.left} vs ${measured.content.left}`);
        }
        const lefts = [...new Set(measured.rows.map((row) => row.left))];
        console.log(`income card ${width}px: content x ${measured.content.left}-${measured.content.right}, ${measured.rows.length} rows, row left edges ${lefts.join(', ')}`);
      } finally { await page.close(); }
    }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});

test('the Overview suggestion holds its edges at every width and its actions work from the keyboard', async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
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
        const item = page.locator('.attn-item', { hasText: 'These repeat' });
        await item.waitFor({ state: 'visible', timeout: 10000 });
        const card = await item.evaluate((element) => { const owner = element.closest('.card'); owner.id = owner.id || 'attention-card-under-test'; return owner.id; });
        const measured = await edges(page, `#${card}`, '.attn-item');
        assert.equal(measured.documentOverflow, false, `${width}px document overflow`);
        assert.deepEqual(measured.overflow, [], `${width}px children beyond the card`);
        const buttons = await item.locator('button').evaluateAll((nodes) => nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { text: node.innerText.trim(), left: Math.round(rect.left * 10) / 10, right: Math.round(rect.right * 10) / 10, height: Math.round(rect.height * 10) / 10 };
        }));
        assert.deepEqual(buttons.map((button) => button.text), ['Dismiss', 'Label as salary']);
        assert.ok(buttons.every((button) => button.right <= measured.content.right + TOLERANCE && button.left >= measured.content.left - TOLERANCE), `${width}px actions inside the card inset`);
        console.log(`suggestion ${width}px: content x ${measured.content.left}-${measured.content.right}, actions ${buttons.map((button) => `${button.text} ${button.left}-${button.right}`).join(' | ')}`);
        if (width === 390) {
          await item.getByRole('button', { name: 'Dismiss' }).focus();
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => globalThis.document.activeElement.innerText.trim()), 'Label as salary');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(800);
          assert.equal(await page.locator('.attn-item', { hasText: 'These repeat' }).count(), 0);
          const rules = await page.evaluate(async () => { const { Store } = await import('/application/core/storage.js'); return (await Store.allRules()).map((rule) => [rule.match, rule.category]); });
          assert.deepEqual(rules, [['client retainer payment', 'Salary']]);
        }
      } finally { await page.close(); }
    }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});

test('the edge measurement rejects a deliberately misaligned income row', async () => {
  const browser = await openBrowser();
  if (!browser) return;
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await loadPersona(page, 'cardAndBank');
      await openIncomeCard(page);
      const misaligned = (measured) => measured.rows.some((row) => Math.abs(row.right - measured.content.right) > TOLERANCE || row.left < measured.content.left - TOLERANCE);
      assert.equal(misaligned(await edges(page, '#activity-income', '.plan-working')), false);
      await page.addStyleTag({ content: '#activity-income .plan-working { margin-right: 12px; margin-left: -6px; }' });
      assert.equal(misaligned(await edges(page, '#activity-income', '.plan-working')), true);
    } finally { await page.close(); }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
