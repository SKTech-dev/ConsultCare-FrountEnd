import { useState } from "react";

export const emptyFilters = { q: "", profession: "", status: "", date_from: "", date_to: "" };

export function filterParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
}

export default function ListFilters({ label, onApply, statuses = [], children }) {
  const [draft, setDraft] = useState({ ...emptyFilters });
  const field = (name) => ({ value: draft[name], onChange: (event) => setDraft((old) => ({ ...old, [name]: event.target.value })) });
  return <form className="ws-list-filters" aria-label={label} onSubmit={(event) => { event.preventDefault(); onApply({ ...draft, q: draft.q.trim() }); }}>
    {children}
    <label className="ws-field">Professional name or email<input type="search" maxLength={120} placeholder="Search professionals" {...field("q")} /></label>
    <label className="ws-field">Profession<select {...field("profession")}><option value="">Doctors & lawyers</option><option value="doctor">Doctors</option><option value="lawyer">Lawyers</option></select></label>
    {statuses.length > 0 && <label className="ws-field">Status<select {...field("status")}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase())}</option>)}</select></label>}
    <label className="ws-field">From date<input type="date" max={draft.date_to || undefined} {...field("date_from")} /></label>
    <label className="ws-field">To date<input type="date" min={draft.date_from || undefined} {...field("date_to")} /></label>
    <div className="ws-actions"><button className="ws-link">Apply filters</button><button type="button" className="ws-link secondary" onClick={() => { setDraft({ ...emptyFilters }); onApply({ ...emptyFilters }); }}>Clear filters</button></div>
  </form>;
}
