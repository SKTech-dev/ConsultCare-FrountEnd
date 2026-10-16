import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { callApi } from "../../api/apiClient";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import GlobalLoader from "../../components/ui/GlobalLoader";
import ErrorNotice from "../../components/ui/ErrorNotice";
import { dateLabel } from "../../features/consultations/calendar";
import { money } from "../../features/consultations/model";
import "./people.css";

function pageNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}
function usePeople(endpoint) {
  const [state, setState] = useState({ endpoint: null, data: null, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    setState({ endpoint, data: null, error: "" });
    callApi("GET", endpoint, null, null, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setState({ endpoint, data: result.data, error: "" });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ endpoint, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [endpoint, version]);
  return { ...(state.endpoint === endpoint ? state : { data: null, error: "" }), retry: () => setVersion((value) => value + 1) };
}
function LoadState({ data, error, retry }) {
  return error ? <ErrorNotice error={error} onRetry={retry} /> : !data ? <GlobalLoader message="Loading consultation records…" /> : null;
}
function Pagination({ data, page, choose, label }) {
  if (data.count <= data.pageSize && page === 1) return null;
  return <nav className="people-pagination" aria-label={label}><button className="ws-link secondary" disabled={page <= 1} onClick={() => choose(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(data.count / data.pageSize))}</span><button className="ws-link secondary" disabled={page * data.pageSize >= data.count} onClick={() => choose(page + 1)}>Next</button></nav>;
}
function range(data, page) {
  return data.items.length ? ((page - 1) * data.pageSize + 1) + "–" + ((page - 1) * data.pageSize + data.items.length) + " of " + data.count : "0 of " + data.count;
}
export default function ProfessionalPeople() {
  const { role } = useWorkspace();
  const allowed = ["doctor", "lawyer"].includes(role);
  const noun = role === "lawyer" ? "clients" : "patients";
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").slice(0, 120), page = pageNumber(params.get("page"));
  const [search, setSearch] = useState(q);
  useEffect(() => { setSearch(q); }, [q]);
  const query = new URLSearchParams({ page: String(page), q });
  const result = usePeople(allowed ? "/professional/people?" + query : null);
  function apply(value) {
    const next = new URLSearchParams();
    if (value.trim()) next.set("q", value.trim());
    setSearch(value.trim()); setParams(next);
  }
  if (!allowed) return <Empty title="Professional records">Patient and client records are available in professional accounts.</Empty>;
  return <>
    <PageHeading title={"My " + noun + "."}>Find someone by name or email and revisit your consultations with them.</PageHeading>
    <Panel title={q ? "Search results" : "All " + noun}>
      <form className="people-search" role="search" aria-label={"Search " + noun} onSubmit={(event) => { event.preventDefault(); apply(search); }}>
        <label className="ws-field">{"Search " + noun + " by name or email"}<input type="search" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email address" /></label>
        <div className="ws-actions"><button className="ws-link" type="submit"><Search size={16} />Search</button><button className="ws-link secondary" type="button" onClick={() => apply("")} disabled={!q && !search}>Clear</button></div>
      </form>
      <LoadState {...result} />
      {result.data && <>
        <p className="people-count" role="status">{"Showing " + range(result.data, page) + " " + noun}</p>
        {result.data.items.length ? <table className="ws-table people-table" role="table"><caption className="sr-only">{q ? "Matching " + noun : "Your " + noun}</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Latest session</th><th scope="col">Records</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{result.data.items.map((person) => {
          const detailQuery = new URLSearchParams(); if (q) detailQuery.set("q", q); detailQuery.set("peoplePage", String(page));
          const destination = "/app/people/" + encodeURIComponent(person.id) + "?" + detailQuery;
          return <tr key={person.id}><td data-label="Name"><Link className="ws-name-link" to={destination}>{person.name}</Link></td><td data-label="Email" className="people-email">{person.email}</td><td data-label="Latest session">{dateLabel(person.latestDate)}</td><td data-label="Records">{person.consultationCount}</td><td className="people-action"><Link className="ws-link secondary" aria-label={"View consultations for " + person.name} to={destination}>View consultations</Link></td></tr>;
        })}</tbody></table> : <Empty title={q ? "No matching " + noun : "No " + noun + " yet"}>{q ? "Try another name or email, or clear the search to see everyone." : "People will appear here when they have a consultation booking with you."}</Empty>}
        <Pagination data={result.data} page={page} label={"Your " + noun + " pages"} choose={(value) => { const next = new URLSearchParams(params); next.set("page", String(value)); setParams(next); }} />
      </>}
    </Panel>
  </>;
}
export function PersonConsultations() {
  const { personId } = useParams();
  const { role } = useWorkspace();
  const allowed = ["doctor", "lawyer"].includes(role);
  const noun = role === "lawyer" ? "client" : "patient";
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").slice(0, 120), page = pageNumber(params.get("page"));
  const peoplePage = pageNumber(params.get("peoplePage"));
  const result = usePeople(allowed ? "/professional/people/" + encodeURIComponent(personId) + "/consultations?page=" + page : null);
  const backQuery = new URLSearchParams(); if (q) backQuery.set("q", q); if (peoplePage > 1) backQuery.set("page", String(peoplePage));
  if (!allowed) return <Empty title="Professional records">Patient and client records are available in professional accounts.</Empty>;
  return <>
    <Link className="people-back" to={"/app/people" + (backQuery.size ? "?" + backQuery : "")}><ArrowLeft size={17} />{"Back to my " + noun + "s"}</Link>
    <PageHeading title={result.data?.person.name || (noun === "client" ? "Client records." : "Patient records.")}>{result.data ? result.data.person.email : "Your consultations with this person."}</PageHeading>
    <LoadState {...result} />
    {result.data && <Panel title="Consultation records">
      <p className="people-count" role="status">{"Showing " + range(result.data, page) + " records · Newest first · Sri Lanka time"}</p>
      {result.data.items.length ? <table className="ws-table people-table people-records-table" role="table"><caption className="sr-only">{"Consultations with " + result.data.person.name}</caption><thead><tr><th scope="col">Date & time</th><th scope="col">Consultation</th><th scope="col">Status</th><th scope="col">Fee & payment</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{result.data.items.map((booking) => {
        const context = new URLSearchParams({ person: personId, peoplePage: String(peoplePage), recordsPage: String(page) }); if (q) context.set("peopleQuery", q);
        return <tr key={booking.id}><td data-label="Date & time"><strong>{dateLabel(booking.date)}</strong><small>{booking.start}–{booking.end}</small></td><td data-label="Consultation">{booking.type === "appointment" ? "Individual appointment" : "Weekly session"}</td><td data-label="Status"><Status>{booking.status}</Status></td><td data-label="Fee & payment"><span>{money(booking.fee)}</span><small>{booking.payment}</small></td><td className="people-action"><Link className="ws-link secondary" to={"/app/booking/" + encodeURIComponent(booking.id) + "?" + context}>View details</Link></td></tr>;
      })}</tbody></table> : <Empty title="No records on this page">Use the page controls to return to the consultation list.</Empty>}
      <Pagination data={result.data} page={page} label="Consultation record pages" choose={(value) => { const next = new URLSearchParams(params); next.set("page", String(value)); setParams(next); }} />
    </Panel>}
  </>;
}
