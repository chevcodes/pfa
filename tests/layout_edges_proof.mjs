import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CONTRACTS, EXCEPTIONS } from './layout-contracts.mjs';
import { waitForServer, closeServer, openBrowser, loadPersona, setClosed, setOpen, waitForVisualSettle, syncDockClearance, assertLiveDockClearance } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VIEW_KEYS = ['overview', 'activity', 'ahead', 'position'];
const PERSONAS = [
  { name: 'cardAndBank', shape: 'data-rich' },
  { name: 'bankOnly', shape: 'sparse' },
];
const VIEWPORTS = [375, 639, 640, 1000, 1280];
const TOLERANCE = 0.5;

async function measure(page, viewportWidth, personaName, tabName, stateName) {
  return page.evaluate((measurement) => {
    const { viewport, persona, tab, state, tolerance, contracts, exceptions } = measurement;
    const { document, getComputedStyle, innerWidth, NodeFilter } = globalThis;
    const result = {
      viewport,
      persona,
      tab,
      state,
      contracts: {},
      exceptionsUsed: [],
      exceptionMatchCounts: {},
    };
    const styleProperties = [
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'gap', 'rowGap', 'columnGap', 'fontSize', 'width',
    ];
    const elementPath = (element) => {
      const parts = [];
      let current = element;
      while (current?.parentElement) {
        const tag = current.tagName.toLowerCase();
        const classes = [...current.classList].sort().map((name) => `.${name}`).join('');
        const siblings = [...current.parentElement.children].filter((sibling) => sibling.tagName === current.tagName);
        parts.unshift(`${tag}${classes}:nth-of-type(${siblings.indexOf(current) + 1})`);
        current = current.parentElement;
      }
      return parts.join('>');
    };
    result.computedStyles = [document.documentElement, document.body, ...document.body.querySelectorAll('*')].map((element) => {
      const style = getComputedStyle(element);
      return [elementPath(element), styleProperties.map((property) => style[property])];
    });
    const violations = [];
    const used = new Set();
    const exceptionMatches = new Map(
      exceptions.map((entry) => [entry, [...document.querySelectorAll(entry.selector)]])
    );
    for (const entry of exceptions) {
      result.exceptionMatchCounts[`${entry.contract}:${entry.selector}`] = exceptionMatches.get(entry)?.length || 0;
    }
    const matchesException = (contract, element) => {
      let matched = false;
      for (const entry of exceptions) {
        if (entry.contract !== contract) continue;
        const nodes = exceptionMatches.get(entry) || [];
        if (nodes.some((node) => node === element || node.contains(element) || element.contains(node))) {
          used.add(`${entry.contract}:${entry.selector}`);
          matched = true;
        }
      }
      return matched;
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    };
    const firstGlyph = (root) => {
      const icon = [...root.querySelectorAll('.card-title svg, .pfa-card-disclosure-icon svg')].find(visible);
      if (icon) return { element: icon, rect: icon.getBoundingClientRect() };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent || parent.closest('script,style,template,svg,[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
          return visible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const start = node.nodeValue.search(/\S/);
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + 1);
        const rect = range.getBoundingClientRect();
        if (rect.width || rect.height) return { element: node.parentElement, rect };
      }
      return null;
    };
    const cardInset = (card, glyph) => {
      const cardRect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      const border = parseFloat(style.borderLeftWidth) || 0;
      const expected = parseFloat(style.getPropertyValue('--card-pad-x'));
      return {
        actual: glyph.rect.left - cardRect.left - border,
        expected,
        card: card.className,
      };
    };
    const allCards = [...document.querySelectorAll('.card')].filter(visible);
    const insetRows = [];
    const titleIcons = [];
    const edgeViolations = [];
    const rightEdgeRows = [];
    const inlineIconRows = [];
    const iconSlotRows = [];
    const headGapRows = [];

    if (document.documentElement.scrollWidth > innerWidth + tolerance) {
      edgeViolations.push({ kind: 'document-overflow', actual: document.documentElement.scrollWidth, expected: innerWidth });
    }
    for (const card of allCards) {
      const cardRect = card.getBoundingClientRect();
      const glyph = firstGlyph(card);
      if (glyph && !matchesException('C2', glyph.element)) insetRows.push(cardInset(card, glyph));
      for (const icon of card.querySelectorAll('.card-title svg, .pfa-card-disclosure-trigger > .pfa-card-disclosure-icon svg')) {
        if (!visible(icon)) continue;
        titleIcons.push({ x: icon.getBoundingClientRect().left - cardRect.left, selector: card.className });
      }
      for (const element of card.querySelectorAll('*')) {
        if (!visible(element) || element.closest('.hscroll')) continue;
        const rect = element.getBoundingClientRect();
        if (rect.right > cardRect.right + tolerance && !matchesException('C1', element)) {
          edgeViolations.push({ kind: 'card-child-overflow', selector: element.className || element.tagName, right: rect.right, cardRight: cardRect.right });
        }
      }
      for (const element of card.querySelectorAll('.card-head > :last-child:not(.card-title)')) {
        if (!visible(element)) continue;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(card);
        const border = parseFloat(style.borderRightWidth) || 0;
        const inset = parseFloat(style.getPropertyValue('--card-pad-x'));
        rightEdgeRows.push({
          actual: cardRect.right - border - rect.right,
          expected: inset,
          selector: element.className || element.tagName,
        });
      }
      for (const icon of card.querySelectorAll('.card-title svg, .sec-subhead svg, .chart-info svg, .pfa-card-disclosure-icon svg')) {
        if (!visible(icon)) continue;
        const rect = icon.getBoundingClientRect();
        const expected = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--icon-inline'));
        inlineIconRows.push({
          actual: rect.width,
          expected,
          x: rect.left,
          icon: icon.getAttribute('class') || '',
          parent: icon.parentElement?.className || '',
          widthAttribute: icon.getAttribute('width'),
          computedWidth: getComputedStyle(icon).width,
        });
      }
      for (const control of card.querySelectorAll('.icon-slot-tap')) {
        const slotGlyph = control.querySelector('svg');
        const slot = control.parentElement;
        if (!slotGlyph || !slot || !visible(slotGlyph)) continue;
        iconSlotRows.push({
          actual: slotGlyph.getBoundingClientRect().left,
          expected: slot.getBoundingClientRect().left,
          card: card.className,
        });
      }
      for (const head of card.querySelectorAll(':scope > .card-head')) {
        const title = head.querySelector('.card-title');
        const body = head.nextElementSibling;
        if (!title || !body || !visible(title) || !visible(body)) continue;
        const titleRect = title.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const expected = parseFloat(getComputedStyle(head).marginBottom);
        headGapRows.push({ actual: bodyRect.top - titleRect.bottom, expected, title: title.textContent.trim() });
      }
    }

    const roundedSet = (rows, field) => [...new Set(rows.map((row) => Math.round(row[field] * 2) / 2))];
    const multiValue = roundedSet(insetRows, 'actual');
    const iconXs = roundedSet(titleIcons, 'x');
    result.contracts.C1 = { measurements: edgeViolations, violations: edgeViolations };
    result.contracts.C2 = {
      measurements: insetRows,
      values: multiValue,
      violations: insetRows.filter((row) => !Number.isFinite(row.expected) || Math.abs(row.actual - row.expected) > tolerance)
        .map((row) => ({ ...row, contract: 'token-mismatch' }))
        .concat(multiValue.length > 1 ? [{ contract: 'multiple-insets', values: multiValue }] : []),
    };
    result.contracts.C3 = {
      measurements: titleIcons,
      values: iconXs,
      violations: iconXs.length > 1 ? [{ contract: 'multiple-icon-columns', values: iconXs }] : [],
    };

    const disclosures = [...document.querySelectorAll('.card.card-collapsible')].filter(visible);
    const disclosureRows = [];
    for (let index = 0; index < disclosures.length; index++) {
      const card = disclosures[index];
      const native = card.querySelector(':scope > .card-disclosure > summary');
      const react = card.querySelector(':scope > .pfa-card-disclosure .pfa-card-disclosure-header');
      const summary = native || react;
      if (!summary || !visible(summary)) continue;
      const body = native
        ? card.querySelector(':scope > .card-disclosure > .disclosure-body')
        : card.querySelector(':scope > .pfa-card-disclosure .pfa-card-disclosure-content > .disclosure-body');
      if (!body) continue;
      const summaryStyle = getComputedStyle(summary);
      const bodyStyle = getComputedStyle(body);
      const summaryEdge = summary.getBoundingClientRect().left + (parseFloat(summaryStyle.paddingLeft) || 0);
      const bodyEdge = body.getBoundingClientRect().left + (parseFloat(bodyStyle.paddingLeft) || 0);
      disclosureRows.push({
        key: `${card.id || card.className}:${index}`,
        summaryEdge,
        bodyEdge,
        open: native ? native.parentElement.open : react.closest('.pfa-card-disclosure').dataset.open === 'true',
      });
    }
    result.contracts.C4 = {
      measurements: disclosureRows,
      violations: disclosureRows.filter((row) => Math.abs(row.summaryEdge - row.bodyEdge) > tolerance),
    };
    result.contracts.C5 = {
      measurements: rightEdgeRows,
      violations: rightEdgeRows.filter((row) => Math.abs(row.actual - row.expected) > tolerance),
    };
    result.contracts.C6 = {
      measurements: inlineIconRows.concat(iconSlotRows),
      violations: inlineIconRows.filter((row) => Math.abs(row.actual - row.expected) > tolerance)
        .map((row) => ({ contract: 'icon-width', ...row }))
        .concat(iconSlotRows.filter((row) => Math.abs(row.actual - row.expected) > tolerance)
          .map((row) => ({ contract: 'icon-slot-column', ...row }))),
    };
    result.contracts.C7 = {
      measurements: headGapRows,
      violations: headGapRows.filter((row) => Math.abs(row.actual - row.expected) > tolerance),
    };
    result.exceptionsUsed = [...used];
    for (const [contract, details] of Object.entries(result.contracts)) {
      for (const violation of details.violations) violations.push({ contract, ...violation });
    }
    result.violations = violations;
    result.contractNames = contracts;
    return result;
  }, {
    viewport: viewportWidth,
    persona: personaName,
    tab: tabName,
    state: stateName,
    tolerance: TOLERANCE,
    contracts: CONTRACTS,
    exceptions: EXCEPTIONS,
  });
}

