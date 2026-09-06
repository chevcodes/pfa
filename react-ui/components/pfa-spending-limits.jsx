import * as React from 'react';
import { Input } from './ui/input.jsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaTargetBar } from './pfa-target-bar.jsx';

export function PfaSpendingLimits({ categories, monthLabel, coverageText, models, hot, onSave, onRemove, onRefine, onHistory, onTrackSet }) {
  const [category, setCategory] = React.useState(categories[0] || '');
  const [amount, setAmount] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const amountRef = React.useRef(null);

  async function save() {
    const saved = await onSave(category, Number(amount));
    if (saved) { setAmount(''); setFormOpen(false); }
  }

  return (
    <div>
      <p className="muted small">{monthLabel} · {coverageText} <PfaInfoPopover label="" ariaLabel="Spending coverage details" content={`Spending totals include only statement activity recorded in PFA for ${monthLabel}.`} /></p>
      {models.length ? (
        <>
          <div className="spending-limit-list">
            {models.map((model) => (
              <div className="spending-limit-row" key={model.category}>
                <div className="category-budget-row-top"><span>{model.category}</span><strong className="money num">{model.spentText} / {model.amountText}</strong></div>
                <PfaTargetBar actual={model.spent} target={model.limit} scaleMax={Math.max(model.spent, model.limit)} />
                <div className="category-budget-row-foot"><span>{model.tag ? <span className={`vm-tag tone-${model.tone}`}>{model.tag}</span> : 'Monthly limit'}</span><strong className={model.isOver ? 'category-budget-over' : ''} title={model.detail}>{model.isOver ? `${model.remainingText} over` : `${model.remainingText} left`}</strong></div>
                <div className="spending-limit-actions"><button type="button" className="linkbtn" onClick={() => { setCategory(model.category); setAmount(String(model.limit)); setFormOpen(true); requestAnimationFrame(() => amountRef.current?.focus()); }}>Change limit</button>{model.isOver && onRefine ? <button type="button" className="linkbtn" onClick={() => onRefine(model.category)}>Refine transactions</button> : null}{onHistory ? <button type="button" className="linkbtn" onClick={() => onHistory(model.category)}>Category history</button> : null}<button type="button" className="linkbtn" data-id={model.id} onClick={() => onRemove(model.category)}>Remove</button></div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {hot.length ? (
        <>
          <p className="muted small" style={{ margin: '10px 0 6px' }}>Spending faster than usual this month, with no limit set. <PfaInfoPopover label="" ariaLabel="Spending pace estimate details" content={`Day ${hot[0].dayOfMonth} of ${hot[0].daysInMonth}. This estimate projects the current pace through month end; it is not a final total.`} /></p>
          <div className="recurring-list">
            {hot.map((run) => (
              <div className="pace-row" key={run.category}>
                <div className="recurring-row">
                  <span className="recurring-name">{run.category}</span>
                  <button type="button" className="btn sm ghost" onClick={() => {
                    onTrackSet();
                    setCategory(run.category);
                    setFormOpen(true);
                    requestAnimationFrame(() => amountRef.current?.focus({ preventScroll: true }));
                  }}>Set a limit</button>
                </div>
                <div className="pace-note muted small">On pace for about {run.projectedText} this month, against a typical {run.typicalText}.</div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <button type="button" className="btn sm ghost" aria-expanded={formOpen} onClick={() => setFormOpen((open) => !open)}>Add limit</button>
      {formOpen ? <div className="manage-actions compact-form">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="ceiling-category-select" className="name-field" aria-label="Category">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categories.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input ref={amountRef} id="ceiling-amount" type="number" className="name-field" placeholder="Monthly limit" aria-label="Monthly limit" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <button type="button" className="btn sm" onClick={save}>Set limit</button>
        <PfaInfoPopover label="" content="Pick a category and a monthly amount, and this card tracks how much room is left as the month goes on." />
      </div> : null}
    </div>
  );
}
