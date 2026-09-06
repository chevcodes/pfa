import { addDaysIso, amtOf, dateOf, daysBetweenIso, dirOf, isInternal, roundMoney } from '../core/shared-helpers.js';

function monthOf(date) {
  return String(date || '').slice(0, 7);
}

function nextMonth(month) {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  if (!year || number < 1 || number > 12) return '';
  const date = new Date(Date.UTC(year, number, 1));
  return date.toISOString().slice(0, 7);
}

function previousMonth(month) {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  if (!year || number < 1 || number > 12) return '';
  return new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 7);
}

export function paymentDate(payment, month) {
  const year = Number(String(month).slice(0, 4));
  const number = Number(String(month).slice(5, 7));
  if (!year || number < 1 || number > 12) return null;
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const day = Math.min(last, Number(payment.dueDay));
  if (!day || day < 1) return null;
  const date = `${month}-${String(day).padStart(2, '0')}`;
  if (payment.startDate && date < payment.startDate) return null;
  if (payment.endDate && date > payment.endDate) return null;
  return date;
}

export function makePaymentObligation(input, now = new Date().toISOString()) {
  const label = String(input.label || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const account = String(input.account || '').trim();
  const amount = roundMoney(Number(input.amount));
  const dueDay = Number(input.dueDay);
  const startDate = String(input.startDate || now.slice(0, 10));
  const endDate = input.endDate ? String(input.endDate) : null;
  if (!label || !account || !Number.isFinite(amount) || amount <= 0)
    throw new Error('A payment needs a name, a payment account and an amount above zero.');
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
    throw new Error('Choose a due day from 1 to 31.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)))
    throw new Error('Choose a valid start date and an end date after it.');
  return {
    id: input.id || `payment_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    label,
    category: String(input.category || ''),
    payeeKey: String(input.payeeKey || ''),
    account,
    amount,
    dueDay,
    startDate,
    endDate,
    sourceTxnId: String(input.sourceTxnId || ''),
    matchOverrides: input.matchOverrides && typeof input.matchOverrides === 'object' ? { ...input.matchOverrides } : {},
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

export function sanitisePaymentObligations(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    if (!value || !value.id || seen.has(value.id)) continue;
    try {
      const payment = makePaymentObligation(value, value.updatedAt || value.createdAt || new Date().toISOString());
      seen.add(payment.id);
      out.push(payment);
    } catch {
      continue;
    }
  }
  return out;
}

export function paymentMatch(payment, dueDate, rows) {
  const month = monthOf(dueDate);
  const override = payment.matchOverrides?.[month];
  const candidates = (rows || []).filter((row) => {
    if (String(row.account || '') !== payment.account || dirOf(row) !== 'out' || isInternal(row)) return false;
    if (String(row.id) === payment.sourceTxnId) return monthOf(dateOf(row)) === month;
    if (payment.payeeKey && String(row.counterpartyKey || '') !== payment.payeeKey) return false;
    if (!payment.payeeKey) return false;
    if (Math.abs(amtOf(row) - payment.amount) > Math.max(1, payment.amount * 0.15)) return false;
    const distance = daysBetweenIso(dateOf(row), dueDate);
    return distance != null && Math.abs(distance) <= 5;
  });
  if (override === 'unmatched') return { status: 'unmatched', row: null, candidates };
  if (override) {
    const row = (rows || []).find((item) => String(item.id) === String(override));
    return row && String(row.account || '') === payment.account && dirOf(row) === 'out' && !isInternal(row)
      ? { status: 'person', row, candidates }
      : { status: 'missing', row: null, candidates };
  }
  if (candidates.length === 1) return { status: 'inferred', row: candidates[0], candidates };
  return { status: candidates.length > 1 ? 'ambiguous' : 'unmatched', row: null, candidates };
}

export function nextPayment(payment, rows, asOf) {
  let month = previousMonth(monthOf(asOf));
  for (let index = 0; index < 16; index++) {
    const date = paymentDate(payment, month);
    if (date) {
      const match = paymentMatch(payment, date, rows);
      if (!match.row) return { date, ...match };
    }
    month = nextMonth(month);
    if (!month) break;
  }
  return null;
}

export function paymentEvents(payments, rows, asOf, endDate) {
  const events = [];
  for (const payment of payments || []) {
    let month = previousMonth(monthOf(asOf));
    for (let index = 0; index < 24; index++) {
      const date = paymentDate(payment, month);
      if (date && date <= endDate && !paymentMatch(payment, date, rows).row)
        events.push({ key: payment.payeeKey || payment.id, paymentId: payment.id, label: date <= asOf ? `${payment.label} (past due)` : payment.label, account: payment.account, amount: payment.amount, date: date <= asOf ? addDaysIso(asOf, 1) : date, basis: 'person' });
      month = nextMonth(month);
      if (!month || `${month}-01` > endDate) break;
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function paymentStatusText(status) {
  return {
    paid: 'paid',
    covered: 'covered by recorded cash',
    short: 'short on recorded cash',
    unknown: 'uncertain from the available records',
    'projected-covered': 'covered if expected pay arrives',
    'projected-short': 'short even with expected pay',
  }[status] || 'uncertain from the available records';
}

export function paymentCoverage(payment, { rows = [], balances = [], otherPayments = [], inferredPayments = [], income = null, card = null, asOf, baseCurrency = 'JMD', maxAgeDays = 14 } = {}) {
  const occurrence = nextPayment(payment, rows, asOf);
  if (!occurrence) return null;
  const lastPosted = [...rows].filter((row) => String(row.account || '') === payment.account && dirOf(row) === 'out' && !isInternal(row) && dateOf(row) <= asOf && (String(row.id) === payment.sourceTxnId || (payment.payeeKey && row.counterpartyKey === payment.payeeKey && Math.abs(amtOf(row) - payment.amount) <= Math.max(1, payment.amount * 0.15))))
    .sort((a, b) => dateOf(b).localeCompare(dateOf(a)))[0] || null;
  const lastPostedDate = lastPosted ? paymentDate(payment, monthOf(dateOf(lastPosted))) : null;
  const lastPostedMatch = lastPostedDate && paymentMatch(payment, lastPostedDate, rows).row?.id === lastPosted?.id;
  const account = balances.find((item) => item.ledger === 'bank' && String(item.account) === payment.account && item.currency === baseCurrency);
  const otherCash = balances.filter((item) => item.ledger === 'bank' && String(item.account) !== payment.account && item.currency === baseCurrency)
    .reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const prior = paymentEvents(otherPayments, rows, asOf, occurrence.date)
    .filter((event) => event.account === payment.account && event.date < occurrence.date);
  const governed = new Set((otherPayments || []).map((item) => `${item.account}:${item.payeeKey}`));
  for (const item of inferredPayments || []) {
    if (item.account !== payment.account || item.date <= asOf || item.date >= occurrence.date || governed.has(`${item.account}:${item.key}`)) continue;
    prior.push(item);
  }
  const priorTotal = roundMoney(prior.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const balance = account && Number.isFinite(Number(account.balance)) ? Number(account.balance) : null;
  const age = account?.asOf ? daysBetweenIso(account.asOf, asOf) : null;
  const unknownCard = card && Number(card.amount) > 0 && card.dueDate > asOf && card.dueDate < occurrence.date;
  const recordedGaps = [];
  if (balance == null || !account?.asOf) recordedGaps.push('no recorded balance for the payment account');
  else if (!Number.isFinite(age) || age < 0 || age > maxAgeDays) recordedGaps.push('payment account balance is stale');
  if (unknownCard) recordedGaps.push('card payment account is unknown');
  if (occurrence.status === 'ambiguous' || occurrence.status === 'missing') recordedGaps.push('payment match needs review');
  const recordedAfterPrior = balance == null ? null : roundMoney(balance - priorTotal);
  const recordedRemainder = recordedAfterPrior == null ? null : roundMoney(recordedAfterPrior - payment.amount);
  const incomeAccount = income?.account || null;
  const incoming = income && income.date > asOf && income.date < occurrence.date && incomeAccount === payment.account ? Number(income.amount) : 0;
  const forecastGaps = [...recordedGaps];
  if (income && income.date > asOf && income.date < occurrence.date && !incomeAccount) forecastGaps.push('expected pay account is unknown');
  if (income && income.date === occurrence.date) forecastGaps.push('pay and payment share a date; ordering is unknown');
  const projectedRemainder = recordedRemainder == null ? null : roundMoney(recordedRemainder + incoming);
  return {
    payment,
    occurrence,
    overdue: occurrence.date < asOf,
    lastPosted,
    lastPostedDate,
    lastPostedMatch,
    account,
    balance,
    otherCash: roundMoney(otherCash),
    prior,
    priorTotal,
    recordedAfterPrior,
    recordedRemainder,
    projectedRemainder,
    incoming,
    income,
    gaps: forecastGaps,
    recordedStatus: occurrence.row ? 'paid' : recordedGaps.length ? 'unknown' : recordedRemainder >= 0 ? 'covered' : 'short',
    forecastStatus: occurrence.row ? 'paid' : forecastGaps.length ? 'unknown' : projectedRemainder >= 0 ? 'projected-covered' : 'projected-short',
  };
}
