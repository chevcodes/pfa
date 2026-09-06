import * as React from 'react';
import { Input } from './ui/input.jsx';
import { RadioGroup, RadioGroupItem } from './ui/radio-group.jsx';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';

export function PfaCategoryPicker({ place, categories, currentCategory, reviewCategory, bank, band, newCategoryBands, paymentAvailable, rules, splitEnabled, makerAvailable, manageRulesLabel, onAssign, onMake, onBand, onPayment, onSplit, onDecisionOpen, onStopRule, onManageRules, onCancel }) {
  const [filter, setFilter] = React.useState('');
  const [selected, setSelected] = React.useState('');
  const [pendingCategory, setPendingCategory] = React.useState('');
  const [scope, setScope] = React.useState('one');
  const [decisionOpen, setDecisionOpen] = React.useState(false);
  const [newBand, setNewBand] = React.useState('fixed');
  const [makePayment, setMakePayment] = React.useState(false);
  const input = React.useRef(null);
  const query = filter.trim().toLowerCase();
  const visible = categories.filter((category) => !query || category.label.toLowerCase().includes(query));
  const normalized = filter.replace(/\s+/g, ' ').trim();
  const offer = !!normalized && visible.length === 0 && makerAvailable(normalized);

  React.useEffect(() => { input.current?.focus(); }, []);

  const categoryButton = (category) => {
    const label = reviewCategory(category.value) ? 'To review' : category.label;
    const current = category.value === currentCategory;
    return (
      <button key={category.value} type="button" className={`picker-item${current ? ' current' : ''}${selected === category.value ? ' is-selected' : ''}`} data-name={label.toLowerCase()} onClick={() => {
        const decision = { open: false };
        onDecisionOpen?.(decision);
        setSelected(category.value);
        setPendingCategory('');
        setScope('one');
        setDecisionOpen(decision.open);
      }}>
        <span className="cat-dot" style={{ background: category.color }} />
        {label}
        {current ? <span className="muted small"> current</span> : null}
      </button>
    );
  };

  return (
    <>
      <div className="picker-head">{`File “${place}” as`}</div>
      <Input ref={input} type="text" className="picker-filter" placeholder="Filter or name a category…" aria-label="Filter or name a category" value={filter} onChange={(event) => { setFilter(event.target.value); setSelected(''); setPendingCategory(''); setScope('one'); setDecisionOpen(false); }} />
      <div className="picker-list">
        {visible.map(categoryButton)}
      </div>
      {offer ? <button type="button" className={'picker-item picker-create' + (pendingCategory === normalized ? ' is-selected' : '')} onClick={() => { const decision = { open: false }; onDecisionOpen?.(decision); setSelected(normalized); setPendingCategory(normalized); setScope('one'); setDecisionOpen(decision.open); }}>{`Make “${normalized}”`}</button> : null}
      {pendingCategory && newCategoryBands ? <label className="settings-band-field"><span className="muted small">Counts toward</span><select className="name-field" aria-label="Where new category counts" value={newBand} onChange={(event) => setNewBand(event.target.value)}>{newCategoryBands.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}</select></label> : null}
      {pendingCategory && paymentAvailable ? <label className="scope"><input type="checkbox" checked={makePayment} onChange={(event) => setMakePayment(event.target.checked)} /> Also set a monthly payment</label> : null}
      {!visible.length && !offer ? <div className="picker-empty muted small">No matching category.</div> : null}
      {selected ? (
        <PfaInlineDisclosure ephemeral label="Apply beyond this transaction" className="picker-decision" open={decisionOpen} onOpenChange={setDecisionOpen}>
          <div className="disclosure-body picker-decision-body">
            <RadioGroup className="picker-scope flex flex-col gap-2" aria-label="Apply this category to" value={scope} onValueChange={setScope}>
              <label className="scope"><RadioGroupItem value="one" /> Only this transaction</label>
              <label className="scope"><RadioGroupItem value="all" />{` Every “${place}” transaction, now and in future`}</label>
            </RadioGroup>
            {band && selected === currentCategory ? (
              <div className="confirm-line">
                <span className="confirm-line-label">{`${band.name} counts toward`}</span>
                <span className="confirm-pair">
                  <Select value={band.current} onValueChange={onBand}>
                    <SelectTrigger className="plan-assign-select" aria-label={`Where ${band.name} counts`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{band.groups.map((group) => <SelectItem key={group.key} value={group.key}>{group.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </span>
              </div>
            ) : null}
          </div>
        </PfaInlineDisclosure>
      ) : null}
      {!bank && (rules || splitEnabled) ? (
        <PfaInlineDisclosure ephemeral label="More options" className="picker-more">
          <div className="disclosure-body picker-more-body">
            {splitEnabled ? <button type="button" className="btn sm ghost" onClick={onSplit}>Split across categories</button> : null}
            {rules?.removable ? <button type="button" className="btn sm ghost" title={rules.title} aria-label={rules.ariaLabel} onClick={onStopRule}>Stop rule</button> : null}
            {rules?.visible ? <button type="button" className="btn sm ghost" onClick={onManageRules}>{manageRulesLabel}</button> : null}
          </div>
        </PfaInlineDisclosure>
      ) : null}
      <div className="picker-actions">
        <button type="button" className="btn sm primary" disabled={!selected} onClick={() => pendingCategory ? onMake(pendingCategory, scope === 'all', newBand, makePayment) : onAssign(selected, scope === 'all')}>{pendingCategory ? 'Create and assign' : 'Assign category'}</button>
        {bank && paymentAvailable && !pendingCategory ? <button type="button" className="btn sm ghost" onClick={() => onPayment(selected || currentCategory)}>Set monthly payment</button> : null}
        {bank && rules?.removable ? <button type="button" className="btn sm ghost" title={rules.title} aria-label={rules.ariaLabel} onClick={onStopRule}>Stop rule</button> : null}
        {bank && rules?.visible ? <button type="button" className="btn sm ghost" onClick={onManageRules}>{manageRulesLabel}</button> : null}
        <button type="button" className="btn sm ghost" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}
