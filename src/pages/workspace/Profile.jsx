import { useState } from "react";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Status, Empty } from "../../components/workspace/Workspace";
import { saveProfile } from "../../features/consultations/consultationSlice";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import "./profile.css";

export default function Profile() {
  const s = useWorkspace();
  if (s.role === "admin") return <Empty title="Administrator workspace">Use People & verification to manage platform accounts.</Empty>;
  const source = s.role === "user" ? s.patient : s.professionals.find((p) => p.id === s.professionalId);
  return <ProfileForm key={source.id} source={source} patient={s.role === "user"} />;
}
function ProfileForm({ source, patient }) {
  const [form, setForm] = useState({ ...source, languages: source.languages?.join(", ") || "" });
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
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
  const fields = patient ? [["name", "Full name", "text"], ["dob", "Date of birth", "date"], ["weightKg", "Weight (kg)", "number"], ["phone", "Contact number", "tel"], ["email", "Email address", "email"], ["emergency", "Emergency contact", "text"]] : [["name", "Professional name", "text"], ["speciality", "Speciality", "text"], ["registration", "Registration number", "text"], ["qualifications", "Qualifications", "text"], ["languages", "Languages (comma separated)", "text"]];
  async function save(event) {
    event.preventDefault();
    if (saving || readingImage || !form.name.trim()) return;
    setSaving(true);
    setFeedback("");
    try {
      const action = await dispatch(saveProfile(patient ? { name: form.name.trim(), dob: form.dob, phone: form.phone, email: form.email, emergency: form.emergency, details: form.details, weightKg: form.weightKg === "" || form.weightKg == null ? null : Number(form.weightKg), medicalDetails: form.medicalDetails || "", legalDetails: form.legalDetails || "" } : { name: form.name.trim(), speciality: form.speciality, registration: form.registration, qualifications: form.qualifications, languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean), bio: form.bio, image: form.image || "" }));
      if (!action.error) setFeedback(patient ? "Profile saved." : "Profile saved. Changed credentials require administrator review.");
    } finally { setSaving(false); }
  }
  const initials = (form.name || "Professional").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("");
  return <>
    <PageHeading title={patient ? "A profile that's yours." : "Your professional profile."}>
      {patient ? "Keep your contact information accurate and up to date." : "Introduce yourself, keep your credentials up to date and help patients or clients get to know you. Consultation fees are managed in My sessions."}
    </PageHeading>
    <div className={patient ? "ws-grid-two" : "professional-profile-layout"}>
      <Panel title="Your details">
        <form className="ws-form" onSubmit={save}>
          <fieldset className="profile-fields" disabled={saving || readingImage}>
            {!patient && <div className="profile-photo-editor">
              <div className="profile-photo-preview">
                {form.image && !imageFailed ? <img src={form.image} alt="Profile preview" onError={() => setImageFailed(true)} /> : <span aria-label="Profile initials">{initials}</span>}
              </div>
              <div className="profile-photo-controls">
                <h3>Profile photo</h3>
                <p>A clear photo helps patients and clients recognise you.</p>
                <label className="ws-field">Choose or replace photo<input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={selectImage} aria-describedby="profile-photo-help" /></label>
                <p id="profile-photo-help">JPEG, PNG or WebP, up to 200 KB. Preview your changes before saving.</p>
                {readingImage && <p role="status">Loading photo…</p>}
                {imageFailed && <p role="alert">This photo could not be displayed. Choose another image.</p>}
                {form.image && <button type="button" className="ws-name-link" onClick={() => { setForm((current) => ({ ...current, image: "" })); setImageFailed(false); }}>Remove photo</button>}
              </div>
            </div>}
            <div className={patient ? "profile-field-list" : "profile-detail-fields"}>
              {fields.map(([key, label, type]) => <Input key={key} label={label} name={key} type={type} value={form[key] ?? ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} disabled={key === "email"} required={key === "name" || !patient || key === "dob" || key === "phone"} step={key === "weightKg" ? "0.01" : undefined} min={key === "weightKg" ? 0.01 : undefined} max={type === "date" ? new Date().toLocaleDateString("en-CA") : undefined} />)}
            </div>
            <label className="ws-field">{patient ? "Relevant consultation information" : "Professional introduction"}<textarea maxLength={2000} value={(patient ? form.details : form.bio) || ""} onChange={(event) => setForm({ ...form, [patient ? "details" : "bio"]: event.target.value })} /></label>
            {patient && <>
              <label className="ws-field">Medical information for your doctor<textarea maxLength={5000} value={form.medicalDetails || ""} onChange={(event) => setForm({ ...form, medicalDetails: event.target.value })} placeholder="Allergies, current medicines, medical conditions and relevant history" /></label>
              <label className="ws-field">Legal information for your lawyer<textarea maxLength={5000} value={form.legalDetails || ""} onChange={(event) => setForm({ ...form, legalDetails: event.target.value })} placeholder="Relevant background for legal consultations" /></label>
              <p>Medical details and weight are shared with your consulting doctor. Legal details are shared with your consulting lawyer. General consultation information is shared with either.</p>
            </>}
            <div className="profile-save"><Button type="submit" disabled={saving || readingImage}>{saving ? "Saving profile…" : "Save profile"}</Button></div>
          </fieldset>
          {feedback && <p role="status">{feedback}</p>}
        </form>
      </Panel>
      <Panel title={patient ? "Your information, with context." : "Professional verification"}>
        {patient ? <p>Only your own profile appears in this workspace. Relevant reports can be attached directly to a consultation.</p> : <>
          <Status>{source.status}</Status>
          <p className="profile-verification-copy">{source.status === "verified" ? "Your professional credentials have been approved." : "An administrator reviews your registration and qualifications before activating your account."}</p>
          <dl className="profile-verification-facts">
            <div><dt>Registration number</dt><dd>{source.registration || "Not provided"}</dd></div>
            <div><dt>Qualifications</dt><dd>{source.qualifications || "Not provided"}</dd></div>
          </dl>
          <p className="ws-notice">Updating your registration or qualifications sends your credentials back for administrator review.</p>
        </>}
      </Panel>
    </div>
  </>;
}
