/* Category-ceiling authoring section for Activity. It owns only DOM and store
 * wiring; the intention resolver and pace model remain in analysis/. */
import { spendableCategoryNames } from '../analysis/spendable-categories.js';
import { asOfDayForMonth } from '../analysis/category-intentions.js';
import { formatMonthYear, requireCtx } from '../core/shared-helpers.js';
import { makeMoneyShort } from '../core/money-format.js';
import { chartInfo, collapsibleCard, surfaceTone } from './decision-header.js';
import { chartInfoReact, collapsibleCardReact } from './react-bridge.js';
import { createCategoryLimitActions } from './category-limit-actions.js';
import { coverageTimeline, bankStatementMonths } from '../analysis/coverage-map.js';
import { categoryCoverageText } from '../analysis/category-budget.js';

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
      'money0',
      'midMonthPace',
      'drillToTransactions',
    ],
    'makeRenderIntentions'
  );
  const { state, el, icon, provenModels, resolved, trackUsage, Store, makeIntention,
    categorySpend, iconFlag, toast, reversible, money0, midMonthPace, drillToTransactions, onCategoryHistory } = deps;
  const paceMoney = makeMoneyShort(state.cfg || {}, { thousandDecimals: 1 });
  const limitActions = createCategoryLimitActions({ state, Store, reversible, trackUsage, makeIntention, toast });

  async function saveCeiling(category, amount) {
    const p = resolved();
    const month = p && p.to ? String(p.to).slice(0, 7) : null;
    return limitActions.save(category, amount, month);
  }

  async function removeCeiling(category) {
    await limitActions.remove(category);
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
    const node = el(
      'div', {},
      el('div', { class: 'manage-actions compact-form' }, catSelect, amtInput,
        el('button', { class: 'btn sm', onclick: confirm }, 'Set limit'),
        chartInfoReact(
          el,
          '',
          'Pick a category and a monthly amount, and this card tracks how much room is left as the month goes on.'
        ))
    );
    // The running-hot rows above fill this form where it stands rather than
    // scrolling the page to it, which is what the retired pace card did.
    node.fill = (category) => {
      catSelect.value = category;
      amtInput.focus();
    };
    return node;
  }

  return function renderIntentions(asProps = false) {
    if (!categorySpend) return null;
    const p = resolved();
    if (!p || !p.to) return null;
    const month = String(p.to).slice(0, 7);
    const cardMonths = [...new Set([...(state.rows || []).map((row) => row.month), ...(state._cardStatements || []).map((statement) => statement.statementKey)])];
    const bankMonths = [...new Set([...(state.bankRecords || []).map((row) => String(row.date || '').slice(0, 7)), ...bankStatementMonths(state._bankStatements || [])])];
    const coverage = coverageTimeline({ cardMonths, bankMonths, coverage: state.coverage, ledgers: ['bank', 'card'] }).months.find((entry) => entry.month === month) || { bank: 'outside', card: 'outside' };
    const asOfDay = asOfDayForMonth(month);
    const categories = [...new Set((state.categoryIntentions || [])
      .filter((it) => it.active !== false).map((it) => it.category))];
    const models = [];
    for (const cat of categories) {
      const gov = provenModels.intentionFor(cat, month);
      if (!gov) continue;
      const pace = provenModels.paceFor(cat, month, categorySpend(cat, { from: month, to: month }), asOfDay);
      if (pace) models.push({ cat, gov, pace });
    }

    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      const limited = new Set(models.map((model) => model.cat));
      const hot = (midMonthPace() || []).filter((pace) => !limited.has(pace.category));
      const furthest = models
        .filter((model) => model.pace.isOver)
        .sort((a, b) => Math.abs(b.pace.remaining) - Math.abs(a.pace.remaining))[0];
      const summary = furthest
        ? `${furthest.cat}: ${furthest.pace.remainingText} over`
        : hot.length
          ? `${hot[0].category} is running faster than usual`
          : models.length
            ? `${models.length} limit${models.length === 1 ? '' : 's'} recorded`
            : 'None set yet';
      const limitProps = {
          categories: spendableCategoryNames(state.cfg),
          monthLabel: formatMonthYear(month),
          coverageText: categoryCoverageText(coverage),
          models: models.map(({ cat, gov, pace }) => ({
            category: cat,
            amountText: money0(gov.amount),
            spentText: money0(pace.spent),
            spent: pace.spent,
            limit: gov.amount,
            tag: pace.tag,
            tone: surfaceTone(pace.tone),
            remainingText: pace.remainingText,
            isOver: pace.isOver,
            detail: pace.detail,
            id: gov.id,
          })),
          hot: hot.map((pace) => ({
            category: pace.category,
            dayOfMonth: pace.dayOfMonth,
            daysInMonth: pace.daysInMonth,
            projectedText: paceMoney(pace.projected),
            typicalText: paceMoney(pace.typical),
          })),
          onSave: saveCeiling,
          onRemove: removeCeiling,
          onRefine: drillToTransactions ? (category) => drillToTransactions({ category, month, kind: 'spend' }, { showAll: true, contributionCategory: true }) : null,
          onHistory: onCategoryHistory,
          onTrackSet: () => trackUsage('activity-pace-set-ceiling'),
      };
      if (asProps) return { summary, iconMarkup: iconFlag(), limitProps };
      const card = collapsibleCardReact(el, {
        title: 'Spending limits you set',
        iconMarkup: iconFlag(),
        summary,
        reactBody: { kind: 'spendingLimits', props: limitProps, rootClass: 'pfa-react-root' },
        name: 'activity-spending-limits',
      });
      if (card) card.id = 'activity-ceilings';
      return card;
    }

    const sec = el('div', {});

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
          `How much room is left before each limit, for ${formatMonthYear(month)}.`
        )
      );
    }

    if (models.length) {
      const list = el('div', { class: 'recurring-list' });
      for (const { cat, gov, pace } of models) {
        const removeBtn = el('button', { class: 'btn sm ghost', onclick: () => removeCeiling(cat) }, 'Remove');
        if (removeBtn.setAttribute) removeBtn.setAttribute('data-id', gov.id);
        // A limit passed is a fact about specific transactions, not just a
        // number - so it is the way to them, the same drill Cards' own
        // category panel already uses, rather than a dead end next to Remove.
        const refineBtn = pace.isOver && drillToTransactions
          ? el(
              'button',
              { class: 'btn sm ghost', onclick: () => drillToTransactions({ category: cat, month, kind: 'spend' }) },
              'Refine'
            )
          : null;
        // 8b: the figure a person actually wants while standing in a shop is how
        // much room is LEFT, not the projected month-end total that used to sit
        // here alone with no label saying what it was.
        list.append(el('div', { class: 'recurring-row' },
          el('span', { class: 'recurring-name' }, cat),
          el('span', { class: 'muted small' }, `Monthly limit ${money0(gov.amount)}`),
          pace.tag ? el('span', { class: 'vm-tag tone-' + surfaceTone(pace.tone) }, pace.tag) : el('span', {}),
          el(
            'span',
            { class: 'recurring-amt num', title: pace.detail },
            pace.isOver
              ? `${pace.remainingText} over`
              : `${pace.remainingText} left`
          ),
          refineBtn,
          removeBtn));
      }
      sec.append(list);
    }
    /* RUNNING HOT WITH NO LIMIT - the other half of the same idea.
     *
     * This was its own card, "Partway through the month", whose only action was
     * "Set a ceiling" and whose only effect was to scroll the page to THIS card
     * and open it with the category pre-picked. Two cards, a jump between them,
     * and one question: how is a category tracking against what you meant to
     * spend. Its closed summary was also a figure nobody could read - "about
     * $12,224.07 projected · 753% of typical" - with the sentence that makes
     * sense of it hidden inside.
     *
     * The observation now sits above the form it exists to send you to, and
     * only for categories with no limit yet: one already limited is reported by
     * its own row above, and saying it twice in one card would be the
     * duplication this move removes. */
    const limited = new Set(models.map((m) => m.cat));
    const hot = (midMonthPace() || []).filter((p) => !limited.has(p.category));
    const form = renderCeilingForm();
    if (hot.length) {
      const hotList = el('div', { class: 'recurring-list' });
      // The category, then the figures under it - not squeezed beside them. In
      // one row of .recurring-row's three columns the sentence and the button
      // take every pixel the auto columns can claim, and at 375px the name cell
      // collapsed to zero width: a phone showed the pace and the button with
      // nothing saying which category they were about.
      for (const run of hot) {
        hotList.append(
          el(
            'div',
            { class: 'pace-row' },
            el(
              'div',
              { class: 'recurring-row' },
              el('span', { class: 'recurring-name' }, run.category),
              el(
                'button',
                {
                  class: 'btn sm ghost',
                  onclick: () => {
                    trackUsage('activity-pace-set-ceiling');
                    form.fill(run.category);
                  },
                },
                'Set a limit'
              )
            ),
            el(
              'div',
              { class: 'pace-note muted small' },
              `On pace for about ${paceMoney(run.projected)} this month, against a typical ${paceMoney(run.typical)}.`
            )
          )
        );
      }
      sec.append(
        el(
          'p',
          { class: 'muted small', style: 'margin:10px 0 6px' },
          'Spending faster than usual this month, with no limit set. ',
          chartInfo(el, '', `Day ${hot[0].dayOfMonth} of ${hot[0].daysInMonth}. This estimate projects the current pace through month end; it is not a final total.`)
        ),
        hotList
      );
    }
    sec.append(form);
    const furthest = models
      .filter((m) => m.pace.isOver)
      .sort((a, b) => Math.abs(b.pace.remaining) - Math.abs(a.pace.remaining))[0];
    // What the closed card says, in the order a person would want it: a limit
    // actually passed, then a category running hot with nothing holding it,
    // then the plain count.
    const summary = furthest
      ? `${furthest.cat}: ${furthest.pace.remainingText} over`
      : hot.length
        ? `${hot[0].category} is running faster than usual`
        : models.length
          ? `${models.length} limit${models.length === 1 ? '' : 's'} recorded`
          : 'None set yet';
    const card = collapsibleCard(el, {
      title: 'Spending limits you set',
      icon: icon(iconFlag()),
      summary,
      body: sec,
      name: 'activity-spending-limits',
    });
    if (card) card.id = 'activity-ceilings';
    return card;
  };
}
