// Storage layer for the Personal Finance Analyser: IndexedDB schema, the low-level
// open/transaction/request helpers, and the Store facade the app reads and
// writes through.
//
// STAGE 1 CHANGE (v3 -> v4): additive schema upgrade. Every v3 store, key path
// and record is untouched, so card parsing, bank parsing, totals, identity,
// rules and meta are all preserved (old data opens unchanged). v4 only CREATES
// new stores for the Stage-1+ features and stamps a separate, record-level
// schemaVersion in meta so record shapes can be migrated over time WITHOUT
// another IndexedDB version bump. A restore/backup therefore never loses data:
// an older file simply carries none of the new stores, and they stay empty.
import {
  categoryRuleFromStoreRecord,
  categoryRuleStoreRecord,
} from '../../settings/category-rules.js';

export const DB_NAME = 'pfa';

// v2 added the bank-account ledger; v3 added the card-statement records.
// v4 (this change) adds, additively:
//   - tags               : personal cross-category tags (keyPath 'id')
//   - transactionSplits  : one transaction split across categories/tags (keyPath 'id')
//   - categoryIntentions : chosen category ceilings + repeating period (keyPath 'id')
//   - goals              : measurable goals + if-then trigger (keyPath 'id')
//   - forecastSnapshots  : stored projections + the assumptions used (keyPath 'id')
//   - manualAssets       : self-reported Position assets/liabilities (keyPath 'id')
// The upgrade ONLY creates the new stores; nothing existing is read, rewritten
// or dropped in onupgradeneeded, so the operation commits atomically or not at
// all and can never leave the database half-migrated.
export const DB_VERSION = 6;

// Record-level schema version, stored in meta under SCHEMA_VERSION_KEY. This is
// deliberately SEPARATE from DB_VERSION: DB_VERSION governs which object stores
// exist (a structural fact IndexedDB enforces at open time), while
// SCHEMA_VERSION governs the SHAPE of records inside them (a data fact the app
// enforces after open). Splitting them means a future field addition to, say, a
// goal record can be migrated by bumping SCHEMA_VERSION and running a one-off
// upgrade pass, with no IndexedDB version change and no risk to the stores that
// did not change. Read once at boot (Store.ensureSchema) and written forward
// only, never backward, so a file from an older app upgrades but a newer file is
// never silently downgraded.
export const SCHEMA_VERSION = 1;
export const SCHEMA_VERSION_KEY = 'schemaVersion';

// The v4 stores, declared once so openDB (create) and ensureSchema (verify)
// cannot drift on the names or key paths.
const V4_STORES = [
  { name: 'tags', keyPath: 'id' },
  { name: 'transactionSplits', keyPath: 'id' },
  { name: 'categoryIntentions', keyPath: 'id' },
  { name: 'goals', keyPath: 'id' },
  { name: 'forecastSnapshots', keyPath: 'id' },
  { name: 'manualAssets', keyPath: 'id' },
];

const V5_STORES = [{ name: 'investmentStatements', keyPath: 'hash' }];

const V6_STORES = [{ name: 'balanceUpdates', keyPath: 'id' }];

export const RESTORABLE_STORES = [
  'transactions',
  'statements',
  'rules',
  'bankTransactions',
  'bankStatements',
  'cardStatements',
  ...V4_STORES.map((store) => store.name),
  ...V5_STORES.map((store) => store.name),
  ...V6_STORES.map((store) => store.name),
];

let openPromise = null;

