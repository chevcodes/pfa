import {
  roundMoney,
  median,
  monthKey,
  monthIndex,
  recurringStatus,
  medianDayOfMonth,
  isoDay,
  typicalMonthlyValue,
  isCountedBankIncome,
  isInternal,
  dirOf,
  amtOf,
  ccyOf,
  dateOf,
} from '../core/shared-helpers.js';
import { categoryMeta } from './category-flow.js';
import { sortedInvestmentStatements } from './investments.js';
import { answerFor } from './confirmations.js';

const cache = new WeakMap();
const emptyRows = [];
const emptyConfig = {};
const emptyConfirmations = [];

const DEFAULT_STEADY_SPREAD_DAYS = 6;

export function resolveIncomeOptions(cfg = {}) {
  const ahead = cfg.ahead || {};
  const insights = cfg.insights || {};
  return {
    minMonths: ahead.minMonths == null ? 3 : ahead.minMonths,
    tolerance: ahead.tolerance == null ? 0.15 : ahead.tolerance,
    maxGapMonths: ahead.maxGapMonths == null ? 2 : ahead.maxGapMonths,
    steadySpreadDays: ahead.steadySpreadDays == null ? DEFAULT_STEADY_SPREAD_DAYS : ahead.steadySpreadDays,
    lateGraceDays: ahead.lateGraceDays == null ? 5 : ahead.lateGraceDays,
    baseCurrency: cfg.currency?.code || 'JMD',
    incomeFloor: insights.meaningfulChangeMin == null ? 3000 : insights.meaningfulChangeMin,
    commitmentFloor: 1000,
  };
}

const payKey = (row) => row.counterpartyKey || row.Group || row.counterpartyLabel ||
  row['Counterparty / Merchant'] || 'ext:' + String(row.description || row['Raw Description'] || 'unknown').toUpperCase();
const patternKey = (row) => row.counterpartyKey || 'ext:' + String(row.description || '').toUpperCase();
const monthOf = (date) => String(date || '').slice(0, 7);
const dayOf = (date) => +String(date || '').slice(8, 10) || 0;

function maximumGap(months) {
  const indices = months.map(monthIndex).filter((value) => !Number.isNaN(value)).sort((a, b) => a - b);
  let result = 0;
  for (let index = 1; index < indices.length; index++) result = Math.max(result, indices[index] - indices[index - 1]);
  return result;
}

export function detectIncomeStreams(records, opts, profile = 'pay', asOf = null, baseCurrency = opts.baseCurrency) {
  const pattern = profile === 'pattern';
  const groups = new Map();
  let latestMonth = '';
  if (pattern) for (const row of records || []) {
    const month = monthOf(row.date);
    if (month > latestMonth) latestMonth = month;
  }
  for (const row of records || []) {
    if (pattern
      ? (row.currency || baseCurrency) !== baseCurrency || !isCountedBankIncome(row)
      : !isCountedBankIncome(row, dirOf(row), isInternal(row)) || ccyOf(row, baseCurrency) !== baseCurrency ||
        (asOf && dateOf(row) > asOf)) continue;
    const key = pattern ? patternKey(row) : payKey(row);
    if (!groups.has(key)) groups.set(key, { key, rows: [], byMonth: new Map(), dates: [], label: pattern
      ? row.counterpartyLabel || row.description || key
      : String(row.counterpartyLabel || row.description || key) });
    const group = groups.get(key);
    const date = pattern ? row.date : dateOf(row);
    const month = monthOf(date);
    const amount = pattern ? row.amount : amtOf(row);
    group.rows.push(row);
    group.byMonth.set(month, pattern
      ? roundMoney((group.byMonth.get(month) || 0) + amount)
      : (group.byMonth.get(month) || 0) + amount);
    if (!pattern || date) group.dates.push(date);
  }
  const streams = [];
  for (const group of groups.values()) {
    const months = [...group.byMonth.keys()].sort();
    if (months.length < opts.minMonths || maximumGap(months) > opts.maxGapMonths) continue;
    const values = [...group.byMonth.values()];
    const typical = typicalMonthlyValue(values).amount;
    if (typical <= 0 || values.filter((value) => Math.abs(value - typical) <= typical * opts.tolerance).length < opts.minMonths) continue;
    const lastMonth = months[months.length - 1];
    const dates = group.dates;
    const typicalDay = pattern ? medianDayOfMonth(dates) : dates.map(dayOf).sort((a, b) => a - b)[dates.length >> 1];
    const series = [...group.byMonth.entries()].sort(([a], [b]) => a < b ? -1 : 1)
      .map(([month, amount]) => ({ month, amount }));
    const stream = {
      key: group.key,
      label: group.label,
      occurrences: group.rows.length,
      months: months.length,
      typical: pattern ? roundMoney(typical) : typical,
      typicalDay,
      lastMonth,
      recent: series.slice(-3).map((item) => item.amount),
      status: recurringStatus(lastMonth, latestMonth, opts.maxGapMonths),
      series,
      rows: group.rows,
      dates,
    };
    if (pattern) {
      stream.daySpread = Math.max(0, ...dates.map(isoDay).filter((day) => day > 0)
        .map((day) => Math.abs(day - (typicalDay || day))));
    }
    streams.push(stream);
  }
  streams.sort((a, b) => b.typical - a.typical);
  return streams;
}

