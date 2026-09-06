import { transferSubject } from './confirmations.js';

export function resolveCategoryName(cfg, name) {
  const key = String(name || '').trim().toLowerCase();
  const match = (cfg?.categories || []).find((category) =>
    String(category.name || '').toLowerCase() === key ||
    (category.aliases || []).some((alias) => String(alias).toLowerCase() === key)
  );
  return match?.name || name;
}

export function categoryMeta(cfg, name) {
  const resolved = resolveCategoryName(cfg, name);
  return (cfg?.categories || []).find((category) => category.name === resolved) || null;
}

export function roleCategoryName(cfg, role) {
  return (cfg?.categories || []).find((category) => category.structuralRole === role)?.name || '';
}

export function spendCategoryNames(cfg) {
  return (cfg?.categories || [])
    .filter((category) => (category.flow || 'out') === 'out' && category.selectable !== false)
    .map((category) => category.name);
}

const categoryCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function sortCategoryNames(names, cfg) {
  const last = String(cfg?.special?.fallback || '').toLowerCase();
  const unique = [...new Set(names || [])];
  const isLast = (name) => !!last && String(name).toLowerCase() === last;
  return unique.sort((a, b) => (isLast(a) - isLast(b)) || categoryCollator.compare(String(a), String(b)));
}

export function creditCategoryNames(cfg) {
  return sortCategoryNames(
    (cfg?.categories || [])
      .filter((category) => category.flow === 'in' && category.selectable !== false)
      .map((category) => category.name),
    cfg
  );
}

export function categoryConfirmation(cfg, name, row) {
  const category = categoryMeta(cfg, name);
  if (!category || row?.direction !== 'in') return null;
  if (category.incomeClass === 'transfer')
    return category.structuralRole === 'internalTransfer'
      ? { inference: 'transfer', subject: transferSubject(row), answer: true }
      : { inference: 'transfer', subject: row.id, scope: 'transaction', answer: true };
  if (category.incomeClass === 'returned' || category.incomeClass === 'loan')
    return { inference: 'refund', subject: row.id, answer: false };
  if (row.cashDeposit && category.inIncomeTotal)
    return { inference: 'income', subject: row.id, answer: true };
  return null;
}

export function pickerCategoryNames(cfg, ledger, direction) {
  if (ledger === 'bank') return direction === 'in' ? creditCategoryNames(cfg) : sortCategoryNames(spendCategoryNames(cfg), cfg);
  const special = cfg?.special || {};
  return sortCategoryNames((cfg?.categories || [])
    .filter((category) => (category.flow || 'out') === 'out' ||
      category.name === special.paymentCategory || category.name === special.refundCategory)
    .map((category) => category.name), cfg);
}
