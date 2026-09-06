/*
 * icons.js - the inline SVG icon set (currentColor).
 * Moved verbatim out of app.js. It was a large, fully self-contained block
 * with no dependency on bootUI state, so it earns its own file rather than
 * sitting inline in the application core. Nothing inside was renamed.
 */
export const S = (p, o = {}) =>
  `<svg viewBox="0 0 24 24" width="${o.w || 16}" height="${o.h || 16}" fill="none" stroke="currentColor" stroke-width="${o.sw || 1.7}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
export const iconUp = () => S('<path d="M12 19V5M6 11l6-6 6 6"/>');
export const iconDown = () => S('<path d="M12 5v14M6 13l6 6 6-6"/>');
export const iconInfo = () => S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>');
export const iconPencil = () =>
  S('<path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>', { w: 14, h: 14 });
/* The (i) affordance, drawn SOLID rather than stroked.
 *
 * The outline version is the section decoration above; it cannot be the tap
 * target too. Measured on a 2x screen at the 16px this mark is used at, the
 * stroked ring lands 59% of its ink in anti-aliased fringe rather than solid
 * colour, and on a 1x screen 91% - eight solid pixels and a grey smudge. That
 * is what "pixelated" looks like: a 1.7-unit stroke in a 24-unit box scaled to
 * two thirds has no whole pixel to land on, and the dot of the "i" is a
 * zero-length round cap barely one pixel across.
 *
 * A filled disc with the glyph knocked out (evenodd) has one edge instead of
 * four, so the same mark measures 17% fringe at 2x and 33% at 1x. It also
 * carries its own colour: quiet in var(--dim), never a hairline that thins to
 * nothing. */
export const iconInfoFill = () =>
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none" shape-rendering="geometricPrecision">' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.4A9.6 9.6 0 1 0 12 21.6 9.6 9.6 0 0 0 12 2.4z' +
  'm0 4.1a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7z' +
  'm-1.15 4.6a1.15 1.15 0 0 1 2.3 0v5.3a1.15 1.15 0 0 1-2.3 0z"/></svg>';
export const iconChevron = () => S('<path d="M9 6l6 6-6 6"/>');
export const iconBulb = () =>
  S(
    '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.6.4 1 1 1 2h4c0-1 .4-1.6 1-2a6 6 0 0 0-3-11z"/>'
  );
export const iconFlag = () => S('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>');
export const iconChart = () => S('<path d="M4 20V6M10 20V4M16 20v-8M22 20H2"/>');
/* A luggage-tag outline, for the custom-label control on a transaction row.
   iconTag is a filled circle (the category swatch) and reads as a dot, not a
   label, so it could not do this job. */
export const iconLabel = () =>
  S('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z"/><circle cx="7.5" cy="7.5" r="1.3"/>');
export const iconPie = () =>
  S('<path d="M12 3v9h9a9 9 0 1 0-9 9"/><path d="M21 12a9 9 0 0 0-9-9"/>');
export const iconStore = () => S('<path d="M4 9h16M5 9l-1-4h16l-1 4M5 9v11h14V9"/>');
export const iconList = () => S('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>');
export const iconTag = (c) =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="${c}" stroke="none"><circle cx="12" cy="12" r="6"/></svg>`;
export const iconAlert = () =>
  S(
    '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  );
export const iconSpark = () =>
  S('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/>');
export const iconRepeat = () =>
  S(
    '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'
  );
export const iconGlobe = () =>
  S(
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>'
  );
export const iconReceipt = () =>
  S('<path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2z"/><path d="M9 8h6M9 12h6"/>');
export const iconBack = () => S('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>');
export const iconPeak = () => S('<path d="M3 20h18M6 20l4-9 4 5 4-11"/>');
export const iconGap = () =>
  S(
    '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/>'
  );
export const iconX = () => S('<path d="M18 6 6 18M6 6l12 12"/>', { w: 12, h: 12 });
export const iconPhone = () =>
  S('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>');
export const iconSpinner = () =>
  '<svg class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round"/></svg>';
// Two rails with a handle on each: the settings glyph. Data & settings wore
// the (i) that every explanatory disclosure in the app wears, which said
// "here is a note about this card" about the one card that IS the controls.
export const iconSliders = () =>
  S('<path d="M4 8h9M18 8h2M4 16h2M11 16h9"/><circle cx="15.5" cy="8" r="2.5"/><circle cx="8.5" cy="16" r="2.5"/>');
export const iconCal = () =>
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>';
