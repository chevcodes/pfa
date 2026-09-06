import * as React from 'react';
import { PfaExpandableList } from './pfa-expandable-list.jsx';

export function PfaRankedPaymentList({ rows, onMounted }) {
  const targets = React.useRef(new Map());
  const containerRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const [active, setActive] = React.useState(null);
  const tooltipId = React.useId();

  React.useEffect(() => {
    onMounted([...targets.current.values()].map(({ node }) => node.querySelector('.rank-bar-fill')).filter(Boolean));
  }, [onMounted, rows]);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    const anchor = active && targets.current.get(active.key)?.node;
    if (!container || !tooltip || !anchor) return;
    const box = container.getBoundingClientRect();
    const row = anchor.getBoundingClientRect();
    const left = row.left - box.left + row.width / 2 - tooltip.offsetWidth / 2;
    const top = row.top - box.top - tooltip.offsetHeight - 8;
    tooltip.style.left = `${Math.max(0, Math.min(box.width - tooltip.offsetWidth, left))}px`;
    tooltip.style.top = `${Math.max(0, top)}px`;
  }, [active]);

  const show = (row, index) => {
    if (document.documentElement.dataset.privacy === 'on') return;
    setActive({ key: `${row.key}:${index}`, detail: row.detail });
  };

  return (
    <div ref={containerRef} className="ranked-payment-content">
      <PfaExpandableList
        items={rows}
        initial={5}
        renderItem={(row, index) => (
          <button
            type="button"
            className="rank-row"
            aria-label={`${row.label}, ${row.amount}`}
            aria-describedby={tooltipId}
            onClick={row.onClick}
            onPointerEnter={() => show(row, index)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => show(row, index)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setActive(null);
              }
            }}
            key={`${row.key}:${index}`}
            ref={(node) => {
              const key = `${row.key}:${index}`;
              if (node) targets.current.set(key, { node, row });
              else targets.current.delete(key);
            }}
          >
            <span className="rank-name">
              <span className="commit-name-main">{row.label}</span>
              <span className="commit-name-sub muted small" style={{ marginLeft: 6 }}>· {row.count} transaction{row.count === 1 ? '' : 's'}</span>
            </span>
            <span className="rank-amt num strong">{row.amount}</span>
            <span className="rank-bar" data-proportional=""><span className="rank-bar-fill" style={{ width: `${row.width}%` }} /></span>
          </button>
        )}
      />
      <div ref={tooltipRef} className="chart-tooltip" id={tooltipId} role="tooltip" hidden={!active}>
        {active?.detail.map((line, index) => <div key={index}>{line}</div>)}
      </div>
    </div>
  );
}
