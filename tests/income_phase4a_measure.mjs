import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PERSONAS } from '../application/sample-data/mock-data.js';
import { hashSeed, makeRng, buildCardLedger, buildBankLedger, buildInvestmentStatements } from '../application/sample-data/mock-generator.js';
import { classifyInternalTransfers, applyLedgerRules, counterpartyAccountTokens } from '../application/analysis/bank-analysis.js';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { applyAnswer, ownSubject, transferSubject, transferSubjects } from '../application/analysis/confirmations.js';
import { buildIncomeModel } from '../application/analysis/income-model.js';
import { sortedInvestmentStatements } from '../application/analysis/investments.js';
import { daysBetweenIso, isCountedBankIncome, median, withConfigDefaults } from '../application/core/shared-helpers.js';
import { setBankDescriptorCleanupRules } from '../application/statements/read-statements.js';
import { compileFromRaw } from '../application/statements/merchant-resolver.js';
import { waitForServer, closeServer, openBrowser, importStatementFolder } from './browser-harness.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AS_OF = '2026-09-30';
const FIXTURE = new URL('./fixtures/income-phase4a-measure.json', import.meta.url);
const enabled = process.env.PFA_INCOME_MEASURE === '1';
const TOLERANCES = [0, 0.5, 1, 2];
const WINDOWS = [3, 5, 10, 20];
const WORDS = ['redemption', 'encashment', 'dividend', 'interest', 'distribution'];
const config = withConfigDefaults(JSON.parse(await readFile(join(ROOT, 'settings/config.json'), 'utf8')));
const cleanupRules = (config.bankDescriptorCleanup?.rules || []).map((rule) => ({
  pattern: new RegExp(rule.pattern, rule.flags || 'i'), replacement: rule.replacement || '',
}));
setBankDescriptorCleanupRules(cleanupRules);
const resolver = compileFromRaw(JSON.parse(await readFile(join(ROOT, 'settings', config.merchants?.file || 'jamaica-merchants.json'), 'utf8')), config, cleanupRules);

const cents = (value) => Math.round(value * 100);
const round1 = (value) => Math.round(value * 10) / 10;
const text = (row) => [row.type, row.description, row.raw_description].filter(Boolean).join(' ');
const hasWord = (row, word) => new RegExp(`\\b${word}\\b`, 'i').test(text(row));
const classify = (records, { myAccounts = [], cardAccounts = [], confirmations = [] } = {}) =>
  applyLedgerRules(classifyInternalTransfers(records, myAccounts, cardAccounts, resolver, confirmations), { confirmations })
    .map((row) => row.direction === 'in' ? { ...row, creditClassification: classifyCredit(row, { cfg: config }) } : row);
const figures = (rows) => {
  const model = buildIncomeModel({ bankRows: rows, cfg: config, asOf: AS_OF });
  return { monthly: new Map(model.monthlyMoneyIn.map(({ month, amount }) => [month, amount])), takeHome: model.takeHome.amount };
};
const effect = (before, after) => {
  const months = [...new Set([...before.monthly.keys(), ...after.monthly.keys()])];
  const changed = months.filter((month) => cents(before.monthly.get(month) || 0) !== cents(after.monthly.get(month) || 0));
  const relative = changed.filter((month) => before.monthly.get(month) > 0)
    .map((month) => round1(100 * (before.monthly.get(month) - (after.monthly.get(month) || 0)) / before.monthly.get(month)));
  return {
    monthsChanged: changed.length,
    maxMonthPercent: relative.length ? Math.max(...relative) : 0,
    medianMonthPercent: round1(median(relative)),
    takeHomeChangePercent: before.takeHome ? round1(100 * (before.takeHome - after.takeHome) / before.takeHome) : 0,
  };
};

export function investmentWithdrawals(statements) {
  const seen = new Map();
  for (const statement of statements || []) for (const item of statement.cashActivity || []) {
    if (item.type !== 'W' || !item.date) continue;
    const key = `${statement.provider}|${statement.account}|${item.date}|${item.amount}|${item.currency}`;
    if (!seen.has(key)) seen.set(key, { date: item.date, amount: item.amount, currency: item.currency || null });
  }
  return [...seen.values()];
}

