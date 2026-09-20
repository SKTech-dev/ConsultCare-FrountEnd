import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShieldCheck } from "lucide-react";
import Footer from "./Footer";
import { getHome } from "../features/auth/roles";
import "./landing.css";

export default function PlatformLayout({ children }) {
  const colors = useSelector((state) => state.theme.colors);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  return (
    <div className="cc-home min-h-screen" style={Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--cc-${key}`, value]))}>
      <header className="cc-container flex flex-wrap items-center justify-between gap-4 py-6 border-b" style={{ borderColor: colors.border }}>
        <Link to="/" className="cc-brand"><ShieldCheck className="mr-2" />consultcare.</Link>
        <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-5 text-sm">
          <Link to="/consult/doctors">Doctors</Link><Link to="/consult/lawyers">Lawyers</Link>
          {isAuthenticated ? <Link to={getHome(user)}>My dashboard</Link> : <><Link to="/login">Log in</Link><Link className="cc-button" to="/signup">Sign up</Link></>}
        </nav>
      </header>
      <main className="cc-container py-12 sm:py-20">{children}</main>
      <Footer />
    </div>
  );
}
