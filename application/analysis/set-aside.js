import { monthKey, monthsBetween, roundMoney, amtOf, dirOf, ccyOf, dateOf } from '../core/shared-helpers.js';

function haystackOf(r) {
  return [
    r.description,
    r['Raw Description'],
    r.counterpartyLabel,
    r['Counterparty / Merchant'],
    r.Group,
    r.counterpartyKey,
    r.label,
    r.key,
    r.type,
    r.Type,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

const DESIGNATED_LABEL = 'Designated destination';

// The destinations a person has designated by hand, folded into the same rule
// list the config ships. A designation is a counterparty KEY taken from the
// person's own data at runtime, which is why no account of theirs is ever
// written into the config file.
export function withDesignations(kinds, designated) {
  const keys = (Array.isArray(designated) ? designated : []).filter(Boolean);
  if (!keys.length) return kinds || {};
  const existing = ((kinds || {}).setAsideRules || []).slice();
  for (const key of keys) {
    existing.push({ match: String(key).toUpperCase(), label: DESIGNATED_LABEL });
  }
  return { ...(kinds || {}), setAsideRules: existing };
}

// Every own-account destination money actually leaves for, with what a normal
// month sends there. This is the list a person picks from when saying which of
// their own accounts is savings.
export function ownDestinations(records, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const asOf = opts.asOf || null;
  const by = new Map();
  for (const r of records || []) {
    const d = dateOf(r);
    if (!d || (asOf && d > asOf)) continue;
    if (ccyOf(r, base) !== base) continue;
    if (dirOf(r) !== 'out') continue;
    if (r.internalTransfer !== true) continue;
    const key = r.counterpartyKey || '';
    if (!key) continue;
    const ym = monthKey(d);
    if (ym === 'unknown') continue;
    if (!by.has(key)) {
      by.set(key, { key, label: r.counterpartyLabel || key, total: 0, count: 0, months: new Set() });
    }
    const g = by.get(key);
    g.total = roundMoney(g.total + amtOf(r));
    g.count++;
    g.months.add(ym);
  }
  return [...by.values()]
    .map((g) => ({
      key: g.key,
      label: g.label,
      count: g.count,
      months: g.months.size,
      perMonth: roundMoney(g.total / Math.max(1, g.months.size)),
    }))
    .sort((a, b) => b.perMonth - a.perMonth);
}

export function setAsideRules(cfg) {
  const rules = (cfg && cfg.setAsideRules) || [];
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => ({
      match: String((rule && rule.match) || '').toUpperCase(),
      label: String((rule && rule.label) || ''),
      investment: !!(rule && rule.investment),
    }))
    .filter((rule) => rule.match);
}

export function setAsideRuleFor(r, cfg) {
  if (!r) return null;
  const rules = setAsideRules(cfg);
  if (!rules.length) return null;
  const hay = haystackOf(r);
  if (!hay) return null;
  for (const rule of rules) if (hay.includes(rule.match)) return rule;
  return null;
}

export function isSetAside(r, cfg) {
  return !!setAsideRuleFor(r, cfg);
}

export function setAsideMonthly(records, cfg, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const asOf = opts.asOf || null;
  const statementMonths =
    opts.statementContributions instanceof Map ? opts.statementContributions : null;
  const designatedOut = new Set();
  const byMonth = new Map();
  for (const r of records || []) {
    const d = dateOf(r);
    if (!d) continue;
    if (asOf && d > asOf) continue;
    if (ccyOf(r, base) !== base) continue;
    const dir = dirOf(r);
    if (dir !== 'in' && dir !== 'out') continue;
    const rule = setAsideRuleFor(r, cfg);
    if (!rule) continue;
    const ym = monthKey(d);
    if (ym === 'unknown') continue;
    if (statementMonths && dir === 'out' && statementMonths.has(ym)) {
      if (rule.investment) continue;
      if (rule.label === DESIGNATED_LABEL) designatedOut.add(ym);
    }
    if (!byMonth.has(ym)) byMonth.set(ym, { month: ym, moneyIn: 0, moneyOut: 0 });
    const g = byMonth.get(ym);
    if (dir === 'out') g.moneyOut = roundMoney(g.moneyOut + amtOf(r));
    else g.moneyIn = roundMoney(g.moneyIn + amtOf(r));
  }
  if (statementMonths) {
    const seen = new Set(observedMonths(records, opts));
    const lastMonth = asOf ? monthKey(asOf) : 'unknown';
    for (const [ym, amount] of statementMonths) {
      const value = roundMoney(Number(amount) || 0);
      if (!seen.has(ym) || (lastMonth !== 'unknown' && ym > lastMonth)) continue;
      if (!value && !byMonth.has(ym)) continue;
      if (!byMonth.has(ym)) byMonth.set(ym, { month: ym, moneyIn: 0, moneyOut: 0 });
      const g = byMonth.get(ym);
      g.moneyOut = roundMoney(g.moneyOut + value);
      g.fromStatement = value;
      if (designatedOut.has(ym)) g.designatedOut = true;
    }
  }
  return [...byMonth.values()]
    .map((g) => ({ ...g, net: roundMoney(g.moneyOut - g.moneyIn) }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function setAsideForeign(records, cfg, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const asOf = opts.asOf || null;
  const byCcy = new Map();
  for (const r of records || []) {
    const d = dateOf(r);
    if (!d) continue;
    if (asOf && d > asOf) continue;
    const ccy = ccyOf(r, base);
    if (ccy === base) continue;
    const dir = dirOf(r);
    if (dir !== 'in' && dir !== 'out') continue;
    if (!isSetAside(r, cfg)) continue;
    if (!byCcy.has(ccy)) byCcy.set(ccy, { currency: ccy, moneyIn: 0, moneyOut: 0 });
    const g = byCcy.get(ccy);
    if (dir === 'out') g.moneyOut = roundMoney(g.moneyOut + amtOf(r));
    else g.moneyIn = roundMoney(g.moneyIn + amtOf(r));
  }
  return [...byCcy.values()]
    .map((g) => ({ ...g, net: roundMoney(g.moneyOut - g.moneyIn) }))
    .filter((g) => g.net !== 0)
    .sort((a, b) => b.net - a.net);
}

export function observedMonths(records, opts = {}) {
  const base = opts.baseCurrency || 'JMD';
  const asOf = opts.asOf || null;
  const seen = new Set();
  for (const r of records || []) {
    const d = dateOf(r);
    if (!d) continue;
    if (asOf && d > asOf) continue;
    if (ccyOf(r, base) !== base) continue;
    const ym = monthKey(d);
    if (ym !== 'unknown') seen.add(ym);
  }
  return [...seen].sort();
}

export function setAsidePlan(records, cfg, opts = {}) {
  const months = setAsideMonthly(records, cfg, opts);
  const seen = observedMonths(records, opts);
  const latest = seen.length ? seen[seen.length - 1] : '';
  const period = opts.month || latest;
  const cutoff = opts.asOf ? monthKey(opts.asOf) : period;
  const completeMonths = seen.filter((m) => m < cutoff);
  const spanMonths = completeMonths.length
    ? monthsBetween(completeMonths[0], completeMonths[completeMonths.length - 1]) + 1
    : 0;
  const completeSetAside = months.filter((m) => m.month < cutoff);
  const totalNet = completeSetAside.reduce((sum, m) => roundMoney(sum + m.net), 0);
  const movedMonths = completeSetAside.filter((m) => m.net !== 0).length;
  const here = months.find((m) => m.month === period) || null;
  const moved = [...completeSetAside].reverse().find((m) => m.net > 0);
  return {
    period,
    plannedMonthly: spanMonths > 0 ? roundMoney(totalNet / spanMonths) : 0,
    actual: here ? here.net : 0,
    actualMoneyOut: here ? here.moneyOut : 0,
    actualMoneyIn: here ? here.moneyIn : 0,
    lumpy: spanMonths > 0 && movedMonths > 0 && movedMonths < spanMonths,
    lastMoved: moved ? moved.month : '',
    monthsUsed: spanMonths,
    monthsMoved: movedMonths,
    months,
    ...(opts.statementContributions instanceof Map
      ? {
          statement: {
            amount: roundMoney(completeSetAside.reduce((sum, m) => sum + (m.fromStatement || 0), 0)),
            months: completeSetAside
              .filter((m) => m.fromStatement > 0)
              .map((m) => ({ month: m.month, amount: m.fromStatement })),
            designatedOverlap: completeSetAside.some((m) => m.fromStatement != null && m.designatedOut),
          },
        }
      : {}),
  };
}

/* Which of a person's own accounts LOOK like savings destinations.
 *
 * A new plan opens with every account unticked, so "Savings & investments"
 * reads $0.00 against its target until someone finds this drawer - and the
 * plan meanwhile reports being tens of thousands "under" on saving. That is a
 * setup step wearing the costume of a failure.
 *
 * A destination is suggested when it behaves like somewhere money goes to sit:
 *   - it received transfers in at least `minMonths` distinct months, so it is a
 *     habit rather than a one-off, and
 *   - little comes back OUT of it relative to what went in. Money that returns
 *     to the everyday account was being parked, not saved.
 *
 * A credit card is never suggested: paying a card down is retiring a debt, not
 * setting money aside, and the two should not be silently equated.
 *
 * This SUGGESTS. Nothing here writes a choice - the caller pre-ticks these for
 * someone who has never chosen, marks them as suggestions, and leaves every one
 * of them changeable.
 *
 * Pure. Returns the subset of ownDestinations() keys worth suggesting.
 */
export function suggestedSetAsideDestinations(records, opts = {}) {
  const minMonths = opts.minMonths == null ? 3 : opts.minMonths;
  const returnRatio = opts.returnRatio == null ? 0.25 : opts.returnRatio;
  const cardKeys = new Set(opts.cardKeys || []);
  const dests = ownDestinations(records, opts);

  // How much came BACK from each counterparty (internal transfers inbound).
  const backIn = new Map();
  const base = opts.baseCurrency || 'JMD';
  for (const r of records || []) {
    if (ccyOf(r, base) !== base) continue;
    if (dirOf(r) !== 'in') continue;
    if (r.internalTransfer !== true) continue;
    const key = r.counterpartyKey || '';
    if (!key) continue;
    backIn.set(key, roundMoney((backIn.get(key) || 0) + amtOf(r)));
  }

  return dests.filter((d) => {
    if (cardKeys.has(d.key)) return false;
    // ownDestinations reports months as a COUNT and the amount as perMonth;
    // there is no running total on the shape, so it is reconstructed here
    // rather than assumed.
    const months = Number(d.months) || 0;
    if (months < minMonths) return false;
    const sentIn = roundMoney((Number(d.perMonth) || 0) * months);
    if (!(sentIn > 0)) return false;
    const back = backIn.get(d.key) || 0;
    return back / sentIn <= returnRatio;
  });
}
