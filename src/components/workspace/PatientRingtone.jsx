import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./Workspace";

export default function PatientRingtone() {
  const { role, bookings } = useWorkspace();
  const context = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(null);
  const call = role === "user" ? bookings.find((b) => b.status === "IN CONSULTATION" && b.ringAt) : null;
  const key = call ? `${call.id}:${call.ringAt}` : null;
  const expires = call ? Date.parse(call.ringAt) + 120000 : 0;
  function unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    context.current ||= new Audio();
    context.current.resume().then(() => setBlocked(false)).catch(() => setBlocked(true));
  }
  useEffect(() => {
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      context.current?.close().catch(() => {});
      context.current = null;
    };
  }, []);
  useEffect(() => {
    if (!key || muted === key || Date.now() >= expires) return;
    const nodes = new Set();
    const pulse = () => {
      if (Date.now() >= expires) { clearInterval(timer); setBlocked(false); return; }
      const audio = context.current;
      if (!audio || audio.state !== "running") { setBlocked(true); return; }
      for (const offset of [0, 0.45]) {
        const gain = audio.createGain();
        const tone = audio.createOscillator();
        tone.frequency.value = 660;
        gain.gain.setValueAtTime(0, audio.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.12, audio.currentTime + offset + 0.02);
        gain.gain.linearRampToValueAtTime(0, audio.currentTime + offset + 0.3);
        tone.connect(gain); gain.connect(audio.destination);
        nodes.add(tone);
        tone.onended = () => { nodes.delete(tone); tone.disconnect(); gain.disconnect(); };
        tone.start(audio.currentTime + offset); tone.stop(audio.currentTime + offset + 0.32);
      }
    };
    const timer = setInterval(pulse, 2500);
    pulse();
    return () => { clearInterval(timer); nodes.forEach((tone) => { try { tone.stop(); } catch { /* already ended */ } }); setBlocked(false); };
  }, [key, expires, muted]);
  if (!key || muted === key || Date.now() >= expires) return null;
  return <div className="ws-notice" role="status">Your professional is calling you. {blocked && <button className="ws-link secondary" onClick={unlock}>Enable ringtone</button>} <button className="ws-name-link" onClick={() => setMuted(key)}>Silence ringtone</button></div>;
}
