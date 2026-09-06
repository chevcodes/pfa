import { pruneConfirmations } from './confirmations.js';

function rowMonth(row) {
  return String((row && (row.month || row.date || row.txn_date)) || '').slice(0, 7);
}

// Tags, splits, confirmations and goal-log entries that referenced only rows
// being removed must go with them. One function so a whole-file removal
// (manage-data.js) and a same-month collision replacement (app-intake.js)
// can never cascade differently. `bankAccounts` and `cardStatementsRemain`
// are handed back rather than acted on here: a person's own typed figure is
// the UI layer's concern, never something this module - a "history"
// calculation source - reads or writes.
function cascadePrune(state, { cardRecords, bankRecords, removedRows, cardStatementsRemain }) {
  const validIds = new Set([...cardRecords, ...bankRecords].map((row) => row.id).filter(Boolean));
  const removedMonths = new Set(removedRows.map(rowMonth).filter((month) => /^\d{4}-\d{2}$/.test(month)));
  const bankAccounts = new Set(bankRecords.map((row) => String(row.account || '')).filter(Boolean));
  return {
    tags: (state.tags || []).map((tag) => {
      const txnIds = (tag.txnIds || []).filter((id) => validIds.has(id));
      return txnIds.length === (tag.txnIds || []).length ? tag : { ...tag, txnIds };
    }),
    transactionSplits: (state.transactionSplits || []).filter((split) => validIds.has(split.txnId)),
    // An answer about one imported transaction goes when that transaction
    // goes. An answer about a payee or an account is a standing fact the
    // person stated, so it outlives removing and re-importing a statement.
    confirmations: pruneConfirmations(state.confirmations || [], validIds),
    goalLog: (state.goalLog || []).filter((entry) => !removedMonths.has(entry.month)),
    bankAccounts,
    cardStatementsRemain,
  };
}

export function buildStatementRemovalPlan(state, sourceFile, ledger) {
  const cardBefore = state.records || [];
  const bankBefore = state.bankRecords || [];
  const cardRecords = ledger === 'card'
    ? cardBefore.filter((row) => row.source_file !== sourceFile)
    : cardBefore;
  const bankRecords = ledger === 'bank'
    ? bankBefore.filter((row) => row.source_file !== sourceFile)
    : bankBefore;
  const removedRows = ledger === 'bank'
    ? bankBefore.filter((row) => row.source_file === sourceFile)
    : cardBefore.filter((row) => row.source_file === sourceFile);
  const cardStatements = ledger === 'card'
    ? (state._cardStatements || []).filter((item) =>
        item.source_file ? item.source_file !== sourceFile : cardRecords.length > 0
      )
    : state._cardStatements || [];
  const bankStatements = ledger === 'bank'
    ? (state._bankStatements || []).filter((item) =>
        item.source_file ? item.source_file !== sourceFile : bankRecords.length > 0
      )
    : state._bankStatements || [];
  const cascade = cascadePrune(state, {
    cardRecords,
    bankRecords,
    removedRows,
    cardStatementsRemain: cardStatements.length > 0,
  });

  return {
    cardSummaryHashes: (state._cardStatements || [])
      .filter((item) => item.source_file === sourceFile)
      .map((item) => item.hash)
      .filter(Boolean),
    bankSummaryHashes: (state._bankStatements || [])
      .filter((item) => item.source_file === sourceFile)
      .map((item) => item.hash)
      .filter(Boolean),
    removedTransactions: removedRows.length,
    bankAccounts: cascade.bankAccounts,
    cardStatementsRemain: cascade.cardStatementsRemain,
    state: {
      records: cardRecords,
      bankRecords,
      _cardStatements: cardStatements,
      _bankStatements: bankStatements,
      tags: cascade.tags,
      transactionSplits: cascade.transactionSplits,
      confirmations: cascade.confirmations,
      goalLog: cascade.goalLog,
      forecastSnapshots: [],
      bankAccount:
        state.bankAccount && state.bankAccount !== 'all' && !cascade.bankAccounts.has(String(state.bankAccount))
          ? 'all'
          : state.bankAccount,
    },
  };
}

// A same-month collision: an incoming statement covers an account+period a
// DIFFERENT, already-stored statement also covers (a correction, a reissue,
// or an accidental second capture). Unlike the investment ledger - a set of
// discrete per-account snapshots that consumers already read through a
// superseded-aware filter - card and bank transactions are a single merged
// pool, so the tractable fix is to remove the superseded statement's own
// rows at import time rather than teach every reader to filter a flag.
// `matchRow` identifies exactly which rows belonged to the statement being
// replaced; when it cannot (e.g. a card reader that does not stamp rows with
// an account, by design - see read-statements.js), it matches nothing, and
// only the statement's own summary record is superseded by the caller.
export function buildStatementCollisionPlan(state, matchRow, ledger) {
  const cardBefore = state.records || [];
  const bankBefore = state.bankRecords || [];
  const cardRecords = ledger === 'card' ? cardBefore.filter((row) => !matchRow(row)) : cardBefore;
  const bankRecords = ledger === 'bank' ? bankBefore.filter((row) => !matchRow(row)) : bankBefore;
  const removedRows = ledger === 'bank' ? bankBefore.filter(matchRow) : cardBefore.filter(matchRow);
  const cascade = cascadePrune(state, {
    cardRecords,
    bankRecords,
    removedRows,
    cardStatementsRemain: (state._cardStatements || []).length > 0,
  });

  return {
    removedTransactions: removedRows.length,
    bankAccounts: cascade.bankAccounts,
    cardStatementsRemain: cascade.cardStatementsRemain,
    state: {
      records: cardRecords,
      bankRecords,
      tags: cascade.tags,
      transactionSplits: cascade.transactionSplits,
      confirmations: cascade.confirmations,
      goalLog: cascade.goalLog,
    },
  };
}

// Does `incoming` (an about-to-be-persisted statement summary, carrying
// account/statementKey/hash) collide with an already-stored statement of the
// same ledger - same account, same billing month, different content? A
// literal re-import (same hash) is not a collision; that is caught earlier,
// by the ordinary hash-dedupe check, and never reaches here.
export function findCardStatementCollision(cardStatements, incoming) {
  const account = String((incoming && incoming.account) || '');
  const statementKey = String((incoming && incoming.statementKey) || '');
  if (!account || !statementKey) return null;
  return (
    (cardStatements || []).find(
      (item) =>
        item &&
        item.hash !== incoming.hash &&
        String(item.account || '') === account &&
        String(item.statementKey || '') === statementKey
    ) || null
  );
}

export function findBankStatementCollision(bankStatements, incoming) {
  const account = String((incoming && incoming.account) || '');
  const month = String((incoming && incoming.periodEnd) || '').slice(0, 7);
  if (!account || !month) return null;
  return (
    (bankStatements || []).find(
      (item) =>
        item &&
        item.hash !== incoming.hash &&
        String(item.account || '') === account &&
        String(item.periodEnd || '').slice(0, 7) === month
    ) || null
  );
}
