export const ACTIVE = ["WAITING", "NEXT", "IN CONSULTATION"];
export const money = (amount) => "LKR " + Number(amount).toLocaleString("en-LK");
export function queueFor(state, professionalId, sessionId) {
  return state.bookings.filter((b) => b.professionalId === professionalId && (!sessionId || b.sessionId === sessionId) && ACTIVE.includes(b.status));
}
export function promote(state, professionalId, sessionId) {
  const queue = queueFor(state, professionalId, sessionId);
  const busy = queue.some((b) => b.status === "IN CONSULTATION");
  queue.filter((b) => b.status !== "IN CONSULTATION").forEach((b, i) => { b.status = !busy && i === 0 ? "NEXT" : "WAITING"; });
}
export function canRead(state, booking) {
  return Boolean(booking && (state.role === "user" ? booking.patientId === state.patient.id : ["doctor", "lawyer"].includes(state.role) && booking.professionalId === state.professionalId));
}
export function seedState() {
  const day = new Date().toLocaleDateString("en-CA");
  const professionals = [
    { id: "d1", role: "doctor", name: "Dr. Anjali Perera", speciality: "General practice", qualifications: "MBBS", registration: "DEMO-MED-001", languages: ["English", "Sinhala"], fee: 2500, bio: "A thoughtful approach to everyday health, follow-up care, and helping you understand your reports.", status: "verified" },
    { id: "d2", role: "doctor", name: "Dr. Arun Silva", speciality: "Dermatology", qualifications: "MBBS, MD", registration: "DEMO-MED-002", languages: ["English", "Tamil"], fee: 3500, bio: "Consultations focused on skin concerns and ongoing skin care.", status: "verified" },
    { id: "d3", role: "doctor", name: "Dr. Maya Fernando", speciality: "General practice", qualifications: "MBBS", registration: "DEMO-MED-003", languages: ["English", "Sinhala"], fee: 2800, bio: "Personalised support for your health questions.", status: "pending" },
    { id: "l1", role: "lawyer", name: "Nadisha Jayawardena", speciality: "Family law", qualifications: "LLB, Attorney-at-law", registration: "DEMO-LAW-001", languages: ["English", "Sinhala"], fee: 4000, bio: "Clear guidance through personal and family matters, with space to discuss your options.", status: "verified" },
    { id: "l2", role: "lawyer", name: "Ravi Kumar", speciality: "Business law", qualifications: "LLB, Attorney-at-law", registration: "DEMO-LAW-002", languages: ["English", "Tamil"], fee: 5000, bio: "Practical conversations about contracts, business questions, and commercial documents.", status: "verified" },
  ];
  const sessions = professionals.map((p, i) => ({ id: "s" + p.id, professionalId: p.id, date: day, start: i % 2 ? "18:00" : "17:00", end: "20:00", online: p.status === "verified", capacity: 10 }));
  const patients = [
    { id: "patient-1", name: "Alex Morgan", dob: "", phone: "", email: "alex@example.test", emergency: "", details: "", status: "active" },
    { id: "patient-2", name: "Sam Taylor", dob: "", phone: "", email: "sam@example.test", emergency: "", details: "", status: "active" },
    { id: "patient-3", name: "Jamie Lee", dob: "", phone: "", email: "jamie@example.test", emergency: "", details: "", status: "active" },
  ];
  return {
    version: 1, role: "user", professionalId: "d1",
    patient: { ...patients[0] }, patients,
    professionals, sessions, bookings: [], issues: [],
  };
}
