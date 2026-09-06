import {
  accountName,
  accountNameKey,
  cleanName,
  figuresHidden,
  NAME_MAX_LENGTH,
  requireCtx,
} from '../core/shared-helpers.js';
import { accountRenameReact, chartInfoReact } from './react-bridge.js';

export function createAccountRename(ctx) {
  requireCtx(ctx, ['state', 'el', 'changeSetting', 'trackUsage', 'track'], 'createAccountRename');
  const { state, el, changeSetting, trackUsage, track, idPrefix = 'rename' } = ctx;

  async function saveAccountName(key, clean, focusId) {
    const next = { ...(state.accountNames || {}) };
    if (clean) next[key] = clean;
    else delete next[key];
    await changeSetting({
      metaKey: 'accountNames',
      stateKey: 'accountNames',
      next,
      describe: () => (clean ? `Renamed to ${clean}.` : 'Name removed. The account number shows again.'),
      track: () => trackUsage(track),
    });
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }

  function renameControl({ kind, account, fallback, about, textClass }) {
    const friendly = accountName(state.accountNames, kind, account);
    const key = accountNameKey(kind, account);
    const id = `${idPrefix}-${key.replace(/[^a-z0-9]/gi, '-')}`;
    const provenanceText = friendly ? figuresHidden() ? 'The account number is hidden while private view is on.' : about : null;
    const info = typeof window === 'undefined'
      ? friendly ? chartInfoReact(el, '', provenanceText) : null
      : null;
    const lineNodes = [info].filter(Boolean);
    const props = {
      friendly,
      fallback,
      provenanceText,
      textClass,
      id,
      maxLength: NAME_MAX_LENGTH,
      onSave: (clean, focusId) => saveAccountName(key, cleanName(clean), focusId),
    };
    if (typeof window !== 'undefined') return { renameProps: props };
    return { renameNode: accountRenameReact(el, {
      ...props,
      provenanceText: null,
      provenance: lineNodes[0] || null,
    }) };
  }

  return { renameControl };
}
