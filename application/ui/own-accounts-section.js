import { requireCtx } from '../core/shared-helpers.js';
import { ownSubject } from '../analysis/confirmations.js';
import { ownAccountRows, parseAccountEntry, suggestedOwnAccounts } from '../analysis/own-accounts.js';
import { subhead } from './decision-header.js';
import { createAccountRename } from './account-rename.js';

const SOURCES = {
  statement: { label: 'Statement', title: 'Found on your account statements' },
  card: { label: 'Card', title: 'Found on your card statements' },
  declared: { label: 'You added', title: 'You told the app this account is yours' },
};

const EXPLAIN =
  'Transfers to and from these accounts are treated as moving your own money, not spending. Statement accounts are found automatically; add any other account of yours by its number.';

const ENTRY_HELP = 'Enter the account number: digits only, at least 4.';

export function createOwnAccountsSection(ctx) {
  requireCtx(
    ctx,
    ['state', 'el', 'toast', 'classifiedBank', 'answer', 'retract', 'changeSetting', 'trackUsage'],
    'createOwnAccountsSection'
  );
  const { state, el, toast, classifiedBank, answer, retract, changeSetting, trackUsage } = ctx;
  const { renameControl } = createAccountRename({
    state,
    el,
    changeSetting,
    trackUsage,
    track: 'own-accounts-rename',
    idPrefix: 'own-account-rename',
  });

  const rows = () =>
    ownAccountRows({
      bankRecords: state.bankRecords,
      cardAccounts: state.cardAccounts,
      confirmations: state.confirmations,
    });

  async function add(text) {
    const parsed = parseAccountEntry(text);
    if (parsed.error === 'empty') return false;
    if (parsed.error) {
      toast(ENTRY_HELP);
      return false;
    }
    if (rows().some((row) => row.id === parsed.id)) {
      toast(`…${parsed.id} is already on your list.`);
      return true;
    }
    await answer({
      inference: 'transfer',
      subject: ownSubject(parsed.id),
      answer: true,
      describe: () => `…${parsed.id} added to your accounts.`,
      track: 'own-accounts-add',
    });
    return true;
  }

  function remove(id) {
    return retract({
      inference: 'transfer',
      subject: ownSubject(id),
      describe: () => `…${id} removed from your accounts.`,
      track: 'own-accounts-remove',
    });
  }

  function metaText() {
    const count = rows().length;
    return count ? `${count} account${count === 1 ? '' : 's'}` : 'None yet';
  }

  function settingsProps() {
    return {
      explain: EXPLAIN,
      placeholder: 'Account number',
      accounts: rows().map((row) => {
        const fallback = `…${row.id}`;
        return {
          id: row.id,
          sourceLabel: SOURCES[row.source].label,
          sourceTitle: SOURCES[row.source].title,
          removable: row.removable,
          removeTitle: `Stop treating …${row.id} as yours`,
          ...renameControl({ kind: 'bank', account: row.id, fallback, about: `Account ending ${row.id}` }),
          onRemove: () => remove(row.id),
        };
      }),
      onAdd: add,
    };
  }

  function settingsNode() {
    const props = settingsProps();
    const input = el('input', {
      type: 'text',
      class: 'name-field',
      placeholder: props.placeholder,
      'aria-label': 'Account number to add',
      maxlength: '24',
      inputmode: 'numeric',
    });
    const submit = async () => {
      if (await add(input.value)) input.value = '';
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    });
    const list = el('div', { class: 'settings-category-list' });
    for (const account of props.accounts) {
      const tail = account.removable
        ? el('button', { class: 'btn sm ghost', title: account.removeTitle, onclick: account.onRemove }, 'Remove')
        : el('span', { class: 'vm-tag tone-neutral', title: account.sourceTitle }, account.sourceLabel);
      list.append(
        el(
          'div',
          { class: 'settings-category-row' },
          account.renameNode || el('span', {}, account.renameProps.friendly || account.renameProps.fallback),
          el('div', { class: 'manage-actions' }, tail)
        )
      );
    }
    return el(
      'div',
      { class: 'sec-section' },
      subhead(el, {
        title: 'Own accounts',
        explain: props.explain,
        actions: el(
          'div',
          { class: 'manage-actions settings-category-form' },
          input,
          el('button', { class: 'btn sm', onclick: submit }, 'Add account')
        ),
      }),
      props.accounts.length ? list : null
    );
  }

  function attentionItems() {
    const top = suggestedOwnAccounts(classifiedBank(), state.confirmations, {
      baseCurrency: (state.cfg.currency || {}).code || 'JMD',
    })[0];
    if (!top) return [];
    const reply = (value) =>
      answer({
        inference: 'transfer',
        subject: ownSubject(top.id),
        answer: value,
        describe: () =>
          value
            ? `Account …${top.id} counts as yours.`
            : `Account …${top.id} counts as someone else.`,
        track: value ? 'attention-own-account-yes' : 'attention-own-account-no',
      });
    return [
      {
        tone: 'watch',
        cause: true,
        title: `Is the account ending …${top.id} yours?`,
        detail: `${top.rows} transfers over ${top.months} months.`,
        onClick: null,
        actions: [
          { label: 'No', onClick: () => reply(false), variant: 'ghost' },
          { label: 'Yes', onClick: () => reply(true), variant: 'primary' },
        ],
      },
    ];
  }

  return { metaText, settingsProps, settingsNode, attentionItems };
}
