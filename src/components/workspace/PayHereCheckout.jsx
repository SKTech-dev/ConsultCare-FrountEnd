import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "./Workspace";
import { callApi } from "../../api/apiClient";
import { MessageOverlay } from "../ui/MessageBox";

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

  async function pay() {
    setBusy(true); setError("");
    try {
      const response = await callApi("POST", endpoint, {});
      const checkout = response.data;
      if (!checkout?.checkoutUrl || !checkout?.fields) throw new Error("Payment checkout could not be prepared. Please try again.");
      postToPayHere(checkout);
    } catch (requestError) { setError(requestError.message); setBusy(false); }
  }

  return <div className="ws-space">
    <p className="ws-muted">You will be redirected to PayHere’s secure checkout. ConsultCare confirms the payment only after PayHere verifies it.</p>
    {!billingReady && <p className="ws-notice">Add your billing address and city once in <Link className="underline" to="/app/profile">My profile</Link> before paying.</p>}
    <button className="ws-link" disabled={disabled || busy || !billingReady} onClick={pay}>{busy ? "Opening secure checkout…" : `${label} · ${amount}`}</button>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </div>;
}
