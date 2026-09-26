import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Plus, Trash2 } from "lucide-react";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { saveWeeklyAvailability, transition } from "../../features/consultations/consultationSlice";
import { isSessionLive, isUpcomingSession, queueFor, sessionLabel, sessionStartsAt } from "../../features/consultations/model";
import SessionTransfers from "./SessionTransfers";
import ScheduleConsultation from "./ScheduleConsultation";
import ScheduledConsultations from "./ScheduledConsultations";
import { ClinicList, ScheduleClinic } from "./Clinics";
import { MessageOverlay } from "../../components/ui/MessageBox";

import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const blankSlot = () => ({ start: "09:00", end: "10:00", capacity: 10 });

function scheduleFrom(slots) {
  return DAYS.map((_, weekday) => ({
    weekday,
    slots: slots.filter((slot) => slot.weekday === weekday).map(({ start, end, capacity }) => ({ start, end, capacity })),
  }));
}

export function Queue() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [calling, setCalling] = useState(null);
  async function callNext(id) {
    if (calling) return;
    setCalling(id);
    try {
      const action = await dispatch(transition({ id, status: "IN CONSULTATION" }));
      if (!action.error) navigate(`/app/room/${id}`);
    } finally { setCalling(null); }
  }
  const [skip, setSkip] = useState(null);
  if (!["doctor", "lawyer"].includes(s.role)) return <Empty title="Professional workspace">Sign in with a professional account to view its queue.</Empty>;
  const p = s.professionals.find((professional) => professional.id === s.professionalId);
  const sessions = s.sessions.filter((session) => !session.clinicBlocked && !session.privateAppointment && session.professionalId === p.id && isUpcomingSession(session)).sort((a, b) => sessionStartsAt(a) - sessionStartsAt(b));
  const ongoing = s.bookings.filter((booking) => booking.professionalId === p.id && booking.status === "IN CONSULTATION");
  const outsideUpcoming = ongoing.filter((booking) => !isUpcomingSession(s.sessions.find((session) => session.id === booking.sessionId)));
  const renderQueue = (session) => {
      const queue = queueFor(s, p.id, session.id);
      const busy = ongoing.length > 0;
      return <><div className="queue-session-heading"><p>{queue.length ? `${queue.length} active patient${queue.length === 1 ? "" : "s"} / client${queue.length === 1 ? "" : "s"} in this session queue.` : "No active bookings for this session yet."}</p><Status>{session.online ? "Available" : "Offline"}</Status></div>{queue.length ? queue.map((booking) => <div className="ws-row" key={booking.id}><div><h3>{booking.position}. {booking.patientName}</h3><p>{booking.payment}</p></div><Status>{booking.status}</Status><div className="ws-actions">{booking.status === "IN CONSULTATION" ? <Link to={`/app/room/${booking.id}`} className="ws-link">Open room</Link> : <><button className="ws-link" disabled={Boolean(calling) || p.status !== "verified" || busy || !session.online || !isSessionLive(session) || booking.status !== "NEXT"} onClick={() => callNext(booking.id)}>Call next</button><button className="ws-link secondary" disabled={p.status !== "verified" || Date.now() < sessionStartsAt(session)} title={Date.now() < sessionStartsAt(session) ? "Available after the session starts" : undefined} onClick={() => setSkip(booking.id)}>No-show</button></>}<Link className="ws-link secondary" to={`/app/booking/${booking.id}`}>Details</Link></div></div>) : <div className="queue-empty">This queue is clear.</div>}</>;
  };
  return <><PageHeading title="Your consultation queues.">Manage upcoming and ongoing handovers, individual appointments, group clinics and weekly queues. Past sessions are available in Consultation history.</PageHeading>
    <div className="professional-sections"><SessionTransfers embedded view="upcoming" />
    <ScheduledConsultations embedded renderQueue={(id) => {
      const booking = s.bookings.find((item) => item.id === id && item.professionalId === p.id);
      const session = s.sessions.find((item) => item.id === booking?.sessionId);
      return session && isUpcomingSession(session) ? renderQueue(session) : null;
    }} />
    <ClinicList embedded title="Upcoming group clinics" />
    {outsideUpcoming.length > 0 && <Panel title="Consultation still in progress">{outsideUpcoming.map((booking) => <div className="ws-row" key={booking.id}><div><h3>{booking.patientName}</h3><p>This consultation is still open. Complete it before calling the next person.</p></div><Link to={`/app/room/${booking.id}`} className="ws-link">Return to consultation</Link></div>)}</Panel>}
    {p.status !== "verified" && <div className="ws-notice">This professional is {p.status}. An administrator must approve the account before consultations can start.</div>}
    <Panel title="Weekly queues">
      <p className="queue-section-description">Upcoming and ongoing weekly sessions, ordered by date and time. Offline sessions remain visible so you can review their bookings.</p>
      {sessions.length ? <div className="queue-sessions">{sessions.map((session) => <Panel key={session.id} title={sessionLabel(session)}>{renderQueue(session)}</Panel>)}</div> : <Empty title="No upcoming weekly sessions">Create or update your weekly schedule to generate session queues.</Empty>}
    </Panel></div>
    {skip && <MessageOverlay type="confirm" title="Mark as no-show?" text="This person will leave the active queue. Their record and payment status will remain available for review." onClose={() => setSkip(null)} onConfirm={() => { dispatch(transition({ id: skip, status: "NO-SHOW" })); setSkip(null); }} />}
  </>;
}

