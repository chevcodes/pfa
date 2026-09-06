/*
 * decision-header.js  -  THE headline component. Every major destination in
 * this app opens with exactly one of these, built the same way.
 *
 * Before this there were three competing headline languages: Overview's
 * .hero-eyebrow/.hero-title/.hero-amount-label, the .vm/.vm-number content
 * model on Activity, Position and Forecast, and Position's own summary table
 * of .recurring-row figures. They carried different type sizes, different
 * label treatments and different disclosure affordances, so four screens that
 * answer four questions in the SAME shape looked like four different products.
 *
 * The shape, fixed, in this order:
 *
 *   QUESTION   the decision this screen answers, in a person's own words
 *   FIGURE     ONE primary figure, at the single hero metric size
 *   MEANING    what that figure means, in one plain line
 *   STATUS     confidence and standing, as tone-tagged pills
 *   WHY        the working, behind progressive disclosure - never on the surface
 *   SUPPORT    secondary metrics, also behind disclosure unless genuinely peer
 *
 * Each destination keeps its own distinct meaning - Overview answers "what can
 * I spend", Activity "where did it go", Position "where do I stand", Forecast
 * "how low does it get" - but their visual construction is now identical:
 * same metric size, same tabular figures, same label scale, same status tags,
 * same disclosure. Only the words differ.
 *
 * Emits a strict, finite class vocabulary (premium.css): .dh, .dh-question,
 * .dh-figure, .dh-meaning, .dh-status, .dh-why, .dh-support. No caller sets a
 * font size, and no caller invents a fourth headline pattern.
 */
import { requireCtx, screenReaderFigure } from '../core/shared-helpers.js';
import { iconInfoFill } from '../core/icons.js';

// The ONLY metric sizes in the product. A figure that is not one of these
// four does not exist; adding a fifth is a design change, not a call-site
// decision. Mirrored by the .metric-* rules in premium.css.
export const METRIC_SIZES = ['hero', 'major', 'minor', 'row'];

const TONES = new Set(['good', 'watch', 'neutral', 'alert']);
export const surfaceTone = (tone) => (tone === 'good' ? 'neutral' : TONES.has(tone) ? tone : 'neutral');
const toneClass = (tone) => 'tone-' + surfaceTone(tone);

/* THE app's one info bubble. Every ⓘ on every tab is this function.
 *
 * It used to be a plain <details>: a click opened it, and nothing closed it
 * again. It stayed open while a person moved on to other parts of the tab, and
 * the only way to dismiss it was to find and click the same small icon a second
 * time. An explanation should behave like an explanation - appear when you look
 * at the thing, and go when you look away.
 *
 * Behaviour, in one place so all nine call sites get it:
 *   hover / focus  - opens, and closes again on leave. No click needed, none to
 *                    undo. The body is an absolutely positioned popover, so
 *                    opening it never pushes the layout around.
 *   click / tap    - toggles and PINS. Touch has no hover, so the tap path has
 *                    to keep working; pinning also lets a mouse user move onto
 *                    the bubble to select its text without it vanishing.
 *   click outside  - unpins and closes, so a pinned bubble cannot be left
 *                    behind the way the old one was.
 *   Escape         - closes and returns focus to the icon.
 */
