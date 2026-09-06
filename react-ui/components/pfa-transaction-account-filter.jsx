import * as React from 'react';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaTransactionAccountFilter({ items, summary, iconNode, explain, markScrollAffordance, onSelect, inline = false }) {
  const stripRef = React.useRef(null);

  React.useEffect(() => {
    markScrollAffordance(stripRef.current);
  }, []);

  const info = explain ? <PfaInfoPopover content={explain.map((text, index) => <p key={index} style={{ margin: `${index ? '8px' : '0'} 0 0` }}>{text}</p>)} /> : iconNode ? <VanillaBody node={iconNode} /> : null;
  const content = <div className="acct-slicer-card">
    <div ref={stripRef} className="acct-slicer" aria-label="Filter transactions by account or card">
      {items.map((item) => (
        <button key={item.value} type="button" className={'acct-chip' + (item.active ? ' active' : '')} aria-pressed={item.active} onClick={() => onSelect(item.value)}>
          <span className="acct-chip-name">{item.name}</span>
          <span className={'acct-chip-sub' + (item.owe ? ' owe' : '')}>{item.sub}</span>
        </button>
      ))}
    </div>
  </div>;
  if (inline) return <div className="stack"><div className="row"><strong>Accounts</strong>{info}</div>{content}</div>;
  return (
    <PfaCardDisclosure
      title="Filter by account"
      icon={info}
      hasExplain={!!(explain || iconNode)}
      summary={summary}
      name="account-filter"
      compact
    >
      {content}
    </PfaCardDisclosure>
  );
}
