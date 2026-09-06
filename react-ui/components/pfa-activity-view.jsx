import * as React from 'react';
import { PfaActivityTabs } from './pfa-activity-tabs.jsx';
import { PfaSettingsCardHost } from './pfa-settings-card.jsx';
import { PfaTransactionAccountFilter } from './pfa-transaction-account-filter.jsx';
import { PfaTransactionCategoryFilter } from './pfa-transaction-category-filter.jsx';
import { PfaTransactionSearch } from './pfa-transaction-search.jsx';
import { PfaTransactionFilterBar, PfaTransactionPagerControls, PfaTransactionSortControls, PfaTransactionTable, TRANSACTION_PAGE_SIZE } from './pfa-transaction-table.jsx';
import { PfaEmptyState } from './pfa-empty-state.jsx';
import { rememberedOpen, rememberOpen } from '../../application/ui/collapsible-card-state.js';
import { PfaCardShell } from './pfa-card-shell.jsx';
import { PfaDecisionSurface } from './pfa-decision-surface.jsx';
import { PfaInsightList } from './pfa-insight-list.jsx';
import { PfaLedgerReview } from './pfa-ledger-review.jsx';
import { PfaWhereItWentCard } from './pfa-where-it-went-card.jsx';
import { PfaRankedPaymentList } from './pfa-ranked-payment-list.jsx';
import { PfaCommitmentCard } from './pfa-commitment-card.jsx';
import { PfaActivityIncome } from './pfa-activity-income.jsx';
import { PfaSpendingTrendCard } from './pfa-spending-trend-card.jsx';
import { PfaForeignSpending } from './pfa-foreign-spending.jsx';
import { PfaCardFitness } from './pfa-card-fitness.jsx';
import { PfaSpendingLimits } from './pfa-spending-limits.jsx';
import { PfaCustomLabels } from './pfa-custom-labels.jsx';
import { PfaFoldAllRow } from './pfa-fold-all.jsx';

function PfaTransactionTableLive({ props, page, onPageChange }) {
  return <PfaTransactionTable {...props} filterBar={null} page={page} onPageChange={onPageChange} />;
}

const emptyTransactionStore = { subscribe: () => () => {}, getSnapshot: () => null };

function PfaTransactionFilters({ selector, categoryProps }) {
  const [selected, setSelected] = React.useState(categoryProps?.selectedCategories || []);
  React.useEffect(() => {
    const update = (event) => setSelected(event.detail?.selected || []);
    document.addEventListener('pfa-ledger-categories-change', update);
    return () => document.removeEventListener('pfa-ledger-categories-change', update);
  }, []);
  const summary = [selector?.summary, categoryProps?.summaryFor(selected)].filter(Boolean).join(' · ');
  return <PfaCardShell name="transaction-filters" title="Filters" summary={summary} compact><div className="stack stack-4">
    {selector ? <PfaTransactionAccountFilter {...selector} inline /> : null}
    {categoryProps ? <PfaTransactionCategoryFilter {...categoryProps} inline /> : null}
  </div></PfaCardShell>;
}

function PfaActivitySpecialCard({ as: Shell = 'div', name, className = '', component: Component, props }) {
  const defaultOpen = rememberedOpen(name, false);
  return <Shell className={'card card-collapsible pfa-react-root' + (className ? ' ' + className : '')} id={name} tabIndex={-1} data-fold-all="true" data-open={defaultOpen ? 'true' : 'false'}><Component {...props} defaultOpen={defaultOpen} onOpenChange={(open) => rememberOpen(name, open)} /></Shell>;
}

