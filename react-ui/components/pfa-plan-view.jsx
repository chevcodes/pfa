import * as React from 'react';
import { iconChart } from '../../application/core/icons.js';
import { PfaDecisionSurface } from './pfa-decision-surface.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaCardShell } from './pfa-card-shell.jsx';
import { PfaPlanWizard } from './pfa-plan-wizard.jsx';
import { PfaPlanLever } from './pfa-plan-lever.jsx';
import { PfaCategoryBudget } from './pfa-category-budget.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaStatementNudges } from './pfa-statement-nudges.jsx';
import { PfaEmptyState } from './pfa-empty-state.jsx';
import { PfaGoalProgress } from './pfa-goal-progress.jsx';
import { PfaMonthlyCheckIn } from './pfa-monthly-check-in.jsx';
import { PfaUpcomingPayments } from './pfa-upcoming-payments.jsx';
import { PfaScenarioCard } from './pfa-scenario-card.jsx';
import { PfaSettingsCardHost } from './pfa-settings-card.jsx';
import { PfaFoldAllRow } from './pfa-fold-all.jsx';

function PfaPlanLeverLive({ store }) {
  const props = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <PfaPlanLever {...props} />;
}

export function PfaPlanView({ host, hero, historyBasisText, lever, statement, empty, goal, monthly, upcoming, scenario, pairUpcoming, settings }) {
  const pairedGoals = !empty && !!monthly;
  const pairedUpcoming = pairUpcoming && !!upcoming && !!scenario;
  return <>
    {hero ? <section className="card decision pfa-react-root view-forecast plan-primary" id="plan-header" data-surface="lead"><PfaDecisionSurface {...hero} footerAction={lever?.kind === 'lever' ? { id: 'plan-header-budget-actual', label: 'Review budget and categories', onClick: hero.onBudgetActual } : lever?.categoryBudgetProps ? { id: 'plan-header-category-budget', label: 'See category spending', onClick: hero.onCategoryBudget } : null} />{historyBasisText ? <PfaInfoPopover label="Statement history" content={historyBasisText} tone="neutral" /> : null}<PfaFoldAllRow host={host} refreshKey={lever} inCard /></section> : null}
    {!hero ? <PfaFoldAllRow host={host} refreshKey={lever} /> : null}
    {statement ? <PfaCardShell name="plan-statement-nudge" className="attention statement-nudge" title={statement.title} summary={statement.summary} iconMarkup={statement.iconMarkup}><PfaStatementNudges items={statement.items} current={statement.current} onAdd={statement.onAdd} /></PfaCardShell> : null}
    {lever?.categoryBudgetProps && lever.kind !== 'lever' ? <PfaCardShell name="plan-category-budget-card" title="Category spending" summary="Bank and card spending against your monthly limits" iconMarkup={iconChart()} initialOpen>{lever.hiddenCharts ? <PfaHiddenChart what="Category spending comparison" height="100px" /> : <PfaCategoryBudget {...lever.categoryBudgetProps} normalPlan={!!hero} />}</PfaCardShell> : null}
    {lever?.kind === 'wizard' ? <PfaPlanWizard {...lever.props} /> : lever?.kind === 'lever' ? <PfaCardShell name="plan-my-plan-card" className="plan-lever" title="Budget vs actual" summary={lever.summary} iconMarkup={lever.iconMarkup} initialOpen={lever.initialOpen}><PfaPlanLeverLive store={lever.store} /></PfaCardShell> : null}
    {empty ? <section className="card empty pfa-react-root"><PfaEmptyState {...empty} /></section> : null}
    {!empty && goal ? <PfaCardShell className={pairedGoals ? 'half goal-card' : ''} title="Your goal" summary={goal.summary} iconMarkup={goal.iconMarkup} initialOpen={goal.initialOpen} alwaysOpen={goal.alwaysOpen}><PfaGoalProgress {...goal.goalProps} /></PfaCardShell> : null}
    {!empty && monthly ? <PfaCardShell name="plan-monthly-check-in" className={pairedGoals ? 'half' : ''} title="Monthly check-in" summary={monthly.summary} iconMarkup={monthly.iconMarkup}><PfaMonthlyCheckIn {...monthly.monthProps} /></PfaCardShell> : null}
    {upcoming ? <PfaCardShell name="plan-expected-payments" className={pairedUpcoming ? 'half' + (upcoming.paymentProps.hasTimeline ? ' half-fill' : '') : ''} title="Expected payments" summary={upcoming.summary} iconMarkup={upcoming.iconMarkup}><PfaUpcomingPayments {...upcoming.paymentProps} /></PfaCardShell> : null}
    {scenario ? <PfaCardShell className={pairedUpcoming ? 'half' : ''} title="Try a change" summary={scenario.summary} iconMarkup={scenario.iconMarkup}><PfaScenarioCard key={scenario.scenarioProps.items.map((item) => `${item.key}:${item.amount}`).join('|')} {...scenario.scenarioProps} /></PfaCardShell> : null}
    {empty && goal ? <PfaCardShell className={monthly ? 'half goal-card' : ''} title="Your goal" summary={goal.summary} iconMarkup={goal.iconMarkup} initialOpen={goal.initialOpen} alwaysOpen={goal.alwaysOpen}><PfaGoalProgress {...goal.goalProps} /></PfaCardShell> : null}
    {empty && monthly ? <PfaCardShell name="plan-monthly-check-in" className={goal ? 'half' : ''} title="Monthly check-in" summary={monthly.summary} iconMarkup={monthly.iconMarkup}><PfaMonthlyCheckIn {...monthly.monthProps} /></PfaCardShell> : null}
    <PfaSettingsCardHost settings={settings} />
  </>;
}
