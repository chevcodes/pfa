import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { Input } from './ui/input.jsx';

let chosenKindClass = '';

export function PfaPositionAssetForm({ classes, liabilities, counts, iconNode, iconMarkup, onGap, onSave }) {
  const [kindClass, setKindClassState] = React.useState(chosenKindClass || `asset:${classes[0] || ''}`);
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const amountRef = React.useRef(null);
  const [kind, selectedClass] = kindClass.split(':');
  const choose = (value) => {
    chosenKindClass = value;
    setKindClassState(value);
  };
  const chip = (chipKind, cls) => {
    const value = `${chipKind}:${cls}`;
    const count = counts[value] || 0;
    const on = value === kindClass;
    return (
      <button key={value} type="button" className={'tx-hint-cat' + (on ? ' is-on' : '')} aria-pressed={on} title={count ? `Add another ${cls.toLowerCase()}` : `Record a ${cls.toLowerCase()} figure`} onClick={() => { choose(value); if (!count) onGap({ kind: chipKind, cls }); amountRef.current?.focus(); }}>{count ? `${cls} · ${count}` : cls}</button>
    );
  };
  const submit = async (event) => {
    event.preventDefault();
    const saved = await onSave({ kind, cls: selectedClass, name, amount });
    if (saved !== false) {
      setName('');
      setAmount('');
    }
  };

  return (
    <PfaInlineDisclosure name="position-add-asset" id="position-add-disclosure" className="secondary" label={<span className="card-title">{iconMarkup ? <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : iconNode ? <VanillaBody node={iconNode} /> : null} Add an asset or debt</span>}>
      <div className="sec-section">
        <p className="muted small position-class-label">Assets</p>
        <div className="position-class-chips">{classes.map((cls) => chip('asset', cls))}</div>
        <p className="muted small position-class-label">Debts</p>
        <div className="position-class-chips">{liabilities.map((cls) => chip('liability', cls))}</div>
        <form className="position-add-fields" onSubmit={submit}>
          <label className="field-label"><span>{`Name (${selectedClass})`}</span><Input type="text" className="name-field" maxLength="40" placeholder="For example the lender or provider" aria-label={`Name of this ${(selectedClass || '').toLowerCase()}`} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field-label"><span>Amount</span><Input ref={amountRef} type="number" className="name-field" min="0" step="1" inputMode="decimal" placeholder="Amount" aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <button className="btn sm" type="submit">Add to position</button>
        </form>
      </div>
    </PfaInlineDisclosure>
  );
}
