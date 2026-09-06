import {
  roundMoney,
  monthIndex,
  recurringStatus,
  medianDayOfMonth,
  isoDay,
  detectSustainedRise,
  typicalMonthlyValue,
  rowBalance,
  bankAccountIdentity,
  parseTransferNarrative,
  transferSentence,
  median,
  modifiedZ,
} from '../core/shared-helpers.js';
import { smartTitle } from '../statements/categorise.js';
import { bankTransactionIdentity, cleanBankCounterparty } from '../statements/read-statements.js';
import { isSetAside } from './set-aside.js';
import { answerFor, isConfirmed } from './confirmations.js';

/* The casing the app already declares for merchant names (config.keepUpper:
 * GCT, NCB, FCIB, NWC, ATM...) was never handed to the bank side, so every bank
 * counterparty was title-cased against an EMPTY set and read "Gct On Pos Tx
 * Fee" while the card row beside it read correctly. Populated at boot from the
 * same config the card side uses, exactly as setBankDescriptorCleanupRules
 * already pushes the cleanup rules in.
 *
 * Only keepUpper is taken. The small-word list is deliberately NOT applied here:
 * a bank narrative carries middle initials, and lower-casing a standalone "A"
 * turns "Chevaughn A Johnson" into "Chevaughn a Johnson".
 */
let CP_LABEL_SET = new Set();
export function setCounterpartyCasing(keepUpper) {
  if (keepUpper && typeof keepUpper[Symbol.iterator] === 'function')
    CP_LABEL_SET = new Set([...keepUpper, 'POS', 'ACH', 'LLC', 'LTD']);
}
const CP_SMALL_SET = new Set();
// THE casing for a bank counterparty, exported so the Accounts list reads the
// same set rather than keeping its own (it kept a second empty one, which is
// why the same row could read "GCT" in one place and "Gct" in another).
export const counterpartyTitle = (s) => smartTitle(s, CP_LABEL_SET, CP_SMALL_SET);
const cpTitle = counterpartyTitle;

export function counterpartyAccountTokens(desc) {
  const groups = String(desc || '').match(/\d{3,}/g) || [];
  const tokens = new Set();
  for (const g of groups) {
    tokens.add(g);
    if (g.length >= 4) tokens.add(g.slice(-4));
    if (g.length >= 5) tokens.add(g.slice(-5));
  }
  return tokens;
}

export function buildOwnAccountIndex(accounts = []) {
  const idx = new Map();
  for (const a of accounts) {
    const digits = String(a == null ? '' : a).replace(/\D/g, '');
    if (!digits) continue;
    const canonical = bankAccountIdentity(digits);
    idx.set(digits, canonical);
    if (digits.length >= 4) idx.set(digits.slice(-4), canonical);
    if (digits.length >= 5) idx.set(digits.slice(-5), canonical);
  }
  return idx;
}

/* `stated` is the person's answer about whether this really is a movement
 * between their own accounts (null when they have not said). It is applied
 * here rather than after the fact because the answer changes WHO the other
 * party is, not just a flag: a number that merely shares its last four digits
 * with one of your accounts belongs to somebody else, and once you say so the
 * row has to read as that person and be grouped with their other payments.
 * Saying the opposite keeps the party as printed and only moves the row out of
 * spending, which is the whole of what "it is my own account" means here. */
export function normaliseCounterparty(
  description,
  ownIndex = new Map(),
  resolver = null,
  stated = null
) {
  const tokens = counterpartyAccountTokens(description);
  if (stated !== false) {
    for (const t of tokens) {
      if (ownIndex.has(t)) {
        const id = ownIndex.get(t);
        return {
          key: 'own:' + id,
          label: 'Account ' + id,
          internal: true,
          account: id,
        };
      }
    }
  }

  if (resolver) {
    const r = resolver.resolve(description, { profile: 'bank' });
    if (r.merchant && r.incidentalInstitution) {
      return {
        key: r.groupKey ? 'ext:' + r.groupKey : 'ext:unknown',
        label: r.payee ? cpTitle(r.payee) : 'Unknown',
        internal: stated === true,
        account: null,
      };
    }
    if (r.merchant) {
      return {
        key: r.groupKey ? 'ext:' + r.groupKey : 'ext:unknown',
        label: r.displayLabel || cpTitle(r.cleaned),
        internal: stated === true,
        account: null,
      };
    }
  }

  // The same shared parser the resolver and the Accounts list read, so a
  // channel code learned once is understood on every surface at once.
  const cleaned = parseTransferNarrative(cleanBankCounterparty(description)).party;
  const key = cleaned.toUpperCase();
  return {
    key: key ? 'ext:' + key : 'ext:unknown',
    label: cleaned ? cpTitle(cleaned) : 'Unknown',
    internal: stated === true,
    account: null,
  };
}