export function chartInfo(el, label, content, tone) {
  const summaryClass = [tone ? 'tag ' + toneClass(tone) : '', label ? '' : 'is-icon-only']
    .filter(Boolean)
    .join(' ');
  const details = el(
    'details',
    { class: 'chart-info' },
    el(
      'summary',
      {
        'aria-label': `${label || 'More information'}: details`,
        ...(summaryClass ? { class: summaryClass } : {}),
      },
      label ? el('span', { class: 'chart-info-label' }, label) : null,
      el('span', { class: 'chart-info-icon', 'aria-hidden': 'true', html: iconInfoFill() })
    ),
    el(
      'div',
      { class: 'chart-info-body' },
      ...(Array.isArray(content) ? content : [content])
    )
  );
  /* The interactive half needs BOTH of these, so it checks for both.
     Guarding on addEventListener alone and then calling querySelector meant
     any element factory that supplied one and not the other - the print path,
     a test's stand-in DOM - crashed on the next line rather than falling back
     to the plain markup this early return exists to provide. Found the moment
     an (i) was added to a card a headless renderer builds. */
  if (typeof details.addEventListener !== 'function') return details;
  if (typeof details.querySelector !== 'function') return details;

  let pinned = false;
  const summary = details.querySelector('summary');
  const body = details.querySelector('.chart-info-body');
  const resetPlacement = () => {
    if (!body || !body.style) return;
    for (const key of ['position', 'left', 'right', 'top', 'bottom', 'width']) body.style[key] = '';
  };
  const place = () => {
    resetPlacement();
    if (!body || !summary) return;
    const anchor = summary.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const height = body.getBoundingClientRect().height;
    const dockBottom = document.body.classList.contains('has-bottom-nav')
      ? Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-bottom')) || 0
      : 0;
    const viewportBottom = window.innerHeight - dockBottom - 12;
    const left = Math.max(
      12,
      Math.min(window.innerWidth - width - 12, anchor.left + anchor.width / 2 - width / 2)
    );
    const below = anchor.bottom + 8;
    const top = below + height <= viewportBottom
      ? below
      : Math.max(12, anchor.top - height - 8);
    body.style.position = 'fixed';
    body.style.left = `${left}px`;
    body.style.right = 'auto';
    body.style.top = `${top}px`;
    body.style.bottom = 'auto';
    body.style.width = `${width}px`;
  };
  const open = () => {
    details.open = true;
    place();
  };
  const close = () => {
    details.open = false;
    resetPlacement();
  };

  // Hover. A coarse pointer (touch) never fires these, so it falls through to
  // the click path below rather than being left with no way in.
  details.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    open();
  });
  details.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    if (!pinned) close();
  });

  // Keyboard: the same reveal, driven by focus rather than the pointer.
  details.addEventListener('focusin', open);
  details.addEventListener('focusout', () => {
    if (pinned) return;
    // Focus can move BETWEEN the summary and the body; only close when it has
    // genuinely left the component.
    setTimeout(() => {
      if (!details.contains(document.activeElement)) close();
    }, 0);
  });

  // Click pins. <details> would toggle itself on summary click, which fights
  // the hover state, so the native toggle is suppressed and driven from here.
  summary?.addEventListener?.('click', (event) => {
    event.preventDefault();
    // An ⓘ may sit inside a card's own summary now, and a click that reached
    // it would toggle the card the person was only asking about.
    event.stopPropagation();
    pinned = !pinned;
    if (pinned) open();
    else close();
  });

  // A pinned bubble must not outlive the attention that opened it.
  document.addEventListener?.('pointerdown', (event) => {
    if (details.contains(event.target)) return;
    pinned = false;
    close();
  });

  details.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      pinned = false;
      close();
      summary?.focus?.();
    }
  });
  return details;
}

/* The app's one progressive-disclosure control: a summary a person can open
 * to see the working. Exported so any card can use it, inside a decision
 * header or not. `label` defaults to the word this app has always used. */
export function buildDisclosure(el, label, kids, opts = {}) {
  const body = (kids || []).filter(Boolean);
  if (!body.length) return null;
  const d = el('details', {
    class: 'disclosure' + (opts.class ? ' ' + opts.class : ''),
    ...(rememberedOpen(opts.remember, opts.open) ? { open: '' } : {}),
    ...(opts.name ? { name: opts.name } : {}),
  });
  rememberToggle(d, opts.remember);
  d.append(el('summary', {}, label || 'Why'));
  d.append(el('div', { class: 'disclosure-body' }, ...body));
  return d;
}

