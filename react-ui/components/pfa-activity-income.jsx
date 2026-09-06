import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaMetricLead } from './pfa-metric-lead.jsx';
import { PfaIncomeChart } from './pfa-income-chart.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaIncomeSources } from './pfa-income-sources.jsx';
import { PfaIncomeTakeHome } from './pfa-income-take-home.jsx';

export function PfaActivityIncome({ amount, label, onClick, deltaText, deltaTone, chart, takeHome, sources, why }) {
  const lead = <PfaMetricLead amount={amount} label={label} />;

  return (
    <div>
      {onClick ? <button className="linkbtn" style={{ display: 'block', textAlign: 'left', padding: 0, width: '100%' }} onClick={onClick}>{lead}</button> : lead}
      {deltaText ? <span className={`vm-tag tone-${deltaTone}`}>{deltaText}</span> : null}
      <PfaIncomeTakeHome model={takeHome} />
      {chart ? chart.hidden
        ? <PfaHiddenChart what="Your regular deposits" height="220px" />
        : <div className="pfa-react-root" data-proportional=""><PfaIncomeChart {...chart.props} /></div>
      : null}
      <PfaIncomeSources model={sources} />
      {why ? <PfaInlineDisclosure name="activity-income-why" label="Why"><div className="disclosure-body"><p>{why}</p></div></PfaInlineDisclosure> : null}
    </div>
  );
}
