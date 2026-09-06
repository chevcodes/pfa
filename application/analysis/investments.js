import { monthKey, monthIndex, roundMoney } from '../core/shared-helpers.js';
import { securityKey } from '../statements/read-investments.js';

export const MONTH_MOVE_SHARE = 0.05;
export const CROSS_CHECK_TOLERANCE = 1;
export const VALUE_DROP_WATCH_SHARE = 0.1;
export const VALUE_DROP_ALERT_SHARE = 0.2;

const r2 = (n) => roundMoney(Number(n) || 0);
export const INVESTMENT_PROVIDER_LABELS = { scotia: 'Scotia', ncb: 'NCB' };
const INVESTMENT_PROVIDER_ORDER = { scotia: 0, ncb: 1 };

export function investmentProvider(statement) {
  return statement && statement.provider ? statement.provider : 'scotia';
}

export function investmentAccountKey(statement) {
  return `${investmentProvider(statement)}|${String((statement && statement.account) || '')}`;
}

export function investmentAccountLabel(statement, statements = []) {
  const provider = investmentProvider(statement);
  const base = INVESTMENT_PROVIDER_LABELS[provider] || provider.toUpperCase();
  const peers = latestInvestmentStatements(statements).filter(
    (item) => investmentProvider(item) === provider
  );
  return peers.length > 1 ? `${base} …${String(statement.account).slice(-4)}` : base;
}

function monthNumber(iso) {
  return monthIndex(monthKey(String(iso || '')));
}

