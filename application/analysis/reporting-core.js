/*
 * reporting.js  -  pure analysis, the shared on-screen render building blocks,
 * and the print-model orchestration for the Personal Finance Analyser.
 *
 * Pure and browser/Node-safe: no DOM is required except by the shared render
 * helpers and the print-model group, which take a `document` argument, so the
 * whole module is unit-testable. The printable-report renderers themselves now
 * live in report-render.js, the CSV writers in csv-export.js, and the encrypted
 * backup lock-and-key in history-codec.js; this file imports the report
 * renderers only to drive them, and holds none of those three itself. */
import {
  merchantRuleKeyFromDescription,
  merchantGroupKey,
  merchantBrandLabel,
  merchantBranch,
  merchantDisplayLabel,
} from '../../settings/category-rules.js';
import { categorise, smartTitle, merchantLabel } from '../statements/categorise.js';
import { transactionIdentity } from '../statements/read-statements.js';
import {
  analyseBankActivity,
  analyseCombinedOverview,
  analyseRollup,
  detectLargeBankOutflows,
  detectPeriodNewPayees,
} from '../analysis/bank-analysis.js';
import {
  roundMoney,
  capitaliseFirst,
  requireCtx,
  monthIndex,
  recurringStatus,
  monthKey,
  formatDisplayDate,
  medianDayOfMonth,
  addDaysIso,
  isoDay,
  detectSustainedRise,
} from '../core/shared-helpers.js';
import { renderReport, renderBankReport, renderOverviewReport } from '../output/report-render.js';
import { categoryTotalsWithSplits, splitsByTxnId, validateSplit } from './transaction-splits.js';

export const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Decimal rounding on the exact binary value (toFixed), which lines up with
// the source tool's Python round() for the supplied statements. Using the
// exact value avoids the float-multiply artefact that a *100 approach hits.
function round1(n) {
  return parseFloat(Number(n).toFixed(1));
}

