import { useEffect, useState } from "react";
import { callApi } from "../../api/apiClient";
import { Empty, Panel, Status } from "../../components/workspace/Workspace";
import { money } from "../../features/consultations/model";
import ExternalPaymentDialog from "../../components/workspace/ExternalPaymentDialog";
import ErrorNotice from "../../components/ui/ErrorNotice";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function Refunds() {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    callApi("GET", `/admin/refunds?page=${page}`, null, null, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setData(result.data);
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [page, refresh]);
  return <Panel title="Refund review & records">
    <p className="mb-4">Earlier checkout attempts are included. Sandbox is test money; legacy entries require checking against external evidence.</p>
    {error ? <ErrorNotice error={error} onRetry={() => setRefresh((value) => value + 1)} /> : !data ? <p role="status">Loading refund records…</p> : <>
      {!data.items.length && <Empty title="No refunds to review">Refund obligations and completed records appear here.</Empty>}
      {data.items.map((row) => <div className="ws-row" key={row.id}><div><h3>{row.patientName} · {money(row.amount)}</h3><p className="break-all">{row.id} · {row.environment}</p>{row.reference && <p>Reference: {row.reference}</p>}</div><Status>{row.status}</Status>{row.status === "refund requested" && row.environment !== "sandbox" && <button className="ws-link secondary" onClick={() => setSelected(row)}>Record external refund</button>}</div>)}
      {data.count > data.pageSize && <div className="ws-actions mt-4"><button className="ws-link secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="ws-link secondary" disabled={page * data.pageSize >= data.count} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>}
    {selected && <ExternalPaymentDialog title="Record verified external refund" amount={selected.amount} endpoint={`/admin/refunds/${encodeURIComponent(selected.id)}/record`} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setSaved(true); setRefresh((value) => value + 1); }} />}
    {saved && <MessageOverlay type="success" text="Refund recorded. No money was transferred by this application." onClose={() => setSaved(false)} />}
  </Panel>;
}
