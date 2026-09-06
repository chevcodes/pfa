import * as React from 'react';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaEmptyState({ iconNode, iconMarkup, title, body, infoLabel, infoContent, progress, actionLabel, onAction }) {
  return (
    <>
      {iconMarkup ? <div className="empty-icon" dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : iconNode ? <div className="empty-icon"><VanillaBody node={iconNode} /></div> : null}
      <h2>{title}</h2>
      {infoContent ? <div className="empty-lines"><PfaInfoPopover label={infoLabel} content={infoContent} /></div> : progress ? <div className="empty-lines"><progress max={progress.max} value={progress.value} aria-label={progress.label} /></div> : body ? <p className="muted">{body}</p> : null}
      {actionLabel ? <button className="btn primary" type="button" onClick={onAction}>{actionLabel}</button> : null}
    </>
  );
}
