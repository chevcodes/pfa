import { privateViewOn, markProportional } from '../core/privacy.js';
import { proportionShares } from './chart-helpers.js';
import { markScrollAffordance } from '../core/shared-helpers.js';
import { columnChartReact, proportionBarReact } from './react-bridge.js';

let sequence = 0;

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

export function renderColumnChart(ctx, spec) {
  const chart = columnChartReact({ ...ctx, monthShort: ctx.monthShort }, spec);
  const scroll = chart && chart.querySelector('.chart-scroll');
  if (scroll) markScrollAffordance(scroll);
  return chart;
}

export function renderProportionBar(ctx, spec) {
  const { bands, total, shareOf } = proportionShares(spec.bands);
  if (!bands.length || total <= 0) return null;
  return proportionBarReact(ctx, spec, { bands, total, shareOf });
}
