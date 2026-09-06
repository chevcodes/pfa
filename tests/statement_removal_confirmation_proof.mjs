import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dialog = readFileSync(join(root, 'react-ui', 'components', 'pfa-manage-data-dialog.jsx'), 'utf8');
const manager = readFileSync(join(root, 'application', 'ui', 'manage-data.js'), 'utf8');
let pass = 0;
let fail = 0;
const note = (condition, label) => {
  if (condition) pass++;
  else {
    fail++;
    console.log('   FAIL', label);
  }
};

note(
  /onClick=\{\(\) => \{ setRestoreFocusKey\(null\); setPendingRemovalKey\(row\.key\); \}\}/.test(dialog),
  'the first removal action only opens an in-context confirmation'
);
note(
  /onClick=\{row\.onRemove\}/.test(dialog) && /className="stmt-remove-confirm" role="group"/.test(dialog),
  'the destructive handler is only reachable from the labelled confirmation group'
);
note(
  /setRestoreFocusKey\(row\.key\); setPendingRemovalKey\(null\)/.test(dialog) &&
    /removeTriggerRefs\.current\.get\(restoreFocusKey\)\?\.focus\(\)/.test(dialog),
  'cancelling returns keyboard focus to the row action'
);
note(
  /if \(pendingRemovalKey\) confirmButtonRef\.current\?\.focus\(\)/.test(dialog) &&
    /aria-describedby="statement-removal-confirmation"/.test(dialog),
  'the confirmation receives focus and its consequence text is announced with it'
);
note(
  /const statementScope = st\.ledger === 'card'/.test(manager) &&
    /all \$\{st\.statementCount\} account statement period/.test(manager) &&
    /Saved labels, category splits, review decisions, and goal history/.test(manager) &&
    /Re-importing restores statement data, but not these personal changes\./.test(manager),
  'the confirmation explains irreversible statement and transaction consequences'
);
note(
  /cardPeriodCount = st\.ledger === 'card'/.test(manager) && /card statement period/.test(manager),
  'card file summaries count the underlying statement periods'
);
note(
  /confirmationMessage: 'This removes the investment statement and its holdings/.test(manager),
  'investment statement removal has its own accurate explanation'
);

console.log(` checks: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
