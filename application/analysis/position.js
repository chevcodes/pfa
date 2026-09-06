/* ===========================================================================
 *  position.js  -  "Position" (renamed from Net Worth). Three jobs, split by
 *  DATA SOURCE so the reconciled half carries the value with no upkeep and the
 *  manual half is dated and visibly ageing.
 *
 *  FROZEN CONTRACT:
 *   1. Cash and debt (RECONCILED): cash position, card balance, utilisation,
 *      income stability, cash-flow summary. All from imported data. No upkeep.
 *   2. Recorded net worth (COVERAGE, never "complete"): assets - liabilities,
 *      reported with the classes INCLUDED and the classes NOT included / not
 *      confirmed, and a last-reviewed date. Manual assets decay visibly.
 *   3. Financial-position summary: an export from selected evidence, every
 *      figure carrying its PERIOD and SOURCE. Explicitly NOT "bank-ready".
 *
 *  INTEGRITY RULE (threaded throughout): a recorded figure and a self-reported
 *  figure never wear the same authority, and partial data never produces a
 *  complete-sounding conclusion. Net worth is therefore always "recorded" +
 *  a coverage statement, never a bare total.
 *
 *  PURE and Node-testable. No DOM, no fetch, no mutation. Manual assets live in
 *  the v4 `manualAssets` store (keyPath 'id').
 * ======================================================================== */
import { resolveOpts, liquidBalance, detectRecurring } from './commitment-income.js';
import { makeMoney, makeProseMoney } from '../core/money-format.js';
import {
  typicalMonthlyValue,
  rowBalance,
  sortedCardStatements,
  daysBetweenIso as daysBetween,
  monthsBetween,
  joinWithAnd,
  isInternal,
  dirOf,
  amtOf,
  ccyOf,
  dateOf,
} from '../core/shared-helpers.js';

function r2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}
function ymOf(iso) {
  return String(iso || '').slice(0, 7);
}
export function cardUtilisation(balance, limit) {
  return balance != null && limit && limit > 0 ? Math.round((Math.max(0, balance) / limit) * 100) : null;
}

/* the standard asset/liability classes we KNOW might exist but often can't see
 * from statements alone. Used to report coverage honestly. */
export const NET_WORTH_CLASSES = {
  assets: ['Cash & bank', 'Investments', 'Property', 'Vehicle', 'Pension', 'Other assets'],
  liabilities: ['Credit card', 'Loans', 'Mortgage', 'Hire purchase', 'Other debts'],
};

/* ===========================================================================
 *  1) CASH AND DEBT - fully reconciled, no upkeep.
 * ======================================================================== */
