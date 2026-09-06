import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const application = join(root, 'application');
const files = [];
const collect = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (path.endsWith('.js')) files.push(path);
  }
};
collect(application);

const graph = new Map(files.map((path) => [path, []]));
const missing = [];
const importPattern = /(?:import|export)\s+(?:[^"'\n]*?\s+from\s+)?["'](\.[^"']+)["']/g;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    let target = resolve(dirname(file), match[1]);
    if (!extname(target)) target += '.js';
    if (!existsSync(target)) missing.push(`${relative(root, file)} -> ${match[1]}`);
    else if (graph.has(target)) graph.get(file).push(target);
  }
}

const active = new Set();
const complete = new Set();
const cycles = [];
const visit = (file, path) => {
  if (active.has(file)) {
    const start = path.indexOf(file);
    cycles.push([...path.slice(start), file].map((item) => relative(root, item)).join(' -> '));
    return;
  }
  if (complete.has(file)) return;
  active.add(file);
  path.push(file);
  for (const target of graph.get(file)) visit(target, path);
  path.pop();
  active.delete(file);
  complete.add(file);
};
for (const file of files) visit(file, []);

console.log('='.repeat(72));
console.log(' MODULE GRAPH - every import resolves without circular paths');
console.log('='.repeat(72));
console.log(` modules: ${files.length}`);
console.log(` missing imports: ${missing.length}`);
console.log(` circular paths: ${cycles.length}`);
for (const item of missing) console.log('   MISSING', item);
for (const item of cycles) console.log('   CYCLE', item);
console.log('='.repeat(72));
process.exit(missing.length || cycles.length ? 1 : 0);
