import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PlatformLayout from "../PlatformLayout";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { callApi } from "../../api/apiClient";
import { setAuthUser } from "../../features/auth/authSlice";
import { MessageOverlay } from "../ui/MessageBox";
import { useUnsavedChanges } from "../ui/UnsavedChanges";
import { getDestination } from "../../features/auth/roles";
import GoogleSignIn from "./GoogleSignIn";

export default function AuthForm({ signup = false }) {
  const [params] = useSearchParams();
  const next = params.get("next");
  const suffix = ["/consult/doctors", "/consult/lawyers", "/consult/counsellors"].includes(next) ? `?next=${encodeURIComponent(next)}` : "";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "user" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [replacement, setReplacement] = useState(null);
  const [googleAttempt, setGoogleAttempt] = useState(0);
  const sessionNotice = useSelector((state) => state.auth.sessionNotice);
  const locked = busy || Boolean(replacement);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const markSaved = useUnsavedChanges(form, signup && !created);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  function requestReplacement(result) {
    setReplacement(result.confirmationToken);
    setForm((current) => ({ ...current, password: "", confirm: "" }));
  }
  async function finishLogin() {
    const session = await callApi("GET", "/auth/me");
    if (!session?.data || typeof session.data !== "object") throw new Error("The server returned an invalid session.");
    markSaved(); dispatch(setAuthUser(session.data));
    navigate(getDestination(session.data, next), { replace: true });
  }
  async function confirmReplacement() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await callApi("POST", "/auth/replace-session", { token: replacement });
      await finishLogin();
    } catch (failure) { setReplacement(null); setGoogleAttempt((value) => value + 1); setError(failure.message); }
    finally { setBusy(false); }
  }
  async function cancelReplacement() {
    if (busy) return;
    setBusy(true);
    try { await callApi("POST", "/auth/cancel-login", { token: replacement }); setReplacement(null); setGoogleAttempt((value) => value + 1); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (locked) return;
    setError("");
    if (signup && form.password !== form.confirm) { setError("The passwords do not match."); return; }
    if (signup && !form.name.trim()) { setError("Please enter your name."); return; }
    setBusy(true);
    try {
      if (signup) {
        const result = await callApi("POST", "/auth/register", { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
        setRegistrationMessage(result.message);
        // Registration does not imply a session or an approved professional role.
        markSaved();
        setCreated(true);
      } else {
        const result = await callApi("POST", "/auth/login", { email: form.email.trim(), password: form.password });
        if (result.requiresSessionReplacement) requestReplacement(result);
        else await finishLogin();
      }
    } catch (failure) {
      setError(failure?.message || failure?.error || "Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }

  return <PlatformLayout>
    <div className="grid gap-12 lg:grid-cols-2 items-start">
      <div className="max-w-md"><p className="cc-eyebrow">{signup ? "YOUR NEXT CHAPTER STARTS HERE" : "WELCOME BACK"}</p><h1 className="font-serif text-4xl sm:text-5xl leading-tight mt-5">{signup ? "Good guidance starts with a connection." : "A familiar space. A fresh conversation."}</h1><p className="mt-6 leading-8">{signup ? "Create an account to consult a doctor, lawyer or counsellor, or apply to join as a professional." : "Sign in to access your account. Continue with Google or use your email and password."}</p><div className="flex gap-5 mt-8 text-sm"><Link to="/consult/doctors">Doctor consultations</Link><Link to="/consult/lawyers">Lawyer consultations</Link><Link to="/consult/counsellors">Counselling</Link></div></div>
      <section className="border rounded-2xl p-6 sm:p-9 max-w-lg w-full" style={{ borderColor: "var(--cc-border)", background: "var(--cc-background)" }}>
        <h2>{signup ? "Create your account" : "Log in to ConsultCare"}</h2>
        {sessionNotice && <p role="alert" className="my-4 text-sm">{sessionNotice}</p>}
        {created ? <div role="status"><p className="my-6">{registrationMessage} Professional accounts also require administrator approval.</p><Link className="cc-button" to={`/login${suffix}`}>Continue to login</Link><p className="mt-4"><Link className="underline" to="/verify-email">Request another verification email</Link></p></div> : <form onSubmit={submit} className="space-y-5 mt-7">
          {signup && <><label className="flex flex-col gap-2 text-sm font-semibold">I am joining as<select className="border rounded-lg p-3 bg-transparent" name="role" value={form.role} onChange={change} disabled={locked}>{[["user", "Patient / client"], ["doctor", "Doctor"], ["lawyer", "Lawyer"], ["counsellor", "Counsellor"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{form.role !== "user" && <p className="text-sm leading-6">Your professional credentials must be verified by an administrator before you can offer consultations.</p>}</>}
          <GoogleSignIn key={googleAttempt} onSessionConflict={requestReplacement} mode={signup ? "signup" : "login"} role={form.role} separator disabled={locked} onBusyChange={setBusy} onError={setError} onSuccess={(user) => { markSaved(); dispatch(setAuthUser(user)); navigate(getDestination(user, next), { replace: true }); }} />
          {signup && <Input label="Full name" name="name" value={form.name} onChange={change} autoComplete="name" maxLength={120} required disabled={locked} />}
          <Input label="Email address" type="email" name="email" value={form.email} onChange={change} autoComplete="email" required disabled={locked} />
          <Input label="Password" type="password" name="password" value={form.password} onChange={change} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 12 : undefined} required disabled={locked} />
          {signup && <Input label="Confirm password" type="password" name="confirm" value={form.confirm} onChange={change} autoComplete="new-password" required disabled={locked} />}
          {!signup && <p className="text-sm"><Link className="underline" to="/forgot-password">Forgot password?</Link><span className="mx-2">·</span><Link className="underline" to="/verify-email">Verify email</Link></p>}
          <Button type="submit" disabled={locked}>{busy ? "Please wait…" : signup ? "Create account" : "Log in"}</Button>
          <p className="text-sm">{signup ? "Already registered? " : "New to ConsultCare? "}<Link className="underline font-semibold" to={`${signup ? "/login" : "/signup"}${suffix}`}>{signup ? "Log in" : "Sign up"}</Link></p>
          {!signup && <p className="text-xs leading-5">Doctors, lawyers, counsellors, users, and administrators use this same secure login. Administrator accounts are provisioned privately.</p>}
        </form>}
      </section>
    </div>
    {replacement && <MessageOverlay type="confirm" title="Already signed in" text="You’re already signed in on another device. Sign out there and continue here?" confirmText="Sign out there & continue" cancelText="Cancel" isProcessing={busy} onClose={cancelReplacement} onConfirm={confirmReplacement} />}
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </PlatformLayout>;
}
