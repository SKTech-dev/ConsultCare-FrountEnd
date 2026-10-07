import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./Workspace";

export default function PatientRingtone() {
  const { role, bookings } = useWorkspace();
  const context = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(null);
  const call = role === "user" ? bookings.find((b) => b.status === "IN CONSULTATION" && b.ringAt) : null;
  const key = call ? `${call.id}:${call.ringAt}` : null;
  const expires = call ? Date.parse(call.ringAt) + 120000 : 0;
  function unlock() {
    if (role !== "user") return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context.current || context.current.state === "closed") {
        context.current = new Audio();
        context.current.onstatechange = () => setReady(context.current?.state === "running");
      }
      const audio = context.current;
      setReady(audio.state === "running");
      audio.resume().then(() => {
        if (context.current === audio) { setReady(audio.state === "running"); setBlocked(audio.state !== "running"); }
      }).catch(() => { if (context.current === audio) { setReady(false); setBlocked(true); } });
    } catch { setReady(false); setBlocked(true); }
  }
  useEffect(() => {
    if (role !== "user") return;
    // Prepare audio before a call arrives; browsers may still require a gesture.
    unlock();
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("pointerup", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("pointerup", unlock);
      document.removeEventListener("keydown", unlock);
      if (context.current) { context.current.onstatechange = null; context.current.close().catch(() => {}); }
      context.current = null;
    };
  }, [role]);
  useEffect(() => {
    if (!key || muted === key || Date.now() >= expires) return;
    const nodes = new Set();
    const pulse = () => {
      if (Date.now() >= expires) { clearInterval(timer); setBlocked(false); return; }
      const audio = context.current;
      if (!audio || audio.state !== "running") { setBlocked(true); return; }
      for (const offset of [0, 0.6]) {
        for (const frequency of [660, 880]) {
          const gain = audio.createGain();
          const tone = audio.createOscillator();
          tone.frequency.value = frequency;
          gain.gain.setValueAtTime(0, audio.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.16, audio.currentTime + offset + 0.02);
          gain.gain.setValueAtTime(0.16, audio.currentTime + offset + 0.4);
          gain.gain.linearRampToValueAtTime(0, audio.currentTime + offset + 0.5);
          tone.connect(gain); gain.connect(audio.destination);
          nodes.add(tone);
          tone.onended = () => { nodes.delete(tone); tone.disconnect(); gain.disconnect(); };
          tone.start(audio.currentTime + offset); tone.stop(audio.currentTime + offset + 0.52);
        }
      }
    };
    const timer = setInterval(pulse, 2500);
    pulse();
    return () => { clearInterval(timer); nodes.forEach((tone) => { try { tone.stop(); } catch { /* already ended */ } }); setBlocked(false); };
  }, [key, expires, muted, ready]);
  if (role !== "user") return null;
  if (!key || muted === key || Date.now() >= expires) return !ready && (window.AudioContext || window.webkitAudioContext) ? <div className="ws-notice" role="status">Enable call sounds to hear when your professional calls. <button type="button" className="ws-link secondary" onClick={unlock}>Enable ringtone</button></div> : null;
  return <div className="ws-notice" role="status">Your professional is calling you. {blocked && <button className="ws-link secondary" onClick={unlock}>Enable ringtone</button>} <button className="ws-name-link" onClick={() => setMuted(key)}>Silence ringtone</button></div>;
}
