import { detectRecurring, twoWayKeys, resolveOpts } from './commitment-income.js';
import { makeMoney } from '../core/money-format.js';
import { typicalMonthlyValue } from '../core/shared-helpers.js';

function ymOf(iso) {
  return String(iso || '').slice(0, 7);
}
function isInternal(r) {
  if (r.internalTransfer != null) return !!r.internalTransfer;
  return String(r.Flow || '') === 'Internal transfer';
}
function dirOf(r) {
  if (r.direction) return r.direction;
  const f = String(r.Flow || '');
  return f === 'Cash inflow' ? 'in' : f === 'Cash outflow' ? 'out' : '';
}
function amtOf(r) {
  return Math.abs(Number(r.amount != null ? r.amount : r.Amount) || 0);
}
function dateOf(r) {
  return String(r.date || r.Date || '');
}
function ccyOf(r, base) {
  return String(r.currency || r.Currency || base);
}
function keyOf(r) {
  return (
    r.counterpartyKey ||
    r.Group ||
    r.counterpartyLabel ||
    r['Counterparty / Merchant'] ||
    'ext:' + String(r.description || r['Raw Description'] || '').toUpperCase()
  );
}
function inPeriod(r, from, to) {
  const d = dateOf(r);
  return d >= from && d <= to;
}
function r2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function cardKind(r) {
  return r.kind || r.Type || r.type || '';
}
function cardIsSpend(r) {
  const k = String(cardKind(r)).toLowerCase();
  return k === 'spend' || k === 'fee';
}

export function committedFlexible({ bankRecords = [], cardRecords = [], cfg = {}, period }) {
  const opts = resolveOpts(cfg);
  const { from, to } = period;
  const base = opts.baseCurrency;

  const debits = detectRecurring(bankRecords, 'out', opts, to).filter(
    (d) => d.typical >= opts.commitmentFloor
  );
  const tw = twoWayKeys(bankRecords, opts, to);
  const committedKeys = new Set(debits.filter((d) => !tw.has(d.key)).map((d) => d.key));

  let income = 0;
  for (const r of bankRecords) {
    if (isInternal(r) || ccyOf(r, base) !== base || dirOf(r) !== 'in') continue;
    if (!inPeriod(r, from, to)) continue;
    income += amtOf(r);
  }

  let committed = 0,
    flexibleBankOut = 0;
  for (const r of bankRecords) {
    if (isInternal(r) || ccyOf(r, base) !== base || dirOf(r) !== 'out') continue;
    if (!inPeriod(r, from, to)) continue;
    if (committedKeys.has(keyOf(r))) committed += amtOf(r);
    else flexibleBankOut += amtOf(r);
  }

  let cardSpend = 0;
  for (const r of cardRecords) {
    if (!cardIsSpend(r)) continue;
    if (!inPeriod(r, from, to)) continue;
    cardSpend += amtOf(r);
  }

  const flexiblePool = r2(income - committed);
  const flexibleSpent = r2(flexibleBankOut + cardSpend);
  const flexibleKept = r2(flexiblePool - flexibleSpent);

  const priorMonths = [
    ...new Set(
      bankRecords
        .filter(
          (r) =>
            dirOf(r) === 'out' &&
            !isInternal(r) &&
            ccyOf(r, base) === base &&
            committedKeys.has(keyOf(r)) &&
            ymOf(dateOf(r)) < ymOf(from)
        )
        .map((r) => ymOf(dateOf(r)))
    ),
  ];
  const priorCommitTotals = priorMonths.map((m) =>
    bankRecords
      .filter(
        (r) =>
          committedKeys.has(keyOf(r)) &&
          dirOf(r) === 'out' &&
          !isInternal(r) &&
          ymOf(dateOf(r)) === m
      )
      .reduce((s, r) => s + amtOf(r), 0)
  );
  const typicalCommitted = r2(typicalMonthlyValue(priorCommitTotals).amount);
  let commitMove = 'in-line';
  if (typicalCommitted > 0) {
    if (committed > typicalCommitted * (1 + opts.tolerance)) commitMove = 'higher';
    else if (committed < typicalCommitted * (1 - opts.tolerance)) commitMove = 'lower';
  }

  return {
    period: { from, to },
    income: r2(income),
    committed: r2(committed),
    flexiblePool,
    flexibleSpent,
    flexibleKept,
    breakdown: {
      cardSpend: r2(cardSpend),
      otherFlexibleOut: r2(flexibleBankOut),
    },
    committedKeyCount: committedKeys.size,
    typicalCommitted,
    commitMove,
  };
}

export function buildCommittedFlexibleModel(result, cfg = {}) {
  const money = makeMoney(cfg);
  const r = result;
  const totalSpend = r2(r.committed + r.flexibleSpent);
  return {
    period: r.period,
    lead: {
      label: 'Total spending this period',
      amount: totalSpend,
      amountText: money(totalSpend),
    },
    committed: {
      label: 'Fixed expenses',
      amount: r.committed,
      amountText: money(r.committed),
      tag:
        r.commitMove === 'higher'
          ? 'higher than usual'
          : r.commitMove === 'lower'
            ? 'lower than usual'
            : 'usual',
      tone: r.commitMove === 'higher' ? 'watch' : 'neutral',
      detail: `${r.committedKeyCount} recurring payee${r.committedKeyCount === 1 ? '' : 's'} · typically about ${money(r.typicalCommitted)} a period.`,
    },
    flexibleSpent: {
      label: 'Discretionary spending',
      amount: r.flexibleSpent,
      amountText: money(r.flexibleSpent),
      tag: `${money(r.breakdown.cardSpend)} card`,
      tone: 'neutral',
      detail: `${money(r.breakdown.cardSpend)} on the card, plus ${money(r.breakdown.otherFlexibleOut)} in cash, one-off payments and transfers out. Money you moved into savings or an investment counts here too - it left the account, so it cannot also be counted as not spent.`,
    },
  };
}
