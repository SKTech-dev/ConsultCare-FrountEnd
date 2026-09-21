import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Video, Mic, MicOff, VideoOff, FileText, UploadCloud, ShieldCheck, MessageSquare } from "lucide-react";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, canRead } from "../../features/consultations/model";
import { fetchWorkspace, message, saveNotes, transition } from "../../features/consultations/consultationSlice";
import { saveFile, downloadFile } from "../../features/consultations/files";
import { PatientContext, ChatMessages, Prescription } from "./ConsultationRecord";
import { apiClient } from "../../api/apiClient";
import "./room.css";
import Button from "../../components/ui/Button";
import { MessageOverlay } from "../../components/ui/MessageBox";

function DocumentImage({ file }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl;
    apiClient.get("/documents/" + file.id, { responseType: "blob" }).then((response) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(response.data);
      setUrl(objectUrl);
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img className="consultation-image" src={url} alt={file.name} /></a> : <FileText size={18} />;
}

export function Documents({ booking }) {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [privateNote, setPrivateNote] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [notice, setNotice] = useState("");
  if (!canRead(s, booking)) return null;
  async function upload(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a PDF, JPEG, PNG, or WebP file under 5 MB."); return; }
    setError(""); setNotice(""); setBusy(true);
    try {
      await saveFile(booking.id, file, privateNote);
      const refresh = await dispatch(fetchWorkspace());
      setNotice(refresh.error ? "Document saved, but the list could not refresh. Reload to see it; do not upload it again." : "Document uploaded successfully.");
    } catch (failure) { setError(failure.message || "Could not upload the document. Please try again."); }
    finally { setBusy(false); }
  }
  return <Panel title="Reports, images & documents">
    <p>Shared attachments are available to both participants. Private attachments are visible only to the professional.</p>
    {!booking.files.length && <div className="room-documents-empty"><FileText size={22} /><span>No attachments yet. Reports and note images will appear here.</span></div>}
    {booking.files.map((file) => <div className="ws-row" key={file.id}>{file.type.startsWith("image/") ? <DocumentImage file={file} /> : <FileText size={18} />}<div className="flex-1 min-w-0"><h3 className="break-words">{file.name}</h3><p>{file.private ? "Private note attachment" : file.kind} · {Math.round(file.size / 1024)} KB</p></div><button className="ws-link secondary" disabled={downloading !== null} aria-busy={downloading === file.id} onClick={async () => { setDownloading(file.id); setError(""); try { await downloadFile(file.id, file.name); } catch (e) { setError(e.message); } finally { setDownloading(null); } }}>{downloading === file.id ? "Downloading..." : "Download"}</button></div>)}
    {s.role !== "user" && ACTIVE.includes(booking.status) && <label className="room-privacy"><input type="checkbox" checked={privateNote} disabled={busy} onChange={(event) => setPrivateNote(event.target.checked)} /><ShieldCheck size={20} /><span><strong>Keep this attachment private</strong><small>Visible only to you in your professional notes.</small></span></label>}
    {ACTIVE.includes(booking.status) && <label className="room-upload"><UploadCloud size={26} /><span>{busy ? "Saving document…" : "Add a report, image or document"}</span><small>PDF, JPEG, PNG or WebP · Up to 5 MB</small><input aria-label="Upload consultation document" type="file" disabled={busy} accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={upload} className="block mt-3 text-xs w-full" /></label>}
    {notice && <MessageOverlay type="success" text={notice} onClose={() => setNotice("")} />}
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </Panel>;
}

export default function Room() {
  const { id } = useParams();
  const s = useWorkspace();
  const b = s.bookings.find((x) => x.id === id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState(b?.notes || "");
  const [privateNotes, setPrivateNotes] = useState(b?.privateNotes || "");
  const [followUp, setFollowUp] = useState(b?.followUp || "");
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(true);
  const [starting, setStarting] = useState(false);
  const video = useRef(null);
  const stream = useRef(null);
  const mounted = useRef(true);
  const chat = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stream.current?.getTracks().forEach((t) => t.stop()); }; }, []);
  useEffect(() => { if (video.current) video.current.srcObject = stream.current; }, [camera]);
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [b?.messages.length]);
  const accessible = canRead(s, b) && b?.status === "IN CONSULTATION";
  useEffect(() => { if (!accessible) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCamera(false); } }, [accessible]);
  async function startCamera() {
    setMediaError(""); setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera preview needs localhost or HTTPS and browser media support.");
      const result = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mounted.current) { result.getTracks().forEach((t) => t.stop()); return; }
      stream.current = result; setCamera(true); setMic(true);
    } catch (error) { if (mounted.current) setMediaError(error.name === "NotAllowedError" ? "Camera or microphone permission was denied. You can continue with chat." : error.message); }
    finally { if (mounted.current) setStarting(false); }
  }
  function storeNotes() { return dispatch(saveNotes({ id, notes, privateNotes, followUp })); }
  if (!accessible) return <Empty title="The consultation room is not open">The assigned professional must call this booking before either participant can enter.</Empty>;
  const p = s.professionals.find((x) => x.id === b.professionalId);
  return <div className="consultation-room">
    <PageHeading eyebrow="CONSULTATION ROOM" title={s.role === "user" ? p.name : b.patientName} action={<Status>IN CONSULTATION</Status>}>Private consultation record · chat refreshes automatically.</PageHeading>
    <div className="ws-space mb-6"><PatientContext booking={b} /></div>
    <div className="ws-room-grid"><div className="room-video-panel"><div className="ws-video">{camera ? <video ref={video} autoPlay muted playsInline aria-label="Your local camera preview" /> : <><Video size={48} strokeWidth={1} /><h2 className="text-2xl font-serif">A space for your conversation.</h2><p>Camera is off. Enable it to preview your device.</p></>}</div><div className="ws-actions"><button className="ws-link" disabled={starting} onClick={camera ? () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCamera(false); } : startCamera}>{camera ? <VideoOff size={17} /> : <Video size={17} />}{starting ? "Opening devices…" : camera ? "Stop preview" : "Preview camera & microphone"}</button><button className="ws-link secondary" disabled={!camera} onClick={() => { stream.current?.getAudioTracks().forEach((t) => { t.enabled = !mic; }); setMic(!mic); }}>{mic ? <Mic size={17} /> : <MicOff size={17} />}{mic ? "Mute" : "Unmute"}</button></div>{mediaError && <p role="alert" className="ws-error">{mediaError}</p>}<div className="ws-notice">This is a local device preview, not a remote video call. Remote video calling is not yet connected. Chat is saved to your consultation.</div></div>
      <section className="ws-panel room-chat-panel"><div className="room-chat-heading"><MessageSquare size={20} /><h2>Consultation chat</h2><span>Saved to your record</span></div><div className="ws-chat" ref={chat} role="log" aria-label="Consultation messages"><ChatMessages booking={b} /></div><form onSubmit={async (e) => { e.preventDefault(); const action = await dispatch(message({ id, text })); if (!action.error) setText(""); }}><label className="ws-field">Message<textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Write a message…" /></label><Button type="submit" disabled={!text.trim()}>Send message</Button></form></section>
    </div>
    <div className="ws-space"><Documents booking={b} /></div>
    <div className="ws-space"><Prescription key={b.id} booking={b} /></div>
    {s.role !== "user" && <div className="ws-space"><Panel title="Professional notes"><label className="ws-field">Notes shared with the patient / client<textarea value={notes} maxLength={5000} onChange={(e) => setNotes(e.target.value)} /></label><label className="ws-field">Private notes (professional workspace only)<textarea value={privateNotes} maxLength={5000} onChange={(e) => setPrivateNotes(e.target.value)} /></label><label className="ws-field">Follow-up recommendation<textarea value={followUp} maxLength={2000} onChange={(e) => setFollowUp(e.target.value)} /></label><div className="ws-actions room-note-actions"><button className="ws-link secondary" onClick={async () => { const action = await storeNotes(); if (!action.error) setFeedback("Notes saved."); }}>Save notes</button><button className="ws-link" onClick={() => setConfirm(true)}>Complete consultation</button></div><p role="status" className="mt-3">{feedback}</p></Panel></div>}
    {confirm && <MessageOverlay type="confirm" title="Complete this consultation?" text="Your notes will be saved, this record will move to history, and the next person in this session will be promoted." confirmText="Complete" onClose={() => setConfirm(false)} onConfirm={async () => { const saved = await storeNotes(); if (saved.error) return; const action = await dispatch(transition({ id, status: "COMPLETED" })); if (!action.error) navigate("/app/booking/" + id); }} />}
  </div>;
}
