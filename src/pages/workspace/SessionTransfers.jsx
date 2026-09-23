import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { ArrowRightLeft, Search, Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { useWorkspace, Panel, PageHeading, Empty, Status } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./transfers.css";

const label = (s) => `${s.date} · ${s.start}–${s.end} (Sri Lanka)`;

export default function SessionTransfers({ embedded = false, view = "all" }) {
  const workspace = useWorkspace();
  const allowed = ["admin", "doctor", "lawyer"].includes(workspace.role);
  const showSessions = view === "all" || view === "request";
  const showHistory = view !== "request";
  const historyTitle = view === "upcoming" ? "Upcoming handovers" : view === "history" ? "Handover history" : "Requests & handover history";
  const dispatch = useDispatch();
  const [sessions, setSessions] = useState(null);
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState(null);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const formAnchor = useRef(null);
  const decisionAnchor = useRef(null);
  useEffect(() => { if (selected) formAnchor.current?.focus(); }, [selected]);
  useEffect(() => { if (decision) decisionAnchor.current?.focus(); }, [decision]);
  const load = useCallback(async () => {
    if (!allowed) return;
    const version = ++request.current;
    try {
      const [a, b] = await Promise.all([
        showSessions ? callApi("GET", "/transferable-sessions", null, { page: sessionPage }) : null,
        showHistory ? callApi("GET", "/session-transfers", null, { page, scope: view === "all" ? "all" : view }) : null,
      ]);
      if (version !== request.current) return;
      setSessions(a?.data); setHistory(b?.data); setError("");
    } catch (e) { if (version === request.current) setError(e.message); }
  }, [allowed, page, sessionPage, showSessions, showHistory, view]);
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => { clearInterval(interval); request.current += 1; };
  }, [load]);
  async function resolve() {
    if (busy || !decision) return;
    setBusy(true);
    try {
      const result = await callApi("POST", `/session-transfers/${decision.item.id}/decision`, { action: decision.action, reason: response });
      setDecision(null); setResponse(""); setNotice({ type: "success", text: result.message });
      await Promise.all([load(), dispatch(fetchWorkspace())]);
    } catch (e) { setDecision(null); setNotice({ type: "error", text: e.message }); await load(); }
    finally { setBusy(false); }
  }
  if (!allowed) return <Empty title="Professional and administrator access">Session handovers are managed by professionals and administrators.</Empty>;
  return <section className="session-transfers" aria-label="Session handovers">
    {!embedded && <PageHeading title="Session handovers.">Arrange cover for a booked session and follow every request and earnings reassignment.</PageHeading>}
    {error && <p role="alert" className="ws-error">{error} <button className="ws-link secondary" onClick={load}>Retry</button></p>}
    {showSessions && <Panel title="Hand over a booked session">
      <p>Choose a dated session with patients in its queue. The receiver must accept before ownership changes. Booked prices, queue order and weekly schedules stay the same.</p>
      <div className="ws-notice">Requests expire at the session start. Only sessions that have not started can be handed over. Amounts below are estimates; earnings count completed, paid consultations.</div>
      {!sessions && !error && <p role="status"><Loader2 size={18} className="animate-spin" /> Loading booked sessions…</p>}
      {sessions?.items.length === 0 && <Empty title="No sessions available for handover">Future sessions with queued patients will appear here.</Empty>}
      {sessions?.items.map((session) => <div className="transfer-session" key={session.id}>
        <div><h3>{label(session)}</h3><p>{session.professionalName} · {session.queueCount} queued · {money(session.expectedAmount)}</p>
          {session.pending && <small>Awaiting the receiver’s decision. You remain responsible until acceptance.</small>}
          {session.adminOnly && <small>An administrator must arrange any further handover.</small>}</div>
        <button className="ws-link" disabled={Boolean(session.pending) || session.adminOnly || busy} onClick={() => setSelected(session)}><ArrowRightLeft size={16} />Request handover</button>
      </div>)}
      {sessions && <Pagination page={sessionPage} count={sessions.count} size={sessions.pageSize} onChange={setSessionPage} />}
    </Panel>}
    {selected && <div ref={formAnchor} tabIndex={-1} aria-label="Request session handover"><TransferForm key={selected.id} session={selected} onClose={() => setSelected(null)} onSaved={async (text) => { setSelected(null); setNotice({ type: "success", text }); await Promise.all([load(), dispatch(fetchWorkspace())]); }} /></div>}
    {showHistory && <Panel title={historyTitle}>
      <p>{view === "history" ? "Past sessions and resolved requests remain here for review, including their earnings attribution." : "Incoming requests have Accept and Reject actions. Accepted upcoming sessions remain here until they finish. Your original session stays assigned until acceptance."}</p>
      {!history && !error && <p role="status">Loading requests…</p>}
      {history?.items.length === 0 && <Empty title="No handovers yet">Incoming requests, your requests and their outcomes appear here.</Empty>}
      {history?.items.map((item) => <article className="transfer-card" key={item.id}>
        <div className="transfer-heading"><h3>{label(item)}</h3><Status>{item.status}</Status></div>
        <p className="transfer-people">{item.fromName} <span aria-label="to">→</span> {item.toName}</p>
        <p>{item.reason}</p><small>Requested by {item.initiatedBy} · {new Date(item.createdAt).toLocaleString()}</small>
        <div className="transfer-totals"><span>{item.queueCount} queued at {item.status === "accepted" ? "acceptance" : "request"}</span><span>Estimated {money(item.expectedAmount)}</span>{item.status === "accepted" && <strong>Credited earnings {money(item.earnedAmount)}</strong>}</div>
        {item.responseReason && <p>Response: {item.responseReason}</p>}
        {item.status === "accepted" && <p className="ws-muted">Completed consultations are credited to the conducting professional. This is an earnings reassignment, not a bank payout.</p>}
        {item.status === "pending" && <div className="ws-actions">
          {item.toId === workspace.professionalId && <><button className="ws-link" disabled={busy} onClick={() => { setResponse(""); setDecision({ item, action: "accept" }); }}>Accept</button><button className="ws-link secondary" disabled={busy} onClick={() => { setResponse(""); setDecision({ item, action: "reject" }); }}>Reject</button></>}
          {(workspace.role === "admin" || item.fromId === workspace.professionalId) && <button className="ws-link secondary" disabled={busy} onClick={() => { setResponse(""); setDecision({ item, action: "cancel" }); }}>Cancel request</button>}
        </div>}
      </article>)}
      {history && <Pagination page={page} count={history.count} size={history.pageSize} onChange={setPage} />}
    </Panel>}
    {decision && <div ref={decisionAnchor} tabIndex={-1} aria-label="Confirm handover decision"><Panel title={`${decision.action === "accept" ? "Accept this session?" : decision.action === "reject" ? "Reject this request?" : "Cancel this request?"}`}>
      <p>{label(decision.item)} · {decision.item.fromName} → {decision.item.toName}</p>
      {decision.action === "accept" && <p>By accepting, you agree to conduct the session at the existing booked fees. Availability and queued patients will be checked again.</p>}
      <label className="ws-field">Response note (optional)<textarea value={response} maxLength={1000} onChange={(e) => setResponse(e.target.value)} disabled={busy} /></label>
      <div className="ws-actions"><button className="ws-link" disabled={busy} onClick={resolve}>{busy ? "Saving…" : "Confirm " + decision.action}</button><button className="ws-link secondary" disabled={busy} onClick={() => setDecision(null)}>Back</button></div>
    </Panel></div>}
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </section>;
}

