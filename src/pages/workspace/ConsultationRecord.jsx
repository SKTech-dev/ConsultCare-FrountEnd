import { Loader2, Pencil } from "lucide-react";
import { ageLabel } from "../../features/consultations/presentation";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Panel, useWorkspace } from "../../components/workspace/Workspace";
import { apiClient } from "../../api/apiClient";
import { sendPrescription } from "../../features/consultations/consultationSlice";
import { MessageOverlay } from "../../components/ui/MessageBox";
import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";
import { sriLankanDate } from "../../features/consultations/model";

export function PatientContext({ booking }) {
  const context = booking.patientContext;
  if (!context) return null;
  const today = booking.completedAt ? sriLankanDate(Date.parse(booking.completedAt)) : sriLankanDate();
  const age = ageLabel(context.dob, today);
  return <Panel title={context.profession === "doctor" ? "Patient information" : "Client information"}>
    <div className="consultation-context-heading"><div><h3>{context.name || booking.patientName}</h3><p>{booking.contextCaptured ? "Information saved for this consultation." : "Current profile information."}</p></div></div>
    <div className="consultation-context-grid"><section className="consultation-facts">
      {context.profession === "doctor" && <><div><span>Age at consultation</span><strong>{age}</strong></div><div><span>Weight</span><strong>{context.weightKg == null ? "Not provided" : context.weightKg + " kg"}</strong></div><div><span>Emergency contact</span><strong>{context.emergency || "Not provided"}</strong></div></>}
      <div><span>Contact number</span><strong>{context.phone || "Not provided"}</strong></div>
    </section><section className="consultation-context-details"><div><h3>Relevant {context.profession === "doctor" ? "medical" : "legal"} information</h3><p className="whitespace-pre-wrap">{context.information || "No information provided."}</p></div>
      {context.details && <div><h3>General consultation information</h3><p className="whitespace-pre-wrap">{context.details}</p></div>}
      <div><h3>What would you like to discuss?</h3><p className="whitespace-pre-wrap">{booking.reason || "No booking note provided."}</p></div>
    </section></div>
  </Panel>;
}

export function ChatMessages({ booking }) {
  const state = useWorkspace();
  const viewer = state.role === "user" ? state.patient.id : state.professionalId;
  return booking.messages.length ? booking.messages.map((item) => <div key={item.id} className={"ws-message " + (item.senderId === viewer ? "ws-message-own" : "ws-message-other")}><small>{item.sender} · {new Date(item.time).toLocaleString()}</small>{item.text}</div>) : <p>No messages yet.</p>;
}

export function Prescription({ booking }) {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(booking.prescriptionRevision || 0);
  const markSaved = useUnsavedChanges(text, editing || !booking.prescription);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  if (booking.patientContext?.profession !== "doctor") return null;
  const canEdit = state.role === "doctor" && booking.status === "IN CONSULTATION";
  async function download() {
    setBusy("download"); setError("");
    try {
      const response = await apiClient.get("/bookings/" + booking.id + "/prescription.pdf", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url; link.download = "prescription-" + booking.id + ".pdf"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { setError("Could not download the prescription. Please try again."); }
    finally { setBusy(""); }
  }
  async function send(event) {
    event.preventDefault();
    if (busy) return;
    setBusy("send"); setError(""); setNotice("");
    const action = await dispatch(sendPrescription({ id: booking.id, text, revision, localPending: true }));
    if (action.error) setError(action.payload || "Could not send the prescription. Your draft is retained.");
    else { markSaved(""); setText(""); setEditing(false); setRevision(revision + 1); setNotice("Prescription sent. Only the latest version should be used."); }
    setBusy("");
  }
  return <Panel title="Prescription">
    {booking.prescription && <><span className="ws-status ws-good">Current prescription · version {booking.prescriptionRevision || 1}</span><p className="whitespace-pre-wrap ws-space">{booking.prescription}</p><p className="mt-3">Sent {new Date(booking.prescribedAt).toLocaleString()}</p><div className="ws-actions"><button type="button" className="ws-link" disabled={Boolean(busy)} onClick={download}>{busy === "download" && <Loader2 className="animate-spin" size={16} />}Download current PDF</button>{canEdit && !editing && <button type="button" className="ws-link secondary" onClick={() => { setText(booking.prescription); markSaved(booking.prescription); setRevision(booking.prescriptionRevision || 1); setEditing(true); }}><Pencil size={16} />Update prescription</button>}</div></>}
    {canEdit && (!booking.prescription || editing) && <form onSubmit={send} className="ws-space"><label className="ws-field">Prescription<textarea required maxLength={10000} value={text} disabled={Boolean(busy)} onChange={(event) => { setEditing(true); setText(event.target.value); }} placeholder="Medicine, dose, frequency, duration and instructions" /></label><p>Review before sending. An update replaces the current prescription; earlier versions are marked superseded.</p><div className="ws-actions"><button className="ws-link" disabled={Boolean(busy) || !text.trim()} aria-busy={busy === "send"}>{busy === "send" && <Loader2 className="animate-spin" size={17} />}{busy === "send" ? "Sending prescription…" : booking.prescription ? "Send updated prescription" : "Send prescription"}</button>{editing && <button type="button" className="ws-link secondary" disabled={Boolean(busy)} onClick={() => { setEditing(false); setText(""); markSaved(""); }}>Cancel edit</button>}</div></form>}
    {!booking.prescription && !canEdit && <p>No prescription has been sent.</p>}
    {(booking.prescriptionHistory || []).map((item) => <div key={item.revision} className="prescription-superseded"><strong>Version {item.revision} · Superseded</strong><small>{item.prescribedAt ? new Date(item.prescribedAt).toLocaleString() : "Earlier prescription"}</small><span>Replaced by the current prescription. Download unavailable.</span></div>)}
    {notice && <p role="status" className="ws-notice">{notice}</p>}
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </Panel>;
}
