import * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaInvestmentHolding({ name, value, signal, figureText, notes, mergedAccounts, mergedAccountCount, onSelectAccount, about }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="holding" className="disclosure inv-holding border-0">
        <AccordionTrigger className="inv-holding-trigger hover:no-underline">
          <span className="inv-holding-line">
            <span className="inv-holding-name">{name}</span>
            <span className="inv-holding-value num">{value}</span>
            {signal.text ? <span className={signal.className}>{signal.text}</span> : (
              <span className={`inv-signal ${signal.level ? 'is-level' : `tone-${signal.tone}`}`} role="img" aria-label={signal.label} title={signal.label}>
                <span className="inv-arrow" aria-hidden="true">{signal.level ? '◆' : signal.positive ? '▲' : '▼'}</span>
                <span className="num" aria-hidden="true">{signal.display}</span>
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="disclosure-body inv-holding-body">
          {figureText ? <p className="inv-holding-figures num">{figureText}</p> : null}
          {notes.map((text, index) => <p className="inv-note muted small" key={index}>{text}</p>)}
          {mergedAccountCount > 0 ? (
            <p className="inv-note muted small">
              Combined across {mergedAccounts.length ? mergedAccounts.map((account, index) => (
                <React.Fragment key={account.key}>
                  {index ? index === mergedAccounts.length - 1 ? ' and ' : ', ' : null}
                  <button className="linkbtn inv-account-link" type="button" title={`Show ${account.label} on its own`} onClick={() => onSelectAccount(account.key)}>{account.label}</button>
                </React.Fragment>
              )) : `${mergedAccountCount} accounts`}{mergedAccounts.length ? '. Open one to see its own cost.' : '.'}
            </p>
          ) : null}
          {about.length ? <div className="inv-holding-about"><PfaInfoPopover label="About these figures" content={about.map((text) => <p className="inv-note muted small" key={text}>{text}</p>)} /></div> : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
