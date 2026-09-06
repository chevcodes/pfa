import { privateViewOn, markProportional, prefixFromSample } from '../core/privacy.js';
import { makeMoneyShort } from '../core/money-format.js';
import { chartIsHidden, renderHiddenChart } from './chart-helpers.js';
import { growIn, staggerIn, drawPath } from './motion.js';

let sequence = 0;

export function chartSvg(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, String(value));
  }
  return node;
}

export function chartTooltip(el, container) {
  const tip = el('div', { class: 'chart-tooltip', role: 'tooltip', id: `chart-tip-${++sequence}`, hidden: '' });
  container.append(tip);
  const hide = () => { tip.hidden = true; };
  function bind(target, content) {
    const show = () => {
      if (privateViewOn() || typeof container.getBoundingClientRect !== 'function') { hide(); return; }
      tip.textContent = '';
      const rows = typeof content === 'function' ? content() : content;
      for (const row of rows) tip.append(el('div', {}, row));
      tip.hidden = false;
      const box = container.getBoundingClientRect();
      const anchor = target.getBoundingClientRect();
      const left = anchor.left - box.left + anchor.width / 2 - tip.offsetWidth / 2;
      const top = anchor.top - box.top - tip.offsetHeight - 8;
      tip.style.left = `${Math.max(0, Math.min(box.width - tip.offsetWidth, left))}px`;
      tip.style.top = `${Math.max(0, top)}px`;
    };
    target.setAttribute('aria-describedby', tip.id || tip.attrs?.id || '');
    target.addEventListener('pointerenter', show);
    target.addEventListener('pointerleave', hide);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
    target.addEventListener('click', show);
    target.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); hide(); }
    });
  }
  return { bind, hide };
}

/*
 * A ring for a genuine PART-TO-WHOLE: a handful of segments that provably sum
 * to one meaningful total. Deliberately not offered for composition in
 * general - ranking many categories is what the treemap and the ranked bars
 * are for, and a ring with eight slices answers neither "how big" nor "which
 * is bigger". Segment ARC LENGTH encodes an amount, so the whole thing is
 * withdrawn in private view like every other chart.
 *
 * spec: { label, total, segments: [{ key, label, amount, tone }], centre: { value, label } }
 */
export function renderDonutChart(ctx, spec) {
  const { el } = ctx;
  if (chartIsHidden()) return renderHiddenChart(el, spec.label, { height: '190px' });
  const money = spec.money || ctx.money0 || makeMoneyShort();
  const segments = (spec.segments || []).filter((s) => Number(s.amount) > 0);
  const total = Number(spec.total) || segments.reduce((sum, s) => sum + Number(s.amount), 0);
  if (!segments.length || total <= 0) return null;

  const R = 40;
  const CIRC = 2 * Math.PI * R;
  const root = markProportional(
    el('div', { class: 'donut', role: 'group', 'aria-label': spec.label })
  );
  const tips = chartTooltip(el, root);
  const figure = el('div', { class: 'donut-figure' });
  const svg = chartSvg('svg', {
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'xMidYMid meet',
    class: 'donut-svg',
    'aria-hidden': 'true',
  });
  svg.append(chartSvg('circle', { cx: 50, cy: 50, r: R, class: 'donut-track' }));

  const arcs = [];
  let cumulative = 0;
  for (const s of segments) {
    const fraction = Number(s.amount) / total;
    const arc = chartSvg('circle', {
      cx: 50,
      cy: 50,
      r: R,
      class: `donut-arc is-${s.tone || 'neutral'}`,
      // An explicit colour wins over the tone class, so a ring of identity
      // colours (categories, places) can use the same component as a ring of
      // money-direction tones.
      ...(s.colour ? { stroke: s.colour } : {}),
      'stroke-dasharray': `${fraction * CIRC} ${CIRC}`,
      'stroke-dashoffset': -cumulative * CIRC,
      transform: 'rotate(-90 50 50)',
    });
    svg.append(arc);
    arcs.push({ arc, length: fraction * CIRC, offset: -cumulative * CIRC });
    cumulative += fraction;
  }
  figure.append(svg);

  if (spec.centre) {
    figure.append(
      el(
        'div',
        { class: 'donut-centre', 'aria-hidden': 'true' },
        el('span', { class: 'donut-centre-value money' }, spec.centre.value),
        el('span', { class: 'donut-centre-label' }, spec.centre.label)
      )
    );
  }
  root.append(figure);

  // The legend is the readable half of this chart: the ring shows the split,
  // the legend names it and prints the figure, so nothing here depends on
  // telling two colours apart.
  const legend = el('div', { class: 'donut-legend' });
  for (const s of segments) {
    const share = Math.round((Number(s.amount) / total) * 100);
    const detail = [s.label, money(s.amount), `${share}% of ${money(total)}`];
    // Not a button: it performs no action, and putting an inert control in
    // the tab order promises one. It is a described row that can still take
    // focus to reach its own tooltip.
    const row = el(
      'div',
      { class: 'donut-legend-row', tabindex: '0', role: 'img', 'aria-label': detail.join('. ') },
      el('i', {
        class: `donut-key is-${s.tone || 'neutral'}`,
        'aria-hidden': 'true',
        ...(s.colour ? { style: `background:${s.colour}` } : {}),
      }),
      el('span', { class: 'donut-legend-label' }, s.label),
      el('span', { class: 'donut-legend-amt num' }, money(s.amount))
    );
    tips.bind(row, detail);
    legend.append(row);
  }
  root.append(legend);

  // Each arc sweeps into its own place in sequence, so the ring assembles in
  // the order the money is actually accounted for. The dash OFFSET is what
  // moves (an allowed, purely visual property); the dash ARRAY that defines
  // each segment's share is set once and never animated, so no frame of this
  // can ever show a segment at the wrong size.
  let delay = 0;
  for (const { arc, length, offset } of arcs) {
    growIn(arc, { strokeDashoffset: offset + length }, { strokeDashoffset: offset }, {
      duration: 520,
      delay,
    });
    delay += 130;
  }
  // The container itself is NOT faded in. Fading the whole block left a
  // card-sized hole on every re-render (a filter change, a period switch)
  // before anything appeared, which reads as a loading fault rather than as
  // motion. The arcs carry the entrance; the layout is there from frame one.
  return root;
}

