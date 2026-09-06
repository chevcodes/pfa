import { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { PfaCardDisclosure } from './components/pfa-card-disclosure.jsx';
import { PfaInfoPopover } from './components/pfa-info-popover.jsx';
import { PfaDonutChart } from './components/pfa-donut-chart.jsx';
import { PfaActivityTabs } from './components/pfa-activity-tabs.jsx';
import { PfaPeriodBar } from './components/pfa-period-bar.jsx';
import { Toaster } from './components/ui/sonner.jsx';
import { toast as sonnerToast } from 'sonner';
import { PfaTransactionTable } from './components/pfa-transaction-table.jsx';
import { PfaColumnChart } from './components/pfa-column-chart.jsx';
import { PfaPositionSummary } from './components/pfa-position-summary.jsx';
import { PfaProportionBar } from './components/pfa-proportion-bar.jsx';
import { PfaCommitmentTimeline } from './components/pfa-commitment-timeline.jsx';
import { PfaPayoffChart } from './components/pfa-payoff-chart.jsx';
import { PfaTreemapChart } from './components/pfa-treemap-chart.jsx';
import { PfaAttentionList } from './components/pfa-attention-list.jsx';
import { PfaPlanWizard } from './components/pfa-plan-wizard.jsx';
import { PfaTransactionSearch } from './components/pfa-transaction-search.jsx';
import { PfaTransactionCategoryFilter } from './components/pfa-transaction-category-filter.jsx';
import { PfaTransactionAccountFilter } from './components/pfa-transaction-account-filter.jsx';
import { PfaPositionAssetForm } from './components/pfa-position-asset-form.jsx';
import { PfaCoverageCard } from './components/pfa-coverage-card.jsx';
import { PfaOverviewFlowCard } from './components/pfa-overview-flow-card.jsx';
import { PfaLedgerReview } from './components/pfa-ledger-review.jsx';
import { PfaCustomLabels } from './components/pfa-custom-labels.jsx';
import { PfaOverviewCoverageNote } from './components/pfa-overview-coverage-note.jsx';
import { PfaCommitmentRows } from './components/pfa-commitment-rows.jsx';
import { PfaActivityIncome } from './components/pfa-activity-income.jsx';
import { PfaMetricLead } from './components/pfa-metric-lead.jsx';
import { PfaInsightList } from './components/pfa-insight-list.jsx';
import { PfaCardFitness } from './components/pfa-card-fitness.jsx';
import { PfaEmptyState } from './components/pfa-empty-state.jsx';
import { PfaRankedPaymentList } from './components/pfa-ranked-payment-list.jsx';
import { PfaNetWorthLine } from './components/pfa-net-worth-line.jsx';
import { PfaSavingsDestinations } from './components/pfa-savings-destinations.jsx';
import { PfaPlanAssignments } from './components/pfa-plan-assignments.jsx';
import { PfaDecisionSurface } from './components/pfa-decision-surface.jsx';
import { PfaBalanceUpdateForm } from './components/pfa-balance-update-form.jsx';
import { PfaPositionCashAccounts } from './components/pfa-position-cash-accounts.jsx';
import { PfaPlanGroupEditor } from './components/pfa-plan-group-editor.jsx';
import { PfaCategoryPicker } from './components/pfa-category-picker.jsx';
import { PfaTransactionSplitEditor } from './components/pfa-transaction-split-editor.jsx';
import { PfaTransactionTagPicker } from './components/pfa-transaction-tag-picker.jsx';
import { PfaInvestmentHolding } from './components/pfa-investment-holding.jsx';
import { PfaInvestmentHoldings } from './components/pfa-investment-holdings.jsx';
import { PfaTreemapCard } from './components/pfa-treemap-card.jsx';
import { PfaAccountRename } from './components/pfa-account-rename.jsx';
import { PfaInvestmentAccountControl } from './components/pfa-investment-account-control.jsx';
import { PfaPositionMix } from './components/pfa-position-mix.jsx';
import { PfaForeignSpending } from './components/pfa-foreign-spending.jsx';
import { PfaScenarioCard } from './components/pfa-scenario-card.jsx';
import { PfaMonthlyCheckIn } from './components/pfa-monthly-check-in.jsx';
import { PfaGoalProgress } from './components/pfa-goal-progress.jsx';
import { PfaUpcomingPayments } from './components/pfa-upcoming-payments.jsx';
import { PfaStatementNudges, PfaStatementNudgeCard } from './components/pfa-statement-nudges.jsx';
import { PfaPlanLever } from './components/pfa-plan-lever.jsx';
import { PfaPlanWhy } from './components/pfa-plan-why.jsx';
import { PfaHiddenChart } from './components/pfa-hidden-chart.jsx';
import { PfaInvestmentCard } from './components/pfa-investment-card.jsx';
import { PfaInlineDisclosure } from './components/pfa-inline-disclosure.jsx';
import { PfaAccountStatementTrust } from './components/pfa-account-statement-trust.jsx';
import { PfaCardStatementTrust } from './components/pfa-card-statement-trust.jsx';
import { PfaCommitmentCard } from './components/pfa-commitment-card.jsx';
import { PfaInvestmentHistory, PfaInvestmentMovement } from './components/pfa-investment-sections.jsx';
import { PfaImportProgress } from './components/pfa-import-progress.jsx';
import { PfaManageDataDialog } from './components/pfa-manage-data-dialog.jsx';
import { PfaAppBanner, PfaGreeting } from './components/pfa-app-messages.jsx';
import { PfaSpendingLimits } from './components/pfa-spending-limits.jsx';
import { PfaSpendingTrendCard } from './components/pfa-spending-trend-card.jsx';
import { PfaWhereItWentCard } from './components/pfa-where-it-went-card.jsx';
import { PfaPositionNetWorth } from './components/pfa-position-net-worth.jsx';
import { PfaFoldAll } from './components/pfa-fold-all.jsx';
import { PfaSettingsCard } from './components/pfa-settings-card.jsx';
import { PfaOverviewView } from './components/pfa-overview-view.jsx';
import { PfaActivityView } from './components/pfa-activity-view.jsx';
import { PfaPositionView } from './components/pfa-position-view.jsx';
import { PfaPlanView } from './components/pfa-plan-view.jsx';
import { PfaConfirmLine } from './components/pfa-confirm-line.jsx';
import { VanillaBody } from './vanilla-body.jsx';
import './styles/tailwind.css';
import './styles/pfa-card-disclosure.css';
import './styles/pfa-info-popover.css';
import './styles/pfa-donut-chart.css';
import './styles/pfa-column-chart.css';
import './styles/pfa-transaction-table.css';
import './styles/pfa-proportion-bar.css';
import './styles/pfa-commitment-timeline.css';
import './styles/pfa-payoff-chart.css';
import './styles/pfa-treemap-chart.css';

// The production entry point. Built as a single fixed-name ES module
// (see vite.config.js's build.lib) so a vanilla render file can
// `import('../react/pfa-react.js')` it directly, the same way
// index.html already dynamically imports application/sample-data/
// mock-personas.js - no bundler is involved on the calling side.
//
// One persistent React root per container (react.dev's multi-root
// createRoot() pattern), keyed by the container element itself. A vanilla
// render() call that runs again calls mountCollapsibleCard again on the
// same container; this reuses the existing root and lets React reconcile,
// rather than destroying and recreating it - which is what actually
// preserves open/closed state across a rebuild. The old CARD_OPEN_STATE
// map in application/ui/decision-header.js existed only to work around
// vanilla's rebuild-from-scratch model; a component that isn't destroyed
// doesn't need it re-implemented here.
const roots = new WeakMap();

const cardBodyComponents = { insights: PfaInsightList, rankedPayments: PfaRankedPaymentList, activityIncome: PfaActivityIncome, customLabels: PfaCustomLabels, spendingLimits: PfaSpendingLimits, foreignSpending: PfaForeignSpending, cardFitness: PfaCardFitness, balanceUpdate: PfaBalanceUpdateForm, positionCash: PfaPositionCashAccounts, positionNetWorth: PfaPositionNetWorth, investmentCard: PfaInvestmentCard, upcomingPayments: PfaUpcomingPayments, monthlyCheckIn: PfaMonthlyCheckIn, scenarioCard: PfaScenarioCard, goalProgress: PfaGoalProgress, planLever: PfaPlanLever };

export function mountFoldAll(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaFoldAll {...props} />);
}

