import { requireCtx } from '../core/shared-helpers.js';

export function createCategoryLimitActions(ctx) {
  requireCtx(ctx, ['state', 'Store', 'reversible', 'trackUsage', 'makeIntention', 'toast'], 'createCategoryLimitActions');
  const { state, Store, reversible, trackUsage, makeIntention, toast } = ctx;
  const reload = async () => {
    state.categoryIntentions = await Store.categoryIntentions.all();
  };

  async function save(category, amount, month, usage = 'activity-set-ceiling') {
    if (!category || !(amount > 0) || !Number.isFinite(amount) || !month) {
      toast('Enter a category and an amount.');
      return false;
    }
    const record = makeIntention({ category, amount, kind: 'repeating', effectiveFrom: month });
    await reversible.addRecord({
      store: Store.categoryIntentions,
      record,
      reload,
      describe: () => `Limit set for ${category}.`,
      track: () => trackUsage(usage),
    });
    return true;
  }

  async function remove(category, usage = 'activity-remove-ceiling') {
    const all = await Store.categoryIntentions.all();
    await reversible.removeRecords({
      store: Store.categoryIntentions,
      records: all.filter((record) => record.category === category),
      reload,
      describe: () => `Limit removed for ${category}.`,
      track: () => trackUsage(usage),
    });
  }

  return { save, remove };
}
