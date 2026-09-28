import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { CalendarDays, Users, Video } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { money, sriLankanDate } from "../../features/consultations/model";
import { Empty, PageHeading, Panel, Status, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import VideoCall from "../../components/workspace/VideoCall";
import PayHereCheckout from "../../components/workspace/PayHereCheckout";
import "./clinics.css";
import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";
import ErrorNotice from "../../components/ui/ErrorNotice";
import ListFilters, { emptyFilters, filterParams } from "../../components/workspace/ListFilters";
import EditSessionTime from "../../components/workspace/EditSessionTime";
import ReasonDialog from "../../components/ui/ReasonDialog";

function useClinics(endpoint) {
  const [result, setResult] = useState({ endpoint: null, data: null, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true, fetching = false;
    const controller = new AbortController();
    async function load() {
      if (fetching) return;
      fetching = true;
      try {
        const response = await callApi("GET", endpoint, null, null, { signal: controller.signal });
        if (active) setResult({ endpoint, data: response.data, error: "" });
      } catch (error) {
        if (active) setResult((old) => ({ endpoint, data: old.endpoint === endpoint ? old.data : null, error: error.message }));
      } finally { fetching = false; }
    }
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
    window.addEventListener("focus", load);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", load); };
  }, [endpoint, version]);
  return { ...(result.endpoint === endpoint ? result : { data: null, error: "" }), refresh: () => setVersion((n) => n + 1) };
}

function LoadState({ data, error, refresh }) {
  if (error) return <ErrorNotice error={error} onRetry={refresh} />;
  if (!data) return <p role="status" className="ws-notice">Loading clinics…</p>;
  return null;
}

export function ScheduleClinic() {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const professional = state.professionals.find((p) => p.id === state.professionalId);
  const [form, setForm] = useState({ title: "", description: "", date: sriLankanDate(), start: "", end: "", capacity: 20, fee: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const markSaved = useUnsavedChanges(form);
  const enabled = professional?.status === "verified";
  const field = (key) => ({ value: form[key], onChange: (event) => setForm((old) => ({ ...old, [key]: event.target.value })) });
  async function submit(event) {
    event.preventDefault();
    if (busy || !enabled) return;
    if (form.start >= form.end || Date.parse(`${form.date}T${form.start}:00+05:30`) <= Date.now()) {
      setNotice({ type: "error", text: "Choose a future start and an end time after it, in Sri Lanka time." }); return;
    }
    setBusy(true);
    try {
      const response = await callApi("POST", "/clinics", { ...form, title: form.title.trim(), description: form.description.trim(), capacity: Number(form.capacity), fee: Number(form.fee) });
      await dispatch(fetchWorkspace());
      markSaved();
      setNotice({ type: "success", text: response.message, id: response.data.id });
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  return <Panel title="Schedule a group clinic">
    <p>A lecture-style session for several patients or clients at the same time. This is separate from private consultations.</p>
    <div className="ws-notice">The whole date is reserved for this clinic. Empty weekly slots are hidden for that date; existing bookings must be resolved first. Your repeating weekly timetable stays unchanged.</div>
    {!enabled && <p className="ws-notice">Administrator verification is required before scheduling a clinic.</p>}
    <form onSubmit={submit}>
      <fieldset className="clinic-fieldset" disabled={busy || !enabled}>
        <label className="ws-field">Clinic title<input required minLength={3} maxLength={160} {...field("title")} placeholder="For example, Understanding diabetes care" /></label>
        <label className="ws-field">Clinic description<textarea maxLength={3000} {...field("description")} placeholder="Describe the topic and intended audience. Do not include patient information." /></label>
        <div className="clinic-form-grid">
          <label className="ws-field">Clinic date<input type="date" required min={sriLankanDate()} {...field("date")} /></label>
          <label className="ws-field">Clinic start time<input type="time" required {...field("start")} /></label>
          <label className="ws-field">Clinic end time<input type="time" required {...field("end")} /></label>
        </div>
        <div className="clinic-fee-grid">
          <label className="ws-field">Clinic consultation fee (LKR)<input type="number" required min="0.01" max="1000000" step="0.01" {...field("fee")} /></label>
          <label className="ws-field">Clinic places<input type="number" required min="2" max="100" step="1" {...field("capacity")} /></label>
        </div>
        <p className="ws-muted">Fee per attendee, for this clinic only. All times use Sri Lanka time. Attendees must pay before joining. Microphones start muted and can be enabled; attendee cameras and chat are disabled.</p>
        <div className="ws-actions"><button className="ws-link" disabled={busy || !enabled}>{busy ? "Scheduling clinic…" : "Schedule clinic"}</button><Link className="ws-link secondary" to="/app/queue">View my clinics</Link></div>
      </fieldset>
    </form>
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => { const id = notice.id; setNotice(null); if (id) navigate(`/app/clinics/${id}`); }} />}
  </Panel>;
}

export function ClinicList({ view = "upcoming", profession, title = "Group clinics", embedded = false, filters = emptyFilters }) {
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const query = new URLSearchParams({ view, ...filterParams(filters), ...(profession ? { profession } : {}), ...(view === "available" ? { q: appliedSearch } : {}) });
  const key = query.toString();
  const page = pagination.key === key ? pagination.page : 1;
  const result = useClinics(`/clinics?${key}&page=${page}`);
  return <section className="clinic-list" aria-label={title}>
    <Panel title={title}>
      <p>{view === "available" ? "Join a paid group lecture with a verified professional. Clinics have their own fees and no individual queue." : "Group lectures are separate from your private consultation queues. Status updates every 10 seconds."}</p>
      {view === "available" && <form className="transfer-search" onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); }}><label className="ws-field">Search clinics by professional name<input type="search" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${profession || "professional"} name`} /></label><button className="ws-link">Search</button><button type="button" className="ws-link secondary" onClick={() => { setSearch(""); setAppliedSearch(""); }}>Clear</button></form>}
      <LoadState {...result} />
      {result.data && <>
        {!result.data.items.length && <Empty title="No clinics in this view">{view === "available" ? "Available group clinics will appear here when professionals schedule them." : "Clinics matching this view and any selected filters will appear here."}</Empty>}
        {result.data.items.length > 0 && <div className="clinic-cards">{result.data.items.map((clinic) => <article className="clinic-card" key={clinic.id}>
          <div className="clinic-card-top"><span className="clinic-type"><Users size={16} />Group lecture</span><Status>{clinic.status}</Status></div>
          <h3><Link to={`/app/clinics/${clinic.id}`}>{clinic.title}</Link></h3>
          <p>{clinic.professionalName} · {clinic.profession}</p>
          <p className="clinic-date"><CalendarDays size={16} />{clinic.date} · {clinic.start}–{clinic.end}</p>
          <div className="clinic-card-bottom"><strong>{money(clinic.registration?.fee || clinic.fee)}</strong><span>{clinic.remaining} of {clinic.capacity} places available</span></div>
          {clinic.registration && <p>Your registration: {clinic.registration.status} · {clinic.registration.payment}</p>}
          <Link className="ws-link secondary" to={`/app/clinics/${clinic.id}`}>{clinic.registration?.status === "pending" ? "Continue to clinic payment" : clinic.status === "live" ? "Open clinic room" : "View clinic"}</Link>
        </article>)}</div>}
        {result.data.count > result.data.pageSize && <div className="clinic-pagination"><button className="ws-link secondary" disabled={page === 1} onClick={() => setPagination({ key, page: page - 1 })}>Previous</button><span>Page {page} of {Math.ceil(result.data.count / result.data.pageSize)}</span><button className="ws-link secondary" disabled={page * result.data.pageSize >= result.data.count} onClick={() => setPagination({ key, page: page + 1 })}>Next</button></div>}
      </>}
    </Panel>
  </section>;
}

export default function Clinics() {
  const { role } = useWorkspace();
  const [view, setView] = useState("upcoming");
  const [filters, setFilters] = useState({ ...emptyFilters });
  if (["doctor", "lawyer"].includes(role)) return <Navigate to="/app/queue" replace />;
  if (role === "user") return <Navigate to="/app/bookings" replace />;
  return <><PageHeading title={role === "admin" ? "Clinics & registrations." : "Your group clinics."}>Review schedules, confirmed registrations and clinic payments separately from private consultations.</PageHeading>
    <label className="ws-field clinic-filter">Clinic view<select value={view} onChange={(event) => setView(event.target.value)}><option value="upcoming">Upcoming and live</option><option value="history">Past and cancelled</option><option value="all">All clinics</option>{role === "user" && <option value="available">Available clinics</option>}</select></label>
    <ListFilters label="Filter group clinics" onApply={setFilters} statuses={["scheduled", "live", "completed", "cancelled"]} />
    <ClinicList view={view} filters={filters} />
  </>;
}

export function ClinicDetails() {
  const { id } = useParams();
  return <ClinicDetailContent key={id} id={id} />;
}

function ClinicDetailContent({ id }) {
  const { role, professionalId, payhereEnabled } = useWorkspace();
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const result = useClinics(`/clinics/${id}?page=${page}`);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const markSaved = useUnsavedChanges({ reason, consent });
  const clinic = result.data;
  async function action(path, body) {
    if (busy) return;
    setConfirm(null); setBusy(true);
    try {
      const response = await callApi("POST", `/clinics/${id}/${path}`, body);
      markSaved();
      setNotice({ type: "success", text: response.message });
      result.refresh();
      await dispatch(fetchWorkspace());
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  if (!clinic) return <><PageHeading title="Clinic details." /><LoadState {...result} /></>;
  const owner = professionalId === clinic.professionalId;
  const staff = owner || role === "admin";
  const registration = clinic.registration;
  const before = Date.now() < Date.parse(clinic.startsAt);
  const liveTime = !before && Date.now() < Date.parse(clinic.endsAt);
  const scheduled = clinic.status === "scheduled";
  const paid = registration?.status === "confirmed" && registration.payment === "paid";
  const canJoin = clinic.status === "live" && liveTime && clinic.professionalAvailable && (owner || paid);
  const canPay = registration?.status === "pending" && Date.now() < Date.parse(registration.paymentDueAt) && scheduled && before && clinic.professionalAvailable;
  const disabled = busy || Boolean(result.error);
  return <>
    <Link className="ws-name-link" to={["doctor", "lawyer"].includes(role) ? (["completed", "cancelled"].includes(clinic.status) || Date.parse(clinic.endsAt) <= Date.now() ? "/app/history" : "/app/queue") : role === "user" ? (["completed", "cancelled"].includes(clinic.status) || Date.parse(clinic.endsAt) <= Date.now() ? "/app/history" : "/app/bookings") : "/app/clinics"}>← Back to {["doctor", "lawyer"].includes(role) ? "consultations" : role === "user" ? "my consultations" : "clinics"}</Link>
    <PageHeading eyebrow="GROUP CLINIC · LECTURE" title={clinic.title} action={<Status>{clinic.status}</Status>}>{clinic.professionalName} · {clinic.profession}</PageHeading>
    <LoadState {...result} />
    <div className="ws-grid-two"><Panel title="Clinic information">
      <p className="clinic-description">{clinic.description || "No additional description."}</p>
      <div className="ws-row"><span>Date and time</span><strong>{clinic.date} · {clinic.start}–{clinic.end}</strong></div>
      <p className="ws-muted">Sri Lanka time</p>
      <div className="ws-row"><span>Fee per attendee</span><strong>{money(clinic.fee)}</strong></div>
      <div className="ws-row"><span>Available places</span><strong>{clinic.remaining} / {clinic.capacity}</strong></div>
      {clinic.cancellationReason && <p className="ws-notice">Cancellation: {clinic.cancellationReason}</p>}
    </Panel><Panel title={staff ? "Manage clinic" : "Your clinic registration"}>
      <div className="ws-notice">This is a shared group clinic. Your microphone starts muted; you can turn it on to speak. Attendee cameras and chat are disabled. Do not share personal medical or legal information. Private consultation records are not shared here.</div>
      {payhereEnabled ? <p className="ws-muted">Payments are securely processed by PayHere. Your place is confirmed only after PayHere verifies payment.</p> : <p className="ws-notice">Online payments are not connected. Reservations cannot be paid until a payment provider is configured.</p>}
      {role === "user" && <>
        {registration && <div className="ws-row"><Status>{registration.status}</Status><span>{registration.payment} · {money(registration.fee)}</span></div>}
        {(!registration || registration.status === "expired") && scheduled && before && <>
          <label className="clinic-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I understand this is a shared group lecture, not a private consultation.</label>
          <button className="ws-link" disabled={disabled || !consent || !clinic.remaining || !clinic.professionalAvailable} onClick={() => action("register", { consent: true })}>Reserve clinic place</button>
        </>}
        {registration?.status === "pending" && <p className="ws-muted">Pay before {new Date(registration.paymentDueAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} (Sri Lanka time). Unpaid places expire automatically.</p>}
        <div className="ws-actions">
          {registration && ["pending", "confirmed"].includes(registration.status) && scheduled && before && <button className="ws-link secondary" disabled={disabled} onClick={() => setConfirm({ title: "Cancel clinic registration?", text: "Your place will be released. Verified payments are marked for refund review. A cancelled registration cannot be rebooked.", path: "cancel-registration" })}>Cancel registration</button>}
        </div>
        {registration?.status === "pending" && payhereEnabled && <PayHereCheckout endpoint={`/clinics/${id}/payhere-checkout`} amount={money(registration.fee)} disabled={disabled || !canPay} />}
        {paid && scheduled && <p className="ws-notice">Your place is confirmed. The group room opens when the professional starts the clinic during its scheduled time.</p>}
      </>}
      {staff && <>
        <div className="ws-actions">
          {clinic.canUpdate && <button className="ws-link secondary" disabled={disabled} onClick={() => setEditing(true)}>Update time & places</button>}
          {owner && scheduled && <button className="ws-link" disabled={disabled || !liveTime || !clinic.professionalAvailable} onClick={() => setConfirm({ title: "Start group clinic?", text: "Paid attendees will be able to enter the lecture room. Starting commits this clinic to the scheduled end time.", path: "start" })}><Video size={16} />Start clinic</button>}
          {clinic.status === "live" && <button className="ws-link" disabled={disabled} onClick={() => setConfirm({ title: "Complete clinic?", text: "The group room will close for everyone. Confirmed paid tickets will count toward the professional's clinic earnings, including attendees who did not join.", path: "complete" })}>Complete clinic</button>}
        </div>
        {clinic.canCancel && <div className="clinic-cancel"><label className="ws-field">Cancellation reason<textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the clinic cannot take place." /></label><button className="ws-link secondary" disabled={disabled || reason.trim().length < 3} onClick={() => setConfirm({ title: "Cancel the entire clinic?", text: "All unpaid registrations will be cancelled and the date will be released.", path: "cancel", body: { reason: reason.trim() } })}>Cancel clinic</button></div>}
        {clinic.canUpdate && !clinic.canCancel && <p className="ws-notice">This clinic has received payment. You can update its time and places, but cannot cancel it.</p>}
      </>}
      {busy && <p role="status">Saving clinic changes…</p>}
    </Panel></div>
    {canJoin && <div className="ws-space"><VideoCall clinicId={id} /></div>}
    {staff && <div className="ws-space"><Panel title="Clinic registrations & payments">
      <div className="clinic-payment-summary"><span>Collected: <strong>{money(clinic.paymentTotals?.paid || 0)}</strong></span><span>Refund requested: <strong>{money(clinic.paymentTotals?.["refund requested"] || 0)}</strong></span></div>
      <p className="ws-muted">Clinic ticket revenue enters monthly earnings only after the clinic completes. Access authorization is not proof of attendance. No private records are linked to this roster.</p>
      {clinic.registrations?.length ? <div className="ws-table-wrap"><table className="ws-table"><caption className="sr-only">Clinic registrations and PayHere payment status</caption><thead><tr><th>Patient / client</th><th>Registration</th><th>Payment</th><th>Amount</th><th>Paid at (Sri Lanka)</th></tr></thead><tbody>{clinic.registrations.map((row) => <tr key={row.id}><td>{row.patientName}</td><td>{row.status}</td><td>{row.payment}</td><td>{money(row.fee)}</td><td>{row.paidAt ? new Date(row.paidAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" }) : "Not paid"}</td></tr>)}</tbody></table></div> : <Empty title="No registrations yet">Paid and unpaid registrations will appear here.</Empty>}
      {clinic.registrationCount > clinic.pageSize && <div className="clinic-pagination"><button className="ws-link secondary" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Previous</button><span>Page {page}</span><button className="ws-link secondary" disabled={page * clinic.pageSize >= clinic.registrationCount} onClick={() => setPage((n) => n + 1)}>Next</button></div>}
    </Panel></div>}
    {editing && <EditSessionTime clinic item={clinic} endpoint={`/clinics/${id}`} onClose={() => setEditing(false)} onSaved={async (text) => { setEditing(false); setNotice({ type: "success", text }); result.refresh(); await dispatch(fetchWorkspace()); }} />}
    {confirm && (confirm.path === "cancel-registration" ? <ReasonDialog title={confirm.title} text={confirm.text} busy={busy} onClose={() => setConfirm(null)} onConfirm={(reason) => action(confirm.path, { reason })} /> : <MessageOverlay type="confirm" title={confirm.title} text={confirm.text} onClose={() => setConfirm(null)} onConfirm={() => action(confirm.path, confirm.body)} />)}
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </>;
}
