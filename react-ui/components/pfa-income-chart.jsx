import * as React from 'react';
import { markScrollAffordance } from '../../application/core/shared-helpers.js';
import { PfaColumnChart } from './pfa-column-chart.jsx';

let incomeScaleMode = 'bar';

export function PfaIncomeChart({ ctx, rows, guide, guideLabel, missingText, missingLegend, min, max, onSelect }) {
  const [mode, setMode] = React.useState(incomeScaleMode);
  const chooseMode = (next) => { incomeScaleMode = next; setMode(next); };
  const spec = {
    label: mode === 'line' ? 'Deposit change, zoomed scale' : 'Monthly deposit, zero baseline',
    rows,
    series: [{ key: 'amount', label: 'Deposit', tone: 'in' }],
    guide,
    guideLabel,
    guideInLegend: true,
    missingText,
    missingLegend,
    targetIdPrefix: 'activity-income',
    mode,
    ...(mode === 'line' ? { min, max } : {}),
    ...(onSelect ? { onSelect } : {}),
  };

  return (
    <div className="ic-chart" role="group" aria-label={spec.label}>
      <div className="chart-controls" role="group" aria-label="Deposit scale">
        <button type="button" className="btn sm ghost" aria-pressed={mode === 'bar'} onClick={() => chooseMode('bar')}>Amount</button>
        <button type="button" className="btn sm ghost" aria-pressed={mode === 'line'} onClick={() => chooseMode('line')}>Change</button>
      </div>
      <p className="muted small ic-scale-note">{spec.label}</p>
      <div className="chart-scroll" ref={(node) => markScrollAffordance(node, true)}>
        <PfaColumnChart ctx={ctx} spec={spec} />
      </div>
    </div>
  );
}