export function buildRows(records, compiled, options = {}) {
  const {
    keepUpper = new Set(),
    smallWords = new Set(),
    fallback = 'Uncategorised',
    paymentCategory = 'Card Payment',
    refundCategory = 'Refund / Reversal',
    feeCategories = new Set(['Fees & Interest', 'Government & Tax']),
    merchantOverrides = {},
    merchants = null, // compiled MERCHANT LIST for GROUPING (merchantGroupKey/displayLabel)
    resolver = null, // the identity door for categorise() only
    brandRules = [], // compiled config brand rules (empty in shipped config); merchant intel wins first
  } = options;

  const rows = records.map((t) => {
    // needsReview and merchant were previously discarded here: categorise() already returns five fields - { category, confidence, merchant, needsReview } - but only category/confidence ever reached the row. That silently dropped a genuine, already-researched signal (e.g. WiPay: categoryConfidence "low", reviewRequired true, with a real reason recorded in jamaica-merchants.json) before any downstream code could ever see it. Both fields default to a deliberate "not flagged" state (false / null) on the two branches that never call categorise() at all - a person's own categoryOverride or an existing personal rule (merchantOverrides) is an explicit, confirmed decision, never an "unrecognised" or "needs review" case, so those two branches must not inherit a stale needsReview/merchant value from a previous iteration.
    let category,
      confidence,
      needsReview = false,
      merchant = null;
    const firstSeg = merchantRuleKeyFromDescription(t.description);
    if (t.categoryOverride) {
      category = t.categoryOverride;
      confidence = 1;
    } else if (merchantOverrides[firstSeg]) {
      category = merchantOverrides[firstSeg];
      confidence = 1;
    } else {
      // categorise's 2nd arg is the compiled CATEGORY RULES ([{name, re, headRe}]); its 4th arg is the compiled MERCHANT LIST ([{re, merchant, ...}]). Different shapes - do not swap them.
      const c = categorise(t.description, compiled, fallback, resolver, {
        isCredit: t.amount < 0,
        refundCategory,
      });
      category = c.category;
      confidence = c.confidence;
      needsReview = !!c.needsReview;
      merchant = c.merchant || null;
    }
    let kind;
    if (category === paymentCategory) kind = 'payment';
    else if (category === refundCategory) kind = 'refund';
    else if (feeCategories.has(category)) kind = 'fee';
    else kind = t.amount > 0 ? 'spend' : 'refund'; // // a credit sign alone can't distinguish refund from cashback/goodwill/dispute credit (industry-wide, not just here), so 'refund' is the only defensible catch-all kind
    // displayName is the ONE canonical, cleaned merchant/place name shown to a user on every transaction surface (Recent, the Explorer, Spent abroad, the printed report). It is computed IDENTICALLY to the Top Places label (merchantBrandLabel via the researched merchant list, falling back to the structural merchantLabel of the first segment), so a single row reads the same "Amazon" in the transaction list and in Top Places instead of the raw "Www.Amazon* 113-217508". Display-layer only: description and raw_description are unchanged, so categorisation, matching, grouping, totals and identity are all untouched. The full statement wording is still preserved verbatim on raw_description for the detail panel's "Original statement text" field.
    const description = smartTitle(t.description, keepUpper, smallWords);
    return {
      id: t.id || transactionIdentity(t),
      date: t.txn_date,
      month: monthKey(t.txn_date),
      description,
      displayName: merchantDisplayLabel(
        t.description,
        brandRules,
        merchants,
        keepUpper,
        smallWords
      ),
      // The SAME grouping key summarise()/analysePeriod() already derive on
      // demand whenever they group by merchant. Cached here so it can be
      // exported per row for the Detailed CSV; no total or grouping changes.
      merchantGroup: merchantGroupKey(description, brandRules, merchants) || '',
      raw_description: t.description,
      category,
      amount: roundMoney(t.amount),
      kind,
      source_file: t.source_file,
      confidence,
      foreign: t.foreign || '',
      overridden: !!t.categoryOverride,
      reviewDismissed: !!t.reviewDismissed,
      // Scotiabank card rows carry a reference number; NCB card rows and every
      // bank row do not - '' there.
      ref: t.ref || '',
      needsReview,
      merchant,
    };
  });
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

export function summarise(rows, options = {}) {
  const {
    keepUpper = new Set(),
    smallWords = new Set(),
    brandRules = [],
    merchants = null,
    fallback = 'Uncategorised',
    splits = [],
  } = options;
  const spend = rows.filter((r) => r.kind === 'spend');
  const totalSpend = spend.reduce((a, r) => a + r.amount, 0);
  const totalPayments = rows.filter((r) => r.kind === 'payment').reduce((a, r) => a - r.amount, 0);
  const totalRefunds = rows.filter((r) => r.kind === 'refund').reduce((a, r) => a - r.amount, 0);
  const totalFees = rows.filter((r) => r.kind === 'fee').reduce((a, r) => a + r.amount, 0);
  const months = [...new Set(rows.filter((r) => r.month !== 'unknown').map((r) => r.month))].sort();
  const nMonths = Math.max(months.length, 1);

  // Category totals apply any valid transaction splits: a split redistributes
  // ONE row's amount across categories WITHOUT changing the row, its count, or
  // the grand total (a valid split's parts sum to |amount| - the reconciliation
  // invariant proven in b3b_split_proof.mjs). totalSpend/byMonth/merchants are
  // left untouched on purpose: a split changes CATEGORY attribution only, never
  // which place the money went or how many transactions there were.
  const splitsByTxn = splitsByTxnId(splits);
  const { byCategory: byCatSplit } = categoryTotalsWithSplits(spend, splitsByTxn);
  const byCategory = Object.fromEntries(
    Object.entries(byCatSplit)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, roundMoney(v)])
  );

  const byMonthRaw = Object.fromEntries(months.map((m) => [m, 0]));
  for (const r of spend) if (r.month in byMonthRaw) byMonthRaw[r.month] += r.amount;
  const byMonth = Object.fromEntries(
    Object.entries(byMonthRaw).map(([k, v]) => [k, roundMoney(v)])
  );

  const byMerchant = {};
  for (const r of spend) {
    // Group by the additive brand key (star-token + trailing reference stripped, brand rules applied); display and totals are unchanged. The group keeps its first row's raw description so the label is produced by the one shared merchantDisplayLabel, not a hand-copied formula.
    const key = merchantGroupKey(r.description, brandRules, merchants) || 'UNKNOWN';
    if (!byMerchant[key])
      byMerchant[key] = {
        amount: 0,
        count: 0,
        category: r.category,
        descSrc: r.description,
      };
    byMerchant[key].amount += r.amount;
    byMerchant[key].count += 1;
  }
  const topMerchants = Object.values(byMerchant)
    .map((v) => ({
      merchant: merchantDisplayLabel(v.descSrc, brandRules, merchants, keepUpper, smallWords),
      amount: roundMoney(v.amount),
      count: v.count,
      category: v.category,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);

  const n_uncategorised_spend = spend.filter((r) => r.category === fallback).length;
  const coverage = (100 * (spend.length - n_uncategorised_spend)) / Math.max(spend.length, 1);

  return {
    total_spend: roundMoney(totalSpend),
    total_payments: roundMoney(totalPayments),
    total_refunds: roundMoney(totalRefunds),
    total_fees: roundMoney(totalFees),
    n_transactions: rows.length,
    n_spend: spend.length,
    n_months: nMonths,
    avg_monthly_spend: roundMoney(totalSpend / nMonths),
    months,
    by_category: byCategory,
    by_month: byMonth,
    top_merchants: topMerchants,
    coverage_pct: round1(coverage),
    n_uncategorised_spend,
  };
}

/* ===========================================================================
 * 6) Insights  (plain-language observations for the top of the dashboard)
 * ======================================================================== */

/* The "new this month" merchants, as a reusable pure function (Round 1, A2). seenBefore is the set of first-segment keys (r.description.split(',')[0].trim().toUpperCase()) over spend rows in months earlier than `month`. Any spend row in `month` whose key is not in that set is a new merchant, and its amount is aggregated by key. Returns [{ key, label, amount }] sorted by amount desc, where label is the original (untidied) first segment of a matching row. Empty array when none. Pure. */
export function detectNewMerchants(rows, month, brandRules = [], merchants = null) {
  const spendRows = (rows || []).filter((r) => r.kind === 'spend');
  const keyOf = (r) => merchantGroupKey(r.description, brandRules, merchants);
  const seenBefore = new Set(spendRows.filter((r) => r.month < month).map(keyOf));
  const amountByKey = {};
  const labelByKey = {};
  for (const r of spendRows.filter((r) => r.month === month)) {
    const key = keyOf(r);
    if (seenBefore.has(key)) continue;
    amountByKey[key] = (amountByKey[key] || 0) + r.amount;
    // Display label only: tidy the first-segment token ("Amazon Mktpl*..." ->
    // "Amazon"). The key (keyOf) and dedup above are untouched, so grouping and
    // identity are unaffected. Empty sets still strip the "*..."/MKTPL/trailing-
    // digit junk without needing config here.
    if (!(key in labelByKey))
      labelByKey[key] = merchantDisplayLabel(r.description, brandRules, merchants);
  }
  return Object.keys(amountByKey)
    .map((key) => ({ key, label: labelByKey[key], amount: amountByKey[key] }))
    .sort((a, b) => b.amount - a.amount);
}

/* The merchants that FIRST appeared inside the current period (Bug 1 fix). detectNewMerchants above compares one month against everything before it, which cannot answer "new in this period" honestly on an all-time or first-ever view: there is no month strictly before the earliest one, so every merchant would read as new. This function instead asks, for each merchant group, when it FIRST appeared across the WHOLE rows array, and only counts it as new when that true first-ever month falls inside the period (period.from to period.to inclusive). Returns [] immediately when period.prevFrom is falsy. That is the all-time / first-period case with no genuine prior period to compare against, and the correct behaviour is to surface nothing rather than everything. Groups by merchantGroupKey (the same key the rest of the analytics use). Sums each qualifying merchant's amount within the period, and resolves its display label via merchantBrandLabel, falling back to merchantLabel when no brand label exists. *
 * Returns [{ key, label, amount }] sorted by amount descending. Pure. */
export function detectPeriodNewMerchants(rows, period, brandRules = [], merchants = null) {
  if (!period || !period.prevFrom) return [];
  const spendRows = (rows || []).filter((r) => r.kind === 'spend');
  const keyOf = (r) => merchantGroupKey(r.description, brandRules, merchants);
  // The true first-ever occurrence month for each merchant group, across ALL
  // history, not just the period.
  const firstMonth = {};
  for (const r of spendRows) {
    const key = keyOf(r);
    if (!(key in firstMonth) || r.month < firstMonth[key]) firstMonth[key] = r.month;
  }
  const amountByKey = {};
  const labelByKey = {};
  for (const r of spendRows) {
    if (r.month < period.from || r.month > period.to) continue;
    const key = keyOf(r);
    // Only a merchant whose first-ever month is inside this period is genuinely new.
    if (firstMonth[key] < period.from || firstMonth[key] > period.to) continue;
    amountByKey[key] = (amountByKey[key] || 0) + r.amount;
    if (!(key in labelByKey))
      labelByKey[key] = merchantDisplayLabel(r.description, brandRules, merchants);
  }
  return Object.keys(amountByKey)
    .map((key) => ({ key, label: labelByKey[key], amount: amountByKey[key] }))
    .sort((a, b) => b.amount - a.amount);
}

// The ONE place "is this transaction genuinely unrecognised" is decided. Previously this fact was independently re-derived in two places with two slightly different expressions of it: attentionItems() checked only `r.confidence === 0`, while buildUnknownMerchantsCSV() (added later, same file) checked `r.confidence === 0 && r.category === fallback`. In categorise()'s current implementation those two conditions happen to be equivalent - confidence 0 is set in exactly one branch, the final `return { category: fallback, confidence: 0 }` - but that equivalence was implicit and unenforced: nothing stopped a future change to categorise() from setting confidence 0 anywhere else without also setting category to fallback, at which point the two call sites would silently disagree. This is deliberately the STRICT case: a KNOWN merchant categorise() flagged needsReview is NOT unrecognised - the app knows exactly what it is, it only could not resolve a spending category from the descriptor alone - so needsReview is deliberately NOT read here.
export function isUnrecognised(row, fallback = 'Uncategorised') {
  return row.confidence === 0 && row.category === fallback;
}

// The ONE place the class-driven "why is this worth a second look" sentence is generated - consolidating what Round 2 wrote inline inside attentionItems(). Now that a second consumer needs the identical wording (the transaction detail panel, cards-render.js's toggleDetail), inlining it twice would recreate the exact duplication this session has spent several rounds removing. Two classes, both fully generic - no merchant-specific template, no jargon, no confidence number: isUnrecognised(row) means nothing matched at all, so the honest statement is that the app genuinely does not know what this is; row.needsReview means categorise() DID resolve something (a real merchant match it could not confidently categorise, e.g. a payment processor whose underlying business the descriptor never reveals; or the refund-fallback branch, which knows the money came back but not from whom) - branches on whether row.merchant is present, since that is the one fact that actually differs between those two needsReview cases, rather than inventing a third bucket to describe them. Returns null when neither applies, so a caller can skip rendering entirely rather than showing an empty or placeholder line.
export function reviewReasonText(
  row,
  fallback = 'Uncategorised',
  brandRules = [],
  merchants = null
) {
  if (isUnrecognised(row, fallback)) {
    return `We're not sure what this is: ${merchantDisplayLabel(row.description, brandRules, merchants)}. Is this right?`;
  }
  if (row.needsReview) {
    return row.merchant
      ? `We know this is ${row.merchant}, but we're not sure how to categorise it.`
      : `We're not fully sure about this one - worth a quick check.`;
  }
  return null;
}

export function attentionItems(rows, cfg = {}, brandRules = [], merchants = null) {
  // D-audit item 3. The plain arithmetic MEAN of a merchant's other charges is fragile: a single large past charge inflates it (masking the next real outlier), and a peer set of two makes the "average" almost meaningless. The standard robust upgrade (fraud/anomaly-detection literature: median + MAD, Iglewicz & Hoaglin modified z-score) is used instead - the median and the Median Absolute Deviation are barely moved by one unusually large charge. A charge is flagged only when its robust z-score exceeds largeChargeZ AND it clears the flat JMD floor (kept: on a single-currency Jamaican card a hard floor is the right "is this even worth a look" gate). The old multiple-of-the-mean rule is kept as a fallback ONLY when MAD is zero (every peer charge identical), so a genuinely unusual amount is still caught where a robust spread cannot be formed. Verified on the real card export: this keeps genuine outliers even with few peers that a naive "require >=3 peers" rule would have wrongly dropped, while shedding a marginal mean-only flag that was not actually unusual for that payee.
  const t = Object.assign(
    {
      largeChargeMultiple: 2.5,
      largeChargeMin: 10000,
      largeChargeZ: 3.5, // modified-z threshold (Iglewicz & Hoaglin's standard cut)
      largeChargeMinPeers: 2, // need at least this many prior charges to judge "usual"
    },
    cfg.insights || {}
  );
  // Reads the SAME config path FALLBACK()/buildRows() read (state.cfg.special.
  // fallback), so "unrecognised" means the exact same category name everywhere
  // in the app. cfg.special is absent when this runs via reviewItems()'s empty
  // {} call, so the shipped default 'Uncategorised' is used there, matching
  // isUnrecognised's own default and config.json's actual configured value.
  const fallback = (cfg.special && cfg.special.fallback) || 'Uncategorised';
  const med = (a) => {
    const s = a.slice().sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const byMerchant = {};
  const keyByRow = new Map();
  for (const r of rows.filter((r) => r.kind === 'spend')) {
    const k = merchantGroupKey(r.description, brandRules, merchants);
    keyByRow.set(r, k);
    (byMerchant[k] = byMerchant[k] || []).push(r);
  }
  const flags = [];
  for (const r of rows.filter((r) => r.kind === 'spend' && !r.reviewDismissed)) {
    const k = keyByRow.get(r);
    const peers = byMerchant[k];
    const others = peers.filter((p) => p.id !== r.id).map((p) => p.amount);
    if (others.length >= t.largeChargeMinPeers && r.amount >= t.largeChargeMin) {
      const centre = med(others);
      const mad = med(others.map((x) => Math.abs(x - centre)));
      // Two guards, both required, so a charge is flagged only when it is BOTH
      // statistically unusual and materially larger than normal for that payee:
      //  1) robust z-score (0.6745*(x-median)/MAD) over the largeChargeZ cut, the
      //     Iglewicz-Hoaglin modified z. When MAD is 0 (identical peers) the score
      //     is infinite, so this reduces to guard 2 alone;
      //  2) at least largeChargeMultiple x the median. This defends the MAD->0
      //     degenerate case: a payee whose charges cluster tightly (e.g. an
      //     a payee whose charges cluster tightly) has a tiny MAD, so a trivially higher
      //     $29k would otherwise score just over the z-cut - guard 2 stops that,
      //     while a genuine jump (a genuine jump far above the payee's median) sails
      //     through both. Verified against the real card export.
      const zOk = mad > 0 ? (0.6745 * (r.amount - centre)) / mad >= t.largeChargeZ : true;
      const multipleOk = centre > 0 && r.amount >= centre * t.largeChargeMultiple;
      if (zOk && multipleOk) {
        flags.push({
          id: r.id,
          type: 'large',
          text: `This ${merchantDisplayLabel(r.description, brandRules, merchants)} charge is larger than usual - worth a look?`,
          row: r,
        });
      }
    }
    // Two genuinely different situations were previously flagged with the
    // SAME generic text ("We weren't sure how to file X"), which quietly
    // overclaimed in the second case below: when isUnrecognised is true, the
    // app truly has no idea what this is - the honest thing to say is exactly
    // that. When it is false but r.needsReview is true, the app DOES know the
    // counterparty (categorise() resolved a real merchant match, e.g. a
    // payment processor whose underlying business the descriptor never
    // reveals) - only the CATEGORY is uncertain, so saying "we're not sure
    // what this is" there would understate what the app actually knows. Both
    // sentences are still fully generic and class-driven (isUnrecognised /
    // needsReview), never a per-merchant template - r.merchant (added in
    // Round 1) supplies the name for the second case with no merchant-specific
    // wording anywhere in this function.
    // Reads the SAME shared function the detail panel now reads (see
    // reviewReasonText above), so the dashboard's insight list and a
    // person's own tap-to-expand view can never quietly drift into two
    // different explanations for the identical fact.
    const reviewText = reviewReasonText(r, fallback, brandRules, merchants);
    if (reviewText) {
      flags.push({ id: r.id, type: 'uncertain', text: reviewText, row: r });
    }
  }
  return flags;
}

/* Assemble the monthly review list (Round 1, A2b). Assembles only; it recomputes
 * nothing. Large charges come from attentionItems over ALL rows (it needs full
 * history to judge "larger than usual"), then narrowed to type 'large' whose row
 * sits in `month`. New merchants come from detectNewMerchants(rows, month).
 * Unreconciled statements are the card/bank statement records not marked
 * reconciled. Returns ONE flat array of
 * { kind:'unreconciled'|'large'|'new', id?, label, detail }, ordered by severity
 * so the item most likely to be real money is never below noise: all
 * unreconciled first, then large, then new. Empty array when nothing qualifies.
 * Pure. */
export function reviewItems({
  rows,
  month,
  cardStatements,
  bankStatements,
  brandRules = [],
  merchants = null,
} = {}) {
  const allRows = rows || [];
  const out = [];
  const addUnreconciled = (list, source) => {
    for (const s of list || []) {
      if (s.reconciled) continue;
      out.push({
        kind: 'unreconciled',
        id: s.hash != null ? s.hash : undefined,
        label: `${source} statement not reconciled`,
        detail: [s.account ? `account ${s.account}` : '', s.period || '', s.reconNote || '']
          .filter(Boolean)
          .join(' · '),
      });
    }
  };
  addUnreconciled(cardStatements, 'Card');
  addUnreconciled(bankStatements, 'Bank');
  for (const it of attentionItems(allRows, {}, brandRules, merchants)) {
    if (it.type === 'large' && it.row && it.row.month === month) {
      out.push({
        kind: 'large',
        id: it.id,
        label: merchantDisplayLabel(it.row.description, brandRules, merchants),
        detail: it.text,
      });
    } else if (it.type === 'uncertain' && it.row && it.row.month === month) {
      out.push({
        kind: 'uncertain',
        id: it.id,
        label: merchantDisplayLabel(it.row.description, brandRules, merchants),
        detail: it.text,
      });
    }
  }

  for (const nm of detectNewMerchants(allRows, month, brandRules, merchants)) {
    out.push({
      kind: 'new',
      id: nm.key,
      label: nm.label,
      detail: 'New place this month',
    });
  }
  return out;
}

/* Ordering for the category picker (pure, presentation-only).
 * Returns every category exactly once, ordered so the quickest corrections are
 * nearest the top: the row's current category first, then the categories that
 * already appear in the current data (so common fixes are one or two taps),
 * then everything else in its configured order. This adds no stored state - it
 * is only an ordering, derived fresh from what is on screen. It never drops or
 * duplicates a category. */
export function orderCategoriesForPicker(allCategories, currentCategory, presentCategories = []) {
  const seen = new Set();
  const out = [];
  const push = (c) => {
    if (c != null && allCategories.includes(c) && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  };
  push(currentCategory);
  for (const c of presentCategories) push(c);
  for (const c of allCategories) push(c);
  return out;
}

/* Cap a row list for the printable report (pure, presentation-only). Returns
 * the first `cap` rows to render plus how many were held back, so a very long
 * period cannot spill an unbounded transaction table across dozens of printed
 * pages. It only slices a prefix - it never reorders, drops from the middle,
 * or duplicates - so `shown` followed by the `hidden` remainder always equals
 * the input, in the same order. A non-positive/omitted cap means "show all".
 * This mirrors the on-screen explorer's row-cap concept (TX_PAGE) and touches
 * no total, count, sort or filter. */
export function capForPrint(rows, cap) {
  const all = Array.isArray(rows) ? rows : [];
  if (!(cap > 0) || all.length <= cap) return { shown: all.slice(), hidden: 0 };
  return { shown: all.slice(0, cap), hidden: all.length - cap };
}

// Progressive-disclosure list helper, shared by every "show the first N,
// reveal the rest on request" list in both the Cards and Accounts render
// trees (categories, top places, regular payments, where money went, grouped
// by payee, imported statements, review items). NN/g's guidance is to show
// only the most important items up front and defer the rest to an explicit
// request, rather than either dumping everything on screen or silently
// truncating with no way to see what's hidden - the two failure modes found
// across this app's lists before this helper existed. Miller's chunking
// research (~7±2 items in working memory) is why 5 is the shipped default,
// comfortably under that limit.
//
// `items` is the FULL list (already sorted by relevance/amount by the
// caller); `renderItem(item)` returns one real DOM node per item; `parent` is
// the element the items (and the toggle) are appended into directly - a
// plain list div, or a <tbody>, so this works for both card-style rows and
// table rows without a second implementation. `opts.initial` (default 5)
// controls how many show before the toggle. `opts.wrapToggle(button)` lets a
// caller wrap the toggle button in whatever markup its list shape needs (a
// table needs a <tr><td colspan></td></tr>; a plain list just needs the
// button itself inside the existing .show-more treatment already used
// elsewhere in this app for exactly this purpose).
export function appendExpandable(el, parent, items, renderItem, opts = {}) {
  const initial = opts.initial || 5;
  const step = opts.step || 3;
  const shown = items.slice(0, initial);
  const rest = items.slice(initial);
  for (const item of shown) parent.append(renderItem(item));
  if (!rest.length) return;
  const restNodes = rest.map(renderItem);
  let visible = 0;
  const moreBtn = el('button', { class: 'btn sm ghost' }, 'See more');
  const allBtn = el('button', { class: 'btn sm' }, 'See all');
  const hideBtn = el('button', { class: 'btn sm ghost' }, 'Hide all');
  const controls = el('div', { class: 'show-more show-more-multi' }, moreBtn, allBtn, hideBtn);
  const anchor = opts.wrapToggle ? opts.wrapToggle(controls) : controls;
  const sync = () => {
    const remaining = rest.length - visible;
    moreBtn.hidden = remaining <= 0;
    allBtn.hidden = remaining <= 0;
    hideBtn.hidden = visible <= 0;
  };
  const reveal = (n) => {
    const end = Math.min(visible + n, restNodes.length);
    for (let i = visible; i < end; i++) anchor.before(restNodes[i]);
    visible = end;
    sync();
  };
  const collapse = () => {
    for (let i = 0; i < visible; i++) restNodes[i].remove();
    visible = 0;
    sync();
    // Removing many revealed rows shifts everything below the toggle upward
    // by however much was removed, with nothing previously correcting for
    // it - a disorienting jump if the toggle row itself had scrolled out of
    // view above the fold before "Hide all" was clicked. Brings it back into
    // view, honouring the same reduced-motion preference every other scroll
    // in this app already respects.
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    anchor.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  };
  moreBtn.addEventListener('click', () => reveal(step));
  allBtn.addEventListener('click', () => {
    if (opts.onExpandChange) opts.onExpandChange(true);
    else reveal(restNodes.length);
  });
  hideBtn.addEventListener('click', () => {
    if (opts.onExpandChange) opts.onExpandChange(false);
    else collapse();
  });
  sync();
  parent.append(anchor);
  if (opts.expandAll) reveal(restNodes.length);
}

// Shared low-level renderer for the small "coloured dot + text label" type
// indicator used by both ledgers' transaction tables (cards-render.js's
// kindTag, accounts-render.js's flow column). Previously accounts-render.js
// hand-built the same .ktag/.kdot/.klabel markup inline instead of calling
// the equivalent component cards-render.js already exports, AND reused
// Cards-domain class names (k-fee, k-refund) for bank-only concepts
// (household transfers, income-excluded deposits) that have nothing to do
// with fees or refunds - a semantic leak on top of the duplication. This
// takes only the already-resolved label and CSS class, so each caller
// supplies its own domain-appropriate mapping while sharing one DOM shape.
export function renderKindTag(el, label, cls) {
  return el(
    'span',
    { class: 'ktag ' + cls },
    el('span', { class: 'kdot' }),
    el('span', { class: 'klabel' }, label)
  );
}
export const SHARE_PALETTE = [
  '#2f6fb0',
  '#3f9d6b',
  '#c98a1b',
  '#a05fb4',
  '#4aa3a3',
  '#c65b7c',
  '#6b8e3d',
  '#b5642e',
  '#5a78c2',
  '#8a8f2f',
  '#3e8fb0',
  '#9a5aa8',
  '#c0603f',
  '#557f9e',
];
// Cash inflow is one green family and Cash outflow is one orange family, matching the
// app's colour language (green = toward you, warm = away). Each is a single-hue
// ramp stepping from light to deep, so every slice in a bar reads unmistakably
// as "in" (green) or "out" (orange) while staying distinct from its neighbours
// by lightness alone - no stray blue, rose or purple breaking the family.
export const MONEY_IN_PALETTE = ['#5cbf8c', '#3aa06c', '#2a8656', '#1e6d44', '#155835', '#0e4327'];
export const MONEY_OUT_PALETTE = ['#f2a35a', '#e5852f', '#d16f22', '#b45a18', '#954712', '#78380d'];
export function renderShareBar(el, opts = {}) {
  const segments = (opts.segments || []).filter((s) => s && Number(s.amount) > 0);
  let total = segments.reduce((sum, s) => sum + Number(s.amount), 0);
  if (!segments.length || total <= 0) return null;
  const parts = segments.slice();
  const shownTotal = total;
  const grandTotal =
    opts.grandTotal != null && opts.grandTotal > shownTotal ? opts.grandTotal : shownTotal;
  const remainder = grandTotal - shownTotal;
  if (remainder > 0) {
    parts.push({
      colour: opts.remainderColour || 'var(--dim)',
      amount: remainder,
      label: opts.remainderLabel || 'Everything else',
    });
    total = grandTotal;
  }
  // The money-direction colour language, chosen in ONE place. A caller states
  // which way the money moves (direction:'in' or 'out') and this picks the
  // matching family - Cash inflow in the cool/green family, Cash outflow in the warm
  // family - so every "came in" bar and every "went out" bar across the whole
  // product is coloured the same way, without each caller importing or choosing
  // a palette of its own and risking drift. An explicit opts.palette still wins
  // as an escape hatch. When neither is given the bar keeps the collision-
  // avoiding behaviour below: any slice whose colour repeats an earlier one is
  // bumped to the next free SHARE_PALETTE entry, which stops two adjacent slices
  // sharing a hue.
  const directionPalette =
    opts.direction === 'in'
      ? MONEY_IN_PALETTE
      : opts.direction === 'out'
        ? MONEY_OUT_PALETTE
        : null;
  const paletteByPosition =
    Array.isArray(opts.palette) && opts.palette.length ? opts.palette : directionPalette;
  const leadCount = remainder > 0 ? parts.length - 1 : parts.length;
  const used = new Set();
  for (let i = 0; i < leadCount; i++) {
    if (paletteByPosition) {
      const c = paletteByPosition[i % paletteByPosition.length];
      parts[i] = { ...parts[i], colour: c };
      used.add(c);
      continue;
    }
    let c = parts[i].colour;
    if (used.has(c)) {
      const free = SHARE_PALETTE.find((p) => !used.has(p));
      if (free) {
        c = free;
        parts[i] = { ...parts[i], colour: c };
      }
    }
    used.add(c);
  }
  const track = el('div', {
    class: 'share-bar-track',
    role: 'img',
    'aria-label': opts.ariaLabel || 'Share of the total',
  });
  const escKey = (k) =>
    typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(k)
      : String(k).replace(/["\\\]]/g, '\\$&');
  const setHot = (node, key, on) => {
    node.classList.toggle('anchor-hot', on);
    if (key == null) return;
    const scope = node.closest('.share-bar');
    const root = scope && scope.parentNode ? scope.parentNode : document;
    root.querySelectorAll('[data-anchor="' + escKey(String(key)) + '"]').forEach((n) => {
      if (n !== node) n.classList.toggle('anchor-hot', on);
    });
  };
  for (const s of parts) {
    const pct = (Number(s.amount) / total) * 100;
    const interactive = !!(s.key != null || s.onActivate);
    const attrs = {
      class: 'share-bar-seg' + (interactive ? ' anchorable' : ''),
      style: `width:${pct}%;background:${s.colour}`,
      title: s.label || null,
    };
    if (s.key != null) attrs.dataset = { anchor: String(s.key) };
    if (interactive) attrs['aria-label'] = s.label || null;
    const seg = el(interactive ? 'button' : 'span', attrs);
    if (interactive) {
      let lp = null,
        held = false;
      seg.addEventListener('pointerenter', () => setHot(seg, s.key, true));
      seg.addEventListener('pointerleave', () => setHot(seg, s.key, false));
      seg.addEventListener('pointerdown', () => {
        held = false;
        lp = setTimeout(() => {
          held = true;
          setHot(seg, s.key, true);
        }, 350);
      });
      const end = () => {
        clearTimeout(lp);
        if (held) setTimeout(() => setHot(seg, s.key, false), 1200);
      };
      seg.addEventListener('pointerup', end);
      seg.addEventListener('pointercancel', end);
      if (s.onActivate)
        seg.addEventListener('click', (e) => {
          if (held) {
            e.preventDefault();
            return;
          }
          s.onActivate();
        });
    }
    track.append(seg);
  }
  const bar = el('div', { class: 'share-bar' }, track);
  if (opts.centerValue != null || opts.centerLabel != null) {
    const cap = el('div', { class: 'share-bar-cap muted small' });
    if (opts.centerValue != null)
      cap.append(el('span', { class: 'share-bar-total' }, opts.centerValue));
    if (opts.centerLabel != null) cap.append(el('span', {}, ' ' + opts.centerLabel));
    bar.append(cap);
  }
  return bar;
}

export function renderFlowArrow(el, icons, direction) {
  const isIn = direction === 'in';
  return el('span', {
    class: 'flow-arrow ' + (isIn ? 'in' : 'out'),
    'aria-hidden': 'true',
    html: isIn ? icons.up() : icons.down(),
  });
}

// The ONE shared "active filters" chip row, used by Cards' All-transactions
// explorer and Accounts' Transactions card. Previously each ledger built this
// independently: Cards as a proper wrapping chip row, Accounts as concatenated
// title text plus one button per active facet with no wrap behaviour - so two
// simultaneous Accounts facets (an account + a payee) plus its Show/Hide button
// overflowed the header on a narrow phone. Chips wrap by construction (.chips
// is already flex-wrap), so any future combination of facets, on either tab,
// degrades safely on any width instead of clipping. items is
// [{ label, onClear }]; returns a real .chips node, or null when nothing is
// active so the caller can omit an empty row entirely.
export function renderFilterChips(el, iconX, items, onClearAll) {
  if (!items.length) return null;
  const chips = items.map(({ label, onClear }) =>
    el(
      'button',
      { class: 'chip removable', onclick: onClear },
      label,
      el('span', { class: 'chip-x', html: iconX() })
    )
  );
  return el(
    'div',
    { class: 'chips' },
    el('span', { class: 'muted small' }, 'Filters:'),
    ...chips,
    el('button', { class: 'linkbtn', onclick: onClearAll }, 'Clear all')
  );
}

// One shared fact chip for the hero facts row, replacing the two near-identical
// hand-rolled builders that had drifted apart: Cards' `fact(value, label,
// onClick, colour, cls)` and Accounts' `bankFact(label, value, cls)` (note the
// argument order even disagreed). Takes a pure-data fact and renders the exact
// same DOM both produced, so a fact reads and behaves identically on every tab.
function heroFact(el, f) {
  const attrs = {
    class: 'fact' + (f.onClick ? ' clickable' : '') + (f.tone ? ' ' + f.tone : ''),
  };
  if (f.onClick) attrs.onclick = f.onClick;
  const v = el(
    'div',
    { class: 'fact-value' },
    f.colour ? el('span', { class: 'swatch', style: `background:${f.colour}` }) : null,
    el('span', {}, f.value)
  );
  return el(f.onClick ? 'button' : 'div', attrs, v, el('div', { class: 'fact-label' }, f.label));
}

// The ONE shared top-of-tab hero builder. Previously each tab hand-built its
// own hero inline (Cards' renderHero, the Accounts block inside renderAccounts,
// the Overview block inside renderOverview), in three different orders - which
// is exactly how the Overview hero came to render its "what needs tidying"
// chore block ABOVE net cash flow, inverting the dashboard hierarchy (status/
// headline first, chores and detail after). This builder emits ONE fixed order
// that encodes the Level 1-4 hierarchy as code structure, so no tab can put
// chores above the headline again:
//   1. eyebrow + title (+ optional caution pill)
//   2. verdict sub-headline (optional)
//   3. hero-body: the ONE lead figure (+ any comparison extras) and the facts row
//   4. attention line - the single, calm "what could use a look" line, ALWAYS
//      below the numbers, never above
//   5. note - a muted caveat
// The spec is plain data (functions in onClick are fine - it is never
// serialised). Interactive/prebuilt nodes (lead.extra, attention, note) are
// built by the caller, which owns the closures; the builder owns only WHERE
// each slot goes, which is what enforces the hierarchy.
export function buildHeroSection(el, icon, iconInfo, spec) {
  const sec = el('section', {
    class: 'card hero' + (spec.verdict ? ' verdict' : ''),
  });
  const head = el(
    'div',
    { class: 'hero-head' },
    el(
      'div',
      {},
      el('div', { class: 'hero-eyebrow' }, spec.eyebrow),
      el('h2', { class: 'hero-title' }, spec.title)
    )
  );
  if (spec.pill)
    head.append(
      el(
        'span',
        { class: 'pill caution', title: spec.pill.title },
        icon(iconInfo()),
        spec.pill.text
      )
    );
  sec.append(head);
  if (spec.pill && spec.pill.subline)
    sec.append(el('p', { class: 'muted small mobile-context' }, spec.pill.subline));
  if (spec.verdict) {
    sec.append(
      el(
        'div',
        { class: 'hero-verdict' },
        el('span', { class: `attn-dot ${spec.verdict.tone}` }),
        ' ',
        spec.verdict.text
      )
    );
    if (spec.verdict.comparison) sec.append(el('p', { class: 'muted' }, spec.verdict.comparison));
  }
  const figure = el(
    'div',
    { class: 'hero-figure' },
    el('div', { class: 'hero-amount' }, spec.lead.amount),
    el('div', { class: 'hero-amount-label' }, spec.lead.label),
    ...(spec.lead.extra || []).filter(Boolean)
  );
  const facts = el(
    'div',
    { class: 'hero-facts' },
    ...spec.facts.filter(Boolean).map((f) => heroFact(el, f))
  );
  sec.append(el('div', { class: 'hero-body' }, figure, facts));
  if (spec.attention) sec.append(spec.attention);
  if (spec.note) sec.append(spec.note);
  return sec;
}

// The ONE shared "insights" card, replacing three byte-identical copies
// (cards-render's renderInsightCards, accounts-render's renderBankInsightsCard,
// app.js's renderOverviewInsightsCard) that only differed in which insight
// array and empty-text they carried. One concept ("what's new or unusual")
// now renders one way everywhere. Each insight is { tone, icon (html string),
// text, onClick }, the shape all three insight engines already produce.
export function renderInsightList(el, icon, opts) {
  const { title, iconBulb, iconChevron, insights, emptyText } = opts;
  const sec = el('section', { class: 'card insights' });
  sec.append(
    el('div', { class: 'card-head' }, el('h3', { class: 'card-title' }, icon(iconBulb()), title))
  );
  if (!insights.length) {
    sec.append(el('p', { class: 'muted pad' }, emptyText));
    return sec;
  }
  const list = el('div', { class: 'insight-list' });
  for (const i of insights)
    list.append(
      el(
        'button',
        { class: 'insight tone-' + i.tone, onclick: i.onClick },
        el('span', { class: 'insight-icon', html: i.icon }),
        el('span', { class: 'insight-text' }, i.text),
        el('span', { class: 'insight-go', html: iconChevron() })
      )
    );
  sec.append(list);
  return sec;
}

// The ONE shared standalone "needs attention" card, the twin of renderInsightList
// for the attention surface. Cards' "Worth a look" is exactly this shape - a
// dot-toned list of one-line items, each with an optional muted detail and a
// row of action buttons - so this primitive owns that presentation once, giving
// every standalone attention card the same dot convention, the same body layout
// and the same button vocabulary. Reuses the existing .card.attention /
// .attn-item / .attn-dot / .attn-body / .attn-actions styles verbatim, so no new
// CSS is introduced. Each item is { tone: 'blocking'|'optional'|'good', title,
// detail?, actions?[{ label, onClick, variant }] }, where tone maps to the quiet
// dot (blocking->warn, optional->review, good->good) that is always paired with
// the text beside it, and variant maps to the existing .btn treatments (primary
// is the plain .btn.sm, ghost and danger add their class). A caller with no
// items either passes calmText for a reassuring line or omits the card itself.
export function renderAttentionList(el, icon, opts) {
  const { title, iconInfo, items, calmText } = opts;
  const sec = el('section', { class: 'card attention' });
  sec.append(
    el('div', { class: 'card-head' }, el('h3', { class: 'card-title' }, icon(iconInfo()), title))
  );
  if (!items.length) {
    if (calmText) sec.append(el('p', { class: 'muted pad' }, calmText));
    return sec;
  }
  for (const it of items) {
    const dot = it.tone === 'blocking' ? 'warn' : it.tone === 'good' ? 'good' : 'review';
    const actionNodes = (it.actions || []).map((a) =>
      el(
        'button',
        {
          class: 'btn sm' + (a.variant && a.variant !== 'primary' ? ' ' + a.variant : ''),
          onclick: a.onClick,
        },
        a.label
      )
    );
    sec.append(
      el(
        'div',
        { class: 'attn-item' },
        el('span', { class: 'attn-dot ' + dot }),
        el(
          'div',
          { class: 'attn-body' },
          el('div', {}, it.title),
          it.detail ? el('div', { class: 'muted small' }, it.detail) : null
        ),
        actionNodes.length ? el('div', { class: 'attn-actions' }, ...actionNodes) : null
      )
    );
  }
  return sec;
}
