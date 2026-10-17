import { useEffect, useRef, useState } from "react";
import { MessageOverlay } from "./MessageBox";

// Keep browser constraint validation, with the same accessible popup as API errors.
export default function ValidationFeedback() {
  const [message, setMessage] = useState("");
  const first = useRef(null);
  useEffect(() => {
    const invalid = (event) => {
      event.preventDefault();
      if (first.current) return;
      first.current = event.target;
      const label = event.target.labels?.[0]?.textContent?.trim() || "This field";
      setMessage(label + ": " + event.target.validationMessage);
    };
    document.addEventListener("invalid", invalid, true);
    return () => document.removeEventListener("invalid", invalid, true);
  }, []);
  return message && <MessageOverlay type="error" title="Please check this field" text={message} onClose={() => {
    const field = first.current; first.current = null; setMessage("");
    window.setTimeout(() => field?.focus(), 0);
  }} />;
}