test('rendered layout edges hold across mock personas, tabs, viewports and disclosure states', { timeout: 300000 }, async () => {
  const browser = await openBrowser();
  if (!browser) return;
  let server;
  const measurements = [];
  try {
    server = spawn(process.execPath, [join(ROOT, 'developer-tools', 'serve.js')], {
      cwd: ROOT,
      env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const origin = await waitForServer(server);
    const page = await browser.newPage({ viewport: { width: VIEWPORTS[0], height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.waitForFunction(() => globalThis.window.PFAMock && globalThis.window.PFAMock.personas);
    const personaNames = await page.evaluate(() => globalThis.window.PFAMock.personas);
    assert.ok(personaNames.includes('cardAndBank'));
    assert.ok(personaNames.includes('bankOnly'));
    const controller = await readFile(join(ROOT, 'application', 'app-controller.js'), 'utf8');
    const viewBlock = /const VIEW_LABELS = \{([^}]+)\}/.exec(controller)?.[1] || '';
    const viewKeys = [...viewBlock.matchAll(/^\s*([a-z]+):/gm)].map((match) => match[1]);
    assert.deepEqual(viewKeys, VIEW_KEYS);
    const exceptionsSeen = new Set();

    for (const persona of PERSONAS) {
      await loadPersona(page, persona.name);
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport, height: 900 });
        await assertLiveDockClearance(page);
        for (const tab of VIEW_KEYS) {
          await page.locator(`#ledger-tab-${tab}`).click();
          await page.waitForFunction((id) => globalThis.document.querySelector(`#ledger-tab-${id}`)?.getAttribute('aria-selected') === 'true', tab);
          await setClosed(page);
          await waitForVisualSettle(page);
          await syncDockClearance(page);
          measurements.push(await measure(page, viewport, persona.name, tab, 'closed'));
          measurements.at(-1).styleSnapshotHash = createHash('sha256')
            .update(JSON.stringify(measurements.at(-1).computedStyles)).digest('hex');
          for (const exception of measurements.at(-1).exceptionsUsed) exceptionsSeen.add(exception);
          await setOpen(page);
          await waitForVisualSettle(page);
          await syncDockClearance(page);
          measurements.push(await measure(page, viewport, persona.name, tab, 'open'));
          measurements.at(-1).styleSnapshotHash = createHash('sha256')
            .update(JSON.stringify(measurements.at(-1).computedStyles)).digest('hex');
          for (const exception of measurements.at(-1).exceptionsUsed) exceptionsSeen.add(exception);
        }
      }
    }

    const expectedExceptions = EXCEPTIONS.map((entry) => `${entry.contract}:${entry.selector}`);
    const globalViolations = [];
    for (const viewport of VIEWPORTS) {
      const cells = measurements.filter((entry) => entry.viewport === viewport);
      const insetRows = cells.flatMap((entry) => entry.contracts.C2.measurements);
      const insetValues = [...new Set(insetRows.map((row) => Math.round(row.actual * 2) / 2))];
      if (insetValues.length > 1) globalViolations.push({ contract: 'C2', viewport, values: insetValues });
      const titleIconRows = cells.flatMap((entry) => entry.contracts.C3.measurements);
      const titleIconValues = [...new Set(titleIconRows.map((row) => Math.round(row.x * 2) / 2))];
      if (titleIconValues.length > 1) globalViolations.push({ contract: 'C3', viewport, values: titleIconValues });
      const disclosureGroups = new Map();
      for (const entry of cells) {
        for (const row of entry.contracts.C4.measurements) {
          const key = `${entry.persona}:${entry.tab}:${row.key}`;
          const group = disclosureGroups.get(key) || {};
          group[entry.state] = row;
          disclosureGroups.set(key, group);
        }
      }
      for (const group of disclosureGroups.values()) {
        if (group.closed && group.open && Math.abs(group.closed.summaryEdge - group.open.summaryEdge) > TOLERANCE) {
          globalViolations.push({
            contract: 'C4',
            viewport,
            closed: group.closed.summaryEdge,
            open: group.open.summaryEdge,
          });
        }
      }
    }
    const fullFailures = measurements.flatMap((entry) => entry.violations.map((violation) => ({
      persona: entry.persona,
      tab: entry.tab,
      viewport: entry.viewport,
      state: entry.state,
      ...violation,
    }))).concat(globalViolations);
    const snapshotHashes = Object.fromEntries(measurements.map((entry) => [
      `${entry.persona}:${entry.tab}:${entry.viewport}:${entry.state}`,
      entry.styleSnapshotHash,
    ]));
    const snapshotDetails = Object.fromEntries(measurements.map((entry) => [
      `${entry.persona}:${entry.tab}:${entry.viewport}:${entry.state}`,
      entry.computedStyles,
    ]));
    const expectedSnapshotPath = process.env.PFA_LAYOUT_EXPECT_SNAPSHOT;
    if (expectedSnapshotPath) {
      const expectedSnapshot = JSON.parse(await readFile(expectedSnapshotPath, 'utf8'));
      const changedCells = Object.keys({ ...expectedSnapshot.hashes, ...snapshotHashes })
        .filter((key) => expectedSnapshot.hashes[key] !== snapshotHashes[key]);
      if (changedCells.length) {
        globalViolations.push(...changedCells.map((key) => ({
          contract: 'computed-style-snapshot',
          cell: key,
          expected: expectedSnapshot.hashes[key] || null,
          actual: snapshotHashes[key] || null,
        })));
        fullFailures.push(...globalViolations.filter((entry) => entry.contract === 'computed-style-snapshot'));
        const snapshotDiff = {};
        for (const key of changedCells) {
          const expectedRows = expectedSnapshot.details?.[key];
          const actualRows = snapshotDetails[key];
          if (!expectedRows || !actualRows) continue;
          const oldRows = new Map(expectedRows.map((row) => [row[0], row[1]]));
          const newRows = new Map(actualRows.map((row) => [row[0], row[1]]));
          snapshotDiff[key] = {
            added: actualRows.filter((row) => !oldRows.has(row[0])),
            removed: expectedRows.filter((row) => !newRows.has(row[0])),
            changed: actualRows.filter((row) => oldRows.has(row[0]) && JSON.stringify(oldRows.get(row[0])) !== JSON.stringify(row[1]))
              .map((row) => ({ path: row[0], before: oldRows.get(row[0]), after: row[1] })),
          };
          console.log(`Computed-style differences for ${key}: ${JSON.stringify(Object.fromEntries(Object.entries(snapshotDiff[key]).map(([name, rows]) => [name, rows.length])))}`);
        }
        if (process.env.PFA_LAYOUT_DIFF_PATH) {
          await writeFile(process.env.PFA_LAYOUT_DIFF_PATH, `${JSON.stringify(snapshotDiff, null, 2)}\n`);
        }
      }
      console.log(`Computed-style snapshot: ${changedCells.length} changed cells out of ${Object.keys(snapshotHashes).length}`);
    }
    if (process.env.PFA_LAYOUT_SNAPSHOT_PATH) {
      const snapshot = { hashes: snapshotHashes };
      if (process.env.PFA_LAYOUT_SNAPSHOT_DETAILS === '1') snapshot.details = snapshotDetails;
      await writeFile(process.env.PFA_LAYOUT_SNAPSHOT_PATH, `${JSON.stringify(snapshot)}\n`);
      console.log(`Computed-style snapshot written: ${process.env.PFA_LAYOUT_SNAPSHOT_PATH}`);
    }
    for (const entry of measurements) delete entry.computedStyles;
    const reportPath = process.env.PFA_LAYOUT_REPORT || join(tmpdir(), 'pfa-layout-edges-raw.json');
    await writeFile(reportPath, JSON.stringify({ contracts: CONTRACTS, measurements, globalViolations }, null, 2));
    console.log(`Layout measurements: ${reportPath}`);
    assert.deepEqual(
      expectedExceptions.filter((entry) => !exceptionsSeen.has(entry)),
      [],
      'Every registered layout exception must match a rendered element.'
    );

    await loadPersona(page, 'cardAndBank');
    await page.setViewportSize({ width: VIEWPORTS.at(-1), height: 900 });
    await page.locator('#ledger-tab-overview').click();
    await page.waitForFunction(() => globalThis.document.querySelector('#ledger-tab-overview')?.getAttribute('aria-selected') === 'true');
    await setOpen(page);
    const mark = async (contract) => page.evaluate((name) => {
      if (name === 'C5') {
        const host = [...globalThis.document.querySelectorAll('#app .card.card-collapsible')].find((node) => node.getBoundingClientRect().width > 0);
        if (host) {
          const head = globalThis.document.createElement('div');
          head.className = 'card-head';
          head.dataset.layoutSynthetic = 'C5';
          const title = globalThis.document.createElement('h3');
          title.className = 'card-title';
          title.textContent = 'Layout proof';
          const control = globalThis.document.createElement('button');
          control.className = 'btn sm ghost';
          control.textContent = 'Layout proof';
          head.append(title, control);
          host.append(head);
        }
      }
      const cardHeads = [...globalThis.document.querySelectorAll('#app .card-head')];
      const selectors = {
        C2: '#app .card:not(.pfa-mutation-target)',
        C3: '#app .card:has(.card-title svg, .pfa-card-disclosure-trigger > .pfa-card-disclosure-icon svg)',
        C4: '#app .card.card-collapsible',
        C5: '#app [data-layout-synthetic="C5"] > :last-child',
        C6: '#app .card-title svg',
      };
      const candidates = name === 'C7'
        ? cardHeads.filter((head) => head.querySelector('.card-title') && head.nextElementSibling)
        : [...globalThis.document.querySelectorAll(selectors[name] || '')];
      const visible = candidates.filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && globalThis.getComputedStyle(node).display !== 'none';
      });
      const target = visible[name === 'C3' ? 1 : 0];
      if (!target) return false;
      target.dataset.layoutMutation = name;
      if (name === 'C3') target.classList.add('pfa-mutation-target');
      return true;
    }, contract);
    const clearMark = async (contract) => page.evaluate((name) => {
      for (const target of globalThis.document.querySelectorAll(`[data-layout-synthetic="${name}"]`)) target.remove();
      for (const target of globalThis.document.querySelectorAll(`[data-layout-mutation="${name}"]`)) {
        delete target.dataset.layoutMutation;
        target.classList.remove('pfa-mutation-target');
      }
    }, contract);
    const runMutation = async (contract, tab, css) => {
      if (tab !== VIEW_KEYS[0]) {
        await page.locator(`#ledger-tab-${tab}`).click();
        await page.waitForFunction((id) => globalThis.document.querySelector(`#ledger-tab-${id}`)?.getAttribute('aria-selected') === 'true', tab);
        await setOpen(page);
      }
      assert.ok(await mark(contract), `The ${contract} mutation target must exist.`);
      const style = await page.addStyleTag({ content: css });
      const mutation = await measure(page, VIEWPORTS.at(-1), PERSONAS[0].name, tab, 'open');
      assert.ok(mutation.contracts[contract].violations.length > 0, `The ${contract} mutation must trigger its contract.`);
      console.log(`Mutation ${contract}: contract detected.`);
      await clearMark(contract);
      await style.evaluate((node) => node.remove());
    };
    await runMutation('C2', 'overview', '#app [data-layout-mutation="C2"]{padding-left:3px!important}');
    await runMutation('C3', 'overview', '#app [data-layout-mutation="C3"] .card-title, #app [data-layout-mutation="C3"] .pfa-card-disclosure-icon{margin-left:3px!important}');
    await runMutation('C6', 'overview', '#app [data-layout-mutation="C6"]{width:24px!important}');
    await runMutation('C7', 'overview', '#app [data-layout-mutation="C7"]{padding-bottom:3px!important}');
    await runMutation('C4', 'activity', '#app [data-layout-mutation="C4"] .disclosure-body{padding-left:4px!important}');
    await runMutation('C5', 'activity', '#app [data-layout-mutation="C5"]{transform:translateX(4px)!important}');
    const compactMutation = await page.evaluate(() => {
      const card = globalThis.document.createElement('section');
      card.className = 'card card-compact';
      card.dataset.layoutMutation = 'compact-regression';
      const title = globalThis.document.createElement('h3');
      title.className = 'card-title';
      title.textContent = 'Layout proof';
      card.append(title, globalThis.document.createElement('div'));
      globalThis.document.querySelector('#app').append(card);
      return true;
    });
    assert.ok(compactMutation, 'The compact card regression fixture must mount.');
    const compactStyle = await page.addStyleTag({ content: '#app [data-layout-mutation="compact-regression"]{padding:0!important}' });
    const compactResult = await measure(page, VIEWPORTS.at(-1), PERSONAS[0].name, 'activity', 'open');
    assert.ok(compactResult.contracts.C2.violations.some((violation) => violation.card?.includes('card-compact')), 'The .card-compact padding regression must trigger C2.');
    console.log('Regression .card-compact padding: C2 detected.');
    await page.locator('[data-layout-mutation="compact-regression"]').evaluate((node) => node.remove());
    await compactStyle.evaluate((node) => node.remove());
    await setOpen(page);
    const infoCenteringTarget = await page.evaluate(() => {
      const target = [...globalThis.document.querySelectorAll('#app .icon-slot-tap')].find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && globalThis.getComputedStyle(node).display !== 'none';
      });
      if (!target) return false;
      target.dataset.layoutMutation = 'info-centering';
      return true;
    });
    assert.ok(infoCenteringTarget, 'The info-centering mutation target must exist.');
    const infoCenteringStyle = await page.addStyleTag({ content: '#app [data-layout-mutation="info-centering"]{margin:0!important}' });
    const infoCenteringResult = await measure(page, VIEWPORTS.at(-1), PERSONAS[0].name, 'activity', 'open');
    assert.ok(infoCenteringResult.contracts.C6.violations.some((violation) => violation.contract === 'icon-slot-column'), 'The ⓘ centring regression must trigger C6.');
    console.log('Regression ⓘ centring: C6 detected.');
    await page.locator('[data-layout-mutation="info-centering"]').evaluate((node) => delete node.dataset.layoutMutation);
    await infoCenteringStyle.evaluate((node) => node.remove());
    await page.close();

    console.log(`Rendered layout cells: ${measurements.length}; violations: ${fullFailures.length}`);
    assert.equal(
      fullFailures.length,
      0,
      fullFailures.slice(0, 30).map((failure) => JSON.stringify(failure)).join('\n')
    );
  } finally {
    await closeServer(server);
    await browser.close();
  }
});

