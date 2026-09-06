import * as React from 'react';
import { screenReaderFigure } from '../../application/core/shared-helpers.js';
import { PfaInfoPopover } from './pfa-info-popover.jsx';
import { PfaDonutChart } from './pfa-donut-chart.jsx';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { VanillaBody } from '../vanilla-body.jsx';
import { PfaPositionEquation } from './pfa-position-equation.jsx';
import { PfaPlanWhy } from './pfa-plan-why.jsx';
import { PfaProportionBar } from './pfa-proportion-bar.jsx';

function SupportMetric({ item }) {
  const content = (
    <>
      <span className="metric-value">{item.text}</span>
      {item.label ? <span className="metric-label">{item.label}</span> : null}
      {item.tag ? <span className={`tag tone-${item.tone || 'neutral'}`}>{item.tag}</span> : null}
    </>
  );
  return (
    <div className={`metric metric--minor${item.onClick ? ' is-linked' : ''}`}>
      {item.onClick ? <button type="button" id={item.id} className="metric-open bleed" title={item.goesTo} aria-label={`${item.label || item.text}: ${item.goesTo}`} onClick={item.onClick}>{content}</button> : content}
      {item.detail ? <p className="metric-detail">{item.detail}</p> : null}
      {item.actionModel ? <div className="metric-actions"><button type="button" className="btn sm ghost" onClick={item.actionModel.onClick}>{item.actionModel.label}</button></div> : item.action ? <div className="metric-actions">{item.action}</div> : null}
    </div>
  );
}

function TraceControl({ model }) {
  if (model.type === 'stale') return <button type="button" className="tag asof-trace is-stale" aria-label={model.ariaLabel} onClick={model.onClick}>{model.label}</button>;
  return <PfaInfoPopover label={model.label} content={model.content} tone={model.tone} />;
}

function SaveStatusTag({ store }) {
  const status = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <span className={`tag plan-save-tag tone-${status.tone}`} data-save-state={status.state} hidden={!status.label}>{status.label}</span>;
}

export function PfaDecisionSurface({ id, question, figure, meaning, secondaryMetric, tags = [], saveStatusStore, note, trace, traceModel, support = [], supportLabel, supportOpen, why = [], whyItems = [], whyLabel, footerAction, extra, extraChart, extraHidden, extraHiddenHeight = '190px', extraEquation, extraProportion, extraAside, extraBeforeFooter, extraDisclosure = false }) {
  const spoken = screenReaderFigure(question ? `${question}: amount hidden` : 'Amount hidden');
  const extraContent = extraHidden ? <PfaHiddenChart what={extraHidden} height={extraHiddenHeight} /> : extraChart ? <PfaDonutChart {...extraChart} /> : extraEquation ? <PfaPositionEquation rows={extraEquation} /> : extraProportion ? <div className="proportion" role="group" aria-label={extraProportion.spec.label} data-proportional=""><PfaProportionBar {...extraProportion} /></div> : extra ? <VanillaBody node={extra} /> : null;
  const supportDisclosure = support.length > 0 && !supportOpen;
  const extraDisclosureOpen = extraDisclosure && !!extraContent;
  const header = (
    <div className="dh">
      <h2 className="dh-question">{question}</h2>
      <div className="dh-figure metric-value metric--hero">
        {spoken ? <span className="visually-hidden">{spoken}</span> : null}
        <span aria-hidden={spoken ? 'true' : undefined}>{figure}</span>
      </div>
      {meaning ? <p className="dh-meaning">{meaning}</p> : null}
      {secondaryMetric ? <button type="button" id={id && `${id}-secondary`} className="dh-secondary-metric" onClick={secondaryMetric.onClick}>
        <strong className="num">{secondaryMetric.figure}</strong>
        <span>{secondaryMetric.label} <span aria-hidden="true">›</span></span>
      </button> : null}
      {tags.length || trace || traceModel || saveStatusStore ? (
        <div className="dh-status">
          {tags.map((tag, index) => tag.detail ? (
            <PfaInfoPopover key={`${tag.text}-${index}`} label={tag.text} tone={tag.tone} content={(Array.isArray(tag.detail) ? tag.detail : [tag.detail]).map((line, lineIndex) => <p key={lineIndex}>{line}</p>)} />
          ) : <span key={`${tag.text}-${index}`} className={`tag tone-${tag.tone || 'neutral'}`}>{tag.text}</span>)}
          {saveStatusStore ? <SaveStatusTag store={saveStatusStore} /> : null}
          {traceModel ? <TraceControl model={traceModel} /> : trace ? <VanillaBody node={trace} /> : null}
        </div>
      ) : null}
      {note?.text ? <p className={`dh-note tone-${note.tone || 'neutral'}`}>{note.text}{note.action ? <button type="button" className="btn sm ghost dh-note-action" onClick={note.action.onClick}>{note.action.label} <span aria-hidden="true">›</span></button> : null}</p> : null}
    </div>
  );

  const main = (
    <>
      {header}
      {supportOpen && support.length ? <div className="dh-support">{support.map((item, index) => <SupportMetric key={`${item.label}-${index}`} item={item} />)}</div> : null}
      {extraContent && extraBeforeFooter ? extraContent : null}
    </>
  );

  return (
    <>
      {extraContent && extraAside ? <div className="dh-layout"><div className="dh-main">{main}</div><div className="dh-aside">{extraContent}</div></div> : main}
      {why.length || whyItems.length || supportDisclosure || extraDisclosureOpen ? (
        <div className="dh-footer">
          {why.length || whyItems.length ? <PfaInlineDisclosure label={whyLabel || 'Why'} className="dh-why" name={id && `${id}-why`}><div className="disclosure-body">{whyItems.length ? <PfaPlanWhy items={whyItems} /> : why.map((line, index) => typeof line === 'string' ? <p key={index}>{line}</p> : <p key={index} className={line.className}>{line.text}</p>)}</div></PfaInlineDisclosure> : null}
          {footerAction ? <button type="button" id={footerAction.id} className="fold-all-btn" onClick={footerAction.onClick}>{footerAction.label}</button> : null}
          {supportDisclosure || extraDisclosureOpen ? <PfaInlineDisclosure label={supportLabel || 'How this is worked out'} className="dh-support-why" name={id && `${id}-support`}><div className="disclosure-body">{supportDisclosure ? <div className="dh-support">{support.map((item, index) => <SupportMetric key={`${item.label}-${index}`} item={item} />)}</div> : null}{extraDisclosureOpen ? extraContent : null}</div></PfaInlineDisclosure> : null}
        </div>
      ) : null}
      {extraContent && !extraAside && !extraBeforeFooter && !extraDisclosure ? extraContent : null}
    </>
  );
}
