/*
 * react-bridge.js - the ONE seam between vanilla render files and the new
 * React rendering layer (react-ui/, built to application/ui/react-dist/).
 * Every call site migrating a collapsibleCard to PfaCardDisclosure goes
 * through this same function, so there is exactly one place that knows how
 * to load the React bundle and graft vanilla-built DOM into it - never a
 * second, drifting copy per call site (README's "reuse, don't duplicate").
 *
 * Mirrors application/ui/decision-header.js's collapsibleCard(el, {...})
 * signature and return contract (a DOM node, returned synchronously) so a
 * call site can switch between the two by changing only the function name.
 * The container returns immediately, empty; the React module (already
 * fetched by the browser's module cache after the first call, so
 * this resolves same-tick on every render after the first) fills it in
 * once loaded.
 */
import { chartIsHidden } from './chart-helpers.js';
import { makeMoneyShort } from '../core/money-format.js';
import { hiddenChartLabel, markProportional } from '../core/privacy.js';
import { rememberedOpen, rememberOpen } from './collapsible-card-state.js';

let modulePromise = null;
function loadReactModule() {
  if (!modulePromise) modulePromise = import('./react-dist/pfa-react.js');
  return modulePromise;
}

export function hiddenChartReact(el, what, opts = {}) {
  const container = el('div', {
    class: `chart-hidden pfa-react-root${opts.class ? ` ${opts.class}` : ''}`,
    role: 'img',
    'aria-label': hiddenChartLabel(what || 'Chart'),
    ...(opts.height ? { style: `min-height:${opts.height}` } : {}),
  });
  loadReactModule().then(({ mountHiddenChart }) => mountHiddenChart(container));
  return container;
}

export function foldAllReact(container, props) {
  loadReactModule().then(({ mountFoldAll }) => mountFoldAll(container, props));
}

export function settingsCardStateProps() {
  return { defaultOpen: rememberedOpen('data-settings', false), onOpenChange: (open) => rememberOpen('data-settings', open) };
}

export function settingsCardReact(el, { summary, iconMarkup, sections, defaultOpen, onOpenChange }) {
  const container = el('div', { class: 'card card-collapsible secondary pfa-react-root', id: 'data-settings', 'data-fold-all': 'false' });
  loadReactModule().then(({ mountSettingsCard }) => mountSettingsCard(container, { summary, iconMarkup, sections, defaultOpen, onOpenChange }));
  return container;
}

export function overviewViewReact(el, props) {
  const container = el('div', { class: 'accounts-wrap accounts-grid view-overview pfa-react-root' });
  loadReactModule().then(({ mountOverviewView }) => mountOverviewView(container, props));
  return container;
}

export function activityViewReact(el, props) {
  const container = el('div', { class: 'accounts-wrap activity-view pfa-react-root' });
  loadReactModule().then(({ mountActivityView }) => mountActivityView(container, props));
  return container;
}

export function positionViewReact(el, props) {
  const container = el('div', { class: 'accounts-wrap accounts-grid view-position pfa-react-root' });
  loadReactModule().then(({ mountPositionView }) => mountPositionView(container, { ...props, host: container }));
  return container;
}

export function planViewReact(el, props) {
  const container = el('div', { class: 'accounts-wrap accounts-grid view-forecast pfa-react-root' });
  loadReactModule().then(({ mountPlanView }) => mountPlanView(container, { ...props, host: container }));
  return container;
}

