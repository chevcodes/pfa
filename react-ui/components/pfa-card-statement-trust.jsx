import { VanillaBody } from '../vanilla-body.jsx';
import { PfaSubhead } from './pfa-subhead.jsx';

export function PfaCardStatementTrust({ headerNode, headerModel, paymentTraceText }) {
  return (
    <>
      {headerModel ? <PfaSubhead {...headerModel} /> : <VanillaBody node={headerNode} />}
      {paymentTraceText ? <p className="muted small">{paymentTraceText}</p> : null}
    </>
  );
}
