import * as React from 'react';

export function PfaPositionEquation({ rows }) {
  return <div className="position-equation" role="group" aria-label="Recorded assets minus recorded debts equals recorded net worth">
    <p className="position-equation-title">How it reconciles</p>
    {rows.map((row) => <div key={row.label} className={'position-equation-row' + (row.total ? ' is-total' : '')}>
      <span className="position-equation-operator" aria-hidden="true">{row.operator}</span>
      <span className="position-equation-label">{row.label}</span>
      <span className="position-equation-amount num">{row.amount}</span>
    </div>)}
  </div>;
}
