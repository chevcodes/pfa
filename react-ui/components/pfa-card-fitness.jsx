import * as React from 'react';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaPayoffChart } from './pfa-payoff-chart.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaCardShell } from './pfa-card-shell.jsx';

function renderSection(section, index) {
  if (section.type === 'balance') {
    return (
      <div className="hero-figure" key={index}>
        <div className="fact-value metric-value metric--minor">{section.amount}</div>
        {section.action ? <button type="button" className="btn sm ghost" onClick={section.action.onClick}>{section.action.label}</button> : null}
      </div>
    );
  }
  if (section.type === 'text') return <p className={section.className || ''} key={index}>{section.text}</p>;
  if (section.type === 'metrics') {
    return (
      <div className="sec-grid" key={index}>
        {section.items.map((item, itemIndex) => (
          <div className="sec-item" key={`${item.label}:${itemIndex}`}>
            <div className="sec-value metric-value">{item.value}</div>
            <div className="sec-label muted small">{item.label}</div>
          </div>
        ))}
      </div>
    );
  }
  if (section.type === 'info') {
    const popover = <PfaInfoPopover label={section.label} content={section.content} />;
    return section.wrapperClass ? <div className={section.wrapperClass} key={index}>{popover}</div> : <React.Fragment key={index}>{popover}</React.Fragment>;
  }
  if (section.type === 'utilisation') {
    return (
      <p className="muted small" key={index}>
        Credit used, {section.value}. <PfaInfoPopover label="What this means" content="The share of your credit limit in use. It is an input to a credit score - not a measure of your spending, and not money you owe beyond the balance itself." />
      </p>
    );
  }
  if (section.type === 'chart') {
    if (section.hidden) return <PfaHiddenChart key={index} what="Card payoff" height="220px" />;
    if (section.chartProps) return <PfaPayoffChart key={index} {...section.chartProps} />;
  }
  if (section.type === 'disclosure' && section.body) return <div className="card-fitness-estimate-note" key={index}><div className="card-fitness-estimate-note-title">{section.label}</div><p>{section.body}</p></div>;
  if (section.type === 'chart' || section.type === 'disclosure') return <VanillaBody node={section.node} key={index} />;
  return null;
}

export function PfaCardFitness({ sections, summary, compactSummary, summaryLabel, statusLabel, iconMarkup, behaviour }) {
  const balance = sections.find((section) => section.type === 'balance');
  const payoffAssumptions = sections.find((section) => section.key === 'payoff-assumptions');
  const summaryIsAssumptions = summary === payoffAssumptions?.text;
  const monthsToClear = sections
    .filter((section) => section.type === 'metrics')
    .flatMap((section) => section.items)
    .find((item) => item.key === 'months-to-clear');
  const detail = sections
    .filter((section) => (
      section !== balance &&
      section.key !== 'payoff-assumptions' &&
      section.key !== 'balance-barely-moves' &&
      section.key !== 'payoff-unavailable'
    ))
    .map((section) => {
      if (section.type !== 'metrics' || !monthsToClear) return section;
      const items = section.items.filter((item) => item !== monthsToClear);
      return items.length ? { ...section, items } : null;
    })
    .filter(Boolean);
  const hasPayoff = sections.some((section) => (
    section.type === 'chart' ||
    (section.type === 'metrics' && section.items.some((item) => item.key === 'months-to-clear'))
  ));
  const detailLabel = hasPayoff ? 'See payoff and statement details' : 'See statement details';
  return (
    <PfaCardShell bare name="activity-card-health" title="How your card is doing" summary={compactSummary} iconMarkup={iconMarkup}>
      <div className="card-fitness-body">
        <div className="card-fitness-overview">
          <div className="card-fitness-balance">
            <div className="card-fitness-reading-label">Latest balance{balance?.source ? <PfaInfoPopover label="" ariaLabel="Latest balance details" content={balance.source} /> : null}</div>
            {balance ? renderSection(balance, 'balance') : null}
          </div>
          <div className="card-fitness-reading" data-state={behaviour}>
            <div className="card-fitness-reading-top">
              <div className="card-fitness-reading-label">{summaryLabel}{payoffAssumptions ? <PfaInfoPopover label="" ariaLabel="Payoff estimate details" content={payoffAssumptions.text} /> : null}</div>
              <span className="card-fitness-status">{statusLabel}</span>
            </div>
            {monthsToClear ? <div className="card-fitness-payoff"><span className="card-fitness-payoff-value metric-value">{monthsToClear.value}</span><span className="card-fitness-payoff-unit">{monthsToClear.value === '1' ? 'month' : 'months'} to clear</span></div> : null}
            {monthsToClear?.note ? <p className="card-fitness-reading-copy">{monthsToClear.note}</p> : null}
            {!summaryIsAssumptions ? <p className="card-fitness-reading-copy">{summary}</p> : null}
          </div>
        </div>
        {detail.length ? <PfaInlineDisclosure className="card-fitness-detail" name="card-statement-details" label={detailLabel}><div className="disclosure-body">{detail.map(renderSection)}</div></PfaInlineDisclosure> : null}
      </div>
    </PfaCardShell>
  );
}
