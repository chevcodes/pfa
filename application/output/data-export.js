/*
 * data-export.js  -  the "get your data out or back in" group: CSV export
 * (current view / all), personal category-rule export & import, and the
 * encrypted full-history backup export & import - plus the little export-menu
 * open/close plumbing (toggleExportMenu / onDocClickMenu) that lives beside
 * these triggers.
 *
 * Stage 3c-i of the split. This file is the STATEFUL ORCHESTRATION HALF of the
 * pure serialisers that live in csv-export.js: toCSV / bankToCSV (the CSV
 * writers) and, in history-codec.js, exportHistory / importHistory (the
 * AES-GCM backup lock-and-key) are pure, bootUI-free transforms; the functions
 * here are what a button click runs - they read state, invoke those pure
 * serialisers, drive a file download or a file read, and show a toast.
 * Orchestration versus pure transformation is why this half needs a factory
 * wrapper closing over bootUI members and those pure files do not. The pairing
 * mirrors the ones already established: manage-data.js / storage.js and
 * accounts-render.js / read-statements.js.
 *
 * These functions were lifted verbatim from bootUI in app.js and wrapped
 * in a factory that receives the bootUI members they use via ctx, rather than
 * closing over them. Nothing inside the bodies was renamed; only where a name
 * comes from changed. currentBankViewRows lives with the print-model group in
 * reporting.js (createPrintReports) and is passed in as a function reference,
 * so this file calls it without owning it. today() is
 * a tiny date helper with no bootUI dependency, so it is defined locally here
 * rather than injected. askPassphrase, downloadFile and onDocClickMenu stay
 * internal (called only by their siblings within the group); the factory
 * returns the names wireChrome and printReport still call from app.js.
 */

import {
  bankToCSV,
  toCSV,
  bankToDetailedCSV,
  toDetailedCSV,
  buildUnknownMerchantsCSV,
  csvEscape,
  csvDocument,
  bankRowToCsvFields,
} from '../output/csv-export.js';
import { exportHistory, importHistory } from '../output/history-codec.js';
import {
  exportCategoryRulesFile,
  parseCategoryRulesFile,
  mergeCategoryRules,
} from '../../settings/category-rules.js';
import {
  mergeTransactions,
  mergeBankTransactions,
  cleanBankCounterparty,
} from '../statements/read-statements.js';
import { Store } from '../core/storage.js';
import { requireCtx, DEV_SIGNATURE, enterModal, isoToday } from '../core/shared-helpers.js';
import { mergeCategories } from '../analysis/custom-categories.js';
import { ensureMigrated } from '../analysis/goal-migrate.js';
import { PLAN_DRAFT_KEY, readPlanDraft } from '../analysis/plan-draft.js';
import {
  migrateLegacyConfirmations,
  sanitiseConfirmations,
} from '../analysis/confirmations.js';

function mergeStoredRecords(existing, incoming, keyOf) {
  const byKey = new Map();
  for (const value of [...(existing || []), ...(incoming || [])]) {
    if (!value || typeof value !== 'object') continue;
    const key = keyOf(value);
    if (!key) continue;
    const current = byKey.get(key);
    if (
      !current ||
      String(value.updatedAt || value.importedAt || '') >
        String(current.updatedAt || current.importedAt || '')
    ) {
      byKey.set(key, value);
    }
  }
  return [...byKey.values()];
}

function sameGoal(a, b) {
  const left = ensureMigrated(a);
  const right = ensureMigrated(b);
  if (!left || !right) return false;
  // targetMonths is what the cushion is measured against, so two goals that
  // differ only in their month target are DIFFERENT goals - without it here,
  // changing 5 months to 8 would import as "no change" and be dropped.
  return ['type', 'createdAt', 'targetDays', 'targetMonths', 'targetDate', 'amount'].every(
    (key) => (left[key] ?? null) === (right[key] ?? null)
  );
}

