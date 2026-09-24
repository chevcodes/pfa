import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

/**
 * Replaces application/ui/decision-header.js's chartInfo(el, label, content,
 * tone) - the app's one info-bubble, used at every ⓘ. Reuses the literal
 * "chart-info" / "chart-info-icon" / "chart-info-body" / "is-icon-only"
 * class names from interface/flow-chart.css and interface/feature-additions.css
 * on purpose: those class names are what every context-specific selector in
 * the app targets (".card-title > .chart-info", ".banktx .cat-tag +
 * .chart-info", "html[data-privacy='on'] .chart-info-body", ...) - CSS
 * classes aren't tied to element type, so keeping the same names on this
 * component's root and content, in the same DOM position, keeps every one
 * of those rules matching without copying or rewriting them.
 *
 * What changes: the open/closed mechanism. Native <details>'s [open]
 * attribute selectors (".chart-info[open] > .chart-info-body") become
 * data-state="open" here, in react-ui/styles/pfa-info-popover.css. And the
 * fixed-position viewport-flip math in the vanilla place() function is
 * replaced by Radix Popover's own floating-ui-based collision detection -
 * a genuine improvement, not a reimplementation, since it already handles
 * "flip above if there's no room below" and "clamp inside the viewport"
 * more robustly than a hand-rolled version.
 *
 * Behaviour parity with chartInfo: hover/focus opens (pointerType !==
 * 'touch'), click toggles a pinned state that survives pointer leave,
 * Escape closes and refocuses the trigger, and a click on the trigger
 * never reaches an ancestor card's own toggle (a ⓘ can sit inside a
 * card's own disclosure trigger).
 */
export function PfaInfoPopover({ label, content, tone }) {
  const [open, setOpen] = React.useState(false);
  const pinnedRef = React.useRef(false);
  const triggerRef = React.useRef(null);

  const closeUnlessPinned = React.useCallback(() => {
    if (!pinnedRef.current) setOpen(false);
  }, []);

  const toneClass = tone ? 'tag tone-' + tone : '';
  const summaryClass = [toneClass, !label ? 'is-icon-only' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <span
        className="chart-info"
        // Listens on the whole wrapper (icon + body), not just the trigger,
        // so moving the pointer from the icon into the body to read or
        // select the text - matching native <details>, where summary and
        // body share one hoverable container - doesn't close it.
        onPointerEnter={(e) => {
          if (e.pointerType === 'touch') return;
          setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'touch') return;
          closeUnlessPinned();
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Focus can move BETWEEN the trigger and the body; only close
          // once it has genuinely left the component.
          if (e.currentTarget.contains(e.relatedTarget)) return;
          closeUnlessPinned();
        }}
      >
        <PopoverPrimitive.Trigger
          ref={triggerRef}
          className={'pfa-info-trigger' + (summaryClass ? ' ' + summaryClass : '')}
          aria-label={`${label || 'More information'}: details`}
          onClick={(event) => {
            // A ⓘ may sit inside a card's own trigger; a click that reached
            // it would toggle the card the person only meant to ask about.
            event.stopPropagation();
            // Radix's Trigger has its own built-in click-to-toggle (flips
            // "open" via onOpenChange) composed alongside this handler;
            // preventDefault suppresses it (Radix's standard override
            // pattern) so this handler is the only thing deciding open
            // state on click - needed because "pin" isn't a plain toggle
            // of the current state, it's forcing open to match the NEW
            // pinned value, which may already match (a hover-opened
            // popover pinned by its first click must stay open, not flip
            // closed).
            event.preventDefault();
            pinnedRef.current = !pinnedRef.current;
            setOpen(pinnedRef.current);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              pinnedRef.current = false;
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {label ? <span className="chart-info-label">{label}</span> : null}
          <span
            className="chart-info-icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html:
                '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none" shape-rendering="geometricPrecision"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.4A9.6 9.6 0 1 0 12 21.6 9.6 9.6 0 0 0 12 2.4zm0 4.1a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zm-1.15 4.6a1.15 1.15 0 0 1 2.3 0v5.3a1.15 1.15 0 0 1-2.3 0z"/></svg>',
            }}
          />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          className="chart-info-body"
          side="bottom"
          align="center"
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Radix's default on close is to return focus to the trigger -
          // which would then fire this component's own onFocus handler and
          // reopen it right after a hover-driven close, an infinite
          // ping-pong. Escape and outside-pointerdown already call
          // triggerRef.current?.focus() explicitly below, so nothing here
          // needs Radix's own return-focus behavior.
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={() => {
            pinnedRef.current = false;
            triggerRef.current?.focus();
          }}
          onPointerDownOutside={() => {
            pinnedRef.current = false;
          }}
        >
          {content}
        </PopoverPrimitive.Content>
      </span>
    </PopoverPrimitive.Root>
  );
}
