import { test } from "node:test";
import assert from "node:assert/strict";
import { isUpcomingBooking } from "../src/features/consultations/model.js";

const session = { date: "2026-09-28", start: "10:00", end: "11:00" };
const end = Date.parse("2026-09-28T11:00:00+05:30");

test("ended queues leave upcoming even if server status has not changed", () => {
  for (const status of ["WAITING", "NEXT", "PAYMENT PENDING"]) {
    assert.equal(isUpcomingBooking({ status }, session, end - 1), true);
    assert.equal(isUpcomingBooking({ status }, session, end), false);
    assert.equal(isUpcomingBooking({ status }, session, end + 86400000), false);
  }
});

test("ongoing calls remain reachable and terminal bookings remain in history", () => {
  assert.equal(isUpcomingBooking({ status: "IN CONSULTATION" }, session, end + 1), true);
  for (const status of ["COMPLETED", "CANCELLED", "NO-SHOW"]) {
    assert.equal(isUpcomingBooking({ status }, session, end - 1), false);
  }
  assert.equal(isUpcomingBooking({ status: "WAITING" }, undefined, end), false);
});
