import * as React from 'react';
import { Treemap } from 'recharts';
import { ChartContainer } from './ui/chart.jsx';
import { wrapTreemapLabel } from '../../application/ui/treemap-labels.js';

function inkFor(hex) {
  const raw = String(hex || '').replace('#', '');
  const value = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw;
  if (value.length < 6) return '#fff';
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  const linear = [r, g, b].map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return luminance > 0.179 ? '#17202b' : '#fff';
}

export function PfaTreemapChart({ categories, onCategory, activeCategory, onActiveCategory, money, showTooltip = true, showValues = true }) {
  const [active, setActive] = React.useState(null);
  const clipPrefix = React.useId().replaceAll(':', '');
  const data = categories.map((category) => ({ ...category, value: category.amount }));
  const byName = new Map(categories.map((category) => [category.name, category]));
  const content = (node) => {
    const item = byName.get(node.name);
    if (!item || node.width < 1 || node.height < 1) return <g />;
    const share = `${item.share.toFixed(1)}% of spending`;
    const displayName = item.displayName || item.name;
    const detail = [displayName, money(item.amount), share, item.comparison, item.merchants].filter(Boolean).join('. ');
    const padding = Math.min(18, Math.max(7, node.width * 0.04));
    const innerWidth = node.width - padding * 2;
    const shortName = displayName.split(/[\s&]+/)[0];
    const label = wrapTreemapLabel(displayName, node.width, node.height, padding) || wrapTreemapLabel(shortName, node.width, node.height, padding);
    const showLabel = Boolean(label);
    const labelFontSize = label?.fontSize || 11;
    const labelLineHeight = label?.lineHeight || 16;
    const labelY = node.y + padding + labelFontSize;
    const valueY = labelY + labelLineHeight * (label?.lines.length || 1);
    const availableHeight = node.y + node.height - padding;
    const showValue = showValues && showLabel && node.width >= 84 && money(item.amount).length * 13 * 0.64 <= node.width - padding * 2 && valueY + 13 <= availableHeight;
    const showShare = showValues && showValue && node.width >= 100 && share.length * 12 * 0.64 <= node.width - padding * 2 && valueY + 29 <= availableHeight;
    const clipId = `${clipPrefix}-tile-${node.index}`;
    return (
      <g
        className="tm-tile is-interactive"
        id={`activity-tile-${encodeURIComponent(item.name)}`}
        role="button"
        tabIndex={0}
        aria-label={detail}
        data-category-index={node.index}
        data-active={activeCategory === item.name ? 'true' : 'false'}
        onPointerEnter={() => { setActive(detail); onActiveCategory?.(item.name); }}
        onPointerLeave={() => { setActive(null); onActiveCategory?.(null); }}
        onFocus={() => { setActive(detail); onActiveCategory?.(item.name); }}
        onBlur={() => { setActive(null); onActiveCategory?.(null); }}
        onClick={() => onCategory(item.name)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCategory(item.name);
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const items = [...event.currentTarget.ownerSVGElement.querySelectorAll('[data-category-index]')];
            const current = items.indexOf(event.currentTarget);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }
        }}
      >
        <title>{detail}</title>
        <defs><clipPath id={clipId}><rect x={node.x + padding} y={node.y + padding} width={Math.max(0, innerWidth)} height={Math.max(0, node.height - padding * 2)} /></clipPath></defs>
        <rect className="tm-rect" x={node.x} y={node.y} width={node.width} height={node.height} rx={6} fill={item.fill} />
        {showLabel ? (
          <text className="tm-label" x={node.x + padding} y={labelY} fill={item.ink} fontSize={labelFontSize} clipPath={`url(#${clipId})`}>
            {label.lines.map((line, index) => <tspan key={index} x={node.x + padding} dy={index ? labelLineHeight : 0}>{line}</tspan>)}
          </text>
        ) : null}
        {showValue ? <text className="tm-value" x={node.x + padding} y={valueY} fill={item.ink} fontSize={13} clipPath={`url(#${clipId})`}>{money(item.amount)}</text> : null}
        {showShare ? <text className="tm-share" x={node.x + padding} y={valueY + 16} fill={item.ink} fontSize={12} clipPath={`url(#${clipId})`}>{share}</text> : null}
      </g>
    );
  };
  const config = Object.fromEntries(categories.map((item, index) => [`category${index}`, { label: item.name, color: item.fill }]));

  return (
    <div className="tm-react-chart" role="group" aria-label="Spending by category, area shows amount">
      <ChartContainer config={config} className="tm-svg !aspect-auto" style={{ height: '100%' }}>
        <Treemap data={data} dataKey="value" nameKey="name" content={content} aspectRatio={1.618} nodeGap={8} isAnimationActive animationDuration={320} />
      </ChartContainer>
      {showTooltip && active ? <div className="chart-tooltip tm-react-tooltip" role="tooltip">{active.split('. ').map((line, index) => <div key={index}>{line}</div>)}</div> : null}
    </div>
  );
}
