import SectionTabs from "../../components/ui/SectionTabs";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, ArrowLeft, Wallet } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { Empty, PageHeading, Panel, useWorkspace } from "../../components/workspace/Workspace";
import { MessageOverlay } from "../../components/ui/MessageBox";
import "./settlements.css";
import ErrorNotice from "../../components/ui/ErrorNotice";
import ExternalPaymentDialog from "../../components/workspace/ExternalPaymentDialog";

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
  if (error) return <ErrorNotice error={error} onRetry={retry} />;
  return !data ? <p role="status" className="ws-notice">Loading monthly earnings…</p> : null;
}

function EarningsBreakdown({ totals }) {
  return <p className="earnings-breakdown">Weekly sessions: {cash(totals.weeklyTotal || 0)} · Individual appointments: {cash(totals.appointmentTotal || 0)} · Group clinics: {cash(totals.clinicTotal || 0)}<br />Handed-over earnings (included above): {cash(totals.handoverTotal || 0)}</p>;
}

export function MonthlyEarnings() {
  const { role } = useWorkspace();
  const admin = role === "admin";
  const result = useEarnings(allowed(role) ? "/settlements" : null);
  if (!allowed(role)) return <Empty title="Page unavailable">Monthly earnings are available to administrators and professionals.</Empty>;
  const { data } = result;
  return <>
    <PageHeading eyebrow={admin ? "PROFESSIONAL PAYOUTS" : "YOUR EARNINGS"} title={admin ? "Monthly settlements" : "My earnings"} action={!admin && <Link className="ws-link secondary" to="/app/history?tab=handovers">View handovers</Link>}>
      Earnings are grouped by the month each consultation or clinic was completed. Professionals receive the full payment; clinic ticket revenue is shown separately.
    </PageHeading>
    <LoadState {...result} />
    {data && <>
      <p className="ws-muted mb-5">Accepted handovers are credited to the conducting professional at the original booked fee. Handed-over payments are labelled in the monthly payment details.</p>
      <p className="ws-muted mb-5">All amounts in LKR. Dates use Sri Lanka time. Payment status updates automatically.</p>
      {!data.months.length && <Empty title="No completed paid consultations yet">Monthly totals will appear here once paid consultations are completed.</Empty>}
      <div className="earnings-months">
        {data.months.map((month) => admin ? <details className="ws-panel earnings-month" key={month.month}>
          <summary className="earnings-summary">
            <div><h2>{monthLabel(month.month)}</h2><p>{month.count} consultations / clinic tickets · {month.closed ? "Month closed" : "Month in progress"}</p><EarningsBreakdown totals={month} /></div>
            <strong>{cash(month.total)}</strong><ChevronDown aria-hidden="true" size={20} />
          </summary>
          <div className="earnings-groups">
            {Object.entries(roleLabels).map(([category, label]) => {
              const group = month.groups[category];
              return <details className="earnings-group" key={category}>
                <summary className="earnings-summary"><div><h3>{label}</h3><p>{group.professionals.length} professionals · {group.count} paid items</p><EarningsBreakdown totals={group} /></div><strong>{cash(group.total)}</strong><ChevronDown aria-hidden="true" size={18} /></summary>
                {group.professionals.length ? <div className="earnings-professionals">{group.professionals.map((person) => <div className="earnings-professional" key={person.id}>
                  <div><Link className="ws-name-link" to={`/app/settlements/${month.month}/${person.id}`}>{person.name}</Link><p>{person.count} consultations / clinic tickets</p><EarningsBreakdown totals={person} /></div>
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
    <Wallet aria-hidden="true" size={25} /><div><h2>{monthLabel(month.month)}</h2><p>{month.count} consultations / clinic tickets · {month.closed ? "Month closed" : "Month in progress"}</p><EarningsBreakdown totals={month} /></div>
    <PayoutStatus payout={person.payout} /><strong>{cash(month.total)}</strong><span className="earnings-open">View payments →</span>
  </Link>;
}

export function MonthlyEarningsDetails() {
  const { month, professionalId: routeId } = useParams();
  const [params] = useSearchParams();
  const service = ["weekly", "appointment", "clinic", "handover"].includes(params.get("tab")) ? params.get("tab") : "";
  const serviceQuery = service ? `&service=${service}` : "";
  const { role, professionalId } = useWorkspace();
  const admin = role === "admin";
  const target = admin ? routeId : professionalId;
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const key = `${month}/${target}/${service}`;
  const page = pagination.key === key ? pagination.page : 1;
  const [popup, setPopup] = useState(false);
  const [saved, setSaved] = useState(false);
  const result = useEarnings(allowed(role) && target ? `/settlements/${encodeURIComponent(month)}/${encodeURIComponent(target)}?page=${page}${serviceQuery}` : null);
  if (!allowed(role)) return <Empty title="Page unavailable">Monthly earnings are available to administrators and professionals.</Empty>;
  if (!target) return <Empty title="Choose a professional">Open a professional from the Monthly settlements page to view their payments.</Empty>;
  const { data, error } = result;
  return <>
    <Link className="ws-name-link earnings-back" to={admin ? "/app/settlements" : "/app/earnings"}><ArrowLeft aria-hidden="true" size={16} />Back to {admin ? "monthly settlements" : "my earnings"}</Link>
    <LoadState {...result} />
    {data && <>
      <PageHeading eyebrow={admin ? "MONTHLY SETTLEMENT" : "MY EARNINGS"} title={monthLabel(data.month)} action={<PayoutStatus payout={data.payout} />}>{data.professional.name} · {data.professional.role === "doctor" ? "Doctor" : "Lawyer"}</PageHeading>
      <div className="earnings-month-detail"><div className="earnings-totals">
        <Panel title="Monthly earnings"><strong>{cash(data.total)}</strong><p>Full amount · no institution commission</p></Panel>
        <Panel title="Consultations & clinic tickets"><strong>{data.earningsCount ?? data.count}</strong><p>Completed in {monthLabel(data.month)}</p><EarningsBreakdown totals={data} /></Panel>
        <Panel title="Payout"><PayoutStatus payout={data.payout} />{data.payout.paidAt ? <p className="mt-3">Paid {dateLabel(data.payout.paidAt)} at {timeLabel(data.payout.paidAt)}<br />Reference: {data.payout.reference}</p> : <p className="mt-3">{data.closed ? "Awaiting monthly payout" : "This month is still in progress"}</p>}</Panel>
      </div>
      {Number(data.adjustment) !== 0 && data.adjustment != null && <p className="ws-notice" role="status">Earnings changed after payment. Adjustment to reconcile: {cash(data.adjustment)}. The original payout record has not been changed.</p>}
      {admin && <div className="earnings-pay"><div><h3>{data.testPayments ? "Record sandbox settlement" : "Record external payment"}</h3><p>{data.testPayments ? "Test the complete settlement workflow with sandbox amounts. This does not record a real bank transfer." : "Record a verified bank transfer already made to this professional. ConsultCare does not send money."}</p></div><button className="ws-link" disabled={Boolean(error) || !data.canPay} onClick={() => setPopup(true)}>{data.testPayments ? "Record sandbox settlement" : "Record external payment"}</button>{!data.closed && <p className="w-full">Record monthly settlements after the month ends.</p>}</div>}
      <SectionTabs ids={["all", "weekly", "appointment", "clinic", "handover"]} labels={["All payments", "Weekly sessions", "Individual appointments", "Group clinics", "Handovers"]}>
        <PaymentAudit data={data} service="" admin={admin} />
        <PaymentAudit data={data} service="weekly" admin={admin} />
        <PaymentAudit data={data} service="appointment" admin={admin} />
        <PaymentAudit data={data} service="clinic" admin={admin} />
        <PaymentAudit data={data} service="handover" admin={admin} />
      </SectionTabs><div className="earnings-pagination"><button className="ws-link secondary" disabled={page <= 1} onClick={() => setPagination({ key, page: page - 1 })}>Previous</button><span>Payments page {page} of {Math.max(1, Math.ceil(data.count / data.pageSize))} · {service || "all services"}</span><button className="ws-link secondary" disabled={page * data.pageSize >= data.count} onClick={() => setPagination({ key, page: page + 1 })}>Next</button></div>
      </div>
    </>}
    {popup && data && <ExternalPaymentDialog sandbox={data.testPayments} title={data.testPayments ? "Record sandbox settlement" : "Record verified professional payment"} amount={data.total} endpoint={`/admin/settlements/${encodeURIComponent(month)}/${encodeURIComponent(target)}/record-payment`} onClose={() => setPopup(false)} onSaved={() => { setPopup(false); setSaved(true); result.retry(); }} />}
    {saved && <MessageOverlay type="success" text={data?.testPayments ? "Sandbox settlement recorded. The professional has been notified. No real payment was recorded." : "External payment recorded. The professional has been notified. No money was transferred by this application."} onClose={() => setSaved(false)} />}
  </>;
}

function PaymentAudit({ data, service, admin }) {
  const labels = { weekly: "Weekly session payments", appointment: "Individual appointment payments", clinic: "Group clinic payments", handover: "Handed-over consultation payments" };
  const totals = { weekly: data.weeklyTotal, appointment: data.appointmentTotal, clinic: data.clinicTotal, handover: data.handoverTotal };
  // The API filters before pagination. Keep this guard for retained, hidden panels.
  const payments = data.payments.filter((payment) => !service || (service === "handover" ? payment.transfer : payment.serviceType === service));
  return <Panel title={labels[service] || "All consultation & clinic payments"}>
    <p className="mb-4">Included by completion month, not payment month. All times use Sri Lanka time. Handovers are already included in weekly or individual appointment totals; they are not an additional payment.</p>
    {service === "clinic" && <p className="mb-4">Confirmed paid tickets for completed clinics, including attendees who did not join. Cancelled and refunded tickets are excluded.</p>}
    {payments.length ? <div className="ws-table-wrap"><table className="ws-table earnings-table"><caption className="sr-only">{labels[service] || "All payments"} for {data.professional.name}</caption><thead><tr><th scope="col">Patient / client</th><th scope="col">Service / session</th><th scope="col">Paid at</th><th scope="col">Completed at</th><th scope="col">Amount</th></tr></thead><tbody>
      {payments.map((payment) => <tr key={payment.id}><td>{payment.patientName}</td><td><strong>{payment.serviceType === "clinic" ? "Group clinic" : payment.serviceType === "appointment" ? "Individual appointment" : "Weekly session"}</strong><p>{payment.sessionDate} {payment.sessionStart}–{payment.sessionEnd}</p>{payment.clinicId && <Link className="ws-name-link" to={`/app/clinics/${payment.clinicId}?tab=${admin ? "payments" : "manage"}`}>{payment.clinicTitle}</Link>}{payment.transfer && <><p>Handed over by {payment.transfer.fromName} → {data.professional.name}</p><p>Reason: {payment.transfer.reason || "See handover history"}</p><small>Accepted {dateLabel(payment.transfer.acceptedAt)} · {timeLabel(payment.transfer.acceptedAt)}</small><br /><Link className="ws-name-link" to={admin ? "/app/transfers?tab=history" : "/app/history?tab=handovers"}>View handover history</Link></>}</td><td>{dateLabel(payment.paidAt)} · {timeLabel(payment.paidAt)}</td><td>{dateLabel(payment.completedAt)} · {timeLabel(payment.completedAt)}</td><td>{cash(payment.amount)}</td></tr>)}
    </tbody><tfoot><tr><th scope="row" colSpan={4}>Monthly {service === "handover" ? "handed-over subtotal (included in earnings)" : service ? labels[service].toLowerCase() : "earnings total"}</th><td>{cash(service ? totals[service] || 0 : data.total)}</td></tr></tfoot></table></div> : <Empty title="No payments in this view">Completed, paid services matching this category will appear here.</Empty>}
  </Panel>;
}
