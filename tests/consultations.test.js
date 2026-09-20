import test from "node:test";
import assert from "node:assert/strict";
import reducer, { book, pay, transition, switchWorkspace, saveNotes, message, moderate, refund, toggleSession, saveProfile } from "../src/features/consultations/consultationSlice.js";
import { seedState, queueFor, canRead } from "../src/features/consultations/model.js";
const act = (s, role, id) => reducer(s, switchWorkspace({ role, id }));
function reserve(s, id, professionalId = "d1") {
  s = reducer(s, book({ id, professionalId, sessionId: "s" + professionalId, reason: "" }));
  return reducer(s, pay({ id, success: true }));
}

test("payment joins only the assigned queue; failed payment can be retried", () => {
  let s = reducer(seedState(), book({ id: "a", professionalId: "d1", sessionId: "sd1" }));
  s = reducer(s, pay({ id: "a", success: false }));
  assert.equal(queueFor(s, "d1").length, 0);
  s = reducer(s, pay({ id: "a", success: true }));
  assert.equal(s.bookings[0].status, "NEXT");
  assert.equal(queueFor(s, "d2").length, 0);
  s = reducer(s, book({ id: "duplicate", professionalId: "d1", sessionId: "sd1" }));
  assert.equal(s.bookings.length, 1);
});

test("multiple patients advance in order and other professionals remain independent", () => {
  let s = reserve(seedState(), "a");
  s = reserve(act(s, "user", "patient-2"), "b");
  s = reserve(s, "c", "d2");
  assert.deepEqual(queueFor(s, "d1").map((b) => b.status), ["NEXT", "WAITING"]);
  s = act(s, "doctor", "d1");
  s = reducer(s, transition({ id: "b", status: "IN CONSULTATION" }));
  assert.equal(s.bookings[1].status, "WAITING");
  s = reducer(s, transition({ id: "a", status: "IN CONSULTATION" }));
  s = reducer(s, saveNotes({ id: "a", notes: "Shared note", privateNotes: "Private", followUp: "Follow-up" }));
  s = reducer(s, transition({ id: "a", status: "COMPLETED" }));
  assert.equal(s.bookings[0].notes, "Shared note");
  assert.equal(s.bookings[1].status, "NEXT");
  assert.equal(s.bookings[2].status, "NEXT");
});

test("unrelated roles cannot read or modify a consultation", () => {
  let s = reserve(seedState(), "a");
  s = act(s, "user", "patient-2");
  assert.equal(canRead(s, s.bookings[0]), false);
  s = act(s, "doctor", "d2");
  assert.equal(canRead(s, s.bookings[0]), false);
  s = reducer(s, transition({ id: "a", status: "IN CONSULTATION" }));
  s = reducer(s, message({ id: "a", text: "unauthorised", messageId: "x" }));
  assert.equal(s.bookings[0].status, "NEXT");
  assert.equal(s.bookings[0].messages.length, 0);
  s = act(s, "admin");
  assert.equal(canRead(s, s.bookings[0]), false);
});

test("cancelled paid bookings request refunds and advance the queue", () => {
  let s = reserve(seedState(), "a");
  s = reserve(act(s, "user", "patient-2"), "b");
  s = act(s, "user", "patient-1");
  s = reducer(s, transition({ id: "a", status: "CANCELLED" }));
  assert.equal(s.bookings[0].payment, "refund requested");
  assert.equal(s.bookings[1].status, "NEXT");
  s = reducer(act(s, "admin"), refund("a"));
  assert.equal(s.bookings[0].payment, "refunded (mock)");
});

test("unverified and suspended professionals cannot accept new bookings", () => {
  let s = seedState();
  s = reducer(s, book({ id: "a", professionalId: "d3", sessionId: "sd3" }));
  assert.equal(s.bookings.length, 0);
  s = reducer(act(s, "admin"), moderate({ id: "d1", status: "suspended" }));
  s = reserve(act(s, "user"), "b");
  assert.equal(s.bookings.length, 0);
});

test("an offline session cannot call a patient; a no-show promotes the next", () => {
  let s = reserve(seedState(), "a");
  s = reserve(act(s, "user", "patient-2"), "b");
  s = act(s, "doctor", "d1");
  s = reducer(s, toggleSession("sd1"));
  s = reducer(s, transition({ id: "a", status: "IN CONSULTATION" }));
  assert.equal(s.bookings[0].status, "NEXT");
  s = reducer(s, transition({ id: "a", status: "NO-SHOW" }));
  assert.equal(s.bookings[1].status, "NEXT");
});

test("patient profile changes survive workspace switches and stay separate", () => {
  let s = reducer(seedState(), saveProfile({ name: "Edited name" }));
  s = act(s, "user", "patient-2");
  assert.equal(s.patient.name, "Sam Taylor");
  s = act(s, "user", "patient-1");
  assert.equal(s.patient.name, "Edited name");
});

test("changing credentials resets professional approval", () => {
  let s = act(seedState(), "doctor", "d1");
  s = reducer(s, saveProfile({ registration: "Changed", qualifications: "MBBS" }));
  assert.equal(s.professionals[0].status, "pending");
});
