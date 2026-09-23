import { useState } from "react";
import { useDispatch } from "react-redux";
import { pay } from "../../features/consultations/consultationSlice";
import { money } from "../../features/consultations/model";
import { useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function BookingPayment({ booking: b, showFailure = false }) {
  const state = useWorkspace();
  const dispatch = useDispatch();
  const [confirm, setConfirm] = useState(false);
  const professional = state.professionals.find((p) => p.id === b.professionalId);
  const expired = b.paymentDueAt && Date.parse(b.paymentDueAt) <= Date.now();
  if (state.role !== "user" || b.status !== "PAYMENT PENDING") return null;
  const disabled = !state.mockPayments || expired || state.pending > 0 || professional?.status !== "verified" || state.patient.status !== "active";
  return <div className="ws-space">
    <p className="ws-notice">{expired ? "The payment deadline has passed. This invitation can no longer be accepted." : b.scheduledById ? "Your professional invited you to this private consultation. Accept and pay before the scheduled start, or cancel if the time does not suit you." : "Complete payment to reserve your queue place. Unpaid reservations expire after 30 minutes or when the session ends."}</p>
    {b.paymentDueAt && <p>Payment deadline: {new Date(b.paymentDueAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} (Sri Lanka).</p>}
    <p className="ws-muted ws-space">{state.mockPayments ? "Test checkout only — no real money will be charged." : "Online payment is not available yet. A payment provider must be configured."}</p>
    <div className="ws-actions"><button className="ws-link" disabled={disabled} onClick={() => setConfirm(true)}>{b.scheduledById ? "Accept & simulate payment" : "Simulate successful payment"} · {money(b.fee)}</button>
      {showFailure && state.mockPayments && <button className="ws-link secondary" disabled={disabled} onClick={() => dispatch(pay({ id: b.id, success: false }))}>Test failed payment</button>}
    </div>
    {confirm && <MessageOverlay type="confirm" title={b.scheduledById ? "Accept this consultation?" : "Confirm test payment?"} text={`Confirm the consultation fee of ${money(b.fee)}. This is a simulated payment; no charge is made.`} isProcessing={state.pending > 0} onClose={() => setConfirm(false)} onConfirm={async () => { setConfirm(false); await dispatch(pay({ id: b.id, success: true })); }} />}
  </div>;
}
