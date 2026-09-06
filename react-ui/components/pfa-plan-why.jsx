import * as React from 'react';

export function PfaPlanWhy({ items }) {
  return (
    <>
      {items.map((item, index) => item.type === 'workings' ? (
        <div className="plan-workings" key={index}>
          {item.rows.map((row) => (
            <div className="plan-working" key={row.label}>
              <span>{row.label}</span>
              <span className="num money">{row.value}</span>
            </div>
          ))}
        </div>
      ) : item.link ? (
        <p className={item.muted ? 'muted' : undefined} key={index}>
          {item.link.before}<button type="button" className="linkbtn" title={item.link.title} onClick={item.link.onClick}>{item.link.label}</button>{item.link.after}
        </p>
      ) : <p className={item.muted ? 'muted' : undefined} key={index}>{item.text}</p>)}
    </>
  );
}
