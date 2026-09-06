/*
 * category-picker.js  -  the reversible category-correction group.
 *
 * Stage 3a of the split. These three functions were lifted verbatim from
 * bootUI in app.js and wrapped in a factory that receives the bootUI members
 * they use via ctx, rather than closing over them. Nothing inside the bodies
 * was renamed; only where a name comes from changed. Two sanctioned line edits
 * replace the private pickerEl access, mirroring Stage 2: openCategoryPicker
 * now calls openOverlay(overlay) to show its modal, and setCategory reads the
 * live overlay through getPickerEl() instead of the bare pickerEl variable.
 *
 * setCategory stays internal (only openCategoryPicker calls it); the factory
 * returns openCategoryPicker and openTagPicker, the names app.js still calls
 * from txTable. Marking something reviewed is an answer about an inference, so
 * it lives with every other answer in ui/confirm-control.js.
 */

import {
  orderCategoriesForPicker,
} from '../analysis/reporting-core.js';
import {
  merchantRuleKeyFromDescription,
  upsertCategoryRule,
  listCategoryRules,
} from '../../settings/category-rules.js';
import { requireCtx, selectOnFocus, transactionName } from '../core/shared-helpers.js';
import { transactionIdentity } from '../statements/read-statements.js';
import { bankRuleMatch } from '../analysis/bank-categorise.js';
import { Store } from '../core/storage.js';
import { makeSplit, validateSplit, balanceParts } from '../analysis/transaction-splits.js';
import { categoryNameExists } from '../analysis/custom-categories.js';
import { groupForCategory, planGroups, resolveGroupMap } from '../analysis/plan.js';
import { spendableCategoryNames } from '../analysis/spendable-categories.js';
import { tagAdd, tagRemove } from '../analysis/tag-totals.js';
import { makeMoney } from '../core/money-format.js';
import { commitAndRender } from './reversible.js';

