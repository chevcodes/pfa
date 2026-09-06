import * as React from 'react';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaTransactionCategoryFilter({ categories, counts = {}, selectedCategories, transfer, summaryFor, explain, name, compact, onToggleCategory, onToggleTransfer, inline = false }) {
  const [selected, setSelected] = React.useState(() => [...selectedCategories]);

  React.useEffect(() => {
    const reset = (event) => {
      if (Array.isArray(event.detail?.selected)) setSelected(event.detail.selected);
      else if (!event.detail?.active) setSelected([]);
    };
    document.addEventListener('pfa-ledger-categories-change', reset);
    return () => document.removeEventListener('pfa-ledger-categories-change', reset);
  }, []);

  const toggle = (name, onToggle = onToggleCategory) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected([...next]);
    onToggle(name);
  };
  const transferActive = !!transfer && selected.includes(transfer.value);
  const content = (
    <div className="tx-categories-filter">
      <span className="tx-hint-cats">
        {categories.map((name) => {
          const on = selected.includes(name);
          const count = counts[name] || 0;
          const empty = !count && !on;
          return <button key={name} type="button" className={'tx-hint-cat' + (on ? ' is-on' : '')} aria-pressed={on} disabled={empty} title={empty ? `No ${name} transactions in this view` : on ? `Stop showing ${name}` : `Also show ${name}`} onClick={() => toggle(name)}>{name}<span className="tx-hint-count">{count}</span></button>;
        })}
        {transfer ? <button type="button" className={'tx-hint-cat' + (transferActive ? ' is-on' : '')} aria-pressed={transferActive} title={transfer.title} onClick={() => toggle(transfer.value, onToggleTransfer)}>{transferActive ? transfer.label : `${transfer.label} (${transfer.count})`}</button> : null}
      </span>
    </div>
  );

  const info = <PfaInfoPopover content={explain.map((text, index) => <p key={index} style={{ margin: index ? 0 : '0 0 8px' }}>{text}</p>)} />;
  if (inline) return <div className="stack"><div className="row"><strong>Categories</strong>{info}</div>{content}</div>;
  return (
    <PfaCardDisclosure
      title="Categories"
      icon={info}
      hasExplain
      summary={summaryFor(selected)}
      name={name}
      compact={compact}
    >
      {content}
    </PfaCardDisclosure>
  );
}
