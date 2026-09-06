/* Category-ceiling authoring section for Activity. It owns only DOM and store
 * wiring; the intention resolver and pace model remain in analysis/. */
import { spendableCategoryNames } from '../analysis/spendable-categories.js';
import { asOfDayForMonth } from '../analysis/category-intentions.js';
import { requireCtx } from '../core/shared-helpers.js';
import { chartInfo, collapsibleCard, surfaceTone } from './decision-header.js';

export function makeRenderIntentions(deps) {
  // Thirteen dependencies, previously taken on trust. Every comparable factory
  // in this app validates its context at construction; this one did not, and
  // the app has already shipped one crash from exactly that gap - a ctx member
  // nobody passed, which surfaced months later as a ReferenceError on a button
  // press with a green suite throughout. A missing dependency should stop the
  // boot, not wait for someone to open this card.
  requireCtx(
    deps,
    [
      'state',
      'el',
      'icon',
      'provenModels',
      'resolved',
      'trackUsage',
      'Store',
      'makeIntention',
      'categorySpend',
      'iconFlag',
      'toast',
      'reversible',
    ],
    'makeRenderIntentions'
  );
  const { state, el, icon, provenModels, resolved, trackUsage, Store, makeIntention,
    categorySpend, iconFlag, toast, reversible } = deps;
  const reloadIntentions = async () => {
    state.categoryIntentions = await Store.categoryIntentions.all();
  };

  async function saveCeiling(category, amount) {
    const p = resolved();
    const month = p && p.to ? String(p.to).slice(0, 7) : null;
    if (!category || !(amount > 0) || !month) {
      toast('Enter a category and an amount.');
      return;
    }
    const rec = makeIntention({ category, amount, kind: 'repeating', effectiveFrom: month });
    await reversible.addRecord({
      store: Store.categoryIntentions,
      record: rec,
      reload: reloadIntentions,
      describe: () => `Limit set for ${category}.`,
      track: () => trackUsage('activity-set-ceiling'),
    });
  }

  async function removeCeiling(category) {
    // Removing a limit used to delete every record for that category outright,
    // with no way back and no way to know what had been deleted. The rows are
    // held and restored on undo.
    const all = await Store.categoryIntentions.all();
    await reversible.removeRecords({
      store: Store.categoryIntentions,
      records: all.filter((r) => r.category === category),
      reload: reloadIntentions,
      describe: () => `Limit removed for ${category}.`,
      track: () => trackUsage('activity-remove-ceiling'),
    });
  }

  function renderCeilingForm() {
    const categories = spendableCategoryNames(state.cfg);
    const catSelect = el(
      'select',
      { class: 'name-field', id: 'ceiling-category-select' },
      ...categories.map((c) => el('option', { value: c }, c))
    );
    const amtInput = el('input', {
      type: 'number', class: 'name-field', placeholder: 'Monthly limit', min: '1',
    });
    const confirm = async () => saveCeiling(catSelect.value, Number(amtInput.value));
    return el(
      'div', {},
      el('div', { class: 'manage-actions' }, catSelect, amtInput,
        el('button', { class: 'btn sm', onclick: confirm }, 'Set limit'),
        chartInfo(
          el,
          '',
          'Pick a category and a monthly amount, and this card tracks how much room is left as the month goes on.'
        ))
    );
  }

  return function renderIntentions() {
    if (!categorySpend) return null;
    const p = resolved();
    if (!p || !p.to) return null;
    const month = String(p.to).slice(0, 7);
    const asOfDay = asOfDayForMonth(month);
    const monthNameOf = (ym) => {
      const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
      if (!m) return 'this month';
      const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${names[+m[2] - 1]} ${m[1]}`;
    };
  const sec = el('div', {});

    const categories = [...new Set((state.categoryIntentions || [])
      .filter((it) => it.active !== false).map((it) => it.category))];
    const models = [];
    for (const cat of categories) {
      const gov = provenModels.intentionFor(cat, month);
      if (!gov) continue;
      const pace = provenModels.paceFor(cat, month, categorySpend(cat, { from: month, to: month }), asOfDay);
      if (pace) models.push({ cat, gov, pace });
    }

    // The line under the title describes what is actually there.
    //
    // It read "How much room is left before each limit, for <month>." in every
    // state, including the one where no limit exists - promising a status
    // readout above a card that contains only a setup form. A person reading it
    // looks for figures that are not there and wonders what they have missed.
    // With limits set, this line reports a FACT about them and stays. With
    // none set it explained the form beneath it, which is now behind the (i)
    // beside the title.
    if (models.length) {
      sec.append(
        el(
          'p',
          { class: 'muted small', style: 'margin:0 0 10px' },
          `How much room is left before each limit, for ${monthNameOf(month)}.`
        )
      );
    }

    if (models.length) {
      const list = el('div', { class: 'recurring-list' });
      for (const { cat, gov, pace } of models) {
        const removeBtn = el('button', { class: 'btn sm ghost', onclick: () => removeCeiling(cat) }, 'Remove');
        if (removeBtn.setAttribute) removeBtn.setAttribute('data-id', gov.id);
        // 8b: the figure a person actually wants while standing in a shop is how
        // much room is LEFT, not the projected month-end total that used to sit
        // here alone with no label saying what it was.
        list.append(el('div', { class: 'recurring-row' },
          el('span', { class: 'recurring-name' }, cat),
          pace.tag ? el('span', { class: 'vm-tag tone-' + surfaceTone(pace.tone) }, pace.tag) : el('span', {}),
          el(
            'span',
            { class: 'recurring-amt num', title: pace.detail },
            pace.isOver
              ? `${pace.remainingText} over`
              : `${pace.remainingText} left`
          ),
          removeBtn));
      }
      sec.append(list);
      sec.append(el('p', { class: 'muted small' }, `Of the limit you set for ${monthNameOf(month)}. Tracking so far this month.`));
    }
    sec.append(renderCeilingForm());
    const attention = models.filter((m) => m.pace.needsAttention);
    const furthest = models
      .filter((m) => m.pace.isOver)
      .sort((a, b) => Math.abs(b.pace.remaining) - Math.abs(a.pace.remaining))[0];
    const card = collapsibleCard(el, {
      title: 'Spending limits you set',
      icon: icon(iconFlag()),
      summary: models.length
        ? furthest
          ? `${furthest.cat}: ${furthest.pace.remainingText} over`
          : `${models.length} limit${models.length === 1 ? '' : 's'} recorded`
        : 'None set yet',
      body: sec,
      name: 'activity-spending-limits',
    });
    if (card) card.id = 'activity-ceilings';
    return card;
  };
}
