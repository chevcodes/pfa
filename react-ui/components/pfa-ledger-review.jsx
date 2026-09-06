import * as React from 'react';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaConfirmLine } from './pfa-confirm-line.jsx';
import { PfaExpandableList } from './pfa-expandable-list.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

function ReviewList({ rows }) {
  return (
    <PfaExpandableList
      items={rows}
      renderItem={(row) => (
          <div className="review-row" key={row.id}>
            <div className="recurring-row">
              <span className="recurring-name">{row.label}</span>
              <span className="recurring-amt num strong">{row.amount}</span>
            </div>
            {row.questionProps ? <div className="confirm-line pfa-react-root"><PfaConfirmLine {...row.questionProps} /></div> : <VanillaBody node={row.question} />}
          </div>
      )}
    />
  );
}

export function PfaLedgerReview({ deposits, depositInfo, depositNote, refunds, refundInfo, refundNote, householdNote, waiting, manageLabel }) {
  const [answersOpen, setAnswersOpen] = React.useState(false);
  if (!deposits.length && !refunds.length) return <p className="muted small">{householdNote}</p>;
  const showDetails = waiting > 0 || answersOpen;
  const details = (
    <>
      {deposits.length ? (
        <>
          <p className="muted small review-note">{depositNote}<PfaInfoPopover content={<p>{depositInfo}</p>} /></p>
          <ReviewList rows={deposits} />
        </>
      ) : null}
      {householdNote ? <p className="muted small" style={{ marginTop: 8 }}>{householdNote}</p> : null}
      {refunds.length ? (
        <>
          <p className="muted small review-note" style={{ marginTop: 8 }}>{refundNote}<PfaInfoPopover content={<p>{refundInfo}</p>} /></p>
          <ReviewList rows={refunds} />
        </>
      ) : null}
    </>
  );

  return (
    <div className="review-adjustments-body">
      {waiting ? details : null}
      {waiting ? null : (
        <>
          <div className="review-settled">
            <p className="muted small">All review decisions are addressed. You can revisit an answer at any time.</p>
            <button className="btn sm review-manage" type="button" aria-controls="activity-review-answers" aria-expanded={answersOpen} onClick={() => setAnswersOpen((open) => !open)}>
              {answersOpen ? 'Close answers' : manageLabel}
            </button>
          </div>
          <div className="review-answers" id="activity-review-answers" hidden={!showDetails}>
            {details}
          </div>
        </>
      )}
    </div>
  );
}
