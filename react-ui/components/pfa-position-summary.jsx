import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

function PositionRow({ row, money }) {
  return (
    <div className="position-summary-row">
      <span className="muted">{row.label.replace(' - converted', '')}</span>
      <strong className="num">{money(Number(row.value) || 0)}</strong>
    </div>
  );
}

export function PfaPositionSummary({ summary, balances, money, figuresHidden, onCopy }) {
  const rows = summary.rows || [];
  const rowBy = (key, label) => rows.find((row) => row.key === key) || rows.find((row) => row.label === label) || null;
  const netWorth = rowBy('recorded-net-worth', 'Recorded net worth');
  const cardBalance = rowBy('card-balance', 'Card balance');
  const utilisation = rowBy('card-utilisation', 'Card utilisation %');
  const income = rowBy('typical-monthly-income', 'Typical monthly money in');
  const outflow = rowBy('typical-monthly-outflow', 'Typical monthly outflow');
  const cashRows = rows.filter((row) => row.label === 'Cash on hand' || /^Cash \(/.test(row.label));
  const used = utilisation ? Math.max(0, Math.min(100, Number(utilisation.value) || 0)) : 0;
  const scale = Math.max(Number(income && income.value) || 0, Number(outflow && outflow.value) || 0, 1);
  const monthlyRow = (row, tone) => {
    if (!row) return null;
    const width = Math.max(2, Math.round(((Number(row.value) || 0) / scale) * 100));
    return (
      <div className="position-monthly-row" key={row.key || row.label}>
        <PositionRow row={row} money={money} />
        <span className="position-monthly-track" data-proportional="">
          <span className={`position-monthly-fill is-${tone}`} style={{ width: `${width}%` }} />
        </span>
      </div>
    );
  };

  return (
    <div className="position-summary">
      <div className="position-summary-actions">
        <button className="btn sm" type="button" onClick={onCopy}>Copy summary</button>
      </div>
      {balances && balances.active ? (
        <p className="position-summary-note muted small">Uses statement figures only. Balances you entered are left out of this summary.</p>
      ) : null}
      {netWorth ? (
        <div className={`position-summary-hero${Number(netWorth.value) < 0 ? ' is-negative' : ''}`}>
          <span className="position-summary-hero-labels">
            <span className="position-summary-hero-label">Recorded net worth</span>
            <span className="muted small"><PfaInfoPopover label="About this figure" content="The headline figure included when this summary is copied." /></span>
          </span>
          <strong className="position-summary-hero-value num metric-value metric--major">{money(Number(netWorth.value) || 0)}</strong>
        </div>
      ) : null}
      <div className="position-summary-grid">
        {cashRows.length ? (
          <section className="position-summary-panel">
            <h4 className="position-summary-title">Cash represented</h4>
            {cashRows.map((row) => <PositionRow key={row.key || row.label} row={row} money={money} />)}
          </section>
        ) : null}
        {cardBalance || utilisation ? (
          <section className="position-summary-panel">
            <h4 className="position-summary-title">Card position</h4>
            {cardBalance ? <PositionRow row={cardBalance} money={money} /> : null}
            {utilisation ? (
              <div className="position-utilisation">
                <div className="position-utilisation-head">
                  <span className="muted">Limit used</span>
                  <strong className="num">{figuresHidden ? '••%' : `${used}%`}</strong>
                </div>
                <span className="position-utilisation-track" data-proportional="">
                  <span className="position-utilisation-fill" style={{ width: `${used}%` }} />
                </span>
              </div>
            ) : null}
          </section>
        ) : null}
        {income || outflow ? (
          <section className="position-summary-panel">
            <h4 className="position-summary-title">Typical month</h4>
            {monthlyRow(income, 'income')}
            {monthlyRow(outflow, 'outflow')}
          </section>
        ) : null}
      </div>
    </div>
  );
}
