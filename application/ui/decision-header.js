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

// The ONLY metric sizes in the product. A figure that is not one of these
// four does not exist; adding a fifth is a design change, not a call-site
// decision. Mirrored by the .metric-* rules in premium.css.
export const METRIC_SIZES = ['hero', 'major', 'minor', 'row'];

const TONES = new Set(['good', 'watch', 'neutral', 'alert']);
const toneClass = (t) => 'tone-' + (TONES.has(t) ? t : 'neutral');

export function chartInfo(el, label, content, tone) {
  const details = el('details', { class: 'chart-info' },
    el('summary', { 'aria-label': `${label}: details`, ...(tone ? { class: 'tag ' + toneClass(tone) } : {}) }, `${label} ⓘ`),
    el('div', { class: 'chart-info-body' }, ...(Array.isArray(content) ? content : [content])));
  details.addEventListener?.('keydown', (event) => {
    if (event.key === 'Escape') { details.open = false; details.querySelector('summary').focus(); }
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
    ...(opts.open ? { open: '' } : {}),
    ...(opts.name ? { name: opts.name } : {}),
  });
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

  // One metric, at one of the four sanctioned sizes. Used by the header for
  // its own primary figure and by every supporting metric row, so a figure
  // anywhere in the app is built by this one function.
  function metric(spec, size = 'minor') {
    if (!spec) return null;
    const s = METRIC_SIZES.includes(size) ? size : 'minor';
    const box = el('div', { class: 'metric metric--' + s });
    box.append(figureText('metric-value', spec.text, spec.label));
    if (spec.label) box.append(el('div', { class: 'metric-label' }, spec.label));
    if (spec.tag) {
      box.append(
        el(
          'div',
          { class: 'metric-status' },
          el('span', { class: 'tag ' + toneClass(spec.tone) }, spec.tag)
        )
      );
    }
    // A supporting metric's own working - the itemised commitments behind
    // "Committed before payday", say. It is already inside a disclosure the
    // person chose to open, so it is shown outright there rather than folded
    // a second time; nothing a figure is made of gets dropped on the way in.
    if (spec.detail) box.append(el('p', { class: 'metric-detail' }, spec.detail));
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
      class: 'card decision' + (spec.class ? ' ' + spec.class : ''),
      'data-surface': 'lead',
      ...(spec.id ? { id: spec.id } : {}),
    });

    const head = el('div', { class: 'dh' });
    head.append(el('p', { class: 'dh-question' }, spec.question || ''));

    const fig = spec.figure || {};
    head.append(figureText('dh-figure metric-value metric--hero', fig.text, spec.question));

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
    if (hasFooter) sec.append(footer);
    if (spec.extra) sec.append(spec.extra);

    return sec;
  }

  return { renderDecisionHeader, metric, disclosure, tagRow };
}
