import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';
import { PfaLedgerTabs } from './pfa-ledger-tabs.jsx';

function PeriodSelect({ value, options, label, className, onValueChange }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className={className} style={{ backgroundImage: 'none' }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {options.map(([option, text]) => <SelectItem key={option} value={option}>{text}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function MonthSelect({ value, months, label, monthLabel, onValueChange }) {
  return (
    <PeriodSelect
      value={value}
      options={months.map((month) => [month, monthLabel(month)])}
      label={label}
      className="mini"
      onValueChange={onValueChange}
    />
  );
}

export function PfaPeriodBar({
  months,
  view,
  views,
  viewLabels,
  period,
  periodOptions,
  monthLabel,
  periodLabel,
  liveView,
  calendarIcon,
  emptyLabel,
  onPeriodChange,
  onCustomRangeChange,
  onViewChange,
  onReselect,
  onLayout,
}) {
  React.useLayoutEffect(() => {
    onLayout?.();
  });
  const tabViews = views.map((id) => ({ id, label: viewLabels[id] }));
  const switcher = (
    <div id="ledger-switch" className="ledger-switch" hidden={views.length < 2}>
      {views.length > 1 ? (
        <PfaLedgerTabs views={tabViews} value={view} onValueChange={onViewChange} onReselect={onReselect} />
      ) : null}
    </div>
  );

  if (!months.length) {
    return (
      <>
        <div className="period-left period-live period-empty">
          <span className="period-icon" dangerouslySetInnerHTML={{ __html: calendarIcon }} />
          <span className="period-live-title">{emptyLabel}</span>
        </div>
        {switcher}
      </>
    );
  }

  if (liveView) {
    return (
      <>
        <div className="period-left period-live">
          <span className="period-icon" dangerouslySetInnerHTML={{ __html: calendarIcon }} />
          <span className="period-live-title">{liveView[0]}</span>
        </div>
        {switcher}
        <div className="period-showing muted small">{liveView[1]}</div>
      </>
    );
  }

  return (
    <>
      <div className="period-left">
        <span className="period-icon" dangerouslySetInnerHTML={{ __html: calendarIcon }} />
        <PeriodSelect
          value={period.type}
          options={periodOptions}
          label="Reporting period"
          className="period-select"
          onValueChange={onPeriodChange}
        />
      </div>
      {period.type === 'custom' ? (
        <div className="period-range">
          <MonthSelect
            value={period.from}
            months={months}
            label="Custom range start month"
            monthLabel={monthLabel}
            onValueChange={(from) => onCustomRangeChange('from', from)}
          />
          <span className="muted">to</span>
          <MonthSelect
            value={period.to}
            months={months}
            label="Custom range end month"
            monthLabel={monthLabel}
            onValueChange={(to) => onCustomRangeChange('to', to)}
          />
        </div>
      ) : null}
      {switcher}
      {periodLabel ? <div className="period-showing muted small" style={{ marginLeft: 'auto' }}>{`Showing ${periodLabel}`}</div> : null}
    </>
  );
}
