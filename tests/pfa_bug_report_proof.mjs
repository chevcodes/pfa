import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bankRowsInapplicable } from '../application/core/shared-helpers.js';
import { uncoveredDayRanges } from '../application/analysis/reporting-periods.js';
import { rowNeedsReview } from '../application/analysis/reporting-core.js';
import { coverageTimeline } from '../application/analysis/coverage-map.js';

assert.equal(rowNeedsReview({ category: 'Uncategorised' }), true);
assert.equal(rowNeedsReview({ category: 'Income', categoryNeedsReview: true }), true);
assert.equal(rowNeedsReview({ category: 'Insurance' }), false);
assert.equal(bankRowsInapplicable({ filter: { category: 'Insurance', merchant: '', foreignOnly: false } }), false);
assert.equal(bankRowsInapplicable({ filter: { category: 'all', merchant: '', foreignOnly: false, reviewOnly: true } }), false);
assert.deepEqual(uncoveredDayRanges([[Date.UTC(2026, 7, 5), Date.UTC(2026, 7, 20)]], '2026-08'), [[1, 4], [21, 31]]);

const timeline = coverageTimeline({
  bankMonths: ['2026-08'],
  coverage: { months: { '2026-08': { bank: 'partial', dayGaps: { bank: [[1, 4], [21, 31]] } } } },
  ledgers: ['bank'],
});
assert.deepEqual(timeline.months[0].bankDayGaps, [[1, 4], [21, 31]]);

const [activity, picker, intentions, cards, plan, position, controller, css] = await Promise.all([
  readFile(new URL('../application/ui/activity-render.js', import.meta.url), 'utf8'),
  readFile(new URL('../application/ui/category-picker.js', import.meta.url), 'utf8'),
  readFile(new URL('../application/ui/intentions-section.js', import.meta.url), 'utf8'),
  readFile(new URL('../application/ui/cards-render.js', import.meta.url), 'utf8'),
  readFile(new URL('../application/ui/plan-render.js', import.meta.url), 'utf8'),
  readFile(new URL('../application/ui/position-render.js', import.meta.url), 'utf8'),
  readFile(new URL('../application/app-controller.js', import.meta.url), 'utf8'),
  readFile(new URL('../interface/feature-additions.css', import.meta.url), 'utf8'),
]);

assert.match(activity, /OWN_ACCOUNT_TRANSFER_FILTER = '@own-account-transfers'/);
assert.match(activity, /_txCategories\.has\(OWN_ACCOUNT_TRANSFER_FILTER\) && m\.row\.internalTransfer/);
assert.match(activity, /\[\.\.\.\(visibleRows\(\) \|\| \[\]\), \.\.\.\(bankRecs \|\| \[\]\)\]/);
assert.match(picker, /decision\.open = true/);
assert.match(intentions, /drillToTransactions\(\{ category: cat, month \}\)/);
assert.match(intentions, /Monthly limit \$\{money0\(gov\.amount\)\}/);
assert.match(cards, /The estimate uses your current balance, typical recent payment and card rate/);
assert.match(plan, /the month on screen/);
assert.match(plan, /trend: overviewModel\(\)\.rollAllTrend/);
assert.match(position, /NET_WORTH_CLASSES\.assets\.filter\(\(c\) => c !== 'Cash & bank'\)/);
assert.match(position, /NET_WORTH_CLASSES\.liabilities\.filter\(\(c\) => c !== 'Credit card'\)/);
assert.match(controller, /_disclosureStates\.set\(details\.id, details\.open\)/);
assert.match(css, /\.cov-cell\.is-missing,\s*\.cov-cell\.is-outside\s*\{\s*--cov-cell-bg:/);
assert.match(css, /attr\(data-detail\)/);