export function cashAndDebt({ bankRecords = [], cardStatements = [], cfg = {}, asOf, fx = null }) {
  const opts = resolveOpts(cfg);
  const base = opts.baseCurrency;

  // liquid (base ccy) via the shared calc
  const liquid = liquidBalance(bankRecords, opts, asOf);

  // foreign balances, per currency, latest as-of (kept SEPARATE, never blended)
  const foreign = {};
  const seenForeign = new Map(); // ccy -> account -> {date, bal}
  for (const r of bankRecords) {
    const ccy = ccyOf(r, base);
    if (ccy === base) continue;
    // The shared reader - this is the FOREIGN-currency balance path, and it had
    // its own copy of the same field logic. A third copy is a third chance to
    // drift.
    const bal = rowBalance(r);
    if (bal == null) continue;
    const d = dateOf(r);
    if (asOf && d > asOf) continue;
    const acct = r.account || r.Account || 'x';
    if (!seenForeign.has(ccy)) seenForeign.set(ccy, new Map());
    const m = seenForeign.get(ccy);
    const cur = m.get(acct);
    if (!cur || d >= cur.date) m.set(acct, { date: d, bal });
  }
  for (const [ccy, m] of seenForeign)
    foreign[ccy] = r2([...m.values()].reduce((s, v) => s + v.bal, 0));

  const accounts = Object.entries(liquid.perAccount || {}).map(([account, balance]) => ({
    account,
    currency: base,
    nativeBalance: r2(balance),
    baseBalance: r2(balance),
    rate: 1,
  }));
  for (const [currency, accountMap] of seenForeign) {
    const rate =
      fx && fx.base === base && fx.rates && Number(fx.rates[currency]) > 0
        ? Number(fx.rates[currency])
        : null;
    for (const [account, value] of accountMap) {
      accounts.push({
        account,
        currency,
        nativeBalance: r2(value.bal),
        baseBalance: rate ? r2(value.bal * rate) : null,
        rate,
      });
    }
  }

  // card balance + utilisation from latest statement
  const stmts = sortedCardStatements(cardStatements);
  const latest = stmts[stmts.length - 1] || null;
  // A second card still in use can be NAMED as not counted rather than left
  // silently missing from the debt total. A card whose statements stopped long
  // ago is closed, and calling it "not counted" would warn about money that is
  // not owed, so only cards still statementing alongside the latest one count.
  const latestCardKey = String((latest && latest.statementKey) || '');
  const latestByCard = new Map();
  for (const statement of stmts) {
    const account = String(statement.account || '');
    if (!account) continue;
    const key = String(statement.statementKey || '');
    if (!latestByCard.has(account) || key > latestByCard.get(account)) latestByCard.set(account, key);
  }
  const otherActiveCards = [...latestByCard.entries()]
    .filter(([account, key]) => {
      if (account === String((latest && latest.account) || '')) return false;
      const apart = Math.abs(monthsBetween(key, latestCardKey));
      return Number.isFinite(apart) && apart <= 6;
    })
    .map(([account]) => account);
  const cardBalance = latest && latest.newBalance != null ? r2(latest.newBalance) : null;
  const creditLimit = latest && latest.creditLimit != null ? r2(latest.creditLimit) : null;
  const utilisation = cardUtilisation(cardBalance, creditLimit);

  // income stability: measured from the DETECTED RECURRING income stream (the
  // salary a person actually relies on), NOT raw calendar-month sums. Monthly
  // sums are corrupted by pay-date drift across month boundaries: on the real
  // corpus a stable ~300k salary produces monthly totals of 0 (payday not yet
  // landed), ~600k (two paydays in one calendar month) and a ~1.7M bonus month,
  // giving a false CV of 0.87 that would mislabel steady income as "variable" -
  // actively harmful for, e.g., presenting a position to a bank. Measuring the
  // recurring stream's own per-occurrence amounts reflects the truth (CV ~0.3
  // here) and reuses the same detector Overview/Forecast use, so "income" means
  // the same thing everywhere. Falls back to monthly sums only when no recurring
  // income is detected (genuinely irregular earner).
  const inflows = detectRecurring(bankRecords, 'in', opts, asOf).filter(
    (c) => c.typical >= opts.incomeFloor
  );
  const salary = inflows[0] || null; // highest-typical recurring credit
  let cv = null,
    incomeBasis = 'none',
    monthsSeen;
  if (salary) {
    // gather this counterparty's per-month amounts (each month it appeared),
    // dropping the current partial month, so a not-yet-landed payday can't read
    // as a zero-income month.
    const byM = new Map();
    for (const r of bankRecords) {
      const key =
        r.counterpartyKey || r.Group || r.counterpartyLabel || r['Counterparty / Merchant'] || '';
      if (key !== salary.key) continue;
      const d = dateOf(r);
      if (!d || (asOf && d > asOf)) continue;
      byM.set(ymOf(d), (byM.get(ymOf(d)) || 0) + amtOf(r));
    }
    const curYm = ymOf(asOf);
    const amts = [...byM.entries()].filter(([m]) => m < curYm).map(([, v]) => v); // drop partial current month
    monthsSeen = amts.length;
    if (amts.length >= 2) {
      const mean = amts.reduce((s, v) => s + v, 0) / amts.length;
      const sd = Math.sqrt(amts.reduce((s, v) => s + (v - mean) ** 2, 0) / amts.length);
      cv = mean > 0 ? sd / mean : null;
      incomeBasis = 'recurring-stream';
    }
  } else {
    // genuinely irregular: fall back to monthly-sum CV, honestly labelled.
    const byMonth = new Map();
    for (const r of bankRecords) {
      if (isInternal(r)) continue;
      if (ccyOf(r, base) !== base) continue;
      if (dirOf(r) !== 'in') continue;
      const d = dateOf(r);
      if (asOf && d > asOf) continue;
      byMonth.set(ymOf(d), (byMonth.get(ymOf(d)) || 0) + amtOf(r));
    }
    const mv = [...byMonth.values()];
    monthsSeen = mv.length;
    if (mv.length >= 2) {
      const mean = mv.reduce((s, v) => s + v, 0) / mv.length;
      const sd = Math.sqrt(mv.reduce((s, v) => s + (v - mean) ** 2, 0) / mv.length);
      cv = mean > 0 ? sd / mean : null;
      incomeBasis = 'monthly-sums';
    }
  }
  const stability =
    cv == null ? 'Unknown' : cv <= 0.15 ? 'Steady' : cv <= 0.35 ? 'Mostly steady' : 'Variable';

  // cash-flow summary: median monthly in / out. Here monthly SUMS are the right
  // basis (this is actual money movement, not income reliability), but drop the
  // partial current month so it isn't understated, and use the recurring salary
  // as the typical-in when available so a double/zero-payday calendar month
  // doesn't skew the median.
  const inByMonth = new Map();
  const outByMonth = new Map();
  const curYm2 = ymOf(asOf);
  for (const r of bankRecords) {
    if (isInternal(r)) continue;
    if (ccyOf(r, base) !== base) continue;
    const d = dateOf(r);
    if (!d || (asOf && d > asOf) || ymOf(d) >= curYm2) continue; // complete months only
    const dir = dirOf(r);
    const a = amtOf(r);
    if (dir === 'out') outByMonth.set(ymOf(d), (outByMonth.get(ymOf(d)) || 0) + a);
    else if (dir === 'in') inByMonth.set(ymOf(d), (inByMonth.get(ymOf(d)) || 0) + a);
  }
  // ONE typical-monthly-income figure, shared with the Plan tab and the cushion
  // goal (shared-helpers' typicalMonthlyValue, the same rule plan.js's
  // typicalIncome runs).
  //
  // This used to prefer salary.typical whenever a recurring salary was
  // detected. That is a DIFFERENT QUESTION: salary.typical is the median of one
  // detected counterparty's payments, not what the person earns in a month.
  // Anyone with a second income stream - interest, a side payment, a second
  // employer - had Position quietly reporting less than the Plan tab resolved
  // its shares against, with no way to tell which was meant. The recurrence
  // rule already handles the boundary drift the salary preference was there
  // for, so there is nothing left for the second path to do.
  const typicalIn = r2(typicalMonthlyValue([...inByMonth.values()]).amount);

  return {
    asOf,
    baseCurrency: base,
    hasBankData: bankRecords.length > 0,
    liquid: liquid.total,
    // When the balances behind that figure were last true, both ends, so a
    // surface can date it honestly instead of stamping it with today.
    liquidFrom: liquid.oldest || null,
    liquidTo: liquid.newest || null,
    perAccount: liquid.perAccount,
    foreign,
    accounts,
    cardBalance,
    // The statement the card figures were read off, so they can be dated by it
    // rather than by the day the summary happened to be produced.
    cardAsOf: (latest && (latest.periodEnd || latest.statementKey)) || null,
    creditLimit,
    utilisation, // % or null
    cardAccount: latest ? String(latest.account || '') : null,
    otherActiveCards,
    incomeStability: {
      cv: cv == null ? null : r2(cv),
      label: stability,
      monthsSeen,
      basis: incomeBasis,
    },
    cashFlow: {
      typicalMonthlyIn: typicalIn,
      typicalMonthlyOut: r2(typicalMonthlyValue([...outByMonth.values()]).amount),
      monthsSeen: outByMonth.size,
    },
    // the one honest liability-vs-cash line: what clearing the card would leave.
    // shown side by side, NEVER auto-netted.
    ifCardCleared: cardBalance != null ? r2(liquid.total - cardBalance) : null,
  };
}

