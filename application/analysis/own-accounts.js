import { amtOf, bankAccountIdentity, ccyOf, parseTransferNarrative } from '../core/shared-helpers.js';
import { answerFor, declaredOwnAccounts, ownSubject } from './confirmations.js';

export const OWN_ACCOUNT_MIN_DIGITS = 4;
export const OWN_ACCOUNT_SUGGEST_MONTHS = 3;
export const OWN_ACCOUNT_SUGGEST_SHARE = 0.05;

export function parseAccountEntry(text) {
  const raw = String(text == null ? '' : text).trim();
  if (!raw) return { error: 'empty' };
  if (/[^\d\s-]/.test(raw)) return { error: 'characters' };
  const digits = raw.replace(/\D/g, '');
  if (digits.length < OWN_ACCOUNT_MIN_DIGITS) return { error: 'short' };
  return { id: bankAccountIdentity(digits) };
}

export function ownAccountRows({ bankRecords = [], cardAccounts = [], confirmations = [] } = {}) {
  const byId = new Map();
  const add = (id, source) => {
    if (id && !byId.has(id)) byId.set(id, { id, source, removable: source === 'declared' });
  };
  for (const record of bankRecords) if (record && record.account) add(bankAccountIdentity(record.account), 'statement');
  for (const card of cardAccounts) add(bankAccountIdentity(card), 'card');
  for (const id of declaredOwnAccounts(confirmations)) add(id, 'declared');
  return [...byId.values()];
}

const partyOf = (row) =>
  parseTransferNarrative(row.description || row.type || '')
    .party.replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export function suggestedOwnAccounts(
  rows,
  confirmations,
  { minMonths = OWN_ACCOUNT_SUGGEST_MONTHS, minShare = OWN_ACCOUNT_SUGGEST_SHARE, baseCurrency = 'JMD' } = {}
) {
  let moved = 0;
  for (const row of rows || [])
    if (row && !row.internalTransfer && ccyOf(row, baseCurrency) === baseCurrency) moved += amtOf(row);
  const ownNames = new Set();
  for (const row of rows || []) {
    if (row && row.internalTransfer && row.transferAccount && partyOf(row)) ownNames.add(partyOf(row));
  }
  const byTail = new Map();
  for (const row of rows || []) {
    if (!row || row.internalTransfer || !row.transferAccount) continue;
    const id = row.transferAccount;
    if (answerFor(confirmations, 'transfer', [ownSubject(id)]) !== null) continue;
    const entry = byTail.get(id) || { id, months: new Set(), rows: 0, amount: 0, nameHint: false };
    entry.months.add(String(row.date || '').slice(0, 7));
    entry.rows += 1;
    if (ccyOf(row, baseCurrency) === baseCurrency) entry.amount += amtOf(row);
    if (ownNames.has(partyOf(row))) entry.nameHint = true;
    byTail.set(id, entry);
  }
  return [...byTail.values()]
    .filter((entry) => entry.months.size >= minMonths && moved > 0 && entry.amount / moved >= minShare)
    .map((entry) => ({ id: entry.id, months: entry.months.size, rows: entry.rows, nameHint: entry.nameHint }))
    .sort((a, b) => Number(b.nameHint) - Number(a.nameHint) || b.months - a.months || b.rows - a.rows || a.id.localeCompare(b.id));
}
