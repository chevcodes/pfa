import * as React from 'react';
import { targetBarGeometry } from '../../application/ui/chart-helpers.js';

export function PfaTargetBar({ actual, target, scaleMax, tone = 'free', historical = false }) {
  const hasTarget = target != null;
  const geometry = targetBarGeometry(actual, target, scaleMax);
  return <div className="target-bar-plot" aria-hidden="true">
    <div className={`plan-bar${hasTarget && geometry.over && !historical ? ' is-over' : ''}`}><i className={`plan-bar-fill is-${tone}`} style={{ width: `${geometry.fill}%` }} /></div>
    {hasTarget ? <i className={`target-bar-marker${historical ? ' is-historical' : ''}`} style={{ left: `${geometry.marker}%` }} /> : null}
  </div>;
}
