export const ACTIVE = ["WAITING", "NEXT", "IN CONSULTATION"];
export const money = (amount) => "LKR " + Number(amount).toLocaleString("en-LK");

export function sriLankanDate(at = Date.now()) {
  const values = new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Colombo",
  }).formatToParts(new Date(at)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${values.year}-${values.month}-${values.day}`;
}

export function sessionEndsAt(session) {
  return Date.parse(session.endsAt || `${session.date}T${session.end}:00+05:30`);
}

export function sessionStartsAt(session) {
  return Date.parse(session.startsAt || `${session.date}T${session.start}:00+05:30`);
}

export function isSessionLive(session, at = Date.now()) {
  return Boolean(session && sessionStartsAt(session) <= at && at < sessionEndsAt(session));
}

export function isUpcomingSession(session, at = Date.now()) {
  return Boolean(session?.date && session.date >= sriLankanDate(at) && sessionEndsAt(session) > at);
}

export function isBookableSession(session, at = Date.now()) {
  return Boolean(session?.online && isUpcomingSession(session, at));
}

export function sortUpcomingSessions(sessions) {
  return sessions.filter((session) => isBookableSession(session)).slice().sort((a, b) =>
    Date.parse(a.startsAt || `${a.date}T${a.start}:00+05:30`) - Date.parse(b.startsAt || `${b.date}T${b.start}:00+05:30`)
  );
}

export function sessionLabel(session) {
  const starts = new Date(session.startsAt || `${session.date}T${session.start}:00+05:30`);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Colombo" }).format(starts);
  return `${day} · ${session.start}–${session.end}`;
}

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
    : ["doctor", "lawyer"].includes(state.role) && booking.professionalId === state.professionalId && (!booking.scheduledById || Boolean(booking.acceptedAt))));
}
