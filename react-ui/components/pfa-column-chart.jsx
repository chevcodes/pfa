import * as React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from './ui/chart.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { makeMoneyShort } from '../../application/core/money-format.js';
import { prefixFromSample } from '../../application/core/privacy.js';

function ChartBar({ x, y, width, height, fill, payload }) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={5}
      fill={fill}
      fillOpacity={payload.incomplete ? 0.45 : 1}
      stroke={payload.incomplete ? fill : 'none'}
      strokeDasharray={payload.incomplete ? '3 3' : undefined}
    />
  );
}

export function PfaColumnChart({ ctx, spec }) {
  const [activeIndex, setActiveIndex] = React.useState(null);
  const rows = spec.rows || [];
  const series = spec.series || [];
  if (!rows.length || !series.length) return null;

  const values = rows.flatMap((row) => series.map((item) => Number(row[item.key]) * (item.sign || 1))).filter(Number.isFinite);
  if (spec.net) values.push(...rows.map((row) => Number(row.net) || 0));
  if (spec.guide != null) values.push(spec.guide);
  const maximum = Math.max(0, ...values);
  const minimum = Math.min(0, ...values);
  const extent = Math.max(maximum, -minimum, 1);
  const top = spec.max ?? (minimum < 0 ? extent * 1.08 : Math.max(1, maximum * 1.08));
  const bottom = spec.min ?? (minimum < 0 ? -extent * 1.08 : 0);
  const dense = rows.length > 18;
  const step = dense ? 14 : 42;
  const width = Math.max(260, rows.length * step + 64);
  const data = rows.map((row, index) => {
    const valuesForRow = Object.fromEntries(series.map((item) => [`plot_${item.key}`, row[item.key] == null ? null : Number(row[item.key]) * (item.sign || 1)]));
    return { ...row, ...valuesForRow, netCash: spec.net ? Number(row.net) || 0 : undefined, __index: index };
  });
  const config = Object.fromEntries(series.map((item) => [
    `plot_${item.key}`,
    { label: item.label, color: `var(--chart-${item.tone || 'in'})` },
  ]));
  if (spec.net) config.netCash = { label: 'Net cash', color: 'var(--fg)' };
  const ticks = Array.from({ length: 5 }, (_, index) => top - ((top - bottom) * index) / 4);
  const tick = ctx.monthShort;
  const nameOf = (row) => (ctx.monthLabel ? ctx.monthLabel(row.month) : String(row.month || ''));
  const detailOf = (row) => {
    const detail = [nameOf(row), ...series.map((item) => `${item.label}: ${row.present === false || row[item.key] == null ? row.missingText || spec.missingText || 'No deposit found' : (spec.money || ctx.money0 || String)(row[item.key])}`)];
    if (spec.net) detail.push(`${row.net < 0 ? 'Shortfall' : 'Net cash'}: ${(spec.money || ctx.money0 || String)(row.net)}`);
    if (row.detail) detail.push(row.detail);
    if (row.marker) detail.push(row.marker);
    if (row.incomplete) detail.push(row.incompleteText || 'Partial month');
    return detail;
  };
  const select = (row, event) => {
    if (!spec.onSelect || document.documentElement.dataset.privacy === 'on') return;
    spec.onSelect(row, event);
  };
  const moveTarget = (index, event) => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % rows.length;
    if (event.key === 'ArrowLeft') next = (index + rows.length - 1) % rows.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = rows.length - 1;
    if (next != null) {
      event.preventDefault();
      event.currentTarget.parentElement.children[next]?.focus();
    }
  };
  const money = spec.money || ctx.money0 || makeMoneyShort();
  const axisMoney = spec.axisMoney || ctx.moneyShort || makeMoneyShort({ symbol: prefixFromSample(money(0)) });
  const focused = activeIndex == null ? null : rows[activeIndex];
  const tooltipEdge = activeIndex == null || rows.length <= 2
    ? ''
    : (activeIndex + 0.5) / rows.length < 0.2
      ? ' is-leading'
      : (activeIndex + 0.5) / rows.length > 0.8
        ? ' is-trailing'
        : '';
  const monthName = (row) => {
    const formatted = nameOf(row);
    return tick ? (tick.month ? tick.month(row.month) : tick(row.month)) : formatted;
  };

  return (
    <>
      <div className="chart-axis is-sticky" aria-hidden="true">
        {ticks.map((value, index) => <span key={index} style={{ top: `${index * 25}%` }}>{axisMoney(value)}</span>)}
      </div>
      <div className="chart-canvas" style={{ minWidth: width }}>
          <div className="chart-plot">
            <ChartContainer config={config} className="pfa-column-chart !aspect-auto" style={{ height: 220 }}>
              <ComposedChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--dim)" strokeOpacity={0.12} />
                <XAxis dataKey="__index" type="number" domain={[-0.5, rows.length - 0.5]} hide />
                <YAxis domain={[bottom, top]} ticks={ticks} hide />
                {bottom <= 0 && top >= 0 ? <ReferenceLine y={0} stroke="var(--dim)" strokeOpacity={0.6} /> : null}
                {rows.map((row, index) => row.present === false ? <ReferenceLine key={`missing-${index}`} x={index} className="chart-missing" /> : null)}
                {spec.guide != null ? <ReferenceLine y={spec.guide} stroke="var(--dim)" strokeDasharray="4 5" /> : null}
                {series.map((item) => spec.mode === 'line' ? (
                  <Line key={item.key} type="linear" dataKey={`plot_${item.key}`} stroke={`var(--chart-${item.tone || 'in'})`} strokeWidth={2.5} dot={{ r: 4, fill: `var(--chart-${item.tone || 'in'})` }} connectNulls={false} isAnimationActive animationDuration={420} />
                ) : (
                  <Bar key={item.key} dataKey={`plot_${item.key}`} fill={`var(--chart-${item.tone || 'in'})`} barSize={Math.min(70, (1000 / rows.length) * 0.58) / series.length} shape={<ChartBar />} isAnimationActive animationDuration={420} />
                ))}
                {spec.net ? <Line type="linear" dataKey="netCash" stroke="var(--fg)" strokeWidth={2} dot={{ r: 3, fill: 'var(--fg)', stroke: 'var(--card, var(--bg))', strokeWidth: 2 }} connectNulls={false} isAnimationActive animationDuration={520} /> : null}
                {rows.map((row, index) => row.marker && row.present !== false ? (
                  <ReferenceDot key={`marker-${index}`} x={index} y={row[series[0].key]} r={5} fill="var(--accent)" stroke="var(--card, var(--bg))" />
                ) : null)}
                {spec.mode !== 'line' ? rows.map((row, index) => row.present !== false && row[series[0].key] != null && Number(row[series[0].key]) === 0 ? <ReferenceDot key={`zero-${index}`} x={index} y={0} r={4} fill={`var(--chart-${series[0].tone || 'in'})`} fillOpacity={row.incomplete ? 0.55 : 1} stroke="var(--card, var(--bg))" /> : null) : null}
              </ComposedChart>
            </ChartContainer>
            <div className="chart-targets">
              {rows.map((row, index) => (
                <button
                  key={row.month || index}
                  id={spec.targetIdPrefix ? `${spec.targetIdPrefix}-${encodeURIComponent(row.month || index)}` : undefined}
                  type="button"
                  className={`chart-target${row.selected ? ' is-selected' : ''}${row.inPeriod ? ' in-period' : ''}${row.compared ? ' is-compared' : ''}`}
                  style={{ left: `${index / rows.length * 100}%`, width: `${100 / rows.length}%` }}
                  aria-label={detailOf(row).join('. ')}
                  aria-pressed={spec.onSelect ? !!row.selected : undefined}
                  onPointerEnter={() => { setActiveIndex(index); spec.onInspect?.(row, index); }}
                  onPointerLeave={() => setActiveIndex(null)}
                  onFocus={() => { setActiveIndex(index); spec.onInspect?.(row, index); }}
                  onBlur={() => setActiveIndex(null)}
                  onClick={(event) => select(row, event)}
                  onKeyDown={(event) => moveTarget(index, event)}
                />
              ))}
            </div>
            {focused ? (
              <div className={`chart-tooltip pfa-column-tooltip${tooltipEdge}`} role="tooltip" style={{ left: `${((activeIndex + 0.5) / rows.length) * 100}%` }}>
                {detailOf(focused).map((text, index) => <div key={index}>{text}</div>)}
              </div>
            ) : null}
            {spec.guide != null && !spec.guideInLegend ? <span className="chart-guide" style={{ top: `${((top - spec.guide) / (top - bottom)) * 100}%` }}>{spec.guideLabel || 'Typical'} {axisMoney(spec.guide)}</span> : null}
          </div>
          <div className="chart-months" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
            {rows.map((row, index) => {
              const year = tick && tick.year ? tick.year(row.month) : '';
              const named = !dense || !!year || index === 0 || index === rows.length - 1;
              return <span key={row.month || index} className={row.present === false ? 'is-missing' : ''} title={nameOf(row)}>{named ? monthName(row) : ''}{named && year ? <span className="chart-month-year">{year}</span> : null}</span>;
            })}
          </div>
      </div>
      {!spec.hideLegend ? (
        <div className="chart-legend is-sticky">
          {series.map((item) => <span key={item.key}><i className={`chart-key is-${item.tone || 'in'}`} aria-hidden="true" />{item.label}</span>)}
          {spec.guide != null && spec.guideInLegend ? <span><i className="chart-key is-guide" aria-hidden="true" />{spec.guideLabel || 'Typical'} {axisMoney(spec.guide)}</span> : null}
          {spec.net ? <span><i className="chart-key is-net" aria-hidden="true" />Net cash</span> : null}
          {rows.some((row) => row.present === false) ? <span>{spec.missingLegend || '- No deposit'}</span> : null}
          {rows.some((row) => row.noDeposit) ? <span>• No deposit recorded</span> : null}
          {spec.markerLabel && rows.some((row) => row.marker) ? <span><i className="chart-key is-marker" aria-hidden="true" />{spec.markerLabel}</span> : null}
          {rows.some((row) => row.incomplete) ? <span>⋯ Partial month</span> : null}
          {spec.legendNote instanceof Node ? <span className="chart-legend-note"><VanillaBody node={spec.legendNote} /></span> : spec.legendNote?.text ? <span className="chart-legend-note">{spec.legendNote.text}<PfaInfoPopover content={spec.legendNote.info} /></span> : spec.legendNote || null}
        </div>
      ) : null}
    </>
  );
}
