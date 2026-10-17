import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { sriLankanDate } from "../../features/consultations/model";
import { Panel, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./appointments.css";
import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";

export default function ScheduleConsultation() {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const professional = state.professionals.find((p) => p.id === state.professionalId);
  const [email, setEmail] = useState("");
  const emailInput = useRef(null);
  const [patient, setPatient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [options, setOptions] = useState([{ date: sriLankanDate(), start: "", end: "" }]);
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const markSaved = useUnsavedChanges({ email, reason, fee, options });
  const enabled = professional?.status === "verified";

  async function findPatient() {
    if (busy || searching || !enabled || !emailInput.current.reportValidity()) return;
    setSearching(true); setPatient(null);
    try {
      const result = await callApi("POST", "/scheduled-consultations/patient-search", { email: email.trim() });
      setPatient(result.data);
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setSearching(false); }
  }

  async function schedule(event) {
    event.preventDefault();
    if (busy || searching || !enabled) return;
    if (options.some(({ date, start, end }) => !date || !start || !end || start >= end || Date.parse(`${date}T${start}:00+05:30`) <= Date.now())) {
      setNotice({ type: "error", text: "Choose a future start time and an end time after it. All times use Sri Lanka time." }); return;
    }
    setBusy(true);
    try {
      const result = await callApi("POST", "/appointment-offers", { email: email.trim(), options, fee: Number(fee), reason: reason.trim() });
      const emptyOptions = [{ date: sriLankanDate(), start: "", end: "" }];
      markSaved({ email: "", reason: "", fee: "", options: emptyOptions });
      setOptions(emptyOptions);
      setEmail(""); setPatient(null); setReason(""); setFee("");
      setNotice({ type: "success", text: result.message });
      await dispatch(fetchWorkspace());
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  return <Panel title="Schedule an individual appointment">
    <p>Arrange a private, individual appointment outside your weekly sessions. Enter an existing patient/client's full email address and the appointment details.</p>
    {!enabled && <p className="ws-notice">A verified professional account is required.</p>}
    <form onSubmit={schedule} className="appointment-form">
      <div><div className="appointment-search">
        <label className="ws-field">Patient / client email<input ref={emailInput} type="email" autoComplete="off" required maxLength={254} value={email} disabled={busy || searching || !enabled} onChange={(e) => { setEmail(e.target.value); setPatient(null); }} placeholder="patient@example.com" /></label>
        <button type="button" className="ws-link secondary" disabled={busy || searching || !enabled} aria-busy={searching} onClick={findPatient}>{searching ? "Finding patient…" : "Find patient"}</button>
      </div>
      <div role="status" aria-live="polite">{searching ? "Searching for the patient account…" : patient ? <p className="ws-notice">Patient / client found: <strong>{patient.name}</strong> · {patient.email}</p> : null}</div>
      </div>
      <fieldset className="appointment-time-options" disabled={busy}><legend>Offer appointment times</legend>
        <p className="ws-muted">Add up to six alternatives. The patient selects one time and pays once. All times are in Sri Lanka time.</p>
        {options.map((option, index) => <section className="appointment-time-option" key={index}>
          <div className="ws-row"><h3>Time option {index + 1}</h3>{options.length > 1 && <button type="button" className="ws-name-link" aria-label={`Remove time option ${index + 1}`} onClick={() => setOptions(options.filter((_, position) => position !== index))}>Remove</button>}</div>
          <div className="appointment-times">{[["date", "Date", "date"], ["start", "Start time", "time"], ["end", "End time", "time"]].map(([field, label, type]) => <label className="ws-field" key={field}>{label}<input type={type} required min={field === "date" ? sriLankanDate() : undefined} value={option[field]} onChange={(event) => setOptions(options.map((item, position) => position === index ? { ...item, [field]: event.target.value } : item))} /></label>)}</div>
        </section>)}
        <button type="button" className="ws-link secondary" disabled={options.length >= 6} onClick={() => setOptions([...options, { date: options.at(-1).date, start: "", end: "" }])}>+ Add another time option</button>
      </fieldset>
      <label className="ws-field">Individual consultation fee (LKR)<input type="number" required min="0.01" max="1000000" step="0.01" value={fee} disabled={busy || !enabled} onChange={(e) => setFee(e.target.value)} aria-describedby="individual-fee-help" /></label>
      <p id="individual-fee-help" className="ws-muted">The fee for this appointment only. It does not change your weekly session fee.</p>
      <label className="ws-field">Message to patient (optional)<textarea value={reason} maxLength={1000} disabled={busy} onChange={(e) => setReason(e.target.value)} placeholder="For example, a follow-up appointment. Do not include sensitive medical details." /></label>
      <p>The patient chooses one of your offered times in My consultations before paying. Unselected alternatives are released when a time is chosen. Your weekly schedule stays unchanged.</p>
      <div className="ws-actions"><button className="ws-link" disabled={busy || searching || !enabled}>{busy ? "Scheduling…" : "Send appointment invitation"}</button><Link className="ws-link secondary" to="/app/queue?tab=appointments">View individual appointments</Link></div>
    </form>
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </Panel>;
}
