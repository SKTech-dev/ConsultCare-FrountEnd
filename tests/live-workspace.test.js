import test from "node:test";
import assert from "node:assert/strict";
import reducer, { receiveWorkspace, fetchWorkspace } from "../src/features/consultations/consultationSlice.js";

const base = { role: "doctor", bookings: [{ id: "history", sessionId: "old", professionalId: "former", notes: "historical record" }, { id: "moved", sessionId: "moved", professionalId: "doctor" }], sessions: [{ id: "old" }, { id: "moved" }], professionals: [{ id: "former", name: "Former Professional" }], patients: [], patient: {} };
const update = { role: "doctor", bookingsScope: "live", visibleBookingIds: ["history", "new"], bookings: [{ id: "new", sessionId: "today", professionalId: "doctor" }], sessions: [{ id: "today" }], professionals: [{ id: "doctor" }] };

test("live workspace keeps authorized history and removes handed-over records", () => {
  let state = reducer(undefined, receiveWorkspace(base));
  state = reducer(state, receiveWorkspace(update));
  assert.deepEqual(state.bookings.map((row) => row.id), ["history", "new"]);
  assert.equal(state.bookings[0].notes, "historical record");
  assert.deepEqual(state.sessions.map((row) => row.id), ["old", "today"]);
  assert.equal(state.professionals.find((row) => row.id === "former").name, "Former Professional");
});

test("a live update arriving during initial loading does not discard full history", () => {
  let state = reducer(undefined, fetchWorkspace.pending("initial"));
  state = reducer(state, receiveWorkspace(update));
  assert.equal(state.loaded, false);
  state = reducer(state, fetchWorkspace.fulfilled(base, "initial"));
  assert.equal(state.loaded, true);
  assert.deepEqual(state.bookings.map((row) => row.id), ["history", "new"]);
  assert.equal(state.livePending, null);
});
