import * as React from 'react';
import { PfaDecisionSurface } from './pfa-decision-surface.jsx';
import { PfaBalanceUpdateForm } from './pfa-balance-update-form.jsx';
import { PfaPositionNetWorth } from './pfa-position-net-worth.jsx';
import { PfaInvestmentCard } from './pfa-investment-card.jsx';
import { PfaPositionCashAccounts } from './pfa-position-cash-accounts.jsx';
import { PfaPositionSummary } from './pfa-position-summary.jsx';
import { PfaCardShell } from './pfa-card-shell.jsx';
import { PfaSettingsCardHost } from './pfa-settings-card.jsx';
import { PfaEmptyState } from './pfa-empty-state.jsx';
import { PfaFoldAllRow } from './pfa-fold-all.jsx';

export function PfaPositionView({ host, hero, update, netWorth, investments = [], cash, summary, empty, settings }) {
  return <>
    {empty ? <section className="card empty pfa-react-root"><PfaEmptyState {...empty} /></section> : <>
      {hero ? <section className="card decision pfa-react-root view-position" id="position-header" data-surface="lead"><PfaDecisionSurface {...hero} /><PfaFoldAllRow host={host} refreshKey={update} inCard /></section> : <PfaFoldAllRow host={host} refreshKey={update} />}
      {update ? <PfaCardShell id="balance-update" name="balance-update-card" title="Update balances" summary={update.summary} explain={update.explain}><PfaBalanceUpdateForm {...update.formProps} /></PfaCardShell> : null}
      {netWorth ? <PfaCardShell name="position-networth-card" title="Recorded assets and debts" summary={netWorth.summary} iconMarkup={netWorth.iconMarkup}><PfaPositionNetWorth {...netWorth.netWorthProps} /></PfaCardShell> : null}
      {investments.map((investment, index) => <PfaCardShell key={index} name="position-investments-card" className={investments.length > 1 ? 'half' : ''} title="Investments" summary={investment.summary} iconMarkup={investment.iconMarkup}><PfaInvestmentCard {...investment.investmentProps} /></PfaCardShell>)}
      {cash ? <PfaCardShell name="position-cashdebt-card" className={summary ? 'half' : ''} title="Where your cash sits" summary={cash.summary} explain={cash.explain}><PfaPositionCashAccounts {...cash.cashProps} /></PfaCardShell> : null}
      {summary ? <PfaCardShell as="section" name="position-summary-card" className={cash ? 'half' : ''} title="Shareable financial summary" summary="Ready to copy" explain={summary.explain} ><PfaPositionSummary {...summary} /></PfaCardShell> : null}
    </>}
    <PfaSettingsCardHost settings={settings} />
  </>;
}
