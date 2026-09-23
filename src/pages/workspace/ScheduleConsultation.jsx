import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money, sriLankanDate } from "../../features/consultations/model";
import { Panel, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./appointments.css";

export default function ScheduleConsultation() {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const professional = state.professionals.find((p) => p.id === state.professionalId);
  const [email, setEmail] = useState("");
  const [patient, setPatient] = useState(null);
  const [date, setDate] = useState(sriLankanDate());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const enabled = professional?.status === "verified" && professional?.fee > 0;

  async function search(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setPatient(null);
    try { setPatient((await callApi("POST", "/scheduled-consultations/patient-search", { email: email.trim() })).data); }
    catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  async function schedule(event) {
    event.preventDefault();
    if (busy || !patient) return;
    if (start >= end || Date.parse(`${date}T${start}:00+05:30`) <= Date.now()) {
      setNotice({ type: "error", text: "Choose a future start time and an end time after it. All times use Sri Lanka time." }); return;
    }
    setBusy(true);
    try {
      const result = await callApi("POST", "/scheduled-consultations", { email: patient.email, date, start, end, expectedFee: professional.fee, reason: reason.trim() });
      setPatient(null); setEmail(""); setReason(""); setStart(""); setEnd("");
      setNotice({ type: "success", text: result.message });
      await dispatch(fetchWorkspace());
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  return <Panel title="Schedule a patient consultation">
    <p>Arrange a private, one-off consultation outside your weekly sessions. Find an existing patient/client using their full email address.</p>
    {!enabled && <p className="ws-notice">A verified professional account with a consultation fee is required.</p>}
    <form className="appointment-search" onSubmit={search}>
      <label className="ws-field">Patient / client email<input type="email" autoComplete="off" required maxLength={254} value={email} disabled={busy || !enabled} onChange={(e) => { setEmail(e.target.value); setPatient(null); }} placeholder="patient@example.com" /></label>
      <button className="ws-link" disabled={busy || !enabled}><Search size={16} />{busy ? "Please wait…" : "Find patient"}</button>
    </form>
    {patient && <form onSubmit={schedule} className="appointment-form">
      <div className="ws-notice" role="status"><strong>{patient.name}</strong><p>{patient.email}</p><p>Only basic account information is shown until the patient accepts and pays.</p></div>
      <div className="appointment-times">
        <label className="ws-field">Date<input type="date" required min={sriLankanDate()} value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="ws-field">Start time<input type="time" required value={start} disabled={busy} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="ws-field">End time<input type="time" required value={end} disabled={busy} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <p className="ws-muted">All dates and times use Sri Lanka time. Overlapping consultations are not allowed.</p>
      <div className="ws-row"><span>Consultation fee</span><strong>{money(professional.fee)}</strong></div>
      <label className="ws-field">Message to patient (optional)<textarea value={reason} maxLength={1000} disabled={busy} onChange={(e) => setReason(e.target.value)} placeholder="For example, a follow-up appointment. Do not include sensitive medical details." /></label>
      <p>The invitation will appear in My consultations. Payment confirms acceptance and is required before the start time. Your weekly schedule stays unchanged.</p>
      <div className="ws-actions"><button className="ws-link" disabled={busy || !enabled}>{busy ? "Scheduling…" : "Schedule consultation"}</button></div>
    </form>}
    <div className="ws-actions"><Link className="ws-link secondary" to="/app/queue">View scheduled consultations</Link></div>
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </Panel>;
}
