import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartContainer } from './ui/chart.jsx';

/**
 * Replaces application/ui/chart-surface.js's renderDonutChart(ctx, spec) -
 * the app's one part-to-whole ring - with shadcn's Chart wrapper around
 * Recharts' actual Pie/Cell (per the migration brief: map chart-helpers.js's
 * data shapes into Recharts' expected props, rather than reimplementing the
 * original's hand-rolled stroke-dasharray circle trick in React).
 *
 * Reuses the literal "donut" / "donut-figure" / "donut-centre" /
 * "donut-legend" / "donut-legend-row" / "donut-key" / "donut-legend-label" /
 * "donut-legend-amt" / "chart-tooltip" class names from
 * interface/flow-chart.css verbatim - same reason as every other migrated
 * component: those are what "html[data-privacy='on'] .donut" and the rest
 * of the app's CSS already target. What's new (react-ui/styles/
 * pfa-donut-chart.css) is only the fill-based tone colouring, because
 * Recharts draws filled arc <path> sectors, not the original's stroked
 * <circle> ring - the existing .donut-arc.is-* rules set `stroke`, which a
 * filled shape ignores.
 *
 * spec: { label, total, segments: [{ key, label, amount, tone, colour }],
 * centre: { value, label } } - identical to renderDonutChart's own spec
 * shape, so a call site converts by changing only the function name.
 */
export function PfaDonutChart({ label, segments, total, centre, money }) {
  const kept = (segments || []).filter((s) => Number(s.amount) > 0);
  const computedTotal = Number(total) || kept.reduce((sum, s) => sum + Number(s.amount), 0);
  if (!kept.length || computedTotal <= 0) return null;

  const data = kept.map((s) => ({ ...s, value: Number(s.amount) }));
  const config = Object.fromEntries(kept.map((s) => [s.key, { label: s.label }]));

  return (
    <div className="donut" role="group" aria-label={label}>
      <div className="donut-figure">
        <ChartContainer config={config} className="donut-svg !aspect-square">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={true}
              animationDuration={520}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  className={`pfa-donut-arc is-${entry.tone || 'neutral'}`}
                  style={entry.colour ? { fill: entry.colour } : undefined}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                const share = Math.round((item.value / computedTotal) * 100);
                return (
                  <div className="chart-tooltip" style={{ position: 'static', width: 'max-content' }}>
                    <div>{item.label}</div>
                    <div>{money(item.value)}</div>
                    <div>{share}% of {money(computedTotal)}</div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ChartContainer>
        {centre ? (
          <div className="donut-centre" aria-hidden="true">
            <span className="donut-centre-value money">{centre.value}</span>
            <span className="donut-centre-label">{centre.label}</span>
          </div>
        ) : null}
      </div>
      <div className="donut-legend">
        {kept.map((s) => {
          const share = Math.round((Number(s.amount) / computedTotal) * 100);
          const detail = `${s.label}. ${money(s.amount)}. ${share}% of ${money(computedTotal)}`;
          return (
            <div key={s.key} className="donut-legend-row" tabIndex={0} role="img" aria-label={detail}>
              <i
                className={`donut-key is-${s.tone || 'neutral'}`}
                aria-hidden="true"
                style={s.colour ? { background: s.colour } : undefined}
              />
              <span className="donut-legend-label">{s.label}</span>
              <span className="donut-legend-amt num">{money(s.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
