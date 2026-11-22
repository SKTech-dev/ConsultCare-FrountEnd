import { Link } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { useSelector } from "react-redux";
import googlePlayLogo from "../assets/google-play.png";
import "./footer.css";

const ANDROID_APP_URL =
  import.meta.env?.VITE_ANDROID_APP_URL ||
  "https://play.google.com/store/apps/details?id=lk.econsult.app";

export default function Footer() {
  const colors = useSelector((state) => state.theme.colors);
  return (
    <footer
      className="cc-footer"
      style={{ background: colors.footerBg, borderColor: colors.border }}
    >
      <div className="cc-footer-inner">
        <div className="cc-footer-grid">
          <div>
            <Link
              to="/"
              className="cc-footer-brand"
              style={{ color: colors.primary }}
            >
              <span
                className="cc-footer-brand-icon"
                style={{ background: colors.accent }}
              >
                <ShieldCheck size={18} />
              </span>
              ConsultCare
            </Link>
            <p className="cc-footer-tagline" style={{ color: colors.footerText }}>
              A secure place to find, book, and attend medical, legal, and
              counselling consultations online.
            </p>
          </div>

          <nav aria-label="Explore ConsultCare">
            <h3 className="cc-footer-heading" style={{ color: colors.primary }}>
              Explore
            </h3>
            <div className="cc-footer-links" style={{ color: colors.footerText }}>
              <a href="/#services">Our services</a>
              <a href="/#how-it-works">How it works</a>
              <a href="/#privacy">Our approach</a>
            </div>
          </nav>

          <nav aria-label="Legal and policies">
            <h3 className="cc-footer-heading" style={{ color: colors.primary }}>
              Policies
            </h3>
            <div className="cc-footer-links" style={{ color: colors.footerText }}>
              <Link to="/privacy-policy">Privacy policy</Link>
              <Link to="/refund-policy">Cancellation &amp; refund policy</Link>
              <Link to="/terms">Terms of use</Link>
            </div>
          </nav>

          <div>
            <h3 className="cc-footer-heading" style={{ color: colors.primary }}>
              Mobile App
            </h3>
            <p className="cc-footer-app-copy" style={{ color: colors.footerText }}>
              Manage bookings, join video consultations, and view records on the go.
            </p>
            <a
              href={ANDROID_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get ConsultCare for Android on Google Play"
              className="cc-footer-android-btn"
              style={{ borderColor: colors.border, color: colors.primary }}
            >
              <img
                src={googlePlayLogo}
                alt="Google Play"
                className="cc-footer-google-play-logo"
              />
            </a>
          </div>
        </div>

        <div
          className="cc-footer-bottom"
          style={{ color: colors.footerText, borderColor: colors.border }}
        >
          <span>
            © {new Date().getFullYear()} ConsultCare. All rights reserved. · Developed by{" "}
            <a
              href="https://sktech.lk/"
              target="_blank"
              rel="noopener noreferrer"
              className="cc-footer-credit"
              style={{ color: colors.primary }}
            >
              S.K. Tech
            </a>
          </span>
          <span className="cc-footer-trust" style={{ color: colors.primary }}>
            <Lock size={14} aria-hidden="true" />
            Private &amp; encrypted consultations
          </span>
        </div>
      </div>
    </footer>
  );
}
