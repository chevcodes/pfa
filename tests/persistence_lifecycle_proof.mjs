import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isoToday } from '../application/core/shared-helpers.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
let pass = 0;
let fail = 0;
const note = (condition, label) => {
  if (condition) pass++;
  else {
    fail++;
    console.log('   FAIL', label);
  }
};

console.log('='.repeat(72));
console.log(' PERSISTENCE LIFECYCLE - durable writes, complete restore, safe recall');
console.log('='.repeat(72));

note(
  isoToday({ getFullYear: () => 2026, getMonth: () => 8, getDate: () => 10 }) === '2026-09-10',
  'user-created dates follow the device calendar day instead of UTC'
);

const storage = read('application', 'core', 'storage.js');
note(/let openPromise = null/.test(storage), 'IndexedDB uses one reusable connection');
note(/db\.onversionchange[\s\S]{0,100}db\.close\(\)[\s\S]{0,100}openPromise = null/.test(storage), 'the shared connection closes cleanly for schema upgrades');
note(/transaction\.oncomplete = \(\) => resolve\(\)/.test(storage), 'writes wait for transaction commit, not request success alone');
note(/async setMetaMany\(entries\)/.test(storage), 'related configuration keys have an atomic write path');
note(/async restoreSnapshot\(snapshot\)/.test(storage), 'full-history restore has one storage entry point');
note(/RESTORABLE_STORES\.filter\(\(name\) => !Array\.isArray\(records\[name\]\)\)/.test(storage), 'an incomplete snapshot is rejected instead of clearing omitted stores');
note(/write\(db, \[\.\.\.RESTORABLE_STORES, 'meta'\]/.test(storage), 'all restored stores and metadata commit in one transaction');
// ensureSchema runs unguarded on every boot (app-controller.js awaits it
// with no surrounding try/catch, by design - the comment there says a
// storage layer that predates it "can never crash boot"). A migration step
// added inside it is real IndexedDB I/O and can genuinely fail; if that
// throw were not caught here, the promise it added to ensureSchema()
// would propagate out and break that guarantee for every future boot,
// since the schema version never advances past a failed migration.
const ensureSchemaStart = storage.indexOf('async ensureSchema()');
const ensureSchemaBody = storage.slice(ensureSchemaStart, ensureSchemaStart + 2200);
note(
  /if \(stored < 2\) \{\s*try \{[\s\S]{0,80}migrateNcbTransactionIdentity\(\)[\s\S]{0,200}\} catch/.test(ensureSchemaBody),
  'a migration failure is caught, not left to reach ensureSchema\'s caller'
);
note(
  /catch \(error\) \{[\s\S]{0,300}return \{ ok: true, migrated: false/.test(ensureSchemaBody),
  'a failed migration reports ok rather than failing boot, and is retried next launch since the version is not stamped forward'
);
for (const name of [
  'transactions',
  'statements',
  'rules',
  'bankTransactions',
  'bankStatements',
  'cardStatements',
  'tags',
  'transactionSplits',
  'categoryIntentions',
  'goals',
  'forecastSnapshots',
  'manualAssets',
  'investmentStatements',
  'balanceUpdates',
]) {
  note(storage.includes(`'${name}'`), `${name} belongs to the restorable store contract`);
}

const intake = read('application', 'ui', 'app-intake.js');
const bankImport = intake.slice(
  intake.indexOf('const merged = mergeBankTransactions(state.bankRecords, recs)'),
  intake.indexOf("if (detectCardStatementFormat(lines) === 'ncb')")
);
note(bankImport.indexOf('await persistBank()') < bankImport.indexOf('await Store.putBankStatement'), 'bank rows commit before their duplicate marker');
note(/bankAdded \|\| bankDupes \|\| bankStmtLearned/.test(intake), 'a summary-only bank import refreshes connected views immediately');
const ncbImport = intake.slice(
  intake.indexOf('const merged = mergeTransactions(state.records, ncbRecs)'),
  intake.indexOf("await learnFirstName(scotiaCardHolderFirstName(lines), 'card')")
);
note(ncbImport.indexOf('await persist()') < ncbImport.indexOf('await Store.putStatement'), 'NCB card rows commit before their duplicate marker');
const scotiaImport = intake.slice(
  intake.indexOf('const recs = parsed.transactions.map'),
  intake.indexOf("setProgress(i, 'done', merged.added)", intake.indexOf('const recs = parsed.transactions.map'))
);
note(scotiaImport.indexOf('await persist()') < scotiaImport.indexOf('await Store.putStatement'), 'Scotiabank card rows commit before their duplicate marker');

// A same-month statement collision replaces an earlier import's own rows via
// applyCollisionCascade, which mutates in-memory state before writing it -
// same shape as manage-data.js's applyStatementRemoval. Without a rollback,
// a failed write would leave the app showing a statement as replaced while
// storage still held both, silently disagreeing with itself on next reload.
const collisionCascade = intake.slice(
  intake.indexOf('async function applyCollisionCascade'),
  intake.indexOf('async function persistBank()')
);
note(
  /const previous = \{\};[\s\S]{0,400}Object\.assign\(state, plan\.state\)/.test(collisionCascade),
  'the prior state is captured before the cascade mutates it'
);
note(
  /catch \(error\) \{\s*Object\.assign\(state, previous\)[\s\S]{0,20}throw error/.test(collisionCascade),
  'a failed write rolls the in-memory cascade back rather than leaving state and storage disagreeing'
);
// Every call site must itself catch that rethrow - otherwise it either
// crashes the whole import batch (nothing else in this loop has a catch
// above it) or, for the one site that runs after this file's own rows are
// already safely persisted, is a deliberate softer fallback instead.
const collisionCallSites = intake.match(/await applyCollisionCascade\(collisionPlan, \{[^}]*\}\);/g) || [];
note(collisionCallSites.length === 4, 'every same-month-collision call site is accounted for');
note(
  (intake.match(/Could not replace the earlier statement for/g) || []).length === 4,
  'every collision call site reports a caught failure instead of leaving it unhandled'
);

const controller = read('application', 'app-controller.js');
note(/state\.lastLocalUpdate = await storedString\('lastLocalUpdate'\)/.test(controller), 'last-write metadata hydrates at boot');
note(/async function storedArray\(key\)/.test(controller), 'stored list metadata is shape-checked before use');
note(/async function storedObject\(key\)/.test(controller), 'stored object metadata is shape-checked before use');
note(/async function storedString\(key\)/.test(controller), 'stored text metadata is shape-checked before use');
note(/applyWorkspaceSnapshot\(await Store\.getMeta\('workspaceState', null\)\)/.test(controller), 'the last workspace hydrates at boot');
note(/Store\.setMeta\('workspaceState', snapshot\)/.test(controller), 'view and reporting-period changes are persisted');
const privacyToggle = controller.slice(
  controller.indexOf("privacyBtn.addEventListener('click'"),
  controller.indexOf("const themeBtn = $('#theme-btn')")
);
note(privacyToggle.indexOf("await Store.setMeta('privacy', next)") < privacyToggle.indexOf('document.documentElement.dataset.privacy = next'), 'privacy mode is stored before the visible state changes');
const backgroundPrivacy = controller.slice(
  controller.indexOf('let foregroundPrivacy = null'),
  controller.indexOf("privacyBtn.addEventListener('click'")
);
note(!/Store\./.test(backgroundPrivacy), 'background masking never changes the stored privacy setting');
note(/foregroundPrivacy = document\.documentElement\.dataset\.privacy/.test(backgroundPrivacy), 'background masking captures the person’s actual display state');
note(/document\.documentElement\.dataset\.privacy = 'on'[\s\S]*render\(\)/.test(backgroundPrivacy), 'backgrounding repaints with figures masked');
note(/document\.documentElement\.dataset\.privacy = next[\s\S]*render\(\)/.test(backgroundPrivacy), 'foregrounding restores and repaints the captured display state');
note(/visibilitychange/.test(backgroundPrivacy) && /pagehide/.test(backgroundPrivacy), 'visibility change is primary and page hide is the secondary privacy hook');
note(controller.indexOf("await Store.setMeta('theme', next)") < controller.indexOf('document.documentElement.dataset.theme = next'), 'theme is stored before the visible state changes');
note(!/new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(controller), 'date-sensitive views use the shared local-day contract');

const goals = read('application', 'ui', 'app-goals.js');
note((goals.match(/Store\.setMetaMany\(goalWritePlan/g) || []).length === 3, 'goal create, clear, and undo commit each goal cascade atomically');
note(goals.indexOf('await Store.setMetaMany(goalWritePlan(snapshot))') < goals.indexOf('applyGoalSnapshot(state, snapshot)'), 'goal state changes only after durable storage succeeds');
note(/createdAt: isoToday\(\)/.test(goals), 'new goals are stamped with the device calendar day');

const planWizard = read('application', 'ui', 'plan-wizard.js');
note(/await Store\.setMetaMany\(writes\)/.test(planWizard), 'plan wizard target and assignments commit together');
note(/savedAt: isoToday\(\)/.test(planWizard), 'wizard-saved plans use the device calendar day');

const planRender = read('application', 'ui', 'plan-render.js');
note(!/Store\.setMeta\(PLAN_DRAFT_KEY[\s\S]{0,80}catch\(\(\) => \{\}\)/.test(planRender), 'plan draft write failures are never swallowed silently');
note(/Plan draft could not be saved/.test(planRender), 'background draft failures are reported instead of pretending they persisted');
note(/const todayISO = \(\) => isoToday\(\)/.test(planRender), 'direct Plan saves use the device calendar day');

const manage = read('application', 'ui', 'manage-data.js');
note(/async function doClearAll[\s\S]*?await Store\.restoreSnapshot\(/.test(manage), 'clear-all is one atomic data-store operation');

const dataExport = read('application', 'output', 'data-export.js');
note(/Store\.allStatements\(\)/.test(dataExport), 'encrypted history includes the statement duplicate/removal index');
note(/await Store\.restoreSnapshot\(/.test(dataExport), 'history import uses the atomic restore pipeline');
// doImportHistory/doExportHistory are wired directly to a file input's
// change event and a button click with no wrapping catch anywhere above
// them (bootUI has none of its own error boundary for these) - so each
// function is on its own for turning a thrown error into something the
// person restoring or creating a backup actually sees, at the exact moment
// that matters most for trusting whether their data is safe.
const exportHistoryStart = dataExport.indexOf('async function doExportHistory');
const importHistoryStart = dataExport.indexOf('async function doImportHistory');
const exportHistoryBody = dataExport.slice(exportHistoryStart, importHistoryStart);
const importHistoryBody = dataExport.slice(importHistoryStart, importHistoryStart + 12000);
note(
  /try \{\s*const text = await exportHistory\([\s\S]{0,300}\} catch \(err\) \{[\s\S]{0,200}toast\(/.test(exportHistoryBody),
  'a failed backup file creation is reported instead of failing silently'
);
note(
  /try \{\s*await Store\.restoreSnapshot\([\s\S]{0,3000}\} catch \(err\) \{[\s\S]{0,200}toast\(/.test(importHistoryBody),
  'a failed restore write shows an error instead of leaving the person guessing whether it worked'
);
note(
  importHistoryBody.indexOf('await Store.restoreSnapshot(') < importHistoryBody.indexOf('state.records = merged.records'),
  'import history only updates in-memory state after the write actually succeeds'
);
for (const field of [
  'firstNameSource',
  'goalBoundary',
  'planTarget',
  'planGroups',
  'planDraft',
  'confirmations',
  'customCategories',
  'tags',
  'transactionSplits',
  'categoryIntentions',
  'forecastSnapshots',
  'manualAssets',
  'investmentStatements',
  'balanceUpdates',
  'workspace',
  'theme',
  'privacy',
]) {
  note(dataExport.includes(field), `${field} is part of full-history orchestration`);
}

const mock = read('application', 'sample-data', 'mock-personas.js');
for (const dependent of ['tags', 'transactionSplits', 'forecastSnapshots']) {
  note(mock.includes(`Store.${dependent}.clear()`), `sample-data cleanup purges ${dependent}`);
}
note(!mock.includes("setMeta('bankRoundTripIds'"), 'sample cleanup no longer writes an unconsumed legacy key');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