export function mountSettingsCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaSettingsCard {...props} />);
}

export function mountOverviewView(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaOverviewView {...props} />);
}

export function mountActivityView(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaActivityView {...props} />);
}

export function mountPositionView(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPositionView {...props} />);
}

export function mountPlanView(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPlanView {...props} />);
}

export function mountCollapsibleCard(container, { title, summary, icon, iconMarkup, explain, hasExplain, alwaysOpen, defaultOpen, compact, foldAll, name, bodyNode, reactBody, onOpenChange }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  const BodyComponent = reactBody ? cardBodyComponents[reactBody.kind] : null;
  if (reactBody && !BodyComponent) throw new Error(`Unknown card body: ${reactBody.kind}`);
  const directBody = BodyComponent ? <div className={reactBody.rootClass || undefined}><BodyComponent {...reactBody.props} /></div> : null;
  root.render(
    <PfaCardDisclosure
      title={title}
      summary={summary}
      icon={explain ? <PfaInfoPopover content={explain} /> : iconMarkup ? <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : icon ? <VanillaBody node={icon} /> : null}
      hasExplain={hasExplain}
      alwaysOpen={alwaysOpen}
      defaultOpen={defaultOpen}
      compact={compact}
      foldAll={foldAll}
      name={name}
      onOpenChange={onOpenChange}
      bare
    >
      {BodyComponent ? reactBody.wrapClass !== undefined ? <div className={reactBody.wrapClass || undefined}>{directBody}</div> : directBody : <VanillaBody node={bodyNode} />}
    </PfaCardDisclosure>
  );
}

