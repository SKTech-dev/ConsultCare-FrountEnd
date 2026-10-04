import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

export default function AccountMenu({ name, email, role, image, signOut }) {
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState(null);
  const root = useRef(null), trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="account-menu" ref={root}><button ref={trigger} type="button" className="ws-avatar account-trigger" aria-label="Your account" aria-expanded={open} aria-controls="account-popover" onClick={() => setOpen(!open)}>{image && failedImage !== image ? <img src={image} alt="" onError={() => setFailedImage(image)} /> : name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("")}</button>
    {open && <section className="account-popover" id="account-popover" aria-label="Your account"><strong>{name}</strong><p>{email}</p><span className="ws-status">{role === "user" ? "Patient / client" : role}</span>{role !== "admin" && <Link to="/app/profile?tab=details" onClick={() => setOpen(false)}><UserRound size={17} />My profile</Link>}<button type="button" onClick={() => { setOpen(false); signOut(); }}><LogOut size={17} />Sign out</button></section>}
  </div>;
}
