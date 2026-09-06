import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaTargetBar } from './pfa-target-bar.jsx';
import { figuresHidden } from '../../application/core/privacy.js';

export function PfaMonthlyCheckIn({ entries }) {
  const hidden = figuresHidden();
  return (
    <div className="recurring-list monthly-check-in">
      {entries.map((entry) => (
        <div className="attn-item" key={entry.month}>
          <div className="attn-body">
            <PfaInlineDisclosure className="monthly-check-in-entry" name={'plan-monthly-check-in-' + entry.month} label={<><span className={'attn-dot ' + entry.tone} aria-hidden="true" />{entry.label}<span className="monthly-check-in-status">{entry.status}</span></>}><div className="disclosure-body muted small">{hidden ? 'Hidden with figures.' : entry.headline}</div></PfaInlineDisclosure>
            {!hidden && entry.progress ? <><div className="monthly-check-in-numbers"><strong>{entry.progress.current} / {entry.progress.target}</strong><span>{entry.progress.remaining ? `${entry.progress.remaining} to go` : `${entry.progress.share}%`}</span></div><PfaTargetBar actual={entry.progress.currentAmount} target={entry.progress.targetAmount} tone="setAside" /></> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
