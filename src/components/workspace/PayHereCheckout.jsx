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

export default function PayHereCheckout({ endpoint, disabled = false, showTotal = true }) {
  return <Checkout key={endpoint} endpoint={endpoint} disabled={disabled} showTotal={showTotal} />;
}

function Checkout({ endpoint, disabled, showTotal }) {
  const { patient } = useWorkspace();
  const billingReady = (patient.address || "").trim().length >= 3 && (patient.city || "").trim().length >= 2;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wallet, setWallet] = useState(null);
  const [confirmWallet, setConfirmWallet] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (new URLSearchParams(window.location.search).get("payment") === "cancel") {
          await callApi("POST", endpoint + "/cancel");
          const url = new URL(window.location.href); url.searchParams.delete("payment");
          window.history.replaceState(window.history.state, "", url);
        }
        const response = await callApi("GET", endpoint);
        if (active) { setWallet(response.data); setError(""); }
      } catch (failure) { if (active) setError(failure.message); }
    }
    load();
    return () => { active = false; };
  }, [endpoint]);

  async function pay() {
    if (busy) return;
    setConfirmWallet(false);
    setBusy(true); setError("");
    try {
      const response = await callApi("POST", endpoint, { frontendOrigin: window.location.origin, expectedPayhereAmount: wallet.payhereAmount });
      const checkout = response.data;
      if (checkout?.paid) {
        setSuccess("Payment completed using your wallet credit. Your booking is confirmed.");
        setBusy(false);
        return;
      }
      if (checkout?.provider === "payments_lk" && checkout?.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      if (!checkout?.checkoutUrl || !checkout?.fields) throw new Error("Payment checkout could not be prepared. Please try again.");
      postToPayHere(checkout);
    } catch (requestError) {
      setError(requestError.message); setBusy(false);
      // Retrying is safe even if the response was lost after the server committed.
      callApi("GET", endpoint).then((response) => setWallet(response.data)).catch(() => {});
    }
  }

  return <div className="ws-space payment-checkout">
    {wallet && <div className="payment-breakdown">
      {showTotal && <div className="ws-row"><span>Total amount</span><strong>LKR {wallet.total}</strong></div>}
      <div className="ws-row"><span>Wallet credit applied{Number(wallet.balance) > 0 ? ` (LKR ${Number(wallet.balance).toFixed(2)} available)` : ""}</span><strong>LKR {wallet.walletUsed}</strong></div>
      <div className="ws-row payment-breakdown-total"><span>Payable via PayHere</span><strong>LKR {wallet.payhereAmount}</strong></div>
    </div>}
    <p className="ws-muted">Wallet credit is applied first. Any remaining balance is paid at PayHere’s secure checkout.</p>
    {wallet?.frozen && <p className="ws-notice">Your wallet requires administrator review.</p>}
    {!billingReady && <p className="ws-notice">If PayHere payment is needed, add your billing address and city in <Link className="underline" to="/app/profile?tab=details">My profile</Link>. A fully wallet-funded payment does not need these fields.</p>}
    <div className="ws-actions">
      <button className="ws-link" disabled={disabled || busy || Boolean(success) || !wallet || wallet.frozen} aria-busy={busy} onClick={() => Number(wallet.payhereAmount) === 0 ? setConfirmWallet(true) : pay()}>{busy && <Loader2 className="animate-spin" size={18} />}{busy ? "Preparing payment…" : !wallet ? "Loading payment amount…" : Number(wallet.payhereAmount) === 0 ? `Pay from wallet · LKR ${wallet.walletUsed}` : `Pay with PayHere · LKR ${wallet.payhereAmount}`}</button>
      {Number(wallet?.reserved) > 0 && <button className="ws-link secondary" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          await callApi("POST", endpoint + "/cancel");
          setWallet((await callApi("GET", endpoint)).data);
          const url = new URL(window.location.href); url.searchParams.delete("payment");
          navigate(url.pathname + url.search, { replace: true });
          await dispatch(fetchWorkspace({ live: true }));
        } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
      }}>Cancel pending checkout & release wallet credit</button>}
      {!wallet && error && <button className="ws-link secondary" onClick={async () => { try { setWallet((await callApi("GET", endpoint)).data); setError(""); } catch (failure) { setError(failure.message); } }}>Retry payment details</button>}
    </div>
    {confirmWallet && <MessageOverlay type="confirm" title="Pay entirely from your wallet?" text={`LKR ${wallet.walletUsed} will be deducted from your wallet to confirm this booking. No PayHere payment is needed.`} confirmText="Confirm wallet payment" onClose={() => setConfirmWallet(false)} onConfirm={pay} />}
    {busy && <p role="status" className="ws-space">Preparing your secure payment. Please keep this page open.</p>}
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    {success && <MessageOverlay type="success" text={success} onClose={async () => { setSuccess(""); await dispatch(fetchWorkspace({ live: true })); navigate(endpoint.startsWith("/bookings/") ? "/app/bookings?tab=consultations" : "/app" + endpoint.replace("/payhere-checkout", "") + "?tab=registration"); }} />}
  </div>;
}
