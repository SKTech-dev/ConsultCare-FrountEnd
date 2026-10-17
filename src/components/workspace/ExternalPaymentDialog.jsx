import { useState } from "react";
import Modal from "../ui/Modal";
import { MessageOverlay } from "../ui/MessageBox";
import { useConfirmLeave, useUnsavedChanges } from "../ui/UnsavedChanges";
import { callApi } from "../../api/apiClient";
import { money } from "../../features/consultations/model";

export default function ExternalPaymentDialog({ title, amount, endpoint, onClose, onSaved, sandbox = false }) {
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const markSaved = useUnsavedChanges({ reference, paidAt, confirmed });
  const confirmLeave = useConfirmLeave();
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await callApi("POST", endpoint, { amount: String(amount), reference, paidAt: new Date(paidAt).toISOString(), confirmed });
      markSaved(); onSaved();
    } catch (failure) { setError(failure.message || "Could not record the payment."); }
    finally { setBusy(false); }
  }
  return <Modal title={title} busy={busy} onClose={() => confirmLeave(onClose)}>
    <p className="ws-notice">{sandbox ? "Record a sandbox settlement to test the monthly payout workflow. No real transfer is required or recorded." : "Record a payment already completed outside ConsultCare. This application will not transfer money."}</p>
    <form onSubmit={submit}><p className="my-4">Amount: <strong>{money(amount)}</strong></p><fieldset disabled={busy}>
      <label className="ws-field">Bank / provider reference<input required minLength={3} maxLength={255} value={reference} onChange={(event) => setReference(event.target.value)} /></label>
      <label className="ws-field">Actual payment date and time (your local time)<input type="datetime-local" required value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label>
      <label className="room-privacy my-4"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{sandbox ? "I confirm this is a sandbox test settlement, not a real bank payment." : "I verified that this exact amount was paid outside ConsultCare."}</span></label>
      <div className="ws-actions"><button className="ws-link" type="submit">{busy ? "Recording…" : "Record completed payment"}</button><button className="ws-link secondary" type="button" onClick={() => confirmLeave(onClose)}>Cancel</button></div>
    </fieldset></form>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </Modal>;
}
