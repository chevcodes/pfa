import * as React from 'react';
import { markScrollAffordance } from '../../application/core/shared-helpers.js';
import { iconChart } from '../../application/core/icons.js';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { PfaColumnChart } from './pfa-column-chart.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';

export function PfaSpendingTrendCard({ summary, monthFiltered, onShowAll, chart, hidden, defaultOpen, onOpenChange }) {
  return <PfaCardDisclosure bare title="Spending over time" summary={summary} icon={<span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconChart() }} />} name="activity-spending-over-time" defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
    {monthFiltered ? <div className="card-head">
      <button className="btn sm ghost" type="button" onClick={onShowAll}>Show all months</button>
    </div> : null}
    {hidden ? <PfaHiddenChart what="Spending by month" height="170px" /> : <div className={`chart-surface ${chart.spec.className || ''}`} role="group" aria-label={chart.spec.label} data-proportional=""><div className="chart-scroll" ref={(node) => markScrollAffordance(node, true)}><PfaColumnChart {...chart} /></div></div>}
  </PfaCardDisclosure>;
}
