import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaSubhead({ title, note, explain, onReview, actions }) {
  return <div className="sec-subhead">
    <span className="sec-subhead-title">
      {explain ? <PfaInfoPopover label="" ariaLabel={`${title}: what this means`} content={explain} iconSlot /> : null}
      {title}
    </span>
    {note ? <span className="sec-subhead-note muted small">{note}</span> : null}
    {actions || onReview ? <span className="sec-subhead-actions">{actions || <button className="btn sm ghost" type="button" onClick={onReview}>Review</button>}</span> : null}
  </div>;
}
