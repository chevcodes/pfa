import * as React from 'react';
import { categoryBudgetHistory, categoryBudgetPastAverage, categoryBudgetRecentMonths, categoryCoverageText, savingsDestinationPastAverage } from '../../application/analysis/category-budget.js';
import { groupForCategory, resolveGroupMap } from '../../application/analysis/plan.js';
import { asOfDayForMonth, paceForMonth } from '../../application/analysis/category-intentions.js';
import { PfaExpandableList } from './pfa-expandable-list.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaTargetBar } from './pfa-target-bar.jsx';

export function PfaCategoryBudget({ months, selectedMonth, selectedHistoryCategory, currentMonth, categories, groupAssignments, needsSorting = [], fallbackCategory, money, onMonthChange, onHistoryCategoryChange, onSave, onOpen, normalPlan = false }) {
  const [month, setMonth] = React.useState(selectedMonth);
  const [category, setCategory] = React.useState(categories[0] || '');
  const [amount, setAmount] = React.useState('');
  const [historyChoice, setHistoryChoice] = React.useState(selectedHistoryCategory || '');
  const [formOpen, setFormOpen] = React.useState(false);
  const amountRef = React.useRef(null);
  const shown = months.find((entry) => entry.month === month) || months[0];
  if (!shown) return null;
  const comparisonInfo = `Recorded bank and card purchases for one calendar month. ${normalPlan ? 'This differs from the normal-month allocation above.' : 'Limits start in the month you set them.'} ${categoryCoverageText(shown.coverage)}. ${shown.feeTotal > 0 ? 'Fees and tax are shown separately from category limits. ' : ''}Amounts include imported days only. Missing records are unknown; a recorded zero is different. Solid bars show monthly limits. Dashed bars show past averages from at least three fully covered comparable months among the last six. Spending above an average is a comparison, not over budget.`;
  const savings = (shown.savings || []).map((item) => ({ ...item, pastAverage: savingsDestinationPastAverage(months, month, item.key) }));
  const rows = shown.items.map((item) => ({
    ...item,
    pastAverage: item.limit == null ? categoryBudgetPastAverage(months, month, item.category) : null,
    pace: item.limit != null && month === currentMonth ? paceForMonth({ intention: { category: item.category, amount: item.limit }, targetMonth: month, spendSoFar: item.actual, asOfDay: asOfDayForMonth(month) }) : null,
  })).sort((a, b) => (b.limit != null && b.actual > b.limit ? 2 : b.pace?.signal === 'ahead-of-pace' ? 1 : 0) - (a.limit != null && a.actual > a.limit ? 2 : a.pace?.signal === 'ahead-of-pace' ? 1 : 0) || b.actual - a.actual);
  const limited = rows.filter((item) => item.limit != null);
  const overLimitRows = rows.filter((item) => item.limit != null && item.actual > item.limit);
  const paceRows = rows.filter((item) => item.limit != null && item.pace?.signal === 'ahead-of-pace' && item.actual <= item.limit);
  const overLimitTotal = overLimitRows.reduce((total, item) => total + item.actual - item.limit, 0);
  const groupMap = resolveGroupMap(null, groupAssignments);
  const unsorted = (item) => needsSorting.includes(item.category) || item.category === fallbackCategory;
  const groupSections = [
    { key: 'sorting', title: 'Still to place', items: rows.filter(unsorted), note: 'These categories count under Discretionary until you sort them.' },
    { key: 'fixed', title: 'Fixed expenses', items: rows.filter((item) => !unsorted(item) && groupForCategory(item.category, groupMap) === 'fixed') },
    { key: 'setAside', title: 'Savings & investments', items: rows.filter((item) => !unsorted(item) && groupForCategory(item.category, groupMap) === 'setAside'), savings },
    { key: 'free', title: 'Discretionary spending', items: rows.filter((item) => !unsorted(item) && groupForCategory(item.category, groupMap) === 'free') },
  ];
  const recentMonths = categoryBudgetRecentMonths(months);
  const historyCategories = [...new Set(recentMonths.filter((entry) => entry.hasRecords).flatMap((entry) => entry.items.map((item) => item.category)))].sort((a, b) => a.localeCompare(b));
  const historyCategory = historyCategories.includes(historyChoice) ? historyChoice : historyCategories.includes(limited[0]?.category) ? limited[0].category : historyCategories[0];
  const historyMonths = categoryBudgetHistory(recentMonths, historyCategory);
  const historyScale = Math.max(1, ...historyMonths.flatMap((entry) => [entry.actual, entry.limit || 0]));
  const limitStatus = !shown.hasRecords
    ? 'Waiting for a statement'
      : !limited.length
        ? 'No category limits set'
        : overLimitRows.length
          ? overLimitRows.length === 1 ? '1 category is above its monthly limit' : `${overLimitRows.length} categories are above their monthly limits`
          : paceRows.length
            ? paceRows.length === 1 ? '1 category is spending ahead of pace' : `${paceRows.length} categories are spending ahead of pace`
            : 'No recorded categories are above their limits';
  const limitStatusDetail = !shown.hasRecords
    ? `Add a bank or card statement covering ${shown.label} to compare actual spending.`
      : !limited.length
        ? 'Set a monthly limit to compare actual spending with what you planned.'
        : overLimitRows.length
          ? `${money(overLimitTotal)} combined above monthly limits`
          : paceRows.length
            ? 'Based on this month so far, these categories may go over their limits.'
          : `Recorded category spending for ${shown.label} is at or below its monthly limits.`;
  const statusTone = overLimitRows.length ? 'is-over' : paceRows.length ? 'is-watch' : !shown.hasRecords ? 'is-missing' : !limited.length ? 'is-unset' : '';

  async function save(event) {
    event.preventDefault();
    if (await onSave(category, Number(amount))) { setAmount(''); setFormOpen(false); }
  }

  function selectCategory(name) {
    setCategory(name);
    setAmount('');
    setFormOpen(true);
    requestAnimationFrame(() => amountRef.current?.focus());
  }

  return (
    <section className="category-budget" aria-labelledby="category-budget-title">
      <div className="category-budget-head">
        <h4 id="category-budget-title">Category spending <PfaInfoPopover label="" ariaLabel="Category spending details" content={comparisonInfo} /></h4>
        <label className="category-budget-period">Month
          <select value={month} onChange={(event) => { setMonth(event.target.value); onMonthChange(event.target.value); }}>
            {months.map((entry) => <option key={entry.month} value={entry.month}>{entry.label}{entry.month === currentMonth ? ' · current' : ''}</option>)}
          </select>
        </label>
      </div>
      <div className="category-budget-total">
        <div className="category-budget-total-copy">
          <span className="muted small">{shown.hasRecords ? `Recorded purchases · ${shown.label}` : `No statement recorded · ${shown.label}`}</span>
          <strong className="money num">{shown.hasRecords ? money(shown.purchaseTotal) : 'Unknown'}</strong>
        </div>
      </div>
      <div className={`category-budget-status ${statusTone}`}>
        <div>
          <span className="category-budget-status-label">Monthly limits</span>
          <strong className="category-budget-status-title">{limitStatus}<PfaInfoPopover label="" ariaLabel="Monthly limit details" content={limitStatusDetail} /></strong>
        </div>
        {overLimitRows.length ? <div className="category-budget-over-list" aria-label="Categories above their monthly limits">
          {overLimitRows.map((item) => <button type="button" className="linkbtn category-budget-over-item" key={item.category} onClick={() => onOpen(item.category, month)} aria-label={`See ${item.category} transactions; ${money(item.actual - item.limit)} above the monthly limit`}>
            <span>{item.category}</span><strong>{money(item.actual - item.limit)} over</strong>
          </button>)}
        </div> : null}
        {paceRows.length ? <div className="category-budget-pace-list" aria-label="Categories spending ahead of pace">
          {paceRows.map((item) => <button type="button" className="linkbtn category-budget-pace-item" key={item.category} onClick={() => onOpen(item.category, month)} aria-label={`See ${item.category} transactions; spending is ahead of pace`}>
            <span>{item.category}</span><strong>{money(item.limit - item.actual)} left · ahead of pace</strong>
          </button>)}
        </div> : null}
        <button type="button" className={`btn sm ${limited.length ? 'ghost' : 'primary'} category-budget-action`} onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen} aria-controls="category-budget-form">{formOpen ? 'Cancel' : limited.length ? 'Add a monthly limit' : 'Set a monthly limit'}</button>
      </div>
      <form id="category-budget-form" className="category-budget-form" hidden={!formOpen} onSubmit={save}>
        <span className="field-label">Set a limit from {months.find((entry) => entry.month === currentMonth)?.label || currentMonth}</span>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>Monthly limit<input ref={amountRef} type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
        <button type="submit" className="btn sm" disabled={!category || !(Number(amount) > 0)}>Save limit</button>
      </form>
      {historyMonths.length > 1 ? <PfaInlineDisclosure className="category-budget-history" name="plan-category-history" label="Compare recent months">
        <div className="category-budget-history-body">
          <label className="category-budget-history-picker">Category
            <select value={historyCategory} onChange={(event) => { setHistoryChoice(event.target.value); onHistoryCategoryChange?.(event.target.value); }}>{historyCategories.map((name) => <option key={name} value={name}>{name}</option>)}</select>
          </label>
          <div className="category-budget-history-list">
            {historyMonths.map((entry) => {
              const difference = entry.actual == null || entry.limit == null ? null : entry.limit - entry.actual;
              return <div className="category-budget-row" key={entry.month}>
                <div className="category-budget-row-top">
                  {entry.actual > 0 ? <button type="button" id={`plan-category-history-${entry.month}-${encodeURIComponent(historyCategory)}`} className="linkbtn" onClick={() => onOpen(historyCategory, entry.month)}>{entry.label}{entry.month === currentMonth ? ' · so far' : ''}<span className="visually-hidden"> · See {historyCategory} transactions</span></button> : <span>{entry.label}{entry.month === currentMonth ? ' · so far' : ''}</span>}
                  <strong className="money num">{entry.actual == null ? '—' : money(entry.actual)}</strong>
                </div>
                {entry.actual == null ? <p className="muted small">No statement recorded</p> : <PfaTargetBar actual={Math.max(0, entry.actual)} target={entry.limit} scaleMax={historyScale} />}
                {entry.actual != null ? <div className="category-budget-row-foot"><span>{entry.limit == null ? 'No limit set' : `Limit ${money(entry.limit)}`}</span>{difference != null ? <span className={difference < 0 ? 'category-budget-over' : ''}>{difference < 0 ? `${money(-difference)} over` : `${money(difference)} left`}</span> : null}</div> : null}
              </div>;
            })}
          </div>
        </div>
      </PfaInlineDisclosure> : null}
      <div className="category-budget-sections">
      {groupSections.filter((group) => group.items.length || group.savings?.length).map((group) => {
        const scaleMax = Math.max(1, ...group.items.flatMap((item) => [item.actual, item.limit || 0, item.pastAverage?.amount || 0]));
        const groupInfo = [group.note, group.savings?.length ? 'Net money moved into savings destinations. A negative figure is a drawdown.' : null].filter(Boolean).join(' ');
        const groupSummary = group.key === 'sorting'
          ? `${group.items.length} to sort`
          : [
            group.items.length ? `${group.items.length} ${group.items.length === 1 ? 'category' : 'categories'}` : null,
            group.savings?.length ? `${group.savings.length} ${group.savings.length === 1 ? 'destination' : 'destinations'}` : null,
          ].filter(Boolean).join(' · ');
        return <PfaInlineDisclosure className={`category-budget-section category-budget-section-${group.key}`} key={group.key} name={`plan-category-section-${group.key}`} label={<span className="category-budget-section-trigger"><span className="category-budget-section-title">{group.title}{groupInfo ? <PfaInfoPopover label="" ariaLabel={`${group.title}: details`} content={groupInfo} /> : null}</span><span className="category-budget-section-summary">{groupSummary}</span></span>}>
          <div className="category-budget-section-content">
          {group.items.length ? <PfaExpandableList key={`${month}:${group.key}`} items={group.items} initial={5} step={5} className="category-budget-list" renderItem={(item) => {
            const difference = item.limit == null ? null : item.limit - item.actual;
            const usual = item.pastAverage ? item.actual - item.pastAverage.amount : null;
            return <div className="category-budget-row" id={`plan-category-budget-row-${month}-${encodeURIComponent(item.category)}`} tabIndex={-1} key={item.category}>
              <div className="category-budget-row-top">
                {item.actual !== 0 && shown.hasRecords ? <button type="button" id={`plan-category-${month}-${encodeURIComponent(item.category)}`} className="linkbtn" onClick={() => onOpen(item.category, month)}>{item.category}<span className="visually-hidden"> · See bank and card transactions for {shown.label}</span></button> : <span>{item.category}</span>}
                <strong className="money num">{shown.hasRecords ? money(item.actual) : 'Awaiting statement'}</strong>
              </div>
              {shown.hasRecords ? <PfaTargetBar actual={Math.max(0, item.actual)} target={item.limit ?? item.pastAverage?.amount ?? null} scaleMax={scaleMax} historical={item.limit == null} tone={group.key === 'sorting' ? 'free' : group.key} /> : null}
              <div className="category-budget-row-foot"><span>{item.limit != null ? `Monthly limit ${money(item.limit)}` : item.pastAverage ? `Past average ${money(item.pastAverage.amount)} · ${item.pastAverage.months} full months` : 'No limit or comparable past average'}</span>{shown.hasRecords && difference != null ? <span className={difference < 0 ? 'category-budget-over' : ''}>{difference < 0 ? `${money(-difference)} over` : item.pace?.signal === 'ahead-of-pace' ? `${money(difference)} left · ahead of pace` : `${money(difference)} left`}</span> : shown.hasRecords && usual != null ? <span>{usual === 0 ? 'Same as average' : `${money(Math.abs(usual))} ${usual > 0 ? 'above' : 'below'} average`}</span> : null}</div>
              {item.limit == null && categories.includes(item.category) ? <button type="button" className="linkbtn category-budget-set" onClick={() => selectCategory(item.category)}>Set a monthly limit</button> : null}
            </div>;
          }} /> : null}
          {group.savings?.length ? <div className="category-budget-list">{group.savings.map((item) => <div className="category-budget-row" key={item.key}><div className="category-budget-row-top"><span>{item.label}</span><strong className="money num">{money(item.amount)}</strong></div><div className="category-budget-row-foot"><span>{item.pastAverage ? `Past average ${money(item.pastAverage.amount)} · ${item.pastAverage.months} full months` : 'No comparable past average'}</span><span>{item.amount < 0 ? `Drawdown ${money(-item.amount)}` : 'Net added'}</span></div></div>)}</div> : null}
          </div>
        </PfaInlineDisclosure>;
      })}
      {shown.fees.length ? <PfaInlineDisclosure className="category-budget-section category-budget-section-fees" name="plan-category-fees" label={<span className="category-budget-section-trigger"><span className="category-budget-section-title">Fees and tax outside limits</span><span className="category-budget-section-summary">{money(shown.feeTotal)}</span></span>}>
        <div className="category-budget-section-content">
          <div className="category-budget-fees">{shown.fees.map((item) => <button type="button" id={`plan-category-fee-${month}-${encodeURIComponent(item.category)}`} className="linkbtn" key={item.category} onClick={() => onOpen(item.category, month, 'fee')}><span>{item.category}</span><strong className="money num">{money(item.actual)}</strong></button>)}</div>
        </div>
      </PfaInlineDisclosure> : null}
      {shown.refundTotal < 0 ? <PfaInlineDisclosure className="category-budget-section category-budget-section-refunds" name="plan-category-refunds" label={<span className="category-budget-section-trigger"><span className="category-budget-section-title">Returned money without a category</span><span className="category-budget-section-summary">{money(-shown.refundTotal)}</span></span>}>
        <div className="category-budget-section-content"><p className="muted small">These returned amounts are not included in category totals because they could not be attributed to a category.</p></div>
      </PfaInlineDisclosure> : null}
      </div>
    </section>
  );
}
