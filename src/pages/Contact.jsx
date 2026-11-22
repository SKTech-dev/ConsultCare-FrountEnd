import { useEffect, useState } from "react";
import { Check, Copy, Mail, Send, ShieldCheck } from "lucide-react";
import PlatformLayout from "../components/PlatformLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { callApi } from "../api/apiClient";
import "./contact.css";

const SUPPORT_EMAIL = "ravindu.kavishan@sktech.lk";

const TOPICS = [
  "General inquiry",
  "Account & sign-in",
  "Bookings & refunds",
  "Professional verification",
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: TOPICS[0],
    message: "",
  });
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Contact us | ConsultCare";
    return () => {
      document.title = "ConsultCare";
    };
  }, []);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSentMessage("");
    try {
      const response = await callApi("POST", "/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic,
        message: form.message.trim(),
      });
      setSentMessage(
        response?.message || "Your message has been sent. We will get back to you soon."
      );
      setForm({ name: "", email: "", topic: TOPICS[0], message: "" });
    } catch (failure) {
      setError(failure.message || "Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlatformLayout>
      <div className="cc-contact">
        <div className="cc-contact-story">
          <p className="cc-eyebrow">CONTACT CONSULTCARE</p>
          <h1>We&apos;re here to help you connect.</h1>
          <p className="cc-contact-intro">
            Have a question about bookings, professional verification, payments, or
            your ConsultCare account? Reach out directly and we will respond as soon
            as possible.
          </p>

          <div className="cc-contact-direct">
            <span className="cc-eyebrow">DIRECT SUPPORT EMAIL</span>
            <div className="cc-contact-email-row">
              <a className="cc-contact-email-link" href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail size={18} aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
              <button type="button" className="cc-contact-copy" onClick={copyEmail}>
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied ? "Copied" : "Copy email"}
              </button>
            </div>
            <div className="cc-contact-note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Please avoid including sensitive medical, legal, or banking details in
                general support emails.
              </span>
            </div>
          </div>
        </div>

        <section className="cc-contact-card" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title">Send a message</h2>
          <p className="cc-contact-card-sub">
            Fill in your details below to compose an email to our support team.
          </p>

          <form className="cc-contact-form" onSubmit={submit}>
            <Input
              label="Full name"
              name="name"
              value={form.name}
              onChange={update}
              autoComplete="name"
              maxLength={120}
              required
            />
            <Input
              label="Your email address"
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              autoComplete="email"
              maxLength={254}
              required
            />
            <label className="cc-contact-field">
              Topic
              <select name="topic" value={form.topic} onChange={update} disabled={busy}>
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>
            <label className="cc-contact-field">
              Message
              <textarea
                name="message"
                value={form.message}
                onChange={update}
                minLength={5}
                maxLength={2000}
                placeholder="Tell us how we can help..."
                disabled={busy}
                required
              />
            </label>
            <Button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2"
            >
              <Send size={16} aria-hidden="true" />
              {busy ? "Sending message…" : "Send message"}
            </Button>
          </form>

          {error && (
            <div className="cc-contact-error" role="alert">
              {error}
            </div>
          )}

          {sentMessage && (
            <div className="cc-contact-sent" role="status">
              {sentMessage}
            </div>
          )}
        </section>
      </div>
    </PlatformLayout>
  );
}
