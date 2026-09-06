import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PERSONAS } from '../application/sample-data/mock-data.js';
import { hashSeed, makeRng, buildCardLedger, buildBankLedger } from '../application/sample-data/mock-generator.js';
import { classifyInternalTransfers, applyLedgerRules, bankCashFlowDirection, bankFlowOverTime, analyseIncomePattern } from '../application/analysis/bank-analysis.js';
import { typicalIncome } from '../application/analysis/plan.js';
import { expectedIncome, resolveOpts } from '../application/analysis/commitment-income.js';
import { buildForecast } from '../application/analysis/forecast.js';
import { cashAndDebt } from '../application/analysis/position.js';
import { committedFlexible } from '../application/analysis/committed-flexible.js';
import { categoriseBankRows, bankRuleMatch } from '../application/analysis/bank-categorise.js';
import { buildRows, rowNeedsReview } from '../application/analysis/reporting-core.js';
import { withConfigDefaults, isCountedBankIncome } from '../application/core/shared-helpers.js';
import { compileRules } from '../application/statements/categorise.js';
import { merchantRuleKeyFromDescription } from '../settings/category-rules.js';
import { categoryMeta } from '../application/analysis/category-flow.js';
import { effectiveCreditIncomeTotal, matchingIncomeRule } from '../application/analysis/credit-classifier.js';
import { buildIncomeModel } from '../application/analysis/income-model.js';
import { labelSuggestions } from '../application/analysis/label-suggestions.js';
import { setBankDescriptorCleanupRules } from '../application/statements/read-statements.js';
import { compileFromRaw } from '../application/statements/merchant-resolver.js';
import { waitForServer, closeServer, openBrowser, loadPersona, importStatementFolder } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AS_OF = '2026-09-30';
const GOLDENS = new URL('./fixtures/income-goldens.json', import.meta.url);
const LABEL_BASELINE = new URL('./fixtures/income-phase1-label-baseline.json', import.meta.url);
const PERSONA_NAMES = ['cardAndBank', 'bankOnly', 'cardOnly'];
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const config = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const compiled = compileRules(config.categories);
const cleanupRules = (config.bankDescriptorCleanup?.rules || []).map((rule) => ({
  pattern: new RegExp(rule.pattern, rule.flags || 'i'), replacement: rule.replacement || '',
}));
setBankDescriptorCleanupRules(cleanupRules);
const merchantFile = config.merchants?.file || 'jamaica-merchants.json';
const resolver = compileFromRaw(JSON.parse(await readFile(join(ROOT, 'settings', merchantFile), 'utf8')), config, cleanupRules);

