import { accountName, bankAccountIdentity, dirOf, isInternal, isoToday, requireCtx, formatDisplayDate } from '../core/shared-helpers.js';
import { makePaymentObligation, paymentStatusText } from '../analysis/payment-obligations.js';
import { commitAndRender } from './reversible.js';
import { makeProseMoney } from '../core/money-format.js';

export function createPaymentObligationsRenderer(ctx) {
  requireCtx(ctx, ['state', 'Store', 'provenModels', 'classifiedBank', 'el', 'openModal', 'closePicker', 'render', 'bankMoney', 'toast', 'drillToAccount', 'balanceUpdates', 'openEvidence'], 'createPaymentObligationsRenderer');
  const { state, Store, provenModels, classifiedBank, el, openModal, closePicker, render, bankMoney, toast, drillToAccount, balanceUpdates, openEvidence } = ctx;
  const accountLabel = (account) => accountName(state.accountNames, 'bank', account) || `…${bankAccountIdentity(account)}`;
  const prose = makeProseMoney(state.cfg);

  async function savePayment(payment, announcement = null, focusAfterSave = null) {
    await commitAndRender({
      commit: async () => {
        await Store.paymentObligations.put(payment);
        state.paymentObligations = [...state.paymentObligations.filter((item) => item.id !== payment.id), payment];
        closePicker();
      },
      render,
      notify: announcement ? () => toast(announcement) : null,
    });
    if (focusAfterSave) setTimeout(() => document.querySelector(focusAfterSave)?.focus({ preventScroll: true }), 100);
  }

  function openPaymentEditor({ row = null, payment = null } = {}) {
    const returnView = state.view;
    const accounts = provenModels.balances().accounts.filter((item) => item.ledger === 'bank' && item.currency === (state.cfg.currency?.code || 'JMD'));
    const title = payment ? 'Edit expected payment' : 'Set a monthly payment';
    const name = el('input', { type: 'text', class: 'name-field', value: payment?.label || (row?.category && row.category !== state.cfg.special.fallback ? row.category : row?.counterpartyLabel || ''), required: '', maxlength: '80' });
    const category = el('select', { class: 'name-field' }, ...state.cfg.categories.map((item) => el('option', { value: item.name, selected: (payment?.category || row?.category) === item.name ? '' : null }, item.name)));
    const amount = el('input', { type: 'number', class: 'name-field', inputmode: 'decimal', min: '0.01', step: '0.01', value: payment?.amount || row?.amount || '', required: '' });
    const account = el('select', { class: 'name-field' }, ...accounts.map((item) => el('option', { value: item.account, selected: (payment?.account || row?.account) === item.account ? '' : null }, accountLabel(item.account))));
    const payees = [...new Map(classifiedBank().filter((item) => dirOf(item) === 'out' && !isInternal(item) && item.counterpartyKey).map((item) => [item.counterpartyKey, item.counterpartyLabel || item.description || item.counterpartyKey])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const payee = el('select', { class: 'name-field' }, el('option', { value: '' }, 'No linked bank payee'), ...payees.map(([key, label]) => el('option', { value: key, selected: (payment?.payeeKey || row?.counterpartyKey) === key ? '' : null }, label)));
    const dueDay = el('input', { type: 'number', class: 'name-field', inputmode: 'numeric', min: '1', max: '31', step: '1', value: payment?.dueDay || Number(String(row?.date || '').slice(8, 10)) || 1, required: '' });
    const startDate = el('input', { type: 'date', class: 'name-field', value: payment?.startDate || row?.date || isoToday(), required: '' });
    const endDate = el('input', { type: 'date', class: 'name-field', value: payment?.endDate || '' });
    const error = el('p', { class: 'muted small', role: 'alert' });
    const field = (label, input) => el('label', { class: 'field-label' }, el('span', {}, label), input);
    const form = el('form', {
      class: 'form-grid',
      onsubmit: async (event) => {
        event.preventDefault();
        try {
          const next = makePaymentObligation({
            ...payment,
            label: name.value,
            category: category.value,
            amount: amount.value,
            account: account.value,
            dueDay: dueDay.valueAsNumber,
            startDate: startDate.value,
            endDate: endDate.value,
            payeeKey: payee.value,
            sourceTxnId: payment?.sourceTxnId || row?.id || '',
          });
          await savePayment(next, `${next.label} payment saved.`, returnView === 'ahead' ? '#plan-expected-payments .pfa-card-disclosure-trigger' : returnView === 'activity' ? '#tx-search' : '#ledger-tab-overview');
        } catch (reason) {
          error.textContent = reason.message || 'This payment could not be saved.';
        }
      },
    },
      el('div', { class: 'form-row' }, field('Payment name', name)),
      el('div', { class: 'form-row' }, field('Category', category), field('Amount in JMD', amount)),
      el('div', { class: 'form-row' }, field('Paid from account', account), field('Due day each month', dueDay)),
      el('div', { class: 'form-row' }, field('Match bank payments from', payee)),
      el('div', { class: 'form-row' }, field('Starts', startDate), field('Last due date, if it ends', endDate)),
      error,
      el('div', { class: 'picker-actions' },
        el('button', { type: 'submit', class: 'btn sm primary' }, 'Save payment'),
        el('button', { type: 'button', class: 'btn sm ghost', onclick: closePicker }, 'Cancel')
      )
    );
    openModal(el('div', { class: 'picker wide picker-form', role: 'dialog', 'aria-label': title }, el('h2', { class: 'picker-head' }, title), el('p', { class: 'muted small' }, 'A schedule says what is due. PFA matches posted bank rows so a paid occurrence is not counted twice.'), form));
  }

  function openPaymentDetail(paymentId) {
    const payment = state.paymentObligations.find((item) => item.id === paymentId);
    if (!payment) return;
    const coverage = provenModels.paymentCoverageFor(payment);
    const box = el('div', { class: 'picker picker-form', role: 'dialog', 'aria-label': `${payment.label} payment` });
    box.append(el('h2', { class: 'picker-head' }, payment.label));
    if (!coverage) {
      box.append(el('p', {}, 'No more scheduled payments.'));
    } else {
      const { occurrence } = coverage;
      const paid = !!occurrence.row;
      box.append(el('p', {}, `${paid ? 'Paid' : coverage.overdue ? 'Past due since' : 'Next due'} ${formatDisplayDate(occurrence.date)} · ${bankMoney(payment.amount)}`));
      box.append(el('p', { class: 'muted small' }, `Payment account: ${accountLabel(payment.account)}. ${coverage.account?.asOf ? `Balance recorded through ${formatDisplayDate(coverage.account.asOf)}.` : 'No recorded balance for this account.'}`));
      if (!paid) {
        box.append(el('p', {}, `Recorded cash after earlier payments and this payment: ${coverage.recordedRemainder == null ? 'unknown' : bankMoney(coverage.recordedRemainder)} · ${paymentStatusText(coverage.recordedStatus)}.`));
        box.append(el('p', {}, `Forecast after expected pay: ${coverage.projectedRemainder == null ? 'unknown' : bankMoney(coverage.projectedRemainder)} · ${paymentStatusText(coverage.forecastStatus)}.`));
      }
      if (coverage.prior.length) {
        box.append(el('p', { class: 'muted small' }, 'Earlier payments from this account:'));
        for (const item of coverage.prior) box.append(el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { closePicker(); if (item.paymentId) openPaymentDetail(item.paymentId); else openEvidence({ kind: 'payee', key: item.key, label: item.label, date: item.date }); } }, `${item.label} · ${bankMoney(item.amount)} · ${formatDisplayDate(item.date)}`));
      }
      if (coverage.incoming > 0) box.append(el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { closePicker(); openEvidence({ kind: 'payee', key: coverage.income.key, label: 'Expected pay', date: coverage.income.date }); } }, `Expected pay · ${bankMoney(coverage.incoming)} · ${formatDisplayDate(coverage.income.date)}`));
      if (coverage.otherCash > 0) box.append(el('p', { class: 'muted small' }, `${prose(coverage.otherCash)} is recorded in other JMD accounts. It is not counted as already available in this payment account.`));
      if (coverage.gaps.length) box.append(el('p', { class: 'muted small', role: 'status' }, `Needs review: ${coverage.gaps.join('; ')}.`));
      if (coverage.lastPosted) box.append(el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { closePicker(); openEvidence({ kind: 'transaction', ledger: 'bank', id: coverage.lastPosted.id, date: coverage.lastPosted.date }); } }, `${coverage.lastPostedMatch ? 'Last matched payment' : 'Similar bank row'} · ${formatDisplayDate(coverage.lastPosted.date)}`));
      if (coverage.lastPostedMatch) box.append(el('button', { type: 'button', class: 'btn sm ghost', onclick: async () => { await savePayment(makePaymentObligation({ ...payment, matchOverrides: { ...payment.matchOverrides, [coverage.lastPostedDate.slice(0, 7)]: 'unmatched' } })); openPaymentDetail(payment.id); } }, 'This bank row did not pay this bill'));
      if (occurrence.candidates.length && !occurrence.row) {
        box.append(el('p', {}, 'Which bank row paid this occurrence, if any?'));
        for (const row of occurrence.candidates) box.append(el('button', { type: 'button', class: 'btn sm ghost', onclick: async () => { await savePayment(makePaymentObligation({ ...payment, matchOverrides: { ...payment.matchOverrides, [occurrence.date.slice(0, 7)]: row.id } })); openPaymentDetail(payment.id); } }, `${formatDisplayDate(row.date)} · ${bankMoney(row.amount)}`));
      }
    }
    box.append(el('div', { class: 'picker-actions' },
      coverage?.account ? el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { closePicker(); openEvidence({ kind: 'view', view: 'position', anchorId: '#balance-update' }); balanceUpdates.openUpdater(coverage.account.key); } }, 'Update this balance') : null,
      el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { closePicker(); drillToAccount(payment.account); } }, 'See account'),
      el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { closePicker(); openPaymentEditor({ payment }); } }, 'Edit payment'),
      el('button', { type: 'button', class: 'btn sm ghost', onclick: closePicker }, 'Back to prior view')
    ));
    openModal(box);
  }

  return { openPaymentEditor, openPaymentDetail };
}