test('Plan goal actions preserve scroll, content, focus and disclosure state', { timeout: 300000 }, async () => {
  const browser = await openBrowser();
  if (!browser) return;
  let server;
  const failures = [];
  const measurements = [];
  const goalCardSelector = '#app .card-collapsible:has(.pfa-card-disclosure-trigger .card-title:text-is("Your goal"))';
  const monthlyCardSelector = '#plan-monthly-check-in';
  const goalCard = (page) => page.locator(goalCardSelector);
  const activeMatches = async (page, selector, text) => page.evaluate((target) => {
    const active = globalThis.document.activeElement;
    return !!active && (target.selector ? active.matches(target.selector) && (!target.text || active.innerText?.includes(target.text)) : active.innerText?.includes(target.text));
  }, { selector, text });
  const activeName = async (page) => page.evaluate(() => {
    const active = globalThis.document.activeElement;
    return active?.getAttribute('aria-label') || active?.innerText?.trim().replace(/\s+/g, ' ').slice(0, 70) || active?.id || 'body';
  });
  const waitStable = async (page) => page.evaluate(async () => {
    const layout = () => {
      const root = globalThis.document.querySelector('#app > .view-forecast, #app > .view-overview, #app > .activity-view, #app > .view-position') || globalThis.document.querySelector('#app')?.firstElementChild;
      return [globalThis.scrollY, globalThis.document.documentElement.scrollHeight, root?.scrollHeight, root?.getBoundingClientRect().height].join('|');
    };
    let prior = layout();
    let stable = 0;
    for (let attempt = 0; attempt < 120 && stable < 3; attempt++) {
      await new Promise(globalThis.requestAnimationFrame);
      const current = layout();
      stable = current === prior ? stable + 1 : 0;
      prior = current;
    }
  });
  const setDisclosure = async (trigger, open) => {
    const expanded = await trigger.getAttribute('aria-expanded');
    if ((expanded === 'true') !== open) await trigger.click();
  };
  const scrollToElement = async (page, locator) => {
    await locator.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const top = globalThis.scrollY + rect.top + rect.height / 2 - globalThis.innerHeight / 2;
      globalThis.scrollTo(0, Math.max(0, top));
    });
    await page.evaluate(() => new Promise(globalThis.requestAnimationFrame));
    return page.evaluate(() => globalThis.scrollY);
  };
  const scrollToGoal = async (page) => scrollToElement(page, goalCard(page));
  const cardStates = async (page) => page.evaluate(() => Object.fromEntries(
    [...globalThis.document.querySelectorAll('#app .card-collapsible')].map((card) => [
      card.querySelector('.card-title')?.textContent?.trim() || card.id,
      card.querySelector('.pfa-card-disclosure')?.getAttribute('data-open') === 'true',
    ])
  ));
  const readyVisible = async (page, selector) => page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
  const readyText = async (page, text) => page.getByText(text).first().waitFor({ state: 'visible', timeout: 5000 });
  const run = async (page, width, cardsOpen, name, perform, ready, focusSelector = '', focusText = '', preserveCards = true, centerTarget = null) => {
    const before = centerTarget ? await scrollToElement(page, centerTarget) : await scrollToGoal(page);
    await perform();
    await ready();
    await waitStable(page);
    const after = await page.evaluate(() => globalThis.scrollY);
    const focus = await activeName(page);
    const refreshed = true;
    const currentCards = await cardStates(page);
    const expectedCards = page.__goalCardStates;
    const cardsPreserved = !preserveCards || Object.entries(expectedCards).every(([title, open]) => (
      !(title in currentCards) || currentCards[title] === open
    ));
    const focusPreserved = !focusSelector && !focusText || await activeMatches(page, focusSelector, focusText);
    const maxScroll = await page.evaluate(() => Math.max(0, globalThis.document.documentElement.scrollHeight - globalThis.innerHeight));
    const row = { width, cards: cardsOpen ? 'open' : 'closed', interaction: name, before, after, maxScroll, content: refreshed, focus, cardsPreserved };
    measurements.push(row);
    if (process.env.PFA_GOAL_SCROLL_REPORT === '1') console.log('GOAL_SCROLL ' + JSON.stringify(row));
    if (Math.abs(after - before) > 1) failures.push(name + ' at ' + width + 'px (' + row.cards + ' cards): ' + before + ' -> ' + after);
    if (!cardsPreserved) failures.push(name + ' changed another Plan card open state at ' + width + 'px');
    if (!focusPreserved) failures.push(name + ' left focus on ' + focus + ' at ' + width + 'px');
  };

  try {
    server = spawn(process.execPath, [join(ROOT, 'developer-tools', 'serve.js')], {
      cwd: ROOT,
      env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const origin = await waitForServer(server);
    const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(() => globalThis.document.fonts.ready);
    for (const width of [375, 1280]) {
      for (const cardsOpen of [false, true]) {
        await loadPersona(page, 'cardAndBank');
        await page.setViewportSize({ width, height: 900 });
        await page.locator('#ledger-tab-ahead').click();
        await page.waitForFunction(() => globalThis.document.querySelector('#ledger-tab-ahead')?.getAttribute('aria-selected') === 'true');
        if (cardsOpen) await setOpen(page);
        else await setClosed(page);
        await setDisclosure(goalCard(page).locator('.pfa-card-disclosure-trigger').first(), true);
        page.__goalCardStates = await cardStates(page);
        const details = goalCard(page).locator('.goal-safety-explainer .pfa-inline-disclosure-trigger');
        const detailsOpen = await details.getAttribute('aria-expanded') === 'true';
        await run(page, width, cardsOpen, detailsOpen ? 'Close goal progress details' : 'Open goal progress details', async () => setDisclosure(details, !detailsOpen), async () => page.waitForFunction((open) => { const card = [...globalThis.document.querySelectorAll('#app .card-collapsible')].find((node) => node.querySelector('.card-title')?.textContent?.trim() === 'Your goal'); return card?.querySelector('.goal-safety-explainer .pfa-inline-disclosure-trigger')?.getAttribute('aria-expanded') === String(open); }, !detailsOpen), '.goal-safety-explainer .pfa-inline-disclosure-trigger', '', true, details);
        await setDisclosure(details, true);

        const monthlyTrigger = page.locator(monthlyCardSelector + ' .pfa-card-disclosure-trigger').first();
        if (await monthlyTrigger.count()) {
          const monthlyOpen = await monthlyTrigger.getAttribute('aria-expanded') === 'true';
          if (!monthlyOpen) {
            await run(page, width, cardsOpen, 'Open monthly check-in', async () => setDisclosure(monthlyTrigger, true), async () => readyVisible(page, '.monthly-check-in'), '', '', false, monthlyTrigger);
            page.__goalCardStates = await cardStates(page);
          }
          const monthlyEntry = page.locator('.monthly-check-in-entry .pfa-inline-disclosure-trigger').first();
          if (await monthlyEntry.count()) {
            if (await monthlyEntry.getAttribute('aria-expanded') === 'true') await monthlyEntry.click();
            await run(page, width, cardsOpen, 'Open monthly check-in entry', async () => monthlyEntry.click(), async () => readyVisible(page, '.monthly-check-in-entry .pfa-inline-disclosure-content'), '.monthly-check-in-entry .pfa-inline-disclosure-trigger', '', true, monthlyEntry);
            const entryOpen = await monthlyEntry.getAttribute('aria-expanded') === 'true';
            await run(page, width, cardsOpen, 'Open Manage goal with check-in detail open', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
            const entryStillOpen = await page.locator('.monthly-check-in-entry .pfa-inline-disclosure-trigger').first().getAttribute('aria-expanded').catch(() => 'false');
            if (entryOpen && entryStillOpen !== 'true') failures.push('Goal render closed the open monthly check-in entry at ' + width + 'px');
            await run(page, width, cardsOpen, 'Cancel from Manage', async () => page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first().click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout'), 'button', 'Manage goal', true, page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first());
          }
          await setDisclosure(monthlyTrigger, monthlyOpen);
          page.__goalCardStates = await cardStates(page);
        } else {
          await run(page, width, cardsOpen, 'Open Manage goal', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
          await run(page, width, cardsOpen, 'Cancel from Manage', async () => page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first().click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout'), 'button', 'Manage goal', true, page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first());
        }

        await run(page, width, cardsOpen, 'Open Manage goal', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await run(page, width, cardsOpen, 'Change goal type', async () => page.getByRole('button', { name: 'Change goal type' }).click(), async () => readyVisible(page, '.goal-form--manage .goal-choices'), '.goal-choice', '', true, page.getByRole('button', { name: 'Change goal type' }));
        await run(page, width, cardsOpen, 'Back to current', async () => page.getByRole('button', { name: 'Back to current goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Back to current goal' }));
        await run(page, width, cardsOpen, 'Open goal type choices', async () => page.getByRole('button', { name: 'Change goal type' }).click(), async () => readyVisible(page, '.goal-form--manage .goal-choices'), '.goal-choice', '', true, page.getByRole('button', { name: 'Change goal type' }));
        await run(page, width, cardsOpen, 'Choose goal type', async () => page.locator('.goal-choice').filter({ hasText: 'Clear the card' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.locator('.goal-choice').filter({ hasText: 'Clear the card' }));
        await run(page, width, cardsOpen, 'Cancel selected goal type', async () => page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first().click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout[aria-label="Emergency fund"]'), 'button', 'Manage goal', true, page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first());

        await run(page, width, cardsOpen, 'Open Manage goal to change type', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await run(page, width, cardsOpen, 'Open goal type choices to save', async () => page.getByRole('button', { name: 'Change goal type' }).click(), async () => readyVisible(page, '.goal-form--manage .goal-choices'), '.goal-choice', '', true, page.getByRole('button', { name: 'Change goal type' }));
        await run(page, width, cardsOpen, 'Choose goal type to save', async () => page.locator('.goal-choice').filter({ hasText: 'Clear the card' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.locator('.goal-choice').filter({ hasText: 'Clear the card' }));
        await page.locator('#goal-draft-input').fill('2030-12-31');
        await run(page, width, cardsOpen, 'Save changed goal type', async () => page.getByRole('button', { name: 'Save goal' }).click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout[aria-label="Clear the card"]'), 'button', 'Manage goal', true, page.getByRole('button', { name: 'Save goal' }));
        await run(page, width, cardsOpen, 'Open Manage goal to edit existing target', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await page.locator('#goal-draft-input').fill('2031-12-31');
        await run(page, width, cardsOpen, 'Save changed existing goal target', async () => page.getByRole('button', { name: 'Save goal' }).click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout[aria-label="Clear the card"]'), 'button', 'Manage goal', true, page.getByRole('button', { name: 'Save goal' }));
        await run(page, width, cardsOpen, 'Reopen saved goal target', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => {
          await readyVisible(page, goalCardSelector + ' #goal-draft-input');
          await page.waitForFunction(() => globalThis.document.querySelector('#goal-draft-input')?.value === '2031-12-31');
        }, '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await run(page, width, cardsOpen, 'Close saved goal editor', async () => page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first().click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout'), 'button', 'Manage goal', true, page.locator('.goal-form--manage button').filter({ hasText: /^Cancel$/ }).first());

        const setFloorButton = () => page.getByRole('button', { name: 'Set a safety floor' });
        const floorDetails = goalCard(page).locator('.goal-safety-explainer');
        await run(page, width, cardsOpen, 'Set safety floor', async () => setFloorButton().click(), async () => page.getByRole('spinbutton', { name: 'Safety floor amount' }).waitFor({ state: 'visible' }), 'input[aria-label="Safety floor amount"]', '', true, setFloorButton());
        await run(page, width, cardsOpen, 'Switch safety floor kind', async () => page.getByRole('button', { name: 'My fixed expenses plus a few days of spending' }).click(), async () => {
          await page.getByRole('spinbutton', { name: 'Safety floor cushion days' }).waitFor({ state: 'visible' });
          await page.waitForFunction(() => globalThis.document.querySelector('input[aria-label="Safety floor cushion days"]')?.value === '');
        }, 'input[aria-label="Safety floor cushion days"]', '', true, page.getByRole('button', { name: 'My fixed expenses plus a few days of spending' }));
        await run(page, width, cardsOpen, 'Cancel safety floor', async () => floorDetails.getByRole('button', { name: 'Cancel' }).click(), async () => readyVisible(page, goalCardSelector + ' .goal-safety-action button'), 'button', 'Set a safety floor', true, floorDetails.getByRole('button', { name: 'Cancel' }));
        await run(page, width, cardsOpen, 'Open safety floor to save', async () => setFloorButton().click(), async () => page.getByRole('spinbutton', { name: 'Safety floor amount' }).waitFor({ state: 'visible' }), 'input[aria-label="Safety floor amount"]', '', true, setFloorButton());
        await page.getByRole('spinbutton', { name: 'Safety floor amount' }).fill('25000');
        await run(page, width, cardsOpen, 'Save safety floor', async () => page.getByRole('button', { name: 'Save safety floor' }).click(), async () => readyText(page, 'Safety floor: keep at least'), 'button', 'Change safety floor', true, page.getByRole('button', { name: 'Save safety floor' }));
        await run(page, width, cardsOpen, 'Change safety floor', async () => page.getByRole('button', { name: 'Change safety floor' }).click(), async () => page.getByRole('spinbutton', { name: 'Safety floor amount' }).waitFor({ state: 'visible' }), 'input[aria-label="Safety floor amount"]', '', true, page.getByRole('button', { name: 'Change safety floor' }));
        await run(page, width, cardsOpen, 'Switch saved safety floor kind', async () => page.getByRole('button', { name: 'My fixed expenses plus a few days of spending' }).click(), async () => {
          await page.getByRole('spinbutton', { name: 'Safety floor cushion days' }).waitFor({ state: 'visible' });
          await page.waitForFunction(() => globalThis.document.querySelector('input[aria-label="Safety floor cushion days"]')?.value === '');
        }, 'input[aria-label="Safety floor cushion days"]', '', true, page.getByRole('button', { name: 'My fixed expenses plus a few days of spending' }));
        await page.getByRole('spinbutton', { name: 'Safety floor cushion days' }).fill('7');
        await run(page, width, cardsOpen, 'Save changed safety floor kind', async () => page.getByRole('button', { name: 'Save safety floor' }).click(), async () => readyText(page, 'Safety floor: your fixed expenses plus 7 days of typical spending.'), 'button', 'Change safety floor', true, page.getByRole('button', { name: 'Save safety floor' }));
        await run(page, width, cardsOpen, 'Change safety floor to clear', async () => page.getByRole('button', { name: 'Change safety floor' }).click(), async () => page.getByRole('spinbutton', { name: 'Safety floor cushion days' }).waitFor({ state: 'visible' }), 'input[aria-label="Safety floor cushion days"]', '', true, page.getByRole('button', { name: 'Change safety floor' }));
        await run(page, width, cardsOpen, 'Select no safety floor', async () => page.getByRole('button', { name: 'No safety floor (clear it)' }).click(), async () => readyVisible(page, goalCardSelector + ' button:has-text("Clear safety floor")'), 'button', 'Clear safety floor', true, page.getByRole('button', { name: 'No safety floor (clear it)' }));
        await run(page, width, cardsOpen, 'Clear safety floor', async () => page.getByRole('button', { name: 'Clear safety floor' }).click(), async () => readyText(page, 'No safety floor is set yet'), 'button', 'Set a safety floor', true, page.getByRole('button', { name: 'Clear safety floor' }));
        await run(page, width, cardsOpen, 'Open safety floor for undo check', async () => setFloorButton().click(), async () => page.getByRole('spinbutton', { name: 'Safety floor amount' }).waitFor({ state: 'visible' }), 'input[aria-label="Safety floor amount"]', '', true, setFloorButton());
        await page.getByRole('spinbutton', { name: 'Safety floor amount' }).fill('25000');
        await run(page, width, cardsOpen, 'Save safety floor for undo check', async () => page.getByRole('button', { name: 'Save safety floor' }).click(), async () => readyText(page, 'Safety floor: keep at least'), 'button', 'Change safety floor', true, page.getByRole('button', { name: 'Save safety floor' }));

        await run(page, width, cardsOpen, 'Open Manage goal before clearing', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await run(page, width, cardsOpen, 'Clear goal', async () => {
          await page.evaluate(() => {
            const app = globalThis.document.querySelector('#app');
            globalThis.__goalClearRenderCount = 0;
            globalThis.__goalClearObserver = new globalThis.MutationObserver((records) => {
              globalThis.__goalClearRenderCount += records.filter((record) => record.target === app && record.removedNodes.length > 0).length;
            });
            globalThis.__goalClearObserver.observe(app, { childList: true });
          });
          await page.getByRole('button', { name: 'Clear goal' }).click();
        }, async () => {
          await readyText(page, 'Goal cleared.');
          await readyVisible(page, goalCardSelector + ' .goal-choices');
          await waitStable(page);
          const renderCount = await page.evaluate(() => {
            globalThis.__goalClearObserver.disconnect();
            return globalThis.__goalClearRenderCount;
          });
          if (renderCount !== 1) failures.push('Clear goal rebuilt the Plan view ' + renderCount + ' times at ' + width + 'px');
        }, '.goal-choice', '', true, page.getByRole('button', { name: 'Clear goal' }));
        await run(page, width, cardsOpen, 'Undo clear goal', async () => page.getByRole('button', { name: 'Undo' }).click(), async () => {
          await readyVisible(page, goalCardSelector + ' .goal-readout[aria-label="Clear the card"]');
          await readyText(page, 'Safety floor: keep at least');
        }, 'button', 'Manage goal');
        await run(page, width, cardsOpen, 'Open Manage goal before creating a new one', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await run(page, width, cardsOpen, 'Clear goal before creating a new one', async () => {
          await page.getByRole('button', { name: 'Clear goal' }).click();
        }, async () => {
          await readyText(page, 'Goal cleared.');
          await readyVisible(page, goalCardSelector + ' .goal-choices');
        }, '.goal-choice', '', true, page.getByRole('button', { name: 'Clear goal' }));
        await run(page, width, cardsOpen, 'Choose new goal type', async () => page.locator('.goal-choice').filter({ hasText: 'Emergency fund' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.locator('.goal-choice').filter({ hasText: 'Emergency fund' }));
        await run(page, width, cardsOpen, 'Cancel new-goal form', async () => goalCard(page).locator('.goal-empty button').filter({ hasText: /^Cancel$/ }).click(), async () => readyVisible(page, goalCardSelector + ' .goal-empty .goal-choices'), '.goal-choice', '', true, goalCard(page).locator('.goal-empty button').filter({ hasText: /^Cancel$/ }));
        await run(page, width, cardsOpen, 'Choose new goal type to save', async () => page.locator('.goal-choice').filter({ hasText: 'Emergency fund' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.locator('.goal-choice').filter({ hasText: 'Emergency fund' }));
        await page.locator('#goal-draft-input').fill('6');
        await run(page, width, cardsOpen, 'Save new goal', async () => page.getByRole('button', { name: 'Set this goal' }).click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout[aria-label="Emergency fund"]'), 'button', 'Manage goal', true, page.getByRole('button', { name: 'Set this goal' }));
        await run(page, width, cardsOpen, 'Open Manage goal to change existing goal', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => readyVisible(page, goalCardSelector + ' #goal-draft-input'), '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));
        await page.locator('#goal-draft-input').fill('7');
        await run(page, width, cardsOpen, 'Save changed existing goal', async () => page.getByRole('button', { name: 'Save goal' }).click(), async () => readyVisible(page, goalCardSelector + ' .goal-readout[aria-label="Emergency fund"]'), 'button', 'Manage goal', true, page.getByRole('button', { name: 'Save goal' }));
        await run(page, width, cardsOpen, 'Verify saved goal value', async () => page.getByRole('button', { name: 'Manage goal' }).click(), async () => {
          await readyVisible(page, goalCardSelector + ' #goal-draft-input');
          const value = await page.locator('#goal-draft-input').inputValue();
          if (value !== '7') failures.push('Saved goal value did not refresh at ' + width + 'px: ' + value);
        }, '#goal-draft-input', '', true, page.getByRole('button', { name: 'Manage goal' }));

        await page.setViewportSize({ width, height: 900 });
      }
    }
    await page.close();
    console.log('Goal interactions measured: ' + measurements.length);
    assert.deepEqual(failures, [], failures.join('\n'));
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
