import * as React from 'react';
import { roundMoney } from '../../application/core/shared-helpers.js';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion.jsx';
import { Input } from './ui/input.jsx';

export function PfaScenarioCard({ items, reductions, extraCost, explain, basis, monthlyIncome, monthlyOutflow, money, calculate, isInvalidCost, runwaySummary, onReduction, onApplyCost, onInvalid }) {
  const [selected, setSelected] = React.useState(() => new Map(reductions));
  const [cost, setCost] = React.useState(extraCost ? String(extraCost) : '');
  const [appliedCost, setAppliedCost] = React.useState(extraCost);
  const [result, setResult] = React.useState(() => calculate(reductions, extraCost));
  const costRef = React.useRef(null);
  const visible = items.slice(0, 3);
  const remaining = items.slice(3);
  const renderRow = (item) => {
    const current = selected.get(item.key) || 0;
    return (
      <div className="recurring-row scenario-row" key={item.key}>
        <span className="recurring-name">{item.label}</span>
        <span className="recurring-amt num">{money(item.amount)}<span className="muted small"> / month</span></span>
        <span className="seg" role="group" aria-label={`Adjust ${item.label} spending`}>
          {[[0, 'Keep'], [0.5, 'Cut half'], [1, 'Cut all']].map(([fraction, label]) => (
            <button type="button" className={'seg-btn' + (current === fraction ? ' active' : '')} aria-pressed={current === fraction} key={fraction} onClick={() => choose(item.key, fraction)}>{label}</button>
          ))}
        </span>
      </div>
    );
  };

  const choose = (key, fraction) => {
    const next = new Map(selected);
    if (fraction <= 0) next.delete(key);
    else next.set(key, fraction);
    setSelected(next);
    onReduction(next);
    setResult(calculate(next, appliedCost));
  };

  const applyCost = () => {
    const raw = cost.trim();
    const value = raw ? Number(raw) : 0;
    if (isInvalidCost(value)) {
      onInvalid();
      costRef.current?.focus();
      return;
    }
    const next = roundMoney(value);
    setCost(next ? String(next) : '');
    setAppliedCost(next);
    onApplyCost(next);
    setResult(calculate(selected, next));
  };

  const reset = () => {
    const next = new Map();
    setSelected(next);
    setCost('');
    setAppliedCost(0);
    onReduction(next);
    onApplyCost(0);
    setResult(calculate(next, 0));
  };

  return (
    <div>
      {basis ? <p className="muted small">{basis}</p> : null}
      <div className="scenario-result" aria-live="polite">
        {result.scenarioState === 'missing-history' ? <p className="muted small">Add enough statement history to estimate monthly spending and cash runway.</p> : result.scenarioState === 'cash-exhausted' ? <p className="strong">That one-off cost would use all the cash in this scenario.</p> : result.scenarioState === 'zero-outflow' ? <p className="strong">No monthly spending remains in this scenario. Cash runway has no finite end on these assumptions.</p> : <>
          <div className="scenario-comparison">
            <span><span className="muted small">Current runway</span><strong className="num">{result.baselineRunwayDays} days</strong></span>
            <span aria-hidden="true">→</span>
            <span><span className="muted small">With changes</span><strong className="num">{result.scenarioRunwayDays} days</strong></span>
          </div>
          <p className="muted small">{runwaySummary(result)}</p>
        </>}
        {result.monthlySaved > 0 ? <p className="muted small">Estimated monthly spending reduced by {money(result.monthlySaved)}.</p> : null}
        {monthlyIncome > 0 && monthlyIncome >= monthlyOutflow && result.monthlySaved > 0 ? <p className="muted small">Since income already covers spending, these cuts add about {money(result.monthlySaved)} to what you keep each month.</p> : null}
      </div>
      <div className="scenario-heading"><PfaInfoPopover ariaLabel="How the runway estimate works" content={explain} /><button type="button" className="btn sm ghost" disabled={!selected.size && !appliedCost} onClick={reset}>Reset</button></div>
      {!items.length ? <p className="muted small">No eligible discretionary category has a monthly amount to reduce yet. You can still try a one-off cost.</p> : null}
      <div className="pair-scroll pair-scroll-recurring">
        <div className="recurring-list chk-list">
          {visible.map(renderRow)}
        </div>
      </div>
      {remaining.length ? (
        <Accordion type="single" collapsible className="scenario-more disclosure explainer">
          <AccordionItem value="more" className="border-0">
            <AccordionTrigger className="scenario-more-trigger muted small">{`${remaining.length} more ${remaining.length === 1 ? 'category' : 'categories'}`}</AccordionTrigger>
            <AccordionContent className="pair-scroll pair-scroll-recurring">
              <div className="recurring-list chk-list">{remaining.map(renderRow)}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      <Accordion type="single" collapsible className="scenario-cost disclosure explainer">
        <AccordionItem value="cost" className="border-0">
          <AccordionTrigger className="scenario-cost-trigger muted small">Add a cost you have not paid yet</AccordionTrigger>
          <AccordionContent className="manage-actions scenario-cost-controls">
            <Input ref={costRef} type="number" className="name-field" aria-label="Extra one-off cost to try" min="0" step="0.01" placeholder="Amount" value={cost} onChange={(event) => setCost(event.target.value)} onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className="btn sm ghost" onClick={applyCost}>Apply</button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
