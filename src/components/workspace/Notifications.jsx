import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { Empty, PageHeading, Panel, useWorkspace } from "./Workspace";
import ErrorNotice from "../ui/ErrorNotice";
import "./notifications.css";
import { notificationDestination } from "../../features/consultations/navigation";

const timestamp = (value) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" });

export function NotificationBell() {
  const { notificationSummary } = useWorkspace();
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const button = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const count = notificationSummary?.unreadCount || 0;
  return <div className="notification-bell" ref={container}>
    <button ref={button} type="button" className="notification-toggle" aria-label={`Notifications, ${count} unread`} aria-expanded={open} aria-controls="notification-preview" onClick={() => setOpen(!open)}><Bell size={22} />{count > 0 && <span aria-hidden="true">{count > 99 ? "99+" : count}</span>}</button>
    {open && <section id="notification-preview" className="notification-preview" aria-label="Recent notifications">
      <div className="notification-preview-heading"><h2>Notifications</h2><button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); button.current?.focus(); }}><X size={18} /></button></div>
      {notificationSummary?.latest?.length ? notificationSummary.latest.map((item) => <Link key={item.id} className={`notification-preview-item ${item.readAt ? "" : "notification-unread"}`} to={`/app/notifications#notification-${item.id}`} onClick={() => setOpen(false)}><strong>{item.title}</strong><span>{item.body}</span><small>{timestamp(item.createdAt)} · Sri Lanka</small></Link>) : <p className="notification-preview-empty">You're all caught up. Updates will appear here.</p>}
      <Link className="notification-view-all" to="/app/notifications" onClick={() => setOpen(false)}>View all notifications {count > 0 ? `(${count} unread)` : ""}</Link>
    </section>}
  </div>;
}

export function NotificationAlerts() {
  const { notificationSummary } = useWorkspace();
  const userId = useSelector((state) => state.auth.user?.id);
  const seen = useRef(null);
  const [alerts, setAlerts] = useState([]);
  useEffect(() => { seen.current = null; setAlerts([]); }, [userId]);
  useEffect(() => {
    if (!notificationSummary) return;
    const latest = notificationSummary.latest || [];
    if (seen.current === null) { seen.current = new Set(latest.map((item) => item.id)); return; }
    const fresh = latest.filter((item) => !seen.current.has(item.id) && !item.readAt && item.actorId !== userId);
    latest.forEach((item) => seen.current.add(item.id));
    if (fresh.length) setAlerts((old) => [...fresh, ...old].slice(0, 3));
  }, [notificationSummary, userId]);
  useEffect(() => {
    if (!alerts.some((item) => !item.urgent)) return;
    const timer = setTimeout(() => setAlerts((old) => old.filter((item) => item.urgent)), 10000);
    return () => clearTimeout(timer);
  }, [alerts]);
  return <aside className="notification-toasts" aria-label="Live notifications" aria-live="polite" aria-relevant="additions">
    {alerts.map((item) => <div key={item.id} className={`notification-toast ${item.urgent ? "notification-urgent" : ""}`} role="status"><button type="button" aria-label={`Dismiss ${item.title}`} onClick={() => setAlerts((old) => old.filter((entry) => entry.id !== item.id))}><X size={18} /></button><strong>{item.title}</strong><p>{item.body}</p><Link to={`/app/notifications#notification-${item.id}`} onClick={() => setAlerts((old) => old.filter((entry) => entry.id !== item.id))}>View notification</Link></div>)}
  </aside>;
}

export default function Notifications() {
  const { notificationSummary, liveConnected, role } = useWorkspace();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const revision = JSON.stringify(notificationSummary);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await callApi("GET", "/notifications", null, { unread, page }, { signal: controller.signal });
        if (active) { setResult(response.data); setError(""); }
      } catch (failure) { if (active) setError(failure.message); }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [unread, page, revision, retry]);
  async function mark(item, follow = false) {
    if (busy) return;
    setBusy(true);
    try {
      if (!item || !item.readAt) await callApi("POST", item ? `/notifications/${item.id}/read` : "/notifications/read-all");
      if (!item) { setPage(1); setResult(null); }
      setRetry((value) => value + 1);
      await dispatch(fetchWorkspace());
      if (follow) navigate(notificationDestination(item, role));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <><PageHeading title="Your notifications.">Schedule changes, handovers, payments and account updates, saved in one place.</PageHeading>
    <Panel><div className="notification-toolbar"><div className="ws-actions" role="group" aria-label="Notification filter"><button className={`ws-link ${unread ? "secondary" : ""}`} aria-pressed={!unread} onClick={() => { if (unread || page !== 1) { setUnread(false); setPage(1); setResult(null); } }}>All</button><button className={`ws-link ${unread ? "" : "secondary"}`} aria-pressed={unread} onClick={() => { if (!unread || page !== 1) { setUnread(true); setPage(1); setResult(null); } }}>Unread ({notificationSummary?.unreadCount || 0})</button></div><button className="ws-link secondary" disabled={busy || !notificationSummary?.unreadCount} onClick={() => mark(null)}><CheckCheck size={17} />Mark all as read</button></div>
      <p className="ws-muted">{liveConnected ? "Live updates connected." : "Live updates reconnecting; checking for updates periodically."} Times shown in Sri Lanka time.</p>
      <ErrorNotice error={error} onRetry={() => setRetry((value) => value + 1)} />
      {!result && !error && <p role="status" className="ws-space">Loading notifications…</p>}
      {result?.items.length === 0 && <Empty title={unread ? "You're all caught up" : "No notifications yet"}>Your important updates will appear here.</Empty>}
      <div className="notification-list">{result?.items.map((item) => <article id={`notification-${item.id}`} key={item.id} className={`notification-card ${item.readAt ? "" : "notification-unread"}`}>
        <div className="notification-card-heading"><h2>{item.title}</h2>{!item.readAt && <span className="notification-unread-label">Unread</span>}</div>
        <p>{item.body}</p><time dateTime={item.createdAt}>{timestamp(item.createdAt)}</time>
        <div className="ws-actions"><button className="ws-link secondary" disabled={busy} onClick={() => mark(item, true)}>{item.kind === "booking.in consultation" ? "Join consultation" : item.kind === "clinic.started" ? "Open clinic room" : "View details"}</button>{!item.readAt && <button className="ws-name-link" disabled={busy} onClick={() => mark(item)}>Mark as read</button>}</div>
      </article>)}</div>
      {result && (result.count > result.pageSize || page > 1) && <div className="ws-actions"><button className="ws-link secondary" disabled={busy || page === 1} onClick={() => { setResult(null); setPage(page - 1); }}>Previous</button><span>Page {page}</span><button className="ws-link secondary" disabled={busy || page * result.pageSize >= result.count} onClick={() => { setResult(null); setPage(page + 1); }}>Next</button></div>}
    </Panel></>;
}
