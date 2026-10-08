import { useState } from "react";
import { useDispatch } from "react-redux";
import { Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { isBookableSession, sessionStartsAt, sessionLabel } from "../../features/consultations/model";
import { useWorkspace } from "./Workspace";
import Modal from "../ui/Modal";
import { MessageOverlay } from "../ui/MessageBox";

export default function MoveWeeklyBooking({ booking }) {
  const state = useWorkspace(); const dispatch = useDispatch();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState(""); const [reason, setReason] = useState("");
  const [notice, setNotice] = useState(null);
  if (state.role !== "user" || booking.scheduledById || booking.payment !== "paid" || !["WAITING", "NEXT", "NO-SHOW"].includes(booking.status)) return null;
  const options = state.sessions.filter((session) => !session.privateAppointment && session.professionalId === booking.professionalId && session.id !== booking.sessionId && session.remaining > 0 && isBookableSession(session) && sessionStartsAt(session) > Date.now()).sort((a, b) => sessionStartsAt(a) - sessionStartsAt(b));
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true);
    try { const result = await callApi("POST", `/bookings/${booking.id}/move-session`, { sessionId: destination, reason }); setOpen(false); setNotice({ type: "success", text: result.message }); await dispatch(fetchWorkspace()); }
    catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  return <div className="ws-space"><button className="ws-link secondary" onClick={() => setOpen(true)}>Move paid booking to another weekly session</button>
    {open && <Modal title="Choose another queue" busy={busy} onClose={() => setOpen(false)}><p>Your original payment and fee are retained. This only moves to a future weekly session with the same professional.</p><form className="ws-form" onSubmit={submit}><label className="ws-field">New session *<select required value={destination} onChange={(event) => setDestination(event.target.value)} disabled={busy}><option value="">Select a session</option>{options.map((session) => <option key={session.id} value={session.id}>{sessionLabel(session)}</option>)}</select></label>{!options.length && <p>No available future queues are currently listed. Ask your professional to open more sessions.</p>}<label className="ws-field">Reason *<textarea required minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} /></label><button className="ws-link" disabled={busy || !options.length} aria-busy={busy}>{busy && <Loader2 size={18} className="animate-spin" />}Move without extra payment</button></form></Modal>}
    {notice && <MessageOverlay type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}
  </div>;
}
