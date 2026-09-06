import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';

export function PfaInvestmentAccountControl({ accounts, current, allLabel, useSegments, onSelect }) {
  if (accounts.length < 2) return null;
  if (useSegments) {
    return (
      <div className="inv-filter">
        <span className="muted small">Account</span>
        <div className="seg inv-segments" role="group" aria-label="Filter investments by account">
          {[{ accountKey: 'all', label: allLabel }, ...accounts].map((account) => {
            const id = `investment-account-${account.accountKey.replace(/[^a-z0-9]/gi, '-')}`;
            return <button key={account.accountKey} id={id} type="button" className={'seg-btn' + (current === account.accountKey ? ' active' : '')} aria-pressed={current === account.accountKey ? 'true' : 'false'} onClick={() => onSelect(account.accountKey, id)}>{account.label}</button>;
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="inv-filter">
      <span className="muted small">Account</span>
      <Select value={current} onValueChange={(value) => onSelect(value, 'investment-account-select')}>
        <SelectTrigger id="investment-account-select" className="inv-filter-select" aria-label="Filter investments by account"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((account) => <SelectItem key={account.accountKey} value={account.accountKey}>{account.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
