/* ===========================================================================
 *  COMMIT CONTRACT - commit fully, render from the commit, then say so.
 *
 *  Five separate bugs in this project have been the same bug, in five places:
 *
 *    1. the Plan editor showing "Not saved yet" beside a "Saved" button;
 *    2. the goal card's description fixed while its buttons kept a stale
 *       wording template;
 *    3. the Plan hero and the Plan editor answering "is this saved?" from two
 *       different facts, one of which did not mean what its label implied;
 *    4. a success toast firing before the saved state had rendered;
 *    5. the Plan wizard announcing success before its committed values were
 *       on screen.
 *
 *  Each was patched where it was found. Five instances is not five accidents:
 *  the ordering was re-derived by hand at every call site, and a hand-written
 *  order is one a later edit can quietly reverse with nothing complaining.
 *
 *  commitAndRender makes the order structural. This file is what stops a sixth
 *  site being written by hand: a toast that announces a committed change, in a
 *  function that writes to the Store, must sit in that contract's `notify`.
 * ======================================================================== */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL ' + l);
    return;
  }
  console.log('   ok   ' + l);
};

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []
  );
const files = walk(join(ROOT, 'application'));
const rel = (f) => f.slice(ROOT.length + 1);

console.log('='.repeat(72));
console.log(' COMMIT CONTRACT - one order, everywhere, by construction');
console.log('='.repeat(72));

console.log('\n -- the contract exists and cannot be called out of order --');
const reversible = readFileSync(join(ROOT, 'application', 'ui', 'reversible.js'), 'utf8');
note(/export async function commitAndRender/.test(reversible), 'commitAndRender is exported');
note(
  /const result = await commit\(\);\s*\n\s*render\(\);\s*\n\s*if \(typeof notify === 'function'\) notify\(result\);/.test(
    reversible
  ),
  'and its body IS the order: await commit, then render, then notify'
);
note(
  /throw new TypeError\('commitAndRender requires commit and render functions'\)/.test(reversible),
  'a caller that omits either half is refused, not silently half-applied'
);

console.log('\n -- no save announcement is sequenced by hand --');
/* A toast that announces a COMMITTED change - "Saved", "Removed", "Cleared" -
 * inside a function that writes to the Store is exactly the shape that drifted
 * five times. It belongs in the contract's notify.
 *
 * Two kinds of toast are deliberately not in scope, and are listed here rather
 * than matched loosely, so the exemption is a decision on record:
 *   - file downloads ("Saved N transactions as CSV") describe a file leaving
 *     the app, not app state, and involve no render to order against;
 *   - refusals ("That category is in use") announce that nothing happened.
 */
const COMMIT_WORDS =
  /toast\(\s*[`'"][^`'"]*\b(saved|Saved|added|Added|removed|Removed|cleared|Cleared|updated|Updated|applied|Applied)\b/;
const ALLOWED = new Map([
  [
    'application/output/data-export.js',
    'CSV downloads: a file was written, not app state - there is no render to order against',
  ],
  [
    'application/app-controller.js',
    're-applying rules recomputes caches in place; audited to render before it announces',
  ],
  [
    'application/ui/ahead-render.js',
    'clearGoal() commits and renders internally, then resolves; the toast is chained on that promise',
  ],
  [
    'application/ui/app-intake.js',
    'sample-data teardown reloads the whole workspace afterwards, not a single render',
  ],
]);

const offenders = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!/Store\./.test(src)) continue;
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!COMMIT_WORDS.test(line)) return;
    // Inside the contract? Either written as `notify:` on this line, or the
    // line above hands the toast to notify.
    const inNotify = /notify:/.test(line) || /notify:\s*(\(\w*\)\s*=>)?\s*$/.test(lines[i - 1] || '');
    if (inNotify) return;
    if (ALLOWED.has(rel(file))) return;
    offenders.push(`${rel(file)}:${i + 1}  ${line.trim().slice(0, 70)}`);
  });
}
note(
  offenders.length === 0,
  `every save announcement is the contract's notify${offenders.length ? '\n        OUTSIDE THE CONTRACT:\n        ' + offenders.join('\n        ') : ''}`
);

console.log('\n -- the sites that drifted are the ones now held by it --');
const planRender = readFileSync(join(ROOT, 'application', 'ui', 'plan-render.js'), 'utf8');
const wizard = readFileSync(join(ROOT, 'application', 'ui', 'plan-wizard.js'), 'utf8');
note(
  /notify: \(\) => toast\(`Plan saved/.test(planRender),
  'instance 4: the plan-saved toast is a notify, not a statement after the write'
);
note(
  /commitAndRender\(\{ commit: persistDraft, render \}\)/.test(wizard),
  'instance 5: the wizard stores each answer through the contract before repainting'
);
note(
  (reversible.match(/notify/g) || []).length >= 6,
  'and the undo mechanism announces through it too, on both the do and the undo path'
);

console.log('\n -- the exemptions are named, not implied --');
for (const [file, why] of ALLOWED) {
  note(files.some((f) => rel(f) === file), `${file} still exists to be exempted (${why.slice(0, 48)}...)`);
}

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: the commit-then-render-then-announce order is a function, not a');
console.log('         convention, and a save announcement written outside it fails here.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
