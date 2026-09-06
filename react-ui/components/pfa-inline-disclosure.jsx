import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { VanillaBody } from '../vanilla-body.jsx';
import { rememberedOpen, rememberOpen } from '../../application/ui/collapsible-card-state.js';

function BodyNode({ node }) {
  return node ? <VanillaBody node={node} /> : null;
}

export function PfaInlineDisclosure({ label, body, children, className, name, id, defaultOpen, open, onOpenChange }) {
  const [value, setValue] = React.useState(rememberedOpen(name, defaultOpen) ? 'open' : 'closed');
  const currentValue = open === undefined ? value : open ? 'open' : 'closed';
  const triggerLabel = label && label.nodeType ? <BodyNode node={label} /> : label || 'Why';

  return (
    <AccordionPrimitive.Root
      id={id || undefined}
      type="single"
      collapsible
      value={currentValue}
      onValueChange={(next) => {
        const nextValue = next || 'closed';
        if (open === undefined) {
          setValue(nextValue);
          rememberOpen(name, nextValue === 'open');
        }
        onOpenChange?.(nextValue === 'open');
      }}
      className={`disclosure pfa-inline-disclosure ${className || ''}`.trim()}
      data-name={name || undefined}
    >
      <AccordionPrimitive.Item value="open" className="pfa-inline-disclosure-item">
        <AccordionPrimitive.Header className="pfa-inline-disclosure-header">
          <AccordionPrimitive.Trigger className="pfa-inline-disclosure-trigger" data-slot="accordion-trigger">
            {triggerLabel}
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content className="pfa-inline-disclosure-content">
          {children ?? <div className="disclosure-body"><BodyNode node={body} /></div>}
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}
