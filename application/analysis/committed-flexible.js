import { detectRecurring, twoWayKeys, resolveOpts } from './commitment-income.js';
import { resolveGroupMap, groupForCategory } from './plan.js';
import { makeMoney, makeMoneyShort } from '../core/money-format.js';
import { typicalMonthlyValue, isInternal, dirOf, amtOf, ccyOf, dateOf } from '../core/shared-helpers.js';

function ymOf(iso) {
  return String(iso || '').slice(0, 7);
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

/* `groupAssignments` is the person's own category -> band placement, the one
 * the Plan already owns and already asks about. It governs: a payment filed
 * under a category they placed in Fixed expenses is committed whether or not
 * the detector found a pattern in it, and one filed under a category they
 * placed in Free spending is not, however regularly it repeats. Detection
 * decides only what nobody has placed yet.
 *
 * This is what makes rent paid by bank transfer a fixed expense the same way
 * rent paid any other way is: it is filed as Rent, and Rent sits in Fixed
 * expenses. No second place to say it, and nothing to say twice. */
export function committedFlexible({
  bankRecords = [],
  cardRecords = [],
  cfg = {},
  period,
  groupAssignments = null,
}) {
  const opts = resolveOpts(cfg);
  const { from, to } = period;
  const base = opts.baseCurrency;
  const groupMap = resolveGroupMap(cfg, groupAssignments);
  const placed = (r) => {
    const name = r.category || r.Category || '';
    if (!name) return null;
    if (!Object.prototype.hasOwnProperty.call(groupMap, String(name).toLowerCase())) return null;
    return groupForCategory(name, groupMap) === 'fixed';
  };

  const debits = detectRecurring(bankRecords, 'out', opts, to).filter(
    (d) => d.typical >= opts.commitmentFloor
  );
  const tw = twoWayKeys(bankRecords, opts, to);
  const committedKeys = new Set(debits.filter((d) => !tw.has(d.key)).map((d) => d.key));
  const isCommittedRow = (r) => {
    const stated = placed(r);
    return stated === null ? committedKeys.has(keyOf(r)) : stated;
  };

  let income = 0;
  for (const r of bankRecords) {
    if (isInternal(r) || ccyOf(r, base) !== base || dirOf(r) !== 'in') continue;
    if (!inPeriod(r, from, to)) continue;
    income += amtOf(r);
  }

  let committed = 0,
    flexibleBankOut = 0;
  const committedBankIds = [];
  const discretionaryBankIds = [];
  for (const r of bankRecords) {
    if (isInternal(r) || ccyOf(r, base) !== base || dirOf(r) !== 'out') continue;
    if (!inPeriod(r, from, to)) continue;
    if (isCommittedRow(r)) {
      committed += amtOf(r);
      if (r.id != null) committedBankIds.push(String(r.id));
    } else {
      flexibleBankOut += amtOf(r);
      if (r.id != null) discretionaryBankIds.push(String(r.id));
    }
  }

  let cardSpend = 0;
  const discretionaryCardIds = [];
  for (const r of cardRecords) {
    if (!cardIsSpend(r)) continue;
    if (!inPeriod(r, from, to)) continue;
    cardSpend += amtOf(r);
    if (r.id != null) discretionaryCardIds.push(String(r.id));
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
            isCommittedRow(r) &&
            ymOf(dateOf(r)) < ymOf(from)
        )
        .map((r) => ymOf(dateOf(r)))
    ),
  ];
  const priorCommitTotals = priorMonths.map((m) =>
    bankRecords
      .filter(
        (r) =>
          isCommittedRow(r) &&
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
    evidence: {
      committed: { bankIds: committedBankIds, cardIds: [] },
      discretionary: { bankIds: discretionaryBankIds, cardIds: discretionaryCardIds },
    },
    committedKeyCount: committedKeys.size,
    typicalCommitted,
    commitMove,
  };
}

export function buildCommittedFlexibleModel(result, cfg = {}) {
  const money = makeMoney(cfg);
  const moneyShort = makeMoneyShort(cfg, { millionDecimals: 2, millionSuffix: 'm' });
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
      amountText: moneyShort(r.committed),
      tag:
        r.commitMove === 'higher'
          ? 'higher than usual'
          : r.commitMove === 'lower'
            ? 'lower than usual'
            : 'usual',
      tone: r.commitMove === 'higher' ? 'watch' : 'neutral',
      detail:
        r.typicalCommitted > 0
          ? `${r.committedKeyCount} recurring payee${r.committedKeyCount === 1 ? '' : 's'} · typically about ${moneyShort(r.typicalCommitted)} a period.`
          : `${r.committedKeyCount} recurring payee${r.committedKeyCount === 1 ? '' : 's'}.`,
    },
    flexibleSpent: {
      label: 'Discretionary spending',
      amount: r.flexibleSpent,
      amountText: moneyShort(r.flexibleSpent),
      tag: `${moneyShort(r.breakdown.cardSpend)} card`,
      tone: 'neutral',
      detail: `${moneyShort(r.breakdown.cardSpend)} on the card · ${moneyShort(r.breakdown.otherFlexibleOut)} from cash, one-off payments and transfers. Includes money moved to savings or investments.`,
    },
    evidence: r.evidence,
  };
}
