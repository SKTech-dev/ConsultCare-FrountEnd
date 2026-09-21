import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, canRead, money } from "../../features/consultations/model";
import { pay, transition } from "../../features/consultations/consultationSlice";
import Button from "../../components/ui/Button";
import { MessageOverlay } from "../../components/ui/MessageBox";
import { Documents } from "./Room";

export function Bookings({ history = false }) {
  const s = useWorkspace();
  const list = s.bookings.filter((b) => canRead(s, b) && (history ? ["COMPLETED", "CANCELLED", "NO-SHOW"].includes(b.status) : !["COMPLETED", "CANCELLED", "NO-SHOW"].includes(b.status)));
  return <><PageHeading title={history ? "Your consultation history." : "Your upcoming conversations."}>{history ? "Revisit consultation records, shared notes, and professional documents." : "Follow your booking from payment to the waiting room."}</PageHeading>{list.length ? <Panel>{list.slice().reverse().map((b) => <div className="ws-row" key={b.id}><div><h3>{s.professionals.find((p) => p.id === b.professionalId)?.name}</h3><p>{s.role !== "user" && b.patientName + " · "}{s.sessions.find((x) => x.id === b.sessionId)?.date} · {money(b.fee)}</p></div><Status>{b.status}</Status><Link className="ws-link secondary" to={"/app/booking/" + b.id}>View record →</Link></div>)}</Panel> : <Empty title={history ? "No past consultations yet" : "No bookings yet"}>Your consultations will appear here as you work through the booking flow.</Empty>}</>;
}
export function BookingDetails() {
  const { id } = useParams();
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [cancel, setCancel] = useState(false);
  const b = s.bookings.find((b) => b.id === id);
  if (!canRead(s, b)) return <Empty title="Record unavailable">This record is not available in the current workspace.</Empty>;
  const p = s.professionals.find((p) => p.id === b.professionalId);
  const session = s.sessions.find((x) => x.id === b.sessionId);
  const position = b.position || 0;
  return <>
    <PageHeading title={p.name} action={<Status>{b.status}</Status>}>{session.date} · {session.start}–{session.end} · {p.speciality}</PageHeading>
    <div className="ws-grid-two"><Panel title="Booking summary"><div className="ws-row"><span>Consultation fee</span><strong>{money(b.fee)}</strong></div><div className="ws-row"><span>Payment</span><Status>{b.payment}</Status></div><p className="ws-space">{b.reason || "No discussion notes provided."}</p>
      {b.status === "PAYMENT PENDING" && s.role === "user" && <><div className="ws-notice">{s.mockPayments ? "Test checkout — no charge is made. Unpaid reservations expire after 30 minutes." : "Online payments are not yet available. Your booking is pending."}</div><Button disabled={!s.mockPayments || p.status !== "verified" || s.patient.status !== "active"} onClick={() => dispatch(pay({ id, success: true }))}>Simulate successful payment · {money(b.fee)}</Button><button className="text-xs underline mt-4" disabled={!s.mockPayments} onClick={() => dispatch(pay({ id, success: false }))}>Test failed payment</button></>}
      {s.role === "user" && ["PAYMENT PENDING", "WAITING", "NEXT"].includes(b.status) && <button className="ws-link secondary mt-5" onClick={() => setCancel(true)}>Cancel booking</button>}
    </Panel><Panel title={b.status === "COMPLETED" ? "Consultation record" : "Your waiting room"}>
      {ACTIVE.includes(b.status) ? <><span className="ws-queue-number">{b.status === "IN CONSULTATION" ? "Ready" : position}</span><h3>{b.status === "IN CONSULTATION" ? "Your professional has called you." : b.status === "NEXT" ? "You're next. Please be ready." : Math.max(0, position - 1) + " people ahead of you."}</h3><p className="mt-3">Your position updates automatically. Wait for {p.name} to call you before joining the room.</p>{b.status === "IN CONSULTATION" && <Link to={"/app/room/" + b.id} className="ws-link mt-6">Join consultation →</Link>}</> : b.status === "COMPLETED" ? <><h3>Notes shared with you</h3><p className="whitespace-pre-wrap mt-3">{b.notes || "No shared notes were added."}</p><h3 className="mt-6">Follow-up recommendation</h3><p className="whitespace-pre-wrap mt-3">{b.followUp || "No follow-up recommendation recorded."}</p>{s.role !== "user" && <><h3 className="mt-6">Private professional notes</h3><p className="whitespace-pre-wrap mt-3">{b.privateNotes || "No private notes."}</p></>}</> : <p>{b.status === "PAYMENT PENDING" ? "Complete the mock payment to join this professional's queue." : "This consultation is no longer in the active queue."}</p>}
    </Panel></div>
    <div className="ws-space"><Documents booking={b} /></div>
    {cancel && <MessageOverlay type="confirm" title="Cancel this booking?" text="Your place will be released. A paid mock booking will be marked for a simulated refund." onClose={() => setCancel(false)} onConfirm={() => { dispatch(transition({ id, status: "CANCELLED" })); setCancel(false); }} />}
  </>;
}
