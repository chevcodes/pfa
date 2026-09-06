import { chartInfo } from './decision-header.js';
/*
 * cards-render.js  -  card-side building blocks reused by Right Now.
 *
 * The Cards tab itself has retired - its hero, its own attention
 * list, its search-first explorer, "Recent activity" and its own "Data &
 * settings" card are gone, absorbed and rebuilt inside right-now-render.js
 * per the plan's section 4. What remains here is the card-side analysis and
 * rendering that Right Now genuinely reuses unchanged: spending by category,
 * top places, spent abroad, the merged regular-commitments card, and "How
 * your card is doing" (extended this round with the total interest cost and
 * the minimum-payment-trap flag). prevLabel, histMonthlyAverage and
 * buildInsights also stay, since the print model and Right Now's own merged
 * insights card both still call them.
 */
import {
  detectPeriodNewMerchants,
  attentionItems,
  appendExpandable,
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
} from '../analysis/reporting-periods.js';
import {
  missingMonths,
  foreignSummary,
  rankInsights,
  effectiveForeignRate,
  averageForeignRates,
} from '../analysis/reporting-insights.js';
import { merchantLabel } from '../statements/categorise.js';
import { merchantRuleKeyFromDescription } from '../../settings/category-rules.js';
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
} from '../core/shared-helpers.js';
import { chartIsHidden, renderHiddenChart } from './chart-helpers.js';
import { renderColumnChart, chartTooltip, chartSvg, renderDonutChart } from './chart-surface.js';
import { staggerIn } from './motion.js';
import { drawPath, growIn } from './motion.js';

