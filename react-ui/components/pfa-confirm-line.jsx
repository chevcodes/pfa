export function PfaConfirmLine({ label, current, yes, no, onAnswer }) {
  return (
    <>
      <span className="confirm-line-label">{label}</span>
      <span className="confirm-pair">
        <button className="vm-tag confirm-chip" type="button" title={yes.title} aria-pressed={current === true} onClick={() => onAnswer(true)}>{yes.label}</button>
        <button className="vm-tag confirm-chip" type="button" title={no.title} aria-pressed={current === false} onClick={() => onAnswer(false)}>{no.label}</button>
      </span>
    </>
  );
}