export function Sessions() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [days, setDays] = useState(() => scheduleFrom(s.weeklyAvailability || []));
  const [fee, setFee] = useState(() => s.professionals.find((professional) => professional.id === s.professionalId)?.fee || "");
  const markSaved = useUnsavedChanges({ days, fee });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  if (!["doctor", "lawyer"].includes(s.role)) return <Empty title="Professional workspace">Sign in with a professional account to manage availability.</Empty>;
  const p = s.professionals.find((professional) => professional.id === s.professionalId);
  const updateDay = (weekday, change) => setDays((current) => current.map((day) => day.weekday === weekday ? { ...day, ...change } : day));
  const addSlot = (weekday) => { const day = days.find((item) => item.weekday === weekday); updateDay(weekday, { slots: [...day.slots, blankSlot()] }); };
  const updateSlot = (weekday, index, change) => { const day = days.find((item) => item.weekday === weekday); updateDay(weekday, { slots: day.slots.map((slot, position) => position === index ? { ...slot, ...change } : slot) }); };
  const removeSlot = (weekday, index) => { const day = days.find((item) => item.weekday === weekday); updateDay(weekday, { slots: day.slots.filter((_, position) => position !== index) }); };
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    for (const day of days) {
      const slots = day.slots.slice().sort((a, b) => a.start.localeCompare(b.start));
      if (slots.some((slot) => slot.start >= slot.end)) { setMessage("Each availability slot must end after it starts."); return; }
      if (slots.some((slot, index) => index && slots[index - 1].end > slot.start)) { setMessage("Slots on the same day cannot overlap."); return; }
    }
    setSaving(true);
    try {
      const action = await dispatch(saveWeeklyAvailability({ days, fee: Number(fee) }));
      if (!action.error) markSaved();
    } finally { setSaving(false); }
  };
  return <><PageHeading title="My sessions.">Set the hours you repeat each week. Patients can select the next available occurrence, and you only need to return here when your routine changes.</PageHeading>
    {p.status !== "verified" && <div className="ws-notice">You can save your schedule now. Administrator verification is required before patients can book.</div>}
    <form onSubmit={save}><Panel title="Repeat every week"><fieldset disabled={saving} className="weekly-editor"><div className="weekly-fee"><label className="ws-field">Consultation fee (LKR)<input type="number" min="0.01" max="1000000" step="0.01" required value={fee} onChange={(event) => setFee(event.target.value)} aria-describedby="weekly-fee-help" /></label><p id="weekly-fee-help" className="ws-muted">Per patient/client, for weekly recurring sessions only. Changes apply to new bookings; existing bookings keep their original fee. Individual appointments have a separate fee.</p></div><div className="weekly-days">{days.map((day) => <section className="weekly-day" key={day.weekday}><div className="weekly-day-heading"><h3>{DAYS[day.weekday]}</h3><button type="button" className="ws-name-link weekly-add" onClick={() => addSlot(day.weekday)}><Plus size={16} />Add time</button></div>{day.slots.length ? <div className="weekly-slots">{day.slots.map((slot, index) => <div className="weekly-slot" key={index}><label>Start<input type="time" value={slot.start} required onChange={(event) => updateSlot(day.weekday, index, { start: event.target.value })} /></label><label>End<input type="time" value={slot.end} required onChange={(event) => updateSlot(day.weekday, index, { end: event.target.value })} /></label><label>Places<input type="number" min="1" max="100" value={slot.capacity} required onChange={(event) => updateSlot(day.weekday, index, { capacity: Number(event.target.value) })} /></label><button type="button" className="weekly-remove" aria-label={`Remove ${DAYS[day.weekday]} slot ${index + 1}`} onClick={() => removeSlot(day.weekday, index)}><Trash2 size={17} /></button></div>)}</div> : <p className="ws-muted">No availability set.</p>}</section>)}</div><div className="ws-actions"><button className="ws-link" disabled={saving}>{saving ? "Saving schedule…" : "Save weekly schedule"}</button></div></fieldset>{message && <MessageOverlay type="error" text={message} onClose={() => setMessage("")} />}</Panel></form>
    <div className="ws-space"><SessionTransfers embedded view="request" /></div>
    <div className="ws-space"><ScheduleConsultation /></div>
    <div className="ws-space"><ScheduleClinic /></div>
  </>;
}