function nextOccurrenceAfter(asOf, day) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(asOf || ''));
  if (!match) return null;
  let year = +match[1], month = +match[2];
  const iso = () => `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2, '0')}`;
  let date = iso();
  if (date <= asOf) {
    month++;
    if (month > 12) { month = 1; year++; }
    date = iso();
  }
  return date;
}

export function selectPrimaryPay(streams, opts, asOf, confirmations = []) {
  const all = streams.filter((stream) => stream.typical >= opts.incomeFloor);
  if (!all.length) return null;
  const answer = (key) => answerFor(confirmations, 'pay', [key]);
  const chosen = all.find((stream) => answer(stream.key) === true);
  const candidates = chosen ? [chosen] : all.filter((stream) => answer(stream.key) !== false);
  if (!candidates.length) return null;
  const primary = candidates[0];
  const lastThreeMedian = median(primary.recent);
  const latest = primary.recent[primary.recent.length - 1];
  const amount = Math.abs(latest - lastThreeMedian) <= lastThreeMedian * opts.tolerance ? latest : lastThreeMedian;
  return {
    key: primary.key,
    amount: Math.round(amount * 100) / 100,
    date: nextOccurrenceAfter(asOf, primary.typicalDay),
    typicalDay: primary.typicalDay,
    confidence: primary.months >= 6 ? 'high' : 'medium',
    chosenBy: chosen ? 'person' : 'size',
    otherCandidates: candidates.length - 1,
  };
}

export function incomePatternFromStreams(streams, cfg, now) {
  const ahead = Object.assign({ steadySpreadDays: DEFAULT_STEADY_SPREAD_DAYS, lateGraceDays: 5, tolerance: 0.15 }, cfg.ahead || {});
  const primary = streams.find((stream) => stream.status !== 'lapsed');
  if (!primary) return null;
  const dates = primary.dates.slice().sort();
  const lastDate = dates[dates.length - 1] || null;
  const regularity = primary.daySpread <= ahead.steadySpreadDays ? 'Steady' : 'Uneven';
  const [year, month] = primary.lastMonth.split('-').map(Number);
  const day = Math.min(primary.typicalDay || 1, new Date(year, month, 0).getDate());
  const next = new Date(year, month, day);
  const nextExpectedDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  const daysUntilNext = Math.round((next.getTime() - now.getTime()) / 86400000);
  const lastAmount = primary.series.length ? roundMoney(primary.series[primary.series.length - 1].amount) : primary.typical;
  const difference = lastAmount - primary.typical;
  const stepChange = Math.abs(difference) > primary.typical * ahead.tolerance ? difference > 0 ? 'up' : 'down' : null;
  const dayByMonth = new Map();
  for (const date of primary.dates) {
    const monthKeyValue = monthOf(date), occurrenceDay = isoDay(date);
    if (monthKeyValue && occurrenceDay > 0 && !dayByMonth.has(monthKeyValue)) dayByMonth.set(monthKeyValue, occurrenceDay);
  }
  return {
    key: primary.key,
    label: primary.label,
    typicalAmount: primary.typical,
    lastDate,
    lastAmount,
    expectedDay: primary.typicalDay,
    regularity,
    late: daysUntilNext < -ahead.lateGraceDays,
    daysUntilNext,
    nextExpectedDate,
    stepChange,
    monthsSeen: primary.months,
    series: primary.series.map(({ month: seriesMonth, amount }) =>
      ({ month: seriesMonth, amount: roundMoney(amount), day: dayByMonth.get(seriesMonth) || null })),
  };
}

