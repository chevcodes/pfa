import {
  roundMoney as r2,
  latestCardStatement,
  daysBetweenIso as daysBetween,
} from '../core/shared-helpers.js';
import { liquidBalance, resolveOpts } from './commitment-income.js';
import { coverageBankSpan, monthName } from './reporting-periods.js';
import { cardUtilisation } from './position.js';
import { monthsLabel } from './cushion.js';

export const NUDGE_AFTER_DAYS = 35;

function isoDate(value) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value == null ? '' : value));
  return m ? m[1] : null;
}

function newer(a, b) {
  if (a.asOf !== b.asOf) return a.asOf > b.asOf;
  return String(a.enteredAt || '') > String(b.enteredAt || '');
}

// Keyed on the WHOLE account number, not its last four digits: two accounts can
// share a tail (Position's own labels already handle that collision), and a
// shared key would let one account's typed balance overwrite another's.
export function accountId(account) {
  return String(account == null ? '' : account).replace(/[^A-Za-z0-9]/g, '');
}

export function balanceKey(ledger, account, currency) {
  return ledger === 'card' ? `card:${accountId(account)}` : `bank:${accountId(account)}:${currency}`;
}

export function parseBalanceInput(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || /^[^\d]*-/.test(text);
  const digits = text.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d+)?$/.test(digits) && !/^\.\d+$/.test(digits)) return NaN;
  const amount = Number(digits);
  return r2(negative ? -amount : amount);
}

export function knownAccounts({
  cashDebt = null,
  bankRecords = [],
  bankStatements = [],
  cardStatements = [],
} = {}) {
  const latestDate = new Map();
  const note = (identity, date) => {
    if (date && (!latestDate.has(identity) || date > latestDate.get(identity))) latestDate.set(identity, date);
  };
  for (const statement of bankStatements || []) {
    const span = coverageBankSpan(statement.period);
    if (span) note(accountId(statement.account), new Date(span[1]).toISOString().slice(0, 10));
  }
  for (const row of bankRecords || []) {
    note(accountId(row.account || row.Account), isoDate(row.date || row.Date));
  }
  const accounts = [];
  if (cashDebt && cashDebt.hasBankData !== false) {
    for (const account of cashDebt.accounts || []) {
      accounts.push({
        key: balanceKey('bank', account.account, account.currency),
        ledger: 'bank',
        account: account.account,
        currency: account.currency,
        anchor: {
          balance: r2(account.nativeBalance),
          date: latestDate.get(accountId(account.account)) || null,
        },
      });
    }
  }
  const card = latestCardStatement(cardStatements);
  if (card && card.newBalance != null) {
    accounts.push({
      key: balanceKey('card', card.account),
      ledger: 'card',
      account: card.account || '',
      currency: (cashDebt && cashDebt.baseCurrency) || null,
      anchor: { balance: r2(card.newBalance), date: isoDate(card.periodEnd) },
    });
  }
  return accounts;
}

export function snapshotRecords({ known = [], entries = {}, today, now, snapshotId }) {
  const records = [];
  const blanks = [];
  const invalid = [];
  for (const account of known) {
    const entry = entries[account.key] || {};
    const value = parseBalanceInput(entry.value);
    if (value === null) blanks.push(account.key);
    else if (!Number.isFinite(value)) invalid.push(account.key);
    else
      records.push({
        id: `${snapshotId}:${account.key}`,
        snapshotId,
        key: account.key,
        ledger: account.ledger,
        account: account.account,
        currency: account.currency,
        balance: value,
        asOf: today,
        enteredAt: now,
        carried: !!entry.carried && value === r2(entry.carriedValue),
      });
  }
  return { records, blanks, invalid };
}

