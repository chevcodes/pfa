function rowMonth(row) {
  return String((row && (row.month || row.date || row.txn_date)) || '').slice(0, 7);
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
  const validIds = new Set([...cardRecords, ...bankRecords].map((row) => row.id).filter(Boolean));
  const validBankIds = new Set(bankRecords.map((row) => row.id).filter(Boolean));
  const removedMonths = new Set(removedRows.map(rowMonth).filter((month) => /^\d{4}-\d{2}$/.test(month)));
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
  const bankAccounts = new Set(bankRecords.map((row) => String(row.account || '')).filter(Boolean));

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
    state: {
      records: cardRecords,
      bankRecords,
      _cardStatements: cardStatements,
      _bankStatements: bankStatements,
      tags: (state.tags || []).map((tag) => {
        const txnIds = (tag.txnIds || []).filter((id) => validIds.has(id));
        return txnIds.length === (tag.txnIds || []).length ? tag : { ...tag, txnIds };
      }),
      transactionSplits: (state.transactionSplits || []).filter((split) => validIds.has(split.txnId)),
      confirmedIncomeIds: (state.confirmedIncomeIds || []).filter((id) => validBankIds.has(id)),
      refundIncomeIds: (state.refundIncomeIds || []).filter((id) => validBankIds.has(id)),
      goalLog: (state.goalLog || []).filter((entry) => !removedMonths.has(entry.month)),
      forecastSnapshots: [],
      bankAccount:
        state.bankAccount && state.bankAccount !== 'all' && !bankAccounts.has(String(state.bankAccount))
          ? 'all'
          : state.bankAccount,
    },
  };
}
