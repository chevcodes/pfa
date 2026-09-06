import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PERSONAS } from '../application/sample-data/mock-data.js';
import { hashSeed, makeRng, buildCardLedger, buildBankLedger, buildInvestmentStatements } from '../application/sample-data/mock-generator.js';
import { classifyInternalTransfers, applyLedgerRules, bankFlowOverTime } from '../application/analysis/bank-analysis.js';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { buildIncomeModel } from '../application/analysis/income-model.js';
import { cashAndDebt } from '../application/analysis/position.js';
import { typicalIncome } from '../application/analysis/plan.js';
import { expectedIncome, resolveOpts } from '../application/analysis/commitment-income.js';
import { isCountedBankIncome, roundMoney, withConfigDefaults } from '../application/core/shared-helpers.js';
import { compileFromRaw } from '../application/statements/merchant-resolver.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const asOf = '2026-09-30';
const cfg = withConfigDefaults(JSON.parse(await readFile(join(root, 'settings/config.json'), 'utf8')));
const resolver = compileFromRaw(JSON.parse(await readFile(join(root, 'settings', cfg.merchants.file), 'utf8')), cfg, []);

function personaRows(name) {
  const persona = PERSONAS[name];
  const rng = makeRng(hashSeed(persona.seed));
  const card = persona.hasCard ? buildCardLedger(persona, rng) : null;
  if (!persona.hasBank) return [];
  const bank = buildBankLedger(persona, rng, card ? card.perStatement.map((statement) => statement.payments) : null);
  const accounts = (persona.accounts || []).map((account) => account.number);
  const rows = applyLedgerRules(classifyInternalTransfers(bank.records, accounts,
    [persona.cardAccount].filter(Boolean), resolver), {
    sharedAccounts: persona.sharedAccountNumbers || [], householdPayees: persona.householdPayeeNames || [],
  });
  return rows.map((row) => {
    if (row.direction !== 'in') return row;
    const classification = classifyCredit(row, { cfg });
    return { ...row, category: classification.category, creditClassification: classification };
  });
}

function invariantFailures(model, rows) {
  let monthly = 0;
  for (const item of model.monthlyMoneyIn) {
    const sum = roundMoney(Object.values(model.monthlyByClass[item.month] || {})
      .reduce((total, amount) => total + amount, 0));
    if (sum !== item.amount) monthly++;
  }
  const assignments = new Map();
  for (const stream of model.streams) for (const row of stream.rows)
    assignments.set(row, (assignments.get(row) || 0) + 1);
  for (const credit of model.residualCredits)
    assignments.set(credit.row, (assignments.get(credit.row) || 0) + 1);
  const assigned = rows.filter((row) => isCountedBankIncome(row))
    .filter((row) => assignments.get(row) !== 1).length;
  const trend = bankFlowOverTime(rows).map((row) => ({ ...row, income: row.moneyIn }));
  const takeHome = JSON.stringify((({ byClass: _byClass, ...value }) => value)(model.takeHome)) ===
    JSON.stringify(typicalIncome(trend, asOf)) ? 0 : 1;
  const primaryPay = JSON.stringify(model.primaryPay) ===
    JSON.stringify(expectedIncome(rows, resolveOpts(cfg), asOf)) ? 0 : 1;
  return { monthly, assigned, takeHome, primaryPay };
}

test('income model reconciles classes, streams, take-home and primary pay for every persona', () => {
  for (const name of ['cardAndBank', 'bankOnly', 'cardOnly']) {
    const rows = personaRows(name);
    const model = buildIncomeModel({ bankRows: rows, cfg, asOf });
    assert.deepEqual(invariantFailures(model, rows), { monthly: 0, assigned: 0, takeHome: 0, primaryPay: 0 });
    assert.strictEqual(model, buildIncomeModel({ bankRows: rows, cfg, asOf }));
    assert.equal(model.classifiedCredits.length, rows.filter((row) => row.direction === 'in').length);
  }
});

test('every model invariant rejects a deliberate mutation', () => {
  const rows = personaRows('cardAndBank');
  const model = buildIncomeModel({ bankRows: rows, cfg, asOf });
  const intact = invariantFailures(model, rows);
  const firstMonth = Object.keys(model.monthlyByClass).find((month) => Object.keys(model.monthlyByClass[month]).length);
  const firstClass = Object.keys(model.monthlyByClass[firstMonth])[0];
  model.monthlyByClass[firstMonth][firstClass]++;
  assert.ok(invariantFailures(model, rows).monthly > intact.monthly);
  model.monthlyByClass[firstMonth][firstClass]--;
  const firstStream = model.streams.find((stream) => stream.rows.length);
  assert.ok(firstStream);
  const removed = firstStream.rows.pop();
  assert.ok(invariantFailures(model, rows).assigned > intact.assigned);
  firstStream.rows.push(removed);
  model.takeHome.amount++;
  assert.ok(invariantFailures(model, rows).takeHome > intact.takeHome);
  model.takeHome.amount--;
  const oldPay = model.primaryPay;
  model.primaryPay = { ...oldPay, key: 'mutated' };
  assert.ok(invariantFailures(model, rows).primaryPay > intact.primaryPay);
  model.primaryPay = oldPay;
});

