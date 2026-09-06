import { requireCtx } from '../core/shared-helpers.js';
import { chartIsHidden, renderHiddenChart } from './chart-helpers.js';
import { layoutCategoryTreemap } from '../analysis/treemap-layout.js';
import { describeComparisonText, comparisonTone } from '../analysis/spend-breakdown.js';
import { staggerIn } from './motion.js';
import { chartTooltip } from './chart-surface.js';
import { markProportional } from '../core/privacy.js';

const SVGNS = 'http://www.w3.org/2000/svg';
let pictureId = 0;


export function hexToHsl(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hue = 0,
    sat = 0;
  const light = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return { h: hue, s: sat, l: light };
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function shiftHue(hex, attempt) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + attempt * 47, s, l);
}

const MIN_HUE_GAP = 24;
const GREY_SAT = 0.12;

function hueGap(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Two categories on screen together must never read as the same colour. An
// exact duplicate was the only case handled before, which left near-identical
// hues (and any two unsaturated greys, where rotating hue changes nothing)
// looking like one category split in two.
function tooClose(candidate, taken) {
  const c = hexToHsl(candidate);
  for (const other of taken) {
    if (c.s <= GREY_SAT || other.s <= GREY_SAT) {
      if (Math.abs(c.l - other.l) < 0.1 && Math.abs(c.s - other.s) < 0.1) return true;
      continue;
    }
    if (hueGap(c.h, other.h) < MIN_HUE_GAP) return true;
  }
  return false;
}

/*
 * THE TILE SURFACE.
 *
 * catColour hands back this app's category identity colours, which are pitched
 * as mid-tone pastels for use as small dots and tags. As large fills carrying
 * text they were the wrong value: measured on the real palette every tile
 * landed between 0.38 and 0.62 luminance - straddling the point where readable
 * ink flips - so Government & Tax (0.569) took black text while Subscriptions
 * (0.499) took white, on a seven-hundredths difference. Half the map in one
 * ink and half in the other reads as an error, and white on the lightest of
 * them was about 1.5:1 contrast, which is not readable at all.
 *
 * HUE IS IDENTITY and is never touched. Only value moves: each fill is pulled
 * into a band deep enough (or, in a light theme, pale enough) that ONE ink is
 * correct for every tile in the picture. Saturation gets a floor so a
 * desaturated input does not turn to mud, and a ceiling so nothing turns neon.
 */
// Targets are stated in perceived LUMINANCE, not HSL lightness: the two are
// not the same thing, and a saturated blue at L=0.62 reads far darker than a
// yellow at the same L. Clamping lightness therefore still let fills straddle
// the point where readable ink flips. These bands sit either side of that
// point with margin, so one ink is correct for every tile in a given theme.
/*
 * The two themes need OPPOSITE treatments, because they have opposite
 * problems.
 *
 * DARK: white ink on a coloured tile, and the tile is what limits contrast.
 * Value is therefore clamped by real luminance, tightened enough that the
 * label is crisp with NO outline behind it (an outline around text is a
 * legibility crutch, and it reads as a glow rather than as type).
 *
 * LIGHT: dark ink has enormous headroom - every fill already cleared 7:1 -
 * so constraining luminance there bought nothing and cost consistency.
 * Equal luminance across hues requires very different lightness (a yellow is
 * intrinsically bright, a blue intrinsically dark), so pinning luminance made
 * the olive read heavy at L=0.54 while the mauve looked washed at L=0.72 -
 * the same picture appearing to use two different palettes. Light mode is
 * therefore clamped by LIGHTNESS, which is what the eye reads as weight, and
 * contrast is merely checked afterwards.
 */
const LUM_DARK_MAX = 0.155;
const LIGHT_L = { lo: 0.74, hi: 0.8 };
const LIGHT_MIN_CONTRAST = 4.5;
const FILL_SAT = { lo: 0.26, hi: 0.6 };
/* Anchored to the shared chart ink (--chart-in / --chart-out, premium.css),
   whose light-mode mixes land at S 0.35 and S 0.52. The map carries identity
   rather than direction, so its tiles stay lighter than a bar - but they are
   drawn from the same saturation family, so the two surfaces read as one
   palette on the same card. */
const LIGHT_SAT = { lo: 0.3, hi: 0.52 };
const INK_DARK = '#10161f';

// Proper sRGB relative luminance (gamma-corrected), not a plain channel
// average: the two disagree enough to put a threshold in the wrong place.
function relLuminance(hex) {
  const h = String(hex).replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a, b) {
  const x = relLuminance(a);
  const y = relLuminance(b);
  const hi = Math.max(x, y);
  const lo = Math.min(x, y);
  return (hi + 0.05) / (lo + 0.05);
}

function prefersLightSurface() {
  if (typeof document === 'undefined' || !document.documentElement) return false;
  const theme = document.documentElement.dataset && document.documentElement.dataset.theme;
  if (theme === 'light') return true;
  if (theme === 'dark') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
}

export function tileSurface(hex, light) {
  const { h, s, l } = hexToHsl(hex);

  if (light) {
    // One tight lightness band, so every tile carries the same visual weight
    // whatever its hue. Contrast against the dark ink is then only verified,
    // never optimised for - it has room to spare.
    const sat = Math.min(LIGHT_SAT.hi, Math.max(LIGHT_SAT.lo, s));
    let lightness = Math.min(LIGHT_L.hi, Math.max(LIGHT_L.lo, l));
    let out = hslToHex(h, sat, lightness);
    for (let i = 0; i < 20 && contrastRatio(out, INK_DARK) < LIGHT_MIN_CONTRAST; i++) {
      lightness = Math.min(0.92, lightness + 0.02);
      out = hslToHex(h, sat, lightness);
    }
    return out;
  }

  // Dark: walk value down until white text clears the bar on its own.
  const sat = Math.min(FILL_SAT.hi, Math.max(FILL_SAT.lo, s));
  let lightness = Math.min(0.86, Math.max(0.14, l));
  let out = hslToHex(h, sat, lightness);
  for (let i = 0; i < 40 && relLuminance(out) > LUM_DARK_MAX; i++) {
    lightness -= 0.02;
    if (lightness <= 0.06) break;
    out = hslToHex(h, sat, lightness);
  }
  return out;
}

export function resolveDistinctTileFills(names, catColour) {
  const taken = [];
  const result = new Map();

  for (const raw of names) {
    const name = String(raw || '').trim();
    if (!name || result.has(name)) continue;

    const base = catColour(name);
    let candidate = base;
    let attempt = 0;
    while (tooClose(candidate, taken) && attempt < 8) {
      attempt++;
      const hsl = hexToHsl(base);
      // A grey cannot be separated by rotating its hue, so step its
      // lightness instead; a coloured tile keeps its lightness and moves.
      candidate =
        hsl.s <= GREY_SAT
          ? hslToHex(hsl.h, hsl.s, Math.min(0.82, Math.max(0.2, hsl.l + attempt * 0.09)))
          : shiftHue(base, attempt);
    }

    taken.push(hexToHsl(candidate));
    result.set(name, candidate);
  }

  return result;
}


export function twoLineCandidates(name) {
  const spaces = [];
  for (let i = 0; i < name.length; i++) if (name[i] === ' ') spaces.push(i);
  if (!spaces.length) return [];

  return spaces
    .map((i) => {
      const first = name.slice(0, i).trim();
      const second = name.slice(i + 1).trim();
      return {
        first,
        second,
        imbalance: Math.abs(first.length - second.length),
      };
    })
    .filter((c) => c.first && c.second)
    .sort((a, b) => a.imbalance - b.imbalance)
    .map((c) => [c.first, c.second]);
}

export function adaptSpendBreakdownForTreemap(raw) {
  const categories = Array.isArray(raw && raw.categories) ? raw.categories : [];
  const by_category = [];
  const merchants = [];

  for (const cat of categories) {
    const category = String((cat && cat.name) || '').trim();
    const amount = Number(cat && cat.total);
    if (!category || !Number.isFinite(amount) || amount <= 0) continue;

    by_category.push({
      name: category,
      amount,
      share: Number.isFinite(Number(cat.share)) ? Number(cat.share) : null,
      comparison: cat.comparison || null,
    });

    let namedTotal = 0;
    for (const mch of Array.isArray(cat.topMerchants) ? cat.topMerchants : []) {
      const name = String((mch && mch.name) || '').trim();
      const merchantAmount = Number(mch && mch.total);
      if (!name || !Number.isFinite(merchantAmount) || merchantAmount <= 0) continue;
      merchants.push({ name, amount: merchantAmount, category });
      namedTotal += merchantAmount;
    }

    const remainder = Math.max(0, amount - namedTotal);
    if (remainder > 0.005) {
      merchants.push({ name: 'Other places', amount: remainder, category });
    }
  }

  return { by_category, merchants };
}


const LABEL_FONT = 24;
const LINE_GAP = 4;
// Tiles are separated by a GAP, not by a stroke. A stroke sat on the shared
// boundary as a bright hairline grid over the whole picture; letting the card
// behind show through instead reads as breathing room and leaves colour as
// the only thing drawn. Small enough (2 units against a 1000x560 field) that
// area stays proportional to amount.
const TILE_GAP = 2;
const TILE_RADIUS = 4;
const CHAR_W = 0.58;
const TILE_PAD = 10;
const MIN_LABEL_DIM = 24;
// A share of the whole picture rather than an absolute area: the box is now
// sized in real pixels and therefore differs between a phone and a desktop,
// so a fixed number would mean two different things. 1.8% reproduces the
// previous 10,000-unit behaviour on the 1000x560 box the proofs use.
const MIN_LABEL_AREA_SHARE = 0.018;
const MIN_INTERACTIVE_DIM = 4;
const MIN_LABEL_FONT = 11;
// The label band, in CSS pixels. 13 sits just under --metric-row (15px) and
// 19 just under --metric-major, so the biggest tile reads as a heading and
// the smallest still reads as text.
const TM_FONT_MIN = 13;
const TM_FONT_MAX = 19;

/*
 * Text width. In a browser this MEASURES the real string against the app's
 * own font at the exact size about to be drawn, so a label is only ever
 * committed to a tile it genuinely fits. A character-count estimate is kept
 * as the fallback for the proofs, which drive this module against a minimal
 * document stub with no canvas - there, the estimate decides, and the
 * per-tile clipPath is still the hard guarantee that nothing escapes its
 * own tile either way.
 */
let measureCtx;

function measurer() {
  if (measureCtx !== undefined) return measureCtx;
  measureCtx = null;
  try {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext ? canvas.getContext('2d') : null;
      if (context && typeof context.measureText === 'function') {
        const body = typeof getComputedStyle === 'function' && document.body;
        measureCtx = {
          context,
          family: (body && getComputedStyle(body).fontFamily) || 'system-ui, sans-serif',
        };
      }
    }
  } catch (_) {
    measureCtx = null;
  }
  return measureCtx;
}

