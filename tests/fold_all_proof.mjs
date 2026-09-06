import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collapsibleCard,
  placeFoldAll,
  rememberedCardKeys,
  forgetCollapsibleCards,
} from '../application/ui/decision-header.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL', l);
  }
};
console.log('='.repeat(72));
console.log(' CLOSED DISCLOSURES - one calm default and one shared fold control');
console.log('='.repeat(72));

class StubNode {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.listeners = {};
    this.parentElement = null;
    this.textContent = '';
    this.hidden = false;
    this.open = false;
    this.classes = new Set();
  }
  get classList() {
    const s = this.classes;
    return {
      contains: (c) => s.has(c),
      add: (...c) => c.forEach((x) => s.add(x)),
      remove: (...c) => c.forEach((x) => s.delete(x)),
    };
  }
  setAttribute(k, v) {
    if (k === 'class') this.classes = new Set(String(v).split(/\s+/).filter(Boolean));
    else if (k === 'open') this.open = true;
    else this.attrs[k] = String(v);
  }
  hasAttribute(k) {
    return k in this.attrs;
  }
  append(...kids) {
    for (const k of kids) {
      if (!k || typeof k !== 'object') continue;
      k.parentElement = this;
      this.children.push(k);
    }
  }
  insertBefore(node, ref) {
    const i = this.children.indexOf(ref);
    node.parentElement = this;
    this.children.splice(i < 0 ? this.children.length : i, 0, node);
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  querySelector(sel) {
    if (sel !== ':scope > details.card-disclosure') return null;
    return this.children.find((k) => k.tagName === 'DETAILS' && k.classList.contains('card-disclosure')) || null;
  }
}

