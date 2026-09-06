import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaInvestmentHolding } from './pfa-investment-holding.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { rememberedOpen, rememberOpen } from '../../application/ui/collapsible-card-state.js';

export function PfaInvestmentHoldings({ groups, mix, notes }) {
  return (
    <div className="inv-breakdown">
      {mix ? <div className="inv-mix"><VanillaBody node={mix} /></div> : null}
      {groups.map((group) => {
        const name = group.remember;
        return (
          <PfaInlineDisclosure
            key={group.kind}
            className="inv-group"
            name={name}
            defaultOpen={rememberedOpen(name, false)}
            onOpenChange={(open) => rememberOpen(name, open)}
            label={(
              <span className="inv-group-head">
                <h4>{group.label}</h4>
                <span className="num muted small">{group.summary}</span>
              </span>
            )}
          >
            <div className="disclosure-body">
              <div className="inv-holdings">
                {group.holdings.map((holding, index) => <PfaInvestmentHolding {...holding} key={`${group.kind}-${index}`} />)}
              </div>
            </div>
          </PfaInlineDisclosure>
        );
      })}
      {notes.map((text, index) => <p className="inv-note muted small" key={index}>{text}</p>)}
    </div>
  );
}
