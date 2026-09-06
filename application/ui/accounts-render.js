/*
 * accounts-render.js  -  bank-side building blocks reused by Right Now.
 *
 * The Accounts tab itself has retired: its own hero, insights card
 * and full-page transaction view are gone, absorbed and rebuilt inside
 * right-now-render.js. What remains here is the bank-side analysis and the
 * ledger-review controls Right Now genuinely reuses unchanged: classifiedBank
 * (the internal-transfer/ledger-rule classification every tab reads),
 * bankMoney, cleanCounterparty, buildBankInsights,
 * renderLedgerReview, and renderBankStatementTrust.
 */

import { cleanBankCounterparty } from '../statements/read-statements.js';
import {
  classifyInternalTransfers,
  applyLedgerRules,
  analyseBankActivity,
  bankFlowOverTime,
  overviewVerdict,
} from '../analysis/bank-analysis.js';
import { smartTitle } from '../statements/categorise.js';
import {
  appendExpandable,
} from '../analysis/reporting-core.js';
import { hasAnswered } from '../analysis/confirmations.js';
import {
  missingMonths,
  buildBankAppropriateInsights,
} from '../analysis/reporting-insights.js';
import {
  formatMoney,
  namedMonths,
  smoothScrollToEl,
  requireCtx,
  formatDisplayDate,
  formatMonthYear,
  parseTransferNarrative,
  RECONCILE_MEANS,
} from '../core/shared-helpers.js';
import { categoriseBankRows } from '../analysis/bank-categorise.js';
import { rulesToMerchantOverrides } from '../../settings/category-rules.js';
import { makeProseMoney, currencyPrefix } from '../core/money-format.js';
import { subhead } from './decision-header.js';
import { accountStatementTrustReact, collapsibleCardReact, chartInfoReact, ledgerReviewReact } from './react-bridge.js';


// Shared, empty keep-upper / small-words set for smartTitle when tidying a bank
// counterparty for display (plain Title Case). Kept byte-identical to the set
// read-statements.js uses for the upstream counterparty label, so a payee shown
// through either path reads with exactly the same casing.
const CP_LABEL_SET = new Set();