export function investmentTokens(statements, minimum) {
  const tokens = new Set();
  for (const statement of sortedInvestmentStatements(statements))
    for (const token of counterpartyAccountTokens(statement.account)) if (token.length >= minimum) tokens.add(token);
  return tokens;
}

const bearsToken = (row, tokens) => [...counterpartyAccountTokens(text(row))].some((token) => tokens.has(token));

export function matchesFor(withdrawal, credits, tolerance, window, base = 'JMD') {
  return credits.filter((row) => (row.currency || base) === (withdrawal.currency || base) &&
    Math.abs(row.amount - withdrawal.amount) <= (tolerance === 0 ? 0.005 : withdrawal.amount * tolerance / 100) &&
    Math.abs(daysBetweenIso(withdrawal.date, row.date)) <= window);
}

function matchStudy(withdrawals, credits, statements) {
  const variants = { any: null, tokens5: investmentTokens(statements, 5), tokens4: investmentTokens(statements, 4) };
  const table = [];
  for (const tolerance of TOLERANCES) for (const window of WINDOWS) {
    const cell = { tolerancePercent: tolerance, windowDays: window };
    for (const [name, tokens] of Object.entries(variants)) {
      const found = withdrawals.map((item) => matchesFor(item, credits, tolerance, window)
        .filter((row) => !tokens || bearsToken(row, tokens)));
      cell[name] = {
        withdrawalsWithCandidate: found.filter((list) => list.length).length,
        withdrawalsWithOneCandidate: found.filter((list) => list.length === 1).length,
        candidateCredits: new Set(found.flat()).size,
      };
    }
    table.push(cell);
  }
  return { withdrawals: withdrawals.length, tokenCounts: { five: variants.tokens5.size, four: variants.tokens4.size }, table };
}

function nearestStudy(withdrawals, rows, credits, base = 'JMD') {
  const buckets = { within5Percent: 0, within20Percent: 0, within50Percent: 0, over50Percent: 0, noCreditWithin20Days: 0 };
  let withCredit = 0;
  for (const item of withdrawals) {
    const near = credits.filter((row) => (row.currency || base) === (item.currency || base) && Math.abs(daysBetweenIso(item.date, row.date)) <= 20);
    if (!near.length) { buckets.noCreditWithin20Days++; continue; }
    withCredit++;
    const closest = Math.min(...near.map((row) => Math.abs(row.amount - item.amount) / item.amount));
    buckets[closest <= 0.05 ? 'within5Percent' : closest <= 0.2 ? 'within20Percent' : closest <= 0.5 ? 'within50Percent' : 'over50Percent']++;
  }
  return {
    withdrawals: withdrawals.length,
    withdrawalCurrencies: Object.fromEntries(Object.entries(withdrawals.reduce((found, item) => ({ ...found, [item.currency || base]: (found[item.currency || base] || 0) + 1 }), {})).sort(([a], [b]) => a.localeCompare(b))),
    withACreditWithin20Days: withCredit,
    closestAmountDifference: buckets,
    withAnyBankRowWithin10Days: withdrawals.filter((item) => rows.some((row) => Math.abs(daysBetweenIso(item.date, row.date)) <= 10)).length,
  };
}

function candidateSet(withdrawals, credits, statements) {
  const widest = new Set(withdrawals.flatMap((item) => matchesFor(item, credits, 2, 20)));
  const tokens = investmentTokens(statements, 5);
  const bearing = new Set(credits.filter((row) => bearsToken(row, tokens)));
  const payout = new Set(credits.filter((row) => ['redemption', 'encashment', 'distribution', 'dividend'].some((word) => hasWord(row, word))));
  return { widest, bearing, payout, all: new Set([...widest, ...bearing, ...payout]) };
}

function wordingStudy(credits, widest) {
  const result = {};
  for (const word of WORDS) {
    const hits = credits.filter((row) => hasWord(row, word));
    result[word] = {
      credits: hits.length,
      matchedToAWithdrawal: hits.filter((row) => widest.has(row)).length,
      matchedNothing: hits.filter((row) => !widest.has(row)).length,
      ...(word === 'interest' ? { ofWhichBankInterestType: hits.filter((row) => /\bINTEREST PAYMENT\b/i.test(row.type || '')).length } : {}),
    };
  }
  const payouts = credits.filter((row) => ['redemption', 'encashment', 'distribution', 'dividend'].some((word) => hasWord(row, word)));
  result.payoutWordsExcludingInterest = { credits: payouts.length, matchedNothing: payouts.filter((row) => !widest.has(row)).length };
  return result;
}