// Real SVG nodes (createElementNS), mirroring forecast-chart-render.js's own
// discipline, so the payoff chart is a genuine drawing rather than literal
// <svg> markup and never enters the print path as a string.
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}, ...kids) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, String(v));
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.appendChild(kid);
  return n;
}

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
      'money0',
      'moneyShort',
      'pct',
      'monthLabel',
      'monthShort',
      'catColour',
      'isReview',
      'allMonths',
      'pickStatements',
      'secItem',
      'highestCompleteMonth',
      'classifiedBank',
      'commitmentsModel',
      'drillToAccountsPayee',
      'cleanCounterparty',
      'iconInfo',
      'iconUp',
      'iconDown',
      'iconChevron',
      'iconChart',
      'iconPie',
      'iconStore',
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
    money0,
    moneyShort,
    pct,
    monthLabel,
    monthShort,
    catColour,
    isReview,
    allMonths,
    pickStatements,
    secItem,
    highestCompleteMonth,
    classifiedBank,
    commitmentsModel,
    drillToAccountsPayee,
    cleanCounterparty,
    iconInfo,
    iconUp,
    iconDown,
    iconChevron,
    iconChart,
    iconPie,
    iconStore,
    iconRepeat,
    iconGlobe,
    iconTag,
    iconAlert,
    iconSpark,
    iconReceipt,
    iconBack,
    iconPeak,
    iconGap,
    trackUsage,
    resetBankDrillFacets,
    drillToTransactions,
  } = ctx;

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
    if (p.kind === 'month') return monthLabel(p.prevFrom);
    if (state.period.type === 'this-year') return p.prevFrom.slice(0, 4);
    return 'the period before';
  };
  function histMonthlyAverage() {
    // D-audit item 7. The "typical month" every insight compares against was a
    // plain mean of complete months, so one unusually large month (a big one-off
    // - on the real corpus, one unusually large month, e.g. an annual insurance renewal)
    // permanently pulled the baseline up (~+8.5% here). A robust baseline is used
    // instead: months more than 3 modified-z (median + MAD, the standard robust
    // spread) from the median are dropped as one-offs, then the remaining months
    // are averaged. With no clear outlier this equals the old mean; when a whale
    // month exists it is excluded so "typical" reflects an ordinary month. The
    // incomplete latest month is still excluded first, exactly as before.
    const months = allMonths();
    if (months.length < 1) return 0;
    const inc = detectIncompleteMonth(state.rows, months, new Date(), {
      coverage: state.coverage,
    });
    const complete = months.filter((m) => !inc || m !== inc.month);
    const vals = complete.map((m) => state.allSummary.by_month[m] || 0);
    if (!vals.length) return 0;
    const med = (a) => {
      const s = a.slice().sort((x, y) => x - y);
      const m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const centre = med(vals);
    const mad = med(vals.map((v) => Math.abs(v - centre)));
    // Need enough months for a robust spread to mean anything; below that, and
    // when MAD is zero, fall back to the plain mean of every complete month.
    const kept =
      vals.length >= 4 && mad > 0
        ? vals.filter((v) => Math.abs((0.6745 * (v - centre)) / mad) <= 3.5)
        : vals;
    const use = kept.length ? kept : vals;
    return use.reduce((x, y) => x + y, 0) / use.length;
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
            text: `${driver.label} was the main reason spending ${diff > 0 ? 'rose' : 'fell'} this period, ${money0(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${prevLabel()}.`,
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
      if (best && best.cur > 0)
        out.push({
          tone: best.d > 0 ? 'up' : 'down',
          kind: 'category-move',
          icon: iconTag(catColour(best.cat)),
          text: `${best.cat} is ${best.d > 0 ? 'up' : 'down'} ${money0(Math.abs(best.d))} on ${prevLabel()}, now ${money0(best.cur)}.`,
          onClick: () => drillToTransactions({ category: best.cat }),
        });
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
        text: `A ${f.row.displayName} charge of ${money0(f.row.amount)} on ${f.row.date} is larger than usual for that place.`,
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
        text: `New this period: ${newBig.label} (${money0(newBig.amount)}).`,
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
        text: `${rec.length} likely regular commitment${rec.length === 1 ? '' : 's'} totalling about ${money0(totalRec)} a month, such as ${rec
          .slice(0, 2)
          .map((r) => r.label)
          .join(' and ')}.`,
        onClick: () => drillToTransactions({ category: 'Subscriptions' }),
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
        text: `${fx.length} foreign-currency purchase${fx.length === 1 ? '' : 's'} this period, ${money0(fxTotal)} in total.`,
        onClick: () => drillToTransactions({ foreignOnly: true }),
      });
    }

    // 7) Fees & interest in the period.
    if (a.total_fees > 0)
      out.push({
        tone: 'up',
        kind: 'fees',
        icon: iconReceipt(),
        text: `You paid ${money0(a.total_fees)} in fees and tax this period.`,
        onClick: () => drillToTransactions({ kind: 'fee' }),
      });
    // 8) Refunds in the period.
    if (a.total_refunds > 0)
      out.push({
        tone: 'down',
        kind: 'refunds',
        icon: iconBack(),
        text: `${money0(a.total_refunds)} came back to the card in refunds this period.`,
        onClick: () => drillToTransactions({ kind: 'refund' }),
      });

    // 9) Unusually high complete month across history.
    const hi = highestCompleteMonth();
    if (hi && a.months.includes(hi.month))
      out.push({
        tone: 'up',
        kind: 'high-month',
        icon: iconPeak(),
        text: `${monthLabel(hi.month)} is your highest-spending month so far at ${money0(hi.amount)}.`,
        onClick: () => {
          state.period = { type: 'custom', from: hi.month, to: hi.month };
          clearFilters();
          render();
        },
      });

    // 10) Missing statement periods.
    const gaps = missingMonths(allMonths());
    if (gaps.length)
      out.push({
        tone: 'info',
        kind: 'missing-months',
        icon: iconGap(),
        text: `No statement found for ${gaps.slice(0, 2).map(monthLabel).join(' and ')}${gaps.length > 2 ? ` and ${gaps.length - 2} more` : ''}. Add ${gaps.length === 1 ? 'it' : 'them'} for a complete picture.`,
        onClick: () => pickStatements(),
      });

    return rankInsights(out, state.cfg.insights.maxInsights || 3);
  }

  /* ---- 3) spending over time ---- */
  function renderTrend() {
    const sec = el('section', { class: 'card' });
    const head = el(
      'div',
      { class: 'card-head' },
      el('h3', { class: 'card-title' }, icon(iconChart()), 'Spending over time')
    );
    if (state.filter.month !== 'all')
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
    sec.append(head);

    const months = allMonths();
    const shown = months.length > 13 ? months.slice(-13) : months;
    const vals = shown.map((m) => state.allSummary.by_month[m] || 0);
    const inc = detectIncompleteMonth(state.rows, months, new Date());
    const avg = histMonthlyAverage();
    const p = resolved();

    if (chartIsHidden()) {
      sec.append(renderHiddenChart(el, 'Spending by month', { height: '170px' }));
      return sec;
    }

    sec.append(renderColumnChart({ el, money0, moneyShort, monthLabel, monthShort: (m) => monthShort(m).replace(/ \d+$/, '') }, {
      label: 'Purchases by month',
      rows: shown.map((m, i) => ({
        month: m,
        amount: vals[i],
        incomplete: !!(inc && inc.month === m),
        inPeriod: !!(p && m >= p.from && m <= p.to),
        selected: state.filter.month === m || (state.filter.month === 'all' && p && m >= p.from && m <= p.to && p.kind === 'month'),
      })),
      // Named for its scope, like the treemap's "card transactions": this
      // chart reads the card ledger only, so it is smaller than the same
      // tab's discretionary-spending figure and must say why.
      series: [{ key: 'amount', label: 'Card purchases', tone: 'out' }],
      guide: avg > 0 ? avg : null,
      onSelect: (row) => {
        if (row.inPeriod) applyFilter({ month: state.filter.month === row.month ? 'all' : row.month });
        else {
          state.period = { type: 'custom', from: row.month, to: row.month };
          clearFilters();
          render();
        }
      },
    }));
    return sec;
  }

  /* ---- 4) spending by category ---- */
  function renderCategoryPanel(a) {
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconPie()), 'Where it went'),
        state.filter.category !== 'all'
          ? el(
              'button',
              {
                class: 'btn sm ghost',
                onclick: () => applyFilter({ category: 'all' }),
              },
              'Clear category'
            )
          : null
      )
    );
    const cats = a.by_category;
    if (!cats.length) {
      sec.append(el('p', { class: 'muted pad' }, 'No purchases in this period.'));
      return sec;
    }
    const total = a.total_spend || cats.reduce((s, c) => s + c.amount, 0) || 1;
    const bar = renderShareBar(el, {
      segments: cats.slice(0, 6).map((c) => ({
        colour: catColour(c.name),
        amount: c.amount,
        key: 'cat:' + c.name,
        label: c.name,
        onActivate: () => drillToTransactions({ category: c.name, reviewOnly: false }),
      })),
      grandTotal: total,
      remainderLabel: 'Other categories',
      centerValue: moneyShort(total),
      centerLabel: 'total',
      ariaLabel: `Spending split across ${cats.length} categor${cats.length === 1 ? 'y' : 'ies'}, ${money0(total)} in total`,
    });
    if (bar) sec.append(bar);
    // If the selected category sits past the first 5, bring it forward so
    // drilling into a category from elsewhere (Top places, an insight) never
    // hides its own selected state behind a collapsed "Show more" toggle.
    let catsOrdered = cats;
    if (state.filter.category !== 'all') {
      const idx = cats.findIndex((c) => c.name === state.filter.category);
      if (idx > 2) {
        catsOrdered = cats.slice();
        const [sel] = catsOrdered.splice(idx, 1);
        catsOrdered.unshift(sel);
      }
    }
    const list = el('div', { class: 'catlist' });
    const renderCatRow = (c) => {
      const selected = state.filter.category === c.name;
      const review = isReview(c.name);
      const frag = el('div', {});
      frag.append(
        el(
          'button',
          {
            class: 'catrow' + (selected ? ' selected' : '') + (review ? ' review' : ''),
            dataset: { anchor: 'cat:' + c.name },
            'aria-label': isPrivacyMode()
              ? `${review ? 'To review' : c.name}: amount hidden`
              : `${review ? 'To review' : c.name}: ${money0(c.amount)}, ${pct(c.share)} of spending`,
            onclick: () =>
              drillToTransactions(
                { category: selected ? 'all' : c.name, reviewOnly: false },
                { scroll: !selected }
              ),
          },
          catTag(c.name, { class: 'cat-name' }),
          el(
            'span',
            { class: 'cat-amt' },
            money0(c.amount),
            el('span', { class: 'cat-pct' }, pct(c.share))
          )
        )
      );
      if (selected) {
        const lead = a.merchants.filter((m) => m.category === c.name).slice(0, 3);
        if (lead.length) {
          const sub = el('div', { class: 'cat-sub' });
          sub.append(el('span', { class: 'muted small' }, 'Top places: '));
          lead.forEach((m) => {
            sub.append(
              el(
                'button',
                {
                  class: 'chip tiny',
                  onclick: () =>
                    drillToTransactions({
                      merchant: m.key,
                      merchantLabel: m.merchant,
                      category: 'all',
                    }),
                },
                `${m.merchant} ${money0(m.amount)}`
              )
            );
          });
          frag.append(sub);
        }
      }
      return frag;
    };
    appendExpandable(el, list, catsOrdered, renderCatRow, { initial: 3 });
    sec.append(list);
    return sec;
  }

  /* ---- 5) top places (merchants) ---- */
  function renderMerchants(a) {
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        // Scoped like the treemap's "card transactions" and the trend chart's
        // "Card purchases": this reads the card ledger only, so it can never
        // be confused with Activity's "Biggest payments", which ranks every
        // outflow across card and bank.
        el('h3', { class: 'card-title' }, icon(iconStore()), 'Top places on the card'),
        state.filter.merchant
          ? el(
              'button',
              {
                class: 'btn sm ghost',
                onclick: () => applyFilter({ merchant: '', merchantLabel: '' }),
              },
              'Clear place'
            )
          : null
      )
    );
    const list = a.merchants;
    if (!list.length) {
      sec.append(el('p', { class: 'muted pad' }, 'No purchases in this period.'));
      return sec;
    }
    const total = a.total_spend || list.reduce((s, m) => s + m.amount, 0) || 1;
    // Was a six-chip share BAR - the pattern premium.css itself describes as
    // illegible, and the one composition shape on this screen that nothing
    // else in the app speaks any more. The top places plus their remainder
    // are a real part-to-whole, so they use the same ring every other
    // part-to-whole on the screen uses, carrying each place's own category
    // colour.
    const top = list.slice(0, 5);
    const named = top.reduce((sum, m) => sum + m.amount, 0);
    const remainder = Math.max(0, total - named);
    const ring = renderDonutChart(
      { el, money0 },
      {
        label: `Card spending split across ${list.length} place${list.length === 1 ? '' : 's'}`,
        total,
        money: money0,
        segments: [
          ...top.map((m) => ({ label: m.merchant, amount: m.amount, colour: catColour(m.category) })),
          remainder > 0
            ? { label: 'Other places', amount: remainder, colour: 'var(--dim)' }
            : null,
        ].filter(Boolean),
        centre: { value: moneyShort(total), label: 'on the card' },
      }
    );
    if (ring) sec.append(ring);
    const table = el('table', { class: 'grid merch' });
    table.append(
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', {}, 'Place'),
          el('th', {}, 'Category'),
          el('th', { class: 'num' }, 'Times'),
          el('th', { class: 'num' }, 'Total'),
          el('th', { class: 'num' }, 'Average'),
          el('th', { class: 'num' }, 'Share')
        )
      )
    );
    const body = el('tbody');
    const renderMerchRow = (m) =>
      el(
        'tr',
        {
          class: 'clickable' + (state.filter.merchant === m.key ? ' selected' : ''),
          dataset: {},
          onclick: () => {
            const already = state.filter.merchant === m.key;
            drillToTransactions(
              {
                merchant: already ? '' : m.key,
                merchantLabel: m.merchant,
                category: 'all',
              },
              { scroll: !already }
            );
          },
        },
        el('td', {}, el('span', { class: 'merch-name' }, m.merchant)),
        el('td', {}, catTag(m.category)),
        el('td', { class: 'num' }, m.count),
        el('td', { class: 'num strong' }, money0(m.amount)),
        el('td', { class: 'num muted' }, money0(m.avg)),
        el('td', { class: 'num muted' }, pct(m.share))
      );
    appendExpandable(el, body, list, renderMerchRow, {
      initial: 3,
      step: 3,
      wrapToggle: (btn) =>
        el('tr', {}, el('td', { colspan: 6 }, el('div', { class: 'show-more' }, btn))),
    });
    table.append(body);
    sec.append(el('div', { class: 'table-wrap' }, table));
    sec.append(
      renderExplainer(
        el,
        'A high “Times” with a low “Average” is everyday spending; a low “Times” with a high “Total” is a one-off. Places are grouped only when the statement text matches.',
        { label: 'How to read this' }
      )
    );
    return sec;
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
  function renderCommitmentTimeline(items) {
    // Payday is the reference the whole chart exists against - "before or
    // after payday" cannot be read off stems alone. Taken from the SAME
    // income detector the income card uses, so the two can never disagree
    // about which day money arrives.
    let payDay = null;
    try {
      const income = analyseIncomePattern(classifiedBank(), state.cfg, new Date());
      const d = income && Number(income.expectedDay);
      if (Number.isFinite(d) && d >= 1 && d <= 31) payDay = d;
    } catch (_) {
      payDay = null;
    }
    const byDay = new Map();
    for (const it of items || []) {
      const day = Number(it && it.expectedDay);
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      const slot = byDay.get(day) || { day, total: 0, names: [] };
      slot.total += Number(it.typical) || 0;
      slot.names.push(it.label);
      byDay.set(day, slot);
    }
    const slots = [...byDay.values()].sort((a, b) => a.day - b.day);
    // One stem is a fact, not a distribution - there is no "when" to read.
    if (slots.length < 2) return null;
    if (chartIsHidden()) {
      return renderHiddenChart(el, 'When commitments land', { height: '150px' });
    }

    const W = 1000;
    const H = 150;
    const PAD_X = 26;
    const BASE = H - 34;
    const TOP = 18;
    const span = W - PAD_X * 2;
    const peak = slots.reduce((m, s) => Math.max(m, s.total), 0) || 1;
    const xOf = (day) => PAD_X + ((day - 1) / 30) * span;
    const yOf = (total) => BASE - (total / peak) * (BASE - TOP);

    const wrap = markProportional(
      el('div', { class: 'commit-when', role: 'group', 'aria-label': 'When commitments land' })
    );
    const tips = chartTooltip(el, wrap);
    const svg = chartSvg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: 'none',
      class: 'commit-when-svg',
      'aria-hidden': 'true',
    });

    svg.append(
      chartSvg('line', { x1: PAD_X, x2: W - PAD_X, y1: BASE, y2: BASE, class: 'commit-when-axis' })
    );

    // Payday, drawn behind the stems: the chart's whole point is which side
    // of this line the month's load falls on.
    if (payDay != null) {
      svg.append(
        chartSvg('line', {
          x1: xOf(payDay),
          x2: xOf(payDay),
          y1: TOP - 6,
          y2: BASE,
          class: 'commit-when-payday',
        })
      );
    }

    // The viewBox is stretched horizontally to fill the card, so nothing that
    // must keep its proportions is drawn in here - no round dots, no text. A
    // vertical stem is the one shape a horizontal stretch cannot distort.
    const STEM_W = 7;
    const stems = [];
    for (const slot of slots) {
      const y = yOf(slot.total);
      const stem = chartSvg('rect', {
        x: xOf(slot.day) - STEM_W / 2,
        y,
        width: STEM_W,
        height: Math.max(2, BASE - y),
        rx: STEM_W / 2,
        class: 'commit-when-stem',
      });
      svg.append(stem);
      stems.push(stem);
    }
    wrap.append(svg);

    const axis = el('div', { class: 'commit-when-days', 'aria-hidden': 'true' });
    for (const day of [1, 8, 15, 22, 29]) {
      axis.append(
        el('span', { style: `left:${(xOf(day) / W) * 100}%` }, String(day))
      );
    }
    wrap.append(axis);

    if (payDay != null) {
      wrap.append(
        el(
          'span',
          { class: 'commit-when-payday-label', style: `left:${(xOf(payDay) / W) * 100}%` },
          'Paid'
        )
      );
    }

    // Without a figure on it, the stems said "these days are heavier than
    // those" and nothing else - a shape with no magnitude. Naming the tallest
    // day gives every other stem a scale to be read against, and it is the
    // one number this chart genuinely needs.
    const heaviest = slots.reduce((a, b) => (b.total > a.total ? b : a), slots[0]);
    wrap.append(
      el(
        'span',
        {
          class: 'commit-when-peak',
          style: `left:${(xOf(heaviest.day) / W) * 100}%; top:${(yOf(heaviest.total) / H) * 100}%`,
        },
        money0(heaviest.total)
      )
    );

    // Hit targets are HTML over the picture, the same arrangement the column
    // charts use: a 5px dot is not a pointer target and never a keyboard one.
    const hits = el('div', { class: 'commit-when-targets' });
    slots.forEach((slot, i) => {
      const shown = slot.names.slice(0, 4);
      const detail = [
        `Day ${slot.day}${ordinal(slot.day)}`,
        money0(slot.total),
        ...shown,
        slot.names.length > shown.length ? `+${slot.names.length - shown.length} more` : null,
      ].filter(Boolean);
      const target = el('button', {
        type: 'button',
        class: 'commit-when-target',
        'aria-label': detail.join('. '),
        style: `left:${(xOf(slot.day) / W) * 100}%`,
      });
      tips.bind(target, detail);
      target.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = (i + 1) % slots.length;
        if (event.key === 'ArrowLeft') next = (i + slots.length - 1) % slots.length;
        if (next != null) {
          event.preventDefault();
          hits.children[next].focus();
        }
      });
      hits.append(target);
    });
    wrap.append(hits);

    staggerIn(stems, () => [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
      step: 28,
      duration: 420,
    });
    return wrap;
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /* ---- regular payments (recurring, whole-history) ---- */
  function renderRecurring() {
    const { rec, bankDebits, combined } = commitmentsModel();
    if (!rec.length && !bankDebits.length) return null;
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconRepeat()), 'Regular commitments')
      )
    );
    sec.append(
      el(
        'div',
        { class: 'hero-figure' },
        el(
          'div',
          { class: 'fact-value metric-value metric--major' },
          `${money0(combined.total)} a month`
        ),
        el(
          'div',
          { class: 'muted small' },
          // "a month" is a RATE, taken across all history; the same tab's
          // "Committed spending" is what actually left in ONE period. The two
          // figures differ legitimately and used to sit on the same screen
          // with nothing saying they were measured over different spans.
          `${combined.items.length} regular commitment${combined.items.length === 1 ? '' : 's'}${combined.lapsed.length ? ` \u00b7 ${combined.lapsed.length} may have ended` : ''} \u00b7 a typical month, not this period`
        )
      )
    );
    const when = renderCommitmentTimeline(combined.items);
    if (when) sec.append(when);

    const scaleMax = combined.items
      .concat(combined.lapsed)
      .reduce((m, it) => Math.max(m, it.typical || 0), 0);
    const commitDrill = (item) => {
      if (item.source === 'card')
        return () =>
          drillToTransactions({
            merchant: merchantRuleKeyFromDescription(item.label),
            merchantLabel: item.label,
            category: 'all',
          });
      if (item.key) return () => drillToAccountsPayee(item.key, cleanCounterparty(item.label));
      return null;
    };
    const renderCommitRow = (item, opts = {}) => {
      const lapsed = !!opts.lapsed;
      // The day it lands and whether its price has crept up are both already
      // detected (expectedDay / risen, reporting-periods.js) and were both
      // thrown away at render. The day is what makes a commitment plannable;
      // a sustained rise is the one thing about a standing charge a person
      // actually needs told, since nothing else on screen would ever reveal it.
      const sub = lapsed
        ? item.lastMonth
          ? `last charged ${monthLabel(item.lastMonth)}`
          : 'last charge unknown'
        : item.expectedDay
          ? `${item.expectedDay}${ordinal(item.expectedDay)} of the month`
          : '';
      const width =
        scaleMax > 0 ? Math.max(4, Math.min(100, Math.round((item.typical / scaleMax) * 100))) : 0;
      // These tracks answer "how big is this against the largest", not "which
      // category is it" - the label already says that. Colouring them by
      // category left most of them grey (several categories hash to the same
      // neutral) so the track read as a disabled row rather than a
      // measurement. Money leaving takes the outflow colour, the same
      // language the Top spending bars use.
      const colour = lapsed ? 'var(--dim)' : 'var(--flow-out)';
      const ariaLabel = lapsed
        ? `${item.label}: was about ${money0(item.typical)} a month, ${sub}`
        : `${item.label}: about ${money0(item.typical)} a month`;
      const onclick = commitDrill(item);
      const kids = [
        el(
          'span',
          { class: 'commit-name' },
          el('span', { class: 'commit-name-main' }, item.label),
          sub ? el('span', { class: 'commit-name-sub muted small' }, sub) : null,
          !lapsed && item.risen ? el('span', { class: 'commit-risen' }, 'went up') : null
        ),
        el(
          'span',
          { class: 'commit-amt num ' + (lapsed ? 'muted' : 'strong') },
          `${money0(item.typical)}/mo`
        ),
        markProportional(
          el(
            'span',
            { class: 'commit-bar' },
            el('span', {
              class: 'commit-bar-fill',
              style: `width:${width}%;background:${colour}`,
            })
          )
        ),
      ];
      const cls = 'commit-row' + (lapsed ? ' lapsed' : '');
      if (onclick) return el('button', { class: cls, 'aria-label': ariaLabel, onclick }, ...kids);
      return el('div', { class: cls, 'aria-label': ariaLabel }, ...kids);
    };
    const list = el('div', { class: 'recurring-list' });
    appendExpandable(el, list, combined.items, renderCommitRow, { initial: 3 });
    sec.append(list);
    if (combined.lapsed.length) {
      const lapsedBody = el('div', {});
      lapsedBody.append(
        el(
          'p',
          { class: 'muted small', style: 'margin-top:0' },
          'These recurred before but have not charged recently.'
        )
      );
      const lapsedList = el('div', { class: 'recurring-list' });
      appendExpandable(
        el,
        lapsedList,
        combined.lapsed,
        (item) => renderCommitRow(item, { lapsed: true }),
        { initial: 3 }
      );
      lapsedBody.append(lapsedList);
      sec.append(
        renderExplainer(el, lapsedBody, {
          label: `May have ended (${combined.lapsed.length})`,
        })
      );
    }
    return sec;
  }

  /* ---- spent abroad (foreign summary for the selected period) ---- */
  /* Scoped to periodRows() spend so it tracks the selected period like the rest
   * of the dashboard. Sums only the JMD amounts (foreignSummary never sums the
   * mixed foreign-currency values). If nothing foreign, the card is not
   * rendered. */
  function renderForeign(_a) {
    const fx = foreignSummary(periodRows().filter((r) => r.kind === 'spend'));
    if (!fx.count) return null;
    const drill = () => drillToTransactions({ foreignOnly: true });
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconGlobe()), 'Spent abroad'),
        el('button', { class: 'btn sm ghost', onclick: drill }, 'See all')
      )
    );
    const ccyText = fx.byCurrency.map((c) => c.ccy).join(', ');
    sec.append(
      el(
        'div',
        { class: 'foreign-headline' },
        el(
          'button',
          {
            class: 'foreign-amt',
            onclick: drill,
            title: 'Show all foreign purchases',
          },
          money0(fx.totalJmd)
        ),
        el(
          'div',
          { class: 'muted small' },
          `${fx.count} purchase${fx.count === 1 ? '' : 's'} in ${ccyText}`
        )
      )
    );
    // Round 3 (Right Now, 4.4): the effective rate actually paid on foreign
    // spending, worked out by comparing the foreign amount to the local
    // amount charged - described plainly as "rate including fees" so it is
    // never mistaken for the clean, quoted bank rate. One line per currency.
    const avgRates = averageForeignRates(fx.items);
    if (avgRates.length) {
      sec.append(
        el(
          'p',
          { class: 'muted small' },
          `Rate including fees: ${avgRates.map((r) => `${r.rate.toFixed(2)} per ${r.ccy}`).join(', ')}.`
        )
      );
    }
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
    if (bar) sec.append(bar);
    const list = el('div', { class: 'foreign-list' });
    const renderForeignGroup = (g) => {
      if (g.count === 1) {
        const r = g.items[0];
        const eff = effectiveForeignRate(r);
        return el(
          'div',
          { class: 'foreign-row' },
          el('span', {
            class: 'swatch sm',
            style: `background:${catColour(g.category)}`,
          }),
          el('span', { class: 'foreign-place' }, g.label),
          el(
            'span',
            { class: 'foreign-fx muted small' },
            r.foreign + (eff ? ` \u00b7 ${eff.rate.toFixed(2)} incl. fees` : '')
          ),
          el('span', { class: 'foreign-jmd num strong' }, money0(g.total))
        );
      }
      const d = el('details', { class: 'foreign-group' });
      d.append(
        el(
          'summary',
          { class: 'foreign-row' },
          el('span', {
            class: 'swatch sm',
            style: `background:${catColour(g.category)}`,
          }),
          el(
            'span',
            { class: 'foreign-place-flex' },
            el('span', { class: 'foreign-place-name' }, g.label),
            el('span', { class: 'foreign-caret' }, icon(iconChevron()))
          ),
          el('span', { class: 'foreign-fx muted small' }, `${g.count} purchases`),
          el('span', { class: 'foreign-jmd num strong' }, money0(g.total))
        )
      );
      const sub = el('div', { class: 'foreign-sub' });
      for (const r of g.items.slice().sort((x, y) => y.amount - x.amount)) {
        const eff = effectiveForeignRate(r);
        sub.append(
          el(
            'div',
            { class: 'foreign-subrow' },
            el('span', { class: 'muted small' }, formatDisplayDate(r.date)),
            el(
              'span',
              { class: 'foreign-subrow-right' },
              el(
                'span',
                { class: 'foreign-fx muted small' },
                r.foreign + (eff ? ` \u00b7 ${eff.rate.toFixed(2)} incl. fees` : '')
              ),
              el('span', { class: 'num' }, money0(r.amount))
            )
          )
        );
      }
      d.append(sub);
      return d;
    };
    appendExpandable(el, list, groupList, renderForeignGroup, { initial: 3 });
    sec.append(list);
    return sec;
  }

  // One shared category tag used everywhere a category is shown (the category
  // panel, Top places and every transaction row): a small colour dot followed
  // by the category name at one consistent size and weight. Presentation only -
  // it reads catColour/isReview but never changes a category or a total.
  // Passing `onclick` makes it the tappable picker trigger for a transaction
  // row (rendered as a button); otherwise it is a plain, non-interactive tag.
  // The fallback keeps its muted "To review" treatment in every place.
  function catTag(name, opts = {}) {
    const review = isReview(name);
    const cls =
      'cat-tag' +
      (review ? ' review' : '') +
      (opts.onclick ? ' cat-tag-btn' : '') +
      (opts.class ? ' ' + opts.class : '');
    const kids = [
      el('span', { class: 'cat-dot', style: `background:${catColour(name)}` }),
      el('span', { class: 'cat-tag-name' }, review ? 'To review' : name),
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
  /* ---------------------------------------------------------------------------
   * The payoff chart (revolver only). Draws the balance's month-by-month path
   * to zero in the SAME visual vocabulary as the cash forecast (.fc-line /
   * .fc-cone / .fc-divider / .fc-trough), so a person who has read one chart
   * reads this one instantly. Three honesty rules, encoded in the geometry:
   *   1. The CONE is a REAL sensitivity band, not invented uncertainty: the
   *      upper edge is the path if you pay ~15% LESS (clears later, higher
   *      balances), the lower edge if you pay ~15% MORE (the app's standard
   *      tolerance). It widens with time because small payment differences
   *      compound - a truthful "how much your timeline moves if your payment
   *      drifts", never a fabricated statistical band.
   *   2. The far segment is DASHED: the near term is trustworthy, the far term
   *      assumes the rate and payment hold, so it is drawn as less certain.
   *   3. The CLEARED point is marked ONLY when the balance genuinely reaches
   *      zero within the window. A balance that barely moves (or grows) is
   *      shown flattening and NEVER touches a zero it cannot reach - matching
   *      the "barely moving" sentence exactly.
   * Returns null when there is no readable rate (cardPayoffSeries yields null),
   * so no chart appears exactly where the "no payoff estimate" explainer does.
   * ------------------------------------------------------------------------- */
  function renderPayoffCone(owed, eairFrac, typicalPayment) {
    if (chartIsHidden()) return renderHiddenChart(el, 'Card payoff', { height: '220px' });
    const TOL = 0.15;
    const centre = cardPayoffSeries(owed, eairFrac, typicalPayment);
    if (!centre) return null;
    const upper = cardPayoffSeries(owed, eairFrac, typicalPayment * (1 - TOL)) || centre;
    const lower = cardPayoffSeries(owed, eairFrac, typicalPayment * (1 + TOL)) || centre;
    const clears = centre.clearedMonth;
    const WIN = Math.max(2, Math.min(60, clears != null ? clears : 60));

    const W = 600,
      H = 150,
      padL = 60,
      padR = 10,
      padT = 12,
      padB = 16;
    const plotW = W - padL - padR,
      plotH = H - padT - padB;
    const maxBal = Math.max(1, ...centre.series.slice(0, WIN + 1), ...upper.series.slice(0, WIN + 1), ...lower.series.slice(0, WIN + 1));
    const x = (i) => padL + (i / WIN) * plotW;
    const y = (b) => padT + (1 - Math.max(0, Math.min(1, b / maxBal))) * plotH;
    const balAt = (s, i) => {
      const a = s.series;
      return i < a.length ? a[i] : 0;
    };
    const pts = (s) => {
      const out = [];
      for (let i = 0; i <= WIN; i++) out.push([x(i), y(balAt(s, i))]);
      return out;
    };
    const ptStr = (arr) => arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    const centrePts = pts(centre),
      upperPts = pts(upper),
      lowerPts = pts(lower);
    const conePoly = upperPts.concat(lowerPts.slice().reverse());
    const firm = Math.max(1, Math.min(6, WIN));
    const solidPts = centrePts.slice(0, firm + 1);
    const dashPts = centrePts.slice(firm);

    const root = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'fc-chart',
      role: 'img',
      preserveAspectRatio: 'none',
      'aria-label':
        clears != null
          ? `Projected card balance falling to zero over about ${clears} months at your recent payment, with a band for how that shifts if the payment changes.`
          : `Projected card balance at your recent payment, barely moving over the next ${WIN} months.`,
    });
    root.appendChild(
      svgEl('line', {
        x1: padL,
        y1: y(0),
        x2: W - padR,
        y2: y(0),
        class: 'fc-grid',
      })
    );
    root.appendChild(svgEl('polygon', { points: ptStr(conePoly), class: 'fc-cone' }));
    root.appendChild(
      svgEl('line', {
        x1: x(firm),
        y1: padT,
        x2: x(firm),
        y2: H - padB,
        class: 'fc-divider',
      })
    );
    const solid = svgEl('polyline', { points: ptStr(solidPts), class: 'fc-line', fill: 'none', 'vector-effect': 'non-scaling-stroke' });
    const dashed = svgEl('polyline', { points: ptStr(dashPts), class: 'fc-line', fill: 'none', 'stroke-dasharray': '5 4', 'vector-effect': 'non-scaling-stroke' });
    root.appendChild(solid);
    root.appendChild(dashed);
    const length = solidPts.reduce((sum, point, i) => i ? sum + Math.hypot(point[0] - solidPts[i - 1][0], point[1] - solidPts[i - 1][1]) : sum, 0);
    drawPath(solid, length, { duration: 650 });
    growIn(dashed, { opacity: 0 }, { opacity: 1 }, { delay: 350, duration: 300 });
    if (clears != null && clears <= WIN) {
      root.appendChild(
        svgEl('circle', {
          cx: x(clears),
          cy: y(0),
          r: 4,
          class: 'fc-trough fc-trough-firm',
        })
      );
    }

    const wrap = markProportional(el('div', { class: 'fc-chart-wrap payoff-chart' }, root));
    const overlay = el('div', { class: 'fc-overlay', 'aria-hidden': 'true' });
    for (const amount of [0, maxBal / 2, maxBal]) {
      root.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y(amount), y2: y(amount), class: 'fc-grid' }));
      overlay.append(el('span', { class: 'fc-label fc-axis-money anchor-start', style: `left:0;top:${y(amount) / H * 100}%` }, moneyShort(amount)));
    }
    for (const month of [0, Math.round(WIN / 2), WIN]) overlay.append(el('span', { class: 'fc-label fc-axis-date anchor-end', style: `left:${x(month) / W * 100}%;top:99%` }, month === 0 ? 'Now' : `${month} mo`));
    const targets = el('div', { class: 'fc-targets', role: 'group', 'aria-label': 'Monthly payoff projection' });
    const tips = chartTooltip(el, wrap);
    for (let month = 0; month <= WIN; month++) {
      const detail = [`Month ${month}`, `Balance: ${money0(balAt(centre, month))}`, `Payment −15%: ${money0(balAt(upper, month))}`, `Payment +15%: ${money0(balAt(lower, month))}`];
      const button = el('button', { type: 'button', class: 'fc-day-target', style: `left:${x(Math.max(0, month - 0.5)) / W * 100}%;width:${plotW / W * 100 / WIN * (month === 0 || month === WIN ? 0.5 : 1)}%`, 'aria-label': detail.join('. ') });
      tips.bind(button, detail);
      targets.append(button);
    }
    wrap.append(overlay, targets);
    growIn(wrap, { opacity: 0 }, { opacity: 1 }, { duration: 220 });
    return el('div', {}, wrap, el('div', { class: 'chart-legend' },
      el('span', {}, clears != null ? `Clears: ${clears} months` : 'Balance remains'),
      chartInfo(el, 'Payment ±15%', 'The band compares payments 15% above and below your recent payment. Dashes mark the more distant projection. No new purchases are assumed.')));
  }

  function renderCardFitness() {
    const stmts = (state._cardStatements || [])
      .slice()
      .sort((a, b) => String(a.statementKey).localeCompare(String(b.statementKey)));
    if (!stmts.length) return null;
    const latest = stmts[stmts.length - 1];
    const sec = el('section', { class: 'card card-fitness' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconReceipt()), 'How your card is doing')
      )
    );

    const eairFrac = normaliseEair(latest.eair);
    const behaviour = cardBehaviourState(state._cardStatements);

    const utilisationNote = () =>
      latest.utilisation == null
        ? null
        : el(
            'p',
            { class: 'muted small' },
            `Credit used, ${latest.utilisation}%, is a credit-score input - not your spending or debt.`
          );

    if (behaviour === 'pays-in-full') {
      const n = Math.min(stmts.length, 3);
      const nText = n === 1 ? 'your latest statement' : `your last ${n} statements`;
      sec.append(
        el(
          'div',
          { class: 'hero-figure' },
          el('div', { class: 'fact-value metric-value metric--minor' }, 'Paid in full, no interest'),
          el('div', { class: 'muted small' }, `No interest charged on ${nText}.`)
        )
      );
      if (eairFrac != null) {
        const eairPct = Math.round(eairFrac * 100);
        if (latest.eairEstimated && latest.purchaseAnnualPct != null) {
          const disclosedPct = Math.round(latest.purchaseAnnualPct);
          const monthlyPct = latest.purchaseMonthlyPct;
          sec.append(
            el(
              'p',
              { class: 'muted small' },
              `Your statement shows a purchase rate of ${disclosedPct}% a year${monthlyPct != null ? ` (${monthlyPct}% a month)` : ''}. Carrying a balance would compound that monthly to a real yearly cost closer to ${eairPct}%, but clearing the statement each cycle means you pay none of it.`
            )
          );
        } else if (latest.eairEstimated) {
          sec.append(
            el(
              'p',
              { class: 'muted small' },
              `Clearing the statement each cycle avoids interest at an estimated ${eairPct}% a year, worked out from the monthly rate printed on your statement.`
            )
          );
        } else {
          sec.append(
            el(
              'p',
              { class: 'muted small' },
              `Clearing the statement each cycle avoids interest at about ${eairPct}% a year.`
            )
          );
        }
      }
      const un = utilisationNote();
      if (un) sec.append(un);
      return sec;
    }

    if (behaviour === 'insufficient') {
      const owed = latest.newBalance != null ? latest.newBalance : latest.amountOwing;
      sec.append(
        el(
          'div',
          { class: 'hero-figure' },
          el(
            'div',
            { class: 'fact-value metric-value metric--major' },
            owed == null ? '-' : money0(owed)
          ),
          el('div', { class: 'muted small' }, 'balance on your latest statement')
        )
      );
      const grid = el(
        'div',
        { class: 'sec-grid', style: 'margin-top:12px' },
        secItem('Credit used', latest.utilisation == null ? '-' : `${latest.utilisation}%`),
        latest.interestCharges == null
          ? null
          : secItem('Interest this cycle', money0(latest.interestCharges)),
        latest.minimumPayment == null
          ? null
          : secItem('Minimum payment', money0(latest.minimumPayment))
      );
      sec.append(grid);
      const un = utilisationNote();
      if (un) sec.append(un);
      sec.append(
        chartInfo(el, 'Payoff unavailable', 'Add more statement history with readable interest and rate details. Recorded figures remain exact.')
      );
      return sec;
    }

    const owed = latest.newBalance != null ? latest.newBalance : latest.amountOwing;
    sec.append(
      el(
        'div',
        { class: 'hero-figure' },
        el(
          'div',
          { class: 'fact-value metric-value metric--major' },
          owed == null ? '-' : money0(owed)
        ),
        el('div', { class: 'muted small' }, 'carried on your card')
      )
    );

    const typicalPayment = medianRecentPayment(stmts);
    const projection = projectCardPayoff(owed, eairFrac, typicalPayment);
    if (projection && !projection.neverClears) {
      sec.append(el('div', { class: 'sec-grid', style: 'margin-top:12px' },
        secItem('Monthly payment', money0(typicalPayment)),
        secItem('Months to clear', String(projection.months)),
        secItem('Projected interest', money0(projection.totalInterest))));
    } else if (projection && projection.neverClears) {
      sec.append(chartInfo(el, 'Balance barely moves', `At ${money0(typicalPayment)} per month, almost all of the payment goes toward interest.`));
    }
    const payoffCone = renderPayoffCone(owed, eairFrac, typicalPayment);
    if (payoffCone) sec.append(payoffCone);
    const grid = el(
      'div',
      { class: 'sec-grid', style: 'margin-top:12px' },
      secItem('Credit used', latest.utilisation == null ? '-' : `${latest.utilisation}%`),
      latest.interestCharges == null
        ? null
        : secItem('Interest this cycle', money0(latest.interestCharges)),
      latest.minimumPayment == null
        ? null
        : secItem('Minimum payment', money0(latest.minimumPayment))
    );
    sec.append(grid);
    const un = utilisationNote();
    if (un) sec.append(un);

    if (eairFrac == null) {
      sec.append(
        renderExplainer(
          el,
          'The projection needs the card\u2019s interest rate, which could not be read from this statement. The balance, interest and payments shown are exact; only the forward estimate is unavailable.',
          { label: 'Why there\u2019s no payoff estimate' }
        )
      );
    }
    return sec;
  }

  /* The data-quality plumbing that stays in Data & settings: how many
   * statements reconcile, and how many card payments trace to a bank transfer
   * (so cross-ledger totals are not double-counted). Trust signals, not a
   * verdict on how the card is serving the person - which is why they sit here
   * and the fitness answer above sits at the top of the tab. Byte-identical to
   * the reconciliation + cross-ledger lines of the former renderCardStatementHealth. */
  function renderCardStatementTrust() {
    const stmts = (state._cardStatements || [])
      .slice()
      .sort((a, b) => String(a.statementKey).localeCompare(String(b.statementKey)));
    if (!stmts.length) return null;
    const wrap = el('div', { class: 'sec-section' });
    wrap.append(el('div', { class: 'sec-subhead' }, icon(iconInfo()), ' Card statements'));
    const reconciled = stmts.filter((s) => s.reconciled).length;
    wrap.append(
      el(
        'p',
        { class: 'muted small' },
        `${reconciled} of ${stmts.length} statement${stmts.length === 1 ? '' : 's'} reconcile.`
      )
    );
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
        wrap.append(
          el(
            'p',
            { class: 'muted small' },
            `${link.matched} of ${link.total} card payments trace to a bank transfer, so those are counted once, not twice.`
          )
        );
      }
    }
    return wrap;
  }
  return {
    renderTrend,
    renderCategoryPanel,
    renderForeign,
    renderMerchants,
    renderRecurring,
    renderCardFitness,
    renderCardStatementTrust,
    catTag,
    prevLabel,
    histMonthlyAverage,
    buildInsights,
  };
}
