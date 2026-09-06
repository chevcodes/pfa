import * as React from 'react';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaPlanGroupEditor } from './pfa-plan-group-editor.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaPlanAssignments } from './pfa-plan-assignments.jsx';
import { PfaSavingsDestinations } from './pfa-savings-destinations.jsx';
import { PfaCategoryBudget } from './pfa-category-budget.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { rememberedOpen, rememberOpen } from '../../application/ui/collapsible-card-state.js';

export function PfaPlanLever({ classes, headerInfo, coverageNote, hiddenCharts, sortCount, onSort, totalLabel, totalBalanced, totalDisabled, onBalance, editor, editorProps, categoryBudgetProps, unsavedFlag, savedNote, draftNote, drawers, openDrawer, onToggleDrawer, onReset, onClear, onCancel, saveButton, unsaved, savedText, saveDisabled, saveLabel, saveTitle, onSave }) {
  const [editing, setEditing] = React.useState(() => !!editorProps?.focusGroup || !!unsaved);
  React.useEffect(() => { if (editorProps?.focusGroup) setEditing(true); }, [editorProps?.focusGroup]);
  const cancelEditing = async () => { await onCancel?.(); setEditing(false); };
  const [settingsOpen, setSettingsOpen] = React.useState(() => !!openDrawer || rememberedOpen('plan-budget-settings', false));
  React.useEffect(() => {
    if (openDrawer) {
      setSettingsOpen(true);
      rememberOpen('plan-budget-settings', true);
    }
  }, [openDrawer]);
  return (
    <div className={classes.sheet}>
      {hiddenCharts ? <PfaHiddenChart className="plan-private-comparison" what="Budget and category comparison" message="Show figures to compare a typical month with your plan, explore category spending, or edit your plan." height="112px" /> :
        <div className="plan-breakdown-body" data-editing={editing ? 'true' : 'false'}>
          <div className={`${classes.head} plan-comparison-intro`}>
            <div className="plan-head-context">
              <div className="plan-head-title">
                <h4>{editing ? 'Shape your plan' : 'Monthly view'}</h4>
                {editing ? <p>Divide your take-home across three priorities.</p> : null}
              </div>
            </div>
            <div className="plan-head-actions">
              {!editing ? <button className="btn sm ghost" type="button" onClick={() => { setSettingsOpen(false); rememberOpen('plan-budget-settings', false); setEditing(true); }}>Edit plan</button> : <button className="btn sm ghost" type="button" onClick={cancelEditing}>Cancel</button>}
            </div>
          </div>
          {editorProps ? <PfaPlanGroupEditor {...editorProps} onActionKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancelEditing(); } else editorProps.onActionKeyDown(event); }} editing={editing} /> : <VanillaBody node={editor} />}
          {editing ? <div className="budget-edit-actions">
            <span className={totalBalanced ? 'budget-edit-total is-balanced' : 'budget-edit-total'}>{totalLabel}</span>
            {!totalBalanced ? <button type="button" className={`btn sm ${classes.total} is-off is-fixable`} disabled={totalDisabled} onClick={onBalance}>Balance shares</button> : null}
            {(saveLabel === undefined || !saveDisabled || saveTitle !== 'No changes to save') ? saveLabel !== undefined ? <button className="btn primary" type="button" disabled={saveDisabled} title={saveTitle} onClick={onSave}>{saveLabel}</button> : <VanillaBody node={saveButton} /> : null}
          </div> : null}
          <div className="budget-utility-row">
            <span>Normal month estimate</span>
            <PfaInfoPopover label="How this works" content={headerInfo} />
            {coverageNote ? <PfaInfoPopover label="Limited data" content={coverageNote} tone="watch" /> : null}
            {sortCount ? <button className={`btn sm ghost ${classes.sort}`} type="button" onClick={onSort}>{`Sort ${sortCount} ${sortCount === 1 ? 'category' : 'categories'}`}</button> : null}
          </div>
          <div className="plan-followups">
            {!editing && categoryBudgetProps ? <PfaInlineDisclosure className="plan-category-disclosure" name="plan-category-breakdown" label={<span className="plan-next-step"><strong>Monthly categories</strong><span>Recorded purchases, limits and recent months</span></span>}>
              <div id="plan-category-budget-card" className="plan-category-within"><PfaCategoryBudget {...categoryBudgetProps} normalPlan /></div>
            </PfaInlineDisclosure> : null}
            <PfaInlineDisclosure className="plan-settings-disclosure" name="plan-budget-settings" label={<span className="plan-settings-label"><span className="plan-next-step"><strong>Plan tools</strong><span>Savings destinations, categories and defaults</span></span><span className={classes.status}>{saveLabel !== undefined ? <span className="plan-saved-note">{savedText}</span> : <><VanillaBody node={unsavedFlag} /><VanillaBody node={savedNote} /></>}</span></span>} open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); rememberOpen('plan-budget-settings', open); }}>
              <div className="plan-settings-body">
                <div className={classes.foot} role="group" aria-label="Plan actions and settings">
                  {draftNote ? <PfaInfoPopover content={draftNote} /> : null}
                  <div className={classes.triggers}>
                    {drawers.map((drawer) => {
                      const open = openDrawer === drawer.key;
                      return <button key={drawer.key} type="button" className={classes.trigger + (open ? ' is-open' : '') + (drawer.key === 'more' ? ' is-more' : '')} aria-expanded={open} aria-controls={drawer.key === 'more' ? 'plan-panel-more' : drawer.panelId} onClick={() => onToggleDrawer(drawer.key)}>{drawer.label}</button>;
                    })}
                  </div>
                  <div className={classes.panels} hidden={!openDrawer}>
                    {drawers.map((drawer) => drawer.key === 'more' ? (
                      <div className={classes.more} id="plan-panel-more" hidden={openDrawer !== drawer.key} key={drawer.key}>
                        <div className={classes.secondaryActions}>
                          <button className="btn sm ghost" type="button" onClick={onReset}>Reset to 60/20/20</button>
                          {onClear ? <button className="btn danger" type="button" onClick={onClear}>Clear plan</button> : null}
                        </div>
                      </div>
                    ) : <div hidden={openDrawer !== drawer.key} key={drawer.key}>{drawer.component ? <div className="plan-panel" id={drawer.panelId}>{drawer.component === 'savings' ? <PfaSavingsDestinations {...drawer.panelProps} /> : <PfaPlanAssignments key={drawer.panelProps.filter} {...drawer.panelProps} />}</div> : <VanillaBody node={drawer.panel} />}</div>)}
                  </div>
                </div>
              </div>
            </PfaInlineDisclosure>
          </div>
        </div>
      }
    </div>
  );
}
