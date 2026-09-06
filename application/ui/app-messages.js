import { Store } from '../core/storage.js';
import { addDaysIso, isoToday, syncLayoutInsets, requireCtx } from '../core/shared-helpers.js';
import { commitAndRender } from './reversible.js';
import { appBannerReact, greetingReact, unmountGreetingReact } from './react-bridge.js';

export function backupPromptSnooze(storedUntil, legacyDismissed, today = isoToday()) {
  const migrated = !storedUntil && !!legacyDismissed;
  const until = storedUntil || (migrated ? addDaysIso(today, 30) : null);
  return { until, migrated, shouldOffer: !until || until < today };
}

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
      'toast',
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
    toast,
  } = ctx;
  /* install prompt (iOS) */
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function maybeOfferInstall() {
    if (isStandalone() || !isIOS()) return;
    if (await Store.getMeta('installDismissed', false)) return;
    if (!state.records.length) return;
    if (bannerAlreadyShown()) return;
    const banner = mountBanner('install');
    appBannerReact(banner, {
      iconMarkup: iconPhone(),
      message: 'Add this to your Home Screen for reliable offline access and durable local storage. Tap the Share button, then “Add to Home Screen”.',
      actions: [
        {
          className: 'btn sm ghost',
          label: 'Not now',
          onClick: async () => {
            await commitAndRender({
              commit: () => Store.setMeta('installDismissed', true),
              render: () => setBannerShown(banner, false),
            });
          },
        },
      ],
    });
    setBannerShown(banner, true);
  }

  async function maybeOfferBackup() {
    const snooze = backupPromptSnooze(
      await Store.getMeta('backupPromptSnoozedUntil', null),
      await Store.getMeta('backupPromptDismissed', false)
    );
    if (snooze.migrated) {
      await Store.setMetaMany([
        { key: 'backupPromptSnoozedUntil', value: snooze.until },
        { key: 'backupPromptDismissed', value: null },
      ]);
    }
    if (!snooze.shouldOffer) return;
    const statementTotal =
      (state._cardStatements || []).length + (state._bankStatements || []).length;
    if (statementTotal < 3) return;
    if (bannerAlreadyShown()) return;
    const banner = mountBanner('backup-banner');
    appBannerReact(banner, {
      iconMarkup: iconAlert(),
      message: 'Only on this device. Back up?',
      actions: [
        {
          className: 'btn sm',
          label: 'Back up now',
          onClick: async () => {
            if (await doExportHistory()) {
              setBannerShown(banner, false);
              document.getElementById('export-btn')?.focus({ preventScroll: true });
            }
          },
        },
        {
          className: 'btn sm ghost',
          label: 'Not now',
          onClick: async () => {
            await commitAndRender({
              commit: () => Store.setMeta('backupPromptSnoozedUntil', addDaysIso(isoToday(), 30)),
              render: () => setBannerShown(banner, false),
              notify: () => toast('Backup reminder paused for 30 days.', async () => {
                await commitAndRender({
                  commit: () => Store.setMeta('backupPromptSnoozedUntil', snooze.until),
                  render: () => setBannerShown(banner, true),
                  notify: () => toast('Put back.'),
                });
              }),
            });
          },
        },
      ],
    });
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
    if (statementTotal !== 1) return;
    if (await Store.getMeta('firstRunHintShown', false)) return;
    if (bannerAlreadyShown()) return; // never stack over another banner at the same slot
    const banner = mountBanner('first-run-banner');
    appBannerReact(banner, {
      iconMarkup: iconChart(),
      message: 'Add a couple more months to see trends, fixed expenses, and how each month compares.',
      actions: [
        {
          className: 'btn sm',
          label: 'Add statements',
          onClick: () => {
            setBannerShown(banner, false);
            pickStatements();
          },
        },
        {
          className: 'btn sm ghost',
          label: 'Not now',
          onClick: async () => {
            await commitAndRender({
              commit: () => Store.setMeta('firstRunHintShown', true),
              render: () => setBannerShown(banner, false),
            });
          },
        },
      ],
    });
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

  function mountTopGreeting(props, opts = {}) {
    const existing = $('#greeting');
    if (existing) {
      clearTimeout(existing._h);
      unmountGreetingReact(existing.querySelector('.greeting-inner'));
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
      setTimeout(() => {
        unmountGreetingReact(inner);
        box.remove();
      }, 320);
    };
    greetingReact(inner, { ...props, iconMarkup: iconX(), onDismiss: dismiss });
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
    mountTopGreeting({ text }, { autoMs: 6000 });
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
      { heading, subtext: 'Everything stays on this device. Nothing leaves it.' },
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