export function collapsibleCardReact(el, { title, summary, icon: iconNode, iconMarkup, explain, body, reactBody, name, alwaysOpen = false, defaultOpen = false, compact = false, foldAll = !compact }) {
  const kids = (Array.isArray(body) ? body : [body]).filter(Boolean);
  if (!kids.length && !reactBody) return null;
  if (summary == null || (typeof summary === 'string' && !summary.trim()))
    throw new Error(`collapsibleCardReact "${String(title || '')}" requires a closed-state summary`);
  for (const kid of kids) {
    if (kid && kid.classList && kid.classList.contains('card')) kid.classList.remove('card');
  }
  const bodyNode = reactBody ? null : kids.length === 1 ? kids[0] : el('div', {}, ...kids);
  const directExplain = typeof window !== 'undefined' && typeof explain === 'string' ? explain : null;
  const head = explain && !directExplain ? chartInfoReact(el, '', explain) : iconNode || null;
  const key = name || (typeof title === 'string' ? title : '');
  const initialOpen = alwaysOpen || rememberedOpen(key, defaultOpen);

  // This element IS the returned "card" - matching collapsibleCard's own
  // contract exactly, including letting a call site mutate it afterward
  // (card.classList.add(...), card.id = ...), the same way several already
  // do with collapsibleCard's real <details> return value. mountCollapsibleCard
  // passes { bare: true } to PfaCardDisclosure so it doesn't render a
  // second, nested .card.card-collapsible section inside this one.
  const container = el('div', {
    class: 'card card-collapsible pfa-react-root' + (compact ? ' card-compact' : ''),
    'data-fold-all': foldAll && !alwaysOpen ? 'true' : 'false',
    'data-open': initialOpen ? 'true' : 'false',
    ...(name ? { id: name, tabindex: '-1' } : {}),
  });
  const mountProps = { title, summary, icon: head, iconMarkup, explain: directExplain, hasExplain: !!explain, alwaysOpen, defaultOpen: initialOpen, compact, foldAll, name, bodyNode, reactBody, onOpenChange: (open) => rememberOpen(key, open) };
  loadReactModule().then(({ mountCollapsibleCard }) => mountCollapsibleCard(container, mountProps));
  if (reactBody) container.updateReactBody = (nextProps) => loadReactModule().then(({ mountCollapsibleCard }) => mountCollapsibleCard(container, { ...mountProps, reactBody: { ...reactBody, props: nextProps } }));
  return container;
}

/*
 * Mirrors application/ui/decision-header.js's chartInfo(el, label, content,
 * tone) signature and return contract (a DOM node, returned synchronously)
 * exactly, so a call site switches by changing only the function name.
 */
export function chartInfoReact(el, label, content, tone) {
  const container = el('span', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInfoPopover }) => {
    mountInfoPopover(container, { label, content, tone });
  });
  return container;
}

/*
 * Mirrors application/ui/chart-surface.js's renderDonutChart(ctx, spec)
 * signature and return contract exactly. The privacy-mode hidden state and
 * empty-data guard are evaluated here, synchronously, in vanilla - same
 * behaviour as the original, which also checks chartIsHidden() and the
 * segment/total guard before building anything.
 */
export function donutChartReact(ctx, spec) {
  const { el } = ctx;
  if (chartIsHidden()) return hiddenChartReact(el, spec.label, { height: '190px' });
  const money = spec.money || ctx.money0 || makeMoneyShort();
  const segments = (spec.segments || []).filter((s) => Number(s.amount) > 0);
  const total = Number(spec.total) || segments.reduce((sum, s) => sum + Number(s.amount), 0);
  if (!segments.length || total <= 0) return null;

  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountDonutChart }) => {
    mountDonutChart(container, { label: spec.label, segments, total, centre: spec.centre, money });
  });
  return container;
}

export function activityTabsReact(value, onValueChange) {
  const container = document.createElement('div');
  container.className = 'pfa-react-root';
  loadReactModule().then(({ mountActivityTabs }) => {
    mountActivityTabs(container, { value, onValueChange });
  });
  return container;
}

export function periodBarReact(container, props) {
  loadReactModule().then(({ mountPeriodBar }) => {
    mountPeriodBar(container, props);
  });
}

