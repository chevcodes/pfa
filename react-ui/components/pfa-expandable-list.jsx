import * as React from 'react';

export function PfaExpandableList({ items, initial = 5, step = 3, className = 'recurring-list', renderItem }) {
  const [visible, setVisible] = React.useState(initial);
  const shown = Math.min(visible, items.length);
  const remaining = Math.max(0, items.length - shown);
  const next = Math.min(step, remaining);
  const extra = Math.max(0, shown - initial);

  return (
    <>
      <div className={className}>
        {items.slice(0, shown).map((item, index) => renderItem(item, index))}
      </div>
      {remaining || extra ? (
        <div className="show-more show-more-multi">
          {remaining ? <button className="btn sm ghost" type="button" onClick={() => setVisible((count) => Math.min(items.length, count + step))}>See {next} more</button> : null}
          {remaining > step ? <button className="btn sm" type="button" onClick={() => setVisible(items.length)}>See all {remaining}</button> : null}
          {extra ? <button className="btn sm ghost" type="button" onClick={() => setVisible(initial)}>Hide {extra}</button> : null}
        </div>
      ) : null}
    </>
  );
}
