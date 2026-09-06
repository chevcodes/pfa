import * as React from 'react';
import { roundMoney } from '../../application/core/shared-helpers.js';
import { Input } from './ui/input.jsx';

const options = [
  { kind: 'chosen', label: 'A number I choose' },
  { kind: 'calculated', label: 'My fixed expenses plus a few days of spending' },
  { kind: 'none', label: 'No safety floor (clear it)' },
];

export function PfaSafetyBoundaryForm({ draftKind, initialValue, onSelect, onCancel, onSave, onClear, onInvalid }) {
  const [value, setValue] = React.useState(initialValue == null ? '' : String(initialValue));
  const inputRef = React.useRef(null);
  const clearRef = React.useRef(null);
  React.useEffect(() => setValue(initialValue == null ? '' : String(initialValue)), [draftKind, initialValue]);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => (draftKind === 'none' ? clearRef.current : inputRef.current)?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [draftKind]);
  const amount = Number(value);
  const valid = value !== '' && Number.isFinite(amount) && amount > 0 && (draftKind === 'calculated' ? Number.isInteger(amount) : roundMoney(amount) === amount);
  const save = () => {
    if (!valid) {
      onInvalid();
      inputRef.current?.focus();
      return;
    }
    onSave(draftKind === 'chosen' ? { kind: 'chosen', value: roundMoney(amount) } : { kind: 'calculated', cushionDays: amount });
  };

  return (
    <div>
      <div className="picker-list" style={{ marginBottom: 10 }}>
        {options.map((option) => (
          <button type="button" className={'picker-item' + (draftKind === option.kind ? ' current' : '')} key={option.kind} aria-pressed={draftKind === option.kind} onClick={() => onSelect(option.kind)}>{option.label}</button>
        ))}
      </div>
      {draftKind === 'none' ? (
        <div className="manage-actions" style={{ marginBottom: 10 }}>
          <button ref={clearRef} type="button" className="btn sm" onClick={onClear}>Clear safety floor</button>
          <button type="button" className="btn sm ghost" onClick={onCancel}>Cancel</button>
        </div>
      ) : (
        <div className="manage-actions" style={{ marginBottom: 10 }}>
          <Input ref={inputRef} type="number" className="name-field" min={draftKind === 'chosen' ? '0.01' : '1'} step={draftKind === 'chosen' ? '0.01' : '1'} aria-label={draftKind === 'chosen' ? 'Safety floor amount' : 'Safety floor cushion days'} placeholder={draftKind === 'chosen' ? 'Amount' : 'Number of days'} value={value} onChange={(event) => setValue(event.target.value)} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="btn sm" disabled={!valid} onClick={save}>Save safety floor</button>
          <button type="button" className="btn sm ghost" onClick={onCancel}>Cancel</button>
        </div>
      )}
      {value !== '' && !valid && draftKind !== 'none' ? <p className="muted small" role="status">{draftKind === 'calculated' ? 'Enter a whole number of days greater than zero.' : 'Enter an amount greater than zero, using at most two decimal places.'}</p> : null}
    </div>
  );
}
