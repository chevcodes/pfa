import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextStatementNudge } from '../application/analysis/reporting-periods.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
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
console.log(' CALM UI - disclosure, visual parity, and empty-state contracts');
console.log('='.repeat(72));

const controller = read('application', 'app-controller.js');
const settings = controller.slice(
  controller.indexOf('function manageDataBody()'),
  controller.indexOf('function nameSection()')
);
note(/attentionCount \? attentionSummary\(unknown, unreconciled\) : 'No review items'/.test(settings), 'settings leads with one state-derived status');
for (const label of ['Statements & coverage', 'Rules and categories', 'Profile & privacy', 'Start over']) {
  note(new RegExp(`foldSection\\(\\s*'${label.replace('&', '\\&')}'`).test(settings), `${label} is a collapsed group`);
}
note(!/foldSection\([\s\S]*?\{\s*open:\s*true/.test(settings), 'settings groups do not open themselves');
note(/exportBtn\.disabled = false/.test(controller), 'restore stays available with an empty ledger');
note(/label\.textContent = hasAnything \? 'Export' : 'Restore'/.test(controller), 'the top action names its empty-state purpose');
note(/'No statements loaded'/.test(controller), 'the period bar names the empty state');
note(/f\.hidden = !hasLedgerData\(\)/.test(controller), 'the empty screen does not repeat its privacy promise in the footer');
note(/!n\.id && !n\.name[\s\S]{0,80}ui-field-/.test(controller), 'generated form controls receive a browser-identifiable field id');

const foundation = read('interface', 'foundation.css');
const controls = read('interface', 'controls.css');
const workspace = read('interface', 'workspace-refinements.css');
const mockPersonas = read('application', 'sample-data', 'mock-personas.js');
note(/:where\(\.btn, \.icon-btn\):disabled\s*\{[^}]*cursor:\s*not-allowed;[^}]*opacity:\s*0\.46;/s.test(foundation), 'disabled controls visibly step back and stop advertising a click');
note(/\.empty\s*\{[^}]*padding:\s*42px 24px;[^}]*gap:\s*10px;/s.test(controls), 'empty cards use a compact first-run rhythm');
note(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1\.18fr\) minmax\(0, 0\.88fr\) minmax\(0, 0\.94fr\)/.test(workspace), 'the narrow header reserves enough room for Restore');
note(/select\.name = 'sample-persona'/.test(mockPersonas), 'the developer sample picker is identifiable to the browser');

const reset = controller.slice(
  controller.indexOf('function resetWorkspaceState('),
  controller.indexOf('const { reloadConfig, openRemoveStatement')
);
for (const value of [
  'state.records = [];',
  'state.bankRecords = [];',
  'state._bankStatements = [];',
  'state._cardStatements = [];',
  'state.tags = [];',
  'state.transactionSplits = [];',
  'state._planDraft = null;',
  "state.period = { type: 'latest-complete', from: null, to: null };",
  "state.view = 'overview';",
  '_viewCache = {};',
]) {
  note(reset.includes(value), `start over resets ${value}`);
}

const cards = read('application', 'ui', 'cards-render.js');
note(cards.includes("'Payday'"), 'the commitments guide is named Payday');
note(!cards.includes("'Paid'"), 'the chart no longer uses the awkward Paid caption');
note(!cards.includes('is-displaced'), 'payday placement does not depend on a late collision correction');
note(/metric-with-info[\s\S]{0,500}regular commitment/.test(cards), 'commitment qualification is behind the headline info control');

const dashboard = read('interface', 'dashboard.css');
note(/\.commit-when-payday-label\s*\{[^}]*top:\s*46%[^}]*translate\(calc\(-100% - 7px\), -50%\)/s.test(dashboard), 'Payday sits beside the middle of its guide');

const flow = read('interface', 'flow-chart.css');
note(/\.chart-guide\s*\{[^}]*padding:\s*0;[^}]*background:\s*transparent;/s.test(flow), 'chart references render as labels, not filled badges');
note(/\.chart-guide\s*\{[^}]*left:\s*50%;[^}]*translate\(-50%, calc\(-100% - 6px\)\)/s.test(flow), 'chart reference labels sit centred with a clear gap above their guide');
note(/\.chart-guide\s*\{[^}]*font-size:\s*12px;[^}]*font-weight:\s*600;/s.test(flow), 'chart reference labels share a readable compact type treatment');
note(/\.chart-guide\s*\{[^}]*max-width:\s*calc\(100% - 24px\);[^}]*text-overflow:\s*ellipsis;/s.test(flow), 'long chart reference labels stay inside the plot');
note(/\.chart-info-icon > svg\s*\{[^}]*shape-rendering:\s*geometricPrecision/s.test(flow), 'info icons use crisp vector geometry');
note(/\.chart-info > \.chart-info-body\s*\{[^}]*background:\s*var\(--panel\)[^}]*line-height:\s*1\.45[^}]*white-space:\s*normal/s.test(flow), 'info popovers keep a readable surface and line rhythm');