export function createDecisionHeader(ctx) {
  requireCtx(ctx, ['el'], 'createDecisionHeader');
  const { el } = ctx;

  // A figure, paired with a spoken description when the privacy gate masked
  // it. Bullets are correct on screen and meaningless read aloud, so the
  // masked form is hidden from assistive technology and replaced by the plain
  // redacted state - the accessible label reflects the SAME state the eye
  // sees, which is the half the old CSS-only approach never did.
  function figureText(cls, text, context) {
    const spoken = screenReaderFigure(context ? `${context}: amount hidden` : 'Amount hidden');
    const shown = text == null ? '' : String(text);
    // Built ONLY through the injected el(), never through the global document:
    // this factory takes its DOM builder as a dependency like every other
    // render factory in this app, and reaching past it for
    // document.createTextNode would tie the component to a real browser and
    // break every harness that drives it with a lightweight node stub.
    if (!spoken) return el('div', { class: cls }, shown);
    return el(
      'div',
      { class: cls },
      el('span', { class: 'visually-hidden' }, spoken),
      el('span', { 'aria-hidden': 'true' }, shown)
    );
  }

  function metric(spec, size = 'minor') {
    if (!spec) return null;
    const s = METRIC_SIZES.includes(size) ? size : 'minor';
    const linked = typeof spec.onClick === 'function';
    const box = el('div', { class: 'metric metric--' + s + (linked ? ' is-linked' : '') });
    const face = linked
      ? el('button', {
          class: 'metric-open',
          type: 'button',
          onclick: spec.onClick,
          ...(spec.goesTo ? { title: spec.goesTo, 'aria-label': `${spec.label || spec.text}: ${spec.goesTo}` } : {}),
        })
      : box;
    face.append(figureText('metric-value', spec.text, spec.label));
    if (spec.label) face.append(el('div', { class: 'metric-label' }, spec.label));
    if (spec.tagNode) {
      face.append(el('div', { class: 'metric-status' }, spec.tagNode));
    } else if (spec.tag) {
      face.append(
        el(
          'div',
          { class: 'metric-status' },
          el('span', { class: 'tag ' + toneClass(spec.tone) }, spec.tag)
        )
      );
    }
    if (linked) box.append(face);
    if (spec.detail) box.append(el('p', { class: 'metric-detail' }, spec.detail));
    if (spec.action) box.append(el('div', { class: 'metric-actions' }, spec.action));
    return box;
  }

  function tagRow(tags) {
    const list = (tags || []).filter(Boolean);
    if (!list.length) return null;
    const row = el('div', { class: 'dh-status' });
    for (const t of list) {
      if (t && t.nodeType) {
        row.append(t);
        continue;
      }
      if (t.detail) {
        const info = chartInfo(el, t.text, t.detail, t.tone || 'neutral');
        row.append(info);
      } else row.append(el('span', { class: 'tag ' + toneClass(t.tone) }, t.text));
    }
    return row;
  }

  // Progressive disclosure, one affordance app-wide - now genuinely shared
  // (buildDisclosure, below) rather than a private copy this factory could
  // drift from. A card outside a decision header used to reach for chartInfo's
  // "label ⓘ" popover instead, so one screen offered two different ways to
  // ask for the same thing.
  function disclosure(label, kids, opts = {}) {
    return buildDisclosure(el, label, kids, opts);
  }

  /*
   * spec:
   *   question   string   the decision, in plain words (required)
   *   figure     { text, tone, ariaLabel }   the ONE primary figure
   *   meaning    string   one line: what that figure means
   *   tags       [{ text, tone }] | [Node]   confidence and standing
   *   note       { text, tone }   a supporting line that must always be seen
   *                               (a reconciling statement, a recovery clause)
   *   why        [Node]   the working, collapsed
   *   support    [{ text, label, tag, tone }]  secondary metrics
   *   supportLabel string  what the supporting disclosure is called
   *   supportOpen  bool    show the supporting row on the surface (only when
   *                        the metrics are genuine peers of each other, never
   *                        of the primary figure)
   *   id         string
   */
  function renderDecisionHeader(spec) {
    if (!spec) return null;
    const sec = el('section', {
      class: 'card decision' + (spec.demoted ? ' decision--supporting' : '') + (spec.class ? ' ' + spec.class : ''),
      ...(spec.demoted ? {} : { 'data-surface': 'lead' }),
      ...(spec.id ? { id: spec.id } : {}),
    });

    const head = el('div', { class: 'dh' });
    head.append(el('h2', { class: 'dh-question' }, spec.question || ''));

    const fig = spec.figure || {};
    if (fig.text != null && fig.text !== '') {
      head.append(
        figureText(
          'dh-figure metric-value metric--' + (spec.demoted ? 'major' : 'hero'),
          fig.text,
          spec.question
        )
      );
    }

    if (spec.meaning) head.append(el('p', { class: 'dh-meaning' }, spec.meaning));

    const status = tagRow(spec.tags);
    if (status) head.append(status);

    if (spec.note && spec.note.text) {
      head.append(el('p', { class: 'dh-note ' + toneClass(spec.note.tone) }, spec.note.text));
    }

    // Every "show me more" on a decision header lands in ONE footer group,
    // divided from the answer above it by a single hairline: the reasoning
    // ("Why") and the supporting metrics that make up the figure. Two
    // disclosures floating loose under the tags read as two unrelated
    // afterthoughts; grouped, they read as the one place the working lives.
    const footer = el('div', { class: 'dh-footer' });
    const disclosureName = spec.id ? `${spec.id}-details` : '';
    const why = disclosure(spec.whyLabel || 'Why', spec.why, {
      class: 'dh-why',
      name: disclosureName,
    });
    if (why) footer.append(why);

    const support = (spec.support || []).filter(Boolean);
    let openSupportRow = null;
    if (support.length) {
      const row = el('div', { class: 'dh-support' });
      for (const m of support) row.append(metric(m, 'minor'));
      if (spec.supportOpen) openSupportRow = row;
      else {
        const sd = disclosure(spec.supportLabel || 'Break it down', [row], {
          class: 'dh-support-why',
          name: disclosureName,
        });
        if (sd) footer.append(sd);
      }
    }

    const hasFooter =
      (footer.childNodes && footer.childNodes.length) || (footer.kids && footer.kids.length);

    if (spec.extra && spec.extraAside) {
      const layout = el('div', { class: 'dh-layout' });
      const main = el('div', { class: 'dh-main' });
      main.append(head);
      if (openSupportRow) main.append(openSupportRow);
      layout.append(main);
      layout.append(el('div', { class: 'dh-aside' }, spec.extra));
      sec.append(layout);
      if (hasFooter) sec.append(footer);
      return sec;
    }

    sec.append(head);
    if (openSupportRow) sec.append(openSupportRow);
    // extraBeforeFooter puts the evidence directly under the answer, with the
    // reasoning below it. Without it the footer's "Why" sits between the
    // figure and the picture that shows it, interrupting the one sequence a
    // decision header exists to deliver.
    if (spec.extra && spec.extraBeforeFooter) sec.append(spec.extra);
    if (hasFooter) sec.append(footer);
    if (spec.extra && !spec.extraBeforeFooter) sec.append(spec.extra);

    return sec;
  }

  return { renderDecisionHeader, metric, disclosure, tagRow };
}

