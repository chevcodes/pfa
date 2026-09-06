import * as React from 'react';
import { Input } from './ui/input.jsx';

export function PfaTransactionSearch({ initialSearch, countStore, categoriesOn, onInput, onClear }) {
  const [search, setSearch] = React.useState(initialSearch || '');
  const [hasCategories, setHasCategories] = React.useState(!!categoriesOn);
  const countText = React.useSyncExternalStore(countStore.subscribe, countStore.getSnapshot);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const update = (event) => setHasCategories(!!event.detail?.active);
    document.addEventListener('pfa-ledger-categories-change', update);
    return () => document.removeEventListener('pfa-ledger-categories-change', update);
  }, []);

  return (
    <div className="tx-filters">
      <div className="tx-search-field">
        <Input
          ref={inputRef}
          type="search"
          id="tx-search"
          className="f-search"
          placeholder="Name, amount, category, or label"
          aria-label="Search transactions"
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            onInput(value);
          }}
        />
      </div>
      <div className="tx-search-actions">
        <span className="tx-search-count muted small" role="status" aria-live="polite">{countText}</span>
        <button
          className="btn sm ghost tx-search-clear"
          hidden={!search && !hasCategories}
          type="button"
          onClick={() => {
            setSearch('');
            setHasCategories(false);
            onClear();
            inputRef.current?.focus();
          }}
        >Clear</button>
      </div>
    </div>
  );
}
