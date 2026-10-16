import ProfessionalHistory from "./ProfessionalHistory";
import { historyContext } from "../../features/consultations/calendar";
import SectionTabs from "../../components/ui/SectionTabs";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, canRead, money, isUpcomingBooking } from "../../features/consultations/model";
import { fetchWorkspace, transition } from "../../features/consultations/consultationSlice";
import BookingPayment from "./BookingPayment";
import RefundRequest from "../../components/workspace/RefundRequest";
import MoveWeeklyBooking from "../../components/workspace/MoveWeeklyBooking";
import ReasonDialog from "../../components/ui/ReasonDialog";
import { Documents } from "./Room";
import PatientQueues from "./PatientQueues";
import { ClinicList } from "./Clinics";
import { PatientContext, ChatMessages, Prescription } from "./ConsultationRecord";
import ResolveUnfinished from "../../components/workspace/ResolveUnfinished";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { Loader2 } from "lucide-react";

export function Bookings({ history = false }) {
  const s = useWorkspace();
  if (!history && s.role === "user") return <PatientQueues />;
  if (history && ["doctor", "lawyer"].includes(s.role)) return <ProfessionalHistory />;
  const list = s.bookings.filter((b) => canRead(s, b) && (history !== isUpcomingBooking(b, s.sessions.find((session) => session.id === b.sessionId))));
  return <><PageHeading title={history ? "Your consultation history." : "Your upcoming conversations."}>{history ? "Revisit consultation records, shared notes, and professional documents." : "Follow your booking from payment to the waiting room."}</PageHeading><SectionTabs ids={history ? ["clinics", "consultations"] : ["consultations"]} order={["consultations", "clinics"]}>{history && <ClinicList embedded view="history" title="Past group clinics" />}<Panel title={history ? "Past private consultations" : "Private consultations"}>{list.length ? <div>{list.slice().reverse().map((b) => <div className="ws-row" key={b.id}><div><h3>{s.professionals.find((p) => p.id === b.professionalId)?.name}</h3><p>{s.role !== "user" && b.patientName + " · "}{s.sessions.find((x) => x.id === b.sessionId)?.date} · {money(b.fee)}</p></div><Status>{b.status}</Status><Link className="ws-link secondary" to={"/app/booking/" + b.id}>View record →</Link></div>)}</div> : <Empty title={history ? "No past consultations yet" : "No bookings yet"}>Your consultations will appear here as you work through the booking flow.</Empty>}</Panel></SectionTabs></>;
}
export function BookingDetails() {
  const { id } = useParams();
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [cancel, setCancel] = useState(false);
  const [opening, setOpening] = useState(true);
  const b = s.bookings.find((b) => b.id === id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentReturn = params.get("payment");
  const history = historyContext(params);
  const historyQuery = new URLSearchParams(params); historyQuery.delete("session");
  const historyBack = history ? params.get("session") ? "/app/history/session/" + encodeURIComponent(params.get("session")) + "?" + historyQuery : history.dayUrl : null;
  useEffect(() => {
    let active = true;
    setOpening(true);
    dispatch(fetchWorkspace()).finally(() => { if (active) setOpening(false); });
    return () => { active = false; };
  }, [id, dispatch]);
  useEffect(() => {
    if (paymentReturn !== "return" || s.role !== "user") return;
    if (b?.payment === "paid" && ["WAITING", "NEXT", "IN CONSULTATION"].includes(b.status)) {
      navigate(b.status === "IN CONSULTATION" ? `/app/room/${id}` : "/app/bookings?tab=consultations", { replace: true });
      return;
    }
    if (["failed", "cancelled", "refund requested", "refunded", "chargedback"].includes(b?.payment) || ["CANCELLED", "NO-SHOW", "COMPLETED"].includes(b?.status)) return;
    dispatch(fetchWorkspace());
    const timer = setInterval(() => dispatch(fetchWorkspace()), 5000);
    return () => clearInterval(timer);
  }, [paymentReturn, s.role, b?.payment, b?.status, id, dispatch, navigate]);
  if (!canRead(s, b)) return opening ? <GlobalLoader message="Loading your booking…" /> : <Empty title="Record unavailable">This record is not available in the current workspace.</Empty>;
  const p = s.professionals.find((p) => p.id === b.professionalId);
  const session = s.sessions.find((x) => x.id === b.sessionId);
  const position = b.position || 0;
  return <>
    {historyBack && <Link className="history-back" to={historyBack}>← {params.get("session") ? "Back to session records" : "Back to day details"}</Link>}
    <PageHeading title={p?.name || "Your consultation"} action={<Status>{b.status}</Status>}>{session ? `${session.date} · ${session.start}–${session.end}` : "Consultation record"} · {p?.speciality}</PageHeading>
    {opening && <GlobalLoader compact className="booking-loading" message="Loading your booking…" />}
    {paymentReturn === "return" && b.payment !== "paid" && <div className="ws-notice flex items-start gap-3" role="status">{!["refund requested", "refunded", "chargedback", "failed", "cancelled"].includes(b.payment) && b.status === "PAYMENT PENDING" && <Loader2 size={20} className="animate-spin shrink-0" aria-label="Checking payment confirmation" />}<p>{["refund requested", "refunded", "chargedback"].includes(b.payment) ? "This payment needs review or has been reversed. Please check its status below; it has not added you to the queue." : b.status === "CANCELLED" ? "This reservation has expired or was cancelled. Any payment received for it requires refund review." : ["failed", "cancelled"].includes(b.payment) ? "Payment was not completed. You can retry below." : "Waiting for PayHere to confirm your payment. Your queue will open automatically once confirmed. Please do not pay again while confirmation is pending."}</p></div>}
    {paymentReturn === "cancel" && <p className="ws-notice">Checkout was cancelled. Your booking is awaiting payment; you can retry before it expires.</p>}
    <SectionTabs ids={["summary", "documents", "patient", ...(p?.role === "doctor" ? ["prescription"] : []), "chat"]} labels={["Booking & payment", "Documents", "Patient information", ...(p?.role === "doctor" ? ["Prescription"] : []), "Chat"]}><div className="ws-grid-two"><Panel title="Booking summary"><div className="ws-row"><span>Consultation fee</span><strong>{money(b.fee)}</strong></div><div className="ws-row"><span>Payment</span><Status>{b.payment}</Status></div><p className="ws-space">{b.reason || "No discussion notes provided."}</p>
      <BookingPayment booking={b} showFailure />
      {s.role === "user" && <RefundRequest booking={b} session={session} />}
      <MoveWeeklyBooking booking={b} />
      {s.role === "user" && ["PAYMENT PENDING", "WAITING", "NEXT"].includes(b.status) && <button className="ws-link secondary mt-5" onClick={() => setCancel(true)}>Cancel booking</button>}
    </Panel><Panel title={b.status === "COMPLETED" ? "Consultation record" : "Your waiting room"}>
      {ACTIVE.includes(b.status) ? <><span className="ws-queue-number">{b.status === "IN CONSULTATION" ? "Ready" : position}</span><h3>{b.status === "IN CONSULTATION" ? "Your professional has called you." : b.status === "NEXT" ? "You're next. Please be ready." : Math.max(0, position - 1) + " people ahead of you."}</h3><p className="mt-3">Your position updates automatically. Wait for {p.name} to call you before joining the room.</p>{b.status === "IN CONSULTATION" && <Link to={"/app/room/" + b.id} className="ws-link mt-6">Join consultation →</Link>}</> : b.status === "COMPLETED" ? <><h3>Notes shared with you</h3><p className="whitespace-pre-wrap mt-3">{b.notes || "No shared notes were added."}</p><h3 className="mt-6">Follow-up recommendation</h3><p className="whitespace-pre-wrap mt-3">{b.followUp || "No follow-up recommendation recorded."}</p>{s.role !== "user" && <><h3 className="mt-6">Private professional notes</h3><p className="whitespace-pre-wrap mt-3">{b.privateNotes || "No private notes."}</p></>}</> : <p>{b.status === "PAYMENT PENDING" ? "Complete secure payment to join this professional's queue." : "This consultation is no longer in the active queue."}</p>}
    </Panel></div>

    <div className="ws-space"><Documents booking={b} /></div>
    <div className="ws-space"><PatientContext booking={b} /></div>
    {p?.role === "doctor" && <div className="ws-space"><Prescription key={b.id} booking={b} /></div>}
    <div className="ws-space"><Panel title="Consultation chat"><div className="ws-chat"><ChatMessages booking={b} /></div></Panel></div>
    </SectionTabs><ResolveUnfinished booking={b} />
    {cancel && <ReasonDialog title="Cancel this booking?" text="Your place will be released. If payment was already verified, it will be marked for refund review." busy={s.pending > 0} onClose={() => setCancel(false)} onConfirm={async (reason) => { await dispatch(transition({ id, status: "CANCELLED", reason })); setCancel(false); }} />}
  </>;
}
