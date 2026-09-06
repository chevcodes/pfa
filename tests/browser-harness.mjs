import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function waitForServer(server) {
  const lines = [];
  let buffer = '';
  const found = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The local server did not start.')), 10000);
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', (chunk) => {
      buffer += chunk;
      const split = buffer.split(/\r?\n/);
      buffer = split.pop() || '';
      for (const line of split) {
        lines.push(line);
        const match = /Serving the app at (http:\/\/localhost:\d+)/.exec(line);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      }
    });
    server.stderr.on('data', (chunk) => {
      lines.push(String(chunk));
    });
    server.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`The local server exited with code ${code}: ${lines.join('\n')}`));
    });
  });
  return found;
}

export async function closeServer(server) {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(3000),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}

export async function openBrowser() {
  try {
    const { chromium } = await import('playwright-core');
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch (error) {
    if (process.env.PFA_REQUIRE_BROWSER === '1') throw error;
    console.log('SKIPPED: no browser');
    return null;
  }
}

export async function loadPersona(page, name, { dismissGreeting: shouldDismissGreeting = true } = {}) {
  await page.waitForFunction(() => globalThis.window.PFAMock && globalThis.window.PFAMock.personas);
  const navigation = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 });
  await page.evaluate((persona) => globalThis.window.PFAMock.loadPersona(persona), name).catch((error) => {
    if (!/Execution context was destroyed|navigation/i.test(error.message)) throw error;
  });
  await navigation;
  await page.waitForFunction(() => globalThis.document.querySelector('#ledger-tab-overview'));
  if (!shouldDismissGreeting) return;
  const dismissGreeting = page.locator('#greeting .greeting-dismiss').first();
  await dismissGreeting.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
  if (await dismissGreeting.count()) {
    await dismissGreeting.click();
    await page.locator('#greeting').waitFor({ state: 'detached' });
  }
}

export async function setClosed(page) {
  await page.evaluate(() => {
    for (const disclosure of globalThis.document.querySelectorAll('details.card-disclosure[open]')) {
      disclosure.open = false;
    }
  });
  for (let round = 0; round < 100; round++) {
    const trigger = page.locator('.pfa-card-disclosure-trigger[aria-expanded="true"]:not([aria-disabled="true"])').first();
    if (!(await trigger.count())) return;
    await trigger.click();
  }
  throw new Error('Closing React disclosures did not stabilize.');
}

export async function setOpen(page) {
  for (let round = 0; round < 100; round++) {
    await page.evaluate(() => {
      for (const disclosure of globalThis.document.querySelectorAll('details.card-disclosure:not([open])')) {
        disclosure.open = true;
      }
    });
    const trigger = page.locator('.pfa-card-disclosure-trigger[aria-expanded="false"]').first();
    if (!(await trigger.count())) {
      const remaining = await page.locator('details.card-disclosure:not([open])').count();
      if (!remaining) return;
      continue;
    }
    await trigger.click();
  }
  throw new Error('Opening disclosures did not stabilize.');
}

export async function waitForVisualSettle(page) {
  const chart = page.locator('.recharts-wrapper').first();
  if (await chart.isVisible().catch(() => false)) await page.waitForTimeout(700);
  await page.evaluate(() => globalThis.document.fonts.ready);
}

export async function syncDockClearance(page) {
  await page.evaluate(() => {
    const dock = globalThis.document.querySelector('.ledger-switch');
    const isDocked = dock && !dock.hidden && globalThis.getComputedStyle(dock).position === 'fixed';
    const height = isDocked ? dock.getBoundingClientRect().height : 0;
    globalThis.document.documentElement.style.setProperty('--dock-bottom', `${Math.round(height)}px`);
  });
}

export async function assertLiveDockClearance(page) {
  await page.waitForFunction(() => {
    const dock = globalThis.document.querySelector('.ledger-switch');
    if (!dock || dock.hidden) return false;
    const expected = Math.round(globalThis.getComputedStyle(dock).position === 'fixed' ? dock.getBoundingClientRect().height : 0);
    return globalThis.document.documentElement.style.getPropertyValue('--dock-bottom') === `${expected}px`;
  }, null, { timeout: 1500 });
}

async function pdfFiles(folder) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await pdfFiles(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) files.push(path);
  }
  return files.sort();
}

export async function importStatementFolder(browser, origin, folder) {
  const files = await pdfFiles(folder);
  if (!files.length) throw new Error('The local statements folder has no PDFs');
  const scratch = createServer((request, response) => {
    const match = /^\/(\d+)$/.exec(request.url || '');
    const file = match && files[Number(match[1])];
    if (!file) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': 'application/pdf', 'Access-Control-Allow-Origin': '*' });
    createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => scratch.listen(0, '127.0.0.1', resolve));
  const scratchOrigin = `http://127.0.0.1:${scratch.address().port}`;
  const page = await browser.newPage();
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForSelector('#add-input');
    for (let start = 0; start < files.length; start += 8) {
      const indexes = files.slice(start, start + 8).map((_, offset) => start + offset);
      await page.evaluate(async ({ indexes, scratchOrigin }) => {
        const transfer = new globalThis.DataTransfer();
        for (const index of indexes) {
          const response = await fetch(`${scratchOrigin}/${index}`);
          if (!response.ok) throw new Error(`Scratch statement ${index} failed to load`);
          transfer.items.add(new File([await response.blob()], `statement-${index}.pdf`, { type: 'application/pdf' }));
        }
        const input = globalThis.document.querySelector('#add-input');
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, { indexes, scratchOrigin });
      await page.waitForFunction(() => globalThis.document.querySelector('#add-input').value === '', null, { timeout: 120000 });
    }
    const imported = await page.evaluate(async () => {
      const { Store } = await import('/application/core/storage.js');
      return {
        records: await Store.allBankTransactions(),
        cardRecords: await Store.allTransactions(),
        cardStatements: await Store.allCardStatements(),
        investmentStatements: await Store.investmentStatements.all(),
      };
    });
    return { fileCount: files.length, ...imported };
  } finally {
    await page.close();
    await new Promise((resolve) => scratch.close(resolve));
  }
}
