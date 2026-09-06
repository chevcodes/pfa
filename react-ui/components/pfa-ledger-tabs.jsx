import * as React from 'react';
import { markScrollAffordance } from '../../application/core/shared-helpers.js';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.jsx';

export function PfaLedgerTabs({ views, value, onValueChange, onReselect }) {
  const listRef = React.useRef(null);
  React.useEffect(() => {
    const list = listRef.current;
    markScrollAffordance(list);
    if (list?.scrollWidth > list.clientWidth + 2) {
      return list.querySelector('[data-state="active"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [value]);
  return (
    <Tabs value={value} onValueChange={onValueChange} className="contents">
      <TabsList aria-label="Ledger views" className="ledger-tabs" ref={listRef}>
        {views.map(({ id, label }) => (
          <TabsTrigger
            id={`ledger-tab-${id}`}
            aria-controls="app"
            value={id}
            className={'ledger-tab' + (value === id ? ' active' : '')}
            onClick={() => {
              if (value === id) onReselect?.(id);
            }}
            key={id}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
