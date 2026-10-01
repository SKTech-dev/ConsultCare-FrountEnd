import { useState } from "react";
import { useDispatch } from "react-redux";
import { callApi } from "../../api/apiClient";
import { fetchWorkspace } from "../../features/consultations/consultationSlice";
import { sessionEndsAt } from "../../features/consultations/model";
import ReasonDialog from "../ui/ReasonDialog";
import { MessageOverlay } from "../ui/MessageBox";
import { useWorkspace } from "./Workspace";

export default function ResolveUnfinished({ booking }) {
  const s = useWorkspace();
  const dispatch = useDispatch();
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const session = s.sessions.find((item) => item.id === booking.sessionId);
  if (!["doctor", "lawyer"].includes(s.role) || booking.professionalId !== s.professionalId || booking.scheduledById || !["WAITING", "NEXT"].includes(booking.status) || !session || sessionEndsAt(session) > Date.now()) return feedback ? <MessageOverlay {...feedback} onClose={() => setFeedback(null)} /> : null;
  return <>
    <div className="ws-actions"><button className="ws-link secondary" onClick={() => setOutcome("NO-SHOW")}>Patient did not attend</button><button className="ws-link secondary" onClick={() => setOutcome("CANCELLED")}>Consultation not provided</button></div>
    {outcome && <ReasonDialog title={outcome === "NO-SHOW" ? "Record patient absence" : "Cancel unprovided consultation"} text={outcome === "NO-SHOW" ? "Use this only if the patient did not attend. Payment is retained for review; this does not record earnings or issue a refund." : "Use this when you could not provide the consultation. A verified payment will require refund review, not be marked automatically refunded."} busy={busy} onClose={() => setOutcome(null)} onConfirm={async (reason) => {
      if (busy) return;
      setBusy(true);
      try {
        await callApi("POST", `/bookings/${booking.id}/resolve`, { outcome, reason });
        setOutcome(null);
        const result = await dispatch(fetchWorkspace());
        setFeedback({ type: "success", text: result.error ? "Resolution saved. Reload to see the updated record." : "Consultation resolved and notifications saved." });
      } catch (error) { setFeedback({ type: "error", text: error.message }); }
      finally { setBusy(false); }
    }} />}
    {feedback && <MessageOverlay {...feedback} onClose={() => setFeedback(null)} />}
  </>;
}
