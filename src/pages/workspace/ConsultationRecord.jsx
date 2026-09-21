import { useState } from "react";
import { useDispatch } from "react-redux";
import { Panel, useWorkspace } from "../../components/workspace/Workspace";
import { apiClient } from "../../api/apiClient";
import { sendPrescription } from "../../features/consultations/consultationSlice";
import { sriLankanDate } from "../../features/consultations/model";

export function PatientContext({ booking }) {
  const context = booking.patientContext;
  if (!context) return null;
  const today = booking.completedAt ? sriLankanDate(Date.parse(booking.completedAt)) : sriLankanDate();
  const age = context.dob ? Number(today.slice(0, 4)) - Number(context.dob.slice(0, 4)) - (today.slice(5) < context.dob.slice(5) ? 1 : 0) : null;
  return <Panel title={context.profession === "doctor" ? "Patient information" : "Client information"}>
    <div className="consultation-context-heading"><div><h3>{context.name || booking.patientName}</h3><p>{booking.contextCaptured ? "Information saved for this consultation." : "Current profile information."}</p></div></div>
    <div className="consultation-context-grid"><section className="consultation-facts">
      {context.profession === "doctor" && <><div><span>Age at consultation</span><strong>{age === null || age < 0 ? "Not provided" : age + " years"}</strong></div><div><span>Weight</span><strong>{context.weightKg == null ? "Not provided" : context.weightKg + " kg"}</strong></div><div><span>Emergency contact</span><strong>{context.emergency || "Not provided"}</strong></div></>}
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (booking.patientContext?.profession !== "doctor") return null;
  async function download() {
    try {
      const response = await apiClient.get("/bookings/" + booking.id + "/prescription.pdf", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url; link.download = "prescription-" + booking.id + ".pdf"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { setError("Could not download the prescription. Please try again."); }
  }
  return <Panel title="Prescription">
    {booking.prescription ? <><p className="whitespace-pre-wrap">{booking.prescription}</p><p className="mt-3">Sent {new Date(booking.prescribedAt).toLocaleString()}</p><button className="ws-link mt-4" onClick={download}>Download prescription PDF</button></> : state.role === "doctor" && booking.status === "IN CONSULTATION" ? <form onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError("");
      const action = await dispatch(sendPrescription({ id: booking.id, text }));
      if (action.error) setError(action.payload || "Could not send prescription.");
      setBusy(false);
    }}><label className="ws-field">Prescription<textarea required maxLength={10000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Medicine, dose, frequency, duration and instructions" /></label><p className="mb-3">Review before sending. The sent prescription is saved in the consultation record.</p><button className="ws-link" disabled={busy || !text.trim()}>Send prescription to patient</button></form> : <p>No prescription has been sent.</p>}
    {error && <p role="alert" className="ws-error">{error}</p>}
  </Panel>;
}
