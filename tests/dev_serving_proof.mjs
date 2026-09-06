import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isLocalDevHost, LOCAL_DEV_HOSTS } from '../application/core/shared-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
console.log(' DEV SERVING - an edit is never served stale');
console.log('='.repeat(72));

console.log('\n -- a dev host is the whole local family, not four literal names --');
for (const h of ['localhost', '127.0.0.1', '127.0.1.1', '::1', '0.0.0.0']) {
  note(isLocalDevHost(h), `${h} is a dev host`);
}
// These are where the app is served when testing on a phone, or over Bonjour.
// The old four-name list called every one of them production, so the service
// worker registered and cached, and edits stopped appearing.
for (const h of ['192.168.1.14', '10.0.0.7', '172.16.4.2', '172.31.255.1', '169.254.1.1', 'mymac.local', 'app.localhost']) {
  note(isLocalDevHost(h), `${h} is recognised as local (the old list missed it)`);
  note(!LOCAL_DEV_HOSTS.includes(h), `  ...and it genuinely was missing from the literal list`);
}

console.log('\n -- but a real host is still a real host --');
for (const h of ['example.com', 'myapp.netlify.app', '172.32.0.1', '8.8.8.8', '']) {
  note(!isLocalDevHost(h), `${h || '(empty)'} is NOT treated as local`);
}
note(!isLocalDevHost('1localhost.evil.com'), 'a hostname merely CONTAINING localhost is not local');
note(!isLocalDevHost('notmymac.localhost.evil.com'), 'nor one that only ends in a lookalike');

console.log('\n -- the dev server forbids caching outright --');
const serve = readFileSync(join(ROOT, 'developer-tools', 'serve.js'), 'utf8');
note(/Cache-Control': 'no-store/.test(serve), 'every response carries no-store');
note(/Pragma: 'no-cache'/.test(serve), 'and the legacy header for older intermediaries');
note(/Expires: '0'/.test(serve), 'and an already-expired Expires');

console.log('\n -- tearing down a leftover worker actually tears it down --');
const controller = readFileSync(join(ROOT, 'application', 'app-controller.js'), 'utf8');
const block = controller.slice(controller.indexOf('const isLocalDev ='), controller.indexOf('const isLocalDev =') + 1800);
note(/isLocalDevHost\(location\.hostname\)/.test(block), 'the whole local family skips registration');
note(/r\.unregister\(\)/.test(block), 'a leftover registration is removed');
note(/caches\.delete\(k\)/.test(block), 'and what it had already cached is evicted - unregister alone leaves it');
note(/location\.reload\(\)/.test(block), 'and a page that WAS worker-controlled reloads onto the network');
note(/sessionStorage/.test(block), 'guarded by sessionStorage, so it can never become a reload loop');
note(
  block.indexOf('sessionStorage.setItem') < block.indexOf('location.reload()'),
  'the guard is set BEFORE the reload, so the second pass cannot re-enter'
);

console.log('\n -- and production still gets the full offline worker --');
note(/navigator\.serviceWorker\.register\(swUrl/.test(controller), 'a non-local host still registers');
note(/scriptURL !== swUrl/.test(controller), 'and a worker from an old location is still replaced');

console.log(`\n checks: ${pass} passed, ${fail} failed`);
console.log('='.repeat(72));
console.log(' RESULT: the service worker is skipped on every host the app is actually');
console.log('         developed on, a leftover worker is fully evicted rather than just');
console.log('         deregistered, and the dev server forbids caching outright.');
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);
