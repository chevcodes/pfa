import { figuresHidden } from './privacy.js';
export {
  figuresHidden,
  privateViewOn,
  withExactFigures,
  markProportional,
  hiddenChartLabel,
  screenReaderFigure,
  HIDDEN_WORD,
  HIDDEN_SENTENCE,
} from './privacy.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export { MONTHS };

// The one place the mock/dev device signature is declared. Previously
// re-declared independently as an identical literal in app.js,
// data-export.js and mock-personas.js.
export const DEV_SIGNATURE = 'chevcodes';

// The one place "this is a local development host" is decided. Previously
// re-declared independently as an identical array in app.js (service-worker
// registration) and mock-personas.js (the sample-data switcher's gate).
export const LOCAL_DEV_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

// A development machine is not only these four literal names. Serving the app
// to a phone on the same wifi means a LAN address, and macOS/Bonjour names it
// <machine>.local - on either, the four-name list said "production", the
// service worker registered, and every later edit was served from its cache.
// Recognising the whole local family means the worker is skipped wherever the
// app is genuinely being developed, not only on the loopback name.
export function isLocalDevHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  if (LOCAL_DEV_HOSTS.includes(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.localhost')) return true;
  if (/^127\./.test(h)) return true; // whole loopback range, not just .0.0.1
  if (/^10\./.test(h)) return true; // RFC1918 private
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local
  return false;
}
// FNV-1a: a small, fast, deterministic string hash. Used for stable
// transaction identity and statement content hashing. Not cryptographic;
// it only needs to be stable and collision-resistant enough for dedupe.
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}
export function toIso(d) {
  // "28-Nov-2024" -> "2024-11-28". Leaves anything unrecognised untouched.
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(d);
  if (!m) return d;
  const mi = MONTHS.indexOf(m[2].toLowerCase());
  if (mi < 0) return d;
  return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
export function money(s) {
  return parseFloat(String(s).replace(/\$/g, '').replace(/,/g, '').replace(/\s/g, ''));
}
export function monthKey(iso) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  return m ? `${m[1]}-${m[2]}` : 'unknown';
}
// Decimal rounding on the exact binary value (toFixed), which lines up with
// the source tool's Python round() for the supplied statements. Using the
// exact value avoids the float-multiply artefact that a *100 approach hits.
export function roundMoney(n) {
  return parseFloat(Number(n).toFixed(2));
}
// Cut a "Brand - Branch" string at the first hyphen whose preceding text
// already holds three or more letters, so a real branch tail (e.g.
// "Total - Manor Park") is dropped while a brand-internal hyphen (Hi-Lo,
// Bk-Bar) is kept intact. This is the ONE shared copy of the rule that
// categorise.js (merchantHead) and category-rules.js (cutBranchTail) both
// delegate to, so the two can never drift apart.
export function cutAtBranchHyphen(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== '-') continue;
    const head = str.slice(0, i).replace(/[\s-]+$/, '');
    if ((head.match(/[A-Za-z]/g) || []).length >= 3) return head;
  }
  return str;
}

/* A bank narrative is not free text. It is a channel code, then optionally a
 * direction word, then the other party, then routing and reference digits:
 *
 *     ACH SENIOR,DEL
 *     BPYMT:1618995/DELANO SENIOR
 *     ELink TRF-To Shanell Racquelia Dellop
 *     IOR Transfer from CHEVAUGHN JOHNSON 0908
 *
 * THE declared list of channel codes. Before this existed the leading strip was
 * written out by hand in three places - the resolver's bank profile, the
 * counterparty reader, and the Accounts list - and they had already drifted:
 * only two of the three understood a channel code in front of "Transfer", and
 * only two understood "trf from" as well as "trf to", so the same row could
 * read one way in the transaction list and another in Accounts. One list, one
 * parser, so a channel learned here is understood everywhere at once.
 *
 * `label` is what a person should see. null means the channel adds nothing
 * worth saying - a plain "Transfer to X" needs no "(via Transfer)".
 */
export const TRANSFER_CHANNELS = [
  { re: /^e-?link\s*(?:trf|transfer)\b[\s:.,-]*/i, label: 'e-Link' },
  { re: /^bpymt\b[\s:.,-]*/i, label: 'bill payment', implies: 'to' },
  { re: /^ach\b[\s:.,-]*/i, label: 'ACH' },
  { re: /^(?:[a-z]{2,5}\s+)?transfer\b[\s:.,-]*/i, label: null },
  { re: /^(?:[a-z]{2,5}\s+)?trf\b[\s:.,-]*/i, label: null },
];

