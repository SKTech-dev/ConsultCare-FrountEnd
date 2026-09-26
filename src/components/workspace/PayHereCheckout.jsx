import { useState } from "react";
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
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true); setError("");
    try {
      const response = await callApi("POST", endpoint, { address, city });
      const checkout = response.data;
      if (!checkout?.checkoutUrl || !checkout?.fields) throw new Error("Payment checkout could not be prepared. Please try again.");
      postToPayHere(checkout);
    } catch (requestError) { setError(requestError.message); setBusy(false); }
  }

  return <div className="ws-space">
    <p className="ws-muted">You will be redirected to PayHere’s secure checkout. ConsultCare confirms the payment only after PayHere verifies it.</p>
    <div className="ws-grid-two">
      <label className="ws-field">Billing address<input value={address} maxLength={200} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" /></label>
      <label className="ws-field">City<input value={city} maxLength={80} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" /></label>
    </div>
    <button className="ws-link" disabled={disabled || busy || address.trim().length < 3 || city.trim().length < 2} onClick={pay}>{busy ? "Opening secure checkout…" : `${label} · ${amount}`}</button>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </div>;
}
