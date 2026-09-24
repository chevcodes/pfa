import { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { PfaCardDisclosure } from './components/pfa-card-disclosure.jsx';
import { PfaInfoPopover } from './components/pfa-info-popover.jsx';
import { PfaDonutChart } from './components/pfa-donut-chart.jsx';
import { VanillaBody } from './vanilla-body.jsx';
import './styles/tailwind.css';
import './styles/pfa-card-disclosure.css';
import './styles/pfa-info-popover.css';
import './styles/pfa-donut-chart.css';

// The production entry point. Built as a single fixed-name ES module
// (see vite.config.js's build.lib) so a vanilla render file can
// `import('../react/pfa-react.js')` it directly, the same way
// index.html already dynamically imports application/sample-data/
// mock-personas.js - no bundler is involved on the calling side.
//
// One persistent React root per container (react.dev's multi-root
// createRoot() pattern), keyed by the container element itself. A vanilla
// render() call that runs again calls mountCollapsibleCard again on the
// same container; this reuses the existing root and lets React reconcile,
// rather than destroying and recreating it - which is what actually
// preserves open/closed state across a rebuild. The old CARD_OPEN_STATE
// map in application/ui/decision-header.js existed only to work around
// vanilla's rebuild-from-scratch model; a component that isn't destroyed
// doesn't need it re-implemented here.
const roots = new WeakMap();

export function mountCollapsibleCard(container, { title, summary, icon, hasExplain, alwaysOpen, compact, name, bodyNode }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  // icon, like bodyNode, is a raw DOM node (built by the vanilla `el()`
  // helper - the caller builds it exactly as collapsibleCard's own
  // `explain ? chartInfo(el, '', explain) : iconNode` does, since that
  // needs the vanilla helper, not a React one). React can't render a DOM
  // Node as a child directly, so it needs the same VanillaBody graft as
  // bodyNode, not a pass-through prop.
  root.render(
    <PfaCardDisclosure
      title={title}
      summary={summary}
      icon={icon ? <VanillaBody node={icon} /> : null}
      hasExplain={hasExplain}
      alwaysOpen={alwaysOpen}
      compact={compact}
      name={name}
      bare
    >
      <VanillaBody node={bodyNode} />
    </PfaCardDisclosure>
  );
}

export function unmountCollapsibleCard(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

export function mountInfoPopover(container, { label, content, tone }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  // content is one or more items - each is either a raw vanilla DOM node
  // (chartInfo(el, label, content, tone) built with el(), grafted the same
  // way bodyNode is above) or a plain string (React renders those
  // natively; VanillaBody's appendChild would throw on a non-Node).
  const nodes = Array.isArray(content) ? content : [content];
  root.render(
    <PfaInfoPopover
      label={label}
      tone={tone}
      content={nodes.map((n, i) =>
        n instanceof Node ? <VanillaBody key={i} node={n} /> : <Fragment key={i}>{n}</Fragment>
      )}
    />
  );
}

export function unmountInfoPopover(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

export function mountDonutChart(container, { label, segments, total, centre, money }) {
  if (!container) return;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<PfaDonutChart label={label} segments={segments} total={total} centre={centre} money={money} />);
}

export function unmountDonutChart(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}