function categorySnapshot(records, cardRecords = [], mutate = '') {
  const fallback = config.special.fallback;
  const bank = categoriseBankRows(records, compiled, {
    cfg: config, fallback, resolver, routes: config.accountCategoryRoutes?.bank || [],
  });
  const card = buildRows(cardRecords, compiled, {
    cfg: config, fallback, resolver,
    keepUpper: new Set(config.keepUpper || []), smallWords: new Set(config.smallWords || []),
    paymentCategory: config.special.paymentCategory, refundCategory: config.special.refundCategory,
    feeCategories: new Set(config.special.feeCategories),
  });
  const credits = bank.filter((row) => row.direction === 'in')
    .map(({ id, category }) => ({ id, category }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (mutate === 'credit' && credits.length) {
    credits[0].category = credits[0].category === fallback ? config.special.refundCategory : fallback;
  }
  if (mutate === 'review') {
    const reviewed = [...card, ...bank].find((row) => rowNeedsReview(row, fallback));
    assert.ok(reviewed);
    reviewed.reviewDismissed = true;
  }
  if (mutate === 'card' && card.length) card[0].category = fallback;
  const reviewQueueCount = [...card, ...bank].filter((row) => rowNeedsReview(row, fallback)).length;
  const cardCategories = card.map(({ id, category }) => ({ id, category })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { credits, reviewQueueCount, cardCategories, bank, card };
}

function incomeSumFigures(records, cardStatements, cardRecords, trend) {
  const { typicalMonthlyIn, monthsSeen } = cashAndDebt({ bankRecords: records, cardStatements, cfg: config, asOf: AS_OF }).cashFlow;
  const fallback = cashAndDebt({
    bankRecords: records, cardStatements, cfg: { ...config, ahead: { ...(config.ahead || {}), minMonths: 999 } }, asOf: AS_OF,
  }).incomeStability;
  const months = [...new Set(records.map((row) => String(row.date || '').slice(0, 7)).filter(Boolean))].sort();
  const committed = months.map((month) => ({
    month,
    income: committedFlexible({ bankRecords: records, cardRecords, cfg: config, period: { from: `${month}-01`, to: `${month}-31` } }).income,
  }));
  const planned = new Map(trend.map(({ month, moneyIn }) => [month, moneyIn]));
  return {
    typical: { typicalMonthlyIn, monthsSeen }, fallback, committed,
    committedMonthsOffPlan: committed.filter(({ month, income }) => Math.round(income * 100) !== Math.round((planned.get(month) || 0) * 100)).length,
  };
}

function capture(records, cardStatements = [], cardRecords = [], mutate = '') {
  const trend = bankFlowOverTime(records);
  const opts = resolveOpts(config);
  const pay = expectedIncome(records, opts, AS_OF);
  const forecast = buildForecast({ bankRecords: records, cardStatements, cfg: config, asOf: AS_OF });
  const reliability = cashAndDebt({ bankRecords: records, cardStatements, cfg: config, asOf: AS_OF }).incomeStability;
  const categories = categorySnapshot(records, cardRecords, mutate);
  const sums = incomeSumFigures(records, cardStatements, cardRecords, trend);
  const plan = typicalIncome(trend.map((row) => ({ ...row, income: row.moneyIn })), AS_OF);
  return {
    monthlyMoneyIn: hash(trend.map(({ month, moneyIn }) => ({ month, moneyIn }))),
    planTypicalIncome: hash(typicalIncome(trend.map((row) => ({ ...row, income: row.moneyIn })), AS_OF)),
    payStream: hash(pay && (({ key, amount, date, chosenBy, otherCandidates }) => ({ key, amount, date, chosenBy, otherCandidates }))(pay)),
    incomePattern: hash(analyseIncomePattern(records, config, new Date(`${AS_OF}T12:00:00Z`))),
    forecastIncome: hash(forecast.assumptions.income?.amount ?? null),
    positionReliability: hash({ stability: reliability.label, cv: reliability.cv, incomeBasis: reliability.basis }),
    positionTypicalMonthlyIncome: hash(sums.typical),
    positionMonthlySumFallback: hash(sums.fallback),
    committedFlexibleIncome: hash(sums.committed),
    incomeSumMonths: sums.committed.length,
    committedIncomeMonthsOffMonthlyMoneyIn: sums.committedMonthsOffPlan,
    positionTypicalOffPlan: Math.round(sums.typical.typicalMonthlyIn * 100) !== Math.round(plan.amount * 100) ? 1 : 0,
    fallbackMonthsSeen: sums.fallback.monthsSeen,
    labelSuggestionCount: labelSuggestions({ rows: categories.bank, cfg: config, confirmations: [] }).length,
    countedCreditIds: hash(records.filter((row) => bankCashFlowDirection(row) === 'income').map((row) => row.id).sort()),
    bankCreditCategories: hash(categories.credits),
    reviewQueueCount: hash(categories.reviewQueueCount),
    cardRowCategories: hash(categories.cardCategories),
    creditFallbackCount: categories.credits.filter((row) => row.category === config.special.fallback).length,
    reviewQueueSize: categories.reviewQueueCount,
  };
}

const shapeVocabulary = new Set([
  ...config.incomeRules.flatMap((rule) => [...rule.words, ...(rule.prefix || []), ...rule.exclude]),
  ...config.channelWords,
  'salary', 'payroll', 'wages', 'wage', 'bonus', 'pension', 'annuity', 'dividend', 'interest',
  'refund', 'reversal', 'reimbursement', 'expense', 'loan', 'disbursement', 'advance',
  'redemption', 'encashment', 'rent', 'gift', 'grant', 'benefit', 'nis',
].flatMap((phrase) => String(phrase).toUpperCase().match(/\p{L}+/gu) || []));

function descriptionShape(row) {
  const words = String(row.raw_description || row.description || row.type || '').toUpperCase().match(/\p{L}+/gu) || [];
  return words.map((word) => shapeVocabulary.has(word) ? word : '···')
    .filter((word, index, all) => word !== '···' || all[index - 1] !== '···').join(' ');
}

function classificationDiagnostics(records, cardRecords = [], mutate = '') {
  const snapshot = categorySnapshot(records, cardRecords);
  const credits = snapshot.bank.filter((row) => row.direction === 'in');
  if (mutate === 'class') credits[0].creditClassification.incomeClass = '';
  if (mutate === 'income') {
    const target = credits.find((row) => isCountedBankIncome(row));
    assert.ok(target);
    target.creditClassification.category = config.special.refundCategory;
    target.creditClassification.basis = 'wording';
  }
  if (mutate === 'salary') {
    const target = credits.find((row) => row.category === 'Salary');
    assert.ok(target);
    target.creditClassification = { category: 'Salary', incomeClass: 'earned', basis: 'wording', evidence: null };
  }
  if (mutate === 'channel') {
    credits[0].creditClassification.basis = 'wording';
    credits[0].creditClassification.evidence = { token: 'DIRECT CREDIT' };
  }
  if (mutate === 'determinism') credits[0].creditClassification.evidence = { kind: 'mutation' };
  const failures = { class: 0, income: 0, salary: 0, channel: 0, determinism: 0 };
  const shapes = new Map();
  const nearMisses = new Map();
  const scoped = credits.filter((row) => ['Salary', 'Income'].includes(row.category));
  for (const row of credits) {
    const classification = row.creditClassification;
    const meta = categoryMeta(config, classification?.category);
    if (!classification?.incomeClass || !meta || classification.incomeClass !== meta.incomeClass) failures.class++;
    if (effectiveCreditIncomeTotal(row, classification, config) !== isCountedBankIncome(row)) failures.income++;
    if (row.category === 'Salary' && classification.basis !== 'person' &&
      !(classification.basis === 'wording' && config.incomeRules.some((rule) =>
        rule.active && rule.category === 'Salary' &&
        JSON.stringify(classification.evidence) === JSON.stringify(matchingIncomeRule(row, rule))))) failures.salary++;
    if (classification.basis === 'wording' && config.channelWords.includes(classification.evidence?.token) &&
      !config.incomeRules.some((rule) => rule.active && [...rule.words, ...(rule.prefix || [])].includes(classification.evidence.token))) failures.channel++;
    const original = categoriseBankRows([row], compiled, { cfg: config, fallback: config.special.fallback, resolver })[0];
    const repeated = categoriseBankRows([original], compiled, { cfg: config, fallback: config.special.fallback, resolver })[0];
    if (JSON.stringify(classification) !== JSON.stringify(original.creditClassification) ||
      JSON.stringify(original.creditClassification) !== JSON.stringify(repeated.creditClassification)) failures.determinism++;
    if (['Salary', 'Bonus', 'Pension', 'Government benefits', 'Interest', 'Dividends'].includes(row.category)) {
      const key = `${row.category}: ${descriptionShape(row)}`;
      shapes.set(key, (shapes.get(key) || 0) + 1);
    }
    for (const token of new Set(config.incomeRules.flatMap((rule) => [...rule.words, ...(rule.prefix || [])]))) {
      const categoriesForToken = config.incomeRules.filter((rule) => [...rule.words, ...(rule.prefix || [])].includes(token)).map((rule) => rule.category);
      const found = ['type', 'description'].some((field) => matchingIncomeRule(row, { field, words: [token], exclude: [] }));
      if (found && !categoriesForToken.includes(row.category))
        nearMisses.set(token, (nearMisses.get(token) || 0) + 1);
    }
  }
  assert.deepEqual(failures, { class: 0, income: 0, salary: 0, channel: 0, determinism: 0 });
  return {
    creditCount: credits.length,
    personSpendOverrides: credits.filter((row) => row.creditClassification?.basis === 'person' && categoryMeta(config, row.category)?.flow === 'out').length,
    salaryAndIncomeRuleKeys: new Set(scoped.map((row) => merchantRuleKeyFromDescription(bankRuleMatch(row))).filter(Boolean)).size,
    salaryAndIncomeCounterpartyKeys: new Set(scoped.map((row) => row.counterpartyKey).filter(Boolean)).size,
    labelledShapes: Object.fromEntries([...shapes].sort(([a], [b]) => a.localeCompare(b))),
    nearMisses: Object.fromEntries([...nearMisses].sort(([a], [b]) => a.localeCompare(b))),
    invariantFailures: failures,
    cardRowCategories: hash(snapshot.cardCategories),
  };
}

function syntheticRecords(name) {
  const persona = PERSONAS[name];
  const rng = makeRng(hashSeed(persona.seed));
  const card = persona.hasCard ? buildCardLedger(persona, rng) : null;
  if (!persona.hasBank) return { records: [], cardStatements: card ? card.statements : [], cardRecords: card ? card.records : [] };
  const bank = buildBankLedger(persona, rng, card ? card.perStatement.map((statement) => statement.payments) : null);
  const accounts = (persona.accounts || []).map((account) => account.number);
  const classified = classifyInternalTransfers(bank.records, accounts, [persona.cardAccount].filter(Boolean), resolver);
  return {
    records: applyLedgerRules(classified, { sharedAccounts: persona.sharedAccountNumbers || [], householdPayees: persona.householdPayeeNames || [] }),
    cardStatements: card ? card.statements : [],
    cardRecords: card ? card.records : [],
  };
}

function withFixedClock(run) {
  const OriginalDate = globalThis.Date;
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [`${AS_OF}T12:00:00Z`])); }
    static now() { return OriginalDate.parse(`${AS_OF}T12:00:00Z`); }
  };
  try { return run(); } finally { globalThis.Date = OriginalDate; }
}

