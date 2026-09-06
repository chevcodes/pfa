import * as React from 'react';

export function PfaMetricLead({ amount, label }) {
  return (
    <div className="vm-lead">
      <div className="vm-number">{amount}</div>
      {label ? <div className="vm-label">{label}</div> : null}
    </div>
  );
}
