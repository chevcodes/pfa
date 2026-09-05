import { Store } from '../core/storage.js';

export function createAppMessages(ctx) {
  const {
    state,
    $,
    el,
    allLedgerMonths,
    icon,
    iconX,
    iconPhone,
    iconAlert,
    iconChart,
    iconInfo,
  } = ctx;
  /* install prompt (iOS) */
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function maybeOfferInstall() {
    if (isStandalone() || !isIOS() || window.ccDesktop) return;
    if (await Store.getMeta('installDismissed', false)) return;
    if (!state.records.length) return;
    if (bannerAlreadyShown()) return;
    let banner = $('#install');
    if (!banner) {
      banner = el('div', {
        id: 'install',
        class: 'install-banner',
        role: 'note',
      });
      document.body.append(banner);
    }
    banner.innerHTML = '';
    banner.append(
      el('span', { class: 'install-icon', html: iconPhone() }),
      el(
        'span',
        {},
        'Add this to your Home Screen for reliable offline access and durable local storage. Tap the Share button, then “Add to Home Screen”.'
      ),
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            banner.classList.remove('show');
            Store.setMeta('installDismissed', true);
          },
        },
        'Not now'
      )
    );
    banner.classList.add('show');
  }

  /* C1 (S21): offer an encrypted backup once there is enough history to be worth
   * protecting. Its own banner element (never #install), appended to document.body,
   * reusing the generic .install-banner styling (positioning/animation only, nothing
   * iOS-specific). The primary action runs doExportHistory (the same encrypted export
   * as the Export menu); dismissing hides it and remembers the choice. No backup/shield
   * glyph exists in this icon set, so iconAlert is used: it flags the risk of loss the
   * copy names and reads distinctly from the neutral iconInfo used on card headers. */
  async function maybeOfferBackup() {
    if (await Store.getMeta('backupPromptDismissed', false)) return;
    const statementTotal =
      (state._cardStatements || []).length + (state._bankStatements || []).length;
    if (statementTotal < 3) return; // fewer than 3 statements: not enough history yet
    if (bannerAlreadyShown()) return; // never stack over another banner at the same slot
    let banner = $('#backup-banner');
    if (!banner) {
      banner = el('div', {
        id: 'backup-banner',
        class: 'install-banner',
        role: 'note',
      });
      document.body.append(banner);
    }
    banner.innerHTML = '';
    banner.append(
      el('span', { class: 'install-icon', html: iconAlert() }),
      el(
        'span',
        {},
        "Everything you've set up lives only on this device. Make an encrypted backup so you don't lose it."
      ),
      el(
        'button',
        {
          class: 'btn sm',
          onclick: () => {
            banner.classList.remove('show');
            doExportHistory();
          },
        },
        'Back up now'
      ),
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            banner.classList.remove('show');
            Store.setMeta('backupPromptDismissed', true);
          },
        },
        'Not now'
      )
    );
    banner.classList.add('show');
  }

  /* C2 (S7): a first-run nudge to add a second month, so trends, regular payments and
   * month-to-month comparison become available. Same banner mechanics as C1 (its own
   * element, document.body, reused .install-banner), gated on there being fewer than two
   * ledger-months. One dismiss action, no primary. iconChart is used because the copy is
   * about the trends a second month unlocks. */
  async function maybeOfferFirstRunHint() {
    if (allLedgerMonths().length >= 2) return;
    if (await Store.getMeta('firstRunHintShown', false)) return;
    if (bannerAlreadyShown()) return; // never stack over another banner at the same slot
    let banner = $('#first-run-banner');
    if (!banner) {
      banner = el('div', {
        id: 'first-run-banner',
        class: 'install-banner',
        role: 'note',
      });
      document.body.append(banner);
    }
    banner.innerHTML = '';
    banner.append(
      el('span', { class: 'install-icon', html: iconChart() }),
      el(
        'span',
        {},
        'Add a couple more months to see trends, regular commitments, and how each month compares.'
      ),
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            banner.classList.remove('show');
            Store.setMeta('firstRunHintShown', true);
          },
        },
        'Got it'
      )
    );
    banner.classList.add('show');
  }

  /* Whether any of the three bottom banners is already visible. The three gates are close
   * to mutually exclusive in practice - the backup prompt needs 3+ statements, the first-run
   * hint needs fewer than 2 ledger-months, and install is iOS-only - so at most one normally
   * qualifies. This guard is belt-and-braces so that in the rare overlap they never sit on top
   * of each other at the same fixed bottom position; whichever runs first this import wins the slot. */
  function bannerAlreadyShown() {
    return ['#install', '#backup-banner', '#first-run-banner'].some((sel) => {
      const b = $(sel);
      return b && b.classList.contains('show');
    });
  }

  function mountTopGreeting(build, opts = {}) {
    const existing = $('#greeting');
    if (existing) {
      clearTimeout(existing._h);
      existing.remove();
    }
    const box = el('div', {
      id: 'greeting',
      role: 'status',
      'aria-live': 'polite',
    });
    const inner = el('div', { class: 'greeting-inner' });
    box.append(inner);
    const dismiss = () => {
      clearTimeout(box._h);
      box.classList.remove('show');
      setTimeout(() => box.remove(), 320);
    };
    for (const node of build(dismiss)) if (node) inner.append(node);
    const stack = $('.topbar-stack');
    if (stack) stack.append(box);
    else document.body.append(box);
    requestAnimationFrame(() => box.classList.add('show'));
    if (opts.autoMs) box._h = setTimeout(dismiss, opts.autoMs);
    return dismiss;
  }

  function greetingLine(lead, tail) {
    const name = (state.firstName || '').trim();
    return name ? `${lead}, ${name}${tail}` : `${lead}${tail}`;
  }

  async function maybeGreetReturning(lastVisit) {
    if (!(state.records.length || state.bankRecords.length)) return;
    if (!(await Store.getMeta('welcomedAt', null)))
      await Store.setMeta('welcomedAt', new Date().toISOString());
    const gapDays = lastVisit ? Math.floor((Date.now() - Date.parse(lastVisit)) / 86400000) : null;
    const away = gapDays != null && gapDays >= 14 ? ' It\u2019s been a while.' : '';
    const text = greetingLine('Welcome back', '.') + away;
    mountTopGreeting(
      (dismiss) => [
        el('span', { class: 'greeting-text' }, text),
        el(
          'button',
          {
            class: 'btn sm ghost greeting-dismiss',
            'aria-label': 'Dismiss',
            onclick: dismiss,
          },
          icon(iconX())
        ),
      ],
      { autoMs: 6000 }
    );
  }

  async function maybeWelcomeFirstTime() {
    if (await Store.getMeta('welcomedAt', null)) return false;
    if (!(state.records.length || state.bankRecords.length)) return false;
    await Store.setMeta('welcomedAt', new Date().toISOString());
    // The name, when there is one, has already been learned during import from a
    // Scotiabank card or bank statement, or set by hand in Data & settings, so a
    // first-ever import can greet by name with no field to fill in. When none is
    // known (for example an NCB-only import), the welcome simply drops the name
    // rather than asking for it.
    const heading = greetingLine('Welcome', ', your statements have loaded in.');
    mountTopGreeting(
      (dismiss) => [
        el(
          'div',
          { class: 'greeting-body' },
          el('span', { class: 'greeting-heading' }, heading),
          el(
            'p',
            { class: 'muted small greeting-sub' },
            'Everything stays on this device. Nothing leaves it.'
          )
        ),
        el(
          'button',
          {
            class: 'btn sm ghost greeting-dismiss',
            'aria-label': 'Dismiss',
            onclick: dismiss,
          },
          icon(iconX())
        ),
      ],
      { autoMs: 7000 }
    );
    return true;
  }
  return {
    isStandalone,
    isIOS,
    maybeOfferInstall,
    maybeOfferBackup,
    maybeOfferFirstRunHint,
    maybeGreetReturning,
    maybeWelcomeFirstTime,
  };
}
