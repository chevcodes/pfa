import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { Input } from './ui/input.jsx';

export function PfaNetWorthLine({ label, meta, amount, rateText, rateClass, editLabel, inputLabel, inputAmount, onSave, removeLabel, onRemove }) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(inputLabel || '');
  const [value, setValue] = React.useState(String(inputAmount || ''));
  return (
    <>
      <span className="recurring-name">
        {label}
        {rateText ? <span className={rateClass}><PfaInfoPopover label="" content={rateText} /></span> : null}
      </span>
      {meta ? <span className="recurring-months muted small">{meta}</span> : <span />}
      <span className="recurring-amt num strong">{amount}</span>
      {onSave || onRemove ? <span className="position-line-actions">
        {onSave ? <button type="button" className="btn sm ghost" aria-label={editLabel} aria-expanded={editing} onClick={() => setEditing(!editing)}>Edit</button> : null}
        {onRemove ? <button type="button" className="btn sm ghost position-remove" title="Remove" aria-label={removeLabel} onClick={onRemove}>Remove</button> : null}
      </span> : null}
      {editing ? <form className="position-line-edit" onSubmit={async (event) => { event.preventDefault(); if (await onSave({ label: name, amount: value })) setEditing(false); }}>
        <label className="field-label"><span>Name</span><Input type="text" maxLength="40" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field-label"><span>Amount</span><Input type="number" min="0.01" step="0.01" inputMode="decimal" required value={value} onChange={(event) => setValue(event.target.value)} /></label>
        <button type="submit" className="btn sm">Save</button><button type="button" className="btn sm ghost" onClick={() => setEditing(false)}>Cancel</button>
      </form> : null}
    </>
  );
}
