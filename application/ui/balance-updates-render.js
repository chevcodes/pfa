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
import { createDecisionHeader, chartInfo } from './decision-header.js';
import { collapsibleCardReact, chartInfoReact, decisionSurfaceReact, balanceUpdateFormReact } from './react-bridge.js';
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
      'jump',
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
    jump,
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

  function openUpdaterRaw(focusKey) {
    trackUsage('balance-update-open');
    switchLedgerView('position');
    requestAnimationFrame(() => {
      smoothScrollToEl('#balance-update');
      if (!focusKey) return;
      const focusWhenVisible = (attempts) => {
        const input = document.getElementById(inputId(focusKey));
        if (input?.getClientRects().length) {
          input.focus({ preventScroll: true });
        } else if (attempts > 0) {
          requestAnimationFrame(() => focusWhenVisible(attempts - 1));
        }
      };
      focusWhenVisible(12);
    });
    return true;
  }
  const openUpdater = jump(openUpdaterRaw, { returnOnAction: true });

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

  function asOfTrace(asProps = false) {
    const balances = provenModels.balances();
    const fresh = balanceFreshness(balances, isoToday());
    if (!fresh || !fresh.asOf) return null;
    const date = formatDisplayDate(fresh.asOf);
    const word = fresh.entered ? 'entered' : 'as of';
    if (fresh.stale) {
      const label = `${word} ${date} · update`;
      const ariaLabel = `Balances ${word} ${date}. Update balances`;
      if (asProps) return { type: 'stale', label, ariaLabel, onClick: () => openUpdater() };
      return el(
        'button',
        {
          type: 'button',
          class: 'tag asof-trace is-stale',
          'aria-label': ariaLabel,
          onclick: () => openUpdater(),
        },
        label
      );
    }
    if (!fresh.entered) return null;
    const label = `entered ${date}`;
    const content = enteredDetail(balances);
    if (asProps) return { type: 'info', label, content, tone: 'neutral' };
    return chartInfoReact(el, label, content, 'neutral');
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

  function renderUpdateCard(asProps = false) {
    const balances = provenModels.balances();
    if (!balances || !balances.known.length) return null;
    const today = isoToday();
    const correcting = balances.active && balances.snapshot.asOf === today ? balances.snapshot.id : null;
    const hidden = figuresHidden();
    const byKey = new Map(balances.accounts.map((item) => [item.key, item]));
    const accounts = balances.accounts.map((item) => {
      const keepToday = !!correcting && item.inSnapshot;
      return {
        item,
        key: item.key,
        id: inputId(item.key),
        name: nameOf(item),
        ledger: item.ledger,
        currency: item.currency,
        source: item.source,
        lastLabel: item.source === 'entered' ? 'Entered figure' : 'Latest statement',
        lastDate: formatDisplayDate(item.asOf),
        lastAmount: amountFor(item, item.balance),
        inputValue: keepToday && !hidden ? String(item.balance) : '',
        carried: keepToday && hidden,
        carriedValue: item.balance,
        placeholder: keepToday && hidden ? 'Unchanged' : '0.00',
      };
    });

    const save = async (entries) => {
      const now = new Date().toISOString();
      const snapshotId = correcting || `snap_${now.replace(/\D/g, '')}`;
      const values = {};
      for (const [key, entry] of Object.entries(entries)) {
        const typed = entry.value.trim();
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
        return {
          error: `${names(invalid.map((key) => byKey.get(key)))} ${invalid.length === 1 ? 'doesn’t' : 'don’t'} read as an amount. Type the figure as digits, like 125000.50.`,
          focusKey: invalid[0],
        };
      }
      if (!records.length) {
        return { error: 'Type at least one balance to save.' };
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
        return { error: 'Those balances could not be saved, so nothing was changed. Try again.' };
      }
    };
    const formProps = { accounts, correcting: !!correcting, onSave: save, onUseStatement: useStatement };
    const reactActive = typeof window !== 'undefined';
    const body = reactActive ? null : balanceUpdateFormReact(el, formProps);
    const fresh = balanceFreshness(balances, today);
    const summary = balances.active
      ? `Entered ${formatDisplayDate(balances.snapshot.asOf)} · ${balances.snapshot.typed.length} of ${balances.known.length} accounts`
      : fresh && fresh.asOf
        ? `From statements · latest ${formatDisplayDate(fresh.asOf)}`
        : 'From statements';
    const explain = `Enter today's balances from your bank or card app. Leave a field blank to keep the last figure. Position, safe-to-spend and emergency fund progress use entered figures; spending, forecasts and targets keep using statements. A statement covering the entered date replaces them.${correcting ? ' To correct today’s update, change a figure and save again.' : ''}`;
    if (asProps) return { summary, explain, formProps };
    const card = collapsibleCardReact(el, {
      title: 'Update balances',
      summary,
      explain,
      body,
      reactBody: reactActive ? { kind: 'balanceUpdate', props: formProps, rootClass: 'pfa-react-root' } : null,
      name: 'balance-update-card',
    });
    if (card) card.id = 'balance-update';
    return card;
  }

  function renderChangeStory(asProps = false) {
    const balances = provenModels.balances();
    const today = isoToday();
    const story = changeSinceStatements(balances, { today, baseCurrency: baseCurrency() });
    if (!story || !story.rows.length) return null;
    const since = statementsPhrase(story.from, story.to, today);
    const why = [
      'This compares two points for each account: its balance on its last statement and the balance you entered. What happened in between appears once those statements are imported.',
    ];
    if (story.separate.length) {
      why.push('Accounts in another currency are shown in their own currency and left out of the total.');
    }
    if (story.notUpdated.length) {
      why.push(`Not included, because no balance was entered: ${names(story.notUpdated)}.`);
    }
    const props = {
      id: 'since-statement',
      className: 'view-overview',
      question: 'What’s moved since your last statement?',
      figure: signed({ ledger: 'bank', currency: baseCurrency() }, story.net),
      meaning:
        story.sameStatementMonth && story.span.text
          ? `Net change since ${since}, ${story.span.text} ago`
          : `Net change since ${since}`,
      tags: [],
      trace: typeof window === 'undefined' ? asOfTrace() : null,
      traceModel: typeof window !== 'undefined' ? asOfTrace(true) : null,
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
    };
    if (asProps) return props;
    const reactCard = decisionSurfaceReact(el, props);
    if (reactCard && reactCard.nodeType) return reactCard;
    const trace = props.trace || asOfTrace();
    return renderDecisionHeader({
      ...props,
      class: props.className,
      figure: { text: props.figure },
      tags: trace ? [trace] : [],
      why: why.map((line) => el('p', {}, line)),
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
    if (typeof window !== 'undefined') return parts;
    // Content, not a component. It was a line of its own - "About these
    // balances ⓘ" - floating under the account filter it is actually about,
    // directly below that filter's own decorative ⓘ which did nothing. It is
    // now what that filter's ⓘ opens, so the explanation sits on the thing it
    // explains and the screen is one line shorter.
    return parts.map((text, index) => el('p', { style: `margin:${index ? '8px' : '0'} 0 0` }, text));
  }

  function historyBasisNote() {
    const basisText = historyBasisText();
    if (!basisText) return null;
    // Stays on vanilla chartInfo: tests/ui_calmness_proof.mjs statically
    // requires this exact source text (a bare "return chartInfo(").
    return chartInfo(
      el,
      'Statement history',
      basisText,
      'neutral'
    );
  }

  function historyBasisText() {
    const balances = provenModels.balances();
    return balances && balances.active
      ? `Your typical month, forecast and targets come from statements. The balances you entered on ${formatDisplayDate(balances.snapshot.asOf)} update safe-to-spend and emergency fund progress only.`
      : null;
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
    historyBasisText,
    reconcileAfterImport,
  };
}