/* A whole card that opens closed, using the app's ONE disclosure mechanism.
 *
 * Principle 4/6: a screen should open saying one true, calm thing. A tab that
 * stacks eight full cards - the Plan tab renders over ten thousand pixels of
 * them - has decided on a person's behalf that they want all of it, every time.
 * Depth is not the problem; unrequested depth is.
 *
 * `summary` is the calm one-line fact this card would tell you at a glance, so
 * a closed card is still informative rather than a mystery box. Everything that
 * needs work - the figures, the controls, the tables - waits behind the tap.
 *
 * Reuses buildDisclosure's markup and CSS rather than adding a fifth
 * expand-and-collapse idiom: fixing one pattern should improve every screen.
 */
/* WHAT THE PERSON OPENED STAYS OPEN.
 *
 * These cards are rebuilt from scratch on every render(). So any click that changed state - choosing a goal
 * type, pressing a scenario button - collapsed the very drawer it happened
 * inside, and the person had to open it again to see the result of their own
 * action.
 *
 * A person's own toggle is remembered for this session. The
 * key is the card's `name` when it has one, otherwise its title: both are
 * stable across a rebuild, which is exactly the property needed. */
const CARD_OPEN_STATE = new Map();

export function rememberedCardKeys() {
  return [...CARD_OPEN_STATE.keys()];
}

export function forgetCollapsibleCards() {
  CARD_OPEN_STATE.clear();
}