export function createAccountsRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'render',
      'confirmQuestion',
      'bankMonthsList',
      'drillToAccountsPayee',
      'resolved',
      'bankRecordsInRange',
      'prevLabel',
      'iconUp',
      'iconDown',
      'iconAlert',
      'iconSpark',
      'iconGap',
      'iconFlag',
      'iconBulb',
      'iconChevron',
      'monthLabel',
      'monthShort',
      'pickStatements',
      'openStatementCoverage',
      'reviewStatements',
    ],
    'createAccountsRenderer'
  );
  const {
    state,
    el,
    icon,
    render,
    confirmQuestion,
    bankMonthsList,
    drillToAccountsPayee,
    // Bank-appropriate insights (Part 2): period/range helpers reused for the
    // income-change comparison and the large-payment/new-payee checks, plus
    // the extra icons and monthLabel the insights card needs.
    resolved,
    bankRecordsInRange,
    prevLabel,
    iconUp,
    iconDown,
    iconAlert,
    iconSpark,
    iconGap,
    iconFlag,
    monthLabel,
    monthShort,
    pickStatements,
    openStatementCoverage,
    // The same removal dialog Data & settings' "Imported files" button opens,
    // reused rather than paralleled: a filter and a reason turn it into the
    // door a reconciliation figure or a per-account tile can open directly,
    // landing on exactly the statements that figure is about.
    reviewStatements,
  } = ctx;
  /* ---- Accounts view (Phase 1: read-only, balance-first) ----
   * A minimal cash-flow and balance screen for the bank ledger: Cash inflow,
   * Cash outflow (internal transfers excluded), net movement and the closing
   * balance, then a transaction list carrying the running balance. Internal
   * transfers are shown but set apart. No categorisation, no card merchant
   * rules, no merging with card data (D1). */
  function bankMoney(n, currency) {
    const { locale = 'en-JM', decimals = 2 } = state.cfg.currency || {};
    return formatMoney(n, currencyPrefix(currency, state.cfg), locale, decimals);
  }

  /* The same amount, written for a sentence rather than a value slot. Insights
     and the review notes below are prose; bankMoney stays the exact figure for
     rows, totals and headline slots. */
  const prose = makeProseMoney(state.cfg || {});

  let _cbKey = null,
    _cbVal = null;
  function classifiedBank() {
    if (
      _cbKey &&
      _cbKey.br === state.bankRecords &&
      _cbKey.an === state.accountNames &&
      _cbKey.ca === state.cardAccounts &&
      _cbKey.rz === state.resolver &&
      _cbKey.cf === state.confirmations &&
      _cbKey.sa === state.sharedAccounts &&
      _cbKey.hp === state.householdPayees &&
      _cbKey.cp === state.compiled &&
      _cbKey.ru === state.rules
    ) {
      return _cbVal;
    }
    const base = classifyInternalTransfers(
      state.bankRecords,
      [],
      state.cardAccounts || [],
      state.resolver,
      state.confirmations || [],
      state.accountNames
    );
    // Apply the evidence-backed exclusions on top (cash/ABM self-deposits out of
    // income by default, shared-account support to household kept off the
    // personal headline).
    const ruled = applyLedgerRules(base, {
      confirmations: state.confirmations || [],
      sharedAccounts: state.sharedAccounts || [],
      householdPayees: state.householdPayees || [],
    });
    // Category parity with the card ledger. Bank rows previously reached every
    // screen with no category at all, so a personal rule a person had already
    // written only ever worked on one of their two statement types. Same
    // categorise() door, same personal rules, bank profile.
    const out = categoriseBankRows(ruled, state.compiled, {
      cfg: state.cfg,
      fallback: (state.cfg.special || {}).fallback || 'Uncategorised',
      merchantOverrides: rulesToMerchantOverrides(state.rules || []),
      routes: ((state.cfg.accountCategoryRoutes || {}).bank) || [],
      resolver: state.resolver,
      confirmations: state.confirmations || [],
    });
    _cbKey = {
      br: state.bankRecords,
      an: state.accountNames,
      ca: state.cardAccounts,
      rz: state.resolver,
      cf: state.confirmations,
      sa: state.sharedAccounts,
      hp: state.householdPayees,
      cp: state.compiled,
      ru: state.rules,
    };
    _cbVal = out;
    // INVARIANT: this array is now shared by reference across every caller
    // and across renders. Callers must treat it and its rows as READ-ONLY
    // (filter and read, never mutate a row in place), or the mutation will
    // silently reach every other view holding the same cached result.
    return out;
  }
  const _bankAnalysisCache = [];
  const _BANK_ANALYSIS_CACHE_MAX = 24;
  function bankAnalysis(fn, ...args) {
    for (const e of _bankAnalysisCache) {
      if (e.fn === fn && e.args.length === args.length && e.args.every((a, i) => a === args[i]))
        return e.value;
    }
    const value = fn(...args);
    _bankAnalysisCache.push({ fn, args, value });
    if (_bankAnalysisCache.length > _BANK_ANALYSIS_CACHE_MAX) _bankAnalysisCache.shift();
    return value;
  }

  let _rangeRecsAll = null,
    _rangeRecsFrom = null,
    _rangeRecsTo = null,
    _rangeRecsVal = null;
  function rangeRecs(recsAll, from, to) {
    if (_rangeRecsAll === recsAll && _rangeRecsFrom === from && _rangeRecsTo === to)
      return _rangeRecsVal;
    _rangeRecsVal = bankRecordsInRange(recsAll, from, to);
    _rangeRecsAll = recsAll;
    _rangeRecsFrom = from;
    _rangeRecsTo = to;
    return _rangeRecsVal;
  }

  function buildBankInsights(a, recs, recsAll, onNavigate = () => scrollToTx()) {
    const p = resolved();
    let prevIncome = null;
    if (p && p.prevFrom && p.prevTo) {
      const prevRecs = rangeRecs(recsAll, p.prevFrom, p.prevTo);
      prevIncome = bankAnalysis(analyseBankActivity, prevRecs).cashIn;
    }
    let verdict = null;
    if (p) {
      const trend = bankAnalysis(bankFlowOverTime, recs).map((t) => ({
        month: t.month,
        net: t.net,
      }));
      verdict = overviewVerdict({ netCashFlow: a.net, trend });
    }
    return buildBankAppropriateInsights({
      recsAll,
      period: p,
      cfg: state.cfg,
      currentIncome: a.cashIn,
      prevIncome,
      verdict,
      proseMoney: prose,
      prevLabel,
      monthLabel: monthShort,
      bankMonthsList,
      onNavigate,
      // The one insight on this card that is NOT about the rows below it. It
      // said "no account statement found for February 2024 and March 2024...
      // add them" and then scrolled to the transactions a person DOES have.
      // The hook for this has existed since the builder was written and was
      // never passed, so the sentence has always pointed away from its own
      // subject.
      onMissingMonths: openStatementCoverage,
      onDrillToPayee: (key, label) => drillToPayee(key, cleanCounterparty(label)),
      icons: {
        up: iconUp,
        down: iconDown,
        alert: iconAlert,
        spark: iconSpark,
        gap: iconGap,
      },
    });
  }
  // Scroll target shared by every Accounts insight that has no more specific
  // destination: the transaction list below (id="acct-tx", set in
  // renderAccounts). Accounts has no filter/search system to drill into
  // (unlike Cards' explorer), so every insight click surfaces the same real
  // transaction list the figures above already summarise.
  function scrollToTx() {
    if (!state.bankShowAllTx) {
      state.bankShowAllTx = true;
      render({ preserveScroll: false });
    }
    smoothScrollToEl('#acct-tx');
  }

  function drillToPayee(key, label) {
    drillToAccountsPayee(key, label);
  }

  // The third hand-written copy of the leading strip, and the one that had
  // drifted furthest: it understood neither a channel code in front of
  // "Transfer" nor "trf from", so the same row read one way here and another in
  // the transaction list. Now delegates to the ONE shared narrative parser.
  function cleanCounterparty(desc) {
    const given = String(desc == null ? '' : desc).trim();
    if (given && Object.values(state.accountNames || {}).includes(given)) return given;
    const party =parseTransferNarrative(cleanBankCounterparty(desc)).party;
    return smartTitle(party, CP_LABEL_SET, CP_LABEL_SET);
  }

  /* ONE question, one shape, wherever it is asked.
   *
   * These rows used to carry a "Count as income" button, and the ones already
   * answered moved into a second fold with an "Undo" beside them - a different
   * control, a different vocabulary and a different place from the identical
   * answer the transaction row offers, which asks "Is this income?" and takes
   * yes or no. Worse, this surface had no way to say NO: a person certain a
   * deposit was not theirs could only leave it unanswered, so the app kept
   * treating a settled question as an open guess.
   *
   * The card now renders the SAME line the category tag's dialog renders, built
   * by the same helper in ui/confirm-control.js. Answered and unanswered rows
   * sit in one list carrying their own answer, so nothing has to be opened to
   * see what was already decided, and changing an answer is the same two chips
   * that gave it.
   */
  function renderLedgerReview(a, recs, asProps = false) {
    const answered = (r, inference) => hasAnswered(state.confirmations || [], inference, [r.id]);
    const pending = (rows, inference) => [
      ...rows.filter((r) => !answered(r, inference)),
      ...rows.filter((r) => answered(r, inference)),
    ];
    const deposits = pending(recs.filter((r) => r.cashDeposit), 'income');
    const refunds = pending(recs.filter((r) => r.refundLike), 'refund');
    if (!deposits.length && !refunds.length && !(a.householdSupport > 0)) return null;
    const unanswered = (rows, inference) => rows.filter((r) => !answered(r, inference)).length;
    const waiting = unanswered(deposits, 'income') + unanswered(refunds, 'refund');
    const rows = (items, fallbackType) => items.map((r) => {
      const model = typeof window !== 'undefined' ? confirmQuestion(r, true) : null;
      const questionProps = model && typeof model.onAnswer === 'function' ? model : null;
      return {
        id: r.id,
        label: `${formatDisplayDate(r.date)} \u00b7 ${cleanCounterparty(r.description) || r.type || fallbackType}`,
        amount: bankMoney(r.amount),
        question: questionProps ? null : confirmQuestion(r),
        questionProps,
      };
    });
    const reviewProps = {
      deposits: rows(deposits, 'Deposit'),
      depositInfo: 'A machine deposit can be your own cash or cash for someone else, so it is not counted as money in until you say so. Answer each one and it stays answered.',
      depositNote: `${prose(a.cashDeposits)} in cash/ABM deposits is not counted as money in`,
      refunds: rows(refunds, 'Refund'),
      refundInfo: 'A refund is money returned rather than earned, so it is not counted as money in until you say so. Answer each one and it stays answered.',
      refundNote: `${prose(a.refunds)} came back as refunds or reversals`,
      householdNote: a.householdSupport > 0
        ? `Support to household: ${prose(a.householdSupport)} sent from your shared account to a household member. This is tracked here but kept out of your personal money-out figure.`
        : '',
      waiting,
      summary: waiting ? `${waiting} to address` : deposits.length || refunds.length ? 'All addressed' : 'Household support excluded',
      alwaysOpen: waiting > 0,
      manageLabel: 'Manage answers',
      iconNode: typeof window === 'undefined' ? icon(iconFlag()) : null,
      iconMarkup: typeof window !== 'undefined' ? iconFlag() : null,
    };
    return asProps ? reviewProps : ledgerReviewReact(el, reviewProps);
  }

  // Account-statement reconciliation, relocated into "Data & settings" to
  // mirror renderCardStatementTrust on the card side: each ledger keeps its own
  // reconciliation line beside its management actions, not as a prominent card
  // in the main flow. Returns a .sec-section (the same shape the card version
  // returns, so the existing .secondary .sec-section styling applies), or null
  // when no bank statements are stored. Sorting is unchanged from the former
  // card: most recent first, unparseable periods last, account as a stable
  // tiebreaker. A one-line "N of M reconcile" summary leads, matching the card
  // line, then the full per-statement list stays available via appendExpandable.
  // Account statements: the one place a person comes to answer "can I trust that
  // what the rest of the app shows is my complete, accurate, current history".
  // That splits into accuracy (do the figures add up), completeness (is any
  // month missing) and freshness (how current is it). This leads with the
  // plain-language verdict, then states coverage + completeness in one line and
  // freshness in another, then gives ONE row per account (its own span, count
  // and reconcile health) instead of a flat wall of per-statement rows - so it
  // scales as more accounts and banks are added, and each account's own history
  // can be judged at a glance. Returns a .sec-section (styled by the existing
  // .secondary .sec-section rules) or null when nothing is stored.
  function renderBankStatementTrust(asProps = false) {
    const stmts = state._bankStatements || [];
    if (!stmts.length) return null;

    const MON = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const periodMonths = (period) => {
      const re = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/g;
      const dates = [];
      let m;
      while ((m = re.exec(String(period || ''))) !== null) {
        const mo = MON[m[2].toLowerCase()];
        if (mo != null) dates.push(`${m[3]}-${String(mo + 1).padStart(2, '0')}`);
      }
      if (!dates.length) return [];
      const start = dates[0],
        end = dates[dates.length - 1];
      const out = [];
      let ym = start,
        guard = 0;
      while (ym <= end && guard < 360) {
        out.push(ym);
        const [y, mo] = ym.split('-').map(Number);
        const d = new Date(Date.UTC(y, mo, 1));
        ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        guard++;
      }
      return out;
    };

    const byAccount = new Map();
    const coveredAll = new Set(bankMonthsList());
    let latestImport = null;
    for (const s of stmts) {
      const acc = s.account || '-';
      if (!byAccount.has(acc))
        byAccount.set(acc, {
          account: acc,
          statements: [],
          months: new Set(),
          reconciled: 0,
        });
      const g = byAccount.get(acc);
      g.statements.push(s);
      if (s.reconciled) g.reconciled++;
      for (const ym of periodMonths(s.period)) {
        g.months.add(ym);
        coveredAll.add(ym);
      }
      if (s.importedAt && (!latestImport || s.importedAt > latestImport))
        latestImport = s.importedAt;
    }

    const totalN = stmts.length;
    const totalOk = stmts.filter((s) => s.reconciled).length;
    const accountsN = byAccount.size;
    const coveredMonths = [...coveredAll].filter(Boolean).sort();
    const first = coveredMonths[0] || null;
    const last = coveredMonths[coveredMonths.length - 1] || null;
    const gaps = missingMonths(coveredMonths);
    const spanText = first
      ? first === last
        ? formatMonthYear(first)
        : `${formatMonthYear(first)} - ${formatMonthYear(last)}`
      : '-';
    const drawerPreview = `${spanText} · ${accountsN} account${accountsN === 1 ? '' : 's'}`;
    const accounts = [...byAccount.values()]
      .map((accountGroup) => {
        const ms = [...accountGroup.months].filter(Boolean).sort();
        const g = {
          account: accountGroup.account,
          n: accountGroup.statements.length,
          failed: accountGroup.statements.length - accountGroup.reconciled,
          first: ms[0] || null,
          last: ms[ms.length - 1] || null,
          firstLabel: ms[0] ? formatMonthYear(ms[0]) : null,
          lastLabel: ms[ms.length - 1] ? formatMonthYear(ms[ms.length - 1]) : null,
        };
        g.element = g.failed ? 'button' : 'div';
        return g;
      })
      .sort((a, b) => b.failed - a.failed || String(a.account).localeCompare(String(b.account)));

    const needAttention = accounts.filter((g) => g.failed);
    const healthy = accounts.filter((g) => !g.failed);
    const props = {
      class: 'disclosure sec-fold stmt-summary-section',
      summary: {
        title: 'Account statements',
        note: `${totalOk} of ${totalN} reconcile`,
        explain: RECONCILE_MEANS,
      },
      drawerPreviewNode: typeof window === 'undefined' ? el('span', { class: 'sec-fold-meta' }, drawerPreview) : null,
      drawerPreviewText: typeof window !== 'undefined' ? drawerPreview : null,
      spanText,
      latestUpdatedText: latestImport ? formatDisplayDate(String(latestImport).slice(0, 10)) : '-',
      completenessText: first && last && first !== last
        ? gaps.length
          ? `No statement for ${namedMonths(gaps, formatMonthYear, 3)}, so that stretch is incomplete. Add those PDFs for a full picture.`
          : 'All months covered.'
        : null,
      totalOk,
      totalN,
      accountsN,
      needAttention,
      healthy,
      onReviewAll: totalOk < totalN ? () => reviewStatements({
        match: (st) => st.ledger === 'bank' && !st.reconciled,
        reason: 'Account statements that need a look',
      }) : null,
      onReviewAccount: (g) => reviewStatements({
        match: (st) => st.ledger === 'bank' && st.account === g.account && !st.reconciled,
        reason: `Account ${g.account} statements that need a look`,
      }),
    };
    return asProps ? props : accountStatementTrustReact(el, props);
  }

  return {
    classifiedBank,
    bankMoney,
    cleanCounterparty,
    renderBankStatementTrust,
    buildBankInsights,
    renderLedgerReview,
  };
}