const decisionHeader = read('application', 'ui', 'decision-header.js');
note(/tone === 'good' \? 'neutral'/.test(decisionHeader), 'positive states use the neutral surface tone');
note(/body\.style\.position = 'fixed'/.test(decisionHeader), 'desktop info popovers escape clipped table containers');
note(!/window\.innerWidth < 640/.test(decisionHeader), 'mobile info popovers use the same anchored placement contract');
note(/getPropertyValue\('--dock-bottom'\)/.test(decisionHeader), 'mobile info popovers clear the measured bottom dock');
note(/window\.innerHeight - dockBottom - 12/.test(decisionHeader), 'info popover placement uses the unobscured viewport height');

const premium = read('interface', 'premium.css');
note(/--chart-gradient-tail:\s*1;/.test(premium), 'light chart columns use solid fills');
note(/\[data-theme='dark'\][\s\S]{0,900}--chart-gradient-tail:\s*0\.42;/.test(premium), 'dark charts retain deliberate depth');

const treemap = read('application', 'ui', 'treemap-render.js');
note(/const LIGHT_LSTAR = \{ lo: 42, hi: 49 \}/.test(treemap), 'light treemap tiles occupy a strong perceptual band');
note(/contrastRatio\(surface, INK_DARK\) >= contrastRatio\(surface, '#ffffff'\)/.test(treemap), 'treemap text chooses the higher-contrast ink');

const treemapCss = read('interface', 'treemap.css');
note(/\[data-theme='light'\] \.tm-sheen\s*\{\s*display:\s*none;/s.test(treemapCss), 'light treemap tiles stay solid');

const plan = read('interface', 'feature-additions.css');
const glass = read('interface', 'glass.css');
note(/\.disclosure\.card-disclosure > summary\s*\{[^}]*display:\s*grid;/s.test(plan), 'collapsible card summaries override the shared inline disclosure layout');
note(/\.plan-row\s*\{[^}]*grid-template-rows:\s*minmax\(40px, auto\) 6px minmax\(24px, auto\)/s.test(plan), 'all plan columns share one row rhythm');
note(/\.plan-row-share\s*\{[^}]*min-width:\s*72px;/s.test(plan), 'all plan percentage controls share one width');
note(!/\.plan-foot-status > \.chart-info\s*\{[^}]*line-height:\s*0/s.test(plan), 'Plan popover text cannot inherit a zero line height');
note(/\.settings-rules-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s.test(plan), 'rules and custom categories use a balanced desktop layout');
note(/\.secondary \.cov-note\s*\{\s*padding:\s*0;/s.test(plan), 'coverage notes align with the first month label');
note(/\.stmt-dot\.neutral\s*\{[^}]*background:\s*var\(--dim\)/s.test(plan), 'reconciled statements use the neutral status dot');
note(/@media \(max-width: 639px\)[\s\S]*?\.settings-rule-copy\s*\{\s*flex:\s*0 1 auto;/s.test(plan), 'mobile rule panels size to their content');
note(/\.plan-drawer-triggers\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1\.35fr\) minmax\(0, 1fr\) minmax\(0, 0\.75fr\)/s.test(plan), 'mobile Plan settings allocate space in proportion to their labels');
note(/\.plan-panels\s*\{\s*order:\s*2;/s.test(plan), 'an open mobile Plan panel appears before save state and action');
note(/\.plan-drawer-summary\s*\{[^}]*gap:\s*4px;[^}]*padding-inline:\s*2px;[^}]*font-size:\s*13px;/s.test(plan), 'all three mobile Plan drawer labels stay readable in their allocated columns');
note(/\.plan-foot-status\s*\{[^}]*justify-self:\s*start;[^}]*width:\s*max-content;[^}]*max-width:\s*100%;/s.test(plan), 'the mobile Plan status and its information icon stay one compact group');
note(/@media \(max-width: 639px\)[\s\S]*?\.hscroll\s*\{\s*scrollbar-width:\s*none;[\s\S]*?\.hscroll::-webkit-scrollbar\s*\{\s*display:\s*none;/s.test(plan), 'mobile horizontal strips use the existing overflow fade instead of a permanent scrollbar');
note(/\.plan-dest-action\s*\{[^}]*display:\s*inline-flex;[^}]*justify-self:\s*start;[^}]*width:\s*max-content;[^}]*max-width:\s*100%;/s.test(plan), 'the saving checkbox, label, and info icon stay one compact group');
note(/@media \(max-width: 639px\)[\s\S]*?\.plan-dest-toggle,[\s\S]*?min-height:\s*44px;/s.test(plan) && !/\.plan-dest-check \+ span,[\s\S]*?min-height:\s*44px;/s.test(plan), 'the mobile saving label owns the touch height instead of pushing its text above the checkbox');
note(/@media \(max-width: 639px\)[\s\S]*?\.scenario-row\s*\{[^}]*grid-template-areas:[^}]*'name amount'[^}]*'choices choices'/s.test(glass), 'mobile scenario rows give their labels a full line instead of squeezing three controls beside them');
note(/\.scenario-row \.seg\s*\{[^}]*grid-area:\s*choices;[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);[^}]*width:\s*100%;/s.test(glass), 'mobile scenario choices share one full-width row');

