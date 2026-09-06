import * as React from 'react';
import { Input } from './ui/input.jsx';

export function PfaBalanceUpdateForm({ accounts, correcting, onSave, onUseStatement }) {
  const [entries, setEntries] = React.useState(() => Object.fromEntries(accounts.map((account) => [account.key, {
    value: account.inputValue,
    carried: account.carried,
    carriedValue: account.carriedValue,
  }])));
  const [error, setError] = React.useState('');
  const inputs = React.useRef({});
  const canSave = Object.values(entries).some((entry) => String(entry.value || '').trim().length > 0 || entry.carried);

  const save = async () => {
    if (!canSave) return;
    const result = await onSave(entries);
    if (!result?.error) return;
    setError(result.error);
    if (result.focusKey) inputs.current[result.focusKey]?.focus();
  };

  const updateEntry = (key, update) => {
    setEntries((current) => ({ ...current, [key]: { ...current[key], ...update } }));
    setError('');
  };

  return (
    <div className="balance-update">
      <div className="balance-update-grid">
        {accounts.map((account) => {
          const entry = entries[account.key];
          const hasValue = String(entry.value || '').trim().length > 0;
          const isCard = account.ledger === 'card';
          return (
            <section className={`balance-update-row${isCard ? ' is-card' : ' is-bank'}${hasValue ? ' is-ready' : ''}`} key={account.key}>
              <div className="balance-update-name">
                <span className="balance-update-kind-mark" aria-hidden="true">
                  {isCard ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3.25" y="5.5" width="17.5" height="13" rx="2.5" />
                      <path d="M3.75 9.5h16.5m-13 5h3.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9h18L12 4 3 9Zm2 2v7m5-7v7m4-7v7m5-7v7M3 20h18" />
                    </svg>
                  )}
                </span>
                <div className="balance-update-name-copy">
                  <div className="balance-update-account-line">
                    <span className="account-name-text">{account.name}</span>
                    <span className="position-currency-pill">{isCard ? 'owed' : account.currency}</span>
                  </div>
                </div>
              </div>
              <div className="balance-update-history">
                <div className="balance-update-history-topline">
                  <span className="balance-update-last-label">{account.lastLabel}</span>
                  <span className="balance-update-date">{account.lastDate}</span>
                </div>
                <span className="balance-update-last num">{account.lastAmount}</span>
              </div>
              <div className="balance-update-entry">
                <label className="balance-update-entry-label" htmlFor={account.id}>{isCard ? 'Owed today' : 'Balance today'}</label>
                <Input
                  ref={(node) => { inputs.current[account.key] = node; }}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  id={account.id}
                  className="name-field balance-update-input"
                  aria-label={`${isCard ? 'Owed' : 'Balance'} today for ${account.name}`}
                  placeholder={account.placeholder}
                  value={entry.value}
                  onChange={(event) => updateEntry(account.key, { value: event.target.value, carried: event.target.value.trim() ? false : entry.carried })}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save(); } }}
                />
                <div className="balance-update-entry-state">
                  {hasValue ? <button type="button" className="btn sm ghost" aria-label={`Keep the last figure for ${account.name}`} onClick={() => updateEntry(account.key, { value: '', carried: true })}>Unchanged</button> : <span className="balance-update-resting">Using last figure</span>}
                  {account.source === 'entered' ? <button type="button" className="btn sm ghost" aria-label={`Use statement figure for ${account.name}`} onClick={() => onUseStatement(account.item)}>Use statement</button> : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="balance-update-error small" role="status" aria-live="polite">{error}</p>
      <div className="balance-update-actions">
        <button type="button" className="btn primary sm" disabled={!canSave} onClick={save}>{correcting ? 'Save corrections' : 'Save balances'}</button>
      </div>
    </div>
  );
}
