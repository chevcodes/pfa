import * as React from 'react';
import { PfaSafetyBoundaryForm } from './pfa-safety-boundary-form.jsx';
import { PfaGoalForm } from './pfa-goal-form.jsx';
import { PfaTargetBar } from './pfa-target-bar.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { VanillaBody } from '../vanilla-body.jsx';

export function PfaGoalProgress({ emptyIntro, goalFormProps, fallback, goalPresentation, caveat, caveatNode, savedNote, rebasedMessage, cashMessage, planLink, planNoteClass, guardDetail, boundaryStatus, boundaryDraftKind, boundaryDraftValue, boundaryReturnFocus, manageReturnFocus, changeBoundaryLabel, onStartBoundary, onBoundaryKindChange, onBoundaryCancel, onBoundarySave, onBoundaryClear, onBoundaryInvalid, onManageGoal }) {
  const boundaryButtonRef = React.useRef(null);
  const manageButtonRef = React.useRef(null);
  React.useEffect(() => {
    if (boundaryReturnFocus) boundaryButtonRef.current?.focus({ preventScroll: true });
    if (manageReturnFocus) manageButtonRef.current?.focus({ preventScroll: true });
  }, [boundaryReturnFocus, manageReturnFocus]);
  if (emptyIntro) {
    return (
      <div className="goal-empty">
        <p className="goal-intro">{goalFormProps.draftType ? 'Set the target for your goal.' : emptyIntro}</p>
        <PfaGoalForm {...goalFormProps} />
      </div>
    );
  }
  if (goalFormProps) {
    return <div className="goal-progress"><PfaGoalForm {...goalFormProps} /></div>;
  }
  return (
    <div className="goal-progress">
      {fallback !== null ? (
        <section className="goal-readout goal-readout--limited" aria-label={goalPresentation.title}>
          <div className="goal-readout-heading">
            <h3 className="goal-readout-title">{goalPresentation.title}</h3>
            <span className="tag tone-neutral">{goalPresentation.status}</span>
          </div>
          <p className="goal-readout-context">{fallback}</p>
          <p className="goal-readout-note">There is not yet enough data to judge this goal.</p>
        </section>
      ) : (
        <>
          <section className={`goal-readout goal-readout--${goalPresentation.type}`} aria-label={goalPresentation.title}>
            <div className="goal-readout-heading">
              <h3 className="goal-readout-title">{goalPresentation.title}</h3>
              <span className={`tag tone-${goalPresentation.tone || 'neutral'}`}>{goalPresentation.status}</span>
            </div>
            <div className={'goal-readout-measure' + (goalPresentation.meter ? '' : ' is-single')}>
              <div className="goal-readout-main">
                <span className="goal-readout-label">{goalPresentation.valueLabel}</span>
                {goalPresentation.value ? <div className="goal-readout-value metric-value metric--major">{goalPresentation.value}</div> : null}
                <p className="goal-readout-context">{goalPresentation.context}</p>
              </div>
              {goalPresentation.meter ? (
                <div className="goal-readout-meter" role="img" aria-label={goalPresentation.meter.label}>
                  <PfaTargetBar {...goalPresentation.meter} />
                </div>
              ) : null}
            </div>
            {rebasedMessage ? <p className="goal-readout-note">Target basis changed</p> : null}
            {caveat ? <p className="goal-readout-note">Limited statement history</p> : null}
          </section>
          <PfaInlineDisclosure className="explainer goal-safety-explainer" name="plan-goal-details" label="Details & safety">
            <div className="disclosure-body goal-details">
              {guardDetail ? <p>{guardDetail}</p> : null}
              {caveat ? <p>{caveat}</p> : caveatNode ? <VanillaBody node={caveatNode} /> : null}
              {rebasedMessage ? <p>{rebasedMessage}</p> : null}
              {cashMessage ? <p>{cashMessage}</p> : null}
              {savedNote ? <p>{savedNote}</p> : null}
              {planLink ? <p className={planNoteClass}>{planLink}</p> : null}
              {boundaryStatus ? <p>{boundaryStatus}</p> : null}
              {boundaryDraftKind !== null ? <PfaSafetyBoundaryForm draftKind={boundaryDraftKind} initialValue={boundaryDraftValue} onSelect={onBoundaryKindChange} onCancel={onBoundaryCancel} onSave={onBoundarySave} onClear={onBoundaryClear} onInvalid={onBoundaryInvalid} /> : changeBoundaryLabel ? (
                <div className="goal-safety-action">
                  <button ref={boundaryButtonRef} type="button" className="btn sm ghost" onClick={onStartBoundary}>{changeBoundaryLabel}</button>
                </div>
              ) : null}
            </div>
          </PfaInlineDisclosure>
        </>
      )}
      <div className="goal-actions">
        <button ref={manageButtonRef} type="button" className="btn sm" onClick={onManageGoal}>Manage goal</button>
      </div>
    </div>
  );
}
