import { chartInfo, collapsibleCard, placeFoldAll } from './decision-header.js';
import { projectionReadiness } from '../analysis/coverage-map.js';
/*
 * ahead-render.js  -  the "Ahead" destination: Coming Up (Round 2) and Where
 * you're headed - goal-setting, the scenario tool, the monthly follow-up
 * (Round 4, plan section 6.2).
 *
 * The forecast switches on only once there is enough bank history to trust
 * it (state.cfg.ahead.minMonthsForForecast, default 2 months) and a readable
 * cash position exists. Below that, this shows a calm explanation of what is
 * missing and how close the person already is - never a shaky guess dressed
 * up as a real number, matching how every other "not enough yet" state in
 * this app already behaves (periodEmptyNotice, detectIncompleteMonth).
 *
 * Every Coming Up figure is read from data already stored - the current cash
 * position, the combined regular commitments (with their expected day), and
 * the recurring income pattern - never from day-to-day discretionary
 * spending, which this app does not attempt to predict.
 *
 * Where you're headed holds three things new to the app: a single stated
 * goal (GOAL_TYPES, reporting.js - a short fixed set the app can honestly
 * measure, never open text), a hands-on scenario tool that recomputes the
 * SAME runway figure Overview's own narrative already uses, and the monthly
 * honest follow-up - a frozen record app.js's checkMonthlyGoalIfDue already
 * builds each month, simply displayed here. Goal-setting itself is a plain
 * inline form (matching manage-data.js's "Your name" section), not a modal,
 * since it is a personal setting a person returns to and edits, not a
 * one-off per-row action.
 */
import {
  projectCashFlow,
  staleStatementNudges,
  typicalMonthlyOutflow,
  ymToday,
} from '../analysis/reporting-periods.js';
import {
  GOAL_TYPES,
  describeGoal,
  computeScenario,
} from '../analysis/reporting-insights.js';
import {
  analyseIncomePattern,
  analyseBankActivity,
} from '../analysis/bank-analysis.js';
import { accountName, formatDisplayDate, requireCtx, addDaysIso,
  capitaliseFirst, markProportional, roundedDurationPhrase, selectOnFocus,
} from '../core/shared-helpers.js';
import { pairCards } from './chart-helpers.js';
import {
  DEFAULT_CUSHION_MONTHS,
  EMERGENCY_FUND_LABEL,
  savedFigureNote,
  monthsLabel,
} from '../analysis/cushion.js';
import { makeMoneyCompact, makeProseMoney } from '../core/money-format.js';
// Goal-system migration, now complete: the PROVEN goals engine
// (goalProgress/buildGoalModel/resolveSafetyBoundary/safeContribution) is
// the SOLE engine behind every goal type - cushion, spend-ceiling and (as
// of G, the clear-card engine extension) clear-card too. The old
// reporting.js computeGoalProgress/describeGoal path is retired from the
// live card entirely; describeGoal is still imported above purely for the
// "not enough data yet" fallback sentence, which reads identically well
// under either engine.
import {
  goalProgress,
  resolveSafetyBoundary,
  safeContribution,
  buildGoalModel,
  goalOffTrack,
} from '../analysis/goals.js';
import { ensureMigrated } from '../analysis/goal-migrate.js';

// Module-level, session-only UI state - the same pattern cards-render.js
// already uses for _searchDebounce/_moreFiltersOpen: state that belongs to
// the interaction itself (which goal type is being drafted, which scenario
// items are toggled), never persisted, and reset naturally on a fresh load.
let _goalDraftType = null;
// key -> reduction fraction (0 keep / 0.5 cut half / 1 cut all). Replaces the
// old binary _scenarioExcluded Set: "Test a decision" now models spending
// LESS in a category, the realistic lever, not only removing it entirely.
let _scenarioReductions = new Map();
let _scenarioExtraCost = 0;
// Step 2 continued: the safety-boundary DRAFT kind being edited (null when
// the form is closed). The boundary itself, once saved, lives under its own
// storage key (financeGoalBoundary) - deliberately separate from state.goal,
// so it survives a goal change/clear/migration untouched, the same reasoning
// state.firstName survives doClearAll. Loaded once at boot into
// state._goalBoundary (app.js), read here, written here via a small local
// persist helper - this file does not own Store directly anywhere else, so
// that access is added narrowly, matching the existing pattern of goal
// persistence itself (setGoal/clearGoal live in app.js, not here).
let _boundaryDraftKind = null;

