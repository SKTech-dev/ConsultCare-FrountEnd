import SectionTabs from "../../components/ui/SectionTabs";
import { Maximize, Minimize, AlertTriangle, Save, CheckCheck, ArrowRight, Send, ClipboardList, UserRound, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FileText, UploadCloud, ShieldCheck, MessageSquare, ImageOff, Loader2, RefreshCw } from "lucide-react";
import { useWorkspace, PageHeading, Panel, Empty, Status } from "../../components/workspace/Workspace";
import { ACTIVE, canRead, isSessionLive } from "../../features/consultations/model";
import { fetchWorkspace, message, saveNotes, transition } from "../../features/consultations/consultationSlice";
import { saveFile, downloadFile } from "../../features/consultations/files";
import { PatientContext, ChatMessages, Prescription } from "./ConsultationRecord";
import { apiClient, callApi } from "../../api/apiClient";
import "./room.css";
import VideoCall from "../../components/workspace/VideoCall";
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
  return <BookingDocuments key={booking.id} booking={booking} />;
}

function BookingDocuments({ booking }) {
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
  const [finishing, setFinishing] = useState(false);
  useEffect(() => { setFinishing(false); }, [id]);
  if (!canRead(s, booking) || (booking?.status !== "IN CONSULTATION" && !finishing)) {
    return <Empty title="The consultation room is not open">The assigned professional must call this booking before either participant can enter.</Empty>;
  }
  // React reuses route elements when only a route parameter changes. Scope the
  // entire editor (including drafts, upload privacy and dirty-state tracking)
  // to one booking, and initialize it only after that booking is available.
  return <ConsultationRoom key={id} id={id} onFinishing={setFinishing} />;
}

