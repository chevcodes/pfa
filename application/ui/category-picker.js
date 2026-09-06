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
} from '../analysis/reporting-core.js';
import {
  merchantRuleKeyFromDescription,
  upsertCategoryRule,
  listCategoryRules,
} from '../../settings/category-rules.js';
import { dirOf, isInternal, requireCtx, transactionName } from '../core/shared-helpers.js';
import { transactionIdentity } from '../statements/read-statements.js';
import { bankRuleMatch } from '../analysis/bank-categorise.js';
import { Store } from '../core/storage.js';
import { makeSplit, validateSplit, balanceParts } from '../analysis/transaction-splits.js';
import { categoryNameExists } from '../analysis/custom-categories.js';
import { groupForCategory, planGroups, resolveGroupMap } from '../analysis/plan.js';
import { spendableCategoryNames } from '../analysis/spendable-categories.js';
import { categoryMeta, categoryConfirmation, pickerCategoryNames, sortCategoryNames } from '../analysis/category-flow.js';
import { tagAdd, tagRemove } from '../analysis/tag-totals.js';
import { makeMoney } from '../core/money-format.js';
import { commitAndRender } from './reversible.js';
import { categoryPickerReact, transactionSplitEditorReact, transactionTagPickerReact } from './react-bridge.js';

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
      'openPaymentEditor',
      'setCategoryBand',
      'classifiedBank',
      'confirmAnswer',
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
    openPaymentEditor,
    setCategoryBand,
    classifiedBank,
    confirmAnswer,
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

  function bandInfo(row) {
    const name = row.category;
    if (!name || isReview(name) || categoryMeta(state.cfg, name)?.flow !== 'out') return null;
    const groups = planGroups(state.cfg);
    const map = resolveGroupMap(state.cfg, state._planGroups || null);
    return { name, groups, current: groupForCategory(name, map) };
  }

  function governingRule(matchText) {
    const key = matchText ? merchantRuleKeyFromDescription(matchText) : '';
    if (!key) return null;
    return listCategoryRules(state.rules, state.brandRules, state.merchants).find((r) => r.key === key) || null;
  }

  function stopRuleButton(matchText) {
    const rule = governingRule(matchText);
    if (!rule) return { visible: true, removable: false, focusKey: merchantRuleKeyFromDescription(matchText) };
    return {
      visible: true,
      removable: true,
      focusKey: rule.key,
      title: `Stop filing every "${rule.label}" as ${rule.category}`,
      ariaLabel: `Remove the rule filing ${rule.label} as ${rule.category}`,
      onclick: () => {
        closePicker();
        dropCategoryRule(rule);
      },
    };
  }

  function openCategoryPicker(row, ledger = 'card') {
    closePicker();
    if (ledger === 'bank') return openBankClassification(row);
    const cats = pickerCategoryNames(state.cfg, 'card');
    const ordered = cats;
    const place = row.displayName || row.description.split(',')[0].replace(/\s+/g, ' ').trim();
    const rules = stopRuleButton(row.raw_description);
    const manageRulesLabel = 'Manage rules';
    const box = el('div', { class: 'picker', role: 'dialog', 'aria-label': 'Change category' });
    categoryPickerReact(box, {
      place,
      categories: ordered.map((value) => ({ value, label: isReview(value) ? 'To review' : value, color: catColour(value) })),
      currentCategory: row.category,
      reviewCategory: isReview,
      bank: false,
      band: bandInfo(row),
      rules,
      splitEnabled: row.kind === 'spend',
      manageRulesLabel,
      makerAvailable: (name) => !categoryNameExists(name, state.cfg.categories),
      onAssign: (category, applyAll) => setCategory(row, category, { applyAll }),
      onMake: async (name, applyAll) => {
        closePicker();
        const made = await createCategory(name);
        if (made) await setCategory(row, name, { applyAll });
      },
      onBand: (key) => {
        const picked = planGroups(state.cfg).find((group) => group.key === key);
        closePicker();
        setCategoryBand(row.category, key, picked ? picked.label : key);
      },
      onDecisionOpen: (decision) => { decision.open = true; },
      onSplit: () => {
        closePicker();
        openSplitEditor(row);
      },
      onStopRule: rules.onclick,
      onManageRules: () => {
        closePicker();
        openRulesSection(rules.focusKey);
      },
      onCancel: closePicker,
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
    const credit = dirOf(row) === 'in';
    const cats = pickerCategoryNames(state.cfg, 'bank', dirOf(row));
    const currentCategory = categoryMeta(state.cfg, row.category);
    const ordered = credit && currentCategory && currentCategory.selectable !== false && !cats.includes(row.category)
      ? sortCategoryNames([...cats, row.category], state.cfg)
      : cats;
    const rules = stopRuleButton(bankRuleMatch(row));
    const manageRulesLabel = 'Manage rules';
    const box = el('div', { class: 'picker', role: 'dialog', 'aria-label': 'Change category' });
    categoryPickerReact(box, {
      place,
      categories: ordered.map((value) => ({ value, label: isReview(value) ? 'To review' : value, color: catColour(value) })),
      currentCategory: row.category,
      reviewCategory: isReview,
      bank: true,
      band: credit ? null : bandInfo(row),
      newCategoryBands: credit ? null : planGroups(state.cfg),
      paymentAvailable: dirOf(row) === 'out' && !isInternal(row),
      rules,
      splitEnabled: false,
      manageRulesLabel,
      makerAvailable: (name) => !credit && !categoryNameExists(name, state.cfg.categories),
      onAssign: (category, applyAll) => setBankCategory(row, category, { applyAll }),
      onMake: async (name, applyAll, newBand, makePayment) => {
        closePicker();
        const made = await createCategory(name, newBand);
        if (made) {
          await setBankCategory(row, name, { applyAll });
          if (makePayment) openPaymentEditor({ row: { ...row, category: name } });
        }
      },
      onPayment: (category) => { closePicker(); openPaymentEditor({ row: { ...row, category } }); },
      onBand: (key) => {
        const picked = planGroups(state.cfg).find((group) => group.key === key);
        closePicker();
        setCategoryBand(row.category, key, picked ? picked.label : key);
      },
      onDecisionOpen: (decision) => { decision.open = true; },
      onStopRule: rules.onclick,
      onManageRules: () => {
        closePicker();
        openRulesSection(rules.focusKey);
      },
      onCancel: closePicker,
    });
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
  async function setBankCategory(row, category, { applyAll = false } = {}) {
    closePicker();
    if (category !== row.category && !pickerCategoryNames(state.cfg, 'bank', dirOf(row)).includes(category)) return;
    const place = transactionName(row) || 'this transaction';
    const match = bankRuleMatch(row);
    const matchKey = merchantRuleKeyFromDescription(match);
    const beforeRules = state.rules.map((r) => ({ ...r }));
    const beforeRecords = state.bankRecords;
    let changed = false;
    const nextRecords = beforeRecords.map((record) => {
      const isTarget = applyAll
        ? !!matchKey && merchantRuleKeyFromDescription(bankRuleMatch(record)) === matchKey
        : record.id === row.id;
      if (!isTarget) return record;
      changed = true;
      return { ...record, categoryOverride: applyAll ? null : category };
    });
    if (!changed) {
      toast(applyAll ? `No transactions matched “${place}”.` : 'This transaction could not be found.');
      return;
    }
    let merged = null;
    if (applyAll) {
      if (!match) {
        toast(`This transaction has nothing to match on, so no rule was written for “${place}”.`);
        return;
      }
      merged = upsertCategoryRule(state.rules, { match, category }, new Date());
      if (!merged.inserted && !merged.updated) {
        toast(`“${place}” is already filed as ${category}.`);
        return;
      }
    }
    const commitCategory = async () => {
        state.bankRecords = nextRecords;
        await Store.replaceBankTransactions(nextRecords);
        if (applyAll) {
          state.rules = merged.rules;
          await persistRules();
        }
        trackUsage(applyAll ? 'activity-file-bank-transactions' : 'activity-file-bank-transaction');
    };
    const undoCategory = async () => {
      state.bankRecords = beforeRecords;
      await Store.replaceBankTransactions(beforeRecords);
      if (applyAll) {
        state.rules = beforeRules.map((r) => ({ ...r }));
        await persistRules();
      }
    };
    const targets = applyAll
      ? bankRowsForOrdering().filter((record) => merchantRuleKeyFromDescription(bankRuleMatch(record)) === matchKey)
      : [row];
    const answers = targets.map((record) => categoryConfirmation(state.cfg, category, record)).filter(Boolean);
    if (answers.length) {
      const { inference, answer, scope } = answers[0];
      await confirmAnswer({
        inference,
        subjects: [...new Set(answers.filter((item) => item.inference === inference).map((item) => item.subject).filter(Boolean))],
        answer,
        scope,
        commit: commitCategory,
        undo: undoCategory,
        describe: applyAll ? `Filed every “${place}” as ${category}.` : `Filed as ${category}.`,
      });
      return;
    }
    await commitAndRender({
      commit: commitCategory,
      render,
      notify: () =>
        toast(applyAll ? `Filed every “${place}” as ${category}.` : `Filed as ${category}.`, async () => {
          await commitAndRender({
            commit: undoCategory,
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

    async function save(parts) {
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

    const box = el('div', { class: 'picker', role: 'dialog', 'aria-label': 'Split transaction' });
    transactionSplitEditorReact(box, {
      place,
      target,
      targetText: money(target),
      spendable,
      initialParts: parts,
      existing: !!existing,
      money,
      balanceParts,
      onSave: save,
      onClear: clearSplit,
      onCancel: closePicker,
    });
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

    const box = el('div', { class: 'picker', role: 'dialog', 'aria-label': 'Custom label transaction' });
    transactionTagPickerReact(box, {
      place,
      tags: tags.map((tag) => ({ id: tag.id, name: tag.name, count: (tag.txnIds || []).length, checked: (tag.txnIds || []).includes(row.id) })),
      onCreate: async (name) => {
        closePicker();
        await createTag(name, null);
        const made = (state.tags || []).find((t) => t.name === name);
        if (made) await toggleTag(made.id, row.id, true);
      },
      onToggle: (tagId, on) => toggleTag(tagId, row.id, on),
      onCancel: closePicker,
    });
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

  return { openCategoryPicker, openTagPicker, setBankCategory };
}
