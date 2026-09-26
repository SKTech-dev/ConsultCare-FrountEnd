import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useSelector } from "react-redux";

export default function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const heading = useId();
  const colors = useSelector((state) => state.theme.colors);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  function keys(event) {
    event.stopPropagation();
    if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const items = [...ref.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe')];
    if (!items.length) { event.preventDefault(); return; }
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
  }
  return <div className="cc-modal-backdrop" style={{ background: colors.overlay }}>
    <section ref={ref} className="cc-modal" role="dialog" aria-modal="true" aria-labelledby={heading} tabIndex={-1} onKeyDown={keys} style={{ background: colors.cardBg, color: colors.textPrimary }}>
      <header className="cc-modal-heading"><h2 id={heading}>{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={22} /></button></header>
      <div className="cc-modal-content">{children}</div>
    </section>
  </div>;
}
