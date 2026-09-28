import { useState } from "react";
import { callApi } from "../../api/apiClient";
import Modal from "../ui/Modal";
import { MessageOverlay } from "../ui/MessageBox";
import { useUnsavedChanges } from "../ui/UnsavedChanges";
import { sriLankanDate } from "../../features/consultations/model";

export default function EditSessionTime({ item, endpoint, clinic = false, onClose, onSaved }) {
  const [form, setForm] = useState({ start: item.start, end: item.end, reason: "", ...(clinic ? { capacity: item.capacity } : { date: item.date }) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const markSaved = useUnsavedChanges(form);
  const dirty = Boolean(form.reason) || form.start !== item.start || form.end !== item.end || (!clinic && form.date !== item.date) || (clinic && Number(form.capacity) !== item.capacity);
  const close = () => dirty ? setDiscard(true) : onClose();
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((old) => ({ ...old, [key]: e.target.value })) });
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (form.start >= form.end || Date.parse(`${clinic ? item.date : form.date}T${form.start}:00+05:30`) <= Date.now()) {
      setError("Choose a future start time and an end time after it."); return;
    }
    setBusy(true);
    try {
      const response = await callApi("PATCH", endpoint, { ...form, ...(clinic ? { capacity: Number(form.capacity) } : {}) });
      markSaved(); await onSaved(response.message);
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <Modal title={clinic ? "Update clinic time & places" : "Update consultation date & time"} busy={busy} onClose={close}>
    <p className="ws-notice">{clinic ? `${item.date} · The clinic date stays unchanged. ` : "Choose a new date and time. "}All times are in Sri Lanka time. The consultation fee and existing payments stay unchanged.</p>
    <form onSubmit={submit}>
      <fieldset className="clinic-fieldset" disabled={busy}>
        <div className="clinic-form-grid">
          {!clinic && <label className="ws-field">Date<input type="date" required min={sriLankanDate()} max={sriLankanDate(Date.now() + 400 * 86400000)} {...field("date")} /></label>}
          <label className="ws-field">Start time<input type="time" required {...field("start")} /></label>
          <label className="ws-field">End time<input type="time" required {...field("end")} /></label>
          {clinic && <label className="ws-field">Places<input type="number" required min={Math.max(2, item.capacity - item.remaining)} max="100" step="1" {...field("capacity")} /></label>}
        </div>
        <label className="ws-field">Reason for change<textarea required minLength={3} maxLength={1000} {...field("reason")} placeholder="Explain the change without including private medical or legal details." /></label>
        <p className="ws-muted">The new time is checked for conflicts before saving. Affected attendees and administrators receive a notification with your reason.</p>
        <div className="ws-actions"><button className="ws-link">{busy ? "Saving…" : "Save changes"}</button><button type="button" className="ws-link secondary" onClick={close}>Cancel</button></div>
      </fieldset>
    </form>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    {discard && <MessageOverlay type="confirm" title="Discard changes?" text="Your updated schedule has not been saved." confirmText="Discard" cancelText="Keep editing" onClose={() => setDiscard(false)} onConfirm={onClose} />}
  </Modal>;
}
