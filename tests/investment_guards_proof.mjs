import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');
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
console.log(' INVESTMENT GUARDS - a new branch, never a second spine');
console.log('='.repeat(72));

const reader = read('application', 'statements', 'read-investments.js');
const analysis = read('application', 'analysis', 'investments.js');
const render = read('application', 'ui', 'investments-render.js');
const chartSurface = read('application', 'ui', 'chart-surface.js');
const chartHelpers = read('application', 'ui', 'chart-helpers.js');
const intake = read('application', 'ui', 'app-intake.js');
const statements = read('application', 'statements', 'read-statements.js');
const position = read('application', 'analysis', 'position.js');
const proven = read('application', 'analysis', 'proven-models.js');
const planRender = read('application', 'ui', 'plan-render.js');
const plan = read('application', 'analysis', 'plan.js');
const storage = read('application', 'core', 'storage.js');
const serviceWorker = read('service-worker.js');
const controller = read('application', 'app-controller.js');

const appFiles = [];
for (const dir of ['analysis', 'ui', 'statements', 'output', 'core', 'sample-data']) {
  for (const file of readdirSync(join(ROOT, 'application', dir)).filter((f) => f.endsWith('.js'))) {
    appFiles.push([`application/${dir}/${file}`, read('application', dir, file)]);
  }
}
appFiles.push(['application/app-controller.js', read('application', 'app-controller.js')]);

