import * as React from 'react';

export function PfaManageDataDialog({ kind, heading, rows = [], removalMessage, onClose, onClear }) {
  const [keepRules, setKeepRules] = React.useState(true);
  const [pendingRemovalKey, setPendingRemovalKey] = React.useState(null);
  const [restoreFocusKey, setRestoreFocusKey] = React.useState(null);
  const removeTriggerRefs = React.useRef(new Map());
  const confirmButtonRef = React.useRef(null);

  React.useEffect(() => {
    if (pendingRemovalKey) confirmButtonRef.current?.focus();
    else if (restoreFocusKey) {
      removeTriggerRefs.current.get(restoreFocusKey)?.focus();
      setRestoreFocusKey(null);
    }
  }, [pendingRemovalKey, restoreFocusKey]);

  if (kind === 'clear') {
    return (
      <>
        <div className="picker-head">Clear all data on this device?</div>
        <p className="muted small">This removes every transaction and statement from this device, so you will need to re-import your PDFs to rebuild. Export rules or Export history first if you want to keep your work.</p>
        <div className="picker-scope">
          <label className="scope">
            <input type="checkbox" checked={keepRules} onChange={(event) => setKeepRules(event.currentTarget.checked)} />
            Keep my category rules
          </label>
        </div>
        <div className="picker-actions">
          <button className="btn sm ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn sm danger" type="button" onClick={() => onClear(keepRules)}>Clear all data</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="picker-head">{heading}</div>
      <p className="muted small">{removalMessage}</p>
      <div className="picker-list">
        {rows.map((row) => {
          const pending = pendingRemovalKey === row.key;
          const subject = row.actionLabel === 'Remove file' ? 'file' : 'statement';
          return (
            <div className={'stmt-row' + (row.notes.length ? ' has-note' : '')} key={row.key}>
              <div className="stmt-body">
                <div className="strong">{row.title}</div>
                <div className="muted small">{row.summary}</div>
                {row.notes.map((note, index) => <div className="stmt-note-line small" key={`${row.key}-note-${index}`}>{note}</div>)}
                {pending && (
                  <div className="stmt-remove-confirm" role="group" aria-label={`Confirm ${row.actionLabel.toLowerCase()}`}>
                    <div className="strong">{'Remove this ' + subject + '?'}</div>
                    <p className="muted small" id="statement-removal-confirmation">{row.confirmationMessage}</p>
                    <div className="stmt-remove-actions">
                      <button className="btn sm ghost" type="button" onClick={() => { setRestoreFocusKey(row.key); setPendingRemovalKey(null); }}>Cancel</button>
                      <button className="btn sm danger" type="button" aria-describedby="statement-removal-confirmation" aria-label={`${row.actionLabel}: ${row.title}`} ref={confirmButtonRef} onClick={row.onRemove}>{row.actionLabel}</button>
                    </div>
                  </div>
                )}
              </div>
              <button
                className="btn sm danger"
                type="button"
                hidden={pending}
                aria-label={`${row.actionLabel}: ${row.title}. ${row.summary}`}
                ref={(node) => {
                  if (node) removeTriggerRefs.current.set(row.key, node);
                  else removeTriggerRefs.current.delete(row.key);
                }}
                onClick={() => { setRestoreFocusKey(null); setPendingRemovalKey(row.key); }}
              >
                {row.actionLabel}
              </button>
            </div>
          );
        })}
      </div>
      <div className="picker-actions">
        <button className="btn sm ghost" type="button" onClick={onClose}>Close</button>
      </div>
    </>
  );
}
