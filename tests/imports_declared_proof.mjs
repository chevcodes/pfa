/* A name used but never imported is invisible until it is CALLED.
 *
 * position.js used rowBalance() while an import-rewriting edit had quietly
 * dropped it from the import list. Every module still imported cleanly - a
 * ReferenceError only fires at call time - so the whole suite passed while the
 * live app showed "The app could not start". Nothing in the tests reached that
 * line, and nothing could have.
 *
 * This closes that gap statically: every shared helper a module CALLS must be
 * imported there, declared locally, destructured from its deps, or taken as a
 * parameter. Cheap, and it catches the one class of mistake that survives both
 * an import smoke-test and a green suite.
 */
// Every name a module uses from shared-helpers must actually be imported there.
// A missing import is invisible to `import()` (ReferenceError fires at CALL
// time), so the suite passed while the app could not start.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const helpers = readFileSync(join(ROOT,'application/core/shared-helpers.js'),'utf8');
const exported = new Set([...helpers.matchAll(/export (?:function|const) ([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
const dirs=['application/analysis','application/ui','application/output','application/statements'];
const offenders=[];
for (const d of dirs) {
  for (const f of readdirSync(join(ROOT,d)).filter(x=>x.endsWith('.js'))) {
    const p=join(ROOT,d,f);
    const src=readFileSync(p,'utf8');
    if (p.endsWith('shared-helpers.js')) continue;
    const imports=new Set();
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*shared-helpers\.js['"]/g))
      m[1].split(',').forEach(n=>{const t=n.trim().split(/\s+as\s+/)[0].trim(); if(t) imports.add(t);});
    // also treat locally declared names as satisfied
    const localDecl=new Set([...src.matchAll(/(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
    // Names that arrive by destructuring (ctx, deps, options) are satisfied too.
    for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g))
      m[1].split(',').forEach(n=>{const t=n.trim().split(/[:=]/)[0].trim(); if(t) localDecl.add(t);});
    // Names that arrive as function PARAMETERS are satisfied too - several
    // analysis modules take `money` as an injected formatter rather than
    // importing one, which is how they stay pure.
    // A bare `name,` on its own line is a destructured member (these files
    // destructure large deps/ctx objects across many lines).
    for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*),\s*$/gm)) localDecl.add(m[1]);
    for (const m of src.matchAll(/function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g))
      m[1].split(',').forEach(n=>{const t=n.trim().split(/[:=]/)[0].replace(/[{}]/g,'').trim(); if(t) localDecl.add(t);});
    for (const name of exported) {
      if (imports.has(name) || localDecl.has(name)) continue;
      const used=new RegExp(`(?<![\\w$.'"\`])${name}\\s*\\(`).test(src);
      if (used) offenders.push(`${d}/${f}: uses ${name}() without importing it`);
    }
  }
}
console.log(offenders.length ? offenders.join('\n') : 'clean: every shared helper used is imported');
process.exit(offenders.length?1:0);
