import { categorise } from '../statements/categorise.js';
import { merchantRuleKeyFromDescription } from '../../settings/category-rules.js';

// Bank rows reach every screen without a category, while card rows are
// categorised on the way in. That asymmetry is not a design choice anywhere in
// this app - the bank ledger simply never called categorise(). This runs the
// SAME door with the bank profile, honouring the same personal rules and the
// same explicit overrides, so a person's rule works whichever statement the
// transaction came from.
//
// Additive: it only ever ADDS category fields to a copy of each row. Nothing
// existing is rewritten, so a consumer that never reads them is unaffected.
// A term can mean different things on different statements. "Insurance
// premium" on a card is the issuer's own fee; on a bank statement it is the
// person paying their insurer. The shared register can only hold one answer,
// so the ledger-specific correction is applied here, after the shared engine
// has spoken and only when it produced the category the route is written for.
// Nothing is invented: an unmatched row is left exactly as the engine left it.
export function routeForAccount(category, description, routes) {
  const list = Array.isArray(routes) ? routes : [];
  if (!list.length || !category) return category;
  const hay = String(description || '').toUpperCase();
  for (const rule of list) {
    const match = String((rule && rule.match) || '').toUpperCase();
    if (!match || !rule.to) continue;
    if (rule.from && rule.from !== category) continue;
    if (hay.includes(match)) return rule.to;
  }
  return category;
}

export function categoriseBankRows(records, compiled, options = {}) {
  const { fallback = 'Uncategorised', merchantOverrides = {}, resolver = null, routes = [] } = options;
  return (records || []).map((r) => {
    if (r.category) return r;
    const description = r.description || r.type || '';
    if (!description) return { ...r, category: fallback, categoryConfidence: 0 };
    if (r.categoryOverride) {
      return { ...r, category: r.categoryOverride, categoryConfidence: 1 };
    }
    const firstSeg = merchantRuleKeyFromDescription(description);
    if (merchantOverrides[firstSeg]) {
      return { ...r, category: merchantOverrides[firstSeg], categoryConfidence: 1 };
    }
    // NO refund hint on the bank ledger. categorise()'s last-resort rule reads
    // an unmatched credit as a refund, which is sound on a card statement where
    // a credit really is money coming back. On a bank statement a credit is
    // income or a transfer, and passing the hint through turned hundreds of
    // ordinary deposits into "Refund / Reversal". Bank credits are left
    // uncategorised instead, which is the honest answer for a deposit whose
    // wording names nothing.
    const c = categorise(description, compiled, fallback, resolver, null, 'bank');
    const routed = routeForAccount(c.category, description, routes);
    return {
      ...r,
      category: routed,
      categoryRouted: routed !== c.category ? c.category : null,
      categoryConfidence: c.confidence,
      categoryNeedsReview: !!c.needsReview,
    };
  });
}

export function bankCategoryCoverage(rows, fallback = 'Uncategorised') {
  const list = rows || [];
  const withCategory = list.filter((r) => r.category && r.category !== fallback).length;
  return {
    total: list.length,
    categorised: withCategory,
    share: list.length ? Math.round((withCategory / list.length) * 1000) / 10 : 0,
  };
}
