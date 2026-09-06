import * as React from 'react';
import { Area, AreaChart, CartesianGrid, Line, ReferenceDot, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './ui/chart.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaPayoffChart({ points, clears, win, maxBalance, payment, money, moneyShort }) {
  const [activeIndex, setActiveIndex] = React.useState(null);
  const active = activeIndex == null ? null : points[activeIndex];
  const config = {
    lower: { label: 'Payment sensitivity', color: 'var(--flow-in)' },
    band: { label: 'Payment sensitivity', color: 'var(--flow-in)' },
    solid: { label: 'Balance', color: 'var(--fg)' },
    dashed: { label: 'Projected balance', color: 'var(--fg)' },
  };
  const detail = (point) => [
    `Month ${point.month}`,
    `Balance: ${money(point.balance)}`,
    `Payment -15%: ${money(point.upper)}`,
    `Payment +15%: ${money(point.lower)}`,
  ];

  return (
    <>
      <div className="fc-chart-wrap payoff-chart" data-proportional="" role="group" aria-label={clears != null ? `Projected card balance falling to zero over about ${clears} months at your recent payment, with a band for how that shifts if the payment changes.` : `Projected card balance at your recent payment, barely moving over the next ${win} months.`}>
        <ChartContainer config={config} className="fc-payoff-chart !aspect-auto" style={{ height: 220 }}>
          <AreaChart data={points} margin={{ top: 12, right: 10, bottom: 16, left: 60 }}>
            <CartesianGrid vertical={false} stroke="var(--dim)" strokeOpacity={0.14} />
            <XAxis type="number" dataKey="month" domain={[0, win]} ticks={[0, Math.round(win / 2), win]} tickFormatter={(month) => month === 0 ? 'Now' : `${month} mo`} />
            <YAxis type="number" domain={[0, maxBalance]} ticks={[0, maxBalance / 2, maxBalance]} tickFormatter={moneyShort} />
            <Tooltip content={() => null} />
            <Area dataKey="lower" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="band" stackId="band" stroke="none" fill="var(--flow-in)" fillOpacity={0.16} isAnimationActive animationDuration={520} />
            <ReferenceLine x={Math.max(1, Math.min(6, win))} stroke="var(--dim)" strokeDasharray="3 4" />
            <Line dataKey="solid" type="linear" stroke="var(--fg)" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive animationDuration={650} />
            <Line dataKey="dashed" type="linear" stroke="var(--fg)" strokeWidth={2.5} strokeDasharray="5 4" dot={false} connectNulls={false} animationBegin={350} isAnimationActive animationDuration={300} />
            {clears != null && clears <= win ? <ReferenceDot x={clears} y={0} r={4} fill="var(--fg)" stroke="var(--fg)" /> : null}
          </AreaChart>
        </ChartContainer>
        <div className="fc-targets" role="group" aria-label="Monthly payoff projection">
          {points.map((point, index) => (
            <button
              key={point.month}
              type="button"
              className="fc-day-target"
              style={{ left: `${10 + (Math.max(0, point.month - 0.5) / win) * 88.333}%`, width: `${(88.333 / win) * (point.month === 0 || point.month === win ? 0.5 : 1)}%` }}
              aria-label={detail(point).join('. ')}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onKeyDown={(event) => {
                let next = null;
                if (event.key === 'ArrowRight') next = (index + 1) % points.length;
                if (event.key === 'ArrowLeft') next = (index + points.length - 1) % points.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = points.length - 1;
                if (next != null) {
                  event.preventDefault();
                  event.currentTarget.parentElement.children[next]?.focus();
                }
              }}
            />
          ))}
        </div>
        {active ? <div className="chart-tooltip fc-payoff-tooltip" role="tooltip">{detail(active).map((line, index) => <div key={index}>{line}</div>)}</div> : null}
      </div>
      <div className="chart-legend">
        <span>{clears != null ? `At the ${money(payment)} a month you have been paying: $0 in about ${clears} months` : `At the ${money(payment)} a month you have been paying, a balance remains after ${win} months`}</span>
        <span><PfaInfoPopover label="If you paid 15% more or less" content="The shaded area is where the balance would land if you paid 15% more or less each month than you have been. After month 6 the line is dashed because it is less certain. No new purchases are assumed." /></span>
      </div>
    </>
  );
}
