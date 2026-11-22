import { useCallback, useEffect, useState } from "react";
import { callApi } from "../../api/apiClient";
import { Panel, Empty, Status } from "./Workspace";
import ListPages from "./ListPages";

export default function PaymentRecovery() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try { setData((await callApi("GET", `/admin/payment-recovery?page=${page}`)).data); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);
  return <Panel title="Recover payment confirmations">
    <p>Verify unsettled checkout attempts against PayHere. Expired or replaced payments follow the existing wallet refund rules.</p>
    {data && !data.configured && <p role="alert">PayHere Retrieval API credentials must be configured before verification is available.</p>}
    {message && <p role="status">{message}</p>}
    {data?.items?.length === 0 && <Empty title="No unresolved checkout attempts">Confirmed payments leave this list.</Empty>}
    {data?.items?.map((row) => <div className="ws-row" key={row.orderId}><div><h3>{row.patientName} · LKR {row.amount}</h3><p>{row.orderId} · {row.environment}</p><p>{new Date(row.createdAt).toLocaleString()}</p></div><Status>{row.status}</Status><button className="ws-link secondary" disabled={busy || !data.configured} onClick={async () => {
      setBusy(true); setMessage("");
      try { setMessage((await callApi("POST", `/admin/payment-recovery/${encodeURIComponent(row.orderId)}`)).message); await load(); }
      catch (error) { setMessage(error.message); }
      finally { setBusy(false); }
    }}>Verify with PayHere</button></div>)}
    <ListPages page={page} setPage={setPage} hasMore={data?.hasMore} busy={busy} label="Payment recovery" />
    <button className="ws-name-link" disabled={busy} onClick={load}>Refresh recovery list</button>
  </Panel>;
}
