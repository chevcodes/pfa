import assert from 'node:assert/strict';
import { bankRowsInapplicable, cardRowsInapplicable } from '../application/core/shared-helpers.js';

const state = {
  filter: { merchant: '', foreignOnly: false, kind: 'fee' },
  bankFilter: { payeeKey: '', kind: 'all' },
};

assert.equal(bankRowsInapplicable(state), true);
assert.equal(cardRowsInapplicable(state), false);
assert.equal(bankRowsInapplicable({ ...state, filter: { ...state.filter, kind: 'all' } }), false);
assert.equal(cardRowsInapplicable({ ...state, bankFilter: { payeeKey: '', kind: 'fee' } }), true);
