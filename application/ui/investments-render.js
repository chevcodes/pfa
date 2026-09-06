import { accountName, requireCtx, formatDisplayDate, figuresHidden, smoothScrollToEl, MONTHS_SHORT } from '../core/shared-helpers.js';
import { makeProseMoney, currencyPrefix } from '../core/money-format.js';
import { buildDisclosure, chartInfo, collapsibleCard } from './decision-header.js';
import { renderColumnChart, renderProportionBar } from './chart-surface.js';
import { monthTickOf, proportionShares } from './chart-helpers.js';
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
const BREAK_REASON = {
  gap: 'a month is missing between the statements',
  contribution: "money added in one of the months couldn't be read",
  rate: "an exchange rate on one of the statements couldn't be read",
};

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
  let lastSnapshot = null;
  const monthOf = (iso) => monthShort(String(iso || '').slice(0, 7));
  const percent = (value, digits = 1) =>
    figuresHidden() ? '••%' : `${Math.abs(Number(value) || 0).toFixed(digits)}%`;
  const currencyWord = (ccy) => (ccy === baseCurrency() ? ccy : currencyPrefix(ccy, state.cfg).trim());

  function signal(h) {
    if (h.role === 'cash') return el('span', { class: 'inv-role' }, 'Cash');
    if (h.role === 'stable') return el('span', { class: 'inv-role' }, 'Holds steady');
    if (h.role === 'new') return el('span', { class: 'inv-role is-new' }, 'New this month');
    if (!h.costConfirmed || h.costReturn == null)
      return el('span', { class: 'inv-role' }, 'Cost unconfirmed');
    const pct = h.costReturn * 100;
    const level = Math.abs(pct) < 0.05;
    const words = level
      ? 'Level with what it cost'
      : `${pct > 0 ? 'Up' : 'Down'} ${percent(pct)} on what it cost`;
    return el(
      'span',
      { class: `inv-signal ${level ? 'is-level' : `tone-${movementTone(h.costReturn)}`}`, role: 'img', 'aria-label': words, title: words },
      el('span', { class: 'inv-arrow', 'aria-hidden': 'true' }, level ? '◆' : pct > 0 ? '▲' : '▼'),
      el('span', { class: 'num', 'aria-hidden': 'true' }, level ? 'Level' : percent(pct))
    );
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

  function holdingRow(h, account) {
    const row = el('details', { class: 'disclosure inv-holding' });
    row.append(
      el(
        'summary',
        {},
        el(
          'span',
          { class: 'inv-holding-line' },
          el('span', { class: 'inv-holding-name' }, holdingDisplayName(h.description)),
          el('span', { class: 'inv-holding-value num' }, bankMoney(h.value, h.currency)),
          signal(h)
        )
      )
    );
    const body = el('div', { class: 'disclosure-body inv-holding-body' });
    if (h.costPerUnit != null && h.price != null) {
      body.append(
        el(
          'p',
          { class: 'inv-holding-figures num' },
          `Cost ${bankMoney(h.costPerUnit, h.currency)} ${h.kind === 'equity' ? 'a share' : 'a unit'} · now ${bankMoney(h.price, h.currency)}`
        )
      );
    }
    const move = moveText(h);
    if (move) body.append(note(move));
    if (h.role === 'new' && h.costReturn != null && h.costConfirmed) {
      body.append(note(`So far ${h.costReturn >= 0 ? 'up' : 'down'} ${percent(h.costReturn * 100)} on what it cost.`));
    }
    if (h.merged) body.append(mergedHoldingNote(h));
    if (h.role === 'stable') body.append(note('Built to hold its value, so it carries no up or down signal.'));
    if (h.role === 'performing' && !h.costConfirmed) {
      body.append(note("Its cost figure didn't line up with the statement, so no up or down signal is shown."));
    }
    const foreign = h.currency && h.currency !== baseCurrency();
    if (foreign && !h.rate) body.append(note(`Held in ${h.currency}. This statement's exchange rate couldn't be read.`));
    const about = [];
    if (h.performanceProvenance === 'statement') {
      about.push(note('The gain or loss is stated on the investment statement.'));
    } else if (h.performanceProvenance === 'derived') {
      about.push(note('The app derives the gain or loss from the statement’s current value and purchase cost.'));
    } else if (h.performanceProvenance === 'mixed') {
      about.push(note('This combined result mixes statement-stated and app-derived gain or loss, using cost in both cases.'));
    }
    if (foreign && h.rate) {
      about.push(
        note(
          `Held in ${h.currency}. The statement values it at ${h.rate} ${baseCurrency()} per ${currencyWord(h.currency)} on ${formatDisplayDate(account.periodEnd)}.`
        )
      );
    }
    if (about.length) body.append(el('div', { class: 'inv-holding-about' }, chartInfo(el, 'About these figures', about)));
    row.append(body);
    return row;
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
    render();
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
  function mergedHoldingNote(h) {
    const snap = lastSnapshot;
    const keys = [...new Set(h.accounts || [])];
    if (!keys.length) return note(`Combined across ${(h.accounts || []).length} accounts.`);
    const parts = [];
    keys.forEach((key, index) => {
      if (index) parts.push(index === keys.length - 1 ? ' and ' : ', ');
      parts.push(accountLink(snap, key));
    });
    return note('Combined across ', ...parts, '. Open one to see its own cost.');
  }

  function accountControl(snap) {
    const accounts = snap.availableAccounts || [];
    if (accounts.length < 2) return null;
    const current = snap.selectedAccountKey;
    const choose = (value, anchorId) => {
      if (current === value) return;
      const anchor = document.getElementById(anchorId);
      const anchorTop = anchor ? anchor.getBoundingClientRect().top : null;
      state.investmentAccount = value;
      render();
      const next = document.getElementById(anchorId);
      if (!next) return;
      if (anchorTop != null) window.scrollBy(0, next.getBoundingClientRect().top - anchorTop);
      next.focus({ preventScroll: true });
    };
    const wrap = el('div', { class: 'inv-filter' }, el('span', { class: 'muted small' }, 'Account'));
    if (accounts.length <= 4) {
      const group = el('div', { class: 'seg inv-segments', role: 'group', 'aria-label': 'Filter investments by account' });
      const allLabel = accounts.length === 2 ? 'Both' : 'All';
      for (const item of [{ accountKey: 'all', label: allLabel }, ...accounts]) {
        const id = `investment-account-${item.accountKey.replace(/[^a-z0-9]/gi, '-')}`;
        group.append(
          el(
            'button',
            {
              id,
              type: 'button',
              class: 'seg-btn' + (current === item.accountKey ? ' active' : ''),
              'aria-pressed': current === item.accountKey ? 'true' : 'false',
              onclick: () => choose(item.accountKey, id),
            },
            item.label
          )
        );
      }
      wrap.append(group);
    } else {
      wrap.append(
        el(
          'select',
          {
            id: 'investment-account-select',
            'aria-label': 'Filter investments by account',
            onchange: (event) => choose(event.currentTarget.value, 'investment-account-select'),
          },
          ...[{ accountKey: 'all', label: 'All accounts' }, ...accounts].map((item) =>
            el('option', { value: item.accountKey, selected: current === item.accountKey ? '' : null }, item.label)
          )
        )
      );
    }
    return wrap;
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
    for (const account of snap.accounts) {
      const month = monthOf(account.periodEnd);
      const who = accountLabelOf(snap, account);
      if (!account.contribution.known) {
        lines.push(note(`${who}: money added in ${month} is unknown.`));
      } else if (account.contribution.amount > 0) {
        lines.push(note(`${who}: you added ${bankMoney(account.contribution.amount)} in ${month}.`));
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
    if (caveat) line.append(chartInfo(el, '', caveat));
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
    const layer = el('section', { class: 'inv-history' }, el('h4', {}, 'Value over time'));
    if (present.length < 2) {
      layer.append(note('There is not enough continuous statement history for a trend line yet.'));
      return layer;
    }
    /* A VALUE LINE NEEDS A WINDOW, NOT A ZERO FLOOR.
     *
     * The default axis starts at zero, which is right for a bar - a bar is a
     * quantity and its length has to mean something. A line of a portfolio's
     * value is a SHAPE, and on this history - a few hundred thousand for two
     * years, then several million - a zero floor squashed the whole of 2023
     * and 2024 into the bottom eighth of the plot: a flat grey thread with no
     * readable movement in it at all.
     *
     * Padded around the values actually drawn, the same treatment the income
     * chart's zoomed view already uses, and never below zero. */
    const tick = monthTickOf(MONTHS_SHORT, rows);
    const accountOf = (key) => snap.availableAccounts.find((account) => account.accountKey === key);
    /* A CAVEAT ABOUT THE LINE BELONGS IN THE LINE'S OWN KEY.
     *
     * "Jan 23 - Jul 25: NCB only" was a paragraph of its own under the chart,
     * one more full-width sentence in a stack of them. What it says is a
     * legend entry - it names what a stretch of the drawn line means - so it
     * goes in the legend, beside "Combined value" and "Money added", at the
     * legend's weight and indent. Read while the line is being read, and
     * silent the rest of the time. */
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
      coverageNote = el(
        'span',
        { class: 'chart-legend-note' },
        spanned
          ? `${tick(early[0].month)} - ${tick(early[early.length - 1].month)}: ${who} only`
          : 'Some points cover one account only',
        chartInfo(
          el,
          '',
          spanned
            ? `${monthShort(early[0].month)} to ${monthShort(early[early.length - 1].month)} reflects ${earlyAccounts.join(' and ')} only. From ${monthShort(firstComplete.month)}, the line includes all accounts.`
            : 'Points marked as one account reflect only the account that existed or had a statement in that month.'
        )
      );
    }
    const drawn = rows.map((row) => Number(row.total)).filter((v) => Number.isFinite(v) && v > 0);
    const lowest = drawn.length ? Math.min(...drawn) : 0;
    const highest = drawn.length ? Math.max(...drawn) : 0;
    const headroom = Math.max((highest - lowest) * 0.12, highest * 0.04, 1);
    const chart = renderColumnChart(
      { el, money0: (n) => bankMoney(n), monthLabel, monthShort: monthTickOf(MONTHS_SHORT, rows) },
      {
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
      }
    );
    if (chart) layer.append(chart);
    return layer;
  }

  function movementSummary(statements, snap, base, prose, movement) {
    const runs = growthExcludingContributions(statements, {
      baseCurrency: base,
      accountKey: snap.selectedAccountKey,
    });
    const accountOf = (key) => snap.availableAccounts.find((account) => account.accountKey === key);
    const working = [];
    for (const run of runs) {
      const account = accountOf(run.accountKey);
      const name = account ? account.label : `Account …${String(run.account).slice(-4)}`;
      const who = runs.length > 1 ? `${name}: ` : '';
      if (!run.months) {
        working.push(
          note(`${who}Growth can't be separated from money added yet, because ${BREAK_REASON[run.brokenBy] || 'there is only one statement'}.`)
        );
      } else {
        working.push(note(growthRunSentence(run, { who, money: prose, monthOf })));
        if (run.brokenBy) working.push(note(`${who}Earlier statements aren't included because ${BREAK_REASON[run.brokenBy]}.`));
      }
    }
    working.push(...addedLines(snap));
    /* TWO READINGS OF THE SAME MOVEMENT, READ TOGETHER.
     *
     * "Up $411k since July 2026" sat above the chart and "Down 1.3% on what
     * it cost" sat below it, so the one fact they make together - the value
     * rose because money went in, while what is held is worth slightly less
     * than it cost - was never on screen as one thought. They are the same
     * measure over two windows: last month, and since purchase. One row. */
    const signals = el('div', { class: 'inv-signals' });
    if (movement) signals.append(movementRead(movement, prose));
    signals.append(performanceRead(snap));
    return el(
      'section',
      { class: 'inv-movement' },
      el(
        'div',
        { class: 'inv-movement-head' },
        el('h4', {}, 'What moved the value'),
        working.length ? chartInfo(el, 'Explain', working) : null
      ),
      signals
    );
  }

  function holdingsDetail(snap, prose) {
    const wrap = el('div', { class: 'inv-breakdown' });
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
    if (bands.length > 1) {
      const mix = renderProportionBar(
        { el },
        {
          label: 'How the investments split by asset class',
          money: (n) => bankMoney(n),
          bands,
        }
      );
      if (mix) wrap.append(el('div', { class: 'inv-mix' }, mix));
    }
    for (const group of groups) {
      const list = el('div', { class: 'inv-holdings' });
      for (const holding of group.holdings) list.append(holdingRow(holding, account));
      const band = bands.length > 1 && bands.find((item) => item.key === group.kind);
      wrap.append(
        buildDisclosure(
          el,
          el(
            'span',
            { class: 'inv-group-head' },
            el('h4', {}, group.label),
            el(
              'span',
              { class: 'num muted small' },
              band ? `${bankMoney(group.total)} · ${percent(shareOf(band), 0)}` : bankMoney(group.total)
            )
          ),
          [list],
          { class: 'inv-group', remember: `investment-group-${group.kind}` }
        )
      );
    }
    for (const accountRow of snap.accounts) {
      if (accountRow.disappeared.length) {
        wrap.append(
          note(
            `${labelOf(accountRow)}: no longer listed in ${monthOf(accountRow.periodEnd)}, most likely sold: ${accountRow.disappeared.map((item) => holdingDisplayName(item.description)).join(', ')}.`
          )
        );
      }
      const integrity = accountRow.integrity;
      if (integrity.fxMissing) {
        wrap.append(note(`${labelOf(accountRow)}: the exchange rate couldn't be read, so the holdings couldn't be checked against the printed total.`));
      } else if (integrity.crossCheckGap != null && !integrity.crossCheckOk) {
        wrap.append(
          note(
            `${labelOf(accountRow)}: the holdings come to ${prose(Math.abs(integrity.crossCheckGap))} ${integrity.crossCheckGap > 0 ? 'more' : 'less'} than the printed portfolio total. The total shown is the statement's own.`
          )
        );
      }
      if (integrity.unreadRows) {
        wrap.append(note(`${labelOf(accountRow)}: ${integrity.unreadRows} holding line${integrity.unreadRows === 1 ? '' : 's'} couldn't be read.`));
      }
    }
    for (const statement of supersededInvestmentStatements(state._investmentStatements || [])) {
      const key = investmentAccountKey(statement);
      if (snap.selectedAccountKey !== 'all' && key !== snap.selectedAccountKey) continue;
      const label = snap.availableAccounts.find((item) => item.accountKey === key)?.label || 'An account';
      wrap.append(
        note(
          `${label}: ${statement.source_file} is dated ${formatDisplayDate(statement.periodEnd)}, in the same month as a later statement, so only the later one is counted.`
        )
      );
    }
    return wrap;
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

  function renderInvestments() {
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
    lastSnapshot = snap;
    const card = el('div', { class: 'inv-card' });
    const control = accountControl(snap);
    if (control) card.append(control);
    const movement = latestValueMovement(statements, { baseCurrency: base, accountKey: snap.selectedAccountKey });
    card.append(
      el(
        'div',
        { class: 'inv-total' },
        el('strong', { class: 'num metric-value metric--minor' }, bankMoney(snap.combinedTotal)),
        el('span', { class: 'muted small' }, asOfText(snap)),
        snap.cashParked >= 1
          ? el('span', { class: 'muted small' }, `of which ${prose(snap.cashParked)} is cash waiting to be invested`)
          : null
      ),
      movementSummary(statements, snap, base, prose, movement)
    );
    /* No second door in front of the first. The card is already a disclosure:
     * its closed summary carries the total, the account count and the date, so
     * opening it is already a person saying they want the detail. A "See the
     * detail" fold inside it made that one tap reveal another tap, and the
     * thing behind the second tap was the whole point of the card. */
    card.append(
      historyDetail(statements, snap, base),
      holdingsDetail(snap, prose)
    );
    if ((state.manualAssets || []).some((asset) => asset.class === 'Investments' && asset.kind !== 'liability')) {
      card.append(
        note("You also entered an investments figure by hand. If it's for this same account, remove it under Recorded assets and debts so it isn't counted twice.")
      );
    }
    const accountCount = available.availableAccounts.length;
    const wrapped = collapsibleCard(el, {
      title: 'Investments',
      summary: `${prose(available.combinedTotal)} in ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'} · as of ${formatDisplayDate(available.asOf)}`,
      icon: icon(iconChart()),
      body: card,
      name: 'position-investments-card',
    });
    // No hand-set id: a named card is addressed by its name, so there is one
    // identifier for this card rather than two kept in step by hand.
    return [wrapped];
  }

  return { renderInvestments };
}
