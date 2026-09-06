import * as React from 'react';
import { PfaDecisionSurface } from './pfa-decision-surface.jsx';
import { PfaAttentionList } from './pfa-attention-list.jsx';
import { PfaOverviewFlowCard } from './pfa-overview-flow-card.jsx';
import { PfaOverviewCoverageNote } from './pfa-overview-coverage-note.jsx';
import { PfaSettingsCardHost } from './pfa-settings-card.jsx';

function OverviewDecision({ model, coverage }) {
  return <section className={'card decision pfa-react-root' + (model.className ? ' ' + model.className : '') + (model.demoted ? ' decision--supporting' : '')} id={model.id} data-surface={model.demoted ? undefined : 'lead'}><PfaDecisionSurface {...model} />{coverage ? <p className="coverage-note muted small"><PfaOverviewCoverageNote {...coverage} /></p> : null}</section>;
}

export function PfaOverviewView({ story, lead, attention, chart, coverage, settings, empty }) {
  return <>
    {empty ? <section className="card empty"><div className="empty-icon" dangerouslySetInnerHTML={{ __html: empty.iconMarkup }} /><h2>{empty.title}</h2><div className="empty-lines">{empty.lines.map((line) => <p className="muted" key={line}>{line}</p>)}</div>{empty.onShowAll ? <button type="button" className="btn primary" onClick={empty.onShowAll}>Show all time</button> : null}</section> : <>
      {story ? <OverviewDecision model={story} /> : null}
      {lead ? <OverviewDecision model={lead} coverage={coverage} /> : null}
      <section className="card attention pfa-react-root"><PfaAttentionList {...attention} /></section>
      {chart ? <section className="card card-collapsible overview-flow pfa-react-root" id="overview-cash-movement" tabIndex={-1}><PfaOverviewFlowCard chart={chart} /></section> : null}
    </>}
    <PfaSettingsCardHost settings={settings} />
  </>;
}
