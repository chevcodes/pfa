import * as React from 'react';
import { PfaNetWorthLine } from './pfa-net-worth-line.jsx';
import { VanillaBody } from '../vanilla-body.jsx';

export function PfaPositionMix({ panels, onAnimate }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || !onAnimate) return;
    onAnimate([...ref.current.querySelectorAll('.pos-bar-fill')]);
  }, [panels, onAnimate]);

  return (
    <div className="position-mix" ref={ref}>
      {panels.map((panel) => (
        <section className={`position-mix-panel is-${panel.tone}`} key={panel.title}>
          <div className="position-mix-head">
            <h4 className="position-mix-title">{panel.title}</h4>
            <span className="position-mix-total num">{panel.total}</span>
          </div>
          {panel.rows.map((row) => (
            <div className="pos-line" key={row.key}>
              {row.line
                ? <div className={'recurring-row pfa-react-root' + (row.line.stale ? ' lapsed' : '')}><PfaNetWorthLine {...row.line} /></div>
                : <VanillaBody node={row.node} />}
              <div className="position-mix-share">
                <span className="pos-bar" data-proportional=""><span className={`pos-bar-fill is-${panel.tone}`} style={{ width: `${row.width}%` }} /></span>
                <span className="muted small num">{row.shareText}</span>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
