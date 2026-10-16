import test from "node:test";
import assert from "node:assert/strict";
import { overviewActivity, overviewCounts } from "../src/features/consultations/overview.js";

const at = Date.parse("2026-10-16T12:00:00+05:30");
const session = (id, date, extra = {}) => ({ id, date, start: "10:00", end: "11:00", professionalId: "doctor", ...extra });

test("overview excludes ended sessions and unresolved old queues while preserving overruns", () => {
  const sessions = [session("old", "2026-10-15"), session("closed", "2026-10-16", { closedAt: "2026-10-16T11:00:00+05:30" }), session("future", "2026-10-17"), session("live", "2026-10-16", { startedAt: "2026-10-16T10:00:00+05:30" }), session("other", "2026-10-17", { professionalId: "other" })];
  const bookings = [{ id: "ended", sessionId: "old", status: "NEXT" }, { id: "live", sessionId: "live", status: "IN CONSULTATION" }, { id: "future", sessionId: "future", status: "WAITING" }, { id: "expired", sessionId: "old", status: "PAYMENT PENDING" }, { id: "unpaid", sessionId: "future", status: "PAYMENT PENDING" }];
  assert.deepEqual(overviewCounts(bookings, sessions, "doctor", at), { active: 2, upcoming: 2, pending: 1 });
});

test("recent activity uses latest record or payment update instead of booking creation order", () => {
  const rows = [{ id: "new-booking", createdAt: "2026-10-15" }, { id: "completed-old-booking", createdAt: "2026-09-01", completedAt: "2026-10-16" }, { id: "payment-change", createdAt: "2026-08-01", updatedAt: "2026-08-01", paymentUpdatedAt: "2026-10-17" }];
  assert.deepEqual(overviewActivity(rows).map((row) => row.id), ["payment-change", "completed-old-booking", "new-booking"]);
  assert.equal(rows[0].id, "new-booking");
});
