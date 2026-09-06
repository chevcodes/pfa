import test from 'node:test';
import assert from 'node:assert/strict';
import { makePaymentObligation, paymentDate, paymentMatch, paymentCoverage, paymentEvents } from '../application/analysis/payment-obligations.js';

const rent = makePaymentObligation({ id: 'rent', label: 'Rent', category: 'Rent', payeeKey: 'LANDLORD', account: 'BANK-1', amount: 80000, dueDay: 5, startDate: '2026-01-01', sourceTxnId: 'rent-aug' }, '2026-08-06T12:00:00Z');
const rows = [
  { id: 'rent-aug', date: '2026-08-05', account: 'BANK-1', direction: 'out', amount: 80000, counterpartyKey: 'LANDLORD' },
  { id: 'rent-sep', date: '2026-09-05', account: 'BANK-1', direction: 'out', amount: 80000, counterpartyKey: 'LANDLORD' },
];
const balances = [
  { ledger: 'bank', account: 'BANK-1', currency: 'JMD', balance: 100000, asOf: '2026-09-08' },
  { ledger: 'bank', account: 'BANK-2', currency: 'JMD', balance: 25000, asOf: '2026-09-08' },
];

test('posted rent is matched once and next month remains due', () => {
  assert.equal(paymentMatch(rent, '2026-09-05', rows).row?.id, 'rent-sep');
  const result = paymentCoverage(rent, { rows, balances, asOf: '2026-09-09' });
  assert.equal(result.occurrence.date, '2026-10-05');
  assert.equal(result.lastPosted?.id, 'rent-sep');
  assert.equal(result.lastPostedMatch, true);
  assert.equal(result.recordedStatus, 'covered');
  assert.equal(result.otherCash, 25000);
  assert.equal(paymentEvents([rent], rows, '2026-09-09', '2026-10-10').length, 1);
});

test('prior payment and pay arriving after rent do not create false coverage', () => {
  const other = makePaymentObligation({ id: 'bill', label: 'Bill', payeeKey: 'BILL', account: 'BANK-1', amount: 30000, dueDay: 2, startDate: '2026-01-01' });
  const paidAugustBill = { id: 'bill-aug', date: '2026-08-02', account: 'BANK-1', direction: 'out', amount: 30000, counterpartyKey: 'BILL' };
  const paidBill = { id: 'bill-sep', date: '2026-09-02', account: 'BANK-1', direction: 'out', amount: 30000, counterpartyKey: 'BILL' };
  const result = paymentCoverage(rent, { rows: [...rows, paidAugustBill, paidBill], balances, otherPayments: [other], income: { date: '2026-10-06', amount: 100000, account: 'BANK-1' }, asOf: '2026-09-09' });
  assert.equal(result.recordedRemainder, -10000);
  assert.equal(result.projectedRemainder, -10000);
  assert.equal(result.forecastStatus, 'projected-short');
});

test('an unmatched past due payment remains visible and is reserved in the forecast', () => {
  const result = paymentCoverage(rent, { rows: [rows[0]], balances, asOf: '2026-09-09' });
  assert.equal(result.occurrence.date, '2026-09-05');
  assert.equal(paymentEvents([rent], [rows[0]], '2026-09-09', '2026-10-10')[0].label, 'Rent (past due)');
});

test('a stale or missing payment-account balance cannot claim coverage', () => {
  assert.equal(paymentCoverage(rent, { rows, balances: [], asOf: '2026-09-09' }).recordedStatus, 'unknown');
  assert.equal(paymentCoverage(rent, { rows, balances: [{ ...balances[0], asOf: '2026-07-01' }], asOf: '2026-09-09' }).recordedStatus, 'unknown');
});

test('ambiguous match needs a person and an end date stops future events', () => {
  const duplicate = { ...rows[1], id: 'rent-sep-duplicate' };
  assert.equal(paymentMatch(rent, '2026-09-05', [...rows, duplicate]).status, 'ambiguous');
  const chosen = { ...rent, matchOverrides: { '2026-09': 'rent-sep' } };
  assert.equal(paymentMatch(chosen, '2026-09-05', [...rows, duplicate]).status, 'person');
  const rejected = { ...rent, matchOverrides: { '2026-09': 'unmatched' } };
  assert.equal(paymentMatch(rejected, '2026-09-05', rows).row, null);
  assert.equal(paymentMatch(rejected, '2026-09-05', rows).candidates.length, 1);
  const rejectedCoverage = paymentCoverage(rejected, { rows, balances, asOf: '2026-09-09' });
  assert.equal(rejectedCoverage.occurrence.date, '2026-09-05');
  assert.equal(rejectedCoverage.lastPostedMatch, false);
  const ended = { ...rent, endDate: '2026-10-05' };
  assert.equal(paymentDate(ended, '2026-11'), null);
  assert.equal(paymentEvents([ended], rows, '2026-09-09', '2026-12-31').length, 1);
});

test('same-day income and cash in another account are not treated as rent-account cash', () => {
  const result = paymentCoverage(rent, { rows, balances: [{ ...balances[0], balance: 50000 }, balances[1]], income: { date: '2026-10-05', amount: 100000, account: 'BANK-1' }, asOf: '2026-09-09' });
  assert.equal(result.incoming, 0);
  assert.equal(result.recordedStatus, 'short');
  assert.equal(result.forecastStatus, 'unknown');
  assert.ok(result.gaps.some((gap) => gap.includes('ordering is unknown')));
  assert.equal(result.otherCash, 25000);
});

test('income before rent changes only the forecast, not recorded-cash coverage', () => {
  const result = paymentCoverage(rent, { rows, balances: [{ ...balances[0], balance: 50000 }], income: { date: '2026-10-04', amount: 100000, account: 'BANK-1' }, asOf: '2026-09-09' });
  assert.equal(result.recordedStatus, 'short');
  assert.equal(result.forecastStatus, 'projected-covered');
  assert.equal(result.recordedRemainder, -30000);
  assert.equal(result.projectedRemainder, 70000);
});

test('own-account transfers and card settlements do not settle rent', () => {
  const transfer = { id: 'transfer', date: '2026-10-05', account: 'BANK-1', direction: 'out', amount: 80000, counterpartyKey: 'LANDLORD', internalTransfer: true };
  const card = { id: 'card-payment', date: '2026-10-05', account: 'BANK-1', direction: 'out', amount: 80000, counterpartyKey: 'CARD' };
  assert.equal(paymentMatch(rent, '2026-10-05', [...rows, transfer, card]).row, null);
});
