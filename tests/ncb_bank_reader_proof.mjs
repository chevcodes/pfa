import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as reader from '../application/statements/read-statements.js';
import { classifyInternalTransfers, isBankRefund } from '../application/analysis/bank-analysis.js';
import { roundMoney, transactionName } from '../application/core/shared-helpers.js';

if (!Promise.withResolvers)
  Promise.withResolvers = () => {
    let resolve,
      reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samplePath = join(
  root,
  '..',
  'data',
  'Statements',
  'Bank Statements',
  'Sample NCB',
  'Sample NCB Bank Statement.pdf'
);
const pdfjs = await import('../third-party/pdf.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  '../third-party/pdf.worker.min.mjs',
  import.meta.url
).href;

let pass = 0,
  fail = 0;
const note = (condition, label) => {
  if (condition) pass++;
  else {
    fail++;
    console.log('   FAIL', label);
  }
};

console.log('='.repeat(72));
console.log(' NCB BANK-ACCOUNT STATEMENT - anchors hold, unproven shapes fail loudly');
console.log('='.repeat(72));

const bytes = await readFile(samplePath);
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const lines = await reader.extractLines(buffer, pdfjs);

console.log('\n -- the front door routes it, and routes nothing else differently --');
note(reader.detectStatementFormat(lines) === 'bank', 'the shared detector routes it to the bank reader');
note(reader.detectBankStatementFormat(lines) === 'ncb', 'the bank sub-detector names NCB as the issuer');
note(
  reader.detectBankStatementFormat(['Transactions (Withdrawals & Deposits) - 1234', 'Opening Balance J$1.00']) ===
    'scotia',
  'a Scotiabank ledger still reads as Scotiabank'
);
note(reader.detectBankStatementFormat([]) === 'scotia', 'an empty file keeps the existing default path');
note(
  reader.detectBankStatementFormat(['Account Status : Active']) === 'scotia',
  'a single stray marker never flips the issuer on its own'
);

const parsed = reader.parseNcbBankStatementLines(lines, 'sample.pdf');
const statement = parsed.statements[0];
const recon = reader.reconcileNcbBankStatement(statement);

console.log('\n -- anchor 1: every page moves from its own opening to its own closing --');
note(parsed.statements.length === 1, 'the file holds exactly one statement');
note(statement.pages.length === 2, 'both pages were found');
note(statement.openingBalance != null, 'the brought-forward balance opens the statement');
for (const page of statement.pages) {
  note(
    page.opening != null &&
      page.closing != null &&
      Math.abs(roundMoney(page.opening - page.debitTotal + page.creditTotal) - page.closing) <= 0.01,
    `page ${page.index}: opening less debits plus credits reaches its closing balance`
  );
}
note(recon.checkedBalances === statement.transactions.length, 'every row printed a balance and every one was checked');
note(recon.balanceBreaks.length === 0, 'the running balance agrees with every printed balance');
note(recon.closingOk === true, 'the computed closing balance matches the last printed balance');
note(recon.ok === true, 'the statement reconciles');

console.log('\n -- anchor 2: each page footer equals the rows on that page --');
for (const page of statement.pages) {
  note(page.footer != null, `page ${page.index}: the footer totals were read`);
  note(page.footer && page.footer.nDebits === page.nDebits, `page ${page.index}: debit count matches its rows`);
  note(page.footer && page.footer.nCredits === page.nCredits, `page ${page.index}: credit count matches its rows`);
  note(
    page.footer && Math.abs(page.footer.debitTotal - page.debitTotal) <= 0.01,
    `page ${page.index}: debit total matches its rows`
  );
  note(
    page.footer && Math.abs(page.footer.creditTotal - page.creditTotal) <= 0.01,
    `page ${page.index}: credit total matches its rows`
  );
}
note(recon.footerOk === true, 'no page footer disagrees with its own rows');
const lastPage = statement.pages[statement.pages.length - 1];
note(
  lastPage.footer.nCredits !== recon.nIn || lastPage.footer.nDebits !== recon.nOut,
  'the final page alone does not describe the whole statement, so totals are summed across pages'
);
note(recon.nOut === statement.pages.reduce((a, p) => a + p.nDebits, 0), 'debit count is the sum of every page');
note(recon.nIn === statement.pages.reduce((a, p) => a + p.nCredits, 0), 'credit count is the sum of every page');

console.log('\n -- anchor 3: a later page opens where the page before it closed --');
for (let i = 1; i < statement.pages.length; i++) {
  note(
    Math.abs(statement.pages[i - 1].closing - statement.pages[i].opening) <= 0.01,
    `page ${statement.pages[i].index}: opens on the previous page's closing balance`
  );
}
note(recon.carryOk === true, 'the balance chain runs unbroken across the page break');
note(
  statement.headerAccounts.length > 1 && recon.ok,
  'the page headers disagree on the account number while the balance chain proves one account'
);
note(
  new Set(statement.transactions.map((t) => t.account)).size === 1,
  'the rows are kept on one account rather than split by the page header'
);

console.log('\n -- dates carry no year, so the year comes from the statement date --');
note(/^\d{4}-\d{2}-\d{2}$/.test(statement.statementDate), 'the statement date was read as a full date');
note(statement.rollovers === 0, 'no year boundary is claimed on a single-month statement');
const stmtYear = statement.statementDate.slice(0, 4);
note(
  statement.transactions.every((t) => t.date.slice(0, 4) === stmtYear),
  'every row takes its year from the statement date'
);
note(
  statement.transactions.every((t) => t.date <= statement.statementDate),
  'no row is dated after the statement itself'
);
note(
  statement.transactions.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date)),
  'every row resolved to a full date'
);
note(statement.dateOpened !== statement.statementDate, 'the account opening date is not mistaken for the period');
note(
  statement.period.includes(statement.statementDate.slice(0, 4)) &&
    !statement.period.includes(String(statement.dateOpened || '').slice(0, 4)),
  'the covered window is inferred from the rows and the statement date, never from the date opened'
);

