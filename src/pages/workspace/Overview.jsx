import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace, PageHeading, Panel, Status, Empty } from "../../components/workspace/Workspace";
import { overviewActivity, overviewCounts } from "../../features/consultations/overview";
import { money } from "../../features/consultations/model";

export default function Overview() {
  const s = useWorkspace();
  const [activityStatus, setActivityStatus] = useState("all");
  const [activityLimit, setActivityLimit] = useState(5);
  const professional = s.professionals.find((p) => p.id === s.professionalId);
  const mine = s.bookings.filter((b) => s.role === "admin" || (s.role === "user" ? b.patientId === s.patient.id : b.professionalId === s.professionalId));
  const counts = overviewCounts(mine, s.sessions, s.professionalId);
  const completed = mine.filter((b) => b.status === "COMPLETED");
  const activity = overviewActivity(mine).filter((booking) => activityStatus === "all" || booking.status === activityStatus);
  return <>
    <PageHeading title={s.role === "admin" ? "A clear view of your platform." : s.role === "user" ? "Your next step starts here." : "Care starts with a conversation."}>{s.role === "user" ? "Find the right professional, manage your visits, and keep your records together." : s.role === "admin" ? "Review professional accounts and monitor bookings." : professional.name + " · " + professional.speciality}</PageHeading>
    <div className="ws-grid">{[
      ["Active consultations", counts.active, "In your current workspace"],
      ["Completed", completed.length, "Records ready to revisit"],
      [s.role === "admin" ? "Awaiting verification" : s.role === "user" ? "Awaiting payment" : "Upcoming sessions", s.role === "admin" ? s.professionals.filter((p) => p.status === "pending").length : s.role === "user" ? counts.pending : counts.upcoming, s.role === "user" ? "Unexpired reservations" : "Stay on top of the next step"],
    ].map(([label, value, note]) => <Panel key={label}><div className="ws-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></Panel>)}</div>
    <div className="ws-banner"><div><h2>{s.role === "user" ? "The right support. On your terms." : s.role === "admin" ? "Build trust, one profile at a time." : "Your queue. Your pace."}</h2><p>{s.role === "user" ? "Explore medical and legal consultations with independent queues for every professional." : s.role === "admin" ? "Review credentials before making a professional available for bookings." : "Start your session, call the next person, and keep every consultation focused."}</p></div><div className="ws-actions">{s.role === "user" ? <><Link className="ws-link" to="/consult/doctors">Find a doctor →</Link><Link className="ws-link secondary" to="/consult/lawyers">Find a lawyer →</Link></> : <Link className="ws-link" to={s.role === "admin" ? "/app/admin" : "/app/queue"}>{s.role === "admin" ? "Review professionals" : "Open my queue"} →</Link>}</div></div>
    <Panel title="Recent activity"><label className="ws-field activity-filter">Consultation status<select value={activityStatus} onChange={(event) => { setActivityStatus(event.target.value); setActivityLimit(5); }}><option value="all">All statuses</option>{[...new Set(["PAYMENT PENDING", "WAITING", "NEXT", "IN CONSULTATION", "COMPLETED", "CANCELLED", "NO-SHOW", ...mine.map((booking) => booking.status)])].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>{activity.length === 0 ? <Empty title="Your workspace is ready">Consultations with the selected status will appear here.</Empty> : activity.slice(0, activityLimit).map((b) => <div className="ws-row activity-row" key={b.id}><div><h3>{s.role === "user" ? s.professionals.find((p) => p.id === b.professionalId)?.name : b.patientName || s.professionals.find((p) => p.id === b.professionalId)?.name}</h3><p>{s.sessions.find((x) => x.id === b.sessionId)?.date} · {money(b.fee)} · {b.payment}</p></div><Status>{b.status}</Status>{s.role !== "admin" && <Link className="ws-link secondary" to={"/app/booking/" + b.id}>View details</Link>}</div>)}{activity.length > activityLimit && <button className="ws-link secondary mt-4" onClick={() => setActivityLimit((limit) => limit + 5)}>Show more activity</button>}</Panel>
  </>;
}
