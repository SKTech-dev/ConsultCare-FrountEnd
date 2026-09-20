import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, FileText, HeartPulse, LayoutDashboard, Scale, ShieldCheck, UserRound, Users, Menu, X } from "lucide-react";
import { useState } from "react";
import { switchWorkspace } from "../../features/consultations/consultationSlice";
import "./workspace.css";

export function useWorkspace() { return useSelector((s) => s.consultations); }
export function PageHeading({ eyebrow = "YOUR CONSULTATION SPACE", title, children, action }) {
  return <div className="ws-heading"><div><p className="ws-eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>;
}
export function Status({ children }) { return <span className={"ws-status " + (["COMPLETED", "verified", "NEXT", "paid (mock)"].includes(children) ? "ws-good" : "")}>{children}</span>; }
export function Empty({ title, children }) { return <div className="ws-empty"><CalendarDays size={30} /><h3>{title}</h3><p>{children}</p></div>; }
export function Panel({ title, children }) { return <section className="ws-panel">{title && <h2>{title}</h2>}{children}</section>; }

export default function Workspace() {
  const state = useWorkspace();
  const colors = useSelector((s) => s.theme.colors);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const professional = state.professionals.find((p) => p.id === state.professionalId);
  const name = state.role === "user" ? state.patient.name : state.role === "admin" ? "Platform administrator" : professional.name;
  const links = state.role === "user" ? [
    ["/app", "Overview", LayoutDashboard], ["/consult/doctors", "Find a doctor", HeartPulse], ["/consult/lawyers", "Find a lawyer", Scale], ["/app/bookings", "My consultations", CalendarDays], ["/app/history", "My history", FileText], ["/app/profile", "My profile", UserRound],
  ] : state.role === "admin" ? [
    ["/app", "Overview", LayoutDashboard], ["/app/admin", "People & verification", Users], ["/app/issues", "Payments & support", ShieldCheck],
  ] : [
    ["/app", "Overview", LayoutDashboard], ["/app/queue", "Consultation queue", Users], ["/app/sessions", "My sessions", CalendarDays], ["/app/history", "Consultation history", FileText], ["/app/profile", "Professional profile", UserRound],
  ];
  return <div className="ws" style={Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--ws-${key}`, value]))}>
    <aside className={"ws-sidebar " + (open ? "ws-sidebar-open" : "")}>
      <Link className="ws-brand" to="/"><ShieldCheck />consultcare<span>.</span></Link>
      <p className="ws-eyebrow ws-nav-label">{state.role === "user" ? "PATIENT & CLIENT" : state.role.toUpperCase()} WORKSPACE</p>
      <nav aria-label="Workspace">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)}><Icon size={18} />{label}</NavLink>)}</nav>
      <div className="ws-sidebar-bottom"><ShieldCheck size={23} /><h3>A little clarity.<br />A better next step.</h3><p>Your conversations, all in one place.</p><Link to="/">Back to home →</Link></div>
    </aside>
    <div className="ws-body">
      <header className="ws-topbar"><button className="ws-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><div><span className="ws-eyebrow">WELCOME BACK</span><p>{name}</p></div><div className="ws-identity"><span className="ws-avatar">{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span></div></header>
      <div className="ws-preview"><div><strong>Frontend preview</strong><span> Always signed in · synthetic data · mock payments</span></div><label>View as <select aria-label="Preview workspace" value={state.role === "user" ? state.patient.id : ["doctor", "lawyer"].includes(state.role) ? state.professionalId : state.role} onChange={(e) => { const p = state.professionals.find((p) => p.id === e.target.value); const patient = state.patients.find((p) => p.id === e.target.value); dispatch(switchWorkspace({ role: patient ? "user" : p?.role || e.target.value, id: patient?.id || p?.id })); navigate("/app"); setOpen(false); }}>{state.patients.map((p) => <option key={p.id} value={p.id}>{p.name} (patient / client)</option>)}{state.professionals.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}<option value="admin">Administrator</option></select></label></div>
      <main className="ws-main"><Outlet /></main>
    </div>
  </div>;
}
