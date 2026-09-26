import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, canRead, money, sessionEndsAt, sessionLabel } from "../../features/consultations/model";
import { fetchWorkspace, transition } from "../../features/consultations/consultationSlice";
import BookingPayment from "./BookingPayment";
import { MessageOverlay } from "../../components/ui/MessageBox";
import { Documents } from "./Room";
import PatientQueues from "./PatientQueues";
import SessionTransfers from "./SessionTransfers";
import { ClinicList } from "./Clinics";
import { PatientContext, ChatMessages, Prescription } from "./ConsultationRecord";

export function Bookings({ history = false }) {
  const s = useWorkspace();
  if (!history && s.role === "user") return <PatientQueues />;
  if (history && ["doctor", "lawyer"].includes(s.role)) return <ProfessionalHistory />;
  const list = s.bookings.filter((b) => canRead(s, b) && (history ? ["COMPLETED", "CANCELLED", "NO-SHOW"].includes(b.status) : !["COMPLETED", "CANCELLED", "NO-SHOW"].includes(b.status)));
  return <><PageHeading title={history ? "Your consultation history." : "Your upcoming conversations."}>{history ? "Revisit consultation records, shared notes, and professional documents." : "Follow your booking from payment to the waiting room."}</PageHeading><div className="workspace-sections">{history && <ClinicList embedded view="history" title="Past group clinics" />}<Panel title={history ? "Past private consultations" : "Private consultations"}>{list.length ? <div>{list.slice().reverse().map((b) => <div className="ws-row" key={b.id}><div><h3>{s.professionals.find((p) => p.id === b.professionalId)?.name}</h3><p>{s.role !== "user" && b.patientName + " · "}{s.sessions.find((x) => x.id === b.sessionId)?.date} · {money(b.fee)}</p></div><Status>{b.status}</Status><Link className="ws-link secondary" to={"/app/booking/" + b.id}>View record →</Link></div>)}</div> : <Empty title={history ? "No past consultations yet" : "No bookings yet"}>Your consultations will appear here as you work through the booking flow.</Empty>}</Panel></div></>;
}
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" });
const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Colombo" });
const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Colombo" });

function dateForSession(session) {
  return new Date(`${session.date}T12:00:00+05:30`);
}

function sundayFor(session) {
  const date = dateForSession(session);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date;
}

function historyTree(state) {
  const bookedBySession = new Map();
  state.bookings.filter((booking) => booking.professionalId === state.professionalId).forEach((booking) => {
    const bookings = bookedBySession.get(booking.sessionId) || [];
    bookings.push(booking);
    bookedBySession.set(booking.sessionId, bookings);
  });
  const months = new Map();
  (state.sessions || []).filter((session) => bookedBySession.has(session.id) && sessionEndsAt(session) <= Date.now()).forEach((session) => {
    const date = dateForSession(session);
    const monthKey = session.date.slice(0, 7);
    const weekDate = sundayFor(session);
    const weekKey = weekDate.toISOString().slice(0, 10);
    if (!months.has(monthKey)) months.set(monthKey, { key: monthKey, label: MONTH_FORMAT.format(date), weeks: new Map() });
    const month = months.get(monthKey);
    if (!month.weeks.has(weekKey)) month.weeks.set(weekKey, { key: weekKey, label: `Week of ${DATE_FORMAT.format(weekDate)}`, days: new Map() });
    const week = month.weeks.get(weekKey);
    if (!week.days.has(session.date)) week.days.set(session.date, { key: session.date, label: DAY_FORMAT.format(date), sessions: [] });
    week.days.get(session.date).sessions.push({ session, bookings: bookedBySession.get(session.id) });
  });
  return [...months.values()].sort((a, b) => b.key.localeCompare(a.key)).map((month) => ({
    ...month,
    weeks: [...month.weeks.values()].sort((a, b) => b.key.localeCompare(a.key)).map((week) => ({
      ...week,
      days: [...week.days.values()].sort((a, b) => a.key.localeCompare(b.key)).map((day) => ({ ...day, sessions: day.sessions.sort((a, b) => a.session.start.localeCompare(b.session.start)) })),
    })),
  }));
}

