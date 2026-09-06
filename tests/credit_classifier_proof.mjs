import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { classifyCredit, creditCategoryExplanation, effectiveCreditIncomeTotal, matchingIncomeRule } from '../application/analysis/credit-classifier.js';
import { categoryMeta } from '../application/analysis/category-flow.js';
import { makeConfirmation } from '../application/analysis/confirmations.js';
import { isCountedBankIncome } from '../application/core/shared-helpers.js';

const cfg = JSON.parse(readFileSync(new URL('../settings/config.json', import.meta.url), 'utf8'));
const credit = (description, extra = {}) => ({
  id: 'synthetic-credit', direction: 'in', type: '', description, raw_description: description,
  internalTransfer: false, refund: false, cashDeposit: false, excludedFromIncome: false,
  transferKey: 'synthetic-counterparty', counterpartyKey: 'synthetic-counterparty', ...extra,
});
const label = (row, context = {}) => classifyCredit(row, { cfg, ...context });
const rejectMutation = (check, value) => assert.throws(() => check(value));

test('rules and channel vocabulary are declared without names or automatic figure contradictions', () => {
  assert.deepEqual(cfg.channelWords, ['direct credit', 'scotia direct credit', 'ach', 'electronic credit', 'transfer', 'funds', 'payment', 'credit']);
  const active = new Set(['Money in', 'Salary', 'Bonus', 'Pension', 'Government benefits', 'Interest', 'Dividends', 'Refund / Reversal']);
  const inactive = new Set(['Expense reimbursement', 'Tax refund', 'Loan proceeds', 'Investment withdrawal']);
  for (const rule of cfg.incomeRules) {
    assert.ok(categoryMeta(cfg, rule.category));
    assert.ok(['type', 'description'].includes(rule.field));
    assert.ok(Array.isArray(rule.words) && rule.words.length);
    assert.ok(Array.isArray(rule.exclude));
    assert.equal(typeof rule.active, 'boolean');
    assert.ok(rule.active ? active.has(rule.category) : inactive.has(rule.category));
    for (const word of [...rule.words, ...(rule.prefix || []), ...rule.exclude]) {
      assert.match(word, /^[A-Z ]+$/);
      assert.ok(!cfg.channelWords.some((channel) => channel.toUpperCase() === word));
    }
  }
  for (const name of inactive) assert.ok(cfg.incomeRules.some((rule) => rule.category === name && rule.active === false));
  rejectMutation((rules) => assert.ok(rules.every((rule) => !(inactive.has(rule.category) && rule.active))), [{ ...cfg.incomeRules.at(-1), active: true }]);
});

test('whole words, raw and cleaned descriptions, type, exclusions and case decide wording', () => {
  const cases = [
    ['DIRECT CREDIT', {}, 'Money in'],
    ['ACH TRANSFER FUNDS PAYMENT CREDIT', {}, 'Money in'],
    ['SALARY ADVANCE', {}, 'Money in'],
    ['SALARY LOAN', {}, 'Money in'],
    ['SALARYMAN', {}, 'Money in'],
    ['PAYROLLS', {}, 'Money in'],
    ['GRANT', {}, 'Money in'],
    ['RENT', {}, 'Money in'],
    ['sAlArY', {}, 'Salary'],
    ['wages', {}, 'Salary'],
    ['PAYROLL CREDIT', {}, 'Salary'],
    ['DIRECT CREDIT', { raw_description: 'PAYROLL DIRECT CREDIT' }, 'Salary'],
    ['DIRECT CREDIT', { type: 'SaLaRy' }, 'Salary'],
    ['SALARY ADVANCE', { type: 'SALARY' }, 'Money in'],
    ['BONUS PAYMENT', {}, 'Bonus'],
    ['PENSION PAYMENT', {}, 'Pension'],
    ['ANNUITY', {}, 'Pension'],
    ['DIRECT CREDIT', { type: 'INTEREST PAYMENT' }, 'Interest'],
    ['interest credit', {}, 'Interest'],
    ['DIVIDEND PAYMENT', {}, 'Dividends'],
    ['GOVERNMENT BENEFIT', {}, 'Government benefits'],
    ['NIS BENEFIT', {}, 'Government benefits'],
    ['BENEFIT', {}, 'Money in'],
    ['REIMBURSEMENT', {}, 'Money in'],
    ['TAX REFUND', {}, 'Money in'],
    ['LOAN ADVANCE', {}, 'Money in'],
    ['REDEMPTION', {}, 'Money in'],
  ];
  for (const [description, extra, expected] of cases) {
    const actual = label(credit(description, extra));
    assert.equal(actual.category, expected, `${description} / ${extra.type || ''}`);
    assert.equal(actual.basis, expected === 'Money in' ? 'default' : 'wording');
  }
  const payroll = label(credit('DIRECT CREDIT', { raw_description: 'PAYROLL DIRECT CREDIT' }));
  assert.deepEqual(payroll.evidence, { field: 'description', source: 'raw_description', token: 'PAYROLL', match: 'prefix' });
  assert.equal(creditCategoryExplanation(payroll), 'Salary: the description says payroll');
  assert.equal(matchingIncomeRule(credit('SALARY LOAN'), cfg.incomeRules[1]), null);
  rejectMutation((row) => assert.equal(label(row).category, 'Money in'), credit('SALARY'));
  rejectMutation((row) => assert.equal(label(row).category, 'Salary'), credit('SALARYMAN'));
});

