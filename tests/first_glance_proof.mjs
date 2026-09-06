import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { closeServer, loadPersona, openBrowser, setOpen, waitForServer, waitForVisualSettle } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function measure(page, selector) {
  return page.locator(selector).first().evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function assertLegendTapTargets(page) {
  const rows = page.locator('#plan-header .pfa-proportion-legend-button');
  assert.equal(await rows.count(), 3);
  for (let index = 0; index < 3; index++) {
    const row = await rows.nth(index).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { label: node.getAttribute('aria-label'), width: rect.width, height: rect.height };
    });
    assert.ok(row.height >= 44, `Plan legend row ${index + 1} (${row.label}) is ${row.width}x${row.height}`);
  }
}

test('the first screen shows the answer and working controls stay reachable', { timeout: 120000 }, async () => {
  const browser = await openBrowser();
  if (!browser) return;
  let server;
  try {
    server = spawn(process.execPath, [join(ROOT, 'developer-tools', 'serve.js')], {
      cwd: ROOT,
      env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const origin = await waitForServer(server);
    for (const width of [375, 390, 640, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: width < 640 ? 844 : 900 }, hasTouch: width < 640, isMobile: width < 640 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(origin, { waitUntil: 'networkidle' });
      await loadPersona(page, 'cardAndBank', { dismissGreeting: false });
      await page.locator('#backup-banner.show').waitFor();
      await page.locator('#ledger-tab-overview').click();
      const banner = await measure(page, '#backup-banner');
      const question = await measure(page, '.dh-question');
      assert.equal(await page.locator('#backup-banner > span:not(.install-icon)').innerText(), 'Only on this device. Back up?');
      assert.deepEqual(await page.locator('#backup-banner > button').allTextContents(), ['Back up now', 'Not now']);
      if (width < 640) {
        assert.ok(banner.height <= 72, `backup banner is ${banner.height}px tall`);
        assert.ok(question.y <= 270, `Overview answer starts at ${question.y}px`);
        const actions = await page.locator('#backup-banner > button').evaluateAll((buttons) => buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { x: rect.x, y: rect.y, right: rect.right, width: rect.width };
        }));
        assert.ok(Math.abs(actions[0].y - actions[1].y) <= 0.5 && actions[0].right <= actions[1].x && actions.every((action) => action.width < banner.width / 2), 'backup actions stay inline without full-width buttons');
      }
      if (process.env.PFA_CAPTURE_UI === '1' && (width === 390 || width === 1280)) await page.screenshot({ path: `/private/tmp/pfa-final-${width}-overview.png` });
      assert.equal(await page.locator('#overview-cash-movement .pfa-card-disclosure-trigger').getAttribute('aria-expanded'), width < 640 ? 'false' : 'true');
      if (width < 640) await page.locator('#overview-cash-movement .pfa-card-disclosure-trigger').click();
      await waitForVisualSettle(page);
      const chart = await page.evaluate(() => {
        const panels = [...globalThis.document.querySelectorAll('#overview-cash-movement .chart-scroll')];
        return panels.map((panel) => {
          const bounds = panel.getBoundingClientRect();
          const labels = [...panel.querySelectorAll('.chart-months > span')].filter((label) => globalThis.getComputedStyle(label).visibility !== 'hidden').map((label) => ({ left: label.getBoundingClientRect().left, right: label.getBoundingClientRect().right, size: parseFloat(globalThis.getComputedStyle(label).fontSize) }));
          return { left: bounds.left, right: bounds.right, labels };
        });
      });
      assert.equal(chart.length, 2);
      for (const panel of chart) for (const label of panel.labels) {
        assert.ok(label.left >= panel.left - 0.5 && label.right <= panel.right + 0.5, 'visible month label is fully inside its chart');
        assert.ok(label.size >= 12);
      }
      if (process.env.PFA_CAPTURE_UI === '1' && (width === 390 || width === 1280)) await page.screenshot({ path: `/private/tmp/pfa-final-${width}-cash-movement-open.png` });
      await page.locator('#backup-banner').getByRole('button', { name: 'Not now' }).click();
      await page.locator('#backup-banner').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Undo' }).click();
      await page.locator('#backup-banner').waitFor({ state: 'visible' });
      await page.locator('#backup-banner').getByRole('button', { name: 'Not now' }).click();
      await page.locator('#backup-banner').waitFor({ state: 'hidden' });
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#backup-banner').isVisible(), false);
      await page.locator('#ledger-tab-activity').click();
      assert.equal(await page.locator('#backup-banner').isVisible(), false);
      assert.match(await page.locator('#activity-header-secondary').innerText(), /Categorised purchases, net of refunds/);
      await waitForVisualSettle(page);
      const donutLabel = page.locator('#activity-header .donut-centre-label');
      if (await donutLabel.count()) assert.ok(await donutLabel.evaluate((node) => parseFloat(globalThis.getComputedStyle(node).fontSize) >= 12));
      if (process.env.PFA_CAPTURE_UI === '1' && (width === 390 || width === 1280)) await page.screenshot({ path: `/private/tmp/pfa-final-${width}-activity.png` });
      if (width === 1280) {
        await page.mouse.move(1200, 450);
        const inactiveTab = await page.locator('#ledger-tab-overview').evaluate((node) => globalThis.getComputedStyle(node).backgroundColor);
        assert.match(inactiveTab, /rgba?\(0, 0, 0, 0\)|transparent/);
      }
      await page.locator('#activity-tab-transactions').click();
      const firstRow = await measure(page, '.tx-row');
      const filters = await measure(page, '#transaction-filters');
      if (process.env.PFA_CAPTURE_UI === '1' && (width === 390 || width === 1280)) await page.screenshot({ path: `/private/tmp/pfa-final-${width}-transactions.png` });
      if (width < 640) assert.ok(firstRow.y <= 640, `first transaction starts at ${firstRow.y}px`);
      assert.equal(await page.locator('.tx-row .cat-edit-cue').count(), 0);
      await page.locator('#transaction-filters .pfa-card-disclosure-trigger').click();
      assert.ok(await page.locator('#transaction-filters .acct-chip').count() > 0);
      assert.ok(await page.locator('#transaction-filters .tx-hint-cat').count() > 0);
      await page.locator('#transaction-filters .tx-hint-cat').first().click();
      await page.locator('#transaction-filters .pfa-card-disclosure-trigger').click();
      assert.doesNotMatch(await page.locator('#transaction-filters .card-disclosure-note').innerText(), /All \d+ categories/);
      if (width < 640) assert.ok((await measure(page, '.tx-row .cat-tag-btn')).height >= 44);
      await page.locator('.tx-row .cat-tag-btn').first().click();
      if (process.env.PFA_CAPTURE_UI === '1' && (width === 390 || width === 1280)) await page.screenshot({ path: `/private/tmp/pfa-final-${width}-category-dialog.png` });
      assert.equal(await page.locator('.picker-item.is-selected').count(), 0);
      assert.equal(await page.locator('.picker-actions .btn.primary').isDisabled(), true);
      const currentBackground = await page.locator('.picker-item.current').first().evaluate((node) => globalThis.getComputedStyle(node).backgroundColor);
      const unselectedBackground = await page.locator('.picker-item:not(.current)').first().evaluate((node) => globalThis.getComputedStyle(node).backgroundColor);
      assert.equal(currentBackground, unselectedBackground, 'current category has no selected fill');
      await page.locator('.picker-item:not(.current)').first().click();
      assert.equal(await page.locator('.picker-item.is-selected').count(), 1);
      const selectedBackground = await page.locator('.picker-item.is-selected').evaluate((node) => globalThis.getComputedStyle(node).backgroundColor);
      assert.notEqual(currentBackground, selectedBackground);
      await page.locator('.picker-actions').getByRole('button', { name: 'Cancel' }).click();
      await page.evaluate(() => globalThis.window.scrollTo(0, globalThis.document.body.scrollHeight));
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#to-top').isVisible(), false);
      await page.evaluate(() => globalThis.window.scrollTo(0, Math.max(0, globalThis.window.scrollY - 160)));
      await page.waitForTimeout(100);
      const topOverlap = await page.evaluate(() => {
        const button = globalThis.document.querySelector('#to-top');
        if (!button || button.hidden) return false;
        const target = button.getBoundingClientRect();
        return [...globalThis.document.querySelectorAll('#acct-tx .tx-row')].some((row) => {
          const rect = row.getBoundingClientRect();
          return rect.left < target.right && rect.right > target.left && rect.top < target.bottom && rect.bottom > target.top;
        });
      });
      assert.equal(topOverlap, false);
      await page.locator('#ledger-tab-ahead').click();
      const plan = await measure(page, '#plan-header');
      await waitForVisualSettle(page);
      const drawnBands = await page.locator('#plan-header .pfa-proportion-cell').evaluateAll((cells) => cells.filter((cell) => cell.getBoundingClientRect().width > 0).length);
      assert.ok(drawnBands >= 3, `Plan draws ${drawnBands} allocation bands`);
      if (process.env.PFA_CAPTURE_UI === '1' && (width === 390 || width === 1280)) await page.screenshot({ path: `/private/tmp/pfa-final-${width}-plan.png` });
      assert.equal(await page.locator('#backup-banner').isVisible(), false);
      assert.equal(await page.locator('#plan-header .dh-question').innerText(), 'What’s free in a normal month?');
      assert.equal(await page.locator('#plan-header .plan-save-tag:not([hidden])').count(), 0);
      assert.ok(await page.locator('#plan-header .dh-status > :not([hidden]), #plan-header .dh-note').count() <= 2);
      if (width < 640) {
        for (const selector of ['#greeting .greeting-dismiss', '#plan-header .fold-all-btn', '#plan-header .pfa-inline-disclosure-trigger']) {
          if (!(await page.locator(selector).count())) continue;
          const target = await measure(page, selector);
          assert.ok(target.height >= 44 && (selector.includes('greeting-dismiss') ? target.width >= 44 : true), `${selector} is ${target.width}x${target.height}`);
        }
        await assertLegendTapTargets(page);
        if (width === 390) {
          const mutation = await page.addStyleTag({ content: '#plan-header .pfa-proportion-legend-button { min-height: 0 !important; padding-block: 0 !important; margin-block: 0 !important; }' });
          await assert.rejects(assertLegendTapTargets(page), /Plan legend row 1/);
          await mutation.evaluate((node) => node.remove());
          await assertLegendTapTargets(page);
          console.log('Plan legend tap-target mutation: assertion failed, then passed after removal.');
        }
      }
      await page.locator('#ledger-tab-position').click();
      assert.equal(await page.locator('#backup-banner').isVisible(), false);
      if (width === 390) {
        for (const tab of ['position', 'ahead', 'activity']) {
          await page.locator(`#ledger-tab-${tab}`).click();
          await setOpen(page);
          for (let round = 0; round < 100; round++) {
            const trigger = page.locator('.pfa-inline-disclosure-trigger[aria-expanded="false"]:visible').first();
            if (!(await trigger.count())) break;
            await trigger.click();
          }
          const depths = await page.evaluate(() => [...globalThis.document.querySelectorAll('.pfa-card-disclosure[data-open="true"], .pfa-inline-disclosure-item[data-state="open"], details[open]')].map((node) => {
            const path = [];
            for (let current = node; current; current = current.parentElement) {
              if (current.matches('.pfa-card-disclosure[data-open="true"], .pfa-inline-disclosure-item[data-state="open"], details[open]')) path.unshift(current.querySelector('.pfa-card-disclosure-trigger, .pfa-inline-disclosure-trigger, summary')?.textContent.trim().slice(0, 35) || current.id || current.className);
            }
            return { path, inSettings: !!node.closest('#data-settings') };
          }).sort((left, right) => right.path.length - left.path.length));
          const screenDepth = depths.find((entry) => !entry.inSettings)?.path || [];
          const settingsDepth = depths.find((entry) => entry.inSettings)?.path || [];
          assert.ok(screenDepth.length <= (tab === 'ahead' ? 3 : 2), `${tab} disclosure path is ${screenDepth.length} deep`);
          assert.ok(settingsDepth.length <= 4, `Data & settings disclosure path is ${settingsDepth.length} deep`);
          console.log(`${tab} screen disclosure depth: ${screenDepth.length}; ${JSON.stringify(screenDepth)}; settings depth: ${settingsDepth.length}; ${JSON.stringify(settingsDepth)}`);
        }
        await page.locator('#ledger-tab-position').click();
      }
      await page.locator('#export-btn').click();
      const wraps = await page.locator('#export-menu .menu-item').evaluateAll((items) => items.filter((item) => {
        const text = item.querySelector('span:last-of-type');
        return text && text.getBoundingClientRect().height > parseFloat(globalThis.getComputedStyle(text).fontSize) * 1.6;
      }).length);
      assert.equal(wraps, 0, `${wraps} export menu items wrap at ${width}px`);
      await page.locator('#export-btn').press('Escape');
      assert.equal(await page.locator('#export-menu').isVisible(), false);
      console.log(`First glance ${width}px: banner x=${banner.x.toFixed(1)} width=${banner.width.toFixed(1)} height=${banner.height.toFixed(1)}; answer y=${question.y.toFixed(1)}; Filters x=${filters.x.toFixed(1)} width=${filters.width.toFixed(1)}; transaction x=${firstRow.x.toFixed(1)} width=${firstRow.width.toFixed(1)} y=${firstRow.y.toFixed(1)}; Plan x=${plan.x.toFixed(1)} width=${plan.width.toFixed(1)}`);
      await page.close();
    }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
