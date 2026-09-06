import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaUpcomingPayments({ beforeIncomeText, beforeIncomeDate, beforeIncome, scheduled = [], onAdd, days, hasTimeline, timelineLabel, timelineText, timelineInfo }) {
  const paymentRow = (item, index) => {
    const Tag = item.onClick ? 'button' : 'div';
    return <Tag type={item.onClick ? 'button' : undefined} className="recurring-row up-pay upcoming-payment-row" onClick={item.onClick || undefined} key={`${item.label}:${index}`}>
      <span className="recurring-name">{item.label}</span>
      <span className="upcoming-payment-status muted small">{item.status}</span>
      <span className="recurring-amt num">{item.amount}</span>
      {item.onClick ? <span className="up-row-cue" aria-hidden="true">›</span> : null}
    </Tag>;
  };
  const paymentGroups = [...new Set(beforeIncome.map((item) => item.date))].map((date) => ({ date, items: beforeIncome.filter((item) => item.date === date) }));
  const initialGroups = [];
  let initialPaymentCount = 0;
  for (const group of paymentGroups) {
    if (initialPaymentCount >= 3) break;
    initialGroups.push(group);
    initialPaymentCount += group.items.length;
  }
  const remainingGroups = paymentGroups.slice(initialGroups.length);
  const groupedRows = (groups) => groups.map(({ date, items }) => (
    <div className="upcoming-date-group" key={date}>
      <h4>{date}</h4>
      <div className="recurring-list upcoming-date-payments">{items.map(paymentRow)}</div>
    </div>
  ));
  const support = <>
    {scheduled.length || onAdd ? <PfaInlineDisclosure name="plan-expected-payments-set" label="Manage saved payments"><div className="recurring-list">
      {scheduled.map((item) => <button type="button" className="recurring-row up-pay" onClick={item.onClick} key={item.id}>
        <span className="recurring-name">{item.label}</span>
        <span className="recurring-months muted small">{item.due} · {item.status}</span>
        <span className="recurring-amt num">{item.amount}<span className="up-row-cue" aria-hidden="true">›</span></span>
      </button>)}
    </div>{onAdd ? <button type="button" className="btn sm ghost" onClick={onAdd}>Set a monthly payment</button> : null}</PfaInlineDisclosure> : null}
    {hasTimeline ? (
      <PfaInlineDisclosure name="plan-expected-payments-timeline" label={timelineLabel}><p className="muted small">{timelineText} <PfaInfoPopover label="" ariaLabel="Cash flow forecast details" content={timelineInfo} /></p><div className="pair-scroll pair-scroll-upcoming">
        <div className="up-timeline">
          <div className="up-now"><span className="up-now-dot" /><span className="up-now-label">Now</span></div>
          <div className="up-days">
            {days.map((day, index) => (
              <React.Fragment key={day.date}>
                {index > 0 ? <div className="up-gap" style={{ flexGrow: day.gapFlex, minHeight: day.gapMinHeight }} /> : null}
                <div className="up-day">
                  <div className="up-day-head"><span className="up-day-tick" /><span className="up-day-date">{day.dateLabel}</span><span className="up-day-away muted small">{day.awayText}</span></div>
                  {day.events.map((event, eventIndex) => {
                    const Tag = event.onClick ? 'button' : 'div';
                    return (
                      <Tag type={event.onClick ? 'button' : undefined} className="up-pay" onClick={event.onClick || undefined} key={`${event.label}:${eventIndex}`}>
                        <span className="up-pay-name">{event.label}</span>
                        <span className="up-pay-source muted small">{event.status}</span>
                        <span className={'up-pay-amt num ' + event.amountClass}>{event.amount}</span>
                        <span className="up-pay-bar" data-proportional=""><span className="up-pay-bar-fill" style={{ width: `${event.width}%`, background: event.colour }} /></span>
                      </Tag>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
            <div className="up-gap-tail" />
          </div>
        </div>
      </div></PfaInlineDisclosure>
    ) : null}
  </>;
  return (
    <div className="upcoming-payments">
      {beforeIncome.length ? (
        <>
          {beforeIncomeDate ? <div className="upcoming-window"><span className="muted small">Next pay</span><time className="upcoming-window-date num">{beforeIncomeDate}</time></div> : null}
          <div className="upcoming-groups">
            {groupedRows(initialGroups)}
          </div>
          {remainingGroups.length ? <PfaInlineDisclosure name="plan-expected-payments-more" className="upcoming-more" label={`Show ${beforeIncome.length - initialPaymentCount} more payments`}><div className="upcoming-groups">
            {groupedRows(remainingGroups)}
          </div></PfaInlineDisclosure> : null}
        </>
      ) : <p className="muted small">{beforeIncomeText}</p>}
      {scheduled.length || hasTimeline || onAdd ? <div className="upcoming-support">{support}</div> : null}
    </div>
  );
}