console.log('\n -- POS fee triples ride with the purchase they belong to --');
const feeRows = statement.transactions.filter(
  (t) => t.type === 'POS Tx Fee' || t.type === 'GCT on POS Tx Fee'
);
note(feeRows.length >= 2, 'the statement carries POS fee rows');
note(
  feeRows.every((t) => t.attachedTo && t.attachedTo.trim()),
  'every POS fee row names the purchase it belongs to'
);
for (const fee of feeRows) {
  const i = statement.transactions.indexOf(fee);
  let parent = null;
  for (let k = i - 1; k >= 0; k--) {
    const p = statement.transactions[k];
    if (p.type === 'POS Tx Fee' || p.type === 'GCT on POS Tx Fee') continue;
    parent = p;
    break;
  }
  note(parent && parent.direction === 'out', 'a POS fee follows a purchase');
  note(parent && parent.date === fee.date, 'a POS fee is attached only within its own day');
  note(parent && fee.attachedTo === (parent.attachedTo || parent.description), 'the fee is attached to that purchase');
}
const grouped = classifyInternalTransfers(statement.transactions, [], []);
const feeKeys = new Set(
  grouped.filter((t) => t.type === 'POS Tx Fee' || t.type === 'GCT on POS Tx Fee').map((t) => t.counterpartyKey)
);
const purchaseKeys = new Set(
  grouped.filter((t) => !t.type && t.direction === 'out').map((t) => t.counterpartyKey)
);
note(
  [...feeKeys].every((k) => purchaseKeys.has(k)),
  'a POS fee never becomes a place of its own in merchant grouping'
);
note(
  !grouped.some((t) => /POS TX FEE/i.test(String(t.counterpartyLabel || ''))),
  'no fee row is ranked as somewhere money was spent'
);
const readsAsPrinted = (t) =>
  transactionName(t).toUpperCase().replace(/\s+/g, ' ') ===
  String(t.description || '').toUpperCase().replace(/\s+/g, ' ');
note(
  grouped
    .filter((t) => t.type === 'POS Tx Fee' || t.type === 'GCT on POS Tx Fee')
    .every(readsAsPrinted),
  'a fee row still reads on screen as the statement printed it, not as the merchant'
);
note(
  grouped.filter((t) => t.type === 'POSREV').every(readsAsPrinted),
  'every reversal row reads the same way whether or not it could be paired'
);
note(
  grouped
    .filter((t) => t.attachedTo)
    .every((t) => transactionName(t) !== t.counterpartyLabel),
  'an attached row is grouped under the purchase without being renamed to it'
);
note(
  grouped.filter((t) => !t.attachedTo).every((t) => t.displayName === undefined),
  'an ordinary row is left with no display name of its own'
);

