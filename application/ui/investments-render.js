import { accountName, requireCtx, formatDisplayDate, figuresHidden, smoothScrollToEl, joinWithAnd, MONTHS_SHORT } from '../core/shared-helpers.js';
import { makeProseMoney, currencyPrefix } from '../core/money-format.js';
import { chartInfo } from './decision-header.js';
import { collapsibleCardReact, chartInfoReact, investmentAccountControlReact, investmentCardReact, investmentHistoryReact, investmentHoldingsReact, investmentMovementReact } from './react-bridge.js';
import { renderColumnChart, renderProportionBar } from './chart-surface.js';
import { chartIsHidden, monthTickOf, proportionShares } from './chart-helpers.js';
import { investmentIncomeSection, investmentIncomeSince } from '../analysis/income-model.js';
import {
  INVESTMENT_PROVIDER_LABELS,
  investmentAccountKey,
  investmentSnapshot,
  investmentValueSeries,
  growthExcludingContributions,
  growthRunSentence,
  latestValueMovement,
  movementTone,
  supersededInvestmentStatements,
} from '../analysis/investments.js';

const NAME_TAIL = /\s+(?:ORDINARY\s+SHARES|ORDINARY|SHARES)$/i;
const GROUPS = [
  { kind: 'fund', label: 'Funds' },
  { kind: 'equity', label: 'Equities' },
  { kind: 'cash', label: 'Cash' },
];
const STATED_INCOME_WORDS = {
  line: (amounts) => `${amounts} in fund distributions, last 12 months`,
  cash: 'Distributions your fund statements say were paid inside the fund. They are not money that reached your bank account.',
  counted: 'They are not counted in your take-home, pay day or forecast.',
  gross: 'Amounts are the gross figures printed on the statements, before any tax withheld.',
  unstated: (count) => `${count} ${count === 1 ? 'distribution' : 'distributions'} did not state a currency and ${count === 1 ? 'is' : 'are'} left out of this amount.`,
};
const BREAK_REASON = {
  gap: 'a month is missing between the statements',
  contribution: "money added in one of the months couldn't be read",
  rate: "an exchange rate on one of the statements couldn't be read",
};

export function statedIncomeModel(totals, { base, prose, bankMoney }) {
  const known = totals.filter((total) => total.currency !== 'unstated');
  if (!known.length) return null;
  const unstated = totals.filter((total) => total.currency === 'unstated').reduce((sum, total) => sum + total.count, 0);
  return {
    text: STATED_INCOME_WORDS.line(joinWithAnd(known.map((total) => total.currency === base ? prose(total.amount) : bankMoney(total.amount, total.currency)))),
    explain: [
      STATED_INCOME_WORDS.cash,
      STATED_INCOME_WORDS.counted,
      STATED_INCOME_WORDS.gross,
      ...(unstated ? [STATED_INCOME_WORDS.unstated(unstated)] : []),
    ],
  };
}

export function holdingDisplayName(description) {
  const clean = String(description == null ? '' : description)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(NAME_TAIL, '');
  if (/[a-z]/.test(clean)) return clean;
  return clean.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase());
}

