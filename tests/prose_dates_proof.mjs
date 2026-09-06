import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { displayText, formatDisplayDate, MONTHS_SHORT } from '../application/core/shared-helpers.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
let pass = 0;
let fail = 0;
const note = (condition, label) => {
  if (condition) pass++;
  else {
    fail++;
    console.log('   FAIL', label);
  }
};

console.log('='.repeat(72));
console.log(' PROSE DATES - a displayed date never splits across lines');
console.log('='.repeat(72));

const doc = {
  createTextNode: (text) => ({ kind: 'text', text }),
  createElement: (tag) => {
    const node = { kind: tag, className: '', kids: [] };
    node.append = (kid) => node.kids.push(kid);
    Object.defineProperty(node, 'textContent', {
      get: () => node.kids.map((kid) => (kid.kind === 'text' ? kid.text : kid.textContent)).join(''),
      set: (text) => {
        node.kids = [{ kind: 'text', text }];
      },
    });
    return node;
  },
};
const shown = (node) => (node.kind === 'text' ? node.text : node.textContent);
const heldDates = (node) =>
  node.kind === 'text' ? [] : node.kids.filter((kid) => kid.kind === 'span' && kid.className === 'nowrap').map((kid) => kid.textContent);

const header = 'Since your bank statement ending 05-Jul-26 and your card statement ending 15-Jul-26';
const headerNode = displayText(header, doc);
note(shown(headerNode) === header, 'the words on screen are exactly the words built');
note(heldDates(headerNode).join('|') === '05-Jul-26|15-Jul-26', 'every date in a headline is held together');
note(
  headerNode.kind === 'span' && headerNode.className === '',
  'a string with dates stays ONE node, so a flex or grid parent still lays it out as one item'
);

const cause = 'A chain store charge of $22k on 06-Jul-26 is larger than usual for that place.';
const causeNode = displayText(cause, doc);
note(
  causeNode.kids.length === 3 && heldDates(causeNode)[0] === '06-Jul-26' && shown(causeNode) === cause,
  'a date inside a cause sentence is held together and the sentence around it is untouched'
);

const plain = displayText('Nothing needs a decision right now.', doc);
note(plain.kind === 'text' && plain.text === 'Nothing needs a decision right now.', 'a sentence without a date is a plain text node, as before');
note(displayText('', doc).kind === 'text' && displayText('', doc).text === '', 'an empty string stays one empty text node');

note(
  MONTHS_SHORT.every((month, i) => {
    const date = formatDisplayDate(`2026-${String(i + 1).padStart(2, '0')}-09`);
    return heldDates(displayText(`on ${date}.`, doc)).join() === date;
  }),
  'every month the formatter can print is recognised'
);
note(displayText('ref 105-Jul-26 and 05-JUL-26', doc).kind === 'text', 'text that is not a formatted display date is left alone');

const helpers = read('application', 'core', 'shared-helpers.js');
note(
  /MONTHS_SHORT\.join\('\|'\)/.test(helpers) && !/Jan\|Feb/.test(helpers),
  'the date pattern is derived from the formatter’s own month names, not retyped'
);
note(formatDisplayDate('2026-07-05') === '05-Jul-26', 'the formatter itself still returns plain hyphens for every other use');

const controller = read('application', 'app-controller.js');
const factory = /const el = \(tag, attrs = \{\}, \.\.\.kids\) => \{([\s\S]*?)\n {2}\};/.exec(controller);
note(!!factory && /displayText\(kid\)/.test(factory[1]), 'the app’s one element factory routes every string child through the shared rule');
note(
  !!factory && /\^\(OPTION\|TEXTAREA\)\$/.test(factory[1]),
  'option and textarea text stays a plain text node, where an inner element would be dropped'
);
note(
  /\.nowrap \{\s*white-space: nowrap;\s*\}/.test(read('interface', 'dashboard.css')),
  'the existing .nowrap utility is what holds a date together'
);

const uiDir = join(root, 'application', 'ui');
const offenders = [];
for (const file of readdirSync(uiDir).filter((name) => name.endsWith('.js'))) {
  const src = read('application', 'ui', file);
  const held = [...src.matchAll(/(?:const|let)\s+(\w+)\s*=[^;]*?formatDisplayDate\(/g)].map((m) => m[1]);
  for (const m of src.matchAll(/\.(?:textContent|innerText|innerHTML)\s*=([^;]*);/g)) {
    const expr = m[1];
    if (/formatDisplayDate\(/.test(expr) || held.some((name) => new RegExp(`\\b${name}\\b`).test(expr)))
      offenders.push(file);
  }
}
note(offenders.length === 0, `no screen writes a formatted date around the shared rule${offenders.length ? ` (${offenders.join(', ')})` : ''}`);
note(
  /savedNote\.replaceChildren\(\s*displayText\(/.test(read('application', 'ui', 'plan-render.js')),
  'the plan’s saved note uses the shared rule'
);

const dashboard = read('interface', 'dashboard.css');
const subrow = /\.foreign-subrow \{([^}]*)\}/.exec(dashboard);
const subrowRight = /\.foreign-subrow-right \{([^}]*)\}/.exec(dashboard);
note(
  !!subrow && /flex-wrap: wrap/.test(subrow[1]) && !!subrowRight && /margin-left: auto/.test(subrowRight[1]),
  'a foreign-spend row lets its figures drop below a whole date instead of squeezing the date onto three lines'
);

const exportsDir = join(root, 'application', 'output');
const exportSources = [
  ...readdirSync(exportsDir).filter((name) => name.endsWith('.js')).map((name) => read('application', 'output', name)),
  read('application', 'analysis', 'reporting-print.js'),
];
note(
  exportSources.every((src) => !/displayText\b/.test(src)),
  'print, CSV and copy output never pass through the screen-only rule'
);

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
