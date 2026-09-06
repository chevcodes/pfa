import * as React from 'react';
import { markScrollAffordance } from '../../application/core/shared-helpers.js';
import { PfaColumnChart } from './pfa-column-chart.jsx';

export function PfaFlowChart({ ctx, rows, reference, range, scope, net, totals, monthShort, onSelect }) {
  const [activeIndex, setActiveIndex] = React.useState(null);
  const panelRefs = React.useRef([]);
  const incomplete = rows.some((row) => row.recorded);
  const panels = [
    { key: 'income', label: 'Cash inflow', tone: 'in', total: totals.income, recorded: rows.some((row) => row.income == null || row.incomeIncomplete) },
    { key: 'spending', label: 'Cash outflow', tone: 'out', total: totals.spending, recorded: rows.some((row) => row.spending == null || row.spendingIncomplete) },
  ];

  React.useEffect(() => {
    const observers = panelRefs.current.filter(Boolean).map((node) => {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) entry.target.classList.toggle('is-clipped', entry.intersectionRatio < 0.999);
      }, { root: node, threshold: [0, 1] });
      node.querySelectorAll('.chart-months > span').forEach((label) => observer.observe(label));
      return observer;
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [rows]);

  const syncScroll = (index, scrollLeft) => {
    for (let other = 0; other < panelRefs.current.length; other++) {
      const target = panelRefs.current[other];
      if (other !== index && target && target.scrollLeft !== scrollLeft) target.scrollLeft = scrollLeft;
    }
  };

  return (
    <div className="fl-chart" role="group" aria-label="Cash movement">
      <div className="fl-panels">
        {panels.map((panel, panelIndex) => {
          const comparedRows = rows.map((row, index) => ({
            ...row,
            present: row[panel.key] != null,
            incomplete: panel.key === 'income' ? row.incomeIncomplete : row.spendingIncomplete,
            incompleteText: panel.key === 'income' ? row.incomeIssue : row.spendingIssue,
            missingText: panel.key === 'income' ? row.incomeIssue : row.spendingIssue,
            detail: row[panel.key] == null ? null : row.detail,
            compared: activeIndex === index,
          }));
          const ctxWithTick = { ...ctx, monthShort };
          const spec = {
            label: panel.label,
            rows: comparedRows,
            money: ctx.bankMoney,
            min: 0,
            max: reference,
            series: [{ key: panel.key, label: panel.label, tone: panel.tone }],
            missingText: 'No statements for this month',
            targetIdPrefix: `overview-flow-${panel.key}`,
            hideLegend: true,
            onInspect: (_row, index) => setActiveIndex(index),
            onSelect: (row, event) => onSelect(row, panel.key, event),
          };
          return (
            <section className="fl-panel" key={panel.key}>
              <div className="fl-panel-head">
                <h4><i className={`chart-key is-${panel.tone}`} aria-hidden="true" />{panel.label}</h4>
                <span className="num">{panel.recorded ? <span className="muted small">Recorded </span> : null}{ctx.bankMoney(panel.total)}</span>
              </div>
              <div className="chart-surface">
                <div className="chart-scroll" ref={(node) => { panelRefs.current[panelIndex] = node; markScrollAffordance(node, true); }} onScroll={(event) => syncScroll(panelIndex, event.currentTarget.scrollLeft)}>
                  <PfaColumnChart ctx={ctxWithTick} spec={spec} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div className="fl-summary">
        <span className="muted small">{range}</span>
        {scope ? <span className="muted small">{scope}</span> : null}
        {rows.some((row) => row.income === 0 || row.spending === 0) ? <span className="muted small">• Recorded $0</span> : null}
        {incomplete ? <span className="muted small">⋯ Some records incomplete</span> : null}
        <span className={net < 0 ? 'fl-net is-short' : 'fl-net'}>{incomplete ? 'Recorded net cash' : 'Net cash'} <strong className="num">{ctx.bankMoney(net)}</strong></span>
      </div>
    </div>
  );
}
