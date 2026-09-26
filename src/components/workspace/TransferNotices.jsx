import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "./Workspace";
import { MessageOverlay } from "../ui/MessageBox";

export default function TransferNotices() {
  const s = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(new Set());
  const notices = s.transferNotifications || [];
  const owner = s.patient.id || s.professionalId || "admin";
  const key = (notice) => `cc-handover:${owner}:${notice.id}:accepted`;
  const wasRead = (notice) => {
    if (dismissed.has(key(notice))) return true;
    try { return sessionStorage.getItem(key(notice)) === "read"; } catch { return false; }
  };
  const latest = [...new Map(notices.slice().reverse().map((n) => [n.sessionId, n])).values()];
  const changed = s.role !== "admin" && latest.find((n) => n.status === "accepted" && !wasRead(n) && Date.parse(`${n.date}T${n.end}:00+05:30`) > Date.now());
  const dismiss = () => {
    if (!changed) return;
    try { sessionStorage.setItem(key(changed), "read"); } catch { /* Memory fallback for restricted browsers. */ }
    setDismissed((old) => new Set([...old, key(changed)]));
  };
  if (changed) return <MessageOverlay type="confirm" title="Session handover confirmed" text={`${changed.date}, ${changed.start}–${changed.end} (Sri Lanka): ${changed.toName} will conduct the session in place of ${changed.fromName}. Reason: ${changed.reason || "Cover arranged by the institution."} The booked time, fee and queue order remain unchanged.`} confirmText={s.role === "user" ? "View my consultations" : "View consultation queue"} cancelText="Dismiss" onClose={dismiss} onConfirm={() => { dismiss(); navigate(s.role === "user" ? "/app/bookings" : "/app/queue"); }} />;
  const pending = notices.filter((n) => n.status === "pending" && (n.incoming || s.role === "admin"));
  if (!pending.length || !["/app", "/app/queue", "/app/transfers"].includes(location.pathname)) return null;
  return <div className="ws-notice" role="status"><strong>{pending.length} session handover request{pending.length === 1 ? "" : "s"} pending</strong><p>Review the session time, queued patients and fees before responding.</p><Link className="underline" to={s.role === "admin" ? "/app/transfers" : "/app/queue"}>Review handovers</Link></div>;
}
