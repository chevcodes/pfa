import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function sources(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'react-dist' ? [] : sources(path);
    return /\.(js|jsx)$/.test(entry.name) ? [path] : [];
  });
}

test('explanation glyphs are reserved for interactive explanations', () => {
  for (const file of [...sources('application/ui'), ...sources('application/analysis'), ...sources('react-ui/components')]) {
    if (file.endsWith('pfa-info-popover.jsx')) continue;
    const source = readFileSync(join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /<Info\b|icon:\s*iconInfo\b|iconInfo\(\)/, file);
  }
  const plan = readFileSync(join(ROOT, 'application/ui/ahead-render.js'), 'utf8');
  assert.doesNotMatch(plan, /iconGap\b/, 'Plan cards use topic glyphs');
});