function Pagination({ page, count, size, onChange }) {
  if (count <= size && page === 1) return null;
  return <div className="ws-actions"><button className="ws-link secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(count / size))}</span><button className="ws-link secondary" disabled={page * size >= count} onClick={() => onChange(page + 1)}>Next</button></div>;
}

function TransferForm({ session, onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState(null);
  const [person, setPerson] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search(e) {
    e.preventDefault(); setBusy(true); setError(""); setPerson(null);
    try { setPeople((await callApi("GET", `/sessions/${session.id}/transfer-candidates`, null, { q: query.trim() })).data); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function send(e) {
    e.preventDefault(); if (!person || busy) return;
    setBusy(true); setError("");
    try { const result = await callApi("POST", `/sessions/${session.id}/transfers`, { professionalId: person.id, reason: reason.trim() }); await onSaved(result.message); }
    catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <Panel title="Find a replacement professional">
    <p>{label(session)} · {session.queueCount} patients · estimated {money(session.expectedAmount)}</p>
    <form className="transfer-search" onSubmit={search}><label className="ws-field">Search by name or email<input value={query} minLength={2} maxLength={120} required disabled={busy} onChange={(e) => { setQuery(e.target.value); setPerson(null); setPeople(null); }} /></label><button className="ws-link" disabled={busy || query.trim().length < 2}><Search size={16} />{busy ? "Please wait…" : "Search"}</button></form>
    {people?.length === 0 && <p>No matching verified professionals found.</p>}
    <div role="group" aria-label="Replacement professionals">{people?.map((p) => <label className="transfer-candidate" key={p.id}><input type="radio" name="receiver" value={p.id} checked={person?.id === p.id} disabled={busy || Boolean(p.unavailable)} onChange={() => setPerson(p)} /><span><strong>{p.name}</strong><small>{p.speciality} · {p.registration} · {p.languages.join(", ")}</small>{p.unavailable && <small className="ws-error">{p.unavailable}</small>}</span></label>)}</div>
    <form onSubmit={send}><label className="ws-field">Reason for handover<textarea required minLength={5} maxLength={1000} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} placeholder="Explain why cover is needed. Avoid patient or private medical information." /></label><div className="ws-actions"><button className="ws-link" disabled={busy || !person || reason.trim().length < 5}>Send request</button><button type="button" className="ws-link secondary" disabled={busy} onClick={onClose}>Close</button></div></form>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </Panel>;
}
