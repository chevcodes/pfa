import * as React from 'react';
import { markScrollAffordance } from '../../application/core/shared-helpers.js';
import { PfaColumnChart } from './pfa-column-chart.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { VanillaBody } from '../vanilla-body.jsx';

function BodyNode({ node }) {
  return node ? <VanillaBody node={node} /> : null;
}

export function PfaInvestmentHistory({ chart, chartModel, emptyText }) {
  let body = <p className="inv-note muted small">{emptyText}</p>;
  const zoomed = chartModel && !chartModel.hidden && chartModel.spec.min > 0;
  if (chart) body = <BodyNode node={chart} />;
  if (chartModel) {
    body = chartModel.hidden ? <PfaHiddenChart what={chartModel.label} height="220px" /> : (
      <div className={`chart-surface pfa-react-root ${chartModel.spec.className || ''}`} role="group" aria-label={`${chartModel.spec.label}${zoomed ? ', zoomed vertical scale' : ''}`} data-proportional="">
        <div className="chart-scroll" ref={(node) => markScrollAffordance(node, true)}>
          <PfaColumnChart {...chartModel} />
        </div>
      </div>
    );
  }
  return (
    <section className="inv-history">
      <h4>Value over time</h4>
      {zoomed ? <p className="inv-note muted small">Zoomed vertical scale; the axis starts above zero to show changes.</p> : null}
      {body}
    </section>
  );
}

export function PfaInvestmentMovement({ explain, signals, movement, performance }) {
  if (movement !== undefined) {
    return (
      <section className="inv-movement">
        <div className="inv-movement-head">
          <h4>What moved the value</h4>
          {explain.length ? <PfaInfoPopover label="Explain" content={explain.map((line, index) => <p className="inv-note muted small" key={index}>{line}</p>)} /> : null}
        </div>
        <div className="inv-signals">
          {movement ? <div className="inv-performance">
            <span className={`inv-signal ${movement.level ? 'is-level' : `tone-${movement.tone}`}`} role="img" aria-label={movement.words}>
              <span className="inv-arrow" aria-hidden="true">{movement.level ? '◆' : movement.positive ? '▲' : '▼'}</span>
              <span className="num" aria-hidden="true">{movement.level ? 'Level' : movement.amount}</span>
            </span>
            <span className="muted small">{movement.caption}</span>
          </div> : null}
          {performance.available ? <div className="inv-performance">
            <span className={`inv-signal ${performance.level ? 'is-level' : `tone-${performance.tone}`}`} role="img" aria-label={performance.words}>
              <span className="inv-arrow" aria-hidden="true">{performance.level ? '◆' : performance.positive ? '▲' : '▼'}</span>
              <span className="num" aria-hidden="true">{performance.level ? 'Level' : performance.amount}</span>
            </span>
            <span className="muted small">on what it cost</span>
            {performance.explain.length || performance.mixedHoldings ? <PfaInfoPopover label="" content={performance.explain.length ? <p className="inv-note muted small">This combines accounts that are not all up: {performance.explain.map((account, index) => <React.Fragment key={account.key}>{index ? (index === performance.explain.length - 1 ? ' and ' : ', ') : ''}<button type="button" className="linkbtn inv-account-link" title={`Show ${account.name} on its own`} onClick={() => performance.onSelectAccount(account.key)}>{account.name}</button></React.Fragment>)}{performance.explain.length === 1 ? ' is down.' : ' are down.'}</p> : <p className="inv-note muted small">Not all holdings are up. The combined result can hide a holding that is falling; open the detail to see it.</p>} /> : null}
          </div> : <p className="inv-note muted small">Cost-based performance is not available from these statements yet.</p>}
        </div>
      </section>
    );
  }
  return (
    <section className="inv-movement">
      <div className="inv-movement-head">
        <h4>What moved the value</h4>
        <BodyNode node={explain} />
      </div>
      <BodyNode node={signals} />
    </section>
  );
}
