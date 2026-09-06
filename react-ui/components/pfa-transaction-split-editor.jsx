import * as React from 'react';
import { validateSplit } from '../../application/analysis/transaction-splits.js';
import { Input } from './ui/input.jsx';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';

export function PfaTransactionSplitEditor({ place, target, targetText, spendable, initialParts, existing, money, balanceParts, onSave, onClear, onCancel }) {
  const [parts, setParts] = React.useState(initialParts);
  const total = parts.reduce((sum, part) => sum + Math.abs(Number(part.amount) || 0), 0);
  const remainder = Math.round((target - total) * 100) / 100;
  const validation = validateSplit({ parts }, target);
  const remainderText = validation.ok
    ? `Balanced - the parts add up to ${money(target)}.`
    : validation.reason === 'part-missing-category' ? 'Choose a category for each part.'
    : validation.reason === 'part-not-positive' ? 'Enter an amount greater than zero for each part.'
    : validation.reason === 'duplicate-category' ? 'Use a different category for each part.'
    : validation.reason === 'need-two-parts' ? 'Add at least two categories.'
    : remainder < 0 ? `Over by ${money(-remainder)}. Reduce the parts to ${money(target)}.`
    : `Remainder: ${money(remainder)} of ${money(target)} still to allocate.`;

  return (
    <>
      <div className="picker-head">{`Split “${place}” (${targetText})`}</div>
      <div className="picker-list">
        {parts.map((part, index) => (
          <div className="manage-actions" key={index}>
            <Select value={part.category || undefined} onValueChange={(category) => {
              setParts((current) => current.map((item, i) => i === index ? { ...item, category } : item));
            }}>
              <SelectTrigger className="name-field" aria-label={`Category for part ${index + 1}`}><SelectValue placeholder="- category -" /></SelectTrigger>
              <SelectContent><SelectGroup>{spendable.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <Input type="number" className="name-field" min="0" step="0.01" inputMode="decimal" aria-label={`Amount for part ${index + 1}`} value={part.amount || ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => {
              const amount = Number(event.currentTarget.value) || 0;
              setParts((current) => current.map((item, i) => i === index ? { ...item, amount } : item));
            }} />
            {parts.length > 2 ? <button type="button" className="btn sm ghost" aria-label={`Remove part ${index + 1}`} onClick={() => setParts((current) => current.filter((_, i) => i !== index))}>×</button> : null}
          </div>
        ))}
      </div>
      <button type="button" className="btn sm ghost" onClick={() => setParts((current) => [...current, { category: '', amount: 0 }])}>+ Add a category</button>
      <button type="button" className="btn sm ghost" onClick={() => setParts((current) => balanceParts(current, target))}>Fill remainder in the last part</button>
      <div className="muted small" style={{ padding: '6px 0' }} aria-live="polite">{remainderText}</div>
      <div className="picker-actions">
        <button type="button" className="btn sm" disabled={!validation.ok} onClick={() => onSave(parts)}>Save split</button>
        {existing ? <button type="button" className="btn sm ghost" onClick={onClear}>Clear split</button> : null}
        <button type="button" className="btn sm ghost" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}
