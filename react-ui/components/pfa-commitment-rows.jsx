import * as React from 'react';
import { PfaExpandableList } from './pfa-expandable-list.jsx';

export function PfaCommitmentRows({ rows }) {
  return (
    <PfaExpandableList
      items={rows}
      initial={3}
      className="recurring-list"
      renderItem={(row, index) => {
        const content = (
          <>
            <span className="commit-name">
              <span className="commit-name-main">{row.label}</span>
              {row.sub ? <span className="commit-name-sub muted small">{row.sub}</span> : null}
              {row.risen ? <span className="commit-risen">went up</span> : null}
            </span>
            <span className={'commit-amt num ' + (row.lapsed ? 'muted' : 'strong')}>{row.amount}</span>
            <span className="commit-bar" data-proportional=""><span className="commit-bar-fill" style={{ width: `${row.width}%`, background: row.colour }} /></span>
          </>
        );
        return row.onClick ? (
          <button className={'commit-row' + (row.lapsed ? ' lapsed' : '')} aria-label={row.ariaLabel} onClick={row.onClick} key={`${row.id}:${index}`}>
            {content}
          </button>
        ) : (
          <div className={'commit-row' + (row.lapsed ? ' lapsed' : '')} aria-label={row.ariaLabel} key={`${row.id}:${index}`}>
            {content}
          </div>
        );
      }}
    />
  );
}
