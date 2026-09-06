import * as React from 'react';
import { Fragment } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './ui/chart.jsx';

export function PfaCommitmentTimeline({ slots, payDay, money, prose, ordinal, paydayLabel }) {
  const [activeIndex, setActiveIndex] = React.useState(null);
  if (!slots || slots.length < 2) return null;
  const peak = Math.max(1, ...slots.map((slot) => slot.total));
  const heaviest = slots.reduce((a, b) => (b.total > a.total ? b : a), slots[0]);
  const active = activeIndex == null ? null : slots[activeIndex];
  const config = { total: { label: 'Expected payments', color: 'var(--chart-out)' } };
  const detail = (slot) => [`Day ${slot.day}${ordinal(slot.day)}`, money(slot.total), ...slot.names.slice(0, 4), ...(slot.names.length > 4 ? [`+${slot.names.length - 4} more`] : [])];
  const focusNext = (index, event) => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % slots.length;
    if (event.key === 'ArrowLeft') next = (index + slots.length - 1) % slots.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = slots.length - 1;
    if (next != null) {
      event.preventDefault();
      event.currentTarget.parentElement.children[next]?.focus();
    }
  };

  return (
    <Fragment>
      <ChartContainer config={config} className="commit-when-chart !aspect-auto" style={{ height: 150 }}>
        <BarChart data={slots} margin={{ top: 18, right: 26, bottom: 26, left: 26 }}>
          <CartesianGrid vertical={false} horizontal={false} />
          <XAxis type="number" dataKey="day" domain={[1, 31]} ticks={[1, 8, 15, 22, 29]} tickFormatter={(day) => String(day)} />
          <YAxis type="number" dataKey="total" domain={[0, peak]} hide />
          <Tooltip content={() => null} />
          {payDay != null ? <ReferenceLine x={payDay} stroke="var(--flow-in)" strokeOpacity={0.55} strokeDasharray="4 4" /> : null}
          <Bar dataKey="total" fill="var(--chart-out)" barSize={7} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={420} />
        </BarChart>
      </ChartContainer>
      {payDay != null ? <span className="commit-when-payday-label" style={{ left: `${((payDay - 1) / 30) * 100}%` }}>{paydayLabel}</span> : null}
      <span className="commit-when-peak" style={{ left: `${((heaviest.day - 1) / 30) * 100}%`, top: `${18 + (1 - heaviest.total / peak) * 86}px` }}>{prose(heaviest.total)}</span>
      <div className="commit-when-targets">
        {slots.map((slot, index) => (
          <button
            key={slot.day}
            type="button"
            className="commit-when-target"
            style={{ left: `${((slot.day - 1) / 30) * 100}%` }}
            aria-label={detail(slot).join('. ')}
            onPointerEnter={() => setActiveIndex(index)}
            onPointerLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            onKeyDown={(event) => focusNext(index, event)}
          />
        ))}
      </div>
      {active ? <div className="chart-tooltip commit-when-tooltip" role="tooltip">{detail(active).map((line, index) => <div key={index}>{line}</div>)}</div> : null}
    </Fragment>
  );
}
