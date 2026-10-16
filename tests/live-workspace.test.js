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

const stamped = (payload, version) => ({ ...payload, snapshotAt: "2026-10-16T10:00:0" + version + ".000000+00:00" });

test("a failed refresh cannot replay stale stream data over its successful retry", () => {
  let state = reducer(undefined, receiveWorkspace(stamped(base, 1)));
  state = reducer(state, fetchWorkspace.pending("failed"));
  state = reducer(state, receiveWorkspace(stamped(update, 2)));
  state = reducer(state, fetchWorkspace.rejected(new Error("Offline"), "failed"));
  assert.equal(state.livePending, null);
  state = reducer(state, fetchWorkspace.pending("retry"));
  const fresh = { ...base, bookings: [{ id: "new", sessionId: "today", professionalId: "doctor", notes: "newest server notes" }] };
  state = reducer(state, fetchWorkspace.fulfilled(stamped(fresh, 3), "retry"));
  assert.equal(state.bookings[0].notes, "newest server notes");
  state = reducer(state, receiveWorkspace(stamped(update, 2)));
  assert.equal(state.bookings[0].notes, "newest server notes");
});

test("out-of-order full responses only fill authorized missing history", () => {
  let state = reducer(undefined, receiveWorkspace(stamped({ ...base, bookings: [] }, 1)));
  state = reducer(state, fetchWorkspace.pending("full"));
  state = reducer(state, receiveWorkspace(stamped({ ...update, bookings: [{ ...update.bookings[0], notes: "new" }] }, 3)));
  state = reducer(state, fetchWorkspace.fulfilled(stamped(base, 2), "full"));
  assert.deepEqual(new Set(state.bookings.map((row) => row.id)), new Set(["new", "history"]));
  assert.equal(state.bookings.find((row) => row.id === "new").notes, "new");
  assert.equal(state.snapshotAt, stamped({}, 3).snapshotAt);
  assert.equal(state.loaded, true);
});

test("initial loading applies the newer of full and pending live responses", () => {
  for (const liveNewer of [true, false]) {
    let state = reducer(undefined, fetchWorkspace.pending("initial"));
    state = reducer(state, receiveWorkspace(stamped(update, liveNewer ? 3 : 1)));
    state = reducer(state, fetchWorkspace.fulfilled(stamped(base, 2), "initial"));
    assert.deepEqual(state.bookings.map((row) => row.id), liveNewer ? ["history", "new"] : ["history", "moved"]);
    assert.equal(state.livePending, null);
  }
});


test("a newer full response replaces stale authorization IDs before filling history", () => {
  let state = reducer(undefined, receiveWorkspace(stamped(base, 1)));
  state = reducer(state, receiveWorkspace(stamped(update, 2)));
  state = reducer(state, fetchWorkspace.pending("new-full"));
  state = reducer(state, fetchWorkspace.fulfilled(stamped({ ...base, bookings: [], sessions: [], professionals: [] }, 4), "new-full"));
  state = reducer(state, fetchWorkspace.pending("old-full"));
  state = reducer(state, fetchWorkspace.fulfilled(stamped(base, 3), "old-full"));
  assert.deepEqual(state.bookings, []);
  assert.deepEqual(state.visibleBookingIds, []);
});
