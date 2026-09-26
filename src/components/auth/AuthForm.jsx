import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import PlatformLayout from "../PlatformLayout";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { callApi } from "../../api/apiClient";
import { setAuthUser } from "../../features/auth/authSlice";
import { MessageOverlay } from "../ui/MessageBox";
import { useUnsavedChanges } from "../ui/UnsavedChanges";
import { getDestination } from "../../features/auth/roles";

export default function AuthForm({ signup = false }) {
  const [params] = useSearchParams();
  const next = params.get("next");
  const suffix = ["/consult/doctors", "/consult/lawyers"].includes(next) ? `?next=${encodeURIComponent(next)}` : "";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "user" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const markSaved = useUnsavedChanges(form, signup && !created);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (signup && form.password !== form.confirm) { setError("The passwords do not match."); return; }
    if (signup && !form.name.trim()) { setError("Please enter your name."); return; }
    setBusy(true);
    try {
      if (signup) {
        await callApi("POST", "/auth/register", { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
        // Registration does not imply a session or an approved professional role.
        markSaved();
        setCreated(true);
      } else {
        await callApi("POST", "/auth/login", { email: form.email.trim(), password: form.password });
        const session = await callApi("GET", "/auth/me");
        if (!session?.data || typeof session.data !== "object") throw new Error("The server returned an invalid session.");
        dispatch(setAuthUser(session.data));
        navigate(getDestination(session.data, next), { replace: true });
      }
    } catch (failure) {
      setError(failure?.message || failure?.error || "Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }

  return <PlatformLayout>
    <div className="grid gap-12 lg:grid-cols-2 items-start">
      <div className="max-w-md"><p className="cc-eyebrow">{signup ? "YOUR NEXT CHAPTER STARTS HERE" : "WELCOME BACK"}</p><h1 className="font-serif text-4xl sm:text-5xl leading-tight mt-5">{signup ? "Good guidance starts with a connection." : "A familiar space. A fresh conversation."}</h1><p className="mt-6 leading-8">{signup ? "Create an account to consult a doctor or lawyer, or apply to join as a professional." : "Sign in to access your account. Your dashboard is determined by your account role."}</p><div className="flex gap-5 mt-8 text-sm"><Link to="/consult/doctors">Doctor consultations</Link><Link to="/consult/lawyers">Lawyer consultations</Link></div></div>
      <section className="border rounded-2xl p-6 sm:p-9 max-w-lg w-full" style={{ borderColor: "var(--cc-border)", background: "var(--cc-background)" }}>
        <h2>{signup ? "Create your account" : "Log in to ConsultCare"}</h2>
        {created ? <div role="status"><p className="my-6">Your registration was submitted. You can now sign in. Professional accounts require administrator approval.</p><Link className="cc-button" to={`/login${suffix}`}>Continue to login</Link></div> : <form onSubmit={submit} className="space-y-5 mt-7">
          {signup && <><fieldset disabled={busy}><legend className="text-sm font-semibold mb-3">I am joining as</legend><div className="flex flex-wrap gap-3">{[["user", "Patient / client"], ["doctor", "Doctor"], ["lawyer", "Lawyer"]].map(([value, label]) => <label key={value} className="flex gap-2 items-center border rounded-lg p-3 text-sm cursor-pointer"><input type="radio" name="role" value={value} checked={form.role === value} onChange={change} />{label}</label>)}</div></fieldset>{form.role !== "user" && <p className="text-sm leading-6">Your professional credentials must be verified by an administrator before you can offer consultations.</p>}<Input label="Full name" name="name" value={form.name} onChange={change} autoComplete="name" maxLength={120} required disabled={busy} /></>}
          <Input label="Email address" type="email" name="email" value={form.email} onChange={change} autoComplete="email" required disabled={busy} />
          <Input label="Password" type="password" name="password" value={form.password} onChange={change} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 12 : undefined} required disabled={busy} />
          {signup && <Input label="Confirm password" type="password" name="confirm" value={form.confirm} onChange={change} autoComplete="new-password" required disabled={busy} />}
          {!signup && <p className="text-xs">For account recovery, contact your administrator. Automated password reset is not available yet.</p>}
          {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
          <Button type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Log in"}</Button>
          <p className="text-sm">{signup ? "Already registered? " : "New to ConsultCare? "}<Link className="underline font-semibold" to={`${signup ? "/login" : "/signup"}${suffix}`}>{signup ? "Log in" : "Sign up"}</Link></p>
          {!signup && <p className="text-xs leading-5">Doctors, lawyers, users, and administrators use this same secure login. Administrator accounts are provisioned privately.</p>}
        </form>}
      </section>
    </div>
  </PlatformLayout>;
}