const phase3bAllowlist = [];
const modelReaders = ['analysis/position.js', 'analysis/committed-flexible.js'];
const directionCheck = /(?:dirOf\(\w+\)|\bdir|direction)\s*[!=]==\s*'in'/;

function count(source, expression) {
  return source.split(expression).length - 1;
}

function auditRawIncome(files) {
  const failures = [];
  for (const item of phase3bAllowlist) {
    if (count(files[item.file] || '', item.expression) !== 1) failures.push(item.purpose);
  }
  for (const file of modelReaders) {
    if (directionCheck.test(files[file] || '')) failures.push(file);
    if (!/buildIncomeModel\(/.test(files[file] || '')) failures.push(`${file} does not read the income model`);
  }
  for (const [file, source] of Object.entries(files)) {
    if (file === 'analysis/income-model.js' || file === 'core/shared-helpers.js') continue;
    if (/!\w+\.refund\s*&&\s*!\w+\.excludedFromIncome|!\w+\.excludedFromIncome\s*&&\s*!\w+\.refund/.test(source))
      failures.push(file);
    if (/(?:income|moneyIn|cashIn)\s*\+=\s*amtOf\(\w+\)/.test(source)) failures.push(file);
  }
  return failures;
}

test('no raw income derivation exists outside the income model, and the Phase 3b allowlist is empty', async () => {
  const application = join(root, 'application');
  const files = {};
  async function readSources(folder, relative = '') {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory() && entry.name !== 'react-dist') await readSources(join(folder, entry.name), name);
      else if (entry.isFile() && name.endsWith('.js')) files[name] = await readFile(join(folder, entry.name), 'utf8');
    }
  }
  await readSources(application);
  assert.deepEqual(phase3bAllowlist, []);
  assert.deepEqual(auditRawIncome(files), []);
  assert.ok(auditRawIncome({ ...files, 'analysis/new-reader.js': "if (row.direction === 'in' && !row.refund && !row.excludedFromIncome) income += amtOf(row);" }).includes('analysis/new-reader.js'));
  for (const file of modelReaders) {
    assert.ok(auditRawIncome({ ...files, [file]: `${files[file]}\nif (dirOf(r) !== 'in') continue;` }).includes(file));
    assert.ok(auditRawIncome({ ...files, [file]: `${files[file]}\nincome += amtOf(r);` }).includes(file));
    assert.ok(auditRawIncome({ ...files, [file]: files[file].replaceAll('buildIncomeModel(', 'readNothing(') }).includes(`${file} does not read the income model`));
  }
  assert.doesNotMatch(files['analysis/income-model.js'], /classifyCredit\(/);
});

test('Position typical monthly income equals Plan take-home for every persona, to the cent', () => {
  const positionTypical = (rows) => cashAndDebt({ bankRecords: rows, cardStatements: [], cfg, asOf }).cashFlow.typicalMonthlyIn;
  const planTakeHome = (rows) => typicalIncome(bankFlowOverTime(rows).map((row) => ({ ...row, income: row.moneyIn })), asOf).amount;
  const agree = (positionRows, planRows) => assert.equal(Math.round(positionTypical(positionRows) * 100), Math.round(planTakeHome(planRows) * 100));
  for (const name of ['cardAndBank', 'bankOnly', 'cardOnly']) {
    const rows = personaRows(name);
    agree(rows, rows);
  }
  const rows = personaRows('bankOnly');
  assert.ok(rows.some((row) => row.excludedFromIncome));
  assert.throws(() => agree(rows.map((row) => row.excludedFromIncome ? { ...row, excludedFromIncome: false } : row), rows));
});

test('investment statements add a separate section and never change any income figure', () => {
  const persona = PERSONAS.cardAndBank;
  const investmentStatements = buildInvestmentStatements(persona, makeRng(hashSeed(persona.seed))).statements;
  const figures = (model) => JSON.stringify({
    monthly: model.monthlyMoneyIn,
    byClass: model.monthlyByClass,
    takeHome: model.takeHome,
    streams: model.streams.map(({ rows: _rows, ...rest }) => rest),
    pay: model.primaryPay,
    pattern: model.incomePattern,
    residual: model.residualCredits.length,
    excluded: model.excludedTotals,
    foreign: model.foreignCurrency,
  });
  const check = (model, plain) => {
    assert.equal(figures(model), figures(plain));
    assert.equal(model.investment.countsTowardTakeHome, false);
  };
  for (const name of ['cardAndBank', 'bankOnly', 'cardOnly']) {
    const rows = personaRows(name);
    const plain = buildIncomeModel({ bankRows: rows, cfg, asOf });
    const withInvestments = buildIncomeModel({ bankRows: rows, cfg, asOf, investmentStatements });
    check(withInvestments, plain);
    assert.ok(withInvestments.investment.distributions.length > 0);
    assert.deepEqual(plain.investment.distributions, []);
    assert.strictEqual(withInvestments, buildIncomeModel({ bankRows: rows, cfg, asOf, investmentStatements }));
    assert.notStrictEqual(withInvestments, plain);
    assert.throws(() => check({ ...withInvestments, investment: { ...withInvestments.investment, countsTowardTakeHome: true } }, plain));
    assert.throws(() => check({ ...withInvestments, takeHome: { ...withInvestments.takeHome, amount: withInvestments.takeHome.amount + 1 } }, plain));
  }
});