// Routing and reference cruft that rides in front of, or behind, the party
// name once the channel code is off. The separator class deliberately includes
// "/" so a bill-payment reference ("BPYMT:1618995/DELANO SENIOR") is cut the
// same way a comma- or space-separated one already was.
//
// The trailing-contact strip removes a support address or status marker that a
// processor appends after its own name ("UBER * PENDING help.uber.co"). It is
// end-anchored and only ever removes a dotted address or the word PENDING, so
// a star-separated descriptor whose REAL name follows the star is untouched.
function stripPartyAffixes(s) {
  return String(s || '')
    .replace(/^[\d]{2,}[\s,/-]+/, '')
    .replace(/^\d{4,}[-/]/, '')
    .replace(/\s*\*?\s*\bpending\b/i, ' ')
    .replace(/\s*\*?\s*\b[a-z][\w-]*(?:\.[a-z][\w-]*)+\.?\s*$/i, '')
    .replace(/[\s,-]+\d{3,}\s*$/, '')
    .replace(/^[\s,:/*-]+/, '')
    .replace(/[\s,:/*-]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* Split a bank narrative into the three things a person actually wants to know:
 * which channel moved the money, which way it went, and who the other party is.
 *
 * Returns { channel, direction, party }. `channel` is the display label or
 * null, `direction` is 'to' | 'from' | null when the narrative states it
 * (the caller supplies the amount's own direction when it does not), and
 * `party` is the name with every channel, routing and reference token removed.
 * Pure; it never reads an amount and never decides a category.
 */
export function parseTransferNarrative(text) {
  let s = String(text == null ? '' : text)
    .replace(/\s+/g, ' ')
    .trim();
  let channel = null;
  let direction = null;
  for (const c of TRANSFER_CHANNELS) {
    const cut = s.replace(c.re, '');
    if (cut === s) continue;
    channel = c.label;
    if (c.implies) direction = c.implies;
    s = cut;
    break;
  }
  // The direction word sits AFTER the channel code in every observed shape
  // ("ELink TRF-To ...", "IOR Transfer from ..."), so it is read here rather
  // than inside each channel's own pattern.
  const dir = s.match(/^(to|from)\b[\s:.,-]*/i);
  if (dir) {
    direction = dir[1].toLowerCase();
    s = s.slice(dir[0].length);
  }
  // isTransfer is the honest test for "did this narrative actually describe a
  // movement between parties". A descriptor that names neither a channel nor a
  // direction is a shop, an employer or a printed bank fee - not a transfer -
  // and callers must be able to tell, so they leave it worded as it came.
  return {
    channel,
    direction,
    isTransfer: channel !== null || direction !== null,
    party: stripPartyAffixes(s),
  };
}

/* The sentence a person reads on a bank row: who, which way, and how.
 *
 * `fallbackDirection` is the row's own direction ('in' | 'out'). It supplies
 * the way the money went ONLY for a narrative that names a channel but no
 * direction word - "ACH SENIOR,DEL" is a transfer whichever way it ran, and the
 * amount already knows which.
 *
 * Returns '' for a narrative that is not a transfer at all - a shop, an
 * employer, or a bank fee the statement printed in its own words. Those rows
 * must keep reading exactly as they came (ncb_bank_reader_proof pins it, so a
 * person can reconcile a fee against the paper statement), so the caller keeps
 * whatever it was already showing rather than being handed a rewritten name.
 */
export function transferSentence(text, fallbackDirection, titleCase) {
  const { channel, direction, isTransfer, party } = parseTransferNarrative(text);
  if (!isTransfer) return '';
  // The same first-comma-segment convention transactionName() already applies:
  // a trailing ",DEL" is a truncated second name, not part of the party.
  const short = String(party || '').split(',')[0].trim();
  const name = typeof titleCase === 'function' ? titleCase(short) : short;
  if (!name) return '';
  const way =
    direction || (fallbackDirection === 'in' ? 'from' : fallbackDirection === 'out' ? 'to' : null);
  if (!way) return name;
  const moved = channel === 'bill payment' ? 'Bill payment' : 'Transfer';
  const via = channel && channel !== 'bill payment' ? ` (via ${channel})` : '';
  return `${moved} ${way} ${name}${via}`;
}

// Capitalise the first letter of a sentence/word, leaving everything else
// untouched. Previously re-derived independently in three places (app.js's
// renderOverview, the pre-consolidation buildOverviewInsights, and the
// shared buildBankAppropriateInsights in reporting.js) as an identical
// one-line copy each time.
export function capitaliseFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function joinWithAnd(parts) {
  if (parts.length < 2) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// Shared money-formatting core, used by money0 (app-controller, card side)
// and bankMoney (accounts-render, bank side, which layers a currency-prefix
// branch on top). Now a thin re-export of THE formatter
// (core/money-format.js), which applies the privacy gate before it formats,
// so a figure cannot reach the screen without passing it. Kept here under its
// original name so every existing call site is unchanged.
export { formatMoney, makeMoney, makeMoneyShort, makeForeignMoney } from './money-format.js';

// Whether the person has asked the system to minimise motion. Guarded so this
// module stays importable in Node (tests) where window/matchMedia are absent.
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Whether figures are currently hidden. Delegates to the privacy contract
// (core/privacy.js) so this name, the money formatter and every chart all
// read ONE switch, and so the deliberate exact-figure paths (print, copy,
// export) suspend it in one place rather than each re-asserting an exemption.
export function isPrivacyMode() {
  return figuresHidden();
}
// The ONE smooth-scroll helpers every drill-down, "see all" and the new
// back-to-top button now share. Previously the same
// scrollIntoView({ behavior:'smooth', block:'start' }) was hand-written in
// several places and none of them honoured prefers-reduced-motion; routing all
// of them through here fixes that in a single place and keeps the behaviour
// identical everywhere. Both no-op safely off the main thread / in tests.
export function smoothScrollToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}
export function smoothScrollToEl(target) {
  if (typeof document === 'undefined') return;
  const node = typeof target === 'string' ? document.querySelector(target) : target;
  if (!node) return;
  // Open every closed <details> ancestor (and the target itself, if it is
  // one) before measuring position - scrolling to something inside a
  // collapsed disclosure previously measured a hidden, zero-height box and
  // landed nowhere meaningful, since the content genuinely was not rendered
  // open yet.
  let cur = node;
  while (cur) {
    if (cur.tagName === 'DETAILS' && !cur.open) cur.open = true;
    cur = cur.parentElement;
  }
  const stack = document.querySelector('.topbar-stack');
  const chrome = stack ? stack.getBoundingClientRect().height : 0;
  const top = node.getBoundingClientRect().top + window.scrollY - chrome - 12;
  window.scrollTo({
    top: Math.max(0, top),
    left: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
  // Move focus to whatever was just scrolled to - preventScroll stops the
  // browser's own default focus-scroll fighting the scroll just performed.
  // A no-op on any target with no tabindex (browsers refuse to focus a
  // non-focusable element), so every EXISTING caller targeting a plain
  // element is unaffected; only a target that opts in (tabindex="-1",
  // e.g. '#acct-tx') gains this.
  // KNOWN, ACCEPTED TRADE-OFF: {preventScroll:true} was unsupported on
  // Safari before version 15 (2021) - on an older Safari, focus() may
  // trigger its own extra scroll-into-view immediately after the explicit
  // scrollTo above, causing a brief, self-correcting double-scroll. Not
  // shimmed, since this app's supported range is expected to be modern
  // evergreen browsers; noted here rather than silently left unexamined.
  if (node.focus) node.focus({ preventScroll: true });
}

// Fails loudly and specifically at FACTORY-CONSTRUCTION time when a factory's
// declared dependencies are missing from the ctx object handed to it at its
// call site - rather than surfacing as a cryptic "X is not defined" or "X is
// not a function" deep inside a click handler, possibly minutes after the
// page loaded, only when the exact control that needed X happens to be used.
// This is the SAME class of problem the filter-facet registry (app.js's
// CARD_FACETS/BANK_FACETS) already fixed for state, applied here to
// dependency injection: which dependencies a factory needs was kept in sync
// BY HAND across three places - the factory's own destructure, the object
// built for it at its call site, and the real definition of each name - with
// nothing enforcing the sync. That gap has already caused four separate
// runtime failures in this app (formatMoney, renderKindTag x2,
// openCsvExportDialog, and openModal/closePicker). Calling this as the FIRST
// line of every factory, before its own destructure, turns a silent
// undefined into an immediate, named error: which factory, which
// dependency(ies), checked once at app boot instead of discovered by a
// person's click days later.
export function requireCtx(ctx, keys, factoryName) {
  const missing = keys.filter((k) => !(k in (ctx || {})) || ctx[k] === undefined);
  if (missing.length) {
    throw new Error(
      `${factoryName}: ctx is missing required dependenc${missing.length === 1 ? 'y' : 'ies'}: ${missing.join(', ')}. ` +
        `Check the object built for ${factoryName} at its call site (app.js) - each of these names must be present there.`
    );
  }
}

// Defensive defaults for the two config.json sections read with NO guard
// anywhere else in the app: cfg.special (state.cfg.special.fallback, read via
// FALLBACK() from isReview/recompute/renderAttention/buildInsights and more,
// plus paymentCategory/refundCategory/feeCategories, read directly in
// recompute()) and cfg.app (state.cfg.app.name, read at boot and in every
// printed-report model). Every OTHER config section already degrades safely
// at its own call site (state.cfg.currency || {}, cfg.insights || {},
// state.cfg.merchants && ..., state.cfg.bankDescriptorCleanup && ...), so a
// config.json missing one of those quietly falls back to a sensible default.
// These two never got that guard, so a config.json missing either section
// throws the FIRST time it is read - crashing boot, or a config reload,
// entirely - the same class of problem requireCtx (above) fixes for
// dependency injection, applied here to the two config reads with the
// highest blast radius. Called once at boot (app.js's start()) and once on
// every "Reload configuration" click (manage-data.js's reloadConfig) - the
// two places state.cfg is assigned from a freshly-fetched file - so a
// malformed or partial config.json can never crash either path.
// Deliberately narrow, NOT a full config schema validator: config.json is
// small and developer-maintained and changes rarely, unlike ctx wiring,
// which changes on nearly every factory edit. A complete version would
// extend this to one normaliseConfig(cfg) pass covering every section
// (categories, keepUpper, smallWords, currency) in one place instead of the
// scattered inline `|| {}` guards those sections currently rely on - not
// needed today, noted so it is not lost.
export function withConfigDefaults(cfg) {
  const c = cfg || {};
  c.special = Object.assign(
    {
      fallback: 'Uncategorised',
      paymentCategory: 'Card Payment',
      refundCategory: 'Refund / Reversal',
      feeCategories: ['Fees & Interest', 'Government & Tax'],
    },
    c.special || {}
  );
  c.app = Object.assign({ name: 'Personal Finance Analyser' }, c.app || {});
  return c;
}

// Turn a 'YYYY-MM' month key into a comparable integer index, so two
// occurrence-months can be measured for distance. Returns NaN for anything
// that is not a well-formed month key. This was previously reimplemented
// independently, byte-for-byte, in two places - reporting.js's private
// recurringMonthIndex (used by maxConsecutiveGap, the card-side recurring
// cadence gate) and an inline duplicate inside read-statements.js's private
// standingDebitMonthGap (the bank-side equivalent) - the exact class of
// hand-copied-logic risk this session has already consolidated three times
// today (cutAtBranchHyphen, csvEscape, sortBankRecords). Both now delegate
// here. Lives in shared-helpers.js rather than reporting.js because
// read-statements.js does not import reporting.js (reporting.js imports
// read-statements.js; the reverse would be a cycle), and both already import
// this file.
export function monthIndex(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym == null ? '' : ym));
  if (!m) return NaN;
  const month = +m[2];
  return month >= 1 && month <= 12 ? +m[1] * 12 + (month - 1) : NaN;
}

// The signed distance, in months, from a to b ('YYYY-MM' keys). NaN when
// either key does not parse, so a caller can treat that as "cannot judge"
// rather than a false zero.
export function monthsBetween(a, b) {
  const ia = monthIndex(a),
    ib = monthIndex(b);
  return Number.isNaN(ia) || Number.isNaN(ib) ? NaN : ib - ia;
}

// Whether a recurring commitment - a card merchant or a bank standing debit -
// is still ACTIVE or has LAPSED, given the month it was last actually seen and
// the most recent month the SAME ledger it was detected from actually reaches.
// This is the missing forward half of recurrence detection: detectRecurring
// and detectBankStandingDebits already gate a candidate on maxGapMonths
// BACKWARD (no two historical occurrences may be more than maxGapMonths
// apart, or it is never accepted as recurring at all) - but neither of them
// used to ask whether that same tolerance had since been breached going
// forward, so a commitment last seen in January still read as an active
// monthly cost in August. This reuses the identical maxGapMonths tolerance
// for the forward check, so "recurring" and "still recurring" share one
// cadence definition rather than two independently invented numbers - see
// CARD_FACETS/BANK_FACETS elsewhere in this app for the same "declare a
// tolerance once, derive every check from it" principle.
//
// latestLedgerMonth must be the newest month actually present in the SAME
// ledger the commitment came from (every row in the array passed to the
// detector, not just this one payee's own rows) - never real calendar
// "today". This mirrors how detectIncompleteMonth/latestCompleteMonth
// already anchor "how current is this" on the newest imported statement
// rather than wall-clock time, so a person who has not imported a statement
// in months never sees every commitment wrongly flagged lapsed just because
// the calendar moved on without them.
//
// Two states only, matching every other status this app surfaces
// (cardBehaviourState's pays-in-full/paying-interest/insufficient,
// buildStatementCoverage's full/partial/unknown) - a continuous confidence
// score would be new UI vocabulary this app does not otherwise use anywhere.
// An unparseable month key returns 'active' rather than guessing lapsed, the
// same defensive-by-construction default buildStatementCoverage uses for its
// own 'unknown' case.
export function recurringStatus(lastMonth, latestLedgerMonth, maxGapMonths = 2) {
  const gap = monthsBetween(lastMonth, latestLedgerMonth);
  if (!Number.isFinite(gap)) return 'active';
  return gap > maxGapMonths ? 'lapsed' : 'active';
}

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatDisplayDate(iso) {
  const s = String(iso == null ? '' : iso);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const mi = +m[2] - 1;
  if (mi < 0 || mi > 11) return s;
  return `${m[3]}-${MONTHS_SHORT[mi]}-${m[1].slice(2)}`;
}

const DISPLAY_DATE = new RegExp(`\\b(\\d{2}-(?:${MONTHS_SHORT.join('|')})-\\d{2})\\b`);

export function displayText(text, doc = document) {
  const parts = String(text).split(DISPLAY_DATE);
  if (parts.length === 1) return doc.createTextNode(parts[0]);
  const line = doc.createElement('span');
  parts.forEach((part, i) => {
    if (i % 2) {
      const date = doc.createElement('span');
      date.className = 'nowrap';
      date.textContent = part;
      line.append(date);
    } else if (part) line.append(doc.createTextNode(part));
  });
  return line;
}

export function isoToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// The typical day-of-month a commitment lands on...
export function medianDayOfMonth(isoDates) {
  const days = (isoDates || [])
    .map((d) => {
      const m = /^\d{4}-\d{2}-(\d{2})/.exec(String(d == null ? '' : d));
      return m ? +m[1] : null;
    })
    .filter((d) => d != null)
    .sort((a, b) => a - b);

  if (!days.length) return null;

  const mid = Math.floor(days.length / 2);

  return days.length % 2 ? days[mid] : Math.round((days[mid - 1] + days[mid]) / 2);
}

export function addDaysIso(iso, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso == null ? '' : iso));
  if (!m) return iso;

  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]) + days * 86400000;

  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetweenIso(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
}