function syntheticHashes() {
  return withFixedClock(() => Object.fromEntries(PERSONA_NAMES.map((name) => {
    const { records, cardStatements, cardRecords } = syntheticRecords(name);
    if (process.env.PFA_INCOME_MUTATE === '1' && name === 'cardAndBank') {
      const credit = records.find((row) => bankCashFlowDirection(row) === 'income');
      assert.ok(credit);
      credit.amount += 1;
    }
    const mutate = name === 'cardAndBank' && process.env.PFA_INCOME_MUTATE_CREDIT_CATEGORY === '1' ? 'credit'
      : name === 'cardAndBank' && process.env.PFA_INCOME_MUTATE_REVIEW_QUEUE === '1' ? 'review'
        : name === 'cardAndBank' && process.env.PFA_INCOME_MUTATE_CARD_CATEGORY === '1' ? 'card' : '';
    return [name, capture(records, cardStatements, cardRecords, mutate)];
  })));
}

function statedIncomeAggregates(statements) {
  const counts = (items, pick) => Object.fromEntries(Object.entries(items.reduce((found, item) => {
    const key = pick(item);
    return { ...found, [key]: (found[key] || 0) + 1 };
  }, {})).sort(([a], [b]) => a.localeCompare(b)));
  const lines = statements.flatMap((statement) => statement.incomeLines || []);
  return {
    statementsWithLines: statements.filter((statement) => (statement.incomeLines || []).length).length,
    lines: lines.length,
    byKind: counts(lines, (line) => line.kind),
    byTreatment: counts(lines, (line) => line.treatment || 'unstated'),
    byCurrency: counts(lines, (line) => line.currency || 'unstated'),
    undated: lines.filter((line) => !line.date).length,
    unreadWarnings: statements.reduce((sum, statement) => sum + (statement.warnings || []).filter((warning) => warning === 'income-unread').length, 0),
  };
}

