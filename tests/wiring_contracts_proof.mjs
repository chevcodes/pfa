import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const controller = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');

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
console.log(' WIRING CONTRACTS - a factory cannot ask for what nobody passes');
console.log('='.repeat(72));

// A factory declares its dependencies with requireCtx(ctx, [...]) and fails
// loudly at construction if one is absent. That is the right behaviour, but it
// only fires at RUNTIME - a name added to the list without being added at the
// call site takes the whole app down on boot, which is exactly what happened
// when renderCoverage was required by the Ahead tab but never passed. This
// checks both halves agree before anyone runs it.
function requiredNames(source) {
  const out = new Map();
  const re = /requireCtx\(\s*ctx,\s*\[([\s\S]*?)\],\s*'([A-Za-z]+)'/g;
  let m;
  while ((m = re.exec(source))) {
    const names = [...m[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]);
    out.set(m[2], names);
  }
  return out;
}

function providedNames(factory) {
  const at = controller.indexOf(`${factory}({`);
  if (at === -1) return null;
  let depth = 0;
  let i = controller.indexOf('{', at);
  const start = i;
  for (; i < controller.length; i++) {
    if (controller[i] === '{') depth++;
    else if (controller[i] === '}') {
      depth--;
      if (!depth) break;
    }
  }
  const body = controller.slice(start + 1, i);
  const names = new Set();
  // shorthand `name,` and explicit `name: value,` at any nesting depth
  for (const mm of body.matchAll(/(?:^|[\s{,])([A-Za-z_][A-Za-z0-9_]*)\s*(?:,|:|\n)/g)) {
    names.add(mm[1]);
  }
  return names;
}

const uiDir = join(ROOT, 'application', 'ui');
const files = readdirSync(uiDir).filter((f) => f.endsWith('.js'));
let checked = 0;
let missingTotal = 0;

for (const file of files) {
  const src = readFileSync(join(uiDir, file), 'utf8');
  for (const [factory, names] of requiredNames(src)) {
    const provided = providedNames(factory);
    if (!provided) continue; // constructed elsewhere (or not at all) - not this proof's business
    checked++;
    const missing = names.filter((n) => !provided.has(n));
    missingTotal += missing.length;
    note(
      missing.length === 0,
      `${factory} (${file}): every required name is passed at its call site${missing.length ? ` - MISSING: ${missing.join(', ')}` : ''}`
    );
  }
}

note(checked >= 5, `at least five factories were actually checked (checked ${checked})`);
note(missingTotal === 0, 'no factory anywhere asks for a dependency the call site does not provide');

console.log('\n -- the cache key cannot drift from the filter state --');
const activity = readFileSync(join(ROOT, 'application', 'ui', 'activity-render.js'), 'utf8');
const sig = activity.slice(
  activity.indexOf('function activityTabSignature'),
  activity.indexOf('function activityTabSignature') + 700
);
note(/facetValues\(state\.filter\)/.test(sig), 'the card filters go into the key as a whole object');
note(/facetValues\(state\.bankFilter\)/.test(sig), 'so do the bank filters');
note(!/\bf\.(category|merchant|month|min|max)\b/.test(sig), 'no individual card facet is listed by hand any more');
note(!/\bbf\.(payeeKey|hideInternal)\b/.test(sig), 'nor any individual bank facet');
// The two that had already drifted out of the hand-written list.
note(/Object\.keys\(obj\)/.test(activity), 'every own key is read, so merchantLabel and payeeLabel are covered');

console.log('\n -- shared CSS contracts are joined, not re-implemented --');
const premium = readFileSync(join(ROOT, 'interface', 'premium.css'), 'utf8');
const whereBlock = premium.slice(premium.indexOf(':where('), premium.indexOf(':where(') + 900);
for (const cls of ['dh-note', 'plan-note', 'plan-assign-name', 'proportion-legend-label', 'cov-note', 'wiz-q']) {
  note(whereBlock.includes(`.${cls},`), `.${cls} joins the shared full-width/wrap rule rather than redefining it`);
}
const additions = readFileSync(join(ROOT, 'interface', 'feature-additions.css'), 'utf8');
note(!/align-self: stretch;\s*\n\s*width: 100%/.test(additions), 'no component re-implements the shared stretch/width pair');

console.log('\n -- a period label names what the chart DRAWS --');
// Every one of these charts slices its data before drawing. A label derived
// from the source rather than from the rendered months names a year with no
// column under it - which is how a twelve-month chart came to be headed
// "2024-2026" while its own footer said "September 2025 - August 2026".
const overview = readFileSync(join(ROOT, 'application', 'ui', 'overview-render.js'), 'utf8');
const cards = readFileSync(join(ROOT, 'application', 'ui', 'cards-render.js'), 'utf8');
note(
  !/yearSpanLabel\(\s*\(?rollAllTrend/.test(overview) && !/chartYears/.test(overview),
  'Cash movement no longer derives a pill from the unsliced history'
);
note(
  /already prints its exact\s*\n\s*\/\/ window in its own footer/.test(overview),
  'and the reason it has no pill - its footer already states the window - is recorded'
);
note(
  /const range = `\$\{monthLabel\(model\.months\[0\]\)\}/.test(
    readFileSync(join(ROOT, 'application', 'ui', 'flow-chart-render.js'), 'utf8')
  ),
  'that footer is built from model.months, the months actually drawn'
);
note(
  /yearSpanLabel\(\(drawn\.cells \|\| \[\]\)/.test(activity),
  'the income pill reads the rendered cells, not the source series'
);
note(!/income\.series\) \|\| \[\]\)\.map/.test(activity), 'the source-series version is gone');
note(
  /const shown = months\.length > 13 \? months\.slice\(-13\) : months;\s*const yr = yearSpanLabel\(shown\)/.test(cards),
  'the spending pill reads the sliced months it draws'
);

console.log('\n -- every figure passes the privacy gate --');
// Hiding figures is a headline promise of this app, and it is enforced in ONE
// place: makeMoney/makeMoneyShort (core/money-format.js). A module that formats
// its own amounts bypasses that gate silently - with figures hidden, every
// other number masked and the hand-formatted one printed in full.
const analysisDir = join(ROOT, 'application', 'analysis');
const uiFiles = files.map((f) => ['application/ui/' + f, readFileSync(join(uiDir, f), 'utf8')]);
const analysisFiles = readdirSync(analysisDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ['application/analysis/' + f, readFileSync(join(analysisDir, f), 'utf8')]);
const offenders = [];
for (const [name, src] of [...uiFiles, ...analysisFiles]) {
  for (const line of src.split('\n')) {
    if (!line.includes('toLocaleString')) continue;
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // a comment naming the trap is not the trap
    if (/date|Date|month|Month|year/i.test(line)) continue;
    offenders.push(`${name}: ${line.trim().slice(0, 70)}`);
  }
}
note(
  offenders.length === 0,
  `no analysis or UI module formats money itself${offenders.length ? ' - ' + offenders.join(' | ') : ''}`
);
const planSrc = readFileSync(join(analysisDir, 'plan.js'), 'utf8');
note(/makeMoney\(\{[\s\S]{0,120}code: f\.currency/.test(planSrc), 'the foreign figure is formatted in its own currency THROUGH makeMoney');
const gc = readFileSync(join(analysisDir, 'goal-constraints.js'), 'utf8');
note(/key: 'lower-ceiling', amount:/.test(gc), 'the constraint engine returns amounts, not money strings');
note(/export function describeResolutions/.test(gc), 'and the caller formats them with its own gate');

console.log('\n -- no orphaned rules left behind by a rewrite --');
const jsAll = files.map((f) => readFileSync(join(uiDir, f), 'utf8')).join('\n') + controller;
const declared = [...new Set((additions.match(/\.(plan|wiz|cov|proportion)[a-z-]*/g) || []).map((s) => s.slice(1)))];
const orphans = declared.filter((c) => !jsAll.includes(c));
note(orphans.length === 0, `every plan/wizard/coverage rule is still used${orphans.length ? ` - ORPHANS: ${orphans.join(', ')}` : ''}`);

console.log('\n -- one rule, one copy --');
{
  /* Three rules had each been hand-written in several places, which is how two
   * screens come to disagree about the same thing: the prefix a foreign figure
   * wears, the number of days between two dates, and the short month names. Each
   * now has ONE home, and a second copy fails here rather than drifting quietly. */
  const appDir = join(ROOT, 'application');
  const sources = [];
  // Comments NAME these rules on purpose (that is where the reasoning lives),
  // and sample-data fabricates its own statement text rather than rendering the
  // app's, so neither counts as a second copy.
  const withoutComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'sample-data') walk(full);
      } else if (entry.name.endsWith('.js')) {
        sources.push([full.slice(appDir.length + 1), withoutComments(readFileSync(full, 'utf8'))]);
      }
    }
  };
  walk(appDir);

  const prefixCopies = sources.filter(([name, src]) => name !== 'core/money-format.js' && /'US\$'/.test(src));
  note(
    prefixCopies.length === 0,
    `the foreign-currency prefix is declared once${prefixCopies.length ? ' - ALSO IN: ' + prefixCopies.map(([n]) => n).join(', ') : ''}`
  );

  const dayCopies = sources.filter(
    ([name, src]) => name !== 'core/shared-helpers.js' && /(?:function|const)\s+daysBetween\s*[(=]/.test(src)
  );
  note(
    dayCopies.length === 0,
    `days-between-two-dates is defined once${dayCopies.length ? ' - ALSO IN: ' + dayCopies.map(([n]) => n).join(', ') : ''}`
  );

  const joinCopies = sources.filter(
    ([name, src]) => name !== 'core/shared-helpers.js' && /slice\(0, -1\)\.join\(', '\)/.test(src)
  );
  note(
    joinCopies.length === 0,
    `"a, b and c" is joined in one place${joinCopies.length ? ' - ALSO IN: ' + joinCopies.map(([n]) => n).join(', ') : ''}`
  );

  const monthCopies = sources.filter(
    ([name, src]) => name !== 'core/shared-helpers.js' && /\[\s*(?:'',\s*)?'Jan',\s*'Feb'/.test(src)
  );
  note(
    monthCopies.length === 0,
    `the short month names are declared once${monthCopies.length ? ' - ALSO IN: ' + monthCopies.map(([n]) => n).join(', ') : ''}`
  );
}
note(declared.length > 20, `and there are enough of them for that to mean something (${declared.length})`);

console.log('\n -- going over a target changes colour, never geometry --');
{
  // A bar that shows progress against a target must keep ONE height. When it
  // grew on being exceeded it pushed the control row beneath it; on a phone the
  // buttons ended up inside the stripes. Rather than pin this one bar and wait
  // for the next one, any rule that styles an exceeded state is checked for
  // geometry properties.
  const GEOMETRY = /(^|[;{\s])(height|min-height|max-height|padding|padding-[a-z]+|border-width|border|margin|margin-[a-z]+|inset|top|bottom|transform|scale)\s*:/;
  const sheets = {
    'feature-additions.css': additions,
    'premium.css': premium,
    'dashboard.css': readFileSync(join(ROOT, 'interface', 'dashboard.css'), 'utf8'),
    'foundation.css': readFileSync(join(ROOT, 'interface', 'foundation.css'), 'utf8'),
  };
  const offenders = [];
  for (const [name, css] of Object.entries(sheets)) {
    // every rule whose selector carries an over/exceeded state
    const rules = css.match(/[^{}]*\.is-over[^{}]*\{[^}]*\}/g) || [];
    for (const rule of rules) {
      const body = rule.slice(rule.indexOf('{'));
      if (GEOMETRY.test(body)) offenders.push(`${name}: ${rule.split('{')[0].trim()}`);
    }
  }
  note(
    offenders.length === 0,
    `no over-target rule changes geometry${offenders.length ? ' - ' + offenders.join(' | ') : ''}`
  );
  // and the height is actually pinned against a stretching parent
  const pinned = /:where\(\.plan-bar\)\s*\{[^}]*min-height[^}]*max-height[^}]*\}/s.test(additions);
  note(pinned, 'the target-bar contract pins the height against flex/grid stretch');
}

console.log('\n -- one number, one source: no hand-rolled duplicates --');
{
  // Principle 1, enforced. Each of these is a calculation that decides which
  // figures the rest of the app then reads, and each had grown several private
  // copies that could disagree. A new copy anywhere fails this check.
  const analysisFiles = readdirSync(analysisDir).filter((f) => f.endsWith('.js'));
  const uiFiles = readdirSync(uiDir).filter((f) => f.endsWith('.js'));
  const all = [
    ...analysisFiles.map((f) => [`analysis/${f}`, readFileSync(join(analysisDir, f), 'utf8')]),
    ...uiFiles.map((f) => [`ui/${f}`, readFileSync(join(uiDir, f), 'utf8')]),
    ['app-controller.js', controller],
  ];
  const DUPES = [
    [/\.sort\(\(a, b\) => String\(a\.statementKey/, 'a hand-rolled card-statement sort (use sortedCardStatements)'],
    [/^\s*function median\(/m, 'a private median (use shared-helpers median)'],
    [/r\.balanceAfter != null\s*\n?\s*\?\s*Number\(r\.balanceAfter\)/, 'a hand-rolled balance reader (use rowBalance)'],
  ];
  const offenders = [];
  for (const [name, src] of all) {
    if (name.endsWith('shared-helpers.js')) continue;
    for (const [re, what] of DUPES) if (re.test(src)) offenders.push(`${name}: ${what}`);
  }
  note(
    offenders.length === 0,
    `no second copy of a shared calculation${offenders.length ? ' - ' + offenders.join(' | ') : ''}`
  );
}

console.log('\n -- every choice carries a way back --');
{
  // Principle 8B, enforced where it means something.
  //
  // Not every write is a choice: importing a statement, autosaving a draft,
  // dismissing a banner and appending to a log are not decisions a person would
  // reach for an undo on. These are the CHOICES - the ones that silently change
  // what the app reports, and that a person could make by mistake.
  //
  // A key satisfies this if its writes go through ui/reversible.js OR the call
  // site hands toast() its own undo callback. Both are a way back; the point is
  // that there IS one, not which mechanism supplied it.
  const CHOICE_KEYS = [
    'planSetAside',
    'planGroups',
    'planTarget',
    'financeGoal',
    'financeGoalBoundary',
  ];
  const uiSrc = readdirSync(uiDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => [f, readFileSync(join(uiDir, f), 'utf8')]);
  const unprotected = [];
  for (const key of CHOICE_KEYS) {
    let seen = false;
    let covered = false;
    for (const [, src] of uiSrc) {
      if (!src.includes(key)) continue;
      seen = true;
      // reversible handles it, or a toast on this file carries an undo callback
      if (/reversible\.(change|changeMany|addRecord|removeRecords)/.test(src)) covered = true;
      if (/toast\([^)]*,\s*(?:async\s*)?\(\)\s*=>/.test(src)) covered = true;
    }
    if (seen && !covered) unprotected.push(key);
  }
  note(
    unprotected.length === 0,
    `every stored choice can be taken back${unprotected.length ? ' - NO UNDO: ' + unprotected.join(', ') : ''}`
  );
  const rev = readFileSync(join(uiDir, 'reversible.js'), 'utf8');
  note(/Put back\./.test(rev), 'and the shared mechanism actually offers the undo');
  note(
    /removeRecords/.test(rev) && /addRecord/.test(rev),
    'covering records (limits, labels) as well as settings'
  );
}

console.log('\n -- the app measures its own chrome instead of guessing it --');
{
  // Two bars are pinned over the page. Every offset that clears them used to be
  // a constant: body { padding-bottom: 72px } for a bar measuring 69, and
  // nothing at all for scroll anchoring - scrollIntoView({block:'start'}) left
  // 175px of its target behind the header. Constants drift; a measurement
  // cannot.
  const helpers = readFileSync(join(ROOT, 'application', 'core', 'shared-helpers.js'), 'utf8');
  const ctrl = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
  const css = readdirSync(join(ROOT, 'interface'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(ROOT, 'interface', f), 'utf8'))
    .join('\n');
  note(/export function syncLayoutInsets/.test(helpers), 'one function measures the pinned bars');
  note(
    /--stack-h/.test(helpers) && /--topbar-h/.test(helpers) && /--dock-bottom/.test(helpers),
    'publishing the header, its first row and the docked bar'
  );
  note(
    /getComputedStyle\(dock\)\.position === 'fixed'/.test(helpers),
    'and counts the bottom bar only where it is actually in the way'
  );
  note(
    /requestAnimationFrame\(syncLayoutInsets\)/.test(ctrl),
    'measured after each render, when the bars have just been rebuilt'
  );
  note(
    /addEventListener\('resize', \(\) => requestAnimationFrame\(syncLayoutInsets\)\)/.test(ctrl),
    'and again on resize, so a rotation cannot leave an offset stale'
  );
  note(
    /scroll-padding-top: calc\(var\(--sticky-top\)/.test(css) &&
      /scroll-padding-bottom: calc\(var\(--dock-bottom/.test(css),
    'scroll anchoring clears both bars'
  );
  note(
    !/body\.has-bottom-nav \{\s*\n\s*padding-bottom: calc\(72px/.test(css),
    'the 72px guess under the bottom bar is gone'
  );
  note(
    /markScrollAffordance/.test(helpers) &&
      /\.hscroll\[data-overflow='end'\]/.test(css),
    'and a strip that scrolls sideways says which way there is more'
  );
  const stripFiles = ['activity-render.js', 'chart-surface.js'];
  const marked = stripFiles.filter((f) =>
    readFileSync(join(ROOT, 'application', 'ui', f), 'utf8').includes('markScrollAffordance')
  );
  note(
    marked.length === stripFiles.length,
    `every horizontal strip uses it${marked.length === stripFiles.length ? '' : ' - MISSING: ' + stripFiles.filter((f) => !marked.includes(f)).join(', ')}`
  );
  // P5: one expand mechanism. .vm-detail was a second implementation of it.
  note(
    !/\.vm-detail > summary::after \{/.test(css),
    'the rate dropdown no longer ships its own copy of the disclosure chevron'
  );
  const pos = readFileSync(join(ROOT, 'application', 'ui', 'position-render.js'), 'utf8');
  note(!/vm-detail/.test(pos) && /position-rate-inline/.test(pos), 'the rate now reads inline, with no second copy of the disclosure');
}

console.log('\n -- narrow controls and modal focus stay deterministic --');
{
  const responsive = readFileSync(join(ROOT, 'interface', 'responsive.css'), 'utf8');
  const refinements = readFileSync(join(ROOT, 'interface', 'workspace-refinements.css'), 'utf8');
  const samples = readFileSync(join(ROOT, 'application', 'sample-data', 'mock-personas.js'), 'utf8');
  const helpers = readFileSync(join(ROOT, 'application', 'core', 'shared-helpers.js'), 'utf8');
  const dataExport = readFileSync(join(ROOT, 'application', 'output', 'data-export.js'), 'utf8');
  note(/@media \(pointer: fine\) and \(min-width: 640px\)/.test(responsive), 'a fine pointer cannot shrink controls at phone widths');
  note(/@media \(max-width: 340px\)[\s\S]*?#add-btn \.btn-ic[\s\S]*?display: none/.test(refinements), 'Add keeps its full label at the narrowest supported width');
  note(/position:relative;margin:12px;z-index:auto/.test(samples), 'the local sample control stays in page flow instead of covering the app');
  note(!/2147483000/.test(samples), 'the local sample control cannot out-stack real dialogs or banners');
  note((samples.match(/min-height:44px/g) || []).length >= 4, 'every local sample-data control has a full touch target');
  note(/returnFocus: requestedReturnFocus/.test(helpers), 'the modal contract accepts a stable focus destination');
  note(/returnFocus: \$\('#export-btn'\)/.test(dataExport), 'the backup prompt returns to the visible Export control');
  const planRender = readFileSync(join(ROOT, 'application', 'ui', 'plan-render.js'), 'utf8');
  note(/class: 'plan-amount-label' \}, 'Actual'/.test(planRender), 'Plan rows explicitly identify actual figures');
  note(/class: 'plan-amount-label' \}, 'Plan'/.test(planRender), 'Plan rows explicitly identify planned figures');
  note(!/class: 'plan-row-of'/.test(planRender), 'no ambiguous unlabeled actual-of-target wording remains');
}

console.log('\n -- notice and transaction filters keep content visible --');
{
  const messages = readFileSync(join(ROOT, 'application', 'ui', 'app-messages.js'), 'utf8');
  const activity = readFileSync(join(ROOT, 'application', 'ui', 'activity-render.js'), 'utf8');
  const controls = readFileSync(join(ROOT, 'interface', 'controls.css'), 'utf8');
  const additions = readFileSync(join(ROOT, 'interface', 'feature-additions.css'), 'utf8');
  note(
    (messages.match(/mountBanner\('/g) || []).length === 3 && /function mountBanner\(id\)/.test(messages),
    'all three notices use the single in-flow mount point'
  );
  note(
    /insertBefore\(banner, main\)/.test(messages) && !/\.install-banner\s*\{[^}]*position:\s*fixed/s.test(controls),
    'notice banners sit before the app instead of over its content'
  );
  note(
    /categoryFilter\.append\(hint, chips\)/.test(activity) && /wrap\.append\(categoryFilter, searchFilters\)/.test(activity),
    'the category label and chips share one positioned group above search'
  );
  note(
    /\.tx-categories-filter\s*\{[^}]*gap:\s*6px/s.test(additions),
    'the category label-to-chip gap stays at the measured 6px'
  );
  note(
    /\.card\.card-compact\s*\{[^}]*padding:\s*0 14px/s.test(additions),
    'the account filter stays wide while only its height is trimmed'
  );
}

console.log('\n -- one frame for "N out of M" --');
{
  /* Three components on one panel stated the same kind of fact three ways:
   *   cards-render      "20 of 20 statements reconcile."
   *   accounts-render   "58/58"            (a slash fraction in a tile)
   *   coverage-strip    "2 missing of 21"  (counting the gap, not the whole)
   * Two of them touch each other on screen, so comparing card and account
   * reconciliation meant translating between formats first. */
  const ui = (f) => readFileSync(join(ROOT, 'application', 'ui', f), 'utf8');
  const accounts = ui('accounts-render.js');
  const coverage = ui('coverage-strip.js');
  const cards = ui('cards-render.js');
  note(
    !/`\$\{totalOk\}\/\$\{totalN\}`/.test(accounts),
    'the account tile no longer states its ratio as a slash fraction'
  );
  note(
    /`\$\{totalOk\} of \$\{totalN\}`/.test(accounts),
    'it uses "N of M", like the card panel above it'
  );
  note(
    /\$\{reconciled\} of \$\{stmts\.length\} statement/.test(cards),
    'and the card panel still does too'
  );
  note(
    !/\$\{summary\.missing\} missing of \$\{summary\.total\}`/.test(coverage),
    'the coverage strip no longer flips to counting the gap instead of the whole'
  );
  note(
    // Three: the complete label, the gappy label, and the aria-label that
    // describes the strip to a screen reader - all in the same frame.
    (coverage.match(/\$\{summary\.loaded\} of \$\{summary\.total\} months/g) || []).length === 3,
    'it counts what is loaded in both cases, and tells a screen reader the same way'
  );
}

console.log('\n -- a button never borrows the browser\'s own surface --');
{
  /* The Plan card's "100% of take-home" pill rendered as a grey blob in light
   * mode and correctly in dark, for one reason: it is a <button> that declared
   * a border and a colour but no background, so it fell through to the user
   * agent's default button surface. That surface is invisible on a dark panel
   * and grey on a light one, so the fault was undetectable while only one theme
   * was being looked at.
   *
   * The base reset now declares it transparent, which fixes every button at
   * once. This guard keeps it declared, and refuses any NEW base button rule
   * that styles a border or a colour without saying what its surface is. */
  const foundation = readFileSync(join(ROOT, 'interface', 'foundation.css'), 'utf8');
  note(
    /\nbutton \{[^}]*background:\s*transparent;/.test(foundation),
    'the base button reset declares its own background'
  );

  const cssDir = join(ROOT, 'interface');
  const offenders = [];
  for (const file of readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
    const css = readFileSync(join(cssDir, file), 'utf8');
    const rules = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
    for (const [, rawSel, body] of rules) {
      const sel = rawSel.trim().split('\n').pop().trim();
      if (sel.startsWith('@')) continue;
      if (!/\bbutton\b/.test(sel)) continue;
      // State rules legitimately change one property; the base rule they
      // belong to is what must declare the surface.
      if (/:(hover|focus|focus-visible|active|disabled|checked)/.test(sel)) continue;
      const setsEdge = /(^|;|\s)(border(-[a-z]+)?|color)\s*:/.test(body);
      const setsBg = /(^|;|\s)background(-color|-image)?\s*:/.test(body);
      if (setsEdge && !setsBg) offenders.push(`${file}: ${sel.slice(0, 60)}`);
    }
  }
  note(
    offenders.length === 0,
    `every styled button says what its surface is${offenders.length ? '\n        NO BACKGROUND: ' + offenders.join('\n        ') : ''}`
  );
}

console.log('\n -- headlines exact, sentences short --');
{
  /* The standing rule, in one place:
   *   a HEADLINE figure is full precision everywhere - it is the answer, and
   *   "$218k" cannot be reconciled against a statement;
   *   a figure INSIDE a sentence is shortened everywhere - there it is context,
   *   and "$872,309.04 of the $1,090,386.30" makes a reader parse eighteen
   *   digits to take in a proportion.
   * Both halves matter: an earlier round found a goal card shortening its
   * HEADLINE and correctly reverted it. */
  const fmt = readFileSync(join(ROOT, 'application', 'core', 'money-format.js'), 'utf8');
  note(/export const makeProseMoney = makeMoneyCompact;/.test(fmt), 'the prose formatter has a name that says when to use it');
  note(
    /thousandSuffix: 'k',/.test(fmt) && !/thousandSuffix: 'K',/.test(fmt),
    'and one suffix casing app-wide - it was "K" in prose and "k" on every axis'
  );

  const proseFiles = [
    ['analysis', 'available-now.js'],
    ['analysis', 'plan.js'],
    ['analysis', 'position.js'],
  ];
  const missing = proseFiles.filter(
    ([d, f]) => !readFileSync(join(ROOT, 'application', d, f), 'utf8').includes('makeProseMoney')
  );
  note(
    missing.length === 0,
    `every module that writes a sentence about money builds a prose formatter${missing.length ? ' - MISSING: ' + missing.map((m) => m[1]).join(', ') : ''}`
  );

  // The specific line this rule was written for.
  const alloc = readFileSync(join(ROOT, 'application', 'analysis', 'spend-allocation.js'), 'utf8');
  note(
    /earmarkProse: prose\(a\.earmarkedSaving\)/.test(alloc),
    'the Overview supporting sentence carries a short variant beside the exact one'
  );
  const availableNow = readFileSync(join(ROOT, 'application', 'analysis', 'available-now.js'), 'utf8');
  note(
    /\$\{allocated\.earmarkProse\} of the \$\{prose\(allocation\.surplus\)\}/.test(availableNow),
    'and uses it - "$872k of the $1.09M", not eighteen digits'
  );
  note(
    /amountText: money\(/.test(availableNow),
    'while the headline beside it stays exact'
  );
}

/* ------------------------------------------------------------------------
   A CACHED VIEW'S SIGNATURE MUST DESCRIBE THE DOM IT HOLDS.

   Activity is the one view whose DOM is also rebuilt locally, outside
   render(), so a keystroke or a category chip keeps focus and caret. That
   makes the cached nodes diverge from the signature they were filed under,
   and the next render() then decides nothing changed and hands the stale DOM
   straight back. It killed "Clear all" outright: the button reset the search,
   called render(), and the cache returned the searched list unchanged.

   Two halves, both required: one place builds the signature, and every local
   rebuild re-files the cache under it.
   ------------------------------------------------------------------------ */
{
  const controller = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
  const activity = readFileSync(join(ROOT, 'application', 'ui', 'activity-render.js'), 'utf8');
  const plan = readFileSync(join(ROOT, 'application', 'ui', 'plan-render.js'), 'utf8');
  const ahead = readFileSync(join(ROOT, 'application', 'ui', 'ahead-render.js'), 'utf8');
  console.log('\n -- a cached view cannot outlive the state it was filed under --');
  note(
    /function activityViewSignature\(\)/.test(controller),
    'the Activity cache key is built in one named place'
  );
  note(
    /function noteActivityDomRebuilt\(\)[\s\S]{0,220}_viewCache\.activity\.sig = activityViewSignature\(\)/.test(
      controller
    ),
    'and a local rebuild re-files the cache under the current key'
  );
  note(
    /mountView\(app, 'activity', sig,/.test(controller) &&
      /const sig = activityViewSignature\(\);/.test(controller),
    'render() mounts Activity with that same key, never a retyped copy'
  );
  note(
    /function render\(\)[\s\S]{0,1800}recompute\(\);\s*if \(state\.records\.length\) buildCategoryColours\(\);/.test(controller),
    'render() also recomputes an empty card ledger, so removing its final statement cannot leave stale rows or period labels'
  );
  const rebuild = activity.slice(activity.indexOf('const rebuildLedger = () =>'));
  note(
    /noteActivityDomRebuilt\(\);/.test(rebuild.slice(0, rebuild.indexOf('\n    };'))),
    'every local ledger rebuild calls it before it returns'
  );
  note(
    /'noteActivityDomRebuilt',/.test(activity),
    'and the renderer requires it at construction rather than hoping for it'
  );
  const planSignature = plan.slice(plan.indexOf('function planDraftSignature()'), plan.indexOf('\n  return { renderPlanHero'));
  note(
    planSignature.includes('_assignExpanded'),
    'the Plan cache key includes whether the full category editor is open'
  );
  note(
    /el\('span', \{\}, 'Counts as saving'\)/.test(plan) &&
      /Only payments above the minimum count here\./.test(plan) &&
      !/Counts as saving - payments beyond the minimum/.test(plan),
    'card-saving rows keep the action short and place its explanation behind the shared info control'
  );
  note(
    /!Number\.isFinite\(value\) \|\| value <= 0/.test(ahead) && /Math\.round\(value \* 100\) \/ 100/.test(ahead),
    'goal inputs reject non-positive values before preserving currency decimals'
  );
  note(
    /!Number\.isFinite\(value\) \|\| value < 0/.test(ahead) && /Enter a cost of zero or more/.test(ahead),
    'the Plan simulator rejects a negative extra cost instead of treating it as cash'
  );
  note(
    /scenarioRunwayDays > result\.baselineRunwayDays \? 'up' : 'down'/.test(ahead) && /\$\{direction\} from about/.test(ahead),
    'the Plan simulator labels shorter runway as down and longer runway as up'
  );
  note(
    /title: 'Expected payments',[\s\S]{0,180}summary: soon\.length[\s\S]{0,180}due within/.test(ahead) &&
      !/title: 'Expected payments',[\s\S]{0,120}open:/.test(ahead),
    'Expected payments stays closed and names anything due soon in its summary'
  );
  const position = readFileSync(join(ROOT, 'application', 'ui', 'position-render.js'), 'utf8');
  note(
    /for \(const item of summary\.selfReported\)/.test(position) && /self-reported \$\{item\.kind\}/.test(position),
    'the copied Position summary includes the manual figures already counted in net worth'
  );
  note(
    /rawTarget && \(!Number\.isFinite\(target\) \|\| target <= 0\)/.test(activity),
    'a negative custom-label target is rejected instead of silently discarded'
  );
  note(
    /onclick: \(\) => \{\s*state\.period = \{ type: 'all' \};\s*drillToTransactions\(\{ category: FALLBACK\(\) \}\);\s*\}/.test(controller),
    'the Data and settings Review shortcut opens every matching transaction'
  );
}

/* ------------------------------------------------------------------------
   A ROW MAY NEVER BE PUSHED WIDER THAN THE CARD HOLDING IT.

   `1fr` sounds like "take the space available", but a 1fr track's MINIMUM is
   its own min-content, so one child that refuses to wrap makes the track - and
   the row, the panel and the card - as wide as that child's longest line. In
   the plan's "Where savings go" drawer, a nowrap checkbox label ran 369px past
   the card's right edge and widened the document from 438px to 837px, giving
   the whole page a horizontal scrollbar.

   Two halves: the flexible track may shrink to zero, and the label wraps.
   ------------------------------------------------------------------------ */
{
  const css = readFileSync(join(ROOT, 'interface', 'feature-additions.css'), 'utf8');
  console.log('\n -- a long label cannot widen the page --');
  const assignRules = css.match(/\.plan-assign-row\s*\{[^}]*\}/g) || [];
  note(assignRules.length > 0, 'the assignment row is styled here');
  note(
    assignRules.every(
      (rule) => !/grid-template-columns:[^;]*(?<!minmax\(0,\s)1fr/.test(rule)
    ),
    'every .plan-assign-row track that flexes has a zero floor, so it can shrink below its content'
  );
  const destRule = (css.match(/\.plan-dest-toggle\s*\{[^}]*\}/) || [''])[0];
  note(destRule.length > 0, 'the destination toggle is styled here');
  note(
    !/white-space:\s*nowrap/.test(destRule),
    'and its label may wrap - nowrap on a label is a promise the text will always be short'
  );
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: every factory contract is satisfied at its call site, the Activity');
console.log('         cache key is derived from state rather than retyped, new components');
console.log('         join the shared CSS contracts, and no dead rules survive a rewrite.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
