import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { Panel, Empty, Status } from "./Workspace";
import { money } from "../../features/consultations/model";
import { MessageOverlay } from "../ui/MessageBox";
import { useUnsavedChanges } from "../ui/UnsavedChanges";

function useWalletData(endpoint) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData((await callApi("GET", endpoint)).data); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, load };
}

async function downloadProof(id) {
  const blob = await callApi("GET", `/wallet/cashouts/${id}/proof`, null, null, { responseType: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "bank-payment-proof"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function Feedback({ state, message, setMessage }) {
  return <>
    {state.loading && <p role="status" className="ws-actions"><Loader2 size={18} className="animate-spin" />Loading wallet records…</p>}
    {state.error && <p role="alert">{state.error} <button className="ws-name-link" onClick={state.load}>Retry</button></p>}
    {message && <MessageOverlay type={message.type} text={message.text} onClose={() => setMessage(null)} />}
  </>;
}

export default function RefundWallet() {
  const state = useWalletData("/wallet");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ bank: "", branch: "", accountName: "", accountNumber: "", reason: "" });
  const markSaved = useUnsavedChanges(form);
  const [confirmed, setConfirmed] = useState(false);
  const data = state.data;
  async function request(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await callApi("POST", "/wallet/cashouts", form);
      markSaved();
      setMessage({ type: "success", text: response.message });
      setConfirmed(false); await state.load();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  return <Panel title="Refund wallet">
    <Feedback state={state} message={message} setMessage={setMessage} />
    {data && <>
      <h3>Available credit: {money(data.balance)}</h3>
      <p>Credit is automatically used first for consultations and clinics. Only any remaining fee is paid through PayHere.</p>
      {data.environment === "sandbox" && <p className="ws-notice">Sandbox wallet: these credits and bank payment records are for testing, not real transfers.</p>}
      {data.frozen && <p role="alert">Wallet spending and cash-out are paused for administrator review.</p>}
      {Number(data.balance) > 0 && !data.frozen && !data.cashouts.some((row) => row.status === "pending") && <form className="ws-form" onSubmit={request}>
        <h3>Request your entire available balance by bank transfer</h3>
        <p>The requested amount is reserved immediately and cannot be spent while the administrator processes it.</p>
        {[["bank", "Bank"], ["branch", "Branch"], ["accountName", "Account holder"], ["accountNumber", "Account number"]].map(([key, label]) => <label key={key} className="ws-field">{label} *<input required maxLength={key === "accountNumber" ? 40 : 120} pattern={key === "accountNumber" ? "[0-9][0-9 -]{4,38}[0-9]" : undefined} inputMode={key === "accountNumber" ? "numeric" : undefined} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
        <label className="ws-field">Additional information<textarea maxLength={1000} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
        <label><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I have checked my bank details and want to reserve my entire available balance.</label>
        <button className="ws-link" disabled={busy || state.loading} aria-busy={busy}>{busy && <Loader2 size={18} className="animate-spin" />}Request full-balance cash-out</button>
      </form>}
      <h3>Cash-out requests</h3>
      {data.cashouts.length ? data.cashouts.map((row) => <div className="ws-row" key={row.id}><div><h4>{money(row.amount)} · {row.bank}</h4><p>{row.accountNumber} · {row.accountName}</p><p>{row.reason}</p>{row.reference && <p>Bank reference: {row.reference}</p>}</div><Status>{row.status}</Status>{row.hasProof && <button className="ws-link secondary" onClick={() => downloadProof(row.id).catch((error) => setMessage({ type: "error", text: error.message }))}>Download payment proof</button>}</div>) : <Empty title="No cash-out requests">Any bank cash-out requests and their payment evidence will appear here.</Empty>}
      <h3>Recent wallet movements</h3>
      {data.entries.length ? data.entries.map((entry) => <div className="ws-row" key={entry.id}><span>{entry.kind.replaceAll("_", " ")} · {new Date(entry.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}</span><strong>{money(entry.amount)}</strong></div>) : <Empty title="No wallet movements">Verified refunds will be shown here.</Empty>}
    </>}
  </Panel>;
}

export function AdminCashouts() {
  const state = useWalletData("/admin/wallet/cashouts");
  const [message, setMessage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  async function act(event, row) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = form.get("action") === "reject" ? await callApi("POST", `/admin/wallet/cashouts/${row.id}/reject`, { reason: form.get("reason") }) : await callApi("POST", `/admin/wallet/cashouts/${row.id}/paid`, form);
      setMessage({ type: "success", text: response.message }); setSelected(null); await state.load();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  return <Panel title="Wallet bank cash-outs"><Feedback state={state} message={message} setMessage={setMessage} />
    <p>Transfer money outside the app, then record the bank reference and proof here. Recording a payment does not send money.</p>
    {state.data?.length === 0 && <Empty title="No cash-out requests">Patient cash-out requests will appear here.</Empty>}
    {state.data?.map((row) => <div className="ws-space" key={row.id}>
      <div className="ws-row"><div><h3>{money(row.amount)} · {row.bank} · {row.environment}</h3><p>{row.accountName} · {row.accountNumber} · {row.branch}</p><p>{row.reason}</p>{row.reference && <p>Reference: {row.reference}</p>}</div><Status>{row.status}</Status>{row.status === "pending" && <button className="ws-link secondary" disabled={busy} onClick={() => setSelected(selected === row.id ? null : row.id)}>{selected === row.id ? "Close" : "Review cash-out"}</button>}{row.hasProof && <button className="ws-link secondary" onClick={() => downloadProof(row.id).catch((error) => setMessage({ type: "error", text: error.message }))}>Download proof</button>}</div>
      {selected === row.id && <>
        <form className="ws-form" onSubmit={(event) => act(event, row)}><input type="hidden" name="action" value="paid" /><label className="ws-field">Bank transfer reference *<input name="reference" required minLength={3} maxLength={255} /></label><label className="ws-field">Payment proof (PDF or image, up to 5 MB) *<input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" /></label><label><input type="checkbox" required /> I verify this bank transfer has already been made{row.environment === "sandbox" ? " as a sandbox test record only" : ""}.</label><button className="ws-link" disabled={busy} aria-busy={busy}>{busy && <Loader2 className="animate-spin" size={18} />}Record manual payment</button></form>
        <form className="ws-form" onSubmit={(event) => act(event, row)}><input type="hidden" name="action" value="reject" /><label className="ws-field">Reason for rejection *<textarea name="reason" required minLength={5} maxLength={1000} /></label><button className="ws-link secondary" disabled={busy}>Reject and restore credit</button></form>
      </>}
    </div>)}
  </Panel>;
}

export function AdminRefundClaims() {
  const state = useWalletData("/admin/refund-requests");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  async function decide(event, row) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await callApi("POST", `/admin/refund-requests/${row.id}/decision`, { approved: form.get("decision") === "approve", reason: form.get("reason") });
      setMessage({ type: "success", text: result.message }); await state.load();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }
  return <Panel title="Disputed professional absence"><Feedback state={state} message={message} setMessage={setMessage} />
    <p>Check session and attendance records and contact both parties before approving. Approval cancels the booking and issues wallet credit.</p>
    {state.data?.length === 0 && <Empty title="No disputed absence claims">Patient claims awaiting review will appear here.</Empty>}
    {state.data?.map((row) => <div className="ws-space" key={row.id}><div className="ws-row"><div><h3>Claim {row.id.slice(0, 8)}</h3><p>{row.context?.patientName} · {row.context?.professionalName}</p><p>{row.context?.date} · {row.context?.start}–{row.context?.end} (Sri Lanka) · {money(row.context?.amount || 0)}</p><p>{row.reason}</p>{row.response && <p>Decision: {row.response}</p>}<a className="ws-name-link" href={row.context?.serviceType === "weekly" ? "/app/weekly-schedules?tab=sessions" : row.context?.serviceType === "clinic" ? "/app/clinics" : "/app/appointments"}>Review schedule and attendance audit</a></div><Status>{row.status}</Status></div>
      {row.status === "pending" && <form className="ws-form" onSubmit={(event) => decide(event, row)}><label className="ws-field">Decision *<select name="decision" required><option value="">Select decision</option><option value="approve">Approve wallet refund</option><option value="reject">Decline claim</option></select></label><label className="ws-field">Decision reason *<textarea name="reason" required minLength={5} maxLength={1000} /></label><button className="ws-link" disabled={busy} aria-busy={busy}>{busy && <Loader2 size={18} className="animate-spin" />}Record reviewed decision</button></form>}
    </div>)}
  </Panel>;
}
