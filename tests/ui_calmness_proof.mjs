import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextStatementNudge, resolvePeriod, usablePeriodOptions } from '../application/analysis/reporting-periods.js';

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
/* The status is now on the drawer's CLOSED head, in the right-hand slot every
 * other card uses, so it answers before it is opened - and the body does not
 * repeat it, so the two can never disagree. */
note(
  /text: unknown \+ unreconciled \? attentionSummary\(unknown, unreconciled\) : 'Nothing to review'/.test(controller),
  'settings derives one status from state'
);
note(
  /el\('span', \{ class: 'card-disclosure-note muted small' \}, attentionState\(\)\.text\)/.test(controller),
  'and says it on the closed head, where every other card says its own summary'
);
note(
  !/settings-status/.test(settings) && !/settings-status/.test(read('interface', 'feature-additions.css')),
  'nothing inside the drawer states it a second time'
);
note(
  /icon\(iconSliders\(\)\), ' Data & settings'/.test(controller) && !/icon\(iconInfo\(\)\), ' Data & settings'/.test(controller),
  'and the drawer of controls is marked as controls, not as a note about itself'
);
for (const label of ['Statements & coverage', 'Rules and categories', 'Profile & privacy', 'Start over']) {
  note(new RegExp(`foldSection\\(\\s*'${label.replace('&', '\\&')}'`).test(settings), `${label} is a collapsed group`);
}
note(!/foldSection\([\s\S]*?\{\s*open:\s*true/.test(settings), 'settings groups do not open themselves');
{
  const css = read('interface', 'feature-additions.css');
  const rules = css.match(/\.card\.secondary\.pfa-react-root \.pfa-card-disclosure-trigger[^{]*\{[^}]*\}/g) || [];
  note(
    !rules.some((rule) => /grid-template-columns/.test(rule)),
    'the Data & settings head keeps the card disclosure grid: icon and title left, note and arrow right'
  );
}
note(/exportBtn\.disabled = false/.test(controller), 'restore stays available with an empty ledger');
note(/label\.textContent = hasAnything \? 'Export' : 'Restore'/.test(controller), 'the top action names its empty-state purpose');
note(/'No statements loaded'/.test(controller), 'the period bar names the empty state');

/* ONE PLACE PER IDEA. Carrying category rules to another device lived in the
   Export menu in the header, under "Category setup", while the rules
   themselves live in Data & settings - so a person reading their own rules had
   to remember a menu elsewhere on the screen to do anything with them. The
   file sits beside the list it contains, and the Export menu is left with one
   job: get my data out. */
{
  const html = read('index.html');
  note(
    !/exp-rules-export|exp-rules-input|Category setup/.test(html),
    'the export menu carries no category-setup items'
  );
  note(
    /id: 'settings-rules-input'/.test(controller) &&
      /onclick: exportRules/.test(controller) &&
      /loadInput\.addEventListener\('change', importRules\)/.test(controller),
    'the rules file is saved and loaded beside the rules themselves'
  );
  note(
    /if \(rules\.length\)\s*\n?\s*fileRow\.append/.test(controller),
    'and Save only appears once there is something to save'
  );
}
note(/f\.hidden = !hasLedgerData\(\)/.test(controller), 'the empty screen does not repeat its privacy promise in the footer');
note(/!n\.id && !n\.name[\s\S]{0,80}ui-field-/.test(controller), 'generated form controls receive a browser-identifiable field id');

const foundation = read('interface', 'foundation.css');
const controls = read('interface', 'controls.css');
const mobileHeaderCss = read('interface', 'premium.css');
const mockPersonas = read('application', 'sample-data', 'mock-personas.js');
note(/:where\(\.btn, \.icon-btn\):disabled\s*\{[^}]*cursor:\s*not-allowed;[^}]*opacity:\s*0\.46;/s.test(foundation), 'disabled controls visibly step back and stop advertising a click');
note(/\.empty\s*\{[^}]*padding:\s*42px 24px;[^}]*gap:\s*10px;/s.test(controls), 'empty cards use a compact first-run rhythm');
note(/\.top-actions\s*\{[^}]*flex:\s*0 0 auto;[^}]*width:\s*auto;/s.test(mobileHeaderCss) && /\.top-actions #add-btn,\s*\.top-actions #export-btn\s*\{[^}]*width:\s*auto;[^}]*padding-inline:\s*var\(--s2\);/s.test(mobileHeaderCss) && /\.top-actions #add-btn \.btn-label,\s*\.top-actions #export-btn \.btn-label\s*\{[^}]*display:\s*inline;[^}]*overflow:\s*hidden;[^}]*font-size:\s*12px;[^}]*text-overflow:\s*ellipsis;/s.test(mobileHeaderCss), 'the narrow header sizes Restore to its visible label');
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
note(/explain:\s*`\$\{combined\.items\.length\} regular commitment/.test(cards), 'commitment qualification sits beside the card heading');
note(/buildDisclosure\(el, 'When payments usually leave'/.test(cards), 'payment timing stays available behind the shared disclosure');
note(!/fact-value metric-value metric--major/.test(cards.slice(cards.indexOf('function renderRecurring'), cards.indexOf('/* ---- spent abroad'))), 'fixed expenses does not repeat its closed-state total as a second headline');
const reportingCore = read('application', 'analysis', 'reporting-core.js');
note(/allBtn\.hidden = remaining <= step/.test(reportingCore), 'a single remaining row offers one clear reveal control');
const accountsRenderer = read('application', 'ui', 'accounts-render.js');
note(/class: 'disclosure sec-fold stmt-summary-section'/.test(accountsRenderer), 'Account statements uses the shared settings drawer');
note(/title: 'Account statements'/.test(accountsRenderer) && /note: `\$\{totalOk\} of \$\{totalN\} reconcile`/.test(accountsRenderer) && /explain: RECONCILE_MEANS/.test(accountsRenderer) && /sec-fold-meta' \}, drawerPreview/.test(accountsRenderer) && !/Statement coverage/.test(accountsRenderer), 'the Account statements row matches the other ledger rows, with its coverage held in its own drawer');
const coverageStrip = read('application', 'ui', 'coverage-strip.js');
note(/for \(const \[index, m\] of timeline\.months\.entries\(\)\)/.test(coverageStrip) && /is-first.*is-last/.test(coverageStrip), 'coverage strips mark their edge months for safe hover labels');
const additions = read('interface', 'feature-additions.css');
note(/\.cov-cell\s*\{[^}]*--cov-cell-bg:[^}]*background:\s*var\(--cov-cell-bg\)/s.test(additions) && /\.cov-cell:hover\s*\{[^}]*background:\s*var\(--cov-cell-bg\)/s.test(additions) && /\.cov-cell\.is-last:hover::after\s*\{[^}]*right:\s*0/s.test(additions), 'coverage hover retains the rendered month state and keeps its final tooltip onscreen');
note(/\.card\.secondary:has\(\.sec-manage-wrap\) \.stmt-summary-section > summary::before\s*\{[^}]*display:\s*none[^}]*width:\s*0/s.test(additions), 'the Account statements drawer does not inherit an extra settings gutter');

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
note(
  !/\.settings-rule-panel|\.settings-rules-grid|\.settings-rule-copy/.test(plan),
  'rules and custom categories are ordinary sub-sections, not bordered panels in a grid of their own'
);
note(/\.stmt-dot\.neutral\s*\{[^}]*background:\s*var\(--dim\)/s.test(plan), 'reconciled statements use the neutral status dot');
const controlsCss = read('interface', 'controls.css');
note(
  !/\.sec-subhead-actions\s*\{[^}]*margin-left:\s*auto;/s.test(controlsCss),
  'a sub-section’s controls do not hold the right edge on a line they wrapped to - they start it, under the heading'
);
/* One rule sizes every data-entry field, on the ELEMENT. Eleven class rules
 * used to name a number between 13px and 16px, which is how "New category
 * name" came to render a third larger than "Search transactions". */
note(
  /input:not\(\[type='checkbox'\]\)[^{]*,\s*textarea,\s*select \{\s*font-size: var\(--t-field\);/s.test(controlsCss),
  'every field, textarea and select takes its size from the one token'
);
{
  const fieldSel = /\binput\b|field|search|filter|\.pass\b|textarea|select|\.mini\b|f-num/i;
  // A label, a note, a chip and an x-button are not fields; the period
  // selector is chrome, sized with the tab bar, and says so.
  const allowed = /txfilter-chip|txfilter-x|pass-note|f-check|field-label|period-bar \.period-select/;
  const offenders = [];
  for (const file of ['foundation.css', 'dashboard.css', 'controls.css', 'responsive.css', 'feature-additions.css', 'workspace-refinements.css', 'premium.css']) {
    const css = read('interface', file);
    for (const m of css.matchAll(/([^\n{}]+)\{([^}]*)\}/g)) {
      const sel = m[1].trim().replace(/\s+/g, ' ');
      if (!/font-size/.test(m[2]) || !fieldSel.test(sel) || allowed.test(sel)) continue;
      if (/var\(--t-field\)/.test(m[2])) continue;
      offenders.push(`${file}: ${sel}`);
    }
  }
  note(offenders.length === 0, `no field restates its own size in px (${offenders.join('; ') || 'none'})`);
}
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
const planView = read('react-ui', 'components', 'pfa-plan-view.jsx');
const planGroupEditor = read('react-ui', 'components', 'pfa-plan-group-editor.jsx');
const planRenderer = read('application', 'ui', 'plan-render.js');
const planLever = read('react-ui', 'components', 'pfa-plan-lever.jsx');
note(
  /footerAction=\{lever\?\.kind === 'lever' \? \{ id: 'plan-header-budget-actual', label: 'Review budget and categories', onClick: hero\.onBudgetActual \} : lever\?\.categoryBudgetProps \? \{ id: 'plan-header-category-budget', label: 'See category spending', onClick: hero\.onCategoryBudget \} : null\}/.test(planView) &&
    /footerAction \? <button[^>]*id=\{footerAction\.id\}[^>]*onClick=\{footerAction\.onClick\}>\{footerAction\.label\}<\/button>/.test(read('react-ui', 'components', 'pfa-decision-surface.jsx')),
  'Plan offers one route to the combined budget and categories when that card is present'
);
note(
  !/plan-comparison-key/.test(planGroupEditor) &&
    /PfaInfoPopover label="How this works" content=\{headerInfo\}/.test(planLever) &&
    /Each comparison bar shows a typical monthly amount, the marker shows your plan, and stripes show the amount over plan\./.test(planRenderer),
  'the budget chart legend is available through the card information control, not repeated below the rows'
);
note(/setEditing\(true\); \}\}>Edit plan<\/button> : <button className="btn sm ghost" type="button" onClick=\{cancelEditing\}>Cancel<\/button>/.test(planLever) && /const cancelEditing = async \(\) => \{ await onCancel\?\.\(\); setEditing\(false\); \};/.test(planLever) && /onCancel: revertToSaved/.test(planRenderer) && /Plan percentages restored\./.test(planRenderer), 'Cancel discards unsaved target edits and exits the Plan editor');
const planTab = aheadUi.slice(aheadUi.indexOf('function renderAhead()'), aheadUi.indexOf('function draftSignature()'));
note(!/renderForecastChart|What this plan does to my cash/.test(aheadUi), 'Plan no longer carries the cash projection card');
note(!/forecast-chart-render|forecast-chart-model/.test(read('service-worker.js') + read('application', 'app-controller.js') + read('application', 'analysis', 'proven-models.js')), 'nothing still loads or precaches the retired projection card');
note(!/\.fc-|\.dh-evidence|\.dh-sentence/.test(['glass.css', 'flow-chart.css', 'premium.css'].map((f) => read('interface', f)).join('\n')), 'the projection card left no stylesheet rules behind');
note(/wrap\.append\(planHero\);\s*\}\s*if \(nudgeCard\) wrap\.append\(nudgeCard\);\s*if \(planLever\) wrap\.append\(planLever\);/.test(planTab), 'the statement check sits directly under the plan answer, above the figures it qualifies');
note(/includeOnTrack: true/.test(planTab), 'Plan asks for every tracked account, so it can say when all are up to date');
note(!/Met in \$\{met\} of/.test(aheadUi), 'monthly goal history is a record, not a score');
const upcomingPayments = read('react-ui', 'components', 'pfa-upcoming-payments.jsx');
note(/PfaInfoPopover label="" ariaLabel="Cash flow forecast details" content=\{timelineInfo\}/.test(upcomingPayments) && !/This forecast window differs|Bar length shows relative amount; dates show timing\./.test(upcomingPayments), 'expected-payment chart instructions sit behind an information icon in the forecast detail');
note(/const timelineText = `\$\{forecastOutflows\.length\} projected outflow[\s\S]*?const timelineInfo = `This forecast covers the next \$\{horizon\} days[\s\S]*?payments list above[\s\S]*?Bar length compares relative amount; dates show timing\.`/.test(aheadUi), 'the forecast summary stays concise while its window and chart key are available on request');