export function createInvestmentsRenderer(ctx) {
  requireCtx(
    ctx,
    ['state', 'el', 'icon', 'iconChart', 'bankMoney', 'monthLabel', 'monthShort', 'render', 'trackUsage'],
    'createInvestmentsRenderer'
  );
  const { state, el, icon, iconChart, bankMoney, monthLabel, monthShort, render, trackUsage } = ctx;
  const baseCurrency = () => ((state.cfg && state.cfg.currency) || {}).code || 'JMD';
  const note = (...parts) => el('p', { class: 'inv-note muted small' }, ...parts);
  // The snapshot currently being drawn, so a note nested inside one holding's
  // detail can name an account without every layer passing it down.
  const monthOf = (iso) => monthShort(String(iso || '').slice(0, 7));
  const percent = (value, digits = 1) =>
    figuresHidden() ? '••%' : `${Math.abs(Number(value) || 0).toFixed(digits)}%`;
  const currencyWord = (ccy) => (ccy === baseCurrency() ? ccy : currencyPrefix(ccy, state.cfg).trim());

  function signal(h) {
    if (h.role === 'cash') return { text: 'Cash', className: 'inv-role' };
    if (h.role === 'stable') return { text: 'Holds steady', className: 'inv-role' };
    if (h.role === 'new') return { text: 'New this month', className: 'inv-role is-new' };
    if (!h.costConfirmed || h.costReturn == null) return { text: 'Cost unconfirmed', className: 'inv-role' };
    const pct = h.costReturn * 100;
    const level = Math.abs(pct) < 0.05;
    const words = level
      ? 'Level with what it cost'
      : `${pct > 0 ? 'Up' : 'Down'} ${percent(pct)} on what it cost`;
    return { label: words, level, tone: movementTone(h.costReturn), positive: pct > 0, display: level ? 'Level' : percent(pct) };
  }

  function moveText(h) {
    const move = h.move || {};
    if (h.role === 'cash') return 'Cash waiting to be invested. It counts in the total, not in performance.';
    if (move.state === 'new') return 'Started this month, so there is no month-on-month move yet.';
    if (move.state === 'bought')
      return "This month's change includes money you put in, so it isn't shown as a market move.";
    if (move.state === 'sold')
      return "Some of this was sold this month, so its change isn't shown as a market move.";
    if (move.state === 'uncertain')
      return "This month's change may include money you put in, so it isn't shown as a market move.";
    if (move.pct == null) return '';
    if (move.pct === 0) return 'No change since last month.';
    return `${move.pct > 0 ? 'Up' : 'Down'} ${percent(move.pct, 2)} since last month.`;
  }

  function holdingRow(h, account, snap) {
    const notes = [];
    const figureText = h.costPerUnit != null && h.price != null
      ? `Cost ${bankMoney(h.costPerUnit, h.currency)} ${h.kind === 'equity' ? 'a share' : 'a unit'} · now ${bankMoney(h.price, h.currency)}`
      : '';
    const move = moveText(h);
    if (move) notes.push(move);
    if (h.role === 'new' && h.costReturn != null && h.costConfirmed) notes.push(`So far ${h.costReturn >= 0 ? 'up' : 'down'} ${percent(h.costReturn * 100)} on what it cost.`);
    if (h.role === 'stable') notes.push('Built to hold its value, so it carries no up or down signal.');
    if (h.role === 'performing' && !h.costConfirmed) notes.push("Its cost figure didn't line up with the statement, so no up or down signal is shown.");
    const foreign = h.currency && h.currency !== baseCurrency();
    if (foreign && !h.rate) notes.push(`Held in ${h.currency}. This statement's exchange rate couldn't be read.`);
    const about = [];
    if (h.performanceProvenance === 'statement') {
      about.push('The gain or loss is stated on the investment statement.');
    } else if (h.performanceProvenance === 'derived') {
      about.push('The app derives the gain or loss from the statement’s current value and purchase cost.');
    } else if (h.performanceProvenance === 'mixed') {
      about.push('This combined result mixes statement-stated and app-derived gain or loss, using cost in both cases.');
    }
    if (foreign && h.rate) {
      about.push(`Held in ${h.currency}. The statement values it at ${h.rate} ${baseCurrency()} per ${currencyWord(h.currency)} on ${formatDisplayDate(account.periodEnd)}.`);
    }
    const accountKeys = [...new Set(h.accounts || [])];
    return {
      name: holdingDisplayName(h.description),
      value: bankMoney(h.value, h.currency),
      signal: signal(h),
      figureText,
      notes,
      mergedAccountCount: h.merged ? (h.accounts || []).length : 0,
      mergedAccounts: accountKeys.map((key) => ({
        key,
        label: (snap.availableAccounts || []).find((item) => item.accountKey === key)?.label || 'that account',
      })),
      onSelectAccount: selectAccount,
      about,
    };
  }

  /* THE way an account gets selected, wherever the naming happens.
   *
   * Two sentences on this card named the control and asked the person to
   * operate it - "switch account to see each real cost separately", "the
   * combined result can hide an account that is falling; switch account to
   * see it clearly". The app knows which account, and it owns the control.
   * It does it. */
  function selectAccount(key) {
    if (!key || state.investmentAccount === key) return;
    state.investmentAccount = key;
    trackUsage('investments-select-account');
    render({ preserveScroll: false });
    smoothScrollToEl('#position-investments-card');
  }

  function accountLink(snap, key, label) {
    const name =
      label ||
      (snap.availableAccounts || []).find((item) => item.accountKey === key)?.label ||
      'that account';
    return el(
      'button',
      {
        type: 'button',
        class: 'linkbtn inv-account-link',
        title: `Show ${name} on its own`,
        onclick: () => selectAccount(key),
      },
      name
    );
  }

  /* The accounts a combined holding is combined FROM, each one the way to see
   * it on its own. It read "Combined across 2 accounts. Switch account to see
   * each real cost separately." - a count, and an instruction to go and
   * operate a control the app owns. */
  function accountControl(snap) {
    const accounts = snap.availableAccounts || [];
    if (accounts.length < 2) return null;
    const current = snap.selectedAccountKey;
    const allLabel = accounts.length === 2 ? 'Both' : 'All';
    const useSegments = accounts.length <= 4;
    return {
      accounts,
      current,
      allLabel,
      useSegments,
      onSelect: (value, anchorId) => {
        if (current === value) return;
        const anchor = document.getElementById(anchorId);
        const anchorTop = anchor ? anchor.getBoundingClientRect().top : null;
        state.investmentAccount = value;
        render();
        const next = document.getElementById(anchorId);
        if (!next) return;
        if (anchorTop != null) window.scrollBy(0, next.getBoundingClientRect().top - anchorTop);
        next.focus({ preventScroll: true });
      },
    };
  }

  const accountLabelOf = (snap, row) =>
    snap.availableAccounts.find((item) => item.accountKey === row.accountKey)?.label || row.providerLabel;

  /* WHAT YOU PUT IN IS PART OF WHAT MOVED THE VALUE.
   *
   * "Scotia: you added $400,000.00 in August 2026." stood as its own bold
   * line above the asset mix, restating the tail of the reading four lines
   * above it ("since July 2026, including $400k you added") one account at a
   * time. It is the per-account working behind that reading, and the working
   * behind that reading already has a home: the Explain beside "What moved
   * the value", which is where growth-excluding-contributions is spelled out
   * account by account. */
  function addedLines(snap) {
    const lines = [];
    const prose = makeProseMoney(state.cfg);
    for (const account of snap.accounts) {
      const month = monthOf(account.periodEnd);
      const who = accountLabelOf(snap, account);
      if (!account.contribution.known) {
        lines.push(`${who}: money added in ${month} is unknown.`);
      } else if (account.contribution.amount > 0) {
        lines.push(`${who}: you added ${prose(account.contribution.amount)} in ${month}.`);
      }
    }
    return lines;
  }

  function performanceRead(snap) {
    if (snap.performance.pct == null) return note('Cost-based performance is not available from these statements yet.');
    const pct = snap.performance.pct * 100;
    const level = Math.abs(pct) < 0.05;
    const words = level ? 'Level with what it cost' : `${pct > 0 ? 'Up' : 'Down'} ${percent(pct)} on what it cost`;
    const line = el(
      'div',
      { class: 'inv-performance' },
      el(
        'span',
        { class: `inv-signal ${level ? 'is-level' : `tone-${movementTone(snap.performance.pct)}`}`, role: 'img', 'aria-label': words },
        el('span', { class: 'inv-arrow', 'aria-hidden': 'true' }, level ? '◆' : pct > 0 ? '▲' : '▼'),
        el('span', { class: 'num', 'aria-hidden': 'true' }, level ? 'Level' : percent(pct))
      ),
      el('span', { class: 'muted small' }, 'on what it cost')
    );
    const falling = snap.performance.mixedAccounts ? snap.performance.falling || [] : [];
    let caveat = null;
    if (falling.length) {
      // Names the account and opens it, instead of describing a control.
      const links = [];
      falling.forEach((key, index) => {
        if (index) links.push(index === falling.length - 1 ? ' and ' : ', ');
        links.push(accountLink(snap, key));
      });
      caveat = note(
        'This combines accounts that are not all up: ',
        ...links,
        falling.length === 1 ? ' is down.' : ' are down.'
      );
    } else if (snap.performance.mixedHoldings) {
      caveat = note(
        'Not all holdings are up. The combined result can hide a holding that is falling; open the detail to see it.'
      );
    }
    if (caveat) line.append(chartInfoReact(el, '', caveat));
    return line;
  }

  function movementRead(move, prose) {
    const level = Math.abs(move.change) < 1;
    const since = `since ${monthShort(move.from)}`;
    const words = level
      ? `No change ${since}`
      : `${move.change > 0 ? 'Up' : 'Down'} ${prose(Math.abs(move.change))} ${since}`;
    return el(
      'div',
      { class: 'inv-performance' },
      el(
        'span',
        { class: `inv-signal ${level ? 'is-level' : `tone-${move.tone}`}`, role: 'img', 'aria-label': words },
        el('span', { class: 'inv-arrow', 'aria-hidden': 'true' }, level ? '◆' : move.change > 0 ? '▲' : '▼'),
        el('span', { class: 'num', 'aria-hidden': 'true' }, level ? 'Level' : prose(Math.abs(move.change)))
      ),
      el('span', { class: 'muted small' }, move.added > 0 ? `${since}, including ${prose(move.added)} you added` : since)
    );
  }

  function historyDetail(statements, snap, base) {
    const rows = investmentValueSeries(statements, {
      baseCurrency: base,
      accountKey: snap.selectedAccountKey,
    });
    const present = rows.filter((row) => row.present);
    if (present.length < 2) {
      const props = { emptyText: 'There is not enough continuous statement history for a trend line yet.' };
      return typeof window !== 'undefined' ? props : investmentHistoryReact(el, props);
    }

    const tick = monthTickOf(MONTHS_SHORT, rows);
    const accountOf = (key) => snap.availableAccounts.find((account) => account.accountKey === key);

    let coverageNote = null;
    if (rows.some((row) => row.partialAccounts)) {
      const firstComplete = rows.find((row) => row.present && !row.partialAccounts);
      const early = rows.filter(
        (row) => row.present && row.partialAccounts && (!firstComplete || row.month < firstComplete.month)
      );
      const earlyKeys = [...new Set(early.flatMap((row) => row.accounts))];
      const earlyAccounts = earlyKeys.map((key) => accountOf(key)?.label).filter(Boolean);
      const providers = [...new Set(earlyKeys.map((key) => accountOf(key)?.provider).filter(Boolean))];
      const wholeProvider =
        providers.length === 1 &&
        snap.availableAccounts
          .filter((account) => account.provider === providers[0])
          .every((account) => earlyKeys.includes(account.accountKey));
      const who = wholeProvider
        ? INVESTMENT_PROVIDER_LABELS[providers[0]] || earlyAccounts.join(' and ')
        : earlyAccounts.join(' and ');
      const spanned = early.length && firstComplete;
      const text = spanned
        ? `${tick(early[0].month)} - ${tick(early[early.length - 1].month)}: ${who} only`
        : 'Some points cover one account only';
      const info = spanned
        ? `${monthShort(early[0].month)} to ${monthShort(early[early.length - 1].month)} reflects ${earlyAccounts.join(' and ')} only. From ${monthShort(firstComplete.month)}, the line includes all accounts.`
        : 'Points marked as one account reflect only the account that existed or had a statement in that month.';
      coverageNote = typeof window !== 'undefined'
        ? { text, info }
        : el('span', { class: 'chart-legend-note' }, text, chartInfoReact(el, '', info));
    }
    const drawn = rows.map((row) => Number(row.total)).filter((v) => Number.isFinite(v) && v > 0);
    const lowest = drawn.length ? Math.min(...drawn) : 0;
    const highest = drawn.length ? Math.max(...drawn) : 0;
    const headroom = Math.max((highest - lowest) * 0.12, highest * 0.04, 1);
    const chartCtx = { money0: (n) => bankMoney(n), monthLabel, monthShort: monthTickOf(MONTHS_SHORT, rows) };
    const spec = {
      label: 'Investment value at each statement',
      ...(drawn.length > 1
        ? { min: Math.max(0, lowest - headroom), max: highest + headroom }
        : {}),
      rows: rows.map((row) => ({
        month: row.month,
        total: row.total,
        present: row.present,
        marker:
          row.present && row.contributionKnown && row.contribution > 0
            ? `You added ${bankMoney(row.contribution)}`
            : '',
        detail: row.partialAccounts
          ? `This point reflects ${row.accounts
              .map((key) => snap.availableAccounts.find((account) => account.accountKey === key)?.label)
              .filter(Boolean)
              .join(' and ')} only`
          : row.missingAccounts.length && snap.selectedAccountKey === 'all'
            ? `No statement from ${row.missingAccounts
                .map((key) => snap.availableAccounts.find((account) => account.accountKey === key)?.label)
                .filter(Boolean)
                .join(' or ')} this month, so no combined value is drawn`
          : row.present && !row.contributionKnown
            ? 'Money added that month is unknown'
            : '',
      })),
      series: [{ key: 'total', label: snap.selectedAccountKey === 'all' ? 'Combined value' : 'Account value', tone: 'in' }],
      mode: 'line',
      markerLabel: 'Money added',
      missingText: 'No statement for this month',
      missingLegend: '- No statement',
      legendNote: coverageNote,
    };
    if (typeof window !== 'undefined') return { chartModel: chartIsHidden() ? { hidden: true, label: spec.label } : { ctx: chartCtx, spec } };
    const chart = renderColumnChart({ el, ...chartCtx }, spec);
    return investmentHistoryReact(el, { chart });
  }

  function movementSummary(statements, snap, base, prose, movement) {
    const runs = growthExcludingContributions(statements, {
      baseCurrency: base,
      accountKey: snap.selectedAccountKey,
    });
    const accountOf = (key) => snap.availableAccounts.find((account) => account.accountKey === key);
    const workingText = [];
    for (const run of runs) {
      const account = accountOf(run.accountKey);
      const name = account ? account.label : `Account …${String(run.account).slice(-4)}`;
      const who = runs.length > 1 ? `${name}: ` : '';
      if (!run.months) {
        workingText.push(`${who}Growth can't be separated from money added yet, because ${BREAK_REASON[run.brokenBy] || 'there is only one statement'}.`);
      } else {
        workingText.push(growthRunSentence(run, { who, money: prose, monthOf }));
        if (run.brokenBy) workingText.push(`${who}Earlier statements aren't included because ${BREAK_REASON[run.brokenBy]}.`);
      }
    }
    workingText.push(...addedLines(snap));
    /* TWO READINGS OF THE SAME MOVEMENT, READ TOGETHER.
     *
     * "Up $411k since July 2026" sat above the chart and "Down 1.3% on what
     * it cost" sat below it, so the one fact they make together - the value
     * rose because money went in, while what is held is worth slightly less
     * than it cost - was never on screen as one thought. They are the same
     * measure over two windows: last month, and since purchase. One row. */
    if (typeof window !== 'undefined') {
      const movementModel = movement ? (() => {
        const level = Math.abs(movement.change) < 1;
        const since = `since ${monthShort(movement.from)}`;
        return {
          level,
          tone: movement.tone,
          positive: movement.change > 0,
          words: level ? `No change ${since}` : `${movement.change > 0 ? 'Up' : 'Down'} ${prose(Math.abs(movement.change))} ${since}`,
          amount: prose(Math.abs(movement.change)),
          caption: movement.added > 0 ? `${since}, including ${prose(movement.added)} you added` : since,
        };
      })() : null;
      const pct = snap.performance.pct == null ? null : snap.performance.pct * 100;
      const performanceModel = pct == null ? { available: false, explain: [] } : (() => {
        const level = Math.abs(pct) < 0.05;
        const falling = snap.performance.mixedAccounts ? snap.performance.falling || [] : [];
        return {
          available: true,
          level,
          tone: movementTone(snap.performance.pct),
          positive: pct > 0,
          words: level ? 'Level with what it cost' : `${pct > 0 ? 'Up' : 'Down'} ${percent(pct)} on what it cost`,
          amount: percent(pct),
          explain: falling.map((key) => ({
            key,
            name: (snap.availableAccounts || []).find((item) => item.accountKey === key)?.label || 'that account',
          })),
          mixedHoldings: snap.performance.mixedHoldings,
          onSelectAccount: selectAccount,
        };
      })();
      return { explain: workingText, movement: movementModel, performance: performanceModel };
    }
    const working = workingText.map((line) => note(line));
    const signals = el('div', { class: 'inv-signals' });
    if (movement) signals.append(movementRead(movement, prose));
    signals.append(performanceRead(snap));
    return investmentMovementReact(el, {
      explain: working.length ? chartInfo(el, 'Explain', working) : null,
      signals,
    });
  }

  function holdingsDetail(snap, prose) {
    const labelOf = (row) => accountLabelOf(snap, row);
    const account = snap.accounts[0] || {};
    const groups = GROUPS.map((group) => {
      const holdings = snap.holdings.filter((holding) => holding.kind === group.kind);
      return {
        ...group,
        holdings,
        total: holdings.reduce((sum, holding) => sum + Number(holding.valueBase ?? holding.value), 0),
      };
    }).filter((group) => group.holdings.length);
    const bands = groups
      .filter((group) => group.total > 0)
      .map((group) => ({ key: group.kind, label: group.label, amount: group.total }));
    const { shareOf } = proportionShares(bands);
    let mixNode = null;
    if (bands.length > 1) {
      const mix = renderProportionBar(
        { el },
        {
          label: 'How the investments split by asset class',
          money: (n) => bankMoney(n),
          bands,
        }
      );
      if (mix) mixNode = mix;
    }
    const groupRows = groups.map((group) => {
      const band = bands.length > 1 && bands.find((item) => item.key === group.kind);
      return {
        ...group,
        remember: `investment-group-${group.kind}`,
        summary: band ? `${bankMoney(group.total)} · ${percent(shareOf(band), 0)}` : bankMoney(group.total),
        holdings: group.holdings.map((holding) => holdingRow(holding, account, snap)),
      };
    });
    const notes = [];
    for (const accountRow of snap.accounts) {
      if (accountRow.disappeared.length) {
        notes.push(`${labelOf(accountRow)}: no longer listed in ${monthOf(accountRow.periodEnd)}, most likely sold: ${accountRow.disappeared.map((item) => holdingDisplayName(item.description)).join(', ')}.`);
      }
      const integrity = accountRow.integrity;
      if (integrity.fxMissing) {
        notes.push(`${labelOf(accountRow)}: the exchange rate couldn't be read, so the holdings couldn't be checked against the printed total.`);
      } else if (integrity.crossCheckGap != null && !integrity.crossCheckOk) {
        notes.push(`${labelOf(accountRow)}: the holdings come to ${prose(Math.abs(integrity.crossCheckGap))} ${integrity.crossCheckGap > 0 ? 'more' : 'less'} than the printed portfolio total. The total shown is the statement's own.`);
      }
      if (integrity.unreadRows) {
        notes.push(`${labelOf(accountRow)}: ${integrity.unreadRows} holding line${integrity.unreadRows === 1 ? '' : 's'} couldn't be read.`);
      }
    }
    for (const statement of supersededInvestmentStatements(state._investmentStatements || [])) {
      const key = investmentAccountKey(statement);
      if (snap.selectedAccountKey !== 'all' && key !== snap.selectedAccountKey) continue;
      const label = snap.availableAccounts.find((item) => item.accountKey === key)?.label || 'An account';
      notes.push(`${label}: ${statement.source_file} is dated ${formatDisplayDate(statement.periodEnd)}, in the same month as a later statement, so only the later one is counted.`);
    }
    const props = { groups: groupRows, mix: mixNode || null, notes };
    return typeof window !== 'undefined' ? props : investmentHoldingsReact(el, props);
  }

  function asOfText(snap) {
    if (!snap.asOfMixed) return `as of ${formatDisplayDate(snap.asOf)}`;
    const byDate = new Map();
    for (const account of snap.accounts) {
      const label =
        snap.availableAccounts.find((item) => item.accountKey === account.accountKey)?.label || account.providerLabel;
      byDate.set(account.periodEnd, [...(byDate.get(account.periodEnd) || []), label]);
    }
    const [lead, ...rest] = [...byDate.entries()].sort(
      (a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0]))
    );
    return [
      `as of ${formatDisplayDate(lead[0])}`,
      ...rest.map(([date, labels]) => `${labels.join(', ')} as of ${formatDisplayDate(date)}`),
    ].join(' · ');
  }

  function renderInvestments(asProps = false) {
    const statements = state._investmentStatements || [];
    if (!statements.length) return [];
    const base = baseCurrency();
    const prose = makeProseMoney(state.cfg);
    const available = investmentSnapshot(statements, { baseCurrency: base });
    if (!available.availableAccounts.some((account) => account.accountKey === state.investmentAccount)) {
      state.investmentAccount = 'all';
    }
    const snap = investmentSnapshot(statements, {
      baseCurrency: base,
      accountKey: state.investmentAccount,
    });
    snap.availableAccounts = snap.availableAccounts.map((item) => ({
      ...item,
      label: accountName(state.accountNames, 'investment', item.accountKey) || item.label,
    }));
    available.availableAccounts = available.availableAccounts.map((item) => ({
      ...item,
      label: accountName(state.accountNames, 'investment', item.accountKey) || item.label,
    }));
    // Every account label the card can name is resolved by now, so notes
    // nested deeper in the card read from the same one.
    const control = accountControl(snap);
    const movement = latestValueMovement(statements, { baseCurrency: base, accountKey: snap.selectedAccountKey });
    const movementView = movementSummary(statements, snap, base, prose, movement);
    /* No second door in front of the first. The card is already a disclosure:
     * its closed summary carries the total, the account count and the date, so
     * opening it is already a person saying they want the detail. A "See the
     * detail" fold inside it made that one tap reveal another tap, and the
     * thing behind the second tap was the whole point of the card. */
    const browserRender = typeof window !== 'undefined';
    const card = browserRender ? null : el('div', {});
    if (card) card.append(historyDetail(statements, snap, base), holdingsDetail(snap, prose));
    const history = browserRender ? historyDetail(statements, snap, base) : null;
    const holdings = browserRender ? holdingsDetail(snap, prose) : null;
    const manualNoteText = (state.manualAssets || []).some((asset) => asset.class === 'Investments' && asset.kind !== 'liability')
      ? "You also entered an investments figure by hand. If it's for this same account, remove it under Recorded assets and debts so it isn't counted twice."
      : null;
    const statedIncome = statedIncomeModel(
      investmentIncomeSince(
        investmentIncomeSection(snap.selectedAccountKey === 'all' ? statements : statements.filter((item) => investmentAccountKey(item) === snap.selectedAccountKey)),
        snap.asOf
      ),
      { base, prose, bankMoney }
    );
    const investmentProps = {
      accountControl: !browserRender && control ? investmentAccountControlReact(el, control) : null,
      accountControlProps: browserRender ? control : null,
      value: bankMoney(snap.combinedTotal),
      asOf: asOfText(snap),
      cashParked: snap.cashParked >= 1 ? `of which ${prose(snap.cashParked)} is cash waiting to be invested` : '',
      statedIncome,
      movement: browserRender ? null : movementView,
      movementProps: browserRender ? movementView : null,
      details: card,
      historyProps: browserRender ? history : null,
      holdingsProps: browserRender ? holdings : null,
      manualNote: browserRender || !manualNoteText ? null : note(manualNoteText),
      manualNoteText: browserRender ? manualNoteText : null,
    };
    const investmentBody = browserRender ? null : investmentCardReact(el, investmentProps);
    const accountCount = available.availableAccounts.length;
    const cardProps = {
      title: 'Investments',
      summary: `${prose(available.combinedTotal)} in ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'} · as of ${formatDisplayDate(available.asOf)}`,
      icon: browserRender ? null : icon(iconChart()),
      iconMarkup: browserRender ? iconChart() : null,
      body: investmentBody,
      reactBody: browserRender ? { kind: 'investmentCard', props: investmentProps, rootClass: 'pfa-react-root' } : null,
      name: 'position-investments-card',
    };
    if (asProps) return [{ summary: cardProps.summary, iconMarkup: cardProps.iconMarkup, investmentProps }];
    const wrapped = collapsibleCardReact(el, cardProps);
    // No hand-set id: a named card is addressed by its name, so there is one
    // identifier for this card rather than two kept in step by hand.
    return [wrapped];
  }

  return { renderInvestments };
}
