import * as React from 'react';

export function PfaImportProgress({ files, statuses }) {
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="picker wide" role="dialog" aria-modal="true" aria-labelledby="import-progress-title" tabIndex={-1} ref={dialogRef}>
      <div className="picker-head" id="import-progress-title">
        Adding {files.length} statement{files.length === 1 ? '' : 's'}
      </div>
      {files.length >= 3 || files.some((file) => (file.size || 0) > 1500000) ? (
        <p className="muted small prog-privacy">A larger import can take a moment. It will finish on its own.</p>
      ) : null}
      <div className="prog-list">
        {files.map((file, index) => {
          const status = statuses[index] || { kind: 'waiting' };
          return (
            <div className="prog-row" id={`prog-${index}`} key={`${file.name}-${index}`}>
              <span className="prog-name">{file.name}</span>
              <span className="prog-status" role="status" aria-live="polite">
                {status.kind === 'reading' ? <><span className="spin" aria-hidden="true" /> Reading…</> : null}
                {status.kind === 'done' ? <span className="ok">✓ {status.added || 0} added</span> : null}
                {status.kind === 'duplicate' ? <span className="muted">Already imported</span> : null}
                {status.kind === 'reconwarn' ? <span className="warnc">Added · check balance</span> : null}
                {status.kind === 'partial' ? <span className="warnc">Added · part could not be read</span> : null}
                {status.kind === 'failed' ? <span className="warnc">Couldn't read - try another copy</span> : null}
                {status.kind === 'waiting' ? 'Waiting' : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