function ProfessionalHistory() {
  const s = useWorkspace();
  const months = historyTree(s);
  return <>
    <PageHeading title="Consultation history.">Browse past session times by month, week and day. Every booking remains visible, including consultations that did not take place.</PageHeading>
    <div className="professional-sections">
    <SessionTransfers embedded view="history" />
    <ClinicList embedded view="history" title="Past group clinics" />
    <Panel title="Past consultation sessions">
    {months.length ? <div className="history-tree">{months.map((month) => {
      const monthBookings = month.weeks.flatMap((week) => week.days).flatMap((day) => day.sessions).reduce((total, item) => total + item.bookings.length, 0);
      return <details className="history-node history-month" key={month.key}><summary><span><strong>{month.label}</strong><small>{monthBookings} booked consultation{monthBookings === 1 ? "" : "s"}</small></span><span className="history-expand"><span className="history-expand-label">Expand</span><span className="history-collapse-label">Collapse</span></span></summary><div className="history-children">{month.weeks.map((week) => {
        const weekBookings = week.days.flatMap((day) => day.sessions).reduce((total, item) => total + item.bookings.length, 0);
        return <details className="history-node history-week" key={week.key}><summary><span><strong>{week.label}</strong><small>{weekBookings} booked consultation{weekBookings === 1 ? "" : "s"}</small></span><span className="history-expand"><span className="history-expand-label">Expand</span><span className="history-collapse-label">Collapse</span></span></summary><div className="history-children">{week.days.map((day) => <details className="history-node history-day" key={day.key}><summary><span><strong>{day.label}</strong><small>{day.sessions.length} session{day.sessions.length === 1 ? "" : "s"}</small></span><span className="history-expand"><span className="history-expand-label">Expand</span><span className="history-collapse-label">Collapse</span></span></summary><div className="history-sessions">{day.sessions.map(({ session, bookings }) => <Link className="history-session" key={session.id} to={`/app/history/session/${session.id}`}><span><strong>{session.start}–{session.end}</strong><small>{bookings.length} patient{bookings.length === 1 ? "" : "s"} / client{bookings.length === 1 ? "" : "s"}</small></span><span>View session →</span></Link>)}</div></details>)}</div></details>;
      })}</div></details>;
    })}</div> : <Empty title="No past session records yet">Past sessions with booked patients or clients will appear here.</Empty>}
    </Panel></div>
  </>;
}

export function ProfessionalSessionHistory() {
  const { sessionId } = useParams();
  const s = useWorkspace();
  const session = (s.sessions || []).find((item) => item.id === sessionId && item.professionalId === s.professionalId);
  const bookings = s.bookings.filter((booking) => booking.sessionId === sessionId && booking.professionalId === s.professionalId);
  if (!["doctor", "lawyer"].includes(s.role) || !session) return <Empty title="Session unavailable">This session record is not available in the current workspace.</Empty>;
  return <>
    <PageHeading title={sessionLabel(session)}>All booked patients and clients are shown here, including completed, cancelled, no-show and unfinished consultations.</PageHeading>
    <Panel title="Patients & consultation records">{bookings.length ? bookings.map((booking) => <div className="ws-row" key={booking.id}><div><Link className="history-person-link" to={`/app/booking/${booking.id}`}>{booking.patientName}</Link><p>{money(booking.fee)} · {booking.payment}</p></div><Status>{booking.status}</Status><Link className="ws-link secondary" to={`/app/booking/${booking.id}`}>View record →</Link></div>) : <p>No patient or client booked this session.</p>}</Panel>
  </>;
}

