import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

function SavingLabel({ node }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!ref.current || !node) return undefined;
    ref.current.replaceChildren(node);
    return () => {
      if (node.parentNode === ref.current) node.remove();
    };
  }, [node]);
  return <span ref={ref} />;
}

export function PfaSavingsDestinations({ destinations, classes, focusId, onToggle }) {
  return (
    <div className={classes.list}>
      {destinations.map((destination) => (
        <div className={classes.row} key={destination.key}>
          <span className={classes.name}>
            <span>{destination.label}</span>
            <span className={classes.amount}>{destination.amount}</span>
          </span>
          <span className={classes.action}>
            <label className={classes.toggle + (destination.isCard ? ' is-card' : '')} htmlFor={destination.id}>
              <input id={destination.id} className={classes.checkbox} type="checkbox" checked={destination.checked} autoFocus={destination.id === focusId} onChange={(event) => onToggle(destination.key, event.target.checked)} />
              {destination.countLabelText ? <span>{destination.countLabelText}</span> : <SavingLabel node={destination.countLabel} />}
              {!destination.isCard && destination.suggested ? <span className={classes.suggested} title="Suggested because money goes here most months and little comes back out. Untick if that is wrong.">suggested</span> : null}
            </label>
            {destination.isCard ? <PfaInfoPopover label="" content={destination.cardExplanation} /> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