const activityUi = read('application', 'ui', 'activity-render.js');
/* ONE CARD PER IDEA. "Partway through the month" and "Spending limits you set"
   asked one question - how is a category tracking against what you meant to
   spend - from two cards, and the first one's only action scrolled the page to
   the second and opened it with the category pre-picked. The observation now
   sits inside the card that acts on it, and fills the form where it stands. */
{
  const intentionsUi = read('application', 'ui', 'intentions-section.js');
  note(
    !/activity-current-month-pace/.test(activityUi) && !/function renderPace\(/.test(activityUi),
    'the separate mid-month pace card is gone'
  );
  note(
    /midMonthPace\(\)/.test(intentionsUi) && /'Set a limit'/.test(intentionsUi),
    'and its observation lives in the card that can act on it'
  );
  note(
    /form\.fill\(run\.category\)/.test(intentionsUi) && !/smoothScrollToEl\('#activity-ceilings'\)/.test(activityUi),
    'which fills the form in place rather than scrolling the page to another card'
  );
  note(
    /const limited = new Set\(models\.map/.test(intentionsUi),
    'and a category that already has a limit is not also listed as unlimited'
  );
}
note(/wrapCard: collapsibleCard/.test(activityUi) && /alwaysOpen: true,\s*foldAll: false/.test(activityUi), 'What is new or unusual uses the shared card pattern while remaining visibly open');
const appController = read('application', 'app-controller.js');
const customCategories = appController.slice(appController.indexOf('function customCategoriesSection()'), appController.indexOf('async function addCustomCategory('));
note(/const categoryForm = el\('div', \{ class: 'manage-actions settings-category-form' \}, nameInput, bandField, addBtn\);/.test(customCategories) && /title: 'Custom categories',[\s\S]*actions: categoryForm,/.test(customCategories), 'custom-category controls join the heading line whenever the available width allows');
note(/reconciledEdge\(selected, balanceContext\)/.test(activityUi), 'Transactions sends balance guidance to one shared information control');

const balanceUpdates = read('application', 'ui', 'balance-updates-render.js');
const historyBasis = balanceUpdates.slice(balanceUpdates.indexOf('function historyBasisNote()'), balanceUpdates.indexOf('async function reconcileAfterImport()'));
note(/return chartInfo\(/.test(historyBasis) && !/return el\(\s*'p'/.test(historyBasis), 'balance-history methodology sits behind the shared information control');
const reconciledEdge = balanceUpdates.slice(balanceUpdates.indexOf('function reconciledEdge('), balanceUpdates.indexOf('function historyBasisNote()'));
/* The provenance is still behind the ONE information control - it is now what
   the account filter's own ⓘ opens, rather than a second line of its own
   carrying a second ⓘ directly beneath that card's decorative one. So this
   hands back content and the card builds the control. */
note(
  /return parts\.map\(/.test(reconciledEdge) && !/chartInfo\(/.test(reconciledEdge) && !/tx-hint/.test(reconciledEdge),
  'Transactions hands balance provenance to the card that explains it, not to a line of its own'
);
note(
  /renderAccountSelector\(balanceUpdates\.reconciledEdge\(selected, balanceContext\)\)/.test(activityUi),
  'and that card is the account filter the guidance is about'
);
const activityView = read('react-ui', 'components', 'pfa-activity-view.jsx');
const premiumCss = read('interface', 'premium.css');
note(
  !/panel\.notice/.test(activityView) && !/notice = `Showing/.test(activityUi),
  'the selected-ledger instruction is not repeated inline when the filter already names its scope'
);
const balanceUpdateForm = read('react-ui', 'components', 'pfa-balance-update-form.jsx');
note(
  !/balance-update-note/.test(balanceUpdateForm) && /Enter today's balances from your bank or card app/.test(balanceUpdates),
  'balance-entry instructions sit behind the existing Update balances info control'
);
note(
  !/\.balance-update-note/.test(premiumCss),
  'the shared prose contract has no orphaned balance-entry instruction selector'
);
const scenarioCard = read('react-ui', 'components', 'pfa-scenario-card.jsx');
note(
  /PfaInfoPopover ariaLabel="How the runway estimate works" content=\{explain\}/.test(scenarioCard) && !/Try reducing estimated monthly discretionary spending/.test(scenarioCard),
  'scenario assumptions are available on request without a repeated instruction line'
);
const categoryBudget = read('react-ui', 'components', 'pfa-category-budget.jsx');
note(
  /PfaInfoPopover label="" ariaLabel="Category spending details" content=\{comparisonInfo\}/.test(categoryBudget) &&
    /Missing records are unknown; a recorded zero is different/.test(categoryBudget) &&
    !/<p className="muted small">Recorded bank and card spending for one calendar month/.test(categoryBudget) &&
    !/Missing records differ from recorded zero\. Every bar shares one scale/.test(categoryBudget) &&
    !/category-budget-key/.test(categoryBudget),
  'category comparison and history guidance is available on request beside its heading'
);
note(
  /ariaLabel=\{`\$\{group\.title\}: details`\} content=\{groupInfo\}/.test(categoryBudget) &&
    !/Net money moved into savings destinations\. A negative figure is a drawdown\.<\/p>/.test(categoryBudget),
  'category assignment and savings movement notes are available beside the relevant group'
);
note(
  /const head = explain \? chartInfo\(el, '', explain\) : iconNode \|\| null;/.test(
    read('application', 'ui', 'decision-header.js')
  ),
  'a card with something to explain puts the shared ⓘ in the slot it kept for a glyph'
);
note(
  !/icon: icon\(iconInfo\(\)\)/.test(activityUi) &&
    !/icon: icon\(iconInfo\(\)\)/.test(balanceUpdates),
  'and no card wears an info glyph that opens nothing'
);

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

/* A CONTROL ONLY APPEARS WHEN THERE IS SOMETHING TO DECIDE.
 *
 * The reporting-period list is fixed; the imported data is not. With one
 * statement loaded, six of its eight choices resolve to the same single month
 * and a seventh resolves to nothing at all - eight ways to ask one question, on
 * the first control a new person meets. */
{
  const OPTIONS = [
    ['latest-complete', 'Latest complete month'],
    ['current-month', 'Current month'],
    ['previous-month', 'Previous month'],
    ['last-3', 'Last 3 months'],
    ['last-6', 'Last 6 months'],
    ['this-year', 'This year'],
    ['all', 'All time'],
    ['custom', 'Custom range'],
  ];
  const rowsFor = (months) =>
    months.map((m, i) => ({ id: `t${i}`, date: `${m}-15`, month: m, amount: 100, kind: 'spend' }));
  const now = new Date('2026-09-20T12:00:00Z');
  const currentMonths = ['2026-08', '2026-09'];
  const previousCalendarMonth = resolvePeriod(
    { type: 'previous-month' },
    rowsFor(currentMonths),
    currentMonths,
    now
  );
  note(
    previousCalendarMonth?.from === '2026-08' && previousCalendarMonth?.to === '2026-08',
    'previous month selects the month immediately before the current month, even when current-month data is incomplete'
  );

  const one = usablePeriodOptions(OPTIONS, 'latest-complete', rowsFor(['2026-08']), ['2026-08'], now);
  const oneTypes = one.map(([t]) => t);
  note(oneTypes.includes('custom'), 'a custom range is always offered - it is not a preset window');
  note(!oneTypes.includes('previous-month'), 'with one month, a window with nothing in it is not offered');
  note(
    one.length < OPTIONS.length && oneTypes.includes('latest-complete'),
    `with one month the list collapses to what it can actually select (${oneTypes.join(', ')})`
  );
  const seen = new Set();
  note(
    one
      .filter(([t]) => t !== 'custom')
      .every(([t]) => {
        const key = t;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    'and no window is offered twice under two names'
  );

  const many = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  const midMonth = new Date('2026-08-20T12:00:00Z');
  const full = usablePeriodOptions(OPTIONS, 'latest-complete', rowsFor(many), many, midMonth).map(([t]) => t);
  note(
    full.includes('latest-complete') && !full.includes('previous-month'),
    'the previous calendar month is omitted when it duplicates the latest complete month'
  );
  // "Current month" is the newest month PRESENT, so once that month is complete
  // it is the same window as "Latest complete month" - the same figures under
  // two names, which is the duplicate this drops rather than an artefact of it.
  const settled = usablePeriodOptions(OPTIONS, 'latest-complete', rowsFor(many), many, now).map(([t]) => t);
  note(
    !settled.includes('current-month') && settled.includes('latest-complete'),
    'and once the newest month is complete the two names for it collapse to one'
  );

  const held = usablePeriodOptions(OPTIONS, 'previous-month', rowsFor(['2026-08']), ['2026-08'], now);
  note(
    held.some(([t]) => t === 'previous-month'),
    'the type currently selected is never dropped out from under the control'
  );
}

/* A PROMPT CARRIES THE DOOR IT ASKS FOR, AND REACHES THE MOMENT IT IS FOR.
 *
 * The first-run hint asks for another statement. It offered only "Got it",
 * which made it the one banner naming an action without the button for it -
 * while the backup banner beside it has carried its own action all along.
 *
 * Worse, it could not be seen. It was suppressed on the first import (the only
 * import it is true for) and gated on fewer than two ledger MONTHS - but one
 * monthly statement straddles a month boundary, so that gate was already shut
 * by a single import. Both halves are fixed; both are held here. */
{
  const messages = read('application', 'ui', 'app-messages.js');
  const intake = read('application', 'ui', 'app-intake.js');
  note(
    /'Add statements'/.test(messages) && /pickStatements\(\);/.test(messages),
    'the first-run hint offers the same add-statement door the rest of the app opens'
  );
  note(
    !/'Got it'/.test(messages) && (messages.match(/'Not now'/g) || []).length === 3,
    'and all three bottom banners dismiss with the same word, not two of three'
  );
  note(
    /message: 'Only on this device\. Back up\?'/.test(messages) && /label: 'Back up now'/.test(messages),
    'the backup banner names the device-only risk and offers its backup action'
  );
  note(
    /maybeOfferFirstRunHint\(\);\s*\n\s*if \(!welcomed\) \{/.test(intake),
    'it runs on the first import rather than being suppressed by the welcome'
  );
  note(
    /const statementTotal =[\s\S]{0,140}if \(statementTotal !== 1\) return;/.test(messages),
    'and prompts only after one successful statement, never after a failed import'
  );
}

/* THE WAY IN SITS ON THE ROW THE FIGURE IS ON.
 *
 * "Where your cash sits" offered "Fix" only on a balance the person had typed.
 * A balance read off a statement - the one that actually goes stale, and the
 * one they would most want to correct - carried nothing, so the only way in was
 * a different card they had to go and find. It now offers the same door once
 * the figure is older than the app's own freshness rule, and stays silent while
 * it is fresh. The note about currency conversion states the rate instead of
 * pointing at another card for it. */
{
  const position = read('application', 'ui', 'position-render.js');
  note(
    /const stale = account\.enteredAsOf \? null : staleSince\(account\)/.test(position) &&
      /account\.enteredAsOf \? 'Fix' : 'Update'/.test(position),
    'a stale statement balance offers the same updater a typed one does'
  );
  note(
    /age != null && age > NUDGE_AFTER_DAYS/.test(position),
    'gated by the shared freshness rule, not a second idea of stale'
  );
  note(
    /balanceUpdates\.openUpdater\(balanceKey\('bank'/.test(position) &&
      /balanceUpdates\.openUpdater\(cardBalance\.key\)/.test(position),
    'through the one balance updater already used by accounts'
  );
  note(
    !/shown under Assets included/.test(position) && /function conversionNote\(\)/.test(position),
    'and the conversion note carries the rate rather than a pointer to another card'
  );
}

/* AN ACTION NAMES WHAT IT WILL PRODUCE, BEFORE IT PRODUCES IT.
 *
 * The printed report covers the selected reporting period, but that control
 * only exists on Activity - from Position, Plan or Overview the period bar says
 * something else entirely. Pressing Print there produced a report for a window
 * set earlier on another tab, with nothing on screen to say which one. */
{
  const html = read('index.html');
  note(/id="exp-print-label"/.test(html), 'the print menu item has a label the app can keep current');
  note(
    /Print \/ Save as PDF \\u00b7 \$\{window_\.label\}/.test(controller) ||
      /Print \/ Save as PDF \u00b7 \$\{window_\.label\}/.test(controller),
    'and it names the period the report will cover'
  );
  note(
    /const printLabel = \$\('#exp-print-label'\)/.test(
      controller.slice(controller.indexOf('function updateHeaderAvailability()'))
    ),
    'kept current by the same pass that keeps the rest of the header honest'
  );
}

const intentions = read('application', 'ui', 'intentions-section.js');
note(!intentions.includes('Set a monthly limit for a category'), 'the limit form does not repeat its visible controls');
const treemapCard = read('react-ui', 'components', 'pfa-treemap-card.jsx');
const treemapChart = read('react-ui', 'components', 'pfa-treemap-chart.jsx');
const treemapChartCss = read('react-ui', 'styles', 'pfa-treemap-chart.css');
const whereItWent = read('react-ui', 'components', 'pfa-where-it-went-card.jsx');
const spendingLimits = read('react-ui', 'components', 'pfa-spending-limits.jsx');
note(/function TreemapInfo\(\{ source, iconSlot = false \}\)[\s\S]*?PfaInfoPopover/.test(treemapCard), 'category-map guidance is available behind one information icon');
note(/Tile area shows relative spending/.test(treemapCard) && /five largest categories; Other groups the rest/.test(treemapCard) && /const statementBasis = source === 'all'[\s\S]*?Eligible purchases combine bank and card statements[\s\S]*?Eligible purchases come from \$\{source\} statements/.test(treemapCard), 'the category-map explanation follows the selected spending source and grouped tiles');
note(/Category-attributed refunds reduce totals/.test(treemapCard) && /Fees and tax are separate/.test(treemapCard), 'refunds, fees, and tax retain distinct meanings in the category explanation');
note(!/Select a tile or browse categories|Select a category to see its transactions|share of card spending/.test(treemapCard), 'category-map instructions no longer stay on screen or assume a card-only source');
note(/showTooltip=\{false\} showValues=\{false\}/.test(treemapCard) && /activeCategory === category\.name/.test(treemapCard) && /activeCategory === item\.name/.test(treemapChart) && /\.tm-category-row\[data-active='true'\]/.test(treemapChartCss), 'the category map uses the ranked list for exact figures and links hover or focus across both views');
note(/rankedCategories\.length > 5/.test(treemapCard) && /View all \$\{rankedCategories\.length\} categories/.test(treemapCard) && /aria-expanded=\{showAllCategories\}/.test(treemapCard) && /id=\{`tm-category-list-\$\{source\}`\}/.test(treemapCard) && treemapCard.indexOf('<div className="tm-map">') > -1 && treemapCard.indexOf('<div className="tm-map">') < treemapCard.indexOf('<div className="tm-ranked"') && !/PfaInlineDisclosure className="tm-mobile-map"/.test(treemapCard) && /tile\.displayName/.test(read('application', 'ui', 'treemap-render.js')) && /wrapTreemapLabel\(displayName/.test(treemapChart) && /grid-template-areas: 'map' 'ranked'/.test(treemapCss) && /\.tm-map \.tm-wrap\s*\{\s*display: block;\s*aspect-ratio: 1\.4;\s*max-height: 240px;/.test(treemapCss) && /\.tm-ranked\[data-expanded='false'\] \.tm-category-row:nth-child\(n \+ 6\)\s*\{\s*display: none;/.test(treemapCss), 'the category map leads with a compact mobile treemap and keeps the complete ranked list available as supporting detail');
note(/const shortName = displayName\.split/.test(treemapChart) && /wrapTreemapLabel\(shortName/.test(treemapChart), 'narrow treemap tiles use a readable short label while retaining each full name for assistive text and the ranked list');
note(!/PfaInfoPopover|What counts here/.test(whereItWent), 'the category map does not repeat its information control at the foot of the card');
const cardFitness = read('react-ui', 'components', 'pfa-card-fitness.jsx');
note(/panel\.fitness \? <section className="card card-collapsible card-fitness pfa-react-root" id="activity-card-health" data-fold-all="true" aria-label="How your card is doing">/.test(activityView) && /<PfaCardShell bare name="activity-card-health" title="How your card is doing" summary=\{compactSummary\}/.test(cardFitness) && /className="card-fitness-overview"/.test(cardFitness) && /<PfaInlineDisclosure className="card-fitness-detail"/.test(cardFitness), 'card health opens from its compact summary to an overview and then to payoff details');
const cardFitnessCss = read('interface', 'feature-additions.css');
note(!/\.card-fitness-detail\.disclosure\s*\{[^}]*\b(?:width|margin-inline)\s*:/.test(cardFitnessCss) && /\.card-fitness-balance,\s*\.card-fitness-reading\s*\{[^}]*padding: var\(--s4\);/.test(cardFitnessCss) && /\.card-fitness-detail \.pfa-inline-disclosure-trigger\s*\{[^}]*padding: var\(--s3\) var\(--s4\);/.test(cardFitnessCss) && /@media \(max-width: 639px\)[\s\S]*?\.card-fitness-detail \.pfa-inline-disclosure-trigger\s*\{[^}]*padding-inline: var\(--s4\);/.test(cardFitnessCss), 'the payoff disclosure border and trigger text align with the card content on desktop and mobile');
note(/\.accounts-wrap\.accounts-grid\.activity-analysis > \.card-fitness\s*\{\s*order: 7;\s*grid-column: 1 \/ -1;\s*\}/.test(read('interface', 'feature-additions.css')), 'the card health summary and revealed details keep one full-width row in every data state');
const activityRenderer = read('application', 'ui', 'activity-render.js');
note(/summary: ranked\[0\]\?\.amount > 0 \? `Largest: \$\{ranked\[0\]\.name\}, \$\{prose\(ranked\[0\]\.amount\)\}` : 'Attributed refunds this period'/.test(activityRenderer) && /summary=\{view\.summary\}/.test(whereItWent), 'the Where it went headline follows the selected All, Bank, or Card data');
note(/compactMoney: prose/.test(activityRenderer) && /compactMoney\(view\.fees\)/.test(whereItWent) && /compactMoney\(-view\.returned\)/.test(whereItWent) && /Fees & tax:/.test(whereItWent) && /Uncategorised returns:/.test(whereItWent) && /headline figures stay exact, supporting money uses the shared compact money formatter/.test(read('Agents-Design-Principles.md')) && /periodLabel: period\.from === period\.to \? formatMonthYear\(period\.from\) : `\$\{formatMonthYear\(period\.from\)\}–\$\{formatMonthYear\(period\.to\)\}`/.test(activityRenderer) && /const periodContext = source === 'all' \? 'Eligible purchases' : `Eligible \$\{source\} purchases`/.test(whereItWent), 'Where it went keeps its headline exact, shortens support money and period context, and formats dates with the shared short month label');
note(/function contributionDrillLabel\(\)[\s\S]*?Category group[\s\S]*?All sources/.test(activityRenderer) && /contributionLabel: name/.test(activityRenderer) && /opts\.contributionLabel/.test(controller), 'a grouped map tile carries its visible name and source into the transaction evidence filter');
note(/add\(contributionDrillLabel\(\), \(\) => \{\s*_txContributionDrill = null;[\s\S]*?render\(\);\s*\}\);/.test(activityRenderer) && /narrowingParts\.push\(contributionDrillSummary\(\)\)/.test(activityRenderer) && /!!_txContributionDrill/.test(activityRenderer), 'the exact category scope is visible, removable, named in the result summary, and treated as a narrowed ledger');
note(/setTxCategories\(\[\]\);\s*_txContributionDrill = null;/.test(activityRenderer) && /categoriesOn: _txCategories\.size > 0 \|\| !!_txContributionDrill/.test(activityRenderer), 'Clear all and transaction search both expose a way out of the category evidence scope');
note(/\{monthLabel\} · \{coverageText\}[\s\S]*?Spending coverage details[\s\S]*?statement activity recorded in PFA/.test(spendingLimits), 'spending limits keep the month and coverage visible and put the imported-activity explanation behind ⓘ');
note(/Spending faster than usual this month, with no limit set\.[\s\S]*?Spending pace estimate details[\s\S]*?Day \$\{hot\[0\]\.dayOfMonth\} of \$\{hot\[0\]\.daysInMonth\}/.test(spendingLimits), 'spending pace keeps its finding visible and moves the estimate caveat behind ⓘ');
const assignments = read('react-ui', 'components', 'pfa-plan-assignments.jsx');
note(/const unresolved = new Set\(questions\)/.test(assignments) && /categories: group\.categories\.filter\(\(name\) => !unresolved\.has\(name\)\)/.test(assignments), 'categories awaiting placement stay out of the assigned groups');
note(/assignedGroups\.reduce\(\(sum, group\) => sum \+ group\.categories\.length, 0\)/.test(assignments), 'the sorted count excludes categories still awaiting placement');

const refinements = read('interface', 'workspace-refinements.css');
note(/\.topbar\s*\{[^}]*background:\s*var\(--bg\);[^}]*backdrop-filter:\s*none;/s.test(refinements), 'sticky chrome cannot reveal scrolled chart colours');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