export function openDB() {
  if (openPromise) return openPromise;
  openPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // --- v1..v3 (unchanged) ---
      if (!db.objectStoreNames.contains('transactions'))
        db.createObjectStore('transactions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('statements'))
        db.createObjectStore('statements', { keyPath: 'hash' });
      if (!db.objectStoreNames.contains('rules')) db.createObjectStore('rules', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('bankTransactions'))
        db.createObjectStore('bankTransactions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('bankStatements'))
        db.createObjectStore('bankStatements', { keyPath: 'hash' });
      if (!db.objectStoreNames.contains('cardStatements'))
        db.createObjectStore('cardStatements', { keyPath: 'hash' });
      // --- v4 (additive; each guarded so re-runs and partial upgrades are safe) ---
      for (const s of V4_STORES) {
        if (!db.objectStoreNames.contains(s.name))
          db.createObjectStore(s.name, { keyPath: s.keyPath });
      }
      for (const s of V5_STORES) {
        if (!db.objectStoreNames.contains(s.name))
          db.createObjectStore(s.name, { keyPath: s.keyPath });
      }
      for (const s of V6_STORES) {
        if (!db.objectStoreNames.contains(s.name))
          db.createObjectStore(s.name, { keyPath: s.keyPath });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        openPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      openPromise = null;
      reject(req.error);
    };
    req.onblocked = () => {
      blocked = true;
      openPromise = null;
      reject(new Error('Storage upgrade is blocked by another open app window.'));
    };
  });
  return openPromise;
}

export function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}
export function reqP(r) {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function transactionP(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('Storage write aborted.'));
    transaction.onerror = () => {};
  });
}

async function write(db, stores, queue) {
  const transaction = db.transaction(stores, 'readwrite');
  const done = transactionP(transaction);
  let result;
  try {
    result = await queue(transaction);
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // Already aborted or already committed - either way the transaction is
      // no longer ours to cancel, and the original error below is the one
      // worth reporting.
    }
    await done.catch(() => {});
    throw error;
  }
  await done;
  return result;
}

// One shared factory for the "list of {id}-keyed records" stores the v4
// features all use, so tags/splits/intentions/goals/snapshots/assets share ONE
// tested implementation of getAll / put-many / atomic-replace / delete rather
// than six hand-copied copies (the exact duplication this codebase has spent
// effort removing elsewhere). Each returns the same method set, bound to its
// own store name.
function idStore(name) {
  return {
    async all() {
      const db = await openDB();
      return reqP(tx(db, name, 'readonly').getAll());
    },
    async get(id) {
      const db = await openDB();
      return reqP(tx(db, name, 'readonly').get(id));
    },
    async put(rec) {
      const db = await openDB();
      return write(db, name, (transaction) => reqP(transaction.objectStore(name).put(rec)));
    },
    async putMany(recs) {
      const db = await openDB();
      return write(db, name, (transaction) => {
        const s = transaction.objectStore(name);
        return Promise.all((recs || []).map((r) => reqP(s.put(r))));
      });
    },
    async delete(id) {
      const db = await openDB();
      return write(db, name, (transaction) => reqP(transaction.objectStore(name).delete(id)));
    },
    async clear() {
      const db = await openDB();
      return write(db, name, (transaction) => reqP(transaction.objectStore(name).clear()));
    },
    // Atomic replace: clear + put-all in ONE transaction, so the store is never
    // left empty if the app is interrupted mid-write (same rationale as
    // replaceTransactions below).
    async replace(recs) {
      const db = await openDB();
      return write(db, name, (transaction) => {
        const s = transaction.objectStore(name);
        const clearReq = reqP(s.clear());
        const putReqs = (recs || []).map((r) => reqP(s.put(r)));
        return Promise.all([clearReq, ...putReqs]);
      });
    },
  };
}

