import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

/**
 * Replaces the vanilla native <details class="disclosure card-disclosure">
 * pattern (see application/ui/decision-header.js buildCollapsibleCard) with
 * Radix's Accordion primitive. Reuses the app's existing visual language
 * (colours, spacing, chevron) from interface/premium.css's --disclosure
 * design tokens via the .pfa-card-disclosure rules below, rather than
 * inventing a new visual style - only the open/close mechanism changes.
 *
 * Radix renders Trigger inside a Header (an <h3> by default), which does
 * not match native <details>'s flat <summary> as a direct child, so this
 * does not reuse interface/premium.css's ".disclosure > summary" selectors
 * verbatim - those rely on that exact parent-child shape. New, additive
 * rules for the Radix data-state attributes live in
 * react-ui/styles/pfa-card-disclosure.css instead, matching the same
 * colours/spacing/timing by reading the same CSS custom properties.
 *
 * This fixes the three documented native-<details> bugs at this call site:
 * opening reordered the element in source order (plan-render.js), "always
 * open" fought the browser's own toggle-on-click (decision-header.js), and
 * measuring height while a tab is display:none is unreliable for
 * scrollHeight but is exactly what Radix's --radix-accordion-content-height
 * is built to solve (measured when content becomes visible, not while
 * hidden).
 */
export function PfaCardDisclosure({
  name,
  title,
  icon,
  summary,
  // hasExplain mirrors collapsibleCard's own `explain ? chartInfo(...) :
  // iconNode` branch (application/ui/decision-header.js): building the
  // actual chartInfo popover needs the vanilla `el()` helper, so the caller
  // builds that DOM node and passes it as `icon` - this flag only decides
  // whether the aria-label composes the same way collapsibleCard's does.
  hasExplain = false,
  compact = false,
  foldAll = !compact,
  alwaysOpen = false,
  defaultOpen = false,
  onOpenChange,
  // When true, skips the outer <section class="card card-collapsible">
  // wrapper - used by react-bridge.js's collapsibleCardReact, whose mount
  // container synchronously IS that section (name/compact set on it
  // directly), because several vanilla call sites mutate the returned
  // node afterward (card.classList.add(...), card.id = ...) the same way
  // they do with collapsibleCard's real <details> return value. The
  // standalone comparison harness (AccordionComparison.jsx) still wants
  // the wrapper, so it stays the default.
  bare = false,
  children,
}) {
  const [open, setOpen] = React.useState(alwaysOpen || defaultOpen);
  const rootRef = React.useRef(null);
  const value = open ? 'open' : 'closed';

  React.useEffect(() => {
    setOpen(alwaysOpen || defaultOpen);
  }, [alwaysOpen, defaultOpen]);

  const handleValueChange = React.useCallback(
    (next) => {
      // Mirrors the vanilla d.addEventListener('toggle', () => { if (!d.open)
      // d.open = true }) guard: closing is blocked outright, not undone after
      // the fact, so there is no visible flash-closed.
      if (alwaysOpen && next !== 'open') return;
      setOpen(next === 'open');
      onOpenChange?.(next === 'open');
    },
    [alwaysOpen, onOpenChange]
  );

  const label = hasExplain
    ? [typeof title === 'string' ? title : '', summary].filter(Boolean).join(' - ')
    : undefined;
  const leadingIcon = hasExplain && React.isValidElement(icon) && icon.type === PfaInfoPopover
    ? React.cloneElement(icon, { ariaLabel: `${title}: what this means`, iconSlot: true })
    : icon;
  const infoIcon = hasExplain && React.isValidElement(leadingIcon) && leadingIcon.type === PfaInfoPopover;

  const root = (
      <AccordionPrimitive.Root
        ref={rootRef}
        type="single"
        collapsible={!alwaysOpen}
        value={value}
        onValueChange={handleValueChange}
        className="pfa-card-disclosure"
        data-always-open={alwaysOpen ? 'true' : undefined}
        data-fold-all={foldAll && !alwaysOpen ? 'true' : 'false'}
        data-open={open ? 'true' : 'false'}
      >
        <AccordionPrimitive.Item value="open" className="pfa-card-disclosure-item">
          <AccordionPrimitive.Header className="pfa-card-disclosure-header">
            {infoIcon ? <span className="pfa-card-disclosure-icon">{leadingIcon}</span> : null}
            <AccordionPrimitive.Trigger
              className="pfa-card-disclosure-trigger"
              data-has-icon={leadingIcon && !infoIcon ? 'true' : undefined}
              aria-label={label}
              onClick={(event) => {
                if (alwaysOpen) event.preventDefault();
              }}
              onKeyDown={(event) => {
                if (alwaysOpen && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                }
              }}
            >
              {leadingIcon && !infoIcon ? <span className="pfa-card-disclosure-icon" aria-hidden="true">{leadingIcon}</span> : null}
              <span className="card-title">{title}</span>
              {summary ? <span className="card-disclosure-note muted small">{summary}</span> : null}
              <span className="pfa-card-disclosure-chevron" aria-hidden="true" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="pfa-card-disclosure-content">
            <div className="disclosure-body">{children}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      </AccordionPrimitive.Root>
  );

  if (bare) return root;

  return (
    <section
      className={'card card-collapsible' + (compact ? ' card-compact' : '')}
      id={name || undefined}
      tabIndex={name ? -1 : undefined}
    >
      {root}
    </section>
  );
}