function ownershipStudy(records, statements, options, baseline) {
  const accounts = [...new Set(sortedInvestmentStatements(statements).map((statement) => String(statement.account)))];
  const declared = accounts.reduce((list, account) => applyAnswer(list, { inference: 'transfer', subject: ownSubject(account.replace(/\D/g, '').slice(-4)), answer: true }).confirmations, []);
  const variants = {
    accountsInIndex: classify(records, { ...options, myAccounts: accounts }),
    declaredByPerson: classify(records, { ...options, confirmations: declared }),
  };
  const before = figures(baseline);
  return Object.fromEntries(Object.entries(variants).map(([name, rows]) => {
    const flipped = rows.map((_row, index) => index).filter((index) => rows[index].internalTransfer !== baseline[index].internalTransfer);
    return [name, {
      investmentAccounts: accounts.length,
      rowsFlipped: {
        credits: flipped.filter((index) => rows[index].direction === 'in').length,
        debits: flipped.filter((index) => rows[index].direction === 'out').length,
      },
      countedCreditsFlipped: flipped.filter((index) => rows[index].direction === 'in' && isCountedBankIncome(baseline[index])).length,
      ...effect(before, figures(rows)),
    }];
  }));
}

function scopeStudy(rows, candidates) {
  const candidateRows = [...candidates].filter((row) => row.direction === 'in');
  const sharing = candidateRows.map((candidate) => {
    const subject = transferSubject(candidate);
    return rows.filter((row) => row !== candidate && !candidates.has(row) && subject && transferSubjects(row).includes(subject));
  });
  const others = sharing.flat();
  const byCategory = {};
  for (const row of others.filter((item) => item.direction === 'in')) {
    const name = row.creditClassification?.category || 'Unclassified';
    byCategory[name] = (byCategory[name] || 0) + 1;
  }
  return {
    candidates: candidateRows.length,
    candidatesWithAnotherRowOnTheSameSubject: sharing.filter((list) => list.length).length,
    otherCreditsOnTheSameSubject: others.filter((row) => row.direction === 'in').length,
    otherDebitsOnTheSameSubject: others.filter((row) => row.direction === 'out').length,
    otherCreditsCountedAsIncome: others.filter((row) => row.direction === 'in' && isCountedBankIncome(row)).length,
    otherCreditsByCategory: Object.fromEntries(Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b))),
  };
}

function correctionEffect(rows, withdrawals, statements, credits) {
  const before = figures(rows);
  const asTransfers = (set) => rows.map((row) => set.has(row) ? { ...row, internalTransfer: true } : row);
  const sets = {
    matchedOnlyOneWithin1PercentAnd10Days: new Set(withdrawals.map((item) => matchesFor(item, credits, 1, 10)).filter((list) => list.length === 1).flat()),
    anyWithin2PercentAnd20Days: new Set(withdrawals.flatMap((item) => matchesFor(item, credits, 2, 20))),
    bearingAnInvestmentAccountNumber: new Set(credits.filter((row) => bearsToken(row, investmentTokens(statements, 5)))),
    payoutWordsExcludingInterest: new Set(credits.filter((row) => ['redemption', 'encashment', 'distribution', 'dividend'].some((word) => hasWord(row, word)))),
  };
  return Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, {
    credits: set.size,
    currentlyCountedAsIncome: [...set].filter((row) => isCountedBankIncome(row)).length,
    ...effect(before, figures(asTransfers(set))),
  }]));
}

function study({ records, statements, options, label }) {
  const rows = classify(records, options);
  const credits = rows.filter((row) => row.direction === 'in');
  const withdrawals = investmentWithdrawals(statements);
  const candidates = candidateSet(withdrawals, credits, statements);
  return {
    label,
    bankRows: rows.length,
    credits: credits.length,
    investmentStatements: statements.length,
    withdrawals: withdrawals.length,
    matching: matchStudy(withdrawals, credits, statements),
    nearest: nearestStudy(withdrawals, rows, credits),
    candidateCredits: { matchedWithin2PercentAnd20Days: candidates.widest.size, bearingAnInvestmentAccountNumber: candidates.bearing.size, payoutWordsExcludingInterest: candidates.payout.size, any: candidates.all.size },
    wording: wordingStudy(credits, candidates.widest),
    ownership: ownershipStudy(records, statements, options, rows),
    scope: scopeStudy(rows, candidates.all),
    correction: correctionEffect(rows, withdrawals, statements, credits),
  };
}

