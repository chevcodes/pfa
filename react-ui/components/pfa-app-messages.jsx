import { VanillaBody } from '../vanilla-body.jsx';

export function PfaAppBanner({ iconNode, iconMarkup, message, actions }) {
  return (
    <>
      {iconMarkup ? <span className="install-icon" dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : <VanillaBody node={iconNode} />}
      <span>{message}</span>
      {actions.map((action, index) => (
        <button className={action.className} onClick={action.onClick} key={`${action.label}-${index}`}>
          {action.label}
        </button>
      ))}
    </>
  );
}

export function PfaGreeting({ text, heading, subtext, iconNode, iconMarkup, onDismiss }) {
  return (
    <>
      {heading ? (
        <div className="greeting-body">
          <span className="greeting-heading">{heading}</span>
          <p className="muted small greeting-sub">{subtext}</p>
        </div>
      ) : (
        <span className="greeting-text">{text}</span>
      )}
      <button className="btn sm ghost greeting-dismiss" aria-label="Dismiss" onClick={onDismiss}>
        {iconMarkup ? <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconMarkup }} /> : <VanillaBody node={iconNode} />}
      </button>
    </>
  );
}
