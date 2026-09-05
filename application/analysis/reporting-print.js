/*
 * reporting.js  -  pure analysis, the shared on-screen render building blocks,
 * and the print-model orchestration for the Personal Finance Analyser.
 *
 * Pure and browser/Node-safe: no DOM is required except by the shared render
 * helpers and the print-model group, which take a `document` argument, so the
 * whole module is unit-testable. The printable-report renderers themselves now
 * live in report-render.js, the CSV writers in csv-export.js, and the encrypted
 * backup lock-and-key in history-codec.js; this file imports the report
 * renderers only to drive them, and holds none of those three itself. */
import {
  merchantRuleKeyFromDescription,
  merchantGroupKey,
  merchantBrandLabel,
  merchantBranch,
  merchantDisplayLabel,
} from '../../settings/category-rules.js';
import { categorise, smartTitle, merchantLabel } from '../statements/categorise.js';
import { transactionIdentity } from '../statements/read-statements.js';
import {
  analyseBankActivity,
  analyseCombinedOverview,
  analyseRollup,
  detectLargeBankOutflows,
  detectPeriodNewPayees,
} from '../analysis/bank-analysis.js';
import {
  roundMoney,
  capitaliseFirst,
  requireCtx,
  monthIndex,
  recurringStatus,
  monthKey,
  formatDisplayDate,
  medianDayOfMonth,
  addDaysIso,
  isoDay,
  detectSustainedRise,
} from '../core/shared-helpers.js';
import { renderReport, renderBankReport, renderOverviewReport } from '../output/report-render.js';
import { categoryTotalsWithSplits, splitsByTxnId, validateSplit } from './transaction-splits.js';

import { capForPrint } from './reporting-core.js';
import { detectIncompleteMonth, periodCoverageNote } from './reporting-periods.js';
/* ===========================================================================
 *  Print-model orchestration + report driver  (Stage 5 of the split)
 *  --------------------------------------------------------------------------- 
/* The ONE factory-wrapped group in this file. Everything above is a plain, bootUI-free export; this section is different by nature. These functions build the plain data models that the three printable-report renderers (renderReport / renderBankReport / renderOverviewReport, now in report-render.js and imported at the top of this file) turn into a printed page, and they drive the actual print flow - so they need live bootUI state (the current view, the selected period, the classified bank rows, the formatting helpers). That is why they take a ctx, exactly like the accounts-render / category-picker / manage-data / data-export / cards-render factories, while the pure report renderers they drive do not. They were the print-model group deferred at Stage 3c-i: buildPrintModel needed buildInsights / prevLabel / histMonthlyAverage, which only became clean factory exports once the Cards render tree moved (Stage 4). The group lands HERE, beside the analysis it feeds on and next to the imported renderers it drives - capForPrint and detectIncompleteMonth resolve as plain in-file references (module-scope function declarations, hoisted, reachable from inside this factory's closure), the three renderers resolve through the report-render.js import, and only the cross-ledger analysers (analyseBankActivity / analyseCombinedOverview / analyseRollup) needed adding to the read-statements import above. currentBankViewRows stays internal to the factory but is also returned, so app.js can hand it to the data-export factory (exportCurrentCSV calls it), mirroring how it was passed by reference before the move. printReport, buildReportForCurrentView and exitPrint
 *  ======================================================================== */