function monthOfIndex(index) {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

const accountMonthKey = (s) => `${investmentAccountKey(s)}|${monthKey(String(s.periodEnd))}`;

export function sortedInvestmentStatements(statements) {
  const sorted = (Array.isArray(statements) ? statements : [])
    .filter((s) => s && s.account && s.periodEnd)
    .slice()
    .sort((a, b) => String(a.periodEnd).localeCompare(String(b.periodEnd)));
  const latestInMonth = new Map();
  for (const s of sorted) latestInMonth.set(accountMonthKey(s), s);
  return sorted.filter((s) => latestInMonth.get(accountMonthKey(s)) === s);
}

export function supersededInvestmentStatements(statements) {
  const kept = new Set(sortedInvestmentStatements(statements));
  return (Array.isArray(statements) ? statements : []).filter((s) => s && s.account && s.periodEnd && !kept.has(s));
}

export function latestInvestmentStatements(statements) {
  const latest = new Map();
  for (const s of sortedInvestmentStatements(statements)) latest.set(investmentAccountKey(s), s);
  return [...latest.values()];
}

export function previousInvestmentStatement(statements, statement) {
  const key = investmentAccountKey(statement);
  const earlier = sortedInvestmentStatements(statements).filter(
    (s) => investmentAccountKey(s) === key && s.periodEnd < statement.periodEnd
  );
  const prev = earlier[earlier.length - 1] || null;
  const consecutive = !!prev && monthNumber(statement.periodEnd) - monthNumber(prev.periodEnd) === 1;
  return { prev, consecutive };
}

export function costPerUnit(h) {
  if (!h || h.kind === 'cash') return null;
  if (h.costBasisType === 'total' || (!h.costBasisType && h.kind === 'equity')) {
    const quantity = Number(h.quantity);
    return quantity > 0 && Number.isFinite(Number(h.avgCostRaw)) ? Number(h.avgCostRaw) / quantity : null;
  }
  return Number(h.avgCostRaw) > 0 ? Number(h.avgCostRaw) : null;
}

export function holdingCostBasis(h) {
  if (!h || h.kind === 'cash') return null;
  if (h.costBasisType === 'total' || (!h.costBasisType && h.kind === 'equity'))
    return Number(h.avgCostRaw);
  return Number(h.avgCostRaw) * Number(h.quantity);
}

export function holdingCostGain(h) {
  if (!h || h.kind === 'cash') return null;
  if (h.unrealisedGainLoss != null && Number.isFinite(Number(h.unrealisedGainLoss)))
    return Number(h.unrealisedGainLoss);
  const basis = holdingCostBasis(h);
  const value = Number(h.value);
  return Number.isFinite(basis) && Number.isFinite(value) ? value - basis : null;
}

export function costReturn(h) {
  const basis = holdingCostBasis(h);
  const gain = holdingCostGain(h);
  return basis > 0 && gain != null && Number.isFinite(gain) ? gain / basis : null;
}

export function rowConsistent(h) {
  if (!h || h.kind === 'cash') return true;
  const quantity = Number(h.quantity);
  const price = Number(h.price);
  const value = Number(h.value);
  if (h.quantity == null || h.price == null || h.value == null) return false;
  if (![quantity, price, value].every(Number.isFinite)) return false;
  return Math.abs(quantity * price - value) <= 0.01 + 0.0005 * Math.abs(value);
}

export function verifyAverageCost(h, prevH) {
  if (!h || h.kind === 'cash') return { ok: true, checked: false };
  const cpu = costPerUnit(h);
  if (!(cpu > 0) || !rowConsistent(h)) return { ok: false, checked: true };
  if (!prevH || !(costPerUnit(prevH) > 0)) return { ok: true, checked: false };
  const delta = Number(h.quantity) - Number(prevH.quantity);
  const basisChange = holdingCostBasis(h) - holdingCostBasis(prevH);
  const rounding =
    h.kind === 'fund' ? 0.005 * (Number(h.quantity) + Number(prevH.quantity)) + 0.01 : 0.01;
  if (Math.abs(delta) < 1e-9) return { ok: Math.abs(basisChange) <= rounding, checked: true };
  if (delta > 0) {
    const trade = delta * Number(h.price);
    const slack = (h.kind === 'fund' ? 0.03 : 0.1) * Math.abs(trade);
    return { ok: Math.abs(basisChange - trade) <= Math.max(rounding, slack), checked: true };
  }
  const tolerance = h.kind === 'fund' ? 0.006 : 0.01 + 0.001 * costPerUnit(prevH);
  return { ok: Math.abs(cpu - costPerUnit(prevH)) <= tolerance, checked: true };
}

function wholeNumber(n) {
  return Math.abs(n - Math.round(n)) < 0.00005;
}

export function isStableValue(h, history = []) {
  if (!h || h.kind !== 'fund') return false;
  const nav = Number(h.price);
  const cpu = costPerUnit(h);
  if (!(nav > 0) || cpu == null || !wholeNumber(nav) || Math.abs(nav - cpu) >= 0.005) return false;
  return (history || []).every((x) => Math.abs(Number(x.price) - nav) < 0.00005);
}

export function pagesComplete(statement) {
  const declared = Number(statement && statement.pagesDeclared) || 0;
  if (!declared) return false;
  const seen = new Set((statement.pagesSeen || []).map(Number));
  for (let page = 1; page <= declared; page++) if (!seen.has(page)) return false;
  return true;
}

export function statementContributions(statement) {
  const rows = (statement && statement.cashActivity) || [];
  const known =
    pagesComplete(statement) && !(statement.cashActivitySection && !rows.length);
  const byCurrency = {};
  if (known) {
    for (const row of rows) {
      if (row.type !== 'D') continue;
      const ccy = row.currency || '';
      byCurrency[ccy] = r2((byCurrency[ccy] || 0) + Number(row.amount));
    }
  }
  return { known, byCurrency, hasWithdrawals: rows.some((row) => row.type === 'W') };
}

function amountInBase(byCurrency, fxRates, base) {
  let total = 0;
  for (const [ccy, amount] of Object.entries(byCurrency || {})) {
    if (!ccy || ccy === base) {
      total += Number(amount) || 0;
      continue;
    }
    const rate = Number((fxRates || {})[ccy]);
    if (!(rate > 0)) return null;
    total += (Number(amount) || 0) * rate;
  }
  return r2(total);
}

function nativeForeignValues(statement, base) {
  const out = {};
  for (const h of (statement && statement.holdings) || []) {
    if (!h.currency || h.currency === base) continue;
    out[h.currency] = (out[h.currency] || 0) + (Number(h.value) || 0);
  }
  return out;
}

function fxEffectBetween(prev, cur, base) {
  let effect = 0;
  for (const [ccy, value] of Object.entries(nativeForeignValues(prev, base))) {
    if (!value) continue;
    const before = Number((prev.fxRates || {})[ccy]);
    const after = Number((cur.fxRates || {})[ccy]);
    if (!(before > 0) || !(after > 0)) return null;
    effect += value * (after - before);
  }
  return effect;
}

export function holdingRole(h, ctx = {}) {
  if (!h) return 'performing';
  if (h.kind === 'cash') return 'cash';
  if (isStableValue(h, ctx.history || [])) return 'stable';
  if (ctx.prev && ctx.consecutive) {
    return (ctx.prev.holdings || []).some((x) => x.key === h.key) ? 'performing' : 'new';
  }
  if (
    h.kind === 'equity' &&
    h.lastMonthValue != null &&
    Number(h.lastMonthValue) === Number(h.value) &&
    Number(h.statedChangePct) === 0 &&
    ctx.contribution &&
    ctx.contribution.hasWithdrawals
  )
    return 'new';
  return 'performing';
}

export function monthMove(h, ctx = {}) {
  if (!h || h.kind === 'cash') return { pct: null, state: 'none' };
  const pct =
    h.statedChangePct != null && Number.isFinite(Number(h.statedChangePct))
      ? Number(h.statedChangePct)
      : null;
  if (pct == null) return { pct: null, state: 'none' };
  if (ctx.role === 'new') return { pct, state: 'new' };
  if (ctx.prev && ctx.consecutive) {
    const prevH = ctx.prevH || null;
    if (!prevH) return { pct, state: 'new' };
    const delta = Number(h.quantity) - Number(prevH.quantity);
    if (h.kind === 'equity') {
      if (Math.abs(delta) > 1e-9) return { pct, state: delta > 0 ? 'bought' : 'sold' };
      return { pct, state: 'clean' };
    }
    const last = Math.abs(Number(h.lastMonthValue)) || 0;
    if (Math.abs(delta) * Number(h.price) > MONTH_MOVE_SHARE * last)
      return { pct, state: delta > 0 ? 'bought' : 'sold' };
    return { pct, state: 'clean' };
  }
  const c = ctx.contribution;
  if (c && (!c.known || c.hasWithdrawals || Object.values(c.byCurrency).some((v) => v > 0)))
    return { pct, state: 'uncertain' };
  return { pct, state: 'clean' };
}

export function statementIntegrity(statement, base = 'JMD') {
  let computed = 0;
  let fxMissing = false;
  for (const h of (statement && statement.holdings) || []) {
    if (h.valueBase != null && Number.isFinite(Number(h.valueBase))) {
      computed += Number(h.valueBase);
    } else if (!h.currency || h.currency === base) {
      computed += Number(h.value) || 0;
    } else {
      const rate = Number((statement.fxRates || {})[h.currency]);
      if (rate > 0) computed += (Number(h.value) || 0) * rate;
      else fxMissing = true;
    }
  }
  const gap = statement && statement.printedTotal != null ? r2(computed - Number(statement.printedTotal)) : null;
  return {
    pagesOk: pagesComplete(statement),
    crossCheckGap: gap,
    crossCheckOk: gap != null && !fxMissing && Math.abs(gap) <= CROSS_CHECK_TOLERANCE,
    fxMissing,
    unreadRows: ((statement && statement.warnings) || []).filter((w) => w === 'row-unread').length,
  };
}

export function repairInvestmentStatementTotal(statement, base = 'JMD') {
  if (!statement || investmentProvider(statement) !== 'ncb') return statement;
  if (statement.portfolioTotal != null) return statement;
  if ((statement.warnings || []).some((warning) => warning === 'row-unread')) return statement;
  if (!Array.isArray(statement.classTotals) || !statement.classTotals.length) return statement;
  const printed = Number(statement.printedTotal);
  if (!Number.isFinite(printed)) return statement;
  const classTotal = r2(
    statement.classTotals.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  );
  const integrity = statementIntegrity(statement, base);
  const holdingsTotal = r2(printed + (Number(integrity.crossCheckGap) || 0));
  if (Math.abs(classTotal - holdingsTotal) > CROSS_CHECK_TOLERANCE) return statement;
  if (Math.abs(classTotal - printed) <= CROSS_CHECK_TOLERANCE) return statement;
  return { ...statement, portfolioTotal: printed, printedTotal: classTotal };
}

function accountSnapshot(sorted, statement, base) {
  const { prev, consecutive } = previousInvestmentStatement(sorted, statement);
  const contribution = statementContributions(statement);
  const added = contribution.known ? amountInBase(contribution.byCurrency, statement.fxRates, base) : null;
  const key = investmentAccountKey(statement);
  const sameAccount = sorted.filter((s) => investmentAccountKey(s) === key);
  const holdings = (statement.holdings || []).map((h) => {
    const history = sameAccount.flatMap((s) => (s.holdings || []).filter((x) => x.key === h.key));
    const prevH = prev ? (prev.holdings || []).find((x) => x.key === h.key) || null : null;
    const role = holdingRole(h, { prev, consecutive, history, contribution });
    return {
      ...h,
      role,
      costPerUnit: costPerUnit(h),
      costReturn: role === 'performing' || role === 'new' ? costReturn(h) : null,
      costGain: holdingCostGain(h),
      costBasis: holdingCostBasis(h),
      performanceProvenance: h.unrealisedGainLoss != null ? 'statement' : 'derived',
      costConfirmed: verifyAverageCost(h, consecutive ? prevH : null).ok,
      move: monthMove(h, { prev, consecutive, prevH, role, contribution }),
      rate: !h.currency || h.currency === base ? 1 : Number((statement.fxRates || {})[h.currency]) || null,
    };
  });
  const disappeared =
    prev && consecutive
      ? (prev.holdings || [])
          .filter((x) => x.kind !== 'cash' && !holdings.some((h) => h.key === x.key))
          .map((x) => ({ key: x.key, kind: x.kind, description: x.description }))
      : [];
  const performanceRows = holdings.filter(
    (h) => h.kind !== 'cash' && h.costBasis > 0 && h.costGain != null && h.rate
  );
  const performanceCost = performanceRows.reduce((sum, h) => sum + h.costBasis * h.rate, 0);
  const performanceGain = performanceRows.reduce((sum, h) => sum + h.costGain * h.rate, 0);
  const performanceSources = new Set(performanceRows.map((h) => h.performanceProvenance));
  return {
    provider: investmentProvider(statement),
    providerLabel: INVESTMENT_PROVIDER_LABELS[investmentProvider(statement)] || investmentProvider(statement).toUpperCase(),
    accountKey: key,
    account: statement.account,
    hash: statement.hash,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    headlineTotal: statement.printedTotal,
    cashParked: r2(
      holdings
        .filter((h) => h.kind === 'cash')
        .reduce((sum, h) => sum + (h.valueBase != null ? Number(h.valueBase) : Number(h.value) || 0), 0)
    ),
    contribution: { known: added != null, amount: added, byCurrency: contribution.byCurrency },
    holdings,
    disappeared,
    integrity: statementIntegrity(statement, base),
    fxRates: statement.fxRates || {},
    performance: {
      cost: r2(performanceCost),
      gain: r2(performanceGain),
      pct: performanceCost > 0 ? performanceGain / performanceCost : null,
      provenance: performanceSources.size > 1 ? 'mixed' : [...performanceSources][0] || null,
    },
  };
}

function holdingBaseValue(h) {
  if (h.valueBase != null && Number.isFinite(Number(h.valueBase))) return Number(h.valueBase);
  return h.rate ? Number(h.value) * Number(h.rate) : null;
}

export function mergeInvestmentHoldings(accounts) {
  const groups = new Map();
  for (const account of accounts || []) {
    for (const holding of account.holdings || []) {
      const key = `${securityKey(holding.kind, holding.description)}|${holding.currency || ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...holding, accountKey: account.accountKey, accountLabel: account.providerLabel });
    }
  }
  const out = [];
  for (const rows of groups.values()) {
    if (rows.length === 1) {
      out.push({ ...rows[0], accounts: [rows[0].accountKey] });
      continue;
    }
    const quantity = rows.reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);
    const value = rows.reduce((sum, h) => sum + (Number(h.value) || 0), 0);
    const valueBaseRows = rows.map(holdingBaseValue);
    const basis = rows.reduce((sum, h) => sum + (Number(h.costBasis) || 0), 0);
    const gain = rows.reduce((sum, h) => sum + (Number(h.costGain) || 0), 0);
    const sources = new Set(rows.map((h) => h.performanceProvenance).filter(Boolean));
    out.push({
      ...rows[0],
      key: `combined|${securityKey(rows[0].kind, rows[0].description)}|${rows[0].currency || ''}`,
      quantity,
      avgCostRaw: basis,
      costBasisType: 'total',
      price: quantity > 0 ? value / quantity : null,
      value: r2(value),
      valueBase: valueBaseRows.every((n) => n != null)
        ? r2(valueBaseRows.reduce((sum, n) => sum + n, 0))
        : null,
      costPerUnit: quantity > 0 ? basis / quantity : null,
      costBasis: r2(basis),
      costGain: r2(gain),
      costReturn: basis > 0 ? gain / basis : null,
      costConfirmed: rows.every((h) => h.costConfirmed),
      performanceProvenance: sources.size > 1 ? 'mixed' : [...sources][0] || null,
      move: { pct: null, state: 'none' },
      merged: true,
      accounts: rows.map((h) => h.accountKey),
      provenance: rows.map((h) => ({ accountKey: h.accountKey, fields: h.provenance })),
    });
  }
  return out.sort((a, b) => Number(b.valueBase ?? b.value) - Number(a.valueBase ?? a.value));
}

export function investmentSnapshot(statements, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const sorted = sortedInvestmentStatements(statements);
  const allLatest = latestInvestmentStatements(sorted);
  const selected = opts.accountKey && opts.accountKey !== 'all'
    ? allLatest.filter((statement) => investmentAccountKey(statement) === opts.accountKey)
    : allLatest;
  const accounts = selected.map((statement) =>
    accountSnapshot(sorted, statement, base)
  );
  let combinedTotal = 0;
  for (const account of accounts) combinedTotal += Number(account.headlineTotal) || 0;
  const performanceCost = accounts.reduce((sum, account) => sum + account.performance.cost, 0);
  const performanceGain = accounts.reduce((sum, account) => sum + account.performance.gain, 0);
  const accountDirections = accounts
    .filter((account) => account.performance.pct != null)
    .map((account) => Math.sign(account.performance.gain));
  const holdings = mergeInvestmentHoldings(accounts);
  const statementDates = [...new Set(accounts.map((account) => account.periodEnd))].sort();
  return {
    accounts,
    availableAccounts: allLatest
      .map((statement) => ({
        accountKey: investmentAccountKey(statement),
        account: statement.account,
        provider: investmentProvider(statement),
        label: investmentAccountLabel(statement, sorted),
      }))
      .sort(
        (a, b) =>
          (INVESTMENT_PROVIDER_ORDER[a.provider] ?? 99) -
            (INVESTMENT_PROVIDER_ORDER[b.provider] ?? 99) || a.label.localeCompare(b.label)
      ),
    selectedAccountKey: accounts.length === 1 && opts.accountKey !== 'all' ? accounts[0].accountKey : 'all',
    holdings,
    combinedTotal: r2(combinedTotal),
    cashParked: r2(accounts.reduce((sum, a) => sum + a.cashParked, 0)),
    asOf: accounts.map((a) => a.periodEnd).sort().pop() || null,
    asOfMixed: statementDates.length > 1,
    performance: {
      cost: r2(performanceCost),
      gain: r2(performanceGain),
      pct: performanceCost > 0 ? performanceGain / performanceCost : null,
      mixedAccounts: accountDirections.some((direction) => direction < 0) && accountDirections.some((direction) => direction >= 0),
      // WHICH account is falling, not merely that one is. The surface told a
      // person the combined figure could be hiding one and asked them to go
      // and find it by switching accounts one at a time; it can only stop
      // doing that if the model says which.
      falling: accounts
        .filter((account) => account.performance.pct != null && account.performance.gain < 0)
        .map((account) => account.accountKey),
      mixedHoldings: holdings.some((h) => Number(h.costGain) < 0) && holdings.some((h) => Number(h.costGain) >= 0),
    },
  };
}

export function investmentContributionsByMonth(statements, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const sorted = sortedInvestmentStatements(statements);
  const selected = opts.accountKey && opts.accountKey !== 'all'
    ? sorted.filter((s) => investmentAccountKey(s) === opts.accountKey)
    : sorted;
  const allAccounts = new Set(selected.map(investmentAccountKey));
  const byMonth = new Map();
  for (const statement of selected) {
    const month = monthKey(statement.periodEnd);
    if (!byMonth.has(month)) byMonth.set(month, { month, amount: 0, known: true, accounts: new Set() });
    const entry = byMonth.get(month);
    const c = statementContributions(statement);
    const inBase = c.known ? amountInBase(c.byCurrency, statement.fxRates, base) : null;
    if (inBase == null) entry.known = false;
    else entry.amount = r2(entry.amount + inBase);
    entry.accounts.add(investmentAccountKey(statement));
  }
  const out = new Map();
  for (const [month, entry] of byMonth) {
    out.set(month, {
      month,
      amount: entry.amount,
      known: entry.known && entry.accounts.size === allAccounts.size,
    });
  }
  return out;
}

export function investmentValueSeries(statements, opts = {}) {
  const all = sortedInvestmentStatements(statements);
  const sorted = opts.accountKey && opts.accountKey !== 'all'
    ? all.filter((s) => investmentAccountKey(s) === opts.accountKey)
    : all;
  if (!sorted.length) return [];
  const allAccounts = new Set(sorted.map(investmentAccountKey));
  const spans = new Map();
  for (const s of sorted) {
    const key = investmentAccountKey(s);
    spans.set(key, [spans.has(key) ? spans.get(key)[0] : monthNumber(s.periodEnd), monthNumber(s.periodEnd)]);
  }
  const contributions = investmentContributionsByMonth(sorted, opts);
  const first = monthNumber(sorted[0].periodEnd);
  const last = monthNumber(sorted[sorted.length - 1].periodEnd);
  const rows = [];
  for (let index = first; index <= last; index++) {
    const month = monthOfIndex(index);
    const here = sorted.filter((s) => monthKey(s.periodEnd) === month);
    const c = contributions.get(month) || null;
    const accounts = [...new Set(here.map(investmentAccountKey))];
    const missingAccounts = [...spans]
      .filter(([key, [from, to]]) => from < index && index < to && !accounts.includes(key))
      .map(([key]) => key);
    const present = here.length > 0 && !missingAccounts.length;
    let total = null;
    if (present) {
      total = 0;
      for (const s of here) total += Number(s.printedTotal) || 0;
      total = r2(total);
    }
    rows.push({
      month,
      total,
      present,
      partialAccounts: present && accounts.length < allAccounts.size,
      accounts,
      missingAccounts,
      contribution: c ? c.amount : 0,
      contributionKnown: c ? c.known : false,
    });
  }
  return rows;
}

export function movementTone(share) {
  const drop = -Number(share);
  if (!(drop >= VALUE_DROP_WATCH_SHARE)) return 'neutral';
  return drop >= VALUE_DROP_ALERT_SHARE ? 'alert' : 'watch';
}

export function latestValueMovement(statements, opts = {}) {
  const rows = investmentValueSeries(statements, opts);
  const to = rows[rows.length - 1];
  const from = rows[rows.length - 2];
  if (!to || !from || !to.present || !from.present || to.partialAccounts || from.partialAccounts) return null;
  if (!(Number(from.total) > 0)) return null;
  const change = r2(to.total - from.total);
  const added = to.contributionKnown ? r2(to.contribution) : null;
  return {
    from: from.month,
    to: to.month,
    fromTotal: from.total,
    toTotal: to.total,
    change,
    added,
    tone: movementTone((added == null ? change : change - added) / from.total),
  };
}

export function growthExcludingContributions(statements, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const sorted = sortedInvestmentStatements(statements);
  const out = [];
  for (const account of new Set(sorted.map(investmentAccountKey))) {
    if (opts.accountKey && opts.accountKey !== 'all' && account !== opts.accountKey) continue;
    const list = sorted.filter((s) => investmentAccountKey(s) === account);
    if (list.length < 2) continue;
    let growth = 0;
    let added = 0;
    let fxEffect = 0;
    let months = 0;
    let brokenBy = null;
    let index = list.length - 1;
    for (; index > 0; index--) {
      const cur = list[index];
      const prev = list[index - 1];
      if (monthNumber(cur.periodEnd) - monthNumber(prev.periodEnd) !== 1) {
        brokenBy = 'gap';
        break;
      }
      const c = statementContributions(cur);
      const addedHere = c.known ? amountInBase(c.byCurrency, cur.fxRates, base) : null;
      if (addedHere == null) {
        brokenBy = 'contribution';
        break;
      }
      const fx = fxEffectBetween(prev, cur, base);
      if (fx == null) {
        brokenBy = 'rate';
        break;
      }
      growth += Number(cur.printedTotal) - Number(prev.printedTotal) - addedHere - fx;
      added += addedHere;
      fxEffect += fx;
      months++;
    }
    out.push({
      account: list[list.length - 1].account,
      accountKey: account,
      provider: investmentProvider(list[list.length - 1]),
      from: months ? list[index].periodEnd : null,
      fromTotal: months ? r2(list[index].printedTotal) : null,
      to: list[list.length - 1].periodEnd,
      months,
      growth: r2(growth),
      added: r2(added),
      fxEffect: r2(fxEffect),
      brokenBy,
    });
  }
  return out;
}

export function growthRunComponents(run, money) {
  const movement = `the investments ${run.growth >= 0 ? 'grew' : 'fell'} by about ${money(Math.abs(run.growth))}`;
  const growth = {
    key: 'growth',
    amount: Math.abs(Number(run.growth) || 0),
    direction: run.growth >= 0 ? 'up' : 'down',
    inline: run.provider === 'ncb' ? movement : `${movement} on their own`,
    standalone: run.provider === 'ncb' ? movement : `${movement} on their own`,
  };
  if (run.provider === 'ncb') return [growth];
  return [
    {
      key: 'contribution',
      amount: Math.max(0, Number(run.added) || 0),
      direction: 'in',
      inline: `you added ${money(run.added)}`,
      standalone: `you added ${money(run.added)} to your investments`,
    },
    growth,
  ];
}

export function growthRunClause(run, money) {
  return growthRunComponents(run, money)
    .map((component) => component.inline)
    .join(' and ');
}

export function growthRunSentence(run, { who = '', money, monthOf }) {
  const fx = run.fxEffect
    ? ` Exchange-rate movement ${run.fxEffect >= 0 ? 'added' : 'took off'} about ${money(Math.abs(run.fxEffect))}.`
    : '';
  return `${who}Comparing stored statements from ${monthOf(run.from)} to ${monthOf(run.to)}, ${growthRunClause(run, money)}.${fx}`;
}

export function investmentNetWorthItems(statements) {
  const latest = latestInvestmentStatements(statements);
  return latest.map((s) => ({
    provider: investmentProvider(s),
    account: s.account,
    periodEnd: s.periodEnd,
    printedTotal: s.printedTotal,
    accountKey: investmentAccountKey(s),
    label: latest.length > 1 ? `Investments · ${investmentAccountLabel(s, statements)}` : 'Investments',
  }));
}