async function realHashes(browser, origin, folder) {
  const imported = await importStatementFolder(browser, origin, folder);
  const cardAccounts = imported.cardStatements.map((statement) => statement.account).filter(Boolean);
  const classified = applyLedgerRules(classifyInternalTransfers(imported.records, [], cardAccounts, resolver));
  const categories = categorySnapshot(classified, imported.cardRecords);
  const model = buildIncomeModel({ bankRows: categories.bank, cfg: config, asOf: AS_OF });
  const assigned = new Map();
  for (const stream of model.streams) for (const row of stream.rows)
    assigned.set(row, (assigned.get(row) || 0) + 1);
  for (const credit of model.residualCredits)
    assigned.set(credit.row, (assigned.get(credit.row) || 0) + 1);
  const withInvestments = buildIncomeModel({ bankRows: categories.bank, cfg: config, asOf: AS_OF, investmentStatements: imported.investmentStatements });
  const modelFigures = (candidate) => hash({
    monthly: candidate.monthlyMoneyIn,
    byClass: candidate.monthlyByClass,
    takeHome: candidate.takeHome,
    streams: candidate.streams.map(({ rows: _rows, ...rest }) => rest),
    pay: candidate.primaryPay,
    pattern: candidate.incomePattern,
    residual: candidate.residualCredits.length,
    excluded: candidate.excludedTotals,
  });
  const incomeModelInvariantFailures = {
    investmentFigures: modelFigures(withInvestments) === modelFigures(model) && withInvestments.investment.countsTowardTakeHome === false ? 0 : 1,
    monthlyClasses: model.monthlyMoneyIn.filter((item) =>
      Math.round(Object.values(model.monthlyByClass[item.month] || {}).reduce((sum, amount) => sum + amount, 0) * 100) !==
        Math.round(item.amount * 100)).length,
    streamAssignment: categories.bank.filter((row) => isCountedBankIncome(row) && assigned.get(row) !== 1).length,
    takeHome: JSON.stringify((({ byClass: _byClass, ...result }) => result)(model.takeHome)) ===
      JSON.stringify(typicalIncome(bankFlowOverTime(categories.bank)
        .map((row) => ({ ...row, income: row.moneyIn })), AS_OF)) ? 0 : 1,
    primaryPay: JSON.stringify(model.primaryPay) ===
      JSON.stringify(expectedIncome(classified, resolveOpts(config), AS_OF)) ? 0 : 1,
  };
  assert.deepEqual(incomeModelInvariantFailures,
    { investmentFigures: 0, monthlyClasses: 0, streamAssignment: 0, takeHome: 0, primaryPay: 0 });
  const known = new Set([config.special.fallback, ...config.categories.map((category) => category.name)]);
  const creditCategoryCounts = {};
  for (const row of categories.credits) {
    const name = known.has(row.category) ? row.category : 'Other category';
    creditCategoryCounts[name] = (creditCategoryCounts[name] || 0) + 1;
  }
  return {
    fileCount: imported.fileCount, bankRows: imported.records.length,
    investmentStatements: imported.investmentStatements.length,
    investmentStatementsHash: hash(imported.investmentStatements
      .map(({ incomeLines: _incomeLines, importedAt: _importedAt, updatedAt: _updatedAt, ...rest }) => rest)
      .sort((a, b) => String(a.hash).localeCompare(String(b.hash)))),
    investmentIncomeLines: statedIncomeAggregates(imported.investmentStatements),
    labelSuggestions: (() => {
      const asked = labelSuggestions({ rows: categories.bank, cfg: config, confirmations: [] });
      const defaulted = categories.bank.filter((row) => row.direction === 'in' && row.creditClassification?.basis === 'default');
      return {
        creditsLabelledByDefault: defaulted.length,
        groupsLabelledByDefault: new Set(defaulted.map((row) => merchantRuleKeyFromDescription(bankRuleMatch(row))).filter(Boolean)).size,
        suggested: asked.length,
        groups: asked.map((item) => ({
          months: item.months, deposits: item.count, percentOfTakeHome: Math.round(100 * item.typical / (model.takeHome.amount || 1)), shape: descriptionShape(item.row),
        })),
      };
    })(),
    investmentSection: {
      countsTowardTakeHome: withInvestments.investment.countsTowardTakeHome,
      distributionMonths: new Set(withInvestments.investment.distributions.map((entry) => entry.month)).size,
      currencies: Object.fromEntries([...new Set(withInvestments.investment.distributions.map((entry) => entry.currency))].sort().map((currency) =>
        [currency, withInvestments.investment.distributions.filter((entry) => entry.currency === currency).length])),
    },
    hashes: capture(classified, imported.cardStatements, imported.cardRecords),
    creditCategoryCounts: Object.fromEntries(Object.entries(creditCategoryCounts).sort(([a], [b]) => a.localeCompare(b))),
    reviewQueueCount: categories.reviewQueueCount,
    diagnostics: classificationDiagnostics(classified, imported.cardRecords),
    incomeModelInvariantFailures,
  };
}

