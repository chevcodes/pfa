import { roundMoney } from '../core/shared-helpers.js';
import { bankCashFlowDirection, isCardPaymentTransfer } from './bank-analysis.js';
import { isSetAside, withDesignations } from './set-aside.js';
import { splitsByTxnId, validateSplit } from './transaction-splits.js';
import { categoryMeta } from './category-flow.js';

export const CATEGORY_CONTRIBUTIONS_LABEL = 'Categorised purchases, net of refunds';

export function categoryContributions({ cardRows = [], bankRows = [], splits = [], cfg = {}, cardAccounts = [], designatedSetAside = [], from = '', to = '', source = 'all' } = {}) {
  const base = cfg.currency?.code || 'JMD';
  const special = cfg.special || {};
  const excluded = new Set([special.paymentCategory, special.refundCategory].filter(Boolean));
  const spending = (name) => (categoryMeta(cfg, name)?.flow || 'out') === 'out';
  const fees = new Set(special.feeCategories || []);
  const splitMap = splitsByTxnId(splits);
  const kinds = withDesignations(cfg.bankMovementKinds || {}, designatedSetAside);
  const purchases = [];
  const feeRows = [];
  const refunds = [];
  const inWindow = (date) => date && (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);
  const add = (collection, ledger, row, category, amount) => collection.push({ ledger, id: row.id, date: row.date || `${row.month}-01`, month: row.month || row.date.slice(0, 7), category, amount: roundMoney(amount), row });

  if (source !== 'bank') for (const row of cardRows) {
    if (!inWindow(row.date || `${row.month}-01`)) continue;
    if (row.kind === 'fee' || fees.has(row.category)) {
      add(feeRows, 'card', row, row.category, Math.abs(Number(row.amount) || 0));
      continue;
    }
    if (row.kind === 'refund') {
      const category = row.categoryOverride && row.category !== special.fallback && !excluded.has(row.category) && spending(row.category) ? row.category : null;
      add(category ? purchases : refunds, 'card', row, category || row.category, -(Math.abs(Number(row.amount) || 0)));
      continue;
    }
    if (row.kind !== 'spend' || excluded.has(row.category) || !spending(row.category)) continue;
    const split = splitMap.get(row.id);
    if (split && validateSplit(split, row.amount).ok) {
      for (const part of split.parts) if (spending(part.category)) add(purchases, 'card', row, part.category, Math.abs(Number(part.amount) || 0));
    } else add(purchases, 'card', row, row.category, Math.abs(Number(row.amount) || 0));
  }

  if (source !== 'card') for (const row of bankRows) {
    if (!inWindow(row.date) || (row.currency || base) !== base || row.internalTransfer || row.household || isCardPaymentTransfer(row, cardAccounts) || isSetAside(row, kinds)) continue;
    if (row.direction === 'in') {
      if (row.refund) {
        const category = row.categoryOverride && row.category !== special.fallback && !excluded.has(row.category) && spending(row.category) ? row.category : null;
        add(category ? purchases : refunds, 'bank', row, category || row.category, -(Math.abs(Number(row.amount) || 0)));
      }
      continue;
    }
    if (bankCashFlowDirection(row, base) !== 'spending') continue;
    if (fees.has(row.category)) {
      add(feeRows, 'bank', row, row.category, Math.abs(Number(row.amount) || 0));
      continue;
    }
    if (excluded.has(row.category) || !spending(row.category)) continue;
    add(purchases, 'bank', row, row.category, Math.abs(Number(row.amount) || 0));
  }

  const byCategory = new Map();
  for (const part of purchases) byCategory.set(part.category, roundMoney((byCategory.get(part.category) || 0) + part.amount));
  return {
    purchases,
    fees: feeRows,
    refunds,
    byCategory,
    total: roundMoney(purchases.reduce((sum, part) => sum + part.amount, 0)),
    feeTotal: roundMoney(feeRows.reduce((sum, part) => sum + part.amount, 0)),
    refundTotal: roundMoney(refunds.reduce((sum, part) => sum + part.amount, 0)),
  };
}