export function classifyInternalTransfers(
  records,
  myAccounts = [],
  cardAccounts = [],
  resolver = null,
  confirmations = []
) {
  const ownNumbers = [];
  for (const r of records) if (r.account) ownNumbers.push(String(r.account));
  for (const a of myAccounts) ownNumbers.push(String(a));
  for (const a of cardAccounts) ownNumbers.push(String(a));
  const ownIndex = buildOwnAccountIndex(ownNumbers);
  return records.map((r) => {
    const own = r.description && r.description.trim() ? r.description : r.type || r.description;
    const cpText = r.attachedTo || own;
    // The answer is looked up against what the app WOULD have decided on its
    // own, never against the result of applying it - otherwise the subject of
    // an answer would change the moment it was given and the answer would stop
    // matching its own row. transferKey carries that inferred key onto the row
    // so every surface asks the question the same way.
    const inferred = normaliseCounterparty(cpText, ownIndex, resolver);
    const stated = answerFor(confirmations, 'transfer', [inferred.key]);
    const n = stated === null ? inferred : normaliseCounterparty(cpText, ownIndex, resolver, stated);
    const out = {
      ...r,
      internalTransfer: n.internal,
      transferKey: inferred.key,
      counterpartyKey: n.key,
      counterpartyLabel: n.label,
      // What the transaction ROW says, which is a fuller thing than what the
      // grouped lists say. counterpartyLabel stays the bare party name because
      // a dozen surfaces group and total by it - a recurring-commitment list
      // reading "Transfer to Senior (via ACH)" five times would be nonsense.
      // The row can afford the whole sentence, and only the row uses this.
      //
      // Set ONLY for a row whose OWN narrative describes a transfer. Three
      // reasons, each a rule that already existed: an own-account move already
      // reads "Account 1234", which is clearer than any sentence; a fee or
      // reversal attached to a purchase must keep reading as the statement
      // printed it rather than being renamed to the merchant it hangs off
      // (hence `own`, never `cpText`, which is the ATTACHED purchase); and a
      // plain shop or employer is not a transfer, so transferSentence returns
      // '' and the row keeps the name it already had.
      narrative:
        n.internal || r.attachedTo ? '' : transferSentence(own, r.direction, cpTitle),
    };
    if (r.attachedTo && !out.displayName)
      out.displayName = normaliseCounterparty(own, ownIndex, resolver).label;
    return out;
  });
}

export function isCashSelfDeposit(r) {
  if (!r || r.direction !== 'in') return false;
  const t = String(r.type || '').toUpperCase();
  const d = String(r.description || '').toUpperCase();
  if (/\bABM\s*DEPOSIT\b/.test(t) || /\bABM\s*DEPOSIT\b/.test(d)) return true;
  if (/^DEPOSIT$/.test(t.trim())) return true; // plain cash lodgement
  if (/\bCASH\s*DEPOSIT\b/.test(t) || /\bCASH\s*DEPOSIT\b/.test(d)) return true;
  return false;
}

export function isBankRefund(r) {
  if (!r || r.direction !== 'in') return false;
  const t = String(r.type || '').toUpperCase();
  const d = String(r.description || '').toUpperCase();
  const re = /\b(REFUND|REVERSAL|POSREV|CHARGE ?BACK|CREDIT NOTE)\b/;
  return re.test(t) || re.test(d);
}

export function isStatutoryDeduction(r) {
  const hay =
    String((r && (r.counterpartyLabel || r.description)) || '') + ' ' + String((r && r.type) || '');
  return /withholding\s*tax|w\/h\s*tax|\bgct\b|g\.c\.t|\bpaye\b|p\.a\.y\.e|education\s*tax|income\s*tax|property\s*tax|stamp\s*duty|statutory\s*deduction|\bnis\b|\bnht\b/i.test(
    hay
  );
}

/* `confirmations` is the shared answer store (analysis/confirmations.js). A
 * machine deposit or a reversal is only ever a guess about whose money it is;
 * where the person has answered, the answer governs and the guess is not
 * consulted. */
