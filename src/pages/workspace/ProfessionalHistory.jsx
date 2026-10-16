import { useEffect, useId, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, Clock3, FileText } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { useWorkspace, PageHeading, Panel, Status, Empty } from "../../components/workspace/Workspace";
import SectionTabs from "../../components/ui/SectionTabs";
import GlobalLoader from "../../components/ui/GlobalLoader";
import ErrorNotice from "../../components/ui/ErrorNotice";
import { money, sriLankanDate } from "../../features/consultations/model";
import { calendarWeeks, dateLabel, daySummary, historyCalendarUrl, historyContext, historyTabs, shiftMonth, validDate, validMonth } from "../../features/consultations/calendar";
import "./history.css";

function useHistory(endpoint) {
  const [state, setState] = useState({ endpoint: null, data: null, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    setState({ endpoint, data: null, error: "" });
    callApi("GET", endpoint, null, null, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setState({ endpoint, data: result.data, error: "" });
    }).catch((error) => { if (!controller.signal.aborted) setState({ endpoint, data: null, error: error.message }); });
    return () => controller.abort();
  }, [endpoint, version]);
  return { ...(state.endpoint === endpoint ? state : { data: null, error: "" }), retry: () => setVersion((value) => value + 1) };
}
function LoadState({ data, error, retry }) {
  return error ? <ErrorNotice error={error} onRetry={retry} /> : !data ? <GlobalLoader message="Loading consultation history…" /> : null;
}
function Summary({ tab, summary, label }) {
  return <section className="history-summary" aria-label={label}>{tab.metrics.map(([key, name]) => <div key={key}><strong>{summary[key] || 0}</strong><span>{name}</span></div>)}</section>;
}
function Outcomes({ summary }) {
  return <div className="history-outcomes">{[["consultations", "consultation"], ["completed", "completed"], ["cancelled", "cancelled"], ["noShow", "no-show"], ["unfinished", "unfinished"]].filter(([key]) => summary[key]).map(([key, text]) => <span key={key}>{summary[key]} {text}{key === "consultations" && summary[key] !== 1 ? "s" : ""}</span>)}</div>;
}
function pageNumber(params) {
  const value = Number(params.get("page"));
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}
function Pages({ data, page, choose }) {
  if (data.count <= data.pageSize && page === 1) return null;
  return <nav className="history-pages" aria-label="History records pages"><button className="ws-link secondary" disabled={page === 1} onClick={() => choose(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(data.count / data.pageSize))}</span><button className="ws-link secondary" disabled={page * data.pageSize >= data.count} onClick={() => choose(page + 1)}>Next</button></nav>;
}
function CalendarMonth({ tab, month }) {
  const result = useHistory("/history/calendar?category=" + tab.category + "&month=" + month);
  const [params] = useSearchParams();
  const [emptyDate, setEmptyDate] = useState(null);
  const tooltipId = useId();
  useEffect(() => { setEmptyDate(null); }, [month]);
  const today = sriLankanDate();
  return <Panel title={tab.label + " · " + dateLabel(month + "-01", { day: undefined })}>
    <LoadState {...result} />
    {result.data && <>
      <Summary tab={tab} summary={result.data.summary} label="Month summary" />
      <p className="history-calendar-help">Select a date with records to see its details. Hover or focus a date for a quick summary.</p>
      {tab.category === "appointments" && <p className="ws-muted history-invitation-note">Unselected invitations are shown separately on their last offered date and do not count as consultations.</p>}
      <table className="history-calendar"><caption className="sr-only">{tab.label} for {dateLabel(month + "-01", { day: undefined })}</caption>
        <thead><tr>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
        <tbody>{calendarWeeks(month, result.data.days).map((week, index) => <tr key={index}>{week.map((day, column) => {
          if (!day) return <td className="history-calendar-blank" key={column} />;
          const text = daySummary(tab.category, day.summary);
          const tooltip = tooltipId + "-" + day.date;
          const selected = params.get("date") === day.date;
          const className = "history-calendar-day" + (day.hasRecords ? " has-records" : "") + (selected ? " is-selected" : "");
          const content = <><span className="history-date-number">{Number(day.date.slice(-2))}</span>{day.hasRecords ? <span className="history-date-count">{day.summary.records}<span className="history-count-label"> {day.summary.records === 1 ? "record" : "records"}</span></span> : <span className="history-date-empty" aria-hidden="true">—</span>}<span id={tooltip} className="history-day-tooltip" role="tooltip"><strong>{dateLabel(day.date)}</strong><span>{text}</span></span></>;
          const props = { className, "aria-label": dateLabel(day.date) + ": " + text, "aria-describedby": tooltip, "aria-current": day.date === today ? "date" : undefined };
          return <td key={day.date}>{day.hasRecords ? <Link {...props} to={"/app/history/" + tab.category + "/" + day.date + "?month=" + month}>{content}</Link> : <button {...props} type="button" onClick={() => setEmptyDate(day.date)}>{content}</button>}</td>;
        })}</tr>)}</tbody>
      </table>
      <p className="history-calendar-note" role="status">{emptyDate ? "No records for " + dateLabel(emptyDate) + "." : result.data.summary.records ? "All times are in Sri Lanka time." : "No history records for this month. Choose another month to browse earlier activity."}</p>
    </>}
  </Panel>;
}
export default function ProfessionalHistory() {
  const { role } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const month = validMonth(params.get("month")) ? params.get("month") : sriLankanDate().slice(0, 7);
  function changeMonth(value) {
    if (!validMonth(value)) return;
    setParams((previous) => { const next = new URLSearchParams(previous); next.set("month", value); next.delete("date"); return next; });
  }
  if (!["doctor", "lawyer"].includes(role)) return <Empty title="Professional history">Consultation history calendars are available in professional accounts.</Empty>;
  return <>
    <PageHeading title="Consultation history.">A month at a glance. Choose a date to revisit sessions, appointments, clinics and past handovers.</PageHeading>
    <div className="history-month-controls"><div className="history-month-stepper"><button type="button" className="history-icon-button" aria-label="Previous month" disabled={month === "1900-01"} onClick={() => changeMonth(shiftMonth(month, -1))}><ChevronLeft size={20} /></button><label className="history-month-input"><span className="sr-only">History month</span><CalendarDays size={18} /><input type="month" value={month} min="1900-01" max="9998-12" onChange={(event) => changeMonth(event.target.value)} /></label><button type="button" className="history-icon-button" aria-label="Next month" disabled={month === "9998-12"} onClick={() => changeMonth(shiftMonth(month, 1))}><ChevronRight size={20} /></button></div><button className="ws-link secondary" onClick={() => changeMonth(sriLankanDate().slice(0, 7))}>Today</button></div>
    <SectionTabs ids={historyTabs.map((tab) => tab.id)} labels={historyTabs.map((tab) => tab.label)} label="History categories">{historyTabs.map((tab) => <CalendarMonth key={tab.id} tab={tab} month={month} />)}</SectionTabs>
  </>;
}
function RecordCard({ item, context }) {
  const query = new URLSearchParams({ history: context.category, date: context.date, month: context.month });
  const recordsUrl = "/app/history/session/" + (item.sessionId || item.id) + "?" + query;
  return <article className="history-day-card">
    <header><div className="history-card-time"><Clock3 size={19} /><h2>{item.start ? item.start + "–" + item.end : "Unselected invitation"}</h2></div>{item.status && <Status>{item.status}</Status>}</header>
    {item.type === "session" && <><p>Weekly consultation session</p><Outcomes summary={item.summary} /><Link className="ws-link" to={recordsUrl}><FileText size={16} />View records</Link></>}
    {item.type === "appointment" && <><h3>{item.patientName}</h3><p>Fee: {money(item.fee)} · Payment: {item.payment}</p>{item.canViewRecord ? <Link className="ws-link" to={"/app/booking/" + item.id + "?" + query}>View consultation record</Link> : <p className="ws-muted">This appointment did not create a paid consultation record.</p>}</>}
    {item.type === "invitation" && <><h3>{item.patientName}</h3><p>{item.reason || "No additional invitation notes."}</p><p>Offered fee: {money(item.fee)} · No consultation was booked.</p><h4>Offered times</h4><ul className="history-option-list">{item.options.map((option) => <li key={option.id}>{dateLabel(option.date)} · {option.start}–{option.end}</li>)}</ul></>}
    {item.type === "clinic" && <><h3>{item.title}</h3><p>{item.description || "No additional clinic description."}</p><p>{item.summary.registrations} confirmed registrations · {item.summary.attended} attended · {money(item.fee)} per attendee</p>{item.cancellationReason && <p>Cancellation: {item.cancellationReason}</p>}<Link className="ws-link" to={"/app/clinics/" + item.id + "?tab=manage&" + query}>View clinic record</Link></>}
    {item.type === "handover" && <><h3>{item.fromName} → {item.toName}</h3><p>{item.reason}</p>{item.responseReason && <p>Outcome note: {item.responseReason}</p>}<p>{item.queueCount} patients at handover · Estimated consultation total: {money(item.expectedAmount)}</p>{item.canViewRecords && <Link className="ws-link" to={recordsUrl}>View records</Link>}</>}
  </article>;
}
export function HistoryDay() {
  const { category, date } = useParams();
  const { role } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const tab = historyTabs.find((value) => value.category === category);
  const valid = tab && validDate(date) && ["doctor", "lawyer"].includes(role);
  const month = validMonth(params.get("month")) ? params.get("month") : valid ? date.slice(0, 7) : sriLankanDate().slice(0, 7);
  const page = pageNumber(params);
  const result = useHistory(valid ? "/history/day?category=" + category + "&date=" + date + "&page=" + page : null);
  if (!valid) return <Empty title="History date unavailable">Choose a valid date from your consultation history.</Empty>;
  const context = { category, date, month };
  return <>
    <Link className="history-back" to={historyCalendarUrl(category, month, date)}><ArrowLeft size={17} />Back to calendar</Link>
    <PageHeading eyebrow="CONSULTATION HISTORY · SRI LANKA TIME" title={tab.label + " · " + dateLabel(date)}>Sessions and records for this date, ordered by start time.</PageHeading>
    <LoadState {...result} />
    {result.data && <><Summary tab={tab} summary={result.data.summary} label="Day summary" />{result.data.items.length ? <div className="history-day-records">{result.data.items.map((item) => <RecordCard key={item.type + item.id} item={item} context={context} />)}</div> : <Empty title="No records for this date">Return to the calendar and choose another date.</Empty>}<Pages data={result.data} page={page} choose={(value) => setParams({ month, page: String(value) })} /></>}
  </>;
}
export function HistorySessionRecords() {
  const { sessionId } = useParams();
  const [params, setParams] = useSearchParams();
  const context = historyContext(params);
  const page = pageNumber(params);
  const result = useHistory("/history/sessions/" + sessionId + "?page=" + page);
  return <>
    <Link className="history-back" to={context?.dayUrl || "/app/history"}><ArrowLeft size={17} />{context ? "Back to day details" : "Back to calendar"}</Link>
    <PageHeading title={result.data ? dateLabel(result.data.date) + " · " + result.data.start + "–" + result.data.end : "Session records."}>Completed, cancelled, missed and unfinished consultations are listed separately.</PageHeading>
    <LoadState {...result} />
    {result.data && <Panel title="Patients & consultation records"><Outcomes summary={result.data.summary} />{result.data.items.length ? result.data.items.map((booking) => {
      const query = new URLSearchParams(params); query.delete("page"); query.set("session", sessionId);
      return <div className="ws-row activity-row" key={booking.id}><div><h3>{booking.patientName}</h3><p>{money(booking.fee)} · {booking.payment}</p></div><Status>{booking.status}</Status>{booking.canViewRecord && <Link className="ws-link secondary" to={"/app/booking/" + booking.id + "?" + query}>View record</Link>}</div>;
    }) : <Empty title="No consultation records">No bookings are available for this session.</Empty>}<Pages data={result.data} page={page} choose={(value) => setParams((old) => { const next = new URLSearchParams(old); next.set("page", String(value)); return next; })} /></Panel>}
  </>;
}