export function createCategoryPicker(ctx) {
  requireCtx(
    ctx,
    [
      'state',
      'el',
      '$',
      'toast',
      'render',
      'closePicker',
      'openModal',
      'getPickerEl',
      'persist',
      'persistRules',
      'catColour',
      'isReview',
      'trackUsage',
      'confirmSections',
      'openRulesSection',
      'createTag',
      'createCategory',
      'setCategoryBand',
      'classifiedBank',
      'dropCategoryRule',
    ],
    'createCategoryPicker'
  );
  const {
    state,
    el,
    $,
    toast,
    render,
    closePicker,
    openModal,
    getPickerEl,
    persist,
    persistRules,
    catColour,
    isReview,
    trackUsage,
    confirmSections,
    openRulesSection,
    createTag,
    createCategory,
    setCategoryBand,
    classifiedBank,
    dropCategoryRule,
  } = ctx;

  // Categorised bank rows, for ordering only - never for a total.
  const bankRowsForOrdering = () => classifiedBank() || [];

  /* ONE door for "how is this transaction treated". The category tag on a row
   * is the control a person already reaches for to change that, so every
   * answer about this transaction is behind it rather than beside it.
   *
   * A bank row has no category to choose - its category comes from the rules
   * engine, which is stated here rather than left to be discovered - but it
   * does have the answers that move its figures, so the same tag now opens
   * this dialog on both ledgers instead of being inert on one of them. */

  /* WHERE THIS CATEGORY COUNTS, said and changed where the category is met.
   *
   * Whether a payment is a fixed expense is a fact about its category, and the
   * Plan holds it: every category sits in Fixed expenses, Savings &
   * investments or Discretionary spending, and what counts as committed is
   * read straight from that placement on both ledgers. But the placement could
   * only be seen or changed in two places - the Plan's own categories drawer,
   * and the moment a brand-new category was invented in Data & settings. So
   * filing a transfer as Rent told a person nothing about whether Rent is
   * treated as an obligation, and there was no way to say so from here.
   *
   * One line, the Plan's own words for the three bands and the Plan's own
   * select, writing the Plan's own store - not a second answer beside the one
   * that already exists. Deliberately NOT offered per transaction: the band is
   * true of the category, so a per-row version would be a second answer to the
   * same question with no rule for which wins.
   *
   * Custom labels are deliberately left out of this. A transaction can carry
   * several labels at once, so a band on a label has no defined answer the
   * moment two of them disagree - the exact "one number, two sources" shape
   * the category placement exists to avoid. */
  function bandLine(row) {
    const name = row.category;
    if (!name || isReview(name)) return null;
    const groups = planGroups(state.cfg);
    const map = resolveGroupMap(state.cfg, state._planGroups || null);
    const current = groupForCategory(name, map);
    const select = el('select', {
      class: 'plan-assign-select',
      'aria-label': `Where ${name} counts`,
    });
    for (const g of groups) {
      const option = el('option', { value: g.key }, g.label);
      if (g.key === current) option.selected = true;
      select.append(option);
    }
    select.addEventListener('change', () => {
      const picked = groups.find((g) => g.key === select.value);
      closePicker();
      setCategoryBand(name, select.value, picked ? picked.label : select.value);
    });
    return el(
      'div',
      { class: 'confirm-line' },
      el('span', { class: 'confirm-line-label' }, `${name} counts toward`),
      el('span', { class: 'confirm-pair' }, select)
    );
  }

  /* THE way out of "No matching category."
   *
   * Filing a transaction is the moment a missing category becomes visible, and
   * the only way to make one lived on another tab, inside Data & settings,
   * behind a fold - so the answer was: close this, learn where the app keeps
   * its settings, make the category, find this transaction again, open this
   * again. The picker's own filter is already the control a person types the
   * name into; when nothing matches it, that typed name becomes the offer to
   * make it, through the SAME writer the settings card uses. No second field,
   * no band question - the Plan already asks where a new category counts, and
   * asks it once the category carries real money.
   *
   * `file` is the ledger's own setter, so the card side still honours the
   * scope a person chose and the bank side still writes its rule. */
  function categoryMaker(filter, listEl, file) {
    const maker = el('button', {
      class: 'picker-item picker-create',
      type: 'button',
      hidden: '',
    });
    const repaint = () => {
      const name = filter.value.replace(/\s+/g, ' ').trim();
      const visible = [...listEl.children].filter((item) => !item.hidden).length;
      const offer = !!name && visible === 0 && !categoryNameExists(name, state.cfg.categories);
      maker.hidden = !offer;
      maker.textContent = offer ? `Make “${name}”` : '';
      return offer;
    };
    maker.addEventListener('click', async () => {
      const name = filter.value.replace(/\s+/g, ' ').trim();
      if (!name) return;
      closePicker();
      const made = await createCategory(name);
      if (made) await file(name);
    });
    return { maker, repaint };
  }

  /* Both pickers write a rule when the choice applies to every transaction
   * like this one, so both offer the way to go and see those rules. */
  function rulesLink() {
    return el(
      'button',
      {
        class: 'btn sm ghost',
        onclick: () => {
          closePicker();
          openRulesSection();
        },
      },
      'Manage rules'
    );
  }

  /* The rule (if any) currently filing THIS row, from the same key the
   * categoriser itself matches on - card side via raw_description, bank side
   * via bankRuleMatch. Reused rather than re-derived so this can never find a
   * rule the categoriser would not have applied. */
  function governingRule(matchText) {
    const key = matchText ? merchantRuleKeyFromDescription(matchText) : '';
    if (!key) return null;
    return (
      listCategoryRules(state.rules, state.brandRules, state.merchants).find(
        (r) => r.key === key
      ) || null
    );
  }

  /* Stopping a rule used to mean closing this dialog, remembering "Data &
   * settings" holds it, and finding it again in a flat list - so a person who
   * could SEE their transaction being auto-filed wrong had no way to act on
   * that from here. dropCategoryRule already exists in full, undo toast
   * included; this only moves it to where the need for it is visible. */
  function stopRuleButton(matchText) {
    const rule = governingRule(matchText);
    if (!rule) return null;
    return el(
      'button',
      {
        class: 'btn sm ghost',
        title: `Stop filing every "${rule.label}" as ${rule.category}`,
        'aria-label': `Remove the rule filing ${rule.label} as ${rule.category}`,
        onclick: () => {
          closePicker();
          dropCategoryRule(rule);
        },
      },
      'Stop rule'
    );
  }

  function openCategoryPicker(row, ledger = 'card') {
    closePicker();
    if (ledger === 'bank') return openBankClassification(row);
    const cats = state.cfg.categories.map((c) => c.name);
    // Categories already present in the current data, most-used first, so the
    // most likely corrections sit near the top (ordering only, no stored state).
    const counts = {};
    for (const r of state.rows) counts[r.category] = (counts[r.category] || 0) + 1;
    const present = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const ordered = orderCategoriesForPicker(cats, row.category, present);
    // Show the SAME canonical clean name the transaction list shows, so the
    // picker title and scope line read "Amazon", not "Www.Amazon* 113-217508".
    // Matching still keys on row.raw_description below, so behaviour is unchanged.
    const place = row.displayName || row.description.split(',')[0].replace(/\s+/g, ' ').trim();
    const list = el('div', { class: 'picker-list' });
    let selectedCategory = null;
    const assign = el('button', { class: 'btn sm primary', type: 'button', disabled: '' }, 'Assign category');
    const chooseCategory = (category) => {
      selectedCategory = category;
      for (const item of list.children) item.classList.toggle('is-selected', item.dataset.category === category);
      assign.disabled = false;
      decision.open = true;
    };
    for (const c of ordered) {
      const label = isReview(c) ? 'To review' : c;
      list.append(
        el(
          'button',
          {
            class: 'picker-item' + (c === row.category ? ' current' : ''),
            dataset: { name: label.toLowerCase(), category: c },
            onclick: () => chooseCategory(c),
          },
          el('span', { class: 'cat-dot', style: `background:${catColour(c)}` }),
          label,
          c === row.category ? el('span', { class: 'muted small' }, ' current') : null
        )
      );
    }
    // Type-to-filter: correcting a category is the most repeated action, and the
    // list is long on a phone. Filtering is case-insensitive on the shown name.
    const noMatch = el(
      'div',
      { class: 'picker-empty muted small', hidden: '' },
      'No matching category.'
    );
    const filter = el('input', {
      type: 'text',
      class: 'picker-filter',
      placeholder: 'Filter or name a category…',
      'aria-label': 'Filter or name a category',
      oninput: (e) => {
        const q = e.target.value.trim().toLowerCase();
        let visible = 0;
        for (const item of list.children) {
          const hit = !q || item.dataset.name.includes(q);
          item.hidden = !hit;
          if (hit) visible++;
        }
        // The offer to make it replaces the dead end rather than sitting
        // beside it, so an empty list still says exactly one thing.
        // Repainted unconditionally: || short-circuits, so a filter that
        // started matching again left a stale "Make ..." offer on screen.
        const offering = repaintMaker();
        noMatch.hidden = visible > 0 || offering;
      },
    });
    // The scope a person chose is read from the live dialog, and making a
    // category re-renders the app - so it is captured before that and handed
    // to the setter, rather than looked up once the radios have gone.
    const { maker, repaint: repaintMaker } = categoryMaker(filter, list, (name) =>
      setCategory(row, name, { applyAll: scopeIsAll() })
    );
    const scopeOnly = el(
      'label',
      { class: 'scope' },
      el('input', { type: 'radio', name: 'scope', value: 'one', checked: '' }),
      ' Only this transaction'
    );
    const scopeAll = el(
      'label',
      { class: 'scope' },
      el('input', { type: 'radio', name: 'scope', value: 'all' }),
      ` Every “${place}” charge, now and in future`
    );
    const scopeIsAll = () => {
      const picked = scopeAll.querySelector('input');
      return !!(picked && picked.checked);
    };
    const decision = el('details', { class: 'disclosure picker-decision' });
    decision.append(el('summary', {}, 'Apply to this transaction'));
    decision.append(
      el('div', { class: 'disclosure-body picker-decision-body' }, el('div', { class: 'picker-scope' }, scopeOnly, scopeAll), bandLine(row))
    );
    const moreOptions = el('details', { class: 'disclosure picker-more' });
    moreOptions.append(el('summary', {}, 'More options'));
    moreOptions.append(
      el(
        'div',
        { class: 'disclosure-body picker-more-body' },
        row.kind === 'spend'
          ? el(
              'button',
              { class: 'btn sm ghost', onclick: () => openSplitEditor(row) },
              'Split across categories'
            )
          : null,
        stopRuleButton(row.raw_description),
        rulesLink()
      )
    );
    const box = el(
      'div',
      { class: 'picker', role: 'dialog', 'aria-label': 'Change category' },
      el('div', { class: 'picker-head' }, `File “${place}” as`),
      filter,
      list,
      maker,
      noMatch,
      decision,
      moreOptions,
      el(
        'div',
        { class: 'picker-actions' },
        assign,
        el('button', { class: 'btn sm ghost', onclick: closePicker }, 'Cancel')
      )
    );
    assign.addEventListener('click', () => {
      if (selectedCategory) setCategory(row, selectedCategory, { applyAll: scopeIsAll() });
    });
    openModal(box);
  }

  /* The bank half of the same door. A bank row has no per-row category store -
   * its category is worked out from the rules at render time - so filing one
   * writes the rule, which is why the scope line states it plainly instead of
   * offering a choice that does not exist here. Everything else is identical:
   * the same list, the same filter, the same tap.
   *
   * This is what makes a transfer a first-class transaction. Rent, an
   * allowance, child support and money sent to family are paid this way, and
   * until now they could be given no category at all - so they could never
   * reach the Fixed expenses band, and sat in the figures as unexplained
   * movement. */
  function openBankClassification(row) {
    const place = transactionName(row) || 'this transaction';
    const cats = state.cfg.categories.map((c) => c.name);
    // Counted on the ledger the row is ON. This copied the card picker's
    // ordering verbatim and ranked by CARD frequency, so filing a bank fee was
    // offered Dining, Groceries and Online Shopping first and "Fees & Interest"
    // eighteenth of twenty - the list exists to put the likely answer near the
    // top and was doing the opposite on every bank row.
    const counts = {};
    for (const r of bankRowsForOrdering()) counts[r.category] = (counts[r.category] || 0) + 1;
    const ordered = orderCategoriesForPicker(
      cats,
      row.category,
      Object.keys(counts).sort((a, b) => counts[b] - counts[a])
    );
    const list = el('div', { class: 'picker-list' });
    for (const c of ordered) {
      const label = isReview(c) ? 'To review' : c;
      list.append(
        el(
          'button',
          {
            class: 'picker-item' + (c === row.category ? ' current' : ''),
            dataset: { name: label.toLowerCase() },
            onclick: () => setBankCategory(row, c),
          },
          el('span', { class: 'cat-dot', style: `background:${catColour(c)}` }),
          label,
          c === row.category ? el('span', { class: 'muted small' }, ' current') : null
        )
      );
    }
    const noMatch = el(
      'div',
      { class: 'picker-empty muted small', hidden: '' },
      'No matching category.'
    );
    const filter = el('input', {
      type: 'text',
      class: 'picker-filter',
      placeholder: 'Filter or name a category…',
      'aria-label': 'Filter or name a category',
      oninput: (e) => {
        const q = e.target.value.trim().toLowerCase();
        let visible = 0;
        for (const item of list.children) {
          const hit = !q || item.dataset.name.includes(q);
          item.hidden = !hit;
          if (hit) visible++;
        }
        // Repainted unconditionally: || short-circuits, so a filter that
        // started matching again left a stale "Make ..." offer on screen.
        const offering = repaintMaker();
        noMatch.hidden = visible > 0 || offering;
      },
    });
    // The same dead end sat on this half of the door, and a bank row is where
    // the categories the shipped list has never heard of turn up: school fees,
    // a family transfer, rent paid by standing order.
    const { maker, repaint: repaintMaker } = categoryMaker(filter, list, (name) =>
      setBankCategory(row, name)
    );
    const box = el(
      'div',
      { class: 'picker', role: 'dialog', 'aria-label': 'Change category' },
      el('div', { class: 'picker-head' }, `File “${place}” as`),
      el('p', { class: 'muted small picker-note' }, 'Applies to every transaction like this.'),
      filter,
      list,
      maker,
      noMatch,
      bandLine(row),
      el(
        'div',
        { class: 'picker-actions' },
        stopRuleButton(bankRuleMatch(row)),
        rulesLink(),
        el('button', { class: 'btn sm ghost', onclick: closePicker }, 'Cancel')
      )
    );
    openModal(box);
  }

  /* The rule keys on whatever actually identifies the row - the same expression
   * the bank categoriser reads it back with (bankRuleMatch). Reading
   * row.description here on its own quietly wrote nothing for every row whose
   * identity is its statement TYPE rather than a payee line, which is a tenth
   * of a real bank ledger: interest, withholding tax, government tax, memos.
   *
   * And a rule that cannot be written is never announced as written. cleanRule
   * drops an unusable one silently, so the result is checked rather than
   * assumed - the old code said "Filed every X" over a store it had not
   * changed. */
  async function setBankCategory(row, category) {
    closePicker();
    const place = transactionName(row) || 'this transaction';
    const match = bankRuleMatch(row);
    const before = state.rules.map((r) => ({ ...r }));
    if (!match) {
      toast(`This transaction has nothing to match on, so no rule was written for “${place}”.`);
      return;
    }
    const merged = upsertCategoryRule(state.rules, { match, category }, new Date());
    if (!merged.inserted && !merged.updated) {
      toast(`“${place}” is already filed as ${category}.`);
      return;
    }
    await commitAndRender({
      commit: async () => {
        state.rules = merged.rules;
        await persistRules();
        trackUsage('activity-file-bank-transaction');
      },
      render,
      notify: () =>
        toast(`Filed every “${place}” as ${category}.`, async () => {
          await commitAndRender({
            commit: async () => {
              state.rules = before.map((r) => ({ ...r }));
              await persistRules();
            },
            render,
            notify: () => toast('Put back.'),
          });
        }),
    });
  }

  /* ===========================================================================
   * Split editor (B3b): distribute ONE transaction across categories. Uses the
   * proven primitives (makeSplit / validateSplit / balanceParts) so the parts
   * always sum to the transaction's own amount before saving - an invalid split
   * is refused with a plain message, never silently stored. Only spendable
   * categories are offered (Improvement 3: you can't sensibly file part of a
   * purchase as Card Payment or a fee). Seeds from the current category (least
   * typing) or from an existing split (edit-in-place). "Clear split" reverts to
   * a single category. The split store is the ONLY thing written; the row, its
   * count, and the grand total are untouched by construction.
   * ======================================================================== */
  function openSplitEditor(row) {
    closePicker();
    const target = Math.round(Math.abs(Number(row.amount) || 0) * 100) / 100;
    const place = row.displayName || row.description.split(',')[0].replace(/\s+/g, ' ').trim();
    const spendable = spendableCategoryNames(state.cfg);
    const money = makeMoney(state.cfg);
    const existing = (state.transactionSplits || [])
      .filter((s) => s.txnId === row.id)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];

    let parts =
      existing && existing.parts && existing.parts.length
        ? existing.parts.map((p) => ({
            category: p.category,
            amount: p.amount,
          }))
        : [
            { category: row.category, amount: target },
            { category: '', amount: 0 },
          ];

    const body = el('div', { class: 'picker-list' });
    const remainderLine = el('div', {
      class: 'muted small',
      style: 'padding:6px 0',
    });
    const sumOf = () =>
      Math.round(parts.reduce((s, p) => s + Math.abs(Number(p.amount) || 0), 0) * 100) / 100;
    const syncRemainder = () => {
      const rem = Math.round((target - sumOf()) * 100) / 100;
      remainderLine.textContent =
        rem === 0
          ? `Balanced - the parts add up to ${money(target)}.`
          : `Remainder: ${money(rem)} of ${money(target)} still to allocate.`;
    };
    const redraw = () => {
      body.innerHTML = '';
      parts.forEach((p, i) => {
        const sel = el(
          'select',
          {
            class: 'name-field',
            onchange: (e) => {
              parts[i].category = e.target.value;
            },
          },
          el('option', { value: '' }, '- category -'),
          ...spendable.map((c) =>
            el('option', { value: c, selected: c === p.category ? '' : null }, c)
          )
        );
        const amt = el('input', {
          type: 'number',
          class: 'name-field',
          min: '0',
          value: p.amount || '',
          oninput: (e) => {
            parts[i].amount = Number(e.target.value) || 0;
            syncRemainder();
          },
        });
        selectOnFocus(amt);
        const rm =
          parts.length > 2
            ? el(
                'button',
                {
                  class: 'btn sm ghost',
                  onclick: () => {
                    parts.splice(i, 1);
                    redraw();
                  },
                },
                '\u00d7'
              )
            : null;
        body.append(el('div', { class: 'manage-actions' }, sel, amt, rm));
      });
      syncRemainder();
    };

    async function save() {
      const clean = parts.filter((p) => p.category && Number(p.amount) > 0);
      const split = makeSplit({ txnId: row.id, parts: clean });
      const v = validateSplit(split, target);
      if (!v.ok) {
        const msg =
          {
            'need-two-parts': 'Add at least two categories.',
            'part-missing-category': 'Every part needs a category.',
            'part-not-positive': 'Every part needs an amount above zero.',
            'duplicate-category': 'Choose each category only once.',
            'sum-mismatch': `The parts add up to ${money(v.sum)}, but the transaction is ${money(v.target)}. Adjust them to match.`,
          }[v.reason] || 'That split does not add up.';
        toast(msg);
        return;
      }
      const previous = (state.transactionSplits || []).filter((s) => s.txnId === row.id);

      await commitAndRender({
        commit: async () => {
          await Store.transactionSplits.put(split);
          for (const old of previous) {
            if (old.id !== split.id) await Store.transactionSplits.delete(old.id);
          }
          state.transactionSplits = await Store.transactionSplits.all();
          closePicker();
        },
        render,
        notify: () => toast(`Split “${place}” across ${clean.length} categories.`),
      });
    }
    async function clearSplit() {
      await commitAndRender({
        commit: async () => {
          for (const splitRecord of (state.transactionSplits || []).filter((item) => item.txnId === row.id))
            await Store.transactionSplits.delete(splitRecord.id);
          state.transactionSplits = await Store.transactionSplits.all();
          closePicker();
        },
        render,
        notify: () => toast('Split cleared.'),
      });
    }

    const box = el(
      'div',
      { class: 'picker', role: 'dialog', 'aria-label': 'Split transaction' },
      el('div', { class: 'picker-head' }, `Split “${place}” (${money(target)})`),
      body,
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            parts.push({ category: '', amount: 0 });
            redraw();
          },
        },
        '+ Add a category'
      ),
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            parts = balanceParts(parts, target);
            redraw();
          },
        },
        'Fill remainder in the last part'
      ),
      remainderLine,
      el(
        'div',
        { class: 'picker-actions' },
        el('button', { class: 'btn sm', onclick: save }, 'Save split'),
        existing
          ? el('button', { class: 'btn sm ghost', onclick: clearSplit }, 'Clear split')
          : null,
        el('button', { class: 'btn sm ghost', onclick: closePicker }, 'Cancel')
      )
    );
    redraw();
    openModal(box);
  }

  /* ===========================================================================
  * Custom label picker: attach/detach ONE transaction to any of the person's personal
  * custom labels. A transaction can belong to several labels at once (each label owns its
   * own txnIds list), so this is a CHECKBOX list, not a single choice. Uses the
   * proven pure writers (tagAdd/tagRemove, tag-totals.js), which return a NEW
   * tag record and never mutate - the SAME store (Store.tags) create/remove
   * already write to, so a tag's total (read by provenModels.tags via the
   * txnIds join) populates the moment a transaction is added, with no other
   * change to the row, its category, or any total. A new label is made here
   * too, whatever the count, through the same writer the Custom labels card
   * uses - so labelling never sends anyone to another tab mid-thought.
   * ======================================================================== */
  function openTagPicker(row) {
    closePicker();
    // One reader for both ledgers (see transactionName). A bank row has no
    // displayName and no description, so the old expression produced an empty
    // string and the dialog was headed Custom label “” on every bank
    // transaction in the app. The fallback means the quotes never wrap nothing.
    const place = transactionName(row);
    const tags = state.tags || [];

    const nameInput = el('input', {
      type: 'text',
      class: 'name-field',
      maxlength: '40',
      placeholder: 'New label name',
      'aria-label': 'New custom label name',
    });
    const create = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      closePicker();
      await createTag(name, null);
      const made = (state.tags || []).find((t) => t.name === name);
      if (made) await toggleTag(made.id, row.id, true);
    };
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        create();
      }
    });
    /* Making a label is part of labelling, at every count and not only at zero.
     * An earlier pass fixed the empty case and left every case after it exactly
     * as it was - a list of existing labels with no way to add one, sending a
     * person to the Custom labels card on another tab and leaving them to find
     * this transaction again. The same field and the same writer serve both; the
     * only thing that changes with the count is the sentence above them. */
    const maker = el(
      'div',
      { class: 'tag-picker-new' },
      el('div', { class: 'manage-actions' }, nameInput, el('button', { class: 'btn sm', onclick: create }, 'Create and add'))
    );

    const list = el('div', { class: 'picker-list' });
    for (const t of tags) {
      const member = (t.txnIds || []).includes(row.id);
      const cb = el('input', { type: 'checkbox', checked: member ? '' : null });
      const rowEl = el(
        'label',
        {
          class: 'scope',
          style: 'display:flex;align-items:center;gap:8px;justify-content:space-between',
        },
        el('span', { style: 'display:inline-flex;align-items:center;gap:8px' }, cb, t.name),
        el('span', { class: 'muted small' }, `${(t.txnIds || []).length} labelled`)
      );
      cb.addEventListener('change', () => toggleTag(t.id, row.id, cb.checked));
      list.append(rowEl);
    }

    const box = el(
      'div',
      { class: 'picker', role: 'dialog', 'aria-label': 'Custom label transaction' },
      el('div', { class: 'picker-head' }, place ? `Custom label “${place}”` : 'Custom label'),
      el(
        'p',
        { class: 'muted small', style: 'padding:2px 0 6px' },
        tags.length
          ? 'Add this transaction to any of your custom labels, or make a new one. A transaction can belong to more than one.'
          : 'A custom label groups spending that belongs together but spans categories and months - a renovation, a holiday, a trip. Name your first one and this transaction goes into it.'
      ),
      tags.length ? list : null,
      maker,
      el(
        'div',
        { class: 'picker-actions' },
        el('button', { class: 'btn sm ghost', onclick: closePicker }, tags.length ? 'Done' : 'Cancel')
      )
    );
    openModal(box);
  }

  async function toggleTag(tagId, txnId, on) {
    const tag = (state.tags || []).find((t) => t.id === tagId);
    if (!tag) return;
    const next = on ? tagAdd(tag, txnId) : tagRemove(tag, txnId);
    await commitAndRender({
      commit: async () => {
        await Store.tags.put(next);
        state.tags = await Store.tags.all();
        trackUsage('activity-tag-toggle');
      },
      render,
      notify: () => toast(on ? `Added to “${tag.name}”.` : `Removed from “${tag.name}”.`),
    });
  }

  /* "Only this transaction" and "every one like this" are two different facts,
   * so they are stored in two different places and never in both at once.
   *
   * One transaction is a stamp on that record. Every transaction like it is a
   * RULE, and the rule already governs every row on both ledgers - buildRows
   * reads it through merchantOverrides exactly as the bank ledger does. Writing
   * the rule AND stamping every matching card record was the same decision
   * recorded twice, and the stamp outranks the rule, so the rule could never
   * afterwards be corrected, removed or even honestly listed: the rows would
   * keep their old category and nothing on screen would say why. Applying to
   * all now CLEARS those stamps, including any left by an earlier one-off
   * answer, so the rule is the only thing saying where these transactions go
   * and changing it changes them. */
  async function setCategory(row, category, opts = {}) {
    // Normally read from the live dialog. A caller that had to close the
    // dialog first - making a category re-renders the app - passes what the
    // person chose, so the scope is never silently downgraded to "only this
    // transaction" because the radios are no longer on screen.
    const applyAll =
      opts.applyAll !== undefined
        ? !!opts.applyAll
        : !!(
            getPickerEl() &&
            $('input[name="scope"]:checked', getPickerEl()) &&
            $('input[name="scope"]:checked', getPickerEl()).value === 'all'
          );
    closePicker();
    const before = [];
    const key = merchantRuleKeyFromDescription(row.raw_description);
    const beforeRules = state.rules.map((r) => ({ ...r }));
    const stamp = new Date().toISOString();
    for (const rec of state.records) {
      const rkey = merchantRuleKeyFromDescription(rec.description);
      const match = applyAll ? rkey === key : (rec.id || transactionIdentity(rec)) === row.id;
      if (match) {
        before.push({ rec, prev: rec.categoryOverride || null });
        rec.categoryOverride = applyAll ? null : category;
        rec.lastChanged = stamp;
      }
    }
    state.records = state.records.slice();
    if (applyAll) {
      state.rules = upsertCategoryRule(
        state.rules,
        { match: row.raw_description, category },
        new Date()
      ).rules;
      await persistRules();
    }
    await persist();
    render();
    const place = row.displayName || row.description.split(',')[0].trim();
    toast(
      applyAll ? `Filed every "${place}" as ${category}.` : `Filed as ${category}.`,
      async () => {
        for (const b of before) b.rec.categoryOverride = b.prev;
        state.records = state.records.slice();
        if (applyAll) {
          state.rules = beforeRules.map((r) => ({ ...r }));
          await persistRules();
        }
        await persist();
        render();
        toast('Change undone.');
      }
    );
  }

  return { openCategoryPicker, openTagPicker };
}
