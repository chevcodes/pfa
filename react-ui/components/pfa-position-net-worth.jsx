import * as React from 'react';
import { PfaPositionAssetForm } from './pfa-position-asset-form.jsx';
import { PfaPositionMix } from './pfa-position-mix.jsx';

export function PfaPositionNetWorth({ insight, panels, onAnimate, form }) {
  return (
    <div id="position-networth">
      {insight ? <p className="position-networth-info muted small">{insight}</p> : null}
      {panels.length ? <PfaPositionMix panels={panels} onAnimate={onAnimate} /> : null}
      <PfaPositionAssetForm {...form} />
    </div>
  );
}