/* A whole number as a word, so a sentence reads as speech rather than as a
 * readout. Above twelve, digits are clearer than words.
 *
 * THE list, in one place. cushion.js's monthWord delegates here rather than
 * keeping its own copy, so "seven weeks" and "seven months" cannot end up
 * spelled two different ways on two screens. */
export const COUNT_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

export function countWord(n) {
  const i = Math.round(Number(n) || 0);
  return i >= 0 && i < COUNT_WORDS.length ? COUNT_WORDS[i] : String(i);
}

/* A gap in days, said the way a person would say it - "about a month", "about
 * seven weeks" - never "47 days".
 *
 * Nobody decides anything in 47-day units, and the exact count reads as
 * machine output precisely when the surface is trying to sound like a person.
 * The exact figure is not lost: the surfaces that use this phrase carry the
 * day count behind the app's one info bubble, where anyone who wants the
 * working can find it.
 *
 * The bands are chosen so the phrase stays PROPORTIONATE at the low end. A
 * monthly account one day late reads "about a month" - true, and no cause for
 * alarm - rather than being rounded up into sounding overdue. Weeks carry the
 * middle, where a person genuinely counts in weeks, and months take over once
 * weeks stop being how anyone would say it. Takes days (from daysBetweenIso,
 * the one day-count in the app) so no caller re-derives a duration. */
