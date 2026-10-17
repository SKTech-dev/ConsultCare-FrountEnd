import { useEffect, useState } from "react";
import { MessageOverlay } from "./MessageBox";

export default function ErrorNotice({ error, onRetry }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [error]);
  if (!error) return null;
  return <><p className="ws-notice" role="alert">{error} {onRetry && <button className="underline" onClick={() => { setDismissed(false); onRetry(); }}>Retry</button>}</p>
    {!dismissed && <MessageOverlay type="error" text={error} onClose={() => setDismissed(true)} />}
  </>;
}
