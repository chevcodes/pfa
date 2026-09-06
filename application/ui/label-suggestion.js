import { requireCtx } from '../core/shared-helpers.js';
import { labelSuggestions } from '../analysis/label-suggestions.js';

export const LABEL_SUGGESTION_WORDS = {
  title: (category) => `These repeat. Label them as ${category.toLowerCase()}?`,
  detail: (label, count, typical) => `${label} · ${count} deposits · about ${typical} a month`,
  apply: (category) => `Label as ${category.toLowerCase()}`,
  dismiss: 'Dismiss',
  dismissed: 'Dismissed.',
};

export function createLabelSuggestions(ctx) {
  requireCtx(ctx, ['state', 'classifiedBank', 'answer', 'applyLabel', 'proseMoney', 'trackUsage'], 'createLabelSuggestions');
  const { state, classifiedBank, answer, applyLabel, proseMoney, trackUsage } = ctx;

  function attentionItems() {
    const top = labelSuggestions({ rows: classifiedBank(), cfg: state.cfg, confirmations: state.confirmations })[0];
    if (!top) return [];
    return [
      {
        tone: 'optional',
        cause: true,
        title: LABEL_SUGGESTION_WORDS.title(top.category),
        detail: LABEL_SUGGESTION_WORDS.detail(top.label, top.count, proseMoney(top.typical)),
        onClick: null,
        actions: [
          {
            label: LABEL_SUGGESTION_WORDS.dismiss,
            variant: 'ghost',
            onClick: () => answer({
              inference: 'labelSuggestion',
              subject: top.subject,
              answer: false,
              describe: () => LABEL_SUGGESTION_WORDS.dismissed,
              track: 'suggest-label-dismiss',
            }),
          },
          {
            label: LABEL_SUGGESTION_WORDS.apply(top.category),
            variant: 'primary',
            onClick: () => {
              trackUsage('suggest-label-apply');
              return applyLabel(top.row, top.category, { applyAll: true });
            },
          },
        ],
      },
    ];
  }

  return { attentionItems };
}
