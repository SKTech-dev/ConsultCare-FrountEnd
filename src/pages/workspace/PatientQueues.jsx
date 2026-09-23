import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, money, sessionStartsAt, sessionEndsAt, sessionLabel } from "../../features/consultations/model";
import BookingPayment from "./BookingPayment";
import { transition } from "../../features/consultations/consultationSlice";
import { MessageOverlay } from "../../components/ui/MessageBox";
import { ClinicList } from "./Clinics";

const timeLabel = (at) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }).format(at);

export default function PatientQueues() {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const [cancel, setCancel] = useState(null);
  const bookings = state.bookings.filter((b) => b.patientId === state.patient.id && !["COMPLETED", "CANCELLED", "NO-SHOW"].includes(b.status))
    .map((booking) => ({ booking, session: state.sessions.find((s) => s.id === booking.sessionId) }))
    .sort((a, b) => (a.session ? sessionStartsAt(a.session) : Infinity) - (b.session ? sessionStartsAt(b.session) : Infinity));
  return <>
    <PageHeading title="Your consultations.">Each booking has its own queue. {state.liveConnected ? "Live updates connected." : "Reconnecting live updates; checking periodically."}</PageHeading>
    <ClinicList embedded title="Your upcoming group clinics" />
    <div className="patient-queues">{bookings.map(({ booking: b, session }) => {
      const position = b.position || 0;
      const ended = session && sessionEndsAt(session) <= Date.now();
      const slot = session ? (sessionEndsAt(session) - sessionStartsAt(session)) / session.capacity : 0;
      const estimate = session ? Math.max(sessionStartsAt(session), Date.now()) + Math.max(0, position - 1) * slot : 0;
      return <Panel key={b.id} title={state.professionals.find((p) => p.id === b.professionalId)?.name || "Consultation"}>
        <div className="ws-row"><p>{session ? sessionLabel(session) : "Session details unavailable"}</p><Status>{b.status}</Status></div>
        {b.scheduledById && <p className="ws-space"><strong>Private appointment scheduled by your professional</strong> · {money(b.fee)}</p>}
        {b.scheduledById && <BookingPayment booking={b} />}
        {ACTIVE.includes(b.status) && !ended && position > 0 && <div aria-live="polite">
          <p className="ws-space">{b.status === "IN CONSULTATION" ? "It is your turn." : position === 1 ? "You are next." : (position - 1) + " ahead of you."}</p>
          <ol className="patient-queue-track" aria-label="Your queue position">{Array.from({ length: Math.min(position + 1, b.queueSize || position) }, (_, i) => <li key={i} className={i + 1 === position ? "patient-queue-you" : ""} aria-current={i + 1 === position ? "step" : undefined}>{i + 1 === position ? "You" : i + 1}</li>)}</ol>
          {b.status !== "IN CONSULTATION" && session && <p>Estimated turn: <strong>{timeLabel(estimate)}–{timeLabel(estimate + slot)}</strong> (Sri Lanka time). This may change as consultations progress.</p>}
        </div>}
        {ended && b.status !== "IN CONSULTATION" && <p className="ws-notice">This session time has ended. An estimated turn is no longer available.</p>}
        <div className="ws-actions"><Link className="ws-link" to={b.status === "IN CONSULTATION" ? "/app/room/" + b.id : "/app/booking/" + b.id}>{b.status === "IN CONSULTATION" ? "Join consultation" : b.status === "PAYMENT PENDING" ? "Continue to payment" : "View booking"}</Link>
          {["PAYMENT PENDING", "WAITING", "NEXT"].includes(b.status) && <button className="ws-link secondary" onClick={() => setCancel(b.id)}>Cancel consultation</button>}
        </div>
      </Panel>;
    })}</div>
    {!bookings.length && <Empty title="No active bookings">Book a doctor or lawyer to see your consultation queue here.</Empty>}
    {cancel && <MessageOverlay type="confirm" title="Cancel consultation?" text="Your queue place will be released. Any paid booking will follow the existing refund process." isProcessing={state.pending > 0} onClose={() => setCancel(null)} onConfirm={async () => { await dispatch(transition({ id: cancel, status: "CANCELLED" })); setCancel(null); }} />}
  </>;
}