export function resolveBalances({ known = [], updates = [] } = {}) {
  const byKey = new Map(known.map((account) => [account.key, account]));
  const newest = new Map();
  const superseded = [];
  let latest = null;
  for (const update of updates || []) {
    const account = byKey.get(update.key);
    if (!account || !isoDate(update.asOf) || !Number.isFinite(Number(update.balance))) continue;
    if (account.anchor.date && update.asOf <= account.anchor.date) {
      superseded.push(update);
      continue;
    }
    const current = newest.get(update.key);
    if (!current || newer(update, current)) newest.set(update.key, update);
    if (!latest || newer(update, latest)) latest = update;
  }
  const snapshotId = latest ? latest.snapshotId : null;
  const accounts = known.map((account) => {
    const update = newest.get(account.key);
    return update
      ? {
          ...account,
          balance: r2(update.balance),
          asOf: update.asOf,
          source: 'entered',
          update,
          inSnapshot: update.snapshotId === snapshotId,
        }
      : {
          ...account,
          balance: account.anchor.balance,
          asOf: account.anchor.date,
          source: 'statement',
          update: null,
          inSnapshot: false,
        };
  });
  const snapshot = latest
    ? {
        id: snapshotId,
        asOf: latest.asOf,
        typed: accounts.filter((account) => account.inSnapshot).map((account) => account.key),
        held: accounts.filter((account) => !account.inSnapshot),
      }
    : null;
  return { known, accounts, snapshot, superseded, active: !!snapshot };
}

export function overlayCashAndDebt(cashDebt, balances) {
  if (!cashDebt || !balances || !balances.active) return cashDebt;
  const base = cashDebt.baseCurrency;
  const enteredFor = (ledger, account, currency) =>
    balances.accounts.find(
      (item) =>
        item.source === 'entered' &&
        item.ledger === ledger &&
        (ledger === 'card' || (item.account === account && item.currency === currency))
    ) || null;
  let cash = false;
  const foreignEntered = {};
  const accounts = (cashDebt.accounts || []).map((account) => {
    const entered = enteredFor('bank', account.account, account.currency);
    if (!entered) return account;
    if (account.currency === base) cash = true;
    else foreignEntered[account.currency] = entered.asOf;
    return {
      ...account,
      nativeBalance: entered.balance,
      baseBalance: account.rate ? r2(entered.balance * account.rate) : null,
      enteredAsOf: entered.asOf,
    };
  });
  const perAccount = {};
  const foreign = {};
  let liquid = 0;
  for (const account of accounts) {
    if (account.currency === base) {
      perAccount[account.account] = account.nativeBalance;
      liquid += account.nativeBalance;
    } else {
      foreign[account.currency] = r2((foreign[account.currency] || 0) + account.nativeBalance);
    }
  }
  const card = enteredFor('card');
  const cardBalance = card ? card.balance : cashDebt.cardBalance;
  return {
    ...cashDebt,
    liquid: r2(liquid),
    perAccount,
    foreign,
    accounts,
    cardBalance,
    utilisation: card ? cardUtilisation(cardBalance, cashDebt.creditLimit) : cashDebt.utilisation,
    ifCardCleared: cardBalance != null ? r2(liquid - cardBalance) : null,
    entered: {
      asOf: balances.snapshot.asOf,
      cash,
      foreign: foreignEntered,
      card: !!card,
      held: balances.snapshot.held,
    },
  };
}

export function balanceFreshness(balances, today, afterDays = NUDGE_AFTER_DAYS) {
  if (!balances || !balances.known.length) return null;
  const dates = balances.accounts.map((account) => account.asOf).filter(Boolean).sort();
  const asOf = balances.active ? balances.snapshot.asOf : dates[dates.length - 1] || null;
  const ageDays = asOf ? daysBetween(asOf, today) : null;
  return {
    asOf,
    entered: balances.active,
    ageDays,
    stale: ageDays != null && ageDays > afterDays,
  };
}

export function spanSince(from, to) {
  const days = from && to ? daysBetween(from, to) : null;
  if (days == null) return { days: null, text: '' };
  if (days < 28) return { days, text: `${days} day${days === 1 ? '' : 's'}` };
  return { days, text: `about ${monthsLabel(Math.round(days / 30.44))}` };
}

