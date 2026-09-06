/*
 * manage-data.js  -  the "Manage data" group: reload config, remove a single
 * statement, and clear all data (start over).
 *
 * Stage 3b of the split. These five functions were lifted verbatim from bootUI
 * in app.js and wrapped in a factory that receives the bootUI members they use
 * via ctx, rather than closing over them. Nothing inside the bodies was renamed;
 * only where a name comes from changed. Two sanctioned line edits replace the
 * private pickerEl access, mirroring Stage 2 and Stage 3a: openRemoveStatement
 * and confirmClearAll now call openOverlay(overlay) to show their modal instead
 * of touching the private pickerEl variable directly. removeStatement and
 * doClearAll stay internal (called only by their siblings within the group);
 * the factory returns just the three names app.js still calls from
 * renderManageData: reloadConfig, openRemoveStatement and confirmClearAll.
 */

import { compileRules } from '../statements/categorise.js';
import { compileBrandRules } from '../../settings/category-rules.js';
import { Store } from '../core/storage.js';
import { requireCtx, withConfigDefaults, formatDisplayDate } from '../core/shared-helpers.js';
import { compileFromRaw } from '../statements/merchant-resolver.js';
import { resetPlanDraft } from './plan-render.js';
import { PLAN_DRAFT_KEY } from '../analysis/plan-draft.js';
import { buildStatementRemovalPlan } from '../analysis/statement-cascade.js';
import { pruneBalanceUpdates } from '../analysis/balance-updates.js';
import { commitAndRender } from './reversible.js';

