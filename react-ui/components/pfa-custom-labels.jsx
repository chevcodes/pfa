import * as React from 'react';
import { Input } from './ui/input.jsx';

export function PfaCustomLabels({ models, onRemove, onOpen, onCreate, onInvalid }) {
  const [name, setName] = React.useState('');
  const [target, setTarget] = React.useState('');
  const targetRef = React.useRef(null);
  const submit = async (event) => {
    event.preventDefault();
    const rawTarget = target.trim();
    const created = await onCreate(name.trim(), rawTarget);
    if (created === false) {
      targetRef.current?.focus();
      return;
    }
    setName('');
    setTarget('');
  };

  return (
    <div>
      {models.length ? (
        <div className="recurring-list recurring-summary-list">
          {models.map((model) => (
            <div className="recurring-row" key={model.id}>
              <span className="recurring-name">{model.name}</span>
              <span>
                {model.tag ? (
                  <button type="button" id={`activity-label-${model.id}`} className={`vm-tag tone-${model.tone} is-drill`} title={`Show the transactions labelled ${model.name}`} onClick={() => onOpen(model.name)}>{model.tag}</button>
                ) : null}
              </span>
              <span className="recurring-amt num">{model.amountText}</span>
              <button type="button" className="btn sm ghost position-remove" data-id={model.id} onClick={() => onRemove(model.id)}>Remove</button>
            </div>
          ))}
        </div>
      ) : null}
      <form className="manage-actions compact-form" onSubmit={submit}>
        <Input type="text" className="name-field" placeholder="Custom label name" aria-label="Custom label name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
        <Input ref={targetRef} type="number" className="name-field" placeholder="Target (optional)" aria-label="Custom label target (optional)" min="1" value={target} onChange={(event) => setTarget(event.target.value)} />
        <button className="btn sm" type="submit">Create custom label</button>
      </form>
    </div>
  );
}
