import * as React from 'react';
import { foldAllCards } from '../../application/ui/decision-header.js';

export function PfaFoldAll({ host, cards }) {
  const [opening, setOpening] = React.useState(() => cards().some((card) => !card.isOpen()));

  React.useEffect(() => {
    const paint = () => setOpening(cards().some((card) => !card.isOpen()));
    host.addEventListener('toggle', paint, true);
    const observer = new MutationObserver(paint);
    observer.observe(host, { attributes: true, subtree: true, attributeFilter: ['data-open'] });
    paint();
    return () => {
      host.removeEventListener('toggle', paint, true);
      observer.disconnect();
    };
  }, [host, cards]);

  const toggle = () => {
    const list = cards();
    const expand = list.some((card) => !card.isOpen());
    for (const card of list) card.setOpen(expand);
    setOpening(!expand);
  };

  return <button type="button" className={'fold-all-btn' + (opening ? '' : ' is-open')} aria-expanded={opening ? 'false' : 'true'} aria-label={opening ? 'Open all sections' : 'Close all sections'} onClick={toggle}>{opening ? 'Open all' : 'Close all'}</button>;
}

export function PfaFoldAllRow({ host, hostRef, refreshKey, inCard = false }) {
  const [visible, setVisible] = React.useState(false);
  const target = host || hostRef?.current;
  const cards = React.useCallback(() => foldAllCards(host || hostRef?.current), [host, hostRef]);
  React.useLayoutEffect(() => {
    setVisible(cards().length >= 2);
  }, [cards, refreshKey]);
  return visible && target ? <div className={'fold-all pfa-react-root' + (inCard ? ' fold-all-in-card' : '')}><PfaFoldAll host={target} cards={cards} /></div> : null;
}
