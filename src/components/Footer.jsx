import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useSelector } from "react-redux";

export default function Footer() {
  const colors = useSelector((state) => state.theme.colors);
  return (
    <footer className="border-t px-5 py-10 sm:px-8 lg:px-10" style={{ background: colors.footerBg, borderColor: colors.border }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold" style={{ color: colors.primary }}><span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: colors.accent }}><ShieldCheck size={18} /></span>ConsultCare</Link>
          <p className="mt-3 text-sm leading-6" style={{ color: colors.footerText }}>A secure place to find, book, and attend professional consultations online.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold" style={{ color: colors.footerText }}><a href="/#services">Our services</a><a href="/#how-it-works">How it works</a><a href="/#privacy">Our approach</a></nav>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t pt-6 text-sm" style={{ color: colors.footerText, borderColor: colors.border }}>© {new Date().getFullYear()} ConsultCare. All rights reserved.</div>
    </footer>
  );
}
