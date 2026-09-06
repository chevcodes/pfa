import {
  requireCtx,
  formatDisplayDate,
  formatMoney,
  accountName,
  bankAccountIdentity,
  isoToday,
  figuresHidden,
  joinWithAnd,
} from '../core/shared-helpers.js';
import { resolveOpts } from '../analysis/commitment-income.js';
import { currencyPrefix } from '../core/money-format.js';
import {
  balanceFreshness,
  changeSinceStatements,
  reconcileEnteredBalances,
  reconciliationMessage,
  snapshotRecords,
  statementsPhrase,
} from '../analysis/balance-updates.js';
import { chartInfo, collapsibleCard, createDecisionHeader } from './decision-header.js';
import { commitAndRender } from './reversible.js';

export function createBalanceUpdates(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      'Store',
      'render',
      'toast',
      'provenModels',
      'bankMoney',
      'classifiedBank',
      'trackUsage',
      'switchLedgerView',
      'smoothScrollToEl',
    ],
    'createBalanceUpdates'
  );
  const {
    state,
    el,
    Store,
    render,
    toast,
    provenModels,
    bankMoney,
    classifiedBank,
    trackUsage,
    switchLedgerView,
    smoothScrollToEl,
  } = ctx;
  const { renderDecisionHeader } = createDecisionHeader({ el });

  const baseCurrency = () => resolveOpts(state.cfg || {}).baseCurrency;

  function nameOf(item) {
    if (item.ledger === 'card') return 'Credit card';
    return accountName(state.accountNames, 'bank', item.account) || `Account …${bankAccountIdentity(item.account)}`;
  }

  function amountFor(item, value) {
    if (item.ledger === 'card' || item.currency === baseCurrency()) return bankMoney(value);
    return formatMoney(Number(value) || 0, currencyPrefix(item.currency, state.cfg), undefined, 2);
  }

  function signed(item, value) {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${amountFor(item, Math.abs(value))}`;
  }

  function names(items) {
    return joinWithAnd(items.map(nameOf));
  }

  const inputId = (key) => `balance-input-${String(key).replace(/[^a-z0-9]/gi, '-')}`;

  function openUpdater(focusKey) {
    trackUsage('balance-update-open');
    switchLedgerView('position');
    // smoothScrollToEl opens the card it lands on; this used to do it by hand.
    smoothScrollToEl('#balance-update');
    const input = focusKey ? document.getElementById(inputId(focusKey)) : null;
    if (input) input.focus({ preventScroll: true });
  }

  function enteredDetail(balances) {
    const parts = [
      `You typed these balances on ${formatDisplayDate(balances.snapshot.asOf)}. They stand in until statements covering that date are imported, and individual movements aren’t itemised until then.`,
    ];
    const held = balances.snapshot.held;
    if (held.length) {
      parts.push(
        `Not updated, so showing an earlier figure: ${held.map((item) => `${nameOf(item)} from ${formatDisplayDate(item.asOf)}`).join(', ')}.`
      );
    }
    return parts.join(' ');
  }

  function asOfTrace() {
    const balances = provenModels.balances();
    const fresh = balanceFreshness(balances, isoToday());
    if (!fresh || !fresh.asOf) return null;
    const date = formatDisplayDate(fresh.asOf);
    const word = fresh.entered ? 'entered' : 'as of';
    if (fresh.stale) {
      return el(
        'button',
        {
          type: 'button',
          class: 'tag asof-trace is-stale',
          'aria-label': `Balances ${word} ${date}. Update balances`,
          onclick: () => openUpdater(),
        },
        `${word} ${date} · update`
      );
    }
    if (!fresh.entered) return null;
    return chartInfo(el, `entered ${date}`, enteredDetail(balances), 'neutral');
  }

  async function replaceUpdates(next, track) {
    await Store.balanceUpdates.replace(next);
    state.balanceUpdates = next;
    if (track) trackUsage(track);
  }

  async function putBack(prior) {
    await commitAndRender({
      commit: () => replaceUpdates(prior),
      render,
      notify: () => toast('Put back.'),
    });
  }

  async function useStatement(item) {
    const prior = state.balanceUpdates || [];
    const next = prior.filter((update) => update.key !== item.key);
    try {
      await commitAndRender({
        commit: () => replaceUpdates(next, 'balance-update-use-statement'),
        render,
        notify: () => toast(`${nameOf(item)} is back to its statement figure.`, async () => putBack(prior)),
      });
    } catch {
      toast(`${nameOf(item)} could not be changed, so it still shows the balance you entered.`);
    }
  }

  function renderUpdateCard() {
    const balances = provenModels.balances();
    if (!balances || !balances.known.length) return null;
    const today = isoToday();
    const correcting = balances.active && balances.snapshot.asOf === today ? balances.snapshot.id : null;
    const hidden = figuresHidden();
    const byKey = new Map(balances.accounts.map((item) => [item.key, item]));
    const entries = {};
    const error = el('p', { class: 'balance-update-error small', role: 'status', 'aria-live': 'polite' });
    const rows = el('div', { class: 'balance-update-rows' });

    const save = async () => {
      const now = new Date().toISOString();
      const snapshotId = correcting || `snap_${now.replace(/\D/g, '')}`;
      const values = {};
      for (const [key, entry] of Object.entries(entries)) {
        const typed = entry.input.value.trim();
        values[key] = {
          value: typed || (entry.carried ? String(entry.carriedValue) : ''),
          carried: !typed && entry.carried,
          carriedValue: entry.carriedValue,
        };
      }
      const { records, blanks, invalid } = snapshotRecords({
        known: balances.known,
        entries: values,
        today,
        now,
        snapshotId,
      });
      if (invalid.length) {
        error.textContent = `${names(invalid.map((key) => byKey.get(key)))} ${invalid.length === 1 ? 'doesn’t' : 'don’t'} read as an amount. Type the figure as digits, like 125000.50.`;
        const first = document.getElementById(inputId(invalid[0]));
        if (first) first.focus();
        return;
      }
      if (!records.length) {
        error.textContent = 'Type at least one balance, or tap Unchanged for an account that hasn’t moved.';
        return;
      }
      const prior = state.balanceUpdates || [];
      const next = [...prior.filter((update) => update.snapshotId !== snapshotId), ...records];
      const lead = `Balances updated as of ${formatDisplayDate(today)}.`;
      const message = blanks.length
        ? `${lead} ${names(blanks.map((key) => byKey.get(key)))} ${blanks.length === 1 ? 'was left blank, so it keeps its' : 'were left blank, so they keep their'} last figure.`
        : lead;
      try {
        await commitAndRender({
          commit: () => replaceUpdates(next, 'balance-update-save'),
          render,
          notify: () => toast(message, async () => putBack(prior)),
        });
      } catch {
        // A write that did not land must never look like one that did.
        error.textContent = 'Those balances could not be saved, so nothing was changed. Try again.';
      }
    };

    for (const item of balances.accounts) {
      const id = inputId(item.key);
      const keepToday = !!correcting && item.inSnapshot;
      const input = el('input', {
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        id,
        class: 'name-field balance-update-input',
        placeholder: keepToday && hidden ? 'Unchanged' : item.ledger === 'card' ? 'Owed today' : 'Balance today',
        value: keepToday && !hidden ? String(item.balance) : '',
      });
      const entry = { input, carried: keepToday && hidden, carriedValue: item.balance };
      entries[item.key] = entry;
      input.addEventListener('input', () => {
        if (input.value.trim()) entry.carried = false;
        error.textContent = '';
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save();
        }
      });
      const unchanged = el(
        'button',
        {
          type: 'button',
          class: 'btn sm ghost',
          'aria-label': `${nameOf(item)} is unchanged`,
          onclick: () => {
            input.value = '';
            input.placeholder = 'Unchanged';
            entry.carried = true;
            error.textContent = '';
          },
        },
        'Unchanged'
      );
      const statement =
        item.source === 'entered'
          ? el(
              'button',
              { type: 'button', class: 'btn sm ghost', onclick: () => useStatement(item) },
              'Use statement'
            )
          : null;
      rows.append(
        el(
          'div',
          { class: 'balance-update-row' },
          el(
            'label',
            { class: 'balance-update-name', for: id },
            el('span', { class: 'account-name-text' }, nameOf(item)),
            el('span', { class: 'position-currency-pill' }, item.ledger === 'card' ? 'owed' : item.currency),
            el(
              'span',
              { class: 'balance-update-last muted small num' },
              `${item.source === 'entered' ? 'Entered' : 'Statement'} ${formatDisplayDate(item.asOf)}: ${amountFor(item, item.balance)}`
            )
          ),
          el('div', { class: 'balance-update-fields' }, ...[input, unchanged, statement].filter(Boolean))
        )
      );
    }

    const body = el(
      'div',
      { class: 'balance-update' },
      el(
        'p',
        { class: 'balance-update-note muted small' },
        correcting
          ? 'You already updated today. Change any figure and save again to correct it.'
          : 'Type what your banking app shows today. Leave an account blank if you don’t have it to hand; it keeps its last figure.'
      ),
      rows,
      error,
      el(
        'div',
        { class: 'balance-update-actions' },
        el('button', { type: 'button', class: 'btn primary sm', onclick: save }, correcting ? 'Save corrections' : 'Save balances')
      )
    );
    const fresh = balanceFreshness(balances, today);
    const summary = balances.active
      ? `Entered ${formatDisplayDate(balances.snapshot.asOf)} · ${balances.snapshot.typed.length} of ${balances.known.length} accounts`
      : fresh && fresh.asOf
        ? `From statements · latest ${formatDisplayDate(fresh.asOf)}`
        : 'From statements';
    const card = collapsibleCard(el, {
      title: 'Update balances',
      summary,
      explain:
        'Position, safe-to-spend and your emergency fund progress use the balances you enter. Your transactions, typical month, forecast and targets keep using statements only. When a statement covering that date is imported, it replaces what you entered.',
      body,
      name: 'balance-update-card',
    });
    if (card) card.id = 'balance-update';
    return card;
  }

  function renderChangeStory() {
    const balances = provenModels.balances();
    const today = isoToday();
    const story = changeSinceStatements(balances, { today, baseCurrency: baseCurrency() });
    if (!story || !story.rows.length) return null;
    const since = statementsPhrase(story.from, story.to, today);
    const why = [
      el(
        'p',
        {},
        'This compares two points for each account: its balance on its last statement and the balance you entered. What happened in between appears once those statements are imported.'
      ),
    ];
    if (story.separate.length) {
      why.push(el('p', { class: 'muted small' }, 'Accounts in another currency are shown in their own currency and left out of the total.'));
    }
    if (story.notUpdated.length) {
      why.push(
        el(
          'p',
          { class: 'muted small' },
          `Not included, because no balance was entered: ${names(story.notUpdated)}.`
        )
      );
    }
    return renderDecisionHeader({
      id: 'since-statement',
      class: 'view-overview',
      question: 'What’s moved since your last statement?',
      figure: { text: signed({ ledger: 'bank', currency: baseCurrency() }, story.net) },
      meaning:
        story.sameStatementMonth && story.span.text
          ? `Net change since ${since}, ${story.span.text} ago`
          : `Net change since ${since}`,
      tags: [asOfTrace()].filter(Boolean),
      note: {
        text: `From balances you entered on ${formatDisplayDate(story.asOf)}. Individual movements aren’t itemised until your next statement.`,
        tone: 'neutral',
      },
      why,
      support: story.rows.map((row) => ({
        text: row.ledger === 'card' ? `${signed(row, row.change)} owed` : signed(row, row.change),
        label: nameOf(row),
        tag: `${amountFor(row, row.opening)} → ${amountFor(row, row.closing)}`,
        tone: 'neutral',
      })),
      supportLabel: 'By account',
      supportOpen: true,
    });
  }

  function reconciledEdge(selected = 'all', context = []) {
    const balances = provenModels.balances();
    const parts = [...context];
    if (balances && balances.known.length) {
      const scope =
        selected === 'all'
          ? balances.known
          : balances.known.filter((item) =>
              selected === 'card' ? item.ledger === 'card' : item.ledger === 'bank' && item.account === selected
            );
      const dates = scope.map((item) => item.anchor.date).filter(Boolean).sort();
      if (dates.length) {
        const first = dates[0];
        const last = dates[dates.length - 1];
        parts.push(
          `Reconciled through ${formatDisplayDate(last)}${first.slice(0, 7) !== last.slice(0, 7) ? ', with some accounts ending earlier' : ''}. Later activity appears when your next statement is imported.`
        );
      }
      if (balances.active) parts.push(`Balances you entered on ${formatDisplayDate(balances.snapshot.asOf)} are on Position.`);
    }
    if (!parts.length) return null;
    // Content, not a component. It was a line of its own - "About these
    // balances ⓘ" - floating under the account filter it is actually about,
    // directly below that filter's own decorative ⓘ which did nothing. It is
    // now what that filter's ⓘ opens, so the explanation sits on the thing it
    // explains and the screen is one line shorter.
    return parts.map((text, index) => el('p', { style: `margin:${index ? '8px' : '0'} 0 0` }, text));
  }

  function historyBasisNote() {
    const balances = provenModels.balances();
    if (!balances || !balances.active) return null;
    return chartInfo(
      el,
      'Statement history',
      `Your typical month, forecast and targets come from statements. The balances you entered on ${formatDisplayDate(balances.snapshot.asOf)} update safe-to-spend and emergency fund progress only.`,
      'neutral'
    );
  }

  async function reconcileAfterImport() {
    const balances = provenModels.balances();
    if (!balances || !balances.superseded.length) return;
    const { cleared, comparisons } = reconcileEnteredBalances({
      balances,
      bankRecords: classifiedBank(),
      cfg: state.cfg,
    });
    const gone = new Set(cleared.map((update) => update.id));
    const next = (state.balanceUpdates || []).filter((update) => !gone.has(update.id));
    const message = reconciliationMessage(comparisons, { money: (value, update) => amountFor(update, value), nameOf });
    try {
      await commitAndRender({
        commit: () => replaceUpdates(next),
        render,
        notify: () => {
          if (message) toast(message);
        },
      });
    } catch {
      // The statements themselves are already stored; only the clean-up of the
      // figures they replace failed, and a stale entry is ignored on read.
      toast('Your statements were imported. The balances they replace will clear next time.');
    }
  }

  return {
    renderUpdateCard,
    renderChangeStory,
    asOfTrace,
    openUpdater,
    reconciledEdge,
    historyBasisNote,
    reconcileAfterImport,
  };
}
