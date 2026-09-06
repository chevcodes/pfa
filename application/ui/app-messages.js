import { Store } from '../core/storage.js';
import { syncLayoutInsets, requireCtx } from '../core/shared-helpers.js';
import { commitAndRender } from './reversible.js';

export function createAppMessages(ctx) {
  // Every other factory in this codebase validates its context at construction
  // time; these three did not, and it was app-messages - one of the three -
  // that shipped a ctx member nobody passed. `doExportHistory` was simply
  // absent, so the backup banner's own button called an unbound name and threw
  // ReferenceError when pressed, months after the code was written, with a
  // green suite throughout. requireCtx turns that into a loud failure at boot
  // instead of a silent one on a button press.
  requireCtx(
    ctx,
    [
      'state',
      '$',
      'el',
      'icon',
      'iconX',
      'iconPhone',
      'iconAlert',
      'iconChart',
      'doExportHistory',
      'pickStatements',
    ],
    'createAppMessages'
  );

  const {
    state,
    $,
    el,
    icon,
    iconX,
    iconPhone,
    iconAlert,
    iconChart,
    doExportHistory,
    pickStatements,
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
    const banner = mountBanner('install');
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
          onclick: async () => {
            await commitAndRender({
              commit: () => Store.setMeta('installDismissed', true),
              render: () => setBannerShown(banner, false),
            });
          },
        },
        'Not now'
      )
    );
    setBannerShown(banner, true);
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
    const banner = mountBanner('backup-banner');
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
            setBannerShown(banner, false);
            doExportHistory();
          },
        },
        'Back up now'
      ),
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: async () => {
            await commitAndRender({
              commit: () => Store.setMeta('backupPromptDismissed', true),
              render: () => setBannerShown(banner, false),
            });
          },
        },
        'Not now'
      )
    );
    setBannerShown(banner, true);
  }

  /* C2 (S7): a first-run nudge to add a second month, so trends, regular payments and
   * month-to-month comparison become available. Same banner mechanics as C1 (its own
   * element, document.body, reused .install-banner), gated on there being fewer than two
   * ledger-months. One dismiss action, no primary. iconChart is used because the copy is
   * about the trends a second month unlocks.
   *
   * It asks for a statement and now offers the way to add one, the way the
   * backup banner offers the backup it asks for. It carried only "Got it",
   * which left the one banner that names an action as the only one without the
   * button for it - on a phone it sits pinned to the bottom, a screen away from
   * the Add in the header. No new door: pickStatements is the same one the
   * missing-months insight and the empty state already open. */
  async function maybeOfferFirstRunHint() {
    // Counted in STATEMENTS, not in ledger months. One monthly statement
    // straddles a month boundary - a Scotiabank cycle running 20 March to 15
    // April puts rows in two months - so "two or more months" was already true
    // after a single import, and this hint closed its own gate before anyone
    // could see it. What it promises (trends, fixed expenses, month against
    // month) needs a second STATEMENT, which is also what it asks for.
    const statementTotal =
      (state._cardStatements || []).length + (state._bankStatements || []).length;
    if (statementTotal >= 2) return;
    if (await Store.getMeta('firstRunHintShown', false)) return;
    if (bannerAlreadyShown()) return; // never stack over another banner at the same slot
    const banner = mountBanner('first-run-banner');
    banner.append(
      el('span', { class: 'install-icon', html: iconChart() }),
      el(
        'span',
        {},
        'Add a couple more months to see trends, fixed expenses, and how each month compares.'
      ),
      el(
        'button',
        {
          class: 'btn sm',
          onclick: () => {
            setBannerShown(banner, false);
            pickStatements();
          },
        },
        'Add statements'
      ),
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: async () => {
            await commitAndRender({
              commit: () => Store.setMeta('firstRunHintShown', true),
              render: () => setBannerShown(banner, false),
            });
          },
        },
        'Not now'
      )
    );
    setBannerShown(banner, true);
  }

  /* Whether any of the three bottom banners is already visible. The three gates are close
   * to mutually exclusive in practice - the backup prompt needs 3+ statements, the first-run
   * hint needs fewer than 2 ledger-months, and install is iOS-only - so at most one normally
   * qualifies. This guard is belt-and-braces so that in the rare overlap they never sit on top
   * of each other at the same fixed bottom position; whichever runs first this import wins the slot. */
  /* THE mount point for every bottom-of-page notice.
   *
   * Three identical nine-line blocks used to create-or-find their own banner
   * and append it to document.body, which made all three FIXED overlays. That
   * is what put the backup prompt on top of the Plan tab's headline: at scroll
   * zero it covered "Free spending $143,459.80" mid-row, plus "How this works"
   * and "Sort 6 categories" in the card beneath - the one figure the tab exists
   * to answer, hidden behind an advisory notice the moment you landed.
   *
   * A page-level reservation could not fix that. Reserving space at the END of
   * the document only guarantees the last row clears a floating bar; it says
   * nothing about what the bar covers at any other scroll position, and scroll
   * zero is the position everyone starts at.
   *
   * So the notice stops floating. Inserted before <main>, it sits in the flow
   * directly under the sticky header: it pushes the content down instead of
   * covering it, scrolls away with the page, and cannot hide anything at any
   * scroll position. It is a sibling of #app, not a child, so render()'s
   * innerHTML reset leaves it alone.
   */
  function mountBanner(id) {
    let banner = $('#' + id);
    if (!banner) {
      banner = el('div', { id, class: 'install-banner', role: 'note' });
      const main = document.getElementById('app');
      if (main && main.parentNode) main.parentNode.insertBefore(banner, main);
      else document.body.append(banner);
    }
    banner.innerHTML = '';
    return banner;
  }

  /* ONE way to raise or lower a bottom banner.
   *
   * Six separate classList toggles used to do this across the three banners.
   * With the page's reservation now taken from the banner's measured height,
   * every one of those had to remember to re-measure - so instead they all
   * come through here and none of them can forget. */
  function setBannerShown(banner, on) {
    if (!banner) return;
    banner.classList.toggle('show', !!on);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncLayoutInsets);
    else syncLayoutInsets();
  }

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
