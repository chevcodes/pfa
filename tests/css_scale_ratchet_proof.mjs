import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanCssText, scanRepository } from '../developer-tools/css-scan.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'tests', 'css-scale-baseline.json');
const result = scanRepository(ROOT);
const scratch = scanCssText('/* .x { padding: 10px; } */\n.x { padding: 10px; }', 'scratch.css');
assert.equal(scratch.metrics.offScaleSpacing, 1);
assert.equal(scratch.findings[0].line, 2);

if (process.argv.includes('--write-baseline')) {
  const signatures = {};
  for (const entry of result.findings) {
    signatures[entry.file] ||= {};
    signatures[entry.file][entry.metric] ||= [];
    signatures[entry.file][entry.metric].push([entry.selector, entry.property, entry.value]);
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ files: result.files, totals: result.totals, signatures }, null, 2)}\n`);
  console.log(`Wrote ${BASELINE_PATH}`);
  console.log(JSON.stringify(result.totals, null, 2));
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const errors = [];
const fileNames = new Set([...Object.keys(baseline.files), ...Object.keys(result.files)]);
const metrics = Object.keys(result.totals);
for (const file of fileNames) {
  const before = baseline.files[file] || {};
  const after = result.files[file] || {};
  for (const metric of metrics) {
    const oldCount = before[metric] || 0;
    const newCount = after[metric] || 0;
    if (newCount > oldCount) {
      const oldFindings = new Map();
      for (const signature of baseline.signatures?.[file]?.[metric] || []) {
        const key = JSON.stringify(signature);
        oldFindings.set(key, (oldFindings.get(key) || 0) + 1);
      }
      const added = result.findings.filter((entry) => entry.file === file && entry.metric === metric).filter((entry) => {
        const key = JSON.stringify([entry.selector, entry.property, entry.value]);
        const remaining = oldFindings.get(key) || 0;
        if (remaining) {
          oldFindings.set(key, remaining - 1);
          return false;
        }
        return true;
      });
      errors.push(`${file}: ${metric} increased from ${oldCount} to ${newCount}${added.length ? `; new lines ${added.map((entry) => `${entry.line} (${entry.property}: ${entry.value})`).join(', ')}` : ''}`);
    } else if (newCount < oldCount) {
      errors.push(`${file}: ${metric} fell from ${oldCount} to ${newCount}; lower the baseline to ${newCount}`);
    }
  }
}
for (const metric of metrics) {
  const oldCount = baseline.totals[metric] || 0;
  const newCount = result.totals[metric] || 0;
  if (newCount > oldCount) errors.push(`total ${metric} increased from ${oldCount} to ${newCount}`);
  else if (newCount < oldCount) errors.push(`total ${metric} fell from ${oldCount} to ${newCount}; lower the baseline to ${newCount}`);
}

console.log(JSON.stringify(result.totals, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('CSS scale ratchet holds.');
}
