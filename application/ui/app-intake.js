import { Store } from '../core/storage.js';
import {
  parseStatementLines,
  extractLines,
  statementContentHash,
  parseCardStatementSummary,
  splitCardStatements,
  parseBankStatementLines,
  detectStatementFormat,
  reconcileBankStatement,
  bankTransactionIdentity,
  bankStatementHash,
  transactionIdentity,
  cardStatementHash,
  cardAccountsFromLines,
  mergeBankTransactions,
  mergeTransactions,
  reconcileCardStatement,
  cardStatementHealth,
  detectCardStatementFormat,
  parseNcbStatementLines,
  splitNcbStatements,
  buildNcbStatementRecord,
  scotiaCardHolderFirstName,
  scotiaBankHolderFirstName,
} from '../statements/read-statements.js';
import { roundMoney, yieldToBrowser } from '../core/shared-helpers.js';

export function createStatementIntake(ctx) {
  const {
    state,
    trackUsage,
    $,
    toast,
    render,
    defaultDataView,
    maybeWelcomeFirstTime,
    maybeOfferInstall,
    maybeOfferBackup,
    maybeOfferFirstRunHint,
    money0,
    iconSpinner,
    el,
  } = ctx;
  /* ===================================================================
   * Intake (manual + desktop)
   * =================================================================== */
  async function pickStatements() {
    trackUsage('add-statement');
    const input = $('#add-input');
    if (input) input.click();
  }

  async function onAddInputChange(e) {
    const input = e.currentTarget;
    const files = [...(input.files || [])];
    if (!files.length) return;
    await ingestFiles(files);
    input.value = '';
  }

  async function learnFirstName(name, source) {
    if (!name) return;
    const rank = { manual: 2, card: 1, bank: 0 };
    if (state.firstName && (rank[source] || 0) <= (rank[state.firstNameSource] || 0)) return;
    state.firstName = name;
    state.firstNameSource = source;
    await Store.setMeta('firstName', name);
    await Store.setMeta('firstNameSource', source);
  }

  async function setFirstNameManual(name) {
    const clean = String(name == null ? '' : name)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    state.firstName = clean || null;
    state.firstNameSource = clean ? 'manual' : null;
    await Store.setMeta('firstName', state.firstName);
    await Store.setMeta('firstNameSource', state.firstNameSource);
  }

  async function ingestFiles(files) {
    const list = [...files];
    if (await Store.getMeta('mockPersonaLoaded', null)) {
      await Store.clearTransactions();
      await Store.clearStatements();
      await Store.clearBankTransactions();
      await Store.clearBankStatements();
      await Store.clearCardStatements();
      await Store.setMeta('mockPersonaLoaded', null);
      await Store.setMeta('bankCardAccounts', []);
      await Store.setMeta('bankMyAccounts', []);
      await Store.setMeta('bankConfirmedIncomeIds', []);
      await Store.setMeta('bankRefundIncomeIds', []);
      await Store.setMeta('bankSharedAccounts', []);
      await Store.setMeta('bankHouseholdPayees', []);
      await Store.setMeta('lastImportedFrom', null);
      state.records = [];
      state.bankRecords = [];
      state._bankStatements = [];
      state._cardStatements = [];
      state.cardAccounts = [];
      state.myAccounts = [];
      state.confirmedIncomeIds = [];
      state.refundIncomeIds = [];
      state.sharedAccounts = [];
      state.householdPayees = [];
      state.bankAccount = 'all';
      state.lastImportedFrom = null;
      toast('Sample customer data cleared, so your imported statement is kept on its own.');
    }
    openProgress(list);
    let added = 0,
      dupes = 0,
      failed = 0;
    let bankAdded = 0,
      bankDupes = 0;
    let cardLearned = false,
      cardStmtLearned = false;
    const periods = [];
    const hadCardBefore = state.records.length > 0;
    const hadBankBefore = state.bankRecords.length > 0;
    state.warnings = [];
    state.bankWarnings = [];
    try {
      const pdfjs = await loadPdfjs();
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgress(i, 'reading');
        await yieldToBrowser();
        let lines;
        try {
          const buf = await file.arrayBuffer();
          lines = await extractLines(buf.slice(0), pdfjs);
        } catch {
          setProgress(i, 'failed');
          failed++;
          state.warnings.push(
            `${file.name} could not be read. Try re-downloading it from your bank.`
          );
          continue;
        }
        // A bank account statement now routes to the bank ledger (Phase 1). The
        // card path below is untouched: only card statements reach it.
        if (detectStatementFormat(lines) === 'bank') {
          const parsed = parseBankStatementLines(lines, file.name);
          if (!parsed.statements.length || parsed.openingBalance == null) {
            setProgress(i, 'failed');
            failed++;
            state.bankWarnings.push(
              `${file.name} looks like a bank statement but its rows could not be read.`
            );
            continue;
          }
          await learnFirstName(scotiaBankHolderFirstName(lines), 'bank');
          const recon = reconcileBankStatement(parsed); // aggregate, for the file-level warning
          const recs = parsed.transactions.map((t) => ({
            ...t,
            id: bankTransactionIdentity(t),
          }));
          const merged = mergeBankTransactions(state.bankRecords, recs);
          state.bankRecords = merged.records;
          bankAdded += merged.added;
          // Store ONE traceable record PER STATEMENT (not per file), each with
          // its own period, account, count, closing balance and reconcile
          // result, deduped by a per-statement content hash. A file holding many
          // statements now shows one honest row each, and the same statement
          // arriving in both a consolidated and an individual PDF is stored once.
          let newStmts = 0;
          for (const st of parsed.statements) {
            const stHash = bankStatementHash(st);
            if (await Store.hasBankStatement(stHash)) continue;
            const r = reconcileBankStatement({
              openingBalance: st.openingBalance,
              closingBalance: st.closingBalance,
              transactions: st.transactions,
            });
            await Store.putBankStatement({
              hash: stHash,
              source_file: file.name,
              account: st.account,
              period: st.period,
              count: st.transactions.length,
              closingBalance: st.closingBalance,
              reconciled: r.ok,
              reconNote: r.balanceBreaks[0] || (r.closingOk ? '' : 'closing balance did not match'),
              importedAt: new Date().toISOString(),
            });
            newStmts++;
          }
          if (!recon.ok)
            state.bankWarnings.push(
              `${file.name}: ${recon.balanceBreaks[0] || 'balance did not fully reconcile'}.`
            );
          if (newStmts === 0 && merged.added === 0) bankDupes++;
          setProgress(
            i,
            newStmts === 0 && merged.added === 0 ? 'duplicate' : recon.ok ? 'done' : 'reconwarn',
            merged.added
          );
          continue;
        }
        if (detectCardStatementFormat(lines) === 'ncb') {
          for (const c of cardAccountsFromLines(lines)) {
            if (!state.cardAccounts.includes(c)) {
              state.cardAccounts = [...state.cardAccounts, c];
              cardLearned = true;
            }
          }
          const hash = statementContentHash(lines);
          if (await Store.hasStatement(hash)) {
            setProgress(i, 'duplicate');
            dupes++;
            continue;
          }
          const parsedNcb = parseNcbStatementLines(lines, file.name);
          if (!parsedNcb.transactions.length) {
            setProgress(i, 'failed');
            failed++;
            state.warnings.push(`${file.name} did not contain transactions we could read.`);
            continue;
          }
          const ncbRecs = [];
          const ncbKeys = [];
          for (const seg of splitNcbStatements(lines)) {
            const built = buildNcbStatementRecord(seg, file.name);
            // A statement whose ROWS parse must store those rows even when the
            // summary box or header key cannot be read (real pdf.js splits the
            // masked account "xxxx1234" into "xxxx1234"). Collect transactions
            // unconditionally; the per-statement summary/reconciliation record
            // below stays best-effort and its absence never discards rows.
            if (built.summary.statementKey) ncbKeys.push(built.summary.statementKey);
            for (const t of built.transactions) {
              // Keep the NCB identity already stamped on t (it has no reference
              // number); only add the per-row app fields Scotiabank rows carry.
              ncbRecs.push({
                ...t,
                categoryOverride: null,
                reviewDismissed: false,
                lastChanged: new Date().toISOString(),
                originDevice: state.deviceId,
              });
            }
            if (built.summary.previousBalance != null && built.summary.newBalance != null) {
              await Store.putCardStatement({
                ...built.statementRecord,
                importedAt: new Date().toISOString(),
              });
              cardStmtLearned = true;
            }
            // Part A: runtime reconciliation gate (NCB). The statement prints its
            // own previous and new balance, which the bank computes independently
            // of the row list, so when both are present the signed billing sum of
            // the rows we read must equal the printed balance movement
            // (reconcileNcbStatement, already computed in built.reconciliation).
            // Rows are ALWAYS stored above (never gated); a shortfall only raises
            // a plain, visible per-file warning through the SAME state.warnings
            // channel the other import messages use. When the balances are
            // unreadable, recon.checked is false and no false warning is raised.
            const recon = built.reconciliation;
            if (recon && recon.checked && !recon.ok) {
              const expected = money0(recon.targetDelta);
              const got = money0(recon.computedDelta);
              const where = built.summary.statementKey ? ` (${built.summary.statementKey})` : '';
              state.warnings.push(
                `${file.name}${where}: this statement did not fully add up. We expected the balance to change by ${expected}, but the transactions we read total ${got}. Some transactions may not have been read.`
              );
            }
          }
          const merged = mergeTransactions(state.records, ncbRecs);
          state.records = merged.records;
          added += merged.added;
          const period = ncbKeys.length
            ? ncbKeys.length === 1
              ? ncbKeys[0]
              : `${ncbKeys[0]} (+${ncbKeys.length - 1} more)`
            : '';
          await Store.putStatement({
            hash,
            source_file: file.name,
            period,
            importedAt: new Date().toISOString(),
          });
          if (period) periods.push(period);
          setProgress(i, 'done', merged.added);
          continue;
        }
        for (const c of cardAccountsFromLines(lines)) {
          if (!state.cardAccounts.includes(c)) {
            state.cardAccounts = [...state.cardAccounts, c];
            cardLearned = true;
          }
        }
        // Learn the person's own first name from the Scotiabank card statement's
        // labelled cardholder text (scotiaCardHolderFirstName reads only the
        // greeting / "CARD HOLDER (PRIMARY)" line, first token only). Only the
        // given name is stored - no surname, address or card number. A card name
        // outranks a bank-statement name but never a name set by hand; see
        // learnFirstName for how the sources are ranked.
        await learnFirstName(scotiaCardHolderFirstName(lines), 'card');
        const hash = statementContentHash(lines);
        if (await Store.hasStatement(hash)) {
          setProgress(i, 'duplicate');
          dupes++;
          continue;
        }
        const parsed = parseStatementLines(lines, file.name);
        if (!parsed.transactions.length) {
          setProgress(i, 'failed');
          failed++;
          state.warnings.push(`${file.name} did not contain transactions we could read.`);
          continue;
        }
        const recs = parsed.transactions.map((t) => ({
          ...t,
          id: transactionIdentity(t),
          categoryOverride: null,
          reviewDismissed: false,
          lastChanged: new Date().toISOString(),
          originDevice: state.deviceId,
        }));
        const merged = mergeTransactions(state.records, recs);
        state.records = merged.records;
        added += merged.added;
        await Store.putStatement({
          hash,
          source_file: file.name,
          period: parsed.period,
          importedAt: new Date().toISOString(),
        });
        if (parsed.period) periods.push(parsed.period);
        for (const seg of splitCardStatements(lines)) {
          try {
            const sum = parseCardStatementSummary(seg, file.name);
            if (sum.previousBalance != null && sum.newBalance != null) {
              const rec = reconcileCardStatement(sum);
              if (rec.checked && !rec.ok) {
                const expected = money0(roundMoney(sum.newBalance - sum.previousBalance));
                const got = money0(roundMoney(sum.purchases + sum.payments));
                const where = sum.statementKey ? ` (${sum.statementKey})` : '';
                state.warnings.push(
                  `${file.name}${where}: this statement did not fully add up. We expected the balance to change by ${expected}, but the transactions we read total ${got}. Some transactions may not have been read.`
                );
              }
              const chash = cardStatementHash(sum);
              if (!(await Store.hasCardStatement(chash))) {
                const health = cardStatementHealth(sum);
                await Store.putCardStatement({
                  hash: chash,
                  source_file: file.name,
                  account: sum.account,
                  period: sum.periodText,
                  statementKey: sum.statementKey,
                  periodStart: sum.periodStart,
                  periodEnd: sum.periodEnd,
                  previousBalance: sum.previousBalance,
                  purchases: sum.purchases,
                  payments: sum.payments,
                  newBalance: sum.newBalance,
                  creditLimit: sum.creditLimit,
                  creditAvailable: sum.creditAvailable,
                  minimumPayment: sum.minimumPayment,
                  amountOwing: sum.amountOwing,
                  interestCharges: sum.interestCharges,
                  eair: sum.eair,
                  utilisation: health.utilisation,
                  revolving: health.revolving,
                  payingInFull: health.payingInFull,
                  reconciled: rec.ok,
                  reconNote: rec.break || '',
                  importedAt: new Date().toISOString(),
                });
                cardStmtLearned = true;
              }
            }
          } catch (err) {
            console.warn(`Card statement summary could not be read for ${file.name}:`, err);
            state.warnings.push(
              `${file.name}'s reconciliation summary could not be read, so health details are missing for that statement.`
            );
          }
        }
        setProgress(i, 'done', merged.added);
      }
      await persist();
      if (bankAdded || bankDupes) {
        await persistBank();
        state._bankStatements = await Store.allBankStatements();
      }
      if (cardLearned) await Store.setMeta('bankCardAccounts', state.cardAccounts);
      if (cardStmtLearned) state._cardStatements = await Store.allCardStatements();
    } finally {
      setTimeout(closeProgress, 700);
    }
    if ((!hadCardBefore && state.records.length) || (!hadBankBefore && state.bankRecords.length))
      state.view = defaultDataView();
    render();
    if (!bankAdded && !added && (dupes || bankDupes) && !failed)
      toast(`Already imported, so nothing changed.`);
    else if (!bankAdded && !added && failed)
      toast(`We couldn't read ${failed === 1 ? 'that statement' : 'those statements'}.`);
    const welcomed = await maybeWelcomeFirstTime();
    if (!welcomed) {
      maybeOfferInstall();
      maybeOfferBackup();
      maybeOfferFirstRunHint();
    }
  }

  async function persistBank() {
    await Store.replaceBankTransactions(state.bankRecords);
  }

  // Persist the ledger-rule confirmations (income-confirmed deposits, round-trip
  // pairs). Pure metadata, no transaction is ever changed.
  async function persistLedgerRules() {
    await Store.setMeta('bankConfirmedIncomeIds', state.confirmedIncomeIds || []);
    await Store.setMeta('bankRefundIncomeIds', state.refundIncomeIds || []);
    await Store.setMeta('bankSharedAccounts', state.sharedAccounts || []);
    await Store.setMeta('bankHouseholdPayees', state.householdPayees || []);
  }

  /* progress dialog for imports */
  let progressState = null;
  function openProgress(files) {
    const rows = files.map((f, i) =>
      el(
        'div',
        { class: 'prog-row', id: 'prog-' + i },
        el('span', { class: 'prog-name' }, f.name),
        el('span', { class: 'prog-status', role: 'status', 'aria-live': 'polite' }, 'Waiting')
      )
    );
    const heavy = files.length >= 3 || files.some((f) => (f.size || 0) > 1500000);
    const kids = [
      el(
        'div',
        { class: 'picker-head', id: 'import-progress-title' },
        `Adding ${files.length} statement${files.length > 1 ? 's' : ''}`
      ),
    ];
    if (heavy)
      kids.push(
        el(
          'p',
          { class: 'muted small prog-privacy' },
          'A larger import can take a moment. It will finish on its own.'
        )
      );
    kids.push(el('div', { class: 'prog-list' }, ...rows));
    const box = el('div', { class: 'picker wide', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'import-progress-title' }, ...kids);
    const overlay = el('div', { class: 'overlay' }, box);
    document.body.append(overlay);
    progressState = overlay;
  }
  function setProgress(i, status, added) {
    const row = $('#prog-' + i, progressState || document);
    if (!row) return;
    const s = $('.prog-status', row);
    if (status === 'reading') s.innerHTML = iconSpinner() + ' Reading…';
    else if (status === 'done') s.innerHTML = `<span class="ok">✓ ${added || 0} added</span>`;
    else if (status === 'duplicate') s.innerHTML = `<span class="muted">Already imported</span>`;
    else if (status === 'reconwarn')
      s.innerHTML = `<span class="warnc">Added · check balance</span>`;
    else if (status === 'failed') s.innerHTML = `<span class="warnc">Couldn't read - try another copy</span>`;
  }
  function closeProgress() {
    if (progressState) {
      progressState.remove();
      progressState = null;
    }
  }

  async function persist() {
    await Store.replaceTransactions(state.records);
    await Store.setMeta('lastLocalUpdate', new Date().toISOString());
  }

  async function persistRules() {
    await Store.replaceRules(state.rules);
  }

  /* pdf.js (vendored, offline) */
  let _pdfjs = null;
  async function loadPdfjs() {
    if (_pdfjs) return _pdfjs;
    const mod = await import('../../third-party/pdf.min.mjs');
    mod.GlobalWorkerOptions.workerSrc = new URL(
      '../../third-party/pdf.worker.min.mjs',
      import.meta.url
    ).href;
    _pdfjs = mod;
    return mod;
  }

  /* desktop folder watching */
  async function chooseFolder() {
    if (!window.ccDesktop) return;
    const folder = await window.ccDesktop.chooseFolder();
    if (!folder) return;
    await Store.setMeta('watchedFolder', folder);
    toast('Watching that folder. New statements appear on their own.');
    scanWatchedFolder();
  }
  async function scanWatchedFolder() {
    if (!window.ccDesktop) return;
    const folder = await Store.getMeta('watchedFolder', null);
    if (!folder) return;
    const files = await window.ccDesktop.scanFolder(folder).catch(() => null);
    if (!files) {
      toast("We can't find the folder we were watching. Choose where your statements live now.");
      return;
    }
    await ingestDesktopPaths(files);
  }
  async function ingestDesktopPaths(paths) {
    if (!paths || !paths.length) return;
    const fileLikes = [];
    for (const p of paths) {
      const data = await window.ccDesktop.readFile(p).catch((err) => {
        console.warn(`Watched-folder file could not be read: ${p}`, err);
        return null;
      });
      if (data)
        fileLikes.push({
          name: p.split(/[\\/]/).pop(),
          arrayBuffer: async () => data,
        });
    }
    if (fileLikes.length) await ingestFiles(fileLikes);
  }

  return {
    pickStatements,
    onAddInputChange,
    setFirstNameManual,
    ingestFiles,
    persistBank,
    persistLedgerRules,
    persist,
    persistRules,
    chooseFolder,
    scanWatchedFolder,
    ingestDesktopPaths,
  };
}

