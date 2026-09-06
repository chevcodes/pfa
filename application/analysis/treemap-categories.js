const MAX_CATEGORY_TILES = 6;

export function groupTreemapCategories(ranked, total) {
  const positive = ranked.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  if (!(total > 0)) return { categories: [], groupedNames: [], otherName: null };
  const main = positive.slice(0, MAX_CATEGORY_TILES - 1);
  const mainItems = new Set(main);
  const small = positive.filter((item) => !mainItems.has(item));
  if (!small.length) return { categories: positive, groupedNames: [], otherName: null };
  const names = new Set(positive.map((item) => item.name));
  let otherName = 'Other';
  let suffix = 2;
  while (names.has(otherName)) {
    otherName = suffix === 2 ? 'Other categories' : `Other categories ${suffix}`;
    suffix++;
  }
  return {
    categories: [...main, { name: otherName, displayName: `${otherName} · ${small.length} ${small.length === 1 ? 'category' : 'categories'}`, amount: small.reduce((sum, item) => sum + item.amount, 0) }],
    groupedNames: small.map((item) => item.name),
    otherName,
  };
}
