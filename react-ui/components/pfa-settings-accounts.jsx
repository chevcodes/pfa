import * as React from 'react';
import { PfaSubhead } from './pfa-subhead.jsx';
import { PfaAccountRename } from './pfa-account-rename.jsx';

export function PfaSettingsAccounts({ explain, placeholder, accounts, onAdd }) {
  const inputRef = React.useRef(null);
  const submit = async () => {
    if ((await onAdd(inputRef.current?.value || '')) && inputRef.current) inputRef.current.value = '';
  };

  return <div className="sec-section"><PfaSubhead title="Own accounts" explain={explain} actions={<div className="manage-actions settings-category-form"><input ref={inputRef} type="text" className="name-field" inputMode="numeric" maxLength={24} placeholder={placeholder} aria-label="Account number to add" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }} /><button type="button" className="btn sm" onClick={submit}>Add account</button></div>} />{accounts.length ? <div className="settings-category-list">{accounts.map((account) => <div className="settings-category-row" key={account.id}><PfaAccountRename {...account.renameProps} /><div className="manage-actions">{account.removable ? <button type="button" className="btn sm ghost" title={account.removeTitle} onClick={account.onRemove}>Remove</button> : <span className="vm-tag tone-neutral" title={account.sourceTitle}>{account.sourceLabel}</span>}</div></div>)}</div> : null}</div>;
}
