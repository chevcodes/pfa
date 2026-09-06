import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupPromptSnooze } from '../application/ui/app-messages.js';

test('backup reminder returns after thirty days and migrates old dismissals', () => {
  const today = '2026-09-30';
  assert.deepEqual(backupPromptSnooze(null, false, today), { until: null, migrated: false, shouldOffer: true });
  assert.deepEqual(backupPromptSnooze(null, true, today), { until: '2026-10-30', migrated: true, shouldOffer: false });
  assert.equal(backupPromptSnooze('2026-10-30', false, '2026-10-29').shouldOffer, false);
  assert.equal(backupPromptSnooze('2026-10-30', false, '2026-10-30').shouldOffer, false);
  assert.equal(backupPromptSnooze('2026-10-30', false, '2026-10-31').shouldOffer, true);
  assert.equal(backupPromptSnooze('2026-10-30', true, '2026-10-31').migrated, false);
});
