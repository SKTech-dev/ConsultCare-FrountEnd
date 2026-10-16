import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { Empty, Panel, useWorkspace } from "./Workspace";
import GlobalLoader from "../ui/GlobalLoader";
import Modal from "../ui/Modal";
import { MessageOverlay } from "../ui/MessageBox";
import { useUnsavedChanges } from "../ui/UnsavedChanges";
import { money } from "../../features/consultations/model";
import "./walletReviews.css";

function useReview(endpoint) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({});
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    setState({ endpoint, loading: true });
    callApi("GET", endpoint, null, null, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setState({ endpoint, data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ endpoint, error: error.message }); });
    return () => controller.abort();
  }, [endpoint, attempt]);
  return { ...(state.endpoint === endpoint ? state : { loading: true }), refresh: () => setAttempt((value) => value + 1) };
}
function LoadState({ state }) {
  return state.error ? <div role="alert"><p>{state.error}</p><button className="ws-link secondary" onClick={state.refresh}>Retry wallet review</button></div> : state.loading ? <GlobalLoader compact message="Loading wallet reviews…" /> : null;
}

export default function WalletReviews() {
  const { role } = useWorkspace();
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("frozen");
  const [page, setPage] = useState(1);
  const state = useReview(role === "admin" ? "/admin/wallet/reviews?view=" + view + "&page=" + page : null);
  if (role !== "admin") return null;
  if (selected) return <WalletReview patientId={selected} onBack={() => { setSelected(null); state.refresh(); }} />;
  return <Panel title="Wallet reviews">
    <p>Review chargebacks, record how each dispute was settled and restore wallet access once all disputes are resolved.</p>
    <label className="ws-field">Review status<select value={view} onChange={(event) => { setView(event.target.value); setPage(1); }}><option value="frozen">Frozen wallets</option><option value="all">All reviewed wallets</option></select></label>
    <LoadState state={state} />
    {state.data && <>{!state.data.items.length && <Empty title="No wallets to review">Wallets frozen after payment chargebacks will appear here.</Empty>}{state.data.items.map((person) => <article className="wallet-review-card" key={person.id}><div><h3>{person.name}</h3><p>{person.email}</p><p>{money(person.balance)} available · {person.environment} · {person.frozen ? "Frozen" : "Available"}</p></div><button className="ws-link secondary" onClick={() => setSelected(person.id)}>Review wallet</button></article>)}
      {(state.data.count > state.data.pageSize || page > 1) && <nav className="ws-actions" aria-label="Wallet review pages"><button className="ws-link secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="ws-link secondary" disabled={page * state.data.pageSize >= state.data.count} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </>}
  </Panel>;
}

function WalletReview({ patientId, onBack }) {
  const [entryPage, setEntryPage] = useState(1);
  const state = useReview("/admin/wallet/reviews/" + patientId + "?entry_page=" + entryPage);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);
  const data = state.data;
  return <div className="wallet-review-detail"><button className="ws-link secondary" onClick={onBack}><ArrowLeft size={16} />Back to wallet reviews</button><LoadState state={state} />
    {data && <><Panel title={data.person.name}><p>{data.person.email} · {data.person.environment}</p><p><strong>Available balance: {money(data.person.balance)}</strong> · {data.person.frozen ? "Frozen" : "Available"}</p><p>Reserved for cash-outs: {money(data.pendingCashouts)} · Allocated to payments: {money(data.reservedPayments)}</p><p>Only available funds can be debited. Existing reservations and provider payment statuses are preserved.</p><button className="ws-link secondary" onClick={state.refresh}><RefreshCw size={16} />Refresh review</button></Panel>
      <Panel title="Payment disputes">{data.disputes.length ? data.disputes.map((dispute) => <article className="wallet-review-card" key={dispute.orderId}><div><h3>{money(dispute.amount)}</h3><p>Order: {dispute.orderId}</p>{dispute.providerPaymentId && <p>Provider payment: {dispute.providerPaymentId}</p>}<p>{dispute.resolved ? "Resolution recorded" : "Requires reconciliation"}</p></div>{!dispute.resolved && <button className="ws-link secondary" onClick={() => setSelected(dispute)}>Resolve dispute</button>}</article>) : <p>No provider chargeback records were found. The wallet remains frozen until the underlying payment evidence is available for review.</p>}</Panel>
      <Panel title="Wallet movements"><p>Review these entries together with cash-out and payment records before resolving a dispute.</p>{data.entries.length ? data.entries.map((entry) => <div className="wallet-review-card" key={entry.id}><div><h3>{entry.kind.replaceAll("_", " ")}</h3><p>{entry.source}</p><small>{new Date(entry.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} · Sri Lanka</small></div><strong>{money(entry.amount)}</strong></div>) : <p>No wallet movements recorded.</p>}{(data.hasMoreEntries || entryPage > 1) && <div className="ws-actions"><button className="ws-link secondary" disabled={entryPage === 1} onClick={() => setEntryPage(entryPage - 1)}>Previous movements</button><span>Page {entryPage}</span><button className="ws-link secondary" disabled={!data.hasMoreEntries} onClick={() => setEntryPage(entryPage + 1)}>Next movements</button></div>}</Panel>
      <Panel title="Resolution history">{data.resolutions.length ? data.resolutions.map((item) => <article className="wallet-review-card" key={item.orderId}><div><h3>{item.outcome.replaceAll("_", " ")} · {item.orderId}</h3><p>Wallet debit: {money(item.debitedAmount)} · Accepted loss: {money(item.writtenOffAmount)}</p><p>Balance: {money(item.balanceBefore)} → {money(item.balanceAfter)}</p><p>Evidence: {item.reference}</p><p>{item.reason}</p><small>{new Date(item.resolvedAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} · Administrator {item.resolvedBy}</small></div></article>) : <p>No resolutions recorded.</p>}</Panel>
    </>}
    {selected && data && <ResolutionForm key={selected.orderId} dispute={selected} person={data.person} onClose={() => setSelected(null)} onSaved={(message) => { setSelected(null); setNotice(message); state.refresh(); }} />}
    {notice && <MessageOverlay type="success" text={notice} onClose={() => setNotice(null)} />}
  </div>;
}

function ResolutionForm({ dispute, person, onClose, onSaved }) {
  const [form, setForm] = useState({ outcome: "recovered", debit: "0", reference: "", reason: "" });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const markSaved = useUnsavedChanges(form);
  const loss = form.outcome === "write_off" ? Math.max(0, Number(dispute.amount) - Number(form.debit)) : 0;
  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await callApi("POST", "/admin/wallet/reviews/" + person.id + "/" + encodeURIComponent(dispute.orderId) + "/resolve", { ...form, expectedBalance: person.balance });
      markSaved(); onSaved(result.message);
    } catch (failure) { setConfirm(false); setError(failure.message); }
    finally { setBusy(false); }
  }
  return <><Modal title="Resolve payment dispute" busy={busy || confirm} onClose={onClose}><div className="wallet-resolution-dialog"><p>{person.name} · {money(dispute.amount)} · {dispute.orderId}</p><form className="ws-form" onSubmit={(event) => { event.preventDefault(); setConfirm(true); }}><fieldset disabled={busy}>
    <label className="ws-field">Resolution outcome<select value={form.outcome} onChange={(event) => { const outcome = event.target.value; setForm({ ...form, outcome, debit: outcome === "wallet_debit" ? dispute.amount : "0" }); }}><option value="recovered">Funds recovered outside the wallet</option><option value="wallet_debit">Recover full amount from available wallet credit</option><option value="write_off">Institution accepts the remaining loss</option></select></label>
    <label className="ws-field">Debit from available wallet credit<input type="number" required min="0" step="0.01" max={Math.min(Number(dispute.amount), Number(person.balance))} disabled={form.outcome !== "write_off"} value={form.debit} onChange={(event) => setForm({ ...form, debit: event.target.value })} /></label>
    <p>Available: {money(person.balance)} · Wallet debit: {money(form.debit)} · Accepted loss: {money(loss)}</p>
    <label className="ws-field">Evidence reference<input autoFocus required minLength={3} maxLength={255} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label>
    <label className="ws-field">Reconciliation explanation<textarea required minLength={10} maxLength={2000} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
    <p>The wallet reopens after every chargeback is resolved. The resolution is permanent and cannot be edited.</p><div className="ws-actions"><button className="ws-link" disabled={busy || Number(form.debit) > Number(person.balance)}>Review resolution</button><button type="button" className="ws-link secondary" disabled={busy} onClick={onClose}>Cancel</button></div>
  </fieldset></form>{error && <p role="alert">{error}</p>}
  </div></Modal>{confirm && <MessageOverlay type="confirm" title="Record this resolution?" text={"Wallet debit: " + money(form.debit) + ". Institution loss: " + money(loss) + ". Evidence: " + form.reference + ". This permanently records your reconciliation decision."} confirmText="Record resolution" isProcessing={busy} onClose={() => setConfirm(false)} onConfirm={save} />}</>;
}
