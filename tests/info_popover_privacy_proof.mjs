import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const component = read('react-ui', 'components', 'pfa-info-popover.jsx');
const styles = read('react-ui', 'styles', 'pfa-info-popover.css');
const premium = read('interface', 'premium.css');
const checks = [];
const note = (condition, label) => checks.push({ condition, label });

note(/document\.documentElement\.dataset\.privacy\s*===\s*'on'/.test(component), 'the popover reads the app privacy state when it renders');
note(/Show figures to read this explanation\./.test(component), 'private view substitutes a generic, useful explanation notice');
note(/privacyNotice\s*\?[^:]*Show figures to read this explanation\.[\s\S]*?:\s*content/.test(component), 'private view never renders the original detail content');
note(/className=\{[^}]*pfa-info-privacy-notice/.test(component), 'the safe notice has a distinct class for its privacy exception');
note(/html\[data-privacy='on'\]\s+\.chart-info-body\.pfa-info-privacy-notice\[data-state='open'\]\s*\{[^}]*display:\s*block\s*!important/s.test(styles), 'only an open safe notice remains visible in private view');
note(/--t-body:\s*0\.8125rem/.test(premium) && /\.chart-info-body\[data-state='open'\]\s*\{[^}]*font-size:\s*var\(--t-body\)/s.test(styles), 'help text follows the shared supporting-text size');

for (const { condition, label } of checks) {
  if (!condition) console.log('FAIL', label);
}

console.log(`checks: ${checks.filter((check) => check.condition).length} passed, ${checks.filter((check) => !check.condition).length} failed`);
process.exit(checks.every((check) => check.condition) ? 0 : 1);
