import { buildDisclosure, subhead } from './decision-header.js';
import { cardStatementTrustReact, collapsibleCardReact, chartInfoReact, commitmentCardReact, commitmentTimelineReact, hiddenChartReact, payoffChartReact, foreignSpendingReact, cardFitnessReact, spendingTrendCardReact } from './react-bridge.js';
import {
  detectPeriodNewMerchants,
  attentionItems,
  largeChargeSentence,
  renderShareBar,
} from '../analysis/reporting-core.js';
import {
  detectIncompleteMonth,
  analysisForWindow,
  insightDriver,
  cardBehaviourState,
  projectCardPayoff,
  cardPayoffSeries,
  normaliseEair,
  medianRecentPayment,
  renderExplainer,
  commitmentLink,
} from '../analysis/reporting-periods.js';
import {
  missingMonthsInsight,
  foreignSummary,
  rankInsights,
  effectiveForeignRate,
  averageForeignRates,
} from '../analysis/reporting-insights.js';
import { merchantLabel } from '../statements/categorise.js';
import { cardSpendingTimeline } from '../analysis/coverage-map.js';
// classifyInternalTransfers is no longer imported here directly: both call
// sites that used it (renderRecurring's bank standing debits, and
// renderCardStatementTrust's bank-to-card payment match) now read
// state.bankRecords through the shared classifiedBank() passed in via ctx -
// the same function Accounts and Overview use - so this file can no longer
// apply a different set of ledger rules than the other two tabs.
import { linkCardPayments } from '../statements/read-statements.js';
import { counterpartyAccountTokens, analyseIncomePattern } from '../analysis/bank-analysis.js';
import {
  requireCtx,
  formatDisplayDate,
  isPrivacyMode,
  markProportional,
  typicalMonthlyValue,
  MONTHS_SHORT,
  sortedCardStatements,
  RECONCILE_MEANS,
  daysBetweenIso,
  isoToday,
} from '../core/shared-helpers.js';
import { NUDGE_AFTER_DAYS } from '../analysis/balance-updates.js';
import { chartIsHidden,
  monthTickOf,
} from './chart-helpers.js';
import { renderColumnChart } from './chart-surface.js';
import { makeForeignMoney, makeProseMoney } from '../core/money-format.js';
import { categoryTagModel } from './category-tag-model.js';

