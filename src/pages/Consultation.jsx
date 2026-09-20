import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { HeartPulse, Scale, ArrowRight } from "lucide-react";
import PlatformLayout from "../components/PlatformLayout";
import { getHome } from "../features/auth/roles";

export default function Consultation({ profession }) {
  const medical = profession === "doctor";
  const Icon = medical ? HeartPulse : Scale;
  const path = medical ? "/consult/doctors" : "/consult/lawyers";
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  return (
    <PlatformLayout>
      <p className="cc-eyebrow">{medical ? "FOR YOUR HEALTH" : "FOR YOUR PEACE OF MIND"}</p>
      <div className="grid gap-10 md:grid-cols-2 mt-6">
        <div><Icon size={40} className="mb-6" /><h1 className="text-4xl sm:text-5xl font-serif leading-tight">Consult a {profession}.<br />Take your next step.</h1>
          <p className="mt-6 leading-8 max-w-lg">{medical ? "Find support for health concerns, follow-up care, and questions about your reports." : "Discuss personal matters, business questions, and documents with a legal professional."}</p>
          <div className="flex flex-wrap gap-4 mt-8">
            {isAuthenticated ? <Link className="cc-button" to={getHome(user)}>Go to my dashboard <ArrowRight size={18} /></Link> : <><Link className="cc-button" to={`/signup?next=${encodeURIComponent(path)}`}>Create an account <ArrowRight size={18} /></Link><Link className="cc-text-link" to={`/login?next=${encodeURIComponent(path)}`}>Already registered? Log in</Link></>}
          </div>
        </div>
        <aside className="rounded-xl p-8" style={{ background: "var(--cc-background)" }}><h2>Prepare for your consultation</h2><ol className="list-decimal pl-5 space-y-5 mt-6 text-sm leading-7"><li>Write down the questions you want to discuss.</li><li>Gather relevant {medical ? "reports and medication details" : "documents and key dates"}.</li><li>Choose a quiet space for a private conversation.</li></ol><p className="mt-8 border-t pt-5 text-sm leading-6" style={{ borderColor: "var(--cc-border)", color: "var(--cc-textSecondary)" }}>Professional search, availability, and booking will be connected in the next development stage. No appointments are being booked on this page yet.</p></aside>
      </div>
    </PlatformLayout>
  );
}
