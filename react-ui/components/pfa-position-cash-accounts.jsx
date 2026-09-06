import * as React from 'react';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaAccountRename } from './pfa-account-rename.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

function BodyNode({ node }) {
  return node ? <VanillaBody node={node} /> : null;
}

export function PfaPositionCashAccounts({ representedText, base, summaryNote, conversionInfo, conversionInfoText, shareNode, accounts, investmentAccounts }) {
  return (
    <div id="position-cashdebt">
      <div className="position-cash-overview">
        <div className="position-cash-summary">
          <span className="muted small">{`Represented in ${base}`}</span>
          <strong className="position-cash-total num metric-value metric--minor">{representedText}</strong>
          {summaryNote ? <span className="muted small">{summaryNote}</span> : conversionInfoText ? <PfaInfoPopover label="How this is converted" content={conversionInfoText} /> : <BodyNode node={conversionInfo} />}
        </div>
        {shareNode ? <div className="position-cash-share"><BodyNode node={shareNode} /></div> : null}
      </div>
      <div className="position-account-grid">
        {accounts.map((account) => (
          <div className="position-account-card" key={account.key}>
            <div className="position-account-head">
              {account.renameProps ? <PfaAccountRename {...account.renameProps} /> : <BodyNode node={account.renameNode} />}
              <span className="position-currency-pill">{account.currency}</span>
            </div>
            <button type="button" id={account.activityFocusId} className="position-account-open" aria-label={`Open activity for ${account.name}`} onClick={account.onOpen}>
              <strong className="position-account-amount num">{account.amount}</strong>
              <span className="position-account-converted muted small num">{account.convertedText}</span>
              {account.shareText ? (
                <span className="position-account-share">
                  <span className="position-account-share-label muted small num">{account.shareText}</span>
                  <span className="position-account-track" data-proportional=""><span className="position-account-fill" style={{ width: `${account.shareWidth}%` }} /></span>
                </span>
              ) : null}
            </button>
            {account.dateText ? (
              <div className="position-account-entered muted small">
                <span>{account.dateText}</span>
                <button type="button" id={`position-update-${account.key.replace(/[^a-z0-9]/gi, '-')}`} className="btn sm ghost" aria-label={account.updateLabel} onClick={account.onUpdate}>{account.updateText}</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {investmentAccounts.length ? (
        <div className="position-named-accounts">
          <span className="muted small">Investment accounts</span>
          {investmentAccounts.map((account) => account.renameProps ? <PfaAccountRename key={account.key} {...account.renameProps} /> : <BodyNode key={account.key} node={account.renameNode} />)}
        </div>
      ) : null}
    </div>
  );
}
