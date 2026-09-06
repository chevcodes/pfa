#!/usr/bin/env node
/*
 * merchant-drift-check.js  -  the drift-check script mock-data.js's own
 * comment already promises: CARD_MERCHANTS and BANK_POS_MERCHANTS are a
 * curated SLICE of settings/jamaica-merchants.json, not the whole thing, so
 * this reports which merchants in that fuller database are not represented
 * anywhere in the mock lists, grouped by category, for a human to fold in.
 *
 * It does not add or remove anything - purely a report. Run with:
 *   npm run mock:drift-check
 *
 * "Represented" means: at least one mock-list entry matches the KB entry's
 * own alias pattern(s), or (when it has none) a simple name match. A miss
 * does not mean the merchant must be added - only that nobody has checked.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CARD_MERCHANTS,
  BANK_POS_MERCHANTS,
  SUBSCRIPTION_POOL,
  BANK_BILLS,
} from '../application/sample-data/mock-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const merchantsPath = path.join(here, '..', 'settings', 'jamaica-merchants.json');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function namePattern(canonicalName) {
  // A loose fallback for the rare KB entry with no aliases: the first
  // distinctive word of its canonical name, matched case-insensitively.
  const word = String(canonicalName || '')
    .split(/\s+/)
    .find((w) => w.length >= 4) || canonicalName;
  return new RegExp(escapeRegExp(word), 'i');
}

async function main() {
  const raw = JSON.parse(await readFile(merchantsPath, 'utf8'));
  const merchants = Array.isArray(raw.merchants) ? raw.merchants : [];

  // Every name the mock data could plausibly represent a KB merchant with -
  // the two shopping lists, plus the subscriptions and standing bills, which
  // carry real national brands (JPS, NWC, Netflix, Spotify...) under their
  // own separate pools rather than CARD_MERCHANTS/BANK_POS_MERCHANTS.
  const mockNames = [
    ...new Set([
      ...Object.values(CARD_MERCHANTS).flat(),
      ...BANK_POS_MERCHANTS,
      ...SUBSCRIPTION_POOL.map((s) => s.desc),
      ...BANK_BILLS.map((b) => b.desc),
    ]),
  ];

  const missing = [];
  for (const m of merchants) {
    const patterns = (Array.isArray(m.aliases) && m.aliases.length ? m.aliases : [])
      .map((a) => {
        try {
          return new RegExp(a, 'i');
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (!patterns.length) patterns.push(namePattern(m.canonicalName));

    const represented = mockNames.some((name) => patterns.some((re) => re.test(name)));
    if (!represented) missing.push(m);
  }

  if (!missing.length) {
    console.log(
      `merchant-drift-check: every one of ${merchants.length} merchants in jamaica-merchants.json is represented in the mock merchant pools. Nothing to review.`
    );
    return;
  }

  const byCategory = new Map();
  for (const m of missing) {
    const cat = m.category || m.sector || 'Uncategorised';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(m.canonicalName);
  }

  console.log(
    `merchant-drift-check: ${missing.length}/${merchants.length} merchants in jamaica-merchants.json are not represented in the mock merchant pools.\n` +
      `A miss just means nobody has checked it - not every one belongs in the mock lists. Review by category:\n`
  );
  for (const [cat, names] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${cat} (${names.length}):`);
    console.log(`  ${names.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('merchant-drift-check failed:', err);
  process.exitCode = 1;
});