export function createDataExport(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      '$',
      'el',
      'toast',
      'render',
      'persistRules',
      'classifiedBank',
      'visibleRows',
      'defaultDataView',
      'applyWorkspaceSnapshot',
      'buildCategoryColours',
      'currentBankViewRows',
      'openModal',
      'closePicker',
    ],
    'createDataExport'
  );
  const {
    state,
    $,
    el,
    toast,
    render,
    persistRules,
    classifiedBank,
    visibleRows,
    defaultDataView,
    applyWorkspaceSnapshot,
    buildCategoryColours,
    currentBankViewRows,
    openModal,
    closePicker,
  } = ctx;

  // One shared filename builder for every export this module produces, so
  // every file a person downloads reads the same way in Downloads: the ISO
  // date leads (files then sort chronologically with zero effort - the
  // standard reason to lead a filename with YYYY-MM-DD), followed by plain
  // English, with scope and tier called out the same way every time.
  // Replaces the old "finance-<ledger>-<scope>-<date>.csv" convention (e.g.
  // "finance-cards-all-2026-08-22.csv"), technically correct but read like an
  // internal slug rather than something a person chose to name.
  function exportFilename(label, { scope = null, detailed = false, ext = 'csv' } = {}) {
    const tier = detailed ? ' - Detailed' : '';
    const scopeText = scope ? ` (${scope === 'current' ? 'Filtered' : 'All'})` : '';
    return `${today()} ${label}${tier}${scopeText}.${ext}`;
  }

  function toggleExportMenu(force) {
    const m = $('#export-menu');
    if (!m) return;
    const show = force != null ? force : m.hidden;
    m.hidden = !show;
    // The trigger carries aria-expanded="false" in the markup and nothing ever
    // updated it, so it said "collapsed" whether the menu was open or shut - a
    // screen-reader user was told the opposite of what was on screen half the
    // time. The attribute now follows the menu it describes.
    const btn = $('#export-btn');
    if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show)
      setTimeout(() => document.addEventListener('click', onDocClickMenu, { once: true }), 0);
  }

  // Escape closes it and returns focus to the trigger, so a keyboard user is
  // not left inside a menu with no way out but Tab.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = $('#export-menu');
    if (!m || m.hidden) return;
    toggleExportMenu(false);
    const btn = $('#export-btn');
    if (btn && btn.focus) btn.focus();
  });
  function onDocClickMenu(e) {
    if (!e.target.closest('#export-menu') && !e.target.closest('#export-btn'))
      toggleExportMenu(false);
    else document.addEventListener('click', onDocClickMenu, { once: true });
  }

  // The CSV scope × detail choice used to be four separately-worded menu
  // lines that a person had to read word-by-word to tell apart, since they
  // differ only in two independent axes flattened into prose. This reuses
  // the SAME .picker/.picker-scope/.scope classes confirmClearAll's "Keep my
  // category rules" checkbox already uses. The four underlying export
  // functions are unchanged; this dialog only decides which one to call.
  function openCsvExportDialog() {
    toggleExportMenu(false);
    let scope = 'current';
    let detailed = false;
    const scopeCurrent = el(
      'label',
      { class: 'scope' },
      el('input', {
        type: 'radio',
        name: 'csv-scope',
        checked: '',
        onchange: () => {
          scope = 'current';
        },
      }),
      ' Current view'
    );
    const scopeAll = el(
      'label',
      { class: 'scope' },
      el('input', {
        type: 'radio',
        name: 'csv-scope',
        onchange: () => {
          scope = 'all';
        },
      }),
      ' All transactions'
    );
    const detailedCheck = el(
      'label',
      { class: 'scope' },
      el('input', {
        type: 'checkbox',
        onchange: (e) => {
          detailed = e.target.checked;
        },
      }),
      ' Include detailed columns (raw statement text, category confidence, grouping keys)'
    );
    const box = el(
      'div',
      {
        class: 'picker',
        role: 'dialog',
        'aria-label': 'Export transactions as CSV',
      },
      el('div', { class: 'picker-head' }, 'Export transactions (CSV)'),
      el('div', { class: 'picker-scope' }, scopeCurrent, scopeAll, detailedCheck),
      el(
        'div',
        { class: 'picker-actions' },
        el('button', { class: 'btn sm ghost', onclick: closePicker }, 'Cancel'),
        el(
          'button',
          {
            class: 'btn sm',
            onclick: () => {
              closePicker();
              // A ternary evaluated for its side effect reads as a value being
              // computed and thrown away; these are four different exports.
              if (scope === 'current') {
                if (detailed) exportCurrentDetailedCSV();
                else exportCurrentCSV();
              } else if (detailed) {
                exportAllDetailedCSV();
              } else {
                exportAllCSV();
              }
            },
          },
          'Export'
        )
      )
    );
    openModal(box);
  }

  // The Overview is the consolidated view, so its CSV carries BOTH ledgers as
  // two clearly separated, separately-headed sections in one file (the CSV
  // analogue of separate tabs). No merged total is produced, so the two ledgers
  // stay apart (D1). toCSV / bankToCSV are the same pure serialisers the
  // single-ledger exports use.
  function combinedCSV(cardRows, bankRecs, code) {
    const head = [
      'Ledger',
      'Date',
      'Account',
      'Description',
      'Category',
      'Type',
      'Flow',
      'Amount',
      'Currency',
      'Running Balance',
      'Statement',
      'Foreign',
    ];
    const lines = [head.map(csvEscape).join(',')];
    for (const r of cardRows) {
      const desc = r.displayName || r.description;
      lines.push(
        [
          'Card',
          r.date,
          '',
          desc,
          r.category,
          r.kind,
          '',
          r.amount.toFixed(2),
          code,
          '',
          r.source_file,
          r.foreign || '',
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    for (const r of bankRecs) {
      const { flow, signed, bal, cp } = bankRowToCsvFields(r, code);
      lines.push(
        [
          'Account',
          r.date,
          r.account || '',
          cp,
          '',
          '',
          flow,
          signed,
          r.currency || code,
          bal,
          r.source_file || '',
          '',
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    return csvDocument(lines);
  }

  // The Detailed counterpart to combinedCSV: full traceability for BOTH
  // ledgers in one file - raw text, every cleaning stage, and each ledger's
  // own internal grouping key (merchantGroup for cards, counterpartyKey for
  // accounts) - so Overview gets the same Clean/Detailed choice as each
  // single ledger, rather than being stuck on one tier. Blank where a column
  // does not apply to that ledger, the same pattern combinedCSV already uses.
  function combinedDetailedCSV(cardRows, bankRecs, code) {
    const head = [
      'Ledger',
      'Date',
      'Account',
      'Reference',
      'Raw Description',
      'Cleaned Description',
      'Counterparty / Merchant',
      'Group',
      'Category',
      'Category Confidence',
      'Internal Transfer',
      'Type',
      'Flow',
      'Amount',
      'Currency',
      'Running Balance',
      'Foreign',
      'Statement',
    ];
    const lines = [head.map(csvEscape).join(',')];
    for (const r of cardRows) {
      lines.push(
        [
          'Card',
          r.date,
          '',
          r.ref || '',
          r.raw_description,
          r.description,
          r.displayName || r.description,
          r.merchantGroup || '',
          r.category,
          r.confidence,
          '',
          r.kind,
          '',
          r.amount.toFixed(2),
          code,
          '',
          r.foreign || '',
          r.source_file,
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    for (const r of bankRecs) {
      const { flow, signed, bal, cp } = bankRowToCsvFields(r, code);
      lines.push(
        [
          'Account',
          r.date,
          r.account || '',
          '',
          r.description,
          cleanBankCounterparty(r.description),
          cp,
          r.counterpartyKey || '',
          '',
          '',
          r.internalTransfer ? 'Yes' : 'No',
          r.type || '',
          flow,
          signed,
          r.currency || code,
          bal,
          '',
          r.source_file || '',
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    return csvDocument(lines);
  }

  // CSV export follows the ledger on screen. In the Accounts view it writes the
  // bank ledger (with flow and running balance); otherwise the card ledger. The
  // Overview writes both ledgers as two labelled sections in one file.
  // Labels correspond directly to the app's own tab names (Overview / Cards /
  // Accounts, per LABELS in renderLedgerSwitch), with "Transactions" added
  // where the tab name alone would not make clear this is the underlying
  // data rather than a screenshot of the dashboard.
  function exportLabel() {
    if (state.view === 'overview') return 'Overview';
    if (state.view === 'accounts') return 'Account Transactions';
    return 'Card Transactions';
  }

  function exportCurrentCSV() {
    toggleExportMenu(false);
    if (state.view === 'overview') {
      const card = visibleRows();
      const bank = currentBankViewRows();
      downloadFile(
        exportFilename(exportLabel(), { scope: 'current' }),
        combinedCSV(card, bank, state.cfg.currency.code),
        'text/csv'
      );
      toast(
        `Saved this view: ${card.length} card and ${bank.length} account transaction${card.length + bank.length === 1 ? '' : 's'}.`
      );
      return;
    }
    if (state.view === 'accounts' && state.bankRecords.length) {
      const recs = currentBankViewRows();
      const n = recs.length;
      downloadFile(
        exportFilename(exportLabel(), { scope: 'current' }),
        bankToCSV(recs, state.cfg.currency.code),
        'text/csv'
      );
      toast(`Saved ${n} account transaction${n === 1 ? '' : 's'} as CSV.`);
      return;
    }
    const n = visibleRows().length;
    downloadFile(
      exportFilename(exportLabel(), { scope: 'current' }),
      toCSV(visibleRows(), state.cfg.currency.code),
      'text/csv'
    );
    toast(`Saved ${n} transaction${n === 1 ? '' : 's'} as CSV.`);
  }
  function exportAllCSV() {
    toggleExportMenu(false);
    if (state.view === 'overview') {
      const card = state.rows;
      const bank = classifiedBank();
      downloadFile(
        exportFilename(exportLabel(), { scope: 'all' }),
        combinedCSV(card, bank, state.cfg.currency.code),
        'text/csv'
      );
      toast(
        `Saved all: ${card.length} card and ${bank.length} account transaction${card.length + bank.length === 1 ? '' : 's'}.`
      );
      return;
    }
    if (state.view === 'accounts' && state.bankRecords.length) {
      const recs = classifiedBank();
      const n = recs.length;
      downloadFile(
        exportFilename(exportLabel(), { scope: 'all' }),
        bankToCSV(recs, state.cfg.currency.code),
        'text/csv'
      );
      toast(`Saved all ${n} account transaction${n === 1 ? '' : 's'} as CSV.`);
      return;
    }
    const n = state.rows.length;
    downloadFile(
      exportFilename(exportLabel(), { scope: 'all' }),
      toCSV(state.rows, state.cfg.currency.code),
      'text/csv'
    );
    toast(`Saved all ${n} transaction${n === 1 ? '' : 's'} as CSV.`);
  }

  // Detailed tier: same view-aware branching as the Clean exports above,
  // calling each ledger's Detailed serialiser instead. A person reaches this
  // through a second, clearly separate menu action - never the default - so
  // the raw statement text and reference numbers never surface unless
  // deliberately asked for.
  function exportCurrentDetailedCSV() {
    toggleExportMenu(false);
    if (state.view === 'overview') {
      const card = visibleRows();
      const bank = currentBankViewRows();
      downloadFile(
        exportFilename(exportLabel(), { scope: 'current', detailed: true }),
        combinedDetailedCSV(card, bank, state.cfg.currency.code),
        'text/csv'
      );
      toast(
        `Saved detailed view: ${card.length} card and ${bank.length} account transaction${card.length + bank.length === 1 ? '' : 's'}.`
      );
      return;
    }
    if (state.view === 'accounts' && state.bankRecords.length) {
      const recs = currentBankViewRows();
      const n = recs.length;
      downloadFile(
        exportFilename(exportLabel(), { scope: 'current', detailed: true }),
        bankToDetailedCSV(recs, state.cfg.currency.code),
        'text/csv'
      );
      toast(`Saved ${n} detailed account transaction${n === 1 ? '' : 's'} as CSV.`);
      return;
    }
    const n = visibleRows().length;
    downloadFile(
      exportFilename(exportLabel(), { scope: 'current', detailed: true }),
      toDetailedCSV(visibleRows(), state.cfg.currency.code),
      'text/csv'
    );
    toast(`Saved ${n} detailed transaction${n === 1 ? '' : 's'} as CSV.`);
  }
  function exportAllDetailedCSV() {
    toggleExportMenu(false);
    if (state.view === 'overview') {
      const card = state.rows;
      const bank = classifiedBank();
      downloadFile(
        exportFilename(exportLabel(), { scope: 'all', detailed: true }),
        combinedDetailedCSV(card, bank, state.cfg.currency.code),
        'text/csv'
      );
      toast(
        `Saved all detailed: ${card.length} card and ${bank.length} account transaction${card.length + bank.length === 1 ? '' : 's'}.`
      );
      return;
    }
    if (state.view === 'accounts' && state.bankRecords.length) {
      const recs = classifiedBank();
      const n = recs.length;
      downloadFile(
        exportFilename(exportLabel(), { scope: 'all', detailed: true }),
        bankToDetailedCSV(recs, state.cfg.currency.code),
        'text/csv'
      );
      toast(`Saved all ${n} detailed account transaction${n === 1 ? '' : 's'} as CSV.`);
      return;
    }
    const n = state.rows.length;
    downloadFile(
      exportFilename(exportLabel(), { scope: 'all', detailed: true }),
      toDetailedCSV(state.rows, state.cfg.currency.code),
      'text/csv'
    );
    toast(`Saved all ${n} detailed transaction${n === 1 ? '' : 's'} as CSV.`);
  }

  // Contribute-back export (Manage Data, not the Export menu): a lightweight
  // feedback loop for merchant-intelligence gaps. Uses buildUnknownMerchantsCSV
  // (csv-export.js) over state.rows - whole history, no period scoping - so this
  // reflects total coverage rather than one month's view.
  function exportUnknownMerchants() {
    const { csv, count } = buildUnknownMerchantsCSV(state.rows, state.cfg.special.fallback);
    if (!count) {
      toast('No unrecognised merchants to send right now.');
      return;
    }
    downloadFile(exportFilename('Unrecognised Merchants'), csv, 'text/csv');
    toast(
      `Saved ${count} unrecognised merchant${count === 1 ? '' : 's'}. Feel free to remove any you don't want to include before sending.`
    );
  }

  function exportRules() {
    toggleExportMenu(false);
    if (!state.rules.length) {
      toast('No personal rules have been saved yet.');
      return;
    }
    downloadFile(
      exportFilename('Category Rules', { ext: 'json' }),
      exportCategoryRulesFile(state.rules),
      'application/json'
    );
    toast(`Exported ${state.rules.length} personal rule${state.rules.length === 1 ? '' : 's'}.`);
  }
  async function importRules(e) {
    const input = e.currentTarget;
    const file = input.files[0];
    if (!file) return;
    let parsed;
    try {
      parsed = parseCategoryRulesFile(await file.text());
    } catch (err) {
      toast(err.message);
      input.value = '';
      return;
    }
    if (!parsed.rules.length) {
      toast('No usable rules were found in that file.');
      input.value = '';
      return;
    }
    const beforeRows = state.rows.slice();
    const merged = mergeCategoryRules(state.rules, parsed.rules);
    state.rules = merged.rules;
    await persistRules();
    render();
    const beforeById = new Map(beforeRows.map((r) => [r.id, r.category]));
    const affected = state.rows.filter((r) => beforeById.get(r.id) !== r.category).length;
    const importedCount = merged.inserted + merged.updated;
    const skippedText = parsed.skipped
      ? ` · skipped ${parsed.skipped} malformed entr${parsed.skipped === 1 ? 'y' : 'ies'}`
      : '';
    toast(
      `Imported ${importedCount} rule${importedCount === 1 ? '' : 's'} and updated ${affected} transaction${affected === 1 ? '' : 's'}${skippedText}.`
    );
    input.value = '';
  }

  async function doExportHistory() {
    toggleExportMenu(false);
    const pass = await askPassphrase(
      'Set a passphrase for this history file. You will enter the same one when importing on the other device. It cannot be recovered.',
      { confirm: true }
    );
    if (!pass) return;
    const isMockData = !!(await Store.getMeta('mockPersonaLoaded', null));
    const meta = {
      device: isMockData ? DEV_SIGNATURE : state.deviceId,
      exportedAt: new Date().toISOString(),
      count: state.records.length,
    };
    const [sourceStatements, dormantGoals, workspace, theme, privacy] = await Promise.all([
      Store.allStatements(),
      Store.goals.all(),
      Store.getMeta('workspaceState', null),
      Store.getMeta('theme', null),
      Store.getMeta('privacy', null),
    ]);
    const bundle = {
      bankRecords: state.bankRecords || [],
      sourceStatements,
      bankStatements: state._bankStatements || [],
      cardStatements: state._cardStatements || [],
      myAccounts: state.myAccounts || [],
      cardAccounts: state.cardAccounts || [],
      rules: state.rules || [],
      confirmations: state.confirmations || [],
      sharedAccounts: state.sharedAccounts || [],
      householdPayees: state.householdPayees || [],
      firstName: state.firstName || null,
      firstNameSource: state.firstNameSource || null,
      goal: state.goal || null,
      goalLog: state.goalLog || [],
      goalBoundary: state._goalBoundary || null,
      planTarget: state._planTarget || null,
      planGroups: state._planGroups || null,
      planDraft: state._planDraft || null,
      customCategories: state.customCategories || [],
      tags: state.tags || [],
      transactionSplits: state.transactionSplits || [],
      categoryIntentions: state.categoryIntentions || [],
      forecastSnapshots: state.forecastSnapshots || [],
      manualAssets: state.manualAssets || [],
      balanceUpdates: state.balanceUpdates || [],
      investmentStatements: state._investmentStatements || [],
      accountNames: state.accountNames || {},
      goals: dormantGoals,
      workspace,
      theme,
      privacy,
    };
    // This codebase has already shipped one silent "Back up now did nothing
    // visible" failure (see the late-bound doExportHistory comment above) -
    // a different cause, but the same lesson: a backup attempt must never
    // fail without the person seeing it, especially since a failure here
    // means they still have no backup and may believe otherwise.
    try {
      const text = await exportHistory(state.records, meta, pass, bundle);
      downloadFile(
        exportFilename('Encrypted History Backup', { ext: 'ccah' }),
        text,
        'application/octet-stream'
      );
    } catch (err) {
      console.warn('Encrypted backup could not be created:', err);
      toast(`This backup could not be created. Try again.`);
      return;
    }
    toast('History file created. Move it to your other device, then Import history there.');
  }
  async function doImportHistory(e) {
    const input = e.currentTarget;
    const file = input.files[0];
    if (!file) return;
    const pass = await askPassphrase('Enter the passphrase you set when exporting this file.');
    if (!pass) {
      input.value = '';
      return;
    }
    let data;
    try {
      data = await importHistory(await file.text(), pass);
    } catch (err) {
      toast(err.message);
      input.value = '';
      return;
    }
    const sourceDevice = (data.meta && data.meta.device) || 'another device';
    const importedAt = new Date().toISOString();
    const tag = (raw) => ({
      ...raw,
      importedFrom: raw.importedFrom || sourceDevice,
      importedAt: raw.importedAt || importedAt,
    });
    const hadCardBefore = state.records.length > 0;
    const hadBankBefore = state.bankRecords.length > 0;
    const [sourceStatements, dormantGoals, localWorkspace, localTheme, localPrivacy] =
      await Promise.all([
        Store.allStatements(),
        Store.goals.all(),
        Store.getMeta('workspaceState', null),
        Store.getMeta('theme', null),
        Store.getMeta('privacy', null),
      ]);
    const merged = mergeTransactions(state.records, (data.records || []).map(tag));
    const bank = data.bank || {};
    const bankTx = (bank.transactions || []).map(tag);
    const bmerged = mergeBankTransactions(state.bankRecords, bankTx);
    const bankAdded = bmerged.added;
    const nextSourceStatements = mergeStoredRecords(
      sourceStatements,
      bank.sourceStatements,
      (value) => value.hash
    );
    const nextBankStatements = mergeStoredRecords(
      state._bankStatements,
      bank.statements,
      (value) => value.hash
    );
    const nextCardStatements = mergeStoredRecords(
      state._cardStatements,
      bank.cardStatements,
      (value) => value.hash
    );
    const nextCardAccounts = [...new Set([...(state.cardAccounts || []), ...bank.cardAccounts])];
    const nextMyAccounts = [...new Set([...(state.myAccounts || []), ...bank.myAccounts])];
    const rmerged = mergeCategoryRules(state.rules, data.rules);
    const rulesAdded = rmerged.inserted + rmerged.updated;
    const lr = data.ledgerRules || {};
    const nextSharedAccounts = [
      ...new Set([...(state.sharedAccounts || []), ...(lr.sharedAccounts || [])]),
    ];
    const nextHouseholdPayees = [
      ...new Set([...(state.householdPayees || []), ...(lr.householdPayees || [])]),
    ];
    const profile = data.profile || {};
    const nextFirstName = state.firstName || profile.firstName || null;
    const nextFirstNameSource = state.firstName
      ? state.firstNameSource
      : profile.firstNameSource || (profile.firstName ? 'manual' : null);
    let nextGoal = state.goal;
    let nextGoalLog = state.goalLog || [];
    let nextGoalBoundary = state._goalBoundary || null;
    if (!nextGoal && profile.goal) {
      nextGoal = ensureMigrated(profile.goal) || profile.goal;
      nextGoalLog = profile.goalLog || [];
      nextGoalBoundary = profile.goalBoundary || null;
    } else if (sameGoal(nextGoal, profile.goal)) {
      nextGoalLog = mergeStoredRecords(nextGoalLog, profile.goalLog, (value) => value.month)
        .sort((a, b) => String(a.month).localeCompare(String(b.month)))
        .slice(-24);
      nextGoalBoundary = nextGoalBoundary || profile.goalBoundary || null;
    }
    const planning = data.planning || {};
    const nextPlanDraft = readPlanDraft(state._planDraft || planning.draft || null);
    const nextPlanTarget = state._planTarget || planning.target || null;
    const nextPlanGroups = state._planGroups || planning.groups || null;
    const userData = data.userData || {};
    const nextCustomCategories = mergeStoredRecords(
      state.customCategories,
      userData.customCategories,
      (value) => String(value.name || '').trim().toLowerCase()
    );
    const nextTags = mergeStoredRecords(state.tags, userData.tags, (value) => value.id);
    const nextTransactionSplits = mergeStoredRecords(
      state.transactionSplits,
      userData.transactionSplits,
      (value) => value.id
    );
    const nextCategoryIntentions = mergeStoredRecords(
      state.categoryIntentions,
      userData.categoryIntentions,
      (value) => value.id
    );
    const nextForecastSnapshots = mergeStoredRecords(
      state.forecastSnapshots,
      userData.forecastSnapshots,
      (value) => value.id
    );
    const nextManualAssets = mergeStoredRecords(
      state.manualAssets,
      userData.manualAssets,
      (value) => value.id
    );
    const nextBalanceUpdates = mergeStoredRecords(
      state.balanceUpdates,
      userData.balanceUpdates,
      (value) => value.id
    );
    const nextInvestmentStatements = mergeStoredRecords(
      state._investmentStatements,
      (data.investments || {}).statements,
      (value) => value.hash
    );
    const nextGoals = mergeStoredRecords(dormantGoals, userData.goals, (value) => value.id);
    // A backup written before the shared answer store carried the same answers
    // in three older shapes; they are turned into confirmations here so an
    // older file's answers arrive intact. An answer already on this device wins
    // over one arriving from a file, as every other merge here does.
    const nextConfirmations = migrateLegacyConfirmations(
      data.legacyConfirmations || {},
      mergeStoredRecords(
        sanitiseConfirmations(state.confirmations),
        sanitiseConfirmations(userData.confirmations),
        (value) => value.id
      )
    );
    const lastImportedFrom = {
      at: importedAt,
      device: sourceDevice,
    };
    const restoreWorkspace = !hadCardBefore && !hadBankBefore && data.workspace;
    const nextWorkspace = restoreWorkspace ? data.workspace : localWorkspace;
    const preferences = data.preferences || {};
    const nextTheme = localTheme || preferences.theme || 'auto';
    const nextPrivacy = localPrivacy || preferences.privacy || 'off';
    const nextAccountNames = { ...(preferences.accountNames || {}), ...(state.accountNames || {}) };
    // Everything above is pure in-memory computation; nothing about the
    // stored data or app state has changed yet. This write is the one real
    // point of failure (disk/quota/a blocked transaction), and until now
    // nothing here caught it - an error would become an unhandled rejection
    // on the <input change> listener with no toast, no state change, and no
    // way for someone restoring a backup (already a high-stakes moment) to
    // tell whether it worked. Caught the same way the decode step above
    // already is: a clear toast, the picker reset, nothing left half-applied
    // since state is only mutated below, after this succeeds.
    try {
      await Store.restoreSnapshot({
        stores: {
          transactions: merged.records,
          statements: nextSourceStatements,
          rules: rmerged.rules,
          bankTransactions: bmerged.records,
          bankStatements: nextBankStatements,
          cardStatements: nextCardStatements,
          tags: nextTags,
          transactionSplits: nextTransactionSplits,
          categoryIntentions: nextCategoryIntentions,
          goals: nextGoals,
          forecastSnapshots: nextForecastSnapshots,
          manualAssets: nextManualAssets,
          balanceUpdates: nextBalanceUpdates,
          investmentStatements: nextInvestmentStatements,
          confirmations: nextConfirmations,
        },
        meta: {
          bankCardAccounts: nextCardAccounts,
          bankMyAccounts: nextMyAccounts,
          bankSharedAccounts: nextSharedAccounts,
          bankHouseholdPayees: nextHouseholdPayees,
          firstName: nextFirstName,
          firstNameSource: nextFirstNameSource,
          financeGoal: nextGoal,
          financeGoalLog: nextGoalLog,
          financeGoalBoundary: nextGoalBoundary,
          planTarget: nextPlanTarget,
          planGroups: nextPlanGroups,
          [PLAN_DRAFT_KEY]: nextPlanDraft,
          customCategories: nextCustomCategories,
          lastImportedFrom,
          lastLocalUpdate: importedAt,
          theme: nextTheme,
          privacy: nextPrivacy,
          accountNames: nextAccountNames,
          ...(nextWorkspace ? { workspaceState: nextWorkspace } : {}),
        },
      });
    } catch (err) {
      console.warn('Encrypted backup could not be restored:', err);
      toast(`This backup could not be restored. Your existing data on this device is unchanged.`);
      input.value = '';
      return;
    }
    state.records = merged.records;
    state.bankRecords = bmerged.records;
    state._bankStatements = nextBankStatements;
    state._cardStatements = nextCardStatements;
    state.cardAccounts = nextCardAccounts;
    state.myAccounts = nextMyAccounts;
    state.rules = rmerged.rules;
    state.confirmations = nextConfirmations;
    state.sharedAccounts = nextSharedAccounts;
    state.householdPayees = nextHouseholdPayees;
    state.firstName = nextFirstName;
    state.firstNameSource = nextFirstNameSource;
    state.goal = nextGoal;
    state.goalLog = nextGoalLog;
    state._goalBoundary = nextGoalBoundary;
    state._planTarget = nextPlanTarget;
    state._planGroups = nextPlanGroups;
    state._planDraft = nextPlanDraft;
    state.customCategories = nextCustomCategories;
    state.tags = nextTags;
    state.transactionSplits = nextTransactionSplits;
    state.categoryIntentions = nextCategoryIntentions;
    state.forecastSnapshots = nextForecastSnapshots;
    state.manualAssets = nextManualAssets;
    state.balanceUpdates = nextBalanceUpdates;
    state._investmentStatements = nextInvestmentStatements;
    state.accountNames = nextAccountNames;
    state.cfg.categories = mergeCategories(state.cfg.categories, nextCustomCategories);
    state.lastImportedFrom = lastImportedFrom;
    state.lastLocalUpdate = importedAt;
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.privacy = nextPrivacy;
    buildCategoryColours();
    if (restoreWorkspace) applyWorkspaceSnapshot(data.workspace);
    else if ((!hadCardBefore && state.records.length) || (!hadBankBefore && state.bankRecords.length)) {
      state.view = defaultDataView();
    }
    render();
    const bankNote = bankAdded
      ? ` Plus ${bankAdded} account transaction${bankAdded === 1 ? '' : 's'}.`
      : '';
    const rulesNote = rulesAdded
      ? ` ${rulesAdded} category rule${rulesAdded === 1 ? '' : 's'} added.`
      : '';
    toast(
      `Brought in ${merged.added} transaction${merged.added === 1 ? '' : 's'}. ${merged.alreadyPresent} were already present.${bankNote}${rulesNote}`
    );
    input.value = '';
  }

  // When opts.confirm is set (export only), a second field must match the first
  // before Continue is allowed. A typo on export otherwise produces a file that
  // can never be opened, discovered only later on import. Import stays a single
  // field. Cancel/close always returns control to the dashboard (resolve null).
  function askPassphrase(prompt, opts = {}) {
    return new Promise((resolve) => {
      const inp = el('input', {
        type: 'password',
        placeholder: 'Passphrase',
        class: 'pass',
      });
      const kids = [el('div', { class: 'picker-head' }, prompt), inp];
      let confirmInp = null,
        note = null;
      if (opts.confirm) {
        confirmInp = el('input', {
          type: 'password',
          placeholder: 'Confirm passphrase',
          class: 'pass',
        });
        note = el('div', { class: 'pass-note', hidden: '' }, 'Those passphrases do not match yet.');
        kids.push(confirmInp, note);
      }
      // ONE way out, so no exit can forget to release the modal contract.
      // Three separate `overlay.remove(); resolve(...)` pairs used to sit here
      // (Continue, Cancel, backdrop) - with a contract to undo, a fourth path
      // that skipped it would leave the page inert and unscrollable.
      let release = null;
      const finish = (value) => {
        if (release) release();
        release = null;
        overlay.remove();
        resolve(value);
      };
      const done = () => {
        const v = inp.value.trim();
        if (!v) return;
        if (opts.confirm) {
          if (v !== confirmInp.value.trim()) {
            note.hidden = false;
            return;
          }
        }
        finish(v);
      };
      kids.push(
        el(
          'div',
          { class: 'picker-actions' },
          el(
            'button',
            {
              class: 'btn sm ghost',
              onclick: () => finish(null),
            },
            'Cancel'
          ),
          el('button', { class: 'btn sm', onclick: done }, 'Continue')
        )
      );
      // The most security-sensitive dialog in the app, and the one that had the
      // least: no role, no label, no aria-modal, no Escape, no focus trap, a
      // live tabbable page behind it, and the back-to-top button hit-testing on
      // top of its backdrop. It goes through the same contract as every other
      // overlay now, and says what it is.
      const box = el(
        'div',
        { class: 'picker', role: 'dialog', 'aria-label': 'Passphrase' },
        ...kids
      );
      const overlay = el(
        'div',
        {
          class: 'overlay',
          onclick: (e) => {
            if (e.target === overlay) finish(null);
          },
        },
        box
      );
      document.body.append(overlay);
      release = enterModal(overlay, {
        onDismiss: () => finish(null),
        returnFocus: $('#export-btn'),
      });
      const onKey = (e) => {
        if (e.key === 'Enter') done();
      };
      inp.addEventListener('keydown', onKey);
      if (confirmInp) {
        confirmInp.addEventListener('keydown', onKey);
        confirmInp.addEventListener('input', () => {
          note.hidden = true;
        });
      }
    });
  }

  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const today = () => isoToday();

  return {
    toggleExportMenu,
    exportCurrentCSV,
    exportAllCSV,
    exportCurrentDetailedCSV,
    exportAllDetailedCSV,
    exportUnknownMerchants,
    exportRules,
    importRules,
    doExportHistory,
    doImportHistory,
    openCsvExportDialog,
  };
}
