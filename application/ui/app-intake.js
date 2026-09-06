import { Store } from '../core/storage.js';
import {
  parseStatementLines,
  extractLines,
  statementContentHash,
  parseCardStatementSummary,
  splitCardStatements,
  parseBankStatementLines,
  detectStatementFormat,
  detectBankStatementFormat,
  parseNcbBankStatementLines,
  reconcileNcbBankStatement,
  reconcileBankStatement,
  bankTransactionIdentity,
  bankStatementHash,
  bankStatementPeriodStart,
  bankStatementPeriodEnd,
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
import {
  parseInvestmentStatements,
  investmentStatementFingerprint,
} from '../statements/read-investments.js';
import {
  roundMoney,
  yieldToBrowser,
  enterModal,
  requireCtx,
  formatDisplayDate,
  cleanName,
} from '../core/shared-helpers.js';
import {
  buildStatementCollisionPlan,
  findCardStatementCollision,
  findBankStatementCollision,
} from '../analysis/statement-cascade.js';
import { pruneBalanceUpdates } from '../analysis/balance-updates.js';

export function createStatementIntake(ctx) {
  // Validated at construction, like every other factory here. The one factory
  // that skipped this (app-messages) is the one that shipped a ctx member
  // nobody passed, and the miss surfaced only as a ReferenceError on a button
  // press. A missing member should stop the boot, not wait for a click.
  requireCtx(
    ctx,
    [
      'state',
      'trackUsage',
      '$',
      'toast',
      'render',
      'defaultDataView',
      'maybeWelcomeFirstTime',
      'maybeOfferInstall',
      'maybeOfferBackup',
      'maybeOfferFirstRunHint',
      'money0',
      'iconSpinner',
      'el',
      'openImportedFiles',
      'openInvestments',
    ],
    'createStatementIntake'
  );

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
    openImportedFiles,
    openInvestments,
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
    await Store.setMetaMany([
      { key: 'firstName', value: name },
      { key: 'firstNameSource', value: source },
    ]);
    state.firstName = name;
    state.firstNameSource = source;
  }

  async function setFirstNameManual(name) {
    const clean = cleanName(name);
    const firstName = clean || null;
    const firstNameSource = clean ? 'manual' : null;
    await Store.setMetaMany([
      { key: 'firstName', value: firstName },
      { key: 'firstNameSource', value: firstNameSource },
    ]);
    state.firstName = firstName;
    state.firstNameSource = firstNameSource;
    return firstName;
  }

  function appendRequiredFieldWarnings(warnings, warn) {
    for (const warning of warnings || [])
      if (String(warning).includes('could not be read; it may not merge correctly.')) warn(warning);
  }

  function hashCollisionWarning(fileName, count) {
    return `${fileName}: ${count} transaction hash collision${count === 1 ? '' : 's'} detected; all affected transactions were kept.`;
  }

  async function ingestFiles(files) {
    const list = [...files];
    if (await Store.getMeta('mockPersonaLoaded', null)) {
      await Store.clearTransactions();
      await Store.clearStatements();
      await Store.clearBankTransactions();
      await Store.clearBankStatements();
      await Store.clearCardStatements();
      await Store.tags.clear();
      await Store.transactionSplits.clear();
      await Store.categoryIntentions.clear();
      await Store.goals.clear();
      await Store.forecastSnapshots.clear();
      await Store.manualAssets.clear();
      await Store.investmentStatements.clear();
      await Store.balanceUpdates.clear();
      await Store.confirmations.clear();
      await Store.setMeta('mockPersonaLoaded', null);
      await Store.setMeta('bankCardAccounts', []);
      await Store.setMeta('bankMyAccounts', []);
      await Store.setMeta('bankSharedAccounts', []);
      await Store.setMeta('bankHouseholdPayees', []);
      await Store.setMeta('financeGoal', null);
      await Store.setMeta('financeGoalLog', []);
      await Store.setMeta('financeGoalBoundary', null);
      await Store.setMeta('planTarget', null);
      await Store.setMeta('planGroups', null);
      await Store.setMeta('planDraft', null);
      await Store.setMeta('accountNames', null);
      await Store.setMeta('firstName', null);
      await Store.setMeta('firstNameSource', null);
      await Store.setMeta('lastForecastSnapshotDate', null);
      await Store.setMeta('lastImportedFrom', null);
      state.records = [];
      state.bankRecords = [];
      state._bankStatements = [];
      state._cardStatements = [];
      state.cardAccounts = [];
      state.myAccounts = [];
      state.confirmations = [];
      state.sharedAccounts = [];
      state.householdPayees = [];
      state.accountNames = {};
      state.tags = [];
      state.transactionSplits = [];
      state.categoryIntentions = [];
      state.manualAssets = [];
      state._investmentStatements = [];
      state.investmentAccount = 'all';
      state.forecastSnapshots = [];
      state.balanceUpdates = [];
      state.goal = null;
      state.goalLog = [];
      state._goalBoundary = null;
      state._planTarget = null;
      state._planGroups = null;
      state._planDraft = null;
      state.firstName = null;
      state.firstNameSource = null;
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
    let investAdded = 0,
      investDupes = 0;
    let cardLearned = false,
      bankStmtLearned = false,
      cardStmtLearned = false;
    const periods = [];
    const hadCardBefore = state.records.length > 0;
    const hadBankBefore = state.bankRecords.length > 0;
    const hadInvestBefore = (state._investmentStatements || []).length > 0;
    state.warnings = [];
    try {
      const pdfjs = await loadPdfjs();
      fileLoop: for (let i = 0; i < list.length; i++) {
        const file = list[i];
        /* EVERY WARNING KNOWS WHICH FILE IT IS ABOUT.
         *
         * These sentences - a statement that did not add up, a page that could
         * not be read, a holding that was skipped - were pushed as bare strings
         * and shown once, in a toast, for eight seconds, with only the FIRST of
         * them printed when there was more than one. Nothing stored them and
         * nothing else rendered them, so "3 statements need review" was a
         * count a person could never act on and evidence the app threw away.
         *
         * Recorded against the file instead, kept, and shown on that file in
         * the list where the way to replace it already lives. */
        const warn = (text) => state.warnings.push({ file: file.name, text: String(text) });
        setProgress(i, 'reading');
        await yieldToBrowser();
        let lines;
        try {
          const buf = await file.arrayBuffer();
          lines = await extractLines(buf.slice(0), pdfjs);
        } catch {
          setProgress(i, 'failed');
          failed++;
          warn(
            `${file.name} could not be read. Try re-downloading it from your bank.`
          );
          continue;
        }
        const format = detectStatementFormat(lines);
        if (format === 'investment') {
          const parsedInvestments = parseInvestmentStatements(lines, file.name);
          appendRequiredFieldWarnings(parsedInvestments.warnings, warn);
          if (!parsedInvestments.statements.length) {
            setProgress(i, 'failed');
            failed++;
            warn(
              `${file.name} looks like an investment statement but its holdings could not be read.`
            );
            continue;
          }
          let storedHere = 0;
          let partialHere = false;
          for (const st of parsedInvestments.statements) {
            const existing = await Store.investmentStatements.get(st.hash);
            if (
              existing &&
              investmentStatementFingerprint(existing) === investmentStatementFingerprint(st)
            )
              continue;
            const now = new Date().toISOString();
            await Store.investmentStatements.put({
              ...st,
              importedAt: (existing && existing.importedAt) || now,
              updatedAt: now,
            });
            storedHere++;
            const when = formatDisplayDate(st.periodEnd);
            if (st.warnings.includes('pages-missing') || st.warnings.includes('activity-unread')) {
              partialHere = true;
              warn(
                `${file.name} (${when}): part of this investment statement could not be read, so money added that month is shown as unknown.`
              );
            }
            if (st.warnings.includes('row-unread')) {
              partialHere = true;
              warn(
                `${file.name} (${when}): a holding on this investment statement could not be read.`
              );
            }
          }
          if (parsedInvestments.unreadable) {
            partialHere = true;
            warn(
              `${file.name}: ${parsedInvestments.unreadable} investment statement${parsedInvestments.unreadable === 1 ? '' : 's'} in this file could not be read.`
            );
          }
          investAdded += storedHere;
          if (!storedHere) investDupes++;
          setProgress(i, !storedHere ? 'duplicate' : partialHere ? 'partial' : 'done', storedHere);
          continue;
        }
        if (format === 'bank') {
          if (detectBankStatementFormat(lines) === 'ncb') {
            const parsedNcbBank = parseNcbBankStatementLines(lines, file.name);
            if (!parsedNcbBank.statements.length || parsedNcbBank.openingBalance == null) {
              setProgress(i, 'failed');
              failed++;
              warn(
                `${file.name} looks like an NCB account statement but its rows could not be read.`
              );
              continue;
            }
            // Same-month collisions, resolved BEFORE this file's own rows are
            // merged in - see the equivalent block in the Scotia bank path
            // below for why the order matters.
            const priorNcbBankStatements = await Store.allBankStatements();
            for (const st of parsedNcbBank.statements) {
              const stHash = bankStatementHash(st);
              if (await Store.hasBankStatement(stHash)) continue;
              const collision = findBankStatementCollision(priorNcbBankStatements, {
                hash: stHash,
                account: st.account,
                periodEnd: st.periodRange ? st.periodRange.end : null,
              });
              if (!collision) continue;
              const matchRow = (row) =>
                String(row.account || '') === String(collision.account || '') &&
                !!collision.periodStart &&
                !!collision.periodEnd &&
                row.date >= collision.periodStart &&
                row.date <= collision.periodEnd;
              const collisionPlan = buildStatementCollisionPlan(state, matchRow, 'bank');
              try {
                await applyCollisionCascade(collisionPlan, { ledger: 'bank', collisionHash: collision.hash });
              } catch (error) {
                console.warn(`Could not replace the earlier statement for ${file.name}:`, error);
                setProgress(i, 'failed');
                failed++;
                warn(
                  `${file.name} could not safely replace ${collision.source_file || 'an earlier import'}'s statement for this account, so it was not added. Try again.`
                );
                continue fileLoop;
              }
              warn(
                `${collision.source_file || 'An earlier import'}'s statement for this account was replaced by ${file.name}'s newer version.` +
                  (collisionPlan.removedTransactions
                    ? ` ${collisionPlan.removedTransactions} transaction${collisionPlan.removedTransactions === 1 ? '' : 's'} from the earlier import ${collisionPlan.removedTransactions === 1 ? 'was' : 'were'} removed to avoid double-counting.`
                    : '')
              );
            }
            const ncbBankRecs = parsedNcbBank.transactions.map((t) => ({
              ...t,
              id: bankTransactionIdentity(t),
            }));
            const mergedNcbBank = mergeBankTransactions(state.bankRecords, ncbBankRecs);
            state.bankRecords = mergedNcbBank.records;
            bankAdded += mergedNcbBank.added;
            if (mergedNcbBank.hashCollisions)
              warn(hashCollisionWarning(file.name, mergedNcbBank.hashCollisions));
            await persistBank();
            if (parsedNcbBank.warnings.includes('multi-statement'))
              warn(
                `${file.name} holds more than one statement. Check each one's balances before relying on them.`
              );
            let newNcbStmts = 0;
            let ncbBankOk = true;
            for (const st of parsedNcbBank.statements) {
              const r = reconcileNcbBankStatement(st);
              if (!r.ok) ncbBankOk = false;
              if (!r.ok)
                warn(
                  `${file.name}: ${r.balanceBreaks[0] || 'this statement did not fully add up.'} Some transactions may not have been read.`
                );
              if (!r.ok && (st.headerAccounts || []).length > 1)
                warn(
                  `${file.name}: the pages of this statement name different accounts and the balances do not run on between them. It has been kept as one account - check it before relying on it.`
                );
              if (r.unmatchedReversals)
                warn(
                  `${file.name}: ${r.unmatchedReversals} reversal${r.unmatchedReversals === 1 ? '' : 's'} on this statement could not be matched to a charge, so ${r.unmatchedReversals === 1 ? 'it is shown' : 'they are shown'} as money returned rather than linked to a purchase.`
                );
              if (st.warnings.includes('year-rollover'))
                warn(
                  `${file.name}: this statement runs into a new year. Check the dates on its earliest transactions.`
                );
              if (st.warnings.includes('late-row'))
                warn(
                  `${file.name}: a transaction on this statement is dated after the statement itself. Check its date.`
                );
              const ncbStHash = bankStatementHash(st);
              if (await Store.hasBankStatement(ncbStHash)) continue;
              await Store.putBankStatement({
                hash: ncbStHash,
                source_file: file.name,
                account: st.account,
                period: st.period,
                periodStart: st.periodRange ? st.periodRange.start : null,
                periodEnd: st.periodRange ? st.periodRange.end : null,
                count: st.transactions.length,
                closingBalance: st.closingBalance,
                reconciled: r.ok,
                reconNote: r.balanceBreaks[0] || (r.closingOk ? '' : 'closing balance did not match'),
                importedAt: new Date().toISOString(),
              });
              bankStmtLearned = true;
              newNcbStmts++;
            }
            const ncbBankNothingNew = newNcbStmts === 0 && mergedNcbBank.added === 0;
            if (ncbBankNothingNew) bankDupes++;
            setProgress(
              i,
              ncbBankNothingNew ? 'duplicate' : ncbBankOk ? 'done' : 'reconwarn',
              mergedNcbBank.added
            );
            continue;
          }
          const parsed = parseBankStatementLines(lines, file.name);
          appendRequiredFieldWarnings(parsed.warnings, warn);
          if (!parsed.statements.length || parsed.openingBalance == null) {
            setProgress(i, 'failed');
            failed++;
            warn(
              `${file.name} looks like a bank statement but its rows could not be read.`
            );
            continue;
          }
          for (const st of parsed.statements)
            for (const note of st.warnings) warn(note);
          await learnFirstName(scotiaBankHolderFirstName(lines), 'bank');
          // Same-month collisions are resolved BEFORE this file's own rows are
          // merged in, against whatever is already stored - never against this
          // file's own incoming rows - so a superseded statement's rows can
          // never be confused with (or accidentally strip) identical-looking
          // rows the incoming statement legitimately re-states.
          const priorBankStatements = await Store.allBankStatements();
          for (const st of parsed.statements) {
            const stHash = bankStatementHash(st);
            if (await Store.hasBankStatement(stHash)) continue; // literal re-import, not a collision
            const collision = findBankStatementCollision(priorBankStatements, {
              hash: stHash,
              account: st.account,
              periodEnd: bankStatementPeriodEnd(st.periodRange),
            });
            if (!collision) continue;
            const matchRow = (row) =>
              String(row.account || '') === String(collision.account || '') &&
              !!collision.periodStart &&
              !!collision.periodEnd &&
              row.date >= collision.periodStart &&
              row.date <= collision.periodEnd;
            const collisionPlan = buildStatementCollisionPlan(state, matchRow, 'bank');
            try {
              await applyCollisionCascade(collisionPlan, { ledger: 'bank', collisionHash: collision.hash });
            } catch (error) {
              console.warn(`Could not replace the earlier statement for ${file.name}:`, error);
              setProgress(i, 'failed');
              failed++;
              warn(
                `${file.name} could not safely replace ${collision.source_file || 'an earlier import'}'s statement for this account, so it was not added. Try again.`
              );
              continue fileLoop;
            }
            warn(
              `${collision.source_file || 'An earlier import'}'s statement for this account was replaced by ${file.name}'s newer version.` +
                (collisionPlan.removedTransactions
                  ? ` ${collisionPlan.removedTransactions} transaction${collisionPlan.removedTransactions === 1 ? '' : 's'} from the earlier import ${collisionPlan.removedTransactions === 1 ? 'was' : 'were'} removed to avoid double-counting.`
                  : '')
            );
          }
          const recon = reconcileBankStatement(parsed); // aggregate, for the file-level warning
          const recs = parsed.transactions.map((t) => ({
            ...t,
            id: bankTransactionIdentity(t),
          }));
          const merged = mergeBankTransactions(state.bankRecords, recs);
          state.bankRecords = merged.records;
          bankAdded += merged.added;
          if (merged.hashCollisions) warn(hashCollisionWarning(file.name, merged.hashCollisions));
          await persistBank();
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
              periodStart: bankStatementPeriodStart(st.periodRange),
              periodEnd: bankStatementPeriodEnd(st.periodRange),
              count: st.transactions.length,
              closingBalance: st.closingBalance,
              reconciled: r.ok,
              reconNote: r.balanceBreaks[0] || (r.closingOk ? '' : 'closing balance did not match'),
              importedAt: new Date().toISOString(),
            });
            bankStmtLearned = true;
            newStmts++;
          }
          if (!recon.ok)
            warn(
              `${file.name}: ${recon.balanceBreaks[0] || 'balance did not fully reconcile.'}`
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
            warn(`${file.name} did not contain transactions we could read.`);
            continue;
          }
          const ncbRecs = [];
          const ncbKeys = [];
          for (const seg of splitNcbStatements(lines)) {
            const built = buildNcbStatementRecord(seg, file.name);
            appendRequiredFieldWarnings(built.summary.warnings, warn);
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
                lastChanged: new Date().toISOString(),
                originDevice: state.deviceId,
              });
            }
            if (built.summary.previousBalance != null && built.summary.newBalance != null) {
              const existing = (state._cardStatements || []).find(
                (statement) => statement.hash === built.statementRecord.hash
              );
              const collision = findCardStatementCollision(
                await Store.allCardStatements(),
                built.statementRecord
              );
              if (collision) {
                const matchRow = (row) =>
                  String(row.account || '') === String(collision.account || '') &&
                  String(row.statementKey || '') === String(collision.statementKey || '');
                const collisionPlan = buildStatementCollisionPlan(state, matchRow, 'card');
                try {
                  await applyCollisionCascade(collisionPlan, { ledger: 'card', collisionHash: collision.hash });
                } catch (error) {
                  console.warn(`Could not replace the earlier statement for ${file.name}:`, error);
                  setProgress(i, 'failed');
                  failed++;
                  warn(
                    `${file.name} could not safely replace ${collision.source_file || 'an earlier import'}'s statement for this card, so it was not added. Try again.`
                  );
                  continue fileLoop;
                }
                warn(
                  `${collision.source_file || 'An earlier import'}'s ${collision.statementKey || 'that month\'s'} statement for this card was replaced by ${file.name}'s newer version.` +
                    (collisionPlan.removedTransactions
                      ? ` ${collisionPlan.removedTransactions} transaction${collisionPlan.removedTransactions === 1 ? '' : 's'} from the earlier import ${collisionPlan.removedTransactions === 1 ? 'was' : 'were'} removed to avoid double-counting.`
                      : '')
                );
              }
              await Store.putCardStatement({
                ...built.statementRecord,
                importedAt: (existing && existing.importedAt) || new Date().toISOString(),
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
              warn(
                `${file.name}${where}: this statement did not fully add up. We expected the balance to change by ${expected}, but the transactions we read total ${got}. Some transactions may not have been read.`
              );
            }
          }
          const merged = mergeTransactions(state.records, ncbRecs);
          state.records = merged.records;
          added += merged.added;
          if (merged.hashCollisions) warn(hashCollisionWarning(file.name, merged.hashCollisions));
          await persist();
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
          warn(`${file.name} did not contain transactions we could read.`);
          continue;
        }
        for (const note of parsed.warnings) warn(note);
        const recs = parsed.transactions.map((t) => ({
          ...t,
          id: transactionIdentity(t),
          categoryOverride: null,
          lastChanged: new Date().toISOString(),
          originDevice: state.deviceId,
        }));
        const merged = mergeTransactions(state.records, recs);
        state.records = merged.records;
        added += merged.added;
        if (merged.hashCollisions) warn(hashCollisionWarning(file.name, merged.hashCollisions));
        await persist();
        if (parsed.period) periods.push(parsed.period);
        for (const seg of splitCardStatements(lines)) {
          try {
            const sum = parseCardStatementSummary(seg, file.name);
            appendRequiredFieldWarnings(sum.warnings, warn);
            if (sum.previousBalance != null && sum.newBalance != null) {
              const rec = reconcileCardStatement(sum);
              if (rec.checked && !rec.ok) {
                const expected = money0(roundMoney(sum.newBalance - sum.previousBalance));
                const got = money0(roundMoney(sum.purchases + sum.payments));
                const where = sum.statementKey ? ` (${sum.statementKey})` : '';
                warn(
                  `${file.name}${where}: this statement did not fully add up. We expected the balance to change by ${expected}, but the transactions we read total ${got}. Some transactions may not have been read.`
                );
              }
              const chash = cardStatementHash(sum);
              if (!(await Store.hasCardStatement(chash))) {
                const collision = findCardStatementCollision(await Store.allCardStatements(), {
                  hash: chash,
                  account: sum.account,
                  statementKey: sum.statementKey,
                });
                if (collision) {
                  // Scotia rows do not carry their own account/statementKey
                  // (a deliberate design choice - see parseStatementLines'
                  // header comment), so matchRow finds no rows to remove here;
                  // only the superseded summary record itself is replaced,
                  // resolving which statement is "the" current one for this
                  // card+month. Scotia's ref-based transaction identity
                  // already keeps identical rows from double-counting.
                  const matchRow = (row) =>
                    String(row.account || '') === String(collision.account || '') &&
                    String(row.statementKey || '') === String(collision.statementKey || '');
                  await trySupersedeCardSummary(file.name, collision, matchRow, warn);
                }
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
            warn(
              `${file.name}'s reconciliation summary could not be read, so health details are missing for that statement.`
            );
          }
        }
        await Store.putStatement({
          hash,
          source_file: file.name,
          period: parsed.period,
          importedAt: new Date().toISOString(),
        });
        setProgress(i, parsed.warnings.length ? 'partial' : 'done', merged.added);
      }
      if (bankAdded || bankDupes || bankStmtLearned) {
        state._bankStatements = await Store.allBankStatements();
      }
      if (cardLearned) await Store.setMeta('bankCardAccounts', state.cardAccounts);
      if (cardStmtLearned) state._cardStatements = await Store.allCardStatements();
      if (investAdded) state._investmentStatements = await Store.investmentStatements.all();
    } finally {
      setTimeout(closeProgress, 700);
    }
    const investmentsOnly =
      !hadInvestBefore &&
      (state._investmentStatements || []).length > 0 &&
      !state.records.length &&
      !state.bankRecords.length;
    if (
      (!hadCardBefore && state.records.length) ||
      (!hadBankBefore && state.bankRecords.length) ||
      investmentsOnly
    )
      state.view = defaultDataView();
    render();
    const anyAdded = bankAdded || added || investAdded;
    if (!anyAdded && (dupes || bankDupes || investDupes) && !failed)
      toast(`Already imported, so nothing changed.`);
    else if (!anyAdded && failed)
      toast(`We couldn't read ${failed === 1 ? 'that statement' : 'those statements'}.`);
    else if (investAdded && !bankAdded && !added && state.view !== 'position')
      // It named the tab and left the person to find it. The toast can carry
      // the way there, so it does.
      toast(
        `Investment statement${investAdded === 1 ? '' : 's'} added.`,
        openInvestments,
        'Show'
      );
    if ((bankStmtLearned || cardStmtLearned) && typeof ctx.reconcileEnteredBalances === 'function')
      await ctx.reconcileEnteredBalances();
    await persistImportNotes();
    if (state.warnings.length)
      toast(
        state.warnings.length === 1
          ? state.warnings[0].text
          : `${state.warnings.length} statements need a look. ${state.warnings[0].text}`,
        openImportedFiles,
        'Show'
      );
    const welcomed = await maybeWelcomeFirstTime();
    // Install and backup are genuinely premature on a first import - one asks
    // to be added to a home screen, the other to protect history that barely
    // exists - so they wait for a later one.
    //
    // The first-run hint is the opposite: the first import is the only moment
    // it is true. Suppressing it here made it unreachable in the ordinary path,
    // because by the next import there are usually two months and its own gate
    // closes. It said "add a couple more months" to almost nobody. It is a
    // BOTTOM banner and the welcome is a transient top greeting, so they do not
    // compete for a slot, and bannerAlreadyShown still keeps the bottom one
    // alone.
    maybeOfferFirstRunHint();
    if (!welcomed) {
      maybeOfferInstall();
      maybeOfferBackup();
    }
  }

  /* Notes survive the toast, and survive the files they are not about.
   *
   * An import only re-reads the files it was handed, so this replaces the
   * notes for those files and keeps everyone else's, then drops any note whose
   * file is no longer stored - a file removed or never kept leaves nothing
   * behind to explain. */
  async function persistImportNotes() {
    const touched = new Set(state.warnings.map((note) => note.file));
    const kept = (state.importNotes || []).filter((note) => note && !touched.has(note.file));
    const files = importedFileNames();
    const next = [...kept, ...state.warnings].filter((note) => files.has(note.file));
    state.importNotes = next;
    await Store.setMeta('importNotes', next);
  }

  function importedFileNames() {
    const files = new Set();
    for (const list of [
      state._cardStatements || [],
      state._bankStatements || [],
      state._investmentStatements || [],
    ])
      for (const st of list) if (st && st.source_file) files.add(st.source_file);
    for (const r of state.records || []) if (r.source_file) files.add(r.source_file);
    for (const r of state.bankRecords || []) if (r.source_file) files.add(r.source_file);
    return files;
  }

  // A same-month collision (a corrected/reissued statement replacing an
  // earlier import for the same account+period) cascades exactly like an
  // explicit statement removal - tags, splits, confirmations, goal-log and
  // any now-orphaned typed balance - via the same buildStatementCollisionPlan
  // the removal path's cascade logic shares. It persists through the SAME
  // whole-snapshot path manage-data.js's removal flow uses (never a direct
  // Store.confirmations.* write - confirmations has exactly one sanctioned
  // writer, and this is not it), and also drops the superseded statement's
  // own summary record from the in-memory + stored card/bank statement list.
  async function applyCollisionCascade(plan, { ledger, collisionHash }) {
    const [sourceStatements, dormantGoals] = await Promise.all([
      Store.allStatements(),
      Store.goals.all(),
    ]);
    // Mirrors manage-data.js's applyStatementRemoval: state is mutated up
    // front (render reads it synchronously), so if the write below fails,
    // every field it touched must roll back - otherwise the in-memory app
    // would show a statement as replaced while storage still holds both,
    // and the next reload would silently disagree with what this session
    // just told the person happened.
    const previous = {};
    for (const key of Object.keys(plan.state)) previous[key] = state[key];
    previous.lastLocalUpdate = state.lastLocalUpdate;
    previous._cardStatements = state._cardStatements;
    previous._bankStatements = state._bankStatements;
    Object.assign(state, plan.state);
    state.balanceUpdates = pruneBalanceUpdates(state.balanceUpdates, {
      bankAccounts: plan.bankAccounts,
      cardStatementsRemain: plan.cardStatementsRemain,
    });
    const cardStatements =
      ledger === 'card'
        ? (state._cardStatements || []).filter((item) => item.hash !== collisionHash)
        : state._cardStatements || [];
    const bankStatements =
      ledger === 'bank'
        ? (state._bankStatements || []).filter((item) => item.hash !== collisionHash)
        : state._bankStatements || [];
    state._cardStatements = cardStatements;
    state._bankStatements = bankStatements;
    const updatedAt = new Date().toISOString();
    try {
      await Store.restoreSnapshot({
        stores: {
          transactions: state.records,
          statements: sourceStatements,
          rules: state.rules,
          bankTransactions: state.bankRecords,
          bankStatements,
          cardStatements,
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
  }

  // The Scotia-card collision site (unlike the other three) runs AFTER this
  // file's own transactions are already safely merged and persisted, so a
  // failure here risks no data loss - only a stale summary record, the same
  // imprecise "which is latest" outcome that existed before this fix. A
  // small named function rather than an inline try/catch, purely to keep
  // its caller's nesting shallow.
  async function trySupersedeCardSummary(fileLabel, collision, matchRow, warn) {
    const collisionPlan = buildStatementCollisionPlan(state, matchRow, 'card');
    try {
      await applyCollisionCascade(collisionPlan, { ledger: 'card', collisionHash: collision.hash });
    } catch (error) {
      console.warn(`Could not replace the earlier statement for ${fileLabel}:`, error);
      warn(
        `${fileLabel}'s statement could not safely replace ${collision.source_file || 'an earlier import'}'s for this card, so both are kept - check which is current before relying on the card balance.`
      );
      return;
    }
    warn(
      `${collision.source_file || 'An earlier import'}'s ${collision.statementKey || 'that month\'s'} statement for this card was replaced by ${fileLabel}'s newer version.` +
        (collisionPlan.removedTransactions
          ? ` ${collisionPlan.removedTransactions} transaction${collisionPlan.removedTransactions === 1 ? '' : 's'} from the earlier import ${collisionPlan.removedTransactions === 1 ? 'was' : 'were'} removed to avoid double-counting.`
          : '')
    );
  }

  async function persistBank() {
    await Store.replaceBankTransactions(state.bankRecords);
    const updatedAt = new Date().toISOString();
    await Store.setMeta('lastLocalUpdate', updatedAt);
    state.lastLocalUpdate = updatedAt;
  }

  /* progress dialog for imports */
  let progressState = null;
  let progressRelease = null;
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
    // Deliberately NOT dismissible - an import in flight has no safe cancel - but
    // it takes the rest of the contract: focus in, focus held, the page behind
    // inert and unscrollable, and the floating chrome out of the way. Without it
    // a person could tab into the page underneath a "working" curtain.
    progressRelease = enterModal(overlay, { dismissible: false });
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
    else if (status === 'partial')
      s.innerHTML = `<span class="warnc">Added · part could not be read</span>`;
    else if (status === 'failed') s.innerHTML = `<span class="warnc">Couldn't read - try another copy</span>`;
  }
  function closeProgress() {
    if (progressRelease) {
      progressRelease();
      progressRelease = null;
    }
    if (progressState) {
      progressState.remove();
      progressState = null;
    }
  }

  async function persist() {
    await Store.replaceTransactions(state.records);
    const updatedAt = new Date().toISOString();
    await Store.setMeta('lastLocalUpdate', updatedAt);
    state.lastLocalUpdate = updatedAt;
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
    persist,
    persistRules,
    chooseFolder,
    scanWatchedFolder,
    ingestDesktopPaths,
  };
}
