import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { Panel, Empty, Status, useWorkspace } from "./Workspace";
import { MessageOverlay } from "../ui/MessageBox";

export default function AppointmentOffers({ embedded = false, history = false }) {
  const { role } = useWorkspace();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState({});
  const [notice, setNotice] = useState(null);
  const [version, setVersion] = useState(0);
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
  const visible = items?.filter((row) => history ? ["expired", "cancelled"].includes(row.status) : row.status === "open");
  const body = <>
    {!items && !error && <p role="status" className="ws-actions"><Loader2 className="animate-spin" size={18} />Loading time choices…</p>}
    {error && <p role="alert">{error}<button className="ws-name-link" onClick={() => setVersion(version + 1)}>Retry</button></p>}
    {!embedded && visible?.length === 0 && <Empty title="No appointment time choices">Private consultation invitations with available time choices will appear here.</Empty>}
    {visible?.map((row) => <article className="appointment-card" key={row.id}><div className="ws-row"><div><h3>{row.professionalName}{role !== "user" ? ` → ${row.patientName}` : ""}</h3><p>{money(row.fee)} · {row.reason}</p></div><Status>{row.status}</Status></div>
      {role === "user" && row.status === "open" ? <form onSubmit={(event) => choose(event, row)}><fieldset disabled={busy}><legend>Choose your appointment time</legend><p className="ws-muted">Select one option below. You will review payment on the next page. All times are in Sri Lanka time.</p><div className="appointment-choice-grid">{row.options.map((option) => <label className={`appointment-choice ${choices[row.id] === option.id ? "selected" : ""} ${!option.available ? "unavailable" : ""}`} key={option.id}><span>{option.date} · {option.start}–{option.end} (Sri Lanka){!option.available && " · expired"}</span><input type="radio" name={`offer-${row.id}`} value={option.id} required checked={choices[row.id] === option.id} disabled={!option.available} onChange={() => setChoices({ ...choices, [row.id]: option.id })} /></label>)}</div><button className="ws-link" disabled={busy || Boolean(error) || !row.options.some((option) => option.id === choices[row.id] && option.available)} aria-busy={busy}>{busy && <Loader2 className="animate-spin" size={18} />}Choose time & continue to payment</button></fieldset></form> : row.options.map((option) => <p key={option.id}>{option.date} · {option.start}–{option.end}</p>)}
      {row.bookingId && <Link className="ws-link secondary" to={`/app/booking/${row.bookingId}`}>View selected booking</Link>}
      {row.status === "open" && <button className="ws-link secondary mt-3" disabled={busy} onClick={() => setNotice({ type: "confirm", row })}>Cancel</button>}
    </article>)}
    {notice && (notice.type === "confirm" ? <MessageOverlay type="confirm" title="Cancel this invitation?" text="The unselected invitation will close and its reserved times will be released. No payment has been taken." onClose={() => setNotice(null)} onConfirm={async () => {
      setBusy(true); try { await callApi("POST", `/appointment-offers/${notice.row.id}/cancel`); setNotice({ type: "success", text: "Invitation cancelled." }); setVersion(version + 1); } catch (error) { setNotice({ type: "error", text: error.message }); } finally { setBusy(false); }
    }} /> : <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />)}
  </>;
  if (embedded && items && !visible.length && !error) return null;
  return embedded ? <div className="ws-space"><h3>Unselected appointment invitations</h3>{body}</div> : <Panel title="Choose appointment time">{body}</Panel>;
}
