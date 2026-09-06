import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('both combined CSV shapes carry bank category labels', () => {
  const text = source('application/output/data-export.js');
  const check = (value) => assert.equal((value.match(/r\.category \|\| '',\n\s*'',/g) || []).length, 2);
  check(text);
  assert.throws(() => check(text.replace("r.category || '',\n          '',", "'',\n          '',")));
});

test('bank print model and table carry the credit category beside flow', () => {
  const model = source('application/analysis/reporting-print.js');
  const render = source('application/output/report-render.js');
  const checkModel = (value) => assert.match(value, /description: cleanCounterparty\(r\.description\) \|\| r\.type \|\| '-',\n\s*category: r\.category \|\| '-',\n\s*flow:/);
  const checkRender = (value) => assert.match(value, /rp\(doc, 'th', \{\}, 'Counterparty'\),\n\s*rp\(doc, 'th', \{\}, 'Category'\),\n\s*rp\(doc, 'th', \{\}, 'Flow'\)/);
  checkModel(model);
  checkRender(render);
  assert.throws(() => checkModel(model.replace("category: r.category || '-',", "category: '-',")));
  assert.throws(() => checkRender(render.replace("rp(doc, 'th', {}, 'Category'),\n          rp(doc, 'th', {}, 'Flow')", "rp(doc, 'th', {}, 'Flow')")));
});
