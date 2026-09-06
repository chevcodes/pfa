import * as React from 'react';
import { iconList } from '../../application/core/icons.js';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaAttentionList({ title, titleDetail, items, calmText, closing }) {
  const heading = <div className="card-head"><h3 className="card-title">{titleDetail ? <PfaInfoPopover label="" ariaLabel="Statement dates: details" content={titleDetail} iconSlot /> : <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconList() }} />}{title}</h3></div>;
  if (!items.length) return <>{heading}{calmText ? <p className="muted pad">{calmText}</p> : null}</>;

  const dots = { blocking: 'warn', watch: 'watch', good: 'neutral' };
  return (
    <>
      {heading}
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className={'attn-item' + (item.onClick ? ' is-actionable' : '')}
        >
          {item.onClick ? <button type="button" className="attn-main" onClick={item.onClick}><span className={`attn-dot ${dots[item.tone] || 'review'}`} aria-hidden="true" /><span className="attn-body"><span>{item.title}</span>{item.detail ? <span className="muted small">{item.detail}</span> : null}</span></button> : <><span className={`attn-dot ${dots[item.tone] || 'review'}`} aria-hidden="true" /><div className="attn-body"><div>{item.title}</div>{item.detail ? <div className="muted small">{item.detail}</div> : null}</div></>}
          {item.actions?.length ? <div className="attn-actions">{item.actions.map((action) => <button key={action.label} type="button" className={'btn sm' + (action.variant && action.variant !== 'primary' ? ` ${action.variant}` : '')} onClick={action.onClick}>{action.label}</button>)}</div> : null}
        </div>
      ))}
      {closing ? <p className="muted small">{closing}</p> : null}
    </>
  );
}
