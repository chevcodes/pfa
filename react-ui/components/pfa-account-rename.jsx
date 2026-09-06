import * as React from 'react';
import { Pencil } from 'lucide-react';
import { VanillaBody } from '../vanilla-body.jsx';
import { Input } from './ui/input.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaAccountRename({ friendly, fallback, provenance, provenanceText, textClass, id, maxLength, onSave }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(friendly || '');
  const inputRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const settled = React.useRef(false);

  React.useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const finish = (save, refocus) => {
    if (settled.current) return;
    settled.current = true;
    const clean = value.trim().replace(/\s+/g, ' ');
    setEditing(false);
    if (!save || clean === (friendly || '')) {
      if (refocus) requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
      return;
    }
    onSave(clean, refocus ? id : null);
  };

  if (editing) {
    return <Input ref={inputRef} type="text" className="name-field account-rename-field" maxLength={maxLength} value={value} placeholder={fallback} aria-label={`Name for ${fallback}`} onChange={(event) => setValue(event.target.value)} onBlur={() => finish(true, false)} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        finish(event.key === 'Enter', true);
      }
    }} />;
  }

  return (
    <span className="account-name-line">
      <span className={'account-name-text' + (textClass ? ` ${textClass}` : '')}>{friendly || fallback}</span>
      {provenanceText ? <PfaInfoPopover content={provenanceText} /> : provenance ? <VanillaBody node={provenance} /> : null}
      <button ref={buttonRef} type="button" id={id} className="account-rename" title="Rename" aria-label={`Rename ${friendly || fallback}`} onClick={() => {
        settled.current = false;
        setValue(friendly || '');
        setEditing(true);
      }}><Pencil size={14} aria-hidden="true" /></button>
    </span>
  );
}
