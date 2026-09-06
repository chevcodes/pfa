import { PfaAccountStatementTrust } from './pfa-account-statement-trust.jsx';
import { PfaCardStatementTrust } from './pfa-card-statement-trust.jsx';
import { PfaCoverageCard } from './pfa-coverage-card.jsx';
import { PfaSubhead } from './pfa-subhead.jsx';

export function PfaSettingsStatements({ stats, cardTrust, bankTrust, investmentTrust, coverage, onOpenFiles }) {
  return <>
    <div className="sec-glance">{stats.map((stat) => <div className="sec-item" key={stat.label}><div className="sec-value">{stat.value}</div><div className="sec-label muted small">{stat.label}</div></div>)}</div>
    {cardTrust ? <div className="sec-section pfa-react-root"><PfaCardStatementTrust {...cardTrust} /></div> : null}
    {bankTrust ? <div className="disclosure sec-fold stmt-summary-section pfa-react-root"><PfaAccountStatementTrust {...bankTrust} /></div> : null}
    {investmentTrust ? <div className="sec-section"><PfaSubhead {...investmentTrust} /></div> : null}
    {coverage ? <section id={coverage.id} className={(coverage.nested ? 'cov-card is-nested' : 'card cov-card') + ' pfa-react-root'} tabIndex={-1}><PfaCoverageCard {...coverage} /></section> : null}
    <div className="manage-actions settings-actions"><button type="button" className="btn sm ghost" onClick={onOpenFiles}>Imported files</button></div>
  </>;
}
