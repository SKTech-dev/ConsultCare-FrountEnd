import { profileImageSrc } from "../../features/auth/profileImages";
import GlobalLoader from "../../components/ui/GlobalLoader";
import SectionTabs from "../../components/ui/SectionTabs";
import { useState } from "react";
import { Camera } from "lucide-react";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Status, Empty } from "../../components/workspace/Workspace";
import { fetchWorkspace, saveProfile } from "../../features/consultations/consultationSlice";
import { deleteAccount } from "../../features/auth/authSlice";
import { apiClient, callApi } from "../../api/apiClient";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import "./profile.css";
import { useUnsavedChanges } from "../../components/ui/UnsavedChanges";
import { MessageOverlay } from "../../components/ui/MessageBox";
import Modal from "../../components/ui/Modal";
import RefundWallet from "../../components/workspace/RefundWallet";

export default function Profile() {
  const s = useWorkspace();
  if (s.role === "admin") return <Empty title="Administrator workspace">Use People & verification to manage platform accounts.</Empty>;
  const source = s.role === "user" ? s.patient : s.professionals.find((p) => p.id === s.professionalId);
  return <ProfileForm key={source.id} source={source} patient={s.role === "user"} />;
}
function ProfileForm({ source, patient }) {
  const [form, setForm] = useState({ ...source, languages: source.languages?.join(", ") || "" });
  const markSaved = useUnsavedChanges(form);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docKind, setDocKind] = useState("qualification");
  const [docBusy, setDocBusy] = useState(false);
  const [docNotice, setDocNotice] = useState("");
  const dispatch = useDispatch();
  async function selectImage(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 200 * 1024) { setFeedback("Choose a JPEG, PNG, or WebP profile photo under 200 KB."); return; }
    setReadingImage(true);
    setFeedback("");
    const reader = new FileReader();
    reader.onload = () => { setForm((current) => ({ ...current, image: reader.result })); setImageFailed(false); setReadingImage(false); };
    reader.onerror = () => { setFeedback("Could not read this photo."); setReadingImage(false); };
    reader.readAsDataURL(file);
  }
  const fields = patient ? [["name", "Full name", "text"], ["dob", "Date of birth", "date"], ["weightKg", "Weight (kg)", "number"], ["phone", "Contact number", "tel"], ["email", "Email address", "email"], ["emergency", "Emergency contact", "text"], ["address", "Billing address", "text"], ["city", "City", "text"]] : [["name", "Professional name", "text"], ["phone", "Mobile number for session handovers", "tel"], ["identityReference", "NIC / Passport number", "text"], ["speciality", source.role === "counsellor" ? "Counselling focus" : "Speciality", "text"], ["registration", source.role === "counsellor" ? "Professional membership / credential reference" : "Registration number", "text"], ["qualifications", "Qualifications", "text"], ["issuingInstitution", "Issuing university / institute / body", "text"], ["qualificationYear", "Qualification year", "number"], ["languages", "Languages (comma separated)", "text"]];
  async function save(event) {
    event.preventDefault();
    if (saving || readingImage || !form.name.trim()) return;
    if (!patient && !String(form.identityReference || "").trim()) {
      setFeedback("Enter your NIC or Passport number.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const action = await dispatch(saveProfile(patient ? { name: form.name.trim(), dob: form.dob, phone: form.phone, address: form.address || "", city: form.city || "", email: form.email, emergency: form.emergency, details: form.details, image: form.image || "", weightKg: form.weightKg === "" || form.weightKg == null ? null : Number(form.weightKg), medicalDetails: form.medicalDetails || "", legalDetails: form.legalDetails || "", counsellingDetails: form.counsellingDetails || "" } : { name: form.name.trim(), phone: form.phone || "", identityReference: String(form.identityReference || "").trim(), speciality: form.speciality, registration: form.registration, qualifications: form.qualifications, issuingInstitution: String(form.issuingInstitution || "").trim(), qualificationYear: form.qualificationYear === "" || form.qualificationYear == null ? null : Number(form.qualificationYear), scopeConfirmed: Boolean(form.scopeConfirmed), languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean), bio: form.bio, image: form.image || "" }));
      if (!action.error) markSaved();
    } finally { setSaving(false); }
  }
  const initials = (form.name || "Professional").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("");
  return <>
    <PageHeading title={patient ? "A profile that's yours." : "Your professional profile."}>
      {patient ? "Keep your contact information accurate and up to date." : "Introduce yourself, keep your credentials up to date and help patients or clients get to know you. Consultation fees are managed in My sessions."}
    </PageHeading>
    <SectionTabs ids={["details", "verification", "wallet"]} labels={["Your details", patient ? "Profile visibility" : "Professional verification", "Refund wallet"]}>
      <Panel title="Your details">
        <form className="ws-form" onSubmit={save}>
          <fieldset className="profile-fields" disabled={saving || readingImage}>
            <div className="profile-photo-editor">
              <label className="profile-photo-preview" title="Change profile photo">
                <input className="profile-photo-input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={selectImage} aria-label="Change profile photo" aria-describedby="profile-photo-help" />
                {form.image && !imageFailed ? <img src={profileImageSrc(form.image)} alt="Profile preview" onError={() => setImageFailed(true)} /> : <span aria-label="Profile initials">{initials}</span>}
                <span className="profile-photo-change"><Camera size={16} /> Edit</span>
              </label>
              <div className="profile-photo-controls">
                <h3>Profile photo</h3>
                <p>{patient ? "Choose a photo for your personal profile." : "A clear photo helps patients and clients recognise you."}</p>
                <p id="profile-photo-help">JPEG, PNG or WebP, up to 200 KB. Preview your changes before saving.</p>
                {readingImage && <GlobalLoader compact message="Loading photo…" />}
                {imageFailed && <p role="alert">This photo could not be displayed. Choose another image.</p>}
                {form.image && <button type="button" className="ws-name-link" onClick={() => { setForm((current) => ({ ...current, image: "" })); setImageFailed(false); }}>Remove photo</button>}
              </div>
            </div>
            <div className="profile-detail-fields">
              {fields.map(([key, label, type]) => <Input key={key} label={label} name={key} type={type} value={form[key] ?? ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} disabled={key === "email"} required={key === "name" || (!patient && !["issuingInstitution", "qualificationYear"].includes(key)) || key === "dob" || key === "phone"} step={key === "weightKg" ? "0.01" : key === "qualificationYear" ? "1" : undefined} min={key === "weightKg" ? 0.01 : key === "qualificationYear" ? 1950 : undefined} max={type === "date" ? new Date().toLocaleDateString("en-CA") : key === "qualificationYear" ? 2100 : undefined} />)}
            </div>
            <label className="ws-field">{patient ? "Relevant consultation information" : "Professional introduction"}<textarea maxLength={2000} value={(patient ? form.details : form.bio) || ""} onChange={(event) => setForm({ ...form, [patient ? "details" : "bio"]: event.target.value })} /></label>
            {!patient && (
              <label className="flex items-start gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.scopeConfirmed)}
                  onChange={(event) => setForm({ ...form, scopeConfirmed: event.target.checked })}
                />
                <span>
                  I confirm that my qualifications are valid in Sri Lanka and I will practise within my professional scope
                  {source.role === "counsellor" ? " (counsellors do not prescribe medication)." : "."}
                </span>
              </label>
            )}
            {patient && <>
              <p>Your saved billing address and city are used automatically for secure payments.</p>
              <label className="ws-field">Medical information for your doctor<textarea maxLength={5000} value={form.medicalDetails || ""} onChange={(event) => setForm({ ...form, medicalDetails: event.target.value })} placeholder="Allergies, current medicines, medical conditions and relevant history" /></label>
              <label className="ws-field">Legal information for your lawyer<textarea maxLength={5000} value={form.legalDetails || ""} onChange={(event) => setForm({ ...form, legalDetails: event.target.value })} placeholder="Relevant background for legal consultations" /></label>
              <label className="ws-field">Counselling information for your counsellor<textarea maxLength={5000} value={form.counsellingDetails || ""} onChange={(event) => setForm({ ...form, counsellingDetails: event.target.value })} placeholder="Concerns, goals and relevant background you want to share with your counsellor" /></label>
              <p>Medical details and weight are shared with your consulting doctor. Legal details are shared with your consulting lawyer. Counselling information is shared with your consulting counsellor. General consultation information is shared with your consulting professional.</p>
            </>}
            <div className="profile-save"><Button type="submit" disabled={saving || readingImage}>{saving ? "Saving profile…" : "Save profile"}</Button></div>
          </fieldset>
          {feedback && <MessageOverlay type="error" text={feedback} onClose={() => setFeedback("")} />}
        </form>
        <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--cc-border)" }}>
          <h3 className="text-base font-semibold mb-2">Delete account</h3>
          <div className="space-y-2 max-w-lg">
            <p className="text-sm">Permanently delete your ConsultCare account.</p>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: "#b91c1c" }}
              onClick={() => setConfirmDelete(true)}
            >
              Delete account
            </button>
          </div>
          {confirmDelete && (
            <Modal title="Delete your ConsultCare account?" busy={deleting} onClose={() => setConfirmDelete(false)}>
              <div className="space-y-4">
                <p className="text-sm">
                  If you have no consultations or payments, your account and personal data will be permanently deleted.
                  If you have consultations or payments, your sign-in access will be permanently removed while consultation, payment, and contact records are retained as required by law.
                </p>
                <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>
                  Any upcoming paid bookings or remaining wallet balance cannot be recovered or refunded after deleting your account. Cancel bookings or cash out your wallet first if needed.
                </p>
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    type="button"
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50"
                    style={{ borderColor: "var(--cc-border)" }}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep my account
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: "#b91c1c" }}
                    onClick={async () => {
                      if (deleting) return;
                      setDeleting(true);
                      setFeedback("");
                      try {
                        await dispatch(deleteAccount()).unwrap();
                      } catch (err) {
                        setConfirmDelete(false);
                        setFeedback(typeof err === "string" ? err : err?.message || "Could not delete account.");
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting ? "Deleting account…" : "Permanently delete account"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </Panel>
      <Panel title={patient ? "Your information, with context." : "Professional verification"}>
        {patient ? <p>Only your own profile appears in this workspace. Relevant reports can be attached directly to a consultation.</p> : <>
          <Status>{source.status}</Status>
          <p className="profile-verification-copy">{source.status === "verified" ? "Your professional credentials have been approved." : "An administrator reviews your registration and qualifications before activating your account."}</p>
          <dl className="profile-verification-facts">
            <div><dt>Registration number</dt><dd>{source.registration || "Not provided"}</dd></div>
            <div><dt>Qualifications</dt><dd>{source.qualifications || "Not provided"}</dd></div>
            <div><dt>Issuing institution</dt><dd>{source.issuingInstitution || "Not provided"}</dd></div>
            <div><dt>Qualification year</dt><dd>{source.qualificationYear || "Not provided"}</dd></div>
            <div><dt>NIC / Passport</dt><dd>{source.identityReference || "Not provided"}</dd></div>
            <div><dt>Scope declaration</dt><dd>{source.scopeConfirmed ? "Confirmed" : "Not confirmed"}</dd></div>
          </dl>
          <p className="ws-notice">Updating your registration, qualifications, or NIC / Passport sends your credentials back for administrator review.</p>
          <div className="mt-6 pt-6 border-t space-y-3" style={{ borderColor: "var(--cc-border)" }}>
            <h3 className="text-base font-semibold">Verification certificates &amp; ID</h3>
            <p className="text-sm">Upload your degree/diploma certificate, professional membership card, or NIC/ID proof (PDF, PNG, JPG, or WebP) for administrator review.</p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Document category"
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "var(--cc-border)" }}
                value={docKind}
                disabled={docBusy}
                onChange={(event) => setDocKind(event.target.value)}
              >
                <option value="qualification">Qualification certificate</option>
                <option value="membership">Professional membership / registration</option>
                <option value="identity">NIC / ID proof</option>
                <option value="other">Other supporting document</option>
              </select>
              <label className="ws-link secondary cursor-pointer">
                {docBusy ? "Uploading…" : "Upload certificate / ID"}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  disabled={docBusy}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setDocBusy(true);
                    setDocNotice("");
                    setFeedback("");
                    try {
                      const body = new FormData();
                      body.append("file", file);
                      body.append("kind", docKind);
                      await callApi("POST", "/profile/verification-documents", body, null, { timeout: 120000 });
                      await dispatch(fetchWorkspace());
                      setDocNotice("Verification document uploaded.");
                    } catch (err) {
                      setFeedback(err?.message || "Could not upload document.");
                    } finally {
                      setDocBusy(false);
                    }
                  }}
                />
              </label>
            </div>
            {docNotice && <p role="status" className="text-sm">{docNotice}</p>}
            {source.verificationDocuments?.length ? (
              <div className="space-y-2">
                {source.verificationDocuments.map((doc) => (
                  <div className="ws-row" key={doc.id}>
                    <div>
                      <strong>{doc.name}</strong>
                      <p className="text-xs opacity-75">{doc.kind} · {Math.max(1, Math.round(doc.size / 1024))} KB</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        className="ws-link secondary"
                        href={`${apiClient.defaults.baseURL}/verification-documents/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        className="ws-link secondary"
                        disabled={docBusy}
                        onClick={async () => {
                          setDocBusy(true);
                          setFeedback("");
                          try {
                            await callApi("DELETE", `/profile/verification-documents/${doc.id}`);
                            await dispatch(fetchWorkspace());
                          } catch (err) {
                            setFeedback(err?.message || "Could not remove document.");
                          } finally {
                            setDocBusy(false);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-75">No verification documents uploaded yet.</p>
            )}
          </div>
        </>}
      </Panel>
      {patient && <RefundWallet />}
    </SectionTabs>
  </>;
}
