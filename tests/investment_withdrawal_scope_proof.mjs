import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyLedgerRules, classifyInternalTransfers } from '../application/analysis/bank-analysis.js';
import { categoryConfirmation } from '../application/analysis/category-flow.js';
import { classifyCredit } from '../application/analysis/credit-classifier.js';
import { applyAnswer, makeConfirmation, pruneConfirmations, sanitiseConfirmations, scopesFor, transferSubjects } from '../application/analysis/confirmations.js';
import { isCountedBankIncome, withConfigDefaults } from '../application/core/shared-helpers.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const cfg = withConfigDefaults(JSON.parse(await readFile(join(root, 'settings/config.json'), 'utf8')));
const credit = (id, amount) => ({
  id, date: '2026-06-15', amount, direction: 'in', currency: 'JMD', account: '1111', type: 'CREDIT', description: 'EXAMPLE FUND MANAGERS',
});
const records = [credit('first', 150000), credit('second', 4000), { ...credit('other', 900), description: 'SOMEONE ELSE' }];
const classify = (confirmations = [], list = records) => applyLedgerRules(classifyInternalTransfers(list, [], [], null, confirmations), { confirmations });
const internal = (rows) => rows.map((row) => row.internalTransfer);
const answerOn = (inference, subject, scope) => applyAnswer([], { inference, subject, answer: true, scope }).confirmations;

test('a transfer answer can be given for one transaction and an inference with one natural level still refuses a second', () => {
  assert.deepEqual(scopesFor('transfer'), ['merchant', 'transaction']);
  assert.deepEqual(scopesFor('saving'), ['account']);
  assert.equal(makeConfirmation({ inference: 'transfer', subject: 'first', answer: true, scope: 'transaction' }).scope, 'transaction');
  assert.throws(() => makeConfirmation({ inference: 'saving', subject: 'first', answer: true, scope: 'transaction' }));
});

test('Investment withdrawal files a transaction-scoped transfer answer and Own-account transfer keeps its merchant one', () => {
  const row = classify()[0];
  assert.deepEqual(categoryConfirmation(cfg, 'Investment withdrawal', row), { inference: 'transfer', subject: 'first', scope: 'transaction', answer: true });
  const own = categoryConfirmation(cfg, 'Own-account transfer', row);
  assert.equal(own.scope, undefined);
  assert.equal(own.subject, row.transferKey);
  assert.equal(categoryConfirmation(cfg, 'Money in', row), null);
  assert.equal(categoryConfirmation(cfg, 'Investment withdrawal', { ...row, direction: 'out' }), null);
  for (const name of ['Investment withdrawal', 'Own-account transfer'])
    assert.ok(scopesFor('transfer').includes(categoryConfirmation(cfg, name, row).scope || 'merchant'));
});

test('a transaction answer excludes only that credit while a merchant answer would exclude every credit from the same payer', () => {
  const first = classify()[0];
  assert.deepEqual(internal(classify(answerOn('transfer', 'first', 'transaction'))), [true, false, false]);
  assert.deepEqual(internal(classify(answerOn('transfer', first.transferKey, 'merchant'))), [true, true, false]);
  const rows = classify(answerOn('transfer', 'first', 'transaction'));
  assert.deepEqual(rows.map((row) => isCountedBankIncome(row)), [false, true, true]);
});

test('the transaction answer is looked up by row id before any merchant answer and is not overturned by it', () => {
  const first = classify()[0];
  const merchantNo = applyAnswer([], { inference: 'transfer', subject: first.transferKey, answer: false }).confirmations;
  const both = applyAnswer(merchantNo, { inference: 'transfer', subject: 'first', answer: true, scope: 'transaction' }).confirmations;
  assert.deepEqual(internal(classify(both)), [true, false, false]);
  assert.deepEqual(internal(classify(merchantNo)), [false, false, false]);
  assert.deepEqual(transferSubjects(first), ['first', first.transferKey]);
  assert.deepEqual(transferSubjects({ transferKey: 'ext:X' }), ['ext:X']);
  assert.notEqual(JSON.stringify(internal(classify(both, records.map(({ id: _id, ...rest }) => rest)))), JSON.stringify(internal(classify(both))));
});

test('the label stays what the person chose, only the answered credit leaves income, and the answer goes with its row', () => {
  const answers = answerOn('transfer', 'first', 'transaction');
  const rows = classify(answers, records.map((row) => row.id === 'first' ? { ...row, categoryOverride: 'Investment withdrawal' } : row))
    .map((row) => row.direction === 'in' ? { ...row, creditClassification: classifyCredit(row, { cfg, confirmations: answers }) } : row);
  assert.equal(rows[0].creditClassification.category, 'Investment withdrawal');
  assert.equal(rows[0].creditClassification.basis, 'person');
  assert.equal(isCountedBankIncome(rows[0]), false);
  assert.equal(isCountedBankIncome(rows[1]), true);
  assert.deepEqual(sanitiseConfirmations(answers).map(({ scope, subject }) => [scope, subject]), [['transaction', 'first']]);
  assert.equal(pruneConfirmations(answers, new Set(['first'])).length, 1);
  assert.equal(pruneConfirmations(answers, new Set(['second'])).length, 0);
});

test('with no stored answers every classification is the same as before', () => {
  const plain = JSON.stringify(classify());
  assert.equal(JSON.stringify(classify([])), plain);
  assert.equal(JSON.stringify(classify(answerOn('transfer', 'missing', 'transaction'))), plain);
});
