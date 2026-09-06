import * as React from 'react';
import { Input } from './ui/input.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaTargetBar } from './pfa-target-bar.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';

export function PfaPlanGroupEditor({ groups, takeHome, initialTargets, selectedGroupKey, onSelectGroup, focusGroup, prose, money, drawdown, tolerance, classes, actualLabel, planLabel, actualLabelText, planLabelText, onDraftChange, onActionKeyDown, onOpenGroup, onControls, editing = false }) {
  const [targets, setTargets] = React.useState(initialTargets);
  const [activeKey, setActiveKey] = React.useState(() => selectedGroupKey || groups[0]?.key);
  const values = React.useRef(targets);
  const inputs = React.useRef({});

  const update = (next) => {
    values.current = next;
    setTargets(next);
    onDraftChange(Object.fromEntries(Object.entries(next).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])));
  };

  React.useEffect(() => {
    onControls({
      getTargets: () => values.current,
      setTargets: update,
      inputs: inputs.current,
    });
  }, []);

  React.useEffect(() => {
    if (selectedGroupKey && groups.some((group) => group.key === selectedGroupKey)) setActiveKey(selectedGroupKey);
  }, [selectedGroupKey, groups]);

  React.useEffect(() => {
    if (editing && focusGroup && inputs.current[focusGroup]) {
      inputs.current[focusGroup].focus();
      inputs.current[focusGroup].select();
    }
  }, [editing, focusGroup]);

  if (!groups.length) return null;

  const chooseGroup = (key) => {
    setActiveKey(key);
    onSelectGroup?.(key);
  };
  const selected = groups.find((group) => group.key === activeKey) || groups[0];
  const sources = selected.sources || [];
  const sourceScale = Math.max(selected.actual, ...sources.map((source) => source.amount));
  const selectedTone = (selected.key === 'setAside' && selected.direction === 'under') || (selected.key !== 'setAside' && selected.direction === 'over') ? 'watch' : selected.direction === 'on' || (selected.key === 'setAside' && selected.direction === 'over') ? 'on' : 'quiet';

  if (!editing) return (
    <div className={`budget-story is-${selectedTone}`}>
      <div className="budget-story-main">
        <div className="budget-story-message">
          <span className="plan-section-kicker">{selected.label}</span>
          <h4 aria-live="polite">{selected.direction === 'on' ? 'On plan' : `${selected.trackText} plan`}</h4>
        </div>
        <div className="budget-story-pair" aria-label={`${selected.label}: plan ${money(selected.targetAmount)}, typical month ${money(selected.actual)}`}>
          <div><span>In your plan</span><strong className="money num">{money(selected.targetAmount)}</strong></div>
          <div><span>Typical month</span><strong className="money num">{money(selected.actual)}</strong></div>
        </div>
      </div>
      <div className="budget-story-switcher" role="group" aria-label="Choose a part of the plan">
        {groups.map((group) => <button type="button" key={group.key} className={`budget-story-choice is-${group.key}`} aria-pressed={selected.key === group.key} onClick={() => chooseGroup(group.key)}>
          <i className={`proportion-key is-${group.key}`} aria-hidden="true" />
          <span>{group.label}</span>
          <small>{group.direction === 'on' ? 'On plan' : group.direction === 'over' ? 'Above plan' : 'Below plan'}</small>
        </button>)}
      </div>
      {sources.length ? <PfaInlineDisclosure className="budget-story-sources plan-source-disclosure" name={`plan-band-sources-${selected.key}`} label={`What makes up ${selected.label.toLowerCase()}`}>
        <div className="disclosure-body">
          <div className="plan-workings">
            {sources.map((source) => <div className="plan-source-item" key={source.label}>
              <div className="plan-working"><span>{source.label}</span><span className="money num">{money(source.amount)}</span></div>
              {source.amount > 0 ? <PfaTargetBar actual={source.amount} scaleMax={sourceScale} tone={selected.key} /> : null}
            </div>)}
            <div className="plan-working plan-source-total"><span>Shown in this band</span><strong className="money num">{money(selected.actual)}</strong></div>
          </div>
          {selected.key === 'setAside' && drawdown > 0 ? <p className="muted small">{money(drawdown)} more came back out than went in, so this band is shown as zero.</p> : null}
          <button type="button" id={`plan-group-${selected.key}-open`} className="linkbtn" onClick={() => onOpenGroup(selected.key)}>Edit card category assignments</button>
        </div>
      </PfaInlineDisclosure> : null}
    </div>
  );

  return (
    <div className={`${classes.groups} plan-comparison budget-target-editor`} role="group" aria-label="Plan target shares">
      {groups.map((group) => {
        const target = Number(targets[group.key]) || 0;
        const amount = (takeHome * target) / 100;
        const diff = group.actual - amount;
        const onTarget = Math.abs(diff) < tolerance;
        return <div className={`${classes.row} is-${group.key}`} key={group.key}>
          <div className={classes.rowTop}>
            <label className={classes.rowName} htmlFor={`plan-share-${group.key}`}>
              <i className={`proportion-key is-${group.key}`} aria-hidden="true" />
              <span className={classes.rowLabel}>{group.label}</span>
            </label>
            <span className={classes.rowShare}>
              <Input
                ref={(node) => { inputs.current[group.key] = node; }}
                id={`plan-share-${group.key}`}
                type="number"
                min="0"
                max="100"
                step="1"
                value={String(targets[group.key] ?? 0)}
                className={`${classes.pct} num`}
                inputMode="numeric"
                aria-label={`${group.label} target share of take-home`}
                title="Enter saves · Esc reverts · Shift+arrows step by 5"
                data-group={group.key}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => update({ ...values.current, [group.key]: event.currentTarget.value })}
                onBlur={(event) => {
                  const raw = String(event.currentTarget.value).trim();
                  const value = Number(raw);
                  if (raw === '' || !Number.isFinite(value) || value < 0 || value > 100) update({ ...values.current, [group.key]: Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) });
                }}
                onKeyDown={(event) => {
                  if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                    event.preventDefault();
                    const current = Number(event.currentTarget.value) || 0;
                    const next = event.key === 'ArrowUp' ? current + 5 : current - 5;
                    update({ ...values.current, [group.key]: Math.max(0, Math.min(100, next)) });
                  } else if (event.key === 'Enter' || event.key === 'Escape') {
                    onActionKeyDown(event);
                  }
                }}
              />
              <span className={classes.pctSign}>%</span>
            </span>
          </div>
          <div className={`${classes.track}${onTarget ? ' is-on' : diff > 0 ? ' is-over' : ' is-under'}`}>
            {onTarget ? 'On plan' : `${prose(Math.abs(diff))} ${diff > 0 ? 'over' : 'under'} plan`}
          </div>
          <PfaTargetBar actual={group.actual} target={amount} tone={group.key} />
          <div className={classes.rowFoot}>
            <span className={classes.targetAmount}><span className={classes.amountLabel}>{planLabelText || <VanillaBody node={planLabel()} />}</span><strong className="money num">{prose(amount)}</strong></span>
            <span className={classes.rowActual}><span className={classes.amountLabel}>{actualLabelText || <VanillaBody node={actualLabel()} />}</span><strong className="money num">{group.actualText}</strong></span>
          </div>
        </div>;
      })}
    </div>
  );
}
