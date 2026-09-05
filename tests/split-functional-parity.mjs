/*
 * Functional parity proof for the reporting-module split.
 *
 * Run with PFA_BASELINE=/path/to/an-unmodified-HEAD-checkout.  The test loads
 * the cardAndBank mock persona through its real generator, then compares the
 * card-report core, period, insight, and printable overview DOM snapshots
 * between that pre-split checkout and the split checkout under test.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const here = path.resolve(import.meta.dirname, '..');
const baseline = process.env.PFA_BASELINE;

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function makeDocument() {
  class Node {
    constructor(tag) {
      this.tag = tag;
      this.attrs = {};
      this.children = [];
      this._text = '';
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
    get textContent() {
      return this._text;
    }
    set textContent(value) {
      this._text = String(value);
      this.children = [];
    }
  }
  const root = new Node('html');
  root.dataset = {};
  root.classList = { add() {}, remove() {} };
  root.removeAttribute = () => {};
  return {
    documentElement: root,
    createElement: (tag) => new Node(tag),
    createElementNS: (_ns, tag) => new Node(tag),
    createTextNode: (text) => {
      const node = new Node('#text');
      node._text = String(text);
      return node;
    },
  };
}

function serialize(node) {
  if (node == null) return '';
  if (typeof node !== 'object') return String(node);
  const attrs = Object.entries(node.attrs || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ` ${key}=${JSON.stringify(value)}`)
    .join('');
  return `<${node.tag}${attrs}>${node._text || ''}${node.children.map(serialize).join('')}</${node.tag}>`;
}

async function load(root) {
  const mod = (relative) => import(pathToFileURL(path.join(root, relative)).href);
  const legacy = path.join(root, 'application/analysis/reporting.js');
  const reporting = legacy.endsWith('reporting.js') && (await import('node:fs')).existsSync(legacy)
    ? await mod('application/analysis/reporting.js')
    : {
        ...(await mod('application/analysis/reporting-core.js')),
        ...(await mod('application/analysis/reporting-periods.js')),
        ...(await mod('application/analysis/reporting-insights.js')),
        ...(await mod('application/analysis/reporting-print.js')),
      };
  const [mockData, generator, categories, rules, resolver, bank, helpers] = await Promise.all([
    mod('application/sample-data/mock-data.js'),
    mod('application/sample-data/mock-generator.js'),
    mod('application/statements/categorise.js'),
    mod('settings/category-rules.js'),
    mod('application/statements/merchant-resolver.js'),
    mod('application/analysis/bank-analysis.js'),
    mod('application/core/shared-helpers.js'),
  ]);
  const cfg = helpers.withConfigDefaults(JSON.parse(readFileSync(path.join(root, 'settings/config.json'), 'utf8')));
  const rawMerchants = JSON.parse(readFileSync(path.join(root, 'settings/jamaica-merchants.json'), 'utf8'));
  const compiled = categories.compileRules(cfg.categories);
  const brandRules = rules.compileBrandRules(cfg);
  const merchantResolver = resolver.compileFromRaw(rawMerchants, cfg, []);
  const persona = mockData.PERSONAS.cardAndBank;
  const rng = generator.makeRng(generator.hashSeed(persona.seed));
  const card = generator.buildCardLedger(persona, rng);
  const bankLedger = generator.buildBankLedger(persona, rng);
  const rows = reporting.buildRows(card.records, compiled, {
    keepUpper: new Set(cfg.keepUpper),
    smallWords: new Set(cfg.smallWords),
    fallback: cfg.special.fallback,
    paymentCategory: cfg.special.paymentCategory,
    refundCategory: cfg.special.refundCategory,
    feeCategories: new Set(cfg.special.feeCategories),
    merchantOverrides: {},
    merchants: merchantResolver.compiled,
    brandRules,
    resolver: merchantResolver,
  });
  const summary = reporting.summarise(rows, {
    keepUpper: new Set(cfg.keepUpper),
    smallWords: new Set(cfg.smallWords),
    brandRules,
    merchants: merchantResolver.compiled,
  });
  const cardMonths = new Set(rows.map((row) => row.month).filter((month) => month && month !== 'unknown'));
  const bankMonths = new Set(bankLedger.records.map((row) => String(row.date).slice(0, 7)));
  const coverage = reporting.buildStatementCoverage(card.statements, bankLedger.statements, cardMonths, bankMonths);
  const months = [...new Set([...cardMonths, ...bankMonths])].sort();
  const period = reporting.resolvePeriod({ type: 'last-3' }, rows, months, new Date(), coverage);
  const analysis = reporting.analysePeriod(rows, period, {
    keepUpperSet: new Set(cfg.keepUpper),
    smallWordsSet: new Set(cfg.smallWords),
    brandRules,
    merchants: merchantResolver.compiled,
  });
  const classifiedBank = bank.applyLedgerRules(
    bank.classifyInternalTransfers(bankLedger.records, persona.accounts.map((a) => a.number), [persona.cardAccount], merchantResolver),
    { confirmedIncomeIds: new Set(), roundTripIds: new Set(), sharedAccounts: [], householdPayees: [] }
  );
  const overviewModel = () => ({
    ov: bank.analyseCombinedOverview({ bankRecords: classifiedBank, cardStatements: card.statements, cardSummary: summary }),
    roll: bank.analyseRollup({
      bankRecords: classifiedBank,
      cardSpendTotal: summary.total_spend,
      cardSpendByMonth: summary.by_month,
      cardStatements: card.statements,
    }),
  });
  const document = makeDocument();
  const host = document.createElement('div');
  const oldDocument = globalThis.document;
  globalThis.document = document;
  try {
    const print = reporting.createPrintReports({
      state: {
        view: 'overview', records: card.records, bankRecords: bankLedger.records, cfg,
        coverage, rows, allSummary: summary, filter: { month: 'all', category: 'all', kind: 'all' },
      },
      $: (selector) => (selector === '#print-report' ? host : null),
      el: (tag, attrs = {}, ...kids) => {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) if (key !== 'onclick') node.setAttribute(key, value);
        for (const kid of kids) if (kid != null) node.appendChild(typeof kid === 'object' ? kid : document.createTextNode(kid));
        return node;
      },
      toast() {}, iconX: () => '', toggleExportMenu() {}, bankRecordsInPeriod: (x) => x,
      resolved: () => period, analysis: () => analysis, periodRows: () => rows, visibleRows: () => rows,
      allMonths: () => months, FALLBACK: () => cfg.special.fallback, isReview: () => false,
      catColour: () => '#000', money0: (n) => String(n), moneyShort: (n) => String(n), pct: (n) => String(n),
      monthLabel: (m) => m, monthShort: (m) => m, prevLabel: () => '', histMonthlyAverage: () => null,
      buildInsights: () => [], classifiedBank: () => classifiedBank, bankMoney: (n) => String(n),
      cleanCounterparty: (s) => s, overviewModel,
    });
    assert.equal(print.buildReportForCurrentView(), true);
  } finally {
    globalThis.document = oldDocument;
  }
  return {
    core: { rows, summary },
    periods: { coverage, period, analysis, recurring: reporting.detectRecurring(rows) },
    insights: {
      foreign: reporting.foreignSummary(rows),
      duplicates: reporting.detectPossibleDuplicates(rows, brandRules, merchantResolver.compiled),
      spikes: reporting.detectCategorySpikes(rows, period),
    },
    print: serialize(host),
  };
}

test('cardAndBank mock persona has byte-for-byte identical reporting output before and after the split', async () => {
  assert.ok(baseline, 'Set PFA_BASELINE to an unmodified pre-split checkout.');
  const before = await load(baseline);
  const after = await load(here);
  for (const area of ['core', 'periods', 'insights', 'print']) {
    assert.equal(digest(after[area]), digest(before[area]), `${area} output differs`);
    console.log(`${area}: ${digest(after[area])}`);
  }
});
