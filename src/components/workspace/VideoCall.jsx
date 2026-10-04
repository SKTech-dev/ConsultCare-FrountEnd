import { useEffect, useRef, useState } from "react";
import { Video, Loader2, Maximize, Minimize } from "lucide-react";
import { MessageOverlay } from "../ui/MessageBox";
import { callApi } from "../../api/apiClient";

export default function VideoCall({ bookingId, clinicId }) {
  const container = useRef(null);
  const panel = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === panel.current);
    const escape = (event) => { if (event.key === "Escape") setFallbackFullscreen(false); };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("fullscreenchange", sync); document.removeEventListener("keydown", escape); };
  }, []);
  async function toggleVideoFullscreen() {
    if (fallbackFullscreen) { setFallbackFullscreen(false); return; }
    try {
      if (document.fullscreenElement === panel.current) await document.exitFullscreen();
      else if (panel.current?.requestFullscreen) await panel.current.requestFullscreen();
      else setFallbackFullscreen(true);
    } catch { setFallbackFullscreen(true); }
  }

  useEffect(() => {
    if (!attempt) return;
    let cancelled = false;
    let frame;
    const controller = new AbortController();
    const fail = () => {
      if (!cancelled) {
        if (frame && !frame.isDestroyed()) frame.destroy().catch(() => {});
        setError("The video call could not connect. Check your browser permissions and connection, then retry.");
        setState("error");
      }
    };
    async function connect() {
      setState("joining"); setError("");
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Video calls require HTTPS or localhost and a browser with camera support.");
        }
        const endpoint = clinicId ? `/clinics/${clinicId}/video` : `/bookings/${bookingId}/video`;
        const { data } = await callApi("POST", endpoint, null, null, { signal: controller.signal, timeout: 35000 });
        const { default: Daily } = await import("@daily-co/daily-js");
        if (cancelled) return;
        frame = Daily.createFrame(container.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
        });
        frame.on("joined-meeting", () => { if (!cancelled) setState("joined"); });
        frame.on("left-meeting", () => { if (!cancelled) { setState("left"); frame.destroy().catch(() => {}); } });
        frame.on("error", fail);
        await frame.join({ url: data.url, token: data.token });
      } catch (failure) {
        if (frame && !frame.isDestroyed()) await frame.destroy().catch(() => {});
        if (!cancelled) { setError(failure.message || "Could not join the video call."); setState("error"); }
      }
    }
    connect();
    return () => {
      cancelled = true;
      controller.abort();
      if (frame && !frame.isDestroyed()) frame.destroy().catch(() => {});
    };
  }, [bookingId, clinicId, attempt]);

  const busy = state === "joining";
  return <section ref={panel} className={"room-video-panel " + (fallbackFullscreen ? "video-expanded" : "")} aria-label="Consultation video call">
    <header className="room-video-heading"><div><Video size={18} aria-hidden="true" /><h2>{clinicId ? "Group clinic video" : "Video consultation"}</h2></div><div className="room-video-heading-actions"><span className={"room-connection-status " + (state === "joined" ? "connected" : "")}><span aria-hidden="true" />{state === "joined" ? "Connected" : busy ? "Connecting" : "Ready to join"}</span><button type="button" className="room-video-expand" aria-label={fullscreen || fallbackFullscreen ? "Exit video full screen" : "Video full screen"} title={fullscreen || fallbackFullscreen ? "Exit video full screen" : "Video full screen"} onClick={toggleVideoFullscreen}>{fullscreen || fallbackFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}<span>{fullscreen || fallbackFullscreen ? "Exit full screen" : "Full screen"}</span></button></div></header>
    <div className="room-video-stage"><div ref={container} className="daily-video-frame" hidden={!["joining", "joined"].includes(state)} />
    {!["joining", "joined"].includes(state) && <div className="ws-video"><Video size={48} /><h2>{clinicId ? "Your group clinic lecture" : "Your private video consultation"}</h2><p>{state === "left" ? "You left the video call. You can rejoin while the session is open." : clinicId ? "Join the group clinic. Your microphone starts muted and you can turn it on to speak. Attendee cameras and chat are disabled." : "Join to speak with the other participant. Check your devices before entering."}</p></div>}</div>
    <div className="ws-actions room-video-controls">
      {state !== "joined" && <button className="ws-link" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Video size={17} />}{busy ? "Connecting…" : state === "idle" ? "Join video call" : "Rejoin video call"}</button>}
      {busy && <button className="ws-link secondary" onClick={() => { setAttempt(0); setState("idle"); }}>Cancel</button>}
      <span role="status">{state === "joined" ? "Connected · use the call controls to manage your camera and microphone." : busy ? "Preparing your call and device preview…" : ""}</span>
    </div>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    <p className="room-video-help">{clinicId ? "Leaving video does not complete the clinic. The professional closes it for everyone; the room also closes at its scheduled end." : "Camera and microphone controls appear inside the call. Leaving video keeps this consultation open."}</p>
  </section>;
}
