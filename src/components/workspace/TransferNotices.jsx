import { Link } from "react-router-dom";
import { useWorkspace } from "./Workspace";

export default function TransferNotices() {
  const s = useWorkspace();
  const notices = s.transferNotifications || [];
  if (!notices.length) return null;
  if (s.role === "user") {
    const latest = [...new Map(notices.slice().reverse().map((n) => [n.sessionId, n])).values()];
    return <div aria-live="polite">{latest.map((n) => {
      const b = s.bookings.find((b) => b.sessionId === n.sessionId && ["WAITING", "NEXT", "PAYMENT PENDING", "IN CONSULTATION"].includes(b.status));
      return b && <div className="ws-notice" key={n.id}><strong>Your consultation professional has changed</strong><p>{n.date} · {n.start}–{n.end}: {n.toName} will conduct your session in place of {n.fromName}. Your booked fee and queue order are unchanged.</p><Link className="underline" to={`/app/booking/${b.id}`}>Review booking or cancel</Link></div>;
    })}</div>;
  }
  const pending = notices.filter((n) => n.status === "pending" && (n.incoming || s.role === "admin"));
  if (!pending.length) return null;
  return <div className="ws-notice" role="status"><strong>{pending.length} session handover request{pending.length === 1 ? "" : "s"} pending</strong><p>Review the session time, queued patients and fees before responding.</p><Link className="underline" to={s.role === "admin" ? "/app/transfers" : "/app/sessions"}>Review handovers</Link></div>;
}
