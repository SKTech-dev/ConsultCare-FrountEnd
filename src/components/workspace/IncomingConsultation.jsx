import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { callApi } from "../../api/apiClient";

export default function IncomingConsultation() {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const handled = useRef(new Set());
  useEffect(() => {
    handled.current.clear();
    if (user?.role !== "user") return;
    let disposed = false;
    let running = false;
    async function check() {
      if (running || disposed) return;
      running = true;
      try {
        const response = await callApi("GET", "/workspace");
        if (disposed) return;
        const booking = response.data.bookings.find((item) => item.patientId === user.id && item.status === "IN CONSULTATION" && !handled.current.has(item.id));
        if (booking) {
          handled.current.add(booking.id);
          navigate("/app/room/" + booking.id);
        }
      } catch { /* Authentication and connectivity feedback is handled by the workspace. */ }
      finally { running = false; }
    }
    check();
    const timer = setInterval(check, 5000);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [user?.id, user?.role, navigate]);
  return null;
}
