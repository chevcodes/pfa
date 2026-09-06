import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

export function PfaInfoPopover({ label, content, tone, ariaLabel, iconSlot = false }) {
  const [open, setOpen] = React.useState(false);
  const pinnedRef = React.useRef(false);
  const triggerRef = React.useRef(null);
  const privacyNotice = typeof document !== 'undefined' && document.documentElement.dataset.privacy === 'on';

  const closeUnlessPinned = React.useCallback(() => {
    if (!pinnedRef.current) setOpen(false);
  }, []);

  const toneClass = tone ? 'tag tone-' + tone : '';
  const summaryClass = [toneClass, !label ? 'is-icon-only' : '', iconSlot ? 'icon-slot-tap' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <span
        className="chart-info"
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
          if (e.currentTarget.contains(e.relatedTarget)) return;
          closeUnlessPinned();
        }}
      >
        <PopoverPrimitive.Trigger
          ref={triggerRef}
          className={'pfa-info-trigger' + (summaryClass ? ' ' + summaryClass : '')}
          aria-label={ariaLabel || `${label || 'More information'}: details`}
          onClick={(event) => {
            event.stopPropagation();
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
        <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={'chart-info-body' + (privacyNotice ? ' pfa-info-privacy-notice' : '')}
          side="bottom"
          align="center"
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={() => {
            pinnedRef.current = false;
            triggerRef.current?.focus();
          }}
          onPointerDownOutside={() => {
            pinnedRef.current = false;
          }}
        >
          {privacyNotice ? 'Show figures to read this explanation.' : content}
        </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </span>
    </PopoverPrimitive.Root>
  );
}
