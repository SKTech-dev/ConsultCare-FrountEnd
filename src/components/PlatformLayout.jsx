import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShieldCheck } from "lucide-react";
import Footer from "./Footer";
import "./landing.css";

export default function PlatformLayout({ children }) {
  const colors = useSelector((state) => state.theme.colors);
  return (
    <div className="cc-home min-h-screen" style={Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--cc-${key}`, value]))}>
      <header className="cc-container flex flex-wrap items-center justify-between gap-4 py-6 border-b" style={{ borderColor: colors.border }}>
        <Link to="/" className="cc-brand"><ShieldCheck className="mr-2" />consultcare.</Link>
        <Link to="/" className="cc-back-home">Back to home →</Link>
      </header>
      <main className="cc-container py-12 sm:py-20">{children}</main>
      <Footer />
    </div>
  );
}
