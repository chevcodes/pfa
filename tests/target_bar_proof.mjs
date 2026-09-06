import assert from 'node:assert/strict';
import test from 'node:test';
import { targetBarGeometry } from '../application/ui/chart-helpers.js';

test('target bars show over-target distance instead of flattening every excess to one full bar', () => {
  assert.deepEqual(targetBarGeometry(50, 100), { fill: 50, marker: 100, over: false });
  assert.deepEqual(targetBarGeometry(100, 100), { fill: 100, marker: 100, over: false });
  assert.deepEqual(targetBarGeometry(150, 100), { fill: 100, marker: 100 / 150 * 100, over: true });
  assert.deepEqual(targetBarGeometry(200, 100), { fill: 100, marker: 50, over: true });
  assert.deepEqual(targetBarGeometry(25, 0), { fill: 100, marker: 0, over: true });
  assert.deepEqual(targetBarGeometry(0, 0), { fill: 0, marker: 0, over: false });
  assert.deepEqual(targetBarGeometry(50, 100, 200), { fill: 25, marker: 50, over: false });
  assert.deepEqual(targetBarGeometry(150, 100, 200), { fill: 75, marker: 50, over: true });
});
