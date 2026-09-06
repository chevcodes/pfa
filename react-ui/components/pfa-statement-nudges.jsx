import * as React from 'react';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';

export function PfaStatementNudges({ items, current, actionNode, onAdd }) {
  return (
    <>
      {items.map((item, index) => (
        <div className="attn-item" key={`${item.title}:${index}`}>
          <span className={'attn-dot ' + item.tone} />
          <div className="attn-body">
            {item.title}{' '}
            {item.provenance
              ? <PfaInfoPopover content={<><div>{item.provenance[0]}</div><div className="nudge-working">{item.provenance[1]}</div></>} />
              : <VanillaBody node={item.infoNode} />}
          </div>
        </div>
      ))}
      {!current && onAdd ? <div className="attn-actions"><button className="btn sm" onClick={onAdd}>Add</button></div> : null}
      {!current && !onAdd ? <VanillaBody node={actionNode} /> : null}
    </>
  );
}

export function PfaStatementNudgeCard({ title, summary, iconNode, iconMarkup, items, current, onAdd, defaultOpen, onOpenChange }) {
  return <PfaCardDisclosure bare title={title} summary={summary} icon={iconMarkup ? <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : <VanillaBody node={iconNode} />} name="plan-statement-nudge" defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
    <PfaStatementNudges items={items} current={current} onAdd={onAdd} />
  </PfaCardDisclosure>;
}
