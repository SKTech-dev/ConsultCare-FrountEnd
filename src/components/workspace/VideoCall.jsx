import { useEffect, useRef, useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { MessageOverlay } from "../ui/MessageBox";
import { callApi } from "../../api/apiClient";

export default function VideoCall({ bookingId, clinicId }) {
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
  return <section className="room-video-panel" aria-label="Consultation video call">
    <div ref={container} className="daily-video-frame" hidden={!["joining", "joined"].includes(state)} />
    {!["joining", "joined"].includes(state) && <div className="ws-video"><Video size={48} /><h2 className="text-2xl font-serif">{clinicId ? "Your group clinic lecture" : "Your private video consultation"}</h2><p>{state === "left" ? "You left the video call. You can rejoin while the session is open." : clinicId ? "The professional presents; paid attendees watch and listen. Attendee cameras and microphones are disabled." : "Join to speak with the other participant. Check your devices before entering."}</p></div>}
    <div className="ws-actions">
      {state !== "joined" && <button className="ws-link" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Video size={17} />}{busy ? "Connecting…" : state === "idle" ? "Join video call" : "Rejoin video call"}</button>}
      {busy && <button className="ws-link secondary" onClick={() => { setAttempt(0); setState("idle"); }}>Cancel</button>}
      <span role="status">{state === "joined" ? "Connected · use the call controls to manage your camera and microphone." : busy ? "Preparing your call and device preview…" : ""}</span>
    </div>
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
    <div className="ws-notice">{clinicId ? "Leaving video does not complete the clinic. The professional can close it for everyone; the room also closes at the scheduled end time." : "Leaving video does not complete the consultation. Use consultation chat for messages saved to your record."}</div>
  </section>;
}
