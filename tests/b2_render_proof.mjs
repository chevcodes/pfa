import { makeRenderIntentions } from '../application/ui/intentions-section.js';
import {
  resolveIntention,
  paceForMonth,
  buildPaceModel,
  makeIntention,
} from '../application/analysis/category-intentions.js';

let pass = 0,
  fail = 0;
const note = (c, l) => {
  if (c) pass++;
  else {
    fail++;
    console.log('   FAIL', l);
  }
};
// DOM mock
function mk(t) {
  return {
    tag: t,
    attrs: {},
    kids: [],
    text: '',
    get childElementCount() {
      return this.kids.filter((k) => k.tag && k.tag !== '#text').length;
    },
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
    addEventListener() {},
    set onclick(f) {
      this.attrs.onclick = f;
    },
    get onclick() {
      return this.attrs.onclick;
    },
    append(...m) {
      for (const x of m.flat()) {
        if (x == null || x === false) continue;
        if (typeof x === 'object' && x.tag) this.kids.push(x);
        else
          this.kids.push({
            tag: '#text',
            text: String(x),
            kids: [],
            attrs: {},
          });
      }
      return this;
    },
  };
}
function el(t, a = {}, ...k) {
  const n = mk(t);
  n.attrs = a || {};
  n.append(...k);
  return n;
}
const icon = () => mk('svg');
function walk(n, f) {
  f(n);
  for (const k of n.kids) walk(k, f);
}
function findAll(r, p) {
  const o = [];
  walk(r, (n) => {
    if (p(n)) o.push(n);
  });
  return o;
}
function allText(n) {
  let t = n.text || '';
  for (const k of n.kids) t += ' ' + allText(k);
  return t.replace(/\s+/g, ' ').trim();
}
function _hasClass(n, c) {
  return String(n.attrs.class || '')
    .split(/\s+/)
    .includes(c);
}

// in-memory categoryIntentions store (idStore semantics)
function makeStore() {
  const map = new Map();
  return {
    async put(r) {
      map.set(r.id, r);
    },
    async all() {
      return [...map.values()];
    },
    async delete(id) {
      map.delete(id);
    },
  };
}

const cfg = {
  currency: { code: 'JMD' },
  ahead: {},
  categories: [{ name: 'Groceries' }, { name: 'Dining' }, { name: 'Transport' }],
};
const store = makeStore();
const state = { cfg, categoryIntentions: [] };
// proven-models stub using the REAL resolver (so intentionFor/paceFor read the real thing)
const provenModels = {
  intentionFor: (category, month) => resolveIntention(state.categoryIntentions, category, month),
  paceFor: (category, month, spendSoFar, asOfDay) => {
    const it = resolveIntention(state.categoryIntentions, category, month);
    if (!it) return null;
    return buildPaceModel(
      paceForMonth({
        intention: it,
        targetMonth: month,
        spendSoFar,
        asOfDay,
        cfg,
      }),
      cfg
    );
  },
};
let renderCalls = 0;
let authoredAt = Date.UTC(2026, 6, 1);
const deps = {
  state,
  el,
  icon,
  provenModels,
  resolved: () => ({ from: '2026-07', to: '2026-07' }),
  trackUsage: () => {},
  Store: { categoryIntentions: store },
  render: () => {
    renderCalls++;
  },
  makeIntention: (spec) => makeIntention({ ...spec, now: new Date(authoredAt++).toISOString() }),
  categorySpend: () => 30000,
  iconRepeat: () => '',
  iconFlag: () => '',
  iconInfo: () => '',
  toast: () => {},
  // The real reversible (ui/reversible.js) wraps every store write so it can be
  // undone. This stub performs the SAME writes and reloads, so the proof still
  // exercises the real save/remove paths - it just does not render a toast.
  reversible: {
    async addRecord({ store: st, record, reload, track }) {
      await st.put(record);
      if (reload) await reload();
      deps.render();
      if (track) track();
    },
    async removeRecords({ store: st, records, reload, track }) {
      for (const r of records || []) await st.delete(r.id);
      if (reload) await reload();
      deps.render();
      if (track) track();
    },
  },
};
const renderIntentions = makeRenderIntentions(deps);

