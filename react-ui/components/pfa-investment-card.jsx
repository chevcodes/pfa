import * as React from 'react';
import { PfaInvestmentAccountControl } from './pfa-investment-account-control.jsx';
import { PfaInvestmentHoldings } from './pfa-investment-holdings.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaInvestmentHistory, PfaInvestmentMovement } from './pfa-investment-sections.jsx';
import { VanillaBody } from '../vanilla-body.jsx';

function BodyNode({ node }) {
  return node ? <VanillaBody node={node} /> : null;
}

export function PfaInvestmentCard({ accountControl, accountControlProps, value, asOf, cashParked, movement, movementProps, statedIncome, details, historyProps, holdingsProps, manualNote, manualNoteText }) {
  return (
    <div className="inv-card">
      {accountControlProps ? <PfaInvestmentAccountControl {...accountControlProps} /> : <BodyNode node={accountControl} />}
      <div className="inv-total">
        <strong className="num metric-value metric--minor">{value}</strong>
        <span className="muted small">{asOf}</span>
        {cashParked ? <span className="muted small">{cashParked}</span> : null}
        {statedIncome ? <span className="muted small">{statedIncome.text}<PfaInfoPopover label="" content={statedIncome.explain.map((line, index) => <p className="inv-note muted small" key={index}>{line}</p>)} /></span> : null}
      </div>
      {movementProps ? <PfaInvestmentMovement {...movementProps} /> : <BodyNode node={movement} />}
      {holdingsProps ? <div><PfaInvestmentHistory {...historyProps} /><PfaInvestmentHoldings {...holdingsProps} /></div> : <BodyNode node={details} />}
      {manualNoteText ? <p className="inv-note muted small">{manualNoteText}</p> : <BodyNode node={manualNote} />}
    </div>
  );
}