export const Store = {
  async allTransactions() {
    const db = await openDB();
    return reqP(tx(db, 'transactions', 'readonly').getAll());
  },
  async putTransactions(recs) {
    const db = await openDB();
    return write(db, 'transactions', (transaction) => {
      const s = transaction.objectStore('transactions');
      return Promise.all(recs.map((r) => reqP(s.put(r))));
    });
  },
  async clearTransactions() {
    const db = await openDB();
    return write(db, 'transactions', (transaction) =>
      reqP(transaction.objectStore('transactions').clear())
    );
  },
  async replaceTransactions(records) {
    const db = await openDB();
    return write(db, 'transactions', (transaction) => {
      const s = transaction.objectStore('transactions');
      const clearReq = reqP(s.clear());
      const putReqs = records.map((r) => reqP(s.put(r)));
      return Promise.all([clearReq, ...putReqs]);
    });
  },
  async hasStatement(hash) {
    const db = await openDB();
    return !!(await reqP(tx(db, 'statements', 'readonly').get(hash)));
  },
  async putStatement(rec) {
    const db = await openDB();
    return write(db, 'statements', (transaction) =>
      reqP(transaction.objectStore('statements').put(rec))
    );
  },
  async allStatements() {
    const db = await openDB();
    return reqP(tx(db, 'statements', 'readonly').getAll());
  },
  async deleteStatement(hash) {
    const db = await openDB();
    return write(db, 'statements', (transaction) =>
      reqP(transaction.objectStore('statements').delete(hash))
    );
  },
  async clearStatements() {
    const db = await openDB();
    return write(db, 'statements', (transaction) =>
      reqP(transaction.objectStore('statements').clear())
    );
  },
  async allRules() {
    const db = await openDB();
    return (await reqP(tx(db, 'rules', 'readonly').getAll()))
      .map((r) => categoryRuleFromStoreRecord(r))
      .filter(Boolean);
  },
  async putRules(recs) {
    const db = await openDB();
    return write(db, 'rules', (transaction) => {
      const s = transaction.objectStore('rules');
      return Promise.all(
        recs
          .map((r) => categoryRuleStoreRecord(r))
          .filter(Boolean)
          .map((r) => reqP(s.put(r)))
      );
    });
  },
  async clearRules() {
    const db = await openDB();
    return write(db, 'rules', (transaction) => reqP(transaction.objectStore('rules').clear()));
  },
  async replaceRules(recs) {
    const db = await openDB();
    return write(db, 'rules', (transaction) => {
      const s = transaction.objectStore('rules');
      const clearReq = reqP(s.clear());
      const cleaned = recs.map((r) => categoryRuleStoreRecord(r)).filter(Boolean);
      const putReqs = cleaned.map((r) => reqP(s.put(r)));
      return Promise.all([clearReq, ...putReqs]);
    });
  },
  async getMeta(key, dflt) {
    const db = await openDB();
    const v = await reqP(tx(db, 'meta', 'readonly').get(key));
    return v ? v.value : dflt;
  },
  async setMeta(key, value) {
    const db = await openDB();
    return write(db, 'meta', (transaction) =>
      reqP(transaction.objectStore('meta').put({ key, value }))
    );
  },
  async setMetaMany(entries) {
    const db = await openDB();
    return write(db, 'meta', (transaction) => {
      const s = transaction.objectStore('meta');
      return Promise.all(
        (entries || []).map(({ key, value }) => reqP(s.put({ key, value })))
      );
    });
  },
  // Bank ledger (Phase 1).
  async allBankTransactions() {
    const db = await openDB();
    return reqP(tx(db, 'bankTransactions', 'readonly').getAll());
  },
  async putBankTransactions(recs) {
    const db = await openDB();
    return write(db, 'bankTransactions', (transaction) => {
      const s = transaction.objectStore('bankTransactions');
      return Promise.all(recs.map((r) => reqP(s.put(r))));
    });
  },
  async clearBankTransactions() {
    const db = await openDB();
    return write(db, 'bankTransactions', (transaction) =>
      reqP(transaction.objectStore('bankTransactions').clear())
    );
  },
  async replaceBankTransactions(records) {
    const db = await openDB();
    return write(db, 'bankTransactions', (transaction) => {
      const s = transaction.objectStore('bankTransactions');
      const clearReq = reqP(s.clear());
      const putReqs = records.map((r) => reqP(s.put(r)));
      return Promise.all([clearReq, ...putReqs]);
    });
  },
  async hasBankStatement(hash) {
    const db = await openDB();
    return !!(await reqP(tx(db, 'bankStatements', 'readonly').get(hash)));
  },
  async putBankStatement(rec) {
    const db = await openDB();
    return write(db, 'bankStatements', (transaction) =>
      reqP(transaction.objectStore('bankStatements').put(rec))
    );
  },
  async allBankStatements() {
    const db = await openDB();
    return reqP(tx(db, 'bankStatements', 'readonly').getAll());
  },
  async deleteBankStatement(hash) {
    const db = await openDB();
    return write(db, 'bankStatements', (transaction) =>
      reqP(transaction.objectStore('bankStatements').delete(hash))
    );
  },
  async clearBankStatements() {
    const db = await openDB();
    return write(db, 'bankStatements', (transaction) =>
      reqP(transaction.objectStore('bankStatements').clear())
    );
  },
  // Card statement records (Recommendations 1-4).
  async hasCardStatement(hash) {
    const db = await openDB();
    return !!(await reqP(tx(db, 'cardStatements', 'readonly').get(hash)));
  },
  async putCardStatement(rec) {
    const db = await openDB();
    return write(db, 'cardStatements', (transaction) =>
      reqP(transaction.objectStore('cardStatements').put(rec))
    );
  },
  async allCardStatements() {
    const db = await openDB();
    return reqP(tx(db, 'cardStatements', 'readonly').getAll());
  },
  async deleteCardStatement(hash) {
    const db = await openDB();
    return write(db, 'cardStatements', (transaction) =>
      reqP(transaction.objectStore('cardStatements').delete(hash))
    );
  },
  async clearCardStatements() {
    const db = await openDB();
    return write(db, 'cardStatements', (transaction) =>
      reqP(transaction.objectStore('cardStatements').clear())
    );
  },

  async restoreSnapshot(snapshot) {
    const db = await openDB();
    const records = snapshot && snapshot.stores ? snapshot.stores : {};
    const missing = RESTORABLE_STORES.filter((name) => !Array.isArray(records[name]));
    if (missing.length) throw new Error(`Restore snapshot is missing: ${missing.join(', ')}.`);
    return write(db, [...RESTORABLE_STORES, 'meta'], (transaction) => {
      const requests = [];
      for (const name of RESTORABLE_STORES) {
        const s = transaction.objectStore(name);
        requests.push(reqP(s.clear()));
        const values = records[name];
        const cleaned =
          name === 'rules'
            ? values.map((value) => categoryRuleStoreRecord(value)).filter(Boolean)
            : values;
        for (const value of cleaned) requests.push(reqP(s.put(value)));
      }
      const meta = transaction.objectStore('meta');
      for (const [key, value] of Object.entries((snapshot && snapshot.meta) || {})) {
        requests.push(reqP(meta.put({ key, value })));
      }
      return Promise.all(requests);
    });
  },

  // --- v4 stores (Stage 1+). Each is the shared idStore surface, so a caller
  //     uses Store.tags.all(), Store.goals.replace(...), etc. Uniform, tested
  //     once, and impossible to drift between the six. ---
  tags: idStore('tags'),
  transactionSplits: idStore('transactionSplits'),
  categoryIntentions: idStore('categoryIntentions'),
  goals: idStore('goals'),
  forecastSnapshots: idStore('forecastSnapshots'),
  manualAssets: idStore('manualAssets'),
  investmentStatements: idStore('investmentStatements'),
  balanceUpdates: idStore('balanceUpdates'),

  // Read the stored record-level schema version, run any forward migrations,
  // then stamp the current SCHEMA_VERSION. Called ONCE at boot, after openDB has
  // guaranteed the stores exist. Idempotent: on an already-current database it
  // reads the version, finds nothing to do, and returns. On a genuinely old
  // record shape it would apply the numbered migration for each step from the
  // stored version up to SCHEMA_VERSION. Never migrates backward: a file whose
  // schemaVersion is HIGHER than this build's is left untouched and reported, so
  // a newer export opened in an older app is not silently downgraded/corrupted.
  async ensureSchema() {
    const stored = Number(await this.getMeta(SCHEMA_VERSION_KEY, 0)) || 0;
    if (stored > SCHEMA_VERSION) {
      // Newer data than this build understands: do not touch it.
      return {
        ok: false,
        reason: 'newer-schema',
        stored,
        expected: SCHEMA_VERSION,
      };
    }
    if (stored === SCHEMA_VERSION) return { ok: true, migrated: false, version: SCHEMA_VERSION };
    // Forward migrations run here, one numbered step at a time, e.g.
    //   if (stored < 1) { /* v0 -> v1: nothing to backfill; v4 stores start empty */ }
    // Each step is additive and re-runnable. There is nothing to backfill for
    // the initial introduction (the v4 stores are simply empty on first open),
    // so the only action is to stamp the version forward.
    await this.setMeta(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
    return {
      ok: true,
      migrated: stored > 0,
      from: stored,
      version: SCHEMA_VERSION,
    };
  },
};
