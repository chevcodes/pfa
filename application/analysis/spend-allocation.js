import { roundMoney } from '../core/shared-helpers.js';
import { defaultTargets, normaliseTargets } from './plan.js';

// What is genuinely free to spend right now, and what the rest of the surplus
// is for.
//
// The surplus this divides is ALREADY net of commitments due before the next
// pay, so it is not income and the plan's shares cannot be applied to it as a
// whole. Only the guilt-free share is applied, and it is applied to the
// surplus directly rather than being scaled up against the saving share. That
// is the conservative reading on purpose: the surplus still has to carry the
// everyday fixed costs that are not detected commitments - groceries, fuel,
// the things that have not happened yet this month - so a larger figure would
// be exactly the false headroom this app refuses to imply.
//
// The remainder is EARMARKED for saving, never recorded as saved. Money that
// has not moved is an intention, not a fact, and the plan's savings band still
// counts only transfers that actually happened.
export function allocateSurplus({ surplus = 0, targets = null, cfg = {} } = {}) {
  const pct = targets ? normaliseTargets(targets, cfg) : defaultTargets(cfg);
  const net = roundMoney(surplus);
  const share = Math.max(0, Math.min(100, Number(pct.free) || 0));
  if (!(net > 0)) {
    return {
      surplus: net,
      sharePct: share,
      spendable: 0,
      earmarkedSaving: 0,
      usingDefault: !targets,
      nothingSpare: true,
    };
  }
  const spendable = roundMoney((net * share) / 100);
  return {
    surplus: net,
    sharePct: share,
    spendable,
    earmarkedSaving: roundMoney(net - spendable),
    usingDefault: !targets,
    nothingSpare: false,
  };
}

// `prose` is the short formatter for figures inside sentences (see
// makeProseMoney). It defaults to `money` so an older caller that passes only
// one formatter still renders correctly, just without the shortening.
export function allocationView(allocation, money, prose = money) {
  if (!allocation) return null;
  const a = allocation;
  if (a.nothingSpare) {
    return {
      amount: 0,
      amountText: money(0),
      tag: 'nothing spare until payday',
      tone: 'watch',
      detail:
        'Payments due before your next pay account for everything on hand, so nothing is free to spend yet.',
      earmarkText: money(0),
      earmarkProse: money(0),
    };
  }
  return {
    amount: a.spendable,
    amountText: money(a.spendable),
    tag: `${a.sharePct}% of what is left`,
    tone: 'good',
    // The figures in this sentence are context for the headline above it, so
    // they read short; the headline amountText stays exact.
    detail: `Your plan allocates ${a.sharePct}% of a normal month to discretionary spending. Applied to the ${prose(a.surplus)} available before payday, that is ${prose(a.spendable)}. The other ${prose(a.earmarkedSaving)} is held for saving${a.usingDefault ? ', using the starting 60/20/20 split until you set your own' : ''}.`,
    earmarkText: money(a.earmarkedSaving),
    earmarkProse: prose(a.earmarkedSaving),
  };
}
