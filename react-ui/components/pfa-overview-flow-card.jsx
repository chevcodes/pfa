import * as React from 'react';
import { iconChart } from '../../application/core/icons.js';
import { PfaFlowChart } from './pfa-flow-chart.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaCardShell } from './pfa-card-shell.jsx';

export function PfaOverviewFlowCard({ chart }) {
  return (
    <PfaCardShell bare name="overview-cash-movement" title="Cash movement" summary={chart.summary} iconMarkup={iconChart()} initialOpen={window.innerWidth >= 640} foldAll={false}>
      {chart.hidden
        ? <PfaHiddenChart what="Cash movement" height="220px" />
        : <div className="pfa-react-root" data-proportional=""><PfaFlowChart {...chart.props} /></div>}
    </PfaCardShell>
  );
}
