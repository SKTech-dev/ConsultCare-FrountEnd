import test from "node:test";
import assert from "node:assert/strict";
import { notificationDestination as destination } from "../src/features/consultations/navigation.js";

test("notification links select the relevant role-specific tab", () => {
  for (const [kind, link, role, tab] of [
    ["session.transfer.accepted", "/app/queue", "doctor", "handovers"],
    ["session.transfer.accepted", "/app/transfers", "admin", "history"],
    ["appointment.updated", "/app/queue", "doctor", "appointments"],
    ["clinic.updated", "/app/bookings", "user", "clinics"],
    ["prescription.sent", "/app/booking/record", "user", "prescription"],
    ["document.uploaded", "/app/room/record", "doctor", "documents"],
    ["clinic.updated", "/app/clinics/record", "doctor", "manage"],
    ["clinic.updated", "/app/clinics/record", "user", "registration"],
    ["clinic.updated", "/app/clinics/record", "admin", "payments"],
    ["payment.refund_requested", "/app/payments", "admin", "refunds"],
  ]) assert.equal(destination({ kind, link }, role), `${link}?tab=${tab}`);
});

test("tab navigation preserves queries and anchors and rejects external notification links", () => {
  assert.equal(destination({ link: "/app/booking/id?payment=return#details" }, "user"), "/app/booking/id?payment=return&tab=summary#details");
  assert.equal(destination({ link: "/app/queue?tab=clinics&page=2" }, "doctor"), "/app/queue?tab=clinics&page=2");
  assert.equal(destination({ link: "https://example.com" }, "user"), "/app/notifications");
  assert.equal(destination({}, "user"), "/app/notifications");
});
