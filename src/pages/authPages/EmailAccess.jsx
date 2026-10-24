import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import PlatformLayout from "../../components/PlatformLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";
import "../../components/auth/email-access.css";

export default function EmailAccess({ mode }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    // The token stays out of query strings, referrers and subsequent browser history.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const verifying = mode === "verify";
  const resetting = mode === "reset" && Boolean(token);
  const consuming = (verifying || resetting) && Boolean(token);
  const title = verifying ? "Verify your email" : resetting ? "Choose a new password" : "Reset your password";
  const Icon = done ? CheckCircle2 : resetting ? KeyRound : Mail;
  const steps = verifying
    ? ["Request your verification link", "Confirm your email address", "Sign in and get started"]
    : ["Request a password reset link", "Choose a new password", "Sign back in to your account"];
  const currentStep = done ? (consuming ? 2 : 1) : consuming ? 1 : 0;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    if (resetting && password !== confirm) { setError("The passwords do not match."); return; }
    if (resetting && password !== password.trim()) { setError("Password must not start or end with whitespace."); return; }
    setBusy(true);
    try {
      const path = consuming ? (verifying ? "verify-email" : "reset-password") : (verifying ? "resend-verification" : "forgot-password");
      const body = consuming ? { token, ...(resetting ? { password } : {}) } : { email: email.trim() };
      const result = await callApi("POST", `/auth/${path}`, body);
      setMessage(result.message); setDone(true); setPassword(""); setConfirm("");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <PlatformLayout>
    <div className="email-access">
      <aside className="email-access-story" aria-label="Account access steps">
        <p className="cc-eyebrow"><span />YOUR CONSULTCARE ACCOUNT</p>
        <h2>{verifying ? <>A small step.<br /><em>A secure start.</em></> : <>Let’s get you<br /><em>back to your care.</em></>}</h2>
        <p className="email-access-intro">{verifying ? "Confirm your email so you can receive important updates and access your consultations with confidence." : "A forgotten password shouldn’t get in your way. We’ll help you return to your appointments and conversations."}</p>
        <ol className="email-access-steps">
          {steps.map((step, index) => <li key={step} className={index === currentStep ? "is-current" : index < currentStep ? "is-complete" : ""} aria-current={index === currentStep ? "step" : undefined}>
            <span className="email-step-number">{index < currentStep ? <Check size={15} aria-hidden="true" /> : `0${index + 1}`}</span><span>{step}</span>
          </li>)}
        </ol>
        <div className="email-access-assurance"><ShieldCheck size={22} aria-hidden="true" /><p>For your peace of mind<span>Only someone with access to your inbox can use your email link.</span></p></div>
      </aside>
      <section className="email-access-card" aria-labelledby="email-access-title" aria-busy={busy}>
        <div className={`email-access-icon${done ? " is-success" : ""}`}><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></div>
        <p className="email-access-kicker">{done ? consuming ? "ALL SET" : "NEXT, YOUR INBOX" : verifying ? "EMAIL VERIFICATION" : "ACCOUNT RECOVERY"}</p>
        <h1 id="email-access-title">{done ? consuming ? (verifying ? "Email verified." : "A fresh start.") : "Check your inbox." : title}</h1>
        {!done && <p className="email-access-description">{consuming && verifying ? "You’re one step away. Confirm your email address to finish setting up your account." : resetting ? "Choose a password you haven’t used before to keep your account secure." : verifying ? "Enter the email you registered with. We’ll send you a fresh verification link." : "Enter your account email and we’ll send you a link to choose a new password."}</p>}
        {!done && <form onSubmit={submit} className="email-access-form">
          {resetting ? <>
            <div className="email-password-field"><Input label="New password" type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-guidance" required disabled={busy} />
              <button type="button" className="email-password-toggle" aria-label={showPassword ? "Hide passwords" : "Show passwords"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} disabled={busy}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
            </div>
            <p id="password-guidance" className={`email-password-guidance${password.length >= 12 ? " is-valid" : ""}`}><Check size={14} aria-hidden="true" />Use at least 12 characters.</p>
            <Input label="Confirm password" type={showPassword ? "text" : "password"} name="confirm" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} required disabled={busy} />
          </> : !consuming && <Input label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} />}
          {consuming && verifying && <div className="email-access-note"><ShieldCheck size={19} aria-hidden="true" /><p>This link confirms your email address. You can sign in as soon as it’s verified.</p></div>}
          {error && <div className="email-access-error"><CircleAlert size={19} aria-hidden="true" /><p role="alert">{error}</p></div>}
          <Button type="submit" className="email-access-submit" disabled={busy}>{busy ? <><LoaderCircle size={18} className="email-access-spinner" aria-hidden="true" />Please wait…</> : <>{consuming ? (verifying ? "Verify email" : "Update password") : "Send email"}<ArrowRight size={18} aria-hidden="true" /></>}</Button>
          {!consuming && <p className="email-access-expiry">Your link will be valid for {verifying ? "60" : "30"} minutes.</p>}
          {consuming && error && <Link className="email-access-text-link" to={verifying ? "/verify-email" : "/forgot-password"} reloadDocument>Request a new link</Link>}
        </form>}
        {done && <div className="email-access-result">
          <p role="status" className="email-access-description">{message}</p>
          {!consuming && <>
            <div className="email-access-note"><Mail size={19} aria-hidden="true" /><p>Look for an email from ConsultCare.<span>Check your spam folder too. Delivery may take a few minutes.</span></p></div>
            <p className="email-access-recipient">Email entered <strong>{email}</strong></p>
            <button type="button" className="email-access-text-link" onClick={() => { setDone(false); setMessage(""); }}>Use a different email address</button>
          </>}
          {consuming && <Link className="cc-button email-access-submit" to="/login">Continue to sign in<ArrowRight size={18} aria-hidden="true" /></Link>}
        </div>}
        {!(done && consuming) && <div className="email-access-footer"><Link to="/login"><ArrowLeft size={16} aria-hidden="true" />Back to sign in</Link></div>}
      </section>
    </div>
  </PlatformLayout>;
}