export function createAheadRenderer(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'icon',
      'render',
      'bankMoney',
      'classifiedBank',
      'commitmentsModel',
      'money0',
      'moneyShort',
      'monthLabel',
      'monthShort',
      'bankMonthsList',
      'pickStatements',
      'trackUsage',
      'switchLedgerView',
      'drillToAccountsPayee',
      'drillToTransactions',
      'cleanCounterparty',
      'toast',
      'overviewModel',
      'analysis',
      'setGoal',
      'clearGoal',
      'restoreGoal',
      'Store',
      'provenModels',
      'buildNewEngineProgressCtx',
      'latestCompleteGoalMonth',
      'evaluateGoal',
      'iconCal',
      'iconGap',
      'iconRepeat',
      'iconChart',
      'iconFlag',
      'renderPlanHero',
      'renderPlanLever',
      'planModel',
      'balanceUpdates',
    ],
    'createAheadRenderer'
  );
  const {
    state,
    el,
    icon,
    render,
    bankMoney,
    classifiedBank,
    commitmentsModel,
    bankMonthsList,
    pickStatements,
    trackUsage,
    switchLedgerView,
    drillToAccountsPayee,
    drillToTransactions,
    cleanCounterparty,
    toast,
    overviewModel,
    analysis,
    setGoal,
    clearGoal,
    restoreGoal,
    Store,
    provenModels,
    buildNewEngineProgressCtx,
    latestCompleteGoalMonth,
    iconCal,
    iconGap,
    iconRepeat,
    iconChart,
    iconFlag,
    monthLabel,
    monthShort,
    renderPlanHero,
    renderPlanLever,
    planModel,
    balanceUpdates,
  } = ctx;
  // Summary lines and annotations read short; headline figures stay exact.
  const prose = makeProseMoney((ctx.state && ctx.state.cfg) || {});

  // Where a commitment or the income row should send a person when tapped.
  // A bank-side commitment (or the income row itself, which always carries a
  // real counterpartyKey) drills straight into its Right Now detail, the same
  // way every other bank commitment already does elsewhere in the app. A
  // card-side commitment has no equivalent deep link from here (Ahead has no
  // card transaction list of its own), so it opens Right Now plainly - the
  // same "go to the relevant tab" shallow route Overview's own routing card
  // already uses, rather than inventing a new kind of cross-tab link.
  function rowDrill(item) {
    // A card-side commitment refers to a recurring MERCHANT pattern, not
    // one single transaction, so this stays a filter-level drill (the same
    // merchant-drill shape used elsewhere for card rows), never an
    // identity-level anchor. Previously this branch only switched the view,
    // with no facet reset, no Transactions sub-tab forced, and no scroll -
    // weaker than every other drill in the app. Brought up to the same
    // standard here. item.key is assumed to carry the same merchant
    // identity key commitment/merchant objects already carry everywhere
    // else in this app (income.key, g.key, m.key) - if Coming Up's own
    // event objects do not actually carry one, this falls back to the
    // minimal standard (facets reset, correct tab, scroll) rather than
    // guessing at a filter that might not resolve to anything.
    if (item.source === 'card') {
      return () => {
        trackUsage('ahead-open-activity');
        if (item.key) {
          drillToTransactions({ merchant: item.key, merchantLabel: item.label, category: 'all' });
        } else {
          switchLedgerView('activity', { anchorId: '#acct-tx' });
        }
      };
    }
    if (item.key)
      return () => {
        trackUsage('ahead-drill-payee');
        drillToAccountsPayee(item.key, cleanCounterparty(item.label));
      };
    return null;
  }

  // Round 2 (Ahead foundation): the readiness gate. Bank history alone (not
  // card history) powers the forecast, since "cash position" and "income"
  // are bank-ledger concepts everywhere else in this app too. Below the
  // configured minimum, or with no readable closing balance yet, this
  // explains plainly what is missing rather than guessing.
  function renderNotReady(readiness) {
    const { monthsSoFar, minMonths, reason, gapMonths } = readiness;
    const sec = el('section', { class: 'card empty' });
    const lines = el('div', { class: 'empty-lines' });
    if (reason === 'gap') {
      lines.append(
        chartInfo(
          el,
          'A month is missing',
          `A projection assumes one month follows the next. ${gapMonths.map((m) => monthShort(m)).join(', ')} has no bank statement, so the run is broken.`
        )
      );
    } else if (monthsSoFar === 0) {
      lines.append(
        chartInfo(el, 'Bank statement needed', 'Cash forecasts need a bank balance. Add a bank statement to begin.')
      );
    } else {
      lines.append(
        el('progress', { max: minMonths, value: monthsSoFar, 'aria-label': `${monthsSoFar} of ${minMonths} bank months` })
      );
    }
    sec.append(
      el('div', { class: 'empty-icon', html: iconCal() }),
      el('h2', {}, reason === 'gap' ? 'A statement is missing' : 'Not enough history yet'),
      lines,
      el('button', { class: 'btn primary', onclick: pickStatements }, 'Add')
    );
    return sec;
  }

  function renderNoBalance() {
    const sec = el('section', { class: 'card empty' });
    const lines = el('div', { class: 'empty-lines' });
    lines.append(
      chartInfo(el, 'Closing balance needed', 'Add a bank statement with a readable closing balance.')
    );
    sec.append(
      el('div', { class: 'empty-icon', html: iconCal() }),
      el('h2', {}, 'Nothing to project yet'),
      lines,
      el('button', { class: 'btn primary', onclick: pickStatements }, 'Add')
    );
    return sec;
  }

  function renderUpcoming(proj = null) {
    const rows = [];
    for (const d of (proj && proj.days) || []) for (const ev of d.events) rows.push({ ...ev, date: d.date });
    const commitmentIncome = provenModels.commitmentIncome();
    const beforeIncome = (commitmentIncome && commitmentIncome.commitments) || [];
    if (!rows.length && !beforeIncome.length) return null;
    const sec = el('div', {});
    if (beforeIncome.length) {
      const total = beforeIncome.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const incomeDate = commitmentIncome && commitmentIncome.income && commitmentIncome.income.date;
      sec.append(
        el(
          'p',
          { class: 'muted small' },
          `Before your next income${incomeDate ? ` on ${formatDisplayDate(incomeDate)}` : ''}: ${bankMoney(total)} across ${beforeIncome.length} payment${beforeIncome.length === 1 ? '' : 's'}.`
        )
      );
      const list = el('div', { class: 'recurring-list' });
      for (const item of beforeIncome) {
        const source = item.basis === 'card' ? 'card' : item.basis === 'recurring' ? 'bank' : '';
        const drill = rowDrill({
          source,
          key: item.basis === 'recurring' ? item.key : '',
          label: item.label || item.key || 'Payment',
        });
        const content = [
          el('span', { class: 'recurring-name' }, item.label || item.key || 'Payment'),
          el('span', { class: 'recurring-months muted small' }, formatDisplayDate(item.date)),
          el('span', { class: 'recurring-amt num' }, bankMoney(item.amount)),
        ];
        list.append(drill ? el('button', { class: 'recurring-row up-pay', onclick: drill }, ...content) : el('div', { class: 'recurring-row' }, ...content));
      }
      sec.append(list);
    }
    if (!rows.length) {
      return collapsibleCard(el, {
        title: 'Expected payments',
        icon: icon(iconRepeat()),
        summary: `${beforeIncome.length} before next income · ${prose(beforeIncome.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}`,
        body: sec,
        name: 'plan-expected-payments',
      });
    }
    const todayIso = proj.todayIso;
    const horizon = Math.max(1, proj.horizonDays || 21);
    const dayOffset = (iso) => {
      let n = 0;
      let cur = todayIso;
      while (cur < iso && n < horizon) {
        cur = addDaysIso(cur, 1);
        n++;
      }
      return n;
    };
    const awayText = (n) => {
      if (n <= 0) return 'today';
      if (n === 1) return 'tomorrow';
      if (n < 14) return `in ${n} days`;
      const weeks = Math.round(n / 7);
      return `in about ${weeks} week${weeks === 1 ? '' : 's'}`;
    };

    const byDate = new Map();
    for (const r of rows) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date).push(r);
    }
    const dates = [...byDate.keys()].sort();
    const maxAbs = rows.reduce((m, r) => Math.max(m, Math.abs(Number(r.amount) || 0)), 0) || 1;

    const timeline = el('div', { class: 'up-timeline' });
    timeline.append(
      el(
        'div',
        { class: 'up-now' },
        el('span', { class: 'up-now-dot' }),
        el('span', { class: 'up-now-label' }, 'Now')
      )
    );

    let prevOffset = 0;
    const listHost = el('div', { class: 'up-days' });
    dates.forEach((date, i) => {
      const group = byDate.get(date);
      const offset = dayOffset(date);
      const gapDays = Math.max(0, offset - prevOffset);
      prevOffset = offset;

      // Between two days, a spacer that grows in proportion to the real number
      // of days between them. When the paired tile is taller than the content,
      // the leftover height flows into these gaps - the longest waits open up
      // the most - so filling the card makes the time distances MORE legible
      // rather than stranding dead space. min-height keeps a small gap even
      // with no spare room (a long run then scrolls); the CSS max cap stops a
      // single gap ballooning when payments are sparse.
      if (i > 0) {
        listHost.append(
          el('div', {
            class: 'up-gap',
            style: `flex-grow:${Math.max(1, gapDays)};min-height:${Math.min(40, gapDays * 5)}px`,
          })
        );
      }

      const block = el('div', { class: 'up-day' });
      block.append(
        el(
          'div',
          { class: 'up-day-head' },
          el('span', { class: 'up-day-tick' }),
          el('span', { class: 'up-day-date' }, formatDisplayDate(date)),
          el('span', { class: 'up-day-away muted small' }, awayText(offset))
        )
      );
      for (const r of group) {
        const isIncome = r.type === 'income';
        // Gentler than linear: a square-root scale so one large payment
        // (e.g. a loan repayment) does not crush every smaller one into
        // near-identical slivers. The biggest still reaches full width and
        // clearly dominates, but mid and small amounts stay visibly
        // different from each other - the same "don't let one outlier set
        // the whole scale" technique the app's other charts use.
        const ratio = Math.abs(Number(r.amount) || 0) / maxAbs;
        const width = Math.max(8, Math.round(Math.sqrt(ratio) * 100));
        const colour = isIncome ? 'var(--flow-in, var(--down))' : 'var(--flow-out, var(--up))';
        const onclick = rowDrill(r);
        const kids = [
          el('span', { class: 'up-pay-name' }, r.label),
          el(
            'span',
            { class: 'up-pay-amt num ' + (isIncome ? 'credit' : 'strong') },
            // Every figure on this timeline is an EXPECTATION derived from a
            // typical amount, not a bill that has arrived, so cents here are
            // false precision: "-$9,935.82" reads as a known charge when the
            // honest claim is "about ten thousand". Short throughout, matching
            // the card's own closed summary line.
            (isIncome ? '+' : '-') + prose(Math.abs(r.amount))
          ),
          markProportional(
            el(
              'span',
              { class: 'up-pay-bar' },
              el('span', {
                class: 'up-pay-bar-fill',
                style: `width:${width}%;background:${colour}`,
              })
            )
          ),
        ];
        block.append(
          onclick
            ? el('button', { class: 'up-pay', onclick }, ...kids)
            : el('div', { class: 'up-pay' }, ...kids)
        );
      }
      listHost.append(block);
    });

    // A quiet trailing spacer absorbs any room remaining after the between-day
    // gaps have each reached their cap (the sparse-payment case), so leftover
    // height settles at the foot rather than forcing one mid-list gap to
    // stretch oddly. Every payment in the window is shown - no truncation:
    // this is a short, capped horizon a person wants to see in full, and the
    // shared scroll ceiling handles the rare very-long run.
    listHost.append(el('div', { class: 'up-gap-tail' }));

    timeline.append(listHost);
    sec.append(el('div', { class: 'pair-scroll pair-scroll-upcoming' }, timeline));

    const SOON_DAYS = 7;
    const soon = rows.filter((r) => {
      const off = dayOffset(r.date);
      return off != null && off >= 0 && off <= SOON_DAYS && Number(r.amount) < 0;
    });
    const nextOut = rows.find((r) => Number(r.amount) < 0);
    const nextOutSummary = nextOut
      ? `${prose(Math.abs(Number(nextOut.amount)))} on ${formatDisplayDate(nextOut.date)}`
      : '';
    return collapsibleCard(el, {
      title: 'Expected payments',
      icon: icon(iconRepeat()),
      summary: beforeIncome.length
        ? `${beforeIncome.length} before next income · ${prose(beforeIncome.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}`
        : soon.length
        ? `${soon.length} due within ${SOON_DAYS} days${nextOutSummary ? ` · next ${nextOutSummary}` : ''}`
        : nextOut
          ? `Next: ${nextOutSummary}`
          : `${rows.length} expected`,
      body: sec,
      name: 'plan-expected-payments',
    });
  }


  // TEMPORAL CONTRACT: the income HISTORY card (the past months' bars) moved to
  // Activity (backward content belongs in the looking-back destination). Forecast
  // keeps only the FORWARD half of income - the projected next deposit and its
  // effect on the cash runway - which is already baked into projectCashFlow (the
  // forecast chart) and the statement nudge below, so no income card is needed
  // here. Same analyseIncomePattern data, split by temporal stance.

  /* What to call the account on the SURFACE. A person thinks "my USD savings",
   * never "the file called USD Digital - Jul 2026.pdf", so the filename is not
   * a candidate here at all - it lives behind the ⓘ with the rest of the
   * provenance. The rename feature is the one source of friendly names
   * (accountName, shared-helpers); with no name set this falls back to a plain
   * descriptor built from what the app actually knows about the account - its
   * currency, when that distinguishes it from the rest, and otherwise just what
   * kind of thing it is. Never the account tail: that is provenance, it is
   * suppressed in private view, and it cannot carry a sentence. */
  function nudgeSubject(nudge) {
    if (Number(nudge.accountCount) > 1)
      return nudge.ledger === 'card' ? 'one of your credit cards' : 'one of your bank accounts';
    const friendly =
      nudge.ledger === 'card' ? null : accountName(state.accountNames, 'bank', nudge.account);
    if (friendly) {
      /* A name the person typed may already read as possessive or already carry
         its own determiner - "my USD savings", "Chev's savings". Only a bare
         name gets "your" put in front of it. */
      const owned = /^(my|your|our|the|a|an)\s/i.test(friendly) || /(’|')s\b/i.test(friendly);
      return owned ? friendly : `your ${friendly}`;
    }
    if (nudge.ledger === 'card') return 'your credit card';
    const base = ((state.cfg && state.cfg.currency) || {}).code || 'JMD';
    const ccy = bankAccountCurrency(nudge.account);
    /* KNOWN LIMIT, deliberately left: two unnamed accounts in the base currency
       read the same here ("your bank account"), and are told apart only by
       their durations and by opening the (i). The fix is a name, which the
       person already has one click away in Position - not an account tail on
       the surface, which is provenance and disappears in private view. Do not
       "fix" this by putting the digits back in the sentence. */
    return ccy && ccy !== base ? `your ${ccy} account` : 'your bank account';
  }

  /* The account's currency, read from the transactions already loaded. Used
     only to tell one unnamed account from another, so the first row that
     answers is enough. */
  function bankAccountCurrency(account) {
    const want = String(account == null ? '' : account);
    for (const row of state.bankRecords || []) {
      if (String(row.account) === want && row.currency) return String(row.currency);
    }
    return null;
  }

  function nudgeProvenance(nudge) {
    const kind = nudge.ledger === 'card' ? 'credit card statement' : 'account statement';
    const digits = String(nudge.account || '').replace(/\D/g, '');
    const tail = digits ? ` for account …${digits.slice(-4)}` : '';
    const file = nudge.sourceFile ? `“${nudge.sourceFile}”` : 'the last file added';
    return [
      el(
        'div',
        {},
        `Latest ${kind}${tail}: ${file}, covering through ${formatDisplayDate(nudge.latestEndDate)} - ${nudge.daysSinceLast} days ago.`
      ),
      el(
        'div',
        { class: 'nudge-working' },
        `This account's own statements have arrived about every ${nudge.cadenceDays} days - measured from its history, not assumed - so the next one is ${nudge.status === 'overdue' ? 'past due' : nudge.status === 'due' ? 'due about now' : 'not due yet'}.`
      ),
    ];
  }

  function renderStatementNudges(nudges) {
    const tracked = (nudges || []).filter(Boolean);
    if (!tracked.length) return null;
    const list = tracked.filter((n) => n.status !== 'ontrack');
    const current = !list.length;
    const single = list.length === 1 ? list[0] : null;
    const kind = single
      ? single.ledger === 'card'
        ? 'credit card statement'
        : 'account statement'
      : 'statements';
    const sec = el('div', {});
    for (const nudge of current ? tracked : list) {
      sec.append(
        el(
          'div',
          { class: 'attn-item' },
          el('span', { class: 'attn-dot ' + (nudge.status === 'overdue' ? 'warn' : current ? 'neutral' : 'review') }),
          el(
            'div',
            { class: 'attn-body' },
            current
              ? `${capitaliseFirst(nudgeSubject(nudge))} is up to date.`
              : `${capitaliseFirst(nudgeSubject(nudge))} hasn't been updated in ${roundedDurationPhrase(nudge.daysSinceLast)}.`,
            ' ',
            chartInfo(el, null, nudgeProvenance(nudge))
          )
        )
      );
    }
    if (!current) {
      sec.append(
        el(
          'div',
          { class: 'attn-actions' },
          el('button', { class: 'btn sm', onclick: pickStatements }, 'Add')
        )
      );
    }
    const overdue = list.filter((n) => n.status === 'overdue').length;
    const card = collapsibleCard(el, {
      title: current ? 'Your statements' : `Add your next ${kind}`,
      icon: icon(iconGap()),
      summary: current
        ? 'All up to date'
        : overdue
          ? 'Past expected date'
          : 'Expected about now',
      body: sec,
      name: 'plan-statement-nudge',
    });
    if (card) card.classList.add('attention', 'statement-nudge');
    return card;
  }

  /* ===========================================================================
   * 6.2 Where you're headed: a single stated goal, kept to GOAL_TYPES' short
   * fixed set. No goal drafted yet - a plain form; a goal already set - its
   * description, a live progress reading, and a change/clear action.
   * ======================================================================== */
  function renderGoalForm() {
    const box = el('div', { class: 'goal-form' });
    const typeList = el('div', { class: 'goal-choices' });
    // Short title + plain one-line description per choice, supplied here so
    // GOAL_TYPES stays the single measured-goal source untouched. Three
    // side-by-side choice tiles use the card's full width honestly, each a
    // scannable option (icon, title, what it means) rather than a stacked
    // full-width sentence-as-a-button.
    const goalMeta = {
      runway: {
        icon: iconGap(),
        title: EMERGENCY_FUND_LABEL,
        desc: 'Hold a few months\u2019 expenses as a safety net.',
      },
      'clear-card': {
        icon: iconChart(),
        title: 'Clear the card',
        desc: 'Pay the balance off by a date.',
      },
      'spend-ceiling': {
        icon: iconFlag(),
        title: 'Spending cap',
        desc: 'Hold monthly spending under an amount.',
      },
    };
    for (const t of GOAL_TYPES) {
      const meta = goalMeta[t.id] || { icon: iconFlag(), title: t.label, desc: '' };
      typeList.append(
        el(
          'button',
          {
            class: 'goal-choice' + (_goalDraftType === t.id ? ' current' : ''),
            type: 'button',
            'aria-pressed': _goalDraftType === t.id ? 'true' : 'false',
            onclick: () => {
              _goalDraftType = t.id;
              render();
              const field = document.getElementById('goal-draft-input');
              field?.focus({ preventScroll: true });
              field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
          },
          el('span', { class: 'goal-choice-ic' }, icon(meta.icon)),
          el('span', { class: 'goal-choice-title' }, meta.title),
          el('span', { class: 'goal-choice-desc muted small' }, meta.desc)
        )
      );
    }
    box.append(typeList);
    if (_goalDraftType) {
      const type = GOAL_TYPES.find((t) => t.id === _goalDraftType);
      let input;
      if (type.unit === 'months') {
        // Prefilled with the default rather than left blank: "how many months
        // of expenses should I hold?" is not a question most people arrive with
        // an answer to, and an empty box asks them to invent one. Five is the
        // common rule's own suggestion, offered as a starting point they can
        // change, not this app's opinion about how much they should hold.
        input = el('input', {
          type: 'number',
          class: 'name-field',
          id: 'goal-draft-input',
          placeholder: 'Number of months',
          'aria-label': 'Emergency fund months of expenses',
          min: '1',
          max: '24',
          value: String(DEFAULT_CUSHION_MONTHS),
        });
        selectOnFocus(input);
      }
      else if (type.unit === 'date') input = el('input', { type: 'date', class: 'name-field', id: 'goal-draft-input', 'aria-label': 'Target date' });
      else
        input = el('input', {
          type: 'number',
          class: 'name-field',
          id: 'goal-draft-input',
          placeholder: 'Amount',
          'aria-label': 'Monthly spending limit',
          min: '1',
          step: '0.01',
        });
      const confirm = () => {
        const raw = input.value.trim();
        if (!raw) {
          toast('Enter a value first.');
          return;
        }
        const params = {};
        if (type.unit === 'date') params.targetDate = raw;
        else {
          const value = Number(raw);
          if (!Number.isFinite(value) || value <= 0) {
            toast('Enter a value greater than zero.');
            input.focus();
            return;
          }
          if (type.unit === 'months') params.targetMonths = Math.min(24, Math.round(value));
          else params.ceiling = Math.round(value * 100) / 100;
        }
        trackUsage('ahead-set-goal');
        _goalDraftType = null;
        setGoal(type.id, params);
      };
      // A cancel alongside the commit, so tapping a goal type in the picker
      // is never a one-way door: a person can back out of a half-made
      // selection without completing it or navigating away. Clears only the
      // draft state (never touches a live goal), matching the "try it on,
      // take it off" model this whole part is built around.
      const cancelDraft = () => {
        _goalDraftType = null;
        render();
      };
      box.append(
        el(
          'div',
          { class: 'manage-actions goal-draft-step' },
          el('label', { class: 'field-label' }, el('span', {}, type.unit === 'date' ? 'Target date' : type.unit === 'months' ? 'Months of expenses' : 'Monthly limit'), input),
          el('button', { class: 'btn sm', onclick: confirm }, 'Set this goal'),
          el('button', { class: 'btn sm ghost', onclick: cancelDraft }, 'Cancel')
        )
      );
    }
    return box;
  }

  /* ===========================================================================
   * G (clear-card engine extension) completes the goal-system migration: the
   * live card's engine dispatch is now UNCONDITIONAL - every goal type
   * (cushion, spend-ceiling, clear-card) renders through renderGoalCardNewEngine.
   * The old engine (reporting.js's describeGoal/computeGoalProgress path) has
   * no remaining live-card caller in this file.
   *
   * How the last gap closed: buildGoalModel's clear-card branch previously had
   * no deadline-passed detection and no payoff-feasibility check, so its
   * wording was MISLEADING for clear-card specifically (e.g. "needs
   * $50,000/month" toward a deadline already passed; no signal of whether a
   * pace was ever actually hit). G added both (a locally-ported
   * projectCardPayoff, goals.js), proven as a true superset of the old engine
   * by g_clearcard_proof.mjs and goal_engine_parity_proof.mjs's PART 3 (now
   * asserting the gap is CLOSED, not that it exists). met stays byte-identical
   * throughout (balance <= 1), so threeStateMetForLog's monthly-log protection
   * is untouched by any of this.
   *
   * Dispatch is on the MIGRATED type, not the raw state.goal.type - GOAL_TYPES
   * still uses the old id 'runway' (reporting.js), so a goal set THIS session
   * via renderGoalForm() is still literally type:'runway' until the next
   * reload's boot-time migration runs. Checking the migrated type means a
   * freshly-set goal gets the new engine's reading immediately, not after a
   * reload.
   * ======================================================================== */
  function renderGoalCard() {
    const sec = el('div', {});
    if (!state.goal) {
      // No goal yet: this is an invitation, not a status. It rests closed - a
      // person who has not set a goal has not asked to be shown the picker
      // every time they open the tab.
      sec.append(el('p', { class: 'muted small goal-intro' }, 'Choose one goal. You can change it whenever you need to.'));
      sec.append(renderGoalForm());
      return collapsibleCard(el, {
        title: 'Your goal',
        icon: icon(iconFlag()),
        summary: 'None set yet',
        body: sec,
      });
    }

    const migrated = ensureMigrated(state.goal);
    renderGoalCardNewEngine(sec, migrated);

    const standing = goalCardStanding(migrated);
    return collapsibleCard(el, {
      title: 'Your goal',
      icon: icon(iconFlag()),
      summary: standing.summary,
      body: sec,
    });
  }

  /* One line describing where the goal stands, and whether that needs a
   * decision now. Reads the same engine the card body renders from. */
  function goalCardStanding(migrated) {
    try {
      const ctx = buildNewEngineProgressCtx(migrated, {
        month: latestCompleteGoalMonth(),
        enteredCash: provenModels.enteredCash(),
      });
      if (!ctx) return { offTrack: false, summary: 'Not enough data yet' };
      const progress = goalProgress(migrated, ctx);
      const model = buildGoalModel(migrated, progress, null, state.cfg);
      return {
        offTrack: goalOffTrack(progress, model),
        summary: model.tag || describeGoal(migrated, bankMoney, formatDisplayDate) || '',
      };
    } catch {
      return { offTrack: false, summary: '' };
    }
  }

  // The new engine's reading, for every goal type. The plain
  // lead sentence IS buildGoalModel's own detail string (proven calm and
  // equivalent to the old headline - headline_compare.mjs). The safety
  // boundary and safe-contribution guard - the new engine's genuine added
  // value - sit behind a native <details> disclosure, never as the lead,
  // matching the "number -> tag -> dropdown" content model this app is
  // built around, not a second card's worth of machinery up front.
  function renderGoalCardNewEngine(sec, migrated) {
    // Figures INSIDE this card's sentences read compactly, matching the
    // headline. Mixing "$1.09M" in the lead with "$1,090,386.30" two lines
    // below reads as two different numbers at a glance.
    const cardMoney = makeMoneyCompact(state.cfg);
    const cb = classifiedBank();
    const month = latestCompleteGoalMonth();
    const progressCtx = buildNewEngineProgressCtx(migrated, { month, enteredCash: provenModels.enteredCash() });

    if (!progressCtx) {
      // Not enough data yet to judge this goal against - the same honest
      // "nothing to show yet" every other empty state in this app already
      // uses, never a blank card or a misleading number.
      sec.append(el('p', {}, describeGoal(migrated, bankMoney, formatDisplayDate)));
      sec.append(
        el('p', { class: 'muted small' }, 'There is not yet enough data to judge this against.')
      );
    } else {
      const commitmentsMonthly = commitmentsModel().combined.total;
      const dailyOutflow = progressCtx.typicalDailyOutflow;
      const asOf = progressCtx.asOf;
      const progress = goalProgress(migrated, progressCtx);
      // Full precision, like every other figure in the app.
      //
      // This card briefly used the compact form ($158K / $1.09M). It was the
      // ONLY surface doing so, which made it read as a different product from
      // the tab it sits on - every other figure on every other tab is exact.
      // Shortening is a decision to make app-wide or not at all; it is not
      // something one card gets to opt into.
      const model = buildGoalModel(migrated, progress, null, state.cfg);
      const dot = goalOffTrack(progress, model) ? 'warn' : 'neutral';

      if (migrated.type === 'cushion' && progress.readable) {
        // The GAP is the headline, in the app's existing hero-figure shape -
        // the same weight the Overview gives its one important number. This
        // card used to state its reading as a sentence inside an attention
        // row, so a safety net far short of its target read as quietly as any
        // other line while a louder figure elsewhere on the screen took the
        // attention it deserved.
        sec.append(
          el(
            'div',
            { class: 'hero-figure' },
            el('div', { class: 'fact-value metric-value metric--major' }, model.leadText),
            el('div', { class: 'muted small' }, model.tag)
          )
        );
        // The target's provenance, and ONLY when there is still something true
        // to say. Under a year of statements the average monthly cost has not
        // met the once-a-year bills yet, so the target is low and cannot know
        // it; at twelve months or more that stops being true and the marker
        // goes. It rides the app's one info bubble - no new mark, and no
        // inline caveat text sitting permanently beside the figure.
        const caveat = progress.coverage && progress.coverage.caveat;
        sec.append(
          el(
            'p',
            { class: 'attn-body' },
            model.detail,
            caveat ? ' ' : null,
            caveat ? chartInfo(el, null, caveat) : null
          )
        );
        // Same standard the Plan's hero figure holds itself to: no figure
        // without a plain word on what it does and does not include, so a
        // partial picture is never mistaken for a complete one.
        sec.append(
          el(
            'p',
            { class: 'muted small' },
            savedFigureNote(
              { cardOwed: progressCtx.cardBalance || 0, excludedForeign: 0 },
              cardMoney
            )
          )
        );
        // A goal set when the same months meant months of INCOME. The number of
        // months they chose is untouched; what it is measured against is not,
        // and a person is told that in plain words rather than finding a target
        // that quietly moved. Shown only on a goal that predates the change.
        if (progress.rebasedFromIncome) {
          sec.append(
            el(
              'p',
              { class: 'muted small' },
              `You set this target against your income. It is now measured against what you actually spend, which is what an emergency fund has to cover, so the amount differs from the one you first saw. The ${monthsLabel(progress.targetMonths)} you chose is unchanged.`
            )
          );
        }
        if (progressCtx.cashAsOf) {
          sec.append(
            el(
              'p',
              { class: 'muted small' },
              `Progress uses the balances you entered on ${formatDisplayDate(progressCtx.cashAsOf)}. The target still comes from your statements.`
            )
          );
        }
      } else {
        sec.append(
          el(
            'div',
            { class: 'attn-item', style: 'padding:8px 0' },
            el('span', { class: 'attn-dot ' + dot }),
            el('div', { class: 'attn-body' }, model.detail)
          )
        );
      }

      const planLink = goalAgainstPlan(migrated, progress, cardMoney);
      if (planLink) sec.append(el('p', { class: 'plan-note muted small' }, planLink));

      const boundaryConfig = state._goalBoundary || null;
      const boundary = resolveSafetyBoundary(boundaryConfig, {
        typicalDailyOutflow: dailyOutflow,
        commitmentsMonthly,
      });
      // The safe-contribution guard is only meaningful for clear-card, where
      // there is a real proposed monthly payment to vet (the amount required
      // to clear the balance by the target date). For cushion/spend-ceiling,
      // there is no "contribution" concept, so this correctly stays 0 - the
      // guard then just reports the honest 90-day projected low with no
      // contribution assumed, exactly as before. Fixing this from a hardcoded
      // 0 (which made the guard trivially always "safe" for clear-card, since
      // testing "$0 a month" against a safety floor proves nothing) is the
      // one real functional gap this retirement closes, beyond the dispatch
      // change itself.
      const proposedMonthly =
        migrated.type === 'clear-card' && progress.monthlyNeeded > 0 ? progress.monthlyNeeded : 0;
      const guard = safeContribution({
        bankRecords: cb,
        cardStatements: state._cardStatements || [],
        cfg: state.cfg,
        asOf,
        proposedMonthly,
        boundary,
        goal: migrated,
        horizonDays: 90,
      });
      const guardDetail =
        guard.projectedLow != null
          ? `Projected low over the next 90 days: ${bankMoney(guard.projectedLow)}${guard.projectedLowDate ? ` around ${formatDisplayDate(guard.projectedLowDate)}` : ''}.`
          : guard.note || '';

      const disclosure = el('details', {
        class: 'disclosure explainer',
        style: 'margin-top:6px',
      });
      disclosure.append(el('summary', { class: 'muted small' }, 'Why'));
      const disclosureBody = el(
        'div',
        { class: 'muted small', style: 'margin-top:4px' },
        guardDetail
      );
      disclosure.append(disclosureBody);
      const boundaryStatus = renderBoundaryStatus(boundaryConfig);
      if (boundaryStatus) disclosure.append(boundaryStatus);
      sec.append(disclosure);

      // The safety floor is a CASH guard: it checks a projected balance low
      // point against a line the person set. That is meaningful for the two
      // goals about cash - the cushion and clearing the card - and meaningless
      // for a spending limit, which is about what goes out, not what is left.
      //
      // It used to be offered for every goal type, so a spending-limit goal
      // showed "Set a safety floor" beneath a sentence about its limit: the
      // second half of the template bleed fixed in the description string,
      // living in the ACTION row where that fix never reached.
      const floorApplies = migrated.type === 'cushion' || migrated.type === 'clear-card';
      if (floorApplies) {
        if (_boundaryDraftKind !== null) {
          sec.append(renderBoundaryForm());
        } else {
          sec.append(
            el(
              'div',
              { class: 'manage-actions', style: 'margin-top:8px' },
              el(
                'button',
                {
                  class: 'btn sm ghost',
                  onclick: () => {
                    _boundaryDraftKind = boundaryConfig ? boundaryConfig.kind : 'chosen';
                    render();
                  },
                },
                boundaryConfig && boundaryConfig.kind !== 'none'
                  ? 'Change safety floor'
                  : 'Set a safety floor'
              )
            )
          );
        }
      }
    }

    if (_goalDraftType) {
      sec.append(renderGoalForm());
    } else {
      sec.append(
        el(
          'div',
          { class: 'manage-actions', style: 'margin-top:8px' },
          // GOAL_TYPES still uses the old id 'runway' for what the new engine
          // calls 'cushion' - map back so renderGoalForm() highlights the
          // right picker button and reads the right unit.
          el(
            'button',
            {
              class: 'btn sm ghost',
              onclick: () => {
                _goalDraftType = migrated.type === 'cushion' ? 'runway' : migrated.type;
                render();
              },
            },
            'Change goal'
          ),
          el(
            'button',
            {
              class: 'btn sm danger',
              onclick: () => {
                trackUsage('ahead-clear-goal');
                // Capture the exact goal object BEFORE clearing, so undo can
                // restore it byte-for-byte (its original createdAt included -
                // see restoreGoal's own comment). Reuses the app's own
                // established toast(msg, undoFn) undo idiom (the same one
                // category-picker.js uses for "Change undone."), so clearing
                // a goal is reversible with one tap and a person knows it is
                // safe to explore - the "try it on, take it off" model,
                // enforced at the moment of clearing rather than promised in
                // words.
                // The whole cascade is captured before it is removed, so undo
                // brings back the log and the safety floor too, not just the
                // goal object.
                clearGoal().then((snapshot) => {
                  toast('Goal cleared.', () => {
                    trackUsage('ahead-restore-goal');
                    restoreGoal(snapshot);
                  });
                });
              },
            },
            'Clear goal'
          )
        )
      );
    }
  }

  // The goal and the set-aside band are the same fact seen twice: a savings
  // goal is the REASON that band is the size it is. When a target has been
  // saved, this states the connection in one plain sentence rather than
  // leaving the two cards to be read as unrelated. Silent when no target is
  // saved, so it never invents a rate the person did not choose.
  function goalAgainstPlan(goal, progress, money = bankMoney) {
    // The plan stores a SHARE of take-home, not an amount, so the monthly rate
    // is resolved against the same typical-month take-home the Plan tab reads.
    // Reading the stored number as money would state a rate of "20 a month".
    const built = planModel ? planModel() : null;
    const target = built && built.raw ? built.raw : null;
    if (!target || target.targetsAreDefault || !goal || !progress) return '';
    const rate = Number(target.targetAmount.setAside) || 0;
    if (!(rate > 0)) return '';
    const rateText = money(rate);
    if (goal.type === 'cushion' && progress.shortfall != null) {
      if (!(progress.shortfall > 0)) {
        return `Your plan sets aside ${rateText} a month, and this goal is already met.`;
      }
      // Spelled the same way the goal card and the check-in history spell it -
      // the same progress must never be described two different ways depending
      // on which line of the same screen you read.
      const months = Math.ceil(progress.shortfall / rate);
      return `Your plan sets aside ${rateText} a month. At that rate the remaining ${money(progress.shortfall)} is covered in about ${monthsLabel(months)}.`;
    }
    if (goal.type === 'clear-card' && progress.monthlyNeeded != null) {
      const needed = Number(progress.monthlyNeeded);
      if (rate >= needed) {
        return `Your plan sets aside ${rateText} a month, which covers the ${money(needed)} a month this needs.`;
      }
      return `Your plan sets aside ${rateText} a month; this needs ${money(needed)}, so it is ${money(needed - rate)} a month short.`;
    }
    // No catch-all. This sentence used to be appended to EVERY goal type, so a
    // spending-limit goal ended up reading "...of your limit this period, X
    // over. Your plan sets aside Y a month." - two goals' vocabularies in one
    // card, under a single heading, looking like one broken sentence. The plan
    // link is only meaningful where the plan's set-aside rate actually bears on
    // the goal, which is the two branches above.
    return '';
  }

  /* ===========================================================================
   * Step 2 continued: the safety-boundary authoring form. THREE explicit
   * states only, matching goals.js's frozen contract exactly - 'chosen' (a
   * number the person sets), 'calculated' (commitments + N cushion days), or
   * 'none' (cleared/default). Never invents a boundary; a suggestion from
   * resolveSafetyBoundary is informational only until saved here by hand.
   * ======================================================================== */
  function renderBoundaryStatus(boundaryConfig) {
    if (!boundaryConfig || boundaryConfig.kind === 'none') {
      return el(
        'p',
        { class: 'muted small' },
        'No safety floor is set yet. Set one so a contribution can be checked against it.'
      );
    }
    if (boundaryConfig.kind === 'chosen') {
      return el(
        'p',
        { class: 'muted small' },
        `Safety floor: keep at least ${bankMoney(boundaryConfig.value)}.`
      );
    }
    if (boundaryConfig.kind === 'calculated') {
      return el(
        'p',
        { class: 'muted small' },
        `Safety floor: your fixed expenses plus ${boundaryConfig.cushionDays} day${boundaryConfig.cushionDays === 1 ? '' : 's'} of typical spending.`
      );
    }
    return null;
  }

  function renderBoundaryForm() {
    const box = el('div', {});
    const options = [
      { kind: 'chosen', label: 'A number I choose' },
      { kind: 'calculated', label: 'My fixed expenses plus a few days of spending' },
      { kind: 'none', label: 'No safety floor (clear it)' },
    ];
    const typeList = el('div', {
      class: 'picker-list',
      style: 'margin-bottom:10px',
    });
    for (const o of options) {
      typeList.append(
        el(
          'button',
          {
            class: 'picker-item' + (_boundaryDraftKind === o.kind ? ' current' : ''),
            onclick: () => {
              _boundaryDraftKind = o.kind;
              render();
            },
          },
          o.label
        )
      );
    }
    box.append(typeList);

    if (_boundaryDraftKind === 'none') {
      box.append(
        el(
          'div',
          { class: 'manage-actions', style: 'margin-bottom:10px' },
          el(
            'button',
            {
              class: 'btn sm',
              onclick: () => {
                trackUsage('ahead-clear-boundary');
                saveBoundary(null);
                _boundaryDraftKind = null;
              },
            },
            'Clear safety floor'
          )
        )
      );
      return box;
    }
    if (_boundaryDraftKind === 'chosen' || _boundaryDraftKind === 'calculated') {
      const input = el('input', {
        type: 'number',
        class: 'name-field',
        min: '0',
        placeholder: _boundaryDraftKind === 'chosen' ? 'Amount' : 'Number of days',
      });
      const confirm = () => {
        const raw = input.value;
        if (!raw) {
          toast('Enter a value first.');
          return;
        }
        const n = Math.max(0, Math.round(Number(raw)));
        const boundaryConfig =
          _boundaryDraftKind === 'chosen'
            ? { kind: 'chosen', value: n }
            : { kind: 'calculated', cushionDays: n };
        trackUsage('ahead-set-boundary');
        _boundaryDraftKind = null;
        saveBoundary(boundaryConfig);
      };
      box.append(
        el(
          'div',
          { class: 'manage-actions', style: 'margin-bottom:10px' },
          input,
          el('button', { class: 'btn sm', onclick: confirm }, 'Save safety floor')
        )
      );
    }
    return box;
  }

  async function saveBoundary(boundaryConfig) {
    await Store.setMeta('financeGoalBoundary', boundaryConfig);
    state._goalBoundary = boundaryConfig;
    render();
  }

  // The monthly, honest follow-up: the frozen record app.js's
  // checkMonthlyGoalIfDue already builds once per genuinely new complete
  // month, simply displayed here, most recent first. Shown only once at
  // least one month has been checked, regardless of whether a goal is
  // currently active (a cleared goal's own history stays visible - see
  // clearGoal's own comment on why goalLog is never erased).
  function renderMonthlyFollowUp() {
    const log = state.goalLog || [];
    if (!log.length) return null;
    const sec = el('div', {});
    const list = el('div', { class: 'recurring-list' });
    const shown = log.slice().reverse().slice(0, 12);
    for (const entry of shown) {
      const dot = entry.met === false ? 'warn' : 'neutral';
      list.append(
        el(
          'div',
          { class: 'attn-item' },
          el('span', { class: 'attn-dot ' + dot }),
          el(
            'div',
            { class: 'attn-body' },
            el('div', { class: 'muted small' }, monthShort(entry.month)),
            el('div', {}, entry.headline)
          )
        )
      );
    }
    sec.append(list);
    return collapsibleCard(el, {
      title: 'Monthly check-in',
      icon: icon(iconGap()),
      summary: `${shown.length} month${shown.length === 1 ? '' : 's'} recorded`,
      body: sec,
      name: 'plan-monthly-check-in',
    });
  }

  /* ===========================================================================
   * The scenario tool: toggle a category or place off to test "what if I
   * stopped spending here"; add a hypothetical cost to test "what if this
   * came up". Both recompute the SAME runway figure Overview's own narrative
   * already uses (computeScenario, reporting.js), so the result here is
   * never a different idea of "how long the cushion lasts" from the rest of
   * the app. Toggleable items are the SAME categories and places already
   * shown on Right Now this period, so nothing new is introduced to scan.
   * ======================================================================== */
  // The SAME categories and places already shown on Right Now this period -
  // card categories via analysis().by_category, bank places via
  // bankCounterpartyGroups/externalOutflowShortlist (the identical shortlist
  // Right Now's own "where money went" ranking already uses) - so nothing new
  // is introduced here to scan, only a new way to test removing one.
  // Scoped deliberately to CARD SPENDING CATEGORIES only. Bank payees were
  // dropped for two reasons this tool's honesty depends on: (1) scale - a lump
  // payment to a person or an insurer sits at a wildly different order of
  // magnitude than a discretionary category, so mixing them made the list
  // incoherent (a $2.5M "item" beside a $31k one); (2) meaning - the tool tests
  // "what if I stopped spending here", which only applies to discretionary
  // spending a person actually controls, not a fixed obligation like an
  // insurance premium or a loan repayment. Categories are exactly that
  // discretionary lens, at a comparable scale, so the toggles now read as one
  // coherent set of genuine levers. This also removes the raw account-number
  // label leak ("... Limited 64") that the bank-payee labels carried here.
  function scenarioToggleItems() {
    const items = [];
    const a = analysis();
    if (a && a.by_category) {
      for (const c of a.by_category.slice(0, 8))
        items.push({ key: 'cat:' + c.name, label: c.name, amount: c.amount });
    }
    return items;
  }

  function renderScenarioCard() {
    const cb = classifiedBank();
    const cashPosition = analyseBankActivity(cb).closingBalance;
    // Without a readable cash position (no bank data at all), computeScenario
    // always returns scenarioRunwayDays: null regardless of what a person
    // toggles - the card would render a fully interactive checklist that can
    // never produce an answer, which is worse than either a working feature
    // or an absent one. Hidden entirely rather than left half-answered, the
    // same honest treatment renderNoBalance already gives the chart above it.
    if (cashPosition == null) return null;
    const { rollAllTrend } = overviewModel();
    const monthlyOutflow = typicalMonthlyOutflow(rollAllTrend, ymToday());
    const items = scenarioToggleItems();
    if (!items.length && monthlyOutflow <= 0) return null;

    // Opens closed: this is a what-if tool, and nobody arrives on the Plan tab
    // needing a scenario already running. The body is assembled into `sec` as
    // before and wrapped at the end of this function.
    const sec = el('div', {});
    sec.append(
      el(
        'p',
        { class: 'muted small' },
        'Adjust one spending category to see how long your cash could last.'
      )
    );

    // The honest income figure the surplus-aware output below reads: the
    // SAME detected recurring-income typical amount the Activity income card
    // and Position's income-stability reading already trust
    // (analyseIncomePattern is already imported and called for the forecast
    // itself). Lets this tool tell the truth for a net-positive person,
    // rather than only ever answering the "if income stopped" question.
    const income = analyseIncomePattern(cb, state.cfg, new Date());
    const monthlyIncome = income && income.typicalAmount ? Number(income.typicalAmount) : 0;

    // The result line is rebuilt IN PLACE on every control press (its own
    // host element, rewritten by recompute()), never via a full render() -
    // the same in-place pattern the Transactions search uses, so pushing a
    // lever visibly moves the number without a whole-tab flash.
    const resultHost = el('div', { style: 'margin-top:10px' });

    function setReduction(key, fraction) {
      if (fraction <= 0) _scenarioReductions.delete(key);
      else _scenarioReductions.set(key, fraction);
      trackUsage('ahead-scenario-adjust');
      recompute();
    }

    // Three mutually-exclusive presets per category: Keep (full spend, the
    // default), Cut half (0.5), Cut all (1). Choosing "Cut half"/"Cut all"
    // reads in the DIRECTION of intent - it is cutting, not un-selecting a
    // box - fixing the old inverted checked-by-default gesture, and it
    // models spending LESS (the realistic decision), not only removing a
    // category entirely.
    const list = el('div', { class: 'recurring-list chk-list' });
    for (const it of items) {
      const current = _scenarioReductions.get(it.key) || 0;
      // One grouped segmented control (.seg / .seg-btn) rather than three
      // loose pills - so "these three are ONE choice" reads at a glance, in
      // the app's grouped-segmented language, compact enough to sit inline.
      //
      // Selection state is updated LIVE, in place, on press - the same
      // flash-free discipline recompute() uses for the result line. The old
      // code decided .active/aria-pressed ONCE at build time from
      // _scenarioReductions, and since setReduction only rewrites resultHost
      // (never re-renders the row), the highlight froze at its initial value
      // while the underlying state moved on: every row read "Keep" even as
      // the result correctly showed a reduction applied. This holds the
      // row's three buttons, and on any press clears .active/aria-pressed
      // from all three (mutual exclusivity - Keep OR Cut half OR Cut all)
      // then sets it on the pressed one, so the visible highlight AND the
      // accessible state both track the real selection without a re-render.
      const segButtons = [];
      const setActiveSegment = (chosenFraction) => {
        for (const b of segButtons) {
          const isActive = Number(b.dataset.fraction) === chosenFraction;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
      };
      const seg = (label, fraction) => {
        const b = el(
          'button',
          {
            class: 'seg-btn' + (current === fraction ? ' active' : ''),
            'aria-pressed': current === fraction ? 'true' : 'false',
            dataset: { fraction: String(fraction) },
            onclick: () => {
              setReduction(it.key, fraction);
              setActiveSegment(fraction);
            },
          },
          label
        );
        segButtons.push(b);
        return b;
      };
      list.append(
        el(
          'div',
          { class: 'recurring-row scenario-row' },
          el('span', { class: 'recurring-name' }, it.label),
          el('span', { class: 'recurring-amt num' }, bankMoney(it.amount)),
          el('span', { class: 'seg' }, seg('Keep', 0), seg('Cut half', 0.5), seg('Cut all', 1))
        )
      );
    }
    // Chunked. Eight categories with three presets each is twenty-four
    // controls asking for attention at once, before a person has decided what
    // they are even testing. The three biggest levers - the only ones that
    // move the answer much - are shown; the rest are one press away.
    const PRIMARY = 3;
    const primaryList = el('div', { class: 'recurring-list chk-list' });
    const restList = el('div', { class: 'recurring-list chk-list' });
    [...list.children].forEach((row, i) => (i < PRIMARY ? primaryList : restList).append(row));
    sec.append(el('div', { class: 'pair-scroll pair-scroll-recurring' }, primaryList));
    if (restList.children.length) {
      const more = el('details', { class: 'disclosure explainer scenario-more' });
      more.append(
        el(
          'summary',
          { class: 'muted small' },
          `${restList.children.length} more ${restList.children.length === 1 ? 'category' : 'categories'}`
        )
      );
      more.append(el('div', { class: 'pair-scroll pair-scroll-recurring' }, restList));
      sec.append(more);
    }

    const costInput = el('input', {
      type: 'number',
      class: 'name-field',
      placeholder: 'Amount',
      // Named, not just hinted: the placeholder vanishes the moment a figure is
      // typed, taking the only description of the field with it.
      'aria-label': 'Extra one-off cost to try',
      min: '0',
      step: '0.01',
      value: _scenarioExtraCost || '',
    });
    selectOnFocus(costInput);
    // A second, unrelated question ("what if something new came up?"). Folded
    // away so the card asks one thing at a time.
    const costBlock = el('details', { class: 'disclosure explainer scenario-cost' });
    costBlock.append(el('summary', { class: 'muted small' }, 'Add a cost you have not paid yet'));
    costBlock.append(
      el(
        'div',
        { class: 'manage-actions', style: 'margin-top:8px;align-items:center' },
        costInput,
        el(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => {
              const raw = costInput.value.trim();
              const value = raw ? Number(raw) : 0;
              if (!Number.isFinite(value) || value < 0) {
                toast('Enter a cost of zero or more.');
                costInput.focus();
                return;
              }
              _scenarioExtraCost = Math.round(value * 100) / 100;
              recompute();
            },
          },
          'Apply'
        )
      )
    );
    sec.append(costBlock);

    // Rewrites ONLY resultHost, in place, so every preset press / cost apply
    // updates the number live without re-rendering the whole tab.
    function recompute() {
      resultHost.textContent = '';
      const result = computeScenario({
        cashPosition,
        monthlyOutflow,
        toggleableItems: items,
        reductions: _scenarioReductions,
        extraCost: _scenarioExtraCost,
      });
      if (result.scenarioRunwayDays == null) {
        resultHost.append(
          el(
            'p',
            { class: 'muted small' },
            'Not enough information to project this scenario.'
          )
        );
        return;
      }
      const changed = result.scenarioRunwayDays !== result.baselineRunwayDays;
      const direction = result.scenarioRunwayDays > result.baselineRunwayDays ? 'up' : 'down';
      // The number always answered "if your income stopped, how long would
      // your cash last" (runwayDays' own documented meaning) - naming that
      // assumption is what makes it honest, especially for a surplus person
      // for whom an unlabelled "days left" reads as odd.
      resultHost.append(
        el(
          'p',
          { class: 'strong' },
          changed
            ? `If your income stopped, your cash would last about ${result.scenarioRunwayDays} days - ${direction} from about ${result.baselineRunwayDays} today.`
            : `If your income stopped, your cash would last about ${result.scenarioRunwayDays} days.`
        )
      );
      // Surplus-aware second sentence: when income covers outflow, cutting a
      // category does not extend a runway that is not depleting - it grows
      // the monthly surplus. This is the TRUE story for a net-positive
      // person, added alongside (not replacing) the income-stopped runway.
      if (monthlyIncome > 0 && monthlyIncome >= monthlyOutflow && result.monthlySaved > 0) {
        resultHost.append(
          el(
            'p',
            { class: 'muted small', style: 'margin-top:4px' },
            `Since your income already covers your spending, cutting this adds about ${bankMoney(result.monthlySaved)} to what you keep each month.`
          )
        );
      }
    }

    sec.append(resultHost);
    recompute();
    return collapsibleCard(el, {
      title: 'Try a change',
      icon: icon(iconChart()),
      summary: 'See how long your cash could last',
      body: sec,
    });
  }

  function renderAhead() {
    const wrap = el('div', { class: 'accounts-wrap accounts-grid view-forecast' });
    const cfg = Object.assign({ minMonthsForForecast: 2, horizonDays: 21 }, state.cfg.ahead || {});
    const months = bankMonthsList();
    let goalPlaced = false;
    const scenario = renderScenarioCard();
    const nudges = staleStatementNudges(
      state._cardStatements || [],
      state._bankStatements || [],
      { toleranceDays: cfg.statementToleranceDays, includeOnTrack: true },
      new Date()
    );
    const nudgeCard = renderStatementNudges(nudges);
    const planHero = renderPlanHero();
    const planLever = planHero ? renderPlanLever() : null;
    let followUp = renderMonthlyFollowUp();
    const expectedWithoutForecast = renderUpcoming();
    if (planHero) {
      const basis = balanceUpdates.historyBasisNote();
      if (basis) planHero.append(basis);
      wrap.append(planHero);
    }
    if (nudgeCard) wrap.append(nudgeCard);
    if (planLever) wrap.append(planLever);
    const readiness = projectionReadiness({
      bankMonths: months,
      minMonths: cfg.minMonthsForForecast,
      coverage: state.coverage,
    });
    if (!readiness.ready) {
      wrap.append(renderNotReady(readiness));
      if (expectedWithoutForecast) wrap.append(expectedWithoutForecast);
      if (scenario) wrap.append(scenario);
    } else {
      const cb = classifiedBank();
      const cashPosition = analyseBankActivity(cb).closingBalance;
      if (cashPosition == null) {
        wrap.append(renderNoBalance());
        if (expectedWithoutForecast) wrap.append(expectedWithoutForecast);
        if (scenario) wrap.append(scenario);
      } else {
        const income = analyseIncomePattern(cb, state.cfg, new Date());
        const combined = commitmentsModel().combined;
        const proj = projectCashFlow({
          cashPosition,
          commitments: combined.items,
          income,
          horizonDays: cfg.horizonDays,
          now: new Date(),
        });
        const goalCardTop = renderGoalCard();
        pairCards(wrap, goalCardTop, followUp);
        followUp = null;
        goalPlaced = true;
        const upcoming = renderUpcoming(proj);
        pairCards(wrap, upcoming, scenario);
      }
    }

    if (!goalPlaced) {
      const goalCard = renderGoalCard();
      pairCards(wrap, goalCard, followUp);
      followUp = null;
    }
    if (followUp) wrap.append(followUp);
    placeFoldAll(el, wrap);
    return wrap;
  }

  // Session-only UI toggles that affect what renderAhead() produces but are
  // NOT part of state (goal-draft type, safety-boundary-draft kind). app.js's
  // mountView cache signature for 'ahead' is otherwise just today's date, so
  // without this a click that opens/changes a draft form calls render() but
  // silently reuses the STALE cached DOM - the form state changes in memory
  // but nothing rebuilds to show it. Exposed as a plain string so app.js can
  // fold it into that cache signature without reaching into this module's
  // private module-scope variables directly.
  function draftSignature() {
    const reductionSig = [..._scenarioReductions.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${_goalDraftType || ''}|${_boundaryDraftKind || ''}|${reductionSig}|${_scenarioExtraCost || 0}`;
  }

  return { renderAhead, draftSignature };
}