export function mountInvestmentCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInvestmentCard {...props} />);
}

export function mountInlineDisclosure(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInlineDisclosure {...props} />);
}

export function mountAccountStatementTrust(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaAccountStatementTrust {...props} />);
}

export function mountCardStatementTrust(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCardStatementTrust {...props} />);
}

export function mountCommitmentCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCommitmentCard {...props} />);
}

export function mountInvestmentHistory(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInvestmentHistory {...props} />);
}

export function mountInvestmentHoldings(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInvestmentHoldings {...props} />);
}

export function mountInvestmentMovement(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInvestmentMovement {...props} />);
}

export function unmountCollapsibleCard(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

export function mountInfoPopover(container, { label, content, tone }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  // content is one or more items - each is either a raw vanilla DOM node
  // (chartInfo(el, label, content, tone) built with el(), grafted the same
  // way bodyNode is above) or a plain string (React renders those
  // natively; VanillaBody's appendChild would throw on a non-Node).
  const nodes = Array.isArray(content) ? content : [content];
  root.render(
    <PfaInfoPopover
      label={label}
      tone={tone}
      content={nodes.map((n, i) =>
        n instanceof Node ? <VanillaBody key={i} node={n} /> : <Fragment key={i}>{n}</Fragment>
      )}
    />
  );
}

export function unmountInfoPopover(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

export function mountDonutChart(container, { label, segments, total, centre, money }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaDonutChart label={label} segments={segments} total={total} centre={centre} money={money} />);
}

export function mountActivityTabs(container, { value, onValueChange }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaActivityTabs value={value} onValueChange={onValueChange} />);
}

export function mountPeriodBar(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPeriodBar {...props} />);
}

export function mountToastHost(container, { theme }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<Toaster theme={theme} />);
}

export function showPfaToast(message, actionFn, actionLabel = 'Undo') {
  const duration = actionFn ? 10000 : 8000;
  if (!actionFn) return sonnerToast(String(message), { duration });
  let id;
  id = sonnerToast(String(message), {
    duration,
    action: {
      label: actionLabel,
      onClick: () => {
        sonnerToast.dismiss(id);
        actionFn();
      },
    },
  });
  return id;
}

export function mountConfirmLine(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaConfirmLine {...props} />);
}

export function mountTransactionTable(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTransactionTable {...props} />);
}

export function mountColumnChart(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaColumnChart {...props} />);
}

export function mountPositionSummary(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(
    <PfaCardDisclosure
      title="Shareable financial summary"
      summary="Ready to copy"
      icon={<PfaInfoPopover label="" content={props.explain} />}
      hasExplain
      name="position-summary-card"
      bare
    >
      <PfaPositionSummary {...props} />
    </PfaCardDisclosure>
  );
}

export function mountProportionBar(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaProportionBar {...props} />);
}

export function mountCommitmentTimeline(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCommitmentTimeline {...props} />);
}

