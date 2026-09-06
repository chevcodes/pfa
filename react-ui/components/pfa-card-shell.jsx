import * as React from 'react';
import { rememberedOpen, rememberOpen } from '../../application/ui/collapsible-card-state.js';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export function PfaCardShell({ as: Shell = 'div', id, name, className = '', title, summary, iconMarkup, explain, children, foldAll = true, compact = false, persistOpen = true, initialOpen = false, alwaysOpen = false, bare = false }) {
  const stateKey = name || title;
  const defaultOpen = alwaysOpen || (persistOpen ? rememberedOpen(stateKey, initialOpen) : initialOpen);
  const icon = explain ? <PfaInfoPopover content={explain} /> : iconMarkup ? <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : null;
  const disclosure = <PfaCardDisclosure bare name={name} title={title} summary={summary} icon={icon} hasExplain={!!explain} foldAll={foldAll} compact={compact} alwaysOpen={alwaysOpen} defaultOpen={defaultOpen} onOpenChange={persistOpen ? (open) => rememberOpen(stateKey, open) : undefined}>{children}</PfaCardDisclosure>;
  if (bare) return disclosure;
  return <Shell className={'card card-collapsible pfa-react-root' + (compact ? ' card-compact' : '') + (className ? ' ' + className : '')} id={id || name || undefined} tabIndex={name ? -1 : undefined} data-fold-all={foldAll && !compact && !alwaysOpen ? 'true' : 'false'} data-open={defaultOpen ? 'true' : 'false'}>{disclosure}</Shell>;
}