export function createPrintReports(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      '$',
      'el',
      'toast',
      'iconX',
      'toggleExportMenu',
      'bankRecordsInPeriod',
      'resolved',
      'analysis',
      'periodRows',
      'visibleRows',
      'allMonths',
      'FALLBACK',
      'isReview',
      'catColour',
      'money0',
      'moneyShort',
      'pct',
      'monthLabel',
      'monthShort',
      'prevLabel',
      'histMonthlyAverage',
      'buildInsights',
      'classifiedBank',
      'bankMoney',
      'cleanCounterparty',
      'overviewModel',
    ],
    'createPrintReports'
  );
  const {
    state,
    $,
    el,
    toast,
    iconX,
    toggleExportMenu,
    bankRecordsInPeriod,
    resolved,
    analysis,
    periodRows,
    visibleRows,
    allMonths,
    FALLBACK,
    isReview,
    catColour,
    money0,
    moneyShort,
    pct,
    monthLabel,
    monthShort,
    prevLabel,
    histMonthlyAverage,
    buildInsights,
    classifiedBank,
    bankMoney,
    cleanCounterparty,
    overviewModel,
  } = ctx;

  // Build the report for whichever ledger is on screen and return true if it was
  // populated. Shared by the Export menu AND the browser's own Ctrl+P (via the
  // beforeprint listener in wireChrome), so both build the correct report - the
  // fix for a raw Ctrl+P producing a blank page because nothing built the report.
  function buildReportForCurrentView() {
    // Round 3: Right Now shows both ledgers together, exactly like Overview,
    // so printing from it produces the SAME combined report Overview already
    // produces, rather than the single-ledger card or bank report either of
    // the two retired tabs used to print. Only when a device has bank data
    // (state.bankRecords.length) does this combined path apply; a card-only
    // device on Right Now falls through to the ordinary card report below.
    const overviewView = state.view === 'overview' && state.bankRecords.length > 0;
    // Ahead has no printed report of its own (Round 2 delivers the on-screen
    // forecast only). It is built entirely from the bank ledger, so printing
    // from it reuses the Accounts activity report - the honest choice already
    // available - rather than silently falling through to a card spending
    // report that has nothing to do with what is on screen.
    const accountsView = state.view === 'ahead' && state.bankRecords.length > 0;
    const bankView = overviewView || accountsView;
    if (bankView ? !state.bankRecords.length : !state.records.length) return false;
    const host = $('#print-report');
    if (!host) return false;
    host.textContent = '';
    resolveReportTheme();
    host.appendChild(
      el(
        'button',
        {
          class: 'report-close',
          'aria-label': 'Back to dashboard',
          onclick: exitPrint,
        },
        el('span', { class: 'report-close-x', html: iconX() }),
        el('span', {}, 'Back to dashboard')
      )
    );
    try {
      const node = overviewView
        ? renderOverviewReport(document, buildOverviewPrintModel())
        : accountsView
          ? renderBankReport(document, buildBankPrintModel())
          : renderReport(document, buildPrintModel());
      host.appendChild(node);
    } catch (err) {
      console.error(err);
      toast('Could not build the report.');
      exitPrint();
      return false;
    }
    document.documentElement.classList.add('printing');
    return true;
  }

  function printReport() {
    toggleExportMenu(false);
    if (!buildReportForCurrentView()) {
      toast('Add a statement first, then create a report.');
      return;
    }
    setTimeout(() => window.print(), 60);
  }

  function resolveReportTheme() {
    const root = document.documentElement;
    const setting = root.dataset.theme || 'auto';
    let effective = setting;
    if (setting === 'auto') {
      const prefersDark =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = prefersDark ? 'dark' : 'light';
    }
    root.dataset.reportTheme = effective;
    return effective;
  }

  function reportChartPalette() {
    const cs = getComputedStyle(document.documentElement);
    const tok = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    return {
      hatchFill: tok('--edge', '#c9d3df'),
      hatchLine: tok('--dim', '#8b98a8'),
      grid: tok('--edge', '#e6eaf0'),
      avg: tok('--dim', '#8a94a6'),
      bar: tok('--accent', '#1f6feb'),
      barMuted: tok('--dim', '#9aa7b8'),
      barStroke: tok('--accent-dark', '#12539c'),
      baseline: tok('--edge', '#c2ccd8'),
    };
  }

  // Rows currently on screen in the Accounts view: classified for internal
  // transfers, narrowed to the selected account when one is chosen, newest
  // first - so the report and CSV match exactly what the person is looking at.
  function currentBankViewRows() {
    // Scoped to the shared reporting window so "Current view" CSV matches
    // exactly what the Accounts tab is showing under the active period.
    const recs = bankRecordsInPeriod(classifiedBank());
    const one = state.bankAccount && state.bankAccount !== 'all';
    return one ? recs.filter((r) => r.account === state.bankAccount) : recs;
  }

  /* Assemble the plain data model the bank report renders from. Every figure
   * comes from the same analyseBankActivity the Accounts view uses, so the
   * report and the live screen can never disagree. */
  function buildBankPrintModel() {
    const recs = classifiedBank();
    const a = analyseBankActivity(recs);
    const multi = a.accounts.length > 1;
    const one = state.bankAccount && state.bankAccount !== 'all';
    const scope = one
      ? `Account ${state.bankAccount}`
      : multi
        ? `All accounts (${a.accounts.length})`
        : `Account ${a.accounts[0] ? a.accounts[0].account : '-'}`;

    const stmts = (state._bankStatements || [])
      .slice()
      .sort(
        (x, y) =>
          String(x.account).localeCompare(String(y.account)) ||
          String(x.period).localeCompare(String(y.period))
      )
      .map((st) => ({
        account: st.account || '-',
        period: st.period || st.source_file,
        count: String(st.count == null ? '' : st.count),
        closingBalance: st.closingBalance == null ? '-' : bankMoney(st.closingBalance),
        reconciled: !!st.reconciled,
        reconNote: st.reconNote || 'balance did not reconcile',
      }));
    const allReconciled = stmts.length && stmts.every((st) => st.reconciled);

    const viewRows = one ? recs.filter((r) => r.account === state.bankAccount) : recs;
    const txns = viewRows
      .slice()
      .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))
      .map((r) => ({
        date: formatDisplayDate(r.date),
        account: r.account || '-',
        description: cleanCounterparty(r.description) || r.type || '-',
        flow: r.internalTransfer
          ? 'Internal'
          : r.refund
            ? 'Refund'
            : r.household
              ? 'Household'
              : r.excludedFromIncome
                ? 'Not yet income'
                : r.direction === 'in'
                  ? 'In'
                  : 'Out',
        // Each row is shown in its OWN currency, exactly as the live Accounts
        // transaction table does (bankMoney(r.amount, r.currency)). A USD row was
        // printing with a J$ prefix on a correct USD number - a mislabel, not a
        // wrong figure. No amount is converted or summed here; only the symbol
        // now matches the row's currency.
        amount: (r.direction === 'in' ? '+' : '') + bankMoney(r.amount, r.currency),
        credit: r.direction === 'in',
        balance: r.balanceAfter == null ? '' : bankMoney(r.balanceAfter, r.currency),
      }));

    return {
      app: state.cfg.app.name,
      scope,
      generated: new Date().toLocaleString(state.cfg.currency.locale),
      currencyCode: state.cfg.currency.code,
      privacy: 'Generated on this device. Your statement data never leaves it.',
      // C3 (S20): same USD note as the Overview model, keyed off a.foreignAccounts
      // (analyseBankActivity surfaces non-base accounts there). Null when none.
      usdNote:
        a.foreignAccounts && a.foreignAccounts.length
          ? 'A USD account exists on this device and is shown separately. Its balance is not included in these base-currency totals.'
          : null,
      adjustmentNotes: [
        a.refunds > 0
          ? `${bankMoney(a.refunds)} came back as refunds or reversals and is kept out of Cash inflow.`
          : null,
        a.cashDeposits > 0
          ? `${bankMoney(a.cashDeposits)} in cash deposits is not yet confirmed as income.`
          : null,
        a.householdSupport > 0
          ? `${bankMoney(a.householdSupport)} sent to a household member is kept out of personal Cash outflow.`
          : null,
      ].filter(Boolean),
      summary: {
        closingLabel: multi ? 'Total cash position' : 'Cash position',
        closingBalance: a.closingBalance == null ? '-' : bankMoney(a.closingBalance),
        accountsSub: multi ? `Across ${a.accounts.length} accounts` : null,
        moneyIn: bankMoney(a.cashIn),
        moneyOut: bankMoney(a.cashOut),
        net: (a.net >= 0 ? '+' : '') + bankMoney(a.net),
        internalNote: `${bankMoney(a.internalOut)} moved between your own accounts (excluded above).`,
      },
      // Per-account rows are each shown in the account's OWN currency, matching
      // the live "By account" section (bankMoney(ac.cashIn, cur) etc.). A USD
      // account's own Cash inflow/out/closing are pure USD figures computed only
      // from that account's rows - never blended into the JMD headline above,
      // which analyseBankActivity sums from base-currency accounts only. This
      // fix corrects the symbol, not the number.
      accounts: a.accounts.map((ac) => ({
        account: ac.account,
        count: String(ac.n),
        moneyIn: bankMoney(ac.cashIn, ac.currency),
        moneyOut: bankMoney(ac.cashOut, ac.currency),
        closingBalance: ac.closingBalance == null ? '-' : bankMoney(ac.closingBalance, ac.currency),
      })),
      statements: stmts,
      reconNote: stmts.length
        ? allReconciled
          ? 'Every imported statement reconciles: opening balance plus each transaction reaches the printed closing balance to the cent.'
          : 'Some statements did not fully reconcile. The result column shows the first difference found.'
        : null,
      filtersText: one
        ? `Showing account ${state.bankAccount} only.`
        : 'Showing every imported account.',
      txns,
      txCountText: `${txns.length} transaction${txns.length === 1 ? '' : 's'} shown \u00b7 amounts in ${state.cfg.currency.code}. Internal rows are transfers between your own accounts.`,
    };
  }

  function buildOverviewPrintModel() {
    const { ov, roll } = overviewModel();
    const p = resolved();
    return {
      app: state.cfg.app.name,
      period: p ? p.label : 'All time',
      generated: new Date().toLocaleString(state.cfg.currency.locale),
      currencyCode: state.cfg.currency.code,
      privacy: 'Generated on this device. Your statement data never leaves it.',
      hasCard: !!roll.hasCard,
      // C3 (S20): note that a USD account exists and is shown separately, so the
      // print reader knows the base-currency totals deliberately exclude it. Null
      // when there is no foreign account, matching the always-present-key style of
      // this model object (cardOwedSub is likewise always set, never omitted).
      usdNote:
        roll.foreignAccounts && roll.foreignAccounts.length
          ? 'A USD account exists on this device and is shown separately. Its balance is not included in these base-currency totals.'
          : null,
      coverageNote: periodCoverageNote(state.coverage, p),
      summary: {
        netCashFlow: (roll.netCashFlow >= 0 ? '+' : '') + bankMoney(roll.netCashFlow),
        netSub: roll.netCashFlow >= 0 ? 'More came in than went out' : 'More went out than came in',
        moneyIn: bankMoney(roll.income),
        moneyOut: bankMoney(roll.externalSpending),
        moneyOutSub: roll.hasCard
          ? `${bankMoney(roll.bankExternalOut)} from your bank account + ${bankMoney(roll.cardSpend)} on your card`
          : 'External spending; transfers between your own accounts excluded',
        cashOnHand: roll.cashPosition == null ? '-' : bankMoney(roll.cashPosition),
        cardOwedSub:
          roll.cardOwed == null
            ? 'No card balance yet'
            : `${bankMoney(roll.cardOwed)} owed on card (shown separately, never netted)`,
      },
      trend: (roll.trend || []).map((tr) => ({
        month: monthShort(tr.month),
        income: bankMoney(tr.income),
        spending: bankMoney(tr.spending),
        net: (tr.net >= 0 ? '+' : '') + bankMoney(tr.net),
      })),
      trendNote: roll.hasCard
        ? 'Spending each month is money leaving your accounts plus card purchases. Own-account transfers and card payments are excluded, so nothing is counted twice.'
        : 'Cash outflow each month, with transfers between your own accounts excluded.',
      outflows: (ov.topOutflows || []).map((g) => ({
        label: cleanCounterparty(g.label),
        count: String(g.count),
        amount: bankMoney(g.moneyOut),
      })),
    };
  }

  // Unconditionally restore the dashboard. Used by the on-screen close control
  // and as best-effort secondary cleanup after printing; it never relies on any
  // browser event firing.
  function exitPrint() {
    document.documentElement.classList.remove('printing');
    document.documentElement.removeAttribute('data-report-theme');
    const host = $('#print-report');
    if (host) host.textContent = '';
  }

  // Row cap for the printable transaction table. Mirrors the explorer's
  // row-cap concept: show a generous prefix, note the rest in txCountText, so a
  // long period cannot spill an unbounded table across dozens of printed pages.
  // capForPrint treats any non-positive value as "show all".
  const TX_PAGE = 200;

  /* Assemble the plain data model the printable report renders from. All the
   * period figures come from the same pure analysis the dashboard uses, so the
   * report and the live screen can never disagree. */
  function buildPrintModel() {
    const a = analysis();
    const p = resolved();
    const f = state.filter;

    const parts = [];
    if (f.month !== 'all') parts.push(monthLabel(f.month));
    if (f.category !== 'all') parts.push(isReview(f.category) ? 'To review' : f.category);
    if (f.merchant) parts.push(f.merchantLabel || f.merchant);
    if (f.kind !== 'all')
      parts.push(
        {
          spend: 'Purchases',
          payment: 'Payments',
          refund: 'Refunds',
          fee: 'Fees & tax',
        }[f.kind]
      );
    if (f.foreignOnly) parts.push('Foreign only');
    if (f.reviewOnly) parts.push('To review');
    if (f.min != null) parts.push(`≥ ${money0(f.min)}`);
    if (f.max != null) parts.push(`≤ ${money0(f.max)}`);
    if (f.search) parts.push(`“${f.search}”`);

    let vsPrev = null;
    if (a.prev_total != null && a.prev_total !== 0) {
      const diff = a.total_spend - a.prev_total;
      const dp = Math.round((diff / a.prev_total) * 100);
      vsPrev = {
        text: `${Math.abs(dp)}% ${diff > 0 ? 'more' : diff < 0 ? 'less' : 'the same as'} than ${prevLabel()}`,
        prevMoney: money0(a.prev_total),
        dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      };
    }
    const hist = histMonthlyAverage();
    let vsAvg = null;
    if (hist) {
      const perMonth = a.months.length ? a.total_spend / a.months.length : a.total_spend;
      const d = (perMonth - hist) / hist;
      const word = Math.abs(d) < 0.08 ? 'about the same as' : d > 0 ? 'above' : 'below';
      vsAvg = `That is ${word} your typical month of ${money0(hist)}.`;
    }

    const months = allMonths();
    const shown = months.length > 13 ? months.slice(-13) : months;
    const inc = detectIncompleteMonth(state.rows, months, new Date(), {
      coverage: state.coverage,
    });
    const bars = shown.map((m) => {
      const v = state.allSummary.by_month[m] || 0;
      return {
        label: monthShort(m),
        value: v,
        money: money0(v),
        incomplete: !!(inc && inc.month === m),
        inPeriod: !!(p && m >= p.from && m <= p.to),
      };
    });

    const cats = a.by_category
      .map((c) => ({
        name: isReview(c.name) ? 'To review' : c.name,
        amount: money0(c.amount),
        share: pct(c.share),
        shareNum: c.share,
        colour: catColour(c.name),
        review: isReview(c.name),
      }))
      .sort((x, y) => (x.review ? 1 : 0) - (y.review ? 1 : 0));

    const merchants = a.merchants.slice(0, 12).map((m) => ({
      name: m.merchant,
      category: isReview(m.category) ? 'To review' : m.category,
      count: String(m.count),
      amount: money0(m.amount),
      avg: money0(m.avg),
      colour: catColour(m.category),
    }));

    const insights = buildInsights(a).map((i) => i.text);

    const uncategorised = periodRows().filter(
      (r) => r.kind === 'spend' && r.category === FALLBACK()
    );
    const reviewNote = uncategorised.length
      ? `${uncategorised.length} purchase${uncategorised.length === 1 ? '' : 's'} totalling ${money0(uncategorised.reduce((s, r) => s + r.amount, 0))} still need a category; they appear under “To review”.`
      : null;

    // The printable report caps its transaction table (reusing the explorer's
    // row-cap concept) so a long period cannot spill an unbounded table across
    // many pages. The held-back count is noted in txCountText below, keeping
    // renderReport itself unchanged.
    const allVisible = visibleRows();
    const { shown: rows, hidden: hiddenTxns } = capForPrint(allVisible, TX_PAGE);
    const kindLabel = {
      spend: 'Purchase',
      payment: 'Payment',
      refund: 'Refund',
      fee: 'Fee',
    };
    const txns = rows.map((r) => ({
      date: formatDisplayDate(r.date),
      description: r.displayName || r.description,
      foreign: r.foreign || '',
      category: isReview(r.category) ? 'To review' : r.category,
      colour: catColour(r.category),
      kind: kindLabel[r.kind] || r.kind,
      amount: (r.amount < 0 ? '+' : '') + money0(Math.abs(r.amount)),
      credit: r.amount < 0,
    }));

    return {
      app: state.cfg.app.name,
      period: a.label,
      filtersText: parts.length
        ? `Filtered to: ${parts.join(' · ')}`
        : 'All transactions in this period.',
      generated: new Date().toLocaleString(state.cfg.currency.locale),
      currencyCode: state.cfg.currency.code,
      privacy: 'Generated on this device. Your statement data never leaves it.',
      coverageNote: periodCoverageNote(state.coverage, p),
      summary: {
        totalSpend: money0(a.total_spend),
        vsPrev,
        vsAvg,
        nPurchases: String(a.n_purchases),
        leading: a.leading
          ? {
              label: isReview(a.leading.name) ? 'To review' : a.leading.name,
              share: pct(a.leading.share),
              colour: catColour(a.leading.name),
            }
          : null,
        paidToCard: money0(a.total_payments),
        fees: a.total_fees ? money0(a.total_fees) : null,
        refunds: a.total_refunds ? money0(a.total_refunds) : null,
      },
      trend: {
        bars,
        avg: hist || 0,
        avgLabel: hist ? moneyShort(hist) : null,
        avgMoney: hist ? money0(hist) : null,
        moneyShort,
        palette: reportChartPalette(),
      },
      categories: cats,
      merchants,
      insights,
      reviewNote,
      txns,
      txCountText:
        `${rows.length} transaction${rows.length === 1 ? '' : 's'} shown · amounts in ${state.cfg.currency.code}.` +
        (hiddenTxns > 0
          ? ` ${hiddenTxns} further transaction${hiddenTxns === 1 ? ' is' : 's are'} not shown - narrow the period or add a filter to include them.`
          : ''),
    };
  }

  return {
    printReport,
    buildReportForCurrentView,
    exitPrint,
    currentBankViewRows,
  };
}