function syntheticStudy(mutate = '') {
  const OriginalDate = globalThis.Date;
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [`${AS_OF}T12:00:00Z`])); }
    static now() { return OriginalDate.parse(`${AS_OF}T12:00:00Z`); }
  };
  try {
    return Object.fromEntries(['cardAndBank', 'bankOnly', 'cardOnly'].map((name) => {
      const persona = PERSONAS[name];
      const rng = makeRng(hashSeed(persona.seed));
      const card = persona.hasCard ? buildCardLedger(persona, rng) : null;
      if (!persona.hasBank) return [name, { hasBank: false }];
      const bank = buildBankLedger(persona, rng, card ? card.perStatement.map((statement) => statement.payments) : null);
      const statements = persona.investmentPlan ? buildInvestmentStatements(persona, rng).statements : [];
      const options = { myAccounts: (persona.accounts || []).map((account) => account.number), cardAccounts: [persona.cardAccount].filter(Boolean) };
      const records = [...bank.records];
      if (name === 'cardAndBank') {
        const template = records.find((row) => row.direction === 'in');
        const last = statements.at(-1);
        const account = String(statements[0].account);
        statements[statements.length - 1] = { ...last, cashActivity: [...last.cashActivity, { date: '2026-08-12', type: 'W', amount: 150000, currency: 'JMD', cashAccount: account }] };
        records.push(
          { ...template, id: 'synthetic-withdrawal-with-number', date: '2026-08-13', amount: mutate === 'amount' ? 150001 : 150000, type: 'TRANSFER', description: `TRANSFER FROM ${account.replace(/\D/g, '')}`, counterpartyKey: undefined },
          { ...template, id: 'synthetic-withdrawal-wording-only', date: '2026-08-14', amount: 100000, type: 'DEPOSIT', description: 'UNIT TRUST REDEMPTION' },
        );
        if (mutate === 'flag') records.pop();
      }
      return [name, { hasBank: true, ...study({ records, statements, options, label: name }) }];
    }));
  } finally { globalThis.Date = OriginalDate; }
}

test('investment withdrawal matching, ownership, scope and correction effect on synthetic data match the fixture', { skip: !enabled }, async () => {
  const actual = JSON.parse(JSON.stringify(syntheticStudy(process.env.PFA_INCOME_MUTATE || '')));
  if (process.env.PFA_UPDATE_INCOME_MEASURE === '1') return writeFile(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`);
  assert.deepEqual(actual, JSON.parse(await readFile(FIXTURE, 'utf8')));
});

test('a changed withdrawal or credit changes the measurement', { skip: !enabled }, () => {
  const intact = JSON.stringify(syntheticStudy());
  assert.notEqual(JSON.stringify(syntheticStudy('amount')), intact);
  assert.notEqual(JSON.stringify(syntheticStudy('flag')), intact);
});

test('real statements, aggregates only', { skip: !enabled || !process.env.PFA_INCOME_STATEMENTS_DIR }, async () => {
  const browser = await openBrowser();
  assert.ok(browser, 'The real-statement mode requires a browser');
  const server = spawn(process.execPath, [join(ROOT, 'developer-tools/serve.js')], {
    cwd: ROOT, env: { ...process.env, PORT: '0', PFA_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const origin = await waitForServer(server);
    const imported = await importStatementFolder(browser, origin, process.env.PFA_INCOME_STATEMENTS_DIR);
    const options = { cardAccounts: imported.cardStatements.map((statement) => statement.account).filter(Boolean) };
    const result = study({ records: imported.records, statements: imported.investmentStatements, options, label: 'real' });
    console.log(`Real statement investment-income measurement (aggregates only): ${JSON.stringify({ files: imported.fileCount, ...result }, null, 2)}`);
  } finally {
    await closeServer(server);
    await browser.close();
  }
});