export function createManageData(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      '$',
      'toast',
      'render',
      'closePicker',
      'openModal',
      'applyThemeColours',
      'buildCategoryColours',
      'resetWorkspaceState',
    ],
    'createManageData'
  );
  const {
    state,
    el,
    $,
    toast,
    render,
    closePicker,
    openModal,
    applyThemeColours,
    buildCategoryColours,
    resetWorkspaceState,
  } = ctx;

  // Re-fetch config.json (cache-busting) and re-apply everything it drives, then
  // re-render. Presentation only: it never touches stored transactions.
  async function reloadConfig() {
    try {
      const res = await fetch(
        new URL('../../settings/config.json?ts=' + Date.now(), import.meta.url),
        { cache: 'no-store' }
      );
      const cfg = withConfigDefaults(await res.json());
      state.cfg = cfg;
      state.compiled = compileRules(cfg.categories);
      state.brandRules = compileBrandRules(cfg);
      // Re-fetch and recompile the merchant list too, so a runtime config reload
      // never leaves the merchant grouping and categorisation running on a stale list.
      try {
        const mFile = (cfg.merchants && cfg.merchants.file) || 'jamaica-merchants.json';
        const mRes = await fetch(
          new URL('../../settings/' + mFile + '?ts=' + Date.now(), import.meta.url),
          { cache: 'no-store' }
        );
        const rawMerchants = await mRes.json();
        const cleanupRules = [];
        for (const r of (cfg.bankDescriptorCleanup && cfg.bankDescriptorCleanup.rules) || []) {
          if (!r || !r.pattern) continue;
          try {
            cleanupRules.push({
              pattern: new RegExp(r.pattern, r.flags || 'i'),
              replacement: r.replacement || '',
            });
          } catch {
            // One unparseable cleanup pattern must not cost the person every
            // other rule in the file. Skip it and keep compiling the rest.
          }
        }
        state.resolver = compileFromRaw(rawMerchants, cfg, cleanupRules);
        state.merchants = state.resolver.compiled;
      } catch {
        state.merchants = [];
        state.resolver = null;
      }
      state.keepUpper = new Set(cfg.keepUpper);
      state.smallWords = new Set(cfg.smallWords);
      applyThemeColours();
      buildCategoryColours();
      render();
      toast('Configuration reloaded.');
    } catch {
      toast('That configuration file could not be read. Your current settings are unchanged.');
    }
  }

  // Remove a single wrongly-imported statement and its transactions. Now
  // lists BOTH ledgers - previously only Store.allStatements() (card) was
  // read, so anyone on the Accounts tab (or with bank-only data) saw "No
  // statements are stored yet." even with bank statements plainly on screen.
  // That was survivable while Manage Data lived only on Cards; now that it
  // renders on every tab, it needs to be honest about every statement stored,
  // not just the card ledger's.
  /* A note explains a file. Remove the file and there is nothing left for it
   * to explain, so it goes with it - and only if no OTHER stored statement
   * still comes from that same PDF. */
  async function dropNotesFor(file) {
    if (!(state.importNotes || []).some((note) => note && note.file === file)) return;
    const stillHere = [
      ...(state._cardStatements || []),
      ...(state._bankStatements || []),
      ...(state._investmentStatements || []),
    ].some((st) => st && st.source_file === file);
    if (stillHere) return;
    state.importNotes = state.importNotes.filter((note) => note.file !== file);
    await Store.setMeta('importNotes', state.importNotes);
  }

  async function removeInvestmentStatement(st) {
    await commitAndRender({
      commit: async () => {
        await Store.investmentStatements.delete(st.hash);
        state._investmentStatements = await Store.investmentStatements.all();
        await dropNotesFor(st.source_file);
        closePicker();
      },
      render,
      notify: () => toast(`Removed the investment statement ending ${formatDisplayDate(st.periodEnd)}.`),
    });
  }

  function investmentRows(match = null) {
    return (state._investmentStatements || [])
      .filter((st) => !match || match({ ...st, ledger: 'investment' }))
      .sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd)))
      .map((st) => {
        const holdings = (st.holdings || []).length;
        const notes = notesFor(st.source_file);
        return el(
          'div',
          { class: 'stmt-row' + (notes.length ? ' has-note' : '') },
          el(
            'div',
            { class: 'stmt-body' },
            el('div', { class: 'strong' }, `${st.source_file} · Investments`),
            el(
              'div',
              { class: 'muted small' },
              `Statement ending ${formatDisplayDate(st.periodEnd)} · ${holdings} holding${holdings === 1 ? '' : 's'}`
            ),
            ...notes.map((note) => el('div', { class: 'stmt-note-line small' }, note))
          ),
          el(
            'button',
            { class: 'btn sm danger', onclick: () => removeInvestmentStatement(st) },
            'Remove statement'
          )
        );
      });
  }

  /* What the reader could not do with this file, said on the file.
   *
   * These notes were raised during the import and thrown away with the toast
   * that carried them, so a statement that half-read, or ran into a new year,
   * or held a transaction dated after itself, looked identical afterwards to
   * one that read cleanly. This list is where the file itself lives and where
   * the way to replace it already is, so it is where the note belongs. */
  function notesFor(file) {
    return (state.importNotes || [])
      .filter((note) => note && note.file === file)
      // The sentence names the file because the toast that first carried it
      // had nothing else to identify it by. On the file's own row that is the
      // heading directly above, so it is not said twice.
      .map((note) => note.text.replace(new RegExp(`^${escapeForMatch(file)}\\s*[:\u00b7-]?\\s*`), ''));
  }

  function escapeForMatch(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // `opts.match(st)` narrows which statements are listed - `st` always carries
  // its `ledger` ('card' | 'bank' | 'investment'), plus every field Store
  // already gives that ledger's statements. `opts.reason` replaces the generic
  // "Imported files" heading, so a filtered door states why it landed here.
  // A reconciliation figure or a per-account tile can now open exactly the
  // statements it is about, through this SAME dialog, instead of a second,
  // parallel, filtered view growing beside it.
  async function openRemoveStatement(opts = {}) {
    const { match = null, reason = null } = opts;
    const cardStmts = await Store.allStatements();
    const bankStmts = await Store.allBankStatements();
    if (!cardStmts.length && !bankStmts.length && !(state._investmentStatements || []).length) {
      toast('No statements are stored yet.');
      return;
    }
    closePicker();
    const byFile = {};
    for (const r of state.rows) byFile[r.source_file] = (byFile[r.source_file] || 0) + 1;
    const byBankFile = {};
    for (const r of state.bankRecords)
      byBankFile[r.source_file] = (byBankFile[r.source_file] || 0) + 1;
    const combined = [
      ...cardStmts.map((st) => ({ ...st, ledger: 'card' })),
      ...bankStmts.map((st) => ({ ...st, ledger: 'bank' })),
    ]
      .filter((st) => !match || match(st))
      .sort((a, b) => String(b.importedAt || '').localeCompare(String(a.importedAt || '')));
    const grouped = new Map();
    for (const st of combined) {
      const key = `${st.ledger}:${st.source_file}`;
      const existing = grouped.get(key);
      if (existing) existing.statementCount += 1;
      else grouped.set(key, { ...st, statementCount: 1 });
    }
    const list = el('div', { class: 'picker-list' });
    for (const st of grouped.values()) {
      const count =
        st.ledger === 'card' ? byFile[st.source_file] || 0 : byBankFile[st.source_file] || 0;
      const ledgerLabel = st.ledger === 'card' ? 'Card' : 'Account';
      const statementLabel = `${st.statementCount} statement${st.statementCount === 1 ? '' : 's'}`;
      list.append(
        el(
          'div',
          { class: 'stmt-row' + (notesFor(st.source_file).length ? ' has-note' : '') },
          el(
            'div',
            { class: 'stmt-body' },
            el('div', { class: 'strong' }, `${st.source_file} · ${ledgerLabel}`),
            el(
              'div',
              { class: 'muted small' },
              `${statementLabel} · ${count} transaction${count === 1 ? '' : 's'}`
            ),
            ...notesFor(st.source_file).map((note) =>
              el('div', { class: 'stmt-note-line small' }, note)
            )
          ),
          el(
            'button',
            {
              class: 'btn sm danger',
              onclick: () => (st.ledger === 'card' ? removeStatement(st) : removeBankStatement(st)),
            },
            'Remove file'
          )
        )
      );
    }
    list.append(...investmentRows(match));
    // A filtered door that turns up nothing has been overtaken by events (the
    // statement was already fixed or removed elsewhere) - say so and stop,
    // rather than open a dialog with nothing in it.
    if (match && !list.children.length) {
      toast('Nothing needs a look there right now.');
      return;
    }
    // A file with a note sorts first. A person arriving from "this statement
    // did not add up" is here for one file, and it was last in a list of a
    // hundred and seventy.
    for (const row of [...list.children].reverse())
      if (row.classList && row.classList.contains('has-note')) list.prepend(row);
    const heading = reason || 'Imported files';
    const box = el(
      'div',
      {
        class: 'picker wide',
        role: 'dialog',
        'aria-label': heading,
      },
      el('div', { class: 'picker-head' }, heading),
      el(
        'p',
        { class: 'muted small' },
        'Anything the reader could not make sense of is noted on its file. Removing one drops every statement in that PDF and their transactions from this device; re-import the PDF to bring them back. Your category rules are kept.'
      ),
      list,
      el(
        'div',
        { class: 'picker-actions' },
        el('button', { class: 'btn sm ghost', onclick: closePicker }, 'Close')
      )
    );
    openModal(box);
  }
  async function applyStatementRemoval(st, ledger) {
    const plan = buildStatementRemovalPlan(state, st.source_file, ledger);
    const [sourceStatements, dormantGoals] = await Promise.all([
      Store.allStatements(),
      Store.goals.all(),
    ]);
    const previous = {};
    for (const key of Object.keys(plan.state)) previous[key] = state[key];
    previous.lastLocalUpdate = state.lastLocalUpdate;
    previous.balanceUpdates = state.balanceUpdates;
    Object.assign(state, plan.state);
    state.balanceUpdates = pruneBalanceUpdates(state.balanceUpdates, {
      bankAccounts: plan.bankAccounts,
      cardStatementsRemain: plan.cardStatementsRemain,
    });
    const removedBalanceUpdates = (previous.balanceUpdates || []).length - state.balanceUpdates.length;
    const updatedAt = new Date().toISOString();
    const statements =
      ledger === 'card'
        ? sourceStatements.filter((item) => item.hash !== st.hash)
        : sourceStatements;
    try {
      await Store.restoreSnapshot({
        stores: {
          transactions: state.records,
          statements,
          rules: state.rules,
          bankTransactions: state.bankRecords,
          bankStatements: state._bankStatements,
          cardStatements: state._cardStatements,
          tags: state.tags,
          transactionSplits: state.transactionSplits,
          categoryIntentions: state.categoryIntentions,
          goals: dormantGoals,
          forecastSnapshots: [],
          manualAssets: state.manualAssets,
          balanceUpdates: state.balanceUpdates || [],
          investmentStatements: state._investmentStatements || [],
          confirmations: state.confirmations,
        },
        meta: {
          financeGoalLog: state.goalLog,
          lastLocalUpdate: updatedAt,
        },
      });
    } catch (error) {
      Object.assign(state, previous);
      throw error;
    }
    state.lastLocalUpdate = updatedAt;
    await dropNotesFor(st.source_file);
    return { removed: plan.removedTransactions, removedBalanceUpdates };
  }

  // A typed balance dropped alongside the statement is a second, quieter
  // consequence of the same removal - the account it was entered for no
  // longer has a statement to reconcile it against - so it rides the same
  // toast rather than vanishing without a trace.
  function droppedBalanceClause(removedBalanceUpdates) {
    return removedBalanceUpdates
      ? ` A balance you'd typed for this account was cleared too, since it no longer has a statement.`
      : '';
  }

  // Both removals go through the shared contract: the cascade is committed in
  // full, the page repaints from what remains, and only then is the removal
  // announced. Removing a statement touches transactions, tags, splits,
  // forecasts and goal history at once, so "committed" has to mean all of it.
  async function removeStatement(st) {
    await commitAndRender({
      commit: async () => {
        const result = await applyStatementRemoval(st, 'card');
        closePicker();
        return result;
      },
      render,
      notify: ({ removed, removedBalanceUpdates }) =>
        toast(
          `Removed ${st.source_file} and ${removed} transaction${removed === 1 ? '' : 's'}.${droppedBalanceClause(removedBalanceUpdates)}`
        ),
    });
  }
  async function removeBankStatement(st) {
    await commitAndRender({
      commit: async () => {
        const result = await applyStatementRemoval(st, 'bank');
        closePicker();
        return result;
      },
      render,
      notify: ({ removed, removedBalanceUpdates }) =>
        toast(
          `Removed ${st.source_file} and ${removed} account transaction${removed === 1 ? '' : 's'}.${droppedBalanceClause(removedBalanceUpdates)}`
        ),
    });
  }

  // Clear everything on this device (guarded). Rules are kept unless the person
  // explicitly chooses otherwise; nothing is wiped as a side effect.
  function confirmClearAll() {
    closePicker();
    const keep = el(
      'label',
      { class: 'scope' },
      el('input', { type: 'checkbox', checked: '' }),
      ' Keep my category rules'
    );
    const box = el(
      'div',
      { class: 'picker', role: 'dialog', 'aria-label': 'Clear all data' },
      el('div', { class: 'picker-head' }, 'Clear all data on this device?'),
      el(
        'p',
        { class: 'muted small' },
        'This removes every transaction and statement from this device, so you will need to re-import your PDFs to rebuild. Export rules or Export history first if you want to keep your work.'
      ),
      el('div', { class: 'picker-scope' }, keep),
      el(
        'div',
        { class: 'picker-actions' },
        el('button', { class: 'btn sm ghost', onclick: closePicker }, 'Cancel'),
        el(
          'button',
          {
            class: 'btn sm danger',
            onclick: () => doClearAll($('input', keep).checked),
          },
          'Clear all data'
        )
      )
    );
    openModal(box);
  }
  async function doClearAll(keepRules) {
    const updatedAt = new Date().toISOString();
    const rules = keepRules ? state.rules : [];
    // A name the person typed is theirs; a name lifted off a statement belongs
    // to the statement and leaves with it.
    const keepManualName = state.firstNameSource === 'manual';
    const dormantGoals = await Store.goals.all();
    await Store.restoreSnapshot({
      stores: {
        transactions: [],
        statements: [],
        rules,
        bankTransactions: [],
        bankStatements: [],
        cardStatements: [],
        tags: [],
        transactionSplits: [],
        categoryIntentions: state.categoryIntentions,
        goals: dormantGoals,
        forecastSnapshots: [],
        manualAssets: state.manualAssets,
        balanceUpdates: [],
        investmentStatements: [],
        confirmations: [],
      },
      meta: {
        bankCardAccounts: [],
        bankMyAccounts: [],
        bankSharedAccounts: [],
        bankHouseholdPayees: [],
        financeGoalLog: [],
        accountNames: null,
        mockPersonaLoaded: null,
        lastImportedFrom: null,
        lastLocalUpdate: updatedAt,
        [PLAN_DRAFT_KEY]: null,
        /* Four keys that used to outlive the data they describe.
         *
         * The dialog promises this "removes every transaction and statement
         * from this device". These are not transactions, which is how they
         * survived - but each one is DERIVED from the transactions, so keeping
         * them leaves the app asserting things about data that is gone:
         *
         *  - a name READ OFF a statement kept greeting the person by name on a
         *    completely empty app. A name they typed themselves is a
         *    preference and is kept; one inferred from an import is not, and
         *    goes with the import. (See learnFirstName's rank: manual outranks
         *    card outranks bank.)
         *  - planGroups are per-category corrections - the same family as the
         *    category rules the dialog explicitly asks about - so they follow
         *    the same answer instead of silently persisting either way.
         *  - lastForecastSnapshotDate pointed at snapshots that were just
         *    deleted, so the next run would decide today's snapshot had
         *    already been taken and skip it.
         *  - backupPromptDismissed said "you have already been told to back
         *    this up" about data that no longer exists.
         */
        ...(keepManualName ? {} : { firstName: null, firstNameSource: null }),
        ...(keepRules ? {} : { planGroups: null }),
        lastForecastSnapshotDate: null,
        backupPromptDismissed: null,
        workspaceState: {
          version: 1,
          view: 'overview',
          activityTab: 'analysis',
          period: { type: 'latest-complete', from: null, to: null },
        },
      },
    });
    resetPlanDraft();
    resetWorkspaceState({ rules, updatedAt, keepManualName, keepRules });
    closePicker();
    render();
    toast(
      keepRules
        ? 'All transactions, statements and account data cleared. Your category rules were kept.'
        : 'All data cleared. Re-import your PDFs to rebuild.'
    );
  }

  return { reloadConfig, openRemoveStatement, confirmClearAll };
}