export function toastReact(message, actionFn, actionLabel = 'Undo') {
  const container = document.getElementById('toast-root');
  if (!container) return;
  loadReactModule().then(({ mountToastHost, showPfaToast }) => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    mountToastHost(container, { theme });
    requestAnimationFrame(() => showPfaToast(message, actionFn, actionLabel));
  });
}

export function confirmLineReact(props) {
  const container = document.createElement('div');
  container.className = 'confirm-line pfa-react-root';
  loadReactModule().then(({ mountConfirmLine }) => {
    mountConfirmLine(container, props);
  });
  return container;
}

export function transactionTableReact(props) {
  const container = document.createElement('div');
  container.className = 'pfa-react-root';
  loadReactModule().then(({ mountTransactionTable }) => {
    mountTransactionTable(container, props);
  });
  return container;
}

export function columnChartReact(ctx, spec) {
  const { el } = ctx;
  if (chartIsHidden()) return hiddenChartReact(el, spec.label, { height: '220px' });
  const container = markProportional(el('div', { class: `chart-surface pfa-react-root ${spec.className || ''}`, role: 'group', 'aria-label': spec.label }));
  const scroll = el('div', { class: 'chart-scroll' });
  container.append(scroll);
  loadReactModule().then(({ mountColumnChart }) => {
    mountColumnChart(scroll, { ctx, spec });
  });
  return container;
}

export function positionSummaryReact(props) {
  const container = document.createElement('section');
  container.className = 'card card-collapsible pfa-react-root';
  container.id = 'position-summary-card';
  container.tabIndex = -1;
  loadReactModule().then(({ mountPositionSummary }) => {
    mountPositionSummary(container, props);
  });
  return container;
}

export function proportionBarReact(ctx, spec, model) {
  const { el } = ctx;
  if (chartIsHidden()) return hiddenChartReact(el, spec.label, { height: '120px' });
  const { bands, total } = model;
  if (!bands.length || total <= 0) return null;
  const money = spec.money || ctx.money0 || makeMoneyShort();
  const container = markProportional(el('div', { class: 'proportion pfa-react-root', role: 'group', 'aria-label': spec.label }));
  loadReactModule().then(({ mountProportionBar }) => {
    mountProportionBar(container, { spec, money, model });
  });
  return container;
}

export function commitmentTimelineReact(ctx, slots, payDay, { money, prose, ordinal, paydayLabel }) {
  const { el } = ctx;
  if (chartIsHidden()) return hiddenChartReact(el, 'When fixed expenses land', { height: '150px' });
  const container = markProportional(el('div', { class: 'commit-when pfa-react-root', role: 'group', 'aria-label': 'When fixed expenses land' }));
  loadReactModule().then(({ mountCommitmentTimeline }) => {
    mountCommitmentTimeline(container, { slots, payDay, money, prose, ordinal, paydayLabel });
  });
  return container;
}

export function payoffChartReact(props) {
  if (chartIsHidden()) return hiddenChartReact(props.el, 'Card payoff', { height: '220px' });
  const container = document.createElement('div');
  container.className = 'pfa-react-root';
  loadReactModule().then(({ mountPayoffChart }) => {
    mountPayoffChart(container, props);
  });
  return container;
}

export function treemapChartReact(props) {
  const container = document.createElement('div');
  container.className = 'pfa-react-root';
  loadReactModule().then(({ mountTreemapChart }) => {
    mountTreemapChart(container, props);
  });
  return container;
}

export function treemapCardReact(props) {
  const container = document.createElement('div');
  container.className = 'pfa-react-root';
  loadReactModule().then(({ mountTreemapCard }) => {
    mountTreemapCard(container, props);
  });
  return container;
}

export function attentionListReact(props) {
  const container = document.createElement('section');
  container.className = 'card attention pfa-react-root';
  loadReactModule().then(({ mountAttentionList }) => {
    mountAttentionList(container, props);
  });
  return container;
}

export function insightListReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInsightList }) => {
    mountInsightList(container, props);
  });
  return container;
}