export function roundedDurationPhrase(days) {
  const d = Math.max(0, Math.round(Number(days) || 0));
  if (d <= 0) return 'today';
  if (d === 1) return 'a day';
  if (d < 7) return 'a few days';
  if (d < 11) return 'about a week';
  if (d < 28) return `about ${countWord(Math.round(d / 7))} weeks`;
  // 28-34: the ordinary monthly account, a few days either side of its cycle.
  if (d < 35) return 'about a month';
  if (d < 56) return `about ${countWord(Math.round(d / 7))} weeks`;
  const months = Math.round(d / 30.44);
  return months <= 1 ? 'about a month' : `about ${countWord(months)} months`;
}

export function accountShortLabel(account, accounts = []) {
  const value = String(account == null ? '' : account);
  const last4 = value.slice(-4);
  const collides =
    (accounts || []).filter((item) => {
      const other = item && typeof item === 'object' ? item.account : item;
      return String(other == null ? '' : other).slice(-4) === last4;
    }).length > 1;
  return collides || value.length <= 4 ? value : '…' + last4;
}

export function isoDay(iso) {
  const m = /^\d{4}-\d{2}-(\d{2})/.exec(String(iso == null ? '' : iso));
  return m ? +m[1] : 0;
}

export function median(nums) {
  if (!nums || !nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function detectSustainedRise(monthlyEntries, opts = {}) {
  const recentWindow = opts.recentWindow == null ? 3 : opts.recentWindow;
  const minEarlierMonths = opts.minEarlierMonths == null ? 3 : opts.minEarlierMonths;
  const steadyTolerance = opts.steadyTolerance == null ? 0.15 : opts.steadyTolerance;
  const riseThreshold = opts.riseThreshold == null ? 0.2 : opts.riseThreshold;
  const entries = (monthlyEntries || []).slice().sort((a, b) => (a.month < b.month ? -1 : 1));
  if (entries.length < recentWindow + minEarlierMonths) return null;
  const recent = entries.slice(-recentWindow);
  const earlier = entries.slice(0, entries.length - recentWindow);
  if (earlier.length < minEarlierMonths) return null;
  const isSteady = (list, centre) =>
    list.every((e) => Math.abs(e.amount - centre) <= centre * steadyTolerance);
  const earlierMedian = median(earlier.map((e) => e.amount));
  if (!(earlierMedian > 0) || !isSteady(earlier, earlierMedian)) return null;
  const recentMedian = median(recent.map((e) => e.amount));
  if (!isSteady(recent, recentMedian)) return null;
  const riseRatio = (recentMedian - earlierMedian) / earlierMedian;
  if (riseRatio < riseThreshold) return null;
  return {
    oldTypical: roundMoney(earlierMedian),
    newTypical: roundMoney(recentMedian),
    sinceMonth: recent[0].month,
  };
}

// ---- filter-applicability predicates (Right Now's merged ledger) ----
// Pure predicates over state's filter facets, extracted here for the SAME
// reason drillToTransactions (below) is here: this is app-wide DECISION
// logic (whether/how a drill applies), not DOM rendering - it belongs
// beside this file's other "declared once, never hand-copied" helpers
// (monthIndex, recurringStatus) rather than scattered between app.js's
// closure and one specific render file. Each takes state explicitly, so a
// proof can construct a minimal state stub and assert these directly.

// Whether Right Now's merged ledger is genuinely narrowed by an active
// drill. Deliberately NOT the same as CARD_FACETS/BANK_FACETS' own
// activeFilterCount - hideInternal is countable there but toggling it OFF
// shows MORE rows, not fewer, which would make "Showing a filtered slice"
// a lie. This checks only facets that actually narrow what is visible.
export function ledgerIsNarrowed(state) {
  const f = state.filter,
    bf = state.bankFilter;
  return (
    f.category !== 'all' ||
    f.kind !== 'all' ||
    f.merchant !== '' ||
    f.reviewOnly ||
    f.foreignOnly ||
    f.min != null ||
    f.max != null ||
    f.search !== '' ||
    bf.payeeKey !== '' ||
    (bf.kind && bf.kind !== 'all') ||
    bf.search !== '' ||
    (state.bankAccount && state.bankAccount !== 'all')
  );
}

// Bank rows carry no spend category, merchant identity, foreign flag or
// review status at all (confirmed against the corpus: 0 bank rows have a
// Category) - so a category/merchant/reviewOnly/foreignOnly drill can never
// meaningfully narrow them; they are hidden entirely rather than sailing
// through unfiltered underneath a card-only drill.
export function bankRowsInapplicable(state) {
  const f = state.filter;
  return f.category !== 'all' || f.merchant !== '' || f.reviewOnly || f.foreignOnly;
}

// The mirror: cards carry no bank-style payee/counterparty identity, so a
// payee drill hides card rows entirely rather than showing them unfiltered.
export function cardRowsInapplicable(state) {
  return !!(state.bankFilter && state.bankFilter.payeeKey);
}

// ---- the one shared "drill to a card-side filter on Right Now's merged
// ledger" helper ----
// Every card-only drill (category, merchant, reviewOnly, foreignOnly) in
// this app goes through here now, whether launched FROM Right Now itself
// (cards-render.js's category/merchant/foreign/recurring panels, right-
// now-render.js's own "Worth a look" Refine actions and "Where money went"
// rows) or from a DIFFERENT tab entirely (Activity's treemap and ranked
// list). This was previously up to nine separately hand-written copies
// across three files, several of which never reset the BANK-side drill
// facets at all - so a stale payeeKey left over from an earlier drill
// could silently combine with a fresh card-only filter launched from the
// SAME tab. Declared once here, the same "declare a rule once, derive
// every check from it" principle CARD_FACETS/BANK_FACETS already
// established for the filter registries themselves (app.js).
//
// deps are passed explicitly (never closed over) so this is directly
// unit-testable with a minimal fake state/functions - the same pure+
// wrapper split goal-progress-ctx.js's buildNewEngineProgressCtx already
// uses, for the identical reason: logic nested inside bootUI's closure
// can never be imported directly by a standing proof.
//
// opts.scroll defaults to true (every call site's original behaviour)
// but can be overridden - preserves a real, pre-existing nuance: a row
// toggling ITSELF off (a deselect) should not force a scroll, only a
// genuinely NEW selection should.
export function drillToTransactions(deps, patch, opts = {}) {
  const { state, trackUsage, resetBankDrillFacets, applyFilter } = deps || {};
  const missing = ['state', 'trackUsage', 'resetBankDrillFacets', 'applyFilter'].filter(
    (k) => typeof (deps || {})[k] === 'undefined'
  );
  if (missing.length) {
    throw new Error(
      `drillToTransactions: missing required dependenc${missing.length === 1 ? 'y' : 'ies'}: ${missing.join(', ')}.`
    );
  }
  const scroll = opts.scroll !== undefined ? opts.scroll : true;
  // Drills land on Activity's Transactions tab (Right Now retired). Set both
  // the view and the sub-tab, so a drill launched from anywhere - a treemap
  // tile, a "where money went" row, a category link - opens the filtered
  // transaction list, not Activity's Analysis cards.
  if (state.view !== 'activity') {
    trackUsage('view-activity');
    state.view = 'activity';
  }
  state.activityTab = 'transactions';
  resetBankDrillFacets();
  applyFilter(patch, { expand: true, scroll });
}

// THE one shared "anchor to ONE specific transaction" helper - the
// identity-level counterpart to drillToTransactions above. Every existing
// drill (category, merchant, payee, kind) narrows the merged ledger to a
// CLASS of rows and scrolls to the top of the ledger card; when a click
// genuinely refers to a single transaction, that still leaves a person to
// read down a shortened list themselves to find it. This clears every
// filter facet - card, bank, AND the Transactions tab's own free-text
// search (previously untouched by resetCardDrillFacets/resetBankDrillFacets,
// since _txSearch lives outside CARD_FACETS/BANK_FACETS entirely - a real
// stale-filter risk this closes) - rather than applying a narrowing patch,
// since with every facet cleared any transaction is reachable regardless of
// its own category or merchant. No per-call-site filter knowledge is
// required. target: { ledger: 'card'|'bank', id }.
export function drillToTransaction(deps, target, opts = {}) {
  const { state, trackUsage, resetCardDrillFacets, resetBankDrillFacets, resetTxSearch, render } =
    deps || {};
  const missing = [
    'state',
    'trackUsage',
    'resetCardDrillFacets',
    'resetBankDrillFacets',
    'resetTxSearch',
    'render',
  ].filter((k) => typeof (deps || {})[k] === 'undefined');
  if (missing.length) {
    throw new Error(
      `drillToTransaction: missing required dependenc${missing.length === 1 ? 'y' : 'ies'}: ${missing.join(', ')}.`
    );
  }
  if (!target || !target.ledger || target.id == null) return;
  if (state.view !== 'activity') {
    trackUsage('view-activity');
    state.view = 'activity';
  }
  state.activityTab = 'transactions';
  resetCardDrillFacets();
  resetBankDrillFacets();
  resetTxSearch();
  state.showAllTx = true;
  state.bankShowAllTx = true;
  // Consumed once by renderMergedLedger (activity-render.js), which forces
  // this one row into the DOM regardless of the normal 10-row cap, marks it
  // already-open, and clears this key itself - so a later, unrelated
  // render() can never re-trigger the scroll/highlight a second time.
  state._focusTxnKey = target.ledger + ':' + target.id;
  render();
  focusTransactionRow('tx-' + target.ledger + '-' + target.id);
  void opts;
}

// Scrolls to and opens ONE specific transaction row (by the id
// renderMergedLedger gives every row it builds), centring it in the
// viewport rather than aligning it to the top the way smoothScrollToEl does
// for a whole card - a mid-list row aligned to the top can still sit hidden
// under the sticky top bar or, on mobile, the fixed bottom nav. block:
// 'center' has no notion of either fixed chrome (scrollIntoView cannot
// account for it natively), but centring makes both far less likely than
// top-alignment; a precise pixel-perfect clearance calculation was not
// pursued here - a deliberate, noted trade-off for a first pass.
export function focusTransactionRow(id) {
  if (typeof document === 'undefined') return;
  const node = document.getElementById(id);
  if (!node) return;
  let cur = node;
  while (cur) {
    if (cur.tagName === 'DETAILS' && !cur.open) cur.open = true;
    cur = cur.parentElement;
  }
  node.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
  if (node.focus) node.focus({ preventScroll: true });
}

// A prefilled field is a trap: the value already there is the thing you came to
// replace, but clicking in only drops a caret beside it, so every edit starts
// with a select-all or a run of backspaces. Selecting on focus means the first
// keystroke replaces the value.
//
// Measured against a bare control on a real click: no handler leaves the caret
// where you clicked ([6,6] in a 9-character value); this selects the lot
// ([0,9]). A drag still wins - the drag re-selects after focus has run - so a
// deliberate partial selection is not hijacked.
//
// Number inputs report selectionStart as null (the spec withholds the selection
// API from them), so on those this can only be confirmed by typing, not by
// reading properties. Synthetic mouse events prove nothing here either: being
// untrusted, they never move the real caret. Verify with a real click.
//
// Deliberately NOT applied to search fields (Activity's transaction search, the
// Plan category filter). You return to a search box to refine what you typed;
// wiping it on focus would be the opposite of helpful.
export function selectOnFocus(input) {
  if (!input || typeof input.addEventListener !== 'function') return input;
  input.addEventListener('focus', () => input.select());
  return input;
}

// The modified z-score (Iglewicz-Hoaglin): how far one value sits from the
// middle of a set, measured in units of the set's own typical wobble rather
// than its standard deviation. 0.6745 puts MAD on the same scale as a standard
// deviation for normal data. Still used by the per-merchant "unusually large
// charge" checks, which compare ONE charge against its own payee's history.
export const NAME_MAX_LENGTH = 40;

export function cleanName(value, max = NAME_MAX_LENGTH) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function bankAccountIdentity(account) {
  const raw = String(account == null ? '' : account);
  const digits = raw.replace(/\D/g, '');
  return digits ? digits.slice(-4) : raw.trim().toUpperCase();
}

export function accountNameKey(kind, account) {
  return kind === 'bank'
    ? `bank:${bankAccountIdentity(account)}`
    : `${kind}:${String(account == null ? '' : account)}`;
}

export function accountName(names, kind, account) {
  const value = names && typeof names === 'object' ? names[accountNameKey(kind, account)] : null;
  return typeof value === 'string' && value ? value : null;
}

export function accountNamesOnly(names) {
  const out = {};
  if (!names || typeof names !== 'object' || Array.isArray(names)) return out;
  for (const [key, value] of Object.entries(names)) {
    const clean = cleanName(value);
    if (/^(bank|investment):./.test(key) && clean) out[key] = clean;
  }
  return out;
}

export const MODIFIED_Z_CONST = 0.6745;
export const OUTLIER_Z_CUT = 3.5;

export function modifiedZ(value, centre, mad) {
  if (!(mad > 0)) return Infinity;
  return (MODIFIED_Z_CONST * (value - centre)) / mad;
}

// Below this many months there is not enough history for POSITION in a sorted
// list to mean anything. Note this is no longer the threshold for "can we find
// the typical value at all" - recurrence works from two months. It only decides
// which fallback runs when nothing repeats.
export const ROBUST_MIN_MONTHS = 4;

// Two months "agree" when they are within this much of each other. Wide enough
// that ordinary variation in a salary - a few thousand either way, a different
// number of working days - still reads as the same recurring amount; tight
// enough that a month carrying two payments (typically +50% or more) never
// gets absorbed into the cluster it should be excluded from.
export const AGREEMENT_TOLERANCE = 0.08;

/* Which amount actually REPEATS in a run of monthly totals.
 *
 * Position in a sorted list is weak evidence. A median asks "what sits in the
 * middle"; it cannot tell a value that recurs every month from one that merely
 * happens to land mid-list. Recurrence is the stronger signal, and it is the
 * one a person would use themselves: the typical month is the one that keeps
 * happening.
 *
 * For each value, count how many months agree with it within
 * AGREEMENT_TOLERANCE. The value with the most agreement anchors the cluster;
 * ties go to the LOWER anchor (see the safety asymmetry in typicalMonthlyValue).
 * Returns null when nothing repeats at all.
 */
export function repeatingCluster(values, tolerance = AGREEMENT_TOLERANCE) {
  const vals = (values || []).map(Number).filter((v) => Number.isFinite(v));
  if (vals.length < 2) return null;
  const agrees = (a, b) => {
    const scale = Math.max(Math.abs(a), Math.abs(b));
    if (!(scale > 0)) return true;
    return Math.abs(a - b) / scale <= tolerance;
  };
  let best = null;
  for (const anchor of vals) {
    const members = vals.filter((v) => agrees(v, anchor));
    if (
      !best ||
      members.length > best.members.length ||
      // Tie: prefer the lower anchor. Understating a typical month is the
      // recoverable error; overstating it is not.
      (members.length === best.members.length && anchor < best.anchor)
    ) {
      best = { anchor, members };
    }
  }
  return best && best.members.length >= 2 ? best : null;
}

/* THE typical monthly figure, for every noisy monthly series in the app.
 *
 * ONE method, so improving it improves every figure at once: the Plan's
 * take-home, the cushion target, typical outflow, typical committed spending,
 * the size of a recurring payment.
 *
 * The method, in order:
 *
 *  1. RECURRENCE FIRST. Find the amount that actually repeats (see
 *     repeatingCluster) and average the months that agree with it. This is the
 *     primary route at EVERY history length, which is the point: it needs two
 *     months, not four, so the person most exposed to a bad estimate - a new
 *     user with one unusual month among two - is protected by the main method
 *     rather than by a fallback.
 *
 *  2. Nothing repeats, and there is enough history for position to mean
 *     something: take the MEDIAN. With four or more mutually disagreeing
 *     months, the middle is a defensible read and is already resistant to one
 *     extreme value.
 *
 *  3. Nothing repeats, and there is barely any history: take the LOWEST.
 *     This is the case the old plain-average handled worst, and it is the most
 *     common case for a new user. Two months of 285,000 and 500,000 average to
 *     392,500 - a figure that occurred in neither month and is 38% above the
 *     one that might well be normal.
 *
 *     The choice is asymmetric because the CONSEQUENCES are asymmetric. This
 *     figure sets the cushion target and the Plan's take-home. Overstating it
 *     inflates the free-spending band and tells someone they have room they do
 *     not have; understating it makes the plan slightly tighter than it needs
 *     to be and corrects itself the moment a third month arrives. Between a
 *     harmful error and a conservative one, with no evidence to separate them,
 *     take the conservative one.
 *
 *  4. One month: that month, said plainly, flagged as a single reading.
 *
 * Returns { amount, basis, monthsSeen, monthsUsed, excluded }, where basis is
 * 'repeating' | 'median' | 'lowest' | 'single' | 'none' - a figure this
 * load-bearing should be able to say where it came from.
 */
export function typicalMonthlyValue(values, opts = {}) {
  const tolerance = opts.tolerance == null ? AGREEMENT_TOLERANCE : opts.tolerance;
  const vals = (values || []).map((v) => Number(v) || 0).filter((v) => Number.isFinite(v));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  if (!vals.length) {
    return { amount: 0, basis: 'none', monthsSeen: 0, monthsUsed: 0, excluded: [] };
  }
  if (vals.length === 1) {
    return { amount: vals[0], basis: 'single', monthsSeen: 1, monthsUsed: 1, excluded: [] };
  }
  const cluster = repeatingCluster(vals, tolerance);
  if (cluster) {
    const kept = cluster.members;
    const keptCount = new Map();
    for (const v of kept) keptCount.set(v, (keptCount.get(v) || 0) + 1);
    const excluded = [];
    for (const v of vals) {
      const left = keptCount.get(v) || 0;
      if (left > 0) keptCount.set(v, left - 1);
      else excluded.push(v);
    }
    return {
      amount: mean(kept),
      basis: 'repeating',
      monthsSeen: vals.length,
      monthsUsed: kept.length,
      excluded,
    };
  }
  // Nothing repeats.
  if (vals.length >= ROBUST_MIN_MONTHS) {
    return {
      amount: median(vals),
      basis: 'median',
      monthsSeen: vals.length,
      monthsUsed: vals.length,
      excluded: [],
    };
  }
  const lowest = Math.min(...vals);
  return {
    amount: lowest,
    basis: 'lowest',
    monthsSeen: vals.length,
    monthsUsed: 1,
    excluded: vals.filter((v) => v !== lowest),
  };
}

// A full annual cycle. Below this many months, a run of monthly totals has not
// yet met the costs that arrive once a year, so an average of it is low and
// cannot know that it is. At or above it, the cycle is inside the window.
export const FULL_YEAR_MONTHS = 12;

/* The PLAIN average of every month there is - deliberately NOT
 * typicalMonthlyValue, and the difference matters.
 *
 * typicalMonthlyValue answers "what does a normal month look like", so it sets
 * the unusual months aside. That is right for income, where a month carrying
 * two salary payments is noise.
 *
 * It is wrong for a cost of living. The months that look unusual - the annual
 * insurance, the property tax, the car service - are exactly the costs a safety
 * net has to cover, and they are unusual only in WHEN they land, not in whether
 * they happen. Setting them aside would size the net against the cheap months
 * and miss the expensive ones by design.
 *
 * So every month counts, once, at face value. This also gives the figure a
 * property nothing else here has: at twelve months or more the window contains
 * one whole annual cycle, so the lumps are in the average automatically and no
 * detection of them is needed at any point.
 *
 * Returns { amount, monthsSeen, monthsUsed, fullYear } - monthsUsed equals
 * monthsSeen because nothing is ever dropped, and both are kept so a caller can
 * read this shape the same way it reads typicalMonthlyValue's.
 */
export function averageMonthlyValue(values) {
  const vals = (values || []).map((v) => Number(v) || 0).filter((v) => Number.isFinite(v));
  if (!vals.length) {
    return { amount: 0, monthsSeen: 0, monthsUsed: 0, fullYear: false };
  }
  const amount = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    amount,
    monthsSeen: vals.length,
    monthsUsed: vals.length,
    fullYear: vals.length >= FULL_YEAR_MONTHS,
  };
}

/* THE running-balance reader. One definition of "what balance does this row
 * report", shared by every function that answers "what is this account's latest
 * balance".
 *
 * Statements supply this under two different names depending on the parse path:
 * `balanceAfter` from the bank parser, and a raw `Running Balance` column on
 * rows that came through a generic import. Activity's account chip read only
 * the first; Position's liquidBalance read both. An account whose most recent
 * movement carried the column but not the field therefore showed its LATEST
 * balance on Position and an older one on Activity - the same account reading
 * $1,052,352.71 on one tab and $944,106.45 on the other, while accounts whose
 * rows happened to carry balanceAfter agreed exactly and made the difference
 * look like a rounding quirk rather than two different readers.
 *
 * Returns null when the row reports no balance at all, which callers use to
 * skip it rather than treat it as a zero balance.
 */
export function rowBalance(r) {
  if (!r) return null;
  if (r.balanceAfter != null && r.balanceAfter !== '') {
    const v = Number(r.balanceAfter);
    return Number.isFinite(v) ? v : null;
  }
  const col = r['Running Balance'];
  if (col !== undefined && col !== '' && col !== null) {
    const v = Number(col);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

/* THE card-statement ordering, and THE "which one is latest".
 *
 * Ten call sites had each written this sort out by hand, and an eleventh
 * (the Plan tab's card leg) ordered by `periodEnd || source_file` instead of
 * statementKey - a genuinely different key, so the Plan tab could consider a
 * different statement "latest" than the goal engine did, and the card balance
 * on one screen could belong to a different statement than the same balance on
 * another. Ordering IS a calculation: it decides which figures the whole app
 * then reads.
 *
 * statementKey is the ordering key because it is the one field guaranteed to
 * sort chronologically as a string. Missing keys sort first rather than
 * throwing, so a half-parsed statement can never become "latest" by accident.
 */
export function sortedCardStatements(statements) {
  return (statements || [])
    .slice()
    .sort((a, b) => String((a && a.statementKey) || '').localeCompare(String((b && b.statementKey) || '')));
}

export function latestCardStatement(statements) {
  const sorted = sortedCardStatements(statements);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

/* THE measurement of the app's own fixed chrome.
 *
 * Two bars are pinned over the page: the sticky header stack at the top and,
 * on phones, the fixed view switcher at the bottom. Every offset that had to
 * clear them was a hand-written constant - body { padding-bottom: 72px } for a
 * bar that actually measures 69, and nothing at all for scroll anchoring.
 *
 * The cost of the missing one was measurable: scrollIntoView({block:'start'})
 * left 175px of its target behind the header, and block:'end' left 69px behind
 * the bottom bar. "Show me this transaction" scrolled to a row you could not
 * see. scroll-padding is the native fix and it covers EVERY scroll - anchors,
 * focus moves, and the browser's own - but it needs a number, and the only
 * honest number is the measured one.
 *
 * So the bars are measured once per render and published as custom properties;
 * CSS composes the rest. One source, so a bar that changes height (a longer
 * label, a wrapped row, a notch) can never leave an offset stale.
 */
export function syncLayoutInsets() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  const px = (n) => Math.round(n) + 'px';
  const height = (sel) => {
    const node = document.querySelector(sel);
    if (!node || node.hidden) return 0;
    const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
    return rect ? rect.height : 0;
  };
  const stackH = height('.topbar-stack');
  const topbarH = height('.topbar');
  root.style.setProperty('--stack-h', px(stackH));
  root.style.setProperty('--topbar-h', px(topbarH));
  // How far the header may scroll away on a phone: only as far as leaves
  // something pinned. On the first-run screen there are no statements yet, so
  // the period bar has nothing to select and collapses to zero height - and
  // detaching by the topbar's full height there would scroll the ENTIRE header
  // away, taking the Add button with it, on the one screen whose only job is
  // adding a statement. Nothing to pin means nothing detaches.
  const pinnable = stackH - topbarH;
  root.style.setProperty('--topbar-detach', px(pinnable > 8 ? topbarH : 0));
  // Only the bottom bar that is actually docked counts. On desktop the switcher
  // sits inside the period bar and covers nothing, so the inset must be zero
  // rather than the height of a bar that is not in the way. The class alone is
  // not the test - it is set at every width; being fixed is what makes the bar
  // an obstacle, so that is what is asked.
  const dock = document.querySelector('.ledger-switch');
  const docked =
    dock && !dock.hidden && typeof getComputedStyle === 'function'
      ? getComputedStyle(dock).position === 'fixed'
      : false;
  root.style.setProperty('--dock-bottom', px(docked ? height('.ledger-switch') : 0));
  // The bottom banner is chrome too, and the page reserved a hardcoded 132px
  // for it. Measured at 375px it stands 217px tall - the mobile layout turns it
  // into a three-row grid - so 63px of content sat under a banner the layout
  // believed it had cleared. It is only ever one at a time (bannerAlreadyShown
  // enforces that), so the tallest visible one is the answer.
  // (A banner used to be measured here so the page could reserve room beneath a
  // FIXED bar. The notice banners now sit in the document flow, so they occupy
  // their own space and there is nothing left to reserve - the measurement, and
  // the class of bug where the reservation and the real height drift apart,
  // both went with the floating position.)
}

/* THE scroll-affordance rule for horizontal strips.
 *
 * A row that scrolls sideways has to say so. Both of the app's strips (the
 * category chips, the account slicer) ended in a hard vertical cut with no
 * fade, no arrow and no guaranteed part-chip - the transaction filters measured
 * 1124px of chips in a 347px row with the tenth chip starting at exactly the
 * clipping edge, so a whole category sat invisible behind a clean straight line.
 *
 * This marks which side has more, and CSS fades that side only. Marking both
 * sides unconditionally would be a decoration; marking the real state is
 * information. Idempotent, so calling it again after a re-render is free.
 */
export function markScrollAffordance(node) {
  if (!node || typeof node.addEventListener !== 'function') return node;
  node.classList.add('hscroll');
  const paint = () => {
    const slack = node.scrollWidth - node.clientWidth;
    if (slack <= 2) {
      node.removeAttribute('data-overflow');
      return;
    }
    const atStart = node.scrollLeft <= 2;
    const atEnd = node.scrollLeft >= slack - 2;
    node.setAttribute('data-overflow', atStart ? 'end' : atEnd ? 'start' : 'both');
  };
  if (!node._affordanceBound) {
    node._affordanceBound = true;
    node.addEventListener('scroll', paint, { passive: true });
    if (typeof ResizeObserver === 'function') {
      // The strip's own width changes with the card, and its content changes
      // with the period. Either can turn a scrolling row into a complete one.
      new ResizeObserver(paint).observe(node);
    }
  }
  paint();
  // A strip is usually marked at the moment it is built - before it is in the
  // document and before its chips are in it - where both widths read 0 and the
  // row looks complete. ResizeObserver does not help: adding children does not
  // change the container's own box, so it never fires a second time. One frame
  // later the row is attached, filled and measurable.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(paint);
  return node;
}

/* THE modal contract. Every overlay in the app, not just the ones that happen
 * to share a factory.
 *
 * Measured on the live app before this existed, with a dialog open:
 *   document.activeElement            BODY  (focus never entered the dialog)
 *   background buttons still tabbable 51
 *   #app aria-hidden                  absent
 *   body overflow                     visible (the page scrolled underneath)
 *   Escape                            did nothing
 *   .to-top at the pointer            hit-tested ON TOP of the backdrop
 *
 * Escape was implemented six times elsewhere - the info popover, the chart
 * tooltip, the Activity narrow, the row detail, the plan editor, the export
 * menu - and not once on the surface where it is most expected.
 *
 * Three overlays existed, built three ways: the shared openModal path, the
 * passphrase prompt (its own construction, and the most security-sensitive
 * dialog in the app), and the import progress box. They now all enter through
 * here. `dismissible: false` is for the progress box, which is deliberately
 * not escapable - it still gets focus containment and an inert background.
 */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

const modalStack = [];

export function enterModal(overlay, opts = {}) {
  if (typeof document === 'undefined' || !overlay) return () => {};
  const {
    dismissible = true,
    onDismiss = null,
    returnFocus: requestedReturnFocus = null,
  } = opts;
  const box = overlay.querySelector('[role="dialog"]') || overlay.firstElementChild || overlay;
  const returnFocus =
    requestedReturnFocus ||
    (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);

  if (box && !box.getAttribute('aria-modal')) box.setAttribute('aria-modal', 'true');
  document.body.classList.add('modal-open');

  // ORDER MATTERS, twice over. Focus moves BEFORE the background is hidden,
  // because a browser refuses to apply aria-hidden to a subtree that still
  // holds focus. And it moves synchronously first: deferring to a frame alone
  // left activeElement on the opener, because the click that opened the dialog
  // was still settling.
  const first = box.querySelector(FOCUSABLE_SELECTOR);
  const target = first || box;
  if (!first && box.tabIndex < 0) box.tabIndex = -1;
  const takeFocus = () => {
    if (!overlay.isConnected || box.contains(document.activeElement)) return;
    try {
      target.focus({ preventScroll: true });
    } catch {
      /* nothing focusable; the Tab handler below still holds focus in */
    }
  };
  takeFocus();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(takeFocus);

  const app = document.getElementById('app');
  if (app) app.setAttribute('aria-hidden', 'true');

  const onKey = (e) => {
    if (!overlay.isConnected) return;
    if (modalStack[modalStack.length - 1] !== entry) return;
    if (e.key === 'Escape' && dismissible) {
      e.preventDefault();
      e.stopPropagation();
      if (onDismiss) onDismiss();
      else release();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...box.querySelectorAll(FOCUSABLE_SELECTOR)].filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    });
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const head = items[0];
    const tail = items[items.length - 1];
    const active = document.activeElement;
    // Wrap at both ends, and catch focus having escaped entirely - a re-render
    // can remove the node that had it.
    if (!box.contains(active)) {
      e.preventDefault();
      (e.shiftKey ? tail : head).focus();
    } else if (e.shiftKey && active === head) {
      e.preventDefault();
      tail.focus();
    } else if (!e.shiftKey && active === tail) {
      e.preventDefault();
      head.focus();
    }
  };

  let released = false;
  function release() {
    if (released) return;
    released = true;
    document.removeEventListener('keydown', onKey, true);
    const at = modalStack.indexOf(entry);
    if (at >= 0) modalStack.splice(at, 1);
    // Only the last modal out restores the page.
    if (!modalStack.length) {
      document.body.classList.remove('modal-open');
      if (app) app.removeAttribute('aria-hidden');
    }
    if (returnFocus && document.contains(returnFocus)) {
      try {
        returnFocus.focus({ preventScroll: true });
      } catch {
        /* the opener may have been re-rendered away; nothing to return to */
      }
    }
  }

  const entry = { overlay, release };
  modalStack.push(entry);
  document.addEventListener('keydown', onKey, true);
  return release;
}

/* THE reader for "what is this transaction called".
 *
 * Two ledgers, two record shapes: a card row carries displayName/description, a
 * bank row carries counterpartyLabel. The transaction list knew that; the
 * dialogs did not, and each had written its own guess.
 *
 * Measured, before this: opening "+ Custom label" on ANY bank transaction gave
 * a dialog headed
 *
 *     Custom label “”
 *
 * - an empty quoted name, on every bank row in the app, because the dialog
 * read displayName || description and a bank row has neither. The card row
 * beside it read "Custom label “Cannonball Cafe”" correctly. One reader, so a
 * dialog can no longer disagree with the row that opened it.
 */
export function transactionName(row) {
  if (!row) return '';
  const first = (s) => String(s || '').split(',')[0].replace(/\s+/g, ' ').trim();
  // narrative comes first on a bank row: it is the finished sentence
  // ("Transfer to Senior (via ACH)"), already parsed, cased and comma-cut, so
  // reading it here keeps a row and the dialog it opens naming the transaction
  // identically - which is the whole reason this reader exists.
  return (
    first(row.narrative) ||
    first(row.displayName) ||
    first(row.counterpartyLabel) ||
    first(row.description) ||
    ''
  );
}
