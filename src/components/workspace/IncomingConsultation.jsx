import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { callApi } from "../../api/apiClient";
import { clearAuthUser, setAuthUser } from "../../features/auth/authSlice";
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
    function replaced() {
      stopped = true;
      clearTimeout(reconnect); clearInterval(fallback);
      socket?.close();
      dispatch(clearAuthUser("You were signed out because your account was signed in on another device."));
    }
    async function checkSession(reconnectAfter = false) {
      if (stopped) return;
      try {
        const result = await callApi("GET", "/auth/me");
        if (stopped) return;
        if (result.data?.id !== user.id) dispatch(setAuthUser(result.data));
        else if (reconnectAfter) reconnect = setTimeout(connect, 0);
      } catch { if (!stopped && reconnectAfter) reconnect = setTimeout(connect, 1000); }
    }
    const onFocus = () => { if (!document.hidden) checkSession(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    function connect() {
      const url = new URL((import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "") + "/workspace/live", window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(url);
      socket.onopen = () => { attempt = 0; clearInterval(fallback); dispatch(liveStatus(true)); };
      socket.onmessage = (event) => {
        if (stopped) return;
        try { const data = JSON.parse(event.data); if (data.role) dispatch(receiveWorkspace(data)); else if (data.type === "heartbeat") dispatch(liveTick()); else if (data.type === "session-ended" && data.reason === "replaced") replaced(); } catch { /* Invalid transport message. */ }
      };
      socket.onclose = (event) => {
        dispatch(liveStatus(false));
        if (stopped) return;
        if (event.code === 4409) { replaced(); return; }
        if (event.code === 4401) { checkSession(true); return; }
        clearInterval(fallback);
        fallback = setInterval(() => dispatch(fetchWorkspace({ live: true })), 10000);
        reconnect = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
    }
    connect();
    return () => { stopped = true; clearTimeout(reconnect); clearInterval(fallback); socket?.close(); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [user?.id, dispatch]);
  useEffect(() => {
    if (user?.role !== "user") return;
    const callKey = (item) => `${item.id}:${item.ringAt || "initial"}`;
    const booking = bookings.find((item) => item.patientId === user.id && item.status === "IN CONSULTATION" && !handled.current.has(callKey(item)) && (item.ringAt || !item.patientJoinedAt));
    if (booking) { handled.current.add(callKey(booking)); navigate("/app/room/" + booking.id); }
  }, [bookings, user?.id, user?.role, navigate]);
  return null;
}
