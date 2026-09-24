import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { sriLankanDate } from "../../features/consultations/model";
import { Panel, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./appointments.css";

export default function ScheduleConsultation() {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const professional = state.professionals.find((p) => p.id === state.professionalId);
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(sriLankanDate());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const enabled = professional?.status === "verified";

  async function schedule(event) {
    event.preventDefault();
    if (busy || !enabled) return;
    if (start >= end || Date.parse(`${date}T${start}:00+05:30`) <= Date.now()) {
      setNotice({ type: "error", text: "Choose a future start time and an end time after it. All times use Sri Lanka time." }); return;
    }
    setBusy(true);
    try {
      const result = await callApi("POST", "/scheduled-consultations", { email: email.trim(), date, start, end, fee: Number(fee), reason: reason.trim() });
      setEmail(""); setReason(""); setStart(""); setEnd(""); setFee("");
      setNotice({ type: "success", text: result.message });
      await dispatch(fetchWorkspace());
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  return <Panel title="Schedule a patient consultation">
    <p>Arrange a private, one-off consultation outside your weekly sessions. Enter an existing patient/client's full email address and the appointment details.</p>
    {!enabled && <p className="ws-notice">A verified professional account is required.</p>}
    <form onSubmit={schedule} className="appointment-form">
      <label className="ws-field">Patient / client email<input type="email" autoComplete="off" required maxLength={254} value={email} disabled={busy || !enabled} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" /></label>
      <div className="appointment-times">
        <label className="ws-field">Date<input type="date" required min={sriLankanDate()} value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="ws-field">Start time<input type="time" required value={start} disabled={busy} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="ws-field">End time<input type="time" required value={end} disabled={busy} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <p className="ws-muted">All dates and times use Sri Lanka time. Overlapping consultations are not allowed.</p>
      <label className="ws-field">Individual consultation fee (LKR)<input type="number" required min="0.01" max="1000000" step="0.01" value={fee} disabled={busy || !enabled} onChange={(e) => setFee(e.target.value)} aria-describedby="individual-fee-help" /></label>
      <p id="individual-fee-help" className="ws-muted">The fee for this appointment only. It does not change your weekly session fee.</p>
      <label className="ws-field">Message to patient (optional)<textarea value={reason} maxLength={1000} disabled={busy} onChange={(e) => setReason(e.target.value)} placeholder="For example, a follow-up appointment. Do not include sensitive medical details." /></label>
      <p>The invitation will appear in My consultations. Payment confirms acceptance and is required before the start time. Your weekly schedule stays unchanged.</p>
      <div className="ws-actions"><button className="ws-link" disabled={busy || !enabled}>{busy ? "Scheduling…" : "Schedule consultation"}</button></div>
    </form>
    <div className="ws-actions"><Link className="ws-link secondary" to="/app/queue">View scheduled consultations</Link></div>
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </Panel>;
}