export function applyLedgerRules(records, opts = {}) {
  const confirmations = opts.confirmations || [];
  const sharedTails = new Set(
    (opts.sharedAccounts || []).map((a) => String(a).replace(/\D/g, '').slice(-4)).filter(Boolean)
  );
  const householdPayees = (opts.householdPayees || []).map((s) => String(s).toUpperCase());
  return records.map((r) => {
    const id = r.id != null ? r.id : bankTransactionIdentity(r);
    const cashDeposit = isCashSelfDeposit(r);
    const excludedFromIncome = cashDeposit && !isConfirmed(confirmations, 'income', [id]);
    const refundLike = !r.internalTransfer && isBankRefund(r);
    // The reversal wording is only the app's guess at the commonest case. What
    // the answer really settles is "did I earn this, or is it money passing
    // through", which is a question about any money coming in - a friend
    // settling up, a cost reimbursed, a sum held for someone else. So the
    // answer governs on any incoming row, not only one the detector flagged,
    // and money the person says is not theirs to keep lands in the same
    // returned-money total it always has rather than in income.
    const statedReturn =
      !r.internalTransfer && r.direction === 'in'
        ? answerFor(confirmations, 'refund', [id])
        : null;
    const refund = statedReturn === null ? refundLike : !statedReturn;
    const acctTail = String(r.account || '').slice(-4);
    const cpUpper = String(r.counterpartyLabel || r.description || '').toUpperCase();
    const household =
      !r.internalTransfer &&
      r.direction === 'out' &&
      sharedTails.has(acctTail) &&
      householdPayees.some((p) => p && cpUpper.includes(p));
    return {
      ...r,
      id,
      cashDeposit,
      excludedFromIncome,
      refundLike,
      refund,
      household,
    };
  });
}

/* An account's latest recorded balance.
 *
 * Ordered by DATE THEN seq, the same key liquidBalance (commitment-income.js)
 * uses for the identical question on the Position tab. It previously sorted on
 * date alone; Array.prototype.sort is stable, so among several movements on the
 * closing day it kept the order they happened to arrive in from the statement
 * file, and read the balance off whichever of them landed last there. That is
 * not necessarily the last movement of the day.
 *
 * The effect was a per-account balance on Activity's account filter that
 * disagreed with the same account on Position - but only for accounts whose
 * final day carried more than one transaction, which is why some accounts
 * matched exactly and others were out by the size of one movement. Two
 * functions answering "what is the latest balance" must not order the day
 * differently.
 *
 * ORDERING WAS ONLY HALF OF IT. This also read the balance off `balanceAfter`
 * alone, while liquidBalance also accepts a raw `Running Balance` column. An
 * account whose most recent movement carried the column and not the field kept
 * reporting an OLDER balance here while Position reported the current one -
 * $944,106.45 against $1,052,352.71 on the same account. Both now read through
 * rowBalance (shared-helpers), so there is one answer to "what balance does
 * this row report".
 *
 * Rows in another currency are skipped rather than allowed to supply the
 * closing figure: an account's balance must not be reported in a currency the
 * caller never asked about. baseCurrency defaults to the account's own most
 * common currency when not supplied.
 */
export function accountClosingBalance(rows, baseCurrency = null) {
  let closing = null;
  const seqOf = (r) => (r && r.seq != null ? Number(r.seq) : 0);
  const ccy = (r) => r.currency || r.Currency || baseCurrency || null;
  const want =
    baseCurrency ||
    (() => {
      const counts = new Map();
      for (const r of rows) {
        const c = ccy(r);
        if (c) counts.set(c, (counts.get(c) || 0) + 1);
      }
      let best = null;
      for (const [c, n] of counts) if (!best || n > best[1]) best = [c, n];
      return best ? best[0] : null;
    })();
  const sorted = rows.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return seqOf(a) - seqOf(b);
  });
  for (const r of sorted) {
    if (want && ccy(r) && ccy(r) !== want) continue;
    const b = rowBalance(r);
    if (b != null) closing = b;
  }
  return closing;
}

