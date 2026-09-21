import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, FileText, HeartPulse, LayoutDashboard, Scale, ShieldCheck, UserRound, Users, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GlobalLoader from "../ui/GlobalLoader";
import { logoutUser } from "../../features/auth/authSlice";
import { fetchWorkspace, clearWorkspaceError, clearFeedback } from "../../features/consultations/consultationSlice";
import { MessageOverlay } from "../ui/MessageBox";
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
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingNotice, setOnboardingNotice] = useState(null);
  const onboardingStep = useRef(null);
  useEffect(() => {
    dispatch(fetchWorkspace());
  }, [dispatch]);
  useEffect(() => {
    if (!state.loaded || !state.onboarding) return;
    const destination = "/app/" + state.onboarding;
    if (location.pathname === destination) {
      onboardingStep.current = state.onboarding;
      return;
    }
    const enteringStep = onboardingStep.current !== state.onboarding;
    onboardingStep.current = state.onboarding;
    if (enteringStep) {
      navigate(destination, { replace: true });
      return;
    }
    setOnboardingNotice(state.onboarding === "profile"
      ? { title: "Complete your profile first", text: "Please finish the required details in My Profile before continuing to other pages." }
      : { title: "Set your weekly sessions first", text: "Please add and save at least one weekly session before continuing to other pages." });
    navigate(destination, { replace: true });
  }, [state.loaded, state.onboarding, location.pathname, navigate]);
  const signOut = async () => {
    const action = await dispatch(logoutUser());
    if (!action.error) navigate("/login", { replace: true });
  };
  if (!state.loaded) return state.error ? <div className="p-12"><p role="alert">{state.error}</p><button className="underline mr-5" onClick={() => dispatch(fetchWorkspace())}>Retry</button><button className="underline" onClick={signOut}>Sign out</button></div> : <GlobalLoader fullPage message="Loading your workspace..." />;
  const professional = state.professionals.find((p) => p.id === state.professionalId);
  const name = state.role === "user" ? state.patient.name : state.role === "admin" ? "Platform administrator" : professional.name;
  const links = state.role === "user" ? [
    ["/app", "Overview", LayoutDashboard], ["/consult/doctors", "Find a doctor", HeartPulse], ["/consult/lawyers", "Find a lawyer", Scale], ["/app/bookings", "My consultations", CalendarDays], ["/app/history", "My history", FileText], ["/app/profile", "My profile", UserRound],
  ] : state.role === "admin" ? [
    ["/app", "Overview", LayoutDashboard], ["/app/admin", "People & verification", Users], ["/app/settlements", "Monthly settlements", CalendarDays], ["/app/payments", "Payments & refunds", ShieldCheck],
  ] : [
    ["/app", "Overview", LayoutDashboard], ["/app/queue", "Consultation queue", Users], ["/app/sessions", "My sessions", CalendarDays], ["/app/earnings", "My earnings", ShieldCheck], ["/app/history", "Consultation history", FileText], ["/app/profile", "Professional profile", UserRound],
  ];
  return <div className="ws" style={Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--ws-${key}`, value]))}>
    <aside className={"ws-sidebar " + (open ? "ws-sidebar-open " : "") + (sidebarCollapsed ? "ws-sidebar-collapsed" : "")}>
      <Link className="ws-brand" to="/"><ShieldCheck />consultcare<span>.</span></Link>
      <p className="ws-eyebrow ws-nav-label">{state.role === "user" ? "PATIENT & CLIENT" : state.role.toUpperCase()} WORKSPACE</p>
      <nav aria-label="Workspace">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)}><Icon size={18} />{label}</NavLink>)}</nav>
      <div className="ws-sidebar-bottom"><ShieldCheck size={23} /><h3>A little clarity.<br />A better next step.</h3><p>Your conversations, all in one place.</p><div className="ws-sidebar-footer"><Link to="/">Back to home →</Link><button className="ws-sidebar-toggle" type="button" aria-label="Hide sidebar" title="Hide sidebar" onClick={() => window.matchMedia("(max-width: 760px)").matches ? setOpen(false) : setSidebarCollapsed(true)}><PanelLeftClose size={16} /></button></div></div>
    </aside>
    <div className={"ws-body " + (sidebarCollapsed ? "ws-body-expanded" : "")}>
      {sidebarCollapsed && <button className="ws-sidebar-restore" type="button" aria-label="Show sidebar" title="Show sidebar" onClick={() => setSidebarCollapsed(false)}><PanelLeftOpen size={18} /></button>}
      <header className="ws-topbar"><button className="ws-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><div><span className="ws-eyebrow">WELCOME BACK</span><p>{name}</p></div><div className="ws-identity"><span className="ws-avatar">{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span></div></header>
      <div className="ws-preview"><div><strong>{state.role === "user" ? "Patient / client" : state.role} workspace</strong><span> · Connected to your account{state.mockPayments ? " · Test payments enabled" : ""}</span></div><button className="underline font-semibold" onClick={signOut}>Sign out</button></div>
      {state.error && <div className="ws-notice mx-6" role="alert">{state.error}<button className="underline ml-4" onClick={() => dispatch(clearWorkspaceError())}>Dismiss</button></div>}
      {state.pending > 0 && <GlobalLoader fullPage message="Saving changes..." />}
      {state.feedback && <MessageOverlay type={state.feedback.type} text={state.feedback.text} onClose={() => dispatch(clearFeedback())} />}
      {onboardingNotice && <MessageOverlay type="error" title={onboardingNotice.title} text={onboardingNotice.text} onClose={() => setOnboardingNotice(null)} />}
      <main className="ws-main">
        {state.onboarding && <div className="ws-notice">{state.onboarding === "profile" ? "Welcome. Complete your required profile details to continue." : "Next, add at least one weekly session to finish your professional setup."}</div>}
        <Outlet />
      </main>
    </div>
  </div>;
}
