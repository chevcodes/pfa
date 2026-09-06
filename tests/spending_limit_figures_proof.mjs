import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildPaceModel, paceForMonth } from '../application/analysis/category-intentions.js';

const cfg = { currency: { code: 'JMD', symbol: '$' } };
const model = (spendSoFar, ceiling = 400) =>
  buildPaceModel(paceForMonth({ intention: { category: 'Dining', amount: ceiling }, targetMonth: '2026-09', spendSoFar, asOfDay: 20, cfg }), cfg);

test('the pace model carries the spent figure it formats', () => {
  const over = model(1513.04);
  assert.equal(over.spent, 1513.04);
  assert.equal(over.ceiling, 400);
  assert.equal(over.isOver, true);
  assert.equal(over.remaining, -1113.04);
  assert.equal(over.remaining, over.ceiling - over.spent);
  const under = model(100);
  assert.equal(under.spent, 100);
  assert.equal(under.remaining, 300);
});

test('the spending-limit screen reads only fields the pace model returns', () => {
  const source = readFileSync(new URL('../application/ui/intentions-section.js', import.meta.url), 'utf8');
  const keys = new Set(Object.keys(model(10)));
  const start = source.indexOf('models: models.map(');
  const end = source.indexOf('hot: hot.map(');
  assert.ok(start > 0 && end > start);
  const read = [...source.slice(start, end).matchAll(/\bpace\.([A-Za-z]+)/g), ...source.matchAll(/\bmodel\.pace\.([A-Za-z]+)/g)].map((match) => match[1]);
  assert.ok(read.length > 5);
  for (const key of read) assert.ok(keys.has(key), `intentions-section reads pace.${key}, which the model does not return`);
});
