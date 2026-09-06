import * as React from 'react';

export function PfaInsightList({ insights, emptyText }) {
  if (!insights.length) return <p className="muted pad">{emptyText}</p>;

  return (
    <div className="insight-list">
      {insights.map((item, index) => (
        <button type="button" className={`insight tone-${item.tone}`} id={`activity-insight-${index}`} onClick={item.onClick} key={`${item.id}:${index}`}>
          <span className="insight-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
          <span className="insight-text">{item.text}</span>
          <span className="insight-go" dangerouslySetInnerHTML={{ __html: item.chevron }} />
        </button>
      ))}
    </div>
  );
}
