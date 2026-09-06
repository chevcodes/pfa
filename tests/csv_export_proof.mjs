import {
  bankToCSV,
  bankToDetailedCSV,
  buildUnknownMerchantsCSV,
  csvEscape,
  toCSV,
  toDetailedCSV,
} from '../application/output/csv-export.js';

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
console.log(' CSV EXPORT - safe cells, stable ordering, consistent documents');
console.log('='.repeat(72));

note(csvEscape('Shop, Jamaica') === '"Shop, Jamaica"', 'commas are quoted');
note(csvEscape('A "quoted" place') === '"A ""quoted"" place"', 'quotes are doubled');
note(csvEscape('line\r\nbreak') === '"line\r\nbreak"', 'CRLF content is quoted');
for (const value of ['=1+1', '+cmd', '@SUM(A1:A2)', '-HYPERLINK("x")', '\t=1']) {
  note(csvEscape(value).includes("'"), `${JSON.stringify(value)} cannot become a spreadsheet formula`);
}
note(csvEscape('-125.40') === '-125.40', 'negative numeric amounts remain numeric');

const card = {
  id: 'card-1',
  date: '2026-01-02',
  ref: 'ref-1',
  raw_description: '=FORMULA',
  description: '=FORMULA',
  displayName: '=FORMULA',
  merchantGroup: 'Test',
  category: 'Groceries',
  confidence: 1,
  kind: 'purchase',
  source_file: 'Statement.pdf',
  amount: 12.5,
  foreign: '',
};
const bank = [
  {
    id: 'bank-2',
    date: '2026-02-02',
    account: 'B',
    currency: 'JMD',
    description: '@FORMULA',
    counterpartyLabel: '@FORMULA',
    counterpartyKey: 'FORMULA',
    direction: 'out',
    amount: 20,
    balanceAfter: 80,
    source_file: 'Bank.pdf',
  },
  {
    id: 'bank-1',
    date: '2026-01-01',
    account: 'A',
    currency: 'JMD',
    description: 'Income',
    counterpartyLabel: 'Income',
    direction: 'in',
    amount: 100,
    balanceAfter: 100,
    source_file: 'Bank.pdf',
  },
];

for (const csv of [toCSV([card]), toDetailedCSV([card]), bankToCSV(bank), bankToDetailedCSV(bank)]) {
  note(csv.endsWith('\r\n'), 'CSV document ends with CRLF');
  note(!/(?<!\r)\n/.test(csv), 'CSV document uses CRLF consistently');
}
note(toCSV([card]).includes("'=FORMULA"), 'card descriptions are formula-safe');
note(bankToCSV(bank).includes("'@FORMULA"), 'bank counterparties are formula-safe');
note(bankToCSV(bank).split('\r\n')[1].startsWith('2026-01-01,A,'), 'bank rows have stable account/date order');
note(bankToCSV(bank).includes(',-20.00,80.00'), 'bank outflows retain numeric sign and two decimals');
note(toCSV([card]).includes(',12.50,'), 'card amounts retain two decimals');

const unknown = buildUnknownMerchantsCSV([
  { raw_description: '=FORMULA', confidence: 0, category: 'Uncategorised' },
]);
note(unknown.csv.includes("'=FORMULA"), 'unknown-merchant export is formula-safe');
note(unknown.csv.startsWith('Description,Occurrences\r\n'), 'minimal export has its defined two-column header');
note(!unknown.csv.includes('Amount'), 'minimal merchant export contains no monetary column');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
