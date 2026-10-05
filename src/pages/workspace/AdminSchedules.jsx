import { useEffect, useState } from "react";
import { callApi } from "../../api/apiClient";
import SectionTabs from "../../components/ui/SectionTabs";
import ErrorNotice from "../../components/ui/ErrorNotice";
import ListFilters, { emptyFilters, filterParams } from "../../components/workspace/ListFilters";
import { Empty, PageHeading, Panel, Status, useWorkspace } from "../../components/workspace/Workspace";
import { money } from "../../features/consultations/model";

function useAuditList(path, enabled) {
  const [result, setResult] = useState({ path: null, data: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true, fetching = false;
    async function load() {
      if (fetching) return;
      fetching = true;
      try {
        const { data } = await callApi("GET", path, null, null, { signal: controller.signal });
        if (active) setResult({ path, data, error: "" });
      } catch (error) { if (active) setResult({ path, data: null, error: error.message }); }
      finally { fetching = false; }
    }
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [path, enabled, retry]);
  return { ...(result.path === path ? result : { data: null, error: "" }), retry: () => setRetry((n) => n + 1) };
}

function Pages({ page, result, setPage }) {
  return result.count > result.pageSize || page > 1 ? <div className="ws-actions"><button className="ws-link secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="ws-link secondary" disabled={page * result.pageSize >= result.count} onClick={() => setPage(page + 1)}>Next</button></div> : null;
}

function QueueAudit({ id }) {
  const [page, setPage] = useState(1);
  const result = useAuditList(`/admin/weekly-sessions/${id}?page=${page}`, true);
  return <div className="ws-space"><ErrorNotice error={result.error} onRetry={result.retry} />{!result.data && !result.error && <p role="status">Loading queue audit…</p>}{result.data && <>
    {!result.data.items.length ? <Empty title="No bookings">This occurrence has no patient bookings.</Empty> : <div className="ws-table-wrap"><table className="ws-table"><caption className="sr-only">Weekly session queue audit</caption><thead><tr><th>Patient / client</th><th>Consultation status</th><th>Payment</th><th>Booked fee</th></tr></thead><tbody>{result.data.items.map((item) => <tr key={item.id}><td>{item.patientName}</td><td><Status>{item.status}</Status></td><td>{item.payment}</td><td>{money(item.fee)}</td></tr>)}</tbody></table></div>}
    <Pages page={page} result={result.data} setPage={setPage} />
  </>}</div>;
}

function WeeklyList({ templates = false }) {
  const { professionals } = useWorkspace();
  const [view, setView] = useState("upcoming");
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const query = new URLSearchParams({ ...filterParams(filters), page, ...(!templates ? { view } : {}) });
  const result = useAuditList(`/admin/${templates ? "weekly-availability" : "weekly-sessions"}?${query}`, true);
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return <Panel title={templates ? "Recurring weekly availability" : "Weekly session occurrences"}>
    <p>{templates ? "Current repeating weekday slots. Removing a slot does not erase previously booked session history. Date filters apply only to occurrences." : "Audit generated sessions, queued patients and completed consultations. Ongoing includes active consultations that overrun their scheduled end. Times use Sri Lanka time."}</p>
    {!templates && <label className="ws-field appointment-filter">Session view<select value={view} onChange={(event) => { setView(event.target.value); setPage(1); setExpanded(null); }}><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="history">History</option><option value="all">All sessions</option></select></label>}
    <ListFilters label={templates ? "Filter weekly availability" : "Filter weekly sessions"} onApply={(value) => { setFilters(value); setPage(1); setExpanded(null); }} dates={!templates} />
    <ErrorNotice error={result.error} onRetry={result.retry} />
    {!result.data && !result.error && <p role="status">Loading weekly schedules…</p>}
    {result.data && <>{!result.data.items.length && <Empty title="No weekly schedules in this view">Schedules matching the selected view and filters will appear here.</Empty>}
      {result.data.items.map((item) => <article className="appointment-card" key={item.id}><div className="ws-row"><div><h3>{item.professionalName}</h3><p>{item.profession} · {templates ? weekdays[item.weekday] : item.date} · {item.start}–{item.end} (Sri Lanka)</p></div>{!templates && <Status>{item.status}</Status>}</div><div className="appointment-summary"><span>Places: {item.capacity}</span>{templates ? <span>Current fee: {money(item.fee)}</span> : <><span>{item.online ? "Online" : "Offline"}</span><span>Bookings: {item.booked}</span><span>Queued: {item.queued}</span><span>Completed: {item.completed}</span></>}</div>
        {!templates && <>{item.delayMinutes >= 15 && <p className="ws-notice" role="status">Not started: {item.delayMinutes} minutes late. Contact {item.professionalName}{professionals.find((person) => person.id === item.professionalId)?.phone ? ` at ${professionals.find((person) => person.id === item.professionalId).phone}` : " (phone not provided)"}. Arrange a handover if unavailable.</p>}<button className="ws-link secondary" aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>{expanded === item.id ? "Hide queue audit" : "View queue audit"}</button>{expanded === item.id && <QueueAudit id={item.id} />}</>}
      </article>)}<Pages page={page} result={result.data} setPage={setPage} />
    </>}
  </Panel>;
}

export default function AdminSchedules() {
  const { role } = useWorkspace();
  if (role !== "admin") return <Empty title="Page unavailable">Weekly schedule auditing is available to administrators.</Empty>;
  return <><PageHeading title="Weekly schedules.">Review recurring availability and individual dated queues without accessing clinical records.</PageHeading><SectionTabs ids={["sessions", "availability"]} labels={["Session queues", "Recurring availability"]}><WeeklyList /><WeeklyList templates /></SectionTabs></>;
}
