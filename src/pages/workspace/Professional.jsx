import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { addSession, toggleSession, transition } from "../../features/consultations/consultationSlice";
import { queueFor } from "../../features/consultations/model";
import Button from "../../components/ui/Button";
import { MessageOverlay } from "../../components/ui/MessageBox";

export function Queue() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [skip, setSkip] = useState(null);
  if (!["doctor", "lawyer"].includes(s.role)) return <Empty title="Professional workspace">Sign in with a professional account to view its queue.</Empty>;
  const p = s.professionals.find((p) => p.id === s.professionalId);
  const queue = queueFor(s, p.id);
  const busy = queue.some((b) => b.status === "IN CONSULTATION");
  return <><PageHeading title="Your consultation queue." action={<Link className="ws-link secondary" to="/app/sessions">Manage sessions</Link>}>Only bookings assigned to {p.name} appear here.</PageHeading>
    {p.status !== "verified" && <div className="ws-notice">This professional is {p.status}. An administrator must approve the account before consultations can start.</div>}
    <Panel>{!queue.length ? <Empty title="Your queue is clear">Bookings will appear when a patient confirms their place in your queue.</Empty> : queue.map((b, i) => { const session = s.sessions.find((x) => x.id === b.sessionId); return <div className="ws-row" key={b.id}><div><h3>{b.position}. {b.patientName}</h3><p>{session.date} · {session.start}–{session.end} · {session.online ? "Session online" : "Session offline"}</p></div><Status>{b.status}</Status><div className="ws-actions">{b.status === "IN CONSULTATION" ? <Link to={"/app/room/" + b.id} className="ws-link">Open room</Link> : <><button className="ws-link" disabled={p.status !== "verified" || busy || !session.online || b.status !== "NEXT"} onClick={() => dispatch(transition({ id: b.id, status: "IN CONSULTATION" }))}>Call next</button><button className="ws-link secondary" disabled={p.status !== "verified"} onClick={() => setSkip(b.id)}>No-show</button></>}<Link className="ws-link secondary" to={"/app/booking/" + b.id}>Details</Link></div></div>; })}</Panel>
    {skip && <MessageOverlay type="confirm" title="Mark as no-show?" text="This person will leave the active queue. Their record and payment status will remain available for review." onClose={() => setSkip(null)} onConfirm={() => { dispatch(transition({ id: skip, status: "NO-SHOW" })); setSkip(null); }} />}
  </>;
}

export function Sessions() {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ date: new Date().toLocaleDateString("en-CA"), start: "17:00", end: "19:00" });
  const [error, setError] = useState("");
  if (!["doctor", "lawyer"].includes(s.role)) return <Empty title="Professional workspace">Sign in with a professional account to manage availability.</Empty>;
  const p = s.professionals.find((p) => p.id === s.professionalId);
  const sessions = s.sessions.filter((x) => x.professionalId === p.id);
  return <><PageHeading title="Time for your consultations.">Publish availability and start or pause each session independently.</PageHeading><div className="ws-grid-two"><Panel title="Your sessions">{sessions.map((x) => <div className="ws-row" key={x.id}><div><h3>{x.date}</h3><p>{x.start}–{x.end} · {x.capacity} places</p><Status>{x.online ? "Online" : "Offline"}</Status></div><button className="ws-link secondary" disabled={p.status !== "verified"} onClick={() => dispatch(toggleSession(x.id))}>{x.online ? "Pause session" : "Start session"}</button></div>)}</Panel><Panel title="Add availability"><form className="ws-form" onSubmit={(e) => { e.preventDefault(); if (form.start >= form.end) { setError("End time must be after start time."); return; } if (sessions.some((x) => x.date === form.date && form.start < x.end && form.end > x.start)) { setError("This session overlaps an existing session."); return; } dispatch(addSession(form)).then((action) => { if (!action.error) setError("Session added. Start it when you are ready."); }); }}>{[["date", "Date", "date"], ["start", "Start time", "time"], ["end", "End time", "time"]].map(([key, label, type]) => <label className="ws-field" key={key}>{label}<input type={type} required min={type === "date" ? new Date().toLocaleDateString("en-CA") : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<Button type="submit" disabled={p.status !== "verified"}>Add session</Button>{p.status !== "verified" && <p>Administrator verification is required to publish sessions.</p>}<p role="status">{error}</p></form></Panel></div></>;
}
