import { PfaCardDisclosure } from './components/pfa-card-disclosure.jsx';

// Verification harness only - not part of the shipped app. Renders the
// vanilla native-<details> markup (copied verbatim from
// application/ui/decision-header.js buildCollapsibleCard's actual output
// shape) beside the new PfaCardDisclosure, same content, same surrounding
// .card CSS, so the two can be screenshotted side by side.
function VanillaCardDisclosure({ title, note, defaultOpen, children }) {
  return (
    <section className="card card-collapsible">
      <details className="disclosure card-disclosure" open={defaultOpen || undefined}>
        <summary className="card-disclosure-summary">
          <span className="card-title">{title}</span>
          {note ? <span className="card-disclosure-note muted small">{note}</span> : null}
        </summary>
        <div className="disclosure-body">{children}</div>
      </details>
    </section>
  );
}

const body = (
  <>
    <p>Fixed expenses, savings and free spending are worked out from a typical month.</p>
    <p>This is the body content every disclosure card shares, used to compare padding and line-height.</p>
  </>
);

export function AccordionComparison() {
  return (
    <div className="pfa-react-root" style={{ display: 'grid', gap: 16, maxWidth: 480, margin: '24px auto' }}>
      <p className="muted small" style={{ margin: 0 }}>Vanilla (native &lt;details&gt;)</p>
      <VanillaCardDisclosure title="Where your cash sits" note="3 accounts">
        {body}
      </VanillaCardDisclosure>
      <VanillaCardDisclosure title="Always open" defaultOpen>
        {body}
      </VanillaCardDisclosure>

      <p className="muted small" style={{ margin: '16px 0 0' }}>React (Radix Accordion)</p>
      <PfaCardDisclosure title="Where your cash sits" summary="3 accounts">
        {body}
      </PfaCardDisclosure>
      <PfaCardDisclosure title="Always open" alwaysOpen defaultOpen>
        {body}
      </PfaCardDisclosure>
    </div>
  );
}
