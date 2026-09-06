import * as React from 'react';
import { hiddenChartLabel } from '../../application/core/privacy.js';

export function PfaHiddenChart({ what, height, className = '', message }) {
  const content = (
    <>
      <span className="chart-hidden-mark" aria-hidden="true">
        <span className="chart-hidden-dot" />
        <span className="chart-hidden-dot" />
        <span className="chart-hidden-dot" />
      </span>
      <span className="chart-hidden-copy">{message || 'Chart hidden while figures are hidden'}</span>
    </>
  );
  return what
    ? <div className={`chart-hidden pfa-react-root ${className}`.trim()} role="img" aria-label={hiddenChartLabel(what)} style={height ? { minHeight: height } : undefined}>{content}</div>
    : content;
}
