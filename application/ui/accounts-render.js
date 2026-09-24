/*
 * accounts-render.js  -  bank-side building blocks reused by Right Now.
 *
 * The Accounts tab itself has retired: its own hero, insights card
 * and full-page transaction view are gone, absorbed and rebuilt inside
 * right-now-render.js. What remains here is the bank-side analysis and the
 * ledger-review controls Right Now genuinely reuses unchanged: classifiedBank
 * (the internal-transfer/ledger-rule classification every tab reads),
 * bankMoney, cleanCounterparty, buildBankInsights, renderBankTrend,
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
  MONTHS_SHORT,
  parseTransferNarrative,
  RECONCILE_MEANS,
} from '../core/shared-helpers.js';
import { renderColumnChart } from './chart-surface.js';
import { categoriseBankRows } from '../analysis/bank-categorise.js';
import { monthTickOf } from './chart-helpers.js';
import { rulesToMerchantOverrides } from '../../settings/category-rules.js';
import { makeProseMoney, currencyPrefix } from '../core/money-format.js';
import { chartInfo, subhead, secItem } from './decision-header.js';
import { collapsibleCardReact } from './react-bridge.js';


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
      'iconInfo',
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
      'openMonth',
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
    iconInfo,
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
    openMonth,
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
      _cbKey.ma === state.myAccounts &&
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
      state.myAccounts,
      state.cardAccounts || [],
      state.resolver,
      state.confirmations || []
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
      fallback: (state.cfg.special || {}).fallback || 'Uncategorised',
      merchantOverrides: rulesToMerchantOverrides(state.rules || []),
      routes: ((state.cfg.accountCategoryRoutes || {}).bank) || [],
      resolver: state.resolver,
    });
    _cbKey = {
      br: state.bankRecords,
      ma: state.myAccounts,
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
        info: iconInfo,
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
      render();
    }
    smoothScrollToEl('#acct-tx');
  }

  function drillToPayee(key, label) {
    drillToAccountsPayee(key, label);
  }

  function renderBankTrend() {
    const trend = bankAnalysis(bankFlowOverTime, classifiedBank());
    if (!trend.length) return null;
    const p = resolved();
    const shown = trend.slice(-12);
    const sec = el('section', { class: 'card' });
    sec.append(
      el(
        'div',
        { class: 'card-head' },
        el('h3', { class: 'card-title' }, icon(iconSpark()), 'Cash in and out over time')
      )
    );

    // Year on the ticks whenever these rows cross one (monthTickOf).
    const monthTick = monthTickOf(MONTHS_SHORT, shown);
    sec.append(renderColumnChart({ el, monthLabel, monthShort: monthTick }, {
      label: 'Cash in and out by month',
      money: bankMoney,
      rows: shown.map((t) => ({ ...t, inPeriod: !!(p && t.month >= p.from && t.month <= p.to), selected: !!(p && p.from === t.month && p.to === t.month), detail: 'Own-account transfers excluded' })),
      series: [
        { key: 'moneyIn', label: 'Cash inflow', tone: 'in' },
        { key: 'moneyOut', label: 'Cash outflow', tone: 'out' },
      ],
      onSelect: (t) => openMonth(t.month),
    }));
    return sec;
  }

  // The third hand-written copy of the leading strip, and the one that had
  // drifted furthest: it understood neither a channel code in front of
  // "Transfer" nor "trf from", so the same row read one way here and another in
  // the transaction list. Now delegates to the ONE shared narrative parser.
  function cleanCounterparty(desc) {
    const party = parseTransferNarrative(cleanBankCounterparty(desc)).party;
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
  function reviewRow(r, fallbackType) {
    const holder = el('div', { class: 'review-row' });
    holder.append(
      el(
        'div',
        { class: 'recurring-row' },
        el(
          'span',
          { class: 'recurring-name' },
          `${formatDisplayDate(r.date)} \u00b7 ${cleanCounterparty(r.description) || r.type || fallbackType}`
        ),
        el('span', { class: 'recurring-amt num strong' }, bankMoney(r.amount))
      )
    );
    holder.append(confirmQuestion(r));
    return holder;
  }

  function renderLedgerReview(a, recs) {
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
    const appendReviewDetails = (host) => {
      if (deposits.length) {
        host.append(
          el(
            'p',
            { class: 'muted small review-note' },
            `${prose(a.cashDeposits)} in cash/ABM deposits is not counted as income`,
            chartInfo(
              el,
              '',
              'A machine deposit can be your own cash or cash for someone else, so it is not counted as income until you say so. Answer each one and it stays answered.'
            )
          )
        );
        const list = el('div', { class: 'recurring-list' });
        appendExpandable(el, list, deposits, (r) => reviewRow(r, 'Deposit'), { initial: 5 });
        host.append(list);
      }
      if (a.householdSupport > 0) {
        host.append(
          el(
            'p',
            { class: 'muted small', style: 'margin-top:8px' },
            `Support to household: ${prose(a.householdSupport)} sent from your shared account to a household member. This is tracked here but kept out of your personal money-out figure.`
          )
        );
      }
      if (refunds.length) {
        host.append(
          el(
            'p',
            { class: 'muted small review-note', style: 'margin-top:8px' },
            `${prose(a.refunds)} came back as refunds or reversals`,
            chartInfo(
              el,
              '',
              'A refund is money returned rather than earned, so it is not counted as income until you say so. Answer each one and it stays answered.'
            )
          )
        );
        const list = el('div', { class: 'recurring-list' });
        appendExpandable(el, list, refunds, (r) => reviewRow(r, 'Refund'), { initial: 5 });
        host.append(list);
      }
    };
    const sec = el('div', { class: 'review-adjustments-body' });
    if (waiting) {
      appendReviewDetails(sec);
    } else {
      const answers = el('div', { class: 'review-answers', id: 'activity-review-answers', hidden: '' });
      appendReviewDetails(answers);
      const manage = el(
        'button',
        {
          class: 'btn sm review-manage',
          type: 'button',
          'aria-controls': 'activity-review-answers',
          'aria-expanded': 'false',
          onclick: () => {
            const opening = answers.hidden;
            answers.hidden = !opening;
            manage.setAttribute?.('aria-expanded', String(opening));
            manage.textContent = opening ? 'Close answers' : 'Manage answers';
          },
        },
        'Manage answers'
      );
      sec.append(
        el(
          'div',
          { class: 'review-settled' },
          el('p', { class: 'muted small' }, 'All review decisions are addressed. You can revisit an answer at any time.'),
          manage
        ),
        answers
      );
    }
    const card = collapsibleCardReact(el, {
      title: 'Review & adjustments',
      icon: icon(iconFlag()),
      summary: waiting ? `${waiting} to address` : 'All addressed',
      body: sec,
      name: 'activity-review',
      alwaysOpen: waiting > 0,
      foldAll: false,
    });
    if (card) {
      card.classList.add('acct-review');
      card.classList.toggle('is-action-needed', waiting > 0);
    }
    return card;
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
  function renderBankStatementTrust() {
    const stmts = state._bankStatements || [];
    if (!stmts.length) return null;

    // The month keys a "DD Mon YYYY - DD Mon YYYY" period string covers, first
    // to last inclusive. Presentation only; no stored value changes.
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
        const d = new Date(Date.UTC(y, mo, 1)); // step to the next calendar month
        ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        guard++;
      }
      return out;
    };

    // Group by account, union the covered months across every statement (a
    // period's own span PLUS any month that carries a transaction, so a quiet
    // month that still has a statement is never mis-read as a gap), and track
    // the newest import for the freshness line.
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

    const wrap = el('details', { class: 'disclosure sec-fold stmt-summary-section' });
    wrap.append(
      el(
        'summary',
        {},
        subhead(el, {
          title: 'Account statements',
          note: `${totalOk} of ${totalN} reconcile`,
          explain: RECONCILE_MEANS,
        }),
        el('span', { class: 'sec-fold-meta' }, drawerPreview)
      )
    );
    const detailBody = el('div', { class: 'disclosure-body sec-fold-body' });
    wrap.append(detailBody);
    if (totalOk < totalN)
      detailBody.append(
        el(
          'div',
          { class: 'manage-actions settings-actions' },
          el(
            'button',
            {
              class: 'btn sm ghost',
              onclick: () =>
                reviewStatements({
                  match: (st) => st.ledger === 'bank' && !st.reconciled,
                  reason: 'Account statements that need a look',
                }),
            },
            'Review'
          )
        )
      );

    // Coverage span and freshness: the two facts this panel answers beyond
    // reconciliation (already stated above), in the same boxless glance row
    // "180 statements / 1929 transactions / 36 months" uses two rows up -
    // one shape for "figures at a glance", not a bordered tile here and
    // plain text there for the same idea.
    const glance = el('div', { class: 'sec-glance' });
    glance.append(secItem(el, `Covered \u00b7 ${accountsN} account${accountsN === 1 ? '' : 's'}`, spanText));
    glance.append(
      secItem(
        el,
        'Last updated',
        // formatDisplayDate, like every other date in the app. This one line
        // used the browser locale, so "Last updated" printed 9/8/2026 while
        // every date beside it read 08-Sep-26.
        latestImport ? formatDisplayDate(String(latestImport).slice(0, 10)) : '-'
      )
    );
    detailBody.append(glance);

    // Completeness line: name any month inside the covered span with no
    // statement - the one thing a list of present statements can never show.
    if (first && last && first !== last) {
      detailBody.append(
        el(
          'p',
          { class: 'muted small stmt-note' },
          gaps.length
            ? // Named through the one shared helper, so this line and the
              // coverage card sitting two sections below it in the same fold
              // use the same words for the same months, instead of two
              // hand-rolled joins that had already drifted apart.
              `No statement for ${namedMonths(gaps, formatMonthYear, 3)}, so that stretch is incomplete. Add those PDFs for a full picture.`
            : 'All months covered.'
        )
      );
    }

    // One row per account: its own span, statement count and health. Accounts
    // holding a statement that did not reconcile sort first, then by number.
    const accounts = [...byAccount.values()]
      .map((g) => {
        const ms = [...g.months].filter(Boolean).sort();
        return {
          account: g.account,
          n: g.statements.length,
          failed: g.statements.length - g.reconciled,
          first: ms[0] || null,
          last: ms[ms.length - 1] || null,
        };
      })
      .sort((a, b) => b.failed - a.failed || String(a.account).localeCompare(String(b.account)));

    // One compact tile per account: a peer object a person scans and compares,
    // so tiles wrap into columns on desktop and collapse to one column on
    // mobile (styles.css .stmt-grid), rather than full-width rows that waste
    // desktop width and grow the scroll as accounts are added. Health colour is
    // always paired with a word and a dot, never colour alone.
    const renderAccountCard = (g) => {
      const span = g.first
        ? g.first === g.last
          ? formatMonthYear(g.first)
          : `${formatMonthYear(g.first)} - ${formatMonthYear(g.last)}`
        : 'no dated statements';
      const health = g.failed
        ? el('span', { class: 'recon-warn' }, `${g.failed} of ${g.n} need a look`)
        : el('span', { class: 'recon-ok' }, 'All reconcile');
      // A tile that names a problem is the door to it: tapping opens exactly
      // this account's failing statements, not the flat "Imported files" list
      // of every account's every file. Nothing to open when it all reconciles,
      // so the tile stays a plain, unclickable summary.
      return el(
        g.failed ? 'button' : 'div',
        {
          class: 'stmt-card' + (g.failed ? ' attn' : ''),
          ...(g.failed
            ? {
                type: 'button',
                onclick: () =>
                  reviewStatements({
                    match: (st) => st.ledger === 'bank' && st.account === g.account && !st.reconciled,
                    reason: `Account ${g.account} statements that need a look`,
                  }),
              }
            : {}),
        },
        el(
          'div',
          { class: 'stmt-card-head' },
          el('span', { class: 'stmt-dot ' + (g.failed ? 'warn' : 'neutral') }),
          el('span', { class: 'stmt-card-name' }, `Account ${g.account}`)
        ),
        el(
          'div',
          { class: 'stmt-card-meta muted small' },
          `${span} \u00b7 ${g.n} statement${g.n === 1 ? '' : 's'}`
        ),
        el('div', { class: 'stmt-card-health' }, health)
      );
    };

    // Accounts needing a look are surfaced up front and never hidden; healthy,
    // all-reconciling accounts fold into a collapsed native disclosure (the same
    // pattern as the app's explainers) so a clean ledger reads as one calm
    // verdict panel instead of a repeating wall of identical "all reconcile"
    // tiles, and stays that calm as more accounts and banks are added.
    const needAttention = accounts.filter((g) => g.failed);
    const healthy = accounts.filter((g) => !g.failed);

    if (needAttention.length) {
      const grid = el('div', { class: 'stmt-grid' });
      for (const g of needAttention) grid.append(renderAccountCard(g));
      detailBody.append(grid);
    }

    if (healthy.length) {
      const details = el('details', { class: 'disclosure explainer stmt-accounts-more' });
      details.append(
        el(
          'summary',
          {},
          `Per-account detail (${healthy.length} account${healthy.length === 1 ? '' : 's'})`
        )
      );
      const grid = el('div', { class: 'stmt-grid' });
      for (const g of healthy) grid.append(renderAccountCard(g));
      details.append(el('div', { class: 'disclosure-body explainer-body' }, grid));
      detailBody.append(details);
    }

    return wrap;
  }

  return {
    classifiedBank,
    bankMoney,
    cleanCounterparty,
    renderBankStatementTrust,
    renderBankTrend,
    buildBankInsights,
    renderLedgerReview,
  };
}
