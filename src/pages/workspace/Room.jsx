import SectionTabs from "../../components/ui/SectionTabs";
import { Maximize, Minimize, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FileText, UploadCloud, ShieldCheck, MessageSquare, ImageOff, Loader2, RefreshCw } from "lucide-react";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, canRead } from "../../features/consultations/model";
import { fetchWorkspace, message, saveNotes, transition } from "../../features/consultations/consultationSlice";
import { saveFile, downloadFile } from "../../features/consultations/files";
import { PatientContext, ChatMessages, Prescription } from "./ConsultationRecord";
import { apiClient, callApi } from "../../api/apiClient";
import "./room.css";
import VideoCall from "../../components/workspace/VideoCall";
import Button from "../../components/ui/Button";
import DocumentPreview from "../../components/workspace/DocumentPreview";
import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";
import { MessageOverlay } from "../../components/ui/MessageBox";

function DocumentImage({ file, onPreview }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl;
    setState("loading"); setUrl("");
    apiClient.get("/documents/" + file.id, { responseType: "blob" }).then((response) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(response.data);
      setUrl(objectUrl); setState("ready");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, attempt]);
  if (state === "loading") return <span className="consultation-image-state" role="status" aria-label={`Loading preview for ${file.name}`}><Loader2 className="animate-spin" size={20} /><span>Loading preview</span></span>;
  if (state === "error") return <span className="consultation-image-state consultation-image-error" role="group" aria-label={`Preview unavailable for ${file.name}`}><ImageOff size={20} /><span>Preview unavailable</span><button type="button" className="ws-link secondary" onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={14} />Retry</button></span>;
  return <button type="button" aria-label={`Preview ${file.name}`} onClick={onPreview}><img className="consultation-image" src={url} alt={file.name} /></button>;
}

