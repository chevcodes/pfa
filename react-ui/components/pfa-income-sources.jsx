import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';

export function PfaIncomeSources({ model }) {
  if (!model) return null;
  return (
    <PfaInlineDisclosure name="activity-income-sources" label={model.label}>
      <div className="disclosure-body">
        {model.groups.map((group, groupIndex) => (
          <div className="plan-workings" key={group.label}>
            <div className="plan-working"><strong>{group.label}</strong><span className="num money">{group.totalText}</span></div>
            {group.streams.map((stream, index) => (
              <PfaInlineDisclosure key={stream.key} name={`activity-income-source-${groupIndex}-${index}`} label={`${stream.label} · ${stream.glance}`}>
                <div className="disclosure-body plan-workings">
                  {stream.evidence.map((row) => <div className="plan-working" key={row.label}><span>{row.label}</span><span className="num money">{row.value}</span></div>)}
                </div>
              </PfaInlineDisclosure>
            ))}
          </div>
        ))}
        {model.other ? <p className="muted small">{model.other}</p> : null}
      </div>
    </PfaInlineDisclosure>
  );
}