export function PfaActivityView({ tabs, panel, settings }) {
  const [panelHost, setPanelHost] = React.useState(null);
  const transactionStore = panel.kind === 'transactions' ? panel.ledgerStore : emptyTransactionStore;
  const transactionProps = React.useSyncExternalStore(transactionStore.subscribe, transactionStore.getSnapshot, transactionStore.getSnapshot);
  const [pageState, setPageState] = React.useState({ rows: null, page: 0 });
  const rows = transactionProps?.rows || [];
  const focusIndex = transactionProps?.focusKey ? rows.findIndex((row) => row.key === transactionProps.focusKey) : -1;
  const pageCount = Math.max(1, Math.ceil(rows.length / TRANSACTION_PAGE_SIZE));
  const page = focusIndex >= 0 ? Math.floor(focusIndex / TRANSACTION_PAGE_SIZE) : pageState.rows === rows ? pageState.page : 0;
  const onPageChange = (nextPage) => setPageState({ rows, page: nextPage });
  React.useLayoutEffect(() => {
    if (focusIndex >= 0 && pageState.rows !== rows) setPageState({ rows, page: Math.floor(focusIndex / TRANSACTION_PAGE_SIZE) });
  }, [focusIndex, rows, pageState.rows]);
  return <>{panel.kind === 'transactions' ? <><div className="tx-controls-sticky"><PfaActivityTabs {...tabs} /><PfaTransactionFilterBar filterBar={transactionProps?.filterBar} /></div><div className="tx-control-scroll">
    <div className="pfa-react-root"><PfaTransactionSearch {...panel.searchProps} /></div>
    {panel.selector || panel.categoryProps ? <PfaTransactionFilters selector={panel.selector} categoryProps={panel.categoryProps} /> : null}
  </div><PfaTransactionSortControls columns={transactionProps?.columns || { showLedger: false, amountLabel: 'Amount', sort: { key: 'date', dir: 'desc' } }} onSort={transactionProps?.onSort || (() => {})} /><PfaTransactionPagerControls rows={rows} page={page} expanded={!!transactionProps?.expanded} onPageChange={onPageChange} onCollapse={() => transactionProps?.onExpandChange(false)} /></> : <PfaActivityTabs {...tabs} />}<div ref={setPanelHost} className={'accounts-wrap ' + (tabs.value === 'analysis' ? 'accounts-grid activity-analysis' : 'activity-transactions')} id="activity-panel" role="tabpanel" aria-labelledby={'activity-tab-' + tabs.value}>
    {panel.kind === 'analysis' ? <>
      {panel.lead ? <section className="card decision pfa-react-root view-activity activity-primary" id="activity-header" data-surface="lead"><PfaDecisionSurface {...panel.lead} /><PfaFoldAllRow host={panelHost} refreshKey={panel} inCard /></section> : null}
      {panel.insights ? <PfaCardShell name="activity-unusual" className="insights" title="What’s new or unusual" summary={panel.insights.summary} iconMarkup={panel.insights.iconMarkup} alwaysOpen foldAll={false}><div className="insights"><PfaInsightList {...panel.insights.listProps} /></div></PfaCardShell> : null}
      {panel.review ? <PfaCardShell className="acct-review" title="Review & adjustments" summary={panel.review.summary} iconMarkup={panel.review.iconMarkup} alwaysOpen={panel.review.alwaysOpen} foldAll={false} persistOpen={false}><PfaLedgerReview {...panel.review} /></PfaCardShell> : null}
      {!panel.lead ? <PfaFoldAllRow host={panelHost} refreshKey={panel} /> : null}
      {panel.where ? <PfaActivitySpecialCard name="activity-where-it-went" component={PfaWhereItWentCard} props={panel.where} /> : null}
      {panel.places ? <PfaCardShell name="activity-biggest-payments" className={panel.commitments ? 'half' : ''} title="Biggest payments" summary={panel.places.summary} iconMarkup={panel.places.iconMarkup}><PfaRankedPaymentList {...panel.places.rankedProps} /></PfaCardShell> : null}
      {panel.commitments ? <PfaActivitySpecialCard as="section" name="activity-commitments" className={panel.places ? 'half' : ''} component={PfaCommitmentCard} props={panel.commitments} /> : null}
      {panel.income ? <PfaCardShell name="activity-income" title="Your regular deposits" explain="The largest deposit that arrives every month, so you can see whether it is steady. It is not all your money in." summary={panel.income.summary} iconMarkup={panel.income.iconMarkup}><PfaActivityIncome {...panel.income.incomeProps} /></PfaCardShell> : null}
      {panel.trend ? <PfaActivitySpecialCard name="activity-spending-over-time" className={panel.foreign ? 'half' : ''} component={PfaSpendingTrendCard} props={panel.trend} /> : null}
      {panel.foreign ? <PfaCardShell name="activity-spent-abroad" className={panel.trend ? 'half' : ''} title="Spent abroad" summary={panel.foreign.summary} iconMarkup={panel.foreign.iconMarkup}><PfaForeignSpending {...panel.foreign.foreignProps} /></PfaCardShell> : null}
      {panel.fitness ? <section className="card card-collapsible card-fitness pfa-react-root" id="activity-card-health" data-fold-all="true" aria-label="How your card is doing"><PfaCardFitness {...panel.fitness} /></section> : null}
      {panel.limits ? <PfaCardShell id="activity-ceilings" name="activity-spending-limits" className={panel.tags ? 'half' : ''} title="Spending limits you set" summary={panel.limits.summary} iconMarkup={panel.limits.iconMarkup}><PfaSpendingLimits {...panel.limits.limitProps} /></PfaCardShell> : null}
      {panel.tags ? <PfaCardShell name="activity-custom-labels" className={panel.limits ? 'half' : ''} title="Custom labels" summary={panel.tags.summary} explain={panel.tags.explain}><PfaCustomLabels {...panel.tags.labelProps} /></PfaCardShell> : null}
      {panel.empty ? <section className="card empty pfa-react-root"><PfaEmptyState {...panel.empty} /></section> : null}
    </> : null}
    {panel.kind === 'empty' ? <>{panel.selector ? <div className="pfa-react-root"><PfaTransactionAccountFilter {...panel.selector} /></div> : null}<section className="card empty pfa-react-root"><PfaEmptyState {...panel.empty} /></section></> : null}
    {panel.kind === 'transactions' ? <>
      <div><PfaTransactionTableLive props={transactionProps} page={page} onPageChange={onPageChange} /></div>
    </> : null}
  </div><PfaSettingsCardHost settings={settings} /></>;
}
