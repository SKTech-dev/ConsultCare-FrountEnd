import { useDispatch } from "react-redux";
import { useState } from "react";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { moderate, refund, resolveIssue } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { MessageOverlay } from "../../components/ui/MessageBox";

export function AdminPeople() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [pending, setPending] = useState(null);
  if (s.role !== "admin") return <Empty title="Administrator workspace">This page requires an administrator account.</Empty>;
  return <><PageHeading title="People behind the platform.">Review qualifications, approve professionals, and manage account access.</PageHeading><Panel title="Professional verification"><div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>Professional</th><th>Credentials</th><th>Status</th><th>Action</th></tr></thead><tbody>{s.professionals.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><p>{p.speciality} · {p.role}</p></td><td>{p.qualifications}<br />{p.registration}</td><td><Status>{p.status}</Status></td><td><div className="flex gap-2">{p.status !== "verified" && <button className="ws-link" onClick={() => setPending({ id: p.id, status: "verified", name: p.name })}>Approve</button>}{p.status !== "suspended" && <button className="ws-link secondary" onClick={() => setPending({ id: p.id, status: "suspended", name: p.name })}>Suspend</button>}</div></td></tr>)}</tbody></table></div></Panel><div className="ws-space"><Panel title="Patient / client accounts">{s.patients.map((patient) => <div className="ws-row" key={patient.id}><div><h3>{patient.name}</h3><p>{patient.email}</p></div><Status>{patient.status}</Status><button className="ws-link secondary" onClick={() => setPending({ id: patient.id, status: patient.status === "active" ? "suspended" : "active", name: patient.name })}>{patient.status === "active" ? "Suspend account" : "Restore account"}</button></div>)}</Panel></div>{pending && <MessageOverlay type="confirm" title="Update account status?" text={pending.name + " will be marked " + pending.status + "."} onClose={() => setPending(null)} onConfirm={() => { dispatch(moderate(pending)); setPending(null); }} />}</>;
}
export function AdminIssues() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  if (s.role !== "admin") return <Empty title="Administrator workspace">This page requires an administrator account.</Empty>;
  return <><PageHeading title="Keep things moving.">Resolve support requests and review simulated payment outcomes. Clinical notes are not shown here.</PageHeading><Panel title="Support requests">{s.issues.length ? s.issues.map((i) => <div className="ws-row" key={i.id}><div><h3>{i.text}</h3><p>Booking {i.bookingId.slice(0, 8)}</p></div><Status>{i.status}</Status>{i.status === "open" && <button className="ws-link secondary" onClick={() => dispatch(resolveIssue(i.id))}>Mark resolved</button>}</div>) : <Empty title="No support requests">Requests raised from consultation details will appear here.</Empty>}</Panel><div className="ws-space"><Panel title="Payments & refunds">{s.bookings.length ? s.bookings.map((b) => <div className="ws-row" key={b.id}><div><h3>{b.patientName} · {money(b.fee)}</h3><p>Booking {b.id.slice(0, 8)} · {b.status}</p></div><Status>{b.payment}</Status>{b.payment === "refund requested" && <button className="ws-link" onClick={() => dispatch(refund(b.id))}>Simulate refund</button>}</div>) : <Empty title="No payments yet">Complete a mock booking to populate this view.</Empty>}</Panel></div></>;
}