export function BookingDetails() {
  const { id } = useParams();
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [cancel, setCancel] = useState(false);
  const b = s.bookings.find((b) => b.id === id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentReturn = params.get("payment");
  useEffect(() => {
    if (paymentReturn !== "return" || s.role !== "user") return;
    if (b?.payment === "paid" && ["WAITING", "NEXT", "IN CONSULTATION"].includes(b.status)) {
      navigate(b.status === "IN CONSULTATION" ? `/app/room/${id}` : "/app/bookings", { replace: true });
      return;
    }
    if (["failed", "cancelled", "refund requested", "refunded", "chargedback"].includes(b?.payment) || ["CANCELLED", "NO-SHOW", "COMPLETED"].includes(b?.status)) return;
    dispatch(fetchWorkspace());
    const timer = setInterval(() => dispatch(fetchWorkspace()), 5000);
    return () => clearInterval(timer);
  }, [paymentReturn, s.role, b?.payment, b?.status, id, dispatch, navigate]);
  if (!canRead(s, b)) return <Empty title="Record unavailable">This record is not available in the current workspace.</Empty>;
  const p = s.professionals.find((p) => p.id === b.professionalId);
  const session = s.sessions.find((x) => x.id === b.sessionId);
  const position = b.position || 0;
  return <>
    <PageHeading title={p.name} action={<Status>{b.status}</Status>}>{session.date} · {session.start}–{session.end} · {p.speciality}</PageHeading>
    {paymentReturn === "return" && b.payment !== "paid" && <p className="ws-notice" role="status">{["refund requested", "refunded", "chargedback"].includes(b.payment) ? "This payment needs review or has been reversed. Please check its status below; it has not added you to the queue." : b.status === "CANCELLED" ? "This reservation has expired or was cancelled. Any payment received for it requires refund review." : ["failed", "cancelled"].includes(b.payment) ? "Payment was not completed. You can retry below." : "Waiting for PayHere to confirm your payment. Your queue will open automatically once confirmed. Please do not pay again while confirmation is pending."}</p>}
    {paymentReturn === "cancel" && <p className="ws-notice">Checkout was cancelled. Your booking is awaiting payment; you can retry before it expires.</p>}
    <div className="ws-grid-two"><Panel title="Booking summary"><div className="ws-row"><span>Consultation fee</span><strong>{money(b.fee)}</strong></div><div className="ws-row"><span>Payment</span><Status>{b.payment}</Status></div><p className="ws-space">{b.reason || "No discussion notes provided."}</p>
      <BookingPayment booking={b} showFailure />
      {s.role === "user" && ["PAYMENT PENDING", "WAITING", "NEXT"].includes(b.status) && <button className="ws-link secondary mt-5" onClick={() => setCancel(true)}>Cancel booking</button>}
    </Panel><Panel title={b.status === "COMPLETED" ? "Consultation record" : "Your waiting room"}>
      {ACTIVE.includes(b.status) ? <><span className="ws-queue-number">{b.status === "IN CONSULTATION" ? "Ready" : position}</span><h3>{b.status === "IN CONSULTATION" ? "Your professional has called you." : b.status === "NEXT" ? "You're next. Please be ready." : Math.max(0, position - 1) + " people ahead of you."}</h3><p className="mt-3">Your position updates automatically. Wait for {p.name} to call you before joining the room.</p>{b.status === "IN CONSULTATION" && <Link to={"/app/room/" + b.id} className="ws-link mt-6">Join consultation →</Link>}</> : b.status === "COMPLETED" ? <><h3>Notes shared with you</h3><p className="whitespace-pre-wrap mt-3">{b.notes || "No shared notes were added."}</p><h3 className="mt-6">Follow-up recommendation</h3><p className="whitespace-pre-wrap mt-3">{b.followUp || "No follow-up recommendation recorded."}</p>{s.role !== "user" && <><h3 className="mt-6">Private professional notes</h3><p className="whitespace-pre-wrap mt-3">{b.privateNotes || "No private notes."}</p></>}</> : <p>{b.status === "PAYMENT PENDING" ? "Complete secure payment to join this professional's queue." : "This consultation is no longer in the active queue."}</p>}
    </Panel></div>
    <div className="ws-space"><Documents booking={b} /></div>
    <div className="ws-space"><PatientContext booking={b} /></div>
    <div className="ws-space"><Prescription key={b.id} booking={b} /></div>
    <div className="ws-space"><Panel title="Consultation chat"><div className="ws-chat"><ChatMessages booking={b} /></div></Panel></div>
    {cancel && <MessageOverlay type="confirm" title="Cancel this booking?" text="Your place will be released. If payment was already verified, it will be marked for a refund review." onClose={() => setCancel(false)} onConfirm={() => { dispatch(transition({ id, status: "CANCELLED" })); setCancel(false); }} />}
  </>;
}