export function Documents({ booking }) {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [privateNote, setPrivateNote] = useState(false);
  const [preview, setPreview] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [privacyTarget, setPrivacyTarget] = useState(null);
  const [changingPrivacy, setChangingPrivacy] = useState(false);
  const inFlight = useRef(new Set());
  const busy = uploads.some((item) => item.status === "sending");
  useUnsavedChanges(uploads.some((item) => item.status !== "saved") ? "uploads" : "", uploads.some((item) => item.status !== "saved"));
  const files = [...booking.files, ...uploads.filter((item) => item.saved && !booking.files.some((file) => file.id === item.saved.id)).map((item) => item.saved)];
  useEffect(() => { if (preview && !files.some((file) => file.id === preview.id)) setPreview(null); }, [booking.files, preview]);
  if (!canRead(s, booking)) return null;
  async function sendUpload(item) {
    if (inFlight.current.has(item.id)) return;
    inFlight.current.add(item.id);
    setUploads((old) => old.map((entry) => entry.id === item.id ? { ...entry, status: "sending", error: "" } : entry));
    try {
      const saved = await saveFile(booking.id, item.file, item.private, item.id);
      setUploads((old) => old.map((entry) => entry.id === item.id ? { ...entry, status: "saved", saved, file: null } : entry));
      await dispatch(fetchWorkspace());
    } catch (failure) {
      setUploads((old) => old.map((entry) => entry.id === item.id ? { ...entry, status: "failed", error: failure.message || "Upload failed. Check your connection." } : entry));
    } finally { inFlight.current.delete(item.id); }
  }
  function upload(event) {
    const file = event.target.files[0]; event.target.value = "";
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a PDF, JPEG, PNG, or WebP file under 5 MB."); return; }
    const item = { id: crypto.randomUUID(), file, name: file.name, private: privateNote, status: "sending" };
    setUploads((old) => [...old, item]);
    sendUpload(item);
  }
  return <Panel title="Reports, images & documents">
    <p>Shared attachments are available to both participants. Private attachments are visible only to the professional who uploaded them.</p>
    {!files.length && !uploads.length && <div className="room-documents-empty"><FileText size={22} /><span>No attachments yet.</span></div>}
    {uploads.filter((item) => item.status !== "saved").map((item) => <div className="document-transfer" key={item.id} aria-live="polite"><FileText size={19} /><div><strong>{item.name}</strong><small>{item.status === "sending" ? "Uploading…" : "Upload not confirmed. Check the document list before retrying."}</small></div>{item.status === "sending" ? <Loader2 className="animate-spin" size={20} aria-label="Uploading" /> : <><span tabIndex={0} className="document-error" title={item.error} aria-label={item.error}><AlertTriangle size={20} /><span role="tooltip">{item.error}</span></span><button type="button" className="ws-link secondary" onClick={() => sendUpload(item)}>Retry</button><button type="button" className="ws-name-link" onClick={() => setUploads((old) => old.filter((entry) => entry.id !== item.id))}>Dismiss</button></>}</div>)}
    {files.map((file) => <div className="ws-row room-document-row" key={file.id}>{file.type.startsWith("image/") ? <DocumentImage file={file} onPreview={() => setPreview(file)} /> : <FileText size={18} />}<div className="flex-1 min-w-0"><h3 className="break-words"><button type="button" className="ws-name-link" onClick={() => setPreview(file)}>{file.name}</button></h3><p>{file.private ? "Private professional attachment" : "Shared attachment"} · {Math.round(file.size / 1024)} KB</p><small>Sent by {file.uploaderName || (file.uploaderId === booking.patientId ? booking.patientName : s.professionals.find((person) => person.id === file.uploaderId)?.name) || "Participant"}</small><div className="ws-actions"><button type="button" className="ws-link secondary" disabled={downloading !== null} onClick={async () => { setDownloading(file.id); try { await downloadFile(file.id, file.name); } catch (failure) { setError(failure.message); } finally { setDownloading(null); } }}>{downloading === file.id && <Loader2 className="animate-spin" size={15} />}Download</button>{s.role !== "user" && file.uploaderId === s.professionalId && booking.status === "IN CONSULTATION" && <button type="button" className="ws-name-link" onClick={() => setPrivacyTarget(file)}>{file.private ? "Share with patient" : "Make private"}</button>}</div></div></div>)}
    {s.role !== "user" && ACTIVE.includes(booking.status) && <label className="room-privacy"><input type="checkbox" checked={privateNote} disabled={busy} onChange={(event) => setPrivateNote(event.target.checked)} /><ShieldCheck size={20} /><span><strong>Keep this attachment private</strong><small>Visible only in your professional notes.</small></span></label>}
    {ACTIVE.includes(booking.status) && <label className="room-upload"><UploadCloud size={26} /><span>Add a report, image or document</span><small>PDF, JPEG, PNG or WebP · Up to 5 MB</small><input aria-label="Upload consultation document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={upload} /></label>}
    {preview && <DocumentPreview key={preview.id} file={preview} onClose={() => setPreview(null)} />}
    {privacyTarget && <MessageOverlay type="confirm" title={privacyTarget.private ? "Share this document?" : "Make this document private?"} text={privacyTarget.private ? "The patient will be able to view and download it." : "This removes future patient access. Copies already downloaded cannot be recalled."} isProcessing={changingPrivacy} onClose={() => setPrivacyTarget(null)} onConfirm={async () => {
      if (changingPrivacy) return;
      setChangingPrivacy(true);
      try { await callApi("PATCH", "/documents/" + privacyTarget.id + "/visibility", { private: !privacyTarget.private }); setPrivacyTarget(null); await dispatch(fetchWorkspace()); }
      catch (failure) { setError(failure.message); }
      finally { setChangingPrivacy(false); }
    }} />}
    {error && <MessageOverlay type="error" text={error} onClose={() => setError("")} />}
  </Panel>;
}

export default function Room() {
  const { id } = useParams();
  const s = useWorkspace();
  const booking = s.bookings.find((item) => item.id === id);
  if (!canRead(s, booking) || booking?.status !== "IN CONSULTATION") {
    return <Empty title="The consultation room is not open">The assigned professional must call this booking before either participant can enter.</Empty>;
  }
  // React reuses route elements when only a route parameter changes. Scope the
  // entire editor (including drafts, upload privacy and dirty-state tracking)
  // to one booking, and initialize it only after that booking is available.
  return <ConsultationRoom key={id} id={id} />;
}

function ConsultationRoom({ id }) {
  const s = useWorkspace();
  const b = s.bookings.find((x) => x.id === id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [chatError, setChatError] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState(b?.notes || "");
  const [privateNotes, setPrivateNotes] = useState(b?.privateNotes || "");
  const [followUp, setFollowUp] = useState(b?.followUp || "");
  const [notesRevision, setNotesRevision] = useState(b?.notesRevision ?? 0);
  const markNotesSaved = useUnsavedChanges({ notes, privateNotes, followUp }, s.role !== "user");
  const markChatSaved = useUnsavedChanges(text);
  const [completing, setCompleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const chat = useRef(null);
  const room = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === room.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (room.current?.requestFullscreen) await room.current.requestFullscreen();
      else setExpanded(!expanded);
    } catch { setExpanded(!expanded); }
  }
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [b?.messages.length]);
  const accessible = canRead(s, b) && b?.status === "IN CONSULTATION";
  async function storeNotes() {
    setSavingNotes(true);
    const action = await dispatch(saveNotes({ id, notes, privateNotes, followUp, revision: notesRevision, localPending: true }));
    setSavingNotes(false);
    if (action.error) setChatError(action.payload || "Could not save notes.");
    if (!action.error) { setNotesRevision(action.payload.revision); markNotesSaved(); }
    return action;
  }
  async function sendMessage(event) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setChatError("");
    const action = await dispatch(message({ id, text: text.trim(), localPending: true }));
    if (action.error) setChatError(action.payload || "Could not send your message. It is still here; try again.");
    else { markChatSaved(""); setText(""); }
    setSending(false);
  }
  if (!accessible) return <Empty title="The consultation room is not open">The assigned professional must call this booking before either participant can enter.</Empty>;
  const p = s.professionals.find((x) => x.id === b.professionalId);
  return <div ref={room} className={"consultation-room " + (expanded ? "room-expanded" : "")}>
    <PageHeading eyebrow="CONSULTATION ROOM" title={s.role === "user" ? p.name : b.patientName} action={<div className="ws-actions"><Status>IN CONSULTATION</Status><button type="button" className="ws-link secondary" onClick={toggleFullscreen}>{expanded ? <Minimize size={18} /> : <Maximize size={18} />}{expanded ? "Exit full screen" : "Full screen"}</button></div>}>Private consultation record · chat refreshes automatically.</PageHeading>
    <div className="room-workbench"><aside className="room-tools"><SectionTabs labels={["Chat", "Documents", ...(b.patientContext?.profession === "doctor" ? ["Prescription"] : []), ...(s.role !== "user" ? ["Notes"] : []), "Patient information"]}>
      <section className="ws-panel room-chat-panel"><div className="room-chat-heading"><MessageSquare size={20} /><h2>Consultation chat</h2><span>Saved to your record</span></div><div className="ws-chat" ref={chat} role="log" aria-live="polite" aria-relevant="additions text" aria-label="Consultation messages"><ChatMessages booking={b} />{sending && <div className="ws-message ws-message-own" role="status"><span>{text}</span><small><Loader2 size={14} className="animate-spin" />Sending…</small></div>}</div><form className="room-chat-form" onSubmit={sendMessage}><label className="ws-field">Message<textarea value={text} disabled={sending} onChange={(e) => { setText(e.target.value); setChatError(""); }} maxLength={2000} placeholder="Write a message…" /></label><div className="room-chat-send"><Button type="submit" disabled={!text.trim() || sending} aria-busy={sending}>{sending && <Loader2 size={16} className="animate-spin" />}{sending ? "Sending..." : "Send message"}</Button>{chatError && <p role="alert" className="ws-error">{chatError}</p>}</div></form></section>
    <div className="ws-space"><Documents booking={b} /></div>
    {b.patientContext?.profession === "doctor" && <div className="ws-space"><Prescription key={b.id} booking={b} /></div>}
    {s.role !== "user" && <div className="ws-space"><Panel title="Professional notes"><label className="ws-field">Notes shared with the patient / client<textarea value={notes} maxLength={5000} onChange={(e) => setNotes(e.target.value)} /></label><label className="ws-field">Private notes (professional workspace only)<textarea value={privateNotes} maxLength={5000} onChange={(e) => setPrivateNotes(e.target.value)} /></label><label className="ws-field">Follow-up recommendation<textarea value={followUp} maxLength={2000} onChange={(e) => setFollowUp(e.target.value)} /></label><div className="ws-actions room-note-actions"><button className="ws-link secondary" disabled={savingNotes} onClick={async () => { const action = await storeNotes(); if (!action.error) setFeedback("Notes saved."); }}>{savingNotes && <Loader2 size={16} className="animate-spin" />}Save notes</button><button className="ws-link" onClick={() => setConfirm(true)}>Complete consultation</button></div><p role="status" className="mt-3">{feedback}</p></Panel></div>}
    <PatientContext booking={b} /></SectionTabs></aside><VideoCall key={id} bookingId={id} /></div>
    {chatError && <MessageOverlay type="error" text={chatError} onClose={() => setChatError("")} />}
    {confirm && <MessageOverlay type="confirm" title="Complete this consultation?" text="Your notes will be saved, this record will move to history, and the next person in this session will be promoted." confirmText="Complete" isProcessing={completing} onClose={() => setConfirm(false)} onConfirm={async () => { if (completing) return; setCompleting(true); try { const saved = await storeNotes(); if (saved.error) { setConfirm(false); return; } const action = await dispatch(transition({ id, status: "COMPLETED", notesRevision: saved.payload.revision })); setConfirm(false); if (!action.error) navigate("/app/booking/" + id); } finally { setCompleting(false); } }} />}
  </div>;
}