console.log('\n -- an investment statement never enters the transaction ledgers --');
const LEDGER_WRITE =
  /\b(?:putTransactions|replaceTransactions|putBankTransactions|replaceBankTransactions|putStatement|putBankStatement|putCardStatement|mergeTransactions|mergeBankTransactions|persistBank|persist)\s*\(/;
note(![reader, analysis, render].some((src) => LEDGER_WRITE.test(src)), 'investment modules never write a card or bank ledger');
const branchStart = intake.indexOf("if (format === 'investment')");
const branchEnd = intake.indexOf("if (format === 'bank')");
const branch = intake.slice(branchStart, branchEnd);
note(branchStart > -1 && branchEnd > branchStart, 'the intake routes investments before the bank branch');
note(/parseInvestmentStatements\(lines, file\.name\)/.test(branch) && /Store\.investmentStatements\.put\(/.test(branch) && !LEDGER_WRITE.test(branch), 'the investment branch parses once and writes only its own store');
const investmentWrites = (intake.match(/Store\.investmentStatements\.put\(/g) || []).length;
note(investmentWrites === 1, `the intake stores an investment statement in exactly one place (found ${investmentWrites})`);
note(!/async function storeInvestmentFile/.test(intake), 'and no second, unreachable copy of that step survives beside it');
note((intake.match(/detectStatementFormat\(lines\)/g) || []).length === 1, 'every PDF still passes through one front door');
const detector = statements.slice(
  statements.indexOf('export function detectStatementFormat'),
  statements.indexOf('export function detectCardStatementFormat')
);
note(
  detector.includes("return 'investment'") && detector.indexOf("return 'investment'") < detector.indexOf("return 'bank'"),
  'the shared detector checks for an investment statement before a bank one'
);

console.log('\n -- the contribution has one source --');
const definers = appFiles.filter(([, src]) => /export function investmentContributionsByMonth\b/.test(src));
note(definers.length === 1 && definers[0][0] === 'application/analysis/investments.js', 'exactly one module defines the contribution figure');
const depositReaders = appFiles.filter(
  ([name, src]) => name !== 'application/analysis/investments.js' && /type\s*[!=]==\s*'D'/.test(src)
);
note(depositReaders.length === 0, `no other module sums deposits${depositReaders.length ? ' - ' + depositReaders.map((f) => f[0]).join(', ') : ''}`);
note(/investmentContributionsByMonth\(state\._investmentStatements/.test(planRender), 'Plan reads the contribution from that source');
note(!/cashActivity|printedTotal/.test(plan), 'Plan never reaches into an investment record itself');
note(!/\bStore\b|setMeta/.test(analysis) && !/\bStore\b|setMeta/.test(reader), 'the reader and its signals never write anywhere, Plan included');

console.log('\n -- the headline is the printed total --');
note(/headlineTotal: statement\.printedTotal/.test(analysis), "each account's headline is its statement's printed total");
const headlineLines = analysis
  .split('\n')
  .filter((l) => /headlineTotal\s*[:=]|combinedTotal\s*(?:\+=|=|:)/.test(l));
note(headlineLines.length >= 3 && headlineLines.every((l) => !/holdings|valueBase|\.value\b/.test(l)), 'no holding value feeds the headline');
note(/combinedTotal \+= Number\(account\.headlineTotal\)/.test(analysis), 'across accounts only printed totals are added');
note(/bankMoney\(snap\.combinedTotal\)/.test(render), 'the Investments card leads with that figure');
note(/const amount = r2\(Number\(item\.printedTotal\)/.test(position), 'Position adds the printed total');
note(/investments: investmentNetWorthItems\(state\._investmentStatements/.test(proven), 'through the existing recorded net-worth path');
const integrity = analysis.slice(analysis.indexOf('export function statementIntegrity'), analysis.indexOf('function accountSnapshot'));
note(/crossCheckGap/.test(integrity) && !/headlineTotal/.test(integrity), 'the holdings sum only ever cross-checks');

console.log('\n -- raw facts stored, every signal derived --');
note(!/\b(?:role|costReturn|costConfirmed|move)\s*:/.test(reader), 'the stored record carries no derived signal');
note(!/narrative/i.test(reader), 'the activity narrative is never kept');
note(/provider:\s*'ncb'/.test(reader) && /provenance:\s*statementProvenance\('ncb'\)/.test(reader), 'NCB extends the shared record with provider and field provenance');
note(/yield:\s*num\(row\[5\]\)/.test(reader) && /unrealisedGainLoss:\s*num\(row\[6\]\)/.test(reader), 'NCB yield and gain or loss are read from the statement');
note(/cashActivity:\s*\[\]/.test(reader) && /lastMonthValue:\s*null/.test(reader), 'NCB activity and month movement are never invented');
note(/HOLDING_SECTIONS/.test(reader) && /label:\s*'Funds'/.test(reader), 'provider section names share one canonical grouping');
note(/retail-repo-migration/.test(reader), 'the cash-to-fund migration has one stable identity');

console.log('\n -- reuse the seams --');
note(/renderColumnChart\(/.test(render) && !/createElementNS|chartSvg\(/.test(render), 'the value-over-time chart reuses the shared chart surface');
note(/buildDisclosure\(el, 'See the detail'/.test(render), 'history and holdings share one existing disclosure inside the card');
note(
  /buildDisclosure\(\s*el,\s*el\(\s*'span',\s*\{ class: 'inv-group-head' \}/.test(render) &&
    /remember: `investment-group-\$\{group\.kind\}`/.test(render),
  'each asset class folds behind that same disclosure and keeps its open state by class'
);
note(
  /export function proportionShares\b/.test(chartHelpers) &&
    /proportionShares\(spec\.bands\)/.test(chartSurface) &&
    /proportionShares\(bands\)/.test(render),
  'the group shares and the share bar are one calculation'
);
note(/selectedAccountKey/.test(analysis) && /state\.investmentAccount/.test(render), 'one account selection re-slices the shared analysis and render path');
note(/state\._investmentStatements/.test(controller) && /`\$\{isoToday\(\)\}\|\$\{state\.investmentAccount\}`/.test(controller), 'investment data and the selected slice invalidate Position cache');
note(/accounts\.length === 2 \? 'Both' : 'All'/.test(render) && /accounts\.length <= 4/.test(render), 'Both is the two-account default and larger account sets degrade to a select');
note(/mergeInvestmentHoldings/.test(analysis) && /securityKey\(/.test(analysis), 'Both merges the same security through one shared identity');
note(/partialAccounts: present && accounts\.length < allAccounts\.size/.test(analysis) && /const accounts = \[\.\.\.new Set/.test(analysis), 'single-account opening months remain in the combined chart with explicit coverage');
note(/from < index && index < to && !accounts\.includes\(key\)/.test(analysis) && /const present = here\.length > 0 && !missingAccounts\.length/.test(analysis), 'a month an account skipped between its own statements is a gap, never a partial total');
note(/the line includes all accounts/.test(render), 'the chart explains where its coverage changes');
note(/name: 'investmentStatements', keyPath: 'hash'/.test(storage) && /DB_VERSION = (?:[5-9]|[1-9]\d)\b/.test(storage), 'investments have their own store declaration');
note(/for \(const s of V5_STORES\)/.test(storage) && /investmentStatements: idStore\('investmentStatements'\)/.test(storage), 'the store is created and exposed on a fresh boot');
for (const file of [
  'application/statements/read-investments.js',
  'application/analysis/investments.js',
  'application/ui/investments-render.js',
]) {
  note(serviceWorker.includes(`'./${file}',`), `${file} is part of the offline shell`);
}
const pkg = JSON.parse(read('package.json'));
note(pkg.build.files.includes('application/**'), 'the desktop build ships every application module');
note(!/provisional/i.test(analysis + render + reader), 'investments stay outside any provisional-balance machinery');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
