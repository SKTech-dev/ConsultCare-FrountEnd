import { money } from "../../features/consultations/model";
import { useWorkspace } from "../../components/workspace/Workspace";
import PayHereCheckout from "../../components/workspace/PayHereCheckout";

export default function BookingPayment({ booking: b }) {
  const state = useWorkspace();
  const professional = state.professionals.find((p) => p.id === b.professionalId);
  const expired = b.paymentDueAt && Date.parse(b.paymentDueAt) <= Date.now();
  if (state.role !== "user" || b.status !== "PAYMENT PENDING") return null;
  const unavailable = expired || state.pending > 0 || professional?.status !== "verified" || state.patient.status !== "active";
  return <div className="ws-space">
    <p className="ws-notice">{expired ? "The payment deadline has passed. This invitation can no longer be accepted." : b.scheduledById ? "Your professional invited you to this private consultation. Accept and pay before the scheduled start, or cancel if the time does not suit you." : "Complete payment to reserve your queue place. Unpaid reservations expire after 30 minutes or when the session ends."}</p>
    {b.paymentDueAt && <p>Payment deadline: {new Date(b.paymentDueAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} (Sri Lanka).</p>}
    {state.payhereEnabled ? <PayHereCheckout endpoint={`/bookings/${b.id}/payhere-checkout`} amount={money(b.fee)} disabled={unavailable} label={b.scheduledById ? "Accept & pay with PayHere" : "Pay with PayHere"} /> : <p className="ws-notice">Secure payments are not configured yet. Please contact the institution.</p>}
  </div>;
}
