import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaSubhead } from './pfa-subhead.jsx';

function AccountCard({ account, onReviewAccount }) {
  const span = account.first
    ? account.first === account.last
      ? account.firstLabel
      : `${account.firstLabel} - ${account.lastLabel}`
    : 'no dated statements';
  const health = account.failed
    ? <span className="recon-warn">{`${account.failed} of ${account.n} need a look`}</span>
    : <span className="recon-ok">All reconcile</span>;
  const content = (
    <>
      <div className="stmt-card-head">
        <span className={'stmt-dot ' + (account.failed ? 'warn' : 'neutral')} />
        <span className="stmt-card-name">{`Account ${account.account}`}</span>
      </div>
      <div className="stmt-card-meta muted small">{`${span} · ${account.n} statement${account.n === 1 ? '' : 's'}`}</div>
      <div className="stmt-card-health">{health}</div>
    </>
  );

  const Card = account.element;
  return <Card type={account.element === 'button' ? 'button' : undefined} className={'stmt-card' + (account.failed ? ' attn' : '')} onClick={account.element === 'button' ? () => onReviewAccount(account) : undefined}>{content}</Card>;
}

function AccountGrid({ accounts, onReviewAccount }) {
  return <div className="stmt-grid">{accounts.map((account) => <AccountCard key={account.account} account={account} onReviewAccount={onReviewAccount} />)}</div>;
}

export function PfaAccountStatementTrust({ summary, drawerPreviewNode, drawerPreviewText, spanText, latestUpdatedText, completenessText, accountsN, needAttention, healthy, onReviewAll, onReviewAccount }) {
  const { title, note, explain } = summary;
  const label = (
    <>
      <PfaSubhead title={title} note={note} explain={explain} />
      {drawerPreviewText != null ? <span className="sec-fold-meta">{drawerPreviewText}</span> : <VanillaBody node={drawerPreviewNode} />}
    </>
  );

  return (
    <PfaInlineDisclosure name="account-statement-trust" className="stmt-summary-accordion" label={label}>
      <div className="disclosure-body sec-fold-body">
        {onReviewAll ? (
          <div className="manage-actions settings-actions">
            <button className="btn sm ghost" type="button" onClick={onReviewAll}>Review</button>
          </div>
        ) : null}
        <div className="sec-glance">
          <div className="sec-item">
            <div className="sec-value">{spanText}</div>
            <div className="sec-label muted small">{`Covered · ${accountsN} account${accountsN === 1 ? '' : 's'}`}</div>
          </div>
          <div className="sec-item">
            <div className="sec-value">{latestUpdatedText}</div>
            <div className="sec-label muted small">Last updated</div>
          </div>
        </div>
        {completenessText ? <p className="muted small stmt-note">{completenessText}</p> : null}
        {needAttention.length ? <AccountGrid accounts={needAttention} onReviewAccount={onReviewAccount} /> : null}
        {healthy.length ? (
          <PfaInlineDisclosure name="account-statement-trust-healthy" className="explainer stmt-accounts-more" label={`Per-account detail (${healthy.length} account${healthy.length === 1 ? '' : 's'})`}>
            <div className="disclosure-body explainer-body">
              <AccountGrid accounts={healthy} onReviewAccount={onReviewAccount} />
            </div>
          </PfaInlineDisclosure>
        ) : null}
      </div>
    </PfaInlineDisclosure>
  );
}
