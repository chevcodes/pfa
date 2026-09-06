import { accountNamesOnly, fnv1a } from '../core/shared-helpers.js';

/* ===========================================================================
 * 8) Encrypted history file  (export / import; AES-GCM + PBKDF2)
 * ---------------------------------------------------------------------------
 * One file carries the transactions and the small change metadata needed to
 * merge cleanly. The passphrase is set once and supplied again on import.
 * A passphrase cannot be recovered; a wrong one simply fails to open the file.
 * ======================================================================== */

// v1 carried card transactions only. v2 also carries the bank ledger and the
// card-statement records, so a device move keeps the WHOLE picture, not just
// card transactions. Both magics import: a v1 file simply has no bank/card
// bundle, so nothing bank-side is brought in (backward compatible).
const HISTORY_MAGIC = 'CCAHIST1';
const HISTORY_MAGIC_V2 = 'CCAHIST2';
const HISTORY_MAGIC_V3 = 'CCAHIST3';
// PBKDF2 work factor for the encrypted history file. Written into every
// exported envelope (iterations) and read back at import, so this value can be
// raised over time without breaking files created with an older count: each
// file is always decrypted with whatever count it was actually encrypted with.
const PBKDF2_ITERATIONS_DEFAULT = 600000;

function getCrypto() {
  const c = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : null;
  if (!c || !c.subtle) throw new Error('WebCrypto is not available in this environment.');
  return c;
}
function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoaSafe(s);
}
function unb64(str) {
  const s = atobSafe(str);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
function btoaSafe(s) {
  return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
}
function atobSafe(s) {
  return typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
}

function recordsWith(value, key) {
  return Array.isArray(value)
    ? value.filter((record) => record && typeof record === 'object' && record[key])
    : [];
}

function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : [];
}

async function deriveKey(passphrase, salt, iterations) {
  const crypto = getCrypto();
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// `bundle` (optional, backward compatible) carries the bank ledger and the
// card-statement records alongside the card transactions, so all three ledgers
// travel in the one encrypted file. Old callers that pass three arguments still
// work: the bundle defaults to empty and the file is a valid card-only export.
export async function exportHistory(records, meta, passphrase, bundle = {}) {
  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS_DEFAULT);
  const payload = new TextEncoder().encode(
    JSON.stringify({
      magic: HISTORY_MAGIC_V3,
      exportedAt: new Date().toISOString(),
      meta: meta || {},
      records,
      rules: bundle.rules || [],
      ledgerRules: {
        confirmedIncomeIds: bundle.confirmedIncomeIds || [],
        refundIncomeIds: bundle.refundIncomeIds || [],
        sharedAccounts: bundle.sharedAccounts || [],
        householdPayees: bundle.householdPayees || [],
      },
      profile: {
        firstName: bundle.firstName || null,
        firstNameSource: bundle.firstNameSource || null,
        goal: bundle.goal || null,
        goalLog: Array.isArray(bundle.goalLog) ? bundle.goalLog : [],
        goalBoundary: bundle.goalBoundary || null,
      },
      bank: {
        transactions: bundle.bankRecords || [],
        sourceStatements: bundle.sourceStatements || [],
        statements: bundle.bankStatements || [],
        cardStatements: bundle.cardStatements || [],
        myAccounts: bundle.myAccounts || [],
        cardAccounts: bundle.cardAccounts || [],
      },
      investments: {
        statements: Array.isArray(bundle.investmentStatements) ? bundle.investmentStatements : [],
      },
      planning: {
        target: bundle.planTarget || null,
        groups: bundle.planGroups || null,
        setAside: Array.isArray(bundle.planSetAside) ? bundle.planSetAside : [],
        // Uncommitted work travels with the backup too. Restoring a machine
        // and finding a half-answered wizard reset to zero would lose real
        // effort that the person had not been asked to commit yet.
        draft: bundle.planDraft || null,
      },
      userData: {
        customCategories: Array.isArray(bundle.customCategories) ? bundle.customCategories : [],
        tags: Array.isArray(bundle.tags) ? bundle.tags : [],
        transactionSplits: Array.isArray(bundle.transactionSplits)
          ? bundle.transactionSplits
          : [],
        categoryIntentions: Array.isArray(bundle.categoryIntentions)
          ? bundle.categoryIntentions
          : [],
        forecastSnapshots: Array.isArray(bundle.forecastSnapshots)
          ? bundle.forecastSnapshots
          : [],
        manualAssets: Array.isArray(bundle.manualAssets) ? bundle.manualAssets : [],
        balanceUpdates: Array.isArray(bundle.balanceUpdates) ? bundle.balanceUpdates : [],
        goals: Array.isArray(bundle.goals) ? bundle.goals : [],
      },
      preferences: {
        theme: ['auto', 'light', 'dark'].includes(bundle.theme) ? bundle.theme : null,
        privacy: ['on', 'off'].includes(bundle.privacy) ? bundle.privacy : null,
        accountNames: accountNamesOnly(bundle.accountNames),
      },
      workspace: bundle.workspace && typeof bundle.workspace === 'object' ? bundle.workspace : null,
    })
  );
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
  const dataB64 = b64(cipher);
  return JSON.stringify({
    format: HISTORY_MAGIC,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS_DEFAULT,
    salt: b64(salt),
    iv: b64(iv),
    data: dataB64,
    checksum: fnv1a(dataB64),
  });
}