export function cardFitnessReact(el, props) {
  const container = el('section', {
    class: 'card card-collapsible card-fitness pfa-react-root',
    id: 'activity-card-health',
    'aria-label': 'How your card is doing',
    'data-fold-all': 'true',
  });
  loadReactModule().then(({ mountCardFitness }) => {
    mountCardFitness(container, props);
  });
  return container;
}

export function planWizardReact(el, props) {
  const container = el('section', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPlanWizard }) => {
    mountPlanWizard(container, props);
  });
  return container;
}

export function importProgressReact(container, props) {
  loadReactModule().then(({ mountImportProgress }) => {
    if (container.isConnected) mountImportProgress(container, props);
  });
}

export function unmountImportProgressReact(container) {
  loadReactModule().then(({ unmountImportProgress }) => {
    unmountImportProgress(container);
  });
}

export function manageDataDialogReact(container, props) {
  loadReactModule().then(({ mountManageDataDialog }) => {
    if (container.isConnected) mountManageDataDialog(container, props);
  });
}

export function transactionSearchReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountTransactionSearch }) => {
    mountTransactionSearch(container, props);
  });
  return container;
}

export function transactionCategoryFilterReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountTransactionCategoryFilter }) => {
    mountTransactionCategoryFilter(container, props);
  });
  return container;
}

export function transactionAccountFilterReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountTransactionAccountFilter }) => {
    mountTransactionAccountFilter(container, props);
  });
  return container;
}

export function positionAssetFormReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPositionAssetForm }) => {
    mountPositionAssetForm(container, props);
  });
  return container;
}

export function coverageCardReact(el, props) {
  const container = el('section', {
    class: (props.nested ? 'cov-card is-nested' : 'card cov-card') + ' pfa-react-root',
    id: props.id,
    tabindex: '-1',
  });
  loadReactModule().then(({ mountCoverageCard }) => {
    mountCoverageCard(container, props);
  });
  return container;
}

export function overviewFlowCardReact(el, chart) {
  const container = el('section', { class: 'card card-collapsible overview-flow pfa-react-root' });
  loadReactModule().then(({ mountOverviewFlowCard }) => {
    mountOverviewFlowCard(container, { chart });
  });
  return container;
}

export function overviewCoverageNoteReact(el, props) {
  const container = el('p', { class: 'coverage-note muted small pfa-react-root' });
  loadReactModule().then(({ mountOverviewCoverageNote }) => {
    mountOverviewCoverageNote(container, props);
  });
  return container;
}

export function ledgerReviewReact(el, props) {
  const container = el('div', { class: 'card card-collapsible pfa-react-root acct-review' });
  loadReactModule().then(({ mountLedgerReview }) => {
    mountLedgerReview(container, props);
  });
  return container;
}

export function customLabelsReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountCustomLabels }) => {
    mountCustomLabels(container, props);
  });
  return container;
}

export function commitmentRowsReact(el, rows) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountCommitmentRows }) => {
    mountCommitmentRows(container, rows);
  });
  return container;
}

export function activityIncomeReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountActivityIncome }) => {
    mountActivityIncome(container, props);
  });
  return container;
}

export function spendingTrendCardReact(el, props) {
  const name = 'activity-spending-over-time';
  const initialOpen = rememberedOpen(name, false);
  const container = el('div', {
    class: 'card card-collapsible pfa-react-root',
    id: name,
    tabindex: '-1',
    'data-fold-all': 'true',
    'data-open': initialOpen ? 'true' : 'false',
  });
  loadReactModule().then(({ mountSpendingTrendCard }) => {
    mountSpendingTrendCard(container, { ...props, defaultOpen: initialOpen, onOpenChange: (open) => rememberOpen(name, open) });
  });
  return container;
}

