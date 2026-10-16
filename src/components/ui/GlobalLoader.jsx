import { Loader2 } from "lucide-react";
import { useSelector } from "react-redux";

export default function GlobalLoader({ fullPage = false, compact = false, message = "Loading...", className = "", label }) {
  const colors = useSelector((state) => state.theme.colors);
  const mode = fullPage ? "cc-loader-full" : compact ? "cc-loader-compact" : "cc-loader-section";
  return <div role="status" aria-label={label} aria-live="polite" aria-busy="true"
    className={"cc-loader " + mode + " " + className}
    style={{ color: colors.primary, backgroundColor: fullPage ? colors.overlay : "transparent" }}>
    <Loader2 size={compact ? 20 : 32} strokeWidth={2.5} className="animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
    {message && <span style={{ color: colors.textPrimary }}>{message}</span>}
  </div>;
}
