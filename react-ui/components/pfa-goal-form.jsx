import { useEffect, useRef, useState } from 'react';
import { CreditCard, Flag, Shield } from 'lucide-react';
import { Input } from './ui/input.jsx';

const icons = { runway: Shield, 'clear-card': CreditCard, 'spend-ceiling': Flag };

export function PfaGoalForm({ options, draftType, mode = 'create', showChoices = true, focusChoices = false, onSelect, onSubmit, onCancel, onChangeType, onBackToCurrent, onClear }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const firstChoiceRef = useRef(null);
  const previousChoicesOpen = useRef(showChoices);
  const selected = options.find((option) => option.id === draftType);

  useEffect(() => {
    if (!selected || !inputRef.current) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [draftType, selected]);

  useEffect(() => {
    setValue(selected?.defaultValue != null ? String(selected.defaultValue) : '');
  }, [draftType, selected?.defaultValue, selected?.unit]);

  useEffect(() => {
    const becameVisible = showChoices && !previousChoicesOpen.current;
    previousChoicesOpen.current = showChoices;
    if (!becameVisible && !focusChoices) return;
    const frame = requestAnimationFrame(() => firstChoiceRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [focusChoices, showChoices]);

  return (
    <div className={'goal-form' + (mode === 'manage' ? ' goal-form--manage' : '')}>
      {mode === 'manage' ? <h3 className="goal-form-title">{showChoices ? 'Choose a different goal' : `Edit ${selected?.title.toLowerCase()} target`}</h3> : null}
      {showChoices ? (
        <div className="goal-choices">
          {options.map((option, index) => {
            const Icon = icons[option.id] || Flag;
            return (
              <button
                key={option.id}
                ref={index === 0 ? firstChoiceRef : null}
                className="goal-choice"
                type="button"
                onClick={() => onSelect(option.id)}
              >
                <span className="goal-choice-ic"><Icon aria-hidden="true" /></span>
                <span className="goal-choice-title">{option.title}</span>
                <span className="goal-choice-desc muted small">{option.description}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {selected ? (
        <div className="manage-actions goal-draft-step">
          <label className="field-label">
            <span>{selected.unit === 'date' ? 'Target date' : selected.unit === 'months' ? 'Months of expenses' : 'Monthly limit'}</span>
            <Input
              ref={inputRef}
              type={selected.unit === 'date' ? 'date' : 'number'}
              className="name-field"
              id="goal-draft-input"
              placeholder={selected.unit === 'months' ? 'Number of months' : selected.unit === 'date' ? undefined : 'Amount'}
              aria-label={selected.unit === 'date' ? 'Target date' : selected.unit === 'months' ? 'Emergency fund months of expenses' : 'Monthly spending limit'}
              min="1"
              max={selected.unit === 'months' ? '24' : undefined}
              step={selected.unit === 'months' || selected.unit === 'date' ? undefined : '0.01'}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={(event) => {
                if (selected.unit !== 'date') event.target.select();
              }}
            />
          </label>
          <div className="goal-form-actions">
            <button className="btn sm" type="button" onClick={() => onSubmit(selected.id, value)}>{mode === 'manage' ? 'Save goal' : 'Set this goal'}</button>
            <button className="btn sm ghost" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      ) : null}
      {mode === 'manage' ? (
        <div className="goal-management-actions">
          {showChoices ? (
            <>
              <button className="btn sm ghost" type="button" onClick={onBackToCurrent}>Back to current goal</button>
              <button className="btn sm ghost" type="button" onClick={onCancel}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn sm ghost" type="button" onClick={onChangeType}>Change goal type</button>
              <button className="btn sm danger" type="button" onClick={onClear}>Clear goal</button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
