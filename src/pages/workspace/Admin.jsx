import { useDispatch } from "react-redux";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { moderate, refund } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { MessageOverlay } from "../../components/ui/MessageBox";

function ModerationPopups({ pending, error, submitting, onClose, onConfirm, onDismissError }) {
  return <>{pending && <MessageOverlay type="confirm" title="Update account status?" text={`${pending.name} will be marked ${pending.status}.`} onClose={onClose} onConfirm={onConfirm} isProcessing={submitting} />}{error && <MessageOverlay type="error" title={error.title} text={error.text} onClose={onDismissError} />}</>;
}

export function AdminPeople() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  if (s.role !== "admin") return <Empty title="Administrator workspace">This page requires an administrator account.</Empty>;

  async function confirmModeration() {
    setSubmitting(true);
    const action = await dispatch(moderate({ ...pending, localFeedback: true }));
    setSubmitting(false);
    setPending(null);
    if (action.error) setError({ title: pending.status === "verified" ? "Cannot approve professional" : "Could not update account", text: action.payload || "The account status could not be updated. Please try again." });
  }

  const verificationCard = (role, title, emptyText) => {
    const professionals = s.professionals.filter((professional) => professional.role === role);
    return <Panel title={title} key={role}>{professionals.length === 0 ? <Empty title={`No ${role} profiles`}>{emptyText}</Empty> : <div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>Professional</th><th>Credentials</th><th>Status</th><th>Action</th></tr></thead><tbody>{professionals.map((p) => <tr key={p.id}><td><Link className="ws-name-link" to={`/app/admin/person/professional/${p.id}`}>{p.name}</Link><p>{p.speciality}</p></td><td>{p.qualifications}<br />{p.registration}</td><td><Status>{p.status}</Status></td><td><div className="flex gap-2"><Link className="ws-link" to={`/app/admin/person/professional/${p.id}`}>{p.status === "pending" ? "Review & approve" : "View details"}</Link>{p.status !== "suspended" && <button className="ws-link secondary" onClick={() => setPending({ id: p.id, status: "suspended", name: p.name })}>Suspend</button>}</div></td></tr>)}</tbody></table></div>}</Panel>;
  };

  return <><PageHeading title="People behind the platform.">Review qualifications, approve professionals, and manage account access.</PageHeading>{verificationCard("lawyer", "Lawyer verification", "Registered lawyers will appear here for review.")}<div className="ws-space">{verificationCard("doctor", "Doctor verification", "Registered doctors will appear here for review.")}</div><div className="ws-space"><Panel title="Patient / client accounts">{s.patients.map((patient) => <div className="ws-row" key={patient.id}><div><Link className="ws-name-link" to={`/app/admin/person/patient/${patient.id}`}>{patient.name}</Link><p>{patient.email}</p></div><Status>{patient.status}</Status><button className="ws-link secondary" onClick={() => setPending({ id: patient.id, status: patient.status === "active" ? "suspended" : "active", name: patient.name })}>{patient.status === "active" ? "Suspend account" : "Restore account"}</button></div>)}</Panel></div><ModerationPopups pending={pending} error={error} submitting={submitting} onClose={() => setPending(null)} onConfirm={confirmModeration} onDismissError={() => setError(null)} /></>;
}

export function AdminPersonDetails() {
  const { type, id } = useParams();
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  if (s.role !== "admin") return <Empty title="Administrator workspace">This page requires an administrator account.</Empty>;
  const person = type === "patient" ? s.patients.find((item) => item.id === id) : s.professionals.find((item) => item.id === id);
  if (!person) return <Empty title="Person not found">This account is no longer available in the workspace.</Empty>;
  const professional = type !== "patient";

  async function confirmModeration() {
    setSubmitting(true);
    const action = await dispatch(moderate({ ...pending, localFeedback: true }));
    setSubmitting(false);
    setPending(null);
    if (action.error) setError({ title: pending.status === "verified" ? "Cannot approve professional" : "Could not update account", text: action.payload || "The account status could not be updated. Please try again." });
  }

  return <><PageHeading eyebrow="ACCOUNT REVIEW" title={person.name}>{professional ? `${person.role === "doctor" ? "Doctor" : "Lawyer"} profile and verification details.` : "Patient / client account details."}</PageHeading><div className="ws-grid-two"><Panel title="Account information"><div className="ws-row"><span>Email</span><strong>{person.email}</strong></div><div className="ws-row"><span>Status</span><Status>{person.status}</Status></div>{professional ? <><div className="ws-row"><span>Speciality</span><strong>{person.speciality}</strong></div><div className="ws-row"><span>Registration</span><strong>{person.registration}</strong></div><div className="ws-row"><span>Qualifications</span><strong>{person.qualifications}</strong></div><div className="ws-row"><span>Languages</span><strong>{person.languages?.join(", ")}</strong></div></> : <><div className="ws-row"><span>Phone</span><strong>{person.phone || "Not provided"}</strong></div><div className="ws-row"><span>Date of birth</span><strong>{person.dob || "Not provided"}</strong></div></>}</Panel><Panel title={professional ? "Professional introduction" : "Profile information"}><p className="whitespace-pre-wrap">{professional ? (person.bio || "No introduction provided.") : (person.details || "No additional information provided.")}</p>{professional && <div className="ws-notice">Review the registration and qualifications before approving this professional.</div>}<div className="ws-actions">{person.status !== "verified" && <button className="ws-link" onClick={() => setPending({ id: person.id, status: "verified", name: person.name })}>Approve</button>}{person.status !== "suspended" && <button className="ws-link secondary" onClick={() => setPending({ id: person.id, status: "suspended", name: person.name })}>Suspend</button>}</div></Panel></div><ModerationPopups pending={pending} error={error} submitting={submitting} onClose={() => setPending(null)} onConfirm={confirmModeration} onDismissError={() => setError(null)} /></>;
}

export function AdminPayments() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  if (s.role !== "admin") return <Empty title="Administrator workspace">This page requires an administrator account.</Empty>;
  return <><PageHeading title="Payments and refunds.">Review simulated payment outcomes. Consultation notes and documents are not shown here.</PageHeading><div className="ws-space"><Panel title="Clinic payments & refunds"><p>Group clinic payments are tracked separately. Open a clinic to review registrations and process requested test refunds.</p><Link className="ws-link secondary" to="/app/clinics">Review clinic payments</Link></Panel></div><Panel title="Private consultation payments & refunds">{s.bookings.length ? s.bookings.map((b) => <div className="ws-row" key={b.id}><div><h3>{b.patientName} · {money(b.fee)}</h3><p>Booking {b.id.slice(0, 8)} · {b.status}</p></div><Status>{b.payment}</Status>{b.payment === "refund requested" && <button className="ws-link" onClick={() => dispatch(refund(b.id))}>Simulate refund</button>}</div>) : <Empty title="No payments yet">Complete a mock booking to populate this view.</Empty>}</Panel></>;
}