export function incomeBySource(model) {
  const contributing = new Set(model.takeHomeCredits);
  const streamed = new Set();
  const groups = new Map();
  for (const stream of model.streams) {
    const rows = stream.rows.filter((row) => contributing.has(row));
    if (!rows.length) continue;
    rows.forEach((row) => streamed.add(row));
    const category = stream.category || null;
    const group = groups.get(category) || { category, incomeClass: stream.incomeClass, streams: [], total: 0, typical: 0 };
    const total = roundMoney(rows.reduce((sum, row) => sum + amtOf(row), 0));
    group.streams.push({
      key: stream.key, label: stream.label, category, incomeClass: stream.incomeClass, cadence: 'monthly',
      typical: stream.typical, typicalDay: stream.typicalDay, months: stream.months, lastMonth: stream.lastMonth,
      status: stream.status, count: rows.length, total,
    });
    group.total = roundMoney(group.total + total);
    group.typical = roundMoney(group.typical + stream.typical);
    groups.set(category, group);
  }
  const rest = model.takeHomeCredits.filter((row) => !streamed.has(row));
  const other = {
    count: rest.length,
    total: roundMoney(rest.reduce((sum, row) => sum + amtOf(row), 0)),
    months: new Set(rest.map((row) => monthOf(dateOf(row)))).size,
  };
  const ordered = [...groups.values()].sort((a, b) => b.typical - a.typical)
    .map((group) => ({ ...group, streams: group.streams.sort((a, b) => b.typical - a.typical) }));
  return { groups: ordered, other, total: roundMoney(ordered.reduce((sum, group) => sum + group.total, other.total)) };
}

export function takeHomeFromMonthly(monthly, asOf) {
  const cutoff = asOf instanceof Date ? asOf.toISOString().slice(0, 10) : asOf;
  const complete = cutoff ? monthly.filter((row) => row.month < monthKey(cutoff)) : monthly.slice(0, -1);
  const values = complete.map((row) => Number(row.amount) || 0).filter((amount) => amount > 0);
  const result = typicalMonthlyValue(values);
  return {
    amount: roundMoney(result.amount),
    monthsUsed: result.monthsUsed,
    monthsSeen: result.monthsSeen,
    basis: result.basis,
    excluded: result.excluded.map(roundMoney),
  };
}

