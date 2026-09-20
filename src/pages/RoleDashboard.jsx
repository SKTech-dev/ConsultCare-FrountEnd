import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import PlatformLayout from "../components/PlatformLayout";
import Button from "../components/ui/Button";
import { logoutUser } from "../features/auth/authSlice";
import { getRole } from "../features/auth/roles";

const descriptions = {
  user: ["Your consultation space", "Choose the support you need to begin."],
  doctor: ["Doctor workspace", "Your professional profile, sessions, and patient queue will live here."],
  lawyer: ["Lawyer workspace", "Your professional profile, sessions, and client consultations will live here."],
  admin: ["Administration", "Professional verification and platform operations will live here."],
};

export default function RoleDashboard() {
  const { user } = useSelector((state) => state.auth);
  const role = getRole(user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const [title, description] = descriptions[role];
  return <PlatformLayout>
    <p className="cc-eyebrow">{role} account</p><h1 className="mt-4 text-4xl font-serif">{title}</h1><p className="mt-5">Welcome, {user.name || user.email}.</p><p className="mt-3">{description}</p>
    {role === "user" ? <div className="flex flex-wrap gap-4 mt-8"><Link className="cc-button" to="/consult/doctors">Consult a doctor</Link><Link className="cc-button" to="/consult/lawyers">Consult a lawyer</Link></div> : <p className="mt-8 rounded-lg border p-5">{role === "admin" ? "Admin tools will be connected in the next development stage." : user.verificationStatus === "verified" ? "Your professional account is verified. Session management is coming next." : "Your professional account requires administrator verification before you can offer consultations."}</p>}
    {error && <p role="alert" className="mt-5">{error}</p>}
    <div className="mt-12 max-w-xs"><Button disabled={busy} onClick={async () => { setBusy(true); const result = await dispatch(logoutUser()); if (logoutUser.rejected.match(result)) setError("Could not end the server session. Please retry."); setBusy(false); }}>{busy ? "Signing out…" : "Sign out"}</Button></div>
  </PlatformLayout>;
}