const aheadUi = read('application', 'ui', 'ahead-render.js');
const planTab = aheadUi.slice(aheadUi.indexOf('function renderAhead()'), aheadUi.indexOf('function draftSignature()'));
note(!/renderForecastChart|What this plan does to my cash/.test(aheadUi), 'Plan no longer carries the cash projection card');
note(!/forecast-chart-render|forecast-chart-model/.test(read('service-worker.js') + read('application', 'app-controller.js') + read('application', 'analysis', 'proven-models.js')), 'nothing still loads or precaches the retired projection card');
note(!/\.fc-|\.dh-evidence|\.dh-sentence/.test(['glass.css', 'flow-chart.css', 'premium.css'].map((f) => read('interface', f)).join('\n')), 'the projection card left no stylesheet rules behind');
note(/wrap\.append\(planHero\);\s*\}\s*if \(nudgeCard\) wrap\.append\(nudgeCard\);\s*if \(planLever\) wrap\.append\(planLever\);/.test(planTab), 'the statement check sits directly under the plan answer, above the figures it qualifies');
note(/includeOnTrack: true/.test(planTab), 'Plan asks for every tracked account, so it can say when all are up to date');
note(!/Met in \$\{met\} of/.test(aheadUi), 'monthly goal history is a record, not a score');

const activityUi = read('application', 'ui', 'activity-render.js');
note(/name: 'activity-current-month-pace'/.test(activityUi), 'current-month pace uses the shared collapsed-card pattern');
note(/wrapCard: collapsibleCard/.test(activityUi), 'optional Activity insights use the shared collapsed-card pattern');
note(/reconciledEdge\(selected, balanceContext\)/.test(activityUi), 'Transactions sends balance guidance to one shared information control');

const balanceUpdates = read('application', 'ui', 'balance-updates-render.js');
const historyBasis = balanceUpdates.slice(balanceUpdates.indexOf('function historyBasisNote()'), balanceUpdates.indexOf('async function reconcileAfterImport()'));
note(/return chartInfo\(/.test(historyBasis) && !/return el\(\s*'p'/.test(historyBasis), 'balance-history methodology sits behind the shared information control');
const reconciledEdge = balanceUpdates.slice(balanceUpdates.indexOf('function reconciledEdge('), balanceUpdates.indexOf('function historyBasisNote()'));
note(/chartInfo\(\s*el,\s*'About these balances'/.test(reconciledEdge) && !/tx-reconciled-edge/.test(reconciledEdge), 'Transactions keeps balance provenance behind the shared information control');

const premiumCss = read('interface', 'premium.css');
note(/\.disclosure > summary(?:,\s*[^{,]+)*\s*\{[^}]*box-sizing:\s*border-box;[^}]*padding:\s*4px 2px 4px 0;/s.test(premiumCss), 'shared disclosure chevrons keep their full pixels inside the summary');

note(/--up-content-inset:\s*18px;[^}]*--up-spine-x:\s*5px;/s.test(dashboard), 'the payment timeline declares one shared spine position');
note(/\.up-now-dot\s*\{[^}]*top:\s*50%;[^}]*translate\(-50%, -50%\)/s.test(dashboard), 'the Now marker centres on its row rather than relying on a static offset');
note(/\.up-day-tick\s*\{[^}]*left:\s*calc\(var\(--up-spine-x\) - var\(--up-content-inset\)\)/s.test(dashboard), 'date markers and Now use the same timeline spine');

const statementNudge = nextStatementNudge(
  [
    { periodEnd: '2026-04-30', source_file: 'April card.pdf', account: '4021' },
    { periodEnd: '2026-05-31', source_file: 'May card.pdf', account: '4021' },
    { periodEnd: '2026-06-30', source_file: 'June card.pdf', account: '4021' },
    { periodEnd: '2026-07-31', source_file: 'July card.pdf', account: '4021' },
  ],
  [
    { period: '01 May 2026 - 05 May 2026', source_file: 'May bank.pdf', account: '1234' },
    { period: '01 Jun 2026 - 05 Jun 2026', source_file: 'June bank.pdf', account: '1234' },
    { period: '01 Jul 2026 - 05 Jul 2026', source_file: 'July bank.pdf', account: '1234' },
    { period: '01 Aug 2026 - 05 Aug 2026', source_file: 'August bank.pdf', account: '1234' },
  ],
  {},
  new Date('2026-09-10T12:00:00Z')
);
note(statementNudge?.cadenceDays === 31, 'statement cadence is measured within one account stream');
note(statementNudge?.sourceFile === 'July card.pdf' && statementNudge?.ledger === 'card', 'the overdue nudge identifies the exact latest statement');

const intentions = read('application', 'ui', 'intentions-section.js');
note(!intentions.includes('Set a monthly limit for a category'), 'the limit form does not repeat its visible controls');

const refinements = read('interface', 'workspace-refinements.css');
note(/\.topbar\s*\{[^}]*background:\s*var\(--bg\);[^}]*backdrop-filter:\s*none;/s.test(refinements), 'sticky chrome cannot reveal scrolled chart colours');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
