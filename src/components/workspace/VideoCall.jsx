import { useEffect, useRef, useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { callApi } from "../../api/apiClient";

export default function VideoCall({ bookingId }) {
  const container = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!attempt) return;
    let cancelled = false;
    let frame;
    const controller = new AbortController();
    const fail = () => {
      if (!cancelled) {
        if (frame && !frame.isDestroyed()) frame.destroy().catch(() => {});
        setError("The video call could not connect. Check camera/microphone permissions and your connection, then retry. Chat is still available.");
        setState("error");
      }
    };
    async function connect() {
      setState("joining"); setError("");
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Video calls require HTTPS or localhost and a browser with camera support.");
        }
        const { data } = await callApi("POST", `/bookings/${bookingId}/video`, null, null, { signal: controller.signal, timeout: 35000 });
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
  }, [bookingId, attempt]);

  const busy = state === "joining";
  return <section className="room-video-panel" aria-label="Consultation video call">
    <div ref={container} className="daily-video-frame" hidden={!["joining", "joined"].includes(state)} />
    {!["joining", "joined"].includes(state) && <div className="ws-video"><Video size={48} /><h2 className="text-2xl font-serif">Your private video consultation</h2><p>{state === "left" ? "You left the video call. You can rejoin while the consultation is open." : "Join to speak with the other participant. Check your devices before entering."}</p></div>}
    <div className="ws-actions">
      {state !== "joined" && <button className="ws-link" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Video size={17} />}{busy ? "Connecting…" : state === "idle" ? "Join video call" : "Rejoin video call"}</button>}
      {busy && <button className="ws-link secondary" onClick={() => { setAttempt(0); setState("idle"); }}>Cancel</button>}
      <span role="status">{state === "joined" ? "Connected · use the call controls to manage your camera and microphone." : busy ? "Preparing your call and device preview…" : ""}</span>
    </div>
    {error && <p role="alert" className="ws-error">{error}</p>}
    <div className="ws-notice">Leaving video does not complete the consultation. Use consultation chat for messages saved to your record.</div>
  </section>;
}
