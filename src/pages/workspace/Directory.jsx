import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { BadgeCheck, HeartPulse, Scale } from "lucide-react";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { book } from "../../features/consultations/consultationSlice";
import { isBookableSession, money, sessionLabel, sortUpcomingSessions } from "../../features/consultations/model";
import Button from "../../components/ui/Button";

export function Directory({ profession }) {
  const s = useWorkspace();
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [language, setLanguage] = useState("");
  const [fee, setFee] = useState("");
  const [online, setOnline] = useState(false);
  const list = s.professionals.filter((p) => p.role === profession && p.status === "verified");
  const found = list.filter((p) => (p.name + " " + p.speciality).toLowerCase().includes(search.toLowerCase()) && (!speciality || p.speciality === speciality) && (!language || p.languages.includes(language)) && (!fee || p.fee <= Number(fee)) && (!online || s.sessions.some((x) => x.professionalId === p.id && isBookableSession(x))));
  const Icon = profession === "doctor" ? HeartPulse : Scale;
  return <>
    <PageHeading eyebrow={profession === "doctor" ? "FOR YOUR HEALTH" : "FOR YOUR PEACE OF MIND"} title={"Find your " + profession + "."}>Choose a professional who fits your needs, language, and schedule. Review their qualifications and available consultation sessions.</PageHeading>
    <div className="ws-filters"><label>Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or speciality" /></label><label>Speciality<select value={speciality} onChange={(e) => setSpeciality(e.target.value)}><option value="">All specialities</option>{[...new Set(list.map((p) => p.speciality))].map((x) => <option key={x}>{x}</option>)}</select></label><label>Language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="">All languages</option>{["English", "Sinhala", "Tamil"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Maximum fee (LKR)<input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Any fee" /></label></div>
    <div className="flex justify-between mb-5 text-xs"><span>{found.length} professionals</span><label className="flex gap-2"><input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />Session online now</label></div>
    <div className="ws-grid">{found.map((p) => { const next = sortUpcomingSessions(s.sessions.filter((x) => x.professionalId === p.id))[0]; return <article className="ws-panel ws-professional" key={p.id}><div className="ws-person-top"><div className="ws-person-avatar">{p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-[inherit]" /> : <Icon size={28} strokeWidth={1.3} />}</div><Status>verified</Status></div><h3>{p.name}</h3><p>{p.speciality}</p><div className="ws-tags">{p.languages.map((l) => <span key={l}>{l}</span>)}</div><p>{p.bio}</p><div className="ws-row"><strong>{money(p.fee)}</strong><span className="ws-muted">per consultation</span></div><p>{next ? sessionLabel(next) : "No upcoming sessions"}</p><div className="ws-actions"><Link className="ws-link" to={"/app/professionals/" + p.id}>View profile & availability →</Link></div></article>; })}</div>
    {!found.length && <Empty title="No matching professionals">Try another name, speciality, language, or fee.</Empty>}
  </>;
}

export function ProfessionalDetails() {
  const { id } = useParams();
  const s = useWorkspace();
  const p = s.professionals.find((p) => p.id === id && p.status === "verified");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  if (!p) return <Empty title="Profile unavailable">This professional is not currently accepting bookings.</Empty>;
  const sessions = sortUpcomingSessions(s.sessions.filter((x) => x.professionalId === id));
  const existing = s.bookings.find((b) => b.patientId === s.patient.id && b.sessionId === selected && !["CANCELLED", "NO-SHOW"].includes(b.status));
  const full = sessions.find((x) => x.id === selected)?.remaining === 0;
  return <>
    <PageHeading eyebrow={p.role.toUpperCase() + " PROFILE"} title={p.name}>{p.speciality} · {p.qualifications}</PageHeading>
    <div className="ws-grid-two"><Panel title="Someone to talk it through with"><BadgeCheck className="mb-4" /><Status>verified</Status><p className="ws-space">{p.bio}</p><div className="ws-row"><span>Registration</span><strong>{p.registration}</strong></div><div className="ws-row"><span>Languages</span><strong>{p.languages.join(", ")}</strong></div><div className="ws-row"><span>Consultation fee</span><strong>{money(p.fee)}</strong></div><p className="ws-muted mt-5">Credentials reviewed before activation.</p></Panel>
      <Panel title="Choose your session"><form onSubmit={async (e) => { e.preventDefault(); const action = await dispatch(book({ sessionId: selected, reason: reason.trim() })); if (!action.error) navigate("/app/booking/" + action.payload.id); }}>
        <label className="ws-field">Available sessions<select required value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Select a session</option>{sessions.map((x) => <option key={x.id} value={x.id}>{sessionLabel(x)} · {x.remaining} place{x.remaining === 1 ? "" : "s"} available</option>)}</select></label>
        <label className="ws-field">What would you like to discuss? (optional)<textarea maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the questions you would like to discuss." /></label>
        <div className="ws-notice">{s.mockPayments ? "Test checkout is enabled: no money will be charged." : "Payment provider integration is not yet enabled. You can reserve a booking but cannot pay online yet."}</div>
        {existing ? <Link className="ws-link" to={"/app/booking/" + existing.id}>View your existing booking</Link> : <Button type="submit" disabled={!selected || full || s.role !== "user" || s.patient.status !== "active"}>{full ? "Session is full" : "Confirm booking & continue"}</Button>}
        {s.role !== "user" && <p className="ws-muted mt-3">Sign in with a patient / client account to book.</p>}{s.patient.status !== "active" && <p className="ws-error">Patient account is suspended.</p>}
      </form></Panel></div>
  </>;
}