export function statementMonthLabel(iso, today) {
  const name = monthName(String(iso).slice(0, 7));
  return String(iso).slice(0, 4) === String(today || '').slice(0, 4) ? name.replace(/ \d{4}$/, '') : name;
}

export function statementsPhrase(from, to, today) {
  const label = (iso) => statementMonthLabel(iso, today);
  if (!from) return 'your last statement';
  if (!to || from.slice(0, 7) === to.slice(0, 7)) return `your ${label(from)} statement`;
  return `your ${label(from)} to ${label(to)} statements`;
}

export function changeSinceStatements(balances, { today, baseCurrency } = {}) {
  if (!balances || !balances.active) return null;
  const rows = balances.accounts
    .filter((account) => account.inSnapshot && account.anchor.balance != null)
    .map((account) => {
      const change = r2(account.balance - account.anchor.balance);
      return {
        key: account.key,
        ledger: account.ledger,
        account: account.account,
        currency: account.currency,
        opening: account.anchor.balance,
        openingDate: account.anchor.date,
        closing: account.balance,
        closingDate: account.asOf,
        change,
        effect: account.ledger === 'card' ? -change : change,
      };
    });
  const counted = rows.filter((row) => row.ledger === 'card' || row.currency === baseCurrency);
  const openings = rows.map((row) => row.openingDate).filter(Boolean).sort();
  const from = openings[0] || null;
  const to = openings[openings.length - 1] || null;
  return {
    asOf: balances.snapshot.asOf,
    rows,
    net: r2(counted.reduce((sum, row) => sum + row.effect, 0)),
    separate: rows.filter((row) => !counted.includes(row)),
    notUpdated: balances.accounts.filter((account) => !account.inSnapshot),
    from,
    to,
    sameStatementMonth: !!from && from.slice(0, 7) === String(to).slice(0, 7),
    span: spanSince(to, today),
  };
}

export function reconcileEnteredBalances({ balances, bankRecords = [], cfg = {} } = {}) {
  const cleared = balances ? balances.superseded : [];
  const newestPerAccount = new Map();
  for (const update of cleared) {
    const current = newestPerAccount.get(update.key);
    if (!current || newer(update, current)) newestPerAccount.set(update.key, update);
  }
  const opts = resolveOpts(cfg);
  const comparisons = [...newestPerAccount.values()].map((update) => {
    if (update.ledger !== 'bank') return { update, actual: null, difference: null, unusual: false };
    const identity = accountId(update.account);
    const rows = (bankRecords || []).filter((row) => accountId(row.account || row.Account) === identity);
    const read = liquidBalance(rows, { ...opts, baseCurrency: update.currency }, update.asOf);
    const actual = Object.keys(read.perAccount).length ? r2(read.total) : null;
    const difference = actual == null ? null : r2(update.balance - actual);
    const unusual = difference != null && Math.abs(difference) > Math.max(1000, Math.abs(actual) * 0.1);
    return { update, actual, difference, unusual };
  });
  return { cleared, comparisons };
}

export function reconciliationMessage(comparisons, { money, nameOf }) {
  if (!comparisons || !comparisons.length) return '';
  const parts = comparisons.map(({ update, actual, difference, unusual }) => {
    const name = nameOf(update);
    if (actual == null) return `${name} now uses its statement`;
    const gap = Math.abs(difference);
    if (gap < 0.5) return `${name} matched exactly`;
    if (unusual) return `${name} differed by ${money(gap, update)} from the balance you entered`;
    return `${name} was within ${money(gap, update)}`;
  });
  const many = comparisons.length > 1;
  return `Your statements now cover the balance${many ? 's' : ''} you entered. On the day you entered ${many ? 'them' : 'it'}, ${parts.join('; ')}.`;
}
