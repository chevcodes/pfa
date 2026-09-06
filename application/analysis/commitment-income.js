/* commitment-income.js - shared commitment-and-income primitive (see spec). */
// median, typicalMonthlyValue and the row-classification primitives come
// from shared-helpers.js - several files carried byte-identical private
// copies of these before this.
import {
  median,
  typicalMonthlyValue,
  rowBalance,
  sortedCardStatements,
  isInternal,
  dirOf,
  amtOf,
  ccyOf,
  dateOf,
} from '../core/shared-helpers.js';
import { resolveGroupMap, groupForCategory } from './plan.js';
import { answerFor } from './confirmations.js';
export function resolveOpts(cfg = {}) {
  const ahead = (cfg && cfg.ahead) || {};
  const insights = (cfg && cfg.insights) || {};
  const currency = (cfg && cfg.currency) || {};
  return {
    minMonths: ahead.minMonths == null ? 3 : ahead.minMonths,
    tolerance: ahead.tolerance == null ? 0.15 : ahead.tolerance,
    maxGapMonths: ahead.maxGapMonths == null ? 2 : ahead.maxGapMonths,
    lateGraceDays: ahead.lateGraceDays == null ? 5 : ahead.lateGraceDays,
    baseCurrency: currency.code || 'JMD',
    incomeFloor: insights.meaningfulChangeMin == null ? 3000 : insights.meaningfulChangeMin,
    commitmentFloor: 1000,
  };
}
function ymOf(iso) {
  return String(iso || '').slice(0, 7);
}
function domOf(iso) {
  return +String(iso || '').slice(8, 10) || 0;
}
function toParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
}
function daysInMonth(y, mo) {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}
function isoOf(y, mo, d) {
  const dd = Math.min(d, daysInMonth(y, mo));
  return `${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function nextOccurrenceAfter(asOf, day) {
  const p = toParts(asOf);
  if (!p) return null;
  let { y, mo } = p;
  let cand = isoOf(y, mo, day);
  if (cand <= asOf) {
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
    cand = isoOf(y, mo, day);
  }
  return cand;
}
function maxConsecutiveGap(monthKeys) {
  const idx = monthKeys
    .map((m) => +m.slice(0, 4) * 12 + +m.slice(5, 7))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  let mx = 0;
  for (let i = 1; i < idx.length; i++) mx = Math.max(mx, idx[i] - idx[i - 1]);
  return mx;
}
function counterpartyKeyOf(r) {
  return (
    r.counterpartyKey ||
    r.Group ||
    r.counterpartyLabel ||
    r['Counterparty / Merchant'] ||
    'ext:' + String(r.description || r['Raw Description'] || 'unknown').toUpperCase()
  );
}
export function detectRecurring(records, direction, opts, asOf = null) {
  const wantIn = direction === 'in';
  const by = new Map();
  for (const r of records || []) {
    if (isInternal(r)) continue;
    if (wantIn && (r.refund || r.excludedFromIncome)) continue;
    if (ccyOf(r, opts.baseCurrency) !== opts.baseCurrency) continue;
    if ((dirOf(r) === 'in') !== wantIn) continue;
    if (asOf && dateOf(r) > asOf) continue;
    const key = counterpartyKeyOf(r);
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(r);
  }
  const out = [];
  for (const [key, rows] of by) {
    const byMonth = new Map();
    for (const r of rows)
      byMonth.set(ymOf(dateOf(r)), (byMonth.get(ymOf(dateOf(r))) || 0) + amtOf(r));
    const months = [...byMonth.keys()].sort();
    if (months.length < opts.minMonths) continue;
    if (maxConsecutiveGap(months) > opts.maxGapMonths) continue;
    const vals = [...byMonth.values()];
    const typical = typicalMonthlyValue(vals).amount;
    if (typical <= 0) continue;
    const steady = vals.filter((a) => Math.abs(a - typical) <= typical * opts.tolerance).length;
    if (steady < opts.minMonths) continue;
    const days = rows.map((r) => domOf(dateOf(r))).sort((a, b) => a - b);
    const typicalDay = days[days.length >> 1];
    const recent = [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-3)
      .map(([, amount]) => amount);
    out.push({
      key,
      label: String(rows[0].counterpartyLabel || rows[0].description || key),
      occurrences: rows.length,
      months: months.length,
      typical,
      typicalDay,
      lastMonth: months[months.length - 1],
      recent,
    });
  }
  return out.sort((a, b) => b.typical - a.typical);
}
export function twoWayKeys(records, opts, asOf = null) {
  const seen = new Map();
  for (const r of records || []) {
    if (ccyOf(r, opts.baseCurrency) !== opts.baseCurrency) continue;
    if (asOf && dateOf(r) > asOf) continue;
    const key = counterpartyKeyOf(r);
    const s = seen.get(key) || { in: 0, out: 0 };
    if (dirOf(r) === 'in') s.in++;
    else if (dirOf(r) === 'out') s.out++;
    seen.set(key, s);
  }
  const out = new Set();
  for (const [key, s] of seen) if (s.in >= 2 && s.out >= 2) out.add(key);
  return out;
}
/* WHICH REPEATING CREDIT IS "YOUR PAY".
 *
 * This is the most consequential guess in the app: it sets the next payday,
 * which sets the window of payments counted before it, which sets Overview's
 * lead figure. Until now it was decided by size alone and never mentioned - a
 * distribution, a regular transfer from family or a second job can outweigh a
 * salary, and being wrong was invisible.
 *
 * The person's answer governs where they have given one, exactly as it does
 * for every other inference: a payee answered "yes" is the pay whatever its
 * size, and one answered "no" is out of the running. Size decides only among
 * the payees nobody has ruled on, and the result says which of the two
 * happened so a surface can be honest about it.
 */
export function payCandidates(bankRecords, opts, asOf) {
  return detectRecurring(bankRecords, 'in', opts, asOf).filter(
    (c) => c.typical >= opts.incomeFloor
  );
}

export function expectedIncome(bankRecords, opts, asOf, confirmations = []) {
  const all = payCandidates(bankRecords, opts, asOf);
  if (!all.length) return null;
  const answer = (key) => answerFor(confirmations, 'pay', [key]);
  const chosen = all.find((c) => answer(c.key) === true);
  const cands = chosen ? [chosen] : all.filter((c) => answer(c.key) !== false);
  if (!cands.length) return null;
  const inc = cands[0];
  const med3 = median(inc.recent);
  const latest = inc.recent[inc.recent.length - 1];
  const amount = Math.abs(latest - med3) <= med3 * opts.tolerance ? latest : med3;
  const date = nextOccurrenceAfter(asOf, inc.typicalDay);
  return {
    key: inc.key,
    amount: Math.round(amount * 100) / 100,
    date,
    typicalDay: inc.typicalDay,
    confidence: inc.months >= 6 ? 'high' : 'medium',
    chosenBy: chosen ? 'person' : 'size',
    // How many other repeating credits the app had to choose between. Zero
    // means there was nothing to get wrong; more than zero and nobody has
    // answered means the surface owes the person a word about it.
    otherCandidates: cands.length - 1,
  };
}
export function cardLegBeforeIncome(cardStatements, opts, asOf, nextIncomeDate) {
  const stmts = sortedCardStatements(cardStatements);
  const latest = stmts[stmts.length - 1] || null;
  if (!latest) return { amount: 0, basis: 'no-card-statement', stale: true };
  const due =
    latest.amountDue != null
      ? Number(latest.amountDue)
      : latest.newBalance != null
        ? Number(latest.newBalance)
        : null;
  const dueDate = latest.dueDate || latest.payBy || null;
  if (due == null || !Number.isFinite(due))
    return { amount: 0, basis: 'no-amount-due', stale: true };
  if (due <= 0) return { amount: 0, basis: 'nothing-due', dueDate, stale: false };
  if (!dueDate)
    return {
      amount: 0,
      basis: 'amount-known-date-unknown',
      stale: true,
      knownAmount: Math.round(due * 100) / 100,
    };
  if (!nextIncomeDate)
    return {
      amount: 0,
      basis: 'no-income-date',
      stale: true,
      knownAmount: Math.round(due * 100) / 100,
      dueDate,
    };
  const inWindow = String(dueDate) > String(asOf) && String(dueDate) < String(nextIncomeDate);
  return {
    amount: inWindow ? Math.round(due * 100) / 100 : 0,
    basis: inWindow ? 'due-before-income' : 'due-after-income',
    dueDate,
    stale: false,
  };
}
/* The person's category -> band placement outranks the detector here too, so a
 * repeating payment they have filed under a category they put in Free spending
 * stops being counted as a commitment before payday, and one they put in Fixed
 * expenses keeps counting. Detection still supplies the amount and the date -
 * an answer says how a payment should be treated, it cannot say when a payment
 * with no pattern will next land. */
function placedBandOf(bankRecords, opts, cfg, groupAssignments) {
  const groupMap = resolveGroupMap(cfg, groupAssignments);
  const byKey = new Map();
  for (const r of bankRecords || []) {
    const name = r.category || r.Category || '';
    if (!name || !Object.prototype.hasOwnProperty.call(groupMap, String(name).toLowerCase()))
      continue;
    byKey.set(counterpartyKeyOf(r), groupForCategory(name, groupMap) === 'fixed');
  }
  return byKey;
}

export function commitmentsBeforeIncome(
  bankRecords,
  opts,
  asOf,
  nextIncomeDate,
  manualFutureItems = [],
  { cfg = {}, groupAssignments = null } = {}
) {
  if (!nextIncomeDate) return [];
  const placed = placedBandOf(bankRecords, opts, cfg, groupAssignments);
  const debits = detectRecurring(bankRecords, 'out', opts, asOf).filter(
    (d) => placed.get(d.key) === true || d.typical >= opts.commitmentFloor
  );
  const tw = twoWayKeys(bankRecords, opts, asOf);
  const items = [];
  for (const d of debits) {
    if (placed.get(d.key) === false) continue;
    if (tw.has(d.key) && placed.get(d.key) !== true) continue;
    const due = nextOccurrenceAfter(asOf, d.typicalDay);
    if (due && due > asOf && due < nextIncomeDate)
      items.push({
        key: d.key,
        label: d.label,
        amount: Math.round(d.typical * 100) / 100,
        date: due,
        basis: 'recurring',
      });
  }
  for (const m of manualFutureItems || []) {
    const md = String(m.date || '');
    if (md > asOf && md < nextIncomeDate)
      items.push({
        key: m.key || 'manual',
        label: m.label || 'One-off payment',
        amount: Math.round(Number(m.amount) * 100) / 100,
        date: md,
        basis: 'manual',
      });
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : 1));
}
export function liquidBalance(bankRecords, opts, asOf) {
  const byAcct = new Map();
  const seenAccts = new Set();
  let staleAccounts = 0;
  for (const r of bankRecords || []) {
    if (ccyOf(r, opts.baseCurrency) !== opts.baseCurrency) continue;
    if (asOf && dateOf(r) > asOf) continue;
    const acct = r.account || r.Account || 'unknown';
    seenAccts.add(acct);
    // The shared reader (shared-helpers' rowBalance) - the same one Activity's
    // account chip uses, so the two cannot diverge on which column counts.
    const bal = rowBalance(r);
    if (bal == null) continue;
    const seq = r.seq != null ? r.seq : 0;
    const cur = byAcct.get(acct);
    const key = [dateOf(r), seq];
    if (!cur || key[0] > cur.date || (key[0] === cur.date && key[1] >= cur.seq))
      byAcct.set(acct, { date: key[0], seq: key[1], bal });
  }
  let total = 0;
  const perAccount = {};
  const dates = [];
  for (const [acct, v] of byAcct) {
    total += v.bal;
    perAccount[acct] = v.bal;
    if (v.date) dates.push(v.date);
  }
  for (const a of seenAccts) if (!(a in perAccount)) staleAccounts++;
  dates.sort();
  // WHEN each balance in this sum was last true. The dates were already known
  // here and thrown away, so every consumer had to date the total "today" -
  // including the summary a person hands to someone else. A sum of balances
  // confirmed weeks apart has no single as-of date, so both ends are carried
  // and the surface says which it means.
  return {
    total: Math.round(total * 100) / 100,
    perAccount,
    staleAccounts,
    oldest: dates[0] || null,
    newest: dates[dates.length - 1] || null,
  };
}
export function commitmentAndIncomePrimitive({
  bankRecords,
  cardStatements = [],
  cfg = {},
  asOf,
  manualFutureItems = [],
  liquidNow = null,
  groupAssignments = null,
  confirmations = [],
}) {
  const opts = resolveOpts(cfg);
  const gaps = [];
  const candidates = payCandidates(bankRecords, opts, asOf);
  const income = expectedIncome(bankRecords, opts, asOf, confirmations);
  if (!income) gaps.push('no recurring income detected');
  const nextIncomeDate = income ? income.date : null;
  const card = cardLegBeforeIncome(cardStatements, opts, asOf, nextIncomeDate);
  if (card.stale) gaps.push('card leg incomplete: ' + card.basis);
  const commitments = commitmentsBeforeIncome(
    bankRecords,
    opts,
    asOf,
    nextIncomeDate,
    manualFutureItems,
    { cfg, groupAssignments }
  );
  // FROZEN CONTRACT (locked correction #2): the card amount expected before the
  // next income belongs UNDER commitments, NOT netted into available balance.
  // So the card leg is added as a commitment item (when it falls in the window)
  // and availableBalance stays pure liquid. Layer 3 is unchanged either way, but
  // this places all pre-payday outgoings together, which is both the frozen
  // definition and the clearer thing for a person to read.
  if (card.amount > 0)
    commitments.push({
      key: 'card',
      label: 'Card payment',
      amount: card.amount,
      date: card.dueDate || nextIncomeDate,
      basis: 'card',
    });
  commitments.sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1));
  const liquid = liquidNow || liquidBalance(bankRecords, opts, asOf);
  if (liquid.staleAccounts > 0)
    gaps.push(liquid.staleAccounts + ' account(s) with no current balance');
  const layer1 = Math.round(liquid.total * 100) / 100;
  const layer2 = Math.round(commitments.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  const layer3 = Math.round((layer1 - layer2) * 100) / 100;
  return {
    asOf,
    income,
    payCandidates: candidates.map((c) => ({ key: c.key, label: c.label, typical: c.typical })),
    liquid,
    card: {
      amountExpectedBeforeNextIncome: card.amount,
      basis: card.basis,
      dueDate: card.dueDate || null,
    },
    commitments,
    layers: {
      availableBalance: layer1,
      commitmentsBeforeIncome: layer2,
      estimatedAvailableAfterCommitments: layer3,
    },
    confidence: gaps.length ? 'incomplete' : 'complete',
    gaps,
  };
}