export function createCardsRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'render',
      'applyFilter',
      'resolved',
      'periodRows',
      'clearFilters',
      'openMonth',
      'money0',
      'moneyShort',
      'pct',
      'monthLabel',
      'monthShort',
      'catColour',
      'isReview',
      'allMonths',
      'pickStatements',
      'openStatementCoverage',
      'highestCompleteMonth',
      'classifiedBank',
      'commitmentsModel',
      'drillToAccountsPayee',
      'cleanCounterparty',
      'iconUp',
      'iconDown',
      'iconChevron',
      'iconChart',
      'iconRepeat',
      'iconGlobe',
      'iconTag',
      'iconAlert',
      'iconSpark',
      'iconReceipt',
      'iconBack',
      'iconPeak',
      'iconGap',
      'trackUsage',
      'resetBankDrillFacets',
      'drillToTransactions',
      'provenModels',
      'balanceUpdates',
      'reviewStatements',
    ],
    'createCardsRenderer'
  );
  const {
    state,
    el,
    icon,
    render,
    applyFilter,
    resolved,
    periodRows,
    clearFilters,
    openMonth,
    money0,
    moneyShort,
    pct,
    monthLabel,
    monthShort,
    catColour,
    isReview,
    allMonths,
    pickStatements,
    openStatementCoverage,
    highestCompleteMonth,
    classifiedBank,
    commitmentsModel,
    drillToAccountsPayee,
    cleanCounterparty,
    iconUp,
    iconDown,
    iconChevron,
    iconChart,
    iconRepeat,
    iconGlobe,
    iconTag,
    iconAlert,
    iconSpark,
    iconReceipt,
    iconBack,
    iconPeak,
    iconGap,
    drillToTransactions,
    provenModels,
    balanceUpdates,
    reviewStatements,
  } = ctx;
  const foreignMoney = makeForeignMoney();

  // Reuses Activity's own drillToTransaction (threaded through ctx from
  // app.js, since _txSearch and its reset live only in activity-render.js) -
  // an identity-level anchor for the one insight below that already knows a
  // single, specific transaction record rather than a category or merchant.
  function drillToTransaction(target) {
    if (ctx.drillToTransaction) ctx.drillToTransaction(target);
  }
  const prevLabel = () => {
    const p = resolved();
    if (!p || !p.prevFrom) return 'before';
    if (p.kind === 'month') return monthShort(p.prevFrom);
    if (state.period.type === 'this-year') return p.prevFrom.slice(0, 4);
    return 'the period before';
  };

  /* Money inside a SENTENCE reads short; money in a value slot reads exact.
     An insight is a sentence - "A charge of $21,839.32 on 2026-07-06 is larger
     than usual" makes a reader parse eight digits mid-clause to learn one
     thing: it was big. makeProseMoney is that rule, already applied to the
     plan, position and forecast prose; the insight strip is now inside it. */
  const prose = makeProseMoney(state.cfg || {});
  function cardTimeline() {
    return cardSpendingTimeline({
      rowMonths: allMonths(),
      statementMonths: (state._cardStatements || []).map((statement) => statement.statementKey),
      byMonth: state.allSummary?.by_month || {},
      coverage: state.coverage,
    });
  }
  function histMonthlyAverage() {
    const timeline = cardTimeline();
    if (!timeline.length) return 0;
    const inc = detectIncompleteMonth(state.rows, timeline.map((entry) => entry.month), new Date(), {
      coverage: state.coverage,
    });
    const complete = timeline.filter((entry) => entry.present && !entry.incomplete && (!inc || entry.month !== inc.month));
    const vals = complete.map((entry) => entry.amount);
    if (!vals.length) return 0;
    return typicalMonthlyValue(vals).amount;
  }

  function buildInsights(a) {
    const out = [];
    const p = resolved();
    const spend = periodRows().filter((r) => r.kind === 'spend');

    // 1) Overall change vs previous comparable period.
    // FIX (redundancy): this used to fire on any move past the meaningful-change
    // threshold and simply restate the same percentage/figures the hero pill
    // above already shows (a.prev_total). That made the card say the same thing
    // twice in two places on the same screen. Now it only surfaces here when a
    // genuine single driver (insightDriver) can be named - i.e. it always adds
    // something the pill does not already say - and leads with that driver
    // rather than repeating the headline number.
    if (a.prev_total != null && a.prev_total > 0) {
      const diff = a.total_spend - a.prev_total;
      const dp = Math.round((diff / a.prev_total) * 100);
      // D-audit item 4: this fallback was 20 while config.json uses 25, so the two
      // "meaningful change" code paths could disagree about what counts as
      // meaningful. Aligned to 25 so all paths share one threshold.
      if (
        Math.abs(dp) >= (state.cfg.insights.meaningfulChangePct || 25) &&
        Math.abs(diff) >= (state.cfg.insights.meaningfulChangeMin || 3000)
      ) {
        // Insight attribution (§11, B6): name the single category or merchant most
        // responsible for the move, via the pure insightDriver over the same two
        // windows this insight already compares - the current period and the
        // previous comparable period. analysisForWindow gives a full breakdown for
        // each (its labels tidied identically on both sides so a driver never
        // mismatches "STARBUCKS" against "Starbucks"). A null driver (a change
        // spread evenly, with no single dominant cause) now suppresses this
        // insight entirely, since without a driver it has nothing to say beyond
        // what the hero pill already shows.
        let driver = null;
        if (p && p.prevFrom && p.prevTo) {
          const opts = {
            keepUpperSet: state.keepUpper,
            smallWordsSet: state.smallWords,
            merchantLabelFn: (s) => merchantLabel(s, state.keepUpper, state.smallWords),
          };
          const currentA = analysisForWindow(state.rows, p.from, p.to, opts);
          const previousA = analysisForWindow(state.rows, p.prevFrom, p.prevTo, opts);
          driver = insightDriver(currentA, previousA, state.cfg);
        }
        if (driver) {
          out.push({
            tone: diff > 0 ? 'up' : 'down',
            kind: 'overall-change',
            icon: diff > 0 ? iconUp() : iconDown(),
            text: `${driver.label} was the main reason spending ${diff > 0 ? 'rose' : 'fell'} this period, ${prose(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${prevLabel()}.`,
            onClick: () => drillToTransactions({ kind: 'spend' }),
          });
        }
      }
    }

    // 2) Category with the biggest move vs the previous comparable period.
    if (p && p.prevFrom) {
      const prevRows = state.rows.filter(
        (r) => r.kind === 'spend' && r.month >= p.prevFrom && r.month <= p.prevTo
      );
      const cur = {};
      for (const r of spend) cur[r.category] = (cur[r.category] || 0) + r.amount;
      const pre = {};
      for (const r of prevRows) pre[r.category] = (pre[r.category] || 0) + r.amount;
      let best = null;
      for (const cat of new Set([...Object.keys(cur), ...Object.keys(pre)])) {
        const d = (cur[cat] || 0) - (pre[cat] || 0);
        const base = pre[cat] || 0;
        // D-audit item 4: read the shared percentage from config (as a fraction)
        // rather than hardcoding 0.25, so this category-move threshold can never
        // drift from the overall-change threshold above.
        if (
          Math.abs(d) >= (state.cfg.insights.meaningfulChangeMin || 3000) &&
          (base === 0 || Math.abs(d) / base >= (state.cfg.insights.meaningfulChangePct || 25) / 100)
        ) {
          if (!best || Math.abs(d) > Math.abs(best.d)) best = { cat, d, cur: cur[cat] || 0 };
        }
      }
      // Item 15: a category dropping to zero this period is noise, not signal, so
      // skip the move insight when the current-period value is 0 (the category
      // vanished). Only the "down to $0.00" case is suppressed; any genuine up or
      // down move where the category still has spend (best.cur > 0) is unaffected.
      if (best && best.cur > 0) {
        // A category with no meaningful spend last period reports its whole
        // total as "up", so the rise and the new total come out within a cent
        // of each other: "up $30,500.00 ... now $30,500.01". The arithmetic is
        // right - base was $0.01 - but read as an error, because "up by" claims
        // a comparison against something that was not really there. When the
        // previous period is effectively nothing, say so instead.
        const priorWasNothing = best.cur - Math.abs(best.d) < 1;
        out.push({
          tone: best.d > 0 ? 'up' : 'down',
          kind: 'category-move',
          icon: iconTag(catColour(best.cat)),
          text: priorWasNothing && best.d > 0
            ? `${best.cat} card spending is new since ${prevLabel()}: ${prose(best.cur)}.`
            : `${best.cat} card spending ${best.d > 0 ? 'rose' : 'fell'} ${prose(Math.abs(best.d))} since ${prevLabel()}, to ${prose(best.cur)}.`,
          onClick: () => drillToTransactions({ category: best.cat, kind: 'spend' }),
        });
      }
    }

    // 3) Large / unusual single transaction in the period.
    // FIX (point 2): attentionItems is run over periodRows(), which on a wide
    // period (e.g. "All time") can span years. Without narrowing, the single
    // largest flagged charge anywhere in that whole span surfaces here under
    // "What changed" - a heading that implies something recent - even if it
    // happened a year or more ago. When the resolved period is not a single
    // month, this now narrows candidates to the latest month actually present
    // in the period, so only a genuinely recent large charge is ever shown here.
    // Single-month periods are unaffected (a.months already has length 1 there).
    let flags = attentionItems(periodRows(), state.cfg, state.brandRules, state.merchants).filter(
      (f) => f.type === 'large'
    );
    if (flags.length && p && p.kind !== 'month' && a.months.length) {
      const latestMonthInPeriod = a.months[a.months.length - 1];
      flags = flags.filter((f) => f.row.month === latestMonthInPeriod);
    }
    if (flags.length) {
      const f = flags.sort((x, y) => y.row.amount - x.row.amount)[0];
      out.push({
        tone: 'up',
        kind: 'large-charge',
        icon: iconAlert(),
        text: largeChargeSentence(f.row, prose),
        // f.row is a real, already-identified transaction record (this
        // insight exists precisely BECAUSE one specific row was flagged),
        // so this now anchors straight to it - opened, scrolled to,
        // highlighted - rather than a text-search patch that could still
        // match more than one row and leave the actual flagged transaction
        // to be found by eye.
        onClick: () => drillToTransaction({ ledger: 'card', id: f.row.id }),
      });
    }

    const newMerchants = detectPeriodNewMerchants(state.rows, p, state.brandRules, state.merchants);
    const newBig = newMerchants.filter(
      (m) => m.amount >= (state.cfg.insights.newMerchantMin || 2000)
    )[0];
    if (newBig) {
      out.push({
        tone: 'new',
        kind: 'new-merchant',
        icon: iconSpark(),
        text: `New this period: ${newBig.label} (${prose(newBig.amount)}).`,
        onClick: () =>
          drillToTransactions({
            merchant: newBig.key,
            merchantLabel: newBig.label,
            category: 'all',
          }),
      });
    }

    const { rec } = commitmentsModel();
    if (rec.length) {
      const totalRec = rec.reduce((s, r) => s + r.typical, 0);
      out.push({
        tone: 'info',
        kind: 'recurring',
        icon: iconRepeat(),
        text: `${rec.length} likely regular commitment${rec.length === 1 ? '' : 's'} totalling about ${prose(totalRec)} a month, such as ${rec
          .slice(0, 2)
          .map((r) => r.label)
          .join(' and ')}.`,
        onClick: () => drillToTransactions({ category: 'Subscriptions', kind: 'spend' }),
      });
    }

    // 6) Foreign-currency spending in the period.
    const fx = spend.filter((r) => r.foreign);
    if (fx.length) {
      const fxTotal = fx.reduce((s, r) => s + r.amount, 0);
      out.push({
        tone: 'info',
        kind: 'foreign',
        icon: iconGlobe(),
        text: `${fx.length} foreign-currency purchase${fx.length === 1 ? '' : 's'} this period, ${prose(fxTotal)} in total.`,
        onClick: () => drillToTransactions({ foreignOnly: true }),
      });
    }

    // 7) Fees & interest in the period.
    if (a.total_fees > 0)
      out.push({
        tone: 'up',
        kind: 'fees',
        icon: iconReceipt(),
        text: `You paid ${prose(a.total_fees)} in fees and tax this period.`,
        onClick: () => drillToTransactions({ kind: 'fee' }),
      });
    // 8) Refunds in the period.
    if (a.total_refunds > 0)
      out.push({
        tone: 'down',
        kind: 'refunds',
        icon: iconBack(),
        text: `${prose(a.total_refunds)} came back to the card in refunds this period.`,
        onClick: () => drillToTransactions({ kind: 'refund' }),
      });

    // 9) Unusually high complete month across history.
    const hi = highestCompleteMonth();
    if (hi && a.months.includes(hi.month))
      out.push({
        tone: 'up',
        kind: 'high-month',
        icon: iconPeak(),
        text: `${monthShort(hi.month)} is your highest-spending month so far at ${prose(hi.amount)}.`,
        onClick: () => {
          state.period = { type: 'custom', from: hi.month, to: hi.month };
          clearFilters();
          render();
        },
      });

    // 10) Missing statement periods, through the one shared builder. It
    // opened the file picker straight from the sentence, which asks a person
    // to find the right PDFs from memory; it now lands on the card that names
    // these months and carries the same Add beside them.
    const gap = missingMonthsInsight({
      ledger: 'card',
      months: allMonths(),
      monthLabel: monthShort,
      icon: iconGap(),
      onOpen: openStatementCoverage,
    });
    if (gap) out.push(gap);

    return rankInsights(out, state.cfg.insights.maxInsights || 3);
  }

  /* ---- 3) spending over time ---- */
  function renderTrend(asProps = false) {
    const timeline = cardTimeline();
    const months = timeline.map((entry) => entry.month);
    const shown = months.length > 13 ? months.slice(-13) : months;
    if (!shown.length) return null;
    const byMonth = new Map(timeline.map((entry) => [entry.month, entry]));
    const monthFiltered = state.filter.month !== 'all';
    const inc = detectIncompleteMonth(state.rows, months, new Date(), { coverage: state.coverage });
    const avg = histMonthlyAverage();
    const p = resolved();
    const recorded = shown.filter((month) => byMonth.get(month)?.present).length;
    const summary = avg > 0 ? `Typically ${prose(avg)} a month on card` : `${recorded} month${recorded === 1 ? '' : 's'} of card records`;
    const chartCtx = { el, money0, moneyShort, monthLabel, monthShort: monthTickOf(MONTHS_SHORT, shown) };
    const chartSpec = {
      label: 'Purchases by month',
      rows: shown.map((m) => ({
        ...byMonth.get(m),
        incomplete: byMonth.get(m).incomplete || !!(inc && inc.month === m),
        inPeriod: !!(p && m >= p.from && m <= p.to),
        selected: state.filter.month === m || (state.filter.month === 'all' && p && m >= p.from && m <= p.to && p.kind === 'month'),
      })),
      series: [{ key: 'amount', label: 'Card purchases', tone: 'out' }],
      guide: avg > 0 ? avg : null,
      guideInLegend: true,
      missingText: 'No card statement',
      missingLegend: '⋮ No card statement',
      targetIdPrefix: 'activity-card-spending',
      onSelect: (row) => row.present ? openMonth(row.month, {
        activityTab: 'transactions',
        anchorId: '#acct-tx',
        cardPurchases: true,
      }) : openStatementCoverage(),
    };
    if (typeof window !== 'undefined') {
      const trendProps = {
        summary,
        monthFiltered,
        onShowAll: () => applyFilter({ month: 'all' }),
        chart: { ctx: chartCtx, spec: chartSpec },
        hidden: chartIsHidden(),
      };
      return asProps ? trendProps : spendingTrendCardReact(el, trendProps);
    }

    const sec = el('div', {});
    const head = el('div', { class: 'card-head' });
    if (monthFiltered)
      head.append(
        el(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => applyFilter({ month: 'all' }),
          },
          'Show all months'
        )
      );
    if (monthFiltered) sec.append(head);
    const card = (body) =>
      collapsibleCardReact(el, {
        title: 'Spending over time',
        icon: icon(iconChart()),
        summary,
        body,
        name: 'activity-spending-over-time',
      });

    if (chartIsHidden()) {
      sec.append(hiddenChartReact(el, 'Spending by month', { height: '170px' }));
      return card(sec);
    }

    // This used to strip the year back off every tick, which is exactly what
    // made a multi-year axis unreadable without hovering. monthTickOf decides
    // once for the whole axis instead.
    sec.append(renderColumnChart(chartCtx, chartSpec));
    return card(sec);
  }

  /* WHEN the month's committed money actually leaves.
   *
   * Every commitment already carries the day of the month it typically lands
   * (expectedDay, reporting-periods.js) and nothing has ever drawn it. The
   * monthly total answers "how much is spoken for"; this answers the question
   * that decides whether a month is comfortable or tight - whether the load
   * falls before or after payday, and whether it lands in one lump.
   *
   * A stem per DAY (not per commitment): several charges on the same day are
   * one demand on the balance, which is how the money is actually felt.
   * Height encodes an amount, so the whole chart is withdrawn in private view
   * exactly like every other chart in the app.
   */
  function renderCommitmentTimeline(items, asProps = false) {
    let payDay = null;
    try {
      const income = analyseIncomePattern(classifiedBank(), state.cfg, new Date());
      const day = income && Number(income.expectedDay);
      if (Number.isFinite(day) && day >= 1 && day <= 31) payDay = day;
    } catch (_) {
      payDay = null;
    }
    const byDay = new Map();
    for (const item of items || []) {
      const day = Number(item && item.expectedDay);
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      const slot = byDay.get(day) || { day, total: 0, names: [] };
      slot.total += Number(item.typical) || 0;
      slot.names.push(item.label);
      byDay.set(day, slot);
    }
    const slots = [...byDay.values()].sort((a, b) => a.day - b.day);
    if (slots.length < 2) return null;
    if (asProps) return chartIsHidden()
      ? { hidden: true }
      : { slots, payDay, money: money0, prose, ordinal, paydayLabel: 'Payday' };
    return commitmentTimelineReact({ el }, slots, payDay, { money: money0, prose, ordinal, paydayLabel: 'Payday' });
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /* ---- regular payments (recurring, whole-history) ---- */
  function renderRecurring(asProps = false) {
    const { rec, bankDebits, combined } = commitmentsModel();
    if (!rec.length && !bankDebits.length) return null;
    const when = renderCommitmentTimeline(combined.items, typeof window !== 'undefined');
    const explain = `${combined.items.length} regular commitment${combined.items.length === 1 ? '' : 's'}${combined.lapsed.length ? `; ${combined.lapsed.length} may have ended` : ''}. This is a typical month across your history, not the selected period.`;
    const timelineDisclosure = when && typeof window === 'undefined' ? buildDisclosure(el, 'When payments usually leave', [when], { class: 'commit-timing' }) : null;

    const scaleMax = combined.items
      .concat(combined.lapsed)
      .reduce((m, it) => Math.max(m, it.typical || 0), 0);
    const commitDrill = (item) => {
      const link = commitmentLink(item);
      if (!link) return null;
      if (link.kind === 'merchant') return () => drillToTransactions(link.patch);
      return () => drillToAccountsPayee(link.key, cleanCounterparty(link.label));
    };
    const commitmentRows = (items, lapsed = false) => items.map((item) => {
      const sub = lapsed
        ? item.lastMonth
          ? `last charged ${monthShort(item.lastMonth)}`
          : 'last charge unknown'
        : item.expectedDay
          ? `${item.expectedDay}${ordinal(item.expectedDay)} of the month`
          : '';
      const width =
        scaleMax > 0 ? Math.max(4, Math.min(100, Math.round((item.typical / scaleMax) * 100))) : 0;
      const colour = lapsed ? 'var(--dim)' : 'var(--flow-out)';
      const ariaLabel = lapsed
        ? `${item.label}: was about ${prose(item.typical)} a month, ${sub}`
        : `${item.label}: about ${prose(item.typical)} a month`;
      return {
        id: item.id || item.key || item.label,
        label: item.label,
        sub,
        width,
        colour,
        ariaLabel,
        onClick: commitDrill(item),
        amount: `${money0(item.typical)}/mo`,
        risen: !lapsed && item.risen,
        lapsed,
      };
    });
    const risen = combined.items.filter((item) => item.risen).length;
    const props = {
      explain: `${combined.items.length} regular commitment${combined.items.length === 1 ? '' : 's'}${combined.lapsed.length ? `; ${combined.lapsed.length} may have ended` : ''}. This is a typical month across your history, not the selected period.`,
      summary: `${prose(combined.total)} a month` + (risen ? ` \u00b7 ${risen} went up` : ''),
      items: commitmentRows(combined.items),
      lapsedItems: commitmentRows(combined.lapsed, true),
      timelineDisclosure,
      timeline: typeof window !== 'undefined' ? when : null,
    };
    props.iconNode = typeof window === 'undefined' ? chartInfoReact(el, '', props.explain) : null;
    return asProps ? props : commitmentCardReact(el, props);
  }

  function renderForeign(_a, asProps = false) {
    const fx = foreignSummary(periodRows().filter((r) => r.kind === 'spend'));
    if (!fx.count) return null;
    const drill = () => drillToTransactions({ foreignOnly: true }, { showAll: true });
    const ccyText = fx.byCurrency.map((c) => c.ccy).join(', ');
    const avgRates = averageForeignRates(fx.items);
    const groups = new Map();
    for (const r of fx.items) {
      const label = r.displayName || r.description.split(',')[0].trim();
      const key = label.toLowerCase();
      if (!groups.has(key))
        groups.set(key, {
          label,
          category: r.category,
          count: 0,
          total: 0,
          items: [],
        });
      const g = groups.get(key);
      g.count += 1;
      g.total += r.amount;
      g.items.push(r);
    }
    const groupList = [...groups.values()].sort((x, y) => y.total - x.total);
    const bar = renderShareBar(el, {
      segments: groupList
        .slice(0, 6)
        .map((g) => ({ colour: catColour(g.category), amount: g.total })),
      grandTotal: fx.totalJmd,
      remainderLabel: 'Other places',
      ariaLabel: `Foreign spending split across ${groupList.length} place${groupList.length === 1 ? '' : 's'}`,
    });
    const groupsForReact = groupList.map((group) => ({
      ...group,
      colour: catColour(group.category),
      items: group.items.slice().sort((x, y) => y.amount - x.amount).map((r) => {
        const rate = effectiveForeignRate(r);
        return {
          date: r.date,
          amount: r.amount,
          foreignText: foreignMoney(r.foreign) + (rate ? ` \u00b7 ${rate.rate.toFixed(2)} incl. fees` : ''),
        };
      }),
    }));
    const foreignProps = {
      groups: groupsForReact,
      money: money0,
      date: formatDisplayDate,
      totalText: money0(fx.totalJmd),
      info: [
        `${fx.count} purchase${fx.count === 1 ? '' : 's'} in ${ccyText}, converted to your currency.`,
        avgRates.length ? `Rate including fees: ${avgRates.map((r) => `${r.rate.toFixed(2)} per ${r.ccy}`).join(', ')}.` : null,
      ].filter(Boolean),
      onDrill: drill,
      shareBar: bar,
    };
    if (asProps) return { summary: `${prose(fx.totalJmd)} in ${ccyText}`, iconMarkup: iconGlobe(), foreignProps };
    const reactActive = typeof window !== 'undefined';
    const body = reactActive ? null : foreignSpendingReact(el, foreignProps);
    return collapsibleCardReact(el, {
      title: 'Spent abroad',
      icon: reactActive ? null : icon(iconGlobe()),
      iconMarkup: reactActive ? iconGlobe() : null,
      summary: `${prose(fx.totalJmd)} in ${ccyText}`,
      body,
      reactBody: reactActive ? { kind: 'foreignSpending', props: foreignProps, rootClass: 'pfa-react-root' } : null,
      name: 'activity-spent-abroad',
    });
  }

  // One shared category tag used everywhere a category is shown (the category
  // panel, Top places and every transaction row): a small colour dot followed
  // by the category name at one consistent size and weight. Presentation only -
  // it reads catColour/isReview but never changes a category or a total.
  // Passing `onclick` makes it the tappable picker trigger for a transaction
  // row (rendered as a button); otherwise it is a plain, non-interactive tag.
  // The fallback keeps its muted "To review" treatment in every place.
  function catTag(name, opts = {}) {
    const model = categoryTagModel(name, catColour, isReview);
    const cls =
      'cat-tag' +
      (model.review ? ' review' : '') +
      (opts.onclick ? ' cat-tag-btn' : '') +
      (opts.class ? ' ' + opts.class : '');
    const kids = [
      el('span', { class: 'cat-dot', style: `background:${model.color}` }),
      el('span', { class: 'cat-tag-name' }, model.label),
    ];
    if (opts.onclick)
      return el('button', { class: cls, type: 'button', onclick: opts.onclick }, ...kids);
    return el('span', { class: cls }, ...kids);
  }

  /* Card statement health block (Recommendations 1-4). Reads the stored
   * per-statement records: how many reconcile, the latest cycle's utilisation
   * and revolving status, minimum payment, and how many card payments are
   * matched to a bank transfer (double-count avoided). Presentation only. */
  // Normalise a stored EAIR to a fraction. Some card records carry a percent
  // (42.0), others a fraction (0.42); anything > 1 is read as a percent.
  // Returns null when absent or non-positive, so the caller degrades to a calm
  // status with no projection rather than inventing a rate.
  // Round 4: normEair/medianPayment are now shared pure functions
  // (normaliseEair/medianRecentPayment, reporting.js), so the "clear the
  // card by" goal type (ahead-render.js) reads a card's rate and recent
  // payment behaviour identically to this card, rather than a second,
  // possibly drifting copy.
  /* "How your card is doing" (persona move 2: instrument fitness).
   * Rewritten to classify BEHAVIOUR from evidence, not from a single cycle's
   * balance. cardBehaviourState (reporting.js) keys on interest actually
   * charged over recent cycles - the defining signal in the credit-card
   * literature (a transactor pays in full and incurs no interest; a revolver
   * carries a balance and pays interest) - so a large statement balance that
   * accrued $0 interest correctly reads as pay-in-full, not as debt (the exact
   * case that was mislabelled before). Three honest states, each saying only
   * what the statements support and never asserting the user's intent:
   *   - pays-in-full: no interest recently -> calm confirmation, no payoff maths.
   *   - paying-interest: interest charged -> the real interest cost, how often
   *     it has appeared, and an "if this continues" projection using proper
   *     month-by-month amortisation (projectCardPayoff) - an observation, never
   *     a "you should".
   *   - insufficient: too few cycles, or interest/rate fields unreadable (e.g.
   *     NCB) -> exact figures, explicitly no verdict.
   * Utilisation is framed wherever shown: it is a statement-closing-balance,
   * credit-score input, not a spend or debt measure - so a score-builder and a
   * debt-carrier both read it correctly. Card-only; returns null with no card
   * statements. Reuses existing card / hero-figure / sec-grid styles. */
  function renderPayoffCone(owed, eairFrac, typicalPayment) {
    if (chartIsHidden()) return typeof window !== 'undefined'
      ? { type: 'chart', hidden: true }
      : { type: 'chart', node: hiddenChartReact(el, 'Card payoff', { height: '220px' }) };
    const TOL = 0.15;
    const centre = cardPayoffSeries(owed, eairFrac, typicalPayment);
    if (!centre) return null;
    const upper = cardPayoffSeries(owed, eairFrac, typicalPayment * (1 - TOL)) || centre;
    const lower = cardPayoffSeries(owed, eairFrac, typicalPayment * (1 + TOL)) || centre;
    const clears = centre.clearedMonth;
    const win = Math.max(2, Math.min(60, clears != null ? clears : 60));
    const maxBalance = Math.max(1, ...centre.series.slice(0, win + 1), ...upper.series.slice(0, win + 1), ...lower.series.slice(0, win + 1));
    const firm = Math.max(1, Math.min(6, win));
    const balanceAt = (series, month) => month < series.series.length ? series.series[month] : 0;
    const points = Array.from({ length: win + 1 }, (_, month) => {
      const balance = balanceAt(centre, month);
      const low = balanceAt(lower, month);
      const high = balanceAt(upper, month);
      return {
        month,
        balance,
        lower: low,
        band: Math.max(0, high - low),
        solid: month <= firm ? balance : null,
        dashed: month >= firm ? balance : null,
        upper: high,
      };
    });
    const props = { points, clears, win, maxBalance, payment: typicalPayment, money: money0, moneyShort };
    return typeof window !== 'undefined'
      ? { type: 'chart', chartProps: props }
      : { type: 'chart', node: payoffChartReact({ el, ...props }) };
  }

  function renderCardFitness(asProps = false) {
    const stmts = sortedCardStatements(state._cardStatements);
    if (!stmts.length) return null;
    const latest = stmts[stmts.length - 1];
    const sections = [];
    const eairFrac = normaliseEair(latest.eair);
    const behaviour = cardBehaviourState(state._cardStatements);
    const statusLabel = behaviour === 'pays-in-full' ? 'No recent interest' : behaviour === 'insufficient' ? 'More history needed' : 'Interest recorded';
    const card = (summary, summaryLabel) => {
      const compactSummary = owed == null ? `Balance unavailable · ${statusLabel.toLowerCase()}` : `${moneyShort(owed)} owed · ${statusLabel.toLowerCase()}`;
      const props = { summary, compactSummary, summaryLabel, statusLabel, iconMarkup: iconReceipt(), sections, behaviour };
      return asProps ? props : cardFitnessReact(el, props);
    };
    const balanceModel = provenModels.balances();
    const liveCard = (balanceModel && balanceModel.accounts || []).find((account) => account.ledger === 'card') || null;
    const statementOwed = latest.newBalance != null ? latest.newBalance : latest.amountOwing;
    const owed = liveCard && liveCard.balance != null ? liveCard.balance : statementOwed;
    const balanceSource =
      liveCard && liveCard.source === 'entered'
        ? `balance entered on ${formatDisplayDate(liveCard.asOf)}`
        : 'balance on your latest statement';
    const cardStale =
      liveCard &&
      liveCard.source === 'statement' &&
      liveCard.asOf &&
      daysBetweenIso(liveCard.asOf, isoToday()) > NUDGE_AFTER_DAYS;
    const balanceAction = liveCard && (liveCard.source === 'entered' || cardStale)
      ? {
          label: liveCard.source === 'entered' ? 'Fix balance' : 'Update balance',
          onClick: () => balanceUpdates.openUpdater(liveCard.key),
        }
      : null;
    const balanceHero = () => ({
      type: 'balance',
      amount: owed == null ? '-' : money0(owed),
      source: balanceSource,
      action: balanceAction,
    });

    const utilisationNote = () => latest.utilisation == null ? null : { type: 'utilisation', value: `${latest.utilisation}%` };

    if (behaviour === 'pays-in-full') {
      sections.push(balanceHero());
      if (eairFrac != null) {
        const eairPct = Math.round(eairFrac * 100);
        if (latest.eairEstimated && latest.purchaseAnnualPct != null) {
          const disclosedPct = Math.round(latest.purchaseAnnualPct);
          const monthlyPct = latest.purchaseMonthlyPct;
          sections.push({ type: 'info', label: 'Rate details', content: `Your statement shows a purchase rate of ${disclosedPct}% a year${monthlyPct != null ? ` (${monthlyPct}% a month)` : ''}. Carrying a balance would compound that monthly to a real yearly cost closer to ${eairPct}%, but clearing the statement each cycle means you pay none of it.` });
        } else if (latest.eairEstimated) {
          sections.push({ type: 'info', label: 'Rate details', content: `Clearing the statement each cycle avoids interest at an estimated ${eairPct}% a year, worked out from the monthly rate printed on your statement.` });
        } else {
          sections.push({ type: 'info', wrapperClass: 'muted small', label: 'Why this matters', content: `Clearing the statement each cycle avoids interest at about ${eairPct}% a year.` });
        }
      }
      const un = utilisationNote();
      if (un) sections.push(un);
      return card('Recent statements show no interest charged.', 'Recent statement activity');
    }

    if (behaviour === 'insufficient') {
      sections.push(balanceHero());
      sections.push({ type: 'metrics', items: [
        { label: 'Credit used', value: latest.utilisation == null ? '-' : `${latest.utilisation}%` },
        latest.interestCharges == null ? null : { label: 'Interest this cycle', value: money0(latest.interestCharges) },
        latest.minimumPayment == null ? null : { label: 'Minimum payment', value: money0(latest.minimumPayment) },
      ].filter(Boolean) });
      const un = utilisationNote();
      if (un) sections.push(un);
      const unavailable = 'A payoff estimate needs more complete statement history. Recorded figures remain exact.';
      sections.push({ type: 'info', key: 'payoff-unavailable', label: 'Payoff unavailable', content: unavailable });
      return card(unavailable, 'Estimate availability');
    }

    sections.push(balanceHero());
    const typicalPayment = medianRecentPayment(stmts);
    const projection = projectCardPayoff(owed, eairFrac, typicalPayment);
    let summary = 'A payoff estimate needs a current balance, payment history and card rate.';
    if (projection && !projection.neverClears) {
      sections.push({ type: 'metrics', items: [
        { key: 'monthly-payment', label: 'Monthly payment', value: money0(typicalPayment) },
        { key: 'months-to-clear', label: 'Months to clear', value: String(projection.months), note: `at the ${money0(typicalPayment)} a month you have been paying` },
        { key: 'projected-interest', label: 'Projected interest', value: money0(projection.totalInterest) },
      ] });
      const assumptions = { type: 'text', key: 'payoff-assumptions', className: 'muted small', text: `The estimate takes your current balance and the card rate, and assumes you keep paying ${money0(typicalPayment)} a month, the middle of your last few card payments. It does not look at your spending or what you could afford to pay, and it assumes no new purchases.` };
      sections.push(assumptions);
      summary = assumptions.text;
    } else if (projection && projection.neverClears) {
      summary = 'At typical recent payment levels, most of each payment goes to interest, so the balance barely moves.';
      sections.push({ type: 'info', key: 'balance-barely-moves', label: 'Balance barely moves', content: summary });
    }
    const payoffCone = renderPayoffCone(owed, eairFrac, typicalPayment);
    if (payoffCone) sections.push(payoffCone);
    sections.push({ type: 'metrics', items: [
      { label: 'Credit used', value: latest.utilisation == null ? '-' : `${latest.utilisation}%` },
      latest.interestCharges == null ? null : { label: 'Interest this cycle', value: money0(latest.interestCharges) },
      latest.minimumPayment == null ? null : { label: 'Minimum payment', value: money0(latest.minimumPayment) },
    ].filter(Boolean) });
    const un = utilisationNote();
    if (un) sections.push(un);

    if (eairFrac == null) {
      const body = 'The projection needs the card\u2019s interest rate, which could not be read from this statement. The balance, interest and payments shown are exact; only the forward estimate is unavailable.';
      const label = 'Why there\u2019s no payoff estimate';
      summary = 'Interest was recorded recently, but a payoff estimate needs a readable card rate.';
      sections.push(typeof window === 'undefined'
        ? { type: 'disclosure', node: renderExplainer(el, body, { label }) }
        : { type: 'disclosure', body, label });
    }
    return card(summary, 'Payoff outlook');
  }

  function renderCardStatementTrust(asProps = false) {
    const stmts = sortedCardStatements(state._cardStatements);
    if (!stmts.length) return null;
    const reconciled = stmts.filter((s) => s.reconciled).length;
    const failingFiles = new Set(
      stmts.filter((s) => !s.reconciled).map((s) => s.source_file)
    );
    const headerModel = {
      title: 'Card statements',
      note: `${reconciled} of ${stmts.length} reconcile`,
      explain: RECONCILE_MEANS,
      onReview: reconciled < stmts.length ? () => reviewStatements({
        match: (st) => st.ledger === 'card' && failingFiles.has(st.source_file),
        reason: 'Card statements that need a look',
      }) : null,
    };
    const headerNode = typeof window === 'undefined' ? subhead(el, {
      ...headerModel,
      actions: headerModel.onReview ? el('button', { class: 'btn sm ghost', onclick: headerModel.onReview }, 'Review') : null,
    }) : null;
    let paymentTraceText = null;
    if (
      state.bankRecords &&
      state.bankRecords.length &&
      state.cardAccounts &&
      state.cardAccounts.length
    ) {
      const card4 = new Set(state.cardAccounts.map((c) => String(c).slice(-4)));
      const bankToCard = classifiedBank()
        .filter((r) => {
          if (r.direction !== 'out') return false;
          const tokens = counterpartyAccountTokens(r.description);
          return tokens.size && [...tokens].some((t) => card4.has(String(t).slice(-4)));
        })
        .map((r) => ({ id: r.id, date: r.date, amount: r.amount }));
      const cardPays = state.records
        .filter((r) => r.kind === 'payment')
        .map((r) => ({ id: r.id, date: r.date, amount: r.amount }));
      if (bankToCard.length && cardPays.length) {
        const link = linkCardPayments(bankToCard, cardPays, { windowDays: 4 });
        paymentTraceText = `${link.matched} of ${link.total} card payments trace to a bank transfer, so those are counted once, not twice.`;
      }
    }
    const props = {
      headerNode,
      headerModel: typeof window !== 'undefined' ? headerModel : null,
      paymentTraceText,
    };
    return asProps ? props : cardStatementTrustReact(el, props);
  }
  return {
    renderTrend,
    renderForeign,
    renderRecurring,
    renderCardFitness,
    renderCardStatementTrust,
    catTag,
    prevLabel,
    histMonthlyAverage,
    buildInsights,
  };
}