export function mountPayoffChart(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPayoffChart {...props} />);
}

export function mountTreemapChart(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTreemapChart {...props} />);
}

export function mountTreemapCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTreemapCard {...props} />);
}

export function mountAttentionList(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaAttentionList {...props} />);
}

export function mountPlanWizard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPlanWizard {...props} />);
}

export function mountTransactionSearch(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTransactionSearch {...props} />);
}

export function mountTransactionCategoryFilter(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTransactionCategoryFilter {...props} />);
}

export function mountTransactionAccountFilter(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTransactionAccountFilter {...props} />);
}

export function mountPositionAssetForm(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPositionAssetForm {...props} />);
}

export function mountCoverageCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCoverageCard {...props} />);
}

export function mountOverviewFlowCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaOverviewFlowCard {...props} />);
}

export function mountOverviewCoverageNote(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaOverviewCoverageNote {...props} />);
}

export function mountLedgerReview(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(
    <PfaCardDisclosure
      title="Review & adjustments"
      summary={props.summary}
      icon={props.iconMarkup ? <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: props.iconMarkup }} /> : <VanillaBody node={props.iconNode} />}
      alwaysOpen={props.alwaysOpen}
      name="activity-review"
      bare
    >
      <PfaLedgerReview {...props} />
    </PfaCardDisclosure>
  );
}

export function mountCustomLabels(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCustomLabels {...props} />);
}

export function mountCommitmentRows(container, rows) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCommitmentRows rows={rows} />);
}

export function mountActivityIncome(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaActivityIncome {...props} />);
}

export function mountSpendingTrendCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaSpendingTrendCard {...props} />);
}

export function mountWhereItWentCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaWhereItWentCard {...props} />);
}

export function mountMetricLead(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaMetricLead {...props} />);
}

export function mountEmptyState(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaEmptyState {...props} />);
}

export function mountRankedPaymentList(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaRankedPaymentList {...props} />);
}

export function mountNetWorthLine(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaNetWorthLine {...props} />);
}

export function mountSavingsDestinations(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaSavingsDestinations {...props} />);
}

export function mountPlanAssignments(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPlanAssignments {...props} />);
}

export function mountDecisionSurface(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaDecisionSurface {...props} />);
}

export function mountInsightList(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInsightList {...props} />);
}

export function mountCardFitness(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCardFitness {...props} />);
}

export function mountBalanceUpdateForm(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaBalanceUpdateForm {...props} />);
}

export function mountPositionCashAccounts(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPositionCashAccounts {...props} />);
}

export function mountPlanGroupEditor(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPlanGroupEditor {...props} />);
}

export function mountCategoryPicker(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaCategoryPicker {...props} />);
}

export function mountTransactionSplitEditor(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTransactionSplitEditor {...props} />);
}

export function mountTransactionTagPicker(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaTransactionTagPicker {...props} />);
}

export function mountInvestmentHolding(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInvestmentHolding {...props} />);
}

export function mountAccountRename(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaAccountRename {...props} />);
}

export function mountInvestmentAccountControl(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaInvestmentAccountControl {...props} />);
}

export function mountPositionMix(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPositionMix {...props} />);
}

export function mountForeignSpending(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaForeignSpending {...props} />);
}

export function mountScenarioCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaScenarioCard {...props} />);
}

export function mountMonthlyCheckIn(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaMonthlyCheckIn {...props} />);
}

export function mountGoalProgress(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaGoalProgress {...props} />);
}

export function mountUpcomingPayments(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaUpcomingPayments {...props} />);
}

export function mountStatementNudges(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaStatementNudges {...props} />);
}

export function mountStatementNudgeCard(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaStatementNudgeCard {...props} />);
}

export function mountImportProgress(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaImportProgress {...props} />);
}

export function unmountImportProgress(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

export function mountManageDataDialog(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaManageDataDialog {...props} />);
}

export function mountPlanLever(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPlanLever {...props} />);
}

export function mountPlanWhy(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPlanWhy {...props} />);
}

export function mountHiddenChart(container) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaHiddenChart />);
}

export function mountAppBanner(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaAppBanner {...props} />);
}

export function mountGreeting(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaGreeting {...props} />);
}

export function mountPositionNetWorth(container, props) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaPositionNetWorth {...props} />);
}

export function unmountGreeting(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

export function unmountDonutChart(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}
