import assert from 'node:assert/strict';
import test from 'node:test';
import { groupTreemapCategories } from '../application/analysis/treemap-categories.js';
import { wrapTreemapLabel } from '../application/ui/treemap-labels.js';

test('the map keeps five largest categories while the ranked categories remain available', () => {
  const ranked = [
    { name: 'Groceries', amount: 24 },
    { name: 'Hotels & Travel', amount: 12 },
    { name: 'Entertainment & Recreation', amount: 2 },
    { name: 'Utilities', amount: 1 },
    { name: 'Fuel & Transport', amount: 1 },
    { name: 'Pharmacy & Health', amount: 1 },
    { name: 'Subscriptions', amount: 1 },
  ];
  const map = groupTreemapCategories(ranked, 42);
  assert.deepEqual(map.categories, [
    ranked[0],
    ranked[1],
    ranked[2],
    ranked[3],
    ranked[4],
    { name: 'Other', displayName: 'Other · 2 categories', amount: 2 },
  ]);
  assert.deepEqual(map.groupedNames, ['Pharmacy & Health', 'Subscriptions']);
  assert.equal(map.categories.reduce((sum, item) => sum + item.amount, 0), 42);
  assert.equal(map.categories.length, 6);
  assert.equal(ranked.length, 7);
});

test('a grouped tile name cannot collide with a real category', () => {
  const map = groupTreemapCategories([
    { name: 'Other', amount: 20 },
    { name: 'Groceries', amount: 1 },
    { name: 'Dining', amount: 1 },
    { name: 'Fuel', amount: 1 },
    { name: 'Health', amount: 1 },
    { name: 'Telecom', amount: 1 },
  ], 25);
  assert.equal(map.otherName, 'Other categories');
  assert.equal(map.categories[5].name, 'Other categories');
  assert.deepEqual(map.groupedNames, ['Telecom']);
});

test('tile labels wrap at readable sizes and stay inside the available box', () => {
  const label = wrapTreemapLabel('Entertainment & Recreation', 161, 59, 7);
  assert.deepEqual(label.lines, ['Entertainment', '& Recreation']);
  assert.ok(label.fontSize >= 10);
  assert.ok(label.lines.length * label.lineHeight <= 45);
  assert.ok(label.lines.every((line) => line.length * label.fontSize * 0.64 <= 147));
});

test('short labels use the available tile width and undersized tiles stay unlabelled', () => {
  const label = wrapTreemapLabel('Utilities', 93, 46, 7);
  assert.ok(label);
  assert.equal(wrapTreemapLabel('Entertainment & Recreation', 45, 46, 7), null);
});
