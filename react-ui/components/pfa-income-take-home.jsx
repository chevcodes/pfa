import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';

const Rows = ({ rows }) => (
  <div className="plan-workings">
    {rows.map((row) => <div className={`plan-working${row.muted ? ' muted' : ''}`} key={row.label}><span>{row.label}</span><span className="num money">{row.value}</span></div>)}
  </div>
);

export function PfaIncomeTakeHome({ model }) {
  if (!model) return null;
  return (
    <div id="activity-income-take-home" className="income-take-home">
      <p>{model.line}</p>
      <PfaInlineDisclosure name="activity-income-take-home-evidence" label={model.label}>
        <div className="disclosure-body">
          <Rows rows={model.rows} />
          <p className="muted small">{model.monthsHeading}</p>
          <Rows rows={model.months} />
          {model.classes.length ? <><p className="muted small">{model.classesHeading}</p><Rows rows={model.classes} /></> : null}
        </div>
      </PfaInlineDisclosure>
    </div>
  );
}