/* ===========================================================================
 *  2) RECORDED NET WORTH - coverage-based, never "complete".
 *     manualAssets: [{ id, class, label, amount, kind:'asset'|'liability',
 *                      lastReviewed:'YYYY-MM-DD' }]
 *     reconciled: the cashAndDebt result (auto-included as Cash & bank + card).
 * ======================================================================== */
export function recordedNetWorth({
  reconciled,
  manualAssets = [],
  investments = [],
  asOf,
  staleAfterDays = 120,
  fx = null,
  fxStaleAfterDays = 14,
}) {
  const included = new Set();
  let assets = 0,
    liabilities = 0;
  const lines = [];

  const entered = reconciled && reconciled.entered ? reconciled.entered : null;
  const provenance = (flag) =>
    entered && flag
      ? { source: 'entered', asOf: typeof flag === 'string' ? flag : entered.asOf }
      : { source: 'reconciled', asOf: reconciled.asOf };
  if (reconciled) {
    const base = reconciled.baseCurrency;
    if (reconciled.hasBankData !== false) {
      assets += reconciled.liquid;
      included.add('Cash & bank');
      lines.push({
        class: 'Cash & bank',
        kind: 'asset',
        amount: r2(reconciled.liquid),
        ...provenance(entered && entered.cash),
      });
      for (const [ccy, amt] of Object.entries(reconciled.foreign || {})) {
        const native = r2(amt);
        const rate =
          fx && fx.rates && fx.base === base && fx.rates[ccy] != null ? Number(fx.rates[ccy]) : null;
        if (rate && rate > 0) {
          const converted = r2(native * rate);
          const ageDays = fx.asOf ? daysBetween(fx.asOf, asOf) : null;
          const rateStale = ageDays != null && ageDays > fxStaleAfterDays;
          assets += converted;
          lines.push({
            class: 'Cash & bank',
            kind: 'asset',
            amount: converted,
            nativeAmount: native,
            currency: ccy,
            rate,
            rateAsOf: fx.asOf || null,
            rateSource: fx.source || null,
            rateStale,
            ...provenance(entered && entered.foreign[ccy]),
          });
        } else {
          lines.push({
            class: 'Cash & bank',
            kind: 'asset',
            amount: native,
            currency: ccy,
            unconverted: true,
            ...provenance(entered && entered.foreign[ccy]),
          });
        }
      }
    }
    if (reconciled.cardBalance != null && reconciled.cardBalance > 1) {
      liabilities += reconciled.cardBalance;
      included.add('Credit card');
      lines.push({
        class: 'Credit card',
        kind: 'liability',
        amount: r2(reconciled.cardBalance),
        ...provenance(entered && entered.card),
      });
    }
  }

  for (const item of investments || []) {
    const amount = r2(Number(item.printedTotal) || 0);
    assets += amount;
    included.add('Investments');
    lines.push({
      class: 'Investments',
      kind: 'asset',
      amount,
      source: 'reconciled',
      statementDate: item.periodEnd || null,
      accountKey: item.accountKey || null,
      label: item.label || 'Investments',
    });
  }

  // manual contributions (dated; may be stale)
  const staleLines = [];
  for (const m of manualAssets) {
    const amount = r2(Number(m.amount) || 0);
    const ageDays = m.lastReviewed ? daysBetween(m.lastReviewed, asOf) : null;
    const stale = ageDays != null && ageDays > staleAfterDays;
    const line = {
      id: m.id,
      class: m.class,
      kind: m.kind,
      amount,
      source: 'self-reported',
      lastReviewed: m.lastReviewed || null,
      ageDays,
      stale,
      label: m.label || m.class,
    };
    if (m.kind === 'liability') liabilities += amount;
    else assets += amount;
    included.add(m.class);
    lines.push(line);
    if (stale) staleLines.push(line);
  }

  const net = r2(assets - liabilities);

  // COVERAGE: which known classes are present vs not-confirmed
  const notIncluded = {
    assets: NET_WORTH_CLASSES.assets.filter((c) => !included.has(c)),
    liabilities: NET_WORTH_CLASSES.liabilities.filter((c) => !included.has(c)),
  };
  const totalClasses = NET_WORTH_CLASSES.assets.length + NET_WORTH_CLASSES.liabilities.length;
  const coveredClasses = included.size;

  return {
    asOf,
    recordedNetWorth: net,
    totalAssets: r2(assets),
    totalLiabilities: r2(liabilities),
    lines, // every figure with its source
    included: [...included],
    notIncluded, // named gaps - the honesty
    coverage: { covered: coveredClasses, of: totalClasses },
    staleLines,
    entered: entered ? { asOf: entered.asOf, held: entered.held || [] } : null,
    isComplete: false,
  };
}

