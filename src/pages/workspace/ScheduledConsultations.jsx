import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { Empty, PageHeading, Panel, Status, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./appointments.css";
import ErrorNotice from "../../components/ui/ErrorNotice";
import ListFilters, { emptyFilters, filterParams } from "../../components/workspace/ListFilters";

export default function ScheduledConsultations({ embedded = false, renderQueue }) {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const allowed = ["admin", "doctor", "lawyer"].includes(state.role);
  const [scope, setScope] = useState("upcoming");
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const refresh = useCallback(() => setRetry((n) => n + 1), []);
  useEffect(() => {
    if (!allowed) return;
    let active = true, fetching = false;
    const controller = new AbortController();
    setResult(null); setError("");
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await callApi("GET", "/scheduled-consultations", null, { scope, page, ...filterParams(filters) }, { signal: controller.signal });
        if (active) { setResult(response.data); setError(""); }
      } catch (failure) { if (active) setError(failure.message); }
      finally { fetching = false; }
    };
    load();
    const interval = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => { active = false; clearInterval(interval); controller.abort(); };
  }, [allowed, scope, page, retry, filters]);

  async function cancelAppointment() {
    if (busy || !cancel) return;
    setBusy(true);
    try {
      const response = await callApi("POST", `/scheduled-consultations/${cancel.id}/cancel`);
      setCancel(null); setNotice({ type: "success", text: response.message });
      refresh(); await dispatch(fetchWorkspace());
    } catch (failure) { setCancel(null); setNotice({ type: "error", text: failure.message }); refresh(); }
    finally { setBusy(false); }
  }
  if (!allowed) return <Empty title="Page unavailable">Scheduled consultations are managed by professionals and administrators.</Empty>;
  return <section className="scheduled-consultations">
    {!embedded && <PageHeading title="Scheduled consultations.">Monitor one-off invitations, patient acceptance, payments and consultation outcomes. Clinical records remain private.</PageHeading>}
    <Panel title="One-off scheduled consultations">
      <p>Patients must accept and pay before the start time. Only paid appointments can be called from the consultation queue.</p>
      {!embedded && <label className="ws-field appointment-filter">Show<select aria-label="Appointment view" value={scope} onChange={(e) => { setScope(e.target.value); setPage(1); }}><option value="upcoming">Upcoming</option><option value="history">History</option><option value="all">All appointments</option></select></label>}
      <ErrorNotice error={error} onRetry={refresh} />
      {!result && !error && <p role="status">Loading scheduled consultations…</p>}
      {state.role === "admin" && <ListFilters label="Filter scheduled consultations" onApply={(value) => { setFilters(value); setPage(1); }} statuses={["PAYMENT PENDING", "WAITING", "NEXT", "IN CONSULTATION", "COMPLETED", "CANCELLED", "NO-SHOW"]} />}
      {result?.items.length === 0 && <Empty title="No scheduled consultations in this view">One-off appointments matching this view and any selected filters will appear here.</Empty>}
      {result?.items.map((item) => <article className="appointment-card" key={item.id}>
        <div className="ws-row"><div><h3>{item.patientName}</h3><p>{item.professionalName} · {item.date} · {item.start}–{item.end} (Sri Lanka)</p></div><Status>{item.status}</Status></div>
        <div className="appointment-summary"><span>Fee: <strong>{money(item.fee)}</strong></span><span>Payment: {item.payment}</span><span>Scheduled by: {item.scheduledBy}</span></div>
        {item.status === "PAYMENT PENDING" && <p className="ws-notice">Awaiting patient acceptance and payment before {item.start} on {item.date}. This appointment cannot start unpaid.</p>}
        {renderQueue?.(item.id)}
        <div className="ws-actions">
          {state.role !== "admin" && item.acceptedAt && <Link className="ws-link secondary" to={`/app/booking/${item.id}`}>View consultation</Link>}
          {item.canCancel && <button className="ws-link secondary" disabled={busy} onClick={() => setCancel(item)}>Cancel appointment</button>}
        </div>
      </article>)}
      {result && (result.count > result.pageSize || page > 1) && <div className="ws-actions"><button className="ws-link secondary" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</button><span>Page {page}</span><button className="ws-link secondary" disabled={page * result.pageSize >= result.count} onClick={() => setPage((n) => n + 1)}>Next</button></div>}
    </Panel>
    {cancel && <MessageOverlay type="confirm" title="Cancel scheduled consultation?" text={`Cancel the appointment for ${cancel.patientName}? The patient will see the updated status. Paid appointments follow the refund process.`} isProcessing={busy} onClose={() => { if (!busy) setCancel(null); }} onConfirm={cancelAppointment} />}
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </section>;
}
