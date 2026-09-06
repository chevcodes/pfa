import * as React from 'react';
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './ui/chart.jsx';
import { figuresHidden } from '../../application/core/privacy.js';
import { PROPORTION_PARTS } from '../../application/ui/chart-helpers.js';

const COLORS = {
  committed: 'var(--band-committed)',
  fixed: 'var(--band-committed)',
  setAside: 'var(--band-setaside)',
  free: 'var(--band-free)',
  fund: 'var(--chart-in)',
  equity: 'var(--accent)',
};

export function PfaProportionBar({ spec, money, model, parts = PROPORTION_PARTS }) {
  const [activeIndex, setActiveIndex] = React.useState(null);
  const [selectedLegend, setSelectedLegend] = React.useState(null);
  const { bands, total, shareOf } = model;
  if (!bands.length || total <= 0) return null;
  const drawn = bands.filter((band) => Number(band.amount) > 0);
  const data = [{ name: spec.label, ...Object.fromEntries(drawn.map((band) => [band.key, Number(band.amount)])) }];
  const config = Object.fromEntries(drawn.map((band) => [band.key, { label: band.label, color: band.colour || COLORS[band.key] || 'var(--chart-neutral)' }]));
  let offset = 0;
  const targets = bands.map((band) => {
    const share = total ? Math.max(0, Number(band.amount) || 0) / total : 0;
    const left = offset;
    offset += share;
    return { band, left, share };
  });
  const active = activeIndex == null ? null : targets[activeIndex];
  const detail = (band, share) => [band.label, money(band.amount), `${shareOf(band)}% of ${money(total)}`, band.meaning].filter(Boolean);

  return (
    <>
      <div className={`${parts.track} pfa-proportion-track`} role="group" aria-label={spec.label}>
        <ChartContainer config={config} className="pfa-proportion-chart !aspect-auto" style={{ height: 34 }}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, total]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={() => null} />
            {drawn.map((band) => (
              <Bar key={band.key} dataKey={band.key} stackId="share" isAnimationActive animationDuration={460}>
                <Cell className={`pfa-proportion-cell is-${band.key}`} fill={band.colour || COLORS[band.key] || 'var(--chart-neutral)'} />
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
        {targets.map(({ band, left, share }, index) => (
          share > 0 ? (
            <button
              key={band.key}
              type="button"
              className={`${parts.segment} pfa-proportion-target`}
              style={{ left: `${left * 100}%`, width: `${share * 100}%` }}
              aria-label={detail(band, share).join('. ')}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          ) : null
        ))}
        {active ? (
          <div className="chart-tooltip pfa-proportion-tooltip" role="tooltip">
            {detail(active.band, active.share).map((line, index) => <div key={index}>{line}</div>)}
          </div>
        ) : null}
      </div>
      <div className={parts.legend}>
        {bands.map((band, index) => {
          const share = shareOf(band);
          const label = [band.label, money(band.amount), `${share}%`, band.meaning].filter(Boolean).join('. ');
          return (
            <React.Fragment key={band.key}>
              <button type="button" className={`${parts.legendRow} pfa-proportion-legend-button`} aria-label={label} aria-expanded={selectedLegend === index} onClick={() => setSelectedLegend(selectedLegend === index ? null : index)}>
                <i className={`proportion-key is-${band.key || 'neutral'}`} aria-hidden="true" style={band.colour ? { background: band.colour } : undefined} />
                <span className={parts.legendLabel}>{band.label}</span>
                <span className={`${parts.legendAmount} num money`}>{money(band.amount)}</span>
                <span className={parts.legendShare}>{figuresHidden() ? '••%' : `${share}%`}</span>
              </button>
              {selectedLegend === index && band.meaning ? <p className="proportion-legend-meaning muted small">{band.meaning}</p> : null}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}
