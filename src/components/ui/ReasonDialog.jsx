import { useState } from "react";
import Modal from "./Modal";
import { useUnsavedChanges } from "./UnsavedChanges";

export default function ReasonDialog({ title, text, busy = false, onClose, onConfirm, confirmText = "Confirm" }) {
  const [reason, setReason] = useState("");
  const markSaved = useUnsavedChanges(reason);
  return <Modal title={title} busy={busy} onClose={onClose}><p className="ws-notice">{text}</p><form onSubmit={async (event) => { event.preventDefault(); if (!busy) { markSaved(); await onConfirm(reason.trim()); } }}>
    <label className="ws-field">Reason<textarea required minLength={3} maxLength={1000} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="This explanation will be shared with the affected people. Avoid private medical or legal details." /></label>
    <div className="ws-actions"><button type="submit" className="ws-link" disabled={busy}>{busy ? "Saving…" : confirmText}</button><button type="button" className="ws-link secondary" disabled={busy} onClick={onClose}>Keep unchanged</button></div>
  </form></Modal>;
}
