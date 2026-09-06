import * as React from 'react';
import { Checkbox } from './ui/checkbox.jsx';
import { Input } from './ui/input.jsx';

export function PfaTransactionTagPicker({ place, tags, onCreate, onToggle, onCancel }) {
  const [name, setName] = React.useState('');
  const [members, setMembers] = React.useState(() => new Set(tags.filter((tag) => tag.checked).map((tag) => tag.id)));
  const create = () => {
    const clean = name.trim();
    if (clean) onCreate(clean);
  };

  return (
    <>
      <div className="picker-head">{place ? `Custom label “${place}”` : 'Custom label'}</div>
      <p className="muted small" style={{ padding: '2px 0 6px' }}>
        {tags.length
          ? 'Add this transaction to any of your custom labels, or make a new one. A transaction can belong to more than one.'
          : 'A custom label groups spending that belongs together but spans categories and months - a renovation, a holiday, a trip. Name your first one and this transaction goes into it.'}
      </p>
      {tags.length ? (
        <div className="picker-list">
          {tags.map((tag) => (
            <div key={tag.id} className="scope" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Checkbox id={`custom-label-${tag.id}`} checked={members.has(tag.id)} onCheckedChange={(checked) => {
                  const selected = checked === true;
                  setMembers((current) => {
                    const next = new Set(current);
                    if (selected) next.add(tag.id);
                    else next.delete(tag.id);
                    return next;
                  });
                  onToggle(tag.id, selected);
                }} />
                <label htmlFor={`custom-label-${tag.id}`}>{tag.name}</label>
              </span>
              <span className="muted small">{`${tag.count} labelled`}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="tag-picker-new">
        <div className="manage-actions">
          <Input type="text" className="name-field" maxLength={40} placeholder="New label name" aria-label="New custom label name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); create(); } }} />
          <button type="button" className="btn sm" onClick={create}>Create and add</button>
        </div>
      </div>
      <div className="picker-actions"><button type="button" className="btn sm ghost" onClick={onCancel}>{tags.length ? 'Done' : 'Cancel'}</button></div>
    </>
  );
}
