import * as React from 'react';
import { Input } from './ui/input.jsx';

export function PfaPlanWizard({ questions, observed, groups, targets, classes, step, money0, onSkip, onBack, onChoose, onDone }) {
  const [values, setValues] = React.useState(() => Object.fromEntries(groups.map((group) => [group.key, Number(targets[group.key]) || 0])));
  const total = questions.length + 1;
  const [sum, setSum] = React.useState(() => Object.values(values).reduce((amount, value) => amount + value, 0));
  const current = Math.min(step, total - 1);
  const seen = (observed || []).filter((group) => Number.isFinite(group.share)).map((group) => ({ label: group.label.toLowerCase(), pct: Math.round(group.share) }));
  const update = (key, value) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setSum(Math.round(Object.values(next).reduce((amount, item) => amount + (Number(item) || 0), 0) * 10) / 10);
  };

  return (
    <section className="card plan-wizard" role="dialog" aria-label="Set up my plan">
      <div className={classes.head}><h3>Set up my plan</h3><button className="btn sm ghost" type="button" onClick={onSkip}>Not now</button></div>
      <div className={classes.dots} aria-hidden="true">{Array.from({ length: total }, (_, index) => <i key={index} className={classes.dot + (index === current ? ' is-on' : index < current ? ' is-done' : '')} />)}</div>
      {step < questions.length ? (() => {
        const question = questions[step];
        return (
          <div className={classes.body}>
            <p className={classes.step}>{step + 1} of {total}</p>
            <h4 className={classes.question}>{question.name}</h4>
            <p className={classes.evidence}>{money0(question.typical)} a month · {question.because}</p>
            <div className={classes.picker} role="group" aria-label={`Group for ${question.name}`}>
              {groups.map((group) => <button key={group.key} type="button" className={'btn' + (question.answer === group.key ? ' primary' : ' ghost')} aria-pressed={question.answer === group.key} onClick={() => onChoose(question.name, group.key)}>{group.label}</button>)}
            </div>
          </div>
        );
      })() : (
        <div className={classes.body}>
          <p className={classes.step}>Last one</p>
          <h4 className={classes.question}>How should a normal month split?</h4>
          {seen.length ? <p className={classes.evidence}>Your months run at {[...seen.map((group) => `${group.pct}% ${group.label}`), ...(100 - seen.reduce((amount, group) => amount + group.pct, 0) >= 1 ? [`${100 - seen.reduce((amount, group) => amount + group.pct, 0)}% not spent`] : [])].join(' · ')}</p> : null}
          <div className={classes.targets}>
            {groups.map((group) => (
              <div className={classes.targetRow} key={group.key}>
                <i className={`proportion-key is-${group.key}`} aria-hidden="true" />
                <span className={classes.targetLabel}>{group.label}</span>
                <Input type="number" min="0" max="100" step="1" value={values[group.key]} className="plan-pct num" inputMode="numeric" aria-label={`${group.label} share`} onFocus={(event) => event.currentTarget.select()} onChange={(event) => update(group.key, Number(event.target.value))} />
                <span className="plan-pct-sign">%</span>
              </div>
            ))}
          </div>
          <div className={classes.totalRow}><span className={'plan-total' + (Math.abs(sum - 100) < 0.05 ? ' is-balanced' : ' is-off')}>{sum}%</span></div>
          <div className={classes.actions}><button className="btn primary" type="button" onClick={() => onDone(values)}>Done</button></div>
        </div>
      )}
      {step > 0 ? <div className={classes.foot}><button className="btn sm ghost" type="button" onClick={onBack}>Back</button></div> : null}
    </section>
  );
}
