import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, ArrowLeft, Wallet } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { Empty, PageHeading, Panel, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./settlements.css";

const cash = (value) => new Intl.NumberFormat("en-LK", {
  style: "currency", currency: "LKR", minimumFractionDigits: 2,
}).format(Number(value));
const monthLabel = (month) => new Intl.DateTimeFormat("en-GB", {
  month: "long", year: "numeric", timeZone: "UTC",
}).format(new Date(`${month}-01T00:00:00Z`));
const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Colombo",
}).format(new Date(value)) : "Not recorded";
const timeLabel = (value) => value ? new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Colombo",
}).format(new Date(value)) : "—";
const roleLabels = { doctor: "Doctors", lawyer: "Lawyers" };
const allowed = (role) => ["admin", "doctor", "lawyer"].includes(role);

function useEarnings(endpoint) {
  const [result, setResult] = useState({ endpoint: null, data: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!endpoint) return;
    let active = true;
    let fetching = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await callApi("GET", endpoint, null, null, { signal: controller.signal });
        if (active) setResult({ endpoint, data: response.data, error: "" });
      } catch (error) {
        if (active) setResult((previous) => ({
          endpoint, data: previous.endpoint === endpoint ? previous.data : null, error: error.message,
        }));
      } finally { fetching = false; }
    };
    refresh();
    const interval = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [endpoint, retry]);
  const current = result.endpoint === endpoint ? result : { data: null, error: "" };
  return { ...current, retry: () => setRetry((value) => value + 1) };
}

function PayoutStatus({ payout }) {
  const labels = { unpaid: "Unpaid", processing: "Processing", paid: "Paid", failed: "Failed" };
  return <span className={`ws-status earnings-status-${payout.status}`}>{labels[payout.status] || "Unpaid"}</span>;
}

function LoadState({ data, error, retry }) {
  if (error) return <div className="ws-notice" role="alert">{error} <button className="underline ml-3" onClick={retry}>Try again</button></div>;
  return !data ? <p role="status" className="ws-notice">Loading monthly earnings…</p> : null;
}

function TestNotice({ visible }) {
  return visible ? <div className="ws-notice">These totals contain test patient payments. No real money has been collected or paid out for these entries.</div> : null;
}

export function MonthlyEarnings() {
  const { role } = useWorkspace();
  const admin = role === "admin";
  const result = useEarnings(allowed(role) ? "/settlements" : null);
  if (!allowed(role)) return <Empty title="Page unavailable">Monthly earnings are available to administrators and professionals.</Empty>;
  const { data } = result;
  return <>
    <PageHeading eyebrow={admin ? "PROFESSIONAL PAYOUTS" : "YOUR EARNINGS"} title={admin ? "Monthly settlements" : "My earnings"} action={<Link className="ws-link secondary" to={admin ? "/app/transfers" : "/app/sessions"}>View handovers</Link>}>
      Earnings are grouped by the month each consultation was completed. Professionals receive the full consultation payment.
    </PageHeading>
    <LoadState {...result} />
    {data && <>
      <TestNotice visible={data.testPayments} />
      <p className="ws-muted mb-5">Accepted handovers are credited to the conducting professional at the original booked fee. Handed-over payments are labelled in the monthly payment details.</p>
      <p className="ws-muted mb-5">All amounts in LKR. Dates use Sri Lanka time. Payment status updates automatically.</p>
      {!data.months.length && <Empty title="No completed paid consultations yet">Monthly totals will appear here once paid consultations are completed.</Empty>}
      <div className="earnings-months">
        {data.months.map((month) => admin ? <details className="ws-panel earnings-month" key={month.month}>
          <summary className="earnings-summary">
            <div><h2>{monthLabel(month.month)}</h2><p>{month.count} completed consultation{month.count === 1 ? "" : "s"} · {month.closed ? "Month closed" : "Month in progress"}</p></div>
            <strong>{cash(month.total)}</strong><ChevronDown aria-hidden="true" size={20} />
          </summary>
          <div className="earnings-groups">
            {Object.entries(roleLabels).map(([category, label]) => {
              const group = month.groups[category];
              return <details className="earnings-group" key={category}>
                <summary className="earnings-summary"><div><h3>{label}</h3><p>{group.professionals.length} professionals · {group.count} consultations</p></div><strong>{cash(group.total)}</strong><ChevronDown aria-hidden="true" size={18} /></summary>
                {group.professionals.length ? <div className="earnings-professionals">{group.professionals.map((person) => <div className="earnings-professional" key={person.id}>
                  <div><Link className="ws-name-link" to={`/app/settlements/${month.month}/${person.id}`}>{person.name}</Link><p>{person.count} completed consultation{person.count === 1 ? "" : "s"}</p></div>
                  <PayoutStatus payout={person.payout} /><strong>{cash(person.total)}</strong>
                  <Link className="ws-link secondary" to={`/app/settlements/${month.month}/${person.id}`}>View payments</Link>
                </div>)}</div> : <p className="earnings-empty">No completed paid consultations in this category.</p>}
              </details>;
            })}
          </div>
        </details> : <ProfessionalMonth key={month.month} month={month} role={role} />)}
      </div>
    </>}
  </>;
}

