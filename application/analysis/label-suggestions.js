import { recurringStatus } from '../core/shared-helpers.js';
import { merchantRuleKeyFromDescription } from '../../settings/category-rules.js';
import { bankRuleMatch } from './bank-categorise.js';
import { roleCategoryName } from './category-flow.js';
import { answerFor } from './confirmations.js';
import { detectIncomeStreams, resolveIncomeOptions } from './income-model.js';

export const suggestionSubject = (category, ruleKey) => `${category}|${ruleKey}`;

const ruleKeyOf = (row) => merchantRuleKeyFromDescription(bankRuleMatch(row));

export function labelSuggestions({ rows = [], cfg = {}, confirmations = [] }) {
  const opts = resolveIncomeOptions(cfg);
  const detectorOpts = { ...opts, ...(cfg.ahead || {}) };
  const latest = rows.reduce((month, row) => (String(row.date || '').slice(0, 7) > month ? String(row.date).slice(0, 7) : month), '');
  const found = [];
  for (const spec of cfg.labelSuggestions || []) {
    if (!spec || spec.active === false || !spec.category) continue;
    const from = roleCategoryName(cfg, spec.from);
    const eligible = rows.filter((row) => row.direction === 'in' &&
      row.creditClassification?.basis === 'default' && row.creditClassification.category === from && ruleKeyOf(row));
    const labelOf = new Map();
    const grouped = eligible.map((row) => {
      const key = ruleKeyOf(row);
      if (!labelOf.has(key)) labelOf.set(key, row.displayName || row.counterpartyLabel || key);
      return { ...row, counterpartyKey: key, counterpartyLabel: labelOf.get(key) };
    });
    for (const stream of detectIncomeStreams(grouped, detectorOpts, 'pattern', null, opts.baseCurrency)) {
      const subject = suggestionSubject(spec.category, stream.key);
      if (stream.typical < opts.incomeFloor || stream.daySpread > opts.steadySpreadDays) continue;
      if (recurringStatus(stream.lastMonth, latest, opts.maxGapMonths) === 'lapsed') continue;
      if (answerFor(confirmations, 'labelSuggestion', [subject]) !== null) continue;
      found.push({
        category: spec.category,
        ruleKey: stream.key,
        subject,
        label: stream.label,
        typical: stream.typical,
        months: stream.months,
        count: stream.occurrences,
        lastMonth: stream.lastMonth,
        row: eligible.find((row) => ruleKeyOf(row) === stream.key),
      });
    }
  }
  return found.sort((a, b) => b.typical - a.typical);
}