const el = (tag, attrs = {}, ...kids) => {
  const n = new StubNode(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  n.append(...kids.flat());
  return n;
};

const detailsOf = (card) => card.querySelector(':scope > details.card-disclosure');
const settle = (cards, before) => {
  cards.forEach((card, i) => {
    const d = detailsOf(card);
    if (d.open !== before[i]) for (const fn of d.listeners.toggle || []) fn();
  });
};
const press = (row, cards) => {
  const before = cards.map((c) => detailsOf(c).open);
  const button = row.children[0];
  for (const fn of button.listeners.click || []) fn();
  settle(cards, before);
  return button.textContent;
};
const body = () => el('div', {});

let missingSummaryRejected = false;
try {
  collapsibleCard(el, { title: 'Mystery', summary: '', body: body() });
} catch {
  missingSummaryRejected = true;
}
note(missingSummaryRejected, 'a collapsible section cannot ship without a closed-state descriptor');

forgetCollapsibleCards();
const plain = el('section', { class: 'card' });
const quiet = collapsibleCard(el, { title: 'Quiet', summary: 'a fact', body: body(), name: 'proof-quiet' });
const flagged = collapsibleCard(el, { title: 'Flagged', summary: 'needs a decision', body: body(), open: true, name: 'proof-flagged' });
const other = collapsibleCard(el, { title: 'Other', summary: 'another fact', body: body(), name: 'proof-other' });
const filter = collapsibleCard(el, { title: 'Filter', summary: 'All accounts', body: body(), compact: true, name: 'proof-filter' });
const host = el('div', {});
host.append(plain, quiet, flagged, other, filter);

note(!detailsOf(quiet).open && !detailsOf(flagged).open && !detailsOf(other).open, 'every section starts closed, even when old callers pass open');

const row = placeFoldAll(el, host);
note(row && host.children.indexOf(row) === 1, 'the control sits directly before the first collapsible card');
note(row.children[0].textContent === 'Open all', 'with anything folded it offers Open all');

const stack = [quiet, flagged, other, filter];
note(press(row, stack) === 'Close all', 'Open all flips the control to Close all');
note(detailsOf(quiet).open && detailsOf(other).open && detailsOf(flagged).open, 'Open all opens every section card');
note(!detailsOf(filter).open, 'a compact control card is not a section and is left alone');
note(
  !rememberedCardKeys().includes('proof-quiet') && !rememberedCardKeys().includes('proof-other'),
  'Open all is one-shot and does not replace the remembered per-card state'
);

note(press(row, stack) === 'Open all', 'Close all flips the control back');
note(!detailsOf(quiet).open && !detailsOf(other).open && !detailsOf(flagged).open, 'Close all folds every section card');
note(
  !rememberedCardKeys().includes('proof-quiet') && !rememberedCardKeys().includes('proof-other'),
  'Close all is one-shot and does not pin the calm cards shut'
);
note(!rememberedCardKeys().includes('proof-flagged'), 'one-shot actions do not create remembered card state');

const beforeTap = [false];
detailsOf(quiet).open = true;
settle([quiet], beforeTap);
note(rememberedCardKeys().includes('proof-quiet'), 'an individual tap is still remembered');
note(press(row, stack) === 'Close all', 'Open all still opens the remaining calm cards');
note(press(row, stack) === 'Open all', 'Close all still folds the current stack');
const rebuiltQuiet = collapsibleCard(el, { title: 'Quiet', summary: 'a fact', body: body(), name: 'proof-quiet' });
const rebuiltOther = collapsibleCard(el, { title: 'Other', summary: 'another fact', body: body(), name: 'proof-other' });
note(detailsOf(rebuiltQuiet).open, 'a person’s own tap survives both one-shot actions');
note(!detailsOf(rebuiltOther).open, 'a card opened only by Open all returns to its default after a rebuild');

forgetCollapsibleCards();
const pair = el('div', {});
pair.append(
  collapsibleCard(el, { title: 'H1', summary: 'x', body: body(), open: true, name: 'proof-h1' }),
  collapsibleCard(el, { title: 'H2', summary: 'y', body: body(), open: true, name: 'proof-h2' })
);
const pairRow = placeFoldAll(el, pair);
note(pairRow && pairRow.children[0].textContent === 'Open all', 'legacy open hints cannot bypass the closed default');

const single = el('div', {});
single.append(collapsibleCard(el, { title: 'Only', summary: 'z', body: body(), name: 'proof-only' }));
note(placeFoldAll(el, single) === null, 'one folded card gets no control');
forgetCollapsibleCards();

const ui = (...p) => read('application', 'ui', ...p);
const decision = ui('decision-header.js');
const everyUi = ['activity-render.js', 'ahead-render.js', 'position-render.js', 'cards-render.js', 'accounts-render.js', 'intentions-section.js', 'plan-render.js'];
note(everyUi.every((f) => !ui(f).includes('fold-all')), 'the control has one implementation, in decision-header.js');
note(/class: 'fold-all-btn'/.test(decision), 'and it is built there');
const activity = ui('activity-render.js');
const analysisTab = activity.slice(activity.indexOf('function renderAnalysisTab()'), activity.indexOf('function renderActivity()'));
note(/placeFoldAll\(el, wrap\);\s*return wrap;/.test(analysisTab), 'Activity places it once its cards are built');
const ahead = ui('ahead-render.js');
const aheadTab = ahead.slice(ahead.indexOf('function renderAhead()'), ahead.indexOf('function draftSignature()'));
note(/placeFoldAll\(el, wrap\);\s*return wrap;/.test(aheadTab), 'Plan places it once its cards are built');
note(/placeFoldAll\(el, wrap\);\s*return wrap;/.test(ui('position-render.js')), 'Position places it once its cards are built');

console.log('\n -- status is in the descriptor, never in an auto-open rule --');
note(everyUi.every((f) => !/\bopen:\s*(?:attention|monthFiltered|waiting|filtered|soon|overdue|offTarget|standing\.)/.test(ui(f))), 'no view auto-opens a section from its status');
note(!/carried, paying interest`, true\)/.test(ui('cards-render.js')), 'a carried card names the warning while remaining folded');
note(/summary: soon\.length[\s\S]{0,180}due within/.test(ahead), 'imminent payments are named in the closed summary');
note(/const summary = offTarget[\s\S]{0,180}Unsaved changes/.test(ui('plan-render.js')), 'plan variance and unsaved work are named in the closed summary');
note(/summary: standing\.summary/.test(ahead), 'goal standing is named in the closed summary');

console.log('\n -- a folded card lines up with a plain one on every width --');
const css = read('interface', 'feature-additions.css');
note(
  /\n#app \.card\.card-collapsible,\n\.accounts-wrap \.card\.card-collapsible \{\n\s*padding: 0;/.test(css),
  'the card hands its padding to the summary at every width, at a specificity that beats #app .card'
);
note(
  /@media \(min-width: 640px\) \{\s*#app \.card\.card-collapsible:not\(\.card-compact\) > \.card-disclosure > summary \{\s*padding: var\(--s5\) var\(--s6\);/.test(css),
  'on wider screens the summary takes the plain card’s own padding'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