test('synthetic income goldens stay unchanged', () => {
  const actual = syntheticHashes();
  if (process.env.PFA_UPDATE_INCOME_GOLDENS === '1') {
    return writeFile(GOLDENS, `${JSON.stringify(actual, null, 2)}\n`);
  }
  return readFile(GOLDENS, 'utf8').then((source) => assert.deepEqual(actual, JSON.parse(source)));
});

test('synthetic credit classes and income flags agree, with mutation failures', () => {
  for (const name of PERSONA_NAMES) {
    const { records, cardRecords } = syntheticRecords(name);
    const diagnostics = classificationDiagnostics(records, cardRecords);
    assert.equal(diagnostics.creditCount, records.filter((row) => row.direction === 'in').length);
  }
  const { records, cardRecords } = syntheticRecords('bankOnly');
  for (const mutation of ['class', 'income', 'salary', 'channel', 'determinism'])
    assert.throws(() => classificationDiagnostics(records, cardRecords, mutation), /invariantFailures|Expected values to be strictly deep-equal/);
});

test('review queue falls exactly with newly labelled credits and card categories stay fixed', async () => {
  const baseline = JSON.parse(await readFile(LABEL_BASELINE, 'utf8'));
  const current = syntheticHashes();
  const check = (before, after) => {
    assert.equal(before.reviewQueueSize - after.reviewQueueSize,
      before.creditFallbackCount - after.creditFallbackCount);
    assert.equal(after.cardRowCategories, before.cardRowCategories);
  };
  for (const name of PERSONA_NAMES) check(baseline[name], current[name]);
  assert.throws(() => check({ ...baseline.bankOnly, reviewQueueSize: baseline.bankOnly.reviewQueueSize + 1 }, current.bankOnly));
  assert.throws(() => check({ ...baseline.bankOnly, cardRowCategories: 'mutated' }, current.bankOnly));
});