console.log('\n -- POSREV reversals: paired only on exact evidence, never forced --');
const revs = statement.transactions.filter((t) => t.type === 'POSREV');
note(revs.length >= 3, 'the statement carries reversal rows');
note(
  revs.every((t) => t.direction === 'in' && t.reversalMatch),
  'every reversal is a credit and every one was classified'
);
note(revs.every((t) => isBankRefund(t)), 'a reversal is money returned, never income');
const exact = revs.filter((t) => t.reversalMatch === 'exact');
const unmatched = revs.filter((t) => t.reversalMatch === 'unmatched');
note(exact.length === 3, 'three reversals paired exactly with a preceding charge');
note(unmatched.length === 2, 'two reversals could not be paired with certainty');
note(
  exact.every((t) => t.reverses != null && t.attachedTo),
  'a paired reversal names the row it reverses'
);
note(
  unmatched.every((t) => t.reverses == null && t.attachedTo == null),
  'an unpaired reversal is left standing alone rather than linked to a guess'
);
const reversedRows = statement.transactions.filter((t) => t.reversed);
note(reversedRows.length === 3, 'exactly one purchase and its two fees are marked reversed');
note(
  new Set(reversedRows.map((t) => t.date)).size === 1,
  'the fully reversed group sits on a single day'
);
note(
  reversedRows.filter((t) => t.type === 'POS Tx Fee' || t.type === 'GCT on POS Tx Fee').length === 2,
  'a full reversal takes the purchase and both of its fees'
);
note(
  exact.every((t) => {
    const target = statement.transactions.find((x) => x.sseq === t.reverses);
    return target && roundMoney(target.amount) === roundMoney(t.amount);
  }),
  'a pairing is only ever made on an exactly equal amount'
);
note(recon.unmatchedReversals === unmatched.length, 'the reconciliation reports the unpaired reversals');

console.log('\n -- truncated descriptions do not break identity --');
const ids = statement.transactions.map((t) => reader.bankTransactionIdentity(t));
note(new Set(ids).size === ids.length, 'every row has its own identity');
const byDesc = new Map();
for (const t of statement.transactions) {
  const d = String(t.description || '');
  byDesc.set(d, (byDesc.get(d) || 0) + 1);
}
const repeated = [...byDesc.values()].filter((n) => n > 1);
note(repeated.length > 0, 'the statement really does clip several descriptions to the same string');
note(
  statement.transactions.every((t) => !/\s{2,}/.test(String(t.description || ''))),
  'no description carries the column padding it was clipped against'
);
const again = reader.parseNcbBankStatementLines(lines, 'sample.pdf');
note(
  again.transactions.map((t) => reader.bankTransactionIdentity(t)).join('|') === ids.join('|'),
  'a second read of the same file produces the same identities'
);
note(
  reader.bankStatementHash(statement) === reader.bankStatementHash(again.statements[0]),
  'the statement fingerprint is stable, so a re-import dedupes'
);

console.log('\n -- the record is the existing bank record, not a new shape --');
const scotiaShape = [
  'date',
  'rawDate',
  'seq',
  'sseq',
  'type',
  'description',
  'direction',
  'amount',
  'signedAmount',
  'balanceAfter',
  'account',
  'currency',
  'source_file',
];
note(
  scotiaShape.every((k) => Object.prototype.hasOwnProperty.call(statement.transactions[0], k)),
  'every field the Scotiabank ledger record carries is present'
);
note(statement.currency === 'JMD', 'the printed currency is read from the header');
note(
  statement.transactions.every(
    (t) => t.signedAmount === roundMoney(t.direction === 'in' ? t.amount : -t.amount)
  ),
  'the signed amount follows the printed direction'
);
note(
  reader.reconcileBankStatement({
    openingBalance: statement.openingBalance,
    closingBalance: statement.closingBalance,
    transactions: statement.transactions,
  }).ok,
  'the shared bank reconciliation model accepts it unchanged'
);

/* Every fixture below is invented. It copies the SHAPE of the real statement -
   page marker, header dates, brought-forward, four columns, footer boxes - and
   none of its content. */