export function takeHomeBreakdown(model, asOf) {
  const head = takeHomeFromMonthly(model.monthlyMoneyIn, asOf);
  const cutoff = asOf instanceof Date ? asOf.toISOString().slice(0, 10) : asOf;
  const complete = cutoff ? model.monthlyMoneyIn.filter((row) => row.month < monthKey(cutoff)) : model.monthlyMoneyIn.slice(0, -1);
  const setAside = head.excluded.slice();
  const months = complete.filter((row) => row.amount > 0).map((row) => {
    const at = setAside.indexOf(roundMoney(row.amount));
    if (at >= 0) setAside.splice(at, 1);
    return { month: row.month, amount: row.amount, used: at < 0 };
  });
  const names = [...new Set(Object.values(model.monthlyByClass).flatMap((classes) => Object.keys(classes)))];
  const classes = names.map((name) => ({
    incomeClass: name,
    amount: takeHomeFromMonthly(model.monthlyMoneyIn.map(({ month }) => ({ month, amount: model.monthlyByClass[month]?.[name] || 0 })), asOf).amount,
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  return { amount: head.amount, basis: head.basis, monthsUsed: head.monthsUsed, monthsSeen: head.monthsSeen, months, classes };
}

function positionAmountsForStream(stream, asOf) {
  const byMonth = new Map();
  for (const row of stream.rows) {
    const month = monthOf(dateOf(row));
    byMonth.set(month, (byMonth.get(month) || 0) + amtOf(row));
  }
  const currentMonth = monthOf(asOf);
  return [...byMonth.entries()].filter(([month]) => month < currentMonth).map(([, amount]) => amount);
}

export function investmentIncomeSection(statements = emptyRows) {
  const seen = new Set();
  const byMonth = new Map();
  for (const statement of sortedInvestmentStatements(statements)) {
    for (const line of statement.incomeLines || []) {
      const month = monthOf(line.date);
      const identity = `${statement.account}|${line.date}|${line.evidence}`;
      if (!month || seen.has(identity)) continue;
      seen.add(identity);
      const currency = line.currency || 'unstated';
      const key = `${month}|${currency}`;
      const entry = byMonth.get(key) || { month, currency, amount: 0, deduction: 0, net: 0, count: 0 };
      entry.amount = roundMoney(entry.amount + (Number(line.amount) || 0));
      entry.deduction = roundMoney(entry.deduction + (Number(line.deduction) || 0));
      entry.net = roundMoney(entry.net + (Number(line.net) || 0));
      entry.count++;
      byMonth.set(key, entry);
    }
  }
  return {
    countsTowardTakeHome: false,
    basis: 'stated',
    distributions: [...byMonth.values()].sort((a, b) => a.month < b.month ? -1 : a.month > b.month ? 1 : a.currency < b.currency ? -1 : 1),
  };
}

export function investmentIncomeSince(section, asOf, months = 12) {
  const latest = monthOf(asOf);
  const [year, month] = latest.split('-').map(Number);
  if (!year || !month) return [];
  const index = year * 12 + (month - 1) - (months - 1);
  const first = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
  const byCurrency = new Map();
  for (const entry of section.distributions) {
    if (entry.month < first || entry.month > latest) continue;
    const total = byCurrency.get(entry.currency) || { currency: entry.currency, amount: 0, count: 0 };
    total.amount = roundMoney(total.amount + entry.amount);
    total.count += entry.count;
    byCurrency.set(entry.currency, total);
  }
  return [...byCurrency.values()];
}

export function buildIncomeModel({ bankRows = emptyRows, cfg = emptyConfig, confirmations = emptyConfirmations, asOf = null, baseCurrency = null, options = null, investmentStatements = emptyRows }) {
  const currency = baseCurrency || options?.baseCurrency || cfg.currency?.code || 'JMD';
  const asOfKey = asOf instanceof Date ? asOf.getTime() : asOf;
  const answers = confirmations.length ? confirmations : emptyConfirmations;
  const optionsKey = options ? JSON.stringify(options) : '';
  const prior = cache.get(bankRows) || [];
  const hit = prior.find((entry) => entry.cfg === cfg && entry.confirmations === answers &&
    entry.asOfKey === asOfKey && entry.currency === currency && entry.optionsKey === optionsKey &&
    entry.investmentStatements === investmentStatements);
  if (hit) return hit.result;
  const opts = options || resolveIncomeOptions(cfg);
  const payAsOf = asOf instanceof Date ? asOf.toISOString().slice(0, 10) : asOf;
  const patternNow = asOf instanceof Date ? asOf : asOf ? new Date(`${asOf}T12:00:00Z`) : new Date();
  const classifiedCredits = bankRows.filter((row) => row.direction === 'in')
    .map((row) => ({ row, classification: row.creditClassification || null, counted: isCountedBankIncome(row) }));
  const monthly = new Map(), monthlyByClass = new Map();
  const takeHomeCredits = [];
  const excludedTotals = { transfers: 0, returned: 0, pending: 0 };
  const foreignCurrency = new Map();
  for (const row of bankRows) {
    const currencyOfRow = row.currency || currency;
    if (currencyOfRow !== currency) {
      if (row.direction === 'in') foreignCurrency.set(currencyOfRow, roundMoney((foreignCurrency.get(currencyOfRow) || 0) + row.amount));
      continue;
    }
    const month = monthOf(row.date);
    if (!month) continue;
    if (!monthly.has(month)) monthly.set(month, 0);
    if (row.direction !== 'in') continue;
    if (row.internalTransfer) excludedTotals.transfers = roundMoney(excludedTotals.transfers + row.amount);
    else if (row.refund) excludedTotals.returned = roundMoney(excludedTotals.returned + row.amount);
    else if (row.excludedFromIncome) excludedTotals.pending = roundMoney(excludedTotals.pending + row.amount);
    if (!isCountedBankIncome(row)) continue;
    const declared = categoryMeta(cfg, row.creditClassification?.category || row.category);
    if (declared?.inTakeHome === false && row.creditClassification?.basis !== 'person') continue;
    const incomeClass = row.creditClassification?.incomeClass || declared?.incomeClass || 'income';
    takeHomeCredits.push(row);
    if (!monthlyByClass.has(month)) monthlyByClass.set(month, new Map());
    const classes = monthlyByClass.get(month);
    classes.set(incomeClass, roundMoney((classes.get(incomeClass) || 0) + row.amount));
    monthly.set(month, roundMoney(monthly.get(month) + row.amount));
  }
  const monthlyMoneyIn = [...monthly].sort(([a], [b]) => a < b ? -1 : 1)
    .map(([month, amount]) => ({ month, amount }));
  const byClass = Object.fromEntries([...monthlyByClass].sort(([a], [b]) => a < b ? -1 : 1)
    .map(([month, classes]) => [month, Object.fromEntries(classes)]));
  const takeHome = { ...takeHomeFromMonthly(monthlyMoneyIn, asOf), byClass: {} };
  for (const name of new Set(Object.values(byClass).flatMap((classes) => Object.keys(classes)))) {
    const series = monthlyMoneyIn.map(({ month }) => ({ month, amount: byClass[month]?.[name] || 0 }));
    takeHome.byClass[name] = takeHomeFromMonthly(series, asOf).amount;
  }
  const streams = detectIncomeStreams(bankRows, opts, 'pay', payAsOf, currency).map((stream) => ({
    ...stream,
    category: stream.rows[0]?.creditClassification?.category || stream.rows[0]?.category || null,
    incomeClass: stream.rows[0]?.creditClassification?.incomeClass || 'income',
    positionAmounts: positionAmountsForStream(stream, payAsOf),
  }));
  const streamedRows = new Set(streams.flatMap((stream) => stream.rows));
  const residualCredits = classifiedCredits.filter(({ row, counted }) => counted && !streamedRows.has(row));
  const patternOpts = { ...opts, ...(cfg.ahead || {}) };
  const patternStreams = detectIncomeStreams(bankRows, patternOpts, 'pattern', null, currency);
  const result = {
    classifiedCredits,
    streams,
    residualCredits,
    primaryPay: selectPrimaryPay(streams, opts, payAsOf, answers),
    incomePattern: incomePatternFromStreams(patternStreams, cfg, patternNow),
    monthlyMoneyIn,
    takeHomeCredits,
    monthlyByClass: byClass,
    takeHome,
    excludedTotals,
    foreignCurrency: Object.fromEntries(foreignCurrency),
    investment: investmentIncomeSection(investmentStatements),
  };
  prior.push({ cfg, confirmations: answers, asOfKey, currency, optionsKey, investmentStatements, result });
  if (prior.length > 8) prior.shift();
  cache.set(bankRows, prior);
  return result;
}
