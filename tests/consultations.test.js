import test from "node:test";
import assert from "node:assert/strict";
import { configureStore } from "@reduxjs/toolkit";
import { apiClient } from "../src/api/apiClient.js";
import reducer, { fetchWorkspace, book, moderate, saveWeeklyAvailability } from "../src/features/consultations/consultationSlice.js";

globalThis.document = { cookie: "cc_csrf=test-csrf" };
globalThis.window = { dispatchEvent() {} };
const snapshot = { role: "user", professionalId: null, patient: { id: "real-user" },
  patients: [], professionals: [], sessions: [], bookings: [], issues: [], payhereEnabled: true };
const store = () => configureStore({ reducer: { consultations: reducer } });

test("weekly schedule sends its own fee in the same request", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, config, headers: {}, data: { data: snapshot } };
  };
  const days = Array.from({ length: 7 }, (_, weekday) => ({ weekday, slots: [] }));
  await store().dispatch(saveWeeklyAvailability({ days, fee: 5000.50 })).unwrap();
  assert.equal(requests[0].url, "/weekly-availability");
  assert.deepEqual(JSON.parse(requests[0].data), { days, fee: 5000.50 });
});

test("successful writes remain successful when refreshing the workspace fails", async () => {
  apiClient.defaults.adapter = async (config) => {
    if (config.method === "get") throw new Error("Network unavailable");
    return { status: 200, config, headers: {}, data: { data: { id: "saved-booking" } } };
  };
  const s = store();
  const result = await s.dispatch(book({ sessionId: "session" })).unwrap();
  assert.equal(result.id, "saved-booking");
  assert.equal(s.getState().consultations.feedback.type, "success");
  assert.match(s.getState().consultations.error, /changes were saved/);
  assert.equal(s.getState().consultations.pending, 0);
});

test("workspace loads from the API without creating a demo identity", async () => {
  const s = store();
  assert.equal(s.getState().consultations.role, null);
  apiClient.defaults.adapter = async (config) => ({ status: 200, config, headers: {}, data: { data: snapshot } });
  await s.dispatch(fetchWorkspace()).unwrap();
  assert.equal(s.getState().consultations.patient.id, "real-user");
  assert.equal(s.getState().consultations.loaded, true);
});

test("booking uses server identity and fee, includes CSRF, and refreshes state", async () => {
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, config, headers: {}, data: { data: config.method === "get" ? snapshot : { id: "server-booking" } } };
  };
  const s = store();
  const value = await s.dispatch(book({ id: "client-id", professionalId: "forged", fee: 1, sessionId: "session-id", reason: "Question" })).unwrap();
  assert.equal(value.id, "server-booking");
  assert.deepEqual(JSON.parse(requests[0].data), { sessionId: "session-id", reason: "Question" });
  assert.equal(requests[0].headers["X-CSRF-Token"], "test-csrf");
  assert.equal(requests[1].url, "/workspace");
  assert.equal(s.getState().consultations.pending, 0);
});

test("admin moderation can use one contextual error instead of a duplicate global popup", async () => {
  apiClient.defaults.adapter = async () => { throw { response: { status: 409, data: { message: "Complete credentials first." } } }; };
  const s = store();
  const action = await s.dispatch(moderate({ id: "professional", status: "verified", localFeedback: true }));
  assert.ok(action.error);
  assert.equal(s.getState().consultations.error, "Complete credentials first.");
  assert.equal(s.getState().consultations.feedback, null);
});

test("chat actions use local pending state without blocking the whole workspace", () => {
  const s = store();
  s.dispatch({ type: "consultations/message/pending", meta: { arg: { localPending: true } } });
  assert.equal(s.getState().consultations.pending, 0);
  s.dispatch({ type: "consultations/message/rejected", payload: "Could not send", meta: { arg: { localPending: true } } });
  assert.equal(s.getState().consultations.pending, 0);
  assert.equal(s.getState().consultations.feedback, null);
  assert.equal(s.getState().consultations.error, "");
});

test("logout clears private workspace data and ignores in-flight responses", async () => {
  const s = store();
  let resolve;
  apiClient.defaults.adapter = (config) => new Promise((done) => { resolve = () => done({ status: 200, config, headers: {}, data: { data: snapshot } }); });
  const pending = s.dispatch(fetchWorkspace());
  await new Promise((r) => setTimeout(r, 0));
  s.dispatch({ type: "auth/clearAuthUser" });
  resolve();
  await pending;
  assert.equal(s.getState().consultations.loaded, false);
  assert.equal(s.getState().consultations.role, null);
});
