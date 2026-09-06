import * as React from 'react';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaExpandableList } from './pfa-expandable-list.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion.jsx';

export function PfaForeignSpending({ groups, money, date, totalText, info, onDrill, shareBar }) {
  return (
    <>
      <div className="foreign-headline">
        <button type="button" className="foreign-amt" onClick={onDrill} title="Show all foreign purchases">{totalText}</button>
        <PfaInfoPopover label="" content={info.map((text, index) => <p key={index}>{text}</p>)} />
        <button type="button" className="btn sm ghost" onClick={onDrill}>See all</button>
      </div>
      {shareBar ? <VanillaBody node={shareBar} /> : null}
      <PfaExpandableList
        items={groups}
        initial={3}
        className="foreign-list"
        renderItem={(group, index) => (
          <Accordion type="multiple" key={`${group.label}:${index}`}>
            <AccordionItem value={group.label} className="foreign-group border-0">
              <AccordionTrigger className="foreign-row hover:no-underline">
                <span className="swatch sm" style={{ background: group.colour }} />
                <span className="foreign-place-name">{group.label}</span>
                <span className="foreign-jmd num strong">{money(group.total)}</span>
              </AccordionTrigger>
              <AccordionContent className="foreign-sub">
                {group.items.map((item, itemIndex) => (
                  <div className="foreign-subrow" key={`${item.date}:${itemIndex}`}>
                    <span className="muted small">{date(item.date)}</span>
                    <span className="foreign-subrow-right">
                      <span className="foreign-fx muted small">{item.foreignText}</span>
                      <span className="num">{money(item.amount)}</span>
                    </span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      />
    </>
  );
}