console.log('='.repeat(72));
console.log(' B2 RENDER PROOF - card always renders, row carries id, save/remove wire');
console.log('='.repeat(72));

await (async () => {
  // 1) with NO intentions, the card STILL renders with an add form (the way in)
  let card = renderIntentions();
  note(!!card, 'card renders even with zero intentions');
  note(
    findAll(card, (n) => n.tag === 'button' && allText(n) === 'Set limit').length === 1 &&
      findAll(card, (n) => n.tag === 'input' && n.attrs.placeholder === 'Monthly limit').length === 1,
    'shows the monthly-limit controls when none exist'
  );
  note(!/Set a monthly limit for a category/.test(allText(card)), 'does not narrate the visible form');
  const catSel = findAll(card, (n) => n.tag === 'select')[0];
  note(
    catSel && catSel.kids.filter((k) => k.tag === 'option').length === 3,
    'category dropdown populated from cfg.categories'
  );

  // 2) author a ceiling via the form's save handler, wired through the store
  const addBtn = findAll(card, (n) => n.tag === 'button' && /Set limit/.test(allText(n)))[0];
  // set the select value + amount input, then invoke onclick
  const amtInput = findAll(card, (n) => n.tag === 'input')[0];
  catSel.value = 'Groceries';
  amtInput.value = '30000';
  await addBtn.attrs.onclick();
  note((await store.all()).length === 1, 'save wrote one intention to the store');
  note(
    state.categoryIntentions.length === 1 && state.categoryIntentions[0].category === 'Groceries',
    'state re-read from store after save'
  );
  note(
    state.categoryIntentions[0].kind === 'repeating' &&
      state.categoryIntentions[0].effectiveFrom === '2026-07',
    'saved record is repeating, effective this month'
  );
  note(renderCalls >= 1, 'save triggered a re-render');

  // 3) re-render: now a pace ROW appears AND carries the governing id (B1 seam)
  card = renderIntentions();
  const removeBtn = findAll(card, (n) => n.tag === 'button' && allText(n) === 'Remove')[0];
  note(!!removeBtn, 'a Remove button now appears for the ceiling');
  note(
    removeBtn.attrs['data-id'] && String(removeBtn.attrs['data-id']).startsWith('int_'),
    'Remove row carries the governing record id (NOT undefined) - the B1 seam pre-empted'
  );
  note(
    /within your limit/.test(allText(card)),
    'pace names the relationship to the limit (30k spend == 30k ceiling: at it, not over it)'
  );

  // 4) EDIT via the form (same category, new amount) -> new record, resolver picks new
  //    (simulate a later authoring time so the tiebreak is monotonic)
  const before = (await store.all()).length;
  amtInput.value = '50000';
  await addBtn.attrs.onclick();
  note(
    (await store.all()).length === before + 1,
    'edit created a NEW record (never mutated the old)'
  );
  const gov = provenModels.intentionFor('Groceries', '2026-07');
  note(gov.amount === 50000, 'resolver now returns the edited 50k ceiling for this month');

  // 5) REMOVE clears the category entirely
  card = renderIntentions();
  const rm = findAll(card, (n) => n.tag === 'button' && allText(n) === 'Remove')[0];
  await rm.attrs.onclick();
  note((await store.all()).length === 0, 'remove cleared ALL records for the category');
  note(
    provenModels.intentionFor('Groceries', '2026-07') === null,
    'resolver returns null after remove'
  );
  card = renderIntentions();
  note(
    findAll(card, (n) => n.tag === 'button' && allText(n) === 'Set limit').length === 1,
    'card falls back to the empty limit form'
  );

  console.log(`\n checks: ${pass} passed, ${fail} failed`);
  console.log('='.repeat(72));
  process.exit(fail ? 1 : 0);
})();
