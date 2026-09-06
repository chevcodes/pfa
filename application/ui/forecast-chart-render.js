import { requireCtx, isPrivacyMode } from '../core/shared-helpers.js';
import { makeMoneyShort } from '../core/money-format.js';
import { createDecisionHeader, chartInfo } from './decision-header.js';
import { chartIsHidden, renderHiddenChart } from './chart-helpers.js';
import { buildForecastChartModel } from '../analysis/forecast-chart-model.js';
import { drawPath, growIn } from './motion.js';
import { chartTooltip } from './chart-surface.js';
import { markProportional, privateViewOn } from '../core/privacy.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function createForecastChartRenderer(ctx) {
  requireCtx(ctx, ['el', 'provenModels'], 'createForecastChartRenderer');
  const { el, provenModels } = ctx;
  const bankMoney = ctx.bankMoney || ctx.money0 || ((n) => String(Math.round(Number(n) || 0)));
  const money0 = ctx.money0 || bankMoney;
  const axisMoney = ctx.moneyShort || makeMoneyShort({}, { millionDecimals: 2 });
  const r2FC = (n) => Math.round(Number(n || 0) * 100) / 100;
  const onEventClick = ctx.onEventClick || null;
  const { renderDecisionHeader } = createDecisionHeader({ el });

  function svg(tag, attrs = {}, ...kids) {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, String(v));
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.appendChild(kid);
    return n;
  }
  const ptStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  function renderChart(model) {
    const { view, line, cone, trough } = model;
    const root = svg('svg', {
      viewBox: `0 0 ${view.w} ${view.h}`,
      class: 'fc-chart',
      role: 'img',
      preserveAspectRatio: 'none',
      'aria-label': isPrivacyMode()
        ? `Cash forecast over ${model.domain.horizonDays} days. Amount hidden while privacy mode is on.`
        : `Cash forecast over ${model.domain.horizonDays} days.`,
    });

    const floorY = view.h - view.padB;
    for (const tick of model.yTicks) {
      root.appendChild(svg('line', { x1: view.padL, x2: view.w - view.padR, y1: tick.y, y2: tick.y, class: 'fc-grid' }));
    }
    if (model.zones.endingWide) {
      root.appendChild(svg('line', { x1: model.zones.firmUntilX, x2: model.zones.firmUntilX, y1: view.padT, y2: floorY, class: 'fc-divider' }));
    }


    if (cone.bandAtEnd > 0) {
      const poly = cone.upper.concat(cone.lower.slice().reverse());
      root.appendChild(svg('polygon', { points: ptStr(poly), class: 'fc-band' }));
    }

    const areaPts = line.concat([
      { x: line[line.length - 1].x, y: floorY },
      { x: line[0].x, y: floorY },
    ]);
    root.appendChild(svg('polygon', { points: ptStr(areaPts), class: 'fc-area' }));

    const lineEl = svg('polyline', {
      points: ptStr(line),
      class: 'fc-line',
      fill: 'none',
      'vector-effect': 'non-scaling-stroke',
    });
    root.appendChild(lineEl);

    const troughToneClass =
      model.safety && model.safety.asserts
        ? 'fc-trough-' + (trough.belowFloor ? 'warn' : 'firm')
        : 'fc-trough-' + trough.reliability;
    const troughEl = svg('circle', {
      cx: trough.x,
      cy: trough.y,
      r: 4,
      class: 'fc-trough ' + troughToneClass,
      'vector-effect': 'non-scaling-stroke',
    });
    root.appendChild(troughEl);

    const approxLen = line.reduce(
      (sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - line[i - 1].x, p.y - line[i - 1].y)),
      0
    );
    drawPath(lineEl, approxLen, { duration: 900 });
    growIn(troughEl, { opacity: 0 }, { opacity: 1 }, { duration: 260, delay: 760 });

    for (const [events, kind] of [[model.recordedEvents, 'recorded'], [model.estimatedEvents, 'estimated']]) {
      for (const event of events) {
        root.appendChild(svg('circle', { cx: event.x, cy: event.y, r: 5, class: `fc-ev fc-ev-${event.direction} fc-ev-${kind}`, 'vector-effect': 'non-scaling-stroke' }));
      }
    }
    return root;
  }

  function buildOverlay(model) {
    const { view, xTicks, yTicks, trough, recordedEvents, estimatedEvents } = model;
    const pctX = (x) => r2FC((x / view.w) * 100);
    const pctY = (y) => r2FC((y / view.h) * 100);
    const overlay = el('div', { class: 'fc-overlay', 'aria-hidden': 'true' });

    for (const t of yTicks) {
      overlay.append(
        el(
          'span',
          {
            class: 'fc-label fc-axis-money money anchor-start',
            style: `left:${pctX(view.padL + 2)}%; top:${pctY(t.y)}%;`,
          },
          axisMoney(t.value)
        )
      );
    }

    for (const t of xTicks) {
      const anchor = t.day <= 0 ? 'start' : t.x > view.w - view.padR - 1 ? 'end' : 'mid';
      overlay.append(
        el(
          'span',
          {
            class: `fc-label fc-axis-date anchor-${anchor}`,
            style: `left:${pctX(t.x)}%; top:${pctY(view.h - 6)}%;`,
          },
          shortDate(t.date)
        )
      );
    }

    const EVENT_LABEL_MIN_GAP = 40;
    let lastLabelX = -Infinity;
    function appendEventLabel(e, dashed) {
      if (e.x - lastLabelX < EVENT_LABEL_MIN_GAP) return;
      lastLabelX = e.x;
      const anchor = e.x > view.w - view.padR - 60 ? 'end' : 'start';
      overlay.append(
        el(
          'span',
          {
            class: `fc-label fc-ev-label${dashed ? ' fc-ev-label-estimated' : ''} anchor-${anchor}`,
            style: `left:${pctX(e.x + (anchor === 'end' ? -6 : 6))}%; top:${pctY(e.y - 10)}%;`,
          },
          e.label || ''
        )
      );
    }
    for (const e of recordedEvents) appendEventLabel(e, false);
    for (const e of estimatedEvents) appendEventLabel(e, true);

    const troughAnchor = trough.x < view.padL + 90 ? 'start' : 'end';
    overlay.append(
      el(
        'span',
        {
          class: `fc-label fc-trough-label money anchor-${troughAnchor}`,
          style: `left:${pctX(trough.x + (troughAnchor === 'end' ? -8 : 8))}%; top:${pctY(trough.y - 10)}%;`,
        },
        'Lowest: ' + bankMoney(trough.balance)
      )
    );

    return overlay;
  }

  function interactiveChart(model, forecast) {
    const wrap = markProportional(el('div', { class: 'fc-chart-wrap' }, renderChart(model), buildOverlay(model)));
    const tips = chartTooltip(el, wrap);
    const targets = el('div', { class: 'fc-targets', role: 'group', 'aria-label': 'Daily projected balances' });
    const buttons = [];
    model.line.forEach((point, index) => {
      const day = forecast.path[index];
      const previous = model.line[index - 1];
      const next = model.line[index + 1];
      const left = previous ? (previous.x + point.x) / 2 : model.view.padL;
      const right = next ? (next.x + point.x) / 2 : model.view.w - model.view.padR;
      const detail = [shortDate(day.date), `Projected: ${bankMoney(day.balance)}`];
      const events = (forecast.events || []).filter((event) => event.date === day.date);
      for (const event of events) detail.push(`${event.kind === 'recorded' ? 'Recorded' : 'Estimated'}: ${event.label || event.type} ${bankMoney(event.amount)}`);
      const button = el('button', { type: 'button', class: 'fc-day-target', style: `left:${left / model.view.w * 100}%;width:${(right - left) / model.view.w * 100}%`, 'aria-label': detail.join('. ') });
      tips.bind(button, detail);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length].focus();
        }
      });
      buttons.push(button);
      targets.append(button);
    });
    wrap.append(targets);
    for (const event of [...model.recordedEvents, ...model.estimatedEvents]) {
      if (!onEventClick || !event.key) continue;
      const button = el('button', { type: 'button', class: 'fc-event-target', style: `left:${event.x / model.view.w * 100}%;top:${Math.max(5, Math.min(90, event.y / model.view.h * 100))}%`, 'aria-label': `${event.label}: matching transactions` }, '↗');
      button.addEventListener('click', () => { if (!privateViewOn()) onEventClick(event); });
      tips.bind(button, [event.label, shortDate(event.date), 'Open matching transactions']);
      wrap.append(button);
    }
    growIn(wrap, { opacity: 0 }, { opacity: 1 }, { duration: 220 });
    return wrap;
  }

  function shortDate(iso) {
    const m = +String(iso || '').slice(5, 7),
      d = +String(iso || '').slice(8, 10);
    const MON = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return m ? `${d} ${MON[m]}` : '';
  }

  function renderForecastChart(horizonDays = 30, safetyBoundary = null) {
    const fc = provenModels.forecast(horizonDays);

    const model = buildForecastChartModel(fc);
    model.safety = safetyBoundary;
    const lowMid = fc.low.balance;
    model.trough.balance = lowMid;
    model.trough.belowFloor =
      safetyBoundary && safetyBoundary.asserts && safetyBoundary.floor != null
        ? lowMid < safetyBoundary.floor
        : false;

    const deltaFromToday = r2FC(lowMid - fc.startingBalance);
    const deltaTone = deltaFromToday < 0 ? 'watch' : 'good';
    const deltaText =
      deltaFromToday === 0
        ? 'Unchanged from today'
        : `${deltaFromToday < 0 ? 'down' : 'up'} ${money0(Math.abs(deltaFromToday))} from today`;

    const tags = [{ text: deltaText, tone: deltaTone }];

    const endBalance =
      fc.path && fc.path.length ? fc.path[fc.path.length - 1].balance : fc.startingBalance;
    const endDate = fc.path && fc.path.length ? fc.path[fc.path.length - 1].date : null;
    const netOverWindow = r2FC(endBalance - fc.startingBalance);
    const recoveryLine =
      netOverWindow > 0 && endDate
        ? `End: ${bankMoney(endBalance)} · ${shortDate(endDate)}`
        : null;

    const accuracy = provenModels.accuracyFor ? provenModels.accuracyFor(horizonDays) : null;
    if (accuracy && accuracy.state === 'scored') {
      tags.push({ text: `forecast ${accuracy.tag}`, tone: accuracy.tone || 'neutral' });
    }

    let safetyExplain = null;
    if (safetyBoundary) {
      if (safetyBoundary.asserts && safetyBoundary.floor != null) {
        const clears = !model.trough.belowFloor;
        tags.push({
          text: clears
            ? `Above safe line ${bankMoney(safetyBoundary.floor)}`
            : `Below safe line ${bankMoney(safetyBoundary.floor)}`,
          tone: clears ? 'good' : 'watch',
        });
      } else if (safetyBoundary.explain) {
        safetyExplain = safetyBoundary.explain;
      }
    }

    const why = [];
    if (safetyExplain) why.push(el('p', {}, safetyExplain));
    if (accuracy && accuracy.state === 'scored' && accuracy.detail) {
      why.push(el('p', {}, accuracy.detail));
    }
    if (model.zones.endingWide && model.presentation.note) {
      why.push(el('p', {}, model.presentation.note));
    }

    const evidence = el('div', { class: 'dh-evidence' });
    if (chartIsHidden()) {
      evidence.append(renderHiddenChart(el, 'Cash forecast', { height: '240px' }));
    } else {
      evidence.append(interactiveChart(model, fc));
      evidence.append(
        el(
          'div',
          { class: 'fc-legend muted small' },
          el(
            'span',
            { class: 'fc-legend-item' },
            el('span', { class: 'fc-key fc-key-area' }),
            ' projected balance'
          ),
          el(
            'span',
            { class: 'fc-legend-item' },
            el('span', { class: 'fc-key fc-key-band' }),
            ' range of likely values'
          )
        )
      );
    }

    if (why.length) evidence.append(chartInfo(el, 'Forecast details', why));
    return renderDecisionHeader({
      id: 'forecast-header',
      class: 'view-forecast',
      question: 'How low does my cash get?',
      figure: { text: bankMoney(lowMid) },
      meaning: `Low · ${shortDate(fc.low.date)}`,
      tags,
      note: recoveryLine ? { text: recoveryLine, tone: 'good' } : null,
      extra: evidence,
    });
  }

  return { renderForecastChart };
}
