/*
 * react-bridge.js - the ONE seam between vanilla render files and the new
 * React rendering layer (react-ui/, built to application/ui/react-dist/).
 * Every call site migrating a collapsibleCard to PfaCardDisclosure goes
 * through this same function, so there is exactly one place that knows how
 * to load the React bundle and graft vanilla-built DOM into it - never a
 * second, drifting copy per call site (README's "reuse, don't duplicate").
 *
 * Mirrors application/ui/decision-header.js's collapsibleCard(el, {...})
 * signature and return contract (a DOM node, returned synchronously) so a
 * call site can switch between the two by changing only the function name.
 * The container returns immediately, empty; the React module (already
 * fetched by the browser/Electron's module cache after the first call, so
 * this resolves same-tick on every render after the first) fills it in
 * once loaded.
 */
import { chartInfo } from './decision-header.js';

let modulePromise = null;
function loadReactModule() {
  if (!modulePromise) modulePromise = import('./react-dist/pfa-react.js');
  return modulePromise;
}

export function collapsibleCardReact(el, { title, summary, icon: iconNode, explain, body, name, alwaysOpen = false, compact = false }) {
  const kids = (Array.isArray(body) ? body : [body]).filter(Boolean);
  if (!kids.length) return null;
  if (summary == null || (typeof summary === 'string' && !summary.trim()))
    throw new Error(`collapsibleCardReact "${String(title || '')}" requires a closed-state summary`);
  for (const kid of kids) {
    if (kid && kid.classList && kid.classList.contains('card')) kid.classList.remove('card');
  }
  const bodyNode = kids.length === 1 ? kids[0] : el('div', {}, ...kids);
  // Mirrors collapsibleCard's own `explain ? chartInfo(el, '', explain) :
  // iconNode` branch exactly - building the popover needs the vanilla el()
  // helper, so it happens here, in vanilla code, same as the original.
  const head = explain ? chartInfo(el, '', explain) : iconNode || null;

  // This element IS the returned "card" - matching collapsibleCard's own
  // contract exactly, including letting a call site mutate it afterward
  // (card.classList.add(...), card.id = ...), the same way several already
  // do with collapsibleCard's real <details> return value. mountCollapsibleCard
  // passes { bare: true } to PfaCardDisclosure so it doesn't render a
  // second, nested .card.card-collapsible section inside this one.
  const container = el('div', {
    class: 'card card-collapsible pfa-react-root' + (compact ? ' card-compact' : ''),
    ...(name ? { id: name, tabindex: '-1' } : {}),
  });
  loadReactModule().then(({ mountCollapsibleCard }) => {
    mountCollapsibleCard(container, { title, summary, icon: head, hasExplain: !!explain, alwaysOpen, compact, name, bodyNode });
  });
  return container;
}
