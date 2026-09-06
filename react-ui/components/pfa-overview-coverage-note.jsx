import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaOverviewCoverageNote({ headline, detail, onOpen }) {
  return (
    <>
      <button type="button" className="linkbtn" onClick={onOpen}>{headline}</button>
      <PfaInfoPopover label="" content={detail} />
    </>
  );
}
