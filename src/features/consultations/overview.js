import { ACTIVE, isUpcomingBooking, isUpcomingSession } from "./model.js";

export function overviewActivity(bookings) {
  const time = (booking) => Math.max(...[booking.updatedAt, booking.paymentUpdatedAt, booking.completedAt, booking.createdAt].map((value) => Date.parse(value || "") || 0));
  return [...bookings].sort((a, b) => time(b) - time(a) || String(b.id).localeCompare(String(a.id)));
}

export function overviewCounts(bookings, sessions, professionalId, at = Date.now()) {
  const byId = new Map(sessions.map((session) => [session.id, session]));
  return {
    pending: bookings.filter((booking) => booking.status === "PAYMENT PENDING" && isUpcomingBooking(booking, byId.get(booking.sessionId), at)).length,
    active: bookings.filter((booking) => ACTIVE.includes(booking.status) && isUpcomingBooking(booking, byId.get(booking.sessionId), at)).length,
    upcoming: sessions.filter((session) => session.professionalId === professionalId && isUpcomingSession(session, at)).length,
  };
}