export function whereItWentCardReact(el, props) {
  const name = 'activity-where-it-went';
  const initialOpen = rememberedOpen(name, false);
  const container = el('div', {
    class: 'card card-collapsible pfa-react-root',
    id: name,
    tabindex: '-1',
    'data-fold-all': 'true',
    'data-open': initialOpen ? 'true' : 'false',
  });
  loadReactModule().then(({ mountWhereItWentCard }) => {
    mountWhereItWentCard(container, { ...props, defaultOpen: initialOpen, onOpenChange: (open) => rememberOpen(name, open) });
  });
  return container;
}

export function metricLeadReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountMetricLead }) => {
    mountMetricLead(container, props);
  });
  return container;
}

export function emptyStateReact(el, props) {
  const container = el('section', { class: 'card empty pfa-react-root' });
  loadReactModule().then(({ mountEmptyState }) => {
    mountEmptyState(container, props);
  });
  return container;
}

export function rankedPaymentListReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountRankedPaymentList }) => {
    mountRankedPaymentList(container, props);
  });
  return container;
}

export function netWorthLineReact(el, props) {
  const container = el('div', { class: 'recurring-row pfa-react-root' + (props.stale ? ' lapsed' : '') });
  loadReactModule().then(({ mountNetWorthLine }) => {
    mountNetWorthLine(container, props);
  });
  return container;
}

export function savingsDestinationsReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountSavingsDestinations }) => {
    mountSavingsDestinations(container, props);
  });
  return container;
}

export function planAssignmentsReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPlanAssignments }) => {
    mountPlanAssignments(container, props);
  });
  return container;
}

export function decisionSurfaceReact(el, props) {
  const container = el('section', {
    class: 'card decision pfa-react-root' + (props.className ? ' ' + props.className : '') + (props.demoted ? ' decision--supporting' : ''),
    id: props.id,
    ...(props.demoted ? {} : { 'data-surface': 'lead' }),
  });
  if (!container.nodeType) return container;
  loadReactModule().then(({ mountDecisionSurface }) => {
    mountDecisionSurface(container, props);
  });
  return container;
}

export function balanceUpdateFormReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountBalanceUpdateForm }) => {
    mountBalanceUpdateForm(container, props);
  });
  return container;
}

export function positionCashAccountsReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPositionCashAccounts }) => {
    mountPositionCashAccounts(container, props);
  });
  return container;
}

export function planGroupEditorReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPlanGroupEditor }) => {
    mountPlanGroupEditor(container, props);
  });
  return container;
}

export function categoryPickerReact(container, props) {
  loadReactModule().then(({ mountCategoryPicker }) => {
    mountCategoryPicker(container, props);
  });
  return container;
}

export function transactionSplitEditorReact(container, props) {
  loadReactModule().then(({ mountTransactionSplitEditor }) => {
    mountTransactionSplitEditor(container, props);
  });
  return container;
}

export function transactionTagPickerReact(container, props) {
  loadReactModule().then(({ mountTransactionTagPicker }) => {
    mountTransactionTagPicker(container, props);
  });
  return container;
}

export function investmentHoldingReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInvestmentHolding }) => {
    mountInvestmentHolding(container, props);
  });
  return container;
}

export function accountRenameReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountAccountRename }) => {
    mountAccountRename(container, props);
  });
  return container;
}

export function investmentAccountControlReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInvestmentAccountControl }) => {
    mountInvestmentAccountControl(container, props);
  });
  return container;
}

export function investmentCardReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInvestmentCard }) => {
    mountInvestmentCard(container, props);
  });
  return container;
}

export function inlineDisclosureReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInlineDisclosure }) => {
    mountInlineDisclosure(container, props);
  });
  return container;
}

export function accountStatementTrustReact(el, props) {
  const { class: className, ...componentProps } = props;
  const container = el('div', { class: `${className} pfa-react-root` });
  loadReactModule().then(({ mountAccountStatementTrust }) => {
    mountAccountStatementTrust(container, componentProps);
  });
  return container;
}

