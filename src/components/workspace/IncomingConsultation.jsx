import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchWorkspace, receiveWorkspace, liveStatus, liveTick } from "../../features/consultations/consultationSlice";

export default function IncomingConsultation() {
  const user = useSelector((state) => state.auth.user);
  const bookings = useSelector((state) => state.consultations.bookings);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handled = useRef(new Set());
  useEffect(() => {
    handled.current.clear();
    if (!user) return;
    let stopped = false, socket, reconnect, fallback, attempt = 0;
    function connect() {
      const url = new URL((import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "") + "/workspace/live", window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(url);
      socket.onopen = () => { attempt = 0; clearInterval(fallback); dispatch(liveStatus(true)); };
      socket.onmessage = (event) => {
        if (stopped) return;
        try { const data = JSON.parse(event.data); if (data.role) dispatch(receiveWorkspace(data)); else if (data.type === "heartbeat") dispatch(liveTick()); } catch { /* Invalid transport message. */ }
      };
      socket.onclose = () => {
        dispatch(liveStatus(false));
        if (stopped) return;
        clearInterval(fallback);
        fallback = setInterval(() => dispatch(fetchWorkspace()), 10000);
        reconnect = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
    }
    connect();
    return () => { stopped = true; clearTimeout(reconnect); clearInterval(fallback); socket?.close(); };
  }, [user?.id, dispatch]);
  useEffect(() => {
    if (user?.role !== "user") return;
    const booking = bookings.find((item) => item.patientId === user.id && item.status === "IN CONSULTATION" && !handled.current.has(item.id));
    if (booking) { handled.current.add(booking.id); navigate("/app/room/" + booking.id); }
  }, [bookings, user?.id, user?.role, navigate]);
  return null;
}
