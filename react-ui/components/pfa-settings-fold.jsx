import * as React from 'react';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaSubhead } from './pfa-subhead.jsx';
import { PfaSettingsRules } from './pfa-settings-rules.jsx';
import { PfaSettingsStatements } from './pfa-settings-statements.jsx';
import { PfaSettingsAccounts } from './pfa-settings-accounts.jsx';

function SettingsStartOver({ clearText, onClear }) {
  return <><p className="muted small">{clearText}</p><div className="manage-actions"><button type="button" className="btn sm danger" onClick={onClear}>Clear all data</button></div></>;
}

function SettingsProfile({ firstName, onSave, onShare }) {
  const nameRef = React.useRef(null);
  const save = () => onSave(nameRef.current?.value || '');
  return <>
    <div className="sec-section sec-name"><PfaSubhead title="Your name" explain="Shown only to greet you when you open the app. It never leaves this device. Leave it blank to be greeted without a name." actions={<div className="manage-actions"><input ref={nameRef} type="text" className="name-field" maxLength={40} defaultValue={firstName} placeholder="Not set" aria-label="Your first name" onFocus={(event) => event.currentTarget.select()} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save(); } }} /><button type="button" className="btn sm" onClick={save}>Save name</button></div>} /></div>
    <div className="sec-section settings-privacy"><PfaSubhead title="Privacy" explain="Your statements, corrections and settings stay on this device." actions={<button type="button" className="btn sm ghost" onClick={onShare}>Share unrecognised places</button>} /></div>
  </>;
}

export function PfaSettingsFold({ id, title, meta, danger, reactBody, defaultOpen, onOpenChange }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const hostRef = React.useRef(null);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.openSettingsFold = () => { setOpen(true); onOpenChange(true); };
    return () => { delete host.openSettingsFold; };
  }, [onOpenChange]);

  return <div ref={hostRef} id={id} className={'sec-fold' + (danger ? ' is-danger' : '')}><PfaInlineDisclosure className="settings-fold-disclosure" open={open} onOpenChange={(next) => { setOpen(next); onOpenChange(next); }} label={<><span className="sec-fold-title">{title}</span>{meta ? <span className="sec-fold-meta">{meta}</span> : null}</>}><div className="disclosure-body sec-fold-body">{reactBody?.kind === 'startOver' ? <SettingsStartOver {...reactBody.props} /> : reactBody?.kind === 'profile' ? <SettingsProfile {...reactBody.props} /> : reactBody?.kind === 'rules' ? <PfaSettingsRules {...reactBody.props} /> : reactBody?.kind === 'accounts' ? <PfaSettingsAccounts {...reactBody.props} /> : reactBody?.kind === 'statements' ? <PfaSettingsStatements {...reactBody.props} /> : null}</div></PfaInlineDisclosure></div>;
}