export function cardStatementTrustReact(el, props) {
  const container = el('div', { class: 'sec-section pfa-react-root' });
  loadReactModule().then(({ mountCardStatementTrust }) => {
    mountCardStatementTrust(container, props);
  });
  return container;
}

export function commitmentCardReact(el, props) {
  const name = 'activity-commitments';
  const initialOpen = rememberedOpen(name, false);
  const container = el('section', {
    class: 'card card-collapsible pfa-react-root',
    id: name,
    tabindex: '-1',
    'data-fold-all': 'true',
    'data-open': initialOpen ? 'true' : 'false',
  });
  loadReactModule().then(({ mountCommitmentCard }) => {
    mountCommitmentCard(container, { ...props, defaultOpen: initialOpen, onOpenChange: (open) => rememberOpen(name, open) });
  });
  return container;
}

export function investmentHistoryReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInvestmentHistory }) => {
    mountInvestmentHistory(container, props);
  });
  return container;
}

export function investmentHoldingsReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInvestmentHoldings }) => {
    mountInvestmentHoldings(container, props);
  });
  return container;
}

export function investmentMovementReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountInvestmentMovement }) => {
    mountInvestmentMovement(container, props);
  });
  return container;
}

export function positionMixReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPositionMix }) => {
    mountPositionMix(container, props);
  });
  return container;
}

export function foreignSpendingReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountForeignSpending }) => {
    mountForeignSpending(container, props);
  });
  return container;
}

export function scenarioCardReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountScenarioCard }) => {
    mountScenarioCard(container, props);
  });
  return container;
}

export function monthlyCheckInReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountMonthlyCheckIn }) => {
    mountMonthlyCheckIn(container, props);
  });
  return container;
}

export function goalProgressReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountGoalProgress }) => {
    mountGoalProgress(container, props);
  });
  return container;
}

export function upcomingPaymentsReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountUpcomingPayments }) => {
    mountUpcomingPayments(container, props);
  });
  return container;
}

export function statementNudgesReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountStatementNudges }) => {
    mountStatementNudges(container, props);
  });
  return container;
}

export function statementNudgeCardReact(el, props) {
  const name = 'plan-statement-nudge';
  const initialOpen = rememberedOpen(name, false);
  const container = el('div', {
    class: 'card card-collapsible pfa-react-root',
    id: name,
    tabindex: '-1',
    'data-fold-all': 'true',
    'data-open': initialOpen ? 'true' : 'false',
  });
  loadReactModule().then(({ mountStatementNudgeCard }) => {
    mountStatementNudgeCard(container, { ...props, defaultOpen: initialOpen, onOpenChange: (open) => rememberOpen(name, open) });
  });
  return container;
}

export function planLeverReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  container.updateReact = (nextProps) => loadReactModule().then(({ mountPlanLever }) => mountPlanLever(container, nextProps));
  container.updateReact(props);
  return container;
}

export function planWhyReact(el, props) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPlanWhy }) => mountPlanWhy(container, props));
  return container;
}

export function updatePlanLeverReact(container, props) {
  if (container?.updateReactBody) container.updateReactBody(props);
  else container?.updateReact?.(props);
}

export function appBannerReact(container, props) {
  loadReactModule().then(({ mountAppBanner }) => {
    mountAppBanner(container, props);
  });
}

export function greetingReact(container, props) {
  loadReactModule().then(({ mountGreeting }) => {
    mountGreeting(container, props);
  });
}

export function positionNetWorthReact(el, props) {
  const container = el('div', { class: 'pfa-react-root' });
  loadReactModule().then(({ mountPositionNetWorth }) => {
    mountPositionNetWorth(container, props);
  });
  return container;
}

export function unmountGreetingReact(container) {
  loadReactModule().then(({ unmountGreeting }) => {
    unmountGreeting(container);
  });
}