function estWidth(str, fontSize) {
  const m = measurer();
  if (m) {
    m.context.font = `650 ${fontSize}px ${m.family}`;
    // The label is painted with a stroke under its fill for legibility, which
    // adds half the stroke width at each end.
    return m.context.measureText(String(str)).width + 3;
  }
  return String(str).length * fontSize * CHAR_W;
}

// Type scales with the block it sits in. One fixed size had to be small
// enough for the smallest labelled tile, which left the largest categories
// captioned rather than titled, and still cut mid-word on the tiles in
// between ("Governme…"). Sizing from the tile's own area gives the big
// blocks presence and lets a small block keep its whole name.
function labelFontFor(tile) {
  const scale = Math.sqrt(Math.max(0, tile.w * tile.h)) / 14;
  // The map lays out in CSS pixels (see VIEW, below), so these ARE the
  // rendered sizes. Held inside the app's own scale: a tile label tops out
  // near the card-title/metric-row band rather than reaching the hero size,
  // which is what made the biggest block shout over the figure it explains.
  return Math.max(TM_FONT_MIN, Math.min(TM_FONT_MAX, Math.round(scale)));
}

// Preference order: the whole name on one line, the whole name wrapped at a
// real word boundary, then the first whole word on its own. A cut-off
// fragment ("Governme…") is the last resort rather than the second, because
// a whole word reads as a name while a fragment reads as a rendering fault.
function fitLabelLines(name, availW, availH, font = LABEL_FONT) {
  if (availW <= 0) return null;
  if (estWidth(name, font) <= availW) return [name];

  if (availH >= font * 2 + LINE_GAP) {
    for (const [a, b] of twoLineCandidates(name)) {
      if (estWidth(a, font) <= availW && estWidth(b, font) <= availW) return [a, b];
    }
  }

  const firstWord = String(name).split(' ')[0];
  if (firstWord && firstWord !== name && estWidth(firstWord, font) <= availW) {
    return [firstWord];
  }

  const maxChars = Math.floor(availW / (font * CHAR_W)) - 1;
  if (maxChars >= 6 && maxChars < name.length) return [name.slice(0, maxChars).trim() + '…'];
  return null;
}

