export const ACTIVE = ["WAITING", "NEXT", "IN CONSULTATION"];
export const money = (amount) => "LKR " + Number(amount).toLocaleString("en-LK");

export function queueFor(state, professionalId, sessionId) {
  return state.bookings.filter((b) =>
    b.professionalId === professionalId &&
    (!sessionId || b.sessionId === sessionId) && ACTIVE.includes(b.status)
  ).sort((a, b) => (a.position || 0) - (b.position || 0));
}

// UI visibility only. The API independently enforces ownership.
export function canRead(state, booking) {
  return Boolean(booking && (state.role === "user"
    ? booking.patientId === state.patient.id
    : ["doctor", "lawyer"].includes(state.role) && booking.professionalId === state.professionalId));
}
