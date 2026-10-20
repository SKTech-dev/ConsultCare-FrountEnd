import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PlatformLayout from "../../components/PlatformLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";

export default function EmailAccess({ mode }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    // The token stays out of query strings, referrers and subsequent browser history.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const verifying = mode === "verify";
  const resetting = mode === "reset" && Boolean(token);
  const consuming = (verifying || resetting) && Boolean(token);
  const title = verifying ? "Verify your email" : resetting ? "Choose a new password" : "Reset your password";

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

  return <PlatformLayout><section className="border rounded-2xl p-6 sm:p-9 max-w-lg mx-auto" style={{ borderColor: "var(--cc-border)" }}>
    <p className="cc-eyebrow">YOUR CONSULTCARE ACCOUNT</p><h1 className="font-serif text-3xl mt-4">{title}</h1>
    {!done && <form onSubmit={submit} className="space-y-5 mt-6">
      {consuming && verifying ? <p>Confirm this email address to finish setting up your account.</p> : resetting ? <>
        <Input label="New password" type="password" name="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
        <Input label="Confirm password" type="password" name="confirm" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} required disabled={busy} />
      </> : <><p>{verifying ? "Enter your account email to request a new verification link." : "Enter your account email and we will send a password reset link."}</p>
        <Input label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} />
      </>}
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : consuming ? (verifying ? "Verify email" : "Update password") : "Send email"}</Button>
    </form>}
    {message && <p role="status" className="my-5">{message}</p>}
    {error && <p role="alert" className="my-5">{error}</p>}
    {consuming && error && <p className="my-4"><Link className="underline" to={verifying ? "/verify-email" : "/forgot-password"} reloadDocument>Request a new link</Link></p>}
    <p className="mt-6"><Link className="underline" to="/login">Back to sign in</Link></p>
  </section></PlatformLayout>;
}
