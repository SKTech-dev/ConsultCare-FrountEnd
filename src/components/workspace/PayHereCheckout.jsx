import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "./Workspace";
import { callApi } from "../../api/apiClient";
import { MessageOverlay } from "../ui/MessageBox";
import { Loader2 } from "lucide-react";

// PayHere requires a browser form POST. The backend returns only public, signed
// checkout fields; the merchant secret never reaches this component.
function postToPayHere(checkout) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.checkoutUrl;
  form.style.display = "none";
  Object.entries(checkout.fields || {}).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.append(input);
  });
  document.body.append(form);
  form.submit();
}

export default function PayHereCheckout({ endpoint, amount, disabled = false, label = "Pay with PayHere" }) {
  const { patient } = useWorkspace();
  const billingReady = (patient.address || "").trim().length >= 3 && (patient.city || "").trim().length >= 2;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wallet, setWallet] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    callApi("GET", "/wallet").then((response) => { if (active) setWallet(response.data); }).catch(() => {});
    return () => { active = false; };
  }, [endpoint]);

  async function pay() {
    setBusy(true); setError("");
    try {
      const response = await callApi("POST", endpoint, { frontendOrigin: window.location.origin });
      const checkout = response.data;
      if (checkout?.paid) {
        await dispatch(fetchWorkspace({ live: true }));
        setSuccess("Payment completed using your wallet credit. Your booking is confirmed.");
        setBusy(false);
        return;
      }
      if (!checkout?.checkoutUrl || !checkout?.fields) throw new Error("Payment checkout could not be prepared. Please try again.");
      postToPayHere(checkout);
    } catch (requestError) { setError(requestError.message); setBusy(false); }
  }

  return <div className="ws-space">
    <p className="ws-muted">Wallet credit is used first. Any remaining amount is collected at PayHere’s secure checkout and confirmed by its verified callback.</p>
    {!billingReady && <p className="ws-notice">If PayHere payment is needed, add your billing address and city in <Link className="underline" to="/app/profile?tab=details">My profile</Link>. A fully wallet-funded payment does not need these fields.</p>}
    {wallet && <p className="ws-notice">Available wallet credit: LKR {Number(wallet.balance).toFixed(2)}. Credit is used first; PayHere collects only any remaining amount. {wallet.frozen && "Your wallet requires administrator review."}</p>}
    <button className="ws-link" disabled={disabled || busy || Boolean(success)} aria-busy={busy} onClick={pay}>{busy && <Loader2 className="animate-spin" size={18} />}{busy ? "Preparing payment…" : `${label} · ${amount}`}</button>
    {busy && <p role="status" className="ws-space">Preparing your secure payment. Please keep this page open.</p>}
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    {success && <MessageOverlay type="success" text={success} onClose={() => { setSuccess(""); navigate(endpoint.startsWith("/bookings/") ? "/app/bookings?tab=consultations" : "/app" + endpoint.replace("/payhere-checkout", "") + "?tab=registration"); }} />}
  </div>;
}