function rememberedOpen(key, fallback) {
  return key && CARD_OPEN_STATE.has(key) ? CARD_OPEN_STATE.get(key) : !!fallback;
}

function rememberToggle(d, key) {
  if (!key || !d.addEventListener) return;
  d.addEventListener('toggle', () => {
    if (d.dataset && d.dataset.foldTransient) {
      delete d.dataset.foldTransient;
      return;
    }
    CARD_OPEN_STATE.set(key, d.open);
  });
}

export function placeFoldAll(el, host) {
  if (!host || !host.children || typeof host.insertBefore !== 'function') return null;
  const cards = () =>
    [...host.children]
      .filter((c) => c.classList.contains('card-collapsible') && !c.classList.contains('card-compact'))
      .map((c) => c.querySelector(':scope > details.card-disclosure'))
      .filter((d) => d && d.dataset && d.dataset.foldAll === 'true');
  const found = cards();
  if (found.length < 2) return null;
  const button = el('button', { type: 'button', class: 'fold-all-btn' });
  const row = el('div', { class: 'fold-all' }, button);
  const paint = () => {
    const list = cards();
    const opening = list.some((d) => !d.open);
    button.textContent = opening ? 'Open all' : 'Close all';
    button.classList?.toggle?.('is-open', !opening);
    button.setAttribute('aria-expanded', opening ? 'false' : 'true');
    button.setAttribute('aria-label', opening ? 'Open all sections' : 'Close all sections');
  };
  button.addEventListener('click', () => {
    const list = cards();
    if (list.some((d) => !d.open)) {
      for (const d of list) {
        if (d.open) continue;
        d.dataset.foldTransient = '1';
        d.open = true;
      }
    } else {
      for (const d of list) {
        if (!d.open) continue;
        d.dataset.foldTransient = '1';
        d.open = false;
      }
    }
    paint();
  });
  host.addEventListener('toggle', paint, true);
  host.insertBefore(row, found[0].parentElement);
  paint();
  return row;
}

/* THE CARD'S OWN ⓘ, in the slot the card already kept for a glyph.
 *
 * Four cards wore an info glyph that did nothing - a blue circled i, in the
 * most prominent position on the card, opening nothing - while a few pixels
 * below them the real ⓘ (a grey filled circle) carried the actual
 * explanation. One glyph, two meanings, and the decorative one was the louder.
 *
 * `explain` fills that slot with the real thing. Where a card has nothing to
 * explain its icon says what the card IS, and an info glyph is never used for
 * decoration again.
 */
/* A SUB-HEADING SAYS WHAT A SECTION IS; THE ⓘ SAYS WHAT IT MEANS.
 *
 * Every sub-section in Data & settings was built the same way by hand: a
 * heading, a decorative blue ⓘ that opened nothing, and a grey paragraph
 * under it. Three of those in a column made a wall of prose to read past on
 * the way to the control, and the ⓘ - a real disclosure everywhere else in
 * this app - was the one thing on the row doing no work.
 *
 * So the ⓘ does the work. `explain` goes behind it, exactly as it does on a
 * collapsibleCard. What stays on the line is `note`: not an explanation but a
 * figure the section is actually REPORTING ("2 of 5 statements reconcile",
 * "None yet"), which is the section's answer and has to be readable at a
 * glance. Same shape as a collapsed card - title left, its own summary right.
 *
 * `actions` is the same right-hand slot, for a section whose whole content IS
 * a short control row. "Your name" put a 260px field and a Save button on
 * their own line UNDER a two-word heading, leaving most of a 900px sheet
 * empty beside the words; so did Privacy, and the rules panels. A control
 * that fits beside its label belongs beside its label.
 */
/* THE plain "big number, small label" stat, for a row that answers "what is
 * here" at a glance - "180 statements", "36 months", a coverage span, a
 * freshness date. Data & settings' account-reconciliation panel built its own
 * boxed, bordered twin of this (.stmt-stat) instead of reusing it, so the
 * same idea - a glance row of figures - wore two different skins two rows
 * apart in the same drawer: plain here, a bordered tile there. One function,
 * read from every glance row.
 */