export function createTreemapRenderer(ctx) {
  requireCtx(ctx, ['el', 'money0', 'catColour'], 'createTreemapRenderer');
  const { el, money0, catColour } = ctx;
  /*
   * The picture's SHAPE, and the one place it is decided. A treemap on a
   * phone is width-starved: at 1000x560 a 375px screen gets a 313x175 strip
   * and ten categories are squeezed into slivers. A taller box on narrow
   * screens gives every tile real area to be read in.
   *
   * The CSS aspect-ratio on .tm-wrap MUST match whichever box is chosen here,
   * or preserveAspectRatio letterboxes the drawing inside its own container.
   * Node (the proofs) has no matchMedia and therefore always takes the wide
   * box, which is the geometry every area assertion is written against.
   */
  // Evaluated per RENDER, never once at construction. This factory is built
  // a single time at boot, so a boot-time snapshot of the breakpoint stayed
  // frozen while the real viewport moved - the aspect here then disagreed
  // with the stylesheet's own .tm-wrap ratio and the drawing letterboxed
  // inside its container, leaving a large empty band under the map.
  const isNarrow = () =>
    typeof matchMedia === 'function' && matchMedia('(max-width: 639px)').matches;
  /*
   * THE PICTURE'S UNITS ARE CSS PIXELS.
   *
   * The box used to be a fixed 1000 units wide whatever the card's real
   * width, so the viewBox scale floated with the viewport and every size in
   * here floated with it: the same label rendered ~17px in a 558px card and
   * ~32px in a 1074px one - larger than any heading in the app, competing
   * with the hero figure it was meant to explain. Nothing expressed in user
   * units could be held to the app's type scale.
   *
   * Laying the map out at the card's MEASURED width makes one unit one CSS
   * pixel, so the font band, the padding and the minimum tile size below are
   * real, stable values. ASPECT is what the stylesheet pins .tm-wrap to, so
   * the two cannot disagree and letterbox the drawing.
   */
  const DEFAULT_W = 1000;
  const aspectNow = () => (isNarrow() ? 1000 / 1150 : 1000 / 560);
  const viewFor = (width) => {
    const w = Math.max(320, Math.round(width || DEFAULT_W));
    return { w, h: Math.round(w / aspectNow()) };
  };
  // Node (the proofs) has no layout, so it keeps the 1000-wide box every area
  // assertion is written against.
  let VIEW = viewFor(DEFAULT_W);


  function readableInk(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3)
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    if (h.length < 6) return '#ffffff';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.55 ? '#10161f' : '#ffffff';
  }

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null) node.setAttribute(k, v);
    }
    return node;
  }

  function titleNode(text) {
    const t = svgEl('title');
    t.append(text);
    return t;
  }

  // Merchant subdivisions are DETAIL INSIDE a category, and drawing them
  // permanently turned every category into a grid of boxes - the category,
  // the thing the map exists to show, stopped being the unit the eye groups
  // by. They are painted as a soft seam and revealed only while that category
  // is under the pointer (treemap.css), so the map stays calm until someone
  // asks a category what it is made of. Colour comes from the stylesheet, not
  // from an inline ink value, so it can be a shadow on every tile rather than
  // a white line on the dark ones.
  function paintSubTiles(group, subTiles, category) {
    for (const st of subTiles) {
      if (!st || st.w <= 0 || st.h <= 0) continue;
      const rect = svgEl('rect', {
        x: st.x,
        y: st.y,
        width: Math.max(0, st.w),
        height: Math.max(0, st.h),
        fill: 'none',
        class: 'tm-sub',
      });
      rect.append(titleNode(`${category}: ${st.name} — ${money0(st.amount)}`));
      group.append(rect);
    }
  }

  function paintTile(
    defs,
    tile,
    subTiles,
    distinctFills,
    onTileClick,
    clipCounter,
    sheenId,
    share,
    lightSurface
  ) {
    const category = String(tile.name || 'Unlabelled category').trim();
    const fill = tileSurface(distinctFills.get(category) || catColour(category), lightSurface);
    const amountText = money0(tile.amount);
    const comparison = tile.comparison || null;
    const comparisonText = describeComparisonText(comparison, money0);
    const ink = readableInk(fill);
    const titleText = comparisonText
      ? `${category}: ${amountText}. ${comparisonText}`
      : `${category}: ${amountText}`;

    const bigEnough = tile.w >= MIN_INTERACTIVE_DIM && tile.h >= MIN_INTERACTIVE_DIM;
    const tileInteractive = typeof onTileClick === 'function' && bigEnough;

    const group = svgEl('g', { class: 'tm-tile' + (tileInteractive ? ' is-interactive' : '') });
    if (tileInteractive) {
      group.setAttribute('role', 'button');
      // Roving focus: the FIRST selectable tile is the map's single tab stop
      // and the arrow keys move between tiles from there, matching the column
      // charts. Ten tiles previously meant ten sequential tab stops to get
      // past one picture. renderTreemapPicture sets -1 on the rest once it
      // knows how many there are.
      group.setAttribute('tabindex', '0');
      group.setAttribute('style', 'cursor:pointer');
      group.setAttribute('aria-label', `${titleText}. Open matching transactions.`);
      group.addEventListener('click', () => onTileClick(category));
      group.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTileClick(category);
        }
      });
    } else {
      group.setAttribute('role', 'img');
      group.setAttribute('aria-label', titleText);
    }
    group.append(titleNode(titleText));

    const inset = Math.min(TILE_GAP, tile.w / 4, tile.h / 4);
    const box = {
      x: tile.x + inset,
      y: tile.y + inset,
      width: Math.max(0, tile.w - inset * 2),
      height: Math.max(0, tile.h - inset * 2),
    };

    group.append(
      svgEl('rect', {
        ...box,
        rx: Math.min(TILE_RADIUS, box.width / 2, box.height / 2),
        fill,
        class: 'tm-rect',
      })
    );

    // Depth pass. The category's identity colour stays exactly what
    // catColour said it is (that mapping is shared with the picker dots and
    // the tags, and is never altered here); this is a separate, colour-blind
    // overlay - a light top, a shaded foot - so a tile reads as a raised
    // surface rather than a flat swatch.
    group.append(
      svgEl('rect', {
        ...box,
        rx: Math.min(TILE_RADIUS, box.width / 2, box.height / 2),
        fill: `url(#${sheenId})`,
        class: 'tm-sheen',
      })
    );

    paintSubTiles(group, subTiles, category);

    // Padding scales with the block. A flat 10 units each side is generous on
    // a large tile and takes a FIFTH of the usable width on a narrow one -
    // which is what actually forced "Subscriptions" to be cut, not the size
    // of the type.
    const pad = Math.max(4, Math.min(TILE_PAD, Math.min(box.width, box.height) * 0.09));
    const textX = box.x + pad;
    const textY = box.y + pad;
    const availW = box.width - pad * 2;
    const availH = box.height - pad * 2;
    const labelFont = labelFontFor(tile);
    const bigEnoughForLabel =
      tile.w >= MIN_LABEL_DIM &&
      tile.h >= MIN_LABEL_DIM &&
      tile.w * tile.h >= VIEW.w * VIEW.h * MIN_LABEL_AREA_SHARE;
    // Step the type down before cutting a word. A single-word category on a
    // narrow tile ("Subscriptions") had no wrap point and no first word to
    // fall back on, so it went straight to "Subscrip…" while there was still
    // room for the whole name a size smaller.
    let lines = null;
    let usedFont = labelFont;
    if (bigEnoughForLabel) {
      for (const size of [labelFont, Math.round(labelFont * 0.85), MIN_LABEL_FONT]) {
        if (size < MIN_LABEL_FONT) break;
        const attempt = fitLabelLines(category, availW, availH, size);
        if (!attempt) continue;
        usedFont = size;
        lines = attempt;
        // A whole name is worth a smaller size; a cut one is not, so keep
        // stepping down only while something is still being truncated.
        if (!attempt.some((line) => line.endsWith('…'))) break;
      }
    }

    const valueFont = Math.round(usedFont * 0.8);
    const shareFont = Math.round(usedFont * 0.66);

    if (lines) {
      const clipId = `tm-clip-${clipCounter.id}-${clipCounter.n++}`;
      const clipPath = svgEl('clipPath', { id: clipId });
      clipPath.append(
        svgEl('rect', {
          x: textX,
          y: textY,
          width: Math.max(0, availW),
          height: Math.max(0, availH),
        })
      );
      defs.append(clipPath);

      const label = svgEl('text', {
        class: 'tm-label',
        x: textX,
        y: textY + usedFont,
        'font-size': usedFont,
        fill: ink,
        'clip-path': `url(#${clipId})`,
      });
      lines.forEach((line, i) => {
        const tspan = svgEl('tspan', {
          x: textX,
          dy: i === 0 ? 0 : usedFont + LINE_GAP,
        });
        tspan.append(line);
        label.append(tspan);
      });
      group.append(label);

      const linesH = lines.length * (usedFont + LINE_GAP);
      const valueFits =
        availH - linesH >= valueFont + LINE_GAP && estWidth(amountText, valueFont) <= availW;
      if (valueFits) {
        const value = svgEl('text', {
          class: 'tm-value money',
          x: textX,
          y: textY + linesH + valueFont,
          'font-size': valueFont,
          fill: ink,
          'clip-path': `url(#${clipId})`,
        });
        value.append(amountText);
        group.append(value);

        // The share is the one thing a treemap can say that a list cannot -
        // how much of the whole this block IS - so it goes on the tile
        // itself wherever there is honest room for a third line, rather than
        // living only in the tooltip.
        // The share line doubles as the movement line. activity-render.js's
        // ranked category list was removed on the promise that its
        // trend-vs-last-period signal moved onto the tile itself; until now
        // it only survived in the tooltip, so a category that had jumped
        // looked identical to one that had not until you pointed at it.
        // Direction is a glyph (shape first), tone is the colour behind it.
        const tone = comparisonTone(comparison);
        const arrow = comparison && comparison.direction === 'up' ? '▲' : '▼';
        const movement =
          comparison && (comparison.direction === 'up' || comparison.direction === 'down')
            ? ` ${arrow}`
            : '';
        const shareText = share >= 0.1 ? `${share.toFixed(share >= 10 ? 0 : 1)}%${movement}` : null;
        const shareFits =
          shareText &&
          availH - linesH - valueFont - LINE_GAP >= shareFont + LINE_GAP &&
          estWidth(shareText, shareFont) <= availW;
        if (shareFits) {
          const shareEl = svgEl('text', {
            class: `tm-share tone-${tone}`,
            x: textX,
            y: textY + linesH + valueFont + LINE_GAP + shareFont,
            'font-size': shareFont,
            fill: ink,
            'clip-path': `url(#${clipId})`,
          });
          shareEl.append(shareText);
          group.append(shareEl);
        }
      }
    }

    // A tile with no room for any label used to be a silent block of colour:
    // on a touch screen, with no hover, there was nothing to say it carried a
    // category at all. A dot marks it as a thing with an identity to ask for,
    // which is all the room allows.
    if (!lines && tile.w >= MIN_LABEL_DIM && tile.h >= MIN_LABEL_DIM) {
      group.append(
        svgEl('circle', {
          cx: box.x + box.width / 2,
          cy: box.y + box.height / 2,
          r: Math.max(2, Math.min(3.5, Math.min(box.width, box.height) / 8)),
          fill: ink,
          'fill-opacity': 0.5,
          class: 'tm-dot',
        })
      );
    }

    return { group, interactive: tileInteractive };
  }

  function renderTreemapPicture(tiles, subTiles, onTileClick) {
    const wrap = markProportional(el('div', { class: 'tm-wrap' }));
    const tips = chartTooltip(el, wrap);
    const total = tiles.reduce((sum, tile) => sum + tile.amount, 0);
    const svgRoot = svgEl('svg', {
      viewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
      preserveAspectRatio: 'xMidYMid meet',
      class: 'tm-svg',
      role: 'group',
      'aria-label': 'Spending by category, area shows amount',
    });

    const defs = svgEl('defs');
    svgRoot.append(defs);

    // One shared depth overlay for every tile: a light top edge and a shaded
    // foot, painted over whatever the tile's own identity colour is.
    const sheenId = `tm-sheen-${pictureId}`;
    const sheen = svgEl('linearGradient', {
      id: sheenId,
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%',
    });
    sheen.append(svgEl('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.16 }));
    sheen.append(svgEl('stop', { offset: '46%', 'stop-color': '#ffffff', 'stop-opacity': 0 }));
    sheen.append(svgEl('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': 0.18 }));
    defs.append(sheen);

    const distinctFills = resolveDistinctTileFills(
      tiles.map((t) => t.name),
      catColour
    );
    const subByCategory = new Map();
    for (const st of subTiles) {
      const list = subByCategory.get(st.category) || [];
      list.push(st);
      subByCategory.set(st.category, list);
    }

    const lightSurface = prefersLightSurface();
    const clipCounter = { n: 0, id: ++pictureId };
    const groups = [];
    const focusable = [];
    for (const tile of tiles) {
      if (!tile || tile.w <= 0 || tile.h <= 0) continue;
      const painted = paintTile(
        defs,
        tile,
        subByCategory.get(tile.name) || [],
        distinctFills,
        onTileClick,
        clipCounter,
        sheenId,
        total > 0 ? (tile.amount / total) * 100 : 0,
        lightSurface
      );
      tips.bind(painted.group, [tile.name, money0(tile.amount), `${total > 0 ? (tile.amount / total * 100).toFixed(1) : 0}% of spending`, describeComparisonText(tile.comparison, money0)].filter(Boolean));
      svgRoot.append(painted.group);
      groups.push({ group: painted.group, tile });
      if (painted.interactive) focusable.push(painted.group);
    }

    // One tab stop for the whole map, arrows to move within it.
    focusable.forEach((group, index) => {
      if (index > 0) group.setAttribute('tabindex', '-1');
      group.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = focusable.length - 1;
        if (next == null) return;
        event.preventDefault();
        const target = focusable[(next + focusable.length) % focusable.length];
        for (const other of focusable) other.setAttribute('tabindex', '-1');
        target.setAttribute('tabindex', '0');
        if (target.focus) target.focus();
      });
    });

    wrap.append(svgRoot);

    staggerIn(
      groups.map((g) => g.group),
      () => [
        { opacity: 0, transform: 'scale(0.92)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { step: 18, duration: 320 }
    );

    return wrap;
  }

  function renderTreemapCard(analysis, opts = {}) {
    const cats = (Array.isArray(analysis && analysis.by_category) ? analysis.by_category : [])
      .map((category) => ({
        ...category,
        name: String((category && category.name) || '').trim(),
        amount: Number(category && category.amount),
      }))
      .filter(
        (category) => category.name && Number.isFinite(category.amount) && category.amount > 0
      );

    if (!cats.length) return null;

    const merchantsByCategory = new Map();
    for (const m of Array.isArray(analysis && analysis.merchants) ? analysis.merchants : []) {
      if (!m || !m.category) continue;
      const list = merchantsByCategory.get(m.category) || [];
      list.push({ name: m.name, amount: m.amount });
      merchantsByCategory.set(m.category, list);
    }

    const interactive = typeof opts.onCategory === 'function';
    const layoutAt = (view) =>
      layoutCategoryTreemap(cats, merchantsByCategory, { x: 0, y: 0, w: view.w, h: view.h });
    const { tiles, subTiles } = layoutAt(VIEW);
    const embedded = opts.embedded === true;

    const container = el(embedded ? 'div' : 'section', {
      class: embedded ? 'tm-panel' : 'card',
      'aria-label': 'Spending by category map',
    });

    if (!embedded) {
      container.append(
        el('div', { class: 'card-head' }, el('h3', { class: 'card-title' }, 'Where it went'))
      );
    }

    if (chartIsHidden()) {
      container.append(renderHiddenChart(el, 'Spending by category', { height: '200px' }));
      container.append(el('p', { class: 'muted small tm-help' }, 'Hidden with figures.'));
      return container;
    }

    let picture = renderTreemapPicture(tiles, subTiles, interactive ? opts.onCategory : null);
    container.append(picture);

    /*
     * The card's real width is only knowable once it is in the document, and
     * it keeps changing afterwards - the window resizes, and app-controller
     * CACHES a built view and re-mounts it at a different width later. A
     * one-shot measurement could not survive either, so the picture is re-laid
     * whenever its own width moves materially.
     *
     * Only the picture is rebuilt, and only through the same pure layout
     * function: no figure is recomputed and nothing here writes text content,
     * so the privacy gate that already decided every label still holds.
     */
    const relayout = (measured) => {
      if (!measured) return;
      if (Math.abs(measured - VIEW.w) / VIEW.w < 0.02) return;
      VIEW = viewFor(measured);
      const next = layoutAt(VIEW);
      const rebuilt = renderTreemapPicture(
        next.tiles,
        next.subTiles,
        interactive ? opts.onCategory : null
      );
      if (picture.replaceWith) picture.replaceWith(rebuilt);
      picture = rebuilt;
    };

    if (typeof ResizeObserver !== 'undefined') {
      let pending = 0;
      // Observes the CONTAINER, which is never replaced - observing the
      // picture would stop the moment the first rebuild swapped it out.
      const ro = new ResizeObserver((entries) => {
        const width = entries[0] && entries[0].contentRect && entries[0].contentRect.width;
        if (!width) return;
        if (pending) cancelAnimationFrame(pending);
        pending = requestAnimationFrame(() => {
          pending = 0;
          relayout(width);
        });
      });
      ro.observe(container);
    }
    container.append(el('p', { class: 'muted small tm-help' }, interactive ? 'Select a category.' : 'Area shows spending.'));

    return container;
  }

  return { renderTreemapCard };
}
