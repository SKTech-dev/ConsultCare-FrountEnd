import { useState } from "react";
import { callApi } from "../../api/apiClient";
import Modal from "../ui/Modal";
import { MessageOverlay } from "../ui/MessageBox";
import { useUnsavedChanges } from "../ui/UnsavedChanges";

export default function EditSessionTime({ item, endpoint, clinic = false, onClose, onSaved }) {
  const [form, setForm] = useState({ start: item.start, end: item.end, ...(clinic ? { capacity: item.capacity } : {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const markSaved = useUnsavedChanges(form);
  const dirty = form.start !== item.start || form.end !== item.end || (clinic && Number(form.capacity) !== item.capacity);
  const close = () => dirty ? setDiscard(true) : onClose();
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((old) => ({ ...old, [key]: e.target.value })) });
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (form.start >= form.end || Date.parse(`${item.date}T${form.start}:00+05:30`) <= Date.now()) {
      setError("Choose a future start time and an end time after it."); return;
    }
    setBusy(true);
    try {
      const response = await callApi("PATCH", endpoint, { ...form, ...(clinic ? { capacity: Number(form.capacity) } : {}) });
      markSaved(); await onSaved(response.message);
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <Modal title={clinic ? "Update clinic time & places" : "Update consultation time"} busy={busy} onClose={close}>
    <p className="ws-notice">{item.date} · Sri Lanka time. The date, consultation fee and existing payments stay unchanged.</p>
    <form onSubmit={submit}>
      <fieldset className="clinic-fieldset" disabled={busy}>
        <div className="clinic-form-grid">
          <label className="ws-field">Start time<input type="time" required {...field("start")} /></label>
          <label className="ws-field">End time<input type="time" required {...field("end")} /></label>
          {clinic && <label className="ws-field">Places<input type="number" required min={Math.max(2, item.capacity - item.remaining)} max="100" step="1" {...field("capacity")} /></label>}
        </div>
        <p className="ws-muted">The new time is checked for scheduling conflicts before saving. Let attendees know about the change.</p>
        <div className="ws-actions"><button className="ws-link">{busy ? "Saving…" : "Save changes"}</button><button type="button" className="ws-link secondary" onClick={close}>Cancel</button></div>
      </fieldset>
    </form>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    {discard && <MessageOverlay type="confirm" title="Discard changes?" text="Your updated schedule has not been saved." confirmText="Discard" cancelText="Keep editing" onClose={() => setDiscard(false)} onConfirm={onClose} />}
  </Modal>;
}
