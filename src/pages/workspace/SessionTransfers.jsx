import SectionTabs from "../../components/ui/SectionTabs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { ArrowRightLeft, Search, Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { useWorkspace, Panel, PageHeading, Empty, Status } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./transfers.css";
import ErrorNotice from "../../components/ui/ErrorNotice";
import Modal from "../../components/ui/Modal";
import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";
import ListFilters, { emptyFilters, filterParams } from "../../components/workspace/ListFilters";

const label = (s) => `${s.date} · ${s.start}–${s.end} (Sri Lanka)`;

export default function SessionTransfers({ embedded = false, view = "all", allowRequest = false }) {
  const workspace = useWorkspace();
  const allowed = ["admin", "doctor", "lawyer"].includes(workspace.role);
  const [chooseSession, setChooseSession] = useState(false);
  const showSessions = view === "all" || view === "request" || chooseSession;
  const showHistory = view !== "request";
  const historyTitle = view === "upcoming" ? "Upcoming handovers" : view === "history" ? "Handover history" : "Requests & handover history";
  const dispatch = useDispatch();
  const [sessions, setSessions] = useState(null);
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionFilters, setSessionFilters] = useState({ ...emptyFilters });
  const [historyFilters, setHistoryFilters] = useState({ ...emptyFilters });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState(null);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  useUnsavedChanges(response, Boolean(decision));
  const load = useCallback(async () => {
    if (!allowed) return;
    const version = ++request.current;
    try {
      const [a, b] = await Promise.all([
        showSessions ? callApi("GET", "/transferable-sessions", null, { page: sessionPage, ...filterParams(sessionFilters) }) : null,
        showHistory ? callApi("GET", "/session-transfers", null, { page, scope: view === "all" ? "all" : view, ...filterParams(historyFilters) }) : null,
      ]);
      if (version !== request.current) return;
      setSessions(a?.data); setHistory(b?.data); setError("");
    } catch (e) { if (version === request.current) setError(e.message); }
  }, [allowed, page, sessionPage, showSessions, showHistory, view, sessionFilters, historyFilters]);
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => { clearInterval(interval); request.current += 1; };
  }, [load]);
  async function resolve() {
    if (busy || !decision) return;
    if (decision.action !== "accept" && response.trim().length < 3) { setNotice({ type: "error", text: "Explain why this handover is being rejected or withdrawn (at least 3 characters)." }); return; }
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
    <ErrorNotice error={error} onRetry={load} />
    <SectionTabs disabled={embedded}>
    {showSessions && (!allowRequest || chooseSession) && <SessionPicker modal={allowRequest} onClose={() => setChooseSession(false)}><Panel title="Hand over a booked session">
      {workspace.role === "admin" && <ListFilters label="Filter booked sessions" onApply={(value) => { setSessions(null); setSessionFilters(value); setSessionPage(1); }} statuses={["available", "pending"]} />}
      <p>Choose a dated session with patients in its queue. The receiver must accept before ownership changes. Booked prices, queue order and weekly schedules stay the same.</p>
      <div className="ws-notice">Requests expire at the session start. Only sessions that have not started can be handed over. Amounts below are estimates; earnings count completed, paid consultations.</div>
      {!sessions && !error && <p role="status"><Loader2 size={18} className="animate-spin" /> Loading booked sessions…</p>}
      {sessions?.items.length === 0 && <Empty title="No sessions available for handover">Future sessions with queued patients will appear here.</Empty>}
      {sessions?.items.map((session) => <div className="transfer-session" key={session.id}>
        <div><h3>{label(session)}</h3><p>{session.professionalName} · {session.queueCount} queued · {money(session.expectedAmount)}</p>
          {session.pending && <small>Awaiting the receiver’s decision. You remain responsible until acceptance.</small>}
          {session.adminOnly && <small>An administrator must arrange any further handover.</small>}</div>
        <button className="ws-link" disabled={Boolean(session.pending) || session.adminOnly || busy} onClick={() => { setSelected(session); setChooseSession(false); }}><ArrowRightLeft size={16} />Request handover</button>
      </div>)}
      {sessions && <Pagination page={sessionPage} count={sessions.count} size={sessions.pageSize} onChange={setSessionPage} />}
    </Panel></SessionPicker>}
    {showHistory && <Panel title={historyTitle}>
      {allowRequest && <div className="ws-actions"><button className="ws-link secondary" onClick={() => setChooseSession(true)}><ArrowRightLeft size={16} />Hand over a booked session</button></div>}
      {workspace.role === "admin" && <ListFilters label="Filter handover history" onApply={(value) => { setHistory(null); setHistoryFilters(value); setPage(1); }} statuses={["pending", "accepted", "rejected", "cancelled", "expired"]} />}
      <p>{view === "history" ? "Past sessions and resolved requests remain here for review, including their earnings attribution." : "Incoming requests have Accept and Reject actions. Accepted upcoming sessions remain here until they finish. Your original session stays assigned until acceptance."}</p>
      {!history && !error && <p role="status">Loading requests…</p>}
      {history?.items.length === 0 && <Empty title="No handovers yet">Incoming requests, your requests and their outcomes appear here.</Empty>}
      {history?.items.map((item) => <article className="transfer-card" key={item.id}>
        <div className="transfer-heading"><div><span className="transfer-eyebrow">{item.toId === workspace.professionalId ? "Incoming handover" : item.fromId === workspace.professionalId ? "Outgoing handover" : "Session handover"}</span><h3>{label(item)}</h3></div><Status>{item.status}</Status></div>
        <div className="transfer-participants">
          <div><span className="transfer-eyebrow">Original professional</span><strong>{item.fromName}</strong>{item.fromPhone ? <a href={`tel:${item.fromPhone}`}>{item.fromPhone}</a> : <span className="ws-muted">Mobile number not provided</span>}</div>
          <ArrowRightLeft size={20} aria-hidden="true" className="transfer-direction" />
          <div><span className="transfer-eyebrow">Replacement professional</span><strong>{item.toName}</strong>{item.toPhone ? <a href={`tel:${item.toPhone}`}>{item.toPhone}</a> : <span className="ws-muted">Mobile number not provided</span>}</div>
        </div>
        <div className="transfer-explanation"><span className="transfer-eyebrow">Reason for handover</span><p>{item.reason}</p></div>
        <dl className="transfer-totals"><div><dt>Queued at {item.status === "accepted" ? "acceptance" : "request"}</dt><dd>{item.queueCount} patients</dd></div><div><dt>Estimated consultation total</dt><dd>{money(item.expectedAmount)}</dd></div>{item.status === "accepted" && <div><dt>Credited earnings</dt><dd>{money(item.earnedAmount)}</dd></div>}</dl>
        {item.responseReason && <div className="transfer-explanation"><span className="transfer-eyebrow">Professional response · staff only</span><p>{item.responseReason}</p></div>}
        {item.status === "accepted" && <p className="ws-muted">Completed consultations are credited to the conducting professional. This is an earnings reassignment, not a bank payout.</p>}
        <p className="transfer-request-meta">Requested by {item.initiatedBy} · {new Date(item.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" })} (Sri Lanka)</p>
        {item.status === "pending" && <div className="ws-actions">
          {item.toId === workspace.professionalId && <><button className="ws-link" disabled={busy} onClick={() => { setResponse(""); setDecision({ item, action: "accept" }); }}>Accept</button><button className="ws-link secondary" disabled={busy} onClick={() => { setResponse(""); setDecision({ item, action: "reject" }); }}>Reject</button></>}
          {(workspace.role === "admin" || item.fromId === workspace.professionalId) && <button className="ws-link secondary" disabled={busy} onClick={() => { setResponse(""); setDecision({ item, action: "cancel" }); }}>Cancel request</button>}
        </div>}
      </article>)}
      {history && <Pagination page={page} count={history.count} size={history.pageSize} onChange={setPage} />}
    </Panel>}
    </SectionTabs>
    {selected && <TransferForm key={selected.id} session={selected} onClose={() => setSelected(null)} onSaved={async (text) => { setSelected(null); setNotice({ type: "success", text }); await Promise.all([load(), dispatch(fetchWorkspace())]); }} />}
    {decision && <Modal title="Review handover decision" busy={busy} onClose={() => setDecision(null)}><Panel title={`${decision.action === "accept" ? "Accept this session?" : decision.action === "reject" ? "Reject this request?" : "Cancel this request?"}`}>
      <p>{label(decision.item)} · {decision.item.fromName} → {decision.item.toName}</p>
      {decision.action === "accept" && <p>By accepting, you agree to conduct the session at the existing booked fees. Availability and queued patients will be checked again.</p>}
      <label className="ws-field">{decision.action === "accept" ? "Response note (optional)" : "Reason for this decision"}<textarea value={response} required={decision.action !== "accept"} minLength={decision.action !== "accept" ? 3 : undefined} maxLength={1000} onChange={(e) => setResponse(e.target.value)} disabled={busy} /></label><p className="ws-muted">Response notes are shared with the professionals and administrators, not patients.</p>
      <div className="ws-actions"><button className="ws-link" disabled={busy} onClick={resolve}>{busy ? "Saving…" : "Confirm " + decision.action}</button><button className="ws-link secondary" disabled={busy} onClick={() => setDecision(null)}>Back</button></div>
    </Panel></Modal>}
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </section>;
}

function SessionPicker({ modal, onClose, children }) {
  return modal ? <Modal title="Choose a booked session" onClose={onClose}>{children}</Modal> : children;
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
  const [closing, setClosing] = useState(false);
  const close = () => { if (query || person || reason) setClosing(true); else onClose(); };
  const markSaved = useUnsavedChanges({ person: person?.id, reason });
  async function search(e) {
    e.preventDefault(); setBusy(true); setError(""); setPerson(null);
    try { setPeople((await callApi("GET", `/sessions/${session.id}/transfer-candidates`, null, { q: query.trim() })).data); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function send(e) {
    e.preventDefault(); if (!person || busy) return;
    setBusy(true); setError("");
    try { const result = await callApi("POST", `/sessions/${session.id}/transfers`, { professionalId: person.id, reason: reason.trim() }); markSaved(); await onSaved(result.message); }
    catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <Modal title="Request session handover" busy={busy} onClose={close}><Panel title="Find a replacement professional">
    <p>{label(session)} · {session.queueCount} patients · estimated {money(session.expectedAmount)}</p>
    <form className="transfer-search" onSubmit={search}><label className="ws-field">Search by name or email<input value={query} minLength={2} maxLength={120} required disabled={busy} onChange={(e) => { setQuery(e.target.value); setPerson(null); setPeople(null); }} /></label><button className="ws-link" disabled={busy || query.trim().length < 2}><Search size={16} />{busy ? "Please wait…" : "Search"}</button></form>
    {people?.length === 0 && <p>No matching verified professionals found.</p>}
    <div role="group" aria-label="Replacement professionals">{people?.map((p) => <label className="transfer-candidate" key={p.id}><input type="radio" name="receiver" value={p.id} checked={person?.id === p.id} disabled={busy || Boolean(p.unavailable)} onChange={() => setPerson(p)} /><span><strong>{p.name}</strong><small>{p.speciality} · {p.registration} · {p.languages.join(", ")}</small>{p.unavailable && <small className="ws-error">{p.unavailable}</small>}</span></label>)}</div>
    <form onSubmit={send}><label className="ws-field">Reason for handover<textarea required minLength={5} maxLength={1000} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} placeholder="This reason will be shared with booked patients after acceptance. Do not include private medical or legal information." /></label><p className="ws-muted">After acceptance, booked patients and administrators are notified with this reason and the replacement professional's name.</p><div className="ws-actions"><button className="ws-link" disabled={busy || !person || reason.trim().length < 5}>Send request</button><button type="button" className="ws-link secondary" disabled={busy} onClick={close}>Close</button></div></form>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    {closing && <MessageOverlay type="confirm" title="Discard this handover draft?" text="Your replacement selection and reason have not been sent." confirmText="Discard draft" cancelText="Keep editing" onClose={() => setClosing(false)} onConfirm={onClose} />}
  </Panel></Modal>;
}