function ConsultationRoom({ id, onFinishing }) {
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
  const [confirm, setConfirm] = useState(null);
  const [feedback, setFeedback] = useState("");
  const chat = useRef(null);
  const room = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const professional = ["doctor", "lawyer"].includes(s.role);
  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === room.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!professional || b?.status !== "IN CONSULTATION") return;
    let active = true, pending = false;
    async function heartbeat() {
      if (pending) return;
      pending = true;
      try {
        const result = await callApi("POST", `/bookings/${id}/room-presence`);
        if (active && result.data.status !== "IN CONSULTATION") {
          await dispatch(fetchWorkspace({ live: true }));
          navigate("/app/queue?tab=weekly");
        }
      } catch (error) { if (active) setChatError(error.message); }
      finally { pending = false; }
    }
    heartbeat(); const timer = setInterval(heartbeat, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [id, professional, b?.status, dispatch, navigate]);
  const answerCall = useCallback(async () => {
    await callApi("POST", `/bookings/${id}/room-presence`);
    await dispatch(fetchWorkspace({ live: true }));
  }, [id, dispatch]);
  async function roomAction(action) {
    try {
      await callApi("POST", `/bookings/${id}/${action}`);
      await dispatch(fetchWorkspace({ live: true }));
      if (action === "queue-end") navigate("/app/queue?tab=weekly");
      else setFeedback(action === "ring" ? "Ringing the patient." : "Your attendance is confirmed.");
    } catch (error) { setChatError(error.message); }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (room.current?.requestFullscreen) await room.current.requestFullscreen();
      else setExpanded(!expanded);
    } catch { setExpanded(!expanded); }
  }
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [b?.messages.length]);
  const accessible = canRead(s, b) && (b?.status === "IN CONSULTATION" || (professional && b?.status === "COMPLETED"));
  async function storeNotes() {
    if (savingNotes) return null;
    setSavingNotes(true);
    setChatError(""); setFeedback("");
    const action = await dispatch(saveNotes({ id, notes, privateNotes, followUp, revision: notesRevision, localPending: true }));
    setSavingNotes(false);
    if (action.error) setChatError(action.payload || "Could not save notes.");
    if (!action.error) { setNotesRevision(action.payload.revision); markNotesSaved(); }
    return action;
  }
  async function completeConsultation() {
    if (completing || savingNotes) return;
    const callNext = confirm === "next";
    let completedSuccessfully = false;
    setCompleting(true); onFinishing(true);
    try {
      const saved = await storeNotes();
      if (!saved || saved.error) { setConfirm(null); return; }
      const completed = await dispatch(transition({ id, status: "COMPLETED", notesRevision: saved.payload.revision, localPending: true }));
      if (completed.error) { setConfirm(null); setChatError(completed.payload || "Could not complete the consultation. Please try again."); return; }
      completedSuccessfully = true;
      if (callNext) {
        // Read the promoted queue from the server. Never choose the next patient
        // from the stale queue that was visible before completing this booking.
        const refreshed = await dispatch(fetchWorkspace({ live: true }));
        if (!refreshed.error) {
          const state = refreshed.payload;
          const session = state.sessions.find((item) => item.id === b.sessionId);
          const next = state.bookings.find((item) => item.sessionId === b.sessionId && item.professionalId === b.professionalId && item.status === "NEXT" && item.payment === "paid");
          const busy = state.bookings.some((item) => item.professionalId === b.professionalId && item.status === "IN CONSULTATION");
          if (next && session?.online && isSessionLive(session) && !busy) {
            const called = await dispatch(transition({ id: next.id, status: "IN CONSULTATION" }));
            if (!called.error) { navigate(`/app/room/${next.id}`); return; }
          }
        }
        navigate(`/app/queue?tab=${b.scheduledById ? "appointments" : "weekly"}`);
      } else navigate(`/app/booking/${id}?tab=summary`);
    } finally { setConfirm(null); setCompleting(false); if (!completedSuccessfully) onFinishing(false); }
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
  const closed = b.status === "COMPLETED";
  return <div ref={room} className={"consultation-room " + (expanded ? "room-expanded" : "")}>
    <PageHeading eyebrow="CONSULTATION ROOM" title={s.role === "user" ? p?.name || "Your consultation" : b.patientName} action={<div className="room-heading-actions"><Status>{completing ? "COMPLETING" : b.status}</Status><button type="button" className="ws-link secondary" onClick={toggleFullscreen}>{expanded ? <Minimize size={17} /> : <Maximize size={17} />}{expanded ? "Exit full screen" : "Full screen"}</button></div>}>{professional ? "Your patient’s video and consultation record, side by side." : "Speak with your professional and share messages or documents."}</PageHeading>
    <div className="room-workbench">{closed ? <section className="room-video-panel room-call-completed"><CheckCheck size={42} /><h2>Consultation completed</h2><p>Your record has been saved. You can leave after reviewing any unsent drafts.</p></section> : <VideoCall key={id} bookingId={id} onJoin={professional ? undefined : answerCall} />}<aside className="room-tools" aria-label="Consultation tools"><SectionTabs ids={["chat", "documents", ...(b.patientContext?.profession === "doctor" ? ["prescription"] : []), ...(professional ? ["notes"] : []), "patient"]} order={professional ? ["patient", "notes", "prescription", "documents", "chat"] : ["chat", "documents", "prescription", "patient"]} label="Consultation tools" labels={["Chat", "Documents", ...(b.patientContext?.profession === "doctor" ? ["Prescription"] : []), ...(professional ? ["Notes"] : []), "Patient information"]} icons={[<MessageSquare size={17} aria-hidden="true" />, <FileText size={17} aria-hidden="true" />, ...(b.patientContext?.profession === "doctor" ? [<ClipboardList size={17} aria-hidden="true" />] : []), ...(professional ? [<NotebookPen size={17} aria-hidden="true" />] : []), <UserRound size={17} aria-hidden="true" />]}>
      <section className="ws-panel room-chat-panel"><div className="room-chat-heading"><div><h2>Consultation chat</h2><p>Messages are saved in your consultation record.</p></div><MessageSquare size={20} aria-hidden="true" /></div><div className="ws-chat" ref={chat} role="log" aria-live="polite" aria-relevant="additions text" aria-label="Consultation messages">{b.messages.length ? <ChatMessages booking={b} /> : !sending && <div className="room-chat-empty"><MessageSquare size={30} aria-hidden="true" /><h3>Start a conversation</h3><p>Share a quick message while keeping your video call open.</p></div>}{sending && <div className="ws-message ws-message-own" role="status"><span>{text}</span><small><Loader2 size={14} className="animate-spin" />Sending…</small></div>}</div><form className="room-chat-form" onSubmit={sendMessage}><label className="sr-only" htmlFor="consultation-message">Message</label><textarea id="consultation-message" value={text} disabled={sending || completing || closed} onChange={(e) => { setText(e.target.value); setChatError(""); }} maxLength={2000} placeholder="Write a message…" /><button className="room-send-button" type="submit" aria-label={sending ? "Sending message" : "Send message"} title="Send message" disabled={!text.trim() || sending || completing || closed} aria-busy={sending}>{sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}</button></form></section>
    <div className="ws-space"><Documents booking={b} /></div>
    {b.patientContext?.profession === "doctor" && <div className="ws-space"><Prescription key={b.id} booking={b} /></div>}
    {professional && <div className="ws-space"><Panel title="Professional notes"><p className="room-tool-intro">Save notes at any time. Completing the consultation also saves these notes.</p><fieldset disabled={savingNotes || completing || closed} className="room-notes-fields"><label className="ws-field">Notes shared with the patient / client<textarea value={notes} maxLength={5000} onChange={(e) => { setNotes(e.target.value); setFeedback(""); }} placeholder="Findings and advice for the patient…" /></label><label className="ws-field">Private notes (professional workspace only)<textarea value={privateNotes} maxLength={5000} onChange={(e) => { setPrivateNotes(e.target.value); setFeedback(""); }} placeholder="Only you can see these notes…" /></label><label className="ws-field">Follow-up recommendation<textarea value={followUp} maxLength={2000} onChange={(e) => { setFollowUp(e.target.value); setFeedback(""); }} placeholder="Next steps or a follow-up date…" /></label></fieldset></Panel></div>}
    <PatientContext booking={b} /></SectionTabs></aside></div>
    {professional && <footer role="region" className="room-professional-actions" aria-label="Professional consultation actions"><div className="room-action-status" role="status">{savingNotes || completing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}<div><strong>{completing ? "Completing consultation…" : savingNotes ? "Saving your notes…" : feedback || (closed ? "Consultation completed" : "Consultation in progress")}</strong><small>Notes are saved before completing this record.</small></div></div><div className="ws-actions">{!closed && <><button type="button" className="ws-link secondary" disabled={savingNotes || completing} onClick={() => roomAction("ring")}>Ring patient again</button>{!b.scheduledById && !b.patientJoinedAt && <button type="button" className="ws-link secondary" disabled={savingNotes || completing} onClick={() => roomAction("queue-end")}>Patient late · move to end</button>}</>}<button type="button" className="ws-link secondary" disabled={savingNotes || completing || closed} onClick={async () => { const action = await storeNotes(); if (action && !action.error) setFeedback("Notes saved."); }}><Save size={17} />Save notes</button><button type="button" className="ws-link secondary" disabled={savingNotes || completing || closed} onClick={() => setConfirm("complete")}><CheckCheck size={17} />Complete consultation</button>{!b.scheduledById && <button type="button" className="ws-link" disabled={savingNotes || completing || closed} onClick={() => setConfirm("next")}>Complete & call next<ArrowRight size={17} /></button>}</div></footer>}
    {chatError && <MessageOverlay type="error" text={chatError} onClose={() => setChatError("")} />}
    {confirm && <MessageOverlay type="confirm" title={confirm === "next" ? "Complete and call the next patient?" : "Complete this consultation?"} text={confirm === "next" ? "Your notes will be saved and this consultation will close. The next paid patient in this session will be called if the session is still open. Otherwise, you will return to your queue." : "Your notes will be saved and this consultation will move to history. You can review the completed record afterwards."} confirmText={confirm === "next" ? "Complete & call next" : "Complete"} isProcessing={completing} onClose={() => setConfirm(null)} onConfirm={completeConsultation} />}
  </div>;
}