export function renderColumnChart(ctx, spec) {
  const { el } = ctx;
  if (chartIsHidden()) return renderHiddenChart(el, spec.label, { height: '220px' });
  const money = spec.money || ctx.money0 || makeMoneyShort();
  const axisMoney = spec.axisMoney || ctx.moneyShort || makeMoneyShort({ symbol: prefixFromSample(money(0)) });
  const rows = spec.rows || [];
  const series = spec.series || [];
  const values = rows.flatMap((row) => series.map((s) => Number(row[s.key]) * (s.sign || 1))).filter(Number.isFinite);
  if (spec.net) values.push(...rows.map((row) => Number(row.net) || 0));
  if (spec.guide != null) values.push(spec.guide);
  const maximum = Math.max(0, ...values);
  const minimum = Math.min(0, ...values);
  const extent = Math.max(maximum, -minimum, 1);
  const top = spec.max ?? (minimum < 0 ? extent * 1.08 : Math.max(1, maximum * 1.08));
  const bottom = spec.min ?? (minimum < 0 ? -extent * 1.08 : 0);
  const span = top - bottom || 1;
  const y = (value) => 240 - ((value - bottom) / span) * 240;
  const root = markProportional(el('div', { class: `chart-surface ${spec.className || ''}`, role: 'group', 'aria-label': spec.label }));
  const scroll = el('div', { class: 'chart-scroll' });
  const canvas = el('div', { class: 'chart-canvas', style: `min-width:${Math.max(260, rows.length * 42 + 64)}px` });
  const plot = el('div', { class: 'chart-plot' });
  const svg = chartSvg('svg', { viewBox: '0 0 1000 240', preserveAspectRatio: 'none', class: 'chart-svg', 'aria-hidden': 'true' });
  const axis = el('div', { class: 'chart-axis', 'aria-hidden': 'true' });
  for (let i = 0; i <= 4; i++) {
    const value = top - (span * i) / 4;
    svg.append(chartSvg('line', { x1: 0, x2: 1000, y1: i * 60, y2: i * 60, class: 'chart-grid' }));
    axis.append(el('span', { style: `top:${i * 25}%` }, axisMoney(value)));
  }
  if (bottom <= 0 && top >= 0) svg.append(chartSvg('line', { x1: 0, x2: 1000, y1: y(0), y2: y(0), class: 'chart-zero' }));
  const defs = chartSvg('defs');
  const id = `chart-${++sequence}`;
  for (const s of series) {
    const gradient = chartSvg('linearGradient', { id: `${id}-${s.key}`, x1: '0%', x2: '0%', y1: s.sign === -1 ? '100%' : '0%', y2: s.sign === -1 ? '0%' : '100%' });
    // Shared chart ink (--chart-in / --chart-out, premium.css) - the same
    // tokens the donut and the account bars fill with, so one direction is
    // one colour across every chart in the app.
    const ink = `var(--chart-${s.tone || 'in'})`;
    gradient.append(chartSvg('stop', { offset: '0%', 'stop-color': ink, 'stop-opacity': 1 }));
    gradient.append(chartSvg('stop', { offset: '100%', 'stop-color': ink, 'stop-opacity': 0.4 }));
    defs.append(gradient);
  }
  svg.append(defs);
  const colWidth = 1000 / Math.max(1, rows.length);
  const barWidth = Math.min(70, colWidth * 0.58) / Math.max(1, series.length);
  const bars = [];
  const hitLayer = el('div', { class: 'chart-targets' });
  const months = el('div', { class: 'chart-months', 'aria-hidden': 'true' });
  const tips = chartTooltip(el, root);
  const points = [];
  const targets = [];
  rows.forEach((row, index) => {
    const cx = colWidth * (index + 0.5);
    for (let j = 0; j < series.length; j++) {
      const s = series[j];
      const value = row[s.key];
      if (value == null || row.present === false) continue;
      const plotted = Number(value) * (s.sign || 1);
      if (spec.mode === 'line') {
        const dot = chartSvg('circle', { cx, cy: y(plotted), r: 4, class: 'chart-dot' });
        svg.append(dot);
        points.push({ x: cx, y: y(plotted), index });
      } else {
        const baseline = y(0);
        const rect = chartSvg('rect', {
          x: cx + (j - series.length / 2) * (barWidth + 3),
          y: Math.min(baseline, y(plotted)), width: barWidth,
          height: Math.abs(baseline - y(plotted)), rx: 5,
          class: `chart-bar ${plotted < 0 ? 'is-negative' : ''}${row.incomplete ? ' is-incomplete' : ''}`,
          fill: `url(#${id}-${s.key})`,
        });
        svg.append(rect);
        bars.push(rect);
      }
    }
    const name = ctx.monthLabel ? ctx.monthLabel(row.month) : row.month;
    const detail = [name, ...series.map((s) => `${s.label}: ${row.present === false || row[s.key] == null ? 'No deposit found' : money(row[s.key])}`)];
    if (spec.net) detail.push(`${row.net < 0 ? 'Shortfall' : 'Net cash'}: ${money(row.net)}`);
    if (row.detail) detail.push(row.detail);
    if (row.incomplete) detail.push('Partial month');
    const target = el('button', {
      type: 'button', class: 'chart-target' + (row.selected ? ' is-selected' : '') + (row.inPeriod ? ' in-period' : ''),
      'aria-label': detail.join('. '), ...(spec.onSelect ? { 'aria-pressed': row.selected ? 'true' : 'false' } : {}),
      style: `left:${index / rows.length * 100}%;width:${100 / rows.length}%`,
    });
    tips.bind(target, detail);
    if (spec.onInspect) {
      target.addEventListener('pointerenter', () => spec.onInspect(row, index));
      target.addEventListener('focus', () => spec.onInspect(row, index));
    }
    if (spec.onSelect) target.addEventListener('click', () => { if (!privateViewOn()) spec.onSelect(row); });
    target.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % rows.length;
      if (event.key === 'ArrowLeft') next = (index + rows.length - 1) % rows.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = rows.length - 1;
      if (next != null) { event.preventDefault(); targets[next].focus(); }
    });
    targets.push(target);
    hitLayer.append(target);
    const short = ctx.monthShort ? ctx.monthShort(row.month) : name;
    months.append(el('span', { class: row.present === false ? 'is-missing' : '', title: name }, short));
    if (row.present === false) svg.append(chartSvg('line', { x1: cx - 10, x2: cx + 10, y1: 236, y2: 236, class: 'chart-missing' }));
  });
  if (spec.net) {
    rows.forEach((row, index) => points.push({ x: colWidth * (index + 0.5), y: y(row.net), index }));
  }
  if (points.length) {
    const path = chartSvg('path', { d: points.map((p, i) => `${i === 0 || p.index !== points[i - 1].index + 1 ? 'M' : 'L'}${p.x},${p.y}`).join(' '), class: 'chart-net-line' });
    svg.append(path);
    const length = points.reduce((sum, p, i) => i && p.index === points[i - 1].index + 1 ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : sum, 0);
    drawPath(path, length);
    for (const p of points) svg.append(chartSvg('circle', { cx: p.x, cy: p.y, r: 4, class: 'chart-dot' }));
  }
  if (spec.guide != null && spec.guide >= bottom && spec.guide <= top) {
    const guideY = y(spec.guide);
    svg.append(chartSvg('line', { x1: 0, x2: 1000, y1: guideY, y2: guideY, class: 'chart-guide-line' }));
    plot.append(el('span', { class: 'chart-guide', style: `top:${guideY / 240 * 100}%` }, `Typical ${axisMoney(spec.guide)}`));
  }
  plot.append(svg, hitLayer);
  canvas.append(axis, plot, months);
  scroll.append(canvas);
  scroll.addEventListener('scroll', tips.hide);
  root.append(scroll);
  const legend = el('div', { class: 'chart-legend' });
  for (const s of series) legend.append(el('span', {}, el('i', { class: `chart-key is-${s.tone || 'in'}`, 'aria-hidden': 'true' }), s.label));
  if (spec.net) legend.append(el('span', {}, el('i', { class: 'chart-key is-net', 'aria-hidden': 'true' }), 'Net cash'));
  if (rows.some((row) => row.present === false)) legend.append(el('span', {}, '– No deposit'));
  if (rows.some((row) => row.incomplete)) legend.append(el('span', {}, '⋯ Partial month'));
  if (!spec.hideLegend) root.append(legend);
  staggerIn(bars, () => [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { step: 14, duration: 420 });
  growIn(root, { opacity: 0 }, { opacity: 1 }, { duration: 180 });
  return root;
}
