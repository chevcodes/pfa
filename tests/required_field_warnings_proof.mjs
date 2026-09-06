import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseOneBankStatement,
  parseCardStatementSummary,
  parseNcbHeader,
} from '../application/statements/read-statements.js';
import { parseInvestmentStatement } from '../application/statements/read-investments.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
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
console.log(' REQUIRED FIELD WARNINGS - one visible parser mechanism');
console.log('='.repeat(72));

const bank = parseOneBankStatement(
  ['Opening Balance J$1.00', 'Closing Balance J$1.00'],
  'bank-missing-field.pdf',
  0
);
const card = parseCardStatementSummary(['PREVIOUS BALANCE 1.00'], 'card-missing-field.pdf');
const ncb = parseNcbHeader([], 'ncb-missing-field.pdf');
const investment = parseInvestmentStatement([], 'investment-missing-field.pdf').statement;
for (const [warnings, file, field] of [
  [bank.warnings, 'bank-missing-field.pdf', 'account number'],
  [card.warnings, 'card-missing-field.pdf', 'card number'],
  [ncb.warnings, 'ncb-missing-field.pdf', 'card number'],
  [investment.warnings, 'investment-missing-field.pdf', 'account number'],
])
  note(
    warnings.some((warning) => warning.includes(file) && warning.includes(field)),
    `${file} names the missing ${field}`
  );

const intake = readFileSync(join(root, 'application', 'ui', 'app-intake.js'), 'utf8');
const reader = readFileSync(join(root, 'application', 'statements', 'read-statements.js'), 'utf8');
const investments = readFileSync(join(root, 'application', 'statements', 'read-investments.js'), 'utf8');
note(/function appendRequiredFieldWarnings\(/.test(intake), 'intake has one route into the visible warning channels');
note((intake.match(/appendRequiredFieldWarnings\(/g) || []).length >= 5, 'every statement variant uses the visible warning route');
note(/if \(state\.warnings\.length\)\s*\n\s*toast\(/.test(intake), 'the shared warning list reaches the visible toast channel');
note((reader.match(/recordMissingRequiredField\(/g) || []).length >= 5, 'bank and both card readers call the shared helper');
note(/recordMissingRequiredField\(/.test(investments), 'the investment reader calls the shared helper');
note(!/warnings\.push\([^\n]*account number could not be read/.test(reader), 'readers cannot reintroduce a private account-number warning');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
