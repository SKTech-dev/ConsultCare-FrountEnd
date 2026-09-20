import { Link } from "react-router-dom";
import { useWorkspace, PageHeading, Panel, Status, Empty } from "../../components/workspace/Workspace";
import { ACTIVE, money } from "../../features/consultations/model";

export default function Overview() {
  const s = useWorkspace();
  const professional = s.professionals.find((p) => p.id === s.professionalId);
  const mine = s.bookings.filter((b) => s.role === "admin" || (s.role === "user" ? b.patientId === s.patient.id : b.professionalId === s.professionalId));
  const active = mine.filter((b) => ACTIVE.includes(b.status));
  const completed = mine.filter((b) => b.status === "COMPLETED");
  return <>
    <PageHeading title={s.role === "admin" ? "A clear view of your platform." : s.role === "user" ? "Your next step starts here." : "Care starts with a conversation."}>{s.role === "user" ? "Find the right professional, manage your visits, and keep your records together." : s.role === "admin" ? "Review professional accounts, monitor bookings, and resolve issues." : professional.name + " · " + professional.speciality}</PageHeading>
    <div className="ws-grid">{[
      ["Active consultations", active.length, "In your current workspace"],
      ["Completed", completed.length, "Records ready to revisit"],
      [s.role === "admin" ? "Awaiting verification" : "Upcoming sessions", s.role === "admin" ? s.professionals.filter((p) => p.status === "pending").length : s.role === "user" ? mine.filter((b) => b.status === "PAYMENT PENDING").length : s.sessions.filter((x) => x.professionalId === s.professionalId).length, s.role === "user" ? "Awaiting payment" : "Stay on top of the next step"],
    ].map(([label, value, note]) => <Panel key={label}><div className="ws-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></Panel>)}</div>
    <div className="ws-banner"><div><h2>{s.role === "user" ? "The right support. On your terms." : s.role === "admin" ? "Build trust, one profile at a time." : "Your queue. Your pace."}</h2><p>{s.role === "user" ? "Explore medical and legal consultations with independent queues for every professional." : s.role === "admin" ? "Review credentials before making a professional available for bookings." : "Start your session, call the next person, and keep every consultation focused."}</p></div><div className="ws-actions">{s.role === "user" ? <><Link className="ws-link" to="/consult/doctors">Find a doctor →</Link><Link className="ws-link secondary" to="/consult/lawyers">Find a lawyer →</Link></> : <Link className="ws-link" to={s.role === "admin" ? "/app/admin" : "/app/queue"}>{s.role === "admin" ? "Review professionals" : "Open my queue"} →</Link>}</div></div>
    <Panel title="Recent activity">{mine.length === 0 ? <Empty title="Your workspace is ready">New consultation activity will appear here.</Empty> : mine.slice().reverse().slice(0, 5).map((b) => <div className="ws-row" key={b.id}><div><h3>{s.professionals.find((p) => p.id === b.professionalId)?.name}</h3><p>{s.sessions.find((x) => x.id === b.sessionId)?.date} · {money(b.fee)} · {b.payment}</p></div><Status>{b.status}</Status>{s.role !== "admin" && <Link className="ws-link secondary" to={"/app/booking/" + b.id}>View details</Link>}</div>)}</Panel>
  </>;
}