test('person choices, confirmations and structural facts outrank wording in that order', () => {
  const row = credit('SALARY', { internalTransfer: true });
  assert.deepEqual([label(row).category, label(row).basis], ['Own-account transfer', 'structural']);
  assert.deepEqual([label({ ...row, categoryOverride: 'Groceries' }).category, label({ ...row, categoryOverride: 'Groceries' }).basis], ['Groceries', 'person']);
  assert.deepEqual([label(row, { personalCategory: 'Pension' }).category, label(row, { personalCategory: 'Pension' }).basis], ['Pension', 'person']);
  const transfer = makeConfirmation({ inference: 'transfer', subject: row.transferKey, answer: true });
  assert.deepEqual([label(credit('SALARY'), { confirmations: [transfer] }).category, label(credit('SALARY'), { confirmations: [transfer] }).basis], ['Own-account transfer', 'person']);
  const refund = makeConfirmation({ inference: 'refund', subject: row.id, answer: false });
  assert.equal(label(credit('SALARY'), { confirmations: [refund] }).category, 'Refund / Reversal');
  const income = makeConfirmation({ inference: 'income', subject: row.id, answer: true });
  assert.equal(label(credit('SALARY', { cashDeposit: true, excludedFromIncome: false }), { confirmations: [income] }).category, 'Money in');
  assert.equal(label(credit('SALARY', { refund: true })).category, 'Refund / Reversal');
  assert.equal(label(credit('SALARY', { cashDeposit: true, excludedFromIncome: true })).category, 'Cash deposit');
  assert.equal(label(credit('SALARY', { cashDeposit: true })).category, 'Money in');
  rejectMutation((candidate) => assert.equal(label(candidate).category, 'Own-account transfer'), { ...row, internalTransfer: false });
});

test('labels are deterministic and automatic categories keep the current income flag', () => {
  const rows = [credit('DIRECT CREDIT'), credit('salary'), credit('INTEREST', { type: 'INTEREST PAYMENT' }), credit('TRANSFER', { internalTransfer: true }), credit('REVERSAL', { refund: true }), credit('DEPOSIT', { excludedFromIncome: true })];
  for (const row of rows) {
    const first = label(row);
    assert.deepEqual(label(row), first);
    assert.deepEqual(label({ ...row, ...first }), first);
    assert.equal(categoryMeta(cfg, first.category).inIncomeTotal, isCountedBankIncome(row));
    assert.equal(effectiveCreditIncomeTotal(row, first, cfg), isCountedBankIncome(row));
  }
  const legacy = credit('DIRECT CREDIT', { categoryOverride: 'Groceries' });
  assert.equal(label(legacy).category, 'Groceries');
  assert.equal(effectiveCreditIncomeTotal(legacy, label(legacy), cfg), true);
  const wrong = { ...label(rows[0]), category: 'Cash deposit' };
  rejectMutation((candidate) => assert.equal(categoryMeta(cfg, candidate.category).inIncomeTotal, isCountedBankIncome(rows[0])), wrong);
});
