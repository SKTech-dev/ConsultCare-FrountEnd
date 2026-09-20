import { createSlice } from "@reduxjs/toolkit";
import { ACTIVE, canRead, promote, queueFor, seedState } from "./model.js";

const initial = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem("consultcare.workspace.v1"));
    if (saved?.version === 1 && saved.patient && Array.isArray(saved.patients) && Array.isArray(saved.professionals) && Array.isArray(saved.sessions) && Array.isArray(saved.bookings) && Array.isArray(saved.issues)) return saved;
  } catch { /* Start with synthetic examples when storage is unavailable. */ }
  return seedState();
})();
const slice = createSlice({
  name: "consultations", initialState: initial,
  reducers: {
    switchWorkspace(state, { payload }) {
      if (!["user", "doctor", "lawyer", "admin"].includes(payload.role)) return;
      state.role = payload.role;
      if (payload.role === "user" && payload.id) {
        const patient = state.patients.find((p) => p.id === payload.id);
        if (patient) state.patient = { ...patient };
      }
      if (["doctor", "lawyer"].includes(payload.role)) state.professionalId = state.professionals.find((p) => p.id === payload.id && p.role === payload.role)?.id || state.professionals.find((p) => p.role === payload.role).id;
    },
    saveProfile(state, { payload }) {
      if (state.role === "user") {
        Object.assign(state.patient, payload, { id: state.patient.id, status: state.patient.status });
        Object.assign(state.patients.find((p) => p.id === state.patient.id), state.patient);
      }
      else if (["doctor", "lawyer"].includes(state.role)) {
        const p = state.professionals.find((p) => p.id === state.professionalId);
        const changed = payload.registration !== p.registration || payload.qualifications !== p.qualifications;
        Object.assign(p, payload, { id: p.id, role: p.role, status: changed ? "pending" : p.status });
      }
    },
    addSession(state, { payload }) {
      const p = state.professionals.find((p) => p.id === state.professionalId);
      if (!["doctor", "lawyer"].includes(state.role) || p.status !== "verified" || payload.start >= payload.end) return;
      const overlap = state.sessions.some((s) => s.professionalId === p.id && s.date === payload.date && payload.start < s.end && payload.end > s.start);
      if (!overlap) state.sessions.push({ ...payload, professionalId: p.id, online: false, capacity: 10 });
    },
    toggleSession(state, { payload }) {
      const s = state.sessions.find((s) => s.id === payload);
      const p = state.professionals.find((p) => p.id === state.professionalId);
      if (["doctor", "lawyer"].includes(state.role) && s?.professionalId === p?.id && p.status === "verified") s.online = !s.online;
    },
    book(state, { payload }) {
      if (state.role !== "user" || state.patient.status !== "active") return;
      const p = state.professionals.find((p) => p.id === payload.professionalId);
      const s = state.sessions.find((s) => s.id === payload.sessionId && s.professionalId === p?.id);
      if (!s || p.status !== "verified" || state.bookings.some((b) => b.patientId === state.patient.id && b.sessionId === s.id && !["CANCELLED", "NO-SHOW"].includes(b.status))) return;
      if (state.bookings.filter((b) => b.sessionId === s.id && !["CANCELLED", "NO-SHOW"].includes(b.status)).length >= s.capacity) return;
      state.bookings.push({ ...payload, patientId: state.patient.id, patientName: state.patient.name, fee: p.fee, status: "PAYMENT PENDING", payment: "unpaid", messages: [], files: [], notes: "", privateNotes: "", followUp: "", createdAt: new Date().toISOString() });
    },
    pay(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload.id);
      const p = state.professionals.find((p) => p.id === b?.professionalId);
      if (state.role !== "user" || state.patient.status !== "active" || !b || b.patientId !== state.patient.id || b.status !== "PAYMENT PENDING" || p?.status !== "verified") return;
      b.payment = payload.success ? "paid (mock)" : "failed (mock)";
      if (payload.success) { b.status = "WAITING"; promote(state, b.professionalId, b.sessionId); }
    },
    transition(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload.id);
      if (!b) return;
      if (payload.status === "CANCELLED" && state.role === "user" && b.patientId === state.patient.id && ["PAYMENT PENDING", "WAITING", "NEXT"].includes(b.status)) {
        b.status = "CANCELLED"; if (b.payment === "paid (mock)") b.payment = "refund requested";
      } else {
        const p = state.professionals.find((p) => p.id === state.professionalId);
        if (!["doctor", "lawyer"].includes(state.role) || b.professionalId !== p?.id || p.status !== "verified") return;
        if (payload.status === "IN CONSULTATION") {
          const s = state.sessions.find((s) => s.id === b.sessionId);
          if (!s?.online || b.status !== "NEXT" || queueFor(state, p.id).some((q) => q.status === "IN CONSULTATION")) return;
        } else if (payload.status === "COMPLETED") {
          if (b.status !== "IN CONSULTATION") return;
          b.completedAt = new Date().toISOString();
        } else if (payload.status === "NO-SHOW") {
          if (!["NEXT", "WAITING"].includes(b.status)) return;
        } else return;
        b.status = payload.status;
      }
      promote(state, b.professionalId, b.sessionId);
    },
    message(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload.id);
      if (canRead(state, b) && b.status === "IN CONSULTATION" && payload.text.trim()) b.messages.push({ id: payload.messageId, text: payload.text.trim(), sender: state.role === "user" ? b.patientName : state.professionals.find((p) => p.id === b.professionalId).name, time: new Date().toISOString() });
    },
    saveNotes(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload.id);
      if (state.role !== "user" && canRead(state, b) && b.status === "IN CONSULTATION") Object.assign(b, { notes: payload.notes, privateNotes: payload.privateNotes, followUp: payload.followUp });
    },
    attach(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload.id);
      if (canRead(state, b) && ACTIVE.includes(b.status)) b.files.push({ ...payload.file, kind: state.role === "user" ? "Report / document" : "Professional document" });
    },
    moderate(state, { payload }) {
      if (state.role !== "admin") return;
      if (state.patients.some((p) => p.id === payload.id)) {
        state.patients.find((p) => p.id === payload.id).status = payload.status;
        if (payload.id === state.patient.id) state.patient.status = payload.status;
      }
      else {
        const p = state.professionals.find((p) => p.id === payload.id);
        if (p) p.status = payload.status;
      }
    },
    raiseIssue(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload.bookingId);
      if (canRead(state, b) && payload.text.trim()) state.issues.push({ ...payload, status: "open" });
    },
    resolveIssue(state, { payload }) {
      if (state.role !== "admin") return;
      const issue = state.issues.find((i) => i.id === payload);
      if (issue) issue.status = "resolved";
    },
    refund(state, { payload }) {
      const b = state.bookings.find((b) => b.id === payload);
      if (state.role === "admin" && b?.payment === "refund requested") b.payment = "refunded (mock)";
    },
  },
});
export const { switchWorkspace, saveProfile, addSession, toggleSession, book, pay, transition, message, saveNotes, attach, moderate, raiseIssue, resolveIssue, refund } = slice.actions;
export default slice.reducer;