test('the three income-sum hashes reject mutated inputs and ignore unrelated ones', () => {
  const { records, cardStatements, cardRecords } = withFixedClock(() => syntheticRecords('cardAndBank'));
  const figures = (change) => {
    const copy = records.map((row) => ({ ...row }));
    change(copy.find((row) => isCountedBankIncome(row)), copy.find((row) => row.direction === 'out' && !row.internalTransfer));
    const trend = bankFlowOverTime(copy);
    const sums = incomeSumFigures(copy, cardStatements, cardRecords, trend);
    return {
      typical: hash(sums.typical),
      fallback: hash(sums.fallback),
      committed: hash(sums.committed),
    };
  };
  const intact = figures(() => {});
  assert.notEqual(figures((credit) => { credit.amount += 1000; }).typical, intact.typical);
  assert.notEqual(figures((credit) => { credit.amount *= 1.5; }).fallback, intact.fallback);
  assert.notEqual(figures((credit) => { credit.amount += 1; }).committed, intact.committed);
  assert.deepEqual(figures((_credit, debit) => { debit.amount += 1000; }), intact);
});

test('income goldens use the app browser harness', async () => {
  const browser = await openBrowser();
  if (!browser) {
    assert.ok(!process.env.PFA_INCOME_STATEMENTS_DIR, 'The real-statement mode requires a browser');
    return;
  }
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    const page = await browser.newPage();
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      for (const name of PERSONA_NAMES) {
        if (name === 'cardOnly') {
          const navigation = page.waitForNavigation({ waitUntil: 'load' });
          await page.evaluate(() => globalThis.window.PFAMock.loadPersona('cardOnly')).catch((error) => {
            if (!/Execution context was destroyed|navigation/i.test(error.message)) throw error;
          });
          await navigation;
          await page.waitForFunction(() => globalThis.document.querySelector('#app')?.textContent?.trim().length > 0);
          assert.equal(await page.evaluate(async () => {
            const { Store } = await import('/application/core/storage.js');
            return Store.getMeta('mockPersonaLoaded', null);
          }), name);
        } else {
          await loadPersona(page, name);
          assert.ok(await page.locator('#ledger-tab-overview').count());
        }
      }
    } finally { await page.close(); }
    if (process.env.PFA_INCOME_STATEMENTS_DIR) {
      const result = await realHashes(browser, origin, process.env.PFA_INCOME_STATEMENTS_DIR);
      const output = `/private/tmp/pfa-income-real-goldens-${process.pid}.json`;
      await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
      console.log(`Real statement hashes written to ${output}; ${result.fileCount} PDFs, ${result.bankRows} bank rows.`);
    }
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
