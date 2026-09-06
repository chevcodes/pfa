import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as reader from '../application/statements/read-statements.js';
import { reviewBaseline } from '../application/analysis/review-causes.js';

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
const corpusDir = join(root, '..', 'data', 'Statements', 'Credit Cards', 'Scotia');
const pdfjs = await import('../third-party/pdf.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../third-party/pdf.worker.min.mjs', import.meta.url).href;

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
console.log(' SCOTIA CARD PERIOD - footer close date, honest fallback and corpus parity');
console.log('='.repeat(72));

const expected = new Map([
  ['CC_Apr_25.pdf', ['Mar 17 - Apr 15, 2025', '2025-03-17', '2025-04-15']],
  ['CC_Apr_26.pdf', ['Mar 16 - Apr 15, 2026', '2026-03-16', '2026-04-15']],
  ['CC_Aug_25.pdf', ['Jul 15 - Aug 15, 2025', '2025-07-15', '2025-08-15']],
  ['CC_Aug_26.pdf', ['Jul 15 - Aug 17, 2026', '2026-07-15', '2026-08-17']],
  ['CC_Dec_24.pdf', ['Nov 26 - Dec 16, 2024', '2024-11-26', '2024-12-16']],
  ['CC_Dec_25.pdf', ['Nov 17 - Dec 15, 2025', '2025-11-17', '2025-12-15']],
  ['CC_Feb_25.pdf', ['Jan 15 - Feb 17, 2025', '2025-01-15', '2025-02-17']],
  ['CC_Feb_26.pdf', ['Jan 15 - Feb 16, 2026', '2026-01-15', '2026-02-16']],
  ['CC_Jan_25.pdf', ['Dec 16 - Jan 15, 2025', '2024-12-16', '2025-01-15']],
  ['CC_Jan_26.pdf', ['Dec 15 - Jan 15, 2026', '2025-12-15', '2026-01-15']],
  ['CC_Jul_25.pdf', ['Jun 16 - Jul 15, 2025', '2025-06-16', '2025-07-15']],
  ['CC_Jul_26.pdf', ['Jun 15 - Jul 15, 2026', '2026-06-15', '2026-07-15']],
  ['CC_Jun_25.pdf', ['May 15 - Jun 16, 2025', '2025-05-15', '2025-06-16']],
  ['CC_Jun_26.pdf', ['May 15 - Jun 15, 2026', '2026-05-15', '2026-06-15']],
  ['CC_Mar_25.pdf', ['Feb 17 - Mar 17, 2025', '2025-02-17', '2025-03-17']],
  ['CC_Mar_26.pdf', ['Feb 16 - Mar 16, 2026', '2026-02-16', '2026-03-16']],
  ['CC_May_25.pdf', ['Apr 15 - May 15, 2025', '2025-04-15', '2025-05-15']],
  ['CC_May_26.pdf', ['Apr 15 - May 15, 2026', '2026-04-15', '2026-05-15']],
  ['CC_Nov_25.pdf', ['Oct 15 - Nov 17, 2025', '2025-10-15', '2025-11-17']],
  ['CC_Oct_25.pdf', ['Sep 15 - Oct 15, 2025', '2025-09-15', '2025-10-15']],
  ['CC_Sep_25.pdf', ['Aug 15 - Sep 15, 2025', '2025-08-15', '2025-09-15']],
  ['CC_Sep_26.pdf', ['Aug 17 - Sep 15, 2026', '2026-08-17', '2026-09-15']],
]);

const names = (await readdir(corpusDir)).filter((name) => name.endsWith('.pdf')).sort();
note(names.join('|') === [...expected.keys()].sort().join('|'), 'the proof covers every real Scotia card statement in the current corpus');

const transactionCorpus = [];
for (const name of names) {
  const bytes = await readFile(join(corpusDir, name));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const lines = await reader.extractLines(buffer, pdfjs);
  const summary = reader.parseCardStatementSummary(lines, name);
  const parsed = reader.parseStatementLines(lines, name);
  const [periodText, periodStart, periodEnd] = expected.get(name);
  note(summary.periodText === periodText, `${name}: the full printed period is retained (${summary.periodText || 'unreadable'})`);
  note(summary.periodStart === periodStart, `${name}: period start is ${periodStart}`);
  note(summary.periodEnd === periodEnd, `${name}: footer close date is ${periodEnd}`);
  note(summary.statementKey === periodEnd.slice(0, 7), `${name}: statement month follows the close date`);
  note(parsed.period === periodText, `${name}: transaction-file metadata uses the same period`);
  transactionCorpus.push([name, parsed.transactions]);
}

const transactionHash = createHash('sha256').update(JSON.stringify(transactionCorpus)).digest('hex');
note(transactionHash === '659de57cadbf6063597c9340781eaec922a849985614c451a0dc07caa18f5cb2', 'transaction extraction is byte-for-byte unchanged across the real Scotia corpus');

const primary = reader.parseCardStatementSummary(
  [
    'Statement Period',
    'Apr 15 - May 14, 2026',
    'CARDHOLDER - 0000 - 000000000000000 - 15-05-2026 - 09-06-2026 - 1',
  ],
  'primary.pdf'
);
note(primary.periodEnd === '2026-05-15' && primary.statementKey === '2026-05', 'the footer close date wins when the label disagrees');

const fallback = reader.parseCardStatementSummary(
  ['Statement Period', 'Apr 15 - May 15, 2026'],
  'fallback.pdf'
);
note(fallback.periodStart === '2026-04-15' && fallback.periodEnd === '2026-05-15', 'the page-one label remains the fallback when no footer is readable');

const brokenLines = [
  'Statement Period',
  'date unavailable',
  '15-May-2026 16-May-2026 12345678 NATIONAL CHAIN $10.00',
];
const broken = reader.parseStatementLines(brokenLines, 'corrupted-period.pdf');
note(
  broken.warnings.some((warning) => /corrupted-period\.pdf/i.test(warning) && /date could not be read/i.test(warning)),
  'an unreadable date names the file in the parser warning'
);

const intake = await readFile(join(root, 'application', 'ui', 'app-intake.js'), 'utf8');
note(
  /for \(const note of parsed\.warnings\) warn\(note\)/.test(intake),
  'Scotia import forwards the parser warning through state.warnings, against its file'
);
note(/if \(state\.warnings\.length\)[\s\S]*?toast\(/.test(intake), 'the shared import warning channel is shown after import');

const baseline = reviewBaseline({
  cardStatements: [
    { account: '0000', statementKey: '2026-04', periodEnd: '2026-04-15', importedAt: '2026-05-16T10:00:00.000Z' },
    { account: '0000', statementKey: '', periodEnd: null, importedAt: '2026-06-16T10:00:00.000Z' },
  ],
});
note(baseline.mode === 'state' && baseline.anchorUnreadable, 'an unreadable newest statement suppresses the older confident anchor');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