function ProfessionalMonth({ month, role }) {
  const person = month.groups[role]?.professionals[0];
  if (!person) return null;
  return <Link className="ws-panel earnings-month-link" to={`/app/earnings/${month.month}`}>
    <Wallet aria-hidden="true" size={25} /><div><h2>{monthLabel(month.month)}</h2><p>{month.count} completed consultations · {month.closed ? "Month closed" : "Month in progress"}</p></div>
    <PayoutStatus payout={person.payout} /><strong>{cash(month.total)}</strong><span className="earnings-open">View payments →</span>
  </Link>;
}

export function MonthlyEarningsDetails() {
  const { month, professionalId: routeId } = useParams();
  const { role, professionalId } = useWorkspace();
  const admin = role === "admin";
  const target = admin ? routeId : professionalId;
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const key = `${month}/${target}`;
  const page = pagination.key === key ? pagination.page : 1;
  const [popup, setPopup] = useState(false);
  const result = useEarnings(allowed(role) && target ? `/settlements/${encodeURIComponent(month)}/${encodeURIComponent(target)}?page=${page}` : null);
  if (!allowed(role)) return <Empty title="Page unavailable">Monthly earnings are available to administrators and professionals.</Empty>;
  if (!target) return <Empty title="Choose a professional">Open a professional from the Monthly settlements page to view their payments.</Empty>;
  const { data, error } = result;
  return <>
    <Link className="ws-name-link earnings-back" to={admin ? "/app/settlements" : "/app/earnings"}><ArrowLeft aria-hidden="true" size={16} />Back to {admin ? "monthly settlements" : "my earnings"}</Link>
    <LoadState {...result} />
    {data && <>
      <PageHeading eyebrow={admin ? "MONTHLY SETTLEMENT" : "MY EARNINGS"} title={monthLabel(data.month)} action={<PayoutStatus payout={data.payout} />}>{data.professional.name} · {data.professional.role === "doctor" ? "Doctor" : "Lawyer"}</PageHeading>
      <div className="earnings-totals">
        <Panel title="Monthly earnings"><strong>{cash(data.total)}</strong><p>Full amount · no institution commission</p></Panel>
        <Panel title="Completed consultations"><strong>{data.count}</strong><p>Completed in {monthLabel(data.month)}</p></Panel>
        <Panel title="Payout"><PayoutStatus payout={data.payout} />{data.payout.paidAt ? <p className="mt-3">Paid {dateLabel(data.payout.paidAt)} at {timeLabel(data.payout.paidAt)}<br />Reference: {data.payout.reference}</p> : <p className="mt-3">{data.closed ? "Awaiting monthly payout" : "This month is still in progress"}</p>}</Panel>
      </div>
      <TestNotice visible={data.testPayments} />
      {admin && <div className="earnings-pay"><div><h3>Pay this professional</h3><p>Bank payouts will be available once the institution connects a payment provider.</p></div><button className="ws-link" disabled={Boolean(error) || !data.closed || ["paid", "processing"].includes(data.payout.status)} onClick={() => setPopup(true)}>Pay professional</button>{!data.closed && <p className="w-full">Monthly payouts are available after the month ends.</p>}</div>}
      <Panel title="Patient / client payments">
        <p className="mb-4">Included by consultation completion date. Payment dates may fall in an earlier month. All dates and times are in Sri Lanka time.</p>
        <div className="ws-table-wrap"><table className="ws-table earnings-table"><caption className="sr-only">Payments for {data.professional.name}, {monthLabel(data.month)}</caption>
          <thead><tr><th scope="col">Patient / client</th><th scope="col">Date paid</th><th scope="col">Time paid</th><th scope="col">Consultation completed</th><th scope="col">Amount</th></tr></thead>
          <tbody>{data.payments.map((payment) => <tr key={payment.id}><td>{payment.patientName}{payment.transfer && <small className="block">Handed over by {payment.transfer.fromName}</small>}</td><td>{dateLabel(payment.paidAt)}</td><td>{timeLabel(payment.paidAt)}</td><td>{dateLabel(payment.completedAt)} · {timeLabel(payment.completedAt)}</td><td>{cash(payment.amount)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={4}>Monthly total ({data.count} consultations)</th><td>{cash(data.total)}</td></tr></tfoot>
        </table></div>
        <div className="earnings-pagination"><button className="ws-link secondary" disabled={page <= 1} onClick={() => setPagination({ key, page: page - 1 })}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(data.count / data.pageSize))}</span><button className="ws-link secondary" disabled={page * data.pageSize >= data.count} onClick={() => setPagination({ key, page: page + 1 })}>Next</button></div>
      </Panel>
    </>}
    {popup && <MessageOverlay type="error" title="Payments are not connected yet" text="The institution needs to connect a payout provider before sending money. No money has been sent and this month remains unpaid." confirmText="Got it" onClose={() => setPopup(false)} />}
  </>;
}