const fixture = (over = {}) => {
  const page = (idx, mark, rows, footer, tail) => [
    `MS ${mark}/${idx}`,
    'SAMPLE BRANCH',
    'A PERSON 1111 2222 3',
    '1 SAMPLE ROAD 01-01-2020',
    `SAMPLE TOWN ${over.headerDate || '15-09-2026'}`,
    'JAMAICA JMD',
    'REGULAR SAVINGS',
    'Account Status : Active (Customer Operating within the past 12 months).',
    ...rows,
    footer,
    tail,
  ];
  return [
    ...page(
      1,
      over.mark1 || '15-09',
      [
        '/ 1,000.00',
        '02/Sep NATIONAL CHAIN SAMPLE TOWN -100.00 900.00',
        '02/Sep POS Tx Fee -2.25 897.75',
        '02/Sep GCT on POS Tx Fee -0.34 897.41',
        '03/Sep POSREV 100.00 997.41',
        '03/Sep POSREV 2.25 999.66',
        '03/Sep POSREV 0.34 1,000.00',
        over.lastRow || '03/Sep POSREV 5.00 1,005.00',
      ],
      over.footer1 || '3 102.59 4 107.59 0',
      'CONTINUED'
    ),
    ...page(
      2,
      over.mark2 || '15-09',
      [over.carry || '03/Sep 1,005.00', '10/Sep ACH SAMPLE PAYER 500.00 1,505.00'],
      '0 0 1 500.00 0 0',
      '30-09-2026 09:00:00 END OF STATEMENT'
    ),
  ];
};

console.log('\n -- the invented fixture in the real shape reconciles --');
const clean = reader.parseNcbBankStatementLines(fixture(), 'clean.pdf');
const cleanRecon = reader.reconcileNcbBankStatement(clean.statements[0]);
note(reader.detectBankStatementFormat(fixture()) === 'ncb', 'the fixture is recognised as an NCB account statement');
note(cleanRecon.ok === true, 'the fixture reconciles on all three anchors');
note(clean.statements[0].transactions.length === 8, 'every fixture row was read');
note(clean.statements[0].warnings.length === 0, 'a clean statement raises nothing');
note(
  clean.statements[0].transactions.filter((t) => t.reversalMatch === 'exact').length === 3 &&
    clean.statements[0].transactions.filter((t) => t.reversalMatch === 'unmatched').length === 1,
  'the fixture reproduces a full reversal beside an unpairable one'
);

console.log('\n -- every unproven shape fails loudly instead of guessing --');
const broken = reader.reconcileNcbBankStatement(
  reader.parseNcbBankStatementLines(
    fixture({ lastRow: '03/Sep POSREV 5.00 9,999.99' }),
    'broken.pdf'
  ).statements[0]
);
note(broken.ok === false && broken.balanceBreaks.length > 0, 'a broken balance chain does not reconcile');

const badFooter = reader.reconcileNcbBankStatement(
  reader.parseNcbBankStatementLines(fixture({ footer1: '9 999.99 4 107.59 0' }), 'footer.pdf')
    .statements[0]
);
note(
  badFooter.ok === false && badFooter.footerOk === false,
  'a footer that disagrees with its own rows does not reconcile'
);
note(
  badFooter.balanceBreaks.some((b) => /Page 1/.test(b)),
  'the break names the page that disagreed'
);

const badCarry = reader.reconcileNcbBankStatement(
  reader.parseNcbBankStatementLines(fixture({ carry: '03/Sep 2,500.00' }), 'carry.pdf').statements[0]
);
note(
  badCarry.ok === false && badCarry.carryOk === false,
  'a page that does not continue from the one before it does not reconcile'
);

const noFooter = reader.parseNcbBankStatementLines(
  fixture().filter((l) => l !== '3 102.59 4 107.59 0'),
  'nofooter.pdf'
);
note(
  reader.reconcileNcbBankStatement(noFooter.statements[0]).footerOk === false,
  'an unreadable footer is reported rather than assumed correct'
);

const rolled = reader.parseNcbBankStatementLines(
  fixture({ mark1: '15-01', mark2: '15-01', headerDate: '15-01-2026' })
    .map((l) => l.replace(/^02\/Sep/, '28/Dec').replace(/^03\/Sep/, '02/Jan').replace(/^10\/Sep/, '05/Jan')),
  'rollover.pdf'
);
note(rolled.statements[0].rollovers === 1, 'a month running backwards is read as a year boundary');
note(
  rolled.statements[0].transactions[0].date.slice(0, 4) === '2025' &&
    rolled.statements[0].transactions[rolled.statements[0].transactions.length - 1].date.slice(0, 4) === '2026',
  'rows before the boundary take the earlier year and rows after it the statement year'
);
note(
  rolled.statements[0].warnings.includes('year-rollover'),
  'a year boundary is reported as unproven rather than trusted silently'
);

