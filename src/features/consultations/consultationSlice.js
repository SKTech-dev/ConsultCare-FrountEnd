import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { callApi } from "../../api/apiClient.js";

const empty = {
  role: null, professionalId: null, patient: {}, patients: [], professionals: [],
  sessions: [], weeklyAvailability: [], bookings: [], loaded: false, loading: false,
  pending: 0, error: "", requestId: null, mockPayments: false,
  feedback: null, liveConnected: false, familyProfessionalIds: [],
};

export const fetchWorkspace = createAsyncThunk("consultations/fetch", async (_, { rejectWithValue }) => {
  try { return (await callApi("GET", "/workspace")).data; }
  catch (e) { return rejectWithValue(e.message); }
});

function command(name, request) {
  return createAsyncThunk("consultations/" + name, async (payload, context) => {
    try {
      const [method, url, body] = request(payload, context.getState().consultations);
      const response = await callApi(method, url, body);
      // A failed refresh must not report an already-committed write as failed.
      const refresh = await context.dispatch(fetchWorkspace());
      if (refresh.error) context.dispatch(refreshWarning());
      return response.data || response;
    } catch (e) { return context.rejectWithValue(e.message || e); }
  });
}

export const saveProfile = command("saveProfile", (p) => ["PUT", "/profile", p]);
export const saveFamily = command("saveFamily", ({ id, saved }) => ["PUT", "/family-professionals/" + id, { saved }]);
export const saveWeeklyAvailability = command("saveWeeklyAvailability", (days) => ["PUT", "/weekly-availability", { days }]);
export const book = command("book", (p) => ["POST", "/bookings", { sessionId: p.sessionId, reason: p.reason || "" }]);
export const pay = command("pay", (p) => ["POST", "/bookings/" + p.id + "/payment-simulation", { success: p.success }]);
export const transition = command("transition", (p) => ["PATCH", "/bookings/" + p.id + "/status", { status: p.status }]);
export const message = command("message", (p) => ["POST", "/bookings/" + p.id + "/messages", { text: p.text }]);
export const saveNotes = command("saveNotes", ({ id, ...p }) => ["PUT", "/bookings/" + id + "/notes", p]);
export const sendPrescription = command("sendPrescription", ({ id, text }) => ["PUT", "/bookings/" + id + "/prescription", { text }]);
// Admin moderation has its own contextual popup (for example, incomplete credentials).
// Keep that one message instead of also showing the generic workspace error popup.
export const moderate = command("moderate", (p) => ["PATCH", "/admin/users/" + p.id, { status: p.status }]);
export const refund = command("refund", (id) => ["POST", "/admin/bookings/" + id + "/refund-simulation"]);

const slice = createSlice({
  name: "consultations", initialState: empty,
  reducers: {
    clearWorkspaceError: (state) => { state.error = ""; },
    clearFeedback: (state) => { state.feedback = null; },
    refreshWarning: (state) => { state.error = "Your changes were saved, but the page could not refresh. Reload to see the latest information."; },
    liveStatus: (state, action) => { state.liveConnected = action.payload; },
    liveTick: (state) => { state.liveUpdatedAt = Date.now(); },
    receiveWorkspace: (state, action) => {
      Object.assign(state, action.payload, { loaded: true, loading: false, requestId: null });
    },
  },
  extraReducers: (builder) => {
    builder.addCase("auth/clearAuthUser", () => ({ ...empty }))
      .addCase("auth/logoutUser/fulfilled", () => ({ ...empty }))
      .addCase("auth/setAuthUser", () => ({ ...empty }))
      .addCase(fetchWorkspace.pending, (state, action) => { state.loading = true; state.requestId = action.meta.requestId; })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        Object.assign(state, action.payload, { loaded: true, loading: false });
      })
      .addCase(fetchWorkspace.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false; state.error = action.payload || "Could not load workspace.";
      })
      .addMatcher((action) => action.type.startsWith("consultations/") && !action.type.startsWith("consultations/fetch") && action.type.endsWith("/pending"), (state, action) => {
        // Chat owns its own sending/retry state. Do not freeze the consultation room.
        if (action.meta.arg?.localPending) return;
        state.pending += 1; state.error = ""; state.feedback = null;
      })
      .addMatcher((action) => action.type.startsWith("consultations/") && !action.type.startsWith("consultations/fetch") && /\/(fulfilled|rejected)$/.test(action.type), (state, action) => {
        if (!action.meta.arg?.localPending) state.pending = Math.max(0, state.pending - 1);
        if (action.type.endsWith("/rejected") && !action.meta.arg?.localPending) state.error = action.payload || "Could not save changes.";
        const name = action.type.split("/")[1];
        if (action.type.endsWith("/rejected")) {
          if (!action.meta.arg?.localFeedback && !action.meta.arg?.localPending) state.feedback = { type: "error", text: String(action.payload || "Could not save changes.") };
        } else if (name !== "message") {
          const messages = { book: "Booking reserved. Continue with payment to join the queue.", saveProfile: "Your profile has been saved.", saveWeeklyAvailability: "Your weekly sessions have been saved.", saveFamily: "Your family professionals have been updated.", transition: action.meta.arg.status === "CANCELLED" ? "Consultation cancelled." : "Consultation status updated.", pay: "Payment status updated.", saveNotes: "Notes saved.", sendPrescription: "Prescription sent to the patient." };
          state.feedback = { type: "success", text: messages[name] || "Changes saved successfully." };
        }
      });
  },
});
export const { clearWorkspaceError, clearFeedback, refreshWarning, liveStatus, liveTick, receiveWorkspace } = slice.actions;
export default slice.reducer;
