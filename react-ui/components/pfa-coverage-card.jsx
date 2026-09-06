import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaCoverageCard({ strips, scale, classes, onAdd }) {
  return (
    <>
      <h3>Statements loaded</h3>
      {strips.map((strip) => (
        <div className={classes.ledger} key={strip.ledger}>
          <div className={classes.head}>
            <span className={classes.name}>{strip.label}</span>
            <PfaInfoPopover content={strip.detail} ariaLabel={`${strip.label}: what this means`} />
            <span className={classes.count + ' ' + (strip.shortfall ? 'is-gappy' : 'is-complete')}>{strip.count}</span>
          </div>
          <div className={classes.strip} role="img" aria-label={strip.ariaLabel}>
            {strip.cells.map((cell) => <i key={cell.month} className={cell.className} aria-label={cell.ariaLabel} data-month={cell.monthLabel} data-state={cell.state} data-detail={cell.detail} />)}
          </div>
        </div>
      ))}
      {strips.length ? <div className={classes.scale}><span>{scale.first}</span><span>{scale.last}</span></div> : null}
      {onAdd ? <div className="manage-actions settings-actions"><button className="btn sm" type="button" onClick={onAdd}>Add</button></div> : null}
    </>
  );
}
