import * as React from 'react';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { PfaMetricLead } from './pfa-metric-lead.jsx';
import { PfaTreemapCard } from './pfa-treemap-card.jsx';

let whereSource = 'all';

export function PfaWhereItWentCard({ iconMarkup, views, periodLabel, money, compactMoney, defaultOpen, onOpenChange }) {
  const [source, setSource] = React.useState(whereSource);
  const view = views[source];
  const periodContext = source === 'all' ? 'Eligible purchases' : `Eligible ${source} purchases`;
  return <PfaCardDisclosure bare title="Where it went" summary={view.summary} icon={<span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} />} name="activity-where-it-went" defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
    <div className="where-head"><PfaMetricLead amount={money(view.amount)} label={`${periodContext} · ${periodLabel}`} /><div className="seg" role="group" aria-label="Spending source">{[['all', 'All'], ['bank', 'Bank'], ['card', 'Card']].map(([key, label]) => <button key={key} type="button" className={`seg-btn${source === key ? ' active' : ''}`} aria-pressed={source === key} onClick={() => { whereSource = key; setSource(key); }}>{label}</button>)}</div></div>
    {view.treemap ? <PfaTreemapCard {...view.treemap} rankedCategories={view.ranked.map((item) => ({ ...item, share: view.total ? item.amount / view.total * 100 : 0 }))} source={source} /> : <p className="muted small">No eligible {source === 'all' ? 'bank or card' : source} purchases in this period.</p>}
    {view.fees > 0 || view.returned < 0 ? <p className="muted small">{view.fees > 0 ? `Fees & tax: ${compactMoney(view.fees)}` : ''}{view.fees > 0 && view.returned < 0 ? ' · ' : ''}{view.returned < 0 ? `Uncategorised returns: ${compactMoney(-view.returned)}` : ''}</p> : null}
  </PfaCardDisclosure>;
}
