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
for (const field of [
  'firstNameSource',
  'goalBoundary',
  'planTarget',
  'planGroups',
  'planSetAside',
  'planDraft',
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
