import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { Panel, Empty, Status, useWorkspace } from "./Workspace";
import { MessageOverlay } from "../ui/MessageBox";
import "../../pages/workspace/appointments.css";

function TimeChoice({ option, selected, onChange, offerId }) {
  const day = new Date(`${option.date}T12:00:00+05:30`);
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(day);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Asia/Colombo" }).format(day);
  const minutes = (time) => { const [hours, mins] = time.split(":").map(Number); return hours * 60 + mins; };
  return <label className={`appointment-choice ${selected ? "selected" : ""} ${!option.available ? "unavailable" : ""}`}>
    <input type="radio" name={`offer-${offerId}`} value={option.id} required aria-label={`${option.date}, ${option.start}–${option.end}`} checked={selected} disabled={!option.available} onChange={onChange} />
    <span className="appointment-choice-details"><span className="appointment-choice-day">{weekday}</span><strong>{date}</strong><span className="appointment-choice-time">{option.start} – {option.end}</span><small>{minutes(option.end) - minutes(option.start)} minutes · Sri Lanka time</small><span className="appointment-choice-state">{!option.available ? "Time has passed" : selected ? "Selected" : "Select this time"}</span></span>
  </label>;
}

export default function AppointmentOffers({ embedded = false, history = false, all = false }) {
  const { role } = useWorkspace();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState({});
  const [notice, setNotice] = useState(null);
  const [version, setVersion] = useState(0);
  const [view, setView] = useState("upcoming");
  const navigate = useNavigate(); const dispatch = useDispatch();
  useEffect(() => {
    let active = true; let fetching = false;
    const controller = new AbortController();
    async function load() {
      if (fetching) return; fetching = true;
      try { const result = await callApi("GET", "/appointment-offers", null, null, { signal: controller.signal }); if (!Array.isArray(result.data)) throw new Error("The appointment invitation list could not be loaded. Please retry."); if (active) { setItems(result.data); setError(""); } }
      catch (error) { if (active) setError(error.message); }
      finally { fetching = false; }
    }
    load(); const timer = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [version]);
  async function choose(event, row) {
    event.preventDefault(); if (busy) return;
    setBusy(true);
    try { const result = await callApi("POST", `/appointment-offers/${row.id}/choose`, { sessionId: choices[row.id] }); await dispatch(fetchWorkspace()); navigate(`/app/booking/${result.data.id}?tab=summary`); }
    catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  const currentView = embedded ? all ? "all" : history ? "history" : "upcoming" : view;
  const visible = items?.filter((row) => currentView === "history" ? ["expired", "cancelled"].includes(row.status) : currentView === "all" ? ["open", "expired", "cancelled"].includes(row.status) : row.status === "open");
  const pastCount = items?.filter((row) => ["expired", "cancelled"].includes(row.status)).length || 0;
  const body = <>
    {!embedded && <label className="ws-field appointment-filter">Invitations<select aria-label="Invitation view" value={view} onChange={(event) => setView(event.target.value)}><option value="upcoming">Available times</option><option value="history">Past invitations ({pastCount})</option><option value="all">All invitations</option></select></label>}
    {!items && !error && <p role="status" className="ws-actions"><Loader2 className="animate-spin" size={18} />Loading time choices…</p>}
    {error && <p role="alert">{error}<button className="ws-name-link" onClick={() => setVersion(version + 1)}>Retry</button></p>}
    {!embedded && visible?.length === 0 && <Empty title="No appointment time choices">Private consultation invitations with available time choices will appear here.</Empty>}
    {visible?.map((row) => <article className="appointment-card" key={row.id}><div className="ws-row"><div><h3>{row.professionalName}{role !== "user" ? ` → ${row.patientName}` : ""}</h3><p>{money(row.fee)} · {row.reason}</p></div><Status>{row.status}</Status></div>
      {row.status === "expired" && <p className="ws-notice">These times passed before a selection was made. No booking or payment was created. Ask your professional for new times.</p>}
      {role === "user" && row.status === "open" ? <form onSubmit={(event) => choose(event, row)}><fieldset className="appointment-choice-fieldset" disabled={busy}><legend>Choose your appointment time</legend><p className="ws-muted">Select one time, then review your payment.</p><div className="appointment-choice-grid">{row.options.map((option) => <TimeChoice key={option.id} option={option} offerId={row.id} selected={choices[row.id] === option.id} onChange={() => setChoices((current) => ({ ...current, [row.id]: option.id }))} />)}</div><button className="ws-link appointment-choice-continue" disabled={busy || Boolean(error) || !row.options.some((option) => option.id === choices[row.id] && option.available)} aria-busy={busy}>{busy && <Loader2 className="animate-spin" size={18} />}Choose time & continue to payment</button></fieldset></form> : row.options.map((option) => <p key={option.id}>{option.date} · {option.start}–{option.end}</p>)}
      {row.bookingId && <Link className="ws-link secondary" to={`/app/booking/${row.bookingId}`}>View selected booking</Link>}
      {row.status === "open" && <button className="ws-link secondary mt-3" disabled={busy} onClick={() => setNotice({ type: "confirm", row })}>Cancel</button>}
    </article>)}
    {notice && (notice.type === "confirm" ? <MessageOverlay type="confirm" title="Cancel this invitation?" text="The unselected invitation will close and its reserved times will be released. No payment has been taken." onClose={() => setNotice(null)} onConfirm={async () => {
      setBusy(true); try { await callApi("POST", `/appointment-offers/${notice.row.id}/cancel`); setNotice({ type: "success", text: "Invitation cancelled." }); setVersion(version + 1); } catch (error) { setNotice({ type: "error", text: error.message }); } finally { setBusy(false); }
    }} /> : <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />)}
  </>;
  if (embedded && items && !visible.length && !error) return null;
  return embedded ? <div className="ws-space"><h3>{history ? "Past appointment invitations" : "Unselected appointment invitations"}</h3>{body}</div> : <Panel title="Choose appointment time">{body}</Panel>;
}
