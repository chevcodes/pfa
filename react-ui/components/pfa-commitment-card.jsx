import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { PfaCommitmentRows } from './pfa-commitment-rows.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaCommitmentTimeline } from './pfa-commitment-timeline.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';

export function PfaCommitmentCard({ iconNode, explain, summary, items, lapsedItems, timelineDisclosure, timeline, defaultOpen, onOpenChange }) {
  return (
    <PfaCardDisclosure bare title="Fixed expenses" icon={explain ? <PfaInfoPopover content={explain} /> : <VanillaBody node={iconNode} />} summary={summary} name="activity-commitments" hasExplain defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PfaCommitmentRows rows={items} />
      {timeline ? <PfaInlineDisclosure name="activity-commitments-timing" label="When payments usually leave" className="commit-timing"><div className="disclosure-body">{timeline.hidden ? <PfaHiddenChart what="When fixed expenses land" height="150px" /> : <div className="commit-when" role="group" aria-label="When fixed expenses land" data-proportional=""><PfaCommitmentTimeline {...timeline} /></div>}</div></PfaInlineDisclosure> : timelineDisclosure ? <VanillaBody node={timelineDisclosure} /> : null}
      {lapsedItems.length ? (
        <PfaInlineDisclosure name="activity-commitments-lapsed" label={`May have ended (${lapsedItems.length})`}>
          <div className="disclosure-body">
            <p className="muted small" style={{ marginTop: 0 }}>These recurred before but have not charged recently.</p>
            <PfaCommitmentRows rows={lapsedItems} />
          </div>
        </PfaInlineDisclosure>
      ) : null}
    </PfaCardDisclosure>
  );
}
