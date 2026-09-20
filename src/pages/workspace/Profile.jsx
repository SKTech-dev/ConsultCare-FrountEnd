import { useState } from "react";
import { useDispatch } from "react-redux";
import { useWorkspace, PageHeading, Panel, Status, Empty } from "../../components/workspace/Workspace";
import { saveProfile } from "../../features/consultations/consultationSlice";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function Profile() {
  const s = useWorkspace();
  if (s.role === "admin") return <Empty title="Administrator workspace">Use People & verification to manage platform accounts.</Empty>;
  const source = s.role === "user" ? s.patient : s.professionals.find((p) => p.id === s.professionalId);
  return <ProfileForm key={source.id} source={source} patient={s.role === "user"} />;
}
function ProfileForm({ source, patient }) {
  const [form, setForm] = useState({ ...source, languages: source.languages?.join(", ") || "" });
  const [feedback, setFeedback] = useState("");
  const dispatch = useDispatch();
  async function selectImage(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 200 * 1024) { setFeedback("Choose a JPEG, PNG, or WebP profile photo under 200 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, image: reader.result }));
    reader.onerror = () => setFeedback("Could not read this photo.");
    reader.readAsDataURL(file);
  }
  const fields = patient ? [["name", "Full name", "text"], ["dob", "Date of birth", "date"], ["phone", "Contact number", "tel"], ["email", "Email address", "email"], ["emergency", "Emergency contact", "text"]] : [["name", "Professional name", "text"], ["speciality", "Speciality", "text"], ["registration", "Registration number", "text"], ["qualifications", "Qualifications", "text"], ["languages", "Languages (comma separated)", "text"], ["fee", "Consultation fee (LKR)", "number"]];
  return <><PageHeading title={patient ? "A profile that's yours." : "Your professional profile."}>{patient ? "Keep your contact details up to date. Use fictional information while the backend is being built." : "Make it easy for people to understand your expertise and approach."}</PageHeading><div className="ws-grid-two"><Panel title="Your details"><form className="ws-form" onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; dispatch(saveProfile(patient ? { name: form.name.trim(), dob: form.dob, phone: form.phone, email: form.email, emergency: form.emergency, details: form.details } : { name: form.name.trim(), speciality: form.speciality, registration: form.registration, qualifications: form.qualifications, languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean), fee: Number(form.fee), bio: form.bio, image: form.image || "" })); setFeedback("Profile saved. Changed professional credentials require a new administrator review."); }}>{fields.map(([key, label, type]) => <Input key={key} label={label} name={key} type={type} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key === "name" || !patient} min={type === "number" ? 1 : undefined} max={type === "date" ? new Date().toLocaleDateString("en-CA") : undefined} />)}<label className="ws-field">{patient ? "Relevant consultation information" : "Professional introduction"}<textarea maxLength={2000} value={patient ? form.details : form.bio} onChange={(e) => setForm({ ...form, [patient ? "details" : "bio"]: e.target.value })} /></label>{!patient && <label className="ws-field">Profile photo (JPEG, PNG, or WebP, under 200 KB){form.image && <img src={form.image} alt="Profile preview" className="w-20 h-20 rounded-full object-cover my-3" />}<input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={selectImage} /></label>}<Button type="submit">Save profile</Button>{feedback && <p role="status">{feedback}</p>}</form></Panel><Panel title={patient ? "Your information, with context." : "Professional verification"}>{!patient && <Status>{source.status}</Status>}<p className="mt-5">{patient ? "Only your own profile appears in this workspace. Relevant reports can be attached directly to a consultation." : "An administrator reviews your registration and qualifications before activating your account. Updating those credentials sends the profile back for review."}</p><div className="ws-notice">All demo workspaces use local browser storage. Role separation here demonstrates the interface; the future backend must enforce identity and permissions.</div></Panel></div></>;
}
