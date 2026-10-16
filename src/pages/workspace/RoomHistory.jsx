import { useEffect, useRef, useState } from "react";
import { ArrowLeft, History } from "lucide-react";
import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { Empty, Panel, useWorkspace } from "../../components/workspace/Workspace";
import { PatientContext, ChatMessages, Prescription } from "./ConsultationRecord";

function useHistory(endpoint, page, revision = "") {
  const key = endpoint + ":" + page + ":" + revision;
  const [attempt, retry] = useState(0);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    if (!endpoint) return;
    let active = true;
    const controller = new AbortController();
    setState({ loading: true, key });
    callApi("GET", endpoint, null, { page }, { signal: controller.signal })
      .then(({ data }) => { if (active) setState({ data, key }); })
      .catch((error) => { if (active) setState({ error: error.message, key }); });
    return () => { active = false; controller.abort(); };
  }, [endpoint, page, attempt, revision, key]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) retry((value) => value + 1); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return { ...(state.key === key ? state : { loading: true }), retry: () => retry((value) => value + 1) };
}

function LoadingOrError({ state }) {
  if (state.loading) return <GlobalLoader compact message="Loading consultation history" />;
  if (state.error) return <div role="alert"><p>{state.error}</p><button type="button" className="ws-link secondary" onClick={state.retry}>Retry history</button></div>;
  return null;
}

function dateLabel(date) {
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function RoomHistory({ bookingId, renderDocuments }) {
  const workspace = useWorkspace();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const state = useHistory("/bookings/" + bookingId + "/history", page);
  const list = useRef(null);
  if (selected) return <HistoryRecord bookingId={bookingId} recordId={selected} renderDocuments={renderDocuments} onBack={() => { setSelected(null); requestAnimationFrame(() => list.current?.querySelector('[data-record="' + selected + '"]')?.focus()); }} />;
  return <Panel title="Consultation history">
    <p>{workspace.role === "user" ? "Your completed consultations with this professional." : "This patient/client’s completed consultations with you."} Open a record here while your call stays connected.</p>
    <LoadingOrError state={state} />
    {state.data && <><p className="room-history-count">{state.data.count} previous {state.data.count === 1 ? "consultation" : "consultations"}</p>
      {!state.data.items.length && <Empty title="No previous consultations">Completed consultations with this professional will appear here.</Empty>}
      <div ref={list} className="room-history-list">{state.data.items.map((item) => <article key={item.id} className="room-history-item"><History size={19} aria-hidden="true" /><div><h3>{dateLabel(item.date)}</h3><p>Session: {item.start}–{item.end}</p>{item.completedAt && <small>Completed: {new Date(item.completedAt).toLocaleString()}</small>}<button type="button" className="ws-link secondary" data-record={item.id} onClick={() => setSelected(item.id)}>View record</button></div></article>)}</div>
      {state.data.count > state.data.pageSize && <nav className="ws-actions" aria-label="History pages"><button type="button" className="ws-link secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(state.data.count / state.data.pageSize)}</span><button type="button" className="ws-link secondary" disabled={page * state.data.pageSize >= state.data.count} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </>}
  </Panel>;
}

function HistoryRecord({ bookingId, recordId, onBack, renderDocuments }) {
  const workspace = useWorkspace();
  const liveRecord = workspace.bookings.find((item) => item.id === recordId);
  const revision = [liveRecord?.updatedAt, liveRecord?.prescriptionRevision, liveRecord?.notesRevision].join(":");
  const state = useHistory("/bookings/" + bookingId + "/history/" + recordId, 1, revision);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const record = state.data;
  return <div className="room-history-record">
    <Panel title="Previous consultation"><button ref={heading} type="button" className="ws-link secondary" onClick={onBack}><ArrowLeft size={16} />Back to history</button><LoadingOrError state={state} />
      {record && <div className="room-history-summary"><h3>{dateLabel(record.date)}</h3><p>Session: {record.start}–{record.end}</p>{record.completedAt && <p>Completed: {new Date(record.completedAt).toLocaleString()}</p>}<h3>Shared notes</h3><p>{record.notes || "No shared notes recorded."}</p><h3>Follow-up</h3><p>{record.followUp || "No follow-up recorded."}</p>{workspace.role !== "user" && record.privateNotes && <><h3>Your private notes</h3><p>{record.privateNotes}</p></>}</div>}
    </Panel>
    {record && <><PatientContext booking={record} /><Prescription key={record.id} booking={record} readOnly />{renderDocuments(record)}<Panel title="Previous messages"><ChatMessages booking={record} /></Panel></>}
  </div>;
}