/* ===========================================================================
 *  3) FINANCIAL-POSITION SUMMARY - export from selected evidence, every figure
 *     with period + source. Explicitly NOT "bank-ready".
 * ======================================================================== */
export function financialPositionSummary({
  cashDebt,
  netWorth,
  cfg = {},
  asOf,
  periodLabel = 'as of today',
  fx = null,
}) {
  const c = (cfg && cfg.currency) || {};
  const code = c.code || 'JMD';
  const rows = [];
  // Each row carries a stable KEY as well as its display label. position-render
  // looked rows up by matching the label string, so renaming a label - a purely
  // cosmetic edit - would silently drop that figure out of the shareable
  // summary with nothing failing anywhere. The key is what code matches on; the
  // label is only ever read by people.
  const slug = (label) =>
    String(label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const add = (label, value, source, period, key) =>
    rows.push({ key: key || slug(label), label, value: r2(value), source, period });
  const balancesAsOf = (cd) => {
    const from = cd && cd.liquidFrom;
    const to = cd && cd.liquidTo;
    if (!to) return `as of ${cd ? cd.asOf : ''}`;
    return from && from !== to ? `as of ${from} to ${to}` : `as of ${to}`;
  };

  if (cashDebt) {
    if (cashDebt.hasBankData !== false) {
      // A SUM OF BALANCES HAS NO SINGLE DATE. This said "as of <today>" for a
      // figure whose parts were last confirmed weeks apart - on the real set,
      // one account carrying most of the cash had not been seen since a
      // statement seven weeks earlier. In the one artefact built to be handed
      // to somebody else, that is the difference between a fact and a claim.
      add('Cash on hand', cashDebt.liquid, 'reconciled from statements', balancesAsOf(cashDebt));
      for (const [ccy, amt] of Object.entries(cashDebt.foreign || {})) {
        const rate =
          fx && fx.rates && fx.base === cashDebt.baseCurrency && fx.rates[ccy] != null
            ? Number(fx.rates[ccy])
            : null;
        if (rate && rate > 0) {
          add(
            `Cash (${ccy}) - converted`,
            r2(amt * rate),
            `${ccy} ${r2(amt)} at ${rate} per ${ccy}, rate ${fx.asOf || 'unknown'} (${fx.source || 'source unknown'})`,
            balancesAsOf(cashDebt)
          );
        } else {
          add(
            `Cash (${ccy})`,
            amt,
            'reconciled from statements (not converted)',
            balancesAsOf(cashDebt)
          );
        }
      }
    }
    const cardAsOf = `as of ${cashDebt.cardAsOf || cashDebt.asOf}`;
    if (cashDebt.cardBalance != null)
      add('Card balance', cashDebt.cardBalance, 'reconciled from statement', cardAsOf);
    if (cashDebt.utilisation != null)
      add('Card utilisation %', cashDebt.utilisation, 'reconciled from statement', cardAsOf);
    if (cashDebt.hasBankData !== false) {
      add(
        'Typical monthly income',
        cashDebt.cashFlow.typicalMonthlyIn,
        `typical of ${cashDebt.cashFlow.monthsSeen} months`,
        'recent history'
      );
      add(
        'Typical monthly outflow',
        cashDebt.cashFlow.typicalMonthlyOut,
        `typical of ${cashDebt.cashFlow.monthsSeen} months`,
        'recent history'
      );
    }
  }
  const selfReported = [];
  if (netWorth) {
    for (const l of netWorth.lines.filter((x) => x.class === 'Investments' && x.source === 'reconciled')) {
      add(l.label || 'Investments', l.amount, 'printed on investment statement', `as of ${l.statementDate}`);
    }
    add('Recorded net worth', netWorth.recordedNetWorth, 'mixed (see lines)', `as of ${asOf}`);
    for (const l of netWorth.lines.filter((x) => x.source === 'self-reported')) {
      selfReported.push({
        label: l.label,
        value: l.amount,
        kind: l.kind,
        lastReviewed: l.lastReviewed,
        stale: l.stale,
      });
    }
  }

  return {
    title: 'Financial position summary',
    currency: code,
    generatedFor: periodLabel,
    asOf,
    rows, // each with value/source/period (source/period read by the clipboard only)
    selfReported, // clearly separated from reconciled
    coverageNote: netWorth
      ? `${netWorth.included.length ? `Net worth includes ${joinWithAnd(netWorth.included)}. ` : ''}Not included or not confirmed: ${[...netWorth.notIncluded.assets, ...netWorth.notIncluded.liabilities].join(', ') || 'none'}.`
      : '',
    // Two disclaimers by medium: the SCREEN shows the terse caveat (a glance
    // reassurance under a card whose title already says what it is for); the
    // CLIPBOARD carries the fuller one, since a banker reading pasted text has
    // no card title and benefits from the self-reported/dated note spelled out.
    // Same split we already make for provenance (tag on screen, words in copy).
    disclaimer: 'A personal summary - not a verified or lender-approved statement.',
    exportDisclaimer:
      'A personal summary from your imported statements and figures you entered by hand. Figures you entered are marked self-reported and dated. Not a verified or lender-approved statement.',
  };
}

/* ===========================================================================
 *  view-models - number/tag/detail, frozen shape, pronoun-free tags.
 * ======================================================================== */
export function buildCashDebtModel(cd, cfg = {}) {
  const money = makeMoney(cfg);
  const cards = [];
  if (cd.hasBankData !== false) {
    cards.push({
      id: 'cash',
      label: 'Cash on hand',
      amountText: money(cd.liquid),
      tag: Object.keys(cd.foreign || {}).length
        ? `plus ${Object.keys(cd.foreign).join(', ')} separate`
        : 'across accounts',
      tone: 'neutral',
      detail: `as of ${cd.asOf}`,
    });
  }
  if (cd.cardBalance != null) {
    const others = cd.otherActiveCards || [];
    cards.push({
      id: 'card',
      label: 'Owed on card',
      amountText: money(cd.cardBalance),
      tag: cd.utilisation != null ? `${cd.utilisation}% of limit used` : 'balance',
      tone: cd.utilisation != null && cd.utilisation >= 50 ? 'watch' : 'neutral',
      detail: [
        others.length
          ? `This is the card ending ${cd.cardAccount}. ${others.length === 1 ? 'One other card has' : `${others.length} other cards have`} statements here and ${others.length === 1 ? 'is' : 'are'} not counted in what you owe.`
          : '',
        'Utilisation is a credit-score input, not a spending or interest measure.',
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
  if (cd.hasBankData !== false) {
    cards.push({
      id: 'income',
      label: 'Income stability',
      amountText: cd.incomeStability.label,
      tag: cd.incomeStability.monthsSeen + ' months',
      tone: 'neutral',
      detail: `Across ${cd.incomeStability.monthsSeen} months.`,
    });
  }
  return { asOf: cd.asOf, cards };
}

export function buildNetWorthModel(nw, cfg = {}) {
  const money = makeMoney(cfg);
  const prose = makeProseMoney(cfg);
  const gaps = [...nw.notIncluded.assets, ...nw.notIncluded.liabilities];
  const recorded = nw.included.map((cls) => (/^[A-Z][a-z]/.test(cls) ? cls.charAt(0).toLowerCase() + cls.slice(1) : cls));
  return {
    lead: {
      label: recorded.length ? `Recorded net worth across ${joinWithAnd(recorded)}` : 'Recorded net worth',
      amountText: money(nw.recordedNetWorth),
      detail: `Recorded assets ${prose(nw.totalAssets)} \u2212 recorded debts ${prose(nw.totalLiabilities)} = recorded net worth ${prose(nw.recordedNetWorth)}.`,
    },
    coverageNote: gaps.length
      ? `Not included or not confirmed: ${gaps.join(', ')}.`
      : 'All common classes are represented.',
    staleWarning: nw.staleLines.length
      ? `${nw.staleLines.length} entered figure${nw.staleLines.length === 1 ? '' : 's'} may be out of date and could use a review.`
      : '',
    lines: nw.lines,
    notIncluded: nw.notIncluded,
  };
}



/* helper: a stored manual-asset record */
export function makeManualAsset({
  class: cls,
  label,
  amount,
  kind,
  lastReviewed,
  now = new Date().toISOString(),
}) {
  return {
    id: `asset_${Math.random().toString(36).slice(2, 10)}`,
    class: cls,
    label: label || cls,
    amount: r2(amount),
    kind: kind || 'asset',
    lastReviewed: lastReviewed || now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
  };
}