const twoStatements = reader.parseNcbBankStatementLines(
  [...fixture(), ...fixture({ mark1: '15-10', mark2: '15-10', headerDate: '15-10-2026' })],
  'two.pdf'
);
note(twoStatements.warnings.includes('multi-statement'), 'a file holding more than one statement says so');
note(twoStatements.statements.length === 2, 'and the two are never merged into one balance chain');

const noDate = reader.parseNcbBankStatementLines(fixture({ headerDate: '02-02-2021' }), 'nodate.pdf');
note(noDate.statements[0].statementDate === '', 'a statement date that does not match the page marker is not guessed');

const lateRow = reader.parseNcbBankStatementLines(
  fixture({ mark1: '05-09', mark2: '05-09', headerDate: '05-09-2026' }),
  'late.pdf'
);
note(lateRow.statements[0].warnings.includes('late-row'), 'a row dated after the statement date is reported');

note(reader.parseNcbBankStatementLines([], 'empty.pdf').warnings.length > 0, 'an empty file is reported');
note(
  reader.parseNcbBankStatementLines(['nothing here'], 'none.pdf').warnings.includes('No statement pages could be read.'),
  'a file with no readable pages is reported'
);

console.log('\n -- the import surfaces it through the shared warning channel --');
const intake = await readFile(join(root, 'application', 'ui', 'app-intake.js'), 'utf8');
note(
  (intake.match(/detectStatementFormat\(lines\)/g) || []).length === 1,
  'every PDF still passes through one front door'
);
const branch = intake.slice(
  intake.indexOf("if (detectBankStatementFormat(lines) === 'ncb')"),
  intake.indexOf('const parsed = parseBankStatementLines(lines, file.name)')
);
note(branch.length > 0, 'the NCB branch sits inside the bank branch, before the Scotiabank reader');
note(
  /state\.warnings\.push\(/.test(branch) && !/state\.bankWarnings\.push\(/.test(branch),
  'its warnings go to the channel the app actually shows'
);
note(
  (branch.match(/\$\{file\.name\}/g) || []).length >= 5,
  'every warning it raises names the file'
);
note(
  branch.indexOf('await persistBank()') < branch.indexOf('await Store.putBankStatement'),
  'NCB bank rows commit before their duplicate marker'
);
note(
  /reconcileNcbBankStatement\(st\)/.test(branch) && /reconciled: r\.ok/.test(branch),
  'the stored statement records whether it reconciled'
);
note(
  /mergeBankTransactions\(state\.bankRecords/.test(branch) && !/Store\.putStatement\(/.test(branch),
  'it writes to the existing bank ledger and never to the card store'
);
note(
  !/parseNcbBankStatementLines/.test(
    intake.slice(intake.indexOf("if (format === 'investment')"), intake.indexOf("if (format === 'bank')"))
  ),
  'the investment branch is untouched'
);

const analysis = await readFile(join(root, 'application', 'analysis', 'bank-analysis.js'), 'utf8');
note(/const cpText = r\.attachedTo \|\| own;/.test(analysis), 'one shared rule decides which counterparty a row groups under');
note(/POSREV/.test(analysis), 'the shared refund rule knows a reversal when it sees one');

const statements = await readFile(join(root, 'application', 'statements', 'read-statements.js'), 'utf8');
const detector = statements.slice(
  statements.indexOf('export function detectStatementFormat'),
  statements.indexOf('export function detectCardStatementFormat')
);
note(
  detector.indexOf("return 'investment'") < detector.indexOf("return 'bank'"),
  'the shared detector still checks for an investment statement first'
);
note(
  detector.indexOf('ledgerHeader ||') < detector.indexOf('detectBankStatementFormat'),
  'the Scotiabank ledger is still recognised before the NCB fallback runs'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(
  ' VERIFIED against the one real statement: the three reconciliation anchors,\n' +
    ' per-page footers, the page carry, year-from-statement-date, POS fee\n' +
    ' attachment, one full reversal and two that could not be paired.\n' +
    ' UNVERIFIED, and reported as watch items rather than confirmed: the year\n' +
    ' boundary, overdrawn balances, non-JMD accounts and multi-account files.'
);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
