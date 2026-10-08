import { useState } from "react";
import { useDispatch } from "react-redux";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import ReasonDialog from "../ui/ReasonDialog";
import { MessageOverlay } from "../ui/MessageBox";

export default function RefundRequest({ booking, session, clinic = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const dispatch = useDispatch();
  if (booking.walletCredited) return <p className="ws-notice">This payment has been credited to your wallet in My profile.</p>;
  if (booking.payment !== "paid" || !(clinic ? booking.status === "confirmed" : ["WAITING", "NEXT"].includes(booking.status))) return null;
  const eligible = booking.changeRefundEligible;
  const absence = session && Date.parse(session.startsAt) + 15 * 60000 <= Date.now() && !session.startedAt;
  if (!eligible && !absence) return null;
  async function request(reason) {
    setBusy(true);
    try {
      const result = await callApi("POST", "/refund-requests", { [clinic ? "registrationId" : "bookingId"]: booking.id, reason });
      setMessage({ type: "success", text: result.message }); setOpen(false);
      dispatch(fetchWorkspace({ live: true }));
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  return <div className="ws-space">
    <p>{eligible ? "The professional or scheduled time changed. Your booking stays active unless you request a refund." : "If the professional has not attended, you can ask the administrator to review it."}</p>
    <button className="ws-link secondary" onClick={() => setOpen(true)}>{eligible ? "Decline change & refund to wallet" : "Report professional absence"}</button>
    {open && <ReasonDialog title={eligible ? "Refund this changed booking?" : "Report professional absence"} text={eligible ? "Your booking will be cancelled and verified payment credited to your wallet." : "The administrator must verify your claim. No wallet credit is issued until approval."} busy={busy} onClose={() => setOpen(false)} onConfirm={request} />}
    {message && <MessageOverlay type={message.type} text={message.text} onClose={() => setMessage(null)} />}
  </div>;
}
