import * as React from 'react';
import { PfaCardDisclosure } from './pfa-card-disclosure.jsx';
import { PfaSettingsFold } from './pfa-settings-fold.jsx';

export function PfaSettingsCard({ summary, iconMarkup, sections, defaultOpen, onOpenChange }) {
  return <PfaCardDisclosure bare title="Data & settings" summary={summary} icon={<span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} />} name="data-settings" foldAll={false} defaultOpen={defaultOpen} onOpenChange={onOpenChange}><div className="sec-manage-wrap">{sections.map((section) => <PfaSettingsFold key={section.id} {...section} />)}</div></PfaCardDisclosure>;
}

export const PfaSettingsCardHost = React.forwardRef(function PfaSettingsCardHost({ settings }, ref) {
  return <div ref={ref} className="card card-collapsible secondary pfa-react-root" id="data-settings" data-fold-all="false"><PfaSettingsCard {...settings} /></div>;
});