export function secItem(el, label, value) {
  return el(
    'div',
    { class: 'sec-item' },
    el('div', { class: 'sec-value' }, value),
    el('div', { class: 'sec-label muted small' }, label)
  );
}

export function subhead(el, { title, note = null, explain = null, icon: iconNode = null, actions = null, extra = '' }) {
  const lead = explain ? chartInfo(el, '', explain) : iconNode || null;
  // Named after what it explains, so the control is not announced as a bare
  // "More information" among several. Guarded the way chartInfo itself is,
  // for the element factories that supply only part of a DOM node.
  if (explain && typeof title === 'string' && typeof lead.querySelector === 'function') {
    const trigger = lead.querySelector('summary');
    if (trigger && typeof trigger.setAttribute === 'function') {
      trigger.setAttribute('aria-label', `${title}: what this means`);
    }
  }
  return el(
    'div',
    { class: 'sec-subhead' + (extra ? ' ' + extra : '') },
    el('span', { class: 'sec-subhead-title' }, lead, title),
    note ? el('span', { class: 'sec-subhead-note muted small' }, note) : null,
    actions ? el('span', { class: 'sec-subhead-actions' }, actions) : null
  );
}

export function collapsibleCard(el, {
  title,
  summary,
  icon: iconNode,
  explain,
  body,
  name,
  // `compact` is for a card that is a CONTROL rather than a section - the
  // account filter, say. It sizes to its own words instead of stretching to
  // the width of the content it acts on, so it stops reading as heavier than
  // the list beneath it.
  compact = false,
  foldAll = !compact,
  alwaysOpen = false,
}) {
  const kids = (Array.isArray(body) ? body : [body]).filter(Boolean);
  if (!kids.length) return null;
  if (summary == null || (typeof summary === 'string' && !summary.trim()))
    throw new Error(`collapsibleCard "${String(title || '')}" requires a closed-state summary`);
  // This function SUPPLIES the card shell. A body that is already a .card gets
  // two borders, two paddings, and its title printed twice - once on the
  // summary here and again on its own heading. That happened twice in one pass
  // (the plan sheet and the coverage strip), so rather than rely on every
  // future caller remembering, the shell is taken off the body here.
  for (const kid of kids) {
    if (kid && kid.classList && kid.classList.contains('card')) kid.classList.remove('card');
  }
  // A named card is addressable. `name` is already the stable key this card is
  // remembered by across a rebuild, which is exactly the property an anchor
  // needs, so it is the id too rather than a second identifier kept in step by
  // hand at each call site. tabindex lets smoothScrollToEl actually land focus
  // here, so arriving somewhere is announced and not merely scrolled to.
  const sec = el('section', {
    class: 'card card-collapsible' + (compact ? ' card-compact' : ''),
    ...(name ? { id: name, tabindex: '-1' } : {}),
  });
  const key = name || (typeof title === 'string' ? title : '');
  const d = el('details', {
    class: 'disclosure card-disclosure',
    ...(alwaysOpen || rememberedOpen(key, false) ? { open: '' } : {}),
    ...(name ? { name } : {}),
  });
  if (d.dataset) {
    d.dataset.foldAll = foldAll && !alwaysOpen ? 'true' : 'false';
    if (alwaysOpen) d.dataset.persistentOpen = 'true';
  }
  if (!alwaysOpen) rememberToggle(d, key);
  const head = explain ? chartInfo(el, '', explain) : iconNode || null;
  const cardSummary = el(
    'summary',
    {
      class: 'card-disclosure-summary',
      ...(explain
        ? { 'aria-label': [typeof title === 'string' ? title : '', summary].filter(Boolean).join(' - ') }
        : {}),
    },
    el('span', { class: 'card-title' }, head, title),
    summary ? el('span', { class: 'card-disclosure-note muted small' }, summary) : null
  );
  if (alwaysOpen && cardSummary.addEventListener) {
    cardSummary.addEventListener('click', (event) => event.preventDefault());
    cardSummary.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
    });
    d.addEventListener('toggle', () => {
      if (!d.open) d.open = true;
    });
  }
  d.append(cardSummary);
  d.append(el('div', { class: 'disclosure-body' }, ...kids));
  sec.append(d);
  return sec;
}
