import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeForeignMoney, makeMoney } from '../application/core/money-format.js';
import { withExactFigures } from '../application/core/privacy.js';
import {
  reconcileCardStatement,
  reconcileNcbStatement,
  reconcileOne,
} from '../application/statements/read-statements.js';

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
console.log(' PRIVACY SWEEP - no monetary string bypasses the shared gate');
console.log('='.repeat(72));

globalThis.document = { documentElement: { dataset: { privacy: 'off' } } };
const money = makeMoney({ currency: { code: 'JMD', locale: 'en-JM', decimals: 2, symbol: '$' } });
const foreignMoney = makeForeignMoney();
const visible = foreignMoney('1,234.50 USD');
note(visible === '1,234.50 USD', 'foreign money is unchanged when figures are visible');
document.documentElement.dataset.privacy = 'on';
note(!money(1234.5).includes('1,234'), 'ordinary money is masked');
const hiddenForeign = foreignMoney('1,234.50 USD');
note(hiddenForeign.endsWith(' USD') && !/[0-9]/.test(hiddenForeign), 'foreign money keeps its currency but not its amount');
note(!/[0-9]/.test(foreignMoney('-25.00 EUR')), 'negative foreign money is masked too');
note(withExactFigures(() => foreignMoney('1,234.50 USD')) === '1,234.50 USD', 'an explicit print/export build can reveal the exact figure');

const bankRecon = reconcileOne({
  openingBalance: 100,
  transactions: [{ signedAmount: -20, direction: 'out', amount: 20, balanceAfter: 50, rawDate: '02/05' }],
  closingBalance: 50,
});
note(!bankRecon.balanceBreaks[0].includes('50.00') && !bankRecon.balanceBreaks[0].includes('80.00'), 'bank reconciliation text stores no raw balance');
const cardRecon = reconcileCardStatement({ previousBalance: 100, purchases: 40, payments: -20, newBalance: 90 });
note(!cardRecon.break.includes('120.00') && !cardRecon.break.includes('90.00'), 'card reconciliation text stores no raw balance');
const ncbRecon = reconcileNcbStatement({ previousBalance: 100, newBalance: 90, signedBillingSum: -5 });
note(!ncbRecon.break.includes('-10.00') && !ncbRecon.break.includes('-5.00'), 'NCB reconciliation text stores no raw balance');

const cards = readFileSync(join(root, 'application', 'ui', 'cards-render.js'), 'utf8');
const print = readFileSync(join(root, 'application', 'analysis', 'reporting-print.js'), 'utf8');
note(!/r\.foreign\s*\+/.test(cards), 'foreign rows do not concatenate the stored amount directly');
/* Was: "exactly two occurrences". That pinned a COUNT rather than the rule,
   so it broke the moment the single-purchase row and the grouped row were
   merged into one shape - a change that removed a render path rather than an
   ungated one. What must hold is that no stored foreign amount reaches the
   screen except through foreignMoney(), whatever the number of paths: every
   mention of r.foreign is either gated or the truthiness test that picks the
   foreign rows out in the first place. */
const gatedForeign = (cards.match(/foreignMoney\(r\.foreign\)/g) || []).length;
const allForeign = (cards.match(/\br\.foreign\b/g) || []).length;
const selectForeign = (cards.match(/\(r\)\s*=>\s*r\.foreign\b/g) || []).length;
note(gatedForeign >= 1, 'the foreign-spend list renders through the gate');
note(
  allForeign - gatedForeign === selectForeign,
  'no stored foreign amount is read except through the gate or the row filter'
);
note(/foreign:\s*foreignMoney\(r\.foreign\)/.test(print), 'the report preview model uses the same gate');

delete globalThis.document;
console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