export async function importHistory(fileText, passphrase) {
  const crypto = getCrypto();
  let env;
  try {
    env = JSON.parse(fileText);
  } catch {
    throw new Error('This does not look like a history file.');
  }
  if (
    !env ||
    env.format !== HISTORY_MAGIC ||
    typeof env.salt !== 'string' ||
    typeof env.iv !== 'string' ||
    typeof env.data !== 'string'
  ) {
    throw new Error('This does not look like a history file.');
  }
  if (typeof env.checksum === 'string' && env.checksum !== fnv1a(env.data)) {
    throw new Error(
      'This backup file looks corrupted or was not fully transferred. Get a fresh copy and try again.'
    );
  }
  // Read the iteration count the file was actually encrypted with. A genuinely
  // old file that predates this field, or one carrying a missing/invalid value,
  // falls back to the default so the count is never undefined or NaN.
  const fileIters = Number(env.iterations);
  const iterations =
    Number.isFinite(fileIters) && fileIters > 0 ? fileIters : PBKDF2_ITERATIONS_DEFAULT;
  let salt, iv, cipher;
  try {
    salt = unb64(env.salt);
    iv = unb64(env.iv);
    cipher = unb64(env.data);
  } catch {
    throw new Error(
      'This backup file looks corrupted or was not fully transferred. Get a fresh copy and try again.'
    );
  }
  if (!salt.length || !iv.length || !cipher.length) {
    throw new Error(
      'This backup file looks corrupted or was not fully transferred. Get a fresh copy and try again.'
    );
  }
  const key = await deriveKey(passphrase, salt, iterations);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  } catch {
    throw new Error('That passphrase did not open the file. Check it and try again.');
  }
  let obj;
  try {
    obj = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error(
      'This backup file looks corrupted or was not fully transferred. Get a fresh copy and try again.'
    );
  }
  if (
    !obj ||
    ![HISTORY_MAGIC, HISTORY_MAGIC_V2, HISTORY_MAGIC_V3].includes(obj.magic) ||
    !Array.isArray(obj.records)
  ) {
    throw new Error(
      'This backup file looks corrupted or was not fully transferred. Get a fresh copy and try again.'
    );
  }
  const bank = obj.bank && typeof obj.bank === 'object' ? obj.bank : {};
  const ledgerRules = obj.ledgerRules && typeof obj.ledgerRules === 'object' ? obj.ledgerRules : {};
  const profile = obj.profile && typeof obj.profile === 'object' ? obj.profile : {};
  const planning = obj.planning && typeof obj.planning === 'object' ? obj.planning : {};
  const userData = obj.userData && typeof obj.userData === 'object' ? obj.userData : {};
  const preferences =
    obj.preferences && typeof obj.preferences === 'object' ? obj.preferences : {};
  const investments =
    obj.investments && typeof obj.investments === 'object' ? obj.investments : {};
  return {
    records: recordsWith(obj.records, 'id'),
    investments: {
      statements: recordsWith(investments.statements, 'hash'),
    },
    meta: obj.meta && typeof obj.meta === 'object' ? obj.meta : {},
    exportedAt: obj.exportedAt,
    rules: Array.isArray(obj.rules) ? obj.rules.filter((rule) => rule && typeof rule === 'object') : [],
    ledgerRules: {
      confirmedIncomeIds: strings(ledgerRules.confirmedIncomeIds),
      refundIncomeIds: strings(ledgerRules.refundIncomeIds),
      sharedAccounts: strings(ledgerRules.sharedAccounts),
      householdPayees: strings(ledgerRules.householdPayees),
    },
    profile: {
      firstName: typeof profile.firstName === 'string' ? profile.firstName : null,
      firstNameSource:
        typeof profile.firstNameSource === 'string' ? profile.firstNameSource : null,
      goal: profile.goal && typeof profile.goal === 'object' ? profile.goal : null,
      goalLog: recordsWith(profile.goalLog, 'month'),
      goalBoundary:
        profile.goalBoundary && typeof profile.goalBoundary === 'object'
          ? profile.goalBoundary
          : null,
    },
    bank: {
      transactions: recordsWith(bank.transactions, 'id'),
      sourceStatements: recordsWith(bank.sourceStatements, 'hash'),
      statements: recordsWith(bank.statements, 'hash'),
      cardStatements: recordsWith(bank.cardStatements, 'hash'),
      myAccounts: strings(bank.myAccounts),
      cardAccounts: strings(bank.cardAccounts),
    },
    planning: {
      target: planning.target && typeof planning.target === 'object' ? planning.target : null,
      groups: planning.groups && typeof planning.groups === 'object' ? planning.groups : null,
      setAside: strings(planning.setAside),
      draft: planning.draft && typeof planning.draft === 'object' ? planning.draft : null,
    },
    userData: {
      customCategories: recordsWith(userData.customCategories, 'name'),
      tags: recordsWith(userData.tags, 'id'),
      transactionSplits: recordsWith(userData.transactionSplits, 'id'),
      categoryIntentions: recordsWith(userData.categoryIntentions, 'id'),
      forecastSnapshots: recordsWith(userData.forecastSnapshots, 'id'),
      manualAssets: recordsWith(userData.manualAssets, 'id'),
      balanceUpdates: recordsWith(userData.balanceUpdates, 'id'),
      goals: recordsWith(userData.goals, 'id'),
    },
    preferences: {
      theme: ['auto', 'light', 'dark'].includes(preferences.theme) ? preferences.theme : null,
      privacy: ['on', 'off'].includes(preferences.privacy) ? preferences.privacy : null,
      accountNames: accountNamesOnly(preferences.accountNames),
    },
    workspace: obj.workspace && typeof obj.workspace === 'object' ? obj.workspace : null,
  };
}