export function analyseBankActivity(records, baseCurrency = 'JMD') {
  const byAcct = new Map();
  for (const r of records) {
    const k = r.account || 'unknown';
    if (!byAcct.has(k)) byAcct.set(k, []);
    byAcct.get(k).push(r);
  }
  const accounts = []; // every account, each carrying its own currency
  const foreignAccounts = []; // the non-base (e.g. USD) accounts, for side-by-side display

  let cashIn = 0,
    cashOut = 0,
    internalIn = 0,
    internalOut = 0,
    closingBalance = 0,
    anyClosing = false;
  let cashDeposits = 0,
    householdSupport = 0,
    refunds = 0;
  for (const [account, rows] of byAcct) {
    const acctCur = (rows.find((r) => r.currency) || {}).currency || baseCurrency;
    let aIn = 0,
      aOut = 0,
      iIn = 0,
      iOut = 0,
      aCashDep = 0,
      aHouse = 0,
      aRefund = 0;
    for (const r of rows) {
      if (r.internalTransfer) {
        if (r.direction === 'in') iIn = roundMoney(iIn + r.amount);
        else iOut = roundMoney(iOut + r.amount);
        continue;
      }
      if (r.direction === 'in') {
        if (r.refund) {
          aRefund = roundMoney(aRefund + r.amount);
          continue;
        } // money returned, not income
        if (r.excludedFromIncome) {
          aCashDep = roundMoney(aCashDep + r.amount);
          continue;
        } // not income by default
        aIn = roundMoney(aIn + r.amount);
      } else {
        if (r.household) {
          aHouse = roundMoney(aHouse + r.amount);
          continue;
        } // support to household, off the personal headline
        aOut = roundMoney(aOut + r.amount);
      }
    }
    const close = accountClosingBalance(rows, acctCur);
    const acct = {
      account,
      currency: acctCur,
      n: rows.length,
      cashIn: aIn,
      cashOut: aOut,
      internalIn: iIn,
      internalOut: iOut,
      closingBalance: close,
      cashDeposits: aCashDep,
      householdSupport: aHouse,
      refunds: aRefund,
      months: [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort(),
    };
    accounts.push(acct);
    if (acctCur === baseCurrency) {
      if (close != null) {
        anyClosing = true;
        closingBalance = roundMoney(closingBalance + close);
      }
      cashIn = roundMoney(cashIn + aIn);
      cashOut = roundMoney(cashOut + aOut);
      internalIn = roundMoney(internalIn + iIn);
      internalOut = roundMoney(internalOut + iOut);
      cashDeposits = roundMoney(cashDeposits + aCashDep);
      householdSupport = roundMoney(householdSupport + aHouse);
      refunds = roundMoney(refunds + aRefund);
    } else {
      foreignAccounts.push(acct);
    }
  }
  accounts.sort((a, b) => String(a.account).localeCompare(String(b.account)));
  foreignAccounts.sort((a, b) => String(a.account).localeCompare(String(b.account)));
  const baseRecords = records.filter((r) => (r.currency || baseCurrency) === baseCurrency);
  return {
    n: records.length,
    baseCurrency,
    accounts,
    foreignAccounts,
    cashIn,
    cashOut,
    net: roundMoney(cashIn - cashOut),
    internalIn,
    internalOut,
    closingBalance: anyClosing ? closingBalance : null,
    cashDeposits,
    householdSupport,
    refunds,
    months: [...new Set(baseRecords.map((r) => r.date.slice(0, 7)))].sort(),
  };
}

export function bankCounterpartyGroups(records, baseCurrency = 'JMD') {
  const byKey = new Map();
  for (const r of records) {
    if ((r.currency || baseCurrency) !== baseCurrency) continue;
    const key = r.counterpartyKey || 'ext:' + String(r.description || 'unknown').toUpperCase();
    if (!byKey.has(key))
      byKey.set(key, {
        key,
        label: r.counterpartyLabel || r.description || key,
        internal: !!r.internalTransfer,
        moneyIn: 0,
        moneyOut: 0,
        count: 0,
        accounts: new Set(),
      });
    const g = byKey.get(key);
    if (r.direction === 'in') g.moneyIn = roundMoney(g.moneyIn + r.amount);
    else g.moneyOut = roundMoney(g.moneyOut + r.amount);
    g.count++;
    if (r.account) g.accounts.add(r.account);
  }
  return [...byKey.values()]
    .map((g) => ({
      key: g.key,
      label: g.label,
      internal: g.internal,
      moneyIn: g.moneyIn,
      moneyOut: g.moneyOut,
      net: roundMoney(g.moneyIn - g.moneyOut),
      count: g.count,
      accounts: [...g.accounts].sort(),
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function bankMovementKind(r, resolver = null, cfg = {}) {
  if (!r) return 'other';
  if (isSetAside(r, cfg)) return 'set-aside';
  if (r.internalTransfer) return 'internal';
  if (r.refund) return 'refund';
  if (r.excludedFromIncome) return 'cash-deposit';
  if (r.household) return 'household';
  const catToKind = cfg.categoryToKind || {};
  if (resolver) {
    const m = resolver.resolve(r.description || '', { profile: 'bank' });
    if (m && m.category && !m.incidentalInstitution && catToKind[m.category])
      return catToKind[m.category];
  }
  const type = String(r.type || '').toUpperCase();
  for (const rule of cfg.typeRules || []) {
    const token = String((rule && rule.match) || '').toUpperCase();
    if (token && type.includes(token)) return rule.kind;
  }
  return r.direction === 'in' ? 'income' : 'payment';
}

export function externalOutflowShortlist(groups, limit = 10) {
  const ranked = (groups || [])
    .filter((g) => !g.internal && g.moneyOut > 0)
    .sort((a, b) => b.moneyOut - a.moneyOut);
  return (limit > 0 ? ranked.slice(0, limit) : ranked).map((g) => ({
    key: g.key,
    label: g.label,
    moneyOut: g.moneyOut,
    count: g.count,
    accounts: g.accounts,
  }));
}

export function externalInflowShortlist(groups, limit = 10) {
  const ranked = (groups || [])
    .filter((g) => !g.internal && g.moneyIn > 0)
    .sort((a, b) => b.moneyIn - a.moneyIn);
  return (limit > 0 ? ranked.slice(0, limit) : ranked).map((g) => ({
    key: g.key,
    label: g.label,
    moneyIn: g.moneyIn,
    count: g.count,
    accounts: g.accounts,
  }));
}
export function bankFlowOverTime(records, baseCurrency = 'JMD') {
  const byMonth = new Map();
  for (const r of records) {
    if ((r.currency || baseCurrency) !== baseCurrency) continue; // never mix USD into JMD bars
    const m = (r.date || '').slice(0, 7);
    if (!m) continue;
    if (!byMonth.has(m))
      byMonth.set(m, {
        month: m,
        moneyIn: 0,
        moneyOut: 0,
        internalIn: 0,
        internalOut: 0,
      });
    const row = byMonth.get(m);
    if (r.internalTransfer) {
      if (r.direction === 'in') row.internalIn = roundMoney(row.internalIn + r.amount);
      else row.internalOut = roundMoney(row.internalOut + r.amount);
    } else if (r.direction === 'in') {
      if (r.refund || r.excludedFromIncome) continue;
      row.moneyIn = roundMoney(row.moneyIn + r.amount);
    } else {
      if (r.household) continue;
      row.moneyOut = roundMoney(row.moneyOut + r.amount);
    }
  }
  return [...byMonth.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((r) => ({ ...r, net: roundMoney(r.moneyIn - r.moneyOut) }));
}

function standingDebitMonthGap(monthKeys) {
  const idx = monthKeys
    .map(monthIndex)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  let mx = 0;
  for (let i = 1; i < idx.length; i++) mx = Math.max(mx, idx[i] - idx[i - 1]);
  return mx;
}
export function detectBankStandingDebits(
  records,
  minMonths = 3,
  tolerance = 0.15,
  baseCurrency = 'JMD',
  maxGapMonths = 2
) {
  const byKey = new Map();
  let latestMonth = '';
  for (const r of records) {
    const m = (r.date || '').slice(0, 7);
    if (m > latestMonth) latestMonth = m;
  }
  for (const r of records) {
    if ((r.currency || baseCurrency) !== baseCurrency) continue; // base-currency only
    if (r.internalTransfer || r.direction !== 'out') continue;
    if (isStatutoryDeduction(r)) continue;
    const key = r.counterpartyKey || 'ext:' + String(r.description || '').toUpperCase();
    if (!byKey.has(key))
      byKey.set(key, {
        key,
        label: r.counterpartyLabel || r.description || key,
        byMonth: new Map(),
        dates: [],
      });
    const g = byKey.get(key);
    const m = (r.date || '').slice(0, 7);
    g.byMonth.set(m, roundMoney((g.byMonth.get(m) || 0) + r.amount));
    if (r.date) g.dates.push(r.date);
  }
  const out = [];
  for (const g of byKey.values()) {
    const amounts = [...g.byMonth.values()];
    if (amounts.length < minMonths) continue;

    if (standingDebitMonthGap([...g.byMonth.keys()]) > maxGapMonths) continue;
    // THE shared recurring-amount rule (shared-helpers' typicalMonthlyValue),
    // not a third hand-rolled median. Plan's "Expected payments" resolves the
    // same merchant through commitment-income.js, which already uses it; these
    // two inline medians were why one recurring payment could read $9,935.82 on
    // the Plan tab and $8,935.82 on Activity - same merchant, same cadence,
    // exactly $1,000 apart, because a median picks a middle month while the
    // shared rule averages the months that agree.
    const typical = typicalMonthlyValue(amounts).amount;
    if (typical <= 0) continue;
    const consistent = amounts.filter((a) => Math.abs(a - typical) <= typical * tolerance).length;
    if (consistent >= minMonths) {
      const lastMonth = [...g.byMonth.keys()].sort().pop();
      out.push({
        key: g.key,
        label: g.label,
        months: g.byMonth.size,
        typical: roundMoney(typical),
        lastMonth,
        status: recurringStatus(lastMonth, latestMonth, maxGapMonths),
        expectedDay: medianDayOfMonth(g.dates),
        risen: detectSustainedRise(
          [...g.byMonth.entries()].map(([month, amount]) => ({
            month,
            amount,
          }))
        ),
      });
    }
  }
  return out.sort((a, b) => b.typical - a.typical);
}

export function isCardPaymentTransfer(record, cardAccounts) {
  if (!record || record.direction !== 'out') return false;
  const card4 = new Set((cardAccounts || []).map((c) => String(c).slice(-4)));
  if (!card4.size) return false;
  const tokens = counterpartyAccountTokens(record.description);
  return tokens.size > 0 && [...tokens].some((t) => card4.has(String(t).slice(-4)));
}

export function analyseIncomePattern(records, cfg = {}, now = new Date(), baseCurrency = 'JMD') {
  const t = Object.assign(
    {
      minMonths: 3,
      tolerance: 0.15,
      maxGapMonths: 2,
      steadySpreadDays: 6,
      lateGraceDays: 5,
    },
    cfg.ahead || {}
  );
  const byKey = new Map();
  let latestMonth = '';
  for (const r of records) {
    const m = (r.date || '').slice(0, 7);
    if (m > latestMonth) latestMonth = m;
  }
  for (const r of records) {
    if ((r.currency || baseCurrency) !== baseCurrency) continue;
    if (r.internalTransfer || r.direction !== 'in') continue;
    if (r.refund || r.excludedFromIncome) continue;
    const key = r.counterpartyKey || 'ext:' + String(r.description || '').toUpperCase();
    if (!byKey.has(key))
      byKey.set(key, {
        key,
        label: r.counterpartyLabel || r.description || key,
        byMonth: new Map(),
        dates: [],
      });
    const g = byKey.get(key);
    const m = (r.date || '').slice(0, 7);
    g.byMonth.set(m, roundMoney((g.byMonth.get(m) || 0) + r.amount));
    if (r.date) g.dates.push(r.date);
  }
  const candidates = [];
  for (const g of byKey.values()) {
    const amounts = [...g.byMonth.values()];
    if (amounts.length < t.minMonths) continue;
    if (standingDebitMonthGap([...g.byMonth.keys()]) > t.maxGapMonths) continue;
    // THE shared recurring-amount rule (shared-helpers' typicalMonthlyValue),
    // not a third hand-rolled median. Plan's "Expected payments" resolves the
    // same merchant through commitment-income.js, which already uses it; these
    // two inline medians were why one recurring payment could read $9,935.82 on
    // the Plan tab and $8,935.82 on Activity - same merchant, same cadence,
    // exactly $1,000 apart, because a median picks a middle month while the
    // shared rule averages the months that agree.
    const typical = typicalMonthlyValue(amounts).amount;
    if (typical <= 0) continue;
    const consistent = amounts.filter((a) => Math.abs(a - typical) <= typical * t.tolerance).length;
    if (consistent < t.minMonths) continue;
    const lastMonth = [...g.byMonth.keys()].sort().pop();
    const expectedDay = medianDayOfMonth(g.dates);
    const dayDeviations = g.dates
      .map((d) => isoDay(d))
      .filter((d) => d > 0)
      .map((d) => Math.abs(d - (expectedDay || d)));
    const daySpread = dayDeviations.length ? Math.max(...dayDeviations) : 0;
    candidates.push({
      key: g.key,
      label: g.label,
      months: g.byMonth.size,
      typical: roundMoney(typical),
      lastMonth,
      expectedDay,
      daySpread,
      status: recurringStatus(lastMonth, latestMonth, t.maxGapMonths),
    });
  }
  const active = candidates.filter((c) => c.status !== 'lapsed');
  if (!active.length) return null;
  active.sort((a, b) => b.typical - a.typical);
  const primary = active[0];
  const primaryGroup = byKey.get(primary.key);
  const primaryDates = primaryGroup.dates.slice().sort();
  const lastDate = primaryDates[primaryDates.length - 1] || null;

  const regularity = primary.daySpread <= t.steadySpreadDays ? 'Steady' : 'Uneven';

  const [ly, lm] = primary.lastMonth.split('-').map(Number);
  const dayGuess = Math.min(primary.expectedDay || 1, new Date(ly, lm, 0).getDate());
  const nd = new Date(ly, lm, dayGuess);
  const nextExpectedDate = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
  const daysUntilNext = Math.round((nd.getTime() - now.getTime()) / 86400000);
  const late = daysUntilNext < -t.lateGraceDays;

  const recentMonths = [...primaryGroup.byMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const lastAmount = recentMonths.length
    ? roundMoney(recentMonths[recentMonths.length - 1][1])
    : primary.typical;
  let stepChange = null;
  if (recentMonths.length) {
    const diff = lastAmount - primary.typical;
    if (Math.abs(diff) > primary.typical * t.tolerance) stepChange = diff > 0 ? 'up' : 'down';
  }

  // The primary stream's month-by-month deposits, already computed above as
  // primaryGroup.byMonth and previously discarded at the return. Exposed so a
  // visual (the income bar row - Overview/Right Now/Ahead) can show the shape
  // of income over time against typicalAmount as a marker line, WITHOUT any
  // new analysis and WITHOUT a second income source that could disagree with
  // this one's own "steady / stepped / late" verdict. Additive: every existing
  // field is unchanged, so no current consumer is affected. Sorted oldest ->
  // newest, amounts rounded exactly as every other figure this function emits.
  const dayByMonth = new Map();
  for (const d of primaryGroup.dates) {
    const mo = String(d || '').slice(0, 7);
    const day = isoDay(d);
    if (mo && day > 0 && !dayByMonth.has(mo)) dayByMonth.set(mo, day);
  }
  const series = [...primaryGroup.byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, amount]) => ({
      month,
      amount: roundMoney(amount),
      day: dayByMonth.get(month) || null,
    }));

  return {
    key: primary.key,
    label: primary.label,
    typicalAmount: primary.typical,
    lastDate,
    lastAmount,
    expectedDay: primary.expectedDay,
    regularity,
    late,
    daysUntilNext,
    nextExpectedDate,
    stepChange,
    monthsSeen: primary.months,
    series,
  };
}

export function detectLargeBankOutflows(records, cfg = {}, baseCurrency = 'JMD') {
  const t = Object.assign(
    {
      largeChargeMultiple: 2.5,
      largeChargeMin: 10000,
      largeChargeZ: 3.5,
      largeChargeMinPeers: 2,
    },
    cfg.insights || {}
  );
  const rows = (records || []).filter(
    (r) =>
      !r.internalTransfer &&
      !r.household &&
      !r.excludedFromIncome &&
      r.direction === 'out' &&
      (r.currency || baseCurrency) === baseCurrency
  );
  const amounts = rows.map((r) => r.amount);
  // A recognised recurring commitment is, by definition, NOT an unusual charge:
  // its whole nature is that this payee pays this much every period. Unlike the
  // card side (attentionItems), whose peers are per-merchant, this detector's
  // peer set is the WHOLE outflow population, so a steady standing debit (e.g. a
  // $70k auto-loan payment) scores as a huge outlier against mostly-small
  // discretionary outflows and is wrongly flagged "larger than usual" every
  // period it appears. Exclude recognised standing-debit payees from being
  // flagged - keyed exactly as detectBankStandingDebits keys, so the two agree
  // on what "this payee" means, and the "Regular commitments" card and this
  // check can never disagree. The peer population is left untouched, so every
  // OTHER payee's verdict is identical and the fix can only remove this false
  // alarm, never introduce a new one.
  const commitmentKeys = new Set(
    detectBankStandingDebits(records, undefined, undefined, baseCurrency).map((d) => d.key)
  );
  const keyOf = (r) => r.counterpartyKey || 'ext:' + String(r.description || '').toUpperCase();
  const out = [];
  rows.forEach((r, i) => {
    if (r.amount < t.largeChargeMin) return;
    if (commitmentKeys.has(keyOf(r))) return; // recognised commitment: never "larger than usual"
    const others = amounts.filter((_, j) => j !== i);
    if (others.length < t.largeChargeMinPeers) return;
    const centre = median(others);
    const mad = median(others.map((x) => Math.abs(x - centre)));
    const z = modifiedZ(r.amount, centre, mad);
    const zOk = z >= t.largeChargeZ;
    const multipleOk = centre > 0 && r.amount >= centre * t.largeChargeMultiple;
    if (zOk && multipleOk) {
      out.push({
        id: r.id,
        key: r.counterpartyKey,
        label: r.counterpartyLabel || r.description,
        amount: roundMoney(r.amount),
        date: r.date,
        z,
      });
    }
  });
  return out.sort((a, b) => b.z - a.z || b.amount - a.amount);
}

export function detectPeriodNewPayees(records, period, baseCurrency = 'JMD') {
  if (!period || !period.prevFrom) return [];
  const rows = (records || []).filter(
    (r) =>
      !r.internalTransfer &&
      !r.household &&
      !r.excludedFromIncome &&
      r.direction === 'out' &&
      (r.currency || baseCurrency) === baseCurrency
  );
  const keyOf = (r) => r.counterpartyKey || 'ext:' + String(r.description || '').toUpperCase();
  const monthOf = (r) => String(r.date || '').slice(0, 7);
  // True first-ever occurrence month per payee, across the WHOLE set passed in.
  const firstMonth = {};
  for (const r of rows) {
    const key = keyOf(r);
    const m = monthOf(r);
    if (!(key in firstMonth) || m < firstMonth[key]) firstMonth[key] = m;
  }
  const amountByKey = {};
  const labelByKey = {};
  for (const r of rows) {
    const m = monthOf(r);
    if (m < period.from || m > period.to) continue;
    const key = keyOf(r);
    // Only a payee whose first-ever month is inside this period is genuinely new.
    if (firstMonth[key] < period.from || firstMonth[key] > period.to) continue;
    amountByKey[key] = (amountByKey[key] || 0) + r.amount;
    if (!(key in labelByKey)) labelByKey[key] = r.counterpartyLabel || r.description;
  }
  return Object.keys(amountByKey)
    .map((key) => ({
      key,
      label: labelByKey[key],
      amount: roundMoney(amountByKey[key]),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function analyseCombinedOverview(opts = {}) {
  const bankRecords = opts.bankRecords || [];
  const cardStatements = opts.cardStatements || [];
  const cardSummary = opts.cardSummary || null;
  const bank = analyseBankActivity(bankRecords);
  const flow = bankFlowOverTime(bankRecords);
  const latestCard =
    cardStatements
      .slice()
      .sort((a, b) =>
        String(a.statementKey || a.period).localeCompare(String(b.statementKey || b.period))
      )
      .pop() || null;
  const cardBalance =
    latestCard && latestCard.newBalance != null ? roundMoney(latestCard.newBalance) : null;
  const cardUtilisation =
    latestCard && latestCard.utilisation != null ? latestCard.utilisation : null;
  const cpGroups = bankCounterpartyGroups(bankRecords);
  const shortlist = externalOutflowShortlist(cpGroups, 5);
  const inflowShortlist = externalInflowShortlist(cpGroups, 5);
  return {
    accounts: bank.accounts,
    foreignAccounts: bank.foreignAccounts,
    cashPosition: bank.closingBalance,
    cardBalance,
    cardUtilisation,
    moneyIn: bank.cashIn,
    moneyOut: bank.cashOut,
    net: bank.net,
    internalIn: bank.internalIn,
    internalOut: bank.internalOut,
    months: bank.months,
    trend: flow.map((f) => ({
      month: f.month,
      net: f.net,
      moneyIn: f.moneyIn,
      moneyOut: f.moneyOut,
    })),
    topOutflows: shortlist,
    topInflows: inflowShortlist,
    cardsRoute: {
      headline: cardBalance == null ? null : cardBalance,
      sub: latestCard ? latestCard.period || latestCard.statementKey : null,
      spendTotal: cardSummary ? cardSummary.total_spend : null,
    },
    accountsRoute: {
      headline: bank.closingBalance,
      accountCount: bank.accounts.length,
    },
  };
}

export function analyseRollup(opts = {}) {
  const bankRecords = opts.bankRecords || [];
  const cardSpendTotal = roundMoney(opts.cardSpendTotal || 0);
  const cardSpendByMonth = opts.cardSpendByMonth || {};
  const cardStatements = opts.cardStatements || [];
  const bank = analyseBankActivity(bankRecords);
  const bankFlow = bankFlowOverTime(bankRecords);

  const income = bank.cashIn; // external in
  const externalSpending = roundMoney(bank.cashOut + cardSpendTotal); // no double count
  const netCashFlow = roundMoney(income - externalSpending);

  const monthSet = new Set([...bankFlow.map((f) => f.month), ...Object.keys(cardSpendByMonth)]);
  const trend = [...monthSet]
    .filter(Boolean)
    .sort()
    .map((m) => {
      const bf = bankFlow.find((x) => x.month === m) || {
        moneyIn: 0,
        moneyOut: 0,
      };
      const cardOut = roundMoney(cardSpendByMonth[m] || 0);
      return {
        month: m,
        income: bf.moneyIn,
        bankOut: bf.moneyOut,
        cardOut,
        spending: roundMoney(bf.moneyOut + cardOut),
        net: roundMoney(bf.moneyIn - (bf.moneyOut + cardOut)),
      };
    });

  const latestCard =
    cardStatements
      .slice()
      .sort((a, b) =>
        String(a.statementKey || a.period).localeCompare(String(b.statementKey || b.period))
      )
      .pop() || null;
  const cardOwed =
    latestCard && latestCard.newBalance != null ? roundMoney(latestCard.newBalance) : null;
  const cardUtilisation =
    latestCard && latestCard.utilisation != null ? latestCard.utilisation : null;

  return {
    income,
    externalSpending,
    netCashFlow,
    bankExternalOut: bank.cashOut,
    cardSpend: cardSpendTotal,
    internalOut: bank.internalOut,
    cashPosition: bank.closingBalance, // sum of per-account BASE (JMD) closings
    cardOwed,
    cardUtilisation, // shown beside cash, never netted (D12)
    accounts: bank.accounts,
    foreignAccounts: bank.foreignAccounts,
    months: bank.months,
    trend,
    hasCard: cardSpendTotal > 0 || cardOwed != null,
  };
}

export function overviewVerdict(roll) {
  const r = roll || {};
  const net = Number(r.netCashFlow) || 0;
  const positive = net >= 0;
  const text = positive
    ? 'more came in than went out this period'
    : 'more went out than came in this period';
  const trend = Array.isArray(r.trend) ? r.trend : [];
  if (trend.length < 2) {
    return { tone: positive ? 'neutral' : 'watch', text, comparison: '' };
  }
  const recent = trend.slice(-3);
  const recentPositive = recent.filter((t) => (Number(t.net) || 0) >= 0).length;
  const recentNegative = recent.length - recentPositive;
  const recentSignPositive = recentPositive >= recentNegative;
  const continues = recentSignPositive === positive;
  const comparison = continues
    ? 'this continues the recent pattern'
    : 'this breaks the recent pattern';
  let tone;
  if (positive && continues) tone = 'good';
  else if (!positive) tone = 'watch';
  else tone = 'neutral';
  return { tone, text, comparison };
}
